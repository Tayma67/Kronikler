# -*- coding: utf-8 -*-
"""
YouTube yükleyici — Data API v3, OAuth refresh token ile.

Gerekli ortam değişkenleri (GitHub Secrets):
  YT_CLIENT_ID, YT_CLIENT_SECRET, YT_REFRESH_TOKEN
İsteğe bağlı: YT_PRIVACY (public|unlisted|private — varsayılan public)

Kota notu: bir video yüklemesi 1600 birim; günlük ücretsiz kota 10.000 birim.
Günde 1-2 video bu kotaya rahatça sığar.
"""
import os
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
TOKEN_URI = "https://oauth2.googleapis.com/token"


def _credentials():
    missing = [k for k in ("YT_CLIENT_ID", "YT_CLIENT_SECRET", "YT_REFRESH_TOKEN")
               if not os.environ.get(k)]
    if missing:
        raise SystemExit(
            "Eksik ortam değişkenleri: " + ", ".join(missing)
            + " — youtube/README.md kurulum adımlarına bak."
        )
    return Credentials(
        token=None,
        refresh_token=os.environ["YT_REFRESH_TOKEN"],
        token_uri=TOKEN_URI,
        client_id=os.environ["YT_CLIENT_ID"],
        client_secret=os.environ["YT_CLIENT_SECRET"],
        scopes=SCOPES,
    )


def upload_video(path: Path, metadata: dict) -> str:
    yt = build("youtube", "v3", credentials=_credentials())
    body = {
        "snippet": {
            "title": metadata["title"],
            "description": metadata["description"],
            "tags": metadata.get("tags", []),
            "categoryId": "27",  # Education
            "defaultLanguage": "tr",
            "defaultAudioLanguage": "tr",
        },
        "status": {
            "privacyStatus": os.environ.get("YT_PRIVACY", "public"),
            "selfDeclaredMadeForKids": False,
        },
    }
    media = MediaFileUpload(str(path), mimetype="video/mp4",
                            chunksize=4 * 1024 * 1024, resumable=True)
    request = yt.videos().insert(part="snippet,status", body=body, media_body=media)
    response = None
    while response is None:
        _, response = request.next_chunk()
    return response["id"]
