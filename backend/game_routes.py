"""Game API endpoints — V3: child-start, stats, skills, items, family quests."""
import random
import uuid
from fastapi import APIRouter, Body, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional

from auth import make_get_current_user
from world_gen import generate_world, generate_player, initial_history, new_id
from simulation import (
    advance_time, _push_event, _ensure_state_fields, _recompute_prices,
    soldier_check, _ensure_market,
)
from dialogue import (
    generate_response, relation_band, relationship_delta,
    DIALOG_TOPICS, npc_status, player_status, SOCIAL_STATUS,
    emotional_stage,
)
from calendar_tr import current_calendar, player_age
from items import ITEMS, EQUIPMENT_SLOTS, apply_use_effects, equipment_bonuses, get_item
from skills import (
    JOB_REQUIREMENTS, check_job_eligible, list_eligible_jobs,
    apply_work_training, unlocked_perks, get_age_group, SKILL_PERKS, SKILL_KEYS, STAT_KEYS,
)
from family_quests import make_family_quests, unlock_age_appropriate, progress_quest
from inheritance import begin_inheritance, get_heir_options, has_heir
from game_engine import (
    build_action_result, get_suggested_actions,
    snapshot_player, diff_snapshots, check_state_triggers,
)
from npc_interactions import (
    do_compliment, do_gift, do_give_money, do_insult,
    do_flirt, do_propose, do_gossip, do_kidnap,
)
from school import (
    ensure_school_state, attend_lesson, join_club, leave_club,
    do_seasonal_activity, do_special_event, get_school_summary,
    weekly_school_tick, LESSONS, CLUBS,
)
from opportunities import (
    ensure_opportunities, refresh_opportunities,
    accept_opportunity, decline_opportunity, complete_opportunity,
)
from social_reputation import (
    apply_good_deed, apply_heroic_act, apply_crime_committed,
    apply_attack_or_kill, apply_battle_victory, apply_help_npc,
    trade_price_multiplier, npc_attack_probability,
    social_summary, npc_reaction_flavor, lord_will_receive,
)

SCHEMA_VERSION = "v3"

WORLD_DEFAULTS = {
    "n_kingdoms": 3,
    "n_cities": 3,
    "n_villages": 10,
    "n_castles": 5,
    "n_npcs": 100,
}

# Child can do these (everything else gated until age 13)
CHILD_ALLOWED_PROFESSIONS = ["işsiz", "köylü"]
ADULT_AGE = 13          # Genel yetişkin eşiği (savaş, faction, iş vb.)
REBELLION_AGE = 18      # İsyan başlatmak için minimum yaş
TEEN_AGE = 13           # Genç aktivitelerine erişim yaşı (kavga vb.)


# -------- Pydantic --------
class ChatIn(BaseModel):
    npc_id: str
    topic: str


class TravelIn(BaseModel):
    location_id: str


class TradeIn(BaseModel):
    location_id: str
    good: str
    qty: int
    action: str  # "al" or "sat"


class CrimeIn(BaseModel):
    crime_type: str
    target_npc_id: Optional[str] = None


class JobIn(BaseModel):
    profession: str


class QuestIn(BaseModel):
    quest_id: str


class MarryIn(BaseModel):
    npc_id: str


class AttackIn(BaseModel):
    npc_id: str


class BattleIn(BaseModel):
    strategy: str = "saldır"   # "saldır" | "savun" | "kaç"


class UseItemIn(BaseModel):
    item: str
    qty: int = 1


class EquipIn(BaseModel):
    item: str  # item key in inventory


class UnequipIn(BaseModel):
    slot: str


class AdvanceIn(BaseModel):
    weeks: int = 1


class StatAllocateIn(BaseModel):
    stat: str  # "strength" | "intelligence" | "charisma" | "stamina"

class NewGameIn(BaseModel):
    first_name: str = ""
    surname: str = ""
    gender: str = ""   # "erkek" | "kadın" | ""


class CaravanCreateIn(BaseModel):
    destination_id: str
    goods: dict          # { good: qty }
    cash_on_hand: float = 0.0


# -------- State helpers --------
async def _load_state(db, user_id: str):
    state = await db.game_states.find_one({"user_id": user_id})
    if not state:
        raise HTTPException(status_code=404, detail="Aktif oyun bulunamadı")
    if state.get("schema_version") != SCHEMA_VERSION:
        # Old game schema — purge and require new game
        await db.game_states.delete_one({"user_id": user_id})
        raise HTTPException(status_code=409,
                            detail="Oyun şeması güncellendi. Lütfen yeni oyun başlat.")
    state.pop("_id", None)
    _ensure_state_fields(state)
    return state


async def _save_state(db, user_id: str, state: dict):
    state["user_id"] = user_id
    state["schema_version"] = SCHEMA_VERSION
    await db.game_states.update_one(
        {"user_id": user_id}, {"$set": state}, upsert=True
    )


def _decorate(state):
    """Attach derived view-only fields (calendar, perks, eligible jobs)."""
    cal = current_calendar(state)
    state["calendar"] = cal
    state["player"]["age"] = player_age(state)
    state["player"]["age_group"] = get_age_group(state["player"]["age"])
    state["player"]["is_child"] = state["player"]["age"] < ADULT_AGE
    state["player"]["perks"] = unlocked_perks(state["player"])
    state["player"]["equipment_bonuses"] = equipment_bonuses(state["player"])
    # Expose relationship_status so frontend shows dating/married badges
    state["player"].setdefault("relationship_status", {})
    # Expose pending cinematic flag
    state["coming_of_age_pending"] = state["player"].get("coming_of_age_pending")
    # Toplumsal itibar özeti
    state["player"]["social"] = social_summary(state["player"])
    # FIX-14: Oyuncunun faction durumunu view'a ekle
    player_faction_id = state["player"].get("faction_id")
    if player_faction_id:
        from faction_system import _get_faction
        fac = _get_faction(state, player_faction_id)
        if fac:
            state["player"]["faction"] = {
                "id": fac["id"],
                "name": fac["name"],
                "type": fac.get("type", ""),
                "role": state["player"].get("faction_role"),
                "stability": fac["stability"],
                "economy_level": fac["economy_level"],
                "military_power": fac["military_power"],
                "at_war": len(fac.get("at_war_with", [])) > 0,
                "member_count": len(fac.get("members", [])),
            }
        else:
            state["player"]["faction"] = None
    else:
        state["player"]["faction"] = None
    # Üyelik durumu ve kalan yasak süresini her zaman expose et
    current_turn = state.get("turn", 0)
    ban_until = state["player"].get("faction_join_banned_until", 0)
    weeks_left = max(0, ban_until - current_turn)
    state["player"]["faction_membership_status"] = state["player"].get(
        "faction_membership_status", "active" if player_faction_id else None
    )
    state["player"]["faction_join_weeks_left"] = weeks_left
    # Birikim sayaçlarını da expose et (frontend gösterimleri için)
    state["player"].setdefault("faction_leave_count", 0)
    state["player"].setdefault("faction_kicked_count", 0)
    state["player"].setdefault("faction_rebel_count", 0)
    return state


def _require_adult(state, what="bu eylemi"):
    """0-12 yaş arası karakterleri yetişkin eylemlerinden engeller."""
    age = state["player"]["age"]
    if age < ADULT_AGE:
        messages = {
            "savaş":       "Savaşmak için çok küçüksün.",
            "saldırı":     "Savaşmak için çok küçüksün.",
            "suç":         "Bu işi yapmak için çok küçüksün.",
            "evlilik":     "Evlenmek için yeterince büyük değilsin.",
            "faction_katılım": "Bir factiona katılmak için biraz daha büyümen gerekiyor.",
            "faction_kurma":   "Faction kurmak için biraz daha büyümen gerekiyor.",
        }
        msg = messages.get(what, f"Bu eylemi gerçekleştirmek için çok küçüksün. (Yaş: {age})")
        raise HTTPException(status_code=403, detail=msg)


def _require_rebellion_age(state):
    """18 yaş altı karakterlerin isyan başlatmasını engeller."""
    age = state["player"]["age"]
    if age < REBELLION_AGE:
        raise HTTPException(
            status_code=403,
            detail="İsyan başlatmak için yetişkin olmalısın.",
        )


def _require_teen(state, what="bu aktiviteye"):
    """0-12 yaş arası karakterleri genç aktivitelerinden engeller."""
    age = state["player"]["age"]
    if age < TEEN_AGE:
        raise HTTPException(
            status_code=403,
            detail=f"Bu aktiviteye katılmak için çok küçüksün. (Yaş: {age})",
        )


def _require_alive(state):
    """Ölü oyuncunun aksiyon yapmasını engeller; kalıtım seçenekleri döner."""
    if state["player"].get("dead"):
        from inheritance import get_heir_options
        heir_data = get_heir_options(state)
        raise HTTPException(
            status_code=409,
            detail={
                "error": "oyuncu_öldü",
                "message": "Karakterin öldü. Mirası devral.",
                "heir_options": heir_data.get("options", []),
                "inherited_money":  heir_data.get("inherited_money", 0),
                "inherited_stats":  heir_data.get("inherited_stats", {}),
                "inherited_skills": heir_data.get("inherited_skills", {}),
            },
        )


def build_game_router(db):
    router = APIRouter(prefix="/api/game", tags=["game"])
    
    # ─────────────────────────────────────────────────────────
    #  Cihaz Kimliği ile Kullanıcı Tanımlama
    #  Frontend her cihaz için benzersiz bir UUID üretir ve bunu
    #  X-Device-ID başlığı olarak gönderir.
    #  • Başlık varsa → o cihazın kalıcı kimliği kullanılır.
    #  • Başlık yoksa → o istek için rastgele bir UUID oluşturulur
    #    (hiçbir zaman sabit bir fallback string kullanılmaz).
    # ─────────────────────────────────────────────────────────
    async def get_current_user(request: Request):
        device_id = request.headers.get("X-Device-ID", "").strip()
        if not device_id:
            # Başlık boş geldi — rastgele ID üret (sabit string ASLA)
            device_id = str(uuid.uuid4())
        return {"_id": device_id}

    # ---------- core ----------


    # ---------- core ----------
    @router.post("/new")
    async def new_game(body: NewGameIn = Body(default=NewGameIn()), user: dict = Depends(get_current_user)):
        first_name = (body.first_name or "").strip()
        surname    = (body.surname    or "").strip()
        gender     = (body.gender     or "").strip()

        # Tam adı birleştir; her ikisi girilmişse "Ad Soyad" formatı
        player_name = None
        if first_name:
            player_name = f"{first_name} {surname}".strip() if surname else first_name

        world = generate_world(**WORLD_DEFAULTS)
        player, mother, father = generate_player(
            world,
            name=player_name or None,
            gender=gender if gender in ("erkek", "kadın") else None,
            surname=surname or None,
        )
        state = {
            "user_id": user["_id"],
            "schema_version": SCHEMA_VERSION,
            "turn": 0, "day": 0,
            "world": world, "player": player,
            "relationships": {}, "quests": [], "history": initial_history(),
            "family_quests": make_family_quests({}, mother["id"], father["id"]),
        }
        _ensure_state_fields(state)
        ensure_school_state(state)
        ensure_opportunities(state)
        # Faction sistemini başlat
        from faction_system import init_factions_for_world
        init_factions_for_world(state, 0)
        # Unlock starting quests
        unlock_age_appropriate(state)
        refresh_opportunities(state)
        _push_event(state, 0, "doğum",
                    f"{player['name']} doğdu. Anne: {mother['name']}, Baba: {father['name']}.")
        await _save_state(db, user["_id"], state)
        return _decorate(state)

    @router.get("/state")
    async def get_state(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        ensure_opportunities(state)
        open_opps = [o for o in state.get("opportunities", []) if o["status"] == "açık"]
        if len(open_opps) < 3:
            refresh_opportunities(state)
            await _save_state(db, user["_id"], state)
        return _decorate(state)

    @router.delete("/state")
    async def delete_state(user: dict = Depends(get_current_user)):
        await db.game_states.delete_one({"user_id": user["_id"]})
        return {"ok": True}

    @router.post("/advance")
    async def advance(weeks: int = 1, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        before = snapshot_player(state["player"])
        advance_time(state, weeks=max(1, min(weeks, 52)))
        refresh_opportunities(state)
        after = snapshot_player(state["player"])
        diff = diff_snapshots(before, after)
        triggers = check_state_triggers(state, state["turn"])
        suggestions = get_suggested_actions(state)
        # Kervan eventi (8B): advance sonrası UI'ya iletilir
        caravan_event = state.pop("pending_caravan_event", None)
        # Dünya olayları (9): bu turda başlayan aktif eventler
        from world_events import get_active_world_events
        current_turn = state.get("turn", 0)
        new_world_events = [
            ev for ev in get_active_world_events(state)
            if ev.get("started_day") == current_turn
        ]
        await _save_state(db, user["_id"], state)
        result = _decorate(state)
        result["advance_diff"] = diff
        result["triggers"] = triggers
        result["suggestions"] = suggestions
        if caravan_event:
            result["caravan_event"] = caravan_event
        if new_world_events:
            result["new_world_events"] = new_world_events
        return result

    # ---------- chat ----------
    @router.post("/chat")
    async def chat(body: ChatIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        npc = next((n for n in state["world"]["npcs"] if n["id"] == body.npc_id), None)
        if not npc or not npc["alive"]:
            raise HTTPException(status_code=404, detail="NPC bulunamadı veya ölü")

        rel = state["relationships"].get(npc["id"], 0)
        if rel <= -70 and npc["profession"] in ("asker", "lord", "haydut") and body.topic == "selam":
            return {
                "response": f"{npc['name']} kılıcını çekti! Konuşma değil savaş istiyor.",
                "relationship": rel,
                "band": relation_band(rel),
                "hostile": True,
            }

        npc["interactions"][body.topic] = npc["interactions"].get(body.topic, 0) + 1
        npc["turn_counter"] = npc.get("turn_counter", 0) + 1
        repeat = npc["interactions"][body.topic]
        stage = emotional_stage(repeat)

        # Merchant supply signal
        loc = next((l for l in state["world"]["locations"] if l["id"] == npc["location_id"]), None)
        if loc and npc["profession"] == "tüccar":
            good = random.choice(list(loc["market"].keys()))
            ratio = loc["market"][good]["supply"] / max(1, loc["market"][good]["demand"])
            if ratio < 0.5:
                npc["_loc_supply_signal"] = "scarce"
            elif ratio > 1.5:
                npc["_loc_supply_signal"] = "abundant"
            else:
                npc["_loc_supply_signal"] = "normal"

        # Ensure player age set for dialogue
        state["player"]["age"] = player_age(state)
        # Make parent_ids visible to dialogue (used by child path)
        _ = state["player"].get("parent_ids") or []

        response, proactive = generate_response(
            npc, rel, body.topic, state["player"],
            state["history"], state["turn"], npc["turn_counter"], state=state,
        )

        delta = relationship_delta(npc, body.topic, state["player"], repeat)
        new_rel = max(-100, min(100, rel + delta))
        state["relationships"][npc["id"]] = new_rel

        # Son topic'i hafızadan çek (frontend memory hint için)
        prev_memory = (npc.get("memory") or [])
        last_topic = prev_memory[-1]["topic"] if prev_memory else None

        npc.setdefault("memory", []).append({
            "day": state["turn"],
            "topic": body.topic,
            "delta": delta,
            "stage": stage,
            "player_rep": state["player"].get("reputation", 0),
            "player_crime": state["player"].get("crime", 0),
        })
        if len(npc["memory"]) > 20:
            npc["memory"] = npc["memory"][-20:]

        # Strong-interaction → personal memory
        from npc_profile import push_personal_memory
        if stage == "düşmanlık":
            push_personal_memory(npc, f"{state['player']['name']} beni rahatsız etti")
        elif delta >= 2:
            push_personal_memory(npc, f"{state['player']['name']} ile güzel sohbet ettik")

        npc.pop("_loc_supply_signal", None)

        # Child charisma/social training from interactions
        if state["player"]["age"] < ADULT_AGE:
            from skills import add_stat_xp, add_skill_xp
            add_skill_xp(state["player"], "social", 1)
            if repeat == 1:
                add_stat_xp(state["player"], "charisma", 2)

        progress_quest(state, "chat", {"npc_id": npc["id"]})

        await _save_state(db, user["_id"], state)
        return {
            "response": response,
            "proactive": proactive or None,
            "last_topic": last_topic,
            "relationship": new_rel,
            "band": relation_band(new_rel),
            "repeat_count": repeat,
            "stage": stage,
            "delta": delta,
            "state": _decorate(state),
        }

    @router.get("/dialog-topics")
    async def dialog_topics():
        return [{"id": t[0], "label": t[1]} for t in DIALOG_TOPICS]

    # ---------- travel ----------
    @router.post("/travel")
    async def travel(body: TravelIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        loc = next((l for l in state["world"]["locations"] if l["id"] == body.location_id), None)
        if not loc:
            raise HTTPException(status_code=404, detail="Konum bulunamadı")
        # Children can only travel to villages or their home location
        if state["player"]["age"] < ADULT_AGE and loc["kind"] in ("kale",):
            raise HTTPException(status_code=403,
                                detail="Çocuk olarak kaleye gidemezsin.")
        if loc["kingdom_id"] in state["player"].get("wanted_in", []):
            return {
                "state": _decorate(state),
                "blocked": True,
                "message": f"{loc['name']} {loc['kingdom_name']} sınırlarında, oraya başın için ödül var.",
            }
        state["player"]["location_id"] = loc["id"]
        state["player"]["location_name"] = loc["name"]
        _push_event(state, state["turn"], "yolculuk",
                    f"{state['player']['name']} {loc['name']}'e doğru yola çıktı.")
        advance_time(state, weeks=1)
        outcome = soldier_check(state)
        progress_quest(state, "travel", {"location_id": loc["id"]})
        await _save_state(db, user["_id"], state)
        return {"state": _decorate(state), "enforcement": outcome}

    # ---------- trade ----------
    @router.post("/trade")
    async def trade(body: TradeIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        loc = next((l for l in state["world"]["locations"] if l["id"] == body.location_id), None)
        if not loc:
            raise HTTPException(status_code=404, detail="Konum bulunamadı")
        if body.good not in loc["market"]:
            raise HTTPException(status_code=400, detail="Geçersiz ürün")
        if body.qty < 1:
            raise HTTPException(status_code=400, detail="Miktar 1'den az olamaz")
        m = loc["market"][body.good]
        player = state["player"]
        inv = player.setdefault("inventory", {})

        if body.action == "al":
            if m["supply"] < body.qty:
                raise HTTPException(status_code=400, detail=f"Stokta sadece {m['supply']} adet var")
            # Yüksek itibar → daha ucuz alım
            buy_mult = trade_price_multiplier(player, "al")
            total = round(m["price"] * body.qty * buy_mult, 1)
            if player["money"] < total:
                raise HTTPException(status_code=400, detail="Yeterli paran yok")
            player["money"] = round(player["money"] - total, 1)
            inv[body.good] = inv.get(body.good, 0) + body.qty
            m["supply"] -= body.qty
            m["demand"] += body.qty
            _recompute_prices(loc)
            _push_event(state, state["turn"], "ticaret",
                        f"{player['name']} {loc['name']}'de {body.qty} {body.good} aldı ({total} altın).")
        elif body.action == "sat":
            if inv.get(body.good, 0) < body.qty:
                raise HTTPException(status_code=400, detail="Yeterli ürünün yok")
            # Yüksek itibar → daha pahalı satış
            sell_mult = trade_price_multiplier(player, "sat")
            total = round(m["price"] * body.qty * sell_mult, 1)
            inv[body.good] -= body.qty
            player["money"] = round(player["money"] + total, 1)
            m["supply"] += body.qty
            m["demand"] = max(1, m["demand"] - body.qty)
            _recompute_prices(loc)
            _push_event(state, state["turn"], "ticaret",
                        f"{player['name']} {loc['name']}'de {body.qty} {body.good} sattı ({total} altın).")
        else:
            raise HTTPException(status_code=400, detail="Geçersiz işlem")

        # Trade training
        from skills import add_skill_xp, add_stat_xp
        add_skill_xp(player, "trade", 1)
        if player["age"] < ADULT_AGE:
            add_stat_xp(player, "charisma", 1)

        progress_quest(state, "inventory_changed")
        await _save_state(db, user["_id"], state)
        return _decorate(state)

    # ---------- job / work ----------
    @router.get("/jobs")
    async def list_jobs(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        return {"jobs": list_eligible_jobs(state["player"])}

    @router.post("/job")
    async def change_job(body: JobIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        if body.profession not in JOB_REQUIREMENTS:
            raise HTTPException(status_code=400, detail="Geçersiz meslek")
        if body.profession == "lord":
            raise HTTPException(status_code=403, detail="Lord olmak için bir kale ele geçirmelisin")
        if state["player"]["age"] < ADULT_AGE and body.profession not in CHILD_ALLOWED_PROFESSIONS:
            raise HTTPException(status_code=403,
                                detail=f"Çocuk olarak sadece şunları yapabilirsin: {', '.join(CHILD_ALLOWED_PROFESSIONS)}")
        ok, reasons = check_job_eligible(state["player"], body.profession)
        if not ok:
            raise HTTPException(status_code=400,
                                detail="Bu meslek için yeterli değilsin: " + "; ".join(reasons))
        state["player"]["profession"] = body.profession
        _push_event(state, state["turn"], "meslek_değişimi",
                    f"{state['player']['name']} artık bir {body.profession}.")
        await _save_state(db, user["_id"], state)
        return _decorate(state)

    @router.post("/work")
    async def work(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        player = state["player"]
        # Income per DAY scales with stats and skills
        daily_income_map = {
            "işsiz": (0, 0),
            "köylü": (0, 2), "çiftçi": (1, 4), "asker": (2, 5),
            "tüccar": (3, 8), "avcı": (1, 6), "demirci çırağı": (1, 4),
            "demirci": (4, 12), "zanaatkar": (2, 7), "haydut": (3, 12),
            "lord": (15, 70), "şövalye": (6, 18), "şifacı": (3, 10),
            "katip": (2, 7), "rahip": (2, 8),
        }
        prof = player["profession"]
        lo, hi = daily_income_map.get(prof, (0, 1))
        # Skill bonus
        skills = player.get("skills", {})
        if prof in ("tüccar", "demirci"):
            bonus = 1 + skills.get("trade", 0) * 0.05 + skills.get("crafting", 0) * 0.05
            lo, hi = int(lo * bonus), int(hi * bonus)
        income = random.randint(lo, hi) if hi > lo else lo
        player["money"] = round(player["money"] + income, 1)
        player["health"] = max(20, player["health"] - random.randint(0, 2))
        player["hunger"] = max(0, player.get("hunger", 100) - 1)

        # Production at current location (small per-day)
        loc = next((l for l in state["world"]["locations"] if l["id"] == player["location_id"]), None)
        if loc:
            from simulation import PRODUCTION
            _ensure_market(loc)
            prod = PRODUCTION.get(prof)
            if prod and prod[0]:
                good, amt = prod
                loc["market"][good]["supply"] += max(1, amt // 2)
                _recompute_prices(loc)

        # Faction contribution: her iş günü +1
        if player.get("faction_id"):
            player["faction_contribution"] = player.get("faction_contribution", 0) + 1

        # Track work units; 7 units = 1 week passes
        player["work_units"] = player.get("work_units", 0) + 1
        progress_quest(state, "work")
        leveled = []
        days_passed = 1
        week_passed = False
        if player["work_units"] >= 7:
            week_passed = True
            player["work_units"] = 0
            # Skill/stat training accumulates at end of week
            leveled = apply_work_training(player, prof)
            # Now advance a full week
            advance_time(state, weeks=1)
        else:
            # Manually advance just 1 day's hunger/age effects (no full simulation tick)
            # We just bump a sub-tracker; calendar stays the same.
            pass

        if income > 0:
            _push_event(state, state["turn"], "çalışma",
                        f"{player['name']} bir gün {prof} olarak çalıştı, {income} altın.")
        # No event for işsiz boş günler (gereksiz spam)

        outcome = soldier_check(state) if week_passed else None
        await _save_state(db, user["_id"], state)
        return {"state": _decorate(state), "enforcement": outcome,
                "income": income, "leveled": leveled,
                "days_passed": days_passed, "week_passed": week_passed,
                "work_units": player["work_units"]}

    # ---------- crime / attack ----------
    @router.post("/crime")
    async def commit_crime(body: CrimeIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        _require_adult(state, "suç")
        player = state["player"]
        loc = next((l for l in state["world"]["locations"] if l["id"] == player["location_id"]), None)
        if not loc:
            raise HTTPException(status_code=404, detail="Konum yok")
        difficulty = loc["security"] / 100
        success_chance = max(0.15, 0.85 - difficulty)
        success = random.random() < success_chance
        outcome = {}
        crime_rewards = {
            "hırsızlık": (30, 150), "kaçakçılık": (80, 300),
            "dolandırıcılık": (50, 200), "cinayet": (0, 0),
        }
        if body.crime_type not in crime_rewards:
            raise HTTPException(status_code=400, detail="Geçersiz suç")
        lo, hi = crime_rewards[body.crime_type]
        rep_msgs = []
        if success:
            gain = random.randint(lo, hi)
            player["money"] = round(player["money"] + gain, 1)
            player["crime"] = player.get("crime", 0) + {"hırsızlık": 10, "kaçakçılık": 15,
                                                       "dolandırıcılık": 12, "cinayet": 60}[body.crime_type]
            player["reputation"] -= {"hırsızlık": 2, "kaçakçılık": 1,
                                     "dolandırıcılık": 3, "cinayet": 25}[body.crime_type]
            # Yeni: suç tipi ağırlığına göre itibar sistemi güncelle
            severity = {"hırsızlık": 1, "kaçakçılık": 1, "dolandırıcılık": 2, "cinayet": 4}[body.crime_type]
            rep_msgs = apply_crime_committed(player, severity=severity)
            outcome = {"success": True, "gain": gain, "caught": False}
            _push_event(state, state["turn"], "suç",
                        f"{player['name']} {loc['name']}'de gizlice {body.crime_type} yaptı.")
        else:
            fine = random.randint(50, 200)
            paid = min(player["money"], fine)
            player["money"] = round(player["money"] - paid, 1)
            player["crime"] = player.get("crime", 0) + 5
            player["reputation"] -= 5
            rep_msgs = apply_crime_committed(player, severity=1)
            outcome = {"success": False, "fine": paid, "caught": True}
            _push_event(state, state["turn"], "suç_yakalandı",
                        f"{player['name']} {body.crime_type} yaparken yakalandı, {paid} altın ceza ödedi.")
        outcome["rep_changes"] = rep_msgs
        advance_time(state, weeks=1)
        enf = soldier_check(state)
        await _save_state(db, user["_id"], state)
        return {"state": _decorate(state), "outcome": outcome, "enforcement": enf}

    @router.post("/attack_npc")
    async def attack_npc(body: AttackIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        _require_adult(state, "saldırı")
        npc = next((n for n in state["world"]["npcs"] if n["id"] == body.npc_id), None)
        if not npc or not npc["alive"]:
            raise HTTPException(status_code=404, detail="Hedef bulunamadı veya ölü")
        if npc["location_id"] != state["player"]["location_id"]:
            raise HTTPException(status_code=400, detail="Hedef burada değil")

        # C-1: Saldırı mantığı do_attack() fonksiyonuna taşındı
        from npc_interactions import do_attack
        try:
            result = do_attack(state, body.npc_id)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        await _save_state(db, user["_id"], state)
        return {
            "log":         result["log"],
            "outcome":     result["outcome"],
            "rep_changes": result["rep_changes"],
            "enforcement": result["enforcement"],
            "state":       _decorate(state),
        }


    # ---------- items ----------
    @router.post("/use_item")
    async def use_item(body: UseItemIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        item = ITEMS.get(body.item)
        if not item:
            raise HTTPException(status_code=404, detail="Eşya bulunamadı")
        inv = state["player"].setdefault("inventory", {})
        if inv.get(body.item, 0) < body.qty:
            raise HTTPException(status_code=400, detail="Envanterinde yeterli yok")
        applied = apply_use_effects(state["player"], body.item, body.qty)
        if applied is None:
            raise HTTPException(status_code=400, detail="Bu eşya tüketilemez. Belki kuşanılabilir?")
        inv[body.item] -= body.qty
        if inv[body.item] <= 0:
            inv.pop(body.item, None)
        _push_event(state, state["turn"], "kullanım",
                    f"{state['player']['name']} {item['name']} kullandı.")
        progress_quest(state, "inventory_changed")
        await _save_state(db, user["_id"], state)
        return {"state": _decorate(state), "applied": applied,
                "item_name": item["name"]}

    @router.post("/equip")
    async def equip(body: EquipIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        item = ITEMS.get(body.item)
        if not item or not item.get("slot"):
            raise HTTPException(status_code=400, detail="Bu eşya kuşanılamaz")
        inv = state["player"].setdefault("inventory", {})
        if inv.get(body.item, 0) < 1:
            raise HTTPException(status_code=400, detail="Envanterinde yok")
        slot = item["slot"]
        equipment = state["player"].setdefault("equipment", {s: None for s in EQUIPMENT_SLOTS})
        # Swap currently equipped item back to inventory
        current = equipment.get(slot)
        if current:
            inv[current] = inv.get(current, 0) + 1
        inv[body.item] -= 1
        if inv[body.item] <= 0:
            inv.pop(body.item, None)
        equipment[slot] = body.item
        _push_event(state, state["turn"], "kuşanma",
                    f"{state['player']['name']} {item['name']} kuşandı.")
        progress_quest(state, "equip", {"item": body.item})
        await _save_state(db, user["_id"], state)
        return _decorate(state)

    @router.post("/unequip")
    async def unequip(body: UnequipIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        if body.slot not in EQUIPMENT_SLOTS:
            raise HTTPException(status_code=400, detail="Geçersiz slot")
        equipment = state["player"].setdefault("equipment", {s: None for s in EQUIPMENT_SLOTS})
        current = equipment.get(body.slot)
        if not current:
            raise HTTPException(status_code=400, detail="Bu slotta eşya yok")
        inv = state["player"].setdefault("inventory", {})
        inv[current] = inv.get(current, 0) + 1
        equipment[body.slot] = None
        await _save_state(db, user["_id"], state)
        return _decorate(state)

    @router.get("/items")
    async def list_items():
        return {"items": ITEMS, "slots": EQUIPMENT_SLOTS}

    # ---------- skills/perks ----------
    @router.get("/skills")
    async def skills(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        return {
            "stats": state["player"].get("stats", {}),
            "stat_xp": state["player"].get("stat_xp", {}),
            "skills": state["player"].get("skills", {}),
            "skill_xp": state["player"].get("skill_xp", {}),
            "perks": unlocked_perks(state["player"]),
            "tree": SKILL_PERKS,
            "stat_points": state["player"].get("stat_points", 0),
        }

    # FIX-13: stat_points harcama endpoint'i
    @router.post("/stat/allocate")
    async def allocate_stat(body: StatAllocateIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        player = state["player"]
        valid_stats = ["strength", "intelligence", "charisma", "stamina"]
        if body.stat not in valid_stats:
            raise HTTPException(
                status_code=400,
                detail=f"Geçersiz stat. Seçenekler: {', '.join(valid_stats)}",
            )
        points = player.get("stat_points", 0)
        if points < 1:
            raise HTTPException(status_code=400, detail="Harcanacak stat puanın yok.")
        current = player.setdefault("stats", {}).get(body.stat, 1)
        if current >= 10:
            raise HTTPException(status_code=400, detail=f"{body.stat} zaten maksimum (10).")
        player["stats"][body.stat] = current + 1
        player["stat_points"] = points - 1
        await _save_state(db, user["_id"], state)
        return {
            "stat": body.stat,
            "new_value": player["stats"][body.stat],
            "stat_points_remaining": player["stat_points"],
            "state": _decorate(state),
        }

    # ---------- family quests ----------
    @router.get("/family-quests")
    async def get_family_quests(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        return {"quests": state.get("family_quests", []), "player_age": state["player"]["age"]}

    # ---------- quests (general world) ----------
    @router.post("/quest/accept")
    async def accept_quest(body: QuestIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_adult(state, "dış görev")
        quest = next((q for q in state["quests"] if q["id"] == body.quest_id), None)
        if not quest:
            raise HTTPException(status_code=404, detail="Görev yok")
        if quest["status"] != "açık":
            raise HTTPException(status_code=400, detail="Görev kabul edilemez")
        quest["status"] = "kabul_edildi"
        await _save_state(db, user["_id"], state)
        return _decorate(state)

    @router.post("/quest/complete")
    async def complete_quest(body: QuestIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_adult(state, "görev tamamlama")
        quest = next((q for q in state["quests"] if q["id"] == body.quest_id), None)
        if not quest:
            raise HTTPException(status_code=404, detail="Görev yok")
        if quest["status"] not in ("kabul_edildi", "açık"):
            raise HTTPException(status_code=400, detail="Görev tamamlanamaz")
        # FIX-9: Konum kontrolü — oyuncu görevin lokasyonunda olmalı
        if quest.get("location_id") and quest["location_id"] != state["player"].get("location_id"):
            raise HTTPException(
                status_code=400,
                detail=f"Bu görevi tamamlamak için {quest.get('location_name', '?')}'e gitmelisin.",
            )
        # Skill-based outcome
        skills = state["player"]["skills"]
        if quest["type"] == "haydut_yuvası":
            skill = skills.get("combat", 0)
        elif quest["type"] == "ticaret_fırsatı":
            skill = skills.get("trade", 0)
        elif quest["type"] == "kayıp_çocuk":
            skill = skills.get("social", 0)
        else:
            skill = skills.get("social", 0)
        chance = min(0.95, 0.4 + skill * 0.08)
        if random.random() < chance:
            state["player"]["money"] = round(state["player"]["money"] + quest["reward"], 1)
            state["player"]["reputation"] += 2
            quest["status"] = "tamamlandı"
            # Yeni: görev tipi ağırlığına göre kahramanlık veya iyilik bonusu
            is_heroic = quest.get("type") in ("kayıp_çocuk", "canavar_avı", "koruma")
            if is_heroic:
                apply_heroic_act(state["player"])
            else:
                apply_good_deed(state["player"])
            _push_event(state, state["turn"], "görev_tamamlandı",
                        f"{state['player']['name']} '{quest['title']}' görevini tamamladı.")
        else:
            quest["status"] = "başarısız"
            state["player"]["reputation"] -= 1
            _push_event(state, state["turn"], "görev_başarısız",
                        f"{state['player']['name']} '{quest['title']}' görevinde başarısız oldu.")
        advance_time(state, weeks=1)
        await _save_state(db, user["_id"], state)
        return _decorate(state)

    # ---------- battle (random encounter) ----------
    @router.post("/battle")
    async def battle(body: BattleIn = BattleIn(), user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        _require_adult(state, "savaş")
        player = state["player"]
        strategy = body.strategy if body.strategy in ("saldır", "savun", "kaç") else "saldır"
        eq = equipment_bonuses(player)
        log = []

        # ── Kaç stratejisi ──
        if strategy == "kaç":
            flee_chance = 0.60 + player["stats"].get("stamina", 1) * 0.02
            if random.random() < flee_chance:
                log.append("Tehlikeyi sezdin ve geri çekilmeyi seçtin.")
                log.append("Başarıyla kaçtın. Kimse peşinden gelmedi.")
                outcome = "kaçış"
                player["health"] = max(1, player["health"] - random.randint(2, 8))
            else:
                edmg = random.randint(15, 30)
                player["health"] = max(1, player["health"] - edmg)
                log.append("Kaçmaya çalıştın ama köşeye sıkıştın!")
                log.append(f"        {edmg} hasar aldın kaçarken. Canın: {player['health']}")
                log.append("Sonunda kurtulmayı başardın ama iz bıraktı.")
                outcome = "kaçış"
            advance_time(state, weeks=1)
            await _save_state(db, user["_id"], state)
            return {"log": log, "outcome": outcome, "strategy": strategy, "state": _decorate(state)}

        # ── Strateji çarpanları ──
        if strategy == "saldır":
            atk_mult, def_mult = 1.35, 0.70
            log.append("[Saldırı taktiği] Saldırı gücü +%35, savunma -%30.")
        else:  # savun
            atk_mult, def_mult = 0.70, 1.45
            log.append("[Savunma taktiği] Savunma gücü +%45, saldırı -%30.")

        # ── Düşman ve oyuncu statları ──
        enemy_hp  = random.randint(40, 90)
        enemy_atk = random.randint(8, 18)
        enemy_name = random.choice(["Haydut", "Asker", "Paralı asker", "Hain", "Sınır eşkıyası"])
        log.append(f"Karşına bir {enemy_name} çıktı! ({enemy_hp} can)")

        base_atk  = (5 + player["stats"].get("strength", 1) * 2
                     + player["skills"].get("combat", 0) * 2 + eq["attack"])
        faction_rank = player.get("faction_rank", 0) if player.get("faction_id") else 0
        rank_bonus = 10 if faction_rank >= 6 else (6 if faction_rank >= 3 else (3 if faction_rank >= 1 else 0))
        if rank_bonus:
            log.append(f"[Faction rütbesi] +{rank_bonus} saldırı bonusu aktif.")

        player_atk = int(base_atk * atk_mult) + rank_bonus
        player_def = int(eq["defense"] * def_mult)

        rounds = 0
        while enemy_hp > 0 and player["health"] > 0 and rounds < 12:
            rounds += 1
            dmg = random.randint(max(1, player_atk - 5), player_atk + 5)
            enemy_hp -= dmg
            log.append(f"Tur {rounds}: {dmg} hasar verdin. Düşman canı: {max(0, enemy_hp)}")
            if enemy_hp <= 0:
                break
            edmg = max(1, random.randint(enemy_atk - 3, enemy_atk + 3) - player_def)
            player["health"] = max(0, player["health"] - edmg)
            log.append(f"        {edmg} hasar aldın. Canın: {player['health']}")

        if player["health"] <= 0:
            outcome = "kayıp"
            player["health"] = 5
            player["money"] = round(player["money"] * 0.7, 1)
            log.append("Yenildin. Bilincin yerine geldiğinde paranın bir kısmı çalınmıştı.")
            _push_event(state, state["turn"], "savaş_kaybı", f"{player['name']} bir çatışmada yenildi.")
        elif enemy_hp <= 0:
            outcome = "zafer"
            loot = random.randint(20, 120)
            rank_loot = faction_rank * 5
            player["money"] = round(player["money"] + loot + rank_loot, 1)
            player["reputation"] += 1
            apply_battle_victory(player)
            loot_msg = f"Zafer! {loot} altın ganimet aldın."
            if rank_loot:
                loot_msg += f" (Rütbe bonusu: +{rank_loot} altın)"
            log.append(loot_msg)
            _push_event(state, state["turn"], "savaş_zaferi", f"{player['name']} bir {enemy_name}'ı yendi.")
            from skills import add_skill_xp, add_stat_xp
            add_skill_xp(player, "combat", 3)
            add_stat_xp(player, "strength", 1)
            if strategy == "savun":
                add_stat_xp(player, "stamina", 1)
        else:
            outcome = "kaçış"
            player["health"] = max(10, player["health"] - 5)
            log.append(f"Uzun süren çatışmada güçler tükendi. {enemy_name} geri çekildi, sen de sağ kurtuldun.")
            _push_event(state, state["turn"], "savaş_kaçış", f"{player['name']} uzun soluklu bir çatışmadan sağ çıktı.")

        advance_time(state, weeks=1)
        await _save_state(db, user["_id"], state)
        return {"log": log, "outcome": outcome, "strategy": strategy, "state": _decorate(state)}

    @router.post("/battle/faction-war")
    async def battle_faction_war(body: dict = Body(default={}), user: dict = Depends(get_current_user)):
        """Oyuncunun faction'ı savaştaysa düşman faction NPC'siyle savaş."""
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        _require_adult(state, "savaş")
        player = state["player"]
        faction_id = player.get("faction_id")
        if not faction_id:
            raise HTTPException(400, "Bir factiona üye değilsin.")
        from faction_system import _get_faction
        fac = _get_faction(state, faction_id)
        if not fac or not fac.get("at_war_with"):
            raise HTTPException(400, "Factionın şu an savaşta değil.")

        strategy = body.get("strategy", "saldır")
        enemy_fac_id = fac["at_war_with"][0]
        enemy_fac = _get_faction(state, enemy_fac_id)
        enemy_name = f"{enemy_fac['name'] if enemy_fac else 'Düşman'} askeri"

        eq = equipment_bonuses(player)
        log = [f"[Faction Savaşı] {fac['name']} adına {enemy_name} ile karşı karşıyasın!"]

        if strategy == "saldır":
            atk_mult, def_mult = 1.35, 0.70
            log.append("[Saldırı taktiği] aktif.")
        elif strategy == "savun":
            atk_mult, def_mult = 0.70, 1.45
            log.append("[Savunma taktiği] aktif.")
        else:
            log.append("Geri çekildin — faction savaşından kaçmak itibar kaybettirir.")
            player["reputation"] = max(-100, player.get("reputation", 0) - 3)
            advance_time(state, weeks=1)
            await _save_state(db, user["_id"], state)
            return {"log": log, "outcome": "kaçış", "strategy": strategy, "state": _decorate(state)}

        enemy_power = enemy_fac.get("military_power", 50) if enemy_fac else 50
        enemy_hp  = int(40 + enemy_power * 0.4)
        enemy_atk = int(8  + enemy_power * 0.15)

        faction_rank = player.get("faction_rank", 0)
        rank_bonus = 10 if faction_rank >= 6 else (6 if faction_rank >= 3 else 3)
        base_atk = (5 + player["stats"].get("strength", 1) * 2
                    + player["skills"].get("combat", 0) * 2 + eq["attack"] + rank_bonus)
        player_atk = int(base_atk * atk_mult)
        player_def = int(eq["defense"] * def_mult)

        log.append(f"Karşına {enemy_name} çıktı! ({enemy_hp} can)")
        rounds = 0
        player_hp = player["health"]
        while enemy_hp > 0 and player_hp > 0 and rounds < 12:
            rounds += 1
            dmg = random.randint(max(1, player_atk - 5), player_atk + 5)
            enemy_hp -= dmg
            log.append(f"Tur {rounds}: {dmg} hasar verdin. Düşman canı: {max(0, enemy_hp)}")
            if enemy_hp <= 0:
                break
            edmg = max(1, random.randint(enemy_atk - 3, enemy_atk + 3) - player_def)
            player_hp = max(0, player_hp - edmg)
            log.append(f"        {edmg} hasar aldın. Canın: {player_hp}")
        player["health"] = player_hp

        if player["health"] <= 0:
            outcome = "kayıp"
            player["health"] = 5
            log.append("Yenildin. Faction savaşında ağır yara aldın.")
            fac["military_power"] = max(0, fac["military_power"] - 5)
        elif enemy_hp <= 0:
            outcome = "zafer"
            loot = random.randint(30, 80)
            player["money"] = round(player["money"] + loot, 1)
            player["reputation"] += 2
            fac["military_power"] = min(100, fac["military_power"] + 3)
            if enemy_fac:
                enemy_fac["military_power"] = max(0, enemy_fac["military_power"] - 5)
            apply_battle_victory(player)
            log.append(f"Zafer! Faction güç kazandı. +{loot} altın ganimet.")
            from skills import add_skill_xp, add_stat_xp
            add_skill_xp(player, "combat", 5)
            add_stat_xp(player, "strength", 2)
        else:
            outcome = "kaçış"
            player["health"] = max(10, player["health"] - 5)
            log.append("Uzun süren çatışma beraberlikle bitti.")

        advance_time(state, weeks=1)
        await _save_state(db, user["_id"], state)
        return {"log": log, "outcome": outcome, "strategy": strategy, "state": _decorate(state)}
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        _require_adult(state, "savaş")
        player = state["player"]
        eq = equipment_bonuses(player)
        log = []
        enemy_hp = random.randint(40, 90)
        enemy_atk = random.randint(8, 18)
        enemy_name = random.choice(["Haydut", "Asker", "Paralı asker", "Hain", "Sınır eşkıyası"])
        log.append(f"Karşına bir {enemy_name} çıktı! ({enemy_hp} can)")
        player_atk = (5 + player["stats"].get("strength", 1) * 2
                      + player["skills"].get("combat", 0) * 2 + eq["attack"])
        # Faction rank savaş bonusu: rank 1-2 → +3, rank 3-5 → +6, rank 6+ → +10
        faction_rank = player.get("faction_rank", 0) if player.get("faction_id") else 0
        rank_atk_bonus = 10 if faction_rank >= 6 else (6 if faction_rank >= 3 else (3 if faction_rank >= 1 else 0))
        player_atk += rank_atk_bonus
        if rank_atk_bonus:
            log.append(f"[Faction rütbesi] +{rank_atk_bonus} saldırı bonusu aktif.")
        player_def = eq["defense"]
        rounds = 0
        while enemy_hp > 0 and player["health"] > 0 and rounds < 12:
            rounds += 1
            dmg = random.randint(max(1, player_atk - 5), player_atk + 5)
            enemy_hp -= dmg
            log.append(f"Tur {rounds}: {dmg} hasar verdin. Düşman canı: {max(0, enemy_hp)}")
            if enemy_hp <= 0:
                break
            edmg = max(1, random.randint(enemy_atk - 3, enemy_atk + 3) - player_def)
            player["health"] = max(0, player["health"] - edmg)
            log.append(f"        {edmg} hasar aldın. Canın: {player['health']}")
        if player["health"] <= 0:
            outcome = "kayıp"
            player["health"] = 5
            player["money"] = round(player["money"] * 0.7, 1)
            log.append("Yenildin. Bilincin yerine geldiğinde paranın bir kısmı çalınmıştı.")
            _push_event(state, state["turn"], "savaş_kaybı", f"{player['name']} bir çatışmada yenildi.")
        elif enemy_hp <= 0:
            outcome = "zafer"
            loot = random.randint(20, 120)
            rank_loot_bonus = faction_rank * 5
            player["money"] = round(player["money"] + loot + rank_loot_bonus, 1)
            player["reputation"] += 1
            # Yeni: savaş zaferi → ün & korku artar
            apply_battle_victory(player)
            loot_msg = f"Zafer! {loot} altın ganimet aldın."
            if rank_loot_bonus:
                loot_msg += f" (Rütbe bonusu: +{rank_loot_bonus} altın)"
            log.append(loot_msg)
            _push_event(state, state["turn"], "savaş_zaferi",
                        f"{player['name']} bir {enemy_name}'ı yendi.")
            from skills import add_skill_xp, add_stat_xp
            add_skill_xp(player, "combat", 3)
            add_stat_xp(player, "strength", 1)
        else:
            # 12 tur timeout → beraberlik, her iki taraf da yoruldu, geri çekildi
            outcome = "kaçış"
            player["health"] = max(10, player["health"] - 5)
            log.append(f"Uzun süren çatışmada güçler tükendi. {enemy_name} geri çekildi, sen de sağ kurtuldun.")
            _push_event(state, state["turn"], "savaş_kaçış", f"{player['name']} uzun soluklu bir çatışmadan sağ çıktı.")
        advance_time(state, weeks=1)
        await _save_state(db, user["_id"], state)
        return {"log": log, "outcome": outcome, "state": _decorate(state)}

    # ---------- marry ----------
    @router.post("/marry")
    async def marry(body: MarryIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_adult(state, "evlilik")
        if state["player"].get("spouse_id"):
            raise HTTPException(status_code=400, detail="Zaten evlisin")
        npc = next((n for n in state["world"]["npcs"] if n["id"] == body.npc_id), None)
        if not npc or not npc["alive"]:
            raise HTTPException(status_code=404, detail="NPC yok")
        if npc["spouse_id"]:
            raise HTTPException(status_code=400, detail="Bu kişi zaten evli")
        if npc["age"] < 18:
            raise HTTPException(status_code=400, detail="Çok genç")
        rel = state["relationships"].get(npc["id"], 0)
        if rel < 60:
            raise HTTPException(status_code=400, detail="İlişkiniz evlilik için yeterince güçlü değil (60+)")
        state["player"]["spouse_id"] = npc["id"]
        npc["spouse_id"] = "PLAYER"
        _push_event(state, state["turn"], "evlilik",
                    f"{state['player']['name']} ile {npc['name']} dünya evine girdi.")
        await _save_state(db, user["_id"], state)
        return _decorate(state)

    # ---------- social reputation ----------
    @router.get("/social")
    async def get_social(user: dict = Depends(get_current_user)):
        """Oyuncunun toplumsal statüsünü döndürür (social_summary)."""
        state = await _load_state(db, user["_id"])
        return social_summary(state["player"])

    # ---------- npcs / profile / rumors ----------
    @router.get("/npc/{npc_id}/profile")
    async def npc_profile(npc_id: str, user: dict = Depends(get_current_user)):
        from npc_profile import ensure_profile, GOAL_BY_KEY
        state = await _load_state(db, user["_id"])
        npc = next((n for n in state["world"]["npcs"] if n["id"] == npc_id), None)
        if not npc:
            raise HTTPException(status_code=404, detail="NPC bulunamadı")
        ensure_profile(npc)
        rel = state["relationships"].get(npc_id, 0)
        # Build readable goal
        goal_meta = GOAL_BY_KEY.get(npc.get("goal"), {"key": npc.get("goal"), "label": npc.get("goal","-")})
        return {
            "id": npc["id"],
            "name": npc["name"],
            "age": npc["age"],
            "gender": npc.get("gender"),
            "profession": npc["profession"],
            "location_name": npc["location_name"],
            "kingdom_name": npc.get("kingdom_name"),
            "alive": npc["alive"],
            "personality": npc.get("personality", []),
            "health": npc.get("health"),
            "savings": npc.get("savings", 0),
            "debt": npc.get("debt", 0),
            "spouse_id": npc.get("spouse_id"),
            "children_ids": npc.get("children_ids", []),
            "goal": goal_meta,
            "goal_progress": npc.get("goal_progress", 0),
            "current_mood": npc.get("current_mood", "huzurlu"),
            "recent_events": npc.get("recent_events", []),
            "daily_log": npc.get("daily_log", []),
            "personal_memory": npc.get("personal_memory", []),
            "relationship": rel,
            "bond_info": _build_bond_info(npc, state),
        }

    def _build_bond_info(npc: dict, state: dict) -> dict:
        """NPC'nin diğer NPC'lerle bağlarını isme çevirerek döner."""
        bonds = npc.get("bonds", {})
        if not bonds:
            return {"positive": [], "negative": []}
        npc_map = {n["id"]: n["name"] for n in state["world"]["npcs"]}
        sorted_bonds = sorted(bonds.items(), key=lambda x: x[1], reverse=True)
        positive = [
            {"npc_id": nid, "name": npc_map.get(nid, nid), "score": sc}
            for nid, sc in sorted_bonds if sc >= 30
        ][:3]
        negative = [
            {"npc_id": nid, "name": npc_map.get(nid, nid), "score": sc}
            for nid, sc in sorted_bonds if sc <= -30
        ][-3:]
        return {"positive": positive, "negative": negative}

    @router.get("/rumors")
    async def list_rumors(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        rumors = state.get("rumors", [])
        # Return most recent 40
        return {"rumors": list(reversed(rumors[-40:]))}


    # ──────────────────────────────────────────────
    # MEKTEP & ÇOCUKLUK AKTİVİTELERİ
    # ──────────────────────────────────────────────

    @router.get("/school")
    async def school_summary(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        ensure_school_state(state)
        return get_school_summary(state)

    @router.post("/school/lesson/{lesson_id}")
    async def school_lesson(lesson_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        if state["player"]["age"] >= 13:
            raise HTTPException(status_code=403, detail="Artık mektep çağında değilsin.")
        result = attend_lesson(state, lesson_id)
        if not result["ok"]:
            raise HTTPException(status_code=400, detail=result["error"])
        advance_time(state, weeks=1)
        await _save_state(db, user["_id"], state)
        return {"result": result, "state": _decorate(state)}

    @router.post("/school/club/{club_id}/join")
    async def school_club_join(club_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        if state["player"]["age"] >= 13:
            raise HTTPException(status_code=403, detail="Artık mektep çağında değilsin.")
        result = join_club(state, club_id)
        if not result["ok"]:
            raise HTTPException(status_code=400, detail=result["error"])
        await _save_state(db, user["_id"], state)
        return {"result": result, "state": _decorate(state)}

    @router.post("/school/club/{club_id}/leave")
    async def school_club_leave(club_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        result = leave_club(state, club_id)
        if not result["ok"]:
            raise HTTPException(status_code=400, detail=result["error"])
        await _save_state(db, user["_id"], state)
        return {"result": result, "state": _decorate(state)}

    @router.post("/school/seasonal/{activity_id}")
    async def school_seasonal(activity_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        if state["player"]["age"] >= 13:
            raise HTTPException(status_code=403, detail="Artık çocukluk aktiviteleri yapamıyorsun.")
        result = do_seasonal_activity(state, activity_id)
        if not result["ok"]:
            raise HTTPException(status_code=400, detail=result["error"])
        advance_time(state, weeks=1)
        await _save_state(db, user["_id"], state)
        return {"result": result, "state": _decorate(state)}

    @router.post("/school/event/{event_id}")
    async def school_special_event(event_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        if state["player"]["age"] >= 13:
            raise HTTPException(status_code=403, detail="Artık çocukluk aktiviteleri yapamıyorsun.")
        result = do_special_event(state, event_id)
        if not result["ok"]:
            raise HTTPException(status_code=400, detail=result["error"])
        state.pop("pending_special_event", None)
        advance_time(state, weeks=1)
        await _save_state(db, user["_id"], state)
        return {"result": result, "state": _decorate(state)}



    # ══════════════════════════════════════════════════════
    # NPC ETKİLEŞİM SİSTEMİ
    # ══════════════════════════════════════════════════════

    @router.post("/npc/{npc_id}/compliment")
    async def npc_compliment(npc_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        npc = next((n for n in state["world"]["npcs"] if n["id"] == npc_id and n.get("alive")), None)
        if not npc: raise HTTPException(404, "NPC bulunamadı")
        result = do_compliment(state, npc_id)
        await _save_state(db, user["_id"], state)
        return {**result, "state": _decorate(state)}

    @router.post("/npc/{npc_id}/gift")
    async def npc_gift(npc_id: str, body: dict = Body(default={}), user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        npc = next((n for n in state["world"]["npcs"] if n["id"] == npc_id and n.get("alive")), None)
        if not npc: raise HTTPException(404, "NPC bulunamadı")
        item_key = body.get("item")
        qty = max(1, int(body.get("qty", 1)))
        if not item_key: raise HTTPException(400, "Eşya belirtilmedi")
        result = do_gift(state, npc_id, item_key, qty)
        if result.get("error"): raise HTTPException(400, result["error"])
        await _save_state(db, user["_id"], state)
        return {**result, "state": _decorate(state)}

    @router.post("/npc/{npc_id}/givemoney")
    async def npc_give_money(npc_id: str, body: dict = Body(default={}), user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        npc = next((n for n in state["world"]["npcs"] if n["id"] == npc_id and n.get("alive")), None)
        if not npc: raise HTTPException(404, "NPC bulunamadı")
        amount = max(1, int(body.get("amount", 1)))
        result = do_give_money(state, npc_id, amount)
        if result.get("error"): raise HTTPException(400, result["error"])
        await _save_state(db, user["_id"], state)
        return {**result, "state": _decorate(state)}

    @router.post("/npc/{npc_id}/flirt")
    async def npc_flirt(npc_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_adult(state, "çıkma teklifi")
        npc = next((n for n in state["world"]["npcs"] if n["id"] == npc_id and n.get("alive")), None)
        if not npc: raise HTTPException(404, "NPC bulunamadı")
        rel = state["relationships"].get(npc_id, 0)
        if rel < 20: raise HTTPException(400, "İlişki en az 20 olmalı.")
        if npc.get("spouse_id"): raise HTTPException(400, "Bu kişi zaten evli.")
        if npc.get("age", 0) < 18: raise HTTPException(400, "Bu kişi çok genç.")
        if state["player"].get("relationship_status", {}).get(npc_id) == "dating":
            raise HTTPException(400, "Zaten çıkıyorsunuz.")
        result = do_flirt(state, npc_id)
        await _save_state(db, user["_id"], state)
        return {**result, "state": _decorate(state)}

    @router.post("/npc/{npc_id}/propose")
    async def npc_propose(npc_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_adult(state, "evlilik teklifi")
        npc = next((n for n in state["world"]["npcs"] if n["id"] == npc_id and n.get("alive")), None)
        if not npc: raise HTTPException(404, "NPC bulunamadı")
        player = state["player"]
        rel = state["relationships"].get(npc_id, 0)
        dating = player.get("relationship_status", {}).get(npc_id) == "dating"
        if player.get("spouse_id"): raise HTTPException(400, "Zaten evlisin.")
        if npc.get("spouse_id"): raise HTTPException(400, "Bu kişi zaten evli.")
        if not dating: raise HTTPException(400, "Önce çıkıyorsunuz olmalısınız.")
        if rel < 50: raise HTTPException(400, "İlişki en az 50 olmalı.")
        if npc.get("age", 0) < 18: raise HTTPException(400, "Bu kişi çok genç.")
        result = do_propose(state, npc_id)
        await _save_state(db, user["_id"], state)
        return {**result, "state": _decorate(state)}

    @router.post("/npc/{npc_id}/insult")
    async def npc_insult(npc_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        npc = next((n for n in state["world"]["npcs"] if n["id"] == npc_id and n.get("alive")), None)
        if not npc: raise HTTPException(404, "NPC bulunamadı")
        result = do_insult(state, npc_id)
        await _save_state(db, user["_id"], state)
        return {**result, "state": _decorate(state)}

    @router.post("/npc/{npc_id}/gossip")
    async def npc_gossip(npc_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        npc = next((n for n in state["world"]["npcs"] if n["id"] == npc_id and n.get("alive")), None)
        if not npc: raise HTTPException(404, "NPC bulunamadı")
        result = do_gossip(state, npc_id)
        await _save_state(db, user["_id"], state)
        return {**result, "state": _decorate(state)}

    @router.post("/npc/{npc_id}/kidnap")
    async def npc_kidnap(npc_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_adult(state, "kaçırma")
        npc = next((n for n in state["world"]["npcs"] if n["id"] == npc_id and n.get("alive")), None)
        if not npc: raise HTTPException(404, "NPC bulunamadı")
        if npc["location_id"] != state["player"]["location_id"]:
            raise HTTPException(400, "Hedef burada değil.")
        result = do_kidnap(state, npc_id)
        if result.get("enforcement"):
            pass  # soldier_check zaten advance içinde çalıştı
        await _save_state(db, user["_id"], state)
        return {**result, "state": _decorate(state)}

    
    # ══════════════════════════════════════════════════════
    # GAME ENGINE ENDPOINTS
    # ══════════════════════════════════════════════════════

    @router.get("/engine/suggestions")
    async def engine_suggestions(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        return {
            "suggestions": get_suggested_actions(state),
            "triggers": check_state_triggers(state, state["turn"]),
        }

    @router.get("/engine/world-context")
    async def engine_world_context(user: dict = Depends(get_current_user)):
        from game_engine import _build_world_context
        state = await _load_state(db, user["_id"])
        return {
            "context": _build_world_context(state),
            "player_snapshot": snapshot_player(state["player"]),
        }

        # ──────────────────────────────────────────────
    # NESİL DEVRİ (INHERITANCE)
    # ──────────────────────────────────────────────

    @router.get("/inheritance/options")
    async def inheritance_options(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        if not state["player"].get("dead"):
            raise HTTPException(status_code=400, detail="Oyuncu henüz ölmedi.")
        heir_data = get_heir_options(state)
        return {
            "options":          heir_data.get("options", []),
            "inherited_money":  heir_data.get("inherited_money", 0),
            "inherited_stats":  heir_data.get("inherited_stats", {}),
            "inherited_skills": heir_data.get("inherited_skills", {}),
            "previous_player":  state["player"]["name"],
            "generation":       state.get("generation", 1),
        }

    @router.post("/inheritance/begin")
    async def inheritance_begin(
        body: dict = Body(default={}),
        user: dict = Depends(get_current_user)
    ):
        state = await _load_state(db, user["_id"])
        if not state["player"].get("dead"):
            raise HTTPException(status_code=400, detail="Oyuncu henüz ölmedi.")
        chosen_id = body.get("child_id")  # None = auto / sürgün
        state = begin_inheritance(state, chosen_child_id=chosen_id)
        await _save_state(db, user["_id"], state)
        return _decorate(state)

    # ──────────────────────────────────────────────
    # ÇOCUK YÖNETİMİ
    # ──────────────────────────────────────────────

    INVEST_TYPES = {
        "egitim":          {"label": "Eğitim",           "stat": "intelligence", "skill": None,      "cost": 50,  "gain": 5},
        "savas_egitimi":   {"label": "Savaş Eğitimi",    "stat": "strength",     "skill": "combat",  "cost": 50,  "gain": 5},
        "zanaat_egitimi":  {"label": "Zanaat Eğitimi",   "stat": None,           "skill": "crafting","cost": 40,  "gain": 5},
        "sosyal_egitim":   {"label": "Sosyal Eğitim",    "stat": "charisma",     "skill": "social",  "cost": 40,  "gain": 5},
        "saglik_bakimi":   {"label": "Sağlık Bakımı",    "stat": None,           "skill": None,      "cost": 30,  "gain": 0, "health": 15},
    }

    @router.post("/children/invest")
    async def children_invest(
        body: dict = Body(default={}),
        user: dict = Depends(get_current_user)
    ):
        state = await _load_state(db, user["_id"])
        player = state["player"]
        child_id   = body.get("child_id")
        inv_type   = body.get("investment_type")

        if not child_id or not inv_type:
            raise HTTPException(status_code=400, detail="child_id ve investment_type gerekli.")
        if child_id not in player.get("children_ids", []):
            raise HTTPException(status_code=400, detail="Bu çocuk sana ait değil.")

        cfg = INVEST_TYPES.get(inv_type)
        if not cfg:
            raise HTTPException(status_code=400, detail="Geçersiz yatırım türü.")

        cost = cfg["cost"]
        if player.get("money", 0) < cost:
            raise HTTPException(status_code=400, detail="Yeterli altının yok.")

        child_npc = next(
            (n for n in state["world"]["npcs"] if n["id"] == child_id and n.get("alive", True)),
            None
        )
        if not child_npc:
            raise HTTPException(status_code=404, detail="Çocuk bulunamadı.")

        # Para düş
        player["money"] = round(player["money"] - cost, 1)

        result_changes = {}

        # Stat artışı
        if cfg.get("stat"):
            child_npc.setdefault("stats", {})
            old_val = child_npc["stats"].get(cfg["stat"], 10)
            new_val = min(100, old_val + cfg["gain"])
            child_npc["stats"][cfg["stat"]] = new_val
            result_changes[cfg["stat"]] = new_val - old_val

        # Skill artışı
        if cfg.get("skill"):
            child_npc.setdefault("skills", {})
            old_val = child_npc["skills"].get(cfg["skill"], 0)
            new_val = min(100, old_val + cfg["gain"])
            child_npc["skills"][cfg["skill"]] = new_val
            result_changes[cfg["skill"]] = new_val - old_val

        # Sağlık artışı
        if cfg.get("health"):
            old_hp = child_npc.get("health", 100)
            new_hp = min(100, old_hp + cfg["health"])
            child_npc["health"] = new_hp
            result_changes["health"] = new_hp - old_hp

        # Kronik kayıt
        from simulation import _push_event
        turn = state.get("turn", 0)
        _push_event(state, turn, "cocuk_yatirim",
                    f"{player['name']}, {child_npc['name']}'a {cfg['label']} yatırımı yaptı. ({cost} altın)")

        await _save_state(db, user["_id"], state)
        return {
            "success": True,
            "child_name": child_npc["name"],
            "investment_type": inv_type,
            "investment_label": cfg["label"],
            "cost": cost,
            "changes": result_changes,
            "state": _decorate(state),
        }

    @router.post("/children/set_profession")
    async def children_set_profession(
        body: dict = Body(default={}),
        user: dict = Depends(get_current_user)
    ):
        state = await _load_state(db, user["_id"])
        player  = state["player"]
        child_id   = body.get("child_id")
        profession = body.get("profession", "").strip()

        if not child_id or not profession:
            raise HTTPException(status_code=400, detail="child_id ve profession gerekli.")
        if child_id not in player.get("children_ids", []):
            raise HTTPException(status_code=400, detail="Bu çocuk sana ait değil.")

        child_npc = next(
            (n for n in state["world"]["npcs"] if n["id"] == child_id and n.get("alive", True)),
            None
        )
        if not child_npc:
            raise HTTPException(status_code=404, detail="Çocuk bulunamadı.")
        if (child_npc.get("age", 0) < 13):
            raise HTTPException(status_code=400, detail="Çocuk en az 13 yaşında olmalı.")

        child_npc["profession"] = profession

        from simulation import _push_event
        turn = state.get("turn", 0)
        _push_event(state, turn, "cocuk_meslek",
                    f"{child_npc['name']}, {profession} olarak yetiştirildi.")

        await _save_state(db, user["_id"], state)
        return {
            "success": True,
            "child_name": child_npc["name"],
            "profession": profession,
            "state": _decorate(state),
        }

    # ──────────────────────────────────────────────
    # FIRSATLAR (DYNAMIC OPPORTUNITIES)
    # ──────────────────────────────────────────────

    class OppActionIn(BaseModel):
        opportunity_id: str

    @router.get("/opportunities")
    async def list_opportunities(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        ensure_opportunities(state)
        # Refresh if very few open ones
        open_opps = [o for o in state["opportunities"] if o["status"] == "açık"]
        if len(open_opps) < 3:
            refresh_opportunities(state)
            await _save_state(db, user["_id"], state)
        return {"opportunities": state.get("opportunities", [])}

    @router.post("/opportunities/refresh")
    async def force_refresh_opportunities(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        # Only allow refresh every 2 turns to prevent spamming
        last_refresh = state.get("last_opp_refresh", 0)
        current_turn = state.get("turn", 0)
        if current_turn - last_refresh < 2:
            from fastapi import HTTPException as _HTTPException
            raise _HTTPException(400, "Fırsatlar yakın zamanda yenilendi. Biraz bekle.")
        refresh_opportunities(state)
        state["last_opp_refresh"] = current_turn
        await _save_state(db, user["_id"], state)
        return {"opportunities": state.get("opportunities", [])}

    @router.post("/opportunities/accept")
    async def opp_accept(body: OppActionIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        try:
            opp = accept_opportunity(state, body.opportunity_id)
        except ValueError as e:
            raise HTTPException(400, str(e))
        await _save_state(db, user["_id"], state)
        return {"opportunity": opp, "state": _decorate(state)}

    @router.post("/opportunities/decline")
    async def opp_decline(body: OppActionIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        try:
            opp = decline_opportunity(state, body.opportunity_id)
        except ValueError as e:
            raise HTTPException(400, str(e))
        # After declining, try to add a fresh one
        refresh_opportunities(state)
        await _save_state(db, user["_id"], state)
        return {"opportunity": opp, "state": _decorate(state)}

    @router.post("/opportunities/complete")
    async def opp_complete(body: OppActionIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        try:
            result = complete_opportunity(state, body.opportunity_id)
        except ValueError as e:
            raise HTTPException(400, str(e))
        # Push history event
        _push_event(
            state, state.get("turn", 0),
            "fırsat_tamamlandı" if result["success"] else "fırsat_başarısız",
            result["message"],
        )
        advance_time(state, weeks=1)
        refresh_opportunities(state)
        await _save_state(db, user["_id"], state)
        return {**result, "state": _decorate(state)}

    @router.get("/world-news")
    async def get_world_news(user: dict = Depends(get_current_user)):
        from world_events import world_events_context, event_affects_location, get_all_world_events, get_active_world_events
        state = await _load_state(db, user["_id"])
        _ensure_state_fields(state)
        active = get_active_world_events(state)
        all_events = get_all_world_events(state, limit=40)
        # KRİTİK EVENTLER: tahta çıkış, savaş ilanı, barış, göç pinli göster
        PINNED_TYPES = {"tahta_çıkış", "savaş_ilanı", "barış", "savaş_hareketi", "göç", "ölüm"}
        history = state.get("history", [])
        # Son 50 history eventinden pinlenecekleri topla
        pinned = [
            {"id": e["id"], "day": e["day"], "type": e["type"], "text": e["text"]}
            for e in reversed(history[-50:])
            if e.get("type") in PINNED_TYPES
        ][:8]  # en fazla 8 kritik haber

        return {
            "active_events": active,
            "all_events": all_events,
            "pinned_events": pinned,
            "turn": state.get("turn", 0),
            "calendar": current_calendar(state),
        }

    
    # ──────────────────────────────────────────────────────────────
    # FACTION SİSTEMİ ENDPOİNT'LERİ
    # ──────────────────────────────────────────────────────────────

    class FactionCreateIn(BaseModel):
        name: str
        faction_type: str = "lonca"
        home_location_id: str

    class FactionJoinIn(BaseModel):
        faction_id: str

    class NPCManipulateIn(BaseModel):
        npc_id: str
        method: str

    class GovernorCandidateIn(BaseModel):
        location_id: str

    # ══════════════════════════════════════════════════════════════════════
    # ŞEHİR YÖNETİMİ ENDPOINTLERİ
    # ══════════════════════════════════════════════════════════════════════

    @router.get("/governance")
    async def list_governances(user: dict = Depends(get_current_user)):
        """Tüm lokasyonların yönetim özetlerini döndür."""
        state = await _load_state(db, user["_id"])
        from city_governance import ensure_governances, get_all_governances_summary
        ensure_governances(state)
        return {"governances": get_all_governances_summary(state)}

    @router.get("/governance/{location_id}")
    async def get_governance_detail(location_id: str,
                                    user: dict = Depends(get_current_user)):
        """Belirli bir lokasyonun yönetim detayını döndür."""
        state = await _load_state(db, user["_id"])
        from city_governance import ensure_governances, get_governance_summary
        ensure_governances(state)
        summary = get_governance_summary(state, location_id)
        if not summary:
            raise HTTPException(status_code=404, detail="Yönetim objesi bulunamadı.")
        return summary

    @router.post("/governance/run-for-governor")
    async def run_for_governor(body: GovernorCandidateIn,
                               user: dict = Depends(get_current_user)):
        """Oyuncu bir lokasyona yönetici adayı olur."""
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        from city_governance import ensure_governances, player_run_for_governor
        ensure_governances(state)
        result = player_run_for_governor(state, body.location_id,
                                         state.get("turn", 0))
        if result.get("success"):
            await _save_state(db, user["_id"], state)
        return result

    class PayTaxIn(BaseModel):
        location_id: str
        amount: int

    @router.post("/governance/pay-taxes")
    async def pay_taxes(body: PayTaxIn, user: dict = Depends(get_current_user)):
        """Oyuncu bir lokasyona vergi/bağış öder."""
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        from city_governance import ensure_governances, player_pay_taxes
        ensure_governances(state)
        result = player_pay_taxes(state, body.location_id, body.amount, state.get("turn", 0))
        if result.get("success"):
            await _save_state(db, user["_id"], state)
        return result

    # ══════════════════════════════════════════════════════════════════════

    @router.get("/factions")
    async def list_factions(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        from faction_system import get_faction_summary, init_factions_for_world
        init_factions_for_world(state, state.get("turn", 0))
        await _save_state(db, user["_id"], state)
        return {"factions": get_faction_summary(state, state["player"])}

    # ── P3a: Gizli Cemiyet Dedektif Endpoint'leri ──

    @router.get("/factions/gizli-cemiyet/clues")
    async def gizli_clue_status(user: dict = Depends(get_current_user)):
        """Oyuncunun gizli cemiyet ipucu durumunu döner."""
        state = await _load_state(db, user["_id"])
        from faction_system import get_player_clue_status
        return {"clues": get_player_clue_status(state)}

    @router.post("/factions/gizli-cemiyet/investigate")
    async def gizli_investigate(body: dict = Body(default={}),
                                user: dict = Depends(get_current_user)):
        """Oyuncu mevcut lokasyonda gizli cemiyet araştırması yapar."""
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        location_id = body.get("location_id") or state["player"]["location_id"]
        from faction_system import player_investigate_location
        result = player_investigate_location(state, location_id, state.get("turn", 0))
        if result.get("success"):
            await _save_state(db, user["_id"], state)
        return result

    @router.post("/factions/gizli-cemiyet/reveal/{faction_id}")
    async def gizli_reveal(faction_id: str, user: dict = Depends(get_current_user)):
        """Yeterli ipucu toplandıysa gizli cemiyeti ifşa eder."""
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        from faction_system import player_reveal_secret_society
        result = player_reveal_secret_society(state, faction_id, state.get("turn", 0))
        if result.get("success"):
            await _save_state(db, user["_id"], state)
        return result

    @router.post("/factions/rank-up")
    async def faction_rank_up(user: dict = Depends(get_current_user)):
        """Oyuncu faction içinde rütbe atlar. Koşullar: min_weeks + contribution."""
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        _require_adult(state, "rütbe atlama")
        from faction_system import player_rank_up
        result = player_rank_up(state, state.get("turn", 0))
        if result.get("success"):
            await _save_state(db, user["_id"], state)
        return result

    class DonateIn(BaseModel):
        amount: int

    @router.post("/factions/donate")
    async def faction_donate(body: DonateIn, user: dict = Depends(get_current_user)):
        """Faction hazinesine bağış yapar, contribution kazanır."""
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        _require_adult(state, "bağış")
        from faction_system import player_donate_to_faction
        result = player_donate_to_faction(state, body.amount, state.get("turn", 0))
        if result.get("success"):
            await _save_state(db, user["_id"], state)
        return result

    @router.get("/factions/regions")
    async def list_regions(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        from faction_system import get_region_summary, init_factions_for_world
        init_factions_for_world(state, state.get("turn", 0))
        return {"regions": get_region_summary(state)}

    @router.get("/factions/wars")
    async def list_wars(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        from faction_system import get_active_wars
        return {"wars": get_active_wars(state)}

    @router.get("/factions/wars/detail")
    async def war_detail(user: dict = Depends(get_current_user)):
        """Oyuncunun faction'ının aktif savaşının detaylarını döner."""
        state = await _load_state(db, user["_id"])
        player = state["player"]
        faction_id = player.get("faction_id")
        if not faction_id:
            return {"war": None}
        from faction_system import _get_faction
        fac = _get_faction(state, faction_id)
        if not fac or not fac.get("at_war_with"):
            return {"war": None}
        enemy_id = fac["at_war_with"][0]
        enemy_fac = _get_faction(state, enemy_id)
        # Aktif savaş kaydını bul
        war = None
        for w in state["world"].get("wars", []):
            if w.get("ended_turn") is not None:
                continue
            if ((w["faction_a"] == faction_id and w["faction_b"] == enemy_id) or
                    (w["faction_b"] == faction_id and w["faction_a"] == enemy_id)):
                war = w
                break
        if not war:
            return {"war": None}
        turn = state.get("turn", 0)
        # Battle log — son 10 çatışma
        battles = []
        for b in war.get("battles", [])[-10:]:
            w_fac = _get_faction(state, b.get("winner_id", ""))
            l_fac = _get_faction(state, b.get("loser_id", ""))
            loc = next((loc for loc in state["world"].get("locations", [])
                        if loc["id"] == b.get("region_id", "")), None)
            battles.append({
                "turn": b.get("turn"),
                "winner_id": b.get("winner_id"),
                "loser_id": b.get("loser_id"),
                "winner_name": w_fac["name"] if w_fac else "?",
                "loser_name":  l_fac["name"] if l_fac else "?",
                "region_name": loc["name"] if loc else b.get("region_id", ""),
                "winner_casualties": b.get("winner_casualties", 0),
                "loser_casualties":  b.get("loser_casualties", 0),
                "npc_events":        b.get("npc_events", []),
                "winner_military_after": b.get("winner_military_after"),
                "loser_military_after":  b.get("loser_military_after"),
            })
        # Haftalık kazanma oranı (son 5 savaştan)
        recent = war.get("battles", [])[-5:]
        our_wins = sum(1 for b in recent if b.get("winner_id") == faction_id)
        momentum = "üstün" if our_wins >= 4 else "geride" if our_wins <= 1 else "dengeli"
        return {
            "war": {
                "id": war["id"],
                "cause": war["cause"],
                "started_turn": war["started_turn"],
                "duration_weeks": max(0, turn - war["started_turn"]),
                "battles_count": len(war.get("battles", [])),
                "momentum": momentum,
                "battles": battles,
                "our_faction": {
                    "id": fac["id"],
                    "name": fac["name"],
                    "type": fac.get("type", ""),
                    "military_power": fac.get("military_power", 50),
                    "stability": fac.get("stability", 50),
                    "treasury": fac.get("treasury", 0),
                },
                "enemy_faction": {
                    "id": enemy_fac["id"] if enemy_fac else enemy_id,
                    "name": enemy_fac["name"] if enemy_fac else "Bilinmiyor",
                    "type": enemy_fac.get("type", "") if enemy_fac else "",
                    "military_power": enemy_fac.get("military_power", 50) if enemy_fac else 50,
                    "stability": enemy_fac.get("stability", 50) if enemy_fac else 50,
                    "treasury": enemy_fac.get("treasury", 0) if enemy_fac else 0,
                },
            }
        }

    @router.post("/factions/wars/participate")
    async def war_participate(body: dict = Body(default={}), user: dict = Depends(get_current_user)):
        """Oyuncu faction savaşına strateji seçerek katılır."""
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        _require_adult(state, "savaş")
        player = state["player"]
        faction_id = player.get("faction_id")
        if not faction_id:
            raise HTTPException(400, "Bir factiona üye değilsin.")
        from faction_system import _get_faction
        fac = _get_faction(state, faction_id)
        if not fac or not fac.get("at_war_with"):
            raise HTTPException(400, "Factionın şu an savaşta değil.")
        strategy = body.get("strategy", "saldır")
        enemy_fac_id = fac["at_war_with"][0]
        enemy_fac = _get_faction(state, enemy_fac_id)
        enemy_name = enemy_fac["name"] if enemy_fac else "Düşman"
        eq = equipment_bonuses(player)
        log = [f"⚔️ {fac['name']} adına {enemy_name} ile karşı karşıyasın!"]
        if strategy == "saldır":
            atk_mult, def_mult = 1.35, 0.70
            log.append("🗡️ Saldırı taktiği — ağır hasar veriyorsun ama risk yüksek.")
        elif strategy == "savun":
            atk_mult, def_mult = 0.70, 1.45
            log.append("🛡️ Savunma taktiği — düşmanı yıpratmaya odaklanıyorsun.")
        else:
            # Geri çekilme
            player["reputation"] = max(-100, player.get("reputation", 0) - 5)
            player["honor"]      = max(0,    player.get("honor", 0) - 5)
            log.append("💨 Savaş alanından geri çekildin. İtibar -5, Onur -5.")
            advance_time(state, weeks=1)
            await _save_state(db, user["_id"], state)
            return {
                "success": True, "outcome": "kaçış", "strategy": strategy,
                "log": log, "player_survived": True,
                "state": _decorate(state),
            }
        enemy_power = enemy_fac.get("military_power", 50) if enemy_fac else 50
        enemy_hp    = int(40 + enemy_power * 0.4)
        enemy_atk   = int(8 + enemy_power * 0.15)
        faction_rank = player.get("faction_rank", 0)
        rank_bonus = 10 if faction_rank >= 6 else (6 if faction_rank >= 3 else 3)
        base_atk   = (5 + player["stats"].get("strength", 1) * 2
                      + player["skills"].get("combat", 0) * 2 + eq["attack"] + rank_bonus)
        player_atk = int(base_atk * atk_mult)
        player_def = int(eq["defense"] * def_mult)
        player_hp  = player["health"]
        log.append(f"Düşman: {enemy_name} ({enemy_hp} can, {enemy_atk} saldırı)")
        rounds = 0
        while enemy_hp > 0 and player_hp > 0 and rounds < 12:
            rounds += 1
            dmg = random.randint(max(1, player_atk - 5), player_atk + 5)
            enemy_hp -= dmg
            log.append(f"Tur {rounds}: {dmg} hasar verdin → Düşman canı: {max(0, enemy_hp)}")
            if enemy_hp <= 0:
                break
            edmg = max(1, random.randint(enemy_atk - 3, enemy_atk + 3) - player_def)
            player_hp = max(0, player_hp - edmg)
            log.append(f"         {edmg} hasar aldın → Canın: {player_hp}")
        player["health"] = player_hp
        loot = 0
        reputation_change = 0
        honor_change = 0
        if player["health"] <= 0:
            outcome = "kayıp"
            player["health"] = 5
            reputation_change = -2
            honor_change = -2
            fac["military_power"] = max(0, fac.get("military_power", 50) - 5)
            log.append("💀 Yenildin. Ağır yaralar aldın — faction güç kaybetti.")
        elif enemy_hp <= 0:
            outcome = "zafer"
            loot = random.randint(30, 100)
            reputation_change = 4
            honor_change = 3
            player["money"] = round(player["money"] + loot, 1)
            fac["military_power"] = min(100, fac.get("military_power", 50) + 3)
            if enemy_fac:
                enemy_fac["military_power"] = max(0, enemy_fac.get("military_power", 50) - 5)
            apply_battle_victory(player)
            log.append(f"🏆 Zafer! Faction güçlendi. +{loot} altın ganimet.")
            from skills import add_skill_xp, add_stat_xp
            add_skill_xp(player, "combat", 5)
            add_stat_xp(player, "strength", 2)
        else:
            outcome = "beraberlik"
            reputation_change = 1
            honor_change = 1
            player["health"] = max(10, player["health"] - 5)
            log.append("⚖️ Uzun çatışma — beraberlikle bitti.")
        player["reputation"] = max(-100, min(100, player.get("reputation", 0) + reputation_change))
        player["honor"]      = max(0,    min(100, player.get("honor", 0) + honor_change))
        # Haftalık katkı puanı
        if outcome in ("zafer", "beraberlik"):
            player["faction_contribution"] = player.get("faction_contribution", 0) + 2
        advance_time(state, weeks=1)
        await _save_state(db, user["_id"], state)
        return {
            "success": True, "outcome": outcome, "strategy": strategy, "log": log,
            "loot": loot, "reputation_change": reputation_change, "honor_change": honor_change,
            "player_survived": player["health"] > 0,
            "our_military_power": fac.get("military_power", 50),
            "enemy_military_power": enemy_fac.get("military_power", 50) if enemy_fac else 50,
            "state": _decorate(state),
        }

    @router.post("/factions/wars/avoid")
    async def war_avoid(user: dict = Depends(get_current_user)):
        """Oyuncu bu haftaki savaş çağrısından kaçınır — itibar ve onur cezası."""
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        player = state["player"]
        if not player.get("faction_id"):
            raise HTTPException(400, "Bir factiona üye değilsin.")
        player["reputation"] = max(-100, player.get("reputation", 0) - 5)
        player["honor"]      = max(0,    player.get("honor", 0) - 3)
        advance_time(state, weeks=1)
        await _save_state(db, user["_id"], state)
        return {
            "success": True,
            "message": "Savaş çağrısından kaçındın.",
            "reputation_change": -5,
            "honor_change": -3,
            "state": _decorate(state),
        }

    @router.get("/factions/{faction_id}")
    async def faction_detail(faction_id: str, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        fac = next((f for f in state["world"].get("factions", []) if f["id"] == faction_id), None)
        if not fac:
            raise HTTPException(status_code=404, detail="Faction bulunamadi")
        return {"faction": fac}

    @router.post("/factions/create")
    async def create_faction(body: FactionCreateIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_adult(state, "faction_kurma")
        from faction_system import player_create_faction, init_factions_for_world
        init_factions_for_world(state, state.get("turn", 0))
        result = player_create_faction(state, body.name, body.faction_type, body.home_location_id, state.get("turn", 0))
        if result["success"]:
            await _save_state(db, user["_id"], state)
        return result

    @router.post("/factions/join")
    async def join_faction(body: FactionJoinIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_adult(state, "faction_katılım")
        from faction_system import player_join_faction
        result = player_join_faction(state, body.faction_id, state.get("turn", 0))
        if result["success"]:
            await _save_state(db, user["_id"], state)
        return result

    @router.post("/factions/leave")
    async def leave_faction(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        from faction_system import player_leave_faction
        result = player_leave_faction(state, state.get("turn", 0))
        if result["success"]:
            await _save_state(db, user["_id"], state)
        return result

    @router.post("/factions/rebel")
    async def rebel_against_faction(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_rebellion_age(state)
        from faction_system import player_start_rebellion
        result = player_start_rebellion(state, state.get("turn", 0))
        if result.get("success"):
            await _save_state(db, user["_id"], state)
        return result

    class FactionKickIn(BaseModel):
        target_id: str  # "PLAYER" → oyuncunun kendisi kovuldu; NPC id → NPC kovuldu

    @router.post("/factions/kick")
    async def kick_from_faction(body: FactionKickIn, user: dict = Depends(get_current_user)):
        """Faction lideri bir üyeyi kovar. Kovulma gönüllü ayrılmadan farklı cooldown uygular."""
        state = await _load_state(db, user["_id"])
        from faction_system import player_kick_from_faction
        result = player_kick_from_faction(state, body.target_id, state.get("turn", 0))
        if result.get("success"):
            await _save_state(db, user["_id"], state)
        return result

    @router.post("/factions/kicked")
    async def self_kicked(user: dict = Depends(get_current_user)):
        """Oyuncunun başka bir lider tarafından kovulduğunu kayıt altına alır."""
        state = await _load_state(db, user["_id"])
        from faction_system import player_self_kicked
        result = player_self_kicked(state, state.get("turn", 0))
        if result.get("success"):
            await _save_state(db, user["_id"], state)
        return result

    @router.get("/factions/membership-status")
    async def membership_status(user: dict = Depends(get_current_user)):
        """Oyuncunun mevcut üyelik durumunu ve kalan yasak süresini döndürür."""
        from balance_config import FACTION_MEMBERSHIP
        state = await _load_state(db, user["_id"])
        player = state["player"]
        current_turn = state.get("turn", 0)
        ban_until = player.get("faction_join_banned_until", 0)
        weeks_left = max(0, ban_until - current_turn)
        ms = player.get("faction_membership_status")
        return {
            "membership_status": ms,
            "status_label": FACTION_MEMBERSHIP["statuses"].get(ms, "—"),
            "faction_id": player.get("faction_id"),
            "weeks_left": weeks_left,
            "can_join": weeks_left == 0 and not player.get("faction_id"),
        }


    class FactionInfluenceIn(BaseModel):
        faction_id: str
        location_id: str

    @router.post("/factions/influence")
    async def faction_influence_operation(body: FactionInfluenceIn,
                                          user: dict = Depends(get_current_user)):
        """
        Oyuncunun üyesi olduğu faction adına bir şehirde nüfuz operasyonu başlat.
        faction_infiltrate_city() çağrısı: başarı/başarısızlık + nüfuz değişimi döner.
        """
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        player = state["player"]
        # Oyuncu bu faction'ın üyesi olmak zorunda
        if player.get("faction_id") != body.faction_id:
            raise HTTPException(status_code=403,
                                detail="Bu faction'ın üyesi değilsin.")
        from faction_system import faction_infiltrate_city
        from city_governance import ensure_governances
        ensure_governances(state)
        result = faction_infiltrate_city(
            body.faction_id, body.location_id, state, state.get("turn", 0)
        )
        await _save_state(db, user["_id"], state)
        return result

    @router.post("/factions/manipulate-npc")
    async def manipulate_npc(body: NPCManipulateIn, user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        _require_adult(state, "npc_manipülasyonu")
        from faction_system import player_manipulate_npc
        result = player_manipulate_npc(state, body.npc_id, body.method, state.get("turn", 0))
        if result.get("success"):
            await _save_state(db, user["_id"], state)
        return result

    @router.post("/factions/init")
    async def init_factions(user: dict = Depends(get_current_user)):
        state = await _load_state(db, user["_id"])
        from faction_system import init_factions_for_world
        init_factions_for_world(state, state.get("turn", 0))
        await _save_state(db, user["_id"], state)
        return {
            "message": "Faction sistemi baslatildi.",
            "faction_count": len(state["world"].get("factions", [])),
            "region_count": len(state["world"].get("regions", [])),
        }

    # ─── Chronicle / Kronik ──────────────────────────────────────────────

    @router.get("/chronicle/summary")
    async def get_chronicle_summary(user: dict = Depends(get_current_user)):
        """Son haftalık özet — Dashboard widget ve Kronik sayfası için."""
        state = await _load_state(db, user["_id"])
        from chronicle_summary import weekly_summary
        return weekly_summary(state)

    @router.get("/chronicle/full")
    async def get_chronicle_full(
        limit: int = 50,
        user: dict = Depends(get_current_user),
    ):
        """Tam kronik — dönem gruplu tüm geçmiş."""
        state = await _load_state(db, user["_id"])
        from chronicle_summary import full_chronicle
        return full_chronicle(state, limit=limit)

    # ─── Life Event Popup Sistemi ────────────────────────────────────────

    @router.get("/life-event/pending")
    async def get_pending_life_event(user: dict = Depends(get_current_user)):
        """Advance sonrası tetiklenmiş bekleyen life event'i döndürür."""
        state = await _load_state(db, user["_id"])
        event = state.get("pending_life_event")
        return {"event": event}

    @router.post("/life-event/choose")
    async def choose_life_event(
        body: dict = Body(default={}),
        user: dict = Depends(get_current_user),
    ):
        """
        Oyuncunun life event seçimini uygular.
        Body: { "event_id": str, "choice_index": int }
        """
        state = await _load_state(db, user["_id"])
        event_id = body.get("event_id")
        choice_index = body.get("choice_index")
        if event_id is None or choice_index is None:
            raise HTTPException(status_code=400,
                                detail="event_id ve choice_index zorunludur.")
        try:
            from life_events import apply_life_event_choice
            result = apply_life_event_choice(state, event_id, int(choice_index))
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        await _save_state(db, user["_id"], state)
        return result

    # ─── Kervan & Ticaret Rotası (Adım 8A) ─────────────────────────────────

    @router.post("/caravan/create")
    async def caravan_create(
        body: CaravanCreateIn,
        user: dict = Depends(get_current_user),
    ):
        """
        Kervan kur.
        Body: { destination_id, goods: {good: qty}, cash_on_hand }
        """
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        player = state["player"]

        if player.get("age", 7) < 13:
            raise HTTPException(status_code=400, detail="Kervan kurmak için en az 13 yaşında olmalısın.")

        from caravan import create_caravan, ensure_caravan_state
        ensure_caravan_state(state)

        if not body.goods or all(v <= 0 for v in body.goods.values()):
            raise HTTPException(status_code=400, detail="En az bir mal yüklemelisin.")

        # Negatif miktarları temizle
        clean_goods = {g: int(q) for g, q in body.goods.items() if int(q) > 0}

        try:
            result = create_caravan(
                state,
                destination_id=body.destination_id,
                goods=clean_goods,
                cash_on_hand=float(body.cash_on_hand),
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        await _save_state(db, user["_id"], state)
        return {
            "success": True,
            "caravan": result["caravan"],
            "route_names": result["route_names"],
            "total_steps": result["total_steps"],
            "state": _decorate(state),
        }

    @router.get("/caravan/status")
    async def caravan_status(user: dict = Depends(get_current_user)):
        """Aktif kervanın durumunu döndürür."""
        state = await _load_state(db, user["_id"])
        from caravan import get_caravan_status, ensure_caravan_state
        ensure_caravan_state(state)
        status = get_caravan_status(state)
        return status

    @router.post("/caravan/disband")
    async def caravan_disband(user: dict = Depends(get_current_user)):
        """Aktif kervanı dağıt, malları geri al."""
        state = await _load_state(db, user["_id"])
        _require_alive(state)
        from caravan import disband_caravan, ensure_caravan_state
        ensure_caravan_state(state)
        try:
            result = disband_caravan(state)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        await _save_state(db, user["_id"], state)
        return {"success": True, **result, "state": _decorate(state)}

    @router.get("/caravan/history")
    async def caravan_history(user: dict = Depends(get_current_user)):
        """Geçmiş kervan kayıtlarını döndürür."""
        state = await _load_state(db, user["_id"])
        from caravan import ensure_caravan_state
        ensure_caravan_state(state)
        history = state.get("caravan_history", [])
        return {"history": history[-20:]}  # Son 20 kervan

    @router.get("/caravan/pending-event")
    async def caravan_pending_event(user: dict = Depends(get_current_user)):
        """
        Haftalık tick'ten kalan kervan eventini döndürür ve temizler.
        Frontend her advance sonrası bu endpoint'i çekerek kervan
        haberini (saldırı / varış) gösterebilir.
        Response: { event: dict|null }
          event.type: "attack" | "caravan_destroyed" | "arrived"
        """
        state = await _load_state(db, user["_id"])
        event = state.pop("pending_caravan_event", None)
        if event:
            await _save_state(db, user["_id"], state)
        return {"event": event}

    return router
