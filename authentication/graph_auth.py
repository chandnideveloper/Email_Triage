"""Microsoft Entra ID (Azure AD) OAuth2 Authentication for Microsoft Graph.

Supports client credentials flow for application-level access to mailboxes.
Maintains in-memory token cache and refreshes tokens proactively prior to expiry.
"""
from __future__ import annotations

import threading
import time
from typing import Any

import httpx

from email_triage.config import TriageConfig, get_config
from email_triage.utils.logger import get_logger

log = get_logger(__name__)


class GraphAuthError(Exception):
    """Raised when authentication with Microsoft Entra fails."""

    def __init__(self, code: str, message: str = ""):
        self.code = code
        super().__init__(message or code)


class GraphAuthProvider:
    """Acquires and caches OAuth2 bearer tokens for Microsoft Graph API."""

    def __init__(
        self,
        config: TriageConfig | None = None,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self.config = config or get_config()
        self.transport = transport
        self._lock = threading.Lock()
        self._cached_token: str | None = None
        self._token_expires_at: float = 0.0

    @property
    def token_endpoint(self) -> str:
        return f"{self.config.authority_host}/{self.config.tenant_id}/oauth2/v2.0/token"

    def is_token_valid(self) -> bool:
        """Checks if the cached token exists and has at least 5 minutes of validity remaining."""
        return bool(self._cached_token and (self._token_expires_at - time.time() > 300))

    def get_access_token(self, force_refresh: bool = False) -> str:
        """Returns a valid bearer token, requesting a new one from Entra if expired or missing."""
        if not self.config.client_id or not self.config.client_secret or not self.config.tenant_id:
            raise GraphAuthError("AUTH_CONFIG_MISSING", "Microsoft Entra client credentials not configured.")

        with self._lock:
            if not force_refresh and self.is_token_valid() and self._cached_token:
                return self._cached_token

            log.info("Requesting new OAuth2 token from Entra tenant=%s", self.config.tenant_id)
            payload = {
                "client_id": self.config.client_id,
                "client_secret": self.config.client_secret,
                "grant_type": "client_credentials",
                "scope": self.config.graph_scopes,
            }

            try:
                with httpx.Client(transport=self.transport, timeout=15.0) as client:
                    resp = client.post(self.token_endpoint, data=payload)
            except httpx.TimeoutException as exc:
                log.error("Token request timed out")
                raise GraphAuthError("AUTH_TIMEOUT", "Entra token request timed out.") from exc
            except Exception as exc:
                log.error("Token request network error: %s", type(exc).__name__)
                raise GraphAuthError("AUTH_NETWORK_ERROR", f"Network error during auth: {type(exc).__name__}") from exc

            if resp.status_code != 200:
                log.error("Token request failed status=%s", resp.status_code)
                try:
                    err_data = resp.json()
                    err_code = err_data.get("error", "AUTH_REJECTED")
                    err_desc = err_data.get("error_description", "")
                except Exception:
                    err_code = f"AUTH_HTTP_{resp.status_code}"
                    err_desc = resp.text[:100]
                raise GraphAuthError(err_code, f"Entra authentication failed: {err_desc}")

            data: dict[str, Any] = resp.json()
            access_token = data.get("access_token")
            expires_in = int(data.get("expires_in", 3600))

            if not access_token:
                raise GraphAuthError("AUTH_MALFORMED_RESPONSE", "Access token missing from Entra response.")

            self._cached_token = access_token
            self._token_expires_at = time.time() + expires_in
            log.info("Acquired fresh token, expires_in=%s seconds", expires_in)
            return access_token

    def clear_cache(self) -> None:
        """Clears cached token."""
        with self._lock:
            self._cached_token = None
            self._token_expires_at = 0.0
