#!/usr/bin/env python3
"""Görsel QA için sahte oyun state'i üretir (backend/Mongo gerekmez).

world_gen + simulation çekirdeğini doğrudan çalıştırır, ~7 yıl ilerletir
(oyuncu yetişkin olur → tüm UI açılır), sonucu /game/state şekline yakın
JSON olarak yazar. screenshot.js bunu mock'layıp ekranları render eder.

Kullanım:
    PYTHONPATH=backend PYTHONHASHSEED=0 python frontend/tools/visual_qa/gen_state.py \
        > frontend/tools/visual_qa/state.json
(veya çıktı yolu argümanla)
"""
import os
import sys
import json

from world_gen import generate_world, generate_player
from simulation import advance_time, _ensure_state_fields
from calendar_tr import current_calendar, player_age


def _try(fn):
    try:
        return fn()
    except Exception:
        return None


def build_state(months=90):
    world = generate_world(n_kingdoms=3, n_cities=4, n_villages=8,
                           n_castles=4, n_npcs=300)
    gp = generate_player(world)
    player = gp[0] if isinstance(gp, (list, tuple)) else gp
    state = {"turn": 0, "day": 0, "world": world, "player": player,
             "relationships": {}, "quests": [], "history": []}
    _ensure_state_fields(state)
    try:
        from faction_system import init_factions_for_world
        _try(lambda: init_factions_for_world(state, 0))
    except Exception:
        pass
    try:
        from dynasties import ensure_dynasties
        _try(lambda: ensure_dynasties(state))
    except Exception:
        pass
    advance_time(state, weeks=months)   # 1 tur = 1 ay

    # Hafif "decorate" — auth/fastapi zincirine girmeden (game_routes._decorate
    # tam sürümü; burada UI'nın okuduğu temel alanları manuel ekliyoruz).
    p = state["player"]
    state["calendar"] = current_calendar(state)
    p["age"] = player_age(state)
    p["age_group"] = "yetişkin" if p["age"] >= 13 else "çocuk"
    p["is_child"] = p["age"] < 13
    p.setdefault("relationship_status", {})
    soc = _try(lambda: __import__("social_reputation").social_summary(p))
    if soc is not None:
        p["social"] = soc
    p.setdefault("career", {"title": p.get("profession", "İşsiz")})
    return state


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else None
    st = build_state()
    data = json.dumps(st, default=str, ensure_ascii=False)
    if out:
        with open(out, "w") as f:
            f.write(data)
        p = st["player"]
        sys.stderr.write(f"OK age={p['age']} season={st['calendar']['season']} "
                         f"hist={len(st.get('history', []))}\n")
    else:
        sys.stdout.write(data)
