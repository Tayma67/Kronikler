"""Mülk sahipliği endpoint'leri — GDD v5 Faz 1B (8 endpoint).

/api/property/catalog   GET   satın alınabilir tipler + yerel fiyatlar
/api/property/mine      GET   mülk raporu
/api/property/buy       POST  satın al
/api/property/sell      POST  sat
/api/property/configure POST  yönet (ekin, stok, marj, ürün hattı, oda, muhafız, genişletme)
/api/property/hire      POST  işçi tut
/api/property/fire      POST  işçi çıkar
/api/property/harvest   POST  hasat topla
"""
import uuid
from fastapi import APIRouter, Body, Depends, HTTPException, Request
from pydantic import BaseModel

from locales import t
from property_system import (
    PROPERTY_TYPES, ensure_properties, buy_property, sell_property,
    configure_property, upgrade_house, hire_worker, fire_worker,
    collect_harvest, property_report,
)
from production_chains import RECIPES


class BuyIn(BaseModel):
    type: str
    location_id: str | None = None   # boşsa oyuncunun bulunduğu yer


class PropIn(BaseModel):
    property_id: str


class ConfigureIn(BaseModel):
    property_id: str
    crop: str | None = None
    stock_good: str | None = None
    margin: float | None = None
    recipe_prof: str | None = None
    recipe_id: str | None = None
    room_price: int | None = None
    guards: int | None = None
    upgrade: bool = False            # ev genişletme


class WorkerIn(BaseModel):
    property_id: str
    npc_id: str


def build_property_router(db):
    router = APIRouter(prefix="/api/property", tags=["property"])

    async def get_current_user(request: Request):
        device_id = request.headers.get("X-Device-ID", "").strip()
        if not device_id:
            device_id = str(uuid.uuid4())
        return {"_id": device_id}

    async def _ctx(user):
        from game_routes import _load_state
        state = await _load_state(db, user["_id"])
        ensure_properties(state)
        return state

    async def _save(user, state):
        from game_routes import _save_state
        await _save_state(db, user["_id"], state)

    def _alive_or_409(state):
        from game_routes import _require_alive
        _require_alive(state)

    @router.get("/catalog")
    async def catalog(user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        player = state["player"]
        loc = next((l for l in state["world"]["locations"]
                    if l["id"] == player["location_id"]), None)
        wealth = loc.get("wealth", 50) if loc else 50
        types = []
        for key, pt in PROPERTY_TYPES.items():
            types.append({
                "type": key,
                "label": pt["label"],
                "icon": pt["icon"],
                "desc": t(pt["desc_key"]),
                "cost": int(pt["cost"] * (0.8 + wealth / 125)),
                "base_cost": pt["cost"],
                "min_age": pt["min_age"],
                "maintenance": pt["maintenance"],
                "max_workers": pt["max_workers"],
                "eligible": player["age"] >= pt["min_age"],
            })
        # İşlik ürün hatları (frontend seçim listesi)
        recipe_options = []
        for prof, recipes in RECIPES.items():
            for r in recipes:
                recipe_options.append({
                    "recipe_prof": prof, "recipe_id": r["id"],
                    "input": r["input"], "output": {r["output"][0]: r["output"][1]},
                })
        return {"types": types, "location": loc["name"] if loc else None,
                "money": player.get("money", 0),
                "recipe_options": recipe_options,
                "crops": list(PROPERTY_TYPES["tarla"]["crops"].keys())}

    @router.get("/mine")
    async def mine(user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        return {"properties": property_report(state),
                "money": state["player"].get("money", 0)}

    @router.post("/buy")
    async def buy(body: BuyIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        _alive_or_409(state)
        loc_id = body.location_id or state["player"]["location_id"]
        prop, err = buy_property(state, body.type, loc_id, state.get("turn", 0))
        if err:
            raise HTTPException(status_code=400, detail=err)
        from simulation import _push_event
        _push_event(state, state.get("turn", 0), "mülk_alım",
                    t("mulk.satin_alindi", name=prop["name"], cost=prop["purchase_cost"]))
        await _save(user, state)
        return {"ok": True, "property": prop, "money": state["player"]["money"],
                "properties": property_report(state)}

    @router.post("/sell")
    async def sell(body: PropIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        _alive_or_409(state)
        from property_system import get_property
        prop = get_property(state, body.property_id)
        name = prop["name"] if prop else "?"
        value, err = sell_property(state, body.property_id, state.get("turn", 0))
        if err:
            raise HTTPException(status_code=400, detail=err)
        from simulation import _push_event
        _push_event(state, state.get("turn", 0), "mülk_satış",
                    t("mulk.satildi", name=name, value=value))
        await _save(user, state)
        return {"ok": True, "value": value, "money": state["player"]["money"],
                "properties": property_report(state)}

    @router.post("/configure")
    async def configure(body: ConfigureIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        _alive_or_409(state)
        if body.upgrade:
            prop, err = upgrade_house(state, body.property_id, state.get("turn", 0))
        else:
            updates = {k: v for k, v in body.model_dump().items()
                       if v is not None and k not in ("property_id", "upgrade")}
            prop, err = configure_property(state, body.property_id, updates)
        if err:
            raise HTTPException(status_code=400, detail=err)
        await _save(user, state)
        return {"ok": True, "money": state["player"]["money"],
                "properties": property_report(state)}

    @router.post("/hire")
    async def hire(body: WorkerIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        _alive_or_409(state)
        prop, err = hire_worker(state, body.property_id, body.npc_id)
        if err:
            raise HTTPException(status_code=400, detail=err)
        await _save(user, state)
        return {"ok": True, "properties": property_report(state)}

    @router.post("/fire")
    async def fire(body: WorkerIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        _alive_or_409(state)
        prop, err = fire_worker(state, body.property_id, body.npc_id)
        if err:
            raise HTTPException(status_code=400, detail=err)
        await _save(user, state)
        return {"ok": True, "properties": property_report(state)}

    @router.post("/harvest")
    async def harvest(body: PropIn, user: dict = Depends(get_current_user)):
        state = await _ctx(user)
        _alive_or_409(state)
        result, err = collect_harvest(state, body.property_id, state.get("turn", 0))
        if err:
            raise HTTPException(status_code=400, detail=err)
        from simulation import _push_event
        from property_system import get_property
        prop = get_property(state, body.property_id)
        _push_event(state, state.get("turn", 0), "mülk_hasat",
                    t("mulk.hasat_toplandi", name=prop["name"],
                      qty=result["qty"], crop=result["good"]))
        await _save(user, state)
        return {"ok": True, **result,
                "inventory": state["player"].get("inventory", {}),
                "properties": property_report(state)}

    return router
