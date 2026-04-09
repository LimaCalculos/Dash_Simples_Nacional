"""
Google Drive service — OAuth2 personal account (not service account).

Setup:
  1. GCP Console → Create project → Enable Drive API
  2. OAuth consent screen → Desktop App → Download credentials.json
  3. First run: opens browser for consent, saves token.json automatically
"""
import os
import io
import logging
from typing import List, Dict, Optional

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from ..config import settings

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


def get_drive_service():
    """Returns an authenticated Drive API service. Opens browser on first run."""
    creds = None
    token_file = settings.GOOGLE_DRIVE_TOKEN_FILE
    credentials_file = settings.GOOGLE_DRIVE_CREDENTIALS_FILE

    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except Exception as e:
                logger.warning(f"Token refresh failed: {e}. Re-authenticating...")
                creds = None

        if not creds:
            if not os.path.exists(credentials_file):
                raise FileNotFoundError(
                    f"Google Drive credentials not found at '{credentials_file}'. "
                    "Download OAuth2 Desktop credentials from GCP Console."
                )
            flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(token_file, "w") as f:
            f.write(creds.to_json())
        logger.info("Google Drive token saved.")

    return build("drive", "v3", credentials=creds)


def list_month_folders(service, root_folder_id: str) -> List[Dict]:
    """
    List subfolders in the root folder matching YYYY-MM pattern.
    Returns list of {id, name} dicts sorted by name.
    """
    query = (
        f"'{root_folder_id}' in parents "
        "and mimeType = 'application/vnd.google-apps.folder' "
        "and trashed = false"
    )
    result = service.files().list(
        q=query,
        fields="files(id, name)",
        orderBy="name",
    ).execute()

    folders = result.get("files", [])
    # Filter for YYYY-MM pattern
    import re
    return [f for f in folders if re.match(r'^\d{4}-\d{2}$', f["name"])]


def list_subfolders(service, folder_id: str) -> List[Dict]:
    """List all subfolders inside a folder. Returns {id, name} dicts."""
    query = (
        f"'{folder_id}' in parents "
        "and mimeType = 'application/vnd.google-apps.folder' "
        "and trashed = false"
    )
    result = service.files().list(
        q=query,
        fields="files(id, name)",
        orderBy="name",
    ).execute()
    return result.get("files", [])


def list_pdfs_in_folder(service, folder_id: str) -> List[Dict]:
    """List all PDF files directly inside a specific folder."""
    query = (
        f"'{folder_id}' in parents "
        "and mimeType = 'application/pdf' "
        "and trashed = false"
    )
    result = service.files().list(
        q=query,
        fields="files(id, name, size, modifiedTime)",
        orderBy="name",
    ).execute()
    return result.get("files", [])


def list_pdfs_recursive(service, folder_id: str, _path: str = "") -> List[Dict]:
    """
    Recursively list all PDFs in folder_id and all its subfolders.
    Each item includes an extra 'subfolder' key with the subfolder name
    (empty string if file is directly in folder_id).

    Example structure:
      2026-03/
        extratos/   → subfolder = "extratos"
        guias/      → subfolder = "guias"
        arquivo.pdf → subfolder = ""
    """
    results: List[Dict] = []

    # PDFs directly in this folder
    for f in list_pdfs_in_folder(service, folder_id):
        f["subfolder"] = _path
        results.append(f)

    # Recurse into subfolders (one level deep is enough for this structure)
    for sub in list_subfolders(service, folder_id):
        sub_path = f"{_path}/{sub['name']}" if _path else sub["name"]
        for f in list_pdfs_in_folder(service, sub["id"]):
            f["subfolder"] = sub_path
            results.append(f)

    return results


def download_file(service, file_id: str) -> bytes:
    """Download a file from Drive and return its bytes."""
    request = service.files().get_media(fileId=file_id)
    buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(buffer, request)
    done = False
    while not done:
        _, done = downloader.next_chunk()
    return buffer.getvalue()


def check_drive_connection() -> bool:
    """Returns True if Drive is accessible, False otherwise."""
    try:
        service = get_drive_service()
        service.files().list(pageSize=1, fields="files(id)").execute()
        return True
    except Exception as e:
        logger.error(f"Drive connection check failed: {e}")
        return False
