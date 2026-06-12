"""Vercel Serverless giriş noktası — Railway'den taşınma (GDD v8).

Vercel, backend kök dizininde `api/index.py` içindeki ASGI `app`
nesnesini otomatik fonksiyona çevirir. Tüm rotalar vercel.json'daki
rewrite ile buraya akar. Kod değişikliği gerekmez: mevcut FastAPI
uygulaması olduğu gibi sunulur.

Gerekli ortam değişkenleri (Vercel proje ayarlarından):
  MONGO_URL, DB_NAME, JWT_SECRET, CORS_ORIGINS (ops.)
"""
import os
import sys

# backend/ kökünü import yoluna ekle (api/ alt dizininden çalışıyoruz)
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app  # noqa: E402,F401  (Vercel `app`i arar)
