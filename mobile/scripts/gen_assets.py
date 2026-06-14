#!/usr/bin/env python3
"""Kül & Köz görsel üretici — Cloudflare Workers AI (FLUX-1-schnell), ücretsiz.
Anahtarlar ENV'den okunur (repoya YAZILMAZ):  CF_T = API token, CF_A = account id.
Kullanım:  CF_T=... CF_A=... python3 scripts/gen_assets.py portre|hero|arma|all
Çıktı: assets/portre/*.jpg  (mevcut dosyalar üzerine yazılır)
"""
import os, sys, json, base64, urllib.request, time
T = os.environ.get("CF_T"); A = os.environ.get("CF_A")
URL = f"https://api.cloudflare.com/client/v4/accounts/{A}/ai/run/@cf/black-forest-labs/flux-1-schnell"
STIL = ("13th century medieval Anatolia, ottoman miniature oil painting, warm ember and gold candlelight, "
        "dark ash background, painterly, atmospheric, no text, no watermark, no border")
PORTRE = ("head and shoulders, facing viewer, " + STIL)

PORTRELER = {
    "e_cocuk": "a 9 year old Anatolian peasant boy, innocent face",
    "e_ergen": "a 15 year old Anatolian teenage boy",
    "e_genc": "a 21 year old Anatolian young man, short hair",
    "e_yetiskin": "a 28 year old Anatolian man, light stubble",
    "e_olgun": "a 40 year old Anatolian man with a short dark beard",
    "e_yasli": "a 52 year old Anatolian man, greying beard, weathered face",
    "e_ihtiyar": "a 68 year old Anatolian old man, white beard, deep wrinkles",
    "k_cocuk": "a 9 year old Anatolian peasant girl, innocent face",
    "k_ergen": "a 15 year old Anatolian teenage girl, simple headscarf",
    "k_genc": "a 21 year old Anatolian young woman, headscarf",
    "k_yetiskin": "a 28 year old Anatolian woman, headscarf",
    "k_olgun": "a 40 year old Anatolian woman, headscarf, kind eyes",
    "k_yasli": "a 52 year old Anatolian woman, headscarf, lined face",
    "k_ihtiyar": "a 68 year old Anatolian old woman, white hair under headscarf, wrinkled",
}

def run(path, prompt, steps=6):
    body = json.dumps({"prompt": prompt, "steps": steps}).encode()
    req = urllib.request.Request(URL, data=body, headers={"Authorization": f"Bearer {T}", "Content-Type": "application/json"})
    for _ in range(3):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                img = (json.load(r).get("result") or {}).get("image")
                if img:
                    os.makedirs(os.path.dirname(path), exist_ok=True)
                    open(path, "wb").write(base64.b64decode(img)); return True
        except Exception:
            time.sleep(3)
    return False

def gen_portre():
    for k, d in PORTRELER.items():
        ok = run(f"assets/portre/{k}.jpg", f"{d}, {PORTRE}")
        print(("✅ " if ok else "❌ ") + k); time.sleep(1.2)

if __name__ == "__main__":
    if not T or not A:
        sys.exit("CF_T ve CF_A ortam değişkenleri gerekli.")
    what = sys.argv[1] if len(sys.argv) > 1 else "portre"
    if what in ("portre", "all"): gen_portre()
    print("bitti.")
