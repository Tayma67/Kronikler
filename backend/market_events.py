"""Piyasa olayları havuzu — GDD v5 Faz 1C (20+ olay).

Her olay bir lokasyonu hedefler; arz/talep şoku uygular ve istenirse
belirli mallara süreli fiyat çarpanı (olay_çarpanı) bırakır.
Fiyat formülü: baz × (talep/arz)^esneklik × mevsim × olay_çarpanı
(mevsim ve olay çarpanları simulation._recompute_prices içinde uygulanır).

Veri > kod: olaylar dict havuzu, metinler locales/tr.py'den.
"""
import random
from locales import t

# supply/demand: {mal: çarpan} → mevcut değer üzerine oran (0.5 = yarıya düşür,
#   +talep için demand "add_frac": nüfusa oranla ekleme)
# price_mult: {mal: (çarpan, süre_hafta)}
MARKET_EVENTS = [
    {"id": "kotu_hasat", "weight": 8, "season": ["Sonbahar", "Yaz"],
     "text_key": "piyasa.kitlik", "text_good": "buğday",
     "supply_mult": {"buğday": 0.4}, "price_mult": {"buğday": (1.4, 4), "un": (1.3, 4), "ekmek": (1.25, 4)},
     "loc_effect": {"wealth": -8}},
    {"id": "bolluk_hasadi", "weight": 8, "season": ["Sonbahar"],
     "text_key": "piyasa.bolluk_hasadi", "text_good": "buğday",
     "supply_add_pop": {"buğday": 0.6}, "price_mult": {"buğday": (0.7, 4)},
     "loc_effect": {"wealth": +5}},
    {"id": "kervan_baskini", "weight": 7,
     "text_key": "piyasa.kervan_baskini", "text_good_pool": ["ipek", "baharat", "kumaş", "şarap"],
     "supply_mult": {"_text_good": 0.3}, "price_mult": {"_text_good": (1.5, 3)},
     "loc_effect": {"security": -5}},
    {"id": "savas_talebi", "weight": 6,
     "text_key": "piyasa.savas_talebi", "text_good": "silah",
     "demand_add_pop": {"silah": 0.05, "zırh": 0.04, "demir": 0.06},
     "price_mult": {"silah": (1.3, 5), "zırh": (1.3, 5)}},
    {"id": "salgin_talebi", "weight": 5,
     "text_key": "piyasa.salgin_talebi", "text_good": "baharat",
     "demand_add_pop": {"baharat": 0.04, "şarap": 0.03},
     "price_mult": {"baharat": (1.4, 4)},
     "loc_effect": {"population": -2}},
    {"id": "dugun_sezonu", "weight": 8, "season": ["İlkbahar", "Yaz"],
     "text_key": "piyasa.dugun_sezonu", "text_good": "kumaş",
     "demand_add_pop": {"kumaş": 0.05, "şarap": 0.05, "kıyafet": 0.03, "mobilya": 0.01},
     "price_mult": {"kıyafet": (1.2, 3)}},
    {"id": "maden_cokmesi", "weight": 4,
     "text_key": "piyasa.maden_cokmesi", "text_good": "demir_cevheri",
     "supply_mult": {"demir_cevheri": 0.3},
     "price_mult": {"demir_cevheri": (1.5, 5), "demir": (1.25, 5)},
     "loc_effect": {"population": -1}},
    {"id": "yeni_damar", "weight": 4,
     "text_key": "piyasa.yeni_damar", "text_good": "demir_cevheri",
     "supply_add_pop": {"demir_cevheri": 0.4}, "price_mult": {"demir_cevheri": (0.7, 5)},
     "loc_effect": {"wealth": +6}},
    {"id": "koyun_vebasi", "weight": 5,
     "text_key": "piyasa.koyun_vebasi", "text_good": "yün",
     "supply_mult": {"yün": 0.35, "et": 0.6},
     "price_mult": {"yün": (1.4, 5), "kumaş": (1.2, 5), "et": (1.25, 4)}},
    {"id": "bereketli_bag", "weight": 5, "season": ["Sonbahar"],
     "text_key": "piyasa.bereketli_bag", "text_good": "üzüm",
     "supply_add_pop": {"üzüm": 0.5}, "price_mult": {"üzüm": (0.7, 3), "şarap": (0.85, 4)}},
    {"id": "orman_yangini", "weight": 4, "season": ["Yaz"],
     "text_key": "piyasa.orman_yangini", "text_good": "odun",
     "supply_mult": {"odun": 0.4, "kereste": 0.6},
     "price_mult": {"odun": (1.4, 5), "kereste": (1.3, 5)},
     "loc_effect": {"wealth": -4}},
    {"id": "kuraklik", "weight": 5, "season": ["Yaz"],
     "text_key": "piyasa.kuraklik", "text_good": "buğday",
     "supply_mult": {"buğday": 0.5, "üzüm": 0.5},
     "price_mult": {"buğday": (1.35, 6), "üzüm": (1.3, 6)},
     "loc_effect": {"wealth": -5}},
    {"id": "soguk_dalga", "weight": 7, "season": ["Kış"],
     "text_key": "piyasa.soguk_dalga", "text_good": "odun",
     "demand_add_pop": {"odun": 0.08, "et": 0.03},
     "price_mult": {"odun": (1.3, 3)}},
    {"id": "moda_dalgasi", "weight": 4,
     "text_key": "piyasa.moda_dalgasi", "text_good": "kıyafet",
     "demand_add_pop": {"kıyafet": 0.04, "çizme": 0.03},
     "price_mult": {"kıyafet": (1.25, 4), "çizme": (1.2, 4)}},
    {"id": "lonca_grevi", "weight": 4,
     "text_key": "piyasa.lonca_grevi", "text_good_pool": ["ekmek", "kumaş", "alet", "çizme"],
     "supply_mult": {"_text_good": 0.4}, "price_mult": {"_text_good": (1.35, 3)}},
    {"id": "panayir", "weight": 7,
     "text_key": "piyasa.panayir", "text_good": "kumaş",
     "demand_add_pop": {"kumaş": 0.03, "şarap": 0.03, "et": 0.03, "mobilya": 0.008},
     "loc_effect": {"wealth": +5, "prosperity": +6}},
    {"id": "ipek_kervani", "weight": 5,
     "text_key": "piyasa.ipek_kervani", "text_good": "ipek",
     "supply_add_pop": {"ipek": 0.06, "baharat": 0.06},
     "price_mult": {"ipek": (0.75, 3), "baharat": (0.75, 3)}},
    {"id": "yol_kapanmasi", "weight": 5, "season": ["Kış"],
     "text_key": "piyasa.yol_kapanmasi", "text_good": "ipek",
     "supply_mult": {"ipek": 0.5, "baharat": 0.5},
     "price_mult": {"ipek": (1.5, 4), "baharat": (1.5, 4)}},
    {"id": "asker_alimi", "weight": 5,
     "text_key": "piyasa.asker_alimi", "text_good": "silah",
     "demand_add_pop": {"silah": 0.04, "çizme": 0.04, "ekmek": 0.04}},
    {"id": "insaat_patlamasi", "weight": 5,
     "text_key": "piyasa.insaat_patlamasi", "text_good": "kereste",
     "demand_add_pop": {"kereste": 0.05, "alet": 0.03, "mobilya": 0.01},
     "price_mult": {"kereste": (1.25, 5)},
     "loc_effect": {"wealth": +4}},
    {"id": "bag_bozumu", "weight": 6, "season": ["Sonbahar"],
     "text_key": "piyasa.bag_bozumu", "text_good": "şarap",
     "demand_add_pop": {"şarap": 0.05, "et": 0.03},
     "price_mult": {"şarap": (1.2, 2)}},
    {"id": "deri_talebi", "weight": 4,
     "text_key": "piyasa.deri_talebi", "text_good": "işlenmiş_deri",
     "demand_add_pop": {"işlenmiş_deri": 0.03, "deri": 0.03, "zırh": 0.01},
     "price_mult": {"işlenmiş_deri": (1.25, 4)}},
]

# Mevsimsel fiyat çarpanları (her mal her mevsim 1.0 varsayılan)
SEASON_PRICE_MULT = {
    "Kış":      {"odun": 1.25, "buğday": 1.15, "et": 1.10, "ekmek": 1.10, "üzüm": 1.3},
    "İlkbahar": {"yün": 0.9, "kumaş": 1.05},
    "Yaz":      {"odun": 0.9, "et": 0.95},
    "Sonbahar": {"buğday": 0.85, "üzüm": 0.75, "şarap": 1.1, "odun": 1.05},
}

EVENT_CHANCE_PER_WEEK = 0.30   # haftada ~%30 ihtimalle bir piyasa olayı


def _resolve_good(effect_map, text_good):
    return {(text_good if g == "_text_good" else g): v for g, v in effect_map.items()}


def tick_market_events(state, day):
    """Haftalık piyasa olayı zarı. Tetiklenirse arz/talep şoku uygular,
    fiyat çarpanlarını pazara işler ve history'ye olay yazar."""
    if random.random() > EVENT_CHANCE_PER_WEEK:
        return None
    from calendar_tr import season_for_turn
    from simulation import _push_event, _recompute_prices
    season = season_for_turn(state.get("turn", 0))

    pool = [e for e in MARKET_EVENTS
            if "season" not in e or season in e["season"]]
    if not pool:
        return None
    event = random.choices(pool, weights=[e["weight"] for e in pool], k=1)[0]
    loc = random.choice(state["world"]["locations"])
    market = loc.get("market")
    if not market:
        return None
    pop = max(10, loc.get("population", 50))

    text_good = event.get("text_good")
    if "text_good_pool" in event:
        text_good = random.choice(event["text_good_pool"])

    for good, mult in _resolve_good(event.get("supply_mult", {}), text_good).items():
        if good in market:
            market[good]["supply"] = max(0, int(market[good]["supply"] * mult))
    for good, frac in _resolve_good(event.get("supply_add_pop", {}), text_good).items():
        if good in market:
            market[good]["supply"] += max(1, int(pop * frac))
    for good, frac in _resolve_good(event.get("demand_add_pop", {}), text_good).items():
        if good in market:
            market[good]["demand"] += max(1, int(pop * frac))
    for good, (mult, weeks) in _resolve_good(event.get("price_mult", {}), text_good).items():
        if good in market:
            market[good]["event_mult"] = mult
            market[good]["event_mult_until"] = day + weeks

    for field, delta in event.get("loc_effect", {}).items():
        loc[field] = max(5, min(100, loc.get(field, 50) + delta)) if field != "population" \
            else max(10, loc.get("population", 50) + delta)

    _recompute_prices(loc, season=season, turn=day)
    text = t(event["text_key"], loc=loc["name"], good=text_good or "")
    _push_event(state, day, "piyasa_olayı", text)
    return {"event_id": event["id"], "location": loc["name"], "text": text}
