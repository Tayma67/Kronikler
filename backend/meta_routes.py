"""Meta endpoint'ler — GDD v5 Faz 5E: başarımlar + istatistik.

/api/meta/achievements  GET  50 başarımın listesi + açılma durumu
/api/meta/stats         GET  hanedan tarihi, rekorlar, sayaçlar
"""
import uuid
from fastapi import APIRouter, Depends, Request

from achievements import achievement_list, check_achievements


def build_meta_router(db):
    router = APIRouter(prefix="/api/meta", tags=["meta"])

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

    @router.get("/achievements")
    async def achievements(user: dict = Depends(get_current_user)):
        from game_routes import _load_state, _save_state
        state = await _load_state(db, user["_id"])
        newly = check_achievements(state)
        if newly:
            await _save_state(db, user["_id"], state)
        items = achievement_list(state)
        return {"achievements": items,
                "unlocked": sum(1 for a in items if a["unlocked"]),
                "total": len(items)}

    @router.get("/stats")
    async def stats(user: dict = Depends(get_current_user)):
        from game_routes import _load_state
        state = await _load_state(db, user["_id"])
        player = state["player"]
        chronicle = state.get("chronicle", [])

        def count(etype):
            return sum(1 for e in chronicle if e.get("type") == etype)

        return {
            "generation": state.get("generation", 1),
            "turn": state.get("turn", 0),
            "years_played": round(state.get("turn", 0) / 52, 1),
            "dynasty": state.get("dynasty", {"score": 0}),
            "legacy_history": state.get("legacy_history", []),
            "records": {
                "money": round(player.get("money", 0)),
                "reputation": player.get("reputation", 0),
                "fame": player.get("fame", 0),
                "properties": len(state.get("properties", [])),
                "children": len(player.get("children_ids", [])),
                "stories_completed": sum(1 for q in state.get("story_quests", [])
                                         if q["status"] == "tamamlandı"),
                "battles_won": count("savaş_zaferi"),
                "battles_lost": count("savaş_kaybı"),
                "achievements": len(state.get("achievements", [])),
            },
        }

    return router
