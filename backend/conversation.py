"""NPC Sohbet Eli — GDD v7 R4.

dialogue.py (1.356 satır) ÜZERİNE kurulur, onu değiştirmez:
- Konu kartları bağlamdan üretilir (lokasyon, son dünya olayları,
  NPC'nin amacı, oyuncunun namı) ve dialogue.generate_response'un
  topic'lerine eşlenir — metin lezzeti mevcut motordan gelir.
- 3 kart / el: GÜVENLİ (+1..2) · RİSKLİ (±4) · KİŞİSEL (+6/−8).
- Doğru kart NPC hakkında BİLGİ açar: amaç ipucu, ticaret tabanı,
  hediye zevki, sır parçası → state["npc_intel"].
- 4.2 Hediye reworku: meslek+kişilikten türetilen tercih çarpanları.

El, (npc, hafta) ile deterministiktir: sayfa yenilemek kartları değiştirmez.
"""
import hashlib
import random

from dialogue import generate_response, relationship_delta, relation_band


# ── Kart havuzları ────────────────────────────────────────────────────────
def _hand_rng(npc_id, turn):
    h = hashlib.md5(f"el|{npc_id}|{turn}".encode()).hexdigest()
    return random.Random(int(h[:12], 16))


def _safe_cards(npc, ctx_rng):
    pool = [
        {"id": "g_selam", "label": "Havadan sudan", "topic": "selam",
         "hint": "güvenli +1"},
        {"id": "g_is", "label": f"İşler nasıl, {npc.get('profession', 'usta')}?",
         "topic": "iş", "hint": "güvenli +1"},
        {"id": "g_aile", "label": "Aileden konuş", "topic": "aile",
         "hint": "güvenli +1"},
    ]
    return ctx_rng.choice(pool)


def _risky_card(state, npc, ctx_rng):
    """Son dünya olaylarından veya oyuncunun namından riskli kart üret."""
    recent = [e for e in state.get("history", [])[-15:]
              if e.get("type") in ("piyasa_olayı", "savaş_ilanı", "haydut_baskını",
                                   "şenlik", "isyan", "kıtlık_etkisi", "çağ_olayı")]
    if recent and ctx_rng.random() < 0.7:
        ev = ctx_rng.choice(recent)
        label_map = {
            "piyasa_olayı": "Çarşıdaki son olay", "savaş_ilanı": "Savaş dedikoduları",
            "haydut_baskını": "Haydut baskını", "şenlik": "Şenlik muhabbeti",
            "isyan": "İsyan fısıltıları", "kıtlık_etkisi": "Kıtlık endişesi",
            "çağ_olayı": "Büyük haberler",
        }
        return {"id": f"r_olay_{ev.get('type')}", "label": label_map.get(ev.get("type"), "Son olaylar"),
                "topic": "hedef", "hint": "riskli ±4", "context_event": ev.get("text", "")[:90]}
    # Oyuncunun namı üzerine konuşma
    player = state["player"]
    if player.get("crime", 0) > 30:
        return {"id": "r_nam_suc", "label": "Hakkındaki söylentileri sor",
                "topic": "üzgün", "hint": "riskli ±4"}
    return {"id": "r_nam", "label": "Senin hakkında ne diyorlar?",
            "topic": "hedef", "hint": "riskli ±4"}


def _personal_card(state, npc, ctx_rng):
    """NPC'nin hayatına dokunan kart: amaç, eş/çocuk, sır."""
    options = []
    if npc.get("goal"):
        options.append({"id": "k_amac", "label": "Derdini sor — bir şey mi peşinde?",
                        "topic": "hedef", "hint": "kişisel +6/−8", "intel": "amac"})
    if npc.get("spouse_id") or npc.get("children_ids"):
        options.append({"id": "k_aile", "label": "Ailesini içten sor",
                        "topic": "aile", "hint": "kişisel +6/−8", "intel": "hediye"})
    if npc.get("bounty", 0) > 0 or npc.get("profession") == "haydut":
        options.append({"id": "k_sir", "label": "Geçmişini kurcala",
                        "topic": "üzgün", "hint": "kişisel +6/−8", "intel": "sir"})
    if npc.get("profession") in ("tüccar", "demirci", "fırıncı", "dokumacı", "şarapçı"):
        options.append({"id": "k_ticaret", "label": "Fiyatların sırrını yokla",
                        "topic": "iş", "hint": "kişisel +6/−8", "intel": "ticaret"})
    if not options:
        options.append({"id": "k_amac", "label": "İçini dök — neyin peşindesin?",
                        "topic": "hedef", "hint": "kişisel +6/−8", "intel": "amac"})
    return ctx_rng.choice(options)


def deal_cards(state, npc):
    """3 kartlık eli dağıt (haftaya göre deterministik). S2: el, NPC'nin
    zihninden geçer — etkin ilişki, davranış kademesi ve hatırladıkları."""
    from npc_mind import effective_rel, behavior_tier, top_memories, goal_help_cost
    rng = _hand_rng(npc["id"], state.get("turn", 0))
    cards = [_safe_cards(npc, rng), _risky_card(state, npc, rng),
             _personal_card(state, npc, rng)]
    rel = state.get("relationships", {}).get(npc["id"], 0)
    eff = effective_rel(state, npc)
    tier = behavior_tier(eff)
    intel = state.get("npc_intel", {}).get(npc["id"], {})
    warning = None
    if tier["key"] == "aktif_dusman":
        warning = f"{npc['name']} selamını bile almıyor — burada her söz ters teper."
    elif tier["key"] == "soguk":
        warning = f"{npc['name']} sana karşı soğuk; bilgi paylaşmaz."
    elif eff < 20:
        warning = "Onu pek tanımıyorsun — kişisel sorular ters tepebilir."
    out = {
        "cards": cards,
        "relationship": rel,
        "effective_rel": eff,
        "tier": {"key": tier["key"], "label": tier["label"], "desc": tier["desc"]},
        "band": relation_band(eff),
        "remembers": top_memories(npc, n=2),
        "intel": intel,
        "warning": warning,
    }
    # Amacı biliniyorsa amaç eylemleri sunulur (Yardım Et / Sömür)
    if intel.get("amac"):
        from npc_profile import GOAL_BY_KEY
        cost, _ctype = goal_help_cost(state, npc)
        out["amac_eylem"] = {
            "amac": intel["amac"],
            "amac_label": GOAL_BY_KEY.get(intel["amac"], {}).get("label", intel["amac"]),
            "yardim_cost": cost,
            "yardim_edildi": bool(npc.get("amac_yardim_edildi")),
            "koz": bool(intel.get("koz")),
        }
    return out


# ── Kart oynama ──────────────────────────────────────────────────────────
def play_card(state, npc, card_id):
    """Seçilen kartı çöz: başarı şansı, ilişki deltası, bilgi açılımı,
    NPC anısı. dialogue.generate_response metni üretir."""
    hand = deal_cards(state, npc)
    card = next((c for c in hand["cards"] if c["id"] == card_id), None)
    if not card:
        return None, "Bu kart bu elde yok."

    player = state["player"]
    rel = state.get("relationships", {}).get(npc["id"], 0)
    social = player.get("skills", {}).get("social", 0)
    charisma = player.get("stats", {}).get("charisma", 1)
    turn = state.get("turn", 0)

    # S2: zihin etkileri — etkin ilişki, düşmanlık cezası, mert nam bonusu
    from npc_mind import effective_rel, behavior_tier, nam_effects
    eff = effective_rel(state, npc)
    tier = behavior_tier(eff)
    nam_bonus = 0.0
    try:
        nam_bonus = nam_effects(state).get("bilgi_bonus", 0.0)
    except Exception:
        pass

    kind = card["id"][0]  # g/r/k
    if kind == "g":
        success, delta_win, delta_lose = True, None, None
    elif kind == "r":
        chance = min(0.9, 0.45 + social * 0.05 + charisma * 0.03)
        if tier["key"] == "aktif_dusman":
            chance -= 0.25
        success = random.random() < max(0.08, chance)
        delta_win, delta_lose = 4, -4
    else:  # kişisel
        chance = min(0.92, 0.30 + social * 0.05 + charisma * 0.04
                     + max(0, eff) * 0.006 + nam_bonus)
        if eff < 20:
            chance -= 0.18   # tanımadığına kişisel soru — ters tepme riski
        if tier["key"] == "aktif_dusman":
            chance -= 0.25
        elif not tier["bilgi"]:
            chance -= 0.12   # soğuk: bilgi paylaşmaz
        success = random.random() < max(0.05, chance)
        delta_win, delta_lose = 6, -8

    # Delta: güvenli kartlar mevcut relationship_delta'yı kullanır
    counts = player.setdefault("interaction_counts", {})
    ckey = f"{npc['id']}|sohbet"
    counts[ckey] = counts.get(ckey, 0) + 1
    if kind == "g":
        delta = relationship_delta(npc, card["topic"], player, counts[ckey])
    else:
        delta = delta_win if success else delta_lose

    rels = state.setdefault("relationships", {})
    rels[npc["id"]] = max(-100, min(100, rel + delta))

    # Metin: mevcut 4 katmanlı motor
    recent = state.get("history", [])[-8:]
    text, proactive = generate_response(
        npc, rels[npc["id"]], card["topic"], player, recent,
        state.get("day", turn), turn, state)

    # Bilgi açılımı (sadece kişisel başarıda)
    intel_gain = None
    if kind == "k" and success and card.get("intel"):
        store = state.setdefault("npc_intel", {}).setdefault(npc["id"], {})
        key = card["intel"]
        if key == "amac" and npc.get("goal"):
            store["amac"] = npc["goal"]
            intel_gain = {"type": "amac",
                          "text": f"Amacını öğrendin: {npc['goal']}."}
        elif key == "ticaret":
            store["ticaret"] = True
            intel_gain = {"type": "ticaret",
                          "text": "Pazarlıkta taban fiyatını artık sezebiliyorsun."}
        elif key == "hediye":
            prefs = gift_preferences(npc)
            store["hediye"] = prefs["loves"]
            sevdigi = ", ".join(prefs["loves"][:2]) if prefs["loves"] else "gönülden verilen her şey"
            intel_gain = {"type": "hediye",
                          "text": f"Zevklerini çözdün — {sevdigi} onu mutlu eder."}
        elif key == "sir":
            store["sir"] = True
            intel_gain = {"type": "sir",
                          "text": "Geçmişinden karanlık bir parça öğrendin. Bu bilgi bir koz."}

    # NPC anısı + sonuç cümlesi — S2: yapısal anı türüyle
    try:
        from npc_profile import push_personal_memory
        if kind != "g":
            if success:
                iz, tur_key = "içten bir sohbet ettiniz", \
                    ("icten_sohbet" if kind == "k" else "guzel_sohbet")
            elif kind == "k":
                iz, tur_key = "haddini aşan bir soru sordun", "haddini_asma"
            else:
                iz, tur_key = "tatsız bir konuya girdin", "tatsiz_konu"
            push_personal_memory(npc, f"{player.get('name','Biri')}: {iz}",
                                 tur=tur_key, hafta=turn)
    except Exception:
        pass

    closing = None
    if kind == "k" and not success:
        closing = f"{npc['name']} yüzünü ekşitti — fazla ileri gittin."
    elif kind == "r" and not success:
        closing = "Konu tatsız bir yere vardı; sohbet soğudu."
    elif kind == "k" and success and not intel_gain:
        closing = f"{npc['name']} sana biraz daha açıldı."

    eff_after = effective_rel(state, npc)
    return {
        "success": success,
        "delta": delta,
        "relationship": rels[npc["id"]],
        "effective_rel": eff_after,
        "tier": behavior_tier(eff_after)["label"],
        "band": relation_band(rels[npc["id"]]),
        "text": text,
        "proactive": proactive or None,
        "closing": closing,
        "intel": intel_gain,
    }, None


# ── 4.2 Hediye Tercihleri ────────────────────────────────────────────────
# Meslek + kişilikten türetilir; do_gift çarpan olarak kullanır.
_PROF_GIFTS = {
    "şifacı":   {"loves": ["şifalı_ot", "şifa_iksiri"], "hates": ["şarap", "silah"]},
    "eczacı":   {"loves": ["şifalı_ot", "baharat"], "hates": ["şarap"]},
    "rahip":    {"loves": ["mücevher", "baharat"], "hates": ["şarap", "silah"]},
    "asker":    {"loves": ["silah", "zırh", "çizme"], "hates": ["ipek"]},
    "şövalye":  {"loves": ["silah", "zırh"], "hates": ["ipek"]},
    "muhafız":  {"loves": ["silah", "çizme"], "hates": []},
    "haydut":   {"loves": ["silah", "şarap"], "hates": []},
    "tüccar":   {"loves": ["ipek", "baharat", "mücevher"], "hates": []},
    "demirci":  {"loves": ["demir", "demir_cevheri"], "hates": ["ipek"]},
    "fırıncı":  {"loves": ["un", "buğday"], "hates": []},
    "çiftçi":   {"loves": ["alet", "et"], "hates": ["mücevher"]},
    "avcı":     {"loves": ["av_yayı", "çizme"], "hates": []},
    "şarapçı":  {"loves": ["üzüm", "şarap"], "hates": []},
    "dokumacı": {"loves": ["yün", "kumaş"], "hates": []},
    "müzisyen": {"loves": ["şarap", "ipek"], "hates": []},
}


def gift_preferences(npc):
    prefs = dict(_PROF_GIFTS.get(npc.get("profession", ""), {"loves": [], "hates": []}))
    loves = list(prefs.get("loves", []))
    hates = list(prefs.get("hates", []))
    personality = npc.get("personality", []) or []
    if "dindar" in personality and "şarap" not in hates:
        hates.append("şarap")
    if "gösterişçi" in personality and "mücevher" not in loves:
        loves.append("mücevher")
    if "romantik" in personality and "ipek" not in loves:
        loves.append("ipek")
    return {"loves": loves, "hates": hates}


def gift_multiplier(npc, item_key):
    """do_gift için tercih çarpanı + opsiyonel renk cümlesi.
    Döndürür (mult, line|None)."""
    prefs = gift_preferences(npc)
    if item_key in prefs["hates"]:
        return 0.0, f"{npc['name']} hediyeyi tutarken yüzü değişti — bu ona göre değil."
    if item_key in prefs["loves"]:
        return 2.5, f"{npc['name']}in gözleri parladı — tam zevkine göre!"
    return 1.0, None
