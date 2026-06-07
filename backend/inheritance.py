"""
inheritance.py — Nesiller Arası Sistem

Oyuncu öldüğünde:
1. Çocukları var mı kontrol et (state["player"]["children_ids"])
2. Varsa → çocuktan biri seçilir, yeni oyuncu olur
3. Yoksa → eşi varsa → eşle devam (yavaş sistem)
4. Hiçbiri yoksa → fresh start ama dünya aynı, "sürgün" olarak başlar

Nesil devri şunları korur:
- Dünya durumu (tüm NPC'ler, lokasyonlar, savaşlar)
- Ölen oyuncunun itibarı/efsanesi tarih sayfasında
- Skill mirası: çocuğun statları ebeveyn statlarının %30'unu alır
- Para mirası: kalan paranın %60'ı

Nesil devri şunları sıfırlar:
- Oyuncu kimliği, isim, yaş (7), sağlık, açlık
- Silahlar/ekipman (sıfırdan başla)
- Suç kaydı, istenen kişi listesi
"""
import random
from world_gen import (
    MALE_NAMES, FEMALE_NAMES, SURNAMES,
    _make_npc, _make_family_for_player,
)
from family_quests import make_family_quests
from school import ensure_school_state
from simulation import _push_event


def _pick_name(gender: str, surname: str) -> str:
    names = MALE_NAMES if gender == "erkek" else FEMALE_NAMES
    return f"{random.choice(names)} {surname}"


def has_heir(state) -> bool:
    """Oyuncunun devam edebileceği bir varisi var mı?"""
    player = state["player"]
    # Dünyada yaşayan bir çocuk NPC'si var mı
    child_ids = player.get("children_ids", [])
    for cid in child_ids:
        npc = next((n for n in state["world"]["npcs"] if n["id"] == cid and n.get("alive", True)), None)
        if npc:
            return True
    # Eş varsa o da devam sebebi
    if player.get("spouse_id"):
        spouse = next((n for n in state["world"]["npcs"] if n["id"] == player["spouse_id"] and n.get("alive", True)), None)
        if spouse:
            return True
    return False


def can_continue_as_child(state) -> bool:
    player = state["player"]
    child_ids = player.get("children_ids", [])
    for cid in child_ids:
        npc = next((n for n in state["world"]["npcs"] if n["id"] == cid and n.get("alive", True)), None)
        if npc and npc.get("age", 99) < 30:
            return True
    return False


def begin_inheritance(state, chosen_child_id: str = None) -> dict:
    """
    Nesil devrini başlat.
    chosen_child_id: hangi çocukla devam edileceği (None → otomatik seç)
    Returns: updated state dict with new player
    """
    old_player = state["player"]
    turn = state.get("turn", 0)
    world = state["world"]

    # ── Mirası hesapla ─────────────────────────────────────────
    inherited_money = round(old_player.get("money", 0) * 0.60, 1)
    inherited_stats = {
        k: max(1, round(v * 0.30))
        for k, v in old_player.get("stats", {}).items()
    }
    inherited_skills = {
        k: max(0, round(v * 0.25))
        for k, v in old_player.get("skills", {}).items()
    }
    inherited_reputation = round(old_player.get("reputation", 0) * 0.20)

    # ── Çocuk NPC'yi bul / oluştur ────────────────────────────
    child_npc = None
    child_ids = old_player.get("children_ids", [])

    if chosen_child_id:
        child_npc = next((n for n in world["npcs"] if n["id"] == chosen_child_id and n.get("alive", True)), None)
    
    if not child_npc and child_ids:
        # En genç çocuğu seç (daha uzun oyun süresi)
        candidates = [
            n for n in world["npcs"]
            if n["id"] in child_ids and n.get("alive", True) and n.get("age", 99) < 30
        ]
        if candidates:
            child_npc = min(candidates, key=lambda n: n.get("age", 99))

    # ── Ebeveyn NPC'leri bul ──────────────────────────────────
    if child_npc:
        # Çocukla devam
        gender = child_npc.get("gender", "erkek")
        surname = child_npc.get("name", "").split()[-1] if " " in child_npc.get("name", "") else old_player.get("surname", "Demir")
        player_name = child_npc["name"]
        child_age = max(7, child_npc.get("age", 7))
        location_id = child_npc.get("location_id", old_player["location_id"])
        location = next((l for l in world["locations"] if l["id"] == location_id), None)
        if not location:
            location = next((l for l in world["locations"] if l["kind"] == "köy"), world["locations"][0])

        # Oyuncunun eşi ve kendisi artık "ebeveyn" NPC olarak dünyada kalır
        parent_ids = [old_player.get("spouse_id")] if old_player.get("spouse_id") else []
        # Old player'ı NPC'ye çevir (hafızada)
        old_npc_id = _convert_player_to_npc(state, old_player)
        if old_npc_id:
            parent_ids.append(old_npc_id)

        state.setdefault("legacy_history", [])
        state["legacy_history"].append({
            "generation_turn": turn,
            "generation": state.get("generation", 1),
            "previous_name": old_player["name"],
            "origin": "çocuk",
            "inherited_money": inherited_money,
        })
        # A-3: Legacy history listesini 50 nesille sınırla
        if len(state["legacy_history"]) > 50:
            state["legacy_history"] = state["legacy_history"][-50:]

        # Tarih kaydı
        _push_event(state, turn, "nesil_devri",
                    f"{old_player['name']} hayatını kaybetti. Nesil devam ediyor: {player_name}.")

        new_player = _build_new_player(
            name=player_name,
            gender=gender,
            surname=surname,
            age=max(7, child_age),
            location=location,
            world=world,
            inherited_stats=inherited_stats,
            inherited_skills=inherited_skills,
            inherited_money=inherited_money,
            inherited_reputation=inherited_reputation,
            parent_ids=parent_ids,
        )
        origin = "çocuk"

    else:
        # Varis yok — sürgün olarak yeni hayat (aynı dünya)
        surname = old_player.get("surname", random.choice(SURNAMES))
        gender = random.choice(["erkek", "kadın"])
        villages = [l for l in world["locations"] if l["kind"] == "köy"]
        location = random.choice(villages) if villages else world["locations"][0]
        kingdom = next(k for k in world["kingdoms"] if k["id"] == location["kingdom_id"])

        mother, father = _make_family_for_player(world, "Sürgün", surname, location, kingdom)
        player_name = _pick_name(gender, surname)

        _push_event(state, turn, "nesil_devri",
                    f"{old_player['name']} hayatını kaybetti. Bir sürgün olarak yeni bir hayat başlıyor.")

        new_player = _build_new_player(
            name=player_name,
            gender=gender,
            surname=surname,
            age=7,
            location=location,
            world=world,
            inherited_stats={k: 1 for k in inherited_stats},
            inherited_skills={k: 0 for k in inherited_skills},
            inherited_money=0,
            inherited_reputation=0,
            parent_ids=[mother["id"], father["id"]],
        )
        origin = "sürgün"
        state.setdefault("legacy_history", [])
        state["legacy_history"].append({
            "generation_turn": turn,
            "generation": state.get("generation", 1),
            "previous_name": old_player["name"],
            "origin": "sürgün",
            "inherited_money": 0,
        })
        if len(state["legacy_history"]) > 50:
            state["legacy_history"] = state["legacy_history"][-50:]

    # ── State güncelle ─────────────────────────────────────────
    state["player"] = new_player
    state["family_quests"] = make_family_quests(
        {}, new_player["parent_ids"][0] if new_player["parent_ids"] else None,
             new_player["parent_ids"][1] if len(new_player["parent_ids"]) > 1 else None
    )
    state["quests"] = []
    ensure_school_state(state)

    # Miras özeti
    state["inheritance_summary"] = {
        "previous_name": old_player["name"],
        "origin": origin,  # "çocuk" | "sürgün"
        "inherited_money": inherited_money,
        "inherited_stats": inherited_stats,
        "inherited_skills": inherited_skills,
        "inherited_reputation": inherited_reputation,
        "generation": state.get("generation", 1) + 1,
    }
    state["generation"] = state.get("generation", 1) + 1

    return state


def _build_new_player(name, gender, surname, age, location, world,
                       inherited_stats, inherited_skills,
                       inherited_money, inherited_reputation, parent_ids):
    kingdom = next(
        (k for k in world["kingdoms"] if k["id"] == location["kingdom_id"]),
        world["kingdoms"][0]
    )
    stats = {
        "strength":    max(1, inherited_stats.get("strength", 1)),
        "intelligence":max(1, inherited_stats.get("intelligence", 1)),
        "charisma":    max(1, inherited_stats.get("charisma", 1)),
        "stamina":     max(2, inherited_stats.get("stamina", 2)),
    }
    skills = {
        "combat":   max(0, inherited_skills.get("combat", 0)),
        "trade":    max(0, inherited_skills.get("trade", 0)),
        "crafting": max(0, inherited_skills.get("crafting", 0)),
        "social":   max(0, inherited_skills.get("social", 0)),
    }
    return {
        "name": name,
        "gender": gender,
        "surname": surname,
        "base_age": age,
        "age": age,
        "culture": kingdom["culture"],
        "religion": kingdom["religion"],
        "kingdom_id": kingdom["id"],
        "kingdom_name": kingdom["name"],
        "money": inherited_money,
        "profession": "işsiz",
        "education": "yok",
        "reputation": inherited_reputation,
        "health": 100,
        "hunger": 100,
        "crime": 0,
        "location_id": location["id"],
        "location_name": location["name"],
        "spouse_id": None,
        "children_ids": [],
        "parent_ids": [pid for pid in parent_ids if pid],
        "inventory": {"ekmek": 2},
        "equipment": {
            "weapon": None, "head": None, "body": "köylü_giysisi",
            "hands": None, "legs": None, "feet": None
        },
        "wanted_in": [],
        "interaction_counts": {},
        "dead": False,
        "stats": stats,
        "stat_xp": {k: 0 for k in stats},
        "skills": skills,
        "skill_xp": {k: 0 for k in skills},
        "buffs": {},
        # Miras işareti — UI'da gösterilir
        "inherited": True,
    }


def _convert_player_to_npc(state, player) -> str | None:
    """Eski oyuncuyu dünya NPC'sine çevir (tarihsel karakter olarak kalsın)."""
    import uuid
    npc_id = uuid.uuid4().hex[:16]
    location = next(
        (l for l in state["world"]["locations"] if l["id"] == player["location_id"]),
        state["world"]["locations"][0]
    )
    kingdom_id = location["kingdom_id"]
    kingdom_name = location["kingdom_name"]
    npc = {
        "id": npc_id,
        "name": player["name"],
        "gender": player.get("gender", "erkek"),
        "age": player.get("age", 40),
        "profession": player.get("profession", "köylü"),
        "location_id": location["id"],
        "location_name": location["name"],
        "kingdom_id": kingdom_id,
        "kingdom_name": kingdom_name,
        "religion": player.get("religion", "İslam"),
        "culture": player.get("culture", "Türk"),
        "health": 0,  # ölü
        "alive": False,
        "mood": "nötr",
        "relationship": 50,
        "memory": [],
        "events": [],
        "spouse_id": player.get("spouse_id"),
        "children_ids": player.get("children_ids", []),
        "was_player": True,  # Bu NPC eski oyuncuydu
        "player_stats": player.get("stats", {}),
        "player_skills": player.get("skills", {}),
        "player_reputation": player.get("reputation", 0),
    }
    state["world"]["npcs"].append(npc)
    return npc_id


def get_heir_options(state) -> list:
    """Frontend için miras seçeneklerini döndür."""
    player = state["player"]
    options = []
    
    for cid in player.get("children_ids", []):
        npc = next((n for n in state["world"]["npcs"] if n["id"] == cid and n.get("alive", True)), None)
        if npc:
            options.append({
                "type": "çocuk",
                "id": cid,
                "name": npc["name"],
                "age": npc.get("age", 7),
                "gender": npc.get("gender", "erkek"),
                "profession": npc.get("profession", "köylü"),
            })
    
    if not options:
        options.append({
            "type": "sürgün",
            "id": None,
            "name": "Sürgün Olarak Yeni Hayat",
            "desc": "Aynı dünyada, yeni bir çocuk olarak başla. Miras yok ama dünya devam ediyor.",
        })
    
    # Miras önizlemesi
    inherited_money  = round(player.get("money", 0) * 0.60, 1)
    inherited_stats  = {k: max(1, round(v * 0.30)) for k, v in player.get("stats",  {}).items()}
    inherited_skills = {k: max(0, round(v * 0.25)) for k, v in player.get("skills", {}).items()}

    return {
        "options": options,
        "inherited_money":  inherited_money,
        "inherited_stats":  inherited_stats,
        "inherited_skills": inherited_skills,
    }
