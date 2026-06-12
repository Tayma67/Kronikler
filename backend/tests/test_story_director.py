"""S3/S4 Hikâye Yönetmeni testleri — gerilim, tempo, nemesis, tohum, perde."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import story_director as sd
from story_director import (
    ensure_director, director_tick, sow_seed, inherit_seeds,
    mark_nemesis_candidate, director_view, director_event_bias,
)


def make_state():
    npcs = [{"id": f"n{i}", "name": f"Kişi{i}", "alive": True,
             "profession": "çiftçi", "location_id": "loc0", "age": 30,
             "personality": [], "children_ids": [], "kingdom_id": "k1"}
            for i in range(8)]
    state = {
        "turn": 100, "day": 100,
        "player": {"name": "Kael", "money": 200, "reputation": 10,
                   "health": 90, "location_id": "loc0",
                   "skills": {"combat": 2}, "stats": {}},
        "relationships": {},
        "world": {"npcs": npcs, "dynasties": [], "wars": [],
                  "locations": [{"id": "loc0", "name": "Köy", "security": 50}]},
        "history": [], "properties": [], "player_rumors": [],
    }
    return state


def test_ensure_creates_state_and_first_act():
    state = make_state()
    y = ensure_director(state)
    assert y["gerilim"] == 25
    assert y["aktif_yay"] == "kurulus"
    assert len(y["perdeler"]) == 1
    assert "Bölüm I" in y["perdeler"][0]["baslik"]


def test_tension_rises_with_hostile_world():
    state = make_state()
    y = ensure_director(state)
    state["world"]["dynasties"] = [
        {"id": "d1", "sonmus": False, "oyuncuya_tutum": -60},
        {"id": "d2", "sonmus": False, "oyuncuya_tutum": -40},
    ]
    state["player"]["money"] = 5
    state["player"]["health"] = 30
    state["player_rumors"] = [{"yon": -1, "siddet": 2}] * 3
    for _ in range(12):
        sd._update_tension(state, y)
    assert y["gerilim"] >= 70


def test_stagnation_draws_spark(monkeypatch):
    state = make_state()
    y = ensure_director(state)
    y["son_onemli_hafta"] = 100 - 10   # 10 hafta sessizlik
    monkeypatch.setattr(sd.random, "random", lambda: 0.5)
    onceki = len(state["history"])
    director_tick(state, 100)
    assert len(state["history"]) > onceki      # kıvılcım düştü
    assert y["kullanilan_kartlar"]
    assert y["son_onemli_hafta"] == 100


def test_used_cards_not_repeated_quickly():
    state = make_state()
    y = ensure_director(state)
    y["kullanilan_kartlar"] = ["gizemli_yabanci", "kayip_kese", "yarali_yolcu",
                               "firtina", "eski_dost", "hanedan_elcisi"]
    cards = sd._spark_cards(state, y)
    ids = [c[0] for c in cards]
    assert "gizemli_yabanci" not in ids
    assert "kayip_kese" not in ids


def test_climax_fires_and_breath_follows(monkeypatch):
    state = make_state()
    y = ensure_director(state)
    y["gerilim"] = 85
    y["son_doruk_haftasi"] = 0
    state["world"]["dynasties"] = [
        {"id": "d1", "ad": "Karaoğlu", "sembol": "🐺", "sonmus": False,
         "oyuncuya_tutum": -60, "mulkler": [], "uyeler": [], "reis": "n0"},
    ]
    # Gerilim hedefi düşük olduğundan drift öncesi tick'te doruk şartını koru
    monkeypatch.setattr(sd, "_update_tension", lambda s, yy: None)
    director_tick(state, 100)
    assert y["son_doruk_haftasi"] == 100
    assert y["nefes_kalan"] >= 3
    assert y["gerilim"] <= 45
    assert any(e["type"] == "doruk" for e in state["history"])
    assert y["aktif_yay"] == "cozulme"


def test_breath_suppresses_negative_bias():
    state = make_state()
    y = ensure_director(state)
    y["nefes_kalan"] = 3
    gergin = {"id": "g", "choices": [{"effects": {"health": -20, "crime": 9,
                                                  "fear": 4}}]}
    sakin = {"id": "s", "choices": [{"effects": {"money": 10, "reputation": 2}}]}
    secim = director_event_bias(state, [gergin, sakin])
    assert secim == [sakin]


def test_crisis_bias_prefers_tense(monkeypatch):
    state = make_state()
    y = ensure_director(state)
    y["aktif_yay"] = "kriz"
    monkeypatch.setattr(sd.random, "random", lambda: 0.1)
    gergin = {"id": "g", "choices": [{"effects": {"health": -20, "crime": 9,
                                                  "fear": 4}}]}
    sakin = {"id": "s", "choices": [{"effects": {"money": 10}}]}
    secim = director_event_bias(state, [gergin, sakin])
    assert secim == [gergin]


# ── Nemesis ────────────────────────────────────────────────────────────────

def test_nemesis_promotion(monkeypatch):
    state = make_state()
    y = ensure_director(state)
    npc = state["world"]["npcs"][0]
    mark_nemesis_candidate(state, npc)
    state["relationships"][npc["id"]] = -50
    monkeypatch.setattr(sd.random, "random", lambda: 0.1)
    monkeypatch.setattr(sd.random, "choice", lambda x: x[0])
    sd._nemesis_tick(state, y)
    assert npc["id"] in y["nemesis_ids"]


def test_blood_feud_passes_to_child():
    state = make_state()
    y = ensure_director(state)
    baba = state["world"]["npcs"][0]
    cocuk = state["world"]["npcs"][1]
    baba["children_ids"] = [cocuk["id"]]
    y["nemesis_ids"] = [baba["id"]]
    baba["alive"] = False
    sd._nemesis_tick(state, y)
    assert baba["id"] not in y["nemesis_ids"]
    assert cocuk["nemesis_candidate"] is True
    assert any(m["tur"] == "yakinima_zarar" for m in cocuk.get("anilar", []))
    assert any("kan davası" in e["text"] for e in state["history"])


def test_nemesis_showdown_at_climax(monkeypatch):
    state = make_state()
    y = ensure_director(state)
    npc = state["world"]["npcs"][0]
    y["nemesis_ids"] = [npc["id"]]
    monkeypatch.setattr(sd.random, "random", lambda: 0.99)  # kaybedersin
    ok = sd._nemesis_showdown(state, y)
    assert ok is True
    assert npc["id"] in y["nemesis_ids"]          # hesap hâlâ açık
    assert state["player"]["health"] < 90
    monkeypatch.setattr(sd.random, "random", lambda: 0.0)   # kazanırsın
    ok = sd._nemesis_showdown(state, y)
    assert npc["id"] not in y["nemesis_ids"]      # defter kapandı


# ── Tohumlar ───────────────────────────────────────────────────────────────

def test_seed_sow_and_force_germinate():
    state = make_state()
    ensure_director(state)
    sow_seed(state, "test", "Geçmiş döndü: {p} hesap veriyor.",
             hafta_min=5, hafta_max=10, etki={"money": 50})
    state["turn"] = 111   # ekimden 11 hafta sonra — vade doldu
    y = state["yonetmen"]
    text = sd._seed_tick(state, y)
    assert text and "Kael" in text
    assert state["tohumlar"] == []
    assert state["player"]["money"] == 250
    assert any(e["type"] == "tohum" for e in state["history"])


def test_big_seed_waits_for_climax():
    state = make_state()
    ensure_director(state)
    sow_seed(state, "buyuk_test", "Büyük gün geldi.",
             hafta_min=2, hafta_max=400, agirlik="buyuk")
    state["turn"] = 150
    y = state["yonetmen"]
    assert sd._seed_tick(state, y) is None                  # doruk değil
    assert sd._seed_tick(state, y, doruk_aninda=True)       # dorukta patlar


def test_seed_condition_blocks():
    state = make_state()
    ensure_director(state)
    sow_seed(state, "kosullu", "İtibarın duyuldu.",
             hafta_min=1, hafta_max=999, kosul={"itibar_min": 50})
    state["turn"] = 120
    y = state["yonetmen"]
    for _ in range(30):
        assert sd._seed_tick(state, y) is None
    state["player"]["reputation"] = 60
    bulundu = any(sd._seed_tick(state, y) for _ in range(200))
    assert bulundu


def test_inherit_seeds_keeps_heritable_only():
    state = make_state()
    ensure_director(state)
    sow_seed(state, "a", "x", 1, 10, nesil_asabilir=True)
    sow_seed(state, "b", "y", 1, 10, nesil_asabilir=False)
    inherit_seeds(state)
    assert len(state["tohumlar"]) == 1
    assert state["tohumlar"][0]["kaynak"] == "a"
    assert "Yeni Nesil" in state["yonetmen"]["perdeler"][-1]["baslik"]


# ── Perdeler ───────────────────────────────────────────────────────────────

def test_acts_progress_with_tension():
    state = make_state()
    y = ensure_director(state)
    state["turn"] = 130
    sd._update_acts(state, y, 130)
    assert y["aktif_yay"] == "yukselis"
    y["gerilim"] = 70
    sd._update_acts(state, y, 131)
    assert y["aktif_yay"] == "kriz"
    assert len(y["perdeler"]) >= 2
    assert y["perdeler"][-1]["bitis"] is None


def test_director_view_shape():
    state = make_state()
    ensure_director(state)
    v = director_view(state)
    assert set(v) >= {"gerilim", "aktif_yay", "perdeler", "nemesisler",
                      "bekleyen_tohum", "yay_label"}
