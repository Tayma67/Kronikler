"""Hikâye yayı endpoint'leri — GDD v5 Faz 2 (Quest Günlüğü).

/api/story/journal  GET   aktif/teklif/biten yaylar
/api/story/start    POST  teklifi kabul et
/api/story/decline  POST  teklifi reddet (26 hafta gelmez)
/api/story/choose   POST  aktif adımda seçim yap
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from quest_engine import (
    ensure_story_state, start_arc, decline_offer, choose, get_journal,
)


class ArcIn(BaseModel):
    arc_id: str


class ChooseIn(BaseModel):
    arc_id: str
    choice_index: int


def build_story_router(db):
    router = APIRouter(prefix="/api/story", tags=["story"])

    async def get_current_user(request: Request):
        device_id = request.headers.get("X-Device-ID", "").strip()
        if not device_id:
            device_id = str(uuid.uuid4())
        return {"_id": device_id}

    async def _ctx(user):
        from game_routes import _load_state
        state = await _load_state(db, user["_id"])
        ensure_story_state(state)
        return state

    async def _save(user, state):
        from game_routes import _save_state
        await _save_state(db, user["_id"], state)

    @router.get("/journal")
    async def journal(user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        return get_journal(state, state.get("turn", 0))

    @router.post("/start")
    async def start(body: ArcIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        from game_routes import _require_alive
        _require_alive(state)
        inst, err = start_arc(state, body.arc_id, state.get("turn", 0))
        if err:
            raise HTTPException(status_code=400, detail=err)
        await _save(user, state)
        return {"ok": True, "journal": get_journal(state, state.get("turn", 0))}

    @router.post("/decline")
    async def decline(body: ArcIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        decline_offer(state, body.arc_id)
        await _save(user, state)
        return {"ok": True, "journal": get_journal(state, state.get("turn", 0))}

    @router.post("/choose")
    async def choose_route(body: ChooseIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        from game_routes import _require_alive
        _require_alive(state)
        outcome, err = choose(state, body.arc_id, body.choice_index, state.get("turn", 0))
        if err:
            raise HTTPException(status_code=400, detail=err)
        await _save(user, state)
        return {"ok": True, "outcome": outcome,
                "journal": get_journal(state, state.get("turn", 0)),
                "player": {"money": state["player"].get("money"),
                           "health": state["player"].get("health"),
                           "reputation": state["player"].get("reputation")}}

    return router
