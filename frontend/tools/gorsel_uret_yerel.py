#!/usr/bin/env python3
"""Kül & Köz görsel üretici — YEREL geri dönüş (SD-Turbo, CPU).

Pollinations/FLUX'a ağ erişimi olmayan ortamlar için: aynı VARLIKLAR
listesini (gorsel_uret.py) Stable Diffusion Turbo ile yerel üretir.
GPU gerekmez; 4 çekirdek CPU'da görsel başına ~1 dk sürer.

Kalite notu: SD-Turbo, FLUX'tan bir kademe düşüktür. Köprü (Gorsel.jsx)
dosya adına baktığı için ileride FLUX erişimi olan bir ortamda dosyaları
silip `gorsel_uret.py` çalıştırmak sıfır kod değişikliğiyle yükseltir.

Kullanım:  python tools/gorsel_uret_yerel.py [--sadece hero|arma|portre|ikon]
Bağımlılık: pip install torch --index-url https://download.pytorch.org/whl/cpu
            pip install diffusers transformers accelerate safetensors pillow
"""
import os
import sys

# VARLIKLAR'daki seed'ler hash() ile türetilir; Python str hash'i süreç
# başına rastgeledir. Yeniden üretilebilirlik için sabitleyip yeniden başla.
if os.environ.get("PYTHONHASHSEED") != "0":
    os.environ["PYTHONHASHSEED"] = "0"
    os.execv(sys.executable, [sys.executable] + sys.argv)

from gorsel_uret import KOK, VARLIKLAR  # noqa: E402 (re-exec sonrası)

MODEL = "stabilityai/sd-turbo"

# SD-Turbo 512px eğitimli — büyük tuvalde desen tekrarı yapar. Üretim
# boyutu ayrı tutulur, hedefe PIL Lanczos ile ölçeklenir (yağlıboya stil
# yumuşamayı iyi taşır; küçültme ise her zaman netleştirir).
URETIM_BOYUTU = {
    "hero":   (768, 432),   # 16:9 korunur → 1024×576'ya büyütülür
    "arma":   (512, 512),
    "portre": (512, 512),   # 384'e küçültülür
    "ikon":   (512, 512),
}


def uret(pipe, v, torch):
    from PIL import Image

    hedef = os.path.normpath(os.path.join(KOK, v["yol"]))
    if os.path.exists(hedef) and os.path.getsize(hedef) > 10000:
        return "atlandı (mevcut)"
    os.makedirs(os.path.dirname(hedef), exist_ok=True)

    gw, gh = URETIM_BOYUTU[v["grup"]]
    img = pipe(
        prompt=v["prompt"],
        width=gw, height=gh,
        num_inference_steps=4,
        guidance_scale=0.0,   # turbo damıtımı CFG kullanmaz
        generator=torch.Generator("cpu").manual_seed(v["seed"]),
    ).images[0]

    w, h = v["boyut"]
    if (w, h) != (gw, gh):
        img = img.resize((w, h), Image.LANCZOS)
    if hedef.endswith(".png"):
        img.save(hedef, "PNG")
    else:
        img.save(hedef, "JPEG", quality=88, optimize=True)
    return f"OK ({os.path.getsize(hedef) // 1024} KB)"


if __name__ == "__main__":
    sadece = None
    if "--sadece" in sys.argv:
        sadece = sys.argv[sys.argv.index("--sadece") + 1]
    isler = [v for v in VARLIKLAR if not sadece or v["grup"] == sadece]

    import torch
    from diffusers import AutoPipelineForText2Image
    torch.set_num_threads(os.cpu_count() or 4)
    print(f"{MODEL} yükleniyor… (ilk seferde ~5 GB indirir)", flush=True)
    pipe = AutoPipelineForText2Image.from_pretrained(
        MODEL, torch_dtype=torch.float32)
    pipe.set_progress_bar_config(disable=True)
    pipe.to("cpu")

    print(f"{len(isler)} görsel üretilecek…", flush=True)
    hata = 0
    for i, v in enumerate(isler, 1):
        try:
            sonuc = uret(pipe, v, torch)
        except Exception as e:  # tek görsel hatası koşuyu durdurmasın
            sonuc, hata = f"HATA: {str(e)[:80]}", hata + 1
        print(f"  [{i}/{len(isler)}] {v['yol']}: {sonuc}", flush=True)
    print(f"Bitti — hata: {hata}")
    sys.exit(1 if hata else 0)
