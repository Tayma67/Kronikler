"""
npc_interactions.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Her NPC etkileşimi için gerçekçi sebep-sonuç zinciri.

Prensipler:
  1. Her eylem zaman geçirir (1 hafta) — spam önlenir
  2. Her eylem dünyayı değiştirir (sadece sayı değil)
  3. NPC'ler hafızasında tutar ve tepki verir
  4. Çevre tepkisi: yakındaki NPC'ler, aile, otorite
  5. Cascading: bir eylem başka olayları tetikleyebilir
  6. Cooldown: aynı eylemin etkisi tekrarda azalır
"""
import random
from simulation import _push_event, advance_time, soldier_check
from npc_profile import push_personal_memory
from social_reputation import apply_good_deed, apply_help_npc, apply_heroic_act, change_fame


# ─────────────────────────────────────────────────────
# YARDIMCI FONKSİYONLAR
# ─────────────────────────────────────────────────────

def get_npc(state, npc_id):
    return next((n for n in state["world"]["npcs"]
                 if n["id"] == npc_id and n.get("alive", True)), None)


def get_rel(state, npc_id):
    return state.setdefault("relationships", {}).get(npc_id, 0)


def set_rel(state, npc_id, value):
    state["relationships"][npc_id] = max(-100, min(100, value))


def change_rel(state, npc_id, delta):
    old = get_rel(state, npc_id)
    set_rel(state, npc_id, old + delta)
    return old + delta


def get_cooldown(state, npc_id, action):
    """Kaç hafta önce bu eylem yapıldı? (0 = hiç yapılmadı)"""
    key = f"cooldown_{action}_{npc_id}"
    last = state["player"].get("interaction_counts", {}).get(key, 0)
    if last == 0:
        return 999  # Hiç yapılmadı
    return state["turn"] - last


def set_cooldown(state, npc_id, action):
    counts = state["player"].setdefault("interaction_counts", {})
    counts[f"cooldown_{action}_{npc_id}"] = state["turn"]
    # Stale entry trim: 200+ hafta önceki kayıtları sil (state şişmesini önler)
    current_turn = state["turn"]
    stale_keys = [k for k, v in counts.items() if current_turn - v > 200]
    for k in stale_keys:
        del counts[k]


def cooldown_penalty(weeks_since, min_weeks=2):
    """Son etkileşimden bu yana ne kadar geçti? Yakınsa etki azalır."""
    if weeks_since < min_weeks:
        return max(0.2, weeks_since / min_weeks)
    return 1.0


def nearby_npcs(state, exclude_id=None):
    """Oyuncuyla aynı lokasyondaki canlı NPC'ler."""
    loc_id = state["player"]["location_id"]
    return [
        n for n in state["world"]["npcs"]
        if n.get("alive") and n["location_id"] == loc_id and n["id"] != exclude_id
    ]


def npc_family(state, npc):
    """NPC'nin aile üyeleri (anne, baba, eş, çocuklar)."""
    ids = (
        list(npc.get("parent_ids", []))
        + ([npc["spouse_id"]] if npc.get("spouse_id") and npc["spouse_id"] != "PLAYER" else [])
        + list(npc.get("children_ids", []))
    )
    return [n for n in state["world"]["npcs"] if n["id"] in ids and n.get("alive")]


def spread_word(state, npc, event_text, rel_delta, max_spread=3, tur=None):
    """
    Bir eylem haberini çevredeki NPC'lere yayar.
    Yakındaki NPC'lerin ilişkisini ve NPC'nin itibarını etkiler.
    tur verilirse tanıklar yapısal anı tutar (S2) → dedikoduya sızabilir.
    """
    affected = []
    nearby = nearby_npcs(state, exclude_id=npc["id"])[:max_spread]
    for witness in nearby:
        change_rel(state, witness["id"], rel_delta)
        push_personal_memory(witness, event_text, tur=tur, hafta=state.get("turn", 0))
        affected.append(witness["name"])
    return affected


def build_consequences(player_name, npc_name, ctype, **kwargs):
    """
    Frontend'e gösterilecek sonuç listesi oluşturur.
    ctype: "positive" | "negative" | "neutral" | "danger"
    """
    return {
        "type": ctype,
        "items": kwargs.get("items", []),
        "player_name": player_name,
        "npc_name": npc_name,
    }


# ─────────────────────────────────────────────────────
# 1. İLTİFAT ET
# ─────────────────────────────────────────────────────

def do_compliment(state, npc_id):
    npc = get_npc(state, npc_id)
    player = state["player"]
    personality = npc.get("personality", [])
    turn = state["turn"]

    weeks_since = get_cooldown(state, npc_id, "compliment")
    penalty = cooldown_penalty(weeks_since, min_weeks=3)

    cha = player.get("stats", {}).get("charisma", 1)
    social = player.get("skills", {}).get("social", 0)
    base_gain = random.randint(3, 9)
    gain = round(base_gain * (1 + cha * 0.05 + social * 0.03) * penalty)

    # Kişilik tepkileri
    if "kibirli" in personality:
        response = random.choice([
            f"{npc['name']}: 'Biliyorum, herkes bunu söylüyor.'",
            f"{npc['name']} sadece başını salladı.",
        ])
        gain = max(1, gain - 3)
        npc_mood_after = "nötr"
    elif "kuşkucu" in personality or "kurnaz" in personality:
        response = f"{npc['name']}: 'Bu güzel sözlerin ardında ne var acaba?'"
        gain = max(1, gain - 2)
        npc_mood_after = "şüpheli"
    elif "neşeli" in personality or "cömert" in personality:
        response = random.choice([
            f"{npc['name']} güldü: 'Sen de iyi birisisin!'",
            f"{npc['name']} memnuniyetle karşılık verdi.",
        ])
        gain += 2
        npc_mood_after = "mutlu"
        # Karşılıklı iltifat — oyuncunun itibarı hafifçe artar
        player["reputation"] = player.get("reputation", 0) + 1
    elif "öfkeli" in personality:
        response = f"{npc['name']}: 'Yağcılık mı yapıyorsun?'"
        gain = max(0, gain - 4)
        npc_mood_after = "gergin"
    else:
        response = random.choice([
            f"{npc['name']}: 'Teşekkür ederim, naziksiniz.'",
            f"{npc['name']} hafifçe güldümsedi.",
        ])
        npc_mood_after = "memnun"

    # Tekrar spam cezası — aynı kişiye çok sık iltifat inandırıcı değil
    if penalty < 0.5:
        # Spam hard block: zaman geçmiyor, cooldown sıfırlanmıyor
        return {
            "response": f"{npc['name']}: 'Yine mi? Bu sözleri duya duya gına geldi.'",
            "gain": 0,
            "relationship": get_rel(state, npc_id),
            "consequences": ["⚠ Çok sık iltifat — zaman harcamadan reddedildi"],
            "npc_mood": npc.get("mood", "nötr"),
        }

    change_rel(state, npc_id, gain)
    npc["mood"] = npc_mood_after
    set_cooldown(state, npc_id, "compliment")
    push_personal_memory(npc, f"{player['name']} bana iltifat etti",
                         tur="iltifat", hafta=turn)

    # Yakında biri varsa sosyal itibar hafifçe artar
    nearby = nearby_npcs(state, exclude_id=npc_id)
    witness_boost = 0
    if nearby and gain > 3:
        witness_boost = 1
        player["reputation"] = player.get("reputation", 0) + witness_boost

    _push_event(state, turn, "iltifat",
                f"{player['name']}, {npc['name']}'e iltifat etti.")
    advance_time(state, weeks=1)

    consequences = [f"İlişki +{gain}"]
    if witness_boost:
        consequences.append("İtibar +1 (tanıklar gördü)")

    return {
        "response": response,
        "gain": gain,
        "relationship": get_rel(state, npc_id),
        "consequences": consequences,
        "npc_mood": npc_mood_after,
    }


# ─────────────────────────────────────────────────────
# 2. HEDİYE VER
# ─────────────────────────────────────────────────────

def do_gift(state, npc_id, item_key, qty=1):
    from items import ITEMS
    npc = get_npc(state, npc_id)
    player = state["player"]
    personality = npc.get("personality", [])
    turn = state["turn"]

    item_data = ITEMS.get(item_key)
    if not item_data:
        return {"error": "Geçersiz eşya"}

    inv = player.get("inventory", {})
    if inv.get(item_key, 0) < qty:
        return {"error": "Yeterli eşya yok"}

    inv[item_key] -= qty
    if inv[item_key] <= 0:
        del inv[item_key]

    base_value = item_data.get("base_value", 5) * qty
    npc_wealth = npc.get("wealth", 100)

    # Zengin birine ucuz hediye vermek etki etmez veya hakaret sayılır
    wealth_ratio = base_value / max(1, npc_wealth / 10)
    if wealth_ratio < 0.05 and "kibirli" in personality:
        gain = -2
        response = f"{npc['name']} hediyeye baktı, sonra sana baktı. 'Bu mu?' dedi."
        npc["mood"] = "küçümseyici"
        consequences = ["İlişki -2 (hediye çok değersiz bulundu)", "⚠ Zengin birine uygun hediye seç"]
    elif "cimri" in personality:
        gain = round(base_value * 0.08)
        response = f"{npc['name']} hediyeyi aldı, neredeyse teşekkür dahi etmedi."
        npc["mood"] = "nötr"
        consequences = [f"İlişki +{gain}"]
    elif "cömert" in personality:
        gain = round(base_value * 0.25)
        response = f"{npc['name']} güldü: 'Ne güzel! Ben de sana bir şeyler getireceğim.'"
        npc["mood"] = "mutlu"
        # Karşılıklılık: NPC ileride küçük bir iyilik yapar (flag)
        npc.setdefault("pending_favor", True)
        consequences = [f"İlişki +{gain}", "💡 Bu kişi ileride sana iyilik yapabilir"]
    elif "merhametli" in personality:
        gain = round(base_value * 0.20)
        response = f"{npc['name']} gözleri ışıdı: 'Allah razı olsun, çok naziksiniz.'"
        npc["mood"] = "minnettar"
        consequences = [f"İlişki +{gain}"]
    else:
        gain = round(base_value * 0.15)
        response = f"{npc['name']}, {item_data['name']} için samimice teşekkür etti."
        npc["mood"] = "memnun"
        consequences = [f"İlişki +{gain}"]

    # R4.2: meslek+kişilik hediye tercihi — sevilen hediye ×2.5,
    # sevilmeyen sıfırlar ve küçük kırgınlık bırakır
    try:
        from conversation import gift_multiplier
        _mult, _pref_line = gift_multiplier(npc, item_key)
        if _mult == 0.0:
            gain = -3
            response = _pref_line or response
            npc["mood"] = "kırgın"
            consequences = ["İlişki -3 (yanlış hediye seçimi)",
                            "💡 Sohbetle zevklerini öğrenebilirsin"]
        elif _mult > 1.0 and gain > 0:
            gain = round(gain * _mult)
            if _pref_line:
                response = _pref_line
            consequences = [f"İlişki +{gain} (tam zevkine göre!)"]
    except Exception:
        pass

    gain = max(-5, min(30, gain))
    change_rel(state, npc_id, gain)

    # Eğer bu kişi aile üyesiyse (anne/baba) aile görevi ilerler
    parent_ids = [
        p.get("id") for p in npc_family(state, npc)
        if p.get("id") == npc_id
    ]
    if parent_ids:
        player["reputation"] = player.get("reputation", 0) + 1
        consequences.append("İtibar +1 (aileye iyilik)")

    # Yeni: cömertlik görülürse şeref & ün hafifçe artar
    if gain > 5:
        rep_msgs = apply_help_npc(player)
        for m in rep_msgs:
            consequences.append(m)

    push_personal_memory(npc, f"{player['name']} bana {item_data['name']} hediye etti",
                         tur="comert_hediye" if gain >= 10 else "hediye", hafta=turn)
    _push_event(state, turn, "hediye",
                f"{player['name']}, {npc['name']}'e {item_data['name']} hediye etti.")
    advance_time(state, weeks=1)
    set_cooldown(state, npc_id, "gift")

    return {
        "response": response,
        "gain": gain,
        "relationship": get_rel(state, npc_id),
        "consequences": consequences,
        "npc_mood": npc.get("mood", "nötr"),
    }


# ─────────────────────────────────────────────────────
# 3. PARA VER
# ─────────────────────────────────────────────────────

def do_give_money(state, npc_id, amount):
    npc = get_npc(state, npc_id)
    player = state["player"]
    personality = npc.get("personality", [])
    profession = npc.get("profession", "köylü")
    turn = state["turn"]

    if player.get("money", 0) < amount:
        return {"error": "Yeterli paran yok"}

    # Cooldown: aynı NPC'ye haftada 1 kez para verilebilir
    weeks_since = get_cooldown(state, npc_id, "give_money")
    if weeks_since < 1:
        return {
            "error": "Bu haftanın bağışını zaten yaptın",
            "cooldown_weeks_left": 1,
        }

    player["money"] = round(player["money"] - amount, 1)
    npc["wealth"] = npc.get("wealth", 0) + amount

    npc_wealth = npc.get("wealth", 100) - amount  # önceki servet
    wealth_ratio = amount / max(1, npc_wealth)
    gain = min(30, max(1, round(wealth_ratio * 40 + amount * 0.05)))

    consequences = []

    # Dilenciye / fakire para verme → itibar bonusu
    if profession in ("dilenci", "köylü", "çiftçi") and amount >= 5:
        player["reputation"] = player.get("reputation", 0) + 2
        consequences.append("İtibar +2 (yoksullara yardım)")
        # Yeni: şeref de artar — cömertlik onurlu bir davranış
        rep_msgs = apply_good_deed(player)
        for m in rep_msgs:
            consequences.append(m)
        response = f"{npc['name']} ellerini ovuşturarak teşekkür etti. 'Allah bol etsin!'"
        npc["mood"] = "minnettar"

    # Devlet görevlisine para → rüşvet, suç riski
    elif profession in ("asker", "lord", "general", "kral"):
        crime_risk = random.random()
        if crime_risk < 0.35:
            player["crime"] = player.get("crime", 0) + 15
            consequences.append("⚠ Rüşvet suç sayıldı! Suç +15")
            response = f"{npc['name']} parayı aldı ama yüzü gerildi: 'Bu bana rüşvet mi?'"
            gain = max(1, gain // 2)
        else:
            consequences.append(f"İlişki +{gain} (gizli anlaşma)")
            response = f"{npc['name']} parayı usulca cebine indirdi ve göz kırptı."
            npc["mood"] = "memnun"
    elif "kibirli" in personality and wealth_ratio < 0.1:
        gain = max(0, gain - 3)
        response = f"{npc['name']}: 'Bu kadar mı?'"
        npc["mood"] = "küçümseyici"
        consequences.append(f"İlişki +{gain} (etki az)")
    else:
        response = f"{npc['name']} {amount} altın için minnettar göründü."
        npc["mood"] = "memnun"
        consequences.append(f"İlişki +{gain}")

    change_rel(state, npc_id, gain)
    set_cooldown(state, npc_id, "give_money")
    push_personal_memory(npc, f"{player['name']} bana {amount} altın verdi",
                         tur="sadaka", hafta=turn)
    _push_event(state, turn, "para_verme",
                f"{player['name']}, {npc['name']}'e {amount} altın verdi.")
    advance_time(state, weeks=1)

    return {
        "response": response,
        "gain": gain,
        "relationship": get_rel(state, npc_id),
        "consequences": consequences,
        "npc_mood": npc.get("mood"),
    }


# ─────────────────────────────────────────────────────
# 4. HAKARET ET
# ─────────────────────────────────────────────────────

def do_insult(state, npc_id):
    npc = get_npc(state, npc_id)
    player = state["player"]
    personality = npc.get("personality", [])
    profession = npc.get("profession", "köylü")
    turn = state["turn"]

    # Cooldown kontrolü: aynı NPC'ye 3 haftada bir hakaret yapılabilir
    weeks_since = get_cooldown(state, npc_id, "insult")
    if weeks_since < 3:
        weeks_left = 3 - weeks_since
        return {
            "response": f"{npc['name']} seni görmezden geliyor — artık umursamıyor.",
            "loss": 0,
            "cooldown_weeks_left": weeks_left,
            "relationship": get_rel(state, npc_id),
            "consequences": [f"⏳ {weeks_left} hafta daha bekle"],
            "cascade": [],
            "npc_mood": npc.get("mood", "nötr"),
        }

    loss = random.randint(6, 16)
    consequences = []
    cascade = []

    # Kişiliğe göre anında tepki
    if "öfkeli" in personality:
        loss += 5
        # Öfkeli NPC misilleme yapar — yakındaki NPC'leri olumsuz etkiler
        affected = spread_word(state, npc,
                               f"{player['name']} {npc['name']}'e hakaret etti",
                               rel_delta=-3, max_spread=2)
        if affected:
            cascade.append(f"{', '.join(affected)} bunu duydu, senden soğudu")
        response = f"{npc['name']} öfkeyle bağırdı: 'Bir daha yoluma çıkma!'"
        npc["mood"] = "düşman"
        # Misilleme flag'i — ileride NPC saldırabilir
        npc["revenge_pending"] = True
        consequences.append("⚠ Bu kişi misilleme yapabilir")

    elif "sabırlı" in personality:
        loss = max(3, loss - 5)
        response = f"{npc['name']} derin bir nefes aldı: 'Bugünlük geçiyorum...'"
        npc["mood"] = "gergin"
        consequences.append(f"İlişki -{loss} (sabırlı tepki)")

    elif "vefasız" in personality:
        # Vefasız biri hakareti bekler, ama gidip başkalarına anlatır
        affected = spread_word(state, npc,
                               f"{player['name']} {npc['name']}'e hakaret etti",
                               rel_delta=-4, max_spread=3)
        if affected:
            cascade.append(f"{', '.join(affected)} söylentileri duydu")
        response = f"{npc['name']} sessizce güldü ve uzaklaştı. Ama anlattığından emin olabilirsin."
        npc["mood"] = "soğuk"

    elif "kibirli" in personality:
        # Kibirli biri hakareti küçümser ama senin itibarını düşürür
        player["reputation"] = player.get("reputation", 0) - 3
        response = f"{npc['name']}: 'Senin gibisinden başka ne beklenirdi ki.'"
        npc["mood"] = "küçümseyici"
        consequences.append("İtibar -3 (kibirli biri seni küçük düşürdü)")

    elif "sadık" in personality:
        # Sadık NPC aile/arkadaşlarını bilgilendirir
        family = npc_family(state, npc)
        for member in family[:2]:
            change_rel(state, member["id"], -5)
            push_personal_memory(member, f"{player['name']}, {npc['name']}'e hakaret etti")
        if family:
            cascade.append(f"{npc['name']}'ın ailesi bunu öğrendi")
        response = f"{npc['name']} sessizce döndü ve yürüdü. Ama ailesi bilecek."
        npc["mood"] = "kırılmış"

    else:
        response = random.choice([
            f"{npc['name']} sustu ve uzaklaştı.",
            f"{npc['name']}: 'Bu sözleri hak etmiyorum.'",
        ])
        npc["mood"] = "üzgün"
        consequences.append(f"İlişki -{loss}")

    change_rel(state, npc_id, -loss)
    witnesses = nearby_npcs(state, exclude_id=npc_id)
    push_personal_memory(npc, f"{player['name']} bana hakaret etti — {turn}. haftada",
                         tur="hakaret", hafta=turn,
                         taniklar=[w["id"] for w in witnesses[:4]])

    # Yüksek statüslü biri hakaret ederse itibar kaybı
    if profession in ("kral", "lord", "general", "veliaht"):
        player["reputation"] = player.get("reputation", 0) - 5
        consequences.append("İtibar -5 (yüksek statüslü kişiyi hedef aldın)")
        player["crime"] = player.get("crime", 0) + 10

    # Tanıklar varsa itibar kaybı
    if witnesses:
        player["reputation"] = player.get("reputation", 0) - 2
        wnames = [w["name"] for w in witnesses[:2]]
        consequences.append(f"İtibar -2 ({', '.join(wnames)} tanık oldu)")

    _push_event(state, turn, "hakaret",
                f"{player['name']}, {npc['name']}'e hakaret etti.")
    advance_time(state, weeks=1)
    set_cooldown(state, npc_id, "insult")

    # Yeni: hakaret şerefi düşürür; korku biraz artar (baskı davranışı)
    from social_reputation import change_honor, change_fear
    honor_msg = change_honor(player, -3, "hakaret")
    if honor_msg:
        consequences.append(honor_msg)
    if npc.get("mood") in ("üzgün", "gergin", "kırılmış"):
        fear_msg = change_fear(player, 1, "tehditkâr davranış")
        if fear_msg:
            consequences.append(fear_msg)

    consequences.append(f"İlişki -{loss}")
    return {
        "response": response,
        "loss": loss,
        "relationship": get_rel(state, npc_id),
        "consequences": consequences,
        "cascade": cascade,
        "npc_mood": npc.get("mood"),
    }


# ─────────────────────────────────────────────────────
# 5. ÇIKMA TEKLİFİ ET
# ─────────────────────────────────────────────────────

def do_flirt(state, npc_id):
    npc = get_npc(state, npc_id)
    player = state["player"]
    personality = npc.get("personality", [])
    rel = get_rel(state, npc_id)
    turn = state["turn"]

    # Cooldown kontrolü: aynı NPC'ye 4 haftada bir flört yapılabilir
    weeks_since = get_cooldown(state, npc_id, "flirt")
    if weeks_since < 4:
        weeks_left = 4 - weeks_since
        return {
            "response": f"{npc['name']} seni ciddiye almıyor — çok sık yanaşıyorsun.",
            "accepted": False,
            "cooldown_weeks_left": weeks_left,
            "relationship": get_rel(state, npc_id),
            "consequences": [f"⏳ {weeks_left} hafta daha bekle"],
            "npc_mood": npc.get("mood", "nötr"),
        }

    cha = player.get("stats", {}).get("charisma", 1)
    rep = player.get("reputation", 0)
    base_chance = 0.30 + rel * 0.008 + cha * 0.04 + rep * 0.002

    if "hırslı" in personality:
        # İtibar veya para önemli
        wealth_bonus = min(0.15, player.get("money", 0) / 1000)
        rep_bonus = min(0.10, rep / 100)
        base_chance += wealth_bonus + rep_bonus
    if "sadık" in personality:
        base_chance += 0.05
    if "neşeli" in personality:
        base_chance += 0.04
    if "kurnaz" in personality:
        base_chance -= 0.05  # Kurnaz biri kolay kanmaz
    if "suskun" in personality:
        base_chance -= 0.03

    # S2 nam etkisi: çapkın namı flörtü kolaylaştırır
    try:
        from npc_mind import nam_effects
        base_chance += nam_effects(state).get("flort_bonus", 0)
    except Exception:
        pass

    accepted = random.random() < min(0.88, max(0.05, base_chance))
    consequences = []

    if accepted:
        player.setdefault("relationship_status", {})[npc_id] = "dating"
        gain = random.randint(8, 15)
        change_rel(state, npc_id, gain)
        npc["mood"] = "mutlu"

        # Tanıklar — dedikodusu yayılır
        witnesses = nearby_npcs(state, exclude_id=npc_id)
        if witnesses:
            witness = witnesses[0]
            push_personal_memory(witness, f"{player['name']} ile {npc['name']} çıkmaya başladı",
                                 tur="flort_tanigi", hafta=turn)
            consequences.append(f"💬 {witness['name']} bunu gördü")

        # Eğer NPC'nin başka hayranı varsa kıskanç olabilir
        rivals = [
            n for n in state["world"]["npcs"]
            if n.get("alive") and n.get("crush_on") == npc_id
        ]
        for rival in rivals[:1]:
            change_rel(state, rival["id"], -8)
            rival["mood"] = "kıskanç"
            push_personal_memory(rival, f"{player['name']} ile {npc['name']} çıkmaya başladı")
            consequences.append(f"💔 {rival['name']} kıskanç — ilişkiniz bozuldu")

        response = random.choice([
            f"{npc['name']} güldü: 'Neden olmasın?'",
            f"{npc['name']} biraz şaşırdı ama gülümsedi: 'Tamam, bir deneyelim.'",
            f"{npc['name']}: 'Çoktan beri bekliyordum bu soruyu.'",
        ])
        consequences.append(f"İlişki +{gain}")
        consequences.append("💑 Artık çıkıyorsunuz")

    else:
        gain = random.randint(-3, 0)
        change_rel(state, npc_id, gain)
        npc["mood"] = "soğuk"
        push_personal_memory(npc, f"{player['name']}'in teklifini geri çevirdim",
                             tur="reddedilme", hafta=turn)

        if "kibirli" in personality:
            response = f"{npc['name']}: 'Seninle mi? Ciddi misin?'"
            gain -= 2
            change_rel(state, npc_id, -2)
            # Kibirli biri bunu anlatır
            affected = spread_word(state, npc, f"{player['name']} {npc['name']}'e teklif yaptı, reddedildi", -2, 2)
            if affected:
                consequences.append(f"😅 {', '.join(affected)} bu reddedilişi duydu")
        elif "hırslı" in personality:
            response = f"{npc['name']}: 'Şu an daha önemli işlerim var.'"
        else:
            response = random.choice([
                f"{npc['name']} nazikçe reddetti: 'Üzgünüm, öyle düşünmüyorum.'",
                f"{npc['name']}: 'Şu an böyle bir şey istemiyorum.'",
            ])
        consequences.append(f"İlişki {gain}")

    _push_event(state, turn, "çıkma_teklifi",
                f"{player['name']}, {npc['name']}'e çıkma teklif etti. {'Kabul edildi.' if accepted else 'Reddedildi.'}")
    advance_time(state, weeks=1)
    set_cooldown(state, npc_id, "flirt")

    return {
        "response": response,
        "accepted": accepted,
        "relationship": get_rel(state, npc_id),
        "consequences": consequences,
        "npc_mood": npc.get("mood"),
    }


# ─────────────────────────────────────────────────────
# 6. EVLİLİK TEKLİFİ
# ─────────────────────────────────────────────────────

def do_propose(state, npc_id):
    npc = get_npc(state, npc_id)
    player = state["player"]
    personality = npc.get("personality", [])
    rel = get_rel(state, npc_id)
    turn = state["turn"]

    cha = player.get("stats", {}).get("charisma", 1)
    rep = player.get("reputation", 0)
    wealth = player.get("money", 0)

    accept_chance = 0.40 + rel * 0.010 + cha * 0.03 + rep * 0.003
    if "hırslı" in personality:
        accept_chance += min(0.15, wealth / 800)
    if "alçakgönüllü" in personality:
        accept_chance += 0.05
    if "sabırlı" in personality:
        accept_chance += 0.04
    if "vefasız" in personality:
        accept_chance -= 0.05

    # S2 nam etkisi: zalim namı iyi aileleri kaçırır, çapkın namı şüphe doğurur
    nam_note = None
    try:
        from npc_mind import nam_effects
        fx = nam_effects(state)
        if fx.get("evlilik_ret"):
            accept_chance -= 0.40
            nam_note = "💀 Namın önünden gidiyor: 'zalim' diye biliniyorsun — iyi aileler çekiniyor"
        elif fx.get("evlilik_suphesi"):
            accept_chance -= fx["evlilik_suphesi"]
            nam_note = "🌹 Çapkın namın ciddiyetine gölge düşürüyor"
    except Exception:
        pass

    accepted = random.random() < min(0.93, max(0.05, accept_chance))
    consequences = []
    if nam_note:
        consequences.append(nam_note)

    if accepted:
        player["spouse_id"] = npc_id
        npc["spouse_id"] = "PLAYER"
        player.setdefault("relationship_status", {})[npc_id] = "married"
        npc["mood"] = "mutlu"
        gain = 20
        change_rel(state, npc_id, gain)

        # Aile üyeleri haberi duyar
        push_personal_memory(npc, f"{player['name']} ile evlendik", tur="dugun", hafta=turn)
        family = npc_family(state, npc)
        for member in family[:3]:
            change_rel(state, member["id"], +10)
            push_personal_memory(member, f"{npc['name']} ile {player['name']} evlendi",
                                 tur="dugun", hafta=turn)
        if family:
            consequences.append(f"👨‍👩‍👦 {npc['name']}'ın ailesi seni artık aile sayıyor (+10 ilişki)")

        # Düğün haberi çevreye yayılır — itibar artar
        player["reputation"] = player.get("reputation", 0) + 5
        spread_word(state, npc, f"{player['name']} ile {npc['name']} evlendi", +3, 4)
        consequences.append("İtibar +5 (evlilik haberi yayıldı)")
        consequences.append(f"İlişki +{gain}")
        consequences.append("💍 Artık evlisiniz")

        # Hırslı NPC ailesinden para isteyebilir (başlık)
        if "hırslı" in personality and wealth < 100:
            consequences.append("⚠ Eşin servet bekliyor — beklentileri karşılamazsan ilişki zamanla bozulabilir")

        response = f"{npc['name']} gözleri dolarak 'Evet!' dedi."

    else:
        npc["mood"] = "kararsız"
        if "hırslı" in personality:
            response = f"{npc['name']}: 'Senden daha iyi biri bekliyor olabilir.'"
            consequences.append("💡 İtibar veya servetini artırırsan tekrar dene")
        elif "sabırlı" in personality:
            response = f"{npc['name']}: 'Bize daha çok zaman lazım. Acele etme.'"
            consequences.append("💡 İlişkiyi güçlendirmeye devam et")
        else:
            response = random.choice([
                f"{npc['name']} teklifi geri çevirdi: 'Hazır değilim.'",
                f"{npc['name']}: 'Henüz bu adımı atmaya hazır hissetmiyorum.'",
            ])

    _push_event(state, turn, "evlilik_teklifi",
                f"{player['name']}, {npc['name']}'e evlilik teklif etti. {'Kabul.' if accepted else 'Red.'}")
    advance_time(state, weeks=1)

    return {
        "response": response,
        "accepted": accepted,
        "relationship": get_rel(state, npc_id),
        "consequences": consequences,
        "npc_mood": npc.get("mood"),
    }


# ─────────────────────────────────────────────────────
# 7. DEDİKODU YAY
# ─────────────────────────────────────────────────────

def do_gossip(state, npc_id):
    npc = get_npc(state, npc_id)
    player = state["player"]
    player_rep = player.get("reputation", 0)
    npc_rep = npc.get("reputation", 0)
    social = player.get("skills", {}).get("social", 0)
    turn = state["turn"]

    # Cooldown kontrolü: aynı NPC hakkında 4 haftada bir dedikodu yapılabilir
    weeks_since = get_cooldown(state, npc_id, "gossip")
    if weeks_since < 4:
        weeks_left = 4 - weeks_since
        return {
            "response": f"{npc['name']} hakkında söyleyecek yeni bir şeyin yok — insanlar artık kulak asmıyor.",
            "success": False,
            "cooldown_weeks_left": weeks_left,
            "relationship": get_rel(state, npc_id),
            "consequences": [f"⏳ {weeks_left} hafta daha bekle"],
            "npc_mood": npc.get("mood", "nötr"),
        }

    # Başarı şansı
    success_chance = 0.35 + (player_rep - npc_rep) * 0.004 + social * 0.05
    success_chance = max(0.10, min(0.82, success_chance))
    success = random.random() < success_chance
    consequences = []

    gossip_subjects = [
        f"{npc['name']}'ın dürüst olmadığını ima ettin",
        f"{npc['name']}'ın borçlu olduğunu söyledin",
        f"{npc['name']}'ın güvenilmez biri olduğunu yaydın",
        f"{npc['name']} hakkında karanlık sırlar fısıldadın",
    ]
    gossip = random.choice(gossip_subjects)

    if success:
        rep_loss = random.randint(4, 12)
        npc["reputation"] = npc.get("reputation", 0) - rep_loss
        change_rel(state, npc_id, -4)

        # Dedikodu yayılır — çevredeki NPC'ler NPC'den soğur
        nearby = nearby_npcs(state, exclude_id=npc_id)
        affected_names = []
        for n in nearby[:3]:
            delta = random.randint(-5, -2)
            change_rel(state, n["id"], delta)
            push_personal_memory(n, f"{npc['name']} hakkında dedikodu duydum")
            affected_names.append(n["name"])

        if affected_names:
            consequences.append(f"🗣 {', '.join(affected_names)} inancını sarstın")
        consequences.append(f"⬇ {npc['name']}'ın itibarı -{rep_loss}")
        consequences.append("İlişki -4")

        # Sosyal skill XP
        from skills import add_skill_xp
        add_skill_xp(player, "social", 2)

        # NPC fark ederse — kurnaz/sadık biri anlar
        personality = npc.get("personality", [])
        if "kurnaz" in personality or "zeki" in personality:
            found_out = random.random() < 0.45
            if found_out:
                change_rel(state, npc_id, -10)
                npc["revenge_pending"] = True
                npc["mood"] = "düşman"
                consequences.append(f"⚠ {npc['name']} senin yaptığını anladı — senden nefret ediyor")

        response = f"{gossip}. İnsanlar kulak verdi."

    else:
        # Geri tepti — ya inanmadılar ya da NPC duydu
        backfire = random.random() < 0.4
        if backfire:
            # Dedikodu NPC'ye ulaştı
            change_rel(state, npc_id, -8)
            npc["mood"] = "öfkeli"
            npc["revenge_pending"] = True
            player["reputation"] = player.get("reputation", 0) - 4
            response = f"{gossip}. Ama söz {npc['name']}'ın kulağına ulaştı. Senden nefret ediyor."
            consequences.append(f"⚠ Dedikodu {npc['name']}'a ulaştı! İlişki -8")
            consequences.append("İtibar -4 (güvenilmez biri olarak görüldün)")
        else:
            player["reputation"] = player.get("reputation", 0) - 2
            response = f"{gossip}. Kimse sana inanmadı."
            consequences.append("İtibar -2 (kimse inanmadı)")

    _push_event(state, turn, "dedikodu",
                f"{player['name']}, {npc['name']} hakkında dedikodu yaydı.")
    advance_time(state, weeks=1)
    set_cooldown(state, npc_id, "gossip")  # cooldown kaydet
    push_personal_memory(npc, f"Hakkımda dedikodu yayıldı — {player['name']}",
                         tur="iftira", hafta=turn)

    return {
        "response": response,
        "success": success,
        "relationship": get_rel(state, npc_id),
        "consequences": consequences,
        "npc_mood": npc.get("mood", "nötr"),
    }


# ─────────────────────────────────────────────────────
# 8. KAÇIR
# ─────────────────────────────────────────────────────

def do_kidnap(state, npc_id):
    npc = get_npc(state, npc_id)
    player = state["player"]
    turn = state["turn"]

    str_val = player.get("stats", {}).get("strength", 1)
    combat = player.get("skills", {}).get("combat", 0)
    npc_str = 3 + (npc.get("age", 30) // 10)
    npc_prof_bonus = {"asker": 4, "lord": 2, "general": 5, "şövalye": 4}.get(npc.get("profession"), 0)
    npc_str += npc_prof_bonus

    success_chance = 0.20 + str_val * 0.07 + combat * 0.04 - npc_str * 0.03
    success = random.random() < max(0.05, min(0.70, success_chance))

    # Suç her durumda işleniyor
    crime_gain = 65
    player["crime"] = player.get("crime", 0) + crime_gain
    if npc["kingdom_id"] not in player.setdefault("wanted_in", []):
        player["wanted_in"].append(npc["kingdom_id"])

    consequences = []

    if success:
        ransom = round(npc.get("wealth", 50) * 0.4 + random.randint(15, 60))
        player["money"] = round(player.get("money", 0) + ransom, 1)
        npc["health"] = max(10, npc.get("health", 100) - random.randint(15, 35))
        npc["mood"] = "korkmuş"
        push_personal_memory(npc, f"{player['name']} beni kaçırdı",
                             tur="kacirma", hafta=turn)

        # Aile üyeleri seni düşman sayar — travma, asla unutulmaz
        family = npc_family(state, npc)
        for member in family:
            change_rel(state, member["id"], -40)
            member["mood"] = "öfkeli"
            push_personal_memory(member, f"{player['name']}, {npc['name']}'i kaçırdı",
                                 tur="yakinima_zarar", hafta=turn)
        if family:
            consequences.append(f"☠ {npc['name']}'ın ailesi seni ölümüne düşman oldu")

        # Yerel NPC'ler olumsuz etkilenir
        affected = spread_word(state, npc,
                               f"{player['name']}, {npc['name']}'i kaçırdı",
                               rel_delta=-15, max_spread=4, tur="suc_tanigi")
        if affected:
            consequences.append(f"😱 {', '.join(affected)} kaçırmayı duydu")

        player["reputation"] = player.get("reputation", 0) - 15
        consequences.append(f"💰 {ransom} altın fidye")
        consequences.append("İtibar -15")
        consequences.append(f"Suç +{crime_gain} (aranan listesine girdin)")

        response = f"{npc['name']}'ı kaçırdın. {ransom} altın fidye aldın."

    else:
        dmg = random.randint(15, 35)
        player["health"] = max(5, player.get("health", 100) - dmg)
        player["reputation"] = player.get("reputation", 0) - 8
        npc["mood"] = "öfkeli"
        npc["revenge_pending"] = True
        push_personal_memory(npc, f"{player['name']} beni kaçırmaya kalkıştı",
                             tur="saldiri", hafta=turn)

        # Tanıklar olduysa çok daha kötü
        witnesses = nearby_npcs(state, exclude_id=npc_id)
        if witnesses:
            player["crime"] += 20
            consequences.append(f"😨 {witnesses[0]['name']} bunu gördü — suç +20 daha")

        consequences.append(f"🩸 {dmg} can kaybı")
        consequences.append("İtibar -8")
        consequences.append(f"Suç +{crime_gain} (girişim bile suçtur)")
        consequences.append(f"⚠ {npc['name']} senden intikam almak istiyor")

        response = f"{npc['name']} direndi. Yaralandın ve kaçmak zorunda kaldın."

    _push_event(state, turn, "kaçırma",
                f"{player['name']}, {npc['name']}'ı {'kaçırdı' if success else 'kaçırmaya çalıştı'}.")
    advance_time(state, weeks=1)
    enf = soldier_check(state)

    return {
        "response": response,
        "success": success,
        "relationship": get_rel(state, npc_id),
        "consequences": consequences,
        "enforcement": enf,
        "npc_mood": npc.get("mood"),
    }


# ─────────────────────────────────────────────────────────────────────────────
# C-1: do_attack — saldırı mantığı route'dan buraya taşındı
# ─────────────────────────────────────────────────────────────────────────────
def do_attack(state: dict, npc_id: str) -> dict:
    """
    NPC'ye saldırı gerçekleştir. Savaş simülasyonu + itibar/suç sonuçları.
    Returns: {"log", "outcome", "rep_changes", "enforcement"}
    """
    from social_reputation import apply_attack_or_kill
    from skills import add_skill_xp, add_stat_xp
    from items import equipment_bonuses

    npc = next((n for n in state["world"]["npcs"] if n["id"] == npc_id), None)
    if not npc or not npc["alive"]:
        raise ValueError("Hedef bulunamadı veya ölü.")
    if npc["location_id"] != state["player"]["location_id"]:
        raise ValueError("Hedef burada değil.")

    player = state["player"]
    log = []
    log.append(f"{npc['name']}'a saldırdın!")
    eq = equipment_bonuses(player)

    def _npc_status(n):
        STATUS = {"kral": 5, "veliaht": 4, "lord": 4, "general": 4,
                  "şövalye": 3, "tüccar": 2, "şaman": 2, "asker": 2}
        return STATUS.get(n.get("profession", ""), 1)

    ns = _npc_status(npc)
    enemy_atk = 6 + ns * 3 + random.randint(0, 4)
    enemy_hp  = 30 + ns * 15 + random.randint(0, 20)
    player_atk = (5 + player["stats"].get("strength", 1) * 2
                  + player["skills"].get("combat", 0) * 2 + eq["attack"])
    player_def = eq["defense"]
    player_hp  = player["health"]
    rounds = 0

    while enemy_hp > 0 and player_hp > 0 and rounds < 14:
        rounds += 1
        dmg = random.randint(max(1, player_atk - 5), player_atk + 5)
        enemy_hp -= dmg
        log.append(f"Tur {rounds}: {npc['name']}'a {dmg} hasar. (kalan: {max(0, enemy_hp)})")
        if enemy_hp <= 0:
            break
        edmg = max(1, random.randint(max(1, enemy_atk - 3), enemy_atk + 3) - player_def)
        player_hp = max(0, player_hp - edmg)
        log.append(f"        Sen {edmg} hasar aldın. (canın: {player_hp})")

    player["health"] = player_hp
    rep_msgs = []

    if player_hp <= 0:
        player["health"] = 5
        player["money"] = round(player["money"] * 0.6, 1)
        log.append(f"{npc['name']} seni dövdü, kaçtın.")
        _push_event(state, state["turn"], "savaş_kaybı",
                    f"{player['name']}, {npc['name']}'a saldırdı ama kaybetti.")
        outcome = "kayıp"

    elif enemy_hp <= 0:
        npc["alive"] = False
        log.append(f"{npc['name']} öldü.")
        crime_add = 40 + ns * 20
        rep_loss  = 8 + ns * 10
        player["crime"] = player.get("crime", 0) + crime_add
        player["reputation"] = player.get("reputation", 0) - rep_loss
        rep_msgs = apply_attack_or_kill(player, victim_status=ns)
        _push_event(state, state["turn"], "cinayet",
                    f"{player['name']}, {npc['name']}'i öldürdü ({npc.get('location_name', '?')})")
        if npc["profession"] in ("kral", "veliaht", "lord", "general"):
            if npc["kingdom_id"] not in player.setdefault("wanted_in", []):
                player["wanted_in"].append(npc["kingdom_id"])
            player["crime"] += 50
            _push_event(state, state["turn"], "ödül",
                        f"{npc.get('kingdom_name','?')}, {player['name']}'in başına ödül koydu.")
        kingdom = next((k for k in state["world"]["kingdoms"]
                        if k["king_id"] == npc["id"]), None)
        if kingdom:
            heir = next((n for n in state["world"]["npcs"]
                         if n["id"] == kingdom["heir_id"] and n["alive"]), None)
            if heir:
                heir["profession"] = "kral"
                kingdom["king_id"] = heir["id"]
                _push_event(state, state["turn"], "tahta_çıkış",
                            f"{heir['name']}, {kingdom['name']} tahtına çıktı.")
        add_skill_xp(player, "combat", 4)
        add_stat_xp(player, "strength", 2)
        outcome = "zafer"

    else:
        log.append(f"Güç dengesi seni geri çekilmeye zorladı. {npc['name']} hâlâ ayakta.")
        player["health"] = max(10, player["health"] - 5)
        _push_event(state, state["turn"], "savaş_kaçış",
                    f"{player['name']}, {npc['name']}'a saldırdı ama geri çekildi.")
        outcome = "kaçış"

    # S2: hayatta kalan kurban saldırıyı asla unutmaz (travma)
    if npc.get("alive"):
        push_personal_memory(npc, f"{player['name']} bana saldırdı",
                             tur="saldiri", hafta=state["turn"])

    advance_time(state, weeks=1)
    enf = soldier_check(state)

    return {
        "log":        log,
        "outcome":    outcome,
        "rep_changes": rep_msgs,
        "enforcement": enf,
    }
