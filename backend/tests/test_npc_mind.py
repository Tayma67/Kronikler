"""S2 NPC Zihni birim testleri — anı, decay, eşik, dedikodu, nam, eylemler."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import npc_mind
from npc_mind import (
    add_memory, decay_memories, memory_sum, effective_rel, behavior_tier,
    top_memories, gossip_tick, compute_nam, dominant_nam, nam_effects,
    rumor_action, goal_action,
)
from npc_profile import push_personal_memory, ensure_profile


def make_state(n_npcs=1):
    npcs = []
    for i in range(n_npcs):
        npcs.append({
            "id": f"n{i}", "name": f"Hasan{i}", "alive": True,
            "profession": "demirci", "location_id": "loc1",
            "personality": [], "age": 30, "kingdom_id": "k1",
        })
    state = {
        "turn": 100, "day": 100,
        "player": {"name": "Kael", "money": 200, "reputation": 0,
                   "skills": {"social": 3, "trade": 0},
                   "stats": {"charisma": 3}},
        "relationships": {n["id"]: 0 for n in npcs},
        "world": {"npcs": npcs, "locations": [{"id": "loc1", "name": "Köy"}]},
        "history": [], "npc_intel": {},
    }
    return state, npcs[0]


# ── Anı nesnesi & ilişki skoru ──────────────────────────────────────────────

def test_add_memory_structure():
    state, npc = make_state()
    ani = add_memory(npc, "hakaret", 100, taniklar=["n5"])
    assert ani["tur"] == "hakaret"
    assert ani["duygu_yuku"] == -15
    assert ani["travma"] is False
    assert ani["taniklar"] == ["n5"]
    assert npc["anilar"][0] is ani


def test_unknown_type_ignored():
    state, npc = make_state()
    assert add_memory(npc, "boyle_bir_tur_yok", 100) is None
    assert not npc.get("anilar")


def test_effective_rel_is_base_plus_memories():
    state, npc = make_state()
    state["relationships"]["n0"] = 10
    add_memory(npc, "hakaret", 100)        # -15
    add_memory(npc, "hediye", 100)         # +8
    assert memory_sum(npc) == -7
    assert effective_rel(state, npc) == 3


def test_decay_removes_faded_but_keeps_trauma():
    state, npc = make_state()
    add_memory(npc, "iltifat", 100)        # +4, hızlı söner
    add_memory(npc, "kacirma", 100)        # -50, travma
    for _ in range(60):
        decay_memories(npc)
    turler = [m["tur"] for m in npc["anilar"]]
    assert "iltifat" not in turler
    assert "kacirma" in turler
    kac = next(m for m in npc["anilar"] if m["tur"] == "kacirma")
    assert kac["duygu_yuku"] == -50        # travma: unutma hızı 1.0


def test_memory_cap_protects_traumas():
    state, npc = make_state()
    add_memory(npc, "saldiri", 100)
    for i in range(30):
        add_memory(npc, "iltifat", 100 + i)
    assert len(npc["anilar"]) <= 24
    assert any(m["tur"] == "saldiri" for m in npc["anilar"])


# ── Davranış eşikleri (GDD tablosu) ────────────────────────────────────────

def test_behavior_tiers():
    assert behavior_tier(-50)["key"] == "aktif_dusman"
    assert behavior_tier(-50)["selam"] is False
    assert behavior_tier(-50)["al_carpan"] == 1.20
    assert behavior_tier(-30)["key"] == "soguk"
    assert behavior_tier(0)["key"] == "notr"
    assert behavior_tier(30)["key"] == "dost"
    assert behavior_tier(60)["key"] == "sadik"


# ── push_personal_memory geriye uyumu ──────────────────────────────────────

def test_push_personal_memory_backcompat():
    state, npc = make_state()
    ensure_profile(npc)
    push_personal_memory(npc, "eski tip satır")
    assert "eski tip satır" in npc["personal_memory"]
    assert not npc.get("anilar")
    push_personal_memory(npc, "yeni tip", tur="hakaret", hafta=100)
    assert npc["anilar"][0]["tur"] == "hakaret"


# ── Dedikodu ağı ───────────────────────────────────────────────────────────

def test_gossip_tick_spreads_scandal(monkeypatch):
    state, npc = make_state(n_npcs=5)
    add_memory(npc, "kacirma", 99, taniklar=["n1", "n2", "n3"])
    monkeypatch.setattr(npc_mind.random, "random", lambda: 0.0)
    gossip_tick(state)
    rumors = state["player_rumors"]
    assert len(rumors) == 1
    assert rumors[0]["nam"] == "zalim"
    assert "Kael" in rumors[0]["text"]
    assert npc["anilar"][0]["yayildi"] is True
    # İkinci tick aynı anıyı tekrar yaymaz
    gossip_tick(state)
    assert len(state["player_rumors"]) == 1


def test_gossip_tick_skips_clean_memories(monkeypatch):
    state, npc = make_state()
    add_memory(npc, "guzel_sohbet", 100)   # skandal 0
    monkeypatch.setattr(npc_mind.random, "random", lambda: 0.0)
    gossip_tick(state)
    assert state["player_rumors"] == []


def test_rumors_fade_out(monkeypatch):
    state, npc = make_state()
    state["player_rumors"] = [{"id": "r1", "siddet": 0.1, "hafta": 90,
                               "text": "x", "yon": -1}]
    gossip_tick(state)
    assert state["player_rumors"] == []


# ── Nam profili ────────────────────────────────────────────────────────────

def test_nam_profile_and_dominant():
    state, _ = make_state(n_npcs=6)
    for n in state["world"]["npcs"][:5]:
        add_memory(n, "hakaret", 100)
    nam = compute_nam(state)
    assert nam["zalim"] >= 8
    assert dominant_nam(nam) == "zalim"
    fx = nam_effects(state)
    assert fx.get("evlilik_ret") is True
    assert fx.get("korku_iskontosu") is True


def test_old_memories_dont_count_for_nam():
    state, npc = make_state()
    add_memory(npc, "hakaret", 100 - 200)   # 200 hafta önce — 2 yıl sınırı dışı
    nam = compute_nam(state)
    assert nam["zalim"] == 0


# ── Söylenti eylemleri ─────────────────────────────────────────────────────

def _seed_rumor(state):
    r = {"id": "r1", "hafta": 100, "tur": "hakaret", "nam": "zalim",
         "yon": -1, "siddet": 2, "text": "Kael zalimmiş.",
         "kaynak_id": "n0", "kaynak_name": "Hasan0", "loc_id": "loc1"}
    state["player_rumors"] = [r]
    return r


def test_sustur_success(monkeypatch):
    state, npc = make_state()
    _seed_rumor(state)
    monkeypatch.setattr(npc_mind.random, "random", lambda: 0.0)
    result, err = rumor_action(state, "r1", "sustur")
    assert err is None
    assert result["sonuc"] == "susturuldu"
    assert state["player_rumors"] == []
    assert state["player"]["money"] == 200 - 30   # 15 × şiddet(2)


def test_sustur_backfire(monkeypatch):
    state, npc = make_state()
    _seed_rumor(state)
    monkeypatch.setattr(npc_mind.random, "random", lambda: 0.99)
    result, err = rumor_action(state, "r1", "sustur")
    assert result["sonuc"] == "geri_tepti"
    assert len(state["player_rumors"]) == 2       # rüşvet söylentisi doğdu


def test_yuzles_success_kills_rumor(monkeypatch):
    state, npc = make_state()
    _seed_rumor(state)
    monkeypatch.setattr(npc_mind.random, "random", lambda: 0.0)
    result, err = rumor_action(state, "r1", "yuzles")
    assert result["sonuc"] == "sondu"
    assert state["player_rumors"] == []


def test_yay_requires_positive():
    state, npc = make_state()
    _seed_rumor(state)
    result, err = rumor_action(state, "r1", "yay")
    assert result is None and err


# ── Amaç eylemleri ─────────────────────────────────────────────────────────

def test_goal_help_pays_debt():
    state, npc = make_state()
    npc.update({"goal": "borc_odemek", "debt": 50, "goal_progress": 10,
                "savings": 5})
    state["npc_intel"]["n0"] = {"amac": "borc_odemek"}
    result, err = goal_action(state, npc, "yardim")
    assert err is None
    assert npc["debt"] == 0
    assert npc["owes_player"] is True
    assert state["player"]["money"] == 150
    assert any(m["tur"] == "borc_kurtarma" for m in npc["anilar"])
    assert effective_rel(state, npc) >= 20
    # İkinci kez yardım edilemez
    result, err = goal_action(state, npc, "yardim")
    assert err


def test_goal_action_requires_intel():
    state, npc = make_state()
    result, err = goal_action(state, npc, "yardim")
    assert result is None and err


def test_goal_exploit_gives_koz(monkeypatch):
    state, npc = make_state()
    npc.update({"goal": "zengin_olmak", "goal_progress": 10})
    state["npc_intel"]["n0"] = {"amac": "zengin_olmak"}
    monkeypatch.setattr(npc_mind.random, "random", lambda: 0.99)  # sezmedi
    result, err = goal_action(state, npc, "somur")
    assert err is None
    assert state["npc_intel"]["n0"]["koz"] is True
    assert result["sezdi"] is False


# ── Sohbet yüzeyi ──────────────────────────────────────────────────────────

def test_top_memories_surface():
    state, npc = make_state()
    add_memory(npc, "hakaret", 100)
    add_memory(npc, "hayat_kurtarma", 100)
    mems = top_memories(npc, n=2)
    assert len(mems) == 2
    assert mems[0]["text"] == "hayatımı kurtarmıştı"   # |40| > |15|
    assert mems[0]["travma"] is True
