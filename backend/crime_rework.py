"""Suç Reworku — GDD v7 R6.

"Bas → yakalandın/yakalanmadın" devrinin sonu:
  6.1 İş seçimi (risk merdiveni) + Keşif (1 hafta, +%20 ve kaçış planı)
  6.2 İcra sahnesi — iş ortasında kesinti: Saklan / Sustur / Kaç (+ Kaçış Planı)
      Başarısızlık kademeli: temiz kaçış → görüldün (nam−, tanık anısı) → yakalandın
  6.3 Sıcak mal — büyük işlerin ganimeti hot işaretlenir; satarken risk.
      Eritme bağlantısı (Gölge Eli) S1 ile gelecek; şimdilik eşkıya çetesi
      üyeliği aynı kapıyı aralar.
"""
import random


# ── 6.1 İş kataloğu ──────────────────────────────────────────────────────
CRIME_JOBS = {
    "yankesicilik": {
        "label": "Yankesicilik", "risk": "düşük",
        "reward": (10, 35), "crime_pts": 4, "severity": 1,
        "base_chance": 0.70, "needs": None,
        "desc": "Kalabalıkta kese kesmek. Az kazanç, az iz.",
        "loot_goods": None,
    },
    "dukkan_soyma": {
        "label": "Dükkân Soyma", "risk": "orta",
        "reward": (40, 120), "crime_pts": 10, "severity": 2,
        "base_chance": 0.50, "needs": None,
        "desc": "Gece kepenk arasından süzülmek. Bekçiler dolaşır.",
        "loot_goods": None,
    },
    "kervan_baskini": {
        "label": "Kervan Baskını", "risk": "yüksek",
        "reward": (120, 350), "crime_pts": 18, "severity": 3,
        "base_chance": 0.38, "needs": "asistan",
        "desc": "Yol kesmek tek başına olmaz — dövüş bilen biri ya da çete gerekir.",
        "loot_goods": [("ipek", 1, 3), ("baharat", 1, 3)],
    },
    "konak_soygunu": {
        "label": "Konak Soygunu", "risk": "kritik",
        "reward": (500, 900), "crime_pts": 30, "severity": 4,
        "base_chance": 0.28, "needs": "plan",
        "desc": "Bir beyin konağı. Plansız girilmez — önce keşif şart.",
        "loot_goods": [("mücevher", 1, 2)],
    },
}

# İş ortası kesinti sahneleri (job → metin havuzu)
_INTERRUPTS = {
    "yankesicilik": [
        "Tam keseyi çekerken adam ensesini kaşımak için döndü!",
        "Kese elindeyken bir çocuk 'Hırsız!' diye bağırmaya hazırlanıyor.",
    ],
    "dukkan_soyma": [
        "Bekçi döndü — feneri kepenge doğru tutuyor.",
        "Raftan bir testi kaydı; ses sokakta yankılandı.",
    ],
    "kervan_baskini": [
        "Kervanın arkasından beklenmedik bir muhafız atı çıktı.",
        "Yardımcın erken saldırdı — kervancılar silaha davrandı.",
    ],
    "konak_soygunu": [
        "Konağın beyi yatağında değil — koridorda ayak sesleri!",
        "Avludaki köpekler havlamaya başladı; ışıklar yanıyor.",
    ],
}

INTERRUPT_CHANCE = 0.65   # icranın sahneye dönme olasılığı


def _job_or_none(job_id):
    return CRIME_JOBS.get(job_id)


def has_assistant(state):
    """Kervan baskını için: dövüş 3+ ya da eşkıya çetesi üyeliği."""
    player = state["player"]
    if player.get("skills", {}).get("combat", 0) >= 3:
        return True
    fid = player.get("faction_id")
    if fid:
        f = next((x for x in state["world"].get("factions", []) if x.get("id") == fid), None)
        if f and f.get("type") == "eskiya_cetesi":
            return True
    return False


def recon_for(state, job_id):
    """Geçerli keşif kaydı (varsa)."""
    r = state["player"].get("crime_recon")
    if not r:
        return None
    if r.get("job") != job_id:
        return None
    if r.get("loc_id") != state["player"].get("location_id"):
        return None
    if state.get("turn", 0) > r.get("expires", -1):
        return None
    return r


def job_listing(state):
    """GET /crime/jobs için: her işin durumu + hesaplanan şans."""
    player = state["player"]
    loc = next((l for l in state["world"]["locations"]
                if l["id"] == player.get("location_id")), None)
    security = loc["security"] if loc else 50
    out = []
    for jid, j in CRIME_JOBS.items():
        recon = recon_for(state, jid)
        chance = _success_chance(state, jid, security, recon)
        locked = None
        if j["needs"] == "asistan" and not has_assistant(state):
            locked = "Yardımcı gerekir: dövüş 3+ ya da eşkıya çetesi üyeliği."
        elif j["needs"] == "plan" and not recon:
            locked = "Önce keşif yapmalısın (1 hafta hedefi izle)."
        out.append({
            "id": jid, "label": j["label"], "risk": j["risk"],
            "desc": j["desc"],
            "reward_min": j["reward"][0], "reward_max": j["reward"][1],
            "crime_pts": j["crime_pts"],
            "chance_pct": round(chance * 100),
            "scouted": bool(recon),
            "locked": locked,
            "needs": j["needs"],
        })
    return {"jobs": out, "security": security,
            "recon": player.get("crime_recon")}


def _success_chance(state, job_id, security, recon):
    j = CRIME_JOBS[job_id]
    iq = state["player"].get("stats", {}).get("intelligence", 1)
    chance = j["base_chance"] - security / 250 + iq * 0.015
    if recon:
        chance += 0.20
    return max(0.08, min(0.92, chance))


def do_scout(state, job_id):
    """Keşif: 1 hafta hedefi izle → +%20 ve kaçış planı. (Süreyi route yakar.)"""
    j = _job_or_none(job_id)
    if not j:
        return None, "Geçersiz iş."
    player = state["player"]
    turn = state.get("turn", 0)
    player["crime_recon"] = {
        "job": job_id,
        "loc_id": player.get("location_id"),
        "turn": turn,
        "expires": turn + 3,     # keşif ~3 hafta taze kalır
        "escape_plan": True,
    }
    notes = {
        "yankesicilik": "Pazarın en dalgın saatini, bekçinin mola yerini ezberledin.",
        "dukkan_soyma": "Dükkânın arka kapısını ve bekçinin tur düzenini çıkardın.",
        "kervan_baskini": "Kervanın mola verdiği dar geçidi ve muhafız sayısını öğrendin.",
        "konak_soygunu": "Konağın hizmetkâr kapısını, köpeklerin beslenme saatini not ettin.",
    }
    return {
        "scouted": True, "job": job_id,
        "note": notes.get(job_id, "Hedefi bir hafta izledin."),
        "bonus": "+%20 başarı · Kaçış planı hazır",
    }, None


def start_execution(state, job_id):
    """İcrayı başlat. Ya doğrudan sonuç döner ya da kesinti sahnesi kurar."""
    j = _job_or_none(job_id)
    if not j:
        return None, "Geçersiz iş."
    if j["needs"] == "asistan" and not has_assistant(state):
        return None, "Bu iş için yardımcı gerekir: dövüş 3+ ya da eşkıya çetesi."
    recon = recon_for(state, job_id)
    if j["needs"] == "plan" and not recon:
        return None, "Konak soygunu plansız olmaz — önce keşif yap."

    player = state["player"]
    loc = next((l for l in state["world"]["locations"]
                if l["id"] == player.get("location_id")), None)
    security = loc["security"] if loc else 50
    chance = _success_chance(state, job_id, security, recon)

    if random.random() < INTERRUPT_CHANCE:
        scene_text = random.choice(_INTERRUPTS[job_id])
        choices = [
            {"id": "saklan", "label": "Saklan", "test": "zekâ",
             "hint": "temiz kaçış olasılığı yüksek"},
            {"id": "sustur", "label": "Sustur", "test": "güç",
             "hint": "hızlı ama namın lekelenir"},
            {"id": "kac", "label": "Kaç", "test": "dayanıklılık",
             "hint": "malı bırakırsın ama yakayı kurtarabilirsin"},
        ]
        if recon and recon.get("escape_plan"):
            choices.append({"id": "kacis_plani", "label": "Kaçış Planını Uygula",
                            "test": None, "hint": "keşfin meyvesi — garanti çıkış"})
        state["pending_crime"] = {
            "job": job_id, "chance": round(chance, 3),
            "recon": bool(recon), "turn": state.get("turn", 0),
            "scene": scene_text,
        }
        return {"needs_choice": True, "scene": scene_text,
                "job": job_id, "label": j["label"], "choices": choices}, None

    # Kesintisiz iş: sızma zarının kendisi
    if random.random() < chance:
        result = _outcome_clean(state, j, recon)
    else:
        result = _outcome_caught(state, j)
    return result, None


def resolve_execution(state, choice_id):
    """Kesinti sahnesindeki seçimi çöz."""
    pending = state.get("pending_crime")
    if not pending:
        return None, "Bekleyen bir iş yok."
    j = _job_or_none(pending["job"])
    state.pop("pending_crime", None)
    player = state["player"]
    stats = player.get("stats", {})
    recon = recon_for(state, pending["job"])

    if choice_id == "kacis_plani":
        if not pending.get("recon"):
            return None, "Kaçış planın yok."
        result = _outcome_clean(state, j, recon)
        result["note"] = "Keşfin meyvesi: kimse seni görmeden planladığın yoldan süzüldün."
        return result, None

    if choice_id == "saklan":
        ok = random.random() < min(0.9, 0.40 + stats.get("intelligence", 1) * 0.07
                                   + (0.15 if pending.get("recon") else 0))
        if ok:
            r = _outcome_clean(state, j, recon)
            r["note"] = "Gölgeye sindin; tehlike geçene dek nefes bile almadın."
            return r, None
        # görüldün / yakalandın kademesi
        if random.random() < 0.6:
            return _outcome_seen(state, j), None
        return _outcome_caught(state, j), None

    if choice_id == "sustur":
        ok = random.random() < min(0.9, 0.35 + stats.get("strength", 1) * 0.08)
        if ok:
            r = _outcome_clean(state, j, recon)
            r["note"] = "Tanığı sessizce etkisiz bıraktın. İş temiz ama vicdan payı senin."
            player["reputation"] = player.get("reputation", 0) - 3
            r.setdefault("rep_notes", []).append("Sokakta 'gözü dönmüş' diye anılmaya başladın (-3 itibar).")
            return r, None
        r = _outcome_caught(state, j)
        r["note"] = "Boğuşma uzadı; bekçiler sesin üstüne geldi."
        player["reputation"] = player.get("reputation", 0) - 3
        return r, None

    if choice_id == "kac":
        ok = random.random() < min(0.9, 0.45 + stats.get("stamina", 1) * 0.07)
        if ok:
            return {"outcome": "kacti", "success": False, "gain": 0,
                    "title": "KAÇTIN",
                    "note": "Malı bıraktın ama dar sokaklarda izini kaybettirdin. "
                            "Eli boş — fakat özgürsün."}, None
        return _outcome_caught(state, j), None

    return None, "Geçersiz seçim."


# ── Sonuç kademeleri ─────────────────────────────────────────────────────
def _roll_loot(state, j):
    """Para + (büyük işlerde) sıcak mal."""
    lo, hi = j["reward"]
    money = random.randint(lo, hi)
    goods = []
    if j.get("loot_goods"):
        inv = state["player"].setdefault("inventory", {})
        hot = state["player"].setdefault("hot_goods", {})
        for good, qlo, qhi in j["loot_goods"]:
            qty = random.randint(qlo, qhi)
            if qty > 0:
                inv[good] = inv.get(good, 0) + qty
                hot[good] = hot.get(good, 0) + qty
                goods.append({"good": good, "qty": qty, "hot": True})
    return money, goods


def _outcome_clean(state, j, recon):
    player = state["player"]
    money, goods = _roll_loot(state, j)
    player["money"] = round(player.get("money", 0) + money, 1)
    player["crime"] = min(100, player.get("crime", 0) + j["crime_pts"])
    if recon:
        player.pop("crime_recon", None)   # plan kullanıldı
    try:
        from skills import add_stat_xp
        add_stat_xp(player, "intelligence", 1)
    except Exception:
        pass
    return {"outcome": "temiz", "success": True, "gain": money,
            "loot": goods, "title": "TEMİZ İŞ",
            "note": "Kimse bir şey görmedi. Kese cebinde, gece dostun."}


def _outcome_seen(state, j):
    """Görüldün: ganimetin yarısı, nam kaybı, tanık NPC anısı."""
    player = state["player"]
    money, goods = _roll_loot(state, j)
    money = money // 2
    player["money"] = round(player.get("money", 0) + money, 1)
    player["crime"] = min(100, player.get("crime", 0) + j["crime_pts"] + 4)
    player["reputation"] = player.get("reputation", 0) - 4
    witness_name = None
    locals_ = [n for n in state["world"]["npcs"]
               if n.get("alive") and n.get("location_id") == player.get("location_id")]
    if locals_:
        w = random.choice(locals_)
        witness_name = w["name"]
        rels = state.setdefault("relationships", {})
        rels[w["id"]] = max(-100, rels.get(w["id"], 0) - 10)
        try:
            from npc_profile import push_personal_memory
            push_personal_memory(w, f"{player.get('name','Biri')}: onu {j['label'].lower()} sırasında gördü")
        except Exception:
            pass
    note = "Paçayı kurtardın ama bir çift göz seni tanıdı."
    if witness_name:
        note += f" {witness_name} gördüklerini unutmayacak."
    return {"outcome": "goruldun", "success": True, "gain": money,
            "loot": goods, "title": "GÖRÜLDÜN",
            "witness": witness_name, "note": note}


def _outcome_caught(state, j):
    player = state["player"]
    fine = random.randint(50, 200) * max(1, j["severity"] // 2 + 1)
    paid = min(player.get("money", 0), fine)
    player["money"] = round(player.get("money", 0) - paid, 1)
    player["crime"] = min(100, player.get("crime", 0) + j["crime_pts"] + 5)
    player["reputation"] = player.get("reputation", 0) - 5
    return {"outcome": "yakalandin", "success": False, "fine": paid,
            "title": "YAKALANDIN",
            "note": f"Bekçiler bileğine yapıştı. {paid} altın ceza ödedin; sicilin kabardı."}


# ── 6.3 Sıcak mal satışı ─────────────────────────────────────────────────
def sell_hot_check(state, good, qty):
    """Satışta çalıntı mal kontrolü. Döndürür (çarpan, not, yakalandı).
    Eşkıya çetesi üyeliği güvenli eritme kapısı açar (S1'de Gölge Eli gelecek)."""
    player = state["player"]
    hot = player.get("hot_goods", {})
    hot_qty = min(hot.get(good, 0), qty)
    if hot_qty <= 0:
        return 1.0, None, False
    # satılan kadar sıcaklık düşer
    hot[good] = hot.get(good, 0) - hot_qty
    if hot[good] <= 0:
        hot.pop(good, None)
    if has_assistant(state) and _is_eskiya(state):
        return 0.8, "Çete bağlantısı malı sessizce eritti (%20 pay kesti).", False
    trade = player.get("skills", {}).get("trade", 0)
    caught_chance = max(0.10, 0.25 + hot_qty * 0.02 - trade * 0.02)
    if random.random() < caught_chance:
        player["crime"] = min(100, player.get("crime", 0) + 5)
        player["reputation"] = player.get("reputation", 0) - 3
        return 0.5, "⚠️ Malın çalıntı olduğu anlaşıldı! Yok pahasına elden çıkardın, adın lekelendi.", True
    return 1.0, "Çalıntı mal sorgusuz gitti... bu sefer.", False


def _is_eskiya(state):
    fid = state["player"].get("faction_id")
    if not fid:
        return False
    f = next((x for x in state["world"].get("factions", []) if x.get("id") == fid), None)
    return bool(f and f.get("type") == "eskiya_cetesi")
