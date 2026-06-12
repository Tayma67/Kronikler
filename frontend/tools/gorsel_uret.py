#!/usr/bin/env python3
"""Kül & Köz görsel varlık üretici (GDD v8 SAHNE-3).

Ücretsiz/anahtarsız Pollinations (FLUX) ile tüm oyun görsellerini üretir.
Ortamın ağ izinlerinde `image.pollinations.ai` açık olmalı.

Kullanım:  python tools/gorsel_uret.py [--sadece hero|arma|portre|ikon]
Çıktılar:  public/images/{hero,arma,portre}/ + public/icon-512.png
Mevcut dosyalar atlanır (yeniden üretmek için dosyayı sil).
"""
import os
import sys
import time
import urllib.parse
import urllib.request

KOK = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "public", "images")

# Tutarlı sanat yönü — her istekte aynı kuyruk
STIL = ("13th century medieval Anatolia, cinematic oil painting, warm ember "
        "and gold light, ash dark tones, painterly, atmospheric, "
        "no text, no watermark, no border")

PORTRE_STIL = ("medieval Anatolian portrait, 13th century, oil painting, "
               "warm candlelight, dark background, head and shoulders, "
               "facing viewer, no text, no watermark")

VARLIKLAR = []

# ── Herolar: dönem × mevsim (çocuk fotoğrafları zaten var) ──────────────
for donem, tarif in [("genc", "a young adult villager standing"),
                     ("orta", "a weathered middle-aged villager standing"),
                     ("yasli", "an old grey-bearded villager standing")]:
    for mevsim, sahne in [("yaz", "golden wheat fields under blazing summer sun"),
                          ("kis", "snow covered village rooftops, smoke from chimneys"),
                          ("sonbahar", "amber autumn leaves over stone houses"),
                          ("ilkbahar", "blossoming trees and green hills")]:
        VARLIKLAR.append({
            "grup": "hero",
            "yol": f"hero/{donem}_{mevsim}.jpg",
            "boyut": (1024, 576),
            "seed": hash(f"{donem}{mevsim}") % 99999,
            "prompt": f"{tarif} in {sahne}, view from behind at distance, {STIL}",
        })

# ── Hanedan armaları: 6 arketip ─────────────────────────────────────────
for hid, arma in [("acimasiz_tuccar", "a black wolf head heraldic crest on dark red shield"),
                  ("eski_soylu", "a golden crown heraldic crest on deep gold shield"),
                  ("golge_eli", "a curved dagger heraldic crest on dark purple shield"),
                  ("dindar_hayirsever", "a crescent and star heraldic crest on emerald shield"),
                  ("asker_ocagi", "crossed swords heraldic crest on steel grey shield"),
                  ("yukselen_koylu", "a wheat sprout heraldic crest on olive green shield")]:
    VARLIKLAR.append({
        "grup": "arma",
        "yol": f"arma/{hid}.jpg",
        "boyut": (512, 512),
        "seed": hash(hid) % 99999,
        "prompt": f"{arma}, medieval Seljuk ornament style, centered emblem, "
                  "dark background, oil painting, no text, no watermark",
    })

# ── NPC portreleri: cinsiyet × yaş kuşağı × 3 varyant (18 adet) ─────────
for cins, ctarif in [("e", "man"), ("k", "woman")]:
    for kusak, ktarif in [("genc", "young"), ("orta", "middle-aged"),
                          ("yasli", "elderly")]:
        for v in (1, 2, 3):
            VARLIKLAR.append({
                "grup": "portre",
                "yol": f"portre/{cins}_{kusak}_{v}.jpg",
                "boyut": (384, 384),
                "seed": hash(f"{cins}{kusak}{v}") % 99999,
                "prompt": f"a {ktarif} Anatolian {ctarif}, {PORTRE_STIL}",
            })

# ── Uygulama ikonu ──────────────────────────────────────────────────────
VARLIKLAR.append({
    "grup": "ikon",
    "yol": "../icon-512.png",
    "boyut": (512, 512),
    "seed": 1247,
    "prompt": "ornate letter K medallion, gold on dark ember background, "
              "medieval Seljuk ornament ring, app icon, centered, "
              "no text besides the letter, no watermark",
})


def indir(v):
    hedef = os.path.normpath(os.path.join(KOK, v["yol"]))
    if os.path.exists(hedef) and os.path.getsize(hedef) > 10000:
        return "atlandı (mevcut)"
    os.makedirs(os.path.dirname(hedef), exist_ok=True)
    w, h = v["boyut"]
    url = ("https://image.pollinations.ai/prompt/"
           + urllib.parse.quote(v["prompt"])
           + f"?width={w}&height={h}&seed={v['seed']}&nologo=true&model=flux")
    for deneme in range(3):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                veri = r.read()
            if len(veri) < 10000:
                raise RuntimeError(f"küçük yanıt: {len(veri)}B")
            with open(hedef, "wb") as f:
                f.write(veri)
            return f"OK ({len(veri)//1024} KB)"
        except Exception as e:
            son = str(e)[:80]
            time.sleep(4 * (deneme + 1))
    return f"HATA: {son}"


if __name__ == "__main__":
    sadece = None
    if "--sadece" in sys.argv:
        sadece = sys.argv[sys.argv.index("--sadece") + 1]
    isler = [v for v in VARLIKLAR if not sadece or v["grup"] == sadece]
    print(f"{len(isler)} görsel üretilecek…")
    hata = 0
    for i, v in enumerate(isler, 1):
        sonuc = indir(v)
        print(f"  [{i}/{len(isler)}] {v['yol']}: {sonuc}", flush=True)
        if sonuc.startswith("HATA"):
            hata += 1
    print(f"Bitti — hata: {hata}")
    sys.exit(1 if hata else 0)
