"""World simulation: weekly tick (1 turn = 1 week). Ages NPCs/player, marriages,
births, deaths, real economy, hunger, seasons, NPC profiles & rumors.
"""
import random
from world_gen import (
    new_id, MALE_NAMES, FEMALE_NAMES, SURNAMES, GOODS, GOOD_BASE_PRICES,
    PROFESSIONS_COMMON, PERSONALITY_TRAITS,
)
from narrative_engine import (
    narrate_death, narrate_birth, narrate_marriage,
    narrate_war, narrate_peace, narrate_famine,
    narrate_raid, narrate_festival, narrate_revolt, narrate_throne,
)
from calendar_tr import (
    WEEKS_PER_YEAR, SEASON_EFFECTS, season_for_turn, current_calendar, player_age,
)
from npc_profile import (
    ensure_profile, push_recent_event, npc_weekly_tick, recompute_mood,
)
from rumors import auto_rumors_from_events, seasonal_rumors
from world_events import tick_world_events

# Yiyecek öncelik sırası — en yüksek açlık giderenden başla
_FOOD_PRIORITY = ["et", "ekmek", "şarap", "şıra", "üzüm", "buğday"]
# Hangi envanter öğeleri yiyecek sayılır
_FOOD_ITEMS = {"et", "ekmek", "buğday", "şarap", "şıra", "üzüm"}


def _has_food(player):
    """Oyuncunun envanterinde yenebilir yiyecek var mı?"""
    inv = player.get("inventory") or {}
    return any(inv.get(k, 0) > 0 for k in _FOOD_ITEMS)


def _auto_eat(state, day):
    """
    Açlık 70'in altına düşünce envanterden otomatik yiyecek tüket.
    Yenilen öğeyi döndürür, yoksa None.
    """
    from items import apply_use_effects
    player = state["player"]
    if player.get("hunger", 100) >= 70:
        return None
    inv = player.setdefault("inventory", {})
    for food_key in _FOOD_PRIORITY:
        if inv.get(food_key, 0) > 0:
            inv[food_key] -= 1
            if inv[food_key] == 0:
                del inv[food_key]
            apply_use_effects(player, food_key, qty=1)
            return food_key
    return None


# Faz 1A: Üretim production_chains.py'a taşındı. PRODUCTION adı, oyuncunun
# "çalış" aksiyonu için game_routes tarafından import edilmeye devam ediyor.
from production_chains import PROFESSION_OUTPUT as PRODUCTION
from production_chains import run_raw_tick, run_craft_tick

PROFESSION_NEEDS = {
    "asker": [("silah", 1), ("zırh", 1)],
    "şövalye": [("silah", 1), ("zırh", 1)],
    "çiftçi": [("alet", 1)],
}


HISTORY_MAX = 300  # Son N event tutulur, eskisi atilir

def _push_event(state, day, etype, text, narrative=None, scope=None):
    event = {
        "id": new_id(),
        "day": day,
        "type": etype,
        "text": text,
    }
    if narrative:
        event["narrative"] = narrative  # Zengin, kişisel anlatı metni
    if scope:
        event["scope"] = scope  # "makro" | "kişisel" | "arkaplan"
    state["history"].append(event)
    # Uzun oyunlarda sismemeyi onle
    if len(state["history"]) > HISTORY_MAX:
        state["history"] = state["history"][-HISTORY_MAX:]
    # Chronicle ayri tutulur (ozet/kalici kayitlar icin)
    state.setdefault("chronicle", [])
    state["chronicle"].append(event.copy())
    state["chronicle"] = state["chronicle"][-250:]


# ── Olay kapsamı: bu haber oyuncunun dünyasına mı ait? ──────────────────
# "makro"   : hanedan/devlet haberi (sultan öldü, şehzade doğdu) — dünya feed'i
# "kişisel" : oyuncunun ailesi / dostu / düşmanı — günlüğe girer
# "arkaplan": sıradan NPC yaşamı — manşet, kulak misafiri ve günlükten gizlenir
_ROYAL_PROFESSIONS = ("kral", "veliaht")


def _player_family_ids(state):
    p = state.get("player", {})
    ids = set()
    if p.get("spouse_id"):
        ids.add(p["spouse_id"])
    ids.update(p.get("children_ids") or [])
    ids.update(p.get("parent_ids") or [])
    ids.update(p.get("sibling_ids") or [])
    return ids


def _npc_event_scope(state, *npcs):
    """Bir NPC yaşam olayının (doğum/ölüm/evlilik) oyuncu için kapsamı."""
    fam = _player_family_ids(state)
    rels = state.get("relationships", {})
    scope = "arkaplan"
    for n in npcs:
        if not n:
            continue
        if n.get("profession") in _ROYAL_PROFESSIONS:
            return "makro"
        nid = n.get("id")
        if (nid in fam or n.get("spouse_id") == "PLAYER"
                or "PLAYER" in (n.get("parent_ids") or [])
                or "PLAYER" in (n.get("children_ids") or [])):
            scope = "kişisel"
        elif abs(rels.get(nid, 0)) >= 25:
            scope = "kişisel"
    return scope


def _random_name(gender):
    given = random.choice(MALE_NAMES if gender == "erkek" else FEMALE_NAMES)
    return f"{given} {random.choice(SURNAMES)}"


def _ensure_market(loc):
    """Migrate old loc.prices to loc.market{good: {price, supply, demand, base}}.
    Also patches missing goods into existing markets (handles GOODS list updates)."""
    pop = loc.get("population", 100)
    if "market" not in loc or not loc["market"]:
        market = {}
        for g in GOODS:
            base = GOOD_BASE_PRICES[g]
            current_price = loc.get("prices", {}).get(g, base)
            market[g] = {
                "price": current_price,
                "base": base,
                "supply": max(5, int(pop * random.uniform(0.05, 0.15))),
                "demand": max(5, int(pop * random.uniform(0.05, 0.15))),
            }
        loc["market"] = market
        loc["prices"] = {g: market[g]["price"] for g in GOODS}
        return
    # Market var ama GOODS listesine sonradan eklenen mallar eksik olabilir — patch et
    for g in GOODS:
        if g not in loc["market"]:
            base = GOOD_BASE_PRICES[g]
            loc["market"][g] = {
                "price": base,
                "base": base,
                "supply": max(2, int(pop * random.uniform(0.02, 0.08))),
                "demand": max(2, int(pop * random.uniform(0.02, 0.08))),
            }


def _recompute_prices(loc, season=None, turn=None):
    """Faz 1C fiyat formülü:
    fiyat = baz × (talep/arz)^esneklik × servet × güvenlik × mevsim × olay_çarpanı
    """
    from balance_config import ECONOMY
    wealth_factor = 0.6 + (loc["wealth"] / 100)
    security_factor = 0.7 + (loc["security"] / 100) * 0.6
    season_table = {}
    if season:
        from market_events import SEASON_PRICE_MULT
        season_table = SEASON_PRICE_MULT.get(season, {})
    for g, m in loc["market"].items():
        ratio = m["demand"] / max(1, m["supply"])
        season_mult = season_table.get(g, 1.0)
        # Süreli piyasa olayı çarpanı (market_events.py yazar, burada düşer)
        event_mult = 1.0
        if m.get("event_mult") and turn is not None:
            if turn <= m.get("event_mult_until", 0):
                event_mult = m["event_mult"]
            else:
                m.pop("event_mult", None)
                m.pop("event_mult_until", None)
        target = (m["base"] * (ratio ** 0.45) * wealth_factor * security_factor
                  * season_mult * event_mult)
        # Smooth toward target
        m["price"] = round(max(0.5, m["price"] * 0.65 + target * 0.35), 2)
        # S3: Baz fiyat sınırlarını uygula (min_price_ratio / max_price_ratio)
        min_price = m["base"] * ECONOMY["min_price_ratio"]   # baz fiyatın en az %30'u
        max_price = m["base"] * ECONOMY["max_price_ratio"]   # baz fiyatın en fazla 3 katı
        m["price"] = round(max(min_price, min(max_price, m["price"])), 2)
    loc["prices"] = {g: loc["market"][g]["price"] for g in GOODS if g in loc["market"]}


def _ensure_npc_fields(npc):
    npc.setdefault("interactions", {})
    npc.setdefault("memory", [])
    npc.setdefault("personal_events", [])
    npc.setdefault("bounty", 0)
    npc.setdefault("turn_counter", 0)
    ensure_profile(npc)


def _repair_family_links(state):
    """Bozuk aile bağlarını onar: eş simetrisi, ölü eş bağları, soyadı birliği.
    Eski kayıtlardaki _link_family çift-atama hatasının izlerini temizler."""
    npcs = state["world"]["npcs"]
    by_id = {n["id"]: n for n in npcs}
    for n in npcs:
        if not n.get("alive", True):
            continue
        sid = n.get("spouse_id")
        if not sid or sid == "PLAYER":
            continue
        spouse = by_id.get(sid)
        if not spouse or not spouse.get("alive", True):
            n["spouse_id"] = None           # eşi yok/ölü → dul
            continue
        if spouse.get("spouse_id") is None:
            spouse["spouse_id"] = n["id"]   # tek yönlü bağ → simetriyi kur
        elif spouse.get("spouse_id") not in (n["id"], "PLAYER"):
            n["spouse_id"] = None           # üçgen: bu bağ geçersiz
    # Çocuk soyadı birliği: babası belli olan reşit olmayanlar
    for n in npcs:
        if not n.get("alive", True) or n.get("age", 99) >= 18:
            continue
        for pid in n.get("parent_ids", []):
            p = by_id.get(pid)
            if p and p.get("gender") == "erkek" and " " in p.get("name", ""):
                surname = p["name"].split()[-1]
                given = n["name"].split()[0]
                if not n["name"].endswith(" " + surname):
                    n["name"] = f"{given} {surname}"
                break


def _ensure_state_fields(state):
    state.setdefault("relationships", {})
    state.setdefault("quests", [])
    state.setdefault("day", 0)
    state.setdefault("turn", state.get("day", 0))  # legacy: day = turn (weeks)
    state.setdefault("history", [])
    state.setdefault("family_quests", [])
    state.setdefault("rumors", [])
    state.setdefault("world_events", [])
    state.setdefault("active_caravan", None)      # Adım 8: Kervan
    state.setdefault("caravan_history", [])       # Adım 8: Kervan geçmişi
    state.setdefault("pending_caravan_event", None)  # Adım 8: Kervan UI eventi
    state.setdefault("properties", [])            # Faz 1B: Mülk sahipliği
    state.setdefault("story_quests", [])          # Faz 2: Hikâye yayları
    state.setdefault("story_flags", {})
    state.setdefault("story_offers", [])
    p = state["player"]
    p.setdefault("crime", 0)
    p.setdefault("reputation", 0)
    p.setdefault("honor", 0)       # şeref
    p.setdefault("fear", 0)        # korku seviyesi
    p.setdefault("fame", 0)        # ün
    p.setdefault("wanted_in", [])
    p.setdefault("interaction_counts", {})
    p.setdefault("inv_quality", {})      # R3.2: mal başına kalite bayrağı
    p.setdefault("quality_intel", {})    # R3.2: incelenen partiler
    p.setdefault("hot_goods", {})        # R6.3: çalıntı mal işaretleri
    # R6: yarım kalmış icra sahnesi başka haftaya sarkmasın
    if state.get("pending_crime") and state["pending_crime"].get("turn") != state.get("turn"):
        state.pop("pending_crime", None)
    # R7: yarım kalmış yol eventi de öyle
    if state.get("pending_travel") and state["pending_travel"].get("turn") != state.get("turn"):
        state.pop("pending_travel", None)
    p.setdefault("dead", False)
    p.setdefault("hunger", 100)
    p.setdefault("base_age", p.get("age", 7))
    p.setdefault("stats", {"strength": 1, "intelligence": 1, "charisma": 1, "stamina": 2})
    p.setdefault("stat_xp", {"strength": 0, "intelligence": 0, "charisma": 0, "stamina": 0})
    p.setdefault("skills", {"combat": 0, "trade": 0, "crafting": 0, "social": 0})
    p.setdefault("skill_xp", {"combat": 0, "trade": 0, "crafting": 0, "social": 0})
    p.setdefault("buffs", {})
    p.setdefault("equipment", {"weapon": None, "head": None, "body": None,
                               "hands": None, "legs": None, "feet": None})
    p.setdefault("work_units", 0)  # 7 units = 1 week of work
    p.setdefault("relationship_status", {})  # {npc_id: "dating"|"married"}
    p.setdefault("stat_points", 0)
    p["age"] = player_age(state)
    for loc in state["world"]["locations"]:
        _ensure_market(loc)
    for npc in state["world"]["npcs"]:
        _ensure_npc_fields(npc)
    _repair_family_links(state)


# ---------- NPC life events ----------
def _age_and_die(state, day):
    """Weekly tick: 1/WEEKS_PER_YEAR chance to age per week (so ~1yr per cycle)."""
    age_chance = 1.0 / WEEKS_PER_YEAR
    for npc in [n for n in state["world"]["npcs"] if n["alive"]]:
        if random.random() < age_chance:
            npc["age"] += 1
            # BUG-1 FIX: çocuk büyüdüğünde meslek ata
            if npc["age"] >= 18 and npc.get("profession") == "çocuk":
                # Kalıtsal meslek bias: %50 ihtimalle ebeveyn mesleği devralınır
                parent_profs = []
                for pid in (npc.get("parent_ids") or []):
                    parent = next((p for p in state["world"]["npcs"] if p["id"] == pid), None)
                    if parent and parent.get("profession") not in ("çocuk", None, "kral", "veliaht"):
                        parent_profs.append(parent["profession"])
                if parent_profs and random.random() < 0.5:
                    npc["profession"] = random.choice(parent_profs)
                else:
                    npc["profession"] = random.choice(PROFESSIONS_COMMON)
                _push_event(state, day, "meslek_edinme",
                            f"{npc['name']} büyüdü ve {npc['profession']} mesleğini seçti.")
        # Slow health drift
        if random.random() < 0.08:
            npc["health"] = max(0, npc["health"] - random.randint(0, 1))
        death_chance = 0.0002 + max(0, (npc["age"] - 55)) * 0.0006
        if npc["health"] < 20:
            death_chance += 0.02
        if random.random() < death_chance:
            npc["alive"] = False
            # Dul kalan eşin bağı temizlenir — zamanla yeniden evlenebilir
            if npc.get("spouse_id") and npc["spouse_id"] != "PLAYER":
                widow = next((w for w in state["world"]["npcs"]
                              if w["id"] == npc["spouse_id"]), None)
                if widow:
                    widow["spouse_id"] = None
                    widow.setdefault("personal_events", []).append(
                        {"type": "eş_kaybı", "day": day, "of": npc["name"]})
            # Faction üye listelerinden temizle
            for fac in state["world"].get("factions", []):
                if npc["id"] in fac.get("members", []):
                    fac["members"].remove(npc["id"])
                # Lider öldüyse değiştir
                if fac.get("leader_id") == npc["id"]:
                    from faction_system import _trigger_leader_change
                    _trigger_leader_change(fac, state, day, reason="lider_öldü")
            # Notify family
            for nid in (npc.get("children_ids") or []) + ([npc.get("spouse_id")] if npc.get("spouse_id") else []):
                fam = next((x for x in state["world"]["npcs"] if x["id"] == nid and x["alive"]), None)
                if fam:
                    push_recent_event(fam, "spouse_lost" if fam.get("spouse_id") == npc["id"] else "friend_died", day)
            _scope = _npc_event_scope(state, npc)
            if npc.get("profession") == "kral":
                _death_text = (f"Sultan {npc['name']} ({npc['age']}) vefat etti — "
                               f"{npc['kingdom_name']} yasa büründü, taht boş kaldı.")
            elif npc.get("profession") == "veliaht":
                _death_text = (f"Şehzade {npc['name']} ({npc['age']}) genç yaşta vefat etti; "
                               f"{npc['kingdom_name']} sarayında kara haber.")
            else:
                _death_text = f"{npc['name']} ({npc['age']}) {npc['location_name']}'de hayata gözlerini yumdu."
            _push_event(state, day, "ölüm", _death_text,
                        narrative=narrate_death(npc, state["player"], state, day),
                        scope=_scope)
            # Mark relatives' personal events
            for rid in [npc["spouse_id"]] + list(npc["children_ids"]) + list(npc["parent_ids"]):
                if not rid or rid == "PLAYER":
                    continue
                rel = next((n for n in state["world"]["npcs"] if n["id"] == rid and n["alive"]), None)
                if rel:
                    kind = "eş_kaybı" if rid == npc["spouse_id"] else ("çocuk_kaybı" if rid in npc["children_ids"] else "ata_kaybı")
                    rel.setdefault("personal_events", []).append({
                        "type": kind, "day": day, "of": npc["name"],
                    })
                    # Mood drops
                    if rel["mood"] not in ("öfkeli",):
                        rel["mood"] = "umutsuz"
            # If npc was player's spouse
            if npc.get("spouse_id") == "PLAYER":
                state["player"]["spouse_id"] = None
            # Royal succession
            kingdom = next((k for k in state["world"]["kingdoms"] if k["king_id"] == npc["id"]), None)
            if kingdom:
                heir = next((n for n in state["world"]["npcs"] if n["id"] == kingdom.get("heir_id") and n["alive"]), None)
                # BUG-2 FIX: veliaht yoksa krallıktan yetişkin birini kral seç
                if not heir:
                    candidates = [n for n in state["world"]["npcs"]
                                  if n["alive"] and n.get("kingdom_id") == kingdom["id"]
                                  and n["age"] >= 18 and n.get("profession") not in ("kral", "çocuk")]
                    heir = random.choice(candidates) if candidates else None
                    crisis = True
                else:
                    crisis = False
                if heir:
                    heir["profession"] = "kral"
                    kingdom["king_id"] = heir["id"]
                    for fac in state["world"].get("factions", []):
                        if fac.get("leader_id") == npc["id"]:
                            fac["leader_id"] = heir["id"]
                            heir["faction_role"] = "lider"
                    if crisis:
                        _push_event(state, day, "tahta_çıkış",
                                    f"Veliaht yok! {heir['name']}, güç boşluğunu doldurarak "
                                    f"{kingdom['name']} tahtına geçti.")
                    else:
                        _push_event(state, day, "tahta_çıkış",
                                    f"{heir['name']}, {kingdom['name']} tahtına çıktı.")
                    # Yeni veliaht bul
                    new_heir = next(
                        (c for c in state["world"]["npcs"]
                         if c["alive"] and heir["id"] in c["parent_ids"]),
                        None,
                    )
                    if not new_heir:
                        heir_cands = [n for n in state["world"]["npcs"]
                                      if n["alive"] and n.get("kingdom_id") == kingdom["id"]
                                      and 16 <= n["age"] <= 35 and n.get("profession") != "kral"]
                        new_heir = random.choice(heir_cands) if heir_cands else None
                    if new_heir:
                        new_heir["profession"] = "veliaht"
                        kingdom["heir_id"] = new_heir["id"]
                else:
                    # BUG-2 FIX: Hiç uygun aday yoksa king_id temizle
                    kingdom["king_id"] = None
                    kingdom["heir_id"] = None
                    _push_event(state, day, "tahta_çıkış",
                                f"{kingdom['name']} kralsız kaldı; taht hâlâ boş.")


def _marry_and_birth(state, day):
    npcs = [n for n in state["world"]["npcs"] if n["alive"]]
    singles = [n for n in npcs if 20 <= n["age"] <= 45 and not n["spouse_id"]]
    random.shuffle(singles)
    used = set()
    for a in singles:
        if a["id"] in used:
            continue
        if random.random() > 0.04:
            continue
        for b in singles:
            if b["id"] == a["id"] or b["id"] in used:
                continue
            if b["gender"] == a["gender"]:
                continue
            if b["location_id"] != a["location_id"]:
                continue
            a["spouse_id"] = b["id"]
            b["spouse_id"] = a["id"]
            # Aile soyadı birliği: kadın, kocasının soyadını alır
            husband = a if a["gender"] == "erkek" else b
            wife = b if husband is a else a
            wife["name"] = f"{wife['name'].split()[0]} {husband['name'].split()[-1]}"
            a.setdefault("personal_events", []).append({"type": "evlilik", "day": day, "of": b["name"]})
            b.setdefault("personal_events", []).append({"type": "evlilik", "day": day, "of": a["name"]})
            push_recent_event(a, "spouse_married", day, b["name"])
            push_recent_event(b, "spouse_married", day, a["name"])
            used.add(a["id"]); used.add(b["id"])
            _scope = _npc_event_scope(state, a, b)
            if _scope == "makro":
                _wed_text = (f"Saray düğünü! {a['name']} ile {b['name']} dünya evine girdi; "
                             f"{a['location_name']}'de davullar yedi gün sustu mu bilinmez.")
            else:
                _wed_text = f"{a['name']} ile {b['name']}, {a['location_name']}'de dünya evine girdi."
            _push_event(state, day, "evlilik", _wed_text,
                        narrative=narrate_marriage(a, b, state["player"], state),
                        scope=_scope)
            break

    couples_seen = set()
    for a in npcs:
        if not a["spouse_id"] or a["gender"] != "kadın":
            continue
        # Allow player spouses to participate in birth system
        if False and a["spouse_id"] == "PLAYER":
            continue
        key = tuple(sorted([a["id"], a["spouse_id"]]))
        if key in couples_seen:
            continue
        couples_seen.add(key)
        if a["age"] > 42:
            continue
        if random.random() < 0.05:
            partner = next((p for p in npcs if p["id"] == a["spouse_id"]), None)
            if not partner:
                continue
            gender = random.choice(["erkek", "kadın"])
            family_surname = partner["name"].split()[-1] if partner["gender"] == "erkek" \
                else a["name"].split()[-1]
            given = random.choice(MALE_NAMES if gender == "erkek" else FEMALE_NAMES)
            child = {
                "id": new_id(),
                "name": f"{given} {family_surname}",
                "gender": gender, "age": 0, "profession": "çocuk",
                "personality": random.sample(PERSONALITY_TRAITS, 2),
                "wealth": 0, "health": 90,
                "kingdom_id": a["kingdom_id"], "kingdom_name": a["kingdom_name"],
                "religion": a["religion"], "location_id": a["location_id"],
                "location_name": a["location_name"],
                "spouse_id": None, "children_ids": [],
                "parent_ids": [a["id"], partner["id"]],
                "friend_ids": [], "rival_ids": [],
                "goal": "büyümek", "mood": "huzurlu", "alive": True,
                "interactions": {}, "memory": [], "personal_events": [],
                "bounty": 0, "turn_counter": 0,
            }
            a["children_ids"].append(child["id"])
            partner["children_ids"].append(child["id"])
            a["personal_events"].append({"type": "doğum", "day": day, "of": child["name"]})
            partner.setdefault("personal_events", []).append({"type": "doğum", "day": day, "of": child["name"]})
            push_recent_event(a, "child_born", day, child["name"])
            push_recent_event(partner, "child_born", day, child["name"])
            state["world"]["npcs"].append(child)
            _scope = _npc_event_scope(state, a, partner)
            if _scope == "makro":
                _unvan = "şehzade" if gender == "erkek" else "sultan kızı"
                _birth_text = (f"Sarayda müjde: bir {_unvan} doğdu! {child['name']}, "
                               f"{a['kingdom_name']} hanedanına katıldı.")
            else:
                _birth_text = f"{a['name']} ve {partner['name']}'in çocuğu {child['name']} doğdu."
            _push_event(state, day, "doğum", _birth_text,
                        narrative=narrate_birth(child, a, state["player"], state, day),
                        scope=_scope)


# ---------- Economy ----------
def _economy_tick(state, day):
    season = season_for_turn(state.get("turn", 0))
    prod_mult = SEASON_EFFECTS[season]["production_mult"]
    npcs_by_loc = {}
    for n in state["world"]["npcs"]:
        if not n["alive"]:
            continue
        npcs_by_loc.setdefault(n["location_id"], []).append(n)

    from balance_config import CONSUMPTION

    for loc in state["world"]["locations"]:
        _ensure_market(loc)
        local_npcs = npcs_by_loc.get(loc["id"], [])
        pop = max(10, loc.get("population", 50))

        # ── Faz 1A: Gerçek üretim — sihirli spawn yok ────────────────────
        # 1) Hammadde üreticileri (çiftçi, çoban, madenci, oduncu…)
        run_raw_tick(loc, local_npcs, prod_mult, random)
        # 2) Zanaatkâr dönüşümleri (un→ekmek, cevher→demir→silah…)
        craft = run_craft_tick(loc, local_npcs, prod_mult, random)
        # Hammadde bulamayan zanaatkârlar — seyrek event (spam önleme)
        if craft["starved"] and random.random() < 0.06:
            from locales import t
            _push_event(state, day, "zanaat_durgun",
                        t("uretim.zanaat_durgun", loc=loc["name"],
                          profession=random.choice(craft["starved"])))

        # ── Nüfus tüketimi: talep yaratır, arzı düşürür ──────────────────
        wealth_mult = 0.4 + loc.get("wealth", 50) / 60  # zengin şehir lüks tüketir
        for good, cfg in CONSUMPTION.items():
            if good not in loc["market"]:
                continue
            frac = cfg["frac"] * (wealth_mult if cfg["wealth_scaled"] else 1.0)
            consume = max(1, int(pop * frac))
            loc["market"][good]["demand"] += consume
            loc["market"][good]["supply"] = max(0, loc["market"][good]["supply"] - consume)

        # NPC ihtiyaçları (asker silah/zırh, çiftçi alet ister)
        for n in local_npcs:
            for good, amt in PROFESSION_NEEDS.get(n["profession"], []):
                if good in loc["market"]:
                    loc["market"][good]["demand"] += amt

        # Decay demand & supply slightly (memory effect)
        for good in GOODS:
            if good not in loc["market"]:
                continue  # Eski kayıtta eksik mal — _ensure_market sonraki turda ekleyecek
            m = loc["market"][good]
            m["demand"] = int(m["demand"] * 0.85)
            m["supply"] = int(m["supply"] * 0.90)
            # Floors
            m["demand"] = max(1, m["demand"])
            m["supply"] = max(0, m["supply"])

        _recompute_prices(loc, season=season, turn=day)

        # R3.2: Zanaat mallarının haftalık parti kalitesi
        from quality import tick_market_quality
        tick_market_quality(loc, day)

        # AÇLIK CASCADE: Buğday veya ekmek arzı sıfırda kalırsa şehir cezalanır
        wheat_out = loc["market"]["buğday"]["supply"] == 0
        bread_out = loc["market"]["ekmek"]["supply"] == 0
        if wheat_out or bread_out:
            loc["wealth"]   = max(5, loc["wealth"]   - random.randint(3, 8))
            loc["security"] = max(5, loc["security"] - random.randint(2, 6))
            loc["population"] = max(10, loc.get("population", 50) - random.randint(0, 1))
            shortage_good = "buğday" if wheat_out else "ekmek"
            from locales import t
            _push_event(state, day, "kıtlık_etkisi",
                        t("uretim.kitlik_etkisi", loc=loc["name"], good=shortage_good))

        # FİYAT GEÇMİŞİ: Her 4 turda bir snapshot al (son 12 kayıt = 3 aylık veri)
        turn = state.get("turn", 0)
        if turn % 4 == 0:
            snap = {g: round(loc["market"][g]["price"], 1) for g in GOODS if g in loc["market"]}
            snap["turn"] = turn
            snap["season"] = season  # S4: mevsim etiketi eklendi
            hist = loc.setdefault("price_history", [])
            hist.append(snap)
            if len(hist) > 12:
                loc["price_history"] = hist[-12:]

        # Slow drift on wealth/security
        loc["wealth"] = max(5, min(100, loc["wealth"] + random.randint(-2, 2)))
        loc["security"] = max(5, min(100, loc["security"] + random.randint(-3, 3)))
        loc["prosperity"] = max(5, min(100, round((loc["wealth"] + loc["security"]) / 2)))

    # S6: Haftalık enflasyon — baz fiyatları çok küçük miktarda artır
    from balance_config import ECONOMY
    inflation = ECONOMY["inflation_per_week"]  # 0.001 = %0.1
    for loc in state["world"]["locations"]:
        for g in loc.get("market", {}):
            loc["market"][g]["base"] = round(
                loc["market"][g]["base"] * (1 + inflation), 3
            )

    # NPC merchant arbitrage: pick a few merchants, move 1 unit from cheap loc to expensive loc
    merchants = [n for n in state["world"]["npcs"] if n["alive"] and n["profession"] == "tüccar"]
    random.shuffle(merchants)
    for m in merchants[:min(8, len(merchants))]:
        good = random.choice(GOODS)
        # Find cheapest and most expensive locations for this good
        priced = [(l, l["market"][good]["price"]) for l in state["world"]["locations"]]
        cheap = min(priced, key=lambda x: x[1])
        expensive = max(priced, key=lambda x: x[1])
        if expensive[1] > cheap[1] * 1.2 and cheap[0]["market"][good]["supply"] > 5:
            qty = random.randint(1, 5)
            cheap[0]["market"][good]["supply"] = max(0, cheap[0]["market"][good]["supply"] - qty)
            expensive[0]["market"][good]["supply"] += qty
            expensive[0]["market"][good]["demand"] = max(1, expensive[0]["market"][good]["demand"] - qty // 2)
            _recompute_prices(cheap[0])
            _recompute_prices(expensive[0])
            # BUG-4 FIX: Tüccarın fiziksel konumunu güncelle (hedef şehre taşı)
            dest = expensive[0]
            m["location_id"]   = dest["id"]
            m["location_name"] = dest.get("name", m.get("location_name", ""))


# ---------- World events ----------
def _random_events(state, day):
    if random.random() < 0.08:
        loc = random.choice(state["world"]["locations"])
        loc["security"] = max(5, loc["security"] - random.randint(5, 20))
        _push_event(state, day, "haydut_baskını",
                    f"Haydutlar {loc['name']}'i bastı. Güvenlik düştü.",
                    narrative=narrate_raid(loc["name"]))
    # Kötü hasat / kıtlık artık market_events.py havuzundan tetikleniyor (Faz 1C)
    if random.random() < 0.04 and len(state["world"]["kingdoms"]) > 1:
        k1, k2 = random.sample(state["world"]["kingdoms"], 2)
        if k2["id"] not in k1["at_war_with"]:
            k1["at_war_with"].append(k2["id"])
            k2["at_war_with"].append(k1["id"])
            _push_event(state, day, "savaş_ilanı",
                        f"{k1['name']} ile {k2['name']} arasında savaş ilan edildi!",
                        narrative=narrate_war(k1["name"], k2["name"]))
            # War drives weapon demand
            for loc in state["world"]["locations"]:
                if loc["kingdom_id"] in (k1["id"], k2["id"]):
                    loc["market"]["silah"]["demand"] += 30
                    _recompute_prices(loc)
            # ASKER HAREKETİ: Her iki krallıktan birkaç asker düşmanın toprağına taşın
            for attacker_k, defender_k in [(k1, k2), (k2, k1)]:
                enemy_locs = [l for l in state["world"]["locations"]
                              if l["kingdom_id"] == defender_k["id"]]
                if not enemy_locs:
                    continue
                soldiers = [n for n in state["world"]["npcs"]
                            if n["alive"] and n.get("kingdom_id") == attacker_k["id"]
                            and n["profession"] in ("asker", "şövalye", "general")]
                random.shuffle(soldiers)
                front = random.choice(enemy_locs)
                for s in soldiers[:min(3, len(soldiers))]:
                    s["location_id"]   = front["id"]
                    s["location_name"] = front["name"]
            _push_event(state, day, "savaş_hareketi",
                        f"{k1['name']} ve {k2['name']} kuvvetleri cephe hatlarına konuşlandı.")
    if random.random() < 0.03:
        wars = [(k1, k2_id) for k1 in state["world"]["kingdoms"] for k2_id in k1["at_war_with"]]
        if wars:
            k1, k2_id = random.choice(wars)
            k2 = next((k for k in state["world"]["kingdoms"] if k["id"] == k2_id), None)
            if k2:
                k1["at_war_with"] = [x for x in k1["at_war_with"] if x != k2_id]
                k2["at_war_with"] = [x for x in k2["at_war_with"] if x != k1["id"]]
                _push_event(state, day, "barış",
                            f"{k1['name']} ile {k2['name']} arasında barış imzalandı.",
                            narrative=narrate_peace(k1["name"], k2["name"]))
                # Barış: askerleri kendi krallık topraklarına geri çek
                for home_k in (k1, k2):
                    home_locs = [l for l in state["world"]["locations"]
                                 if l["kingdom_id"] == home_k["id"]]
                    if not home_locs:
                        continue
                    home = random.choice(home_locs)
                    for s in state["world"]["npcs"]:
                        if (s["alive"] and s.get("kingdom_id") == home_k["id"]
                                and s["profession"] in ("asker", "şövalye", "general")
                                and s.get("location_id") not in [l["id"] for l in home_locs]):
                            s["location_id"]   = home["id"]
                            s["location_name"] = home["name"]
    if random.random() < 0.02:
        k = random.choice(state["world"]["kingdoms"])
        k["stability"] = max(10, k["stability"] - random.randint(5, 20))
        _push_event(state, day, "isyan",
                    f"{k['name']}'de bir lord isyan etti. İstikrar sarsıldı.",
                    narrative=narrate_revolt(k["name"]))

    # ── Doğal istikrar toparlanması ──
    # Savaşta olmayan krallıklar yavaşça toparlanır; uzun oyunlarda min'e yuvarlanmayı önler.
    for k in state["world"]["kingdoms"]:
        if k["stability"] < 80 and not k.get("at_war_with"):
            k["stability"] = min(80, k["stability"] + random.randint(1, 2))
    # %1 ihtimalle bir krallık barış ve refah dönemi yaşar (+5..+15)
    if random.random() < 0.01:
        peaceful = [k for k in state["world"]["kingdoms"] if not k.get("at_war_with")]
        if peaceful:
            k = random.choice(peaceful)
            gain = random.randint(5, 15)
            k["stability"] = min(100, k["stability"] + gain)
            _push_event(state, day, "istikrar_artışı",
                        f"{k['name']}'de barış ve refah dönemi: istikrar +{gain}.")
    if random.random() < 0.05:
        loc = random.choice(state["world"]["locations"])
        loc["prosperity"] = min(100, loc["prosperity"] + random.randint(2, 10))
        _push_event(state, day, "şenlik",
                    f"{loc['name']}'de bir şenlik düzenlendi. Halk neşelendi.",
                    narrative=narrate_festival(loc["name"]))

    # NPC GÖÇÜ: Güvenliği düşük şehirlerden yetişkinler daha güvenli yerlere taşınır
    unsafe = [l for l in state["world"]["locations"] if l["security"] < 25]
    safe_locs = [l for l in state["world"]["locations"] if l["security"] >= 50]
    if unsafe and safe_locs and random.random() < 0.15:
        src = random.choice(unsafe)
        dst = random.choice(safe_locs)
        migrants = [n for n in state["world"]["npcs"]
                    if n["alive"] and n["location_id"] == src["id"]
                    and n["profession"] not in ("asker", "şövalye", "kral", "veliaht", "lord", "general")
                    and n["age"] >= 18]
        random.shuffle(migrants)
        count = 0
        for m in migrants[:random.randint(1, 3)]:
            m["location_id"]   = dst["id"]
            m["location_name"] = dst["name"]
            count += 1
        if count:
            # Nüfus güncelle: kaynak şehir düşer, hedef şehir artar
            src["population"] = max(10, src.get("population", 50) - count)
            dst["population"] = dst.get("population", 50) + count
            _push_event(state, day, "göç",
                        f"{src['name']}'deki güvensizlik {count} kişiyi {dst['name']}'e göç ettirdi.")


def _expire_old_quests(state, current_turn):
    """FIX-10: Belirli süre geçen açık görevleri kapatır."""
    QUEST_LIFESPAN = 20  # hafta
    for q in state.get("quests", []):
        if q.get("status") == "açık":
            age = current_turn - q.get("created_day", 0)
            if age > QUEST_LIFESPAN:
                q["status"] = "süresi_doldu"


def _generate_quest(state, day):
    active = [q for q in state.get("quests", []) if q["status"] == "açık"]
    if len(active) >= 5:
        return
    quest_templates = [
        ("kayıp_çocuk", "{loc}'de bir çocuk kayboldu. Aileye yardım et.", 50, 80),
        ("mektup", "{loc}'den {loc2}'ye acil bir mektup ulaştırılacak.", 30, 50),
        ("ticaret_fırsatı", "{loc}'de {good} fiyatı düşük. Başka şehirde sat.", 0, 100),
        ("haydut_yuvası", "{loc} yakınlarında bir haydut yuvası var. Temizle.", 100, 200),
        ("yardım", "{loc}'de hasta bir yaşlı şifalı ot bekliyor.", 20, 40),
        ("isyan_hazırlığı", "{loc}'de gizli bir isyan toplantısı var. Sızabilirsin.", 150, 300),
    ]
    n_new = random.randint(0, 2)
    for _ in range(n_new):
        tpl = random.choice(quest_templates)
        locs = state["world"]["locations"]
        loc = random.choice(locs)
        loc2 = random.choice([l for l in locs if l["id"] != loc["id"]])
        good = random.choice(GOODS)
        text = tpl[1].format(loc=loc["name"], loc2=loc2["name"], good=good)
        reward = random.randint(tpl[2], tpl[3]) if tpl[2] < tpl[3] else 50
        state.setdefault("quests", []).append({
            "id": new_id(), "type": tpl[0],
            "title": tpl[1].split(".")[0].format(loc=loc["name"], loc2=loc2["name"], good=good),
            "description": text,
            "location_id": loc["id"], "location_name": loc["name"],
            "reward": reward, "status": "açık", "created_day": day,
        })


def _npc_profile_tick(state, day):
    """Each living NPC gets a daily_life activity + small mood drift + maybe a recent_event."""
    rng = random.Random(day * 7919)
    for n in state["world"]["npcs"]:
        if not n["alive"]:
            continue
        ensure_profile(n)
        npc_weekly_tick(n, state, rng)


def _family_support_tick(state, day):
    """Child player (< 13) gets weekly support from living parents."""
    player = state["player"]
    if player["age"] >= 13:
        return
    parent_ids = player.get("parent_ids") or []
    living_parents = [n for n in state["world"]["npcs"] if n["id"] in parent_ids and n["alive"]]
    if not living_parents:
        return
    bread = 0
    coin = 0
    for parent in living_parents:
        # Each parent contributes based on their wealth
        if random.random() < 0.85:
            bread += 1
        if parent.get("savings", 0) > 10:
            give = random.randint(1, 3)
            coin += give
            parent["savings"] = max(0, parent.get("savings", 0) - give)
    if bread > 0:
        inv = player.setdefault("inventory", {})
        inv["ekmek"] = inv.get("ekmek", 0) + bread
    if coin > 0:
        player["money"] = round(player["money"] + coin, 1)
    if bread > 0 or coin > 0:
        _push_event(state, day, "aile_destek",
                    f"Ailen sana baktı: +{bread} ekmek, +{coin} altın.")


def _player_tick(state):
    """Weekly tick for player: hunger, age, buffs decay."""
    player = state["player"]
    season = season_for_turn(state.get("turn", 0))
    hunger_mult = SEASON_EFFECTS[season]["hunger_mult"]
    # Hunger -5 per week (modified by season). Stamina passive lowers loss slightly.
    sta = player.get("stats", {}).get("stamina", 1)
    loss = max(2, int(round(5 * hunger_mult - sta * 0.15)))
    player["hunger"] = max(0, player.get("hunger", 100) - loss)
    # Starvation damage
    if player["hunger"] <= 0:
        player["health"] = max(0, player["health"] - 2)
    else:
        # Slow regen
        player["health"] = min(100, player["health"] + 1)
    # Update derived age
    player["age"] = player_age(state)
    # Decay temporary buffs
    buffs = player.get("buffs") or {}
    for k in list(buffs.keys()):
        buffs[k] = max(0, buffs[k] - 1) if buffs[k] > 0 else min(0, buffs[k] + 1)
        if buffs[k] == 0:
            buffs.pop(k, None)
    # Death by old age
    if player["age"] > 70 and random.random() < 0.02:
        player["dead"] = True
    if player["health"] <= 0:
        player["dead"] = True
    # Faction rank bonusu: rank 1+ → haftalık +2 altın, rank 3+ → +5 altın
    rank = player.get("faction_rank", 0)
    if player.get("faction_id") and rank >= 1:
        bonus = 5 if rank >= 3 else 2
        player["money"] = round(player.get("money", 0) + bonus, 1)
        _push_event(state, state.get("turn", 0), "rank_bonusu",
                    f"Faction rütbesi bonusu: +{bonus} altın.")


# ---------- Yabancı işgal sistemi ----------
# İşgalci ülke isimleri — oyun dünyasındaki krallıklardan farklı, dışarıdan geliyorlar
_INVADER_KINGDOMS = [
    "Kızıl Bozkır Hanlığı", "Tunç Denizi İmparatorluğu", "Sis Ötesi Konfederasyonu",
    "Kara Orman Kabileleri", "Demir Dağ Sultanlığı", "Yedi Nehir Birliği",
    "Güneş Tapınağı Devleti", "Gümüş Hilal Emirliği", "Derin Vadi Cumhuriyeti",
    "Bozkır Kartalları Beyliği", "Taş Taht Sultanlığı", "Kuzey Buz Hanedanı",
]

_INVASION_PROFESSIONS = ["asker", "asker", "asker", "şövalye", "general", "haydut", "tüccar"]

_INVASION_GOALS = [
    "toprak fethetmek", "yağma yapmak", "kökleri kazımak",
    "yeni yurt edinmek", "intikam almak", "hazine ele geçirmek",
]

_INVASION_MIN_NPC   = 20   # Bu sayının altına düşünce tetikler
_INVASION_WAVE_SIZE = 15   # Her dalgada kaç NPC gelir


def _invasion_check(state, day):
    """Canlı NPC sayısı _INVASION_MIN_NPC'nin altına düştüğünde
    dışarıdan işgalci bir dalga gelir ve en az nüfuslu konuma yerleşir."""

    alive_count = sum(1 for n in state["world"]["npcs"] if n.get("alive"))
    if alive_count >= _INVASION_MIN_NPC:
        return

    # Aynı tur içinde zaten bir dalga geldiyse bir daha tetikleme
    if state.get("_last_invasion_turn") == day:
        return

    state["_last_invasion_turn"] = day

    locations = state["world"]["locations"]
    if not locations:
        return

    # En boş konumu bul (canlı NPC'si en az olan)
    def npc_count(loc):
        return sum(1 for n in state["world"]["npcs"]
                   if n.get("alive") and n["location_id"] == loc["id"])

    target_loc = min(locations, key=npc_count)

    # Oyun dünyasındaki mevcut krallık isimlerinden farklı bir isim seç
    existing_kingdoms = {k["name"] for k in state["world"]["kingdoms"]}
    available = [n for n in _INVADER_KINGDOMS if n not in existing_kingdoms]
    if not available:
        available = _INVADER_KINGDOMS  # tümü kullanılmışsa yine de devam et
    invader_kingdom_name = random.choice(available)

    # İşgalcilerin dini ve kültürü rastgele — bilinçli olarak farklı
    from world_gen import KINGDOM_RELIGIONS
    invader_religion  = random.choice(KINGDOM_RELIGIONS)
    invader_kingdom_id = new_id()   # sahte bir id, dünya kingdoms listesine eklenmez

    # Dalga oluştur
    wave = []
    # Önce bir komutan
    commander_gender = "erkek"
    commander = {
        "id": new_id(),
        "name": _random_name(commander_gender),
        "gender": commander_gender,
        "age": random.randint(30, 55),
        "profession": "general",
        "personality": random.sample(PERSONALITY_TRAITS, 2),
        "wealth": random.randint(2000, 8000),
        "health": random.randint(75, 100),
        "kingdom_id": invader_kingdom_id,
        "kingdom_name": invader_kingdom_name,
        "religion": invader_religion,
        "location_id": target_loc["id"],
        "location_name": target_loc["name"],
        "spouse_id": None,
        "children_ids": [],
        "parent_ids": [],
        "friend_ids": [],
        "rival_ids": [],
        "goal": "toprak fethetmek",
        "mood": "kararlı",
        "alive": True,
        "interactions": {},
        "memory": [],
        "personal_events": [],
        "bounty": 0,
        "turn_counter": 0,
        "is_invader": True,             # işgalci bayrağı
        "invader_kingdom": invader_kingdom_name,
    }
    wave.append(commander)

    # Geri kalan askerler
    for _ in range(_INVASION_WAVE_SIZE - 1):
        gender = random.choice(["erkek", "kadın"])
        prof   = random.choice(_INVASION_PROFESSIONS)
        npc = {
            "id": new_id(),
            "name": _random_name(gender),
            "gender": gender,
            "age": random.randint(18, 45),
            "profession": prof,
            "personality": random.sample(PERSONALITY_TRAITS, 2),
            "wealth": random.randint(50, 800),
            "health": random.randint(70, 100),
            "kingdom_id": invader_kingdom_id,
            "kingdom_name": invader_kingdom_name,
            "religion": invader_religion,
            "location_id": target_loc["id"],
            "location_name": target_loc["name"],
            "spouse_id": None,
            "children_ids": [],
            "parent_ids": [],
            "friend_ids": [],
            "rival_ids": [],
            "goal": random.choice(_INVASION_GOALS),
            "mood": random.choice(["kararlı", "öfkeli", "hırslı"]),
            "alive": True,
            "interactions": {},
            "memory": [],
            "personal_events": [],
            "bounty": 0,
            "turn_counter": 0,
            "is_invader": True,
            "invader_kingdom": invader_kingdom_name,
        }
        wave.append(npc)

    state["world"]["npcs"].extend(wave)

    _push_event(
        state, day, "işgal",
        f"Bilinmeyen diyarlardan {invader_kingdom_name} güçleri {target_loc['name']}'e ulaştı! "
        f"Komutan {commander['name']} önderliğinde {_INVASION_WAVE_SIZE} kişilik bir kuvvet "
        f"şehre girdi. Halk panikte, dünya değişiyor.",
    )



# ─── KERVAN SİSTEMİ ────────────────────────────────────────────────────────
_CARAVAN_TICK_EVERY = 3  # Her 3 turda bir tüccarlar rota adımı atar

def _caravan_tick(state, day):
    """Tüccarların A→B→C→A döngüsel ticaret rotası.
    Her tüccar için location listesi üzerinde bir sonraki adıma geçilir.
    """
    if state.get("turn", 0) % _CARAVAN_TICK_EVERY != 0:
        return
    locs = state["world"]["locations"]
    if len(locs) < 2:
        return
    loc_ids = [l["id"] for l in locs]

    merchants = [n for n in state["world"]["npcs"]
                 if n["alive"] and n["profession"] == "tüccar"]
    for m in merchants:
        # Her tüccarın kişisel rota indeksi (kalıcı)
        if "caravan_route_idx" not in m:
            m["caravan_route_idx"] = loc_ids.index(m["location_id"]) if m["location_id"] in loc_ids else 0
        # Bir sonraki durağa geç
        m["caravan_route_idx"] = (m["caravan_route_idx"] + 1) % len(loc_ids)
        dest_id = loc_ids[m["caravan_route_idx"]]
        dest    = next((l for l in locs if l["id"] == dest_id), None)
        if dest and dest_id != m["location_id"]:
            # Küçük ekonomik etki: kalkış şehrinden mal alıp varış şehrine bırak
            src = next((l for l in locs if l["id"] == m["location_id"]), None)
            if src:
                good = random.choice(GOODS)
                qty  = random.randint(2, 8)
                src["market"][good]["supply"]  = max(0, src["market"][good]["supply"] - qty)
                dest["market"][good]["supply"] += qty
                _recompute_prices(src)
                _recompute_prices(dest)
            m["location_id"]   = dest["id"]
            m["location_name"] = dest.get("name", "")
            # Kervan geçişini konuma kaydet (CityDetail için)
            dest.setdefault("caravan_log", []).append({
                "npc_id":   m["id"],
                "npc_name": m["name"],
                "day":      day,
            })
            dest["caravan_log"] = dest["caravan_log"][-10:]  # son 10 geçiş


# BUG-3 FIX: Ölü NPC hafıza temizleyici
_DEAD_NPC_PRUNE_EVERY = 10   # Her 10 turda bir çalışır (performans)
def _prune_dead_npcs(state):
    """Ölmüş NPC kayıtlarını küçült: büyük alanları sil, sadece minimal kimlik bırak."""
    turn = state.get("turn", 0)
    if turn % _DEAD_NPC_PRUNE_EVERY != 0:
        return
    pruned = []
    for npc in state["world"]["npcs"]:
        if npc.get("alive", True):
            pruned.append(npc)
        else:
            # Büyük alanları temizle, tanımlayıcı bilgileri koru
            pruned.append({
                "id":         npc["id"],
                "name":       npc.get("name", "?"),
                "alive":      False,
                "age":        npc.get("age", 0),
                "profession": npc.get("profession", "?"),
                "gender":     npc.get("gender", "?"),
                "kingdom_id": npc.get("kingdom_id"),
                "location_id": npc.get("location_id"),
            })
    state["world"]["npcs"] = pruned

    # A-1: Ölü NPC'lerin relationships kayıtlarını temizle
    living_ids = {n["id"] for n in state["world"]["npcs"] if n.get("alive", True)}
    if "relationships" in state:
        state["relationships"] = {
            k: v for k, v in state["relationships"].items()
            if k in living_ids
        }


def advance_time(state, weeks=1, days=None):
    """Advance the world by N weeks. `days` kept for backwards compatibility (1 day = 1/7 week)."""
    _ensure_state_fields(state)
    if days is not None and weeks == 1:
        # Legacy days input
        weeks = max(1, int(round(days / 7)))
    weeks = max(1, int(weeks))
    state.pop("advance_early_stop", None)  # önceki erken durma temizle
    for week_i in range(weeks):
        state["turn"] = state.get("turn", 0) + 1
        state["day"] = state["turn"]
        day = state["turn"]
        prev_history_len = len(state.get("history", []))
        _age_and_die(state, day)
        _marry_and_birth(state, day)
        # BUG-3 FIX: Ölü NPC'leri küçült — memory/interactions alanlarını temizle, sadece kimlik bırak
        _prune_dead_npcs(state)
        _economy_tick(state, day)
        # Kervan rotaları tick
        _caravan_tick(state, day)
        _random_events(state, day)
        # Faz 1C: Piyasa olayları havuzu
        try:
            from market_events import tick_market_events
            tick_market_events(state, day)
        except Exception:
            pass
        _generate_quest(state, day)
        # FIX-10: Süresi geçen görevleri kapat
        _expire_old_quests(state, day)
        tick_world_events(state, day)
        _npc_profile_tick(state, day)
        _family_support_tick(state, day)
        _invasion_check(state, day)
        _player_tick(state)
        # Otomatik yeme: açlık 70 altına düşünce envanterden yiyecek tüket
        eaten = _auto_eat(state, day)
        if eaten:
            _push_event(state, day, "iyileşme",
                        f"Acıkınca envanterinden {eaten} yedin.")
        # Erken durma: açlık kritik (< 20) ve yiyecek kalmadı
        player = state["player"]
        if player.get("hunger", 100) < 20 and not _has_food(player) and weeks > 1:
            state["advance_early_stop"] = {
                "week_done": week_i + 1,
                "total": weeks,
                "reason": "Yiyecek stoğun tükendi ve açlık kritik seviyeye düştü. Zaman atlaması durduruldu.",
            }
            break
        # Life Event tetikleme (%30 ihtimalle haftalık)
        try:
            from life_events import maybe_trigger_life_event
            maybe_trigger_life_event(state)
        except Exception:
            pass
        # Faction & Bölge Kontrol sistemi tick
        try:
            from faction_system import faction_world_tick
            faction_world_tick(state, day)
        except Exception:
            pass
        # Şehir Yönetimi tick
        try:
            from city_governance import governance_world_tick, ensure_governances
            ensure_governances(state)
            governance_world_tick(state, day)
        except Exception:
            pass
        # Mektep haftalık tick (çocuk oyuncular için)
        try:
            from school import weekly_school_tick
            weekly_school_tick(state)
        except Exception:
            pass
        # Game engine: NPC routines + crime decay
        try:
            from game_engine import run_npc_daily_routines, apply_crime_decay
            run_npc_daily_routines(state, day)
            apply_crime_decay(state)
        except Exception:
            pass
        # Mülk sahipliği haftalık tick (Faz 1B)
        try:
            from property_system import property_world_tick
            property_world_tick(state, day)
        except Exception:
            pass
        # Hikâye yayları tick (Faz 2)
        try:
            from quest_engine import tick_story
            tick_story(state, day)
        except Exception:
            pass
        # Yaralanma iyileşmesi (Faz 3)
        try:
            from combat_engine import injury_tick
            injury_tick(state)
        except Exception:
            pass
        # Aile 2.0, hanedan, çağ olayları (Faz 4)
        try:
            from legacy_system import legacy_world_tick
            legacy_world_tick(state, day)
        except Exception:
            pass
        # Başarımlar (Faz 5E)
        try:
            from achievements import check_achievements
            check_achievements(state, day)
        except Exception:
            pass
        # Kervan haftalık ilerleme (Adım 8)
        try:
            from caravan import process_caravan_tick, ensure_caravan_state
            ensure_caravan_state(state)
            caravan_event = process_caravan_tick(state)
            if caravan_event:
                # Önceki event varsa üzerine yaz (son hafta kazanır)
                state["pending_caravan_event"] = caravan_event
        except Exception:
            pass
        # Generate rumors from new history events this tick
        new_events = state["history"][prev_history_len:]
        if new_events:
            auto_rumors_from_events(state, new_events)
        seasonal_rumors(state)
        # Faz 2D: Eyleme dönüşen söylentiler (piyasa ipucu, NPC sırrı, istihbarat)
        try:
            from rumors import actionable_rumors_tick
            actionable_rumors_tick(state, day)
        except Exception:
            pass
        if len(state["history"]) > 250:
            state["history"] = state["history"][-250:]
    # Auto-unlock family quests at the end of advancement
    try:
        from family_quests import unlock_age_appropriate
        newly = unlock_age_appropriate(state)
        for q in newly:
            _push_event(state, state["turn"], "aile_görevi_açıldı",
                        f"Yeni aile görevi: {q['title']}")
    except Exception:
        pass
    return state


# ─────────────────────────────────────────────────────────────
# PARÇA 5 — Event Ağırlıklandırma (Hafta Planına Göre)
# ─────────────────────────────────────────────────────────────

# Her event kategorisini tanıyan sinyal kelimeleri
_PLAN_CATEGORY_SIGNALS: dict[str, list[str]] = {
    "is":       ["iş", "meslek", "üret", "çalış", "zanaatkâr", "ticaret", "kazanç", "lonca",
                 "görev", "çırak", "usta", "hammadde", "üretim", "sipariş"],
    "pazar":    ["pazar", "market", "fiyat", "alışveriş", "tüccar", "satış", "mal", "ticaret",
                 "alıcı", "satıcı", "kâr", "arz", "talep"],
    "sosyal":   ["sohbet", "ziyaret", "düğün", "şölen", "festival", "arkadaş", "akraba",
                 "komşu", "dedikodu", "hamam", "buluşma", "ilişki"],
    "dedikodu": ["dedikodu", "söylenti", "söz", "kulaktan", "haber", "fısıltı"],
    "npc":      ["npc", "kişi", "tanıdık", "karakter", "bağlantı", "ilişki", "seviye"],
    "stat":     ["güç", "dayanıklılık", "zeka", "karizm", "antrenman", "beceri",
                 "stamina", "strength", "intelligence", "charisma"],
    "iyilesme": ["iyileş", "dinlen", "iyileşme", "iyilik", "sağlık", "huzur", "istirahat"],
    "itibar":   ["itibar", "şöhret", "onur", "namaz", "dua", "okuma", "bilgelik", "saygınlık"],
    "risk":     ["kavga", "kaza", "tehlike", "saldırı", "haydut", "risk", "tehdit",
                 "yaralanma", "ceza", "kayıp"],
}


def _event_category_weight(event: dict, composite: dict) -> float:
    """
    Bir life-event için plan composite ağırlıklarına göre skalar çarpan hesaplar.
    Event'in title + choice text'lerinde kategori sinyallerini arar;
    eşleşen kategorilerin composite ağırlıklarının ortalamasını döner.
    Eşleşme yoksa 1.0 (nötr) döner.
    """
    # Event'ten metin topla (küçük harf)
    texts: list[str] = [event.get("title", ""), event.get("description", "")]
    for ch in event.get("choices", []):
        texts.append(ch.get("text", ""))
        for eff_key in ch.get("effects", {}).keys():
            texts.append(eff_key)
    combined = " ".join(texts).lower()

    matched_weights: list[float] = []
    for cat, signals in _PLAN_CATEGORY_SIGNALS.items():
        if cat not in composite:
            continue
        if any(sig in combined for sig in signals):
            matched_weights.append(composite[cat])

    if not matched_weights:
        return 1.0
    return sum(matched_weights) / len(matched_weights)


def _composite_plan_weights(state: dict) -> dict[str, float]:
    """
    Oyuncunun hafta planındaki 3 slot seçeneğinin event_weights'lerini
    tek bir düzleştirilmiş dict'e birleştirir.
    Aynı kategori birden fazla slotta varsa en büyük ağırlık kazanır.
    """
    try:
        from game_engine import HAFTA_PLANI_SECENEKLERI, get_hafta_plani_state
        plan = get_hafta_plani_state(state)           # {"is": "calis", "sosyal": "pazar", ...}
        composite: dict[str, float] = {}
        for slot_key, secim_id in plan.items():
            slot_list = HAFTA_PLANI_SECENEKLERI.get(slot_key, [])
            secim = next((s for s in slot_list if s["id"] == secim_id), None)
            if secim is None:
                continue
            for cat, w in secim.get("event_weights", {}).items():
                if composite.get(cat, 0.0) < w:
                    composite[cat] = w
        return composite
    except Exception:
        return {}


def _hafta_weighted_life_event(state: dict, eligible: list) -> dict:
    """
    Uygun eventler arasından hafta planına göre ağırlıklı seçim yapar.
    Ağırlık hesaplanamayan / sıfır olan eventler minimum 0.1 ağırlık alır.
    """
    composite = _composite_plan_weights(state)
    weights: list[float] = []
    for ev in eligible:
        w = _event_category_weight(ev, composite) if composite else 1.0
        weights.append(max(0.1, w))
    # random.choices normalize eder — toplamın 1.0 olması gerekmez
    return random.choices(eligible, weights=weights, k=1)[0]


# ---------- Soldier enforcement ----------
def soldier_check(state):
    """Check if player crime is high and there are soldiers nearby — apply consequence.

    Returns: dict or None
    """
    player = state["player"]
    if player.get("crime", 0) < 30:
        return None
    loc = next((l for l in state["world"]["locations"] if l["id"] == player["location_id"]), None)
    if not loc:
        return None
    # Find living soldiers/lords in this location
    enforcers = [n for n in state["world"]["npcs"]
                 if n["alive"] and n["location_id"] == loc["id"]
                 and n["profession"] in ("asker", "lord", "şövalye", "general")]
    if not enforcers:
        return None
    chance = min(0.85, (player["crime"] - 20) / 100 + (loc["security"] / 200))
    # Yüksek korku seviyesi askerleri çekindirir
    fear_discount = min(0.25, player.get("fear", 0) * 0.003)
    chance = max(0.05, chance - fear_discount)
    if random.random() > chance:
        return None
    # Apply punishment
    fine = min(player.get("money", 0), 50 + player["crime"] * 2)
    player["money"] = round(player.get("money", 0) - fine, 1)
    player["reputation"] -= 3
    enforcer = random.choice(enforcers)
    if player["crime"] >= 80:
        # Imprisonment: skip several weeks, reset crime partially
        weeks_in_jail = random.randint(2, 6)
        player["crime"] = max(0, player["crime"] - 50)
        _push_event(state, state["day"], "hapis",
                    f"{player['name']} {loc['name']}'de tutuklandı, {weeks_in_jail} hafta zindanda kaldı.")
        # advance silently
        advance_time(state, weeks=weeks_in_jail)
        return {"type": "hapis", "by": enforcer["name"], "fine": fine, "weeks": weeks_in_jail}
    else:
        player["crime"] = max(0, player["crime"] - 10)
        _push_event(state, state["day"], "yakalandı",
                    f"{player['name']}, {enforcer['name']} tarafından yakalandı, {fine} altın ceza ödedi.")
        return {"type": "ceza", "by": enforcer["name"], "fine": fine}
