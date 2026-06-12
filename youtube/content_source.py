# -*- coding: utf-8 -*-
"""
İçerik kaynağı — oyunun kendi life-event havuzundan Shorts senaryosu üretir.

Her event bir "Sen Olsan Ne Yapardın?" videosu olur:
  kanca → hikâye → seçenekler → CTA (yorumlara yaz)
Yayınlananlar youtube/published.json'da tutulur; havuz bitince sıfırlanır.
"""
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT.parent / "backend"
PUBLISHED_FILE = ROOT / "published.json"

sys.path.insert(0, str(BACKEND))

_EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF☀-➿⬀-⯿️]+"
)

CHOICE_LABELS = ["A", "B", "C", "D"]
CHOICE_WORDS = ["Birinci seçenek", "İkinci seçenek", "Üçüncü seçenek", "Dördüncü seçenek"]


def temizle(text: str) -> str:
    """Emoji ve fazla boşlukları at (font/TTS güvenliği)."""
    return _EMOJI_RE.sub("", text or "").strip()


def load_events():
    from life_events import LIFE_EVENTS
    from life_events_v2 import LIFE_EVENTS_V2
    events = LIFE_EVENTS + LIFE_EVENTS_V2
    return [
        e for e in events
        if e.get("title") and e.get("description") and len(e.get("choices", [])) >= 2
    ]


def load_published():
    if PUBLISHED_FILE.exists():
        return json.loads(PUBLISHED_FILE.read_text(encoding="utf-8"))
    return {"published": []}


def save_published(data):
    PUBLISHED_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def pick_event(event_id: str | None = None):
    """Yayınlanmamış rastgele bir event seç (veya id ile belirli birini)."""
    events = load_events()
    if event_id:
        for e in events:
            if e["id"] == event_id:
                return e
        raise SystemExit(f"Event bulunamadı: {event_id}")

    done = set(load_published()["published"])
    pool = [e for e in events if e["id"] not in done]
    if not pool:  # havuz bitti — baştan başla
        pool = events
    return random.choice(pool)


def build_script(event):
    """Videonun bölümlerini üret: her bölüm = (ekran metni, seslendirme metni)."""
    title = temizle(event["title"])
    desc = temizle(event["description"])
    choices = [temizle(c["text"]) for c in event["choices"][:4]]

    segments = [
        {
            "kind": "hook",
            "screen": {"label": "SEN OLSAN NE YAPARDIN?", "title": title},
            "voice": f"Sen olsan ne yapardın? {title}.",
        },
        {
            "kind": "story",
            "screen": {"label": "HİKÂYE", "body": desc},
            "voice": desc,
        },
        {
            "kind": "choices",
            "screen": {"label": "SEÇİMİN HANGİSİ?", "choices": choices},
            "voice": " ".join(
                f"{CHOICE_WORDS[i]}: {c}." for i, c in enumerate(choices)
            ),
        },
        {
            "kind": "cta",
            "screen": {
                "label": "KRONİKLER — KÜLLERİN MİRASI",
                "body": "Cevabını yorumlara yaz!",
            },
            "voice": "Cevabını yorumlara yaz. Bu hikâye ve yüzlercesi, Kronikler'de seni bekliyor.",
        },
    ]

    choice_lines = "\n".join(
        f"{CHOICE_LABELS[i]}) {c}" for i, c in enumerate(choices)
    )
    metadata = {
        "title": f"{title} — Sen Olsan Ne Yapardın? #Shorts"[:100],
        "description": (
            f"{desc}\n\n{choice_lines}\n\n"
            "Cevabını yorumlara yaz! 👇\n\n"
            "Kronikler: Küllerin Mirası — yaşayan bir ortaçağ dünyasında "
            "hayat simülasyonu. Her seçim kalıcı, her nesil bir roman.\n\n"
            "#kronikler #oyun #hikaye #senolsan #interaktif #rpg #shorts"
        ),
        "tags": [
            "kronikler", "sen olsan ne yapardın", "interaktif hikaye",
            "yaşam simülasyonu", "rpg", "türkçe oyun", "shorts",
        ],
    }
    return segments, metadata


def mark_published(event_id: str, video_id: str | None, date: str):
    data = load_published()
    if event_id not in data["published"]:
        data["published"].append(event_id)
    data.setdefault("log", []).append(
        {"event_id": event_id, "video_id": video_id, "date": date}
    )
    save_published(data)
