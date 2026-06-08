"""
FACTION & LORDLUK / BÖLGE KONTROL SİSTEMİ
==========================================
Kronikler: Küllerin Mirası — Dinamik Güç Dengesi Motoru

Temel İlke: Her değişim bir SEBEBE bağlı. Hiçbir şey açıklamasız değişmez.
Sistem emergent behavior üretir: sabit script değil, sebep→sonuç zinciri.

Modül yapısı:
  1. Veri Modelleri (Faction, Region, War)
  2. Faction Dinamikleri (ekonomi, stabilite, korku, itibar zincirleri)
  3. NPC Karar Motoru (loyalty, greed, ambition, fear tabanlı)
  4. Bölge Kontrol Sistemi (güvenlik, unrest, kaynak yönetimi)
  5. Savaş Motoru (terrain, morale, supply, leader skill)
  6. AI Karar Sistemi (utility-based scoring)
  7. Dünya Tick Entegrasyonu (simulation.py ile)
  8. Oyuncu Etkisi API'si
"""

from __future__ import annotations
import random
import math
from typing import Optional
from world_gen import new_id, MALE_NAMES, FEMALE_NAMES, SURNAMES

# ─────────────────────────────────────────────────────────────────────────────
# SABITLER
# ─────────────────────────────────────────────────────────────────────────────

FACTION_TYPES = ["kabile", "lonca", "şehir_devleti", "krallık", "asi"]

DIPLOMACY_STATES = ["müttefik", "tarafsız", "düşman"]

REGION_RESOURCES = ["tarım", "maden", "orman", "ticaret_yolu", "kale", "liman"]

# Utility skoru hesabında ağırlıklar
ACTION_WEIGHTS = {
    "savaş_aç":        {"gain": 0.35, "risk": -0.40, "stability": -0.20, "economic": -0.15, "reputation": -0.10},
    "savunma_güçlendir":{"gain": 0.15, "risk": -0.20, "stability":  0.15, "economic": -0.20, "reputation":  0.10},
    "vergi_artır":     {"gain": 0.40, "risk": -0.15, "stability": -0.35, "economic":  0.10, "reputation": -0.15},
    "vergi_azalt":     {"gain":-0.20, "risk":  0.05, "stability":  0.30, "economic": -0.10, "reputation":  0.20},
    "ittifak_kur":     {"gain": 0.10, "risk":  0.05, "stability":  0.10, "economic":  0.05, "reputation":  0.15},
    "isyan_bastır":    {"gain": 0.10, "risk": -0.30, "stability":  0.35, "economic": -0.25, "reputation": -0.10},
    "bölgeye_yatırım": {"gain": 0.25, "risk":  0.05, "stability":  0.20, "economic": -0.30, "reputation":  0.20},
    "casusluk":        {"gain": 0.30, "risk": -0.15, "stability":  0.00, "economic": -0.05, "reputation": -0.05},
    "göç_teşvik":      {"gain": 0.15, "risk":  0.00, "stability":  0.10, "economic": -0.10, "reputation":  0.10},
}

# ─────────────────────────────────────────────────────────────────────────────
# YARDIMCI FONKSİYONLAR
# ─────────────────────────────────────────────────────────────────────────────

def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _noise(pct: float = 0.15) -> float:
    """Küçük rastlantısal gürültü — determinizmi kırar ama kontrolsüz değil."""
    return random.uniform(1.0 - pct, 1.0 + pct)


# P3b: Faction açılış sistemi sabitleri
_ALWAYS_ACTIVE_TYPES = {"krallık_ordusu", "tuccar_loncasi", "eskiya_cetesi"}
_SECRET_TYPES        = {"gizli_cemiyet"}
_CLUE_THRESHOLD      = 5   # Bu kadar ipucu = ifşa hakkı açılır

# ─────────────────────────────────────────────────────────────────────────────
# GDD v3: ÇATIŞMA SİSTEMİ SABİTLERİ
# ─────────────────────────────────────────────────────────────────────────────

# Katman 1: Saldırı tipi matrisi — hangi faction kimi hedefleyebilir
# None = herhangi birini hedefleyebilir
ATTACK_TYPE_MATRIX: dict[str, set | None] = {
    "eskiya_cetesi":    None,                                               # Herkesi
    "krallık_ordusu":  {"eskiya_cetesi", "paralı_asker", "gizli_cemiyet"}, # Başıbozuk PA + ifşa GC
    "paralı_asker":    None,                                               # Kiralandığı hedef (şifacı hariç)
    "dini_tarikat":    {"eskiya_cetesi", "gizli_cemiyet"},
    "tuccar_loncasi":  set(),    # Kimseyi — ambargo kullanır
    "zanaatkar_loncasi": set(),
    "ilim_cemiyeti":   set(),
    "şifacı_birliği":  set(),
    "gizli_cemiyet":   set(),    # Açık savaş yok — operasyonlar kullanır
    "seyyah_kumpanya": set(),
    # Geriye dönük uyumluluk için eski tipler
    "kabile":          None,
    "lonca":           None,
    "şehir_devleti":   None,
    "krallık":         None,
    "asi":             None,
}

# Paralı asker hiçbir zaman şifacıya saldıramaz
PA_CANNOT_ATTACK = {"şifacı_birliği"}

# Savaş sonrası ateşkes süreleri (tur)
TRUCE_DURATIONS = {
    "normal_savas":     20,
    "kiralama_savasi":  10,
    "inanc_savasi":     35,
    "darbe_girisimi":   50,
}

# Aggression skoru değişimleri
AGGRESSION_CHANGES = {
    "savas_ilan":             +2,
    "sivile_saldiri":         +5,   # Tüccar, İlim, Zanaatkar, Şifacı hedef alınırsa
    "kutsal_alan_saldiri":    +8,
    "şifacı_saldiri":         +15,  # Evrensel itibar kaybı (en yüksek)
    "dogal_dusus_per_turn":   -0.3,
}

# Aggression eşikleri
AGGRESSION_COALITION_THRESHOLD  = 15   # Bu değeri geçen KO koalisyon kurabilir
AGGRESSION_KO_INTERVENTION      = 25   # KO müdahale yükümlülüğü

# Casus belli türleri ve skorları
CASUS_BELLI_SCORES = {
    "dogrudan_saldiri":         50,
    "muttefik_saldiriya_ugradi":30,
    "bolge_el_koymasi":         25,
    "ticaret_engeli":           15,
    "inanc_tehdidi":            40,
    "ifsa_operasyonu":          35,
}
CB_MEŞRUIYET_EŞIĞI = 20   # CB skoru bu değerin üzerindeyse savaş meşru sayılır

# Pasif faction tipleri (sivil — saldırıya uğrarlarsa aggression artar)
CIVILIAN_FACTION_TYPES = {
    "tuccar_loncasi", "ilim_cemiyeti", "zanaatkar_loncasi", "şifacı_birliği"
}

# v3 AI karar ağırlıkları — faction tipine göre
FACTION_AI_WEIGHTS: dict[str, dict[str, float]] = {
    "krallık_ordusu": {
        "bölgeye_yatırım":  0.25,
        "ittifak_kur":      0.10,
        "asayiş_müdahale":  0.20,
        "savunma_güçlendir":0.15,
        "savaş_aç":         0.10,
        "sehir_yukselt":    0.20,   # GDD v4.0: yeni eylem
    },
    "paralı_asker": {
        "savaş_aç":        0.35,
        "savunma_güçlendir": 0.20,
        "ittifak_kur":     0.10,
        "bölgeye_yatırım": 0.20,
        "pasif_kal":       0.15,
    },
    "eskiya_cetesi": {
        "savaş_aç":        0.50,
        "savunma_güçlendir": 0.15,
        "bölgeye_yatırım": 0.15,
        "pasif_kal":       0.20,
    },
    "tuccar_loncasi": {
        "bölgeye_yatırım": 0.25,
        "ittifak_kur":     0.15,
        "ambargo":         0.20,
        "sehir_yukselt":   0.20,   # GDD v4.0: yeni eylem
        "uye_kazan":       0.10,   # GDD v4 Bölüm 6
        "pasif_kal":       0.10,
    },
    "zanaatkar_loncasi": {
        "bölgeye_yatırım": 0.25,
        "ittifak_kur":     0.20,
        "sehir_yukselt":   0.25,   # GDD v4.0: yeni eylem
        "uye_kazan":       0.10,   # GDD v4 Bölüm 6
        "pasif_kal":       0.20,
    },
    "ilim_cemiyeti": {
        "bölgeye_yatırım": 0.25,
        "ittifak_kur":     0.20,
        "yardım_çağrısı":  0.15,
        "arabuluculuk":    0.25,  # GDD v4 Bölüm 1.4
        "uye_kazan":       0.15,   # GDD v4 Bölüm 6
    },
    "şifacı_birliği": {
        "evrensel_yardım": 0.40,
        "bölgeye_yatırım": 0.30,
        "pasif_kal":       0.30,
    },
    "dini_tarikat": {
        "bölgeye_yatırım":        0.15,
        "ittifak_kur":            0.10,
        "fetva_ver":              0.20,
        "şeriat_ilan":            0.15,
        "savaş_aç":               0.05,
        "misyoner_gonder":        0.25,   # GDD v4.0: yeni eylem
        "darbe_hazirlik_baslat":  0.10,   # GDD v4.0: yeni eylem
    },
    "gizli_cemiyet": {
        "suikast":                0.25,
        "sabotaj":                0.20,
        "manipülasyon":           0.20,
        "bölgeye_yatırım":        0.10,
        "darbe_hazirlik_baslat":  0.20,   # GDD v4.0: yeni eylem
        "pasif_kal":              0.05,
    },
    "seyyah_kumpanya": {
        "istihbarat_sat":   0.40,
        "bölgeye_yatırım":  0.30,
        "pasif_kal":        0.30,
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# GDD v4.0: YENİ EYLEM META-VERİLERİ
# _execute_faction_action içindeki yeni eylemler bu dict'ten maliyet/kısıt okur.
# ─────────────────────────────────────────────────────────────────────────────
FACTION_ACTIONS = {
    "misyoner_gonder": {
        "maliyet":      200,
        "uygun_tipler": {"dini_tarikat", "ilim_cemiyeti", "gizli_cemiyet", "şifacı_birliği"},
    },
    "sehir_yukselt": {
        "maliyet":      500,
        "uygun_tipler": {"krallık_ordusu", "tuccar_loncasi", "zanaatkar_loncasi",
                         "şehir_devleti", "dini_tarikat"},
    },
    "darbe_hazirlik_baslat": {
        "maliyet":       300,
        "hazirlik_tur":  15,          # plan kaç turda olgunlaşır
        "uygun_tipler":  {"gizli_cemiyet", "dini_tarikat", "eskiya_cetesi",
                          "krallık_ordusu", "paralı_asker"},
    },
    "uye_kazan": {
        "maliyet":      100,
        "uygun_tipler": {"tuccar_loncasi", "zanaatkar_loncasi", "ilim_cemiyeti",
                         "dini_tarikat", "gizli_cemiyet", "şifacı_birliği"},
    },
}


def _log_event(state: dict, turn: int, etype: str, text: str, faction_id: str = None):
    """Hem dünya history'ye hem faction log'una yazar."""
    entry = {
        "id": new_id(),
        "day": turn,
        "type": etype,
        "text": text,
    }
    state.setdefault("history", []).append(entry)
    if faction_id:
        fac = _get_faction(state, faction_id)
        if fac:
            fac.setdefault("event_log", []).append(entry)
            if len(fac["event_log"]) > 100:
                fac["event_log"] = fac["event_log"][-100:]


def _get_faction(state: dict, faction_id: str) -> Optional[dict]:
    return next((f for f in state["world"].get("factions", []) if f["id"] == faction_id), None)


def _get_region(state: dict, region_id: str) -> Optional[dict]:
    return next((r for r in state["world"].get("regions", []) if r["id"] == region_id), None)


def _get_npc(state: dict, npc_id: str) -> Optional[dict]:
    return next((n for n in state["world"]["npcs"] if n["id"] == npc_id), None)


def _faction_by_leader(state: dict, npc_id: str) -> Optional[dict]:
    return next((f for f in state["world"].get("factions", []) if f["leader_id"] == npc_id), None)


# ─────────────────────────────────────────────────────────────────────────────
# GDD v3: ÇATIŞMA SİSTEMİ YARDIMCI FONKSİYONLARI
# ─────────────────────────────────────────────────────────────────────────────

def _get_relation(fac_a: dict, fac_b: dict) -> int:
    """İki faction arasındaki ilişki skorunu döndürür (-100..+100)."""
    return fac_a.get("iliski_skorlari", {}).get(fac_b["id"], 0)


def _change_relation(fac_a: dict, fac_b: dict, delta: int):
    """İlişki skorunu değiştirir, -100..+100 arasında tutar."""
    current = _get_relation(fac_a, fac_b)
    new_val = _clamp(current + delta, -100, 100)
    fac_a.setdefault("iliski_skorlari", {})[fac_b["id"]] = int(new_val)
    fac_b.setdefault("iliski_skorlari", {})[fac_a["id"]] = int(new_val)


def _in_truce(fac_a: dict, fac_b: dict) -> bool:
    """İki faction arasında aktif ateşkes var mı?"""
    return fac_a.get("truce_listesi", {}).get(fac_b["id"], 0) > 0


def _add_truce(fac_a: dict, fac_b: dict, truce_type: str = "normal_savas"):
    """Savaş sonrası ateşkes ekler."""
    dur = TRUCE_DURATIONS.get(truce_type, 20)
    fac_a.setdefault("truce_listesi", {})[fac_b["id"]] = dur
    fac_b.setdefault("truce_listesi", {})[fac_a["id"]] = dur


def _update_truces(factions: list):
    """Her turda ateşkes sürelerini azaltır."""
    for fac in factions:
        truce = fac.get("truce_listesi", {})
        expired = [k for k, v in truce.items() if v <= 1]
        for k in expired:
            del truce[k]
        for k in truce:
            truce[k] = max(0, truce[k] - 1)


def _add_casus_belli(fac: dict, target_id: str, cb_type: str, state: dict, turn: int):
    """Faction'a belirli bir hedefe karşı casus belli ekler."""
    score = CASUS_BELLI_SCORES.get(cb_type, 10)
    current = fac.get("casus_belli", {}).get(target_id, 0)
    fac.setdefault("casus_belli", {})[target_id] = min(100, current + score)
    _log_event(state, turn, "casus_belli",
               f"[{fac['name']}] {target_id} hedefine CB kazandı: {cb_type} (+{score})",
               fac["id"])


def _check_casus_belli(attacker: dict, defender: dict) -> bool:
    """Saldırganın hedefe karşı geçerli bir CB'si var mı?"""
    score = attacker.get("casus_belli", {}).get(defender["id"], 0)
    return score >= CB_MEŞRUIYET_EŞIĞI


def _can_attack(attacker: dict, defender: dict) -> bool:
    """
    Katman 1: Saldırı tipi matrisi kontrolü.
    True → saldırı tipi uygun.
    """
    att_type = attacker.get("type", "")
    def_type = defender.get("type", "")

    allowed = ATTACK_TYPE_MATRIX.get(att_type)
    if allowed is None:
        # Herkesi hedefleyebilir — ama PA şifacıya saldıramaz
        if att_type == "paralı_asker" and def_type in PA_CANNOT_ATTACK:
            return False
        return True
    if not allowed:
        return False  # Kimseyi hedefleyemez

    # Özel durum: gizli_cemiyet ifşa olduysa Krallık Ordusu hedef alabilir
    if att_type == "krallık_ordusu" and def_type == "gizli_cemiyet":
        return defender.get("ifsa_oldu", False)

    return def_type in allowed


def _should_attack(attacker: dict, defender: dict) -> bool:
    """
    Katman 2: İlişki bazlı tetikleyici.
    CB veya ilişki eşiği sağlanıyorsa True.
    """
    relation = _get_relation(attacker, defender)
    has_cb = _check_casus_belli(attacker, defender)
    # Bölge çatışması (her iki faction'ın da yüksek nüfuzu olan bölge var mı?)
    bolge_catismasi = False
    for lid, inf in attacker.get("city_influence", {}).items():
        if inf >= 40 and defender.get("city_influence", {}).get(lid, 0) >= 40:
            bolge_catismasi = True
            break

    return relation < -30 or has_cb or bolge_catismasi


def _update_aggression(fac: dict, delta: float, state: dict, turn: int):
    """Faction'ın aggression skorunu günceller."""
    old = fac.get("aggression_skoru", 0.0)
    fac["aggression_skoru"] = _clamp(old + delta, 0.0, 50.0)
    if delta > 0:
        _log_event(state, turn, "aggression_artis",
                   f"[{fac['name']}] aggression +{delta:.1f} → {fac['aggression_skoru']:.1f}",
                   fac["id"])


def _decay_aggression(factions: list):
    """Her turda tüm faction'ların aggressionunu doğal olarak azaltır."""
    for fac in factions:
        fac["aggression_skoru"] = max(0.0, fac.get("aggression_skoru", 0.0)
                                      + AGGRESSION_CHANGES["dogal_dusus_per_turn"])


def _check_coalition_trigger(state: dict, turn: int):
    """
    Aggression > 25 → Krallık Ordusu müdahale yükümlülüğü.
    Aggression > 15 → diğer factionlar koalisyon kurabilir.
    GDD v4 Bölüm 1.1: orta tehdit koalisyonu eklendi.
    """
    factions = state["world"].get("factions", [])
    ko = next((f for f in factions if f.get("type") == "krallık_ordusu"), None)

    for fac in factions:
        agg = fac.get("aggression_skoru", 0.0)
        if agg > AGGRESSION_KO_INTERVENTION and ko and ko["id"] != fac["id"]:
            # KO müdahale — CB ver ve savaş açmayı değerlendir
            if not _in_truce(ko, fac) and _can_attack(ko, fac):
                _add_casus_belli(ko, fac["id"], "dogrudan_saldiri", state, turn)
                _log_event(state, turn, "ko_mudahale_zorunluluk",
                           f"[{fac['name']}] aggression {agg:.1f} → KO müdahale yükümlülüğü tetiklendi.",
                           ko["id"])

        # GDD v4 Bölüm 1.1: aggression > 15 → zayıf factionlar koalisyon kurabilir
        if agg <= AGGRESSION_COALITION_THRESHOLD:
            continue
        if fac.get("type") in CIVILIAN_FACTION_TYPES:
            continue  # sivil factionlar koalisyon başlatmaz

        members = []
        for other in factions:
            if other["id"] == fac["id"]:
                continue
            rel = _get_relation(other, fac)
            zarar_gordu = fac["id"] in other.get("casus_belli", {})
            if rel < -20 or zarar_gordu:
                katilim_ihtimal = min(0.70, (abs(rel) / 100) * 0.5 + (0.20 if zarar_gordu else 0))
                if random.random() < katilim_ihtimal:
                    members.append(other)

        if len(members) >= 2:
            for m in members:
                _add_casus_belli(m, fac["id"], "dogrudan_saldiri", state, turn)
                for m2 in members:
                    if m["id"] != m2["id"]:
                        _change_relation(m, m2, +15)
            fac["altında_koalisyon"] = [m["id"] for m in members]
            _log_event(state, turn, "koalisyon_kuruldu",
                       f"[{fac['name']}] agresyonu ({agg:.1f}) nedeniyle "
                       f"{len(members)} faction koalisyon kurdu.",
                       fac["id"])


def _try_defense_intervention(attacker: dict, defender: dict, state: dict, turn: int):
    """
    Savunma katmanı: müttefikler ve KO müdahalesi.
    Saldırıya uğrayan factionun yanına kim geçer?
    """
    factions = state["world"].get("factions", [])
    intervened = []

    for fac in factions:
        if fac["id"] in (attacker["id"], defender["id"]):
            continue
        fac_type = fac.get("type", "")
        relation_to_def = _get_relation(fac, defender)
        is_ally = defender["id"] in fac.get("allies", []) or relation_to_def > 20

        # Krallık Ordusu asayiş görevi: eşkıya sivile saldırıyorsa otomatik
        ko_asayis = (
            fac_type == "krallık_ordusu"
            and attacker.get("type") == "eskiya_cetesi"
            and defender.get("type") in CIVILIAN_FACTION_TYPES
            and random.random() < 0.65
        )

        if is_ally or ko_asayis:
            # Müdahale: defender'ın askeri gücünü geçici olarak destekle
            bonus = fac["military_power"] // 4
            defender["military_power"] = min(100, defender["military_power"] + bonus)
            intervened.append(fac["name"])
            _log_event(state, turn, "savunma_mudahale",
                       f"[{fac['name']}] [{defender['name']}]'ı savunmak için müdahale etti.",
                       fac["id"])

    # GDD v4 Bölüm 1.2: Zanaatkar saldırıya uğrarsa grev tetikle
    if defender.get("type") == "zanaatkar_loncasi":
        _trigger_craftsman_strike(defender, attacker, state, turn)

    return intervened


def _ilim_mediation_attempt(ilim_fac: dict, state: dict, turn: int):
    """
    İlim Cemiyeti iki savaşan faction arasında barış önerir.
    GDD v4 Bölüm 1.4
    """
    wars = state["world"].get("wars", [])
    active = [w for w in wars if not w.get("ended_turn")]
    if not active:
        return

    war = max(active, key=lambda w: turn - w.get("start_turn", turn))
    fac_a = _get_faction(state, war.get("attacker_id") or war.get("faction_a"))
    fac_b = _get_faction(state, war.get("defender_id") or war.get("faction_b"))
    if not fac_a or not fac_b:
        return

    ilim_rep = ilim_fac.get("reputation", 50)
    savas_suresi = turn - war.get("start_turn", turn)
    yorgunluk_bonus = min(0.20, savas_suresi * 0.01)
    rel_a = _get_relation(ilim_fac, fac_a) / 100
    rel_b = _get_relation(ilim_fac, fac_b) / 100
    ortalama_iliski = (rel_a + rel_b) / 2

    basari = _clamp(
        ilim_rep / 200
        + yorgunluk_bonus
        + ortalama_iliski * 0.20,
        0.05, 0.75
    )

    if random.random() < basari:
        _add_truce(fac_a, fac_b, "normal_savas")
        war["ended_turn"] = turn
        war["ended_by"] = "arabuluculuk"
        _change_relation(fac_a, ilim_fac, +10)
        _change_relation(fac_b, ilim_fac, +10)
        _change_relation(fac_a, fac_b, +5)
        ilim_fac["reputation"] = min(100, ilim_fac["reputation"] + 10)
        ilim_fac["notrlik_skoru"] = ilim_fac.get("notrlik_skoru", 100)
        _log_event(state, turn, "arabuluculuk_basarili",
                   f"[{ilim_fac['name']}] [{fac_a['name']}] ile [{fac_b['name']}] "
                   f"arasında barış sağladı.",
                   ilim_fac["id"])
    else:
        ilim_fac["notrlik_skoru"] = max(0, ilim_fac.get("notrlik_skoru", 100) - 10)
        _log_event(state, turn, "arabuluculuk_red",
                   f"[{ilim_fac['name']}] arabuluculuk teklifi reddedildi.",
                   ilim_fac["id"])


def _trigger_craftsman_strike(zanaatkar_fac: dict, attacker: dict, state: dict, turn: int):
    """
    Zanaatkar saldırıya uğrayınca grev başlar.
    GDD v4 Bölüm 1.2
    """
    if zanaatkar_fac.get("grev_bitis_tur", 0) > turn:
        return  # grev zaten aktif

    grev_sure = 10
    zanaatkar_fac["grev_bitis_tur"] = turn + grev_sure
    zanaatkar_fac["grev_uretim_cezasi"] = -0.20

    _add_casus_belli(zanaatkar_fac, attacker["id"], "dogrudan_saldiri", state, turn)

    factions = state["world"].get("factions", [])
    for fac in factions:
        if fac["id"] == zanaatkar_fac["id"]:
            continue
        fac["grev_ceza_tur"] = turn + grev_sure

    ko = next((f for f in factions if f.get("type") == "krallık_ordusu"), None)
    if ko:
        _add_casus_belli(ko, attacker["id"], "dogrudan_saldiri", state, turn)
        ko["asayis_baskisi"] = ko.get("asayis_baskisi", 0) + 15

    _log_event(state, turn, "zanaatkar_grev",
               f"[{zanaatkar_fac['name']}] grev ilan etti! "
               f"Bölge üretimi {grev_sure} tur boyunca -%20.",
               zanaatkar_fac["id"])


def _expose_secret_society(fac: dict, state: dict, turn: int):
    """Gizli Cemiyet ifşa olur — tüm factionlarda CB aktif olur."""
    if fac.get("ifsa_oldu"):
        return
    fac["ifsa_oldu"] = True
    fac["ifsa_turu"] = turn
    fac["is_secret"] = False
    factions = state["world"].get("factions", [])
    for other in factions:
        if other["id"] != fac["id"]:
            _add_casus_belli(other, fac["id"], "ifsa_operasyonu", state, turn)
    _log_event(state, turn, "gizli_cemiyet_ifsa",
               f"[{fac['name']}] deşifre oldu! Tüm factionlarda CB aktif.",
               fac["id"])


def _mercenary_hire(hiring_fac: dict, pa_fac: dict, state: dict, turn: int,
                    target_id: str = None, duration: int = 15) -> bool:
    """Bir faction paralı askeri kiralar."""
    if pa_fac.get("type") != "paralı_asker":
        return False
    cost = pa_fac["military_power"] * 40
    if hiring_fac["treasury"] < cost:
        return False
    hiring_fac["treasury"] -= cost
    pa_fac["treasury"] += cost
    pa_fac["kiralayan"] = hiring_fac["id"]
    pa_fac["gorev_hedef"] = target_id
    pa_fac["gorev_kalan_tur"] = duration
    _log_event(state, turn, "paralı_asker_kiralama",
               f"[{hiring_fac['name']}] [{pa_fac['name']}]'ı kiraladı. "
               f"Maliyet: {cost} altın. Görev süresi: {duration} tur.",
               hiring_fac["id"])
    return True


def _mercenary_tick(pa_fac: dict, state: dict, turn: int):
    """Paralı askerin görev süresini yönetir."""
    if not pa_fac.get("kiralayan"):
        return
    pa_fac["gorev_kalan_tur"] = max(0, pa_fac.get("gorev_kalan_tur", 0) - 1)
    if pa_fac["gorev_kalan_tur"] == 0:
        kiralayan = _get_faction(state, pa_fac["kiralayan"])
        pa_fac["kiralayan"] = None
        pa_fac["gorev_hedef"] = None
        # %30 ihtimalle kirayana karşı döner
        if kiralayan and random.random() < 0.30:
            _add_casus_belli(pa_fac, kiralayan["id"], "dogrudan_saldiri", state, turn)
            _add_casus_belli(kiralayan, pa_fac["id"], "dogrudan_saldiri", state, turn)
            _log_event(state, turn, "paralı_asker_ihanet",
                       f"[{pa_fac['name']}] ödeme kesilince eski işverenine döndü!",
                       pa_fac["id"])


def _gizli_cemiyet_operation(fac: dict, target: dict, op_type: str,
                               state: dict, turn: int) -> dict:
    """
    Gizli Cemiyet operasyonu: suikast / sabotaj / manipülasyon.
    """
    ops = {
        "suikast":      {"maliyet": 3, "ifsa_riski": 0.20, "etki": "lider_debuff"},
        "sabotaj":      {"maliyet": 2, "ifsa_riski": 0.15, "etki": "uretim_debuff"},
        "manipülasyon": {"maliyet": 4, "ifsa_riski": 0.10, "etki": "iliski_boz"},
    }
    cfg = ops.get(op_type)
    if not cfg:
        return {"success": False, "reason": "Bilinmeyen operasyon."}

    kaynak = fac.get("treasury", 0)
    maliyet = cfg["maliyet"] * 100
    if kaynak < maliyet:
        return {"success": False, "reason": "Yetersiz kaynak."}

    fac["treasury"] -= maliyet

    # İfşa kontrolü
    if random.random() < cfg["ifsa_riski"]:
        _expose_secret_society(fac, state, turn)
        return {"success": False, "reason": "Operasyon sırasında ifşa oldu!"}

    # Etki uygula
    if op_type == "suikast":
        target.setdefault("debuffs", []).append({
            "type": "lider_debuff", "magnitude": 0.25, "remaining": 10
        })
        _log_event(state, turn, "suikast",
                   f"[{fac['name']}] [{target['name']}]'ın liderini etkisizleştirdi. (10 tur)",
                   fac["id"])
    elif op_type == "sabotaj":
        target.setdefault("debuffs", []).append({
            "type": "uretim_debuff", "magnitude": 0.15, "remaining": 8
        })
        target["economy_level"] = max(0, target["economy_level"] - random.randint(5, 10))
        _log_event(state, turn, "sabotaj",
                   f"[{fac['name']}] [{target['name']}]'ın üretimini sabote etti. (8 tur)",
                   fac["id"])
    elif op_type == "manipülasyon":
        # İki rastgele faction arasındaki ilişkiyi boz
        others = [f for f in state["world"].get("factions", [])
                  if f["id"] not in (fac["id"], target["id"])]
        if others:
            victim2 = random.choice(others)
            _change_relation(target, victim2, -20)
            _log_event(state, turn, "manipülasyon",
                       f"[{fac['name']}] [{target['name']}]—[{victim2['name']}] ilişkisini bozdu. (-20)",
                       fac["id"])

    return {"success": True, "op": op_type}


def _ilim_yardim_cagrisi(ilim_fac: dict, state: dict, turn: int):
    """İlim Cemiyeti saldırıya uğradığında tüm müttefiklere yardım çağrısı gönderir."""
    factions = state["world"].get("factions", [])
    for ally_id in ilim_fac.get("allies", []):
        ally = _get_faction(state, ally_id)
        if ally:
            # Bilgi bonusu ver
            ally.setdefault("active_buffs", []).append({
                "type": "bilgi_bonusu", "magnitude": 0.20, "remaining": 20
            })
    # KO asayiş tetikleyicisi de kontrol edilir (_try_defense_intervention ile)
    _log_event(state, turn, "yardim_cagrisi",
               f"[{ilim_fac['name']}] yardım çağrısı gönderdi. Müttefikler bilgi bonusu aldı.",
               ilim_fac["id"])


def _şifacı_universal_aid(şifacı_fac: dict, target_fac: dict, state: dict, turn: int):
    """Şifacı Birliği savaşta her iki tarafa da yardım eder."""
    # Taraf sayacını güncelle
    yardim = şifacı_fac.setdefault("yardim_sayaci", {})
    yardim[target_fac["id"]] = yardim.get(target_fac["id"], 0) + 1
    # Kayıp azaltma (military güç geçici artışı)
    target_fac["military_power"] = min(100, target_fac["military_power"] + 3)
    # 3+ kez aynı tarafa yardım → taraf seçti sayılır
    if yardim[target_fac["id"]] >= 3:
        # Diğer tarafın güveni düşer
        for fid, cnt in yardim.items():
            if fid != target_fac["id"] and cnt > 0:
                other = _get_faction(state, fid)
                if other:
                    _change_relation(şifacı_fac, other, -20)


def _seyyah_istihbarat_topla(seyyah_fac: dict, state: dict, turn: int):
    """Seyyah Kumpanya her bölgede istihbarat toplar."""
    factions = state["world"].get("factions", [])
    for fac in factions:
        if fac["id"] == seyyah_fac["id"]:
            continue
        seyyah_fac.setdefault("istihbarat_stok", {})[fac["id"]] = {
            "turn": turn,
            "military_power": fac["military_power"],
            "last_action": fac.get("last_action"),
            "aggression": fac.get("aggression_skoru", 0),
        }


def _seyyah_istihbarat_sat(seyyah_fac: dict, buyer_fac: dict,
                            target_id: str, state: dict, turn: int) -> dict:
    """Seyyah Kumpanya bir faction hakkındaki bilgiyi satar."""
    stok = seyyah_fac.get("istihbarat_stok", {})
    if target_id not in stok:
        return {"success": False, "reason": "Bu hedef hakkında bilgi yok."}

    bilgi = stok[target_id]
    kalite = max(1, 10 - (turn - bilgi["turn"]))  # eski bilgi değersizleşir
    fiyat = kalite * 80
    if buyer_fac["treasury"] < fiyat:
        return {"success": False, "reason": "Yeterli altın yok."}

    buyer_fac["treasury"] -= fiyat
    seyyah_fac["treasury"] += fiyat

    # Alıcıya düşman bilgisi bonusu ver
    buyer_fac.setdefault("active_buffs", []).append({
        "type": "dusman_bilgisi", "target": target_id, "remaining": 10
    })

    # Çok fazla kişiye aynı bilgiyi satarsa güven kaybı
    gecmis = seyyah_fac.setdefault("bilgi_satis_gecmisi", {})
    gecmis[buyer_fac["id"]] = gecmis.get(buyer_fac["id"], 0) + 1
    satilan = [bid for bid, cnt in gecmis.items() if cnt > 0]
    if len(satilan) > 1:
        for bid in satilan:
            other = _get_faction(state, bid)
            if other:
                _change_relation(seyyah_fac, other, -10)

    _log_event(state, turn, "istihbarat_satis",
               f"[{seyyah_fac['name']}] [{buyer_fac['name']}]'a {target_id} hakkında "
               f"bilgi sattı. Fiyat: {fiyat} altın.",
               seyyah_fac["id"])
    return {"success": True, "fiyat": fiyat, "kalite": kalite}


# ─────────────────────────────────────────────────────────────────────────────

def make_faction(
    name: str,
    faction_type: str,
    leader_id: str,
    home_location_id: str,
    treasury: int = None,
    military_power: int = None,
) -> dict:
    """
    Yeni bir faction yaratır.
    DEĞİŞİKLİK: Bölge/şehir sahipliği KALDIRILDI.
    Bunun yerine city_influence ile nüfuz tabanlı etki sistemi kullanılıyor.
    """
    from balance_config import FACTION_HIERARCHIES, FACTION_TYPE_GOALS
    rank_table   = FACTION_HIERARCHIES.get(faction_type, ["Üye", "Kıdemli Üye", "Lider"])
    primary_goal = FACTION_TYPE_GOALS.get(faction_type, "Güçlenmek")
    return {
        "id":            new_id(),
        "name":          name,
        "type":          faction_type,
        "leader_id":     leader_id,
        "members":       [leader_id],
        "home_location_id": home_location_id,
        # ── Ekonomi & Güç ──
        "treasury":       treasury if treasury is not None else random.randint(500, 5000),
        "military_power": military_power if military_power is not None else random.randint(10, 50),
        "economy_level":  random.randint(30, 70),
        # ── Politik Durum ──
        "stability":   random.randint(40, 80),
        "fear_level":  random.randint(5, 25),
        "reputation":  random.randint(20, 60),
        "unrest":      random.randint(5, 20),
        "rebel_risk":  0,
        # ── YENİ: Şehir Nüfuzu ──
        "city_influence":    {},    # {location_id: 0-100}
        # ── Trend: son 4 haftanın toplam nüfuz anlık görüntüsü ──
        "influence_history": [],    # [{turn, total}] max 4 eleman
        # ── YENİ: Örgütsel Hedef & Operasyonlar ──
        "primary_goal":      primary_goal,
        "active_operations": [],
        # ── Rank Sistemi ──
        "rank_table": rank_table,
        # ── Diplomasi ──
        "diplomacy":   {},
        "at_war_with": [],
        "wars":        [],
        # ── Log ──
        "founded_turn":     0,
        "event_log":        [],
        "last_action":      None,
        "last_action_turn": 0,
        # ── P3b: Açılış sistemi ──
        "active":    faction_type in _ALWAYS_ACTIVE_TYPES,
        "is_secret": faction_type in _SECRET_TYPES,
        # ── GDD v3: Çatışma sistemi ──
        "iliski_skorlari":    {},    # {faction_id: int} -100..+100
        "aggression_skoru":   0.0,
        "truce_listesi":      {},    # {faction_id: kalan_tur}
        "casus_belli":        {},    # {faction_id: CB_skoru}
        "kiralayan":          None,
        "gorev_hedef":        None,
        "gorev_kalan_tur":    0,
        "ifsa_oldu":          False,
        "ifsa_turu":          None,
        "dini_guc":           random.randint(20, 60) if faction_type == "dini_tarikat" else 0,
        "seriat_ilan_edildi": False,
        "darbe_girisim_tur":  None,
        "istihbarat_stok":    {},
        "bilgi_satis_gecmisi":{},
        # ── GDD v4.0: 1200'ler Gerçekçiliği ──
        "altinda_koalisyon":  [],       # [faction_id] — bu faction altında birleşen koalisyon üyeleri
        "vergi_durumu":       "normal", # "hafif" | "normal" | "ağır" | "ezici"
        "isyan_riski":        random.randint(0, 15),   # 0-100, isyan eşiği: 70+
        "asayis_baskisi":     random.randint(10, 40),  # 0-100, yüksekse isyan riski azalır ama nefret artar
        "darbe_plani":        None,    # None | {"hedef_id": str, "ilerleme": int, "baslangic_tur": int}
        "inanc_etkisi":       0,       # -50..+50, dini tarikatların meşruiyet bonusu/cezası
        "son_isyan_tur":      None,    # int | None — son isyanın başladığı tur
        # ── GDD v4 Bölüm 6: Üye Kazanma ──
        "uye_sayisi":         1,       # Başlangıç: 1 (lider)
        "son_uye_kazan_tur":  0,       # Son üye devşirme turu
    }


def make_region(
    name: str,
    owner_faction_id: str,
    location_id: str,          # var olan location ile bağlantı
    resources: list = None,
) -> dict:
    """Bölge (region) — lokasyonun üstünde siyasi/askeri kontrol katmanı."""
    return {
        "id": new_id(),
        "name": name,
        "location_id": location_id,
        "owner_faction_id": owner_faction_id,
        "disputed_by": [],                     # [faction_id] — kim de talip?
        # ── Bölge İstatistikleri ──
        "population": random.randint(500, 8000),
        "economy": random.randint(25, 75),     # 0-100
        "security": random.randint(30, 80),    # 0-100
        "unrest_level": random.randint(0, 30), # 0-100
        "resources": resources or random.sample(REGION_RESOURCES, k=random.randint(1, 3)),
        # ── Vergi & Gelir ──
        "tax_income": 0,           # bu tick'te toplanan vergi
        "garrison_size": random.randint(10, 50),   # buradaki asker sayısı
        # ── Sebep-Sonuç Takibi ──
        "last_event": None,
        "bandits_active": False,
        "plague_active": False,
        # ── GDD v4.0: 1200'ler Bölge Gerçekçiliği ──
        "yerlesim": {                        # Yerleşim detayları
            "nufus":      random.randint(500, 8000),
            "nufus_max":  random.randint(8000, 20000),
            "gelir_carpan": round(random.uniform(0.7, 1.5), 2),  # Vergi çarpanı
        },
        "gelir_carpan":     round(random.uniform(0.8, 1.4), 2),  # Bölge bazlı gelir çarpanı
        "inanc_dagilimi":   {               # {inanc_adi: yuzde} — toplamı ~100
            "geleneksel": random.randint(40, 80),
            "yabanci":    random.randint(5, 30),
            "ateist":     random.randint(2, 15),
        },
        "altyapi_seviyesi": random.randint(1, 5),  # 1-5: yol, sur, pazar kalitesi
    }


def make_war(faction_a_id: str, faction_b_id: str, turn: int, cause: str) -> dict:
    """Savaş kaydı — sebeple başlar, sonuçla biter."""
    return {
        "id": new_id(),
        "faction_a": faction_a_id,
        "faction_b": faction_b_id,
        "started_turn": turn,
        "ended_turn": None,
        "cause": cause,           # "toprak_talebi" / "ihanet" / "ekonomik_baskı" / ...
        "battles": [],            # [{turn, winner, loser, region_id, casualties}]
        "outcome": None,          # "a_kazandı" / "b_kazandı" / "beraberlik" / "barış"
    }


# ─────────────────────────────────────────────────────────────────────────────
# 2. FACTION DİNAMİKLERİ — SEBEP → SONUÇ ZİNCİRLERİ
# ─────────────────────────────────────────────────────────────────────────────
# NÜFUZ SİSTEMİ (city_influence)
# ─────────────────────────────────────────────────────────────────────────────

def gain_influence(faction: dict, location_id: str, amount: int,
                   state: dict, turn: int) -> int:
    """Faction'ın bir lokasyondaki nüfuzunu artır. city_governance'a bildir."""
    current = faction["city_influence"].get(location_id, 0)
    new_val  = min(100, current + amount)
    faction["city_influence"][location_id] = new_val
    try:
        from city_governance import update_faction_influence
        update_faction_influence(state, faction["id"], location_id, amount, turn)
    except Exception:
        pass
    if new_val >= 25 and current < 25:
        _log_event(state, turn, "nüfuz_eşik",
                   f"{faction['name']} {location_id}'de faaliyet eşiğine ulaştı (25 nüfuz).",
                   faction["id"])
    elif new_val >= 50 and current < 50:
        _log_event(state, turn, "nüfuz_eşik",
                   f"{faction['name']} {location_id}'de baskı gücü kazandı (50 nüfuz).",
                   faction["id"])
    elif new_val >= 75 and current < 75:
        _log_event(state, turn, "nüfuz_eşik",
                   f"{faction['name']} {location_id}'de aday gösterme hakkı kazandı (75 nüfuz).",
                   faction["id"])
    elif new_val >= 100 and current < 100:
        _log_event(state, turn, "nüfuz_kontrol",
                   f"{faction['name']} {location_id}'in kontrolünü ele geçirdi!",
                   faction["id"])
    return new_val


def lose_influence(faction: dict, location_id: str, amount: int,
                   state: dict, turn: int) -> int:
    """Faction'ın nüfuzunu düşür. Kontrol kaybedilebilir."""
    current = faction["city_influence"].get(location_id, 0)
    new_val  = max(0, current - amount)
    faction["city_influence"][location_id] = new_val
    try:
        from city_governance import update_faction_influence
        update_faction_influence(state, faction["id"], location_id, -amount, turn)
    except Exception:
        pass
    if current >= 100 and new_val < 100:
        _log_event(state, turn, "nüfuz_kayıp",
                   f"{faction['name']} {location_id}'deki kontrolünü kaybetti.",
                   faction["id"])
    return new_val


def faction_infiltrate_city(faction_id: str, location_id: str,
                             state: dict, turn: int) -> dict:
    """
    Aktif nüfuz kazanma operasyonu.
    Haftada çağrılır, başarı şansı faction gücüne ve şehir güvenliğine bağlı.
    """
    faction = _get_faction(state, faction_id)
    if not faction:
        return {"success": False}

    loc = next((l for l in state["world"]["locations"]
                if l["id"] == location_id), None)
    if not loc:
        return {"success": False}

    # Mevcut nüfuz
    current = faction["city_influence"].get(location_id, 0)

    # Başarı şansı: faction reputasyonu + economy - şehir güvenliği
    security = loc.get("security", 50)
    base_chance = 0.30 + faction["reputation"] * 0.002 - security * 0.003
    base_chance = max(0.05, min(0.80, base_chance))

    if random.random() < base_chance:
        gain = random.randint(2, 8)
        new_val = gain_influence(faction, location_id, gain, state, turn)
        faction["treasury"] -= random.randint(10, 30)  # operasyon maliyeti
        return {"success": True, "gain": gain, "new_influence": new_val}
    else:
        # Başarısız: küçük ihtimalle nüfuz kaybı (deşifre)
        if random.random() < 0.15:
            lose_influence(faction, location_id, random.randint(3, 10), state, turn)
        return {"success": False}


# ─────────────────────────────────────────────────────────────────────────────
# TİP BAZLI ÖZEL MEKANİKLER
# ─────────────────────────────────────────────────────────────────────────────

def bandit_raid_caravan(faction: dict, state: dict, turn: int) -> dict:
    """Eşkıya çetesi: kervan soygunculuğu."""
    if faction.get("type") != "eskiya_cetesi":
        return {"success": False, "reason": "Yalnızca eşkıya çetesi yapabilir."}
    locs = [l for l in state["world"]["locations"]
            if faction["city_influence"].get(l["id"], 0) >= 15]
    if not locs:
        return {"success": False, "reason": "Etki alanında lokasyon yok."}
    target = random.choice(locs)
    haul = random.randint(30, 120)
    faction["treasury"] += haul
    # Tüccar loncası varsa geliri düşür
    for f in state["world"].get("factions", []):
        if f.get("type") == "tuccar_loncasi" and f["city_influence"].get(target["id"], 0) > 20:
            f["treasury"] = max(0, f["treasury"] - haul // 2)
            _log_event(state, turn, "kervan_soygun",
                       f"{faction['name']} tüccar kervanını soydu. {haul} altın."
                       f" {f['name']} etkilendi.", faction["id"])
            break
    else:
        _log_event(state, turn, "kervan_soygun",
                   f"{faction['name']} kervan soydu: {haul} altın.", faction["id"])
    return {"success": True, "haul": haul}


def religious_sermon(faction: dict, location_id: str, state: dict, turn: int) -> dict:
    """Dini tarikat: vaaz → halk memnuniyeti artışı + nüfuz kazanımı."""
    if faction.get("type") != "dini_tarikat":
        return {"success": False, "reason": "Yalnızca dini tarikat yapabilir."}
    influence = faction["city_influence"].get(location_id, 0)
    if influence < 10:
        return {"success": False, "reason": "Bu şehirde yeterli varlık yok."}
    gain = random.randint(3, 8)
    gain_influence(faction, location_id, gain, state, turn)
    # Governance mutluluğunu artır
    try:
        from city_governance import get_governance
        gov = get_governance(state, location_id)
        if gov:
            gov["population_happiness"] = min(100,
                gov["population_happiness"] + random.randint(2, 5))
    except Exception:
        pass
    _log_event(state, turn, "vaaz",
               f"{faction['name']} {location_id}'de vaaz verdi. Halk mutluluğu arttı.",
               faction["id"])
    return {"success": True, "influence_gain": gain}


def merchant_control_market(faction: dict, location_id: str, good: str,
                             state: dict, turn: int) -> dict:
    """Tüccar loncası: piyasa manipülasyonu → fiyat avantajı."""
    if faction.get("type") != "tuccar_loncasi":
        return {"success": False, "reason": "Yalnızca tüccar loncası yapabilir."}
    influence = faction["city_influence"].get(location_id, 0)
    if influence < 25:
        return {"success": False, "reason": "Yeterli nüfuz yok (25 gerekli)."}
    loc = next((l for l in state["world"]["locations"]
                if l["id"] == location_id), None)
    if not loc or good not in loc.get("market", {}):
        return {"success": False, "reason": "Ürün bu pazarda yok."}
    market = loc["market"][good]
    # Fiyatı %10-20 artır (lonca lehine)
    pct = random.uniform(0.10, 0.20)
    market["price"] = round(market["price"] * (1 + pct), 1)
    income = round(market["price"] * market.get("demand", 5) * 0.1, 1)
    faction["treasury"] += int(income)
    _log_event(state, turn, "piyasa_manipülasyonu",
               f"{faction['name']} {good} fiyatını artırdı (+{pct*100:.0f}%). "
               f"Gelir: {income} altın.", faction["id"])
    return {"success": True, "price_change": pct, "income": income}


def mercenary_offer_service(faction: dict, war: dict, state: dict, turn: int) -> dict:
    """Paralı asker loncası: savaşa katılma teklifi."""
    if faction.get("type") != "paralı_asker":
        return {"success": False, "reason": "Yalnızca paralı asker loncası yapabilir."}
    # Savaştaki taraflara katılma teklifi yap — daha güçlüye katıl
    fac_a = _get_faction(state, war["faction_a"])
    fac_b = _get_faction(state, war["faction_b"])
    if not fac_a or not fac_b:
        return {"success": False}
    target = fac_a if fac_a["military_power"] >= fac_b["military_power"] else fac_b
    cost = faction["military_power"] * 50
    if target["treasury"] >= cost:
        target["treasury"] -= cost
        faction["treasury"] += cost
        target["military_power"] += faction["military_power"] // 3
        _log_event(state, turn, "paralı_asker_katılım",
                   f"{faction['name']} paralı asker olarak {target['name']}'e katıldı. "
                   f"Ücret: {cost} altın.", faction["id"])
        return {"success": True, "target": target["id"], "cost": cost}
    return {"success": False, "reason": "Hedef faction ödeme yapamaz."}


def secret_society_recruit_governor(faction: dict, location_id: str,
                                    state: dict, turn: int) -> dict:
    """Gizli cemiyet: yöneticiyi satın al veya tehdit et."""
    if faction.get("type") != "gizli_cemiyet":
        return {"success": False, "reason": "Yalnızca gizli cemiyet yapabilir."}
    try:
        from city_governance import get_governance
        gov = get_governance(state, location_id)
    except Exception:
        return {"success": False}
    if not gov or not gov.get("governor_id"):
        return {"success": False, "reason": "Bu konumda yönetici yok."}
    influence = faction["city_influence"].get(location_id, 0)
    if influence < 50:
        return {"success": False, "reason": "Yeterli nüfuz yok (50 gerekli)."}
    cost = random.randint(200, 600)
    if faction["treasury"] < cost:
        return {"success": False, "reason": "Yeterli hazine yok."}
    faction["treasury"] -= cost
    gov["controlled_by_faction"] = faction["id"]
    gov["control_is_secret"] = True
    gov["governor_legitimacy"] = max(gov["governor_legitimacy"] - 10, 0)
    gain_influence(faction, location_id, 25, state, turn)
    _log_event(state, turn, "gizli_satın_alma",
               f"{faction['name']} {location_id} yöneticisini gizlice satın aldı.",
               faction["id"])
    return {"success": True, "cost": cost}


# ─────────────────────────────────────────────────────────────────────────────

def _apply_economy_effects(fac: dict, state: dict, turn: int):
    """
    Ekonomi değişimi → zincirleme etkiler.
    Kural: Her etki bir sebebe atıfla loglanır.
    """
    eco = fac["economy_level"]

    # ── Kural 1: Ekonomi < 25 → askeri güç erir ──
    if eco < 25:
        drop = int((25 - eco) * 0.4 * _noise())
        fac["military_power"] = max(0, fac["military_power"] - drop)
        _log_event(state, turn, "ekonomi_etkisi",
                   f"[{fac['name']}] Ekonomi kritik düzeyde ({eco}). "
                   f"Asker maaşları ödenemiyor → askeri güç -{drop}.",
                   fac["id"])

    # ── Kural 2: Ekonomi < 35 → stabilite düşer ──
    if eco < 35:
        drop = int((35 - eco) * 0.3 * _noise())
        fac["stability"] = max(0, fac["stability"] - drop)
        fac["unrest"] = min(100, fac["unrest"] + drop // 2)
        _log_event(state, turn, "ekonomi_etkisi",
                   f"[{fac['name']}] Düşen ekonomi ({eco}) halkı huzursuz etti → "
                   f"stabilite -{drop}, huzursuzluk +{drop // 2}.",
                   fac["id"])

    # ── Kural 3: Ekonomi < 20 → isyan riski birikir ──
    if eco < 20:
        fac["rebel_risk"] = min(100, fac["rebel_risk"] + random.randint(5, 15))
        _log_event(state, turn, "isyan_riski",
                   f"[{fac['name']}] Açlık sınırında ekonomi → isyan riski artıyor "
                   f"({fac['rebel_risk']}/100).",
                   fac["id"])

    # ── Kural 4: Ekonomi > 70 → vergi geliri artar, askeri büyür ──
    if eco > 70:
        gain = int((eco - 70) * 0.5 * _noise())
        fac["treasury"] = min(999999, fac["treasury"] + gain)
        fac["military_power"] = min(100, fac["military_power"] + 1)

    # ── GDD v4 Bölüm 1.2: Grev cezası ──
    if fac.get("grev_ceza_tur", 0) > turn:
        fac["economy_level"] = max(0, fac["economy_level"] - 2)


def _apply_stability_effects(fac: dict, state: dict, turn: int):
    """
    Stabilite değişimi → NPC ayrılması, iç savaş, lider değişimi.
    """
    stab = fac["stability"]
    members = fac["members"]

    # ── Kural 1: Stabilite < 30 → NPC'ler faction'dan ayrılabilir ──
    if stab < 30 and len(members) > 2:
        leave_chance = (30 - stab) / 100.0
        leavers = []
        for mid in members[1:]:  # lider ayrılmaz (ayrı kural)
            npc = _get_npc(state, mid)
            if not npc or not npc.get("alive", True):
                continue
            # Loyalty düşükse veya başka faction varsa ayrılır
            loyalty = npc.get("faction_loyalty", 50)
            greed = npc.get("greed", random.randint(20, 80))
            npc["greed"] = greed
            effective_chance = leave_chance * (1 - loyalty / 100) * (1 + greed / 200)
            if random.random() < effective_chance:
                leavers.append(mid)

        for lid in leavers[:max(1, len(leavers) // 3)]:  # en fazla 1/3'ü ayrılır bir seferde
            fac["members"].remove(lid)
            npc = _get_npc(state, lid)
            npc_name = npc["name"] if npc else lid
            _log_event(state, turn, "üye_ayrıldı",
                       f"[{fac['name']}] Stabilite çöküşü ({stab}) nedeniyle {npc_name} "
                       f"faction'dan ayrıldı.",
                       fac["id"])

    # ── Kural 2: Stabilite < 15 → İç savaş başlayabilir ──
    if stab < 15 and random.random() < 0.20:
        rival_id = _find_faction_rival(fac, state)
        if rival_id:
            rival = _get_faction(state, rival_id)
            _start_civil_war(fac, rival, state, turn)
        else:
            # Lider değişimi
            _trigger_leader_change(fac, state, turn, reason="iç_isyan")

    # ── Kural 3: Stabilite < 25 ve fear_level < 30 → lider sorgulanır ──
    if stab < 25 and fac["fear_level"] < 30:
        if random.random() < 0.10:
            _trigger_leader_change(fac, state, turn, reason="güvensizlik_oyu")


def _apply_military_effects(fac: dict, state: dict, turn: int):
    """
    Yüksek askeri güç → bölge genişleme isteği, korku etkisi, vergi artışı.
    """
    mil = fac["military_power"]

    # ── Kural 1: Askeri güç > 70 → komşu bölgelere baskı ──
    if mil > 70:
        for rid in [lid for lid, inf in fac.get("city_influence", {}).items() if inf >= 50]:
            region = _get_region(state, rid)
            if region:
                bonus = int((mil - 70) * 0.3)
                region["tax_income"] = region.get("tax_income", 0) + bonus

    # ── Kural 2: Yüksek askeri güç → diğer faction'lar çekinir ──
    if mil > 65:
        for other in state["world"].get("factions", []):
            if other["id"] == fac["id"]:
                continue
            # Düşman olmayan factionlar biraz daha temkinli davranır
            if fac["id"] not in other.get("at_war_with", []):
                other["fear_level"] = min(100, other.get("fear_level", 0) + 2)


    # ── GDD v4 Bölüm 5.3b: İktidar Boşluğu cezaları ──
    ib = fac.get("iktidar_boslugu", {})
    if ib.get("aktif"):
        if turn >= ib.get("tur_bitis", 0):
            fac["iktidar_boslugu"]["aktif"] = False
        else:
            # Boşluk süresince: askeri güç ve stabilite zayıf kalır
            fac["military_power"] = max(0, fac["military_power"] - 2)
            fac["stability"] = max(0, fac["stability"] - 1)
            # Rakipler fırsatçı saldırı yapar (CB üretilir)
            for other in state["world"].get("factions", []):
                if other["id"] == fac["id"]:
                    continue
                if _get_relation(fac, other) < -10 and random.random() < 0.08:
                    _add_casus_belli(other, fac["id"], "iktidar_boslugu_firsati", state, turn)


def _apply_fear_effects(fac: dict, state: dict, turn: int):
    """
    Yüksek fear_level → zorla bağlılık, az isyan, ama itibar düşer.
    """
    fear = fac["fear_level"]

    # ── Kural 1: Fear > 60 → NPC'ler istemeseler de kalır ──
    if fear > 60:
        fac["rebel_risk"] = max(0, fac["rebel_risk"] - int((fear - 60) * 0.4))

    # ── Kural 2: Fear > 70 → itibar zaman içinde erir ──
    if fear > 70 and random.random() < 0.40:
        rep_loss = int((fear - 70) * 0.3 * _noise())
        fac["reputation"] = max(0, fac["reputation"] - rep_loss)
        _log_event(state, turn, "itibar_kaybı",
                   f"[{fac['name']}] Yüksek korku politikası ({fear}) uzun vadede "
                   f"itibarı zedeliyor → itibar -{rep_loss}.",
                   fac["id"])

    # ── Kural 3: Fear < 20 → NPC'lerin sesi yükselir ──
    if fear < 20:
        fac["unrest"] = min(100, fac["unrest"] + random.randint(0, 3))


def _apply_reputation_effects(fac: dict, state: dict, turn: int):
    """
    Yüksek itibar → yeni NPC katılımı, ticaret bonusu, kolay diplomasi.
    """
    rep = fac["reputation"]

    # ── Kural 1: İtibar > 65 → yeni üye cazibesi ──
    if rep > 65 and random.random() < 0.15:
        # Faction'a bağlı olmayan bir NPC katılır
        unaffiliated = [
            n for n in state["world"]["npcs"]
            if n.get("alive", True)
            and n.get("faction_id") is None
            and n["id"] != fac["leader_id"]
        ]
        if unaffiliated:
            recruit = random.choice(unaffiliated)
            recruit["faction_id"] = fac["id"]
            recruit["faction_loyalty"] = random.randint(50, 80)
            fac["members"].append(recruit["id"])
            _log_event(state, turn, "yeni_üye",
                       f"[{fac['name']}] Yüksek itibar ({rep}) sayesinde "
                       f"{recruit['name']} faction'a katıldı.",
                       fac["id"])

    # ── Kural 2: İtibar > 60 → ticaret geliri bonusu ──
    if rep > 60:
        bonus = int((rep - 60) * 0.8 * _noise())
        fac["treasury"] += bonus

    # ── Kural 3: İtibar < 20 → ittifak teklifleri reddedilir ──
    if rep < 20:
        # Diplomatik ilişkiler bozulabilir
        for other_id, state_str in list(fac.get("diplomacy", {}).items()):
            if state_str == "müttefik" and random.random() < 0.10:
                fac["diplomacy"][other_id] = "tarafsız"
                other = _get_faction(state, other_id)
                if other:
                    other["diplomacy"][fac["id"]] = "tarafsız"
                _log_event(state, turn, "diplomasi_bozuldu",
                           f"[{fac['name']}] Düşük itibar ({rep}) nedeniyle "
                           f"ittifak zayıfladı.",
                           fac["id"])


# ─────────────────────────────────────────────────────────────────────────────
# 3. NPC KARAR MOTORU
# ─────────────────────────────────────────────────────────────────────────────

def _ensure_npc_faction_fields(npc: dict):
    """NPC'ye faction sistemi için gerekli alanları ekler."""
    npc.setdefault("faction_id", None)
    npc.setdefault("faction_loyalty", random.randint(20, 80))
    npc.setdefault("greed", random.randint(10, 90))
    npc.setdefault("ambition", random.randint(10, 90))
    npc.setdefault("faction_role", "üye")   # üye / casus / isyancı / lider
    npc.setdefault("is_spy", False)


def _npc_faction_decision(npc: dict, state: dict, turn: int):
    """
    Her NPC her tick'te bir karar verebilir.
    Karar ağacı: loyalty × fear × greed × ambition × lider ilişkisi.
    """
    _ensure_npc_faction_fields(npc)
    if not npc.get("alive", True):
        return

    fac_id = npc.get("faction_id")
    fac = _get_faction(state, fac_id) if fac_id else None

    # ── 1. Faction'sız NPC — katılma kararı ──
    if not fac:
        _consider_joining_faction(npc, state, turn)
        return

    loyalty = npc["faction_loyalty"]
    fear = fac["fear_level"]
    greed = npc["greed"]
    ambition = npc["ambition"]

    # Lidere ilişki bonusu
    leader = _get_npc(state, fac["leader_id"])
    rel_bonus = 0
    if leader:
        rel_bonus = npc.get("interactions", {}).get(leader["id"], {}).get("score", 0) // 10

    # ── 2. İsyan ──
    # Tetikleyici: düşük loyalty + düşük fear + yüksek unrest + ambition
    isyan_egilimi = (
        (100 - loyalty) * 0.35
        + (100 - fear) * 0.20
        + fac["unrest"] * 0.25
        + ambition * 0.20
        - rel_bonus * 5
    ) / 100

    if isyan_egilimi > 0.65 and random.random() < isyan_egilimi * 0.15:
        _npc_rebel(npc, fac, state, turn)
        return

    # ── 3. Casus olma ──
    # Tetikleyici: yüksek greed + düşük loyalty + dış faction teklifi
    enemy_factions = [
        f for f in state["world"].get("factions", [])
        if f["id"] != fac_id and fac_id in f.get("at_war_with", [])
    ]
    if enemy_factions and greed > 65 and loyalty < 50 and not npc["is_spy"]:
        if random.random() < 0.05:
            target = random.choice(enemy_factions)
            _npc_become_spy(npc, fac, target, state, turn)
            return

    # ── 4. Faction değiştirme ──
    if loyalty < 25 and fear < 40 and random.random() < 0.08:
        _npc_change_faction(npc, fac, state, turn)
        return

    # ── 5. Lider seçimini etkileme ──
    if ambition > 75 and fac["stability"] < 40:
        _npc_influence_leadership(npc, fac, state, turn)


def _consider_joining_faction(npc: dict, state: dict, turn: int):
    """Faction'sız NPC, en iyi fırsatı değerlendirir."""
    factions = state["world"].get("factions", [])
    if not factions:
        return

    best_score = -1
    best_fac = None
    for f in factions:
        if len(f["members"]) >= 200:  # kapasite sınırı
            continue
        score = (
            f["reputation"] * 0.40
            + f["economy_level"] * 0.30
            + f["military_power"] * 0.20
            + (100 - f["fear_level"]) * 0.10
        )
        if score > best_score:
            best_score = score
            best_fac = f

    if best_fac and best_score > 45 and random.random() < 0.08:
        npc["faction_id"] = best_fac["id"]
        npc["faction_loyalty"] = random.randint(40, 70)
        best_fac["members"].append(npc["id"])
        _log_event(state, turn, "faction_katılım",
                   f"{npc['name']} kendi iradesiyle [{best_fac['name']}]'a katıldı "
                   f"(itibar={best_fac['reputation']}).",
                   best_fac["id"])


def _npc_rebel(npc: dict, fac: dict, state: dict, turn: int):
    """NPC isyan çıkarır — faction stabilitesini zedeler, event yayar."""
    fac["stability"] = max(0, fac["stability"] - random.randint(8, 20))
    fac["unrest"] = min(100, fac["unrest"] + random.randint(10, 25))
    fac["rebel_risk"] = min(100, fac["rebel_risk"] + 15)
    npc["faction_role"] = "isyancı"
    npc["faction_loyalty"] = 0

    cause = "ekonomik" if fac["economy_level"] < 30 else (
        "siyasi" if fac["stability"] < 30 else "kişisel")

    _log_event(state, turn, "npc_isyan",
               f"[{fac['name']}] {npc['name']} {cause} nedenlerle isyan bayrağı kaldırdı! "
               f"Stabilite -{20}, huzursuzluk arttı.",
               fac["id"])

    # İsyancı NPC etrafında küme oluşturabilir
    potential_followers = [
        m for m in fac["members"]
        if m != npc["id"] and m != fac["leader_id"]
    ]
    follower_count = 0
    for mid in potential_followers:
        follower_npc = _get_npc(state, mid)
        if not follower_npc:
            continue
        if follower_npc.get("faction_loyalty", 50) < 35 and random.random() < 0.30:
            follower_npc["faction_role"] = "isyancı"
            follower_count += 1

    if follower_count > 0:
        _log_event(state, turn, "isyan_büyüdü",
                   f"[{fac['name']}] {npc['name']}'in isyanına {follower_count} kişi daha katıldı!",
                   fac["id"])


def _npc_become_spy(npc: dict, fac: dict, target_fac: dict, state: dict, turn: int):
    """NPC gizlice düşman faction için casusluk yapar."""
    npc["is_spy"] = True
    npc["spy_for"] = target_fac["id"]
    npc["faction_role"] = "casus"

    # Casus bilgi toplar — faction'ın zayıf noktasını iletir
    intel = {
        "treasury": fac["treasury"],
        "military_power": fac["military_power"],
        "stability": fac["stability"],
        "weak_region": next(iter([lid for lid, inf in fac.get("city_influence", {}).items() if inf >= 50]), None),
    }
    target_fac.setdefault("intel", {})[fac["id"]] = intel

    _log_event(state, turn, "casusluk",
               f"[{fac['name']}] {npc['name']} gizlice [{target_fac['name']}] için "
               f"casusluk yapıyor! Hazine ve askeri bilgiler sızdırıldı.",
               fac["id"])


def _npc_change_faction(npc: dict, old_fac: dict, state: dict, turn: int):
    """NPC faction değiştirir — her iki tarafı da etkiler."""
    if npc["id"] in old_fac["members"]:
        old_fac["members"].remove(npc["id"])
    old_fac["stability"] = max(0, old_fac["stability"] - 3)

    # En uygun yeni faction'ı bul
    alternatives = [
        f for f in state["world"].get("factions", [])
        if f["id"] != old_fac["id"]
        and f["id"] not in old_fac.get("at_war_with", [])
    ]
    if alternatives:
        new_fac = max(alternatives, key=lambda f: f["reputation"] + f["economy_level"])
        npc["faction_id"] = new_fac["id"]
        npc["faction_loyalty"] = random.randint(35, 65)
        new_fac["members"].append(npc["id"])
        _log_event(state, turn, "faction_değişimi",
                   f"{npc['name']}, [{old_fac['name']}]'dan [{new_fac['name']}]'e geçti "
                   f"(sadakat={npc['faction_loyalty']}).",
                   old_fac["id"])
    else:
        npc["faction_id"] = None
        npc["faction_loyalty"] = 0
        _log_event(state, turn, "faction_terk",
                   f"{npc['name']} [{old_fac['name']}]'ı terk etti, bağımsız kaldı.",
                   old_fac["id"])


def _npc_influence_leadership(npc: dict, fac: dict, state: dict, turn: int):
    """Hırslı NPC, zayıf liderliği sorgulamaya başlar."""
    fac["stability"] = max(0, fac["stability"] - random.randint(2, 8))
    _log_event(state, turn, "liderlik_sorgusu",
               f"[{fac['name']}] Hırslı {npc['name']}, lider "
               f"{'(bilinmiyor)' if not _get_npc(state, fac['leader_id']) else _get_npc(state, fac['leader_id'])['name']}'ın "
               f"otoritesini sorguluyor. Stabilite sarsılıyor.",
               fac["id"])


# ─────────────────────────────────────────────────────────────────────────────
# 4. BÖLGE KONTROL SİSTEMİ
# ─────────────────────────────────────────────────────────────────────────────

def _region_tick(region: dict, fac: dict, state: dict, turn: int):
    """
    Bölge her tick'te kendi dinamiklerini işler.
    Sebep-sonuç: security↓ → haydut, unrest↑ → isyan, economy↑ → gelir.
    """
    # ── Vergi toplama ──
    if fac:
        tax_rate = fac["tax_rate"] / 100
        base_income = region["economy"] * region["population"] // 1000
        collected = int(base_income * tax_rate * _noise(0.1))
        region["tax_income"] = collected
        fac["treasury"] += collected

        # Yüksek vergi → unrest birikir
        if fac["tax_rate"] > 30:
            unrest_add = int((fac["tax_rate"] - 30) * 0.3 * _noise())
            region["unrest_level"] = min(100, region["unrest_level"] + unrest_add)

    # ── Kural 1: Security < 30 → haydutlar ──
    if region["security"] < 30 and not region["bandits_active"]:
        if random.random() < 0.25:
            region["bandits_active"] = True
            region["economy"] = max(0, region["economy"] - random.randint(5, 15))
            _log_event(state, turn, "haydut_ortaya_çıktı",
                       f"[{region['name']}] Güvenlik çöküşü ({region['security']}) → "
                       f"haydutlar bölgeye sızdı. Ekonomi zarar gördü.",
                       fac["id"] if fac else None)

    elif region["security"] >= 60 and region["bandits_active"]:
        region["bandits_active"] = False

    # ── Kural 2: Unrest > 60 → isyan (bölge el değiştirebilir) ──
    if region["unrest_level"] > 60:
        if random.random() < (region["unrest_level"] - 60) / 100:
            _trigger_region_revolt(region, fac, state, turn)

    # ── Kural 3: Economy > 60 → faction geliri artar (zaten tax'ta var) ──
    if region["economy"] > 60 and fac:
        bonus = int((region["economy"] - 60) * 0.5)
        fac["economy_level"] = min(100, fac["economy_level"] + bonus // 10)

    # ── Kural 4: Haydut varsa ekonomi her tick erir ──
    if region["bandits_active"]:
        region["economy"] = max(0, region["economy"] - random.randint(1, 4))
        region["security"] = max(0, region["security"] - random.randint(1, 3))

    # ── Garrison etkisi: asker varsa güvenlik korunur ──
    if region["garrison_size"] > 20:
        security_bonus = min(5, region["garrison_size"] // 10)
        region["security"] = min(100, region["security"] + security_bonus)

    # ── GDD v4 Bölüm 5.2: Nüfus dinamikleri ──
    yerlesim = region.get("yerlesim", {})
    if yerlesim:
        nufus = yerlesim.get("nufus", 0)
        # Savaş varsa nüfus düşer
        if region.get("owner_faction_id") and fac:
            at_war = bool(fac.get("at_war_with"))
            if at_war:
                kayip = random.randint(2, 8)
                yerlesim["nufus"] = max(50, nufus - kayip)
            else:
                # Barış + ekonomi iyi → nüfus yavaş büyür
                if region["economy"] > 50:
                    yerlesim["nufus"] = min(
                        yerlesim.get("nufus_max", 5000),
                        nufus + random.randint(1, 4)
                    )
        # Gelir çarpanını yerleşim seviyesine göre uygula
        carpan = yerlesim.get("gelir_carpan", 1.0)
        if carpan != 1.0 and region.get("tax_income", 0) > 0:
            region["tax_income"] = int(region["tax_income"] * carpan)
            if fac:
                fac["treasury"] += int(region.get("tax_income", 0) * (carpan - 1.0))

    # ── GDD v4 Bölüm 4: İnanç etkisi → dini tarikat gelir bonusu ──
    if fac and fac.get("type") == "dini_tarikat":
        inanc_etkisi = fac.get("inanc_etkisi", 0)
        if inanc_etkisi > 0:
            # Her +10 inanç etkisi → bölge gelirinin %5 ek bonus (maks %25)
            bonus_oran = min(0.25, inanc_etkisi / 200.0)
            bonus = int(region.get("tax_income", 0) * bonus_oran)
            if bonus > 0:
                fac["treasury"] += bonus
                fac["reputation"] = min(100, fac.get("reputation", 50) + 1)
        elif inanc_etkisi < -20:
            # Negatif inanç etkisi → unrest artar
            region["unrest_level"] = min(100, region["unrest_level"] + 1)

    # ── Doğal drift ──
    region["security"] = _clamp(region["security"] + random.randint(-2, 2), 0, 100)
    region["economy"] = _clamp(region["economy"] + random.randint(-1, 2), 0, 100)


def _trigger_region_revolt(region: dict, fac: dict, state: dict, turn: int):
    """Bölge isyanı — kontrolü kaybetme riski."""
    region["unrest_level"] = max(0, region["unrest_level"] - 30)  # isyan sonrası düşer
    region["security"] = max(0, region["security"] - 20)

    if not fac:
        return

    # Bastırma kapasitesi: garrison + military_power
    suppress_power = region["garrison_size"] * 2 + fac["military_power"]
    revolt_power = region["unrest_level"] * 3 + random.randint(20, 60)

    if revolt_power > suppress_power:
        # İsyan başarılı → bölge geçici olarak bağımsız
        if fac.get("city_influence", {}).get(region["id"], 0) >= 50:
            fac.setdefault("city_influence", {})[region["id"]] = max(0, fac["city_influence"][region["id"]] - 50)
        region["owner_faction_id"] = None
        region["disputed_by"] = [fac["id"]]
        fac["stability"] = max(0, fac["stability"] - 15)
        fac["reputation"] = max(0, fac["reputation"] - 10)
        _log_event(state, turn, "bölge_isyanı",
                   f"[{region['name']}] Halk ayaklandı! [{fac['name']}] bölge kontrolünü "
                   f"kaybetti. (İsyan gücü {revolt_power} > Bastırma {suppress_power})",
                   fac["id"])
    else:
        # İsyan bastırıldı
        region["garrison_size"] = max(0, region["garrison_size"] - 10)
        fac["military_power"] = max(0, fac["military_power"] - 5)
        fac["treasury"] = max(0, fac["treasury"] - 500)
        _log_event(state, turn, "isyan_bastırıldı",
                   f"[{region['name']}] İsyan bastırıldı. [{fac['name']}] "
                   f"askeri kayıp ve masraf yaşadı. (Bastırma {suppress_power} > Gücü {revolt_power})",
                   fac["id"])


# ─────────────────────────────────────────────────────────────────────────────
# 5. SAVAŞ MOTORU
# ─────────────────────────────────────────────────────────────────────────────

def resolve_battle(
    war: dict,
    fac_a: dict,
    fac_b: dict,
    region: dict,
    state: dict,
    turn: int,
) -> dict:
    """
    Savaş çözümlemesi — sistematik, deterministik-değil ama nedenli.
    Faktörler: military_power, terrain, morale, leader_skill, supply.
    """
    # ── Güç hesabı ──
    def combat_score(fac: dict, reg: dict) -> float:
        base = fac["military_power"]

        # Arazi bonusu: savunucu avantajı
        terrain_bonus = 1.0
        if "kale" in reg.get("resources", []):
            if reg["owner_faction_id"] == fac["id"]:
                terrain_bonus = 1.35  # kaleyi savunmak avantajlı

        # Morale: stability + fear'ın dengesi
        morale = (_clamp(fac["stability"], 0, 100) * 0.6 +
                  _clamp(fac["fear_level"], 0, 100) * 0.4) / 100

        # Lider skili
        leader = _get_npc(state, fac["leader_id"])
        leader_skill = 1.0
        if leader:
            stats = leader.get("stats", {})
            leadership = stats.get("strength", 1) * 0.3 + stats.get("intelligence", 1) * 0.4
            leader_skill = 1.0 + leadership / 20

        # İkmal: hazine yoksa askeri etkisiz
        supply = 1.0
        if fac["treasury"] < 500:
            supply = 0.60
        elif fac["treasury"] > 5000:
            supply = 1.15

        return base * terrain_bonus * morale * leader_skill * supply * _noise(0.12)

    score_a = combat_score(fac_a, region)
    score_b = combat_score(fac_b, region)
    total = score_a + score_b
    win_prob_a = score_a / total if total > 0 else 0.5
    winner = fac_a if random.random() < win_prob_a else fac_b
    loser = fac_b if winner is fac_a else fac_a

    # ── Kayıplar ──
    winner_casualties = int(random.uniform(0.05, 0.15) * winner["military_power"])
    loser_casualties = int(random.uniform(0.15, 0.35) * loser["military_power"])
    winner["military_power"] = max(0, winner["military_power"] - winner_casualties)
    loser["military_power"] = max(0, loser["military_power"] - loser_casualties)

    # ── Ekonomik hasar ──
    winner["treasury"] = max(0, winner["treasury"] - random.randint(300, 800))
    loser["treasury"] = max(0, loser["treasury"] - random.randint(500, 1500))

    # ── Bölge el değişimi ──
    if winner is fac_a and region["owner_faction_id"] == fac_b["id"]:
        region["owner_faction_id"] = fac_a["id"]
        if region["id"] not in fac_a.get("city_influence", {}):
            fac_a.setdefault("city_influence", {})[region["id"]] = min(100, fac_a.get("city_influence", {}).get(region["id"], 0) + 50)
        if fac_b.get("city_influence", {}).get(region["id"], 0) >= 50:
            fac_b.setdefault("city_influence", {})[region["id"]] = max(0, fac_b.get("city_influence", {}).get(region["id"], 50) - 50)
        region["economy"] = max(0, region["economy"] - random.randint(10, 25))
        region["security"] = max(0, region["security"] - random.randint(15, 30))

    # ── Diplomasi etkisi ──
    loser["stability"] = max(0, loser["stability"] - random.randint(5, 15))
    loser["reputation"] = max(0, loser["reputation"] - random.randint(5, 15))
    winner["reputation"] = min(100, winner["reputation"] + random.randint(3, 10))

    # ── NPC ölümü / esir ──
    npc_events = []
    for mid in loser["members"][1:]:
        npc = _get_npc(state, mid)
        if not npc or not npc.get("alive", True):
            continue
        if npc.get("faction_role") in ("isyancı",) or random.random() < 0.05:
            if random.random() < 0.30:
                npc["alive"] = False
                npc_events.append(f"{npc['name']} savaşta hayatını kaybetti")
                # Faction üye listelerinden temizle
                for fac in state["world"].get("factions", []):
                    if npc["id"] in fac.get("members", []):
                        fac["members"].remove(npc["id"])
                    if fac.get("leader_id") == npc["id"]:
                        _trigger_leader_change(fac, state, turn, reason="lider_öldü")
            elif random.random() < 0.20:
                npc_events.append(f"{npc['name']} esir alındı")

    # ── Kayıt ──
    battle_record = {
        "turn": turn,
        "winner_id": winner["id"],
        "loser_id": loser["id"],
        "region_id": region["id"],
        "score_a": round(score_a, 1),
        "score_b": round(score_b, 1),
        "winner_casualties": winner_casualties,
        "loser_casualties": loser_casualties,
        "npc_events": npc_events,
        "winner_military_after": winner["military_power"],
        "loser_military_after": loser["military_power"],
    }
    war["battles"].append(battle_record)
    # A-2: Savaş kayıt listesini 30 ile sınırla (bellek kontrolü)
    if len(war["battles"]) > 30:
        war["battles"] = war["battles"][-30:]

    _log_event(state, turn, "muharebe",
               f"[{region['name']}] Muharebe: [{winner['name']}] kazandı "
               f"(Skor: {score_a:.0f} vs {score_b:.0f}). "
               f"Kayıplar → Galibin: {winner_casualties}, Kaybedenin: {loser_casualties}. "
               + ("; ".join(npc_events) + "." if npc_events else ""),
               winner["id"])

    return battle_record


def _check_war_end(war: dict, fac_a: dict, fac_b: dict, state: dict, turn: int):
    """Savaşın bitmesi için koşullar kontrol edilir."""
    # Askeri güç sıfırlanırsa
    if fac_a["military_power"] < 5:
        _end_war(war, fac_a, fac_b, state, turn, outcome="b_kazandı",
                 reason=f"[{fac_a['name']}] askeri gücü tükendi")
    elif fac_b["military_power"] < 5:
        _end_war(war, fac_a, fac_b, state, turn, outcome="a_kazandı",
                 reason=f"[{fac_b['name']}] askeri gücü tükendi")
    # Hazine biterse
    elif fac_a["treasury"] < 200 and fac_b["treasury"] < 200:
        _end_war(war, fac_a, fac_b, state, turn, outcome="beraberlik",
                 reason="Her iki tarafın hazinesi tükendi, barış zorunlu")
    # Uzun savaş yorgunluğu (20 tick = 20 hafta)
    elif (turn - war["started_turn"]) > 20 and random.random() < 0.15:
        _end_war(war, fac_a, fac_b, state, turn, outcome="barış",
                 reason="Uzun savaş yorgunluğu barışa zemin hazırladı")


def _end_war(war: dict, fac_a: dict, fac_b: dict, state: dict, turn: int,
             outcome: str, reason: str):
    war["ended_turn"] = turn
    war["outcome"] = outcome
    # Savaş listelerini temizle
    if fac_b["id"] in fac_a.get("at_war_with", []):
        fac_a["at_war_with"].remove(fac_b["id"])
    if fac_a["id"] in fac_b.get("at_war_with", []):
        fac_b["at_war_with"].remove(fac_a["id"])

    # GDD v3: Savaş sonrası ateşkes ekle
    cause = war.get("cause", "")
    if "kiralama" in cause:
        truce_type = "kiralama_savasi"
    elif "inanc" in cause or "seriat" in cause or "kutsal" in cause:
        truce_type = "inanc_savasi"
    elif "darbe" in cause:
        truce_type = "darbe_girisimi"
    else:
        truce_type = "normal_savas"
    _add_truce(fac_a, fac_b, truce_type)

    # İlişki skoru da değişir — kazananın kazanana sempati
    if outcome == "a_kazandı":
        _change_relation(fac_a, fac_b, -10)
    elif outcome == "b_kazandı":
        _change_relation(fac_b, fac_a, -10)
    else:
        _change_relation(fac_a, fac_b, +5)  # Barış anlaşması biraz güven verir

    _log_event(state, turn, "savaş_bitti",
               f"Savaş sona erdi: [{fac_a['name']}] vs [{fac_b['name']}]. "
               f"Sonuç: {outcome}. Sebep: {reason}. "
               f"Ateşkes: {TRUCE_DURATIONS.get(truce_type, 20)} tur.",
               fac_a["id"])



# ─────────────────────────────────────────────────────────────────────────────
# 6. AI KARAR SİSTEMİ — UTILITY-BASED
# ─────────────────────────────────────────────────────────────────────────────

def _faction_ai_decision(fac: dict, state: dict, turn: int):
    """
    GDD v3 Faction AI — ilişki bazlı sistem.
    - Cooldown YOK, savaş açmak için Katman 1+2 kontrolü yapılır
    - Her faction tipinin kendi ağırlık tablosu var
    - Aggression skoru savaş ihtimalini artırır/azaltır
    """
    fac_type = fac.get("type", "kabile")
    # Faction tipine özgü ağırlıkları al, yoksa genel ACTION_WEIGHTS'i kullan
    type_weights = FACTION_AI_WEIGHTS.get(fac_type)

    factions = state["world"].get("factions", [])

    # Agresyon bonusu: agresif faction daha kolay savaşa girer
    aggression_mod = fac.get("aggression_skoru", 0.0) * 0.01

    if type_weights:
        # Yeni v3 ağırlık sistemi
        scores: dict[str, float] = {}
        for action, base_w in type_weights.items():
            score = base_w

            if action == "savaş_aç":
                # Katman 1: Saldırı matrisi kontrolü
                valid_targets = [
                    f for f in factions
                    if f["id"] != fac["id"]
                    and f["id"] not in fac.get("at_war_with", [])
                    and not _in_truce(fac, f)
                    and _can_attack(fac, f)
                    and _should_attack(fac, f)
                ]
                if not valid_targets:
                    scores[action] = -1.0
                    continue
                # Güç eşiği
                min_mil = {"krallık_ordusu": 40, "paralı_asker": 30}.get(fac_type, 0)
                if fac["military_power"] < min_mil:
                    scores[action] = -1.0
                    continue
                # GDD v4 Bölüm 5.1: Mevsimsel çarpan — kışta/hasatta savaş caydırıcı
                score *= _mevsim_savas_carpani(turn)
                score += aggression_mod
                # Güç oranı avantajı
                target = min(valid_targets, key=lambda f: f["military_power"])
                if target["military_power"] > 0:
                    oran = fac["military_power"] / target["military_power"]
                    score += min(0.20, (oran - 1.0) * 0.10)
                # Eşkıya bölgede KO varsa %50 düşüş
                if fac_type == "eskiya_cetesi":
                    if any(f.get("type") == "krallık_ordusu" for f in factions):
                        score *= 0.50

            elif action == "ittifak_kur":
                last_al = fac.get("last_alliance_turn", -999)
                if turn - last_al < 15:
                    scores[action] = -1.0
                    continue
                ally_count = sum(1 for v in fac.get("diplomacy", {}).values() if v == "müttefik")
                if ally_count >= 3:
                    score -= 0.40

            elif action == "ambargo":
                # Sadece tüccar loncası — iyi ilişki olan varsa düşür
                poor_rel = [f for f in factions
                            if _get_relation(fac, f) < -20 and f["id"] != fac["id"]]
                if not poor_rel:
                    scores[action] = -1.0
                    continue

            elif action == "fetva_ver":
                # Dini tarikat — devam eden savaş varsa uygun
                wars = state["world"].get("wars", [])
                active = [w for w in wars if w.get("ended_turn") is None]
                if not active:
                    scores[action] = -1.0
                    continue
                score += fac.get("dini_guc", 0) / 200

            elif action == "şeriat_ilan":
                dini_guc = fac.get("dini_guc", 0)
                total_inf = sum(fac.get("city_influence", {}).values())
                if dini_guc < 60 or total_inf < 40:
                    scores[action] = -1.0
                    continue
                if fac.get("seriat_ilan_edildi"):
                    scores[action] = -1.0
                    continue

            elif action in ("suikast", "sabotaj", "manipülasyon"):
                # Gizli Cemiyet — ifşa olduysa gizli operasyon yapamaz
                if fac.get("ifsa_oldu"):
                    scores[action] = -1.0
                    continue
                if fac.get("treasury", 0) < 200:
                    scores[action] = -1.0
                    continue

            elif action == "istihbarat_sat":
                stok = fac.get("istihbarat_stok", {})
                if not stok:
                    scores[action] = -1.0
                    continue

            scores[action] = score

        if not scores or all(s < -0.5 for s in scores.values()):
            return
        best_action = max(scores, key=lambda a: scores[a])
        best_score = scores[best_action]
        if best_score < 0.05:
            return

    else:
        # Geriye dönük uyumluluk: eski ACTION_WEIGHTS sistemi
        ctx = {
            "gain":       fac["economy_level"] / 100,
            "risk":       1 - (fac["military_power"] / 100),
            "stability":  fac["stability"] / 100,
            "economic":   fac["economy_level"] / 100,
            "reputation": fac["reputation"] / 100,
        }
        last_war_turn = fac.get("last_war_declared_turn", -999)
        last_al = fac.get("last_alliance_turn", -999)
        scores = {}
        for action, weights in ACTION_WEIGHTS.items():
            score = sum(weights[k] * ctx.get(k, 0) for k in weights)
            if action == "savaş_aç":
                if turn - last_war_turn < 40:
                    scores[action] = -1.0; continue
                if fac.get("at_war_with"): score -= 0.60
                if fac["military_power"] < 40: score -= 0.50
                if fac["stability"] < 35: score -= 0.40
            elif action == "ittifak_kur":
                if turn - last_al < 25:
                    scores[action] = -1.0; continue
                ally_count = sum(1 for v in fac.get("diplomacy", {}).values() if v == "müttefik")
                if ally_count >= 3: score -= 0.60
            elif action == "isyan_bastır":
                score += fac["rebel_risk"] / 100 * 0.4
            elif action == "vergi_artır":
                if fac["treasury"] < 1000: score += 0.20
                if fac["unrest"] > 50: score -= 0.35
            elif action == "bölgeye_yatırım":
                if fac["economy_level"] < 40: score += 0.25
            scores[action] = score
        best_action = max(scores, key=lambda a: scores[a])
        best_score = scores[best_action]
        if best_score < -0.10:
            return
        CRITICAL_ACTIONS = {"savaş_aç", "ittifak_kur"}
        if best_action in CRITICAL_ACTIONS and best_score < 0.25:
            remaining = {a: s for a, s in scores.items() if a != best_action}
            if remaining:
                best_action = max(remaining, key=lambda a: remaining[a])
                best_score = remaining[best_action]
            if best_score < -0.10:
                return

    _execute_faction_action(fac, best_action, best_score, state, turn)
    fac["last_action"] = best_action
    fac["last_action_turn"] = turn




def _execute_faction_action(fac: dict, action: str, score: float, state: dict, turn: int):
    """Seçilen aksiyonu uygular — GDD v3: İki katman kontrol + tip bazlı aksiyonlar."""
    if action == "savaş_aç":
        # GDD v3: İki katman kontrolü
        factions = state["world"].get("factions", [])
        # Hedef seçimi: Katman 1+2 geçenlerden en zayıfı
        targets = []
        for f in factions:
            if f["id"] == fac["id"]:
                continue
            if f["id"] in fac.get("at_war_with", []):
                continue
            if _in_truce(fac, f):
                continue
            if fac["diplomacy"].get(f["id"]) == "müttefik":
                continue
            if not _can_attack(fac, f):
                continue
            if not _should_attack(fac, f):
                continue
            targets.append(f)

        if targets:
            # Eşkıya: en zayıf hedef — diğerleri: güç oranına göre
            if fac.get("type") == "eskiya_cetesi":
                target = min(targets, key=lambda f: f["military_power"])
            else:
                target = min(targets, key=lambda f: f["military_power"])
            _declare_war(fac, target, state, turn, cause="catisma_sistemi_v3")
            fac["last_war_declared_turn"] = turn
            # Aggression artışı
            delta = AGGRESSION_CHANGES["savas_ilan"]
            if target.get("type") in CIVILIAN_FACTION_TYPES:
                delta += AGGRESSION_CHANGES["sivile_saldiri"]
            if target.get("type") == "şifacı_birliği":
                delta = AGGRESSION_CHANGES["şifacı_saldiri"]
            _update_aggression(fac, delta, state, turn)
            # Savunma müdahalesi tetikle
            _try_defense_intervention(fac, target, state, turn)

    elif action == "savunma_güçlendir":
        cost = random.randint(200, 600)
        if fac["treasury"] >= cost:
            fac["treasury"] -= cost
            fac["military_power"] = min(100, fac["military_power"] + random.randint(3, 8))
            _log_event(state, turn, "savunma_yatırımı",
                       f"[{fac['name']}] {cost} altın harcayarak savunmayı güçlendirdi. "
                       f"Askeri güç → {fac['military_power']}.",
                       fac["id"])

    elif action == "vergi_artır":
        if fac["tax_rate"] < 40:
            fac["tax_rate"] = min(40, fac["tax_rate"] + random.randint(2, 6))
            fac["unrest"] = min(100, fac["unrest"] + random.randint(3, 8))
            _log_event(state, turn, "vergi_artışı",
                       f"[{fac['name']}] Vergi oranını %{fac['tax_rate']}'ye yükseltti. "
                       f"Halk huzursuzluğu arttı.",
                       fac["id"])

    elif action == "vergi_azalt":
        if fac["tax_rate"] > 8:
            fac["tax_rate"] = max(8, fac["tax_rate"] - random.randint(2, 5))
            fac["unrest"] = max(0, fac["unrest"] - random.randint(5, 12))
            fac["reputation"] = min(100, fac["reputation"] + random.randint(2, 5))
            _log_event(state, turn, "vergi_indirimi",
                       f"[{fac['name']}] Vergi oranını %{fac['tax_rate']}'ye indirdi. "
                       f"Halk memnuniyeti arttı.",
                       fac["id"])

    elif action == "ittifak_kur":
        # Faction tipi uyumluluk tablosu — kimler kimle ittifak kurabilir
        COMPATIBLE_TYPES = {
            "krallık_ordusu":  {"krallık_ordusu", "paralı_asker", "dini_tarikat", "şehir_devleti"},
            "dini_tarikat":    {"dini_tarikat", "krallık_ordusu", "şehir_devleti", "tuccar_loncasi"},
            "tuccar_loncasi":  {"tuccar_loncasi", "dini_tarikat", "şehir_devleti", "krallık_ordusu"},
            "paralı_asker":    {"paralı_asker", "krallık_ordusu", "eskiya_cetesi"},
            "eskiya_cetesi":   {"eskiya_cetesi", "paralı_asker", "gizli_cemiyet"},
            "gizli_cemiyet":   {"gizli_cemiyet", "eskiya_cetesi"},
            "şehir_devleti":   {"şehir_devleti", "tuccar_loncasi", "dini_tarikat", "krallık_ordusu"},
        }
        fac_type = fac.get("type", "")
        allowed = COMPATIBLE_TYPES.get(fac_type, set())
        candidates = [
            f for f in state["world"].get("factions", [])
            if f["id"] != fac["id"]
            and fac["diplomacy"].get(f["id"]) == "tarafsız"
            and f["id"] not in fac.get("at_war_with", [])
            and f.get("type", "") in allowed
        ]
        if candidates:
            partner = max(candidates, key=lambda f: f["reputation"])
            _set_diplomacy(fac, partner["id"], "müttefik")
            _set_diplomacy(partner, fac["id"], "müttefik")
            fac["last_alliance_turn"] = turn
            partner["last_alliance_turn"] = turn
            _log_event(state, turn, "ittifak",
                       f"[{fac['name']}] ile [{partner['name']}] ittifak kurdu. "
                       f"Karşılıklı savunma anlaşması imzalandı.",
                       fac["id"])

    elif action == "isyan_bastır":
        cost = random.randint(300, 800)
        if fac["treasury"] >= cost:
            fac["treasury"] -= cost
            reduction = random.randint(15, 30)
            fac["rebel_risk"] = max(0, fac["rebel_risk"] - reduction)
            fac["unrest"] = max(0, fac["unrest"] - random.randint(10, 20))
            fac["stability"] = min(100, fac["stability"] + random.randint(3, 8))
            _log_event(state, turn, "isyan_bastırma",
                       f"[{fac['name']}] {cost} altın harcayarak iç huzursuzluğu bastırdı. "
                       f"İsyan riski -{reduction}, stabilite arttı.",
                       fac["id"])

    elif action == "bölgeye_yatırım":
        _controlled = [lid for lid, inf in fac.get("city_influence", {}).items() if inf >= 50]
        if _controlled and fac["treasury"] >= 500:
            rid = random.choice(_controlled)
            region = _get_region(state, rid)
            if region:
                invest = random.randint(300, 700)
                fac["treasury"] -= invest
                region["economy"] = min(100, region["economy"] + random.randint(5, 12))
                region["security"] = min(100, region["security"] + random.randint(3, 8))
                region["unrest_level"] = max(0, region["unrest_level"] - random.randint(5, 10))
                fac["economy_level"] = min(100, fac["economy_level"] + random.randint(1, 3))
                _log_event(state, turn, "bölge_yatırımı",
                           f"[{fac['name']}] {region['name']}'e {invest} altın yatırdı. "
                           f"Ekonomi ve güvenlik iyileşti.",
                           fac["id"])

    elif action == "casusluk":
        targets = [f for f in state["world"].get("factions", []) if f["id"] != fac["id"]]
        if targets and fac["treasury"] >= 200:
            target = random.choice(targets)
            fac["treasury"] -= 200
            intel = {
                "military_power": target["military_power"],
                "stability": target["stability"],
                "treasury": target["treasury"] // 100 * 100,  # yaklaşık bilgi
            }
            fac.setdefault("intel", {})[target["id"]] = intel
            _log_event(state, turn, "istihbarat",
                       f"[{fac['name']}] [{target['name']}]'e casus gönderdi. "
                       f"Askeri: ~{intel['military_power']}, Stabilite: ~{intel['stability']}.",
                       fac["id"])

    # ─── GDD v3: YENİ AKSİYONLAR ────────────────────────────────────────────

    elif action == "ambargo":
        # Tüccar Loncası: ekonomik baskı (aggression artırmaz)
        factions = state["world"].get("factions", [])
        targets = [f for f in factions
                   if _get_relation(fac, f) < -20 and f["id"] != fac["id"]]
        if targets:
            target = min(targets, key=lambda f: _get_relation(fac, f))
            old_eco = target["economy_level"]
            target["economy_level"] = max(0, target["economy_level"] - random.randint(10, 20))
            target["treasury"] = max(0, int(target["treasury"] * 0.70))
            # Hedef faction'ın CB skoru artar
            _add_casus_belli(target, fac["id"], "ticaret_engeli", state, turn)
            _log_event(state, turn, "ambargo",
                       f"[{fac['name']}] [{target['name']}]'e ambargo uyguladı. "
                       f"Ekonomi {old_eco}→{target['economy_level']}, hazine -%30.",
                       fac["id"])

    elif action == "fetva_ver":
        # Dini Tarikat: savaşan faction'a moral bonusu
        wars = state["world"].get("wars", [])
        active = [w for w in wars if w.get("ended_turn") is None]
        if active and fac.get("treasury", 0) >= 100:
            war = random.choice(active)
            benef_id = war["faction_a"]
            benef = _get_faction(state, benef_id)
            if benef:
                cost = random.randint(80, 150)
                fac["treasury"] = max(0, fac["treasury"] - cost)
                benef["military_power"] = min(100, benef["military_power"] + random.randint(5, 10))
                benef["stability"] = min(100, benef["stability"] + 5)
                fac["reputation"] = min(100, fac["reputation"] + 10)
                fac["dini_guc"] = min(100, fac.get("dini_guc", 0) + 5)
                _log_event(state, turn, "fetva",
                           f"[{fac['name']}] [{benef['name']}] için fetva verdi. "
                           f"Moral ve güç arttı. Maliyet: {cost} altın.",
                           fac["id"])

    elif action == "şeriat_ilan":
        # Dini Tarikat: teokratik baskı
        dini_guc = fac.get("dini_guc", 0)
        total_inf = sum(fac.get("city_influence", {}).values())
        if dini_guc >= 60 and total_inf >= 40 and not fac.get("seriat_ilan_edildi"):
            factions = state["world"].get("factions", [])
            ko = next((f for f in factions if f.get("type") == "krallık_ordusu"), None)
            fac["seriat_ilan_edildi"] = True
            if ko and random.random() < 0.50:
                # KO reddeder
                _change_relation(fac, ko, -25)
                _add_casus_belli(fac, ko["id"], "inanc_tehdidi", state, turn)
                _add_casus_belli(ko, fac["id"], "inanc_tehdidi", state, turn)
                _log_event(state, turn, "seriat_ret",
                           f"[{ko['name']}] şeriat ilanını reddetti! İlişki -25, CB aktif.",
                           fac["id"])
            else:
                # KO kabul eder (veya KO yok)
                fac["reputation"] = min(100, fac["reputation"] + 20)
                fac["dini_guc"] = min(100, dini_guc + 15)
                if ko:
                    _change_relation(fac, ko, -10)  # biraz bağımsızlık kaybı
                _log_event(state, turn, "seriat_kabul",
                           f"[{fac['name']}] şeriat ilanı kabul edildi. Prestij +20.",
                           fac["id"])

    elif action == "darbe_girisimi":
        # Dini Tarikat: saltanat talebi (uç senaryo)
        factions = state["world"].get("factions", [])
        ko = next((f for f in factions if f.get("type") == "krallık_ordusu"), None)
        if not ko:
            return
        dini_ask = fac["military_power"]
        kr_ask = ko["military_power"]
        dini_nufuz = fac.get("dini_guc", 0)
        koşullar_sağlı = (
            dini_ask >= kr_ask * 0.80
            and dini_nufuz > 70
            and fac.get("seriat_ilan_edildi")
        )
        if not koşullar_sağlı:
            return
        basari_ihtimal = min(0.80, dini_ask / kr_ask * 0.5 + dini_nufuz / 100 * 0.3)
        fac["darbe_girisim_tur"] = turn
        if random.random() < basari_ihtimal:
            # Başarılı darbe — yönetim değişimi
            ko["military_power"] = max(0, ko["military_power"] - random.randint(20, 40))
            fac["reputation"] = min(100, fac["reputation"] + 30)
            _change_relation(fac, ko, -50)
            _log_event(state, turn, "darbe_basarili",
                       f"[{fac['name']}] başarılı darbe! Yönetim teokrasiye dönüştü.",
                       fac["id"])
        else:
            # Başarısız darbe
            fac["military_power"] = max(0, int(fac["military_power"] * 0.50))
            fac["reputation"] = max(0, fac["reputation"] - 30)
            _add_truce(fac, ko, "darbe_girisimi")
            _log_event(state, turn, "darbe_basarisiz",
                       f"[{fac['name']}] darbe girişimi başarısız! Ağır kayıp, 50 tur ateşkes.",
                       fac["id"])

    elif action == "suikast":
        factions = state["world"].get("factions", [])
        targets = [f for f in factions
                   if _get_relation(fac, f) < -15 and f["id"] != fac["id"]]
        if targets:
            target = random.choice(targets)
            _gizli_cemiyet_operation(fac, target, "suikast", state, turn)

    elif action == "sabotaj":
        factions = state["world"].get("factions", [])
        targets = [f for f in factions
                   if _get_relation(fac, f) < -10 and f["id"] != fac["id"]]
        if targets:
            target = random.choice(targets)
            _gizli_cemiyet_operation(fac, target, "sabotaj", state, turn)

    elif action == "manipülasyon":
        factions = state["world"].get("factions", [])
        targets = [f for f in factions if f["id"] != fac["id"]]
        if targets:
            target = random.choice(targets)
            _gizli_cemiyet_operation(fac, target, "manipülasyon", state, turn)

    elif action == "yardım_çağrısı":
        # İlim Cemiyeti: yardım çağrısı (saldırı yokken hazırlık)
        _ilim_yardim_cagrisi(fac, state, turn)

    elif action == "evrensel_yardım":
        # Şifacı Birliği: savaştaki herkese yardım
        wars = state["world"].get("wars", [])
        active = [w for w in wars if w.get("ended_turn") is None]
        if active:
            war = random.choice(active)
            for fid in (war["faction_a"], war["faction_b"]):
                target = _get_faction(state, fid)
                if target:
                    _şifacı_universal_aid(fac, target, state, turn)
            _log_event(state, turn, "şifacı_yardım",
                       f"[{fac['name']}] savaştaki her iki tarafa yardım etti.",
                       fac["id"])

    elif action == "asayiş_müdahale":
        # Krallık Ordusu: eşkıya-sivil çatışmasına müdahale
        factions = state["world"].get("factions", [])
        bandits = [f for f in factions if f.get("type") == "eskiya_cetesi"
                   and f["id"] not in fac.get("at_war_with", [])
                   and not _in_truce(fac, f)]
        if bandits:
            bandit = max(bandits, key=lambda f: f.get("aggression_skoru", 0))
            if _can_attack(fac, bandit):
                _declare_war(fac, bandit, state, turn, cause="asayiş_görevi")
                fac["last_war_declared_turn"] = turn
                _update_aggression(fac, AGGRESSION_CHANGES["savas_ilan"], state, turn)

    elif action == "istihbarat_sat":
        # Seyyah Kumpanya: bilgi sat
        _seyyah_istihbarat_topla(fac, state, turn)
        factions = state["world"].get("factions", [])
        buyers = [f for f in factions if f["id"] != fac["id"]
                  and f["treasury"] >= 200]
        stok = fac.get("istihbarat_stok", {})
        if buyers and stok:
            buyer = random.choice(buyers)
            target_id = random.choice(list(stok.keys()))
            _seyyah_istihbarat_sat(fac, buyer, target_id, state, turn)

    elif action == "arabuluculuk":
        # GDD v4 Bölüm 1.4: İlim Cemiyeti arabuluculuğu
        _ilim_mediation_attempt(fac, state, turn)

    # ─── GDD v4.0: YENİ EYLEMLER ─────────────────────────────────────────────

    elif action == "misyoner_gonder":
        # Dini Tarikat: bölgeye misyoner gönder → inanç etkisi + nüfus huzuru
        meta = FACTION_ACTIONS["misyoner_gonder"]
        maliyet = meta["maliyet"]
        if fac.get("type") not in meta["uygun_tipler"]:
            pass
        elif fac["treasury"] < maliyet:
            pass
        else:
            controlled = [lid for lid, inf in fac.get("city_influence", {}).items() if inf >= 30]
            if controlled:
                rid = random.choice(controlled)
                region = _get_region(state, rid)
                if region:
                    fac["treasury"] -= maliyet
                    # inanc_etkisi artışı
                    fac["inanc_etkisi"] = _clamp(fac.get("inanc_etkisi", 0) + 10, -50, 50)
                    # bölge inanç dağılımı güncelle
                    inanc_dag = region.setdefault("inanc_dagilimi", {})
                    fac_inanc = fac.get("name", "bilinmeyen")
                    inanc_dag[fac_inanc] = min(100, inanc_dag.get(fac_inanc, 0) + 8)
                    # bölge huzursuzluğu azalt
                    region["unrest_level"] = max(0, region.get("unrest_level", 50) - 5)
                    # bölge etkisi artır
                    fac.setdefault("city_influence", {})[rid] = min(
                        100, fac["city_influence"].get(rid, 0) + 8
                    )
                    fac["reputation"] = min(100, fac["reputation"] + 5)
                    _log_event(state, turn, "misyoner_gönderimi",
                               f"[{fac['name']}] {region['name']}'e misyoner gönderdi. "
                               f"İnanç etkisi → {fac['inanc_etkisi']}, bölge huzuru arttı.",
                               fac["id"])

    elif action == "sehir_yukselt":
        # KO / Tüccar / Zanaatkar: altyapı seviyesi yükselt
        meta = FACTION_ACTIONS["sehir_yukselt"]
        maliyet = meta["maliyet"]
        if fac.get("type") not in meta["uygun_tipler"]:
            pass
        elif fac["treasury"] < maliyet:
            pass
        else:
            # Tam kontrol (etki ≥ 60) bölgelerden seviyesi en düşük olanı seç
            controlled = [
                lid for lid, inf in fac.get("city_influence", {}).items() if inf >= 60
            ]
            if controlled:
                region_candidates = [
                    r for r in [_get_region(state, lid) for lid in controlled]
                    if r and r.get("altyapi_seviyesi", 5) < 5
                ]
                if region_candidates:
                    region = min(region_candidates, key=lambda r: r.get("altyapi_seviyesi", 0))
                    fac["treasury"] -= maliyet
                    eski_seviye = region.get("altyapi_seviyesi", 1)
                    region["altyapi_seviyesi"] = min(5, eski_seviye + 1)
                    region["gelir_carpan"] = round(
                        min(2.0, region.get("gelir_carpan", 1.0) + 0.10), 2
                    )
                    region["economy"] = min(100, region.get("economy", 50) + 8)
                    region["security"] = min(100, region.get("security", 50) + 5)
                    fac["reputation"] = min(100, fac["reputation"] + 8)
                    fac["stability"] = min(100, fac["stability"] + 5)
                    _log_event(state, turn, "şehir_yükseltme",
                               f"[{fac['name']}] {region['name']} altyapısını "
                               f"{eski_seviye}→{region['altyapi_seviyesi']} seviyesine çıkardı. "
                               f"Gelir çarpanı: {region['gelir_carpan']}.",
                               fac["id"])

    elif action == "darbe_hazirlik_baslat":
        # Herhangi bir faction rakibe karşı darbe planlayabilir (GDD v4 Bölüm 2)
        meta    = FACTION_ACTIONS["darbe_hazirlik_baslat"]
        maliyet = meta["maliyet"]
        if fac["treasury"] < maliyet:
            pass
        elif fac.get("darbe_plani") is not None:
            pass  # zaten aktif bir plan var
        else:
            factions = state["world"].get("factions", [])
            hedefler = [
                f for f in factions
                if f["id"] != fac["id"]
                and f["id"] not in fac.get("at_war_with", [])
                and _get_relation(fac, f) < -10
            ]
            if hedefler:
                hedef = min(hedefler, key=lambda f: _get_relation(fac, f))
                fac["treasury"] -= maliyet
                # GDD v4: 4 fazlı plan yapısı
                fac["darbe_plani"] = {
                    "hedef_id":             hedef["id"],
                    "faz":                  1,            # 1=propaganda 2=askeri 3=hazine 4=eylem
                    "faz_baslangic_tur":    turn,
                    "halk_destegi_skoru":   0.0,
                    "askeri_birlik_skoru":  0.0,
                    "hazine_ele_gecirildi": False,
                    "ifsa_riski":           0.0,
                }
                fac["stability"] = max(0, fac["stability"] - 5)
                _log_event(state, turn, "darbe_hazırlık",
                           f"[{fac['name']}] [{hedef['name']}]'e karşı darbe hazırlığı başlattı. "
                           f"Faz 1: Propaganda.",
                           fac["id"])

    elif action == "uye_kazan":
        # GDD v4 Bölüm 6 — AI tarafından tetiklenen üye devşirme
        meta    = FACTION_ACTIONS["uye_kazan"]
        maliyet = meta["maliyet"]
        if fac["treasury"] >= maliyet:
            fac["treasury"] -= maliyet
            yeni_uye = random.randint(2, 5)
            fac["uye_sayisi"] = fac.get("uye_sayisi", 1) + yeni_uye
            militer_bonus = yeni_uye // 4
            if militer_bonus > 0:
                fac["military_power"] = min(200, fac.get("military_power", 10) + militer_bonus)
            fac["son_uye_kazan_tur"] = turn
            _log_event(state, turn, "uye_kazanildi",
                       f"[{fac['name']}] aktif devşirmeyle {yeni_uye} yeni üye kazandı. "
                       f"(Toplam: {fac['uye_sayisi']})",
                       fac["id"])

    elif action == "pasif_kal":
        pass  # Hiçbir şey yapmaz


def _set_diplomacy(fac: dict, target_id: str, relation: str):
    """FIX-15: Diplomasi durumunu günceller; 'düşman' olunca allies listesinden de çıkar."""
    fac.setdefault("diplomacy", {})[target_id] = relation
    if relation == "düşman" and target_id in fac.get("allies", []):
        fac["allies"].remove(target_id)
    elif relation == "müttefik" and target_id not in fac.get("allies", []):
        fac.setdefault("allies", []).append(target_id)


SEYYAH_KACIS_SANSLAR = {
    "normal_saldiri": 0.60,
    "kusatma":        0.30,
    "ani_baskin":     0.45,
}


def _seyyah_escape_attempt(seyyah_fac: dict, attacker: dict,
                            attack_type: str, state: dict, turn: int) -> bool:
    """
    Seyyah Kumpanya saldırıya uğrayınca kaçış dener.
    True döndürürse savaş iptal edilir.
    GDD v4 Bölüm 1.3
    """
    base = SEYYAH_KACIS_SANSLAR.get(attack_type, 0.50)

    hazine_bonus = min(0.15, seyyah_fac.get("treasury", 0) / 2000)
    guc_fark = attacker["military_power"] / max(1, seyyah_fac["military_power"])
    guc_ceza = min(0.20, (guc_fark - 1) * 0.05) if guc_fark > 1 else 0

    kacis_sansi = _clamp(base + hazine_bonus - guc_ceza, 0.05, 0.85)

    if random.random() < kacis_sansi:
        kayip = random.randint(2, 8)
        seyyah_fac["military_power"] = max(1, seyyah_fac["military_power"] - kayip)
        _change_relation(seyyah_fac, attacker, -5)
        _log_event(state, turn, "seyyah_kacis",
                   f"[{seyyah_fac['name']}] [{attacker['name']}]'dan kaçmayı başardı "
                   f"({kayip} kayıp verdi).",
                   seyyah_fac["id"])
        return True  # savaş iptal
    else:
        kayip = random.randint(10, 25)
        seyyah_fac["military_power"] = max(0, seyyah_fac["military_power"] - kayip)
        _log_event(state, turn, "seyyah_yakaland",
                   f"[{seyyah_fac['name']}] kaçamadı! {kayip} kayıp verdi, savaşa dahil.",
                   seyyah_fac["id"])
        return False  # normal savaş devam eder


# ─────────────────────────────────────────────────────────────────────────────
# GDD v4 Bölüm 2: 4 FAZLI DARBE SİSTEMİ
# ─────────────────────────────────────────────────────────────────────────────

def _darbe_sonrasi_tepkiler(kazanan: dict, kaybeden: dict, state: dict, turn: int):
    """Diğer factionların darbeye tepkisi: ilişkiye göre kazananı destekler ya da karşı çıkar."""
    for fac in state["world"].get("factions", []):
        if fac["id"] in (kazanan["id"], kaybeden["id"]):
            continue
        rel_kaybeden = _get_relation(fac, kaybeden)
        rel_kazanan  = _get_relation(fac, kazanan)
        if rel_kaybeden > 30:
            _change_relation(fac, kazanan, -20)
            _add_casus_belli(fac, kazanan["id"], "muttefik_saldiriya_ugradi", state, turn)
        elif rel_kazanan > 30:
            _change_relation(fac, kazanan, +10)


def _darbe_ifsa(planlayan: dict, hedef: dict, state: dict, turn: int):
    """Plan deşifre oldu — herkes CB alır, plan sıfırlanır."""
    for fac in state["world"].get("factions", []):
        if fac["id"] != planlayan["id"]:
            _add_casus_belli(fac, planlayan["id"], "ifsa_operasyonu", state, turn)
    planlayan["darbe_plani"] = None
    _log_event(state, turn, "darbe_ifsa",
               f"[{planlayan['name']}] darbe planı ifşa oldu! Herkes CB aldı.",
               planlayan["id"])


def _darbe_gerceklestir(planlayan: dict, hedef: dict, state: dict, turn: int):
    """
    GDD v4 Bölüm 2 — Darbenin kendisi.
    İhtimal: halk_destegi × 0.30 + askeri_birlik × 0.35 + hazine × 0.15 + güç_oranı × 0.20
    """
    plan    = planlayan.get("darbe_plani") or {}
    guc_oran = planlayan["military_power"] / max(1, hedef["military_power"])

    basari = _clamp(
        plan.get("halk_destegi_skoru", 0)   * 0.30
        + plan.get("askeri_birlik_skoru", 0) * 0.35
        + (0.15 if plan.get("hazine_ele_gecirildi") else 0.0)
        + min(0.20, guc_oran * 0.15),
        0.03, 0.85
    )

    if random.random() < basari:
        # ── BAŞARILI DARBE ──
        hedef["military_power"]  = max(0, hedef["military_power"] // 2)
        hedef["economy_level"]   = max(0, hedef["economy_level"] - 20)
        hedef["unrest"]          = min(100, hedef["unrest"] + 40)
        planlayan["reputation"]  = min(100, planlayan["reputation"] + 25)
        planlayan["military_power"] = min(200, int(planlayan["military_power"] * 1.20))
        _change_relation(planlayan, hedef, -60)
        _add_casus_belli(hedef, planlayan["id"], "dogrudan_saldiri", state, turn)
        _darbe_sonrasi_tepkiler(planlayan, hedef, state, turn)
        planlayan["darbe_girisim_tur"] = turn
        _log_event(state, turn, "darbe_basarili",
                   f"[{planlayan['name']}] → [{hedef['name']}] darbesi başarılı! "
                   f"Güç dengesi değişti.",
                   planlayan["id"])
    else:
        # ── BAŞARISIZ DARBE ──
        if basari > 0.40:
            planlayan["military_power"] = max(1, int(planlayan["military_power"] * 0.60))
            planlayan["reputation"]     = max(0, planlayan["reputation"] - 20)
            _add_truce(planlayan, hedef, "darbe_girisimi")
            sonuc = "yakın_geçti"
        else:
            planlayan["military_power"] = max(0, int(planlayan["military_power"] * 0.30))
            planlayan["reputation"]     = max(0, planlayan["reputation"] - 40)
            planlayan["unrest"]         = min(100, planlayan["unrest"] + 30)
            _add_truce(planlayan, hedef, "darbe_girisimi")
            sonuc = "ezildi"
        _log_event(state, turn, "darbe_basarisiz",
                   f"[{planlayan['name']}] → [{hedef['name']}] darbesi başarısız ({sonuc}).",
                   planlayan["id"])

    planlayan["darbe_plani"] = None  # plan her iki durumda da sıfırlanır


def _darbe_faz_ilerle(planlayan: dict, state: dict, turn: int):
    """
    GDD v4 Bölüm 2 — Her tick aktif darbe planlarını bir tur ilerletir.
    Eski basit ilerleme (ilerleme + hazirlik_tur) → 4 fazlı sisteme dönüştürüldü.
    Faz 1: Propaganda (halk_destegi birikir)
    Faz 2: Askeri bağlılık
    Faz 3: Hazine kontrolü
    Faz 4: Anlık eylem
    """
    plan = planlayan.get("darbe_plani")
    if not plan:
        return

    hedef = _get_faction(state, plan.get("hedef_id"))
    if not hedef:
        planlayan["darbe_plani"] = None
        return

    # --- İfşa riski her tur birikir ---
    risk = plan.get("ifsa_riski", 0.0) + random.uniform(0.02, 0.05)
    plan["ifsa_riski"] = risk
    if random.random() < risk * 0.25:
        _darbe_ifsa(planlayan, hedef, state, turn)
        return

    faz         = plan.get("faz", 1)
    faz_baslangic = plan.get("faz_baslangic_tur", turn)
    faz_sure    = turn - faz_baslangic

    if faz == 1:  # Propaganda
        rep_bonus = planlayan.get("reputation", 50) / 500
        plan["halk_destegi_skoru"] = _clamp(
            plan.get("halk_destegi_skoru", 0.0) + random.uniform(0.02, 0.06) + rep_bonus,
            0.0, 1.0
        )
        if faz_sure >= 8 or plan["halk_destegi_skoru"] >= 0.40:
            plan["faz"] = 2
            plan["faz_baslangic_tur"] = turn

    elif faz == 2:  # Askeri bağlılık
        ask_oran = planlayan["military_power"] / max(1, hedef["military_power"])
        plan["askeri_birlik_skoru"] = _clamp(
            plan.get("askeri_birlik_skoru", 0.0) + random.uniform(0.03, 0.08) * min(1.5, ask_oran),
            0.0, 1.0
        )
        if faz_sure >= 5 or plan["askeri_birlik_skoru"] >= 0.50:
            plan["faz"] = 3
            plan["faz_baslangic_tur"] = turn

    elif faz == 3:  # Hazine kontrolü
        hazine_oran = planlayan.get("treasury", 0) / max(1, hedef.get("treasury", 1))
        plan["hazine_ele_gecirildi"] = hazine_oran >= 0.5
        if faz_sure >= 3 or plan["hazine_ele_gecirildi"]:
            plan["faz"] = 4
            plan["faz_baslangic_tur"] = turn

    elif faz == 4:  # Anlık eylem
        _darbe_gerceklestir(planlayan, hedef, state, turn)


def _mevsim_savas_carpani(turn: int) -> float:
    """
    GDD v4 Bölüm 5.1 — Mevsimsel savaş çarpanı.
    1200'lerde ordu kışın yürümüyordu. Hasat zamanı da asker köye dönerdi.
    Döndürülen değer AI savaş_aç skoruna çarpar (< 1.0 = caydırıcı).
    """
    from calendar_tr import season_for_turn, WEEKS_PER_YEAR, WEEKS_PER_MONTH
    season = season_for_turn(turn)
    rem = turn % WEEKS_PER_YEAR
    month_idx = rem // WEEKS_PER_MONTH  # 0-indexed
    month_no = month_idx + 1

    # Kış: Aralık(12), Ocak(1), Şubat(2) → %80 düşüş → çarpan 0.20
    if season == "Kış":
        return 0.20
    # Hasat: Ağustos(8) + Eylül(9) → %60 düşüş → çarpan 0.40
    if month_no in (8, 9):
        return 0.40
    # Diğer dönemler: normal
    return 1.0


def _declare_war(attacker: dict, defender: dict, state: dict, turn: int, cause: str):
    """Savaş ilanı — GDD v3: CB kontrolü + müttefik CB."""
    if defender["id"] in attacker.get("at_war_with", []):
        return  # zaten savaştalar

    # GDD v4 Bölüm 1.3: Seyyah Kumpanya kaçış denemesi
    if defender.get("type") == "seyyah_kumpanya":
        escaped = _seyyah_escape_attempt(defender, attacker, "normal_saldiri", state, turn)
        if escaped:
            return  # savaş başlamaz

    attacker.setdefault("at_war_with", []).append(defender["id"])
    defender.setdefault("at_war_with", []).append(attacker["id"])

    # FIX-15: Savaş ilanında diplomasi "düşman" yapılırken allies listesinden de temizle
    _set_diplomacy(attacker, defender["id"], "düşman")
    _set_diplomacy(defender, attacker["id"], "düşman")

    war = make_war(attacker["id"], defender["id"], turn, cause)
    attacker.setdefault("wars", []).append(war["id"])
    defender.setdefault("wars", []).append(war["id"])
    state["world"].setdefault("wars", []).append(war)

    # Savaş ilanı etkileri
    attacker["stability"] = max(0, attacker["stability"] - 5)
    defender["stability"] = max(0, defender["stability"] - 8)

    # GDD v3: Saldırıya uğrayan tarafın müttefiklerine CB ver
    factions = state["world"].get("factions", [])
    for ally_id in defender.get("allies", []):
        ally = _get_faction(state, ally_id)
        if ally:
            _add_casus_belli(ally, attacker["id"], "muttefik_saldiriya_ugradi", state, turn)

    # Müttefik factionlar da haberdar olur (saldırgan tarafı)
    for ally_id in attacker.get("allies", []):
        ally = _get_faction(state, ally_id)
        if ally:
            ally.setdefault("diplomacy", {})[defender["id"]] = "düşman"

    _log_event(state, turn, "savaş_ilanı",
               f"[{attacker['name']}] → [{defender['name']}]'e savaş ilan etti! "
               f"Sebep: {cause}. Askeri güç: {attacker['military_power']} vs {defender['military_power']}.",
               attacker["id"])




def _find_faction_rival(fac: dict, state: dict) -> Optional[str]:
    """Faction'ın en güçlü düşman faction rakibini döndürür (iç savaş için)."""
    rivals = [
        f for f in state["world"].get("factions", [])
        if f["id"] != fac["id"]
        and f["id"] not in fac.get("at_war_with", [])
        and fac.get("diplomacy", {}).get(f["id"]) in ("tarafsız", "düşman", None)
        and f["military_power"] < fac["military_power"] * 1.5  # zayıf/denk hedef
    ]
    if not rivals:
        return None
    return random.choice(rivals)["id"]  # faction id döndür, NPC id değil


def _start_civil_war(fac: dict, rival_fac: dict, state: dict, turn: int):
    """İç savaş — faction içi kopuşun savaşa dönmesi."""
    if rival_fac:
        _declare_war(fac, rival_fac, state, turn, cause="iç_savaş")
    fac["stability"] = max(0, fac["stability"] - 20)
    fac["reputation"] = max(0, fac["reputation"] - 15)
    _log_event(state, turn, "iç_savaş",
               f"[{fac['name']}] ciddi bir iç savaşa sürüklendi! "
               f"Stabilite kritik seviyeye düştü.",
               fac["id"])


def _trigger_leader_change(fac: dict, state: dict, turn: int, reason: str):
    """Lider değişimi — en hırslı ve güçlü üye lider olur."""
    old_leader = _get_npc(state, fac["leader_id"])
    old_name = old_leader["name"] if old_leader else "bilinmiyor"

    # En uygun aday: ambition + loyalty kombinasyonu
    candidates = [
        _get_npc(state, mid)
        for mid in fac["members"]
        if mid != fac["leader_id"] and _get_npc(state, mid)
        and _get_npc(state, mid).get("alive", True)
    ]
    if not candidates:
        return

    new_leader = max(
        candidates,
        key=lambda n: (n.get("ambition", 0) * 0.6 + n.get("faction_loyalty", 0) * 0.4)
    )

    fac["leader_id"] = new_leader["id"]
    new_leader["faction_role"] = "lider"
    if old_leader:
        old_leader["faction_role"] = "üye"

    # FIX-7: kingdom king_id'yi de güncelle (faction lideri = kral olabilir)
    for kingdom in state["world"].get("kingdoms", []):
        if kingdom.get("king_id") == (old_leader["id"] if old_leader else None):
            kingdom["king_id"] = new_leader["id"]
            new_leader["profession"] = "kral"

    # Lider değişiminin etkileri
    fac["stability"] = max(0, fac["stability"] - 10)
    fac["fear_level"] = max(0, fac["fear_level"] - 5)  # yeni lider önce yumuşak olabilir

    # GDD v4 Bölüm 5.3: Lider değişimi → iktidar boşluğu başlar (8 tur)
    fac["iktidar_boslugu"] = {
        "aktif": True,
        "tur_bitis": turn + 8,
        "eski_lider": old_name,
    }

    _log_event(state, turn, "lider_değişimi",
               f"[{fac['name']}] {reason} nedeniyle lider değişti. "
               f"{old_name} → {new_leader['name']}. "
               f"Stabilite sarsıldı. 8 tur iktidar boşluğu başladı.",
               fac["id"])


# ─────────────────────────────────────────────────────────────────────────────
# 7. DÜNYA TICK ENTEGRASYONu
# ─────────────────────────────────────────────────────────────────────────────

def faction_world_tick(state: dict, turn: int):
    """
    Her hafta simulation.py'deki advance_time() tarafından çağrılır.
    GDD v3: ekonomi → stabilite → korku → itibar → NPC → bölge → savaş → v3_conflict → AI
    """
    world = state.get("world", {})
    factions = world.get("factions", [])
    regions = world.get("regions", [])
    wars = world.get("wars", [])

    # ── TREND SNAPSHOT: her 4 haftada bir toplam nüfuzu kayıt et ──
    if turn % 4 == 0:
        for fac in factions:
            total = sum(fac.get("city_influence", {}).values())
            hist = fac.setdefault("influence_history", [])
            hist.append({"turn": turn, "total": total})
            fac["influence_history"] = hist[-4:]  # son 4 snapshot

    # ── FAZA 1: Faction istatistikleri güncelle ──
    for fac in factions:
        # Doğal drift (küçük gürültü ile) — FIX-12: beklenen değer 0 olacak şekilde simetrik
        fac["economy_level"] = _clamp(
            fac["economy_level"] + random.randint(-2, 2), 0, 100
        )
        fac["unrest"] = _clamp(fac["unrest"] + random.randint(-1, 2), 0, 100)

        # Sebep-sonuç zincirleri
        _apply_economy_effects(fac, state, turn)
        _apply_stability_effects(fac, state, turn)
        _apply_military_effects(fac, state, turn)
        _apply_fear_effects(fac, state, turn)
        _apply_reputation_effects(fac, state, turn)

        # İsyan patlaması
        if fac["rebel_risk"] >= 80:
            if random.random() < 0.30:
                fac["rebel_risk"] = max(0, fac["rebel_risk"] - 40)
                _trigger_leader_change(fac, state, turn, reason="büyük_isyan")

    # ── GDD v3 FAZA 1b: Ateşkes + Aggression doğal düşüşü ──
    _update_truces(factions)
    _decay_aggression(factions)

    # ── GDD v3 FAZA 1c: Paralı asker görev ticki ──
    for fac in factions:
        if fac.get("type") == "paralı_asker" and fac.get("kiralayan"):
            _mercenary_tick(fac, state, turn)

    # ── GDD v3 FAZA 1d: Seyyah Kumpanya istihbarat toplama ──
    for fac in factions:
        if fac.get("type") == "seyyah_kumpanya":
            _seyyah_istihbarat_topla(fac, state, turn)

    # ── GDD v4 Bölüm 2: Aktif darbe planlarını ilerlet ──
    for fac in factions:
        plan = fac.get("darbe_plani")
        if plan and plan.get("faz", 0) > 0:
            _darbe_faz_ilerle(fac, state, turn)


    # ── FAZA 2: NPC kararları ──
    for npc in world.get("npcs", []):
        if npc.get("alive", True) and random.random() < 0.15:  # her tick her NPC değil
            _npc_faction_decision(npc, state, turn)

    # ── FAZA 3: Bölge tick'leri ──
    for region in regions:
        owner_fac = _get_faction(state, region.get("owner_faction_id"))
        _region_tick(region, owner_fac, state, turn)

    # ── FAZA 4: Aktif savaşların çözümü ──
    active_wars = [w for w in wars if w.get("ended_turn") is None]
    for war in active_wars:
        fac_a = _get_faction(state, war["faction_a"])
        fac_b = _get_faction(state, war["faction_b"])
        if not fac_a or not fac_b:
            continue

        # Haftada ~%40 ihtimalle muharebe gerçekleşir
        if random.random() < 0.40:
            # Çekişmeli bir bölge seç
            contested = [
                r for r in regions
                if fac_a.get("city_influence", {}).get(r["id"], 0) >= 50
                or fac_b.get("city_influence", {}).get(r["id"], 0) >= 50
            ]
            if contested:
                battle_region = random.choice(contested)
                resolve_battle(war, fac_a, fac_b, battle_region, state, turn)

        _check_war_end(war, fac_a, fac_b, state, turn)

    # ── FAZA 5: Faction AI kararları (8 haftada bir, %35 atlama şansı) ──
    if turn % 8 == 0:
        for fac in factions:
            if random.random() < 0.35:   # her tick her faction karar vermez
                continue
            _faction_ai_decision(fac, state, turn)

    # ── GDD v3 FAZA 5b: Koalisyon ve aggression kontrolü ──
    _check_coalition_trigger(state, turn)

    # ── GDD v3 FAZA 5c: Gizli Cemiyet ifşa riski ──
    for fac in factions:
        if fac.get("type") == "gizli_cemiyet" and not fac.get("ifsa_oldu"):
            # Her 20 turda bir %5 doğal ifşa riski
            if turn % 20 == 0 and random.random() < 0.05:
                _expose_secret_society(fac, state, turn)

    # ── FAZA 5b: Nüfuz operasyonları (her lokasyonda aktif factionlar) ──
    if turn % 3 == 0:   # 3 haftada bir nüfuz operasyonu
        for fac in factions:
            if not fac.get("city_influence"):
                continue
            # Ana ev şehrinde her zaman nüfuz artışı dene
            home = fac.get("home_location_id")
            if home:
                try:
                    faction_infiltrate_city(fac["id"], home, state, turn)
                except Exception:
                    pass
            # Tip bazlı özel aksiyonlar
            ftype = fac.get("type")
            try:
                if ftype == "eskiya_cetesi" and random.random() < 0.20:
                    bandit_raid_caravan(fac, state, turn)
                elif ftype == "dini_tarikat" and home and random.random() < 0.25:
                    religious_sermon(fac, home, state, turn)
                elif ftype == "paralı_asker":
                    active_wars = [w for w in wars if not w.get("ended_turn")]
                    if active_wars and random.random() < 0.15:
                        mercenary_offer_service(fac, random.choice(active_wars), state, turn)
                elif ftype == "gizli_cemiyet" and home and random.random() < 0.10:
                    secret_society_recruit_governor(fac, home, state, turn)
                    # P3a: Her tick'te clue bırak
                    _scatter_gizli_clues(fac, state, turn)
            except Exception:
                pass

    # ── P3b: Faction açılış ticki (her 12 turda) ──
    if turn % 12 == 0:
        _faction_unlock_tick(state, turn)

    # ── GDD v4 Bölüm 6: Üye Kazanma (her 4 turda) ──
    _uye_kazan(state, turn)

    # ── GDD v4 Bölüm 5.4: Kriz Olayları (her 8 turda kontrol) ──
    _check_crisis_events(state, turn)

    # ── FAZA 6: Log temizliği ──
    if len(wars) > 50:
        world["wars"] = [w for w in wars if w.get("ended_turn") is None] + \
                        [w for w in wars if w.get("ended_turn") is not None][-20:]

    # ── FAZA 7: Sahipsiz bölgeleri talep et (FIX-8) ──
    for region in regions:
        if region.get("owner_faction_id") is None and region.get("disputed_by"):
            claimer_id = region["disputed_by"][0]
            claimer = _get_faction(state, claimer_id)
            if claimer and claimer["military_power"] > 20:
                region["owner_faction_id"] = claimer_id
                region["disputed_by"] = []
                if region["id"] not in claimer.get("city_influence", {}) or claimer.get("city_influence", {}).get(region["id"], 0) < 50:
                    claimer.setdefault("city_influence", {})[region["id"]] = min(100, claimer.get("city_influence", {}).get(region["id"], 0) + 50)
                _log_event(state, turn, "bölge_geri_alındı",
                           f"[{claimer['name']}] sahipsiz bölge [{region['name']}]'i geri aldı.",
                           claimer_id)


# ─────────────────────────────────────────────────────────────────────────────
# 8. OYUNCU ETKİSİ API'Sİ
# ─────────────────────────────────────────────────────────────────────────────

def player_create_faction(
    state: dict,
    name: str,
    faction_type: str,
    home_location_id: str,
    turn: int,
) -> dict:
    """
    Oyuncu yeni bir faction kurar.
    Gereksinim: yeterli itibar, para veya askeri güç.
    """
    player = state["player"]
    age = player.get("age", 0)
    reputation = player.get("reputation", 0)
    money = player.get("money", 0)

    # Yaş kısıtlaması
    if age < 13:
        return {"success": False,
                "reason": "Faction kurmak için biraz daha büyümen gerekiyor."}

    # Minimum gereksinim
    if reputation < 20 and money < 500:
        return {"success": False,
                "reason": "Faction kurmak için en az 20 itibar veya 500 altın gerekli."}

    # Ev bölgesi oluştur
    loc = next((l for l in state["world"]["locations"] if l["id"] == home_location_id), None)
    if not loc:
        return {"success": False, "reason": "Geçersiz konum."}

    region = make_region(
        name=f"{name} Bölgesi",
        owner_faction_id="TBD",  # faction id sonra set edilecek
        location_id=home_location_id,
    )

    # Oyuncuyu lider olarak belirle
    player_npc_id = "PLAYER"
    fac = make_faction(
        name=name,
        faction_type=faction_type,
        leader_id=player_npc_id,
        home_region_id=region["id"],
        treasury=int(money * 0.5),  # paranın yarısını faction'a koyar
        military_power=max(10, reputation // 3),
    )

    region["owner_faction_id"] = fac["id"]
    player["money"] = round(money * 0.5, 1)
    player["faction_id"] = fac["id"]
    player["faction_role"] = "lider"
    fac["founded_turn"] = turn

    state["world"].setdefault("factions", []).append(fac)
    state["world"].setdefault("regions", []).append(region)

    _log_event(state, turn, "faction_kuruldu",
               f"Oyuncu {player.get('name', '?')}, [{name}] faction'ını kurdu! "
               f"Tür: {faction_type}. Hazine: {fac['treasury']} altın.",
               fac["id"])

    return {"success": True, "faction": fac, "region": region}


def _membership_weeks_left(player: dict, turn: int) -> int:
    """Oyuncunun faction katılım yasağının kaç hafta kaldığını döndürür.
    0 = yasak yok. -1 = kalıcı yasak."""
    ban_until = player.get("faction_join_banned_until", 0)
    if ban_until == -1:
        return -1   # kalıcı yasak
    if ban_until <= turn:
        return 0
    return ban_until - turn


def _good_standing_discount(player: dict, turn: int) -> bool:
    """Oyuncu 2 yıl (104 hafta) kesintisiz aktif üye kaldıysa True döner."""
    from balance_config import FACTION_MEMBERSHIP
    joined_at = player.get("faction_joined_at_turn", None)
    if joined_at is None:
        return False
    return (turn - joined_at) >= FACTION_MEMBERSHIP["good_standing_weeks"]


def _resolve_penalty(table: list, offense_count: int, discount: bool) -> int:
    """
    Birikim tablosuna göre ceza haftasını döndürür.
    discount=True ise sayaç 1 basamak geri alınır ve süre yarıya düşer.
    -1 = kalıcı yasak.
    """
    from balance_config import FACTION_MEMBERSHIP
    idx = offense_count  # 0-bazlı: kaçıncı ihlal
    if discount and idx > 0:
        idx -= 1
    idx = min(idx, len(table) - 1)
    weeks = table[idx]
    if weeks == FACTION_MEMBERSHIP["permanent_ban_marker"]:
        return -1
    if discount:
        divisor = FACTION_MEMBERSHIP["good_standing_divisor"]
        weeks = max(1, weeks // divisor)
    return weeks


def player_join_faction(state: dict, faction_id: str, turn: int) -> dict:
    """Oyuncu mevcut bir faction'a katılır."""
    from balance_config import FACTION_MEMBERSHIP

    player = state["player"]
    age = player.get("age", 0)

    if age < 13:
        return {"success": False,
                "reason": "Bir factiona katılmak için biraz daha büyümen gerekiyor."}

    fac = _get_faction(state, faction_id)
    if not fac:
        return {"success": False, "reason": "Faction bulunamadı."}

    if player.get("faction_id"):
        return {"success": False, "reason": "Zaten bir faction'a üyesin. Önce ayrılmalısın."}

    # ── Bekleme / yasak kontrolü (sunucu tarafı) ────────────────────────────
    weeks_left = _membership_weeks_left(player, turn)
    if weeks_left != 0:
        membership_status = player.get("faction_membership_status", "left")
        status_labels = FACTION_MEMBERSHIP["statuses"]
        if weeks_left == -1:
            reason = (
                f"Kalıcı olarak yasaklandın. "
                f"Artık hiçbir factiona katılamazsın. ({status_labels.get(membership_status, '')})"
            )
        elif membership_status == "rebel":
            reason = (
                f"İsyan girişimcisi olarak {weeks_left} hafta daha hiçbir factiona "
                f"katılamazsın. ({status_labels['rebel']})"
            )
        elif membership_status == "kicked":
            reason = (
                f"Kovulma cezası nedeniyle {weeks_left} hafta daha factiona "
                f"katılamazsın. ({status_labels['kicked']})"
            )
        else:
            reason = (
                f"Ayrılma sonrası bekleme süresi: {weeks_left} hafta kaldı. "
                f"({status_labels.get(membership_status, 'Ayrıldı')})"
            )
        return {"success": False, "reason": reason, "weeks_left": weeks_left,
                "membership_status": membership_status, "permanent": weeks_left == -1}

    player["faction_id"] = faction_id
    player["faction_role"] = "üye"
    player["faction_loyalty"] = 50
    player["faction_membership_status"] = "active"
    player["faction_joined_at_turn"] = turn   # temiz geçmiş sayacı başlıyor
    player["faction_rank"] = 0               # rütbe indeksi (rank_table'a göre)
    player["faction_contribution"] = 0       # katkı sayacı
    player.pop("faction_join_banned_until", None)
    if "PLAYER" not in fac["members"]:
        fac["members"].append("PLAYER")

    _log_event(state, turn, "oyuncu_faction_katıldı",
               f"Oyuncu [{fac['name']}] faction'ına katıldı.",
               faction_id)

    return {"success": True, "faction": fac}



def player_leave_faction(state: dict, turn: int) -> dict:
    """Oyuncu faction'dan gönüllü olarak ayrılır. Her tekrarda ceza artar."""
    from balance_config import FACTION_MEMBERSHIP

    player = state["player"]
    fac_id = player.get("faction_id")
    if not fac_id:
        return {"success": False, "reason": "Herhangi bir faction'a üye değilsin."}

    fac = _get_faction(state, fac_id)
    if fac:
        if "PLAYER" in fac["members"]:
            fac["members"].remove("PLAYER")
        fac["stability"] = max(0, fac["stability"] - 5)
        if fac["leader_id"] == "PLAYER":
            _trigger_leader_change(fac, state, turn, reason="lider_istifa")

    # Birikim sayacı ve temiz geçmiş indirimi
    leave_count = player.get("faction_leave_count", 0)
    discount = _good_standing_discount(player, turn)
    table = FACTION_MEMBERSHIP["leave_cooldown_table"]
    weeks = _resolve_penalty(table, leave_count, discount)

    player["faction_leave_count"] = leave_count + 1
    player["faction_id"] = None
    player["faction_role"] = None
    player["faction_joined_at_turn"] = None
    player["faction_rank"] = 0
    player["faction_contribution"] = 0
    player["faction_membership_status"] = "left" if weeks != -1 else "banned"
    player["faction_join_banned_until"] = (turn + weeks) if weeks != -1 else -1

    ban_desc = "Kalıcı yasak." if weeks == -1 else f"{weeks} hafta bekleme."
    discount_note = " (Temiz geçmiş indirimi uygulandı.)" if discount else ""

    _log_event(state, turn, "oyuncu_faction_ayrıldı",
               f"Oyuncu [{fac['name'] if fac else '?'}] faction'ından ayrıldı. "
               f"{ban_desc}{discount_note} (Toplam ayrılma: {leave_count + 1})",
               fac_id)

    return {
        "success": True,
        "membership_status": player["faction_membership_status"],
        "cooldown_weeks": weeks,
        "permanent": weeks == -1,
        "discount_applied": discount,
        "leave_count": leave_count + 1,
    }


def player_kick_from_faction(state: dict, target: str, turn: int) -> dict:
    """
    Faction lideri bir oyuncuyu (veya NPC'yi) factiondan kovar.
    target == "PLAYER" → oyuncuyu kovar.
    """
    from balance_config import FACTION_MEMBERSHIP

    player = state["player"]
    fac_id = player.get("faction_id")
    if not fac_id:
        return {"success": False, "reason": "Faction'a üye değilsin."}

    fac = _get_faction(state, fac_id)
    if not fac or fac["leader_id"] != "PLAYER":
        return {"success": False, "reason": "Bu eylemi sadece faction lideri yapabilir."}

    if target == "PLAYER":
        # Lider kendini kovamaz
        return {"success": False, "reason": "Kendini kavamazsın."}

    if target not in fac.get("members", []):
        return {"success": False, "reason": "Bu kişi faction üyesi değil."}

    fac["members"].remove(target)
    fac["stability"] = max(0, fac["stability"] - 3)

    _log_event(state, turn, "üye_kovuldu",
               f"[{target}] faction'dan kovuldu.", fac_id)

    return {"success": True, "kicked": target}


def player_self_kicked(state: dict, turn: int) -> dict:
    """Oyuncu başka bir lider tarafından kovulduğunda çağrılır. Her tekrarda ceza artar."""
    from balance_config import FACTION_MEMBERSHIP

    player = state["player"]
    fac_id = player.get("faction_id")
    fac = _get_faction(state, fac_id) if fac_id else None

    if fac and "PLAYER" in fac.get("members", []):
        fac["members"].remove("PLAYER")
        fac["stability"] = max(0, fac["stability"] - 3)

    kick_count = player.get("faction_kicked_count", 0)
    discount = _good_standing_discount(player, turn)
    table = FACTION_MEMBERSHIP["kicked_cooldown_table"]
    weeks = _resolve_penalty(table, kick_count, discount)

    player["faction_kicked_count"] = kick_count + 1
    player["faction_id"] = None
    player["faction_role"] = None
    player["faction_joined_at_turn"] = None
    player["faction_rank"] = 0
    player["faction_contribution"] = 0
    player["faction_membership_status"] = "kicked" if weeks != -1 else "banned"
    player["faction_join_banned_until"] = (turn + weeks) if weeks != -1 else -1

    ban_desc = "Kalıcı yasak." if weeks == -1 else f"{weeks} hafta bekleme."
    discount_note = " (Temiz geçmiş indirimi uygulandı.)" if discount else ""

    _log_event(state, turn, "oyuncu_kovuldu",
               f"Oyuncu [{fac['name'] if fac else '?'}] faction'ından kovuldu. "
               f"{ban_desc}{discount_note} (Toplam kovulma: {kick_count + 1})",
               fac_id)

    return {
        "success": True,
        "membership_status": player["faction_membership_status"],
        "cooldown_weeks": weeks,
        "permanent": weeks == -1,
        "discount_applied": discount,
        "kick_count": kick_count + 1,
    }


def player_start_rebellion(state: dict, turn: int) -> dict:
    """Oyuncu isyan başlatır — mevcut faction'ına karşı. Her tekrarda ceza artar."""
    from balance_config import FACTION_MEMBERSHIP

    player = state["player"]
    age = player.get("age", 0)

    if age < 18:
        return {"success": False,
                "reason": "İsyan başlatmak için yetişkin olmalısın."}

    fac_id = player.get("faction_id")
    if not fac_id:
        return {"success": False, "reason": "İsyan için bir faction'a üye olmalısın."}

    fac = _get_faction(state, fac_id)
    if not fac or fac["leader_id"] == "PLAYER":
        return {"success": False, "reason": "Kendi faction'ına isyan edemezsin."}

    rebel_power = player.get("reputation", 0) + player.get("fear", 0)
    fac["stability"] = max(0, fac["stability"] - rebel_power // 3)
    fac["rebel_risk"] = min(100, fac["rebel_risk"] + rebel_power // 2)
    player["faction_loyalty"] = 0

    if "PLAYER" in fac.get("members", []):
        fac["members"].remove("PLAYER")

    rebel_count = player.get("faction_rebel_count", 0)
    discount = _good_standing_discount(player, turn)
    table = FACTION_MEMBERSHIP["rebel_ban_table"]
    weeks = _resolve_penalty(table, rebel_count, discount)

    player["faction_rebel_count"] = rebel_count + 1
    player["faction_id"] = None
    player["faction_role"] = None
    player["faction_joined_at_turn"] = None
    player["faction_rank"] = 0
    player["faction_contribution"] = 0
    player["faction_membership_status"] = "rebel" if weeks != -1 else "banned"
    player["faction_join_banned_until"] = (turn + weeks) if weeks != -1 else -1

    ban_desc = "Kalıcı yasak uygulandı." if weeks == -1 else f"{weeks} hafta boyunca hiçbir faction seni kabul etmez."
    discount_note = " (Temiz geçmiş indirimi uygulandı.)" if discount else ""

    _log_event(state, turn, "oyuncu_isyan",
               f"Oyuncu [{fac['name']}]'a karşı isyan bayrağı kaldırdı! "
               f"Stabilite -{rebel_power // 3}, isyan riski artıyor. "
               f"{ban_desc}{discount_note} (Toplam isyan: {rebel_count + 1})",
               fac_id)

    return {
        "success": True,
        "rebel_power": rebel_power,
        "faction_stability": fac["stability"],
        "membership_status": player["faction_membership_status"],
        "ban_weeks": weeks,
        "permanent": weeks == -1,
        "discount_applied": discount,
        "rebel_count": rebel_count + 1,
        "message": (
            f"İsyan başladı! Gücün: {rebel_power}. "
            f"[{fac['name']}] bu darbeyi hazmetmekte zorlanıyor. "
            + ("Artık kalıcı olarak yasaklandın." if weeks == -1
               else f"İsyancı damgası: {weeks} hafta.")
        ),
    }


def player_conquer_region(state: dict, region_id: str, turn: int) -> dict:
    """Oyuncu bir bölgeyi ele geçirir (faction lideri ise)."""
    player = state["player"]
    age = player.get("age", 0)

    if age < 13:
        return {"success": False, "reason": "Bölge fethetmek için çok küçüksün."}

    fac_id = player.get("faction_id")
    if not fac_id:
        return {"success": False, "reason": "Bir faction'ın lideri olmalısın."}

    fac = _get_faction(state, fac_id)
    if not fac or fac["leader_id"] != "PLAYER":
        return {"success": False, "reason": "Bu eylemi sadece faction liderleri yapabilir."}

    region = _get_region(state, region_id)
    if not region:
        return {"success": False, "reason": "Bölge bulunamadı."}

    if region["owner_faction_id"] == fac_id:
        return {"success": False, "reason": "Bu bölge zaten senin kontrolünde."}

    # Askeri güç karşılaştırması
    defender_fac = _get_faction(state, region.get("owner_faction_id"))
    attack_power = fac["military_power"] + player.get("stats", {}).get("strength", 1) * 5
    defend_power = (region["garrison_size"] * 2 +
                    (defender_fac["military_power"] if defender_fac else 10))

    if attack_power > defend_power * _noise():
        old_owner = defender_fac["name"] if defender_fac else "sahipsiz"
        if defender_fac and defender_fac.get("city_influence", {}).get(region["id"], 0) >= 50:
            defender_fac.setdefault("city_influence", {})[region["id"]] = max(0, defender_fac["city_influence"][region["id"]] - 50)
            defender_fac["military_power"] = max(0, defender_fac["military_power"] - 10)
            defender_fac["reputation"] = max(0, defender_fac["reputation"] - 8)

        region["owner_faction_id"] = fac_id
        if region["id"] not in fac.get("city_influence", {}) or fac.get("city_influence", {}).get(region["id"], 0) < 50:
            fac.setdefault("city_influence", {})[region["id"]] = min(100, fac.get("city_influence", {}).get(region["id"], 0) + 50)

        region["economy"] = max(0, region["economy"] - 15)
        region["security"] = max(0, region["security"] - 20)
        fac["military_power"] = max(0, fac["military_power"] - random.randint(3, 10))

        _log_event(state, turn, "bölge_fethedildi",
                   f"Oyuncu [{region['name']}]'ı fethetti! "
                   f"({old_owner}'dan alındı) "
                   f"Saldırı: {attack_power:.0f} > Savunma: {defend_power:.0f}.",
                   fac_id)

        return {
            "success": True,
            "region": region,
            "attack_power": round(attack_power),
            "defend_power": round(defend_power),
            "message": f"[{region['name']}] fethedildi!",
        }
    else:
        fac["military_power"] = max(0, fac["military_power"] - random.randint(5, 15))
        _log_event(state, turn, "fetih_başarısız",
                   f"Oyuncu [{region['name']}]'ı fethetmeye çalıştı ama başarısız oldu. "
                   f"Saldırı: {attack_power:.0f} < Savunma: {defend_power:.0f}.",
                   fac_id)
        return {
            "success": False,
            "reason": f"Askeri gücün yetersiz. Saldırı: {attack_power:.0f} < Savunma: {defend_power:.0f}",
        }


def player_manipulate_npc(state: dict, npc_id: str, method: str, turn: int) -> dict:
    """
    Oyuncu bir NPC'yi manipüle eder: rüşvet, tehdit, ikna.
    Her yöntemin farklı sebep-sonucu var.
    """
    player = state["player"]
    age = player.get("age", 0)

    if age < 13:
        return {"success": False, "reason": "NPC manipülasyonu için çok küçüksün."}

    npc = _get_npc(state, npc_id)
    if not npc or not npc.get("alive", True):
        return {"success": False, "reason": "NPC bulunamadı veya hayatta değil."}

    # ── Cooldown kontrolü ─────────────────────────────────────────────────
    # Yöntem başına minimum bekleme süresi (hafta)
    COOLDOWNS = {"rüşvet": 4, "tehdit": 6, "ikna": 3}
    min_weeks = COOLDOWNS.get(method, 4)
    cooldowns = player.setdefault("manipulate_cooldowns", {})
    cd_key = f"{method}_{npc_id}"
    last_turn = cooldowns.get(cd_key, 0)
    weeks_since = (turn - last_turn) if last_turn else 999

    if weeks_since < min_weeks:
        weeks_left = min_weeks - weeks_since
        npc_name = npc.get("name", npc_id)
        method_labels = {"rüşvet": "Rüşvet", "tehdit": "Tehdit", "ikna": "İkna"}
        label = method_labels.get(method, method.capitalize())
        return {
            "success": False,
            "cooldown_weeks_left": weeks_left,
            "reason": (
                f"{label} cooldown aktif: {npc_name} için {weeks_left} hafta daha beklemelisin. "
                f"(Her {min_weeks} haftada bir kullanılabilir.)"
            ),
        }
    # ─────────────────────────────────────────────────────────────────────

    fac_id = npc.get("faction_id")
    fac = _get_faction(state, fac_id) if fac_id else None
    results = []

    if method == "rüşvet":
        bribe = int(player.get("money", 0) * 0.20)
        if bribe < 50:
            return {"success": False, "reason": "Rüşvet için yeterli altın yok (min 50)."}
        if npc.get("greed", 50) > 40:
            player["money"] = round(player["money"] - bribe, 1)
            npc["faction_loyalty"] = max(0, npc.get("faction_loyalty", 50) - 20)
            if fac:
                fac["stability"] = max(0, fac["stability"] - 3)
            cooldowns[cd_key] = turn  # cooldown kaydet
            results.append(f"{npc['name']} rüşveti kabul etti (-{bribe} altın). "
                          f"Sadakati sarsıldı.")
            return {"success": True, "results": results}
        else:
            return {"success": False, "reason": f"{npc['name']} rüşvet teklifini reddetti."}

    elif method == "tehdit":
        fear_power = player.get("fear", 0) + player.get("stats", {}).get("strength", 1) * 3
        if fear_power > 30:
            npc["faction_loyalty"] = max(0, npc.get("faction_loyalty", 50) - 15)
            npc["faction_role"] = "korkutulan"
            if fac:
                fac["fear_level"] = min(100, fac.get("fear_level", 0) + 5)
            cooldowns[cd_key] = turn  # cooldown kaydet
            results.append(f"{npc['name']} tehdit karşısında geri adım attı. "
                          f"(Korku gücün: {fear_power})")
            return {"success": True, "results": results}
        else:
            return {"success": False,
                    "reason": f"Tehdit etmek için yeterli korku gücün yok ({fear_power}/30)."}

    elif method == "ikna":
        social = player.get("skills", {}).get("social", 0)
        charisma = player.get("stats", {}).get("charisma", 1)
        persuade_power = social * 5 + charisma * 10 + player.get("reputation", 0) // 2
        if persuade_power > 25:
            npc["faction_loyalty"] = max(0, npc.get("faction_loyalty", 50) - 10)
            if fac:
                fac["stability"] = max(0, fac["stability"] - 2)
                fac["reputation"] = max(0, fac["reputation"] - 2)
            cooldowns[cd_key] = turn  # cooldown kaydet
            results.append(f"{npc['name']} ikna oldu. "
                          f"(Karizman: {charisma}, Sosyal becerin: {social})")
            return {"success": True, "results": results}
        else:
            return {"success": False,
                    "reason": f"İkna için yeterli karizman/sosyal becerin yok ({persuade_power}/25)."}

    return {"success": False, "reason": "Geçersiz manipülasyon yöntemi."}


# ─────────────────────────────────────────────────────────────────────────────
# 9. DÜNYA OLUŞTURMA — generate_world() UZANTISI
# ─────────────────────────────────────────────────────────────────────────────

def init_factions_for_world(state: dict, turn: int = 0):
    """
    İki katmanlı faction spawn sistemi.

    KATMAN 1 — GLOBAL (dünya genelinde sabit sayıda, çok lokasyona yayılır):
      tuccar_loncasi    × 2  (rakip ticaret lonca — şehirleri ikiye böler)
      zanaatkar_loncasi × 1
      dini_tarikat      × 2  (rakip tarikat)
      krallık_ordusu    × 1
      gizli_cemiyet     × 1
      ilim_cemiyeti     × 1
      oyuncu_kumpanya   × 1

    KATMAN 2 — LOKAL (lokasyon tipine göre, per-location):
      paralı_asker   → her kale
      sifaci_birligi → her köy/kasaba
      eskiya_cetesi  → köylerin %30'u
    """
    world = state["world"]
    world.setdefault("factions", [])
    world.setdefault("regions", [])
    world.setdefault("wars", [])

    if world["factions"]:
        return

    locations = world.get("locations", [])
    all_npcs  = world.get("npcs", [])
    cities    = [l for l in locations if l.get("kind") == "şehir"]
    castles   = [l for l in locations if l.get("kind") == "kale"]
    villages  = [l for l in locations if l.get("kind") not in ("şehir", "kale")]

    # ── Yardımcılar ───────────────────────────────────────────────────────
    LEADER_PROFS = {
        "krallık_ordusu":   ("general", "asker", "şövalye"),
        "tuccar_loncasi":   ("tüccar",),
        "zanaatkar_loncasi":("demirci", "kunduracı", "fırıncı", "köylü"),
        "paralı_asker":     ("asker", "şövalye"),
        "ilim_cemiyeti":    ("öğretmen", "katip"),
        "sifaci_birligi":   ("şaman", "hekim", "şifacı"),
        "dini_tarikat":     ("rahip", "keşiş"),
        "oyuncu_kumpanya":  ("gezgin", "bard"),
        "eskiya_cetesi":    ("haydut", "avcı"),
        "gizli_cemiyet":    ("tüccar", "katip", "avcı"),
    }

    def find_leader(loc_id, ftype):
        profs = LEADER_PROFS.get(ftype, ("köylü",))
        return (
            next((n for n in all_npcs
                  if n.get("alive") and n.get("location_id") == loc_id
                  and n.get("profession") in profs), None)
            or next((n for n in all_npcs
                     if n.get("alive") and n.get("location_id") == loc_id), None)
        )

    def spawn_faction(ftype, name, home_loc, treasury_range=(200, 2000), mil_range=None):
        if mil_range is None:
            mil_range = (5, 30) if ftype in ("krallık_ordusu", "paralı_asker", "eskiya_cetesi") else (2, 15)
        leader = find_leader(home_loc["id"], ftype)
        if not leader:
            return None
        fac = make_faction(
            name=name,
            faction_type=ftype,
            leader_id=leader["id"],
            home_location_id=home_loc["id"],
            treasury=random.randint(*treasury_range),
            military_power=random.randint(*mil_range),
        )
        fac["city_influence"][home_loc["id"]] = 0  # aşağıda set edilecek
        leader["faction_id"] = fac["id"]
        world["factions"].append(fac)
        return fac

    def set_influence(fac, locs, lo, hi):
        for loc in locs:
            fac["city_influence"][loc["id"]] = random.randint(lo, hi)

    # ════════════════════════════════════════════════════════════════════════
    # KATMAN 1: GLOBAL FACTIONLAR
    # ════════════════════════════════════════════════════════════════════════

    # ── Tüccar Loncası × 2 — şehirleri ikiye böl, köylere de uzanır ─────
    if cities:
        half = max(1, len(cities) // 2)
        city_halves = [cities[:half], cities[half:] or cities[:1]]
        lonca_names = ["Büyük Kervan Loncası", "Deniz Yolu Loncası"]
        for i, (group, lname) in enumerate(zip(city_halves, lonca_names)):
            fac = spawn_faction("tuccar_loncasi", lname, group[0])
            if not fac:
                continue
            set_influence(fac, group,                30, 55)   # kendi şehirleri
            set_influence(fac, city_halves[1 - i],   8, 22)   # rakibin şehirleri
            rival_villages = random.sample(villages, min(len(villages), max(2, len(villages) // 2)))
            set_influence(fac, rival_villages,        5, 18)   # köyler

    # ── Zanaatkar Loncası × 1 ────────────────────────────────────────────
    if cities:
        fac = spawn_faction("zanaatkar_loncasi", "Zanaatkarlar Birliği", cities[0])
        if fac:
            set_influence(fac, cities,   15, 40)
            set_influence(fac, castles,   5, 20)

    # ── Dini Tarikat × 2 — tüm lokasyonlara düşük-orta nüfuz ────────────
    tarikat_names = ["Işık Tarikatı", "Gölge Tarikatı"]
    for i, tname in enumerate(tarikat_names):
        home_pool = (cities[i:] + cities[:i]) if len(cities) > i else cities
        if not home_pool:
            continue
        fac = spawn_faction("dini_tarikat", tname, home_pool[0])
        if fac:
            set_influence(fac, locations, 5, 25)

    # ── Krallık Ordusu × 1 ──────────────────────────────────────────────
    army_home = (castles + cities) or locations
    if army_home:
        fac = spawn_faction("krallık_ordusu", "Krallık Ordusu", army_home[0],
                            treasury_range=(500, 3000), mil_range=(30, 70))
        if fac:
            set_influence(fac, castles, 45, 75)
            set_influence(fac, cities,  15, 35)

    # ── Gizli Cemiyet × 1 — sadece şehirlerde, düşük nüfuz ─────────────
    if cities:
        fac = spawn_faction("gizli_cemiyet", "Gölge Çemberi", cities[0])
        if fac:
            set_influence(fac, cities, 3, 15)

    # ── İlim Cemiyeti × 1 (eskiden hiç spawn olmuyordu) ─────────────────
    if cities:
        fac = spawn_faction("ilim_cemiyeti", "İlim Cemiyeti", cities[0])
        if fac:
            set_influence(fac, cities, 10, 30)

    # ── Seyyah Kumpanya × 1 (eskiden hiç spawn olmuyordu) ───────────────
    kumpanya_home = cities[-1] if cities else (villages[0] if villages else None)
    if kumpanya_home:
        fac = spawn_faction("oyuncu_kumpanya", "Seyyah Kumpanya", kumpanya_home)
        if fac:
            set_influence(fac, cities,   5, 20)
            set_influence(fac, villages, 3, 12)

    # ════════════════════════════════════════════════════════════════════════
    # KATMAN 2: LOKAL FACTIONLAR
    # ════════════════════════════════════════════════════════════════════════

    # ── Paralı Asker — her kale ──────────────────────────────────────────
    for loc in castles:
        fac = spawn_faction("paralı_asker", f"{loc['name']} Paralı Askerleri", loc,
                            treasury_range=(300, 1500), mil_range=(20, 50))
        if fac:
            fac["city_influence"][loc["id"]] = random.randint(20, 45)

    # ── Şifacı Birliği — her köy/kasaba ─────────────────────────────────
    for loc in villages:
        fac = spawn_faction("sifaci_birligi", f"{loc['name']} Şifacıları", loc)
        if fac:
            fac["city_influence"][loc["id"]] = random.randint(5, 20)

    # ── Eşkıya Çetesi — köylerin %30'u ──────────────────────────────────
    for loc in villages:
        if random.random() < 0.30:
            fac = spawn_faction("eskiya_cetesi", f"{loc['name']} Eşkıyaları", loc,
                                treasury_range=(50, 400), mil_range=(5, 25))
            if fac:
                fac["city_influence"][loc["id"]] = random.randint(5, 25)

    # ════════════════════════════════════════════════════════════════════════
    # NPC FACTION FIELDS + BAŞLANGIÇ DİPLOMASİ
    # ════════════════════════════════════════════════════════════════════════
    for npc in all_npcs:
        _ensure_npc_faction_fields(npc)

    rival_pairs = {
        frozenset(["tuccar_loncasi",  "eskiya_cetesi"]),
        frozenset(["krallık_ordusu",  "eskiya_cetesi"]),
        frozenset(["dini_tarikat",    "gizli_cemiyet"]),
        frozenset(["tuccar_loncasi",  "zanaatkar_loncasi"]),
    }
    ally_pairs = {
        frozenset(["krallık_ordusu",  "paralı_asker"]),
        frozenset(["dini_tarikat",    "sifaci_birligi"]),
        frozenset(["ilim_cemiyeti",   "gizli_cemiyet"]),
        frozenset(["tuccar_loncasi",  "ilim_cemiyeti"]),
    }

    factions = world["factions"]
    for i, fa in enumerate(factions):
        for fb in factions[i+1:]:
            pair = frozenset([fa["type"], fb["type"]])
            # İki tuccar loncası her zaman rakip
            if fa["type"] == "tuccar_loncasi" and fb["type"] == "tuccar_loncasi":
                rel = "düşman"
            # İki dini tarikat her zaman rakip
            elif fa["type"] == "dini_tarikat" and fb["type"] == "dini_tarikat":
                rel = "düşman"
            elif pair in rival_pairs:
                rel = "düşman"
            elif pair in ally_pairs:
                rel = "müttefik"
            else:
                rel = random.choice(["tarafsız", "tarafsız", "tarafsız", "müttefik", "düşman"])
            fa["diplomacy"][fb["id"]] = rel
            fb["diplomacy"][fa["id"]] = rel

    _log_event(state, 0, "init",
               f"{len(world['factions'])} faction oluşturuldu "
               f"(global: {sum(1 for f in factions if f['type'] in ('tuccar_loncasi','zanaatkar_loncasi','dini_tarikat','krallık_ordusu','gizli_cemiyet','ilim_cemiyeti','oyuncu_kumpanya'))}, "
               f"lokal: {sum(1 for f in factions if f['type'] in ('paralı_asker','sifaci_birligi','eskiya_cetesi'))}).")


def _infer_resources(loc: dict) -> list:
    """Konumun türüne göre kaynak tahmini."""
    kind = loc.get("kind", "köy")
    if kind == "şehir":
        return random.sample(["ticaret_yolu", "tarım", "maden"], k=2)
    elif kind == "kale":
        return ["kale"] + random.sample(["maden", "tarım"], k=1)
    else:
        return random.sample(REGION_RESOURCES, k=random.randint(1, 2))


# ─────────────────────────────────────────────────────────────────────────────
# 10. DURUM SORGULAMA (Frontend/API için)
# ─────────────────────────────────────────────────────────────────────────────


def _contribution_goal(faction_type: str, current_rank: int) -> int:
    """Bir sonraki rütbeye geçiş için gereken contribution hedefini döner."""
    from balance_config import FACTION_RANK_REQUIREMENTS
    reqs = FACTION_RANK_REQUIREMENTS.get(faction_type, [])
    next_idx = current_rank  # current_rank = 0 iken reqs[0] = 1. rütbeye geçiş koşulu
    if next_idx < len(reqs):
        return reqs[next_idx].get("contribution", 10)
    return 0  # max rütbede, hedef yok


def _compute_influence_trend(fac: dict) -> str:
    """Son 4 snapshot'a bakarak trend döner: 'yukari' | 'asagi' | 'sabit'"""
    hist = fac.get("influence_history", [])
    if len(hist) < 2:
        return "sabit"
    delta = hist[-1]["total"] - hist[0]["total"]
    if delta >= 8:
        return "yukari"
    if delta <= -8:
        return "asagi"
    return "sabit"


def _compute_influence_delta(fac: dict) -> int:
    """Son 4 haftadaki toplam nüfuz değişimi (sayısal)."""
    hist = fac.get("influence_history", [])
    if len(hist) < 2:
        return 0
    return hist[-1]["total"] - hist[0]["total"]


# ─────────────────────────────────────────────────────────────────────────────
# P3a: GİZLİ CEMİYET DEDEKTİF MEKANİĞİ
# ─────────────────────────────────────────────────────────────────────────────

_CLUE_TEXTS = [
    "Mektupları arasında tanımadığın bir mühür dikkatini çekti.",
    "Bir fısıltı: 'Onlar her yerde...'",
    "Lonca kayıtlarında silinmiş bir ad gördün.",
    "Biri seni takip etti; döndüğünde kaybolmuştu.",
    "Bir NPC konuşmanın ortasında sustu ve bakışlarını kaçırdı.",
    "Gece yarısı fener ışığında toplantı yapan figürler fark ettin.",
    "Bir duvar yazısı: 'Uyuyanlar bilmez.'",
]


def _scatter_gizli_clues(fac: dict, state: dict, turn: int):
    """Gizli cemiyet ticki sırasında lokasyonlara ipucu bırakır."""
    home = fac.get("home_location_id")
    if not home:
        return
    clue_pool = state.setdefault("gizli_clue_pool", {})  # {faction_id: [clue_texts]}
    fac_clues = clue_pool.setdefault(fac["id"], [])
    text = random.choice(_CLUE_TEXTS)
    entry = {"turn": turn, "location_id": home, "faction_id": fac["id"],
             "text": text, "found": False}
    fac_clues.append(entry)
    if len(fac_clues) > 20:
        clue_pool[fac["id"]] = fac_clues[-20:]


def player_investigate_location(state: dict, location_id: str, turn: int) -> dict:
    """
    Oyuncu bir lokasyonda soruşturma yapar.
    Şans (+ İstihbarat stat'ı) ile gizli cemiyet ipucu bulabilir.
    """
    player = state["player"]
    player_loc = player.get("location_id")
    if player_loc != location_id:
        return {"success": False, "reason": "Bu lokasyonda değilsin."}

    # İstihbarat/Bilgelik stat'ına göre başarı şansı
    intel = player.get("stats", {}).get("zeka", 5) + player.get("stats", {}).get("bilgelik", 5)
    base_chance = 0.25 + (intel / 100)

    clue_pool = state.get("gizli_clue_pool", {})
    # Bu lokasyondaki bulunmamış ipuçlarını topla
    available = []
    for fac_id, clues in clue_pool.items():
        for clue in clues:
            if clue["location_id"] == location_id and not clue["found"]:
                available.append((fac_id, clue))

    if not available:
        return {"success": False, "reason": "Bu lokasyonda şüpheli bir şey bulamadın."}

    if random.random() > base_chance:
        return {"success": False, "reason": "Dikkatli bir inceleme yaptın ama ipucu bulamadın."}

    fac_id, clue = random.choice(available)
    clue["found"] = True

    # Oyuncunun ipucu sayacını artır
    player_clues = player.setdefault("gizli_cemiyet_clues", {})
    player_clues[fac_id] = player_clues.get(fac_id, 0) + 1

    can_reveal = player_clues[fac_id] >= _CLUE_THRESHOLD
    return {
        "success":    True,
        "clue_text":  clue["text"],
        "faction_id": fac_id,
        "clue_count": player_clues[fac_id],
        "can_reveal": can_reveal,
    }


def player_reveal_secret_society(state: dict, faction_id: str, turn: int) -> dict:
    """
    Oyuncu yeterli ipucu topladıktan sonra gizli cemiyeti ifşa eder.
    """
    player  = state["player"]
    fac     = _get_faction(state, faction_id)
    if not fac:
        return {"success": False, "reason": "Örgüt bulunamadı."}
    if fac.get("type") != "gizli_cemiyet":
        return {"success": False, "reason": "Bu bir gizli cemiyet değil."}

    clues = player.get("gizli_cemiyet_clues", {}).get(faction_id, 0)
    if clues < _CLUE_THRESHOLD:
        return {"success": False, "reason": f"Yeterli ipucun yok ({clues}/{_CLUE_THRESHOLD})."}

    # İfşa et
    fac["revealed"]   = True
    fac["is_secret"]  = False
    fac["stability"]  = max(0, fac.get("stability", 50) - 20)
    fac["fear_level"] = max(0, fac.get("fear_level", 10) - 10)
    player["reputation"] = player.get("reputation", 0) + 20
    # Clue sayacını sıfırla
    player.setdefault("gizli_cemiyet_clues", {})[faction_id] = 0

    _log_event(state, turn, "gizli_ifşa",
               f"Oyuncu [{fac['name']}] adlı gizli cemiyeti ifşa etti! Örgüt sarsıldı.",
               faction_id)

    return {"success": True, "message": f"{fac['name']} herkes tarafından bilinen bir örgüt haline geldi.",
            "reputation_gained": 20, "faction_name": fac["name"]}


def get_player_clue_status(state: dict) -> list:
    """Oyuncunun her gizli cemiyet için topladığı ipuçlarını döner."""
    player = state["player"]
    clues  = player.get("gizli_cemiyet_clues", {})
    result = []
    for fac in state["world"].get("factions", []):
        if fac.get("type") != "gizli_cemiyet":
            continue
        count = clues.get(fac["id"], 0)
        result.append({
            "faction_id":  fac["id"],
            "clue_count":  count,
            "threshold":   _CLUE_THRESHOLD,
            "can_reveal":  count >= _CLUE_THRESHOLD and not fac.get("revealed"),
            "revealed":    fac.get("revealed", False),
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# P3b: FAKSİYON AÇILIŞ TİCKİ
# ─────────────────────────────────────────────────────────────────────────────

_UNLOCK_ORDER = [
    "paralı_asker", "dini_tarikat", "ilim_cemiyeti",
    "zanaatkar_loncasi", "sifaci_birligi", "oyuncu_kumpanya", "gizli_cemiyet",
]


def _faction_unlock_tick(state: dict, turn: int):
    """
    Her 12 turda bir sıradaki uykudaki faction'ı aktif hale getirir.
    Koşul: oyuncunun turn sayısı + reputation yeterince yüksek.
    """
    factions = state["world"].get("factions", [])
    dormant  = [f for f in factions if not f.get("active") and not f.get("revealed")]
    if not dormant:
        return

    player = state["player"]
    reputation = player.get("reputation", 0)
    # Her 12 turda bir yeni faction — oyuncu için kademeli keşif hissi
    unlock_count = turn // 12
    currently_active = sum(1 for f in factions if f.get("active"))

    # Her zaman aktif (3) + unlock sayısı kadar faction aktif olsun
    target_active = len(_ALWAYS_ACTIVE_TYPES) + unlock_count
    if currently_active >= target_active:
        return

    # Reputation kapısı: 0'da bile açılır ama daha hızlı
    if reputation < -20:
        return

    # Önce _UNLOCK_ORDER'a göre sırayla aç, yoksa rastgele
    to_unlock = None
    for utype in _UNLOCK_ORDER:
        candidate = next((f for f in dormant if f.get("type") == utype), None)
        if candidate:
            to_unlock = candidate
            break
    if not to_unlock:
        to_unlock = random.choice(dormant)

    to_unlock["active"] = True
    _log_event(state, turn, "faction_aktif",
               f"[{to_unlock['name']}] bölgede faaliyete başladı.", to_unlock["id"])


def _uye_kazan(state: dict, turn: int):
    """
    GDD v4 Bölüm 6 — Üye Kazanma.
    Her 4 turda bir aktif factionlar çevreden üye devşirebilir.
    Askeri güç yavaşça artar; uye_sayisi takip edilir.
    """
    if turn % 4 != 0:
        return
    world = state["world"]
    factions = world.get("factions", [])
    regions = world.get("regions", [])

    for fac in factions:
        if not fac.get("active"):
            continue
        # Zayıf ya da çökmüş factionlar üye kazanamaz
        if fac.get("military_power", 0) <= 0:
            continue

        economy = fac.get("economy_level", 50)
        rep = fac.get("reputation", 30)
        # Temel üye kazanma oranı: ekonomi + iterütibar bazlı
        base_chance = 0.30 + (economy / 200.0) + (rep / 300.0)
        # Koalisyon içindeyse düşür
        if fac.get("altinda_koalisyon"):
            base_chance *= 0.7

        if random.random() < base_chance:
            # Kazanılan üye sayısı: 1-3
            yeni_uye = random.randint(1, 3)
            fac["uye_sayisi"] = fac.get("uye_sayisi", 1) + yeni_uye
            # Her 5 üyede 1 askeri güç bonusu
            militer_bonus = yeni_uye // 5
            if militer_bonus > 0:
                fac["military_power"] = min(200, fac.get("military_power", 10) + militer_bonus)
            fac["son_uye_kazan_tur"] = turn
            _log_event(state, turn, "uye_kazanildi",
                       f"[{fac['name']}] {yeni_uye} yeni üye devşirdi. (Toplam: {fac['uye_sayisi']})",
                       fac["id"])


def _check_crisis_events(state: dict, turn: int):
    """
    GDD v4 Bölüm 5.4 — Kriz Olayları.
    Her 8 turda bir rastgele bölgeleri vuran felaketler.
      kuraklık  → %2 şans → ekonomi düşer, vergi geliri azalır
      veba      → %1 şans → nüfus ciddi düşer
      büyük yangın → %1.5 şans → yapılar zarar görür, ekonomi düşer
    """
    if turn % 8 != 0:
        return

    regions = state["world"].get("regions", [])
    if not regions:
        return

    for region in regions:
        r = random.random()

        # ── Kuraklık: %2 şans ──
        if r < 0.02:
            ekonomi_kayip = random.randint(8, 18)
            region["economy"] = max(0, region["economy"] - ekonomi_kayip)
            region["tax_income"] = max(0, region.get("tax_income", 0) - random.randint(50, 150))
            owner_fac = _get_faction(state, region.get("owner_faction_id"))
            _log_event(state, turn, "kriz_kuraklik",
                       f"[{region['name']}] bölgesini kuraklık vurdu! "
                       f"Ekonomi -{ekonomi_kayip}. Hasat büyük zarar gördü.",
                       owner_fac["id"] if owner_fac else None)

        # ── Veba: %1 şans ──
        elif r < 0.03:
            yerlesim = region.get("yerlesim", {})
            if yerlesim:
                nufus = yerlesim.get("nufus", 500)
                kayip = random.randint(int(nufus * 0.10), int(nufus * 0.25))
                yerlesim["nufus"] = max(50, nufus - kayip)
                region["economy"] = max(0, region["economy"] - random.randint(5, 12))
                region["security"] = max(0, region["security"] - random.randint(5, 15))
            owner_fac = _get_faction(state, region.get("owner_faction_id"))
            _log_event(state, turn, "kriz_veba",
                       f"[{region['name']}] bölgesinde veba salgını! "
                       f"Nüfus ciddi azaldı. Ekonomi ve güvenlik sarsıldı.",
                       owner_fac["id"] if owner_fac else None)

        # ── Büyük Yangın: %1.5 şans ──
        elif r < 0.045:
            ekonomi_kayip = random.randint(10, 20)
            region["economy"] = max(0, region["economy"] - ekonomi_kayip)
            region["security"] = max(0, region["security"] - random.randint(3, 10))
            yerlesim = region.get("yerlesim", {})
            if yerlesim and yerlesim.get("altyapi", 0) > 0:
                yerlesim["altyapi"] = max(0, yerlesim["altyapi"] - random.randint(1, 3))
            owner_fac = _get_faction(state, region.get("owner_faction_id"))
            _log_event(state, turn, "kriz_yangin",
                       f"[{region['name']}] bölgesinde büyük yangın! "
                       f"Yapılar zarar gördü. Ekonomi -{ekonomi_kayip}.",
                       owner_fac["id"] if owner_fac else None)


def player_rank_up(state: dict, turn: int) -> dict:
    """Oyuncu rütbe atlar. Koşullar: min_weeks + contribution."""
    from balance_config import FACTION_RANK_REQUIREMENTS

    player = state["player"]
    fac_id = player.get("faction_id")
    if not fac_id:
        return {"success": False, "reason": "Herhangi bir faction'a üye değilsin."}

    fac = _get_faction(state, fac_id)
    if not fac:
        return {"success": False, "reason": "Faction bulunamadı."}

    rank = player.get("faction_rank", 0)
    rank_table = fac.get("rank_table", [])

    if rank >= len(rank_table) - 1:
        return {"success": False, "reason": "Zaten en yüksek rütbedesin."}

    reqs = FACTION_RANK_REQUIREMENTS.get(fac["type"], [])
    if rank >= len(reqs):
        return {"success": False,
                "reason": "Bu rütbe için gereksinim tanımlanmamış."}

    req = reqs[rank]
    weeks_in = turn - player.get("faction_joined_at_turn", turn)
    contribution = player.get("faction_contribution", 0)

    if weeks_in < req["min_weeks"]:
        left = req["min_weeks"] - weeks_in
        return {"success": False,
                "reason": f"Yeterli süre geçmedi. {left} hafta daha bekle."}

    if contribution < req["contribution"]:
        left = req["contribution"] - contribution
        return {"success": False,
                "reason": f"Yeterli katkın yok. {left} katkı daha kazan."}

    player["faction_rank"] = rank + 1
    new_title = rank_table[rank + 1]

    # Rütbe atlama itibar bonusu
    player["reputation"] = player.get("reputation", 0) + 5

    _log_event(state, turn, "oyuncu_rutbe_atladi",
               f"Oyuncu [{fac['name']}] içinde [{new_title}] rütbesine yükseldi. (+5 itibar)",
               fac_id)

    return {
        "success": True,
        "new_rank": rank + 1,
        "new_title": new_title,
        "faction_name": fac["name"],
        "reputation_gained": 5,
    }


def player_donate_to_faction(state: dict, amount: int, turn: int) -> dict:
    """Oyuncu faction hazinesine bağış yapar. Altın düşer, contribution artar."""
    player = state["player"]
    fac_id = player.get("faction_id")
    if not fac_id:
        return {"success": False, "reason": "Herhangi bir faction'a üye değilsin."}
    if amount <= 0:
        return {"success": False, "reason": "Geçersiz miktar."}
    if player.get("money", 0) < amount:
        return {"success": False, "reason": "Yeterli altının yok."}
    fac = _get_faction(state, fac_id)
    if not fac:
        return {"success": False, "reason": "Faction bulunamadı."}
    # Her 10 altın = 1 contribution
    gained = max(1, amount // 10)
    player["money"] = round(player["money"] - amount, 1)
    player["faction_contribution"] = player.get("faction_contribution", 0) + gained
    fac["treasury"] = fac.get("treasury", 0) + amount
    _log_event(state, turn, "oyuncu_bagis",
               f"Oyuncu [{fac['name']}] faction'ına {amount} altın bağışladı (+{gained} katkı).", fac_id)
    return {"success": True, "donated": amount, "contribution_gained": gained,
            "new_contribution": player["faction_contribution"]}


def get_faction_summary(state: dict, player: dict = None) -> list:
    """
    Tüm factionların özet bilgisini döner.
    P3b: Uyuyan (active=False) factionlar 'unknown' olarak gönderilir.
    P3a: Gizli cemiyet is_secret=True ise detaylar maskelenir.
    """
    from balance_config import FACTION_TYPE_LABELS
    player_clues = (player or state["player"]).get("gizli_cemiyet_clues", {}) if player or "player" in state else {}
    summaries = []
    for fac in state["world"].get("factions", []):
        is_active  = fac.get("active", True)   # eski save'ler için True default
        is_secret  = fac.get("is_secret", False) and not fac.get("revealed", False)

        # Uyuyan faction → sadece varlık bilgisi, detay yok
        if not is_active:
            summaries.append({
                "id":       fac["id"],
                "active":   False,
                "is_secret": False,
                "name":     "???",
                "type":     fac["type"],
                "type_label": FACTION_TYPE_LABELS.get(fac["type"], fac["type"]),
            })
            continue

        leader = _get_npc(state, fac["leader_id"])

        # Şehir nüfuzlarını lokasyon adıyla zenginleştir
        city_influences = []
        for loc_id, inf in fac.get("city_influence", {}).items():
            loc = next((l for l in state["world"]["locations"] if l["id"] == loc_id), None)
            city_influences.append({
                "location_id":   loc_id,
                "location_name": loc["name"] if loc else loc_id,
                "influence":     inf,
            })
        city_influences.sort(key=lambda x: x["influence"], reverse=True)

        # Gizli cemiyet: bazı alanlar maskelenir
        if is_secret:
            clue_count = player_clues.get(fac["id"], 0)
            summaries.append({
                "id":            fac["id"],
                "active":        True,
                "is_secret":     True,
                "name":          "Gizli Örgüt",
                "type":          fac["type"],
                "type_label":    FACTION_TYPE_LABELS.get(fac["type"], fac["type"]),
                "primary_goal":  "Bilinmiyor",
                "leader":        "?",
                "leader_id":     "?",
                "member_count":  0,
                "home_location_id": fac.get("home_location_id"),
                "clue_count":    clue_count,
                "can_reveal":    clue_count >= _CLUE_THRESHOLD,
                "city_influences": [],
                "influence_trend":    _compute_influence_trend(fac),
                "influence_delta_4w": _compute_influence_delta(fac),
            })
            continue

        summaries.append({
            "id":            fac["id"],
            "active":        True,
            "is_secret":     False,
            "name":          fac["name"],
            "type":          fac["type"],
            "type_label":    FACTION_TYPE_LABELS.get(fac["type"], fac["type"]),
            "primary_goal":  fac.get("primary_goal", ""),
            "leader":        leader["name"] if leader else (
                             "Oyuncu" if fac["leader_id"] == "PLAYER" else "?"),
            "leader_id":     fac["leader_id"],
            "member_count":  len(fac["members"]),
            "home_location_id": fac.get("home_location_id"),
            "treasury":      fac["treasury"],
            "military_power":fac["military_power"],
            "economy_level": fac["economy_level"],
            "stability":     fac["stability"],
            "fear_level":    fac["fear_level"],
            "reputation":    fac["reputation"],
            "unrest":        fac["unrest"],
            "rebel_risk":    fac["rebel_risk"],
            "rank_table":    fac.get("rank_table", []),
            "at_war_with":   fac.get("at_war_with", []),
            "diplomacy":     fac.get("diplomacy", {}),
            "city_influences": city_influences,
            "last_action":   fac.get("last_action"),
            "last_event":    fac["event_log"][-1]["text"] if fac.get("event_log") else None,
            # ── Trend alanları ──
            "influence_trend":     _compute_influence_trend(fac),
            "influence_delta_4w":  _compute_influence_delta(fac),
            # ── Oyuncu progression alanları ──
            "player_rank":         (player or state["player"]).get("faction_rank", 0)
                                   if (player or state.get("player", {})).get("faction_id") == fac["id"]
                                   else None,
            "player_contribution": (player or state["player"]).get("faction_contribution", 0)
                                   if (player or state.get("player", {})).get("faction_id") == fac["id"]
                                   else None,
            "contribution_goal":   _contribution_goal(fac["type"],
                                   (player or state.get("player", {})).get("faction_rank", 0)),
            # ── GDD v4 ──
            "darbe_plani":    fac.get("darbe_plani"),
            "inanc_etkisi":   fac.get("inanc_etkisi", 0),
            "uye_sayisi":     fac.get("uye_sayisi", len(fac.get("members", []))),
        })
    return summaries




def get_region_summary(state: dict) -> list:
    """Tüm bölgelerin durumunu döner."""
    summaries = []
    for region in state["world"].get("regions", []):
        owner = _get_faction(state, region.get("owner_faction_id"))
        summaries.append({
            "id": region["id"],
            "name": region["name"],
            "owner": owner["name"] if owner else "Sahipsiz",
            "population": region["population"],
            "economy": region["economy"],
            "security": region["security"],
            "unrest_level": region["unrest_level"],
            "resources": region["resources"],
            "bandits_active": region["bandits_active"],
            "garrison_size": region["garrison_size"],
            "tax_income": region.get("tax_income", 0),
        })
    return summaries


def get_active_wars(state: dict) -> list:
    """Aktif savaşların özetini döner."""
    active = []
    for war in state["world"].get("wars", []):
        if war.get("ended_turn") is not None:
            continue
        fa = _get_faction(state, war["faction_a"])
        fb = _get_faction(state, war["faction_b"])
        active.append({
            "id": war["id"],
            "faction_a": fa["name"] if fa else war["faction_a"],
            "faction_b": fb["name"] if fb else war["faction_b"],
            "started_turn": war["started_turn"],
            "cause": war["cause"],
            "battles_fought": len(war["battles"]),
        })
    return active
