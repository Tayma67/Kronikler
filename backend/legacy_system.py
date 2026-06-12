"""Yaşam Derinliği & Geç Oyun — GDD v5 Faz 4.

4B — Aile 2.0:
  - Eş ilişkisi bakım gerektirir: ihmal → soğuma → kriz
  - Çocuk yatırımı: eğitim yönü seç → nesil geçişinde başlangıç bonusu
  - Hanedan puanı: nesiller boyu biriken görünür skor
4C — Vasiyet & nesil geçiş bonusu (Miras Perki)
4D — Geç oyun: taht iddiası, şehir kurma, dünya çağ olayları
"""
import random
from locales import t

# ── Hanedan puanı ────────────────────────────────────────────────────────
def ensure_legacy_state(state):
    state.setdefault("dynasty", {"score": 0, "log": []})
    state.setdefault("child_investments", {})
    state.setdefault("will", {"style": None, "heir_id": None})
    state["player"].setdefault("last_spouse_care_turn", 0)


def add_dynasty_points(state, pts, reason):
    ensure_legacy_state(state)
    d = state["dynasty"]
    d["score"] = max(0, d["score"] + pts)
    d["log"].append({"turn": state.get("turn", 0), "pts": pts, "reason": reason})
    d["log"] = d["log"][-40:]


def dynasty_title(score):
    if score >= 300:
        return "Efsanevi Hanedan"
    if score >= 200:
        return "Soylu Hanedan"
    if score >= 100:
        return "Saygın Aile"
    if score >= 50:
        return "Tanınan Aile"
    return "Sıradan Aile"


def _dynasty_weekly_accrual(state, day):
    """Haftalık küçük birikimler: mülk, ev kademesi, ün eşiği aşımları."""
    if day % 8 != 0:    # 2 ayda bir değerlendir (spam önleme)
        return
    player = state["player"]
    pts = 0
    reasons = []
    props = state.get("properties", [])
    if len(props) >= 3:
        pts += 1
        reasons.append("mülk varlığı")
    ev = next((p for p in props if p["type"] == "ev"), None)
    if ev and ev["config"].get("tier", 1) >= 3:
        pts += 1
        reasons.append("büyük konak")
    if player.get("fame", 0) >= 30:
        pts += 1
        reasons.append("yayılan ün")
    if player.get("profession") in ("kral", "vali", "lord"):
        pts += 2
        reasons.append("yüksek mevki")
    if pts:
        add_dynasty_points(state, pts, ", ".join(reasons))


# ── 4B: Eş ilişkisi bakımı ───────────────────────────────────────────────
def spouse_care_tick(state, day):
    """Evlilik ihmal edilirse ilişki soğur; eşiklerde kriz eventleri."""
    player = state["player"]
    spouse_id = player.get("spouse_id")
    if not spouse_id:
        # Eş yok (ölüm/ayrılık): kriz bayrakları takılı kalmasın
        flags = state.get("story_flags", {})
        flags.pop("es_soguma_uyari", None)
        flags.pop("es_kriz", None)
        return
    rels = state.setdefault("relationships", {})
    rel = rels.get(spouse_id, 50)
    # Haftalık doğal soğuma (etkileşim ilişkiyi yükselterek telafi eder)
    if day % 2 == 0:
        rel = rel - 1
    rels[spouse_id] = max(-100, min(100, rel))
    from simulation import _push_event
    flags = state.setdefault("story_flags", {})
    if rel <= 25 and not flags.get("es_soguma_uyari"):
        flags["es_soguma_uyari"] = True
        _push_event(state, day, "aile_krizi", t("aile.es_soguma"))
    elif rel <= 0 and not flags.get("es_kriz"):
        flags["es_kriz"] = True
        player["reputation"] = player.get("reputation", 0) - 5
        _push_event(state, day, "aile_krizi", t("aile.es_kriz"))
    elif rel > 40:
        flags.pop("es_soguma_uyari", None)
        flags.pop("es_kriz", None)


# ── 4B: Çocuk yatırımı ───────────────────────────────────────────────────
EDUCATION_TRACKS = {
    "ilim":   {"label": "İlim Yolu",   "weekly_cost": 3, "stat": "intelligence", "skill": None},
    "zanaat": {"label": "Zanaat Yolu", "weekly_cost": 2, "stat": None, "skill": "crafting"},
    "savaş":  {"label": "Savaş Yolu",  "weekly_cost": 3, "stat": "strength", "skill": "combat"},
    "ticaret":{"label": "Ticaret Yolu","weekly_cost": 2, "stat": "charisma", "skill": "trade"},
}


def set_child_investment(state, child_id, track):
    ensure_legacy_state(state)
    if track not in EDUCATION_TRACKS and track is not None:
        return None, "Geçersiz eğitim yolu."
    child = next((n for n in state["world"]["npcs"]
                  if n["id"] == child_id and n.get("alive")), None)
    if not child or child_id not in state["player"].get("children_ids", []):
        return None, "Bu çocuk bulunamadı."
    if child.get("age", 0) >= 18:
        return None, "Çocuk artık yetişkin; eğitim yönlendirmesi için geç."
    if track is None:
        state["child_investments"].pop(child_id, None)
        return {"removed": True}, None
    state["child_investments"][child_id] = {
        "track": track, "weeks": state["child_investments"].get(child_id, {}).get("weeks", 0),
    }
    return {"track": track}, None


def child_investment_tick(state, day):
    """Haftalık eğitim masrafı; birikim nesil geçişinde bonusa dönüşür."""
    ensure_legacy_state(state)
    player = state["player"]
    for child_id, inv in list(state["child_investments"].items()):
        track = EDUCATION_TRACKS.get(inv.get("track"))
        if not track:
            continue
        child = next((n for n in state["world"]["npcs"]
                      if n["id"] == child_id and n.get("alive")), None)
        if not child or child.get("age", 0) >= 18:
            continue
        if player.get("money", 0) < track["weekly_cost"]:
            continue    # parasızken eğitim duraklar
        player["money"] = round(player["money"] - track["weekly_cost"], 1)
        inv["weeks"] = inv.get("weeks", 0) + 1


def apply_child_bonus(state, child_id, new_player):
    """Nesil geçişinde: yatırım yapılan çocuk, birikime göre bonus alır."""
    inv = state.get("child_investments", {}).get(child_id)
    if not inv:
        return None
    track = EDUCATION_TRACKS.get(inv.get("track"))
    weeks = inv.get("weeks", 0)
    if not track or weeks < 10:
        return None
    level = min(3, weeks // 26)   # her ~6 ay eğitim = +1 seviye (max 3)
    if level < 1:
        level = 1
    if track["stat"]:
        new_player["stats"][track["stat"]] = \
            min(10, new_player["stats"].get(track["stat"], 1) + level)
    if track["skill"]:
        new_player["skills"][track["skill"]] = \
            min(10, new_player["skills"].get(track["skill"], 0) + level)
    return {"track": track["label"], "level": level, "weeks": weeks}


# ── 4C: Vasiyet & Miras Perki ────────────────────────────────────────────
def set_will(state, style, heir_id=None):
    ensure_legacy_state(state)
    if style not in ("eşit", "tek_varis", "hayır"):
        return None, "Geçersiz vasiyet stili."
    if style == "tek_varis" and heir_id:
        if heir_id not in state["player"].get("children_ids", []):
            return None, "Varis çocukların arasından seçilmeli."
    state["will"] = {"style": style, "heir_id": heir_id}
    add_dynasty_points(state, 2, "vasiyet düzenlendi")
    return state["will"], None


def will_money_multiplier(state):
    """Vasiyet stiline göre miras para çarpanı."""
    style = state.get("will", {}).get("style")
    return {"tek_varis": 0.75, "eşit": 0.60, "hayır": 0.40}.get(style, 0.60)


def apply_generation_bonuses(state, chosen_child_id=None):
    """begin_inheritance sonrası çağrılır: Miras Perki + çocuk yatırımı +
    vasiyet yan etkileri + hanedan devri."""
    ensure_legacy_state(state)
    new_player = state["player"]
    notes = []

    # Miras Perki: hanedan puanı eşikleri
    score = state["dynasty"]["score"]
    if score >= 200:
        for s in new_player["stats"]:
            new_player["stats"][s] = min(10, new_player["stats"][s] + 1)
        new_player["money"] = round(new_player.get("money", 0) + 150, 1)
        new_player["fame"] = new_player.get("fame", 0) + 10
        notes.append(t("miras.perk_soylu"))
    elif score >= 100:
        new_player["stats"]["charisma"] = min(10, new_player["stats"].get("charisma", 1) + 1)
        new_player["money"] = round(new_player.get("money", 0) + 75, 1)
        notes.append(t("miras.perk_saygin"))
    elif score >= 50:
        new_player["money"] = round(new_player.get("money", 0) + 40, 1)
        notes.append(t("miras.perk_taninan"))

    # Çocuk eğitim yatırımı bonusu
    if chosen_child_id:
        bonus = apply_child_bonus(state, chosen_child_id, new_player)
        if bonus:
            notes.append(t("miras.egitim_bonusu", yol=bonus["track"], seviye=bonus["level"]))

    # Vasiyet yan etkileri
    style = state.get("will", {}).get("style")
    if style == "hayır":
        new_player["reputation"] = new_player.get("reputation", 0) + 15
        notes.append(t("miras.vasiyet_hayir"))
    elif style == "tek_varis":
        notes.append(t("miras.vasiyet_tek_varis"))
        # Kardeş düşmanlığı: yeni oyuncunun kardeşleri (aynı ebeveyn) -30 ilişki
        parent_ids = set(new_player.get("parent_ids", []))
        if parent_ids:
            rels = state.setdefault("relationships", {})
            for npc in state["world"]["npcs"]:
                if (npc.get("alive") and
                        parent_ids & set(npc.get("parent_ids", []))):
                    rels[npc["id"]] = rels.get(npc["id"], 0) - 30

    # Hanedan: nesil başına taban puan + yatırımlar sıfırlanır
    add_dynasty_points(state, 10, f"{state.get('generation', 1)}. nesil devri")
    state["child_investments"] = {}
    state["will"] = {"style": None, "heir_id": None}
    state["story_flags"].pop("es_soguma_uyari", None)
    state["story_flags"].pop("es_kriz", None)
    # Ölen karakterin yarım kalan hikâyeleri yeni nesle taşınmaz:
    # aktif yaylar "yarım kaldı" olarak kapanır (bayraklar kalıcıdır,
    # Küllerin Sırrı gibi nesiller arası yaylar bayrak üzerinden sürer).
    for q in state.get("story_quests", []):
        if q.get("status") == "aktif":
            q["status"] = "yarım_kaldı"
    state["story_offers"] = []
    # Yarım kalan çatışma da ölümle kapanır
    state.pop("active_combat", None)
    return notes


# ── 4D: Taht iddiası ─────────────────────────────────────────────────────
THRONE_REQUIREMENTS = {"age": 25, "reputation": 70, "fame": 40, "money": 5000}


def throne_eligibility(state):
    p = state["player"]
    return {
        "age": {"need": THRONE_REQUIREMENTS["age"], "have": p.get("age", 7),
                "ok": p.get("age", 7) >= THRONE_REQUIREMENTS["age"]},
        "reputation": {"need": THRONE_REQUIREMENTS["reputation"],
                       "have": p.get("reputation", 0),
                       "ok": p.get("reputation", 0) >= THRONE_REQUIREMENTS["reputation"]},
        "fame": {"need": THRONE_REQUIREMENTS["fame"], "have": p.get("fame", 0),
                 "ok": p.get("fame", 0) >= THRONE_REQUIREMENTS["fame"]},
        "money": {"need": THRONE_REQUIREMENTS["money"], "have": int(p.get("money", 0)),
                  "ok": p.get("money", 0) >= THRONE_REQUIREMENTS["money"]},
        "already_king": p.get("profession") == "kral",
    }


def claim_throne(state, day):
    """Taht iddiası: yüksek gereksinim, başarısızlığın ağır bedeli."""
    p = state["player"]
    elig = throne_eligibility(state)
    if elig["already_king"]:
        return None, t("taht.hata_zaten_kral")
    failed = [k for k, v in elig.items() if isinstance(v, dict) and not v["ok"]]
    if failed:
        return None, t("taht.hata_gereksinim")
    kingdom = next((k for k in state["world"]["kingdoms"]
                    if k["id"] == p.get("kingdom_id")), None)
    if not kingdom:
        return None, "Krallık bulunamadı."

    p["money"] = round(p["money"] - 3000, 1)   # kampanya masrafı her durumda
    intel = p["stats"].get("intelligence", 1)
    cha = p["stats"].get("charisma", 1)
    chance = min(0.85, 0.30 + p.get("fame", 0) / 200 + intel * 0.02 + cha * 0.03
                 + (0.15 if state.get("story_flags", {}).get("cemiyet_üye") else 0))
    from simulation import _push_event
    if random.random() < chance:
        old_king = next((n for n in state["world"]["npcs"]
                         if n["id"] == kingdom.get("king_id")), None)
        if old_king:
            old_king["profession"] = "sürgün_lord"
        kingdom["king_id"] = "PLAYER"
        kingdom["heir_id"] = None
        p["profession"] = "kral"
        p["fame"] = p.get("fame", 0) + 30
        p["reputation"] = p.get("reputation", 0) + 20
        add_dynasty_points(state, 100, "taht ele geçirildi")
        _push_event(state, day, "tahta_çıkış",
                    t("taht.zafer", oyuncu=p["name"], krallik=kingdom["name"]))
        return {"outcome": "zafer", "kingdom": kingdom["name"], "chance": round(chance, 2)}, None
    else:
        p["reputation"] = max(-100, p.get("reputation", 0) - 25)
        p["crime"] = p.get("crime", 0) + 50
        p["money"] = round(max(0, p["money"] - 1000), 1)
        kingdom["stability"] = max(10, kingdom.get("stability", 50) - 15)
        _push_event(state, day, "isyan",
                    t("taht.yenilgi", oyuncu=p["name"], krallik=kingdom["name"]))
        return {"outcome": "yenilgi", "chance": round(chance, 2)}, None


# ── 4D: Şehir kurma ──────────────────────────────────────────────────────
SETTLEMENT_COST = 8000


def found_settlement(state, name, day):
    p = state["player"]
    if p.get("age", 7) < 25:
        return None, t("sehir.hata_yas")
    if p.get("money", 0) < SETTLEMENT_COST:
        return None, t("sehir.hata_para", cost=SETTLEMENT_COST)
    name = (name or "").strip()[:24]
    if len(name) < 3:
        return None, t("sehir.hata_isim")
    if any(l["name"].lower() == name.lower() for l in state["world"]["locations"]):
        return None, t("sehir.hata_isim_var")

    p["money"] = round(p["money"] - SETTLEMENT_COST, 1)
    from world_gen import _make_location
    kingdom = next((k for k in state["world"]["kingdoms"]
                    if k["id"] == p.get("kingdom_id")), state["world"]["kingdoms"][0])
    loc = _make_location("köy", name, kingdom["id"], kingdom["name"])
    loc["population"] = random.randint(40, 80)   # yeni yerleşim küçük başlar
    loc["founded_by_player"] = True
    loc["founded_turn"] = day
    state["world"]["locations"].append(loc)

    # Kurucu evi hediye: yeni yerleşimde tier 2 ev
    from property_system import ensure_properties
    from world_gen import new_id
    ensure_properties(state)
    state["properties"].append({
        "id": new_id(), "type": "ev", "name": f"{name} Kurucu Konağı",
        "location_id": loc["id"], "location_name": name,
        "purchased_turn": day, "purchase_cost": 0, "condition": 100,
        "config": {"tier": 2}, "workers": [], "ledger": [],
        "pending_harvest": 0, "total_profit": 0.0,
    })
    # Birkaç NPC göç eder
    migrants = [n for n in state["world"]["npcs"]
                if n.get("alive") and n.get("profession") not in
                ("kral", "veliaht", "lord", "general")]
    random.shuffle(migrants)
    for m in migrants[:random.randint(4, 8)]:
        m["location_id"] = loc["id"]
        m["location_name"] = name
    add_dynasty_points(state, 50, f"{name} kuruldu")
    from simulation import _push_event
    _push_event(state, day, "şehir_kuruluşu",
                t("sehir.kuruldu", oyuncu=p["name"], sehir=name))
    return {"location_id": loc["id"], "name": name}, None


# ── 4D: Dünya çağ olayları ───────────────────────────────────────────────
EPOCH_INTERVAL = (60, 100)   # hafta aralığı


def epoch_tick(state, day):
    """50-100 ayda bir büyük dönüm noktası: dünya kalıcı değişir."""
    nxt = state.get("_next_epoch_turn")
    if nxt is None:
        state["_next_epoch_turn"] = day + random.randint(*EPOCH_INTERVAL)
        return
    if day < nxt:
        return
    state["_next_epoch_turn"] = day + random.randint(*EPOCH_INTERVAL)

    from simulation import _push_event, _recompute_prices
    kingdoms = state["world"]["kingdoms"]
    locations = state["world"]["locations"]
    event = random.choice(["buyuk_savas", "buyuk_salgin", "taht_degisimi", "altin_cag"])

    if event == "buyuk_savas" and len(kingdoms) > 1:
        k1, k2 = random.sample(kingdoms, 2)
        if k2["id"] not in k1["at_war_with"]:
            k1["at_war_with"].append(k2["id"])
            k2["at_war_with"].append(k1["id"])
        for k in (k1, k2):
            k["stability"] = max(10, k.get("stability", 50) - 20)
        for loc in locations:
            if loc["kingdom_id"] in (k1["id"], k2["id"]):
                loc["security"] = max(5, loc.get("security", 50) - 15)
                if "silah" in loc.get("market", {}):
                    loc["market"]["silah"]["demand"] += 40
                    _recompute_prices(loc, turn=day)
        _push_event(state, day, "çağ_olayı",
                    t("cag.buyuk_savas", k1=k1["name"], k2=k2["name"]))
    elif event == "buyuk_salgin":
        for loc in locations:
            loc["population"] = max(10, int(loc.get("population", 50) * random.uniform(0.85, 0.95)))
            loc["wealth"] = max(5, loc.get("wealth", 50) - random.randint(5, 12))
        # NPC kayıpları
        alive = [n for n in state["world"]["npcs"] if n.get("alive")]
        for npc in random.sample(alive, max(1, len(alive) // 12)):
            npc["alive"] = False
        _push_event(state, day, "çağ_olayı", t("cag.buyuk_salgin"))
    elif event == "taht_degisimi":
        k = random.choice(kingdoms)
        if k.get("king_id") and k["king_id"] != "PLAYER":
            old = next((n for n in state["world"]["npcs"] if n["id"] == k["king_id"]), None)
            if old:
                old["alive"] = False
            cands = [n for n in state["world"]["npcs"]
                     if n.get("alive") and n.get("kingdom_id") == k["id"] and n.get("age", 0) >= 18]
            if cands:
                new_king = random.choice(cands)
                new_king["profession"] = "kral"
                k["king_id"] = new_king["id"]
                _push_event(state, day, "çağ_olayı",
                            t("cag.taht_degisimi", krallik=k["name"], kral=new_king["name"]))
    else:   # altin_cag
        k = random.choice(kingdoms)
        k["stability"] = min(100, k.get("stability", 50) + 20)
        for loc in locations:
            if loc["kingdom_id"] == k["id"]:
                loc["wealth"] = min(100, loc.get("wealth", 50) + random.randint(5, 15))
        _push_event(state, day, "çağ_olayı", t("cag.altin_cag", krallik=k["name"]))


# ── Ana haftalık tick ────────────────────────────────────────────────────
def legacy_world_tick(state, day):
    ensure_legacy_state(state)
    spouse_care_tick(state, day)
    child_investment_tick(state, day)
    _dynasty_weekly_accrual(state, day)
    epoch_tick(state, day)
