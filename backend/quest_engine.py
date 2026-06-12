"""Quest Motoru v2 — GDD v5 Faz 2A.

Veri-tabanlı, dallanan, zaman sınırlı hikâye yayı motoru.
Yay tanımları story_arcs.py'de (veri), metinler locales/tr_arcs.py'de (i18n).

Bir yay örneği (state["story_quests"] içinde):
{
  "arc_id": "kayip_kervan", "status": "aktif",     # aktif|tamamlandı|başarısız|süresi_doldu
  "step_id": "a1", "started_turn": 12, "deadline_turn": 20,
  "wait_until": None,          # hafta arası bekleme ("2 ay sonra haberci gelir")
  "npc_name": "Ayaz Demirsoy", # bağlam enjeksiyonu için yaya bağlanan NPC
  "log": [{"step": "a1", "secim": "...", "sonuc": "..."}],
}

Kalıcı hikâye bayrakları state["story_flags"] içinde yaşar ve nesil
geçişlerinde TAŞINIR (Küllerin Sırrı 3 nesle yayılır).
"""
import random
from locales import t


MAX_ACTIVE_ARCS = 3
OFFER_CHANCE_PER_WEEK = 0.45


def _arcs():
    from story_arcs import STORY_ARCS
    return STORY_ARCS


def ensure_story_state(state):
    state.setdefault("story_quests", [])
    state.setdefault("story_flags", {})
    state.setdefault("story_offers", [])


def _instance(state, arc_id):
    return next((q for q in state["story_quests"] if q["arc_id"] == arc_id), None)


def _arc(arc_id):
    return next((a for a in _arcs() if a["id"] == arc_id), None)


def _step(arc, step_id):
    return next((s for s in arc["adimlar"] if s["id"] == step_id), None)


# ── Bağlam enjeksiyonu ───────────────────────────────────────────────────
def _context(state, inst=None):
    from calendar_tr import season_for_turn
    player = state["player"]
    loc = next((l for l in state["world"]["locations"]
                if l["id"] == player.get("location_id")), None)
    return {
        "oyuncu": player.get("name", "?"),
        "lokasyon": loc["name"] if loc else "?",
        "mevsim": season_for_turn(state.get("turn", 0)),
        "meslek": player.get("profession", "köylü"),
        "npc_adi": (inst or {}).get("npc_name", "bir yabancı"),
    }


def _text(key, state, inst=None):
    return t(key, **_context(state, inst))


# ── Tetik kontrolü ───────────────────────────────────────────────────────
def _trigger_ok(arc, state):
    trig = arc.get("tetik", {})
    player = state["player"]
    age = player.get("age", 7)
    if age < trig.get("yas_min", 0) or age > trig.get("yas_max", 999):
        return False
    if "lokasyon_tipi" in trig:
        loc = next((l for l in state["world"]["locations"]
                    if l["id"] == player.get("location_id")), None)
        if not loc or loc.get("kind") != trig["lokasyon_tipi"]:
            return False
    for sk, lvl in trig.get("skill", {}).items():
        if player.get("skills", {}).get(sk, 0) < lvl:
            return False
    for st, lvl in trig.get("stat", {}).items():
        if player.get("stats", {}).get(st, 0) < lvl:
            return False
    if player.get("reputation", 0) < trig.get("itibar_min", -999):
        return False
    if player.get("crime", 0) < trig.get("suc_min", 0):
        return False
    if trig.get("es_yok") and player.get("spouse_id"):
        return False
    if trig.get("mulk_min", 0) > len(state.get("properties", [])):
        return False
    for flag, val in trig.get("bayrak", {}).items():
        if state.get("story_flags", {}).get(flag) != val:
            return False
    for flag in trig.get("bayrak_yok", []):
        if flag in state.get("story_flags", {}):
            return False
    return True


# ── Efekt uygulama ───────────────────────────────────────────────────────
def _apply_effects(state, effects, inst=None):
    """Efekt sözlüğünü oyuncuya uygular. Desteklenen anahtarlar:
    para, saglik, aclik, itibar, onur, suc, korku, un,
    stat_xp {stat: xp}, skill_xp {skill: xp}, esya {item: qty},
    iliski {npc_id|"_arc": delta}, bayrak {ad: değer}
    """
    if not effects:
        return
    player = state["player"]
    if "para" in effects:
        player["money"] = round(max(0, player.get("money", 0) + effects["para"]), 1)
    if "saglik" in effects:
        player["health"] = max(0, min(100, player.get("health", 100) + effects["saglik"]))
    if "aclik" in effects:
        player["hunger"] = max(0, min(100, player.get("hunger", 100) + effects["aclik"]))
    if "itibar" in effects:
        player["reputation"] = player.get("reputation", 0) + effects["itibar"]
    if "onur" in effects:
        player["honor"] = player.get("honor", 0) + effects["onur"]
    if "suc" in effects:
        player["crime"] = max(0, player.get("crime", 0) + effects["suc"])
    if "korku" in effects:
        player["fear"] = max(0, player.get("fear", 0) + effects["korku"])
    if "un" in effects:
        player["fame"] = max(0, player.get("fame", 0) + effects["un"])
    for stat, xp in effects.get("stat_xp", {}).items():
        try:
            from skills import add_stat_xp
            add_stat_xp(player, stat, xp)
        except Exception:
            player.setdefault("stat_xp", {})[stat] = \
                player.get("stat_xp", {}).get(stat, 0) + xp
    for sk, xp in effects.get("skill_xp", {}).items():
        try:
            from skills import add_skill_xp
            add_skill_xp(player, sk, xp)
        except Exception:
            player.setdefault("skill_xp", {})[sk] = \
                player.get("skill_xp", {}).get(sk, 0) + xp
    for item, qty in effects.get("esya", {}).items():
        inv = player.setdefault("inventory", {})
        inv[item] = max(0, inv.get(item, 0) + qty)
        if inv[item] == 0:
            del inv[item]
    for npc_key, delta in effects.get("iliski", {}).items():
        rels = state.setdefault("relationships", {})
        if npc_key == "_arc" and inst and inst.get("npc_id"):
            npc_key = inst["npc_id"]
        if npc_key != "_arc":
            rels[npc_key] = max(-100, min(100, rels.get(npc_key, 0) + delta))
    for flag, val in effects.get("bayrak", {}).items():
        state.setdefault("story_flags", {})[flag] = val


# ── Test çözümü ──────────────────────────────────────────────────────────
def _resolve_test(state, test):
    """{"stat": {"intelligence": 6}} | {"skill": {"trade": 2}} →
    başarı olasılığı oyuncu seviyesine göre. Döndürür (başarılı_mı, oran)."""
    player = state["player"]
    have, need = 0, 0
    for st, lvl in test.get("stat", {}).items():
        have += player.get("stats", {}).get(st, 0)
        need += lvl
    for sk, lvl in test.get("skill", {}).items():
        have += player.get("skills", {}).get(sk, 0)
        need += lvl
    if need <= 0:
        return True, 1.0
    prob = min(0.95, max(0.10, 0.5 + 0.12 * (have - need)))
    return random.random() < prob, prob


# ── Yay başlatma / teklif ────────────────────────────────────────────────
def _pick_arc_npc(state):
    player = state["player"]
    locals_ = [n for n in state["world"]["npcs"]
               if n.get("alive") and n.get("location_id") == player.get("location_id")
               and n.get("profession") != "çocuk"]
    npc = random.choice(locals_) if locals_ else None
    return (npc["id"], npc["name"]) if npc else (None, "yaşlı bir yabancı")


def start_arc(state, arc_id, day):
    ensure_story_state(state)
    arc = _arc(arc_id)
    if not arc:
        return None, "Yay bulunamadı."
    if _instance(state, arc_id):
        return None, "Bu hikâye zaten kayıtlı."
    active = [q for q in state["story_quests"] if q["status"] == "aktif"]
    if len(active) >= MAX_ACTIVE_ARCS:
        return None, t("yay.hata_cok_aktif")
    npc_id, npc_name = _pick_arc_npc(state)
    inst = {
        "arc_id": arc_id,
        "status": "aktif",
        "step_id": arc["adimlar"][0]["id"],
        "started_turn": day,
        "deadline_turn": (day + arc["zaman_siniri_hafta"]) if arc.get("zaman_siniri_hafta") else None,
        "wait_until": None,
        "npc_id": npc_id,
        "npc_name": npc_name,
        "log": [],
    }
    state["story_quests"].append(inst)
    state["story_offers"] = [o for o in state.get("story_offers", []) if o["arc_id"] != arc_id]
    return inst, None


def decline_offer(state, arc_id):
    ensure_story_state(state)
    state["story_offers"] = [o for o in state["story_offers"] if o["arc_id"] != arc_id]
    # Reddedilen yay bir süre teklif edilmez
    state["story_flags"][f"red_{arc_id}"] = state.get("turn", 0)
    return True


# ── Seçim ────────────────────────────────────────────────────────────────
def choose(state, arc_id, choice_index, day):
    ensure_story_state(state)
    inst = _instance(state, arc_id)
    if not inst or inst["status"] != "aktif":
        return None, "Aktif hikâye bulunamadı."
    if inst.get("wait_until") and day < inst["wait_until"]:
        return None, t("yay.hata_bekleme", hafta=inst["wait_until"] - day)
    arc = _arc(arc_id)
    step = _step(arc, inst["step_id"])
    if not step:
        inst["status"] = "başarısız"
        return None, "Hikâye adımı bozuk."
    choices = step["secenekler"]
    if choice_index < 0 or choice_index >= len(choices):
        return None, "Geçersiz seçenek."
    choice = choices[choice_index]

    # Test varsa çöz
    if "test" in choice:
        ok, prob = _resolve_test(state, choice["test"])
        branch = choice["basari"] if ok else choice["basarisizlik"]
    else:
        ok, branch = True, choice

    _apply_effects(state, branch.get("efekt"), inst)
    result_key = branch.get("sonuc_key")
    result_text = _text(result_key, state, inst) if result_key else ""
    inst["log"].append({
        "step": step["id"],
        "secim": _text(choice["metin_key"], state, inst),
        "sonuc": result_text,
        "basari": ok,
    })
    inst["log"] = inst["log"][-30:]

    next_id = branch.get("sonraki")
    outcome = {"ok": ok, "result": result_text, "finished": False}

    if next_id is None:
        # Yay bitti: dal "bitis" belirtir, yoksa tamamlandı
        ending = branch.get("bitis", "tamamlandı")
        inst["status"] = ending
        outcome["finished"] = True
        outcome["ending"] = ending
        if ending == "tamamlandı":
            _apply_effects(state, arc.get("odul"), inst)
            outcome["reward"] = arc.get("odul", {})
        from simulation import _push_event
        _push_event(state, day, "hikâye",
                    t("yay.bitti_" + ("basari" if ending == "tamamlandı" else "basarisiz"),
                      yay=t(arc["baslik_key"])))
    else:
        inst["step_id"] = next_id
        wait = branch.get("bekle_hafta", 0)
        if wait:
            inst["wait_until"] = day + wait
            outcome["wait_weeks"] = wait
    return outcome, None


# ── Haftalık tick ────────────────────────────────────────────────────────
def tick_story(state, day):
    """advance_time'dan çağrılır: süre dolumu, bekleme çözümü, yeni teklif."""
    ensure_story_state(state)

    for inst in state["story_quests"]:
        if inst["status"] != "aktif":
            continue
        # Süre dolumu
        if inst.get("deadline_turn") and day > inst["deadline_turn"]:
            inst["status"] = "süresi_doldu"
            arc = _arc(inst["arc_id"])
            from simulation import _push_event
            _push_event(state, day, "hikâye",
                        t("yay.suresi_doldu", yay=t(arc["baslik_key"]) if arc else "?"))
            continue
        # Bekleme bitti mi
        if inst.get("wait_until") and day >= inst["wait_until"]:
            inst["wait_until"] = None

    # Yeni teklif zarı
    if len(state.get("story_offers", [])) >= 2:
        return
    if random.random() > OFFER_CHANCE_PER_WEEK:
        return
    known = {q["arc_id"] for q in state["story_quests"]}
    offered = {o["arc_id"] for o in state["story_offers"]}
    candidates = []
    for arc in _arcs():
        if arc["id"] in known or arc["id"] in offered:
            continue
        # Reddedildiyse 26 hafta bekle
        red_turn = state["story_flags"].get(f"red_{arc['id']}")
        if red_turn is not None and day - red_turn < 26:
            continue
        if _trigger_ok(arc, state):
            candidates.append(arc)
    if not candidates:
        return
    arc = random.choice(candidates)
    state["story_offers"].append({"arc_id": arc["id"], "offered_turn": day})
    from simulation import _push_event
    _push_event(state, day, "hikâye_teklifi",
                t("yay.teklif", yay=t(arc["baslik_key"])))


# ── Günlük görünümü (UI) ─────────────────────────────────────────────────
def get_journal(state, day):
    ensure_story_state(state)
    out = {"active": [], "offers": [], "finished": []}
    for inst in state["story_quests"]:
        arc = _arc(inst["arc_id"])
        if not arc:
            continue
        entry = {
            "arc_id": inst["arc_id"],
            "title": t(arc["baslik_key"]),
            "status": inst["status"],
            "log": inst["log"],
        }
        if inst["status"] == "aktif":
            step = _step(arc, inst["step_id"])
            waiting = bool(inst.get("wait_until") and day < inst["wait_until"])
            entry.update({
                "step_text": _text(step["metin_key"], state, inst) if step else "",
                "waiting": waiting,
                "wait_weeks": (inst["wait_until"] - day) if waiting else 0,
                "deadline_weeks": (inst["deadline_turn"] - day) if inst.get("deadline_turn") else None,
                "choices": [] if waiting else [
                    {"index": i,
                     "text": _text(c["metin_key"], state, inst),
                     "test": c.get("test")}
                    for i, c in enumerate(step["secenekler"])
                ] if step else [],
            })
            out["active"].append(entry)
        else:
            out["finished"].append(entry)
    for offer in state["story_offers"]:
        arc = _arc(offer["arc_id"])
        if arc:
            out["offers"].append({
                "arc_id": arc["id"],
                "title": t(arc["baslik_key"]),
                "hook": t(arc["kanca_key"], **_context(state)),
            })
    return out
