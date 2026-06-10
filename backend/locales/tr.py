# -*- coding: utf-8 -*-
"""Türkçe metinler — kaynak dil.

Key biçimi: "alan.alt_anahtar". Değişkenler {isim} ile enjekte edilir.
Cümle yapısı dil-güvenli olmalı: tam cümle şablonları, kelime ekleme değil.
"""

STRINGS = {
    # ── Mal adları (market/envanter etiketleri) ─────────────────────────
    "mal.buğday": "Buğday",
    "mal.un": "Un",
    "mal.ekmek": "Ekmek",
    "mal.et": "Et",
    "mal.yün": "Yün",
    "mal.kumaş": "Kumaş",
    "mal.kıyafet": "Kıyafet",
    "mal.demir_cevheri": "Demir Cevheri",
    "mal.demir": "Demir",
    "mal.silah": "Silah",
    "mal.alet": "Alet",
    "mal.üzüm": "Üzüm",
    "mal.şıra": "Şıra",
    "mal.şarap": "Şarap",
    "mal.odun": "Odun",
    "mal.kereste": "Kereste",
    "mal.mobilya": "Mobilya",
    "mal.deri": "Deri",
    "mal.işlenmiş_deri": "İşlenmiş Deri",
    "mal.zırh": "Zırh",
    "mal.çizme": "Çizme",
    "mal.ipek": "İpek",
    "mal.baharat": "Baharat",

    # ── Üretim & ekonomi olayları ────────────────────────────────────────
    "uretim.kitlik_etkisi": "{loc}'de {good} arzı tükendi: halk aç, huzursuzluk arttı.",
    "uretim.zanaat_durgun": "{loc}'de {profession} ustaları hammadde bulamıyor; tezgâhlar boş duruyor.",
    "uretim.zanaat_patlamasi": "{loc}'de {good} üretimi canlandı; atölyeler gece gündüz çalışıyor.",

    # ── Piyasa olayları (Faz 1C havuzunun ilk tohumları) ────────────────
    "piyasa.kitlik": "{loc}'de kötü hasat: {good} arzı düştü, fiyatlar yükseldi.",
    "piyasa.bolluk_hasadi": "{loc}'de bereketli hasat! {good} ambarları doldurdu, fiyatlar geriledi.",
    "piyasa.kervan_baskini": "{loc} yolunda kervan soyuldu: {good} sevkiyatı kayboldu, fiyatlar tırmanıyor.",
    "piyasa.savas_talebi": "Savaş tamtamları {loc}'de {good} talebini patlattı; demirciler yetişemiyor.",
    "piyasa.salgin_talebi": "{loc}'de hastalık söylentileri; şifalı mallara talep arttı.",
    "piyasa.dugun_sezonu": "{loc}'de düğün sezonu açıldı: kumaş ve şarap tezgâhlarında izdiham var.",

    # ── Kıtlık & açlık ───────────────────────────────────────────────────
    "aclik.oto_yeme": "Acıkınca envanterinden {food} yedin.",
    "aclik.erken_durma": "Yiyecek stoğun tükendi ve açlık kritik seviyeye düştü. Zaman atlaması durduruldu.",
}
