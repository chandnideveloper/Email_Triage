"""Resilient HTTP client for Microsoft Graph API.

Handles rate limiting (HTTP 429 Retry-After), transient gateway errors (503/504),
automatic bearer token injection, and structured error classification.
"""
from __future__ import annotations

import time
import uuid
from typing import Any

import httpx

from email_triage.authentication.graph_auth import GraphAuthError, GraphAuthProvider
from email_triage.config import TriageConfig, get_config
from email_triage.utils.logger import get_logger

log = get_logger(__name__)


class GraphError(Exception):
    """Base exception for Graph API failures."""

    def __init__(self, code: str, status_code: int = 0, message: str = ""):
        self.code = code
        self.status_code = status_code
        super().__init__(f"[{code}] (status {status_code}): {message}")


class GraphRateLimitError(GraphError):
    """Raised when Graph API throttles requests (HTTP 429)."""

    def __init__(self, retry_after: int = 5, message: str = "Rate limited by Microsoft Graph"):
        super().__init__("GRAPH_RATE_LIMIT", 429, message)
        self.retry_after = retry_after


class GraphNotFoundError(GraphError):
    """Raised when requested resource does not exist (HTTP 404)."""

    def __init__(self, message: str = "Resource not found in Graph API"):
        super().__init__("GRAPH_NOT_FOUND", 404, message)


class GraphClient:
    """Core HTTP client interacting with Microsoft Graph v1.0 REST API."""

    def __init__(
        self,
        auth_provider: GraphAuthProvider | None = None,
        config: TriageConfig | None = None,
        transport: httpx.BaseTransport | None = None,
        timeout: float = 30.0,
    ) -> None:
        self.config = config or get_config()
        self.auth_provider = auth_provider or GraphAuthProvider(self.config, transport=transport)
        self.transport = transport
        self.timeout = timeout
        self.base_url = self.config.graph_api_base.rstrip("/")

    def _resolve_url(self, endpoint: str) -> str:
        if endpoint.startswith("http://") or endpoint.startswith("https://"):
            return endpoint
        cleaned = endpoint.lstrip("/")
        return f"{self.base_url}/{cleaned}"

    def request(
        self,
        method: str,
        endpoint: str,
        params: dict[str, Any] | None = None,
        json_data: dict[str, Any] | None = None,
        headers: dict[str, str] | None = None,
        max_retries: int = 3,
    ) -> dict[str, Any]:
        """Executes an authenticated request against Microsoft Graph with automatic retries on 429/503."""
        url = self._resolve_url(endpoint)
        client_req_id = uuid.uuid4().hex

        for attempt in range(1, max_retries + 1):
            token = self.auth_provider.get_access_token()
            req_headers = {
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "client-request-id": client_req_id,
            }
            if headers:
                req_headers.update(headers)

            try:
                with httpx.Client(transport=self.transport, timeout=self.timeout) as client:
                    resp = client.request(
                        method=method,
                        url=url,
                        params=params,
                        json=json_data,
                        headers=req_headers,
                    )
            except httpx.TimeoutException as exc:
                log.warning("Graph request timeout attempt=%s endpoint=%s", attempt, endpoint)
                if attempt == max_retries:
                    raise GraphError("GRAPH_TIMEOUT", 408, "Microsoft Graph request timed out.") from exc
                time.sleep(attempt * 1.5)
                continue
            except Exception as exc:
                log.warning("Graph request connection error: %s attempt=%s", type(exc).__name__, attempt)
                if attempt == max_retries:
                    raise GraphError("GRAPH_CONNECTION_ERROR", 0, str(exc)) from exc
                time.sleep(attempt * 1.5)
                continue

            # Handle 429 Throttling
            if resp.status_code == 429:
                retry_after_hdr = resp.headers.get("Retry-After", "5")
                try:
                    retry_after = max(1, int(retry_after_hdr))
                except ValueError:
                    retry_after = 5
                log.warning("Graph 429 rate limit received. retry_after=%s attempt=%s", retry_after, attempt)
                if attempt < max_retries:
                    time.sleep(retry_after)
                    continue
                raise GraphRateLimitError(retry_after=retry_after)

            # Handle 503 / 504 Transient Server Errors
            if resp.status_code in (503, 504):
                log.warning("Graph transient error status=%s attempt=%s", resp.status_code, attempt)
                if attempt < max_retries:
                    time.sleep(attempt * 2.0)
                    continue
                raise GraphError(f"GRAPH_SERVER_ERROR_{resp.status_code}", resp.status_code, "Graph server unavailable")

            # Handle 401 Unauthorized (attempt token refresh once)
            if resp.status_code == 401 and attempt == 1:
                log.info("Graph 401 received. Refreshing token...")
                self.auth_provider.clear_cache()
                continue

            # Handle 404
            if resp.status_code == 404:
                raise GraphNotFoundError(f"Graph resource not found at {endpoint}")

            # Handle other 4xx/5xx errors
            if resp.status_code >= 400:
                log.error("Graph error status=%s for endpoint=%s", resp.status_code, endpoint)
                try:
                    err_json = resp.json()
                    err_code = err_json.get("error", {}).get("code", f"GRAPH_ERROR_{resp.status_code}")
                    err_msg = err_json.get("error", {}).get("message", resp.text[:200])
                except Exception:
                    err_code = f"GRAPH_HTTP_{resp.status_code}"
                    err_msg = resp.text[:200]
                raise GraphError(err_code, resp.status_code, err_msg)

            # Success
            if resp.status_code == 204:
                return {}
            try:
                return resp.json()
            except Exception:
                return {"text": resp.text}

        raise GraphError("GRAPH_MAX_RETRIES_EXCEEDED", 0, "Exceeded maximum retry attempts.")
