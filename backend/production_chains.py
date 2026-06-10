"""Üretim zincirleri — GDD v5 Faz 1A.

HAMMADDE        ARA ÜRÜN          SON ÜRÜN
buğday      →   un            →   ekmek
yün (çoban) →   kumaş         →   kıyafet
demir cevheri → demir         →   silah / alet
üzüm        →   şıra          →   şarap
odun        →   kereste       →   mobilya
deri        →   işlenmiş deri →   zırh / çizme

İki katman:
1. RAW_PRODUCTION  — hammadde üreten meslekler (çiftçi, çoban, madenci…)
2. RECIPES         — zanaatkâr dönüşümleri; girdiyi yerel pazardan çeker,
                     çıktıyı yerel pazara basar. Arz gerçek üretimden gelir,
                     sihirli spawn yok.

Zanaatkâr birden fazla tarif biliyorsa o hafta pazara göre EN KÂRLI olanı
çalışır (basit kâr sezgisi). Dönüşüm kârı = çıktı değeri − girdi değeri;
kâr pozitifse zanaatkârın serveti artar (NPC ekonomisi gerçek paraya bağlanır).

Veri > kod prensibi (Sürekli Kural #2): tüm tanımlar dict — Faz 7 JS portu
için mantık minimal, veri maksimal.
"""
from balance_config import PRODUCTION_BALANCE

# ── Katman 1: Hammadde üretimi ───────────────────────────────────────────
# meslek → [(mal, haftalık_adet), ...]
RAW_PRODUCTION = {
    "çiftçi":   [("buğday", 10)],
    "bahçıvan": [("üzüm", 8)],
    "çoban":    [("yün", 5), ("et", 2)],
    "avcı":     [("et", 5), ("deri", 2)],
    "balıkçı":  [("et", 5)],
    "kasap":    [("et", 4), ("deri", 1)],
    "madenci":  [("demir_cevheri", 6)],
    "oduncu":   [("odun", 8)],
}

# ── Katman 2: Zanaat tarifleri ───────────────────────────────────────────
# Her tarif: girdi {mal: adet} → çıktı (mal, adet). batches = haftalık tekrar.
# Meslek = işliğin sahibi zanaatkâr (Faz 1B'de oyuncu işlikleri de bu
# tarifleri kullanacak).
RECIPES = {
    "değirmenci": [
        {"id": "ogutme",    "input": {"buğday": 1},        "output": ("un", 1),       "batches": 8},
    ],
    "fırıncı": [
        {"id": "ekmek",     "input": {"un": 1},            "output": ("ekmek", 3),    "batches": 5},
    ],
    "dokumacı": [
        {"id": "kumas",     "input": {"yün": 1},           "output": ("kumaş", 1),    "batches": 6},
    ],
    "terzi": [
        {"id": "kiyafet",   "input": {"kumaş": 2},         "output": ("kıyafet", 1),  "batches": 4},
    ],
    "demirci": [
        {"id": "demir",     "input": {"demir_cevheri": 2}, "output": ("demir", 1),    "batches": 4},
        {"id": "alet",      "input": {"demir": 1},         "output": ("alet", 1),     "batches": 4},
    ],
    "silahçı": [
        {"id": "silah",     "input": {"demir": 2},         "output": ("silah", 1),    "batches": 3},
    ],
    "şarapçı": [
        {"id": "sira",      "input": {"üzüm": 2},          "output": ("şıra", 1),     "batches": 6},
        {"id": "sarap",     "input": {"şıra": 1},          "output": ("şarap", 1),    "batches": 5},
    ],
    "marangoz": [
        {"id": "kereste",   "input": {"odun": 2},          "output": ("kereste", 1),  "batches": 6},
        {"id": "mobilya",   "input": {"kereste": 3},       "output": ("mobilya", 1),  "batches": 2},
    ],
    "sepici": [
        {"id": "tabaklama", "input": {"deri": 1},          "output": ("işlenmiş_deri", 1), "batches": 5},
    ],
    "zırh_ustası": [
        {"id": "zirh",      "input": {"işlenmiş_deri": 3}, "output": ("zırh", 1),     "batches": 2},
    ],
    "kunduracı": [
        {"id": "cizme",     "input": {"işlenmiş_deri": 1}, "output": ("çizme", 1),    "batches": 4},
    ],
}

# ── Oyuncu "çalış" aksiyonu çıktısı (game_routes uyumluluğu) ─────────────
# Eski simulation.PRODUCTION sözleşmesi: meslek → (mal, adet) | (None, 0)
PROFESSION_OUTPUT = {prof: outs[0] for prof, outs in RAW_PRODUCTION.items()}
PROFESSION_OUTPUT.update({
    prof: recipes[0]["output"] for prof, recipes in RECIPES.items()
})
PROFESSION_OUTPUT["tüccar"] = (None, 0)  # mal taşır, üretmez


def _recipe_profit(recipe, market):
    """Bir tarifin bu pazardaki birim parti kârı (çıktı değeri − girdi değeri)."""
    out_good, out_qty = recipe["output"]
    if out_good not in market:
        return None
    revenue = market[out_good]["price"] * out_qty
    cost = 0
    for good, qty in recipe["input"].items():
        if good not in market:
            return None
        cost += market[good]["price"] * qty
    return revenue - cost


def _inputs_available(recipe, market):
    """Pazar arzı bu tarifin bir partisine yetiyor mu?"""
    return all(market.get(g, {}).get("supply", 0) >= q
               for g, q in recipe["input"].items())


def _household_factor(pop, worker_count):
    """Simüle edilmeyen nüfusu temsil çarpanı: her üretici/zanaatkâr NPC
    birden çok haneyi temsil eder; böylece az NPC'li kalabalık şehirlerde
    üretim hacmi nüfusla orantılı kalır."""
    if not worker_count:
        return 0.0
    return min(PRODUCTION_BALANCE["household_factor_max"],
               max(1.0, pop / (worker_count * PRODUCTION_BALANCE["people_per_producer"])))


def run_craft_tick(loc, local_npcs, prod_mult, rng):
    """Lokasyondaki zanaatkârlar haftalık üretim yapar.

    Girdi pazar arzından düşülür (talep olarak da kaydedilir — zanaatkâr
    alıcıdır), çıktı pazar arzına eklenir. Kâr zanaatkârın servetine işlenir.

    Döndürür: {"produced": {mal: adet}, "starved": [meslek, ...]}
    starved = hammadde bulamayan zanaatkâr meslekleri (event üretimi için).
    """
    market = loc["market"]
    produced = {}
    starved = []
    wage_share = PRODUCTION_BALANCE["craftsman_wage_share"]
    pop = max(10, loc.get("population", 50))
    craftsman_count = sum(1 for n in local_npcs if n["profession"] in RECIPES)
    household = _household_factor(pop, craftsman_count)

    for npc in local_npcs:
        recipes = RECIPES.get(npc["profession"])
        if not recipes:
            continue
        # En kârlı tarifi seç (pazara bakan basit usta sezgisi)
        best = None
        best_profit = 0
        for r in recipes:
            p = _recipe_profit(r, market)
            if p is not None and p > best_profit:
                best, best_profit = r, p
        if best is None:
            # Hiçbir tarif kârlı değil — en azından ilk tarifi düşük tempoda dene
            best = recipes[0]
        max_batches = max(1, int(best["batches"] * household * prod_mult * rng.uniform(0.7, 1.2)))
        done = 0
        for _ in range(max_batches):
            if not _inputs_available(best, market):
                break
            for good, qty in best["input"].items():
                market[good]["supply"] -= qty
                market[good]["demand"] += qty  # zanaatkâr girdiyi pazardan satın alır
            out_good, out_qty = best["output"]
            market[out_good]["supply"] += out_qty
            produced[out_good] = produced.get(out_good, 0) + out_qty
            done += 1
        if done == 0:
            starved.append(npc["profession"])
        else:
            profit = _recipe_profit(best, market)
            if profit and profit > 0:
                npc["wealth"] = round(npc.get("wealth", 0) + profit * done * wage_share, 1)

    return {"produced": produced, "starved": starved}


def run_raw_tick(loc, local_npcs, prod_mult, rng):
    """Hammadde üreticileri haftalık üretimlerini pazara basar.

    Her üretici NPC, simüle edilmeyen nüfusun bir bölümünü temsil eder
    (household_factor) — böylece az NPC'li kalabalık şehirler açlıktan
    çökmez ama arz yine gerçek mesleklerden gelir.
    """
    market = loc["market"]
    pop = max(10, loc.get("population", 50))
    producer_count = sum(1 for n in local_npcs if n["profession"] in RAW_PRODUCTION)
    household = _household_factor(pop, producer_count)
    produced = {}
    for npc in local_npcs:
        outputs = RAW_PRODUCTION.get(npc["profession"])
        if not outputs:
            continue
        for good, amt in outputs:
            if good not in market:
                continue
            qty = max(1, int(amt * household * prod_mult * rng.uniform(0.7, 1.3)))
            market[good]["supply"] += qty
            produced[good] = produced.get(good, 0) + qty
    return produced
