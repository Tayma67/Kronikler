# -*- coding: utf-8 -*-
"""
TEK SEFERLİK kurulum aracı — kendi bilgisayarında çalıştır.

Google hesabınla tarayıcıda yetki verirsin; çıkan refresh token'ı
GitHub Secrets'a YT_REFRESH_TOKEN olarak eklersin.

Kullanım:
  pip install google-auth-oauthlib
  python get_refresh_token.py
"""
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

client_id = input("OAuth Client ID: ").strip()
client_secret = input("OAuth Client Secret: ").strip()

flow = InstalledAppFlow.from_client_config(
    {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"],
        }
    },
    SCOPES,
)
creds = flow.run_local_server(port=0, prompt="consent", access_type="offline")

print("\n──────────────────────────────────────────────")
print("YT_REFRESH_TOKEN olarak GitHub Secrets'a ekle:")
print(creds.refresh_token)
print("──────────────────────────────────────────────")
