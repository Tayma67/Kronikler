"""Mülk sahipliği sistemi — GDD v5 Faz 1B.

Mülk tipleri: tarla, dükkân, işlik (atölye), han, ev (konak).
- Mülkler lokasyona bağlı: valinin vergisinden ve güvenlikten etkilenir,
  güvenlik çökerse yağmalanabilir.
- Haftalık tick advance_time içinden çağrılır (property_world_tick).
- İşlik üretimi production_chains.RECIPES'i kullanır → oyuncu da NPC'lerle
  aynı gerçek ekonomide üretir.
- Çalışan sistemi: yerel NPC'ler işçi olarak tutulur, maaş para sink'idir,
  üretkenlik NPC stat/yaş profiline bağlıdır.

Veri > kod (Sürekli Kural #2): tanımlar dict, mantık minimal.
"""
import random
from world_gen import new_id
from production_chains import RECIPES
from locales import t

# ── Mülk tipi tanımları ──────────────────────────────────────────────────
PROPERTY_TYPES = {
    "tarla": {
        "label": "Tarla",
        "icon": "🌾",
        "cost": 800,
        "min_age": 13,
        "maintenance": 3,          # haftalık bakım (para sink)
        "desc_key": "mulk.tarla_desc",
        "config": {"crop": "buğday"},   # ekin seçimi: buğday | üzüm
        "crops": {"buğday": {"yield": 45}, "üzüm": {"yield": 36}},
        "max_workers": 3,
    },
    "dükkân": {
        "label": "Dükkân",
        "icon": "🏪",
        "cost": 2000,
        "min_age": 16,
        "maintenance": 6,
        "desc_key": "mulk.dukkan_desc",
        "config": {"stock_good": "ekmek", "margin": 0.25},  # stok + kâr marjı
        "max_workers": 2,
    },
    "işlik": {
        "label": "İşlik (Atölye)",
        "icon": "🏭",
        "cost": 3500,
        "min_age": 16,
        "maintenance": 10,
        "desc_key": "mulk.islik_desc",
        "config": {"recipe_prof": "fırıncı", "recipe_id": "ekmek"},  # ürün hattı
        "max_workers": 4,
    },
    "han": {
        "label": "Han",
        "icon": "🏨",
        "cost": 6000,
        "min_age": 18,
        "maintenance": 12,
        "desc_key": "mulk.han_desc",
        "config": {"room_price": 5, "guards": 0},  # oda fiyatı + güvenlik
        "max_workers": 3,
    },
    "ev": {
        "label": "Ev (Konak)",
        "icon": "🏠",
        "cost": 1500,
        "min_age": 13,
        "maintenance": 1,
        "desc_key": "mulk.ev_desc",
        "config": {"tier": 1},      # 1=kulübe → 4=konak (genişletme)
        "tiers": {
            1: {"label": "Kulübe",      "upgrade_cost": 0,    "rep_per_week": 0, "family_cap": 2},
            2: {"label": "Taş Ev",      "upgrade_cost": 2000, "rep_per_week": 1, "family_cap": 4},
            3: {"label": "Büyük Ev",    "upgrade_cost": 4500, "rep_per_week": 2, "family_cap": 6},
            4: {"label": "Konak",       "upgrade_cost": 8500, "rep_per_week": 3, "family_cap": 10},
        },
        "max_workers": 1,
    },
}

WORKER_WAGE_BASE = 5        # haftalık işçi maaşı (stat'a göre artar)
SALE_VALUE_RATIO = 0.7      # satışta maliyetin %70'i geri döner
RAID_CONDITION_DAMAGE = (20, 45)


# ── Yardımcılar ──────────────────────────────────────────────────────────
def ensure_properties(state):
    state.setdefault("properties", [])


def get_property(state, prop_id):
    return next((p for p in state.get("properties", []) if p["id"] == prop_id), None)


def _loc_of(state, loc_id):
    return next((l for l in state["world"]["locations"] if l["id"] == loc_id), None)


def _npc_of(state, npc_id):
    return next((n for n in state["world"]["npcs"] if n["id"] == npc_id), None)


def _worker_productivity(npc):
    """İşçi üretkenliği 0.6–1.6: stat ve yaş profili belirler."""
    if not npc or not npc.get("alive"):
        return 0.0
    base = 1.0
    age = npc.get("age", 30)
    if age < 16:
        base -= 0.3
    elif age > 55:
        base -= 0.2
    # NPC'lerde detaylı stat yok; servet/meslek deneyimi vekil gösterge
    if npc.get("profession") in RECIPES:
        base += 0.3
    base += min(0.3, npc.get("wealth", 0) / 3000)
    return max(0.6, min(1.6, base))


def _governance_tax_rate(state, loc_id):
    """Valinin vergi oranı (yoksa varsayılan %10)."""
    for g in state.get("governances", []) or []:
        if g.get("location_id") == loc_id:
            return g.get("tax_rate", 10) / 100
    return 0.10


def _ledger_push(prop, day, kind, amount, note=""):
    prop.setdefault("ledger", []).append(
        {"day": day, "kind": kind, "amount": round(amount, 1), "note": note})
    prop["ledger"] = prop["ledger"][-24:]   # son 24 kayıt


def property_value(prop):
    """Güncel satış değeri: maliyet × kondisyon × tier."""
    ptype = PROPERTY_TYPES[prop["type"]]
    base = ptype["cost"]
    if prop["type"] == "ev":
        tier = prop["config"].get("tier", 1)
        for t_lvl in range(2, tier + 1):
            base += ptype["tiers"][t_lvl]["upgrade_cost"]
    return int(base * SALE_VALUE_RATIO * (prop.get("condition", 100) / 100))


# ── Satın alma / satma ───────────────────────────────────────────────────
def buy_property(state, ptype_key, loc_id, day):
    """Döndürür (prop, None) veya (None, hata_metni)."""
    ensure_properties(state)
    ptype = PROPERTY_TYPES.get(ptype_key)
    if not ptype:
        return None, t("mulk.hata_tip")
    player = state["player"]
    if player["age"] < ptype["min_age"]:
        return None, t("mulk.hata_yas", age=ptype["min_age"])
    loc = _loc_of(state, loc_id)
    if not loc:
        return None, t("mulk.hata_lokasyon")
    # S1 Rakip Hanedanlar: lokasyon mülk slotları KIT — hanedanlar kapmış olabilir
    try:
        from dynasties import free_slots, slot_owners
        if free_slots(state, loc) <= 0:
            owners = slot_owners(state, loc_id)
            who = ", ".join(sorted({f"{o['sembol']} {o['sahip']}" for o in owners})) \
                or "yerel aileler"
            return None, (f"{loc['name']}'de boş mülk kalmadı — {who} kapmış. "
                          "Biri satana kadar bekle ya da başka diyara bak.")
    except Exception:
        pass
    # Fiyat lokasyon zenginliğiyle oynar (zengin şehirde mülk pahalı)
    cost = int(ptype["cost"] * (0.8 + loc.get("wealth", 50) / 125))
    if player.get("money", 0) < cost:
        return None, t("mulk.hata_para", cost=cost)
    player["money"] = round(player["money"] - cost, 1)
    prop = {
        "id": new_id(),
        "type": ptype_key,
        "name": f"{loc['name']} {ptype['label']}",
        "location_id": loc["id"],
        "location_name": loc["name"],
        "purchased_turn": day,
        "purchase_cost": cost,
        "condition": 100,
        "config": dict(ptype["config"]),
        "workers": [],
        "ledger": [],
        "pending_harvest": 0,
        "total_profit": 0.0,
    }
    state["properties"].append(prop)
    _ledger_push(prop, day, "satın_alma", -cost)
    return prop, None


def sell_property(state, prop_id, day):
    prop = get_property(state, prop_id)
    if not prop:
        return None, t("mulk.hata_bulunamadi")
    value = property_value(prop)
    # İşçileri serbest bırak
    for wid in prop.get("workers", []):
        npc = _npc_of(state, wid)
        if npc:
            npc.pop("employed_by_player", None)
    state["player"]["money"] = round(state["player"]["money"] + value, 1)
    state["properties"] = [p for p in state["properties"] if p["id"] != prop_id]
    return value, None


# ── Yönetim ──────────────────────────────────────────────────────────────
def configure_property(state, prop_id, config_updates):
    prop = get_property(state, prop_id)
    if not prop:
        return None, t("mulk.hata_bulunamadi")
    ptype = PROPERTY_TYPES[prop["type"]]
    cfg = prop["config"]
    if prop["type"] == "tarla" and "crop" in config_updates:
        if config_updates["crop"] not in ptype["crops"]:
            return None, t("mulk.hata_ekin")
        cfg["crop"] = config_updates["crop"]
    if prop["type"] == "dükkân":
        if "stock_good" in config_updates:
            cfg["stock_good"] = config_updates["stock_good"]
        if "margin" in config_updates:
            cfg["margin"] = max(0.05, min(0.6, float(config_updates["margin"])))
    if prop["type"] == "işlik" and "recipe_prof" in config_updates:
        rp = config_updates["recipe_prof"]
        rid = config_updates.get("recipe_id")
        recipes = RECIPES.get(rp)
        if not recipes:
            return None, t("mulk.hata_tarif")
        chosen = next((r for r in recipes if r["id"] == rid), recipes[0])
        cfg["recipe_prof"] = rp
        cfg["recipe_id"] = chosen["id"]
    if prop["type"] == "han":
        if "room_price" in config_updates:
            cfg["room_price"] = max(1, min(30, int(config_updates["room_price"])))
        if "guards" in config_updates:
            cfg["guards"] = max(0, min(5, int(config_updates["guards"])))
    return prop, None


def upgrade_house(state, prop_id, day):
    prop = get_property(state, prop_id)
    if not prop or prop["type"] != "ev":
        return None, t("mulk.hata_bulunamadi")
    tiers = PROPERTY_TYPES["ev"]["tiers"]
    cur = prop["config"].get("tier", 1)
    if cur >= 4:
        return None, t("mulk.hata_max_tier")
    cost = tiers[cur + 1]["upgrade_cost"]
    if state["player"].get("money", 0) < cost:
        return None, t("mulk.hata_para", cost=cost)
    state["player"]["money"] = round(state["player"]["money"] - cost, 1)
    prop["config"]["tier"] = cur + 1
    _ledger_push(prop, day, "genişletme", -cost, tiers[cur + 1]["label"])
    return prop, None


def hire_worker(state, prop_id, npc_id):
    prop = get_property(state, prop_id)
    if not prop:
        return None, t("mulk.hata_bulunamadi")
    ptype = PROPERTY_TYPES[prop["type"]]
    if len(prop["workers"]) >= ptype["max_workers"]:
        return None, t("mulk.hata_isci_dolu", max=ptype["max_workers"])
    npc = _npc_of(state, npc_id)
    if not npc or not npc.get("alive"):
        return None, t("mulk.hata_npc")
    if npc.get("employed_by_player"):
        return None, t("mulk.hata_npc_calisiyor", name=npc["name"])
    if npc["location_id"] != prop["location_id"]:
        return None, t("mulk.hata_npc_uzak", name=npc["name"])
    if npc.get("profession") in ("kral", "veliaht", "lord", "general"):
        return None, t("mulk.hata_npc_soylu", name=npc["name"])
    npc["employed_by_player"] = prop["id"]
    prop["workers"].append(npc_id)
    return prop, None


def fire_worker(state, prop_id, npc_id):
    prop = get_property(state, prop_id)
    if not prop:
        return None, t("mulk.hata_bulunamadi")
    if npc_id not in prop.get("workers", []):
        return None, t("mulk.hata_npc")
    prop["workers"].remove(npc_id)
    npc = _npc_of(state, npc_id)
    if npc:
        npc.pop("employed_by_player", None)
        # İşten çıkarma küçük ilişki bedeli
        rels = state.setdefault("relationships", {})
        rels[npc_id] = rels.get(npc_id, 0) - 5
    return prop, None


def collect_harvest(state, prop_id, day):
    """Tarla hasadını oyuncu envanterine aktar."""
    prop = get_property(state, prop_id)
    if not prop or prop["type"] != "tarla":
        return None, t("mulk.hata_bulunamadi")
    qty = prop.get("pending_harvest", 0)
    if qty <= 0:
        return None, t("mulk.hata_hasat_yok")
    crop = prop["config"].get("crop", "buğday")
    inv = state["player"].setdefault("inventory", {})
    inv[crop] = inv.get(crop, 0) + qty
    prop["pending_harvest"] = 0
    _ledger_push(prop, day, "hasat", 0, f"{qty} {crop}")
    return {"good": crop, "qty": qty}, None


# ── Haftalık tick ────────────────────────────────────────────────────────
def _wage_cost(state, prop):
    total = 0
    for wid in prop.get("workers", []):
        npc = _npc_of(state, wid)
        if npc and npc.get("alive"):
            total += WORKER_WAGE_BASE * _worker_productivity(npc)
    return total


def _workers_mult(state, prop):
    """İşçi katkısı: 1.0 (işçisiz) + her işçinin üretkenliği × 0.5."""
    mult = 1.0
    for wid in list(prop.get("workers", [])):
        npc = _npc_of(state, wid)
        if not npc or not npc.get("alive"):
            prop["workers"].remove(wid)   # ölen işçi kadrodan düşer
            continue
        mult += 0.5 * _worker_productivity(npc)
    return mult


def _tick_tarla(state, prop, loc, season, day, events):
    from calendar_tr import SEASON_EFFECTS
    crop_cfg = PROPERTY_TYPES["tarla"]["crops"][prop["config"].get("crop", "buğday")]
    # Büyüme: ilkbahar/yaz birikir, sonbaharda hasat olgunlaşır
    growth = {"İlkbahar": 1.0, "Yaz": 1.2, "Sonbahar": 0.6, "Kış": 0.0}.get(season, 0.5)
    if growth > 0:
        gain = crop_cfg["yield"] / 12 * growth * _workers_mult(state, prop)
        prop["_growth"] = prop.get("_growth", 0) + gain
    if season == "Sonbahar" and prop.get("_growth", 0) > 0:
        ready = int(prop.pop("_growth", 0))
        if ready > 0:
            prop["pending_harvest"] = prop.get("pending_harvest", 0) + ready
            events.append(("mülk_hasat", t("mulk.hasat_hazir", name=prop["name"],
                                           qty=ready, crop=prop["config"].get("crop", "buğday"))))
    return 0.0


def _tick_dukkan(state, prop, loc, season, day, events):
    cfg = prop["config"]
    good = cfg.get("stock_good", "ekmek")
    market = loc.get("market", {})
    if good not in market:
        return 0.0
    m = market[good]
    margin = cfg.get("margin", 0.25)
    # Satış hacmi: nüfus + zenginlik; yüksek marj satışı kısar
    pop = max(10, loc.get("population", 50))
    base_volume = max(1, int(pop * 0.04 * (0.5 + loc.get("wealth", 50) / 100)))
    volume = max(0, int(base_volume * (1.2 - margin) * _workers_mult(state, prop)))
    # Tezgâh kapasitesi: tek dükkân sınırsız satamaz — işçi kapasite büyütür
    capacity = 15 + len(prop.get("workers", [])) * 8
    volume = min(volume, capacity, m["supply"])   # stok pazardan alınır — gerçek arz
    if volume <= 0:
        return 0.0
    buy_cost = m["price"] * volume
    revenue = m["price"] * (1 + margin) * volume
    m["supply"] = max(0, m["supply"] - volume)
    m["demand"] += volume
    return revenue - buy_cost


def _tick_islik(state, prop, loc, season, day, events):
    from production_chains import _recipe_profit, _inputs_available
    cfg = prop["config"]
    recipes = RECIPES.get(cfg.get("recipe_prof", "fırıncı"), [])
    recipe = next((r for r in recipes if r["id"] == cfg.get("recipe_id")), None)
    if not recipe:
        return 0.0
    market = loc.get("market", {})
    # İşlik zanaatkâr ister: işçisiz düşük tempo (sahip tek başına çıraklık eder)
    crew = max(0.3, (_workers_mult(state, prop) - 1.0) * 1.3 + 0.3)
    batches = int(recipe["batches"] * crew)
    done = 0
    for _ in range(batches):
        if not _inputs_available(recipe, market):
            break
        for g, q in recipe["input"].items():
            market[g]["supply"] -= q
            market[g]["demand"] += q
        out_good, out_qty = recipe["output"]
        market[out_good]["supply"] += out_qty
        done += 1
    if done == 0:
        events.append(("mülk_durgun", t("mulk.islik_hammadde_yok", name=prop["name"])))
        return 0.0
    profit = _recipe_profit(recipe, market)
    # Sahip payı: kalan kısım fire, aracı ve işletme gideri
    return max(0.0, (profit or 0) * done * 0.55)


def _tick_han(state, prop, loc, season, day, events):
    cfg = prop["config"]
    room_price = cfg.get("room_price", 5)
    pop = max(10, loc.get("population", 50))
    security = loc.get("security", 50)
    # Yolcu sayısı: nüfus + güvenlik + kervan geçişi; pahalı oda misafiri kaçırır
    caravan_bonus = len(loc.get("caravan_log", [])) * 3
    guests = max(0, int((pop * 0.06 + caravan_bonus)
                        * (security / 100)
                        * max(0.2, 1.4 - room_price / 12)
                        * _workers_mult(state, prop)))
    # Kapasite: oda sayısı sınırlı — işçi tutmak kapasiteyi büyütür
    capacity = 10 + len(prop.get("workers", [])) * 6
    guests = min(guests, capacity)
    revenue = guests * room_price
    guard_cost = cfg.get("guards", 0) * 5
    # Güvenliksiz han güvensiz bölgede soyulabilir
    if security < 30 and cfg.get("guards", 0) == 0 and random.random() < 0.10:
        loss = random.randint(20, 60)
        events.append(("mülk_soygun", t("mulk.han_soyuldu", name=prop["name"], loss=loss)))
        return revenue - guard_cost - loss
    return revenue - guard_cost


def _tick_ev(state, prop, loc, season, day, events):
    tier = prop["config"].get("tier", 1)
    tier_cfg = PROPERTY_TYPES["ev"]["tiers"][tier]
    rep = tier_cfg["rep_per_week"]
    if rep and state.get("turn", 0) % 4 == 0:   # ayda bir itibar işle (spam önleme)
        state["player"]["reputation"] = state["player"].get("reputation", 0) + rep
    return 0.0


_TICKERS = {
    "tarla": _tick_tarla, "dükkân": _tick_dukkan, "işlik": _tick_islik,
    "han": _tick_han, "ev": _tick_ev,
}


def property_world_tick(state, day):
    """Tüm oyuncu mülklerinin haftalık işleyişi. advance_time'dan çağrılır."""
    ensure_properties(state)
    if not state["properties"]:
        return
    from calendar_tr import season_for_turn
    from simulation import _push_event
    season = season_for_turn(state.get("turn", 0))
    player = state["player"]

    for prop in state["properties"]:
        loc = _loc_of(state, prop["location_id"])
        if not loc:
            continue
        events = []
        ptype = PROPERTY_TYPES[prop["type"]]

        # 1) Gelir — kondisyon düşükse işletme verimi düşer
        gross = _TICKERS[prop["type"]](state, prop, loc, season, day, events)
        condition_factor = 0.5 + prop.get("condition", 100) / 200
        if gross > 0:
            gross *= condition_factor

        # 2) Giderler: bakım + maaş + vali vergisi (para sink'leri)
        maintenance = ptype["maintenance"]
        wages = _wage_cost(state, prop)
        tax = max(0.0, gross) * _governance_tax_rate(state, prop["location_id"])
        net = gross - maintenance - wages - tax

        player["money"] = round(player.get("money", 0) + net, 1)
        prop["total_profit"] = round(prop.get("total_profit", 0) + net, 1)
        if abs(net) > 0.5:
            _ledger_push(prop, day, "haftalık", net,
                         f"gelir {gross:.0f} − bakım {maintenance} − maaş {wages:.0f} − vergi {tax:.0f}")

        # Maaşlar işçilerin servetine gider (para ekonomide kalır)
        for wid in prop.get("workers", []):
            npc = _npc_of(state, wid)
            if npc and npc.get("alive"):
                npc["wealth"] = round(npc.get("wealth", 0)
                                      + WORKER_WAGE_BASE * _worker_productivity(npc), 1)

        # 3) Kondisyon: bakım onarır, ayda bir doğal yıpranma + yağma riski
        prop["condition"] = min(100, prop.get("condition", 100) + 2)  # bakım ödendi
        if state.get("turn", 0) % 4 == 0:
            prop["condition"] = max(10, prop["condition"] - random.randint(1, 3))
        if loc.get("security", 50) < 20 and random.random() < 0.06:
            dmg = random.randint(*RAID_CONDITION_DAMAGE)
            prop["condition"] = max(5, prop["condition"] - dmg)
            events.append(("mülk_yağma", t("mulk.yagmalandi", name=prop["name"], dmg=dmg)))

        for etype, text in events:
            _push_event(state, day, etype, text)


def property_report(state):
    """Mülklerim sayfası için özet rapor."""
    ensure_properties(state)
    out = []
    for prop in state["properties"]:
        ptype = PROPERTY_TYPES[prop["type"]]
        workers = []
        for wid in prop.get("workers", []):
            npc = _npc_of(state, wid)
            if npc:
                workers.append({"id": wid, "name": npc["name"],
                                "profession": npc.get("profession"),
                                "alive": npc.get("alive", False),
                                "productivity": round(_worker_productivity(npc), 2)})
        entry = {
            **{k: prop[k] for k in ("id", "type", "name", "location_id", "location_name",
                                    "condition", "config", "purchased_turn", "total_profit")},
            "label": ptype["label"],
            "icon": ptype["icon"],
            "sale_value": property_value(prop),
            "maintenance": ptype["maintenance"],
            "max_workers": ptype["max_workers"],
            "workers": workers,
            "pending_harvest": prop.get("pending_harvest", 0),
            "ledger": list(reversed(prop.get("ledger", [])))[:12],
        }
        # GDD v8 D3: tarla defteri hasada dek eksi görünür — bekleyen değeri
        # göster ki oyuncu 'zarar ediyorum' sanmasın (büyüyen ekin + hasat)
        if prop["type"] == "tarla":
            loc = _loc_of(state, prop["location_id"])
            crop = prop["config"].get("crop", "buğday")
            birim = ((loc or {}).get("market", {}).get(crop, {}) or {}).get("price", 3)
            bekleyen = prop.get("pending_harvest", 0) + int(prop.get("_growth", 0))
            entry["bekleyen_hasat_degeri"] = round(bekleyen * birim, 1)
        if prop["type"] == "ev":
            tier = prop["config"].get("tier", 1)
            tiers = PROPERTY_TYPES["ev"]["tiers"]
            entry["tier_label"] = tiers[tier]["label"]
            entry["next_tier"] = (
                {"label": tiers[tier + 1]["label"], "cost": tiers[tier + 1]["upgrade_cost"]}
                if tier < 4 else None)
        out.append(entry)
    return out
