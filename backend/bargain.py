"""Pazarlık Mini-Oyunu — GDD v7 R3.1.

Her alışverişte opsiyonel, ~10 saniyelik çekişme:
  [Kabul Et] [Karşı Teklif] [Blöf: "Çarşıda ucuza buldum"]
- Satıcı açılış fiyatı piyasanın üstünde (alımda) / altında (satışta).
- Çekişme: ticaret skill + satıcı inatçılığı + ilişki. En fazla 2 tur.
- npc_intel["ticaret"] açıksa satıcının TABAN fiyatı görünür → bilgi=güç.
- Sonuç bir KUPON üretir: trade endpoint'i aynı tur içinde o mal/aksiyon
  için kuponu tüketir ve birim fiyatı çarpanla düzeltir.
- Blöf tutmazsa satıcı alınır: fiyat kötüleşir + (NPC ise) ilişki düşer.
"""
import random


def _find_vendor(state, loc):
    """Lokasyondaki bir tüccar/satıcı NPC'yi bul; yoksa anonim pazarcı."""
    candidates = [n for n in state["world"]["npcs"]
                  if n.get("alive") and n.get("location_id") == loc["id"]
                  and n.get("profession") in ("tüccar", "seyyar_satıcı", "han_sahibi")]
    if candidates:
        n = random.choice(candidates)
        return {"id": n["id"], "name": n["name"],
                "personality": n.get("personality", [])}
    return {"id": None, "name": "Pazarcı", "personality": []}


def _stubbornness(vendor, rel):
    """0.0 (yumuşak) — 1.0 (kaya). Kişilik + ilişkiden."""
    s = 0.5
    p = vendor.get("personality", [])
    if "cimri" in p: s += 0.2
    if "kibirli" in p: s += 0.15
    if "inatçı" in p or "huysuz" in p: s += 0.15
    if "cömert" in p: s -= 0.2
    if "merhametli" in p: s -= 0.1
    s -= max(-0.15, min(0.2, rel / 250))   # iyi ilişki yumuşatır
    return max(0.1, min(0.95, s))


def start_bargain(state, loc, good, qty, action, base_total):
    """Pazarlığı başlat. base_total = normal trade toplamı (mult dahil).
    S2: satıcının ZİHNİ konuşur — etkin ilişki kademesi fiyatı oynatır,
    baskın nam korku/sıcaklık olarak tezgâha yansır."""
    if state.get("pending_bargain"):
        state.pop("pending_bargain", None)   # eski el düşer
    player = state["player"]
    vendor = _find_vendor(state, loc)
    tier = None
    tier_note = None
    if vendor["id"]:
        npc = next((n for n in state["world"]["npcs"] if n["id"] == vendor["id"]), None)
        try:
            from npc_mind import effective_rel, behavior_tier
            rel = effective_rel(state, npc) if npc else 0
            tier = behavior_tier(rel)
        except Exception:
            rel = state.get("relationships", {}).get(vendor["id"], 0)
    else:
        rel = 0
    stub = _stubbornness(vendor, rel)

    if action == "al":
        opening = base_total * random.uniform(1.08 + stub * 0.10, 1.15 + stub * 0.12)
        floor = base_total * (0.88 + stub * 0.08)     # satıcının gerçek tabanı
    else:  # sat — satıcı senin malına düşük teklif açar
        opening = base_total * random.uniform(0.80 - stub * 0.06, 0.90 - stub * 0.04)
        floor = base_total * (1.04 + (1 - stub) * 0.08)  # çıkabileceği tavan

    # Davranış kademesi: düşman %20 zam yapar, dost/sadık indirir (GDD tablosu)
    if tier and tier["al_carpan"] != 1.0:
        carpan = tier["al_carpan"] if action == "al" else round(2 - tier["al_carpan"], 3)
        opening *= carpan
        floor *= (1 + (carpan - 1) * 0.6)
        if tier["key"] == "aktif_dusman":
            tier_note = f"{vendor['name']} yüzüne bile bakmadan fahiş fiyat söyledi."
        elif tier["key"] in ("dost", "sadik"):
            tier_note = f"{vendor['name']} seni görünce yumuşadı: 'Sana ayrı fiyatım var.'"

    # Baskın nam: zalim → korku iskontosu (insanlar senden çekiniyor)
    try:
        from npc_mind import nam_effects
        fx = nam_effects(state)
        if fx.get("korku_iskontosu") and action == "al":
            opening *= 0.96
            floor *= 0.96
            tier_note = f"{vendor['name']} gözlerini kaçırdı — kimse seninle uğraşmak istemiyor."
        elif fx.get("pazarlik_sicaklik"):
            stub = max(0.1, stub - 0.05)
    except Exception:
        pass

    # S2 koz: amacını sömürdüğün satıcının tabanını ezersin
    if vendor["id"] and state.get("npc_intel", {}).get(vendor["id"], {}).get("koz"):
        if action == "al":
            floor *= 0.93
        else:
            floor *= 1.07

    bargain = {
        "loc_id": loc["id"], "good": good, "qty": int(qty), "action": action,
        "base": round(base_total, 1),
        "offer": round(opening, 1),
        "floor": round(floor, 1),
        "round": 1, "max_rounds": 2,
        "vendor": vendor, "rel": rel, "stub": round(stub, 2),
        "tier": tier["key"] if tier else "notr",
        "tier_note": tier_note,
        "soured": False,
    }
    state["pending_bargain"] = bargain
    return _view(state, bargain)


def _view(state, b):
    intel = state.get("npc_intel", {}).get(b["vendor"]["id"] or "", {})
    trade_skill = state["player"].get("skills", {}).get("trade", 0)
    # S2: ticaret bilgisi, koz, yüksek skill veya sadık müttefik tabanı gösterir
    floor_visible = (bool(intel.get("ticaret")) or bool(intel.get("koz"))
                     or trade_skill >= 6 or b.get("tier") == "sadik")
    verb = "istiyor" if b["action"] == "al" else "veriyor"
    return {
        "vendor": b["vendor"]["name"],
        "good": b["good"], "qty": b["qty"], "action": b["action"],
        "offer": b["offer"],
        "base": b["base"],
        "floor": b["floor"] if floor_visible else None,
        "floor_visible": floor_visible,
        "round": b["round"], "max_rounds": b["max_rounds"],
        "tier": b.get("tier", "notr"),
        "tier_note": b.get("tier_note"),
        "soured": b["soured"],
        "line": f"{b['vendor']['name']}: \"{b['offer']} akçe {verb}um. "
                + ("Son sözüm bu.\"" if b["round"] >= b["max_rounds"] else "Düşün taşın.\""),
    }


def _finish(state, b, final_price, note):
    """Kuponu yaz, pazarlığı kapat."""
    state.pop("pending_bargain", None)
    unit_mult = final_price / max(0.01, b["base"])
    state["bargain_voucher"] = {
        "loc_id": b["loc_id"], "good": b["good"], "action": b["action"],
        "qty": b["qty"], "unit_mult": round(unit_mult, 4),
        "turn": state.get("turn", 0),
    }
    saved = round(b["base"] - final_price, 1) if b["action"] == "al" \
        else round(final_price - b["base"], 1)
    return {
        "done": True, "final": round(final_price, 1),
        "base": b["base"], "saved": saved, "note": note,
        "voucher": True,
    }


def bargain_move(state, move, counter_offer=None):
    """Hamle: kabul | karsi | blof | vazgec."""
    b = state.get("pending_bargain")
    if not b:
        return None, "Süren bir pazarlık yok."
    player = state["player"]
    trade_skill = player.get("skills", {}).get("trade", 0)
    charisma = player.get("stats", {}).get("charisma", 1)

    if move == "vazgec":
        state.pop("pending_bargain", None)
        return {"done": True, "cancelled": True,
                "note": "Pazarlıktan vazgeçtin; tezgâh önünden ayrıldın."}, None

    if move == "kabul":
        return _finish(state, b, b["offer"],
                       f"{b['vendor']['name']} elini uzattı: \"Anlaştık.\""), None

    if move == "karsi":
        # Oyuncunun karşı teklifi: verilmemişse taban yönünde otomatik
        if b["action"] == "al":
            target = float(counter_offer) if counter_offer else b["floor"]
            target = max(b["floor"] * 0.9, min(target, b["offer"]))
        else:
            target = float(counter_offer) if counter_offer else b["floor"]
            target = min(b["floor"] * 1.1, max(target, b["offer"]))
        # Çekişme: skill + karizma + ilişki vs inatçılık
        push = 0.35 + trade_skill * 0.06 + charisma * 0.02 + max(0, b["rel"]) * 0.004
        resist = b["stub"]
        success = random.random() < max(0.15, min(0.9, push - resist * 0.3))
        if success:
            # Satıcı senin sayına doğru kayar (tabanı geçemez)
            if b["action"] == "al":
                new_offer = max(b["floor"], (b["offer"] + target) / 2)
            else:
                new_offer = min(b["floor"], (b["offer"] + target) / 2)
            b["offer"] = round(new_offer, 1)
            try:
                from skills import add_skill_xp
                add_skill_xp(player, "trade", 2)
            except Exception:
                pass
            note = f"{b['vendor']['name']} homurdandı ama indi: {b['offer']} akçe."
        else:
            note = f"{b['vendor']['name']} başını salladı: \"Olmaz, dediğim dedik.\""
        b["round"] += 1
        if b["round"] > b["max_rounds"]:
            return _finish(state, b, b["offer"], note + " (Pazarlık kapandı.)"), None
        view = _view(state, b)
        view["note"] = note
        view["counter_success"] = success
        return view, None

    if move == "blof":
        # "Çarşıda ucuza buldum" — yüksek risk/yüksek ödül
        chance = max(0.10, min(0.85, 0.28 + trade_skill * 0.05 + charisma * 0.03
                               - b["stub"] * 0.2))
        if random.random() < chance:
            final = b["floor"]
            try:
                from skills import add_skill_xp
                add_skill_xp(player, "trade", 3)
            except Exception:
                pass
            return _finish(state, b, final,
                           f"{b['vendor']['name']} duraksadı... \"Peki, {round(final,1)} akçe. Ama kimseye söyleme.\""), None
        # Blöf tutmadı: satıcı alındı — fiyat kötüleşir, ilişki düşer
        b["soured"] = True
        if b["action"] == "al":
            b["offer"] = round(b["offer"] * 1.08, 1)
        else:
            b["offer"] = round(b["offer"] * 0.92, 1)
        if b["vendor"]["id"]:
            rels = state.setdefault("relationships", {})
            rels[b["vendor"]["id"]] = max(-100, rels.get(b["vendor"]["id"], 0) - 2)
            try:
                from npc_profile import push_personal_memory
                npc = next((n for n in state["world"]["npcs"]
                            if n["id"] == b["vendor"]["id"]), None)
                if npc:
                    push_personal_memory(npc, f"{player.get('name','Biri')}: pazarlıkta blöf yapmaya kalktı",
                                         tur="bluf", hafta=state.get("turn", 0))
            except Exception:
                pass
        b["round"] += 1
        note = f"{b['vendor']['name']} güldü: \"Ucuza bulduysan oradan al!\" Fiyat yükseldi."
        if b["round"] > b["max_rounds"]:
            return _finish(state, b, b["offer"], note), None
        view = _view(state, b)
        view["note"] = note
        view["bluff_failed"] = True
        return view, None

    return None, "Geçersiz hamle."


def consume_voucher(state, loc_id, good, action, base_total):
    """Trade anında kuponu uygula ve tüket. Döndürür (yeni_toplam, kupon_var)."""
    v = state.get("bargain_voucher")
    if not v:
        return base_total, False
    if (v["loc_id"] != loc_id or v["good"] != good or v["action"] != action
            or v["turn"] != state.get("turn", 0)):
        return base_total, False
    state.pop("bargain_voucher", None)
    return round(base_total * v["unit_mult"], 1), True
