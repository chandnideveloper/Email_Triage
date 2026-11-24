"""Email service interacting with Microsoft Graph Mail API endpoints."""
from __future__ import annotations

from typing import Any, Generator

from email_triage.graph_client.client import GraphClient
from email_triage.utils.logger import get_logger

log = get_logger(__name__)

DEFAULT_SELECT_FIELDS = (
    "id,conversationId,internetMessageId,subject,bodyPreview,body,"
    "sender,from,toRecipients,ccRecipients,bccRecipients,receivedDateTime,"
    "isRead,hasAttachments,importance"
)


class EmailService:
    """Service wrapping Outlook Mail operations via Graph API."""

    def __init__(self, client: GraphClient) -> None:
        self.client = client

    def list_messages(
        self,
        mailbox: str,
        top: int = 50,
        skip: int = 0,
        filter_query: str | None = None,
        search_query: str | None = None,
        folder_id: str = "inbox",
        order_by: str = "receivedDateTime desc",
    ) -> dict[str, Any]:
        """Retrieves a page of emails from the specified mailbox folder."""
        endpoint = f"/users/{mailbox}/mailFolders/{folder_id}/messages"
        params: dict[str, Any] = {
            "$top": min(top, 100),
            "$select": DEFAULT_SELECT_FIELDS,
            "$orderby": order_by,
        }
        if skip > 0:
            params["$skip"] = skip
        if filter_query:
            params["$filter"] = filter_query
        if search_query:
            params["$search"] = f'"{search_query}"'

        return self.client.request("GET", endpoint, params=params)

    def get_delta_messages(
        self,
        mailbox: str,
        delta_link_or_token: str | None = None,
        folder_id: str = "inbox",
    ) -> dict[str, Any]:
        """Retrieves change events using Graph Delta query for incremental synchronization."""
        if delta_link_or_token and (delta_link_or_token.startswith("http://") or delta_link_or_token.startswith("https://")):
            # Full delta link passed from previous sync
            return self.client.request("GET", delta_link_or_token)

        endpoint = f"/users/{mailbox}/mailFolders/{folder_id}/messages/delta"
        params: dict[str, Any] = {
            "$select": DEFAULT_SELECT_FIELDS,
        }
        if delta_link_or_token:
            params["$deltatoken"] = delta_link_or_token

        return self.client.request("GET", endpoint, params=params)

    def get_message(self, mailbox: str, message_id: str) -> dict[str, Any]:
        """Fetches a single message with full body and metadata."""
        endpoint = f"/users/{mailbox}/messages/{message_id}"
        params = {"$select": DEFAULT_SELECT_FIELDS}
        return self.client.request("GET", endpoint, params=params)

    def traverse_pages(self, initial_response: dict[str, Any], max_pages: int = 10) -> Generator[list[dict[str, Any]], None, str | None]:
        """Generator that yields the message batch for each page and returns the next/delta link."""
        current_resp = initial_response
        pages_fetched = 0

        while current_resp:
            items = current_resp.get("value", [])
            yield items
            pages_fetched += 1

            next_link = current_resp.get("@odata.nextLink")
            delta_link = current_resp.get("@odata.deltaLink")

            if not next_link or pages_fetched >= max_pages:
                return delta_link or next_link

            current_resp = self.client.request("GET", next_link)

        return None
