# -*- coding: utf-8 -*-
"""
İçerik kaynağı — facts.py destesinden günlük "Biliyor muydun?" senaryosu üretir.

Video akışı: soru (kanca) → cevap (reveal) → açıklama (detay) → CTA.
Yayınlananlar youtube/published.json'da tutulur; deste bitince sıfırlanır.
"""
import json
import random
import re
from pathlib import Path

from facts import FACTS

ROOT = Path(__file__).resolve().parent
PUBLISHED_FILE = ROOT / "published.json"

_EMOJI_RE = re.compile("[\U0001F000-\U0001FAFF☀-➿⬀-⯿️]+")

# Kategori → ek SEO etiketleri
CATEGORY_TAGS = {
    "UZAY": ["uzay", "astronomi", "gezegenler", "nasa"],
    "HAYVANLAR": ["hayvanlar", "doğa", "hayvanlar alemi", "vahşi yaşam"],
    "İNSAN VÜCUDU": ["insan vücudu", "sağlık", "biyoloji", "anatomi"],
    "TARİH": ["tarih", "tarihi olaylar", "tarih bilgisi"],
    "BİLİM": ["bilim", "fizik", "teknoloji", "bilimsel gerçekler"],
    "DÜNYA": ["coğrafya", "dünya", "ülkeler", "gezi"],
}

BASE_TAGS = [
    "biliyor muydun", "ilginç bilgiler", "şaşırtıcı gerçekler",
    "genel kültür", "bilgi", "shorts", "öğretici",
]

HASHTAGS = "#biliyormuydun #ilginçbilgiler #bilgi #genelkültür #keşfet #shorts"


def temizle(text: str) -> str:
    """Emoji ve fazla boşlukları at (font/TTS güvenliği)."""
    return _EMOJI_RE.sub("", text or "").strip()


def load_published():
    if PUBLISHED_FILE.exists():
        return json.loads(PUBLISHED_FILE.read_text(encoding="utf-8"))
    return {"published": []}


def save_published(data):
    PUBLISHED_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def pick_fact(fact_id: str | None = None):
    """Yayınlanmamış rastgele bir bilgi seç (veya id ile belirli birini)."""
    if fact_id:
        for f in FACTS:
            if f["id"] == fact_id:
                return f
        raise SystemExit(f"Bilgi bulunamadı: {fact_id}")

    done = set(load_published()["published"])
    pool = [f for f in FACTS if f["id"] not in done]
    if not pool:  # deste bitti — baştan başla
        pool = FACTS
    return random.choice(pool)


def build_script(fact):
    """Videonun bölümlerini üret: her bölüm = (ekran içeriği, seslendirme metni)."""
    soru = temizle(fact["soru"])
    cevap = temizle(fact["cevap"])
    aciklama = temizle(fact["aciklama"])
    kategori = fact["kategori"]

    segments = [
        {
            "kind": "hook",
            "screen": {"label": "BİLİYOR MUYDUN?", "title": soru},
            "voice": f"Biliyor muydun? {soru}",
        },
        {
            "kind": "reveal",
            "screen": {"label": kategori, "title": cevap},
            "voice": cevap,
        },
        {
            "kind": "detail",
            "screen": {"label": kategori, "body": aciklama},
            "voice": aciklama,
        },
        {
            "kind": "cta",
            "screen": {"label": "HER GÜN YENİ BİR BİLGİ",
                       "body": "Bildin mi? Yorumlara yaz!"},
            "voice": "Peki sen bunu biliyor muydun? Yorumlara yaz. "
                     "Her gün yeni bir bilgi için takip et.",
        },
    ]

    metadata = {
        "title": f"{soru} 🤯 #shorts"[:100],
        "description": (
            f"{soru}\n\nCevap: {cevap} {aciklama}\n\n"
            "🔔 Her gün yeni bir şaşırtıcı bilgi için abone ol!\n"
            "💬 Sen bunu biliyor muydun? Yorumlara yaz!\n\n"
            f"{HASHTAGS}"
        ),
        "tags": (BASE_TAGS + CATEGORY_TAGS.get(kategori, []))[:15],
    }
    return segments, metadata


def mark_published(fact_id: str, video_id: str | None, date: str):
    data = load_published()
    if fact_id not in data["published"]:
        data["published"].append(fact_id)
    data.setdefault("log", []).append(
        {"fact_id": fact_id, "video_id": video_id, "date": date}
    )
    save_published(data)
