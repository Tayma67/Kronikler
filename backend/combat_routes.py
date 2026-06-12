"""Taktik savaş endpoint'leri — GDD v5 Faz 3.

/api/combat/options    GET   savaş türleri + aktif yaralar + süren çatışma
/api/combat/start      POST  {type, bet} çatışma başlat
/api/combat/stance     POST  {stance} duruş seç (hazırlık fazı)
/api/combat/card       POST  {card} eylem kartı oyna
/api/combat/flee       POST  kaç (itibar bedeli)
/api/combat/commander  POST  {cephe, ikmal, baskin} fraksiyon savaşı komutan modu
"""
import random
import uuid
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel

from combat_engine import (
    BATTLE_TYPES, COMMANDER_DECISIONS, start_combat, choose_stance,
    play_card, flee, combat_view, commander_modifier, ensure_combat_fields,
)


class StartIn(BaseModel):
    type: str
    bet: int = 0


class StanceIn(BaseModel):
    stance: str


class CardIn(BaseModel):
    card: str


class CommanderIn(BaseModel):
    cephe: str
    ikmal: str
    baskin: str


def build_combat_router(db):
    router = APIRouter(prefix="/api/combat", tags=["combat"])

    async def get_current_user(request: Request):
        device_id = request.headers.get("X-Device-ID", "").strip()
        if not device_id:
            device_id = str(uuid.uuid4())
        # Faz 6A: istek dili (X-Lang) — contextvar async-güvenli
        from locales import set_language
        set_language(request.headers.get("X-Lang", "tr").strip().lower())
        # Faz 5E: çoklu kayıt — slot 1 varsayılan, 2-3 ayrı kayıt alanı
        slot = request.headers.get("X-Save-Slot", "1").strip()
        if slot not in ("1", "2", "3"):
            slot = "1"
        user_id = device_id if slot == "1" else f"{device_id}#s{slot}"
        return {"_id": user_id}

    async def _ctx(user):
        from game_routes import _load_state, _require_alive
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        ensure_combat_fields(state)
        return state

    async def _save(user, state):
        from game_routes import _save_state
        await _save_state(db, user["_id"], state)

    def _maybe_finish(state, view_or_result):
        """Çatışma bittiyse hafta ilerlet (savaş 1 ay sürer)."""
        if view_or_result and "outcome" in view_or_result:
            from simulation import advance_time
            advance_time(state, weeks=1)
        return view_or_result

    @router.get("/options")
    async def options(user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        player = state["player"]
        # Kuşatma: faction savaştaysa açılır
        faction_at_war = False
        if player.get("faction_id"):
            fac = next((f for f in state["world"].get("factions", [])
                        if f.get("id") == player["faction_id"]), None)
            faction_at_war = bool(fac and fac.get("at_war_with"))
        types = []
        for key, bt in BATTLE_TYPES.items():
            locked = (key == "kusatma" and not faction_at_war)
            types.append({"id": key, "label": bt["label"],
                          "critical": bt["critical"],
                          "stages": bt.get("stages", 1),
                          "has_bet": key == "turnuva",
                          "locked": locked,
                          "lock_reason": "Örgütün savaşta olmalı" if locked else None})
        return {
            "types": types,
            "active": combat_view(state),
            "injuries": player.get("injuries", []),
            "commander_available": faction_at_war,
            "commander_decisions": {
                k: {"label": v["label"],
                    "options": [{"id": ok, "label": ov["label"],
                                 "bonus": f"+%{int(ov['mod']*100)}",
                                 "risk": f"%{int(ov['risk']*100)}" if ov["risk"] else None}
                                for ok, ov in v["options"].items()]}
                for k, v in COMMANDER_DECISIONS.items()},
            "money": player.get("money", 0),
            "health": player.get("health", 100),
            "combat_skill": player.get("skills", {}).get("combat", 0),
        }

    @router.post("/start")
    async def start(body: StartIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        if state["player"].get("age", 7) < 13:
            raise HTTPException(400, "Savaş için en az 13 yaşında olmalısın.")
        view, err = start_combat(state, body.type, body.bet)
        if err:
            raise HTTPException(400, err)
        await _save(user, state)
        return {"combat": view}

    @router.post("/stance")
    async def stance(body: StanceIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        view, err = choose_stance(state, body.stance)
        if err:
            raise HTTPException(400, err)
        await _save(user, state)
        return {"combat": view}

    @router.post("/card")
    async def card(body: CardIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        view, err = play_card(state, body.card)
        if err:
            raise HTTPException(400, err)
        _maybe_finish(state, view)
        await _save(user, state)
        if "outcome" in (view or {}):
            from game_routes import _decorate
            return {"result": view, "state": _decorate(state)}
        return {"combat": view}

    @router.post("/flee")
    async def flee_route(user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        result, err = flee(state)
        if err:
            raise HTTPException(400, err)
        _maybe_finish(state, result)
        await _save(user, state)
        from game_routes import _decorate
        return {"result": result, "state": _decorate(state)}

    @router.post("/commander")
    async def commander(body: CommanderIn, user: dict = Depends(get_current_user)):
        """3C: Fraksiyon savaşında komutan modu — 3 stratejik karar,
        savaş simülasyonunu ±%30 etkiler."""
        state = await _ctx(user)
        player = state["player"]
        if not player.get("faction_id"):
            raise HTTPException(400, "Bir örgüte üye değilsin.")
        fac = next((f for f in state["world"].get("factions", [])
                    if f.get("id") == player["faction_id"]), None)
        if not fac or not fac.get("at_war_with"):
            raise HTTPException(400, "Örgütün şu an savaşta değil.")
        enemy_fac = next((f for f in state["world"].get("factions", [])
                          if f.get("id") == fac["at_war_with"][0]), None)

        mod, log = commander_modifier(state, body.model_dump())

        # Savaş gücü çarpışması: kendi gücün × (1+mod) vs düşman gücü
        own_power = fac.get("military_power", 50) * (1 + mod) * random.uniform(0.85, 1.15)
        enemy_power = (enemy_fac.get("military_power", 50) if enemy_fac else 50) \
            * random.uniform(0.85, 1.15)
        victory = own_power >= enemy_power

        if victory:
            swing = random.randint(4, 8)
            fac["military_power"] = min(100, fac.get("military_power", 50) + swing)
            if enemy_fac:
                enemy_fac["military_power"] = max(0, enemy_fac.get("military_power", 50) - swing)
            loot = int(random.randint(60, 150) * (1 + mod))
            player["money"] = round(player.get("money", 0) + loot, 1)
            player["reputation"] = player.get("reputation", 0) + 5
            player["fame"] = player.get("fame", 0) + 5
            player["faction_contribution"] = player.get("faction_contribution", 0) + 3
            from skills import add_skill_xp
            add_skill_xp(player, "combat", 5)
            log.append(f"ZAFER! Cephe ilerledi (+{swing} güç). Ganimet payın: {loot} altın.")
            outcome = "zafer"
        else:
            swing = random.randint(3, 6)
            fac["military_power"] = max(0, fac.get("military_power", 50) - swing)
            player["health"] = max(10, player.get("health", 100) - random.randint(5, 20))
            player["reputation"] = max(-100, player.get("reputation", 0) - 2)
            log.append(f"Bozgun... Cephe geriledi (-{swing} güç). Sağ çıktın, o da bir şey.")
            outcome = "yenilgi"
            loot = 0

        from simulation import _push_event, advance_time
        _push_event(state, state.get("turn", 0), "komutan_savaşı",
                    f"{player['name']}, {fac['name']} kuvvetlerine komuta etti: {outcome}.")
        advance_time(state, weeks=1)
        await _save(user, state)
        from game_routes import _decorate
        return {"result": {"outcome": outcome, "log": log, "loot": loot,
                           "modifier_pct": int(mod * 100)},
                "state": _decorate(state)}

    return router
