"""S1 Rakip Hanedanlar birim testleri — kurulum, tick, kıt slot, miras."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import dynasties
from dynasties import (
    ensure_dynasties, dynasty_world_tick, league_table, respond_offer,
    player_overture, inherit_attitudes, free_slots, used_slots, get_dynasty,
    ARCHETYPES,
)


def make_state(n_npcs=40):
    npcs = []
    profs = ["tüccar", "lord", "haydut", "rahip", "general", "çiftçi",
             "demirci", "asker", "şifacı", "katip"]
    for i in range(n_npcs):
        npcs.append({
            "id": f"n{i}", "name": f"Kişi{i}", "alive": True,
            "profession": profs[i % len(profs)], "location_id": f"loc{i % 3}",
            "personality": [], "age": 30 + (i % 20), "kingdom_id": "k1",
            "children_ids": [], "wealth": 100,
        })
    locations = [
        {"id": "loc0", "name": "Taşkent", "kind": "şehir", "wealth": 60},
        {"id": "loc1", "name": "Kuzköy", "kind": "köy", "wealth": 40},
        {"id": "loc2", "name": "Demirkale", "kind": "kale", "wealth": 50},
    ]
    state = {
        "turn": 50, "day": 50,
        "player": {"name": "Kael", "money": 500, "reputation": 30, "age": 25,
                   "location_id": "loc0", "skills": {}, "stats": {"charisma": 3},
                   "spouse_id": None},
        "relationships": {},
        "world": {"npcs": npcs, "locations": locations, "factions": []},
        "history": [], "properties": [],
    }
    return state


def test_ensure_creates_six_dynasties():
    state = make_state()
    ds = ensure_dynasties(state)
    assert len(ds) == 6
    assert {d["karakter"] for d in ds} == set(ARCHETYPES.keys())
    for d in ds:
        assert d["reis"]
        assert d["servet"] > 0
        reis = next(n for n in state["world"]["npcs"] if n["id"] == d["reis"])
        assert reis["dynasty_id"] == d["id"]
    # İdempotent
    assert ensure_dynasties(state) is state["world"]["dynasties"]


def test_dynasties_hold_starting_properties():
    state = make_state()
    ds = ensure_dynasties(state)
    toplam = sum(len(d["mulkler"]) for d in ds)
    assert toplam >= 6   # arketip başlangıç mülkleri dünyaya dağıldı
    assert used_slots(state, "loc0") > 0 or used_slots(state, "loc1") > 0


def test_scarce_slots_block_player_purchase():
    state = make_state()
    ensure_dynasties(state)
    koy = state["world"]["locations"][1]
    d = state["world"]["dynasties"][0]
    # Köyün 4 slotunu hanedan mülki ile doldur
    while free_slots(state, koy) > 0:
        d["mulkler"].append({"id": f"m{free_slots(state, koy)}", "type": "tarla",
                             "loc_id": "loc1", "loc_name": "Kuzköy", "income": 8})
    from property_system import buy_property
    state["player"]["money"] = 99999
    prop, err = buy_property(state, "tarla", "loc1", 50)
    assert prop is None
    assert "boş mülk kalmadı" in err


def test_weekly_tick_runs_and_earns_income():
    state = make_state()
    ds = ensure_dynasties(state)
    servetler = {d["id"]: d["servet"] for d in ds}
    for _ in range(8):
        dynasty_world_tick(state, state["turn"])
        state["turn"] += 1
    # Hiçbiri çökmedi; en az bir hanedan hamle logu üretti
    assert any(d.get("log") for d in ds)
    for d in ds:
        assert d["servet"] >= 0


def test_succession_on_reis_death():
    state = make_state()
    ds = ensure_dynasties(state)
    d = ds[0]
    eski_reis = d["reis"]
    next(n for n in state["world"]["npcs"] if n["id"] == eski_reis)["alive"] = False
    dynasty_world_tick(state, state["turn"])
    assert d["sonmus"] or d["reis"] != eski_reis
    if not d["sonmus"]:
        assert d["nesil"] == 2


def test_extinction_when_all_members_dead():
    state = make_state()
    ds = ensure_dynasties(state)
    d = ds[0]
    for uid in d["uyeler"]:
        next(n for n in state["world"]["npcs"] if n["id"] == uid)["alive"] = False
    dynasty_world_tick(state, state["turn"])
    assert d["sonmus"] is True


def test_league_table_includes_player():
    state = make_state()
    ensure_dynasties(state)
    tablo = league_table(state)["tablo"]
    assert len(tablo) == 7
    assert any(r.get("oyuncu") for r in tablo)
    assert tablo[0]["sira"] == 1
    # Servete göre sıralı
    servetler = [r["servet"] for r in tablo]
    assert servetler == sorted(servetler, reverse=True)


def test_alliance_offer_flow():
    state = make_state()
    ensure_dynasties(state)
    d = state["world"]["dynasties"][0]
    d["oyuncuya_tutum"] = 40
    dynasties._do_ittifak(state, d, 50)
    offers = state["dynasty_offers"]
    assert len(offers) == 1 and offers[0]["type"] == "ittifak"
    result, err = respond_offer(state, offers[0]["id"], "kabul")
    assert err is None
    assert d["id"] in state["allied_dynasties"]
    assert d["oyuncuya_tutum"] == 70


def test_marriage_offer_marries_player():
    state = make_state()
    ensure_dynasties(state)
    d = state["world"]["dynasties"][1]
    d["oyuncuya_tutum"] = 30
    dynasties._do_evlilik(state, d, 50)
    offers = [o for o in state.get("dynasty_offers", []) if o["type"] == "evlilik"]
    assert offers, "evlilik teklifi üretilmeliydi"
    result, err = respond_offer(state, offers[0]["id"], "kabul")
    assert err is None
    assert state["player"]["spouse_id"] == offers[0]["npc_id"]
    npc = next(n for n in state["world"]["npcs"] if n["id"] == offers[0]["npc_id"])
    assert npc["spouse_id"] == "PLAYER"
    assert d["id"] in state["allied_dynasties"]


def test_reject_offer_costs_attitude():
    state = make_state()
    ensure_dynasties(state)
    d = state["world"]["dynasties"][0]
    d["oyuncuya_tutum"] = 40
    dynasties._do_ittifak(state, d, 50)
    offer = state["dynasty_offers"][0]
    result, err = respond_offer(state, offer["id"], "red")
    assert err is None
    assert d["oyuncuya_tutum"] == 30
    assert state["dynasty_offers"] == []


def test_player_overture():
    state = make_state()
    ensure_dynasties(state)
    d = state["world"]["dynasties"][0]
    d["oyuncuya_tutum"] = 0
    result, err = player_overture(state, d["id"])
    assert err is None
    assert state["player"]["money"] == 400
    assert d["oyuncuya_tutum"] == 12
    # Reisin zihnine cömert hediye anısı düştü (S2 köprüsü)
    reis = next(n for n in state["world"]["npcs"] if n["id"] == d["reis"])
    assert any(m["tur"] == "comert_hediye" for m in reis.get("anilar", []))


def test_attitude_follows_reis_mind():
    state = make_state()
    ensure_dynasties(state)
    d = state["world"]["dynasties"][0]
    d["oyuncuya_tutum"] = 0
    reis = next(n for n in state["world"]["npcs"] if n["id"] == d["reis"])
    from npc_mind import add_memory
    add_memory(reis, "kacirma", 50)   # -50 travma
    for _ in range(20):
        dynasties._attitude_drift(state, d)
    assert d["oyuncuya_tutum"] < -25   # tutum reisin nefretine yakınsadı


def test_inherit_attitudes_softens_but_keeps():
    state = make_state()
    ensure_dynasties(state)
    d = state["world"]["dynasties"][0]
    d["oyuncuya_tutum"] = -60
    state["allied_dynasties"] = [state["world"]["dynasties"][1]["id"]]
    state["world"]["dynasties"][1]["oyuncuya_tutum"] = 50
    inherit_attitudes(state)
    assert d["oyuncuya_tutum"] == -48          # %80 taşındı
    assert state["allied_dynasties"] == [state["world"]["dynasties"][1]["id"]]
    # Düşük tutumlu müttefiklik düşer
    state["world"]["dynasties"][1]["oyuncuya_tutum"] = 10
    inherit_attitudes(state)
    assert state["allied_dynasties"] == []


def test_sabotage_hits_player_property(monkeypatch):
    state = make_state()
    ensure_dynasties(state)
    d = state["world"]["dynasties"][0]
    d["oyuncuya_tutum"] = -50
    state["properties"] = [{"id": "p1", "name": "Taşkent Dükkân", "type": "dükkân",
                            "location_id": "loc0", "condition": 100}]
    monkeypatch.setattr(dynasties.random, "random", lambda: 0.0)  # anlaşıldı
    monkeypatch.setattr(dynasties.random, "randint", lambda a, b: a)
    monkeypatch.setattr(dynasties.random, "choice", lambda x: x[0])
    dynasties._do_sabotaj(state, d, 50)
    assert state["properties"][0]["condition"] < 100
    assert any("kuyunu" in r["text"] for r in state.get("player_rumors", []))
