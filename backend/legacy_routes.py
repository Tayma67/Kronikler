"""Hanedan & geç oyun endpoint'leri — GDD v5 Faz 4.

/api/legacy/overview      GET   hanedan puanı, vasiyet, çocuk yatırımları, taht/şehir durumu
/api/legacy/will          POST  vasiyet düzenle {style, heir_id?}
/api/legacy/child-invest  POST  çocuk eğitim yolu {child_id, track|null}
/api/legacy/claim-throne  POST  taht iddiası
/api/legacy/found         POST  yerleşim kur {name}
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from legacy_system import (
    ensure_legacy_state, dynasty_title, set_will, set_child_investment,
    EDUCATION_TRACKS, throne_eligibility, claim_throne, found_settlement,
    SETTLEMENT_COST,
)


class WillIn(BaseModel):
    style: str
    heir_id: str | None = None


class InvestIn(BaseModel):
    child_id: str
    track: str | None = None


class FoundIn(BaseModel):
    name: str


def build_legacy_router(db):
    router = APIRouter(prefix="/api/legacy", tags=["legacy"])

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
        from game_routes import _load_state
        state = await _load_state(db, user["_id"])
        ensure_legacy_state(state)
        return state

    async def _save(user, state):
        from game_routes import _save_state
        await _save_state(db, user["_id"], state)

    @router.get("/overview")
    async def overview(user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        player = state["player"]
        children = []
        for cid in player.get("children_ids", []):
            npc = next((n for n in state["world"]["npcs"]
                        if n["id"] == cid and n.get("alive")), None)
            if npc:
                inv = state["child_investments"].get(cid, {})
                children.append({
                    "id": cid, "name": npc["name"], "age": npc.get("age", 0),
                    "gender": npc.get("gender"),
                    "track": inv.get("track"), "weeks": inv.get("weeks", 0),
                })
        spouse_rel = None
        if player.get("spouse_id"):
            spouse = next((n for n in state["world"]["npcs"]
                           if n["id"] == player["spouse_id"]), None)
            spouse_rel = {
                "name": spouse["name"] if spouse else "?",
                "relationship": state.get("relationships", {}).get(player["spouse_id"], 0),
            }
        return {
            "dynasty": {
                "score": state["dynasty"]["score"],
                "title": dynasty_title(state["dynasty"]["score"]),
                "log": list(reversed(state["dynasty"]["log"]))[:10],
                "generation": state.get("generation", 1),
            },
            "will": state["will"],
            "children": children,
            "tracks": {k: {"label": v["label"], "weekly_cost": v["weekly_cost"]}
                       for k, v in EDUCATION_TRACKS.items()},
            "spouse": spouse_rel,
            "throne": throne_eligibility(state),
            "settlement_cost": SETTLEMENT_COST,
            "money": player.get("money", 0),
            "legacy_history": state.get("legacy_history", [])[-10:],
        }

    @router.post("/will")
    async def will_route(body: WillIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        from game_routes import _require_alive
        _require_alive(state)
        result, err = set_will(state, body.style, body.heir_id)
        if err:
            raise HTTPException(400, err)
        await _save(user, state)
        return {"ok": True, "will": result}

    @router.post("/child-invest")
    async def child_invest(body: InvestIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        from game_routes import _require_alive
        _require_alive(state)
        result, err = set_child_investment(state, body.child_id, body.track)
        if err:
            raise HTTPException(400, err)
        await _save(user, state)
        return {"ok": True, **(result or {})}

    @router.post("/claim-throne")
    async def claim(user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        from game_routes import _require_alive
        _require_alive(state)
        result, err = claim_throne(state, state.get("turn", 0))
        if err:
            raise HTTPException(400, err)
        from simulation import advance_time
        advance_time(state, weeks=1)
        await _save(user, state)
        from game_routes import _decorate
        return {"ok": True, "result": result, "state": _decorate(state)}

    @router.post("/found")
    async def found(body: FoundIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        from game_routes import _require_alive
        _require_alive(state)
        result, err = found_settlement(state, body.name, state.get("turn", 0))
        if err:
            raise HTTPException(400, err)
        await _save(user, state)
        return {"ok": True, "result": result, "money": state["player"]["money"]}

    return router
