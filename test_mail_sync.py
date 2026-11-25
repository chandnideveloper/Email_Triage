"""Diagnostic utility to verify Microsoft Graph authentication and mailbox reading."""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure root directory is on sys.path
root_dir = str(Path(__file__).resolve().parent)
parent_dir = str(Path(__file__).resolve().parent.parent)
for p in (parent_dir, root_dir):
    if p not in sys.path:
        sys.path.insert(0, p)

load_dotenv()
import httpx
import msal

def check_connection():
    client_id = os.getenv("GRAPH_CLIENT_ID")
    client_secret = os.getenv("GRAPH_CLIENT_SECRET")
    tenant_id = os.getenv("GRAPH_TENANT_ID")
    mailbox = os.getenv("TARGET_MAILBOX")

    print("=" * 60)
    print("      TriageAI - Microsoft Graph Connection Diagnostics")
    print("=" * 60)
    print(f"Tenant ID:       {tenant_id}")
    print(f"Client (App) ID: {client_id}")
    print(f"Target Mailbox:  {mailbox}")
    print("-" * 60)

    # 1. Authenticate
    print("\n[Step 1] Requesting OAuth 2.0 token from Microsoft Entra ID...")
    app = msal.ConfidentialClientApplication(
        client_id,
        authority=f"https://login.microsoftonline.com/{tenant_id}",
        client_credential=client_secret,
    )
    result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])

    if "access_token" not in result:
        print("❌ AUTHENTICATION FAILED!")
        print(f"   Error:       {result.get('error')}")
        print(f"   Description: {result.get('error_description')}")
        return False

    print("✅ AUTHENTICATION SUCCESSFUL! Valid bearer token acquired.")
    token = result["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Fetch Mail
    print(f"\n[Step 2] Querying Microsoft Graph for mailbox '{mailbox}'...")
    url = f"https://graph.microsoft.com/v1.0/users/{mailbox}/mailFolders/Inbox/messages?$top=5&$select=id,subject,from,receivedDateTime,hasAttachments"
    
    try:
        resp = httpx.get(url, headers=headers, timeout=15)
        print(f"HTTP Status: {resp.status_code}")

        if resp.status_code == 200:
            data = resp.json()
            messages = data.get("value", [])
            print(f"\n✅ MAIL FETCH SUCCESSFUL! Found {len(messages)} message(s) in Inbox.\n")
            for i, m in enumerate(messages, 1):
                sender = m.get("from", {}).get("emailAddress", {}).get("address", "Unknown")
                subject = m.get("subject", "(No Subject)")
                received = m.get("receivedDateTime", "")
                att = "📎 Yes" if m.get("hasAttachments") else "No"
                print(f"  [{i}] Subject: {subject}")
                print(f"      From:    {sender}")
                print(f"      Date:    {received}")
                print(f"      Has Attachment: {att}\n")
            print("=" * 60)
            print("Status: 🚀 FULLY OPERATIONAL - EMAILS ARE FETCHING")
            print("=" * 60)
            return True
        elif resp.status_code == 403:
            print("\n❌ 403 FORBIDDEN - PERMISSIONS REQUIRED!")
            print("   The app authenticated, but is missing 'Mail.Read' Application permission.")
            print("   Fix: Azure Portal -> App registrations -> API permissions -> Add 'Mail.Read' (Application permission)")
            print("        and click 'Grant admin consent'.\n")
            print(f"Details: {resp.text}\n")
            return False
        elif resp.status_code == 404:
            print(f"\n❌ 404 NOT FOUND - Mailbox '{mailbox}' does not exist or has no Exchange license.")
            print(f"Details: {resp.text}\n")
            return False
        else:
            print(f"\n❌ Error response ({resp.status_code}): {resp.text}")
            return False

    except Exception as e:
        print(f"Network error: {e}")
        return False

if __name__ == "__main__":
    check_connection()
