"""
game_engine.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Merkezi Oyun Motoru

Her state mutasyonu bu modülden geçer. Diğer modüller sadece
hesaplama yapar; bu modül "dünyayı değiştirir" ve sonuçları
frontend'in gösterebileceği bir özete dönüştürür.

GAME LOOP:
  1. player_action(state, action_type, payload)
     → ActionResult döner (response, consequences, world_changes, npc_reactions)
  2. advance_engine(state, weeks)
     → npc_daily_routines çalışır, pending events tetiklenir
  3. Tüm sonuçlar tek bir `GameEvent` objesi olarak döner

Her action şunları üretir:
  - immediate_effects   : anında görünen sonuçlar
  - world_changes       : state'de gerçekten değişen şeyler
  - npc_reactions       : tepki veren NPC listesi
  - cascade_events      : zincirleme olaylar
  - before_snapshot     : aksiyon öncesi oyuncu durumu
  - after_snapshot      : aksiyon sonrası oyuncu durumu
"""
import random
from balance_config import CRIME, GAME_LOOP, NPC as NPC_CFG, REPUTATION
from simulation import _push_event, advance_time, soldier_check
from npc_profile import push_personal_memory, ensure_profile


# ─────────────────────────────────────────────────────────────
# SNAPSHOT — before/after karşılaştırması için
# ─────────────────────────────────────────────────────────────

def snapshot_player(player):
    """Oyuncunun önemli değerlerinin anlık görüntüsü."""
    return {
        "health":     player.get("health", 100),
        "hunger":     player.get("hunger", 100),
        "money":      round(player.get("money", 0), 1),
        "reputation": player.get("reputation", 0),
        "crime":      player.get("crime", 0),
        "stats":      dict(player.get("stats", {})),
        "skills":     dict(player.get("skills", {})),
    }


def diff_snapshots(before, after):
    """
    İki snapshot arasındaki farkları döner.
    Sadece değişen şeyler listelenir.
    """
    changes = []
    simple_fields = [
        ("health",     "❤️ Sağlık",    True),
        ("hunger",     "🍞 Açlık",     True),
        ("money",      "💰 Altın",     True),
        ("reputation", "⭐ İtibar",    True),
        ("crime",      "⚖️ Suç",       False),  # artış kötü
    ]
    for key, label, higher_is_good in simple_fields:
        b, a = before.get(key, 0), after.get(key, 0)
        delta = round(a - b, 1)
        if abs(delta) >= 0.5:
            positive = (delta > 0) == higher_is_good
            prefix = "+" if delta > 0 else ""
            changes.append({
                "label": f"{label} {prefix}{delta}",
                "positive": positive,
                "field": key,
                "delta": delta,
            })
    # Stats
    for stat, val in after.get("stats", {}).items():
        old = before.get("stats", {}).get(stat, 0)
        if val != old:
            changes.append({
                "label": f"↑ {stat.upper()} {old}→{val}",
                "positive": True,
                "field": f"stat_{stat}",
                "delta": val - old,
            })
    # Skills
    for skill, val in after.get("skills", {}).items():
        old = before.get("skills", {}).get(skill, 0)
        if val != old:
            changes.append({
                "label": f"↑ {skill} {old}→{val}",
                "positive": True,
                "field": f"skill_{skill}",
                "delta": val - old,
            })
    return changes


# ─────────────────────────────────────────────────────────────
# NPC TEPKİ SİSTEMİ
# ─────────────────────────────────────────────────────────────

def npc_react_to_action(state, action_type, target_npc_id=None, actor_name=None):
    """
    Bir aksiyona çevredeki NPC'lerin tepkilerini hesaplar.
    Maksimum GAME_LOOP["max_npc_reactions_per_action"] kadar NPC tepki verir.
    """
    player = state["player"]
    actor = actor_name or player["name"]
    loc_id = player["location_id"]
    max_react = GAME_LOOP["max_npc_reactions_per_action"]

    # Hedef dışındaki çevredeki NPC'ler
    nearby = [
        n for n in state["world"]["npcs"]
        if n.get("alive") and n["location_id"] == loc_id
        and n["id"] != target_npc_id
    ][:max_react]

    reactions = []

    for npc in nearby:
        personality = npc.get("personality", [])
        rel = state["relationships"].get(npc["id"], 0)
        reaction = None

        if action_type in ("hakaret", "saldırı", "kaçırma"):
            # Olumsuz aksiyonlar çevreyi etkiler
            if "merhametli" in personality or rel > 20:
                rel_change = -random.randint(3, 8)
                state["relationships"][npc["id"]] = max(-100, rel + rel_change)
                mood_text = "dehşetle izledi" if action_type == "kaçırma" else "onaylamadı"
                reaction = {
                    "npc_id": npc["id"],
                    "npc_name": npc["name"],
                    "text": f"{npc['name']} {mood_text}.",
                    "rel_change": rel_change,
                    "type": "negative_witness",
                }
                push_personal_memory(npc, f"{actor} {action_type} eylemi yaptı — gördüm")

            elif "sadık" in personality and target_npc_id:
                # Hedefin arkadaşıysa daha güçlü tepki
                target_rel = state["relationships"].get(target_npc_id, 0)
                if target_rel > 30:
                    rel_change = -random.randint(10, 20)
                    state["relationships"][npc["id"]] = max(-100, rel + rel_change)
                    reaction = {
                        "npc_id": npc["id"],
                        "npc_name": npc["name"],
                        "text": f"{npc['name']} dostuna yapılanı görmezden gelemez.",
                        "rel_change": rel_change,
                        "type": "friend_defense",
                    }

        elif action_type in ("hediye", "iltifat", "para_verme"):
            # Pozitif aksiyonlar — kibirli biri olumsuz bakabilir
            if "neşeli" in personality:
                rel_change = random.randint(1, 3)
                state["relationships"][npc["id"]] = min(100, rel + rel_change)
                reaction = {
                    "npc_id": npc["id"],
                    "npc_name": npc["name"],
                    "text": f"{npc['name']} cömertliğini gördü ve sıcak yaklaştı.",
                    "rel_change": rel_change,
                    "type": "positive_witness",
                }

        if reaction:
            reactions.append(reaction)
            if len(reactions) >= max_react:
                break

    return reactions


# ─────────────────────────────────────────────────────────────
# NPC GÜNLÜK RUTIN
# ─────────────────────────────────────────────────────────────

PROFESSION_ROUTINES = {
    "çiftçi":     ["tarlada çalıştı", "hayvanlarıyla ilgilendi", "tohum ektı"],
    "tüccar":     ["çarşıda alım satım yaptı", "kervanı bekledi", "hesaplarını kontrol etti"],
    "asker":      ["nöbet tuttu", "eğitim yaptı", "kışlada dinlendi"],
    "lord":       ["mahkeme kurdu", "vergi topladı", "mektuplarını yazdı"],
    "öğretmen":   ["ders verdi", "öğrencileri sınadı", "kitaplarını okudu"],
    "köylü":      ["evini temizledi", "komşularıyla konuştu", "çarşıya gitti"],
    "haydut":     ["pusuda bekledi", "gizlenmeye çalıştı", "planlarını kurdu"],
    "dilenci":    ["sokakta bağış istedi", "sığınak aradı", "yemek peşinde koştu"],
    "şaman":      ["dua etti", "bitki topladı", "hastayı muayene etti"],
    "kral":       ["danışmanlarıyla buluştu", "orduya emir verdi", "sarayda kaldı"],
}

GOAL_ROUTINES = {
    "servet":     ["tasarruf yaptı", "yeni gelir yolu aradı", "fiyatları takip etti"],
    "güç":        ["ittifak kurdu", "nüfuzunu pekiştirdi", "rakiplerini izledi"],
    "aşk":        ["sevdiğini aradı", "şiir yazdı", "hediye hazırladı"],
    "bilgelik":   ["kitap okudu", "bilgelerle konuştu", "düşündü"],
    "barış":      ["arabuluculuk yaptı", "kavgaları yatıştırdı"],
}


def run_npc_daily_routines(state, turn):
    """
    Her hafta çalışır. NPC'ler günlük rutinlerini yapar,
    hedeflerine doğru ilerler, ve reaktif kararlar alır.
    """
    player = state["player"]
    player_loc = player["location_id"]
    events_generated = []

    # ── Ölü NPC'lerin cooldown kayıtlarını temizle (bellek sızıntısı önleme) ──
    # Her 10 turda bir çalışır; aralıklı çalışma performansı korur.
    if turn % 10 == 0:
        living_ids = {n["id"] for n in state["world"]["npcs"] if n.get("alive", True)}
        ic = player.get("interaction_counts", {})
        dead_keys = [k for k in list(ic.keys())
                     if any(npc_id not in living_ids
                            for npc_id in [k.split("_")[-1]] if npc_id)]
        for k in dead_keys:
            ic.pop(k, None)

    for npc in state["world"]["npcs"]:
        if not npc.get("alive", True):
            continue
        ensure_profile(npc)

        personality = npc.get("personality", [])
        profession = npc.get("profession", "köylü")
        goal = npc.get("goal", "")

        # Günlük aktivite seç
        routines = PROFESSION_ROUTINES.get(profession, ["geçimini sağladı"])
        goal_acts = GOAL_ROUTINES.get(goal, [])
        all_acts = routines + goal_acts
        activity = random.choice(all_acts)

        daily_log = npc.setdefault("daily_log", [])
        daily_log.append({"day": turn, "text": activity})
        if len(daily_log) > NPC_CFG["daily_log_max"]:
            npc["daily_log"] = daily_log[-NPC_CFG["daily_log_max"]:]

        # Goal progress
        npc["goal_progress"] = min(
            100,
            npc.get("goal_progress", 0) + random.randint(
                NPC_CFG["goal_progress_per_week_min"],
                NPC_CFG["goal_progress_per_week_max"]
            )
        )
        if npc["goal_progress"] >= 100:
            # Goal tamamlandı — yeni hedef
            gh = npc.setdefault("goal_history", [])
            gh.append(goal)
            # Sınırsız büyümeyi önle — sadece son N hedefi tut
            if len(gh) > NPC_CFG["goal_history_max"]:
                npc["goal_history"] = gh[-NPC_CFG["goal_history_max"]:]
            npc["goal"] = random.choice(list(GOAL_ROUTINES.keys()))
            npc["goal_progress"] = 0
            if npc["location_id"] == player_loc:
                events_generated.append({
                    "type": "npc_goal",
                    "text": f"{npc['name']} hedefine ulaştı ve yeni bir yol aradı.",
                    "npc_id": npc["id"],
                })

        # Misilleme kontrolü
        if npc.get("revenge_pending") and npc["location_id"] == player_loc:
            if random.random() < NPC_CFG["revenge_attack_chance_per_week"]:
                _trigger_npc_revenge(state, npc, turn)
                npc["revenge_pending"] = False
                events_generated.append({
                    "type": "revenge",
                    "text": f"{npc['name']} senden intikamını almak için harekete geçti!",
                    "npc_id": npc["id"],
                    "urgent": True,
                })

        # ── Crush gelişimi: bekar NPC'ler küçük ihtimalle komşuya crush atıyor ──
        # Mevcut save'lerde crush_on olmayan NPC'lerin de sistem tarafından tanınması için.
        if not npc.get("crush_on") and npc.get("spouse_id") is None and random.random() < 0.004:
            candidates = [
                c for c in state["world"]["npcs"]
                if c.get("alive", True)
                and c["id"] != npc["id"]
                and c["location_id"] == npc["location_id"]
                and c.get("spouse_id") is None
                and c.get("gender") != npc.get("gender")
            ]
            if candidates:
                npc["crush_on"] = random.choice(candidates)["id"]

        # Ruh hali normalizasyonu
        mood_normalize_map = {
            "öfkeli": "gergin", "gergin": "nötr", "korkmuş": "nötr",
            "mutlu": "nötr", "minnettar": "nötr", "neşeli": "nötr",
        }
        current_mood = npc.get("mood", "nötr")
        if current_mood in mood_normalize_map and random.random() < 0.3:
            npc["mood"] = mood_normalize_map[current_mood]

    # ── P2: NPC↔NPC ilişki ticki (her 5 turda) ──
    if turn % 5 == 0:
        rel_events = _npc_relationship_tick(state, turn)
        events_generated.extend(rel_events)

    return events_generated


# ─────────────────────────────────────────────────────────────
# P2: NPC↔NPC DİNAMİK İLİŞKİ SİSTEMİ
# ─────────────────────────────────────────────────────────────

_COMPATIBLE_TRAITS  = {frozenset({"cesur", "savaşçı"}), frozenset({"bilge", "meraklı"}),
                       frozenset({"dürüst", "koruyucu"}), frozenset({"hırslı", "lider"})}
_CLASH_TRAITS       = {frozenset({"dürüst", "kurnaz"}), frozenset({"lider", "lider"}),
                       frozenset({"saldırgan", "sakin"})}
_BOND_LABELS        = {
    "arkadaş": (30, 69), "yakın_dost": (70, 100),
    "rakip":   (-69, -30), "düşman": (-100, -70),
}


def _bond_label(score: int) -> str:
    for label, (lo, hi) in _BOND_LABELS.items():
        if lo <= score <= hi:
            return label
    return "tanıdık"


def _npc_relationship_tick(state: dict, turn: int) -> list:
    """
    Her 5 turda çalışır. Aynı lokasyondaki NPC çiftleri arasında
    kişilik uyumu / çatışmasına göre arkadaşlık/düşmanlık gelişir.
    """
    npcs   = [n for n in state["world"]["npcs"] if n.get("alive", True)]
    player_loc = state["player"]["location_id"]
    events = []

    # Lokasyon grupları oluştur (büyük dünyada tüm çiftler pahalı)
    by_loc: dict[str, list] = {}
    for npc in npcs:
        by_loc.setdefault(npc["location_id"], []).append(npc)

    for loc_id, group in by_loc.items():
        if len(group) < 2:
            continue
        # Her lokasyondan en fazla 5 rastgele çift seç
        pairs = []
        shuffled = group[:]
        random.shuffle(shuffled)
        for i in range(min(5, len(shuffled) - 1)):
            pairs.append((shuffled[i], shuffled[i + 1]))

        for a, b in pairs:
            bonds_a = a.setdefault("bonds", {})
            bonds_b = b.setdefault("bonds", {})
            score_a = bonds_a.get(b["id"], 0)
            score_b = bonds_b.get(a["id"], 0)

            # Kişilik uyumu
            traits_a = set(a.get("personality", []))
            traits_b = set(b.get("personality", []))
            pair_set = frozenset([next(iter(traits_a), ""), next(iter(traits_b), "")])
            if any(pair_set <= cp for cp in _COMPATIBLE_TRAITS):
                delta = random.randint(2, 5)
            elif any(pair_set <= cp for cp in _CLASH_TRAITS):
                delta = random.randint(-5, -2)
            else:
                delta = random.randint(-1, 2)

            new_a = max(-100, min(100, score_a + delta))
            new_b = max(-100, min(100, score_b + delta))
            bonds_a[b["id"]] = new_a
            bonds_b[a["id"]] = new_b

            # Eşik geçişi: oyuncu buradaysa haber ver
            old_label = _bond_label(score_a)
            new_label = _bond_label(new_a)
            if old_label != new_label and loc_id == player_loc:
                if new_label == "arkadaş":
                    events.append({"type": "npc_bond", "text":
                        f"{a['name']} ile {b['name']} arkadaş oldu.", "npc_id": a["id"]})
                elif new_label == "yakın_dost":
                    events.append({"type": "npc_bond", "text":
                        f"{a['name']} ile {b['name']} yakın dost oldu.", "npc_id": a["id"]})
                elif new_label == "düşman":
                    events.append({"type": "npc_bond", "text":
                        f"{a['name']} ile {b['name']} artık açık düşman.", "npc_id": a["id"]})

    return events


def _trigger_npc_revenge(state, npc, turn):
    """NPC oyuncuya misilleme yapar."""
    player = state["player"]
    personality = npc.get("personality", [])

    if "öfkeli" in personality or "cesur" in personality:
        # Fiziksel saldırı
        dmg = random.randint(10, 25)
        player["health"] = max(1, player["health"] - dmg)
        _push_event(state, turn, "misilleme",
                    f"{npc['name']} geçmişte yaşanan olayları unutmadı ve saldırdı! ({dmg} hasar)")
    elif "kurnaz" in personality:
        # Para çalma
        stolen = min(player.get("money", 0), random.randint(5, 30))
        player["money"] = round(player["money"] - stolen, 1)
        npc["wealth"] = npc.get("wealth", 0) + stolen
        _push_event(state, turn, "misilleme",
                    f"{npc['name']} kurnazca {stolen} altınını çaldı.")
    else:
        # Dedikodu yayma
        player["reputation"] = player.get("reputation", 0) - random.randint(3, 8)
        _push_event(state, turn, "misilleme",
                    f"{npc['name']} senin hakkında dedikodu yaydı.")


# ─────────────────────────────────────────────────────────────
# STATE-BASED EVENT TRIGGERS
# ─────────────────────────────────────────────────────────────

def check_state_triggers(state, turn):
    """
    State'e bağlı olayları tetikler.
    "Rastgele" değil — gerçekten mantıklı koşullara bağlı.
    """
    player = state["player"]
    loc_id = player["location_id"]
    loc = next((l for l in state["world"]["locations"] if l["id"] == loc_id), None)
    triggered = []

    if not loc:
        return triggered

    # ── Suç yüksekse asker devriyeleri ──────────────────────
    if player.get("crime", 0) >= CRIME["soldier_check_min_crime"]:
        enf = soldier_check(state)
        if enf:
            triggered.append({
                "type": "enforcement",
                "text": f"Suç kaydın seni takip ediyor. {enf.get('by', 'Askerler')} devreye girdi.",
                "data": enf,
                "urgent": True,
            })

    # ── Açlık kritik seviyede ────────────────────────────────
    if player.get("hunger", 100) <= 10:
        triggered.append({
            "type": "starvation_warning",
            "text": "Açlıktan düşmek üzeresin. Yiyecek bulman lazım.",
            "urgent": True,
        })

    # ── Sağlık kritik ────────────────────────────────────────
    if player.get("health", 100) <= 20:
        triggered.append({
            "type": "health_warning",
            "text": "Sağlığın tehlikeli seviyede. Dinlenmen veya tedavi olman gerekiyor.",
            "urgent": True,
        })

    # ── Düşük itibar bölgede yansıması ───────────────────────
    if player.get("reputation", 0) < -30:
        nearby_hostile = [
            n for n in state["world"]["npcs"]
            if n.get("alive") and n["location_id"] == loc_id
            and state["relationships"].get(n["id"], 0) < -20
        ]
        if nearby_hostile:
            triggered.append({
                "type": "hostile_area",
                "text": f"Bu bölgede sana düşman olanlar var. Dikkatli ol.",
                "urgent": False,
            })

    # ── Düşük lokasyon güvenliği + suç = haydut riski ────────
    if loc.get("security", 50) < 30 and player.get("crime", 0) > 20:
        if random.random() < 0.15:
            stolen = min(player.get("money", 0), random.randint(3, 15))
            if stolen > 0:
                player["money"] = round(player["money"] - stolen, 1)
                _push_event(state, turn, "hırsızlık",
                            f"Güvensiz bölgede biri cebinden {stolen} altın çaldı.")
                triggered.append({
                    "type": "pickpocket",
                    "text": f"Güvensiz sokaklarda {stolen} altınını çaldılar.",
                    "urgent": True,
                })

    # ── Bekleyen özel olay (mektep) ───────────────────────────
    pending = state.get("pending_special_event")
    if pending and player.get("age", 99) < 13:
        triggered.append({
            "type": "special_event_pending",
            "text": "Bugün özel bir etkinlik var! Mektep sayfasına bak.",
            "urgent": False,
        })

    return triggered


# ─────────────────────────────────────────────────────────────
# ACTION RESULT BUILDER
# ─────────────────────────────────────────────────────────────

def build_action_result(
    state,
    action_type,
    response_text,
    target_npc_id=None,
    consequences=None,
    cascade=None,
    advance_weeks=1,
    skip_advance=False,
):
    """
    Bir aksiyonun tüm sonuçlarını toplar:
    - before/after snapshot
    - NPC tepkileri
    - State trigger kontrolleri
    - Sonuç özeti
    """
    before = snapshot_player(state["player"])

    if not skip_advance:
        advance_time(state, weeks=advance_weeks)

    after = snapshot_player(state["player"])
    diff = diff_snapshots(before, after)

    # NPC tepkileri
    npc_reactions = npc_react_to_action(
        state, action_type, target_npc_id=target_npc_id
    )

    # State trigger'lar
    triggers = check_state_triggers(state, state["turn"])

    # NPC günlük rutinleri (advance sırasında zaten çalışır ama
    # burada ek reactive events üretiriz)
    urgent_events = [t for t in triggers if t.get("urgent")]
    normal_events = [t for t in triggers if not t.get("urgent")]

    # Sonuç özeti birleştir
    all_consequences = list(consequences or [])
    for change in diff:
        # Diff'den gelenleri consequences'a ekle (duplicate önle)
        label = change["label"]
        if not any(label in c for c in all_consequences):
            all_consequences.append(label)

    # Max satır sınırı
    all_consequences = all_consequences[:GAME_LOOP["max_consequence_lines"]]

    return {
        "response": response_text,
        "consequences": all_consequences,
        "cascade": list(cascade or []),
        "before": before,
        "after": after,
        "diff": diff,
        "npc_reactions": [
            {"name": r["npc_name"], "text": r["text"], "rel_change": r.get("rel_change", 0)}
            for r in npc_reactions
        ],
        "urgent_events": urgent_events,
        "world_context": _build_world_context(state),
    }


# ─────────────────────────────────────────────────────────────
# WORLD CONTEXT — "Dünya beni hatırlıyor" hissi
# ─────────────────────────────────────────────────────────────

def _build_world_context(state):
    """
    Oyuncunun bulunduğu yerde dünyada ne oluyor?
    Frontend'e "dünya seni hatırlıyor" mesajları için.
    """
    player = state["player"]
    loc_id = player["location_id"]
    loc = next((l for l in state["world"]["locations"] if l["id"] == loc_id), {})
    context = []

    # Yakındaki NPC'lerin günlük aktiviteleri
    nearby_active = [
        n for n in state["world"]["npcs"]
        if n.get("alive") and n["location_id"] == loc_id
        and n.get("daily_log")
    ][:3]

    for npc in nearby_active:
        last_act = npc["daily_log"][-1]["text"] if npc["daily_log"] else None
        if last_act:
            context.append(f"👤 {npc['name']} {last_act}.")

    # Aktif dünya olayları
    active_events = [
        e for e in state.get("world_events", [])
        if e.get("active") and e.get("location_id") == loc_id
    ][:2]
    for ev in active_events:
        context.append(f"🌍 {ev.get('description', ev.get('event_type', 'Olay'))} devam ediyor.")

    # İtibar hatırlatması
    rep = player.get("reputation", 0)
    rep_label = _reputation_label(rep)
    if rep != 0:
        context.append(f"⭐ Bölgede '{rep_label}' olarak biliniyor.")

    # Aktif savaşlar
    player_kingdom = player.get("kingdom_id")
    if player_kingdom:
        kingdom = next((k for k in state["world"]["kingdoms"] if k["id"] == player_kingdom), None)
        if kingdom and kingdom.get("at_war_with"):
            context.append(f"⚔️ {kingdom['name']} savaş halinde — tehlike yüksek.")

    return context[:5]


def _reputation_label(rep):
    thresholds = REPUTATION["thresholds"]
    label = "Tanınmayan"
    for threshold, name in sorted(thresholds.items()):
        if rep >= threshold:
            label = name
    return label


# ─────────────────────────────────────────────────────────────
# SUGGESTED ACTIONS — "Ne yapmalıyım?"
# ─────────────────────────────────────────────────────────────

def get_suggested_actions(state):
    """
    Oyuncunun mevcut durumuna göre anlamlı aksiyon önerileri.
    Sadece alakalı olanlar döner — 20 seçenek değil, 3-5 net öneri.
    """
    player = state["player"]
    suggestions = []
    age = player.get("age", 7)
    is_child = age < 13
    loc_id = player["location_id"]
    loc = next((l for l in state["world"]["locations"] if l["id"] == loc_id), {})

    # ── Acil durum önerileri (en üstte görünür) ─────────────
    if player.get("hunger", 100) < 25:
        suggestions.append({
            "priority": "urgent",
            "icon": "🍞",
            "title": "Acil: Yemek Al",
            "desc": "Açlıktan ölme ihtimalin var. Ekmek al.",
            "action": "buy_food",
            "route": "/oyun/envanter",
        })

    if player.get("health", 100) < 25:
        suggestions.append({
            "priority": "urgent",
            "icon": "💊",
            "title": "Acil: Tedavi Ol",
            "desc": "Sağlığın kritik seviyede. Dinlen.",
            "action": "rest",
            "route": "/oyun/envanter",
        })

    # ── Fırsatlar ────────────────────────────────────────────
    open_opps = [o for o in state.get("opportunities", []) if o.get("status") == "açık"]
    if open_opps:
        opp = open_opps[0]
        suggestions.append({
            "priority": "high",
            "icon": "⚡",
            "title": opp.get("title", "Fırsat var!"),
            "desc": opp.get("description", "Bir fırsat seni bekliyor."),
            "action": "opportunity",
            "route": "/oyun/firsatlar",
        })

    # ── Çocukluk için mektep ─────────────────────────────────
    if is_child:
        school = player.get("school", {})
        if school.get("lessons_this_week", 0) == 0:
            suggestions.append({
                "priority": "normal",
                "icon": "📖",
                "title": "Bu hafta ders işle",
                "desc": "Mektepte henüz ders işlemedin.",
                "action": "school",
                "route": "/oyun/mektep",
            })

    # ── Açık görevler ────────────────────────────────────────
    active_quests = [q for q in state.get("quests", []) if q.get("status") == "açık"]
    if active_quests:
        q = active_quests[0]
        suggestions.append({
            "priority": "normal",
            "icon": "📜",
            "title": q.get("title", "Görev var"),
            "desc": q.get("description", ""),
            "action": "quest",
            "route": "/oyun/gorevler",
        })

    # ── İlişki geliştir ──────────────────────────────────────
    if not is_child:
        lonely = [
            npc for npc in state["world"]["npcs"]
            if npc.get("alive") and npc["location_id"] == loc_id
            and state["relationships"].get(npc["id"], 0) > 10
            and state["relationships"].get(npc["id"], 0) < 40
        ][:1]
        if lonely:
            suggestions.append({
                "priority": "low",
                "icon": "💬",
                "title": f"{lonely[0]['name']} ile konuş",
                "desc": f"İlişkinizi güçlendirebilirsin.",
                "action": "talk_npc",
                "route": f"/oyun/npc/{lonely[0]['id']}",
                "npc_id": lonely[0]["id"],
            })

    # ── Ekonomi fırsatı ──────────────────────────────────────
    if not is_child and loc.get("wealth", 50) > 60:
        suggestions.append({
            "priority": "low",
            "icon": "💰",
            "title": "Çalışarak para kazan",
            "desc": f"{loc.get('name', 'Bu şehir')} zengin. Meslek veya ticaret düşün.",
            "action": "work",
            "route": "/oyun/karakter",
        })

    # ── Aile görevi ──────────────────────────────────────────
    open_fq = [q for q in state.get("family_quests", []) if q.get("status") == "açık"]
    if open_fq:
        fq = open_fq[0]
        suggestions.append({
            "priority": "normal",
            "icon": "👨‍👩‍👦",
            "title": fq.get("title", "Aile görevi"),
            "desc": fq.get("description", ""),
            "action": "family_quest",
            "route": "/oyun/aile",
        })


    # ── Dünya olayı → öneri köprüsü ──────────────────────────
    # Aktif dünya olayları varsa, konumla eşleşen fırsat olduğunu vurgula.
    try:
        from world_events import get_active_world_events
        active_world_events = get_active_world_events(state)
        global_events = [
            ev for ev in active_world_events
            if not ev.get("location_id") or ev.get("location_id") == loc_id
        ][:2]

        WORLD_EVENT_SUGGESTIONS = {
            "kuraklık": {
                "priority": "high",
                "icon": "🌵",
                "title": "Kuraklık Fırsatı",
                "desc": "Bölgede kuraklık var. Su taşıma veya erzak ticareti ile para kazanabilirsin.",
                "route": "/oyun/firsatlar",
            },
            "salgın_hastalık": {
                "priority": "high",
                "icon": "⚕️",
                "title": "Salgın Yardımı",
                "desc": "Bölgede salgın hastalık var. Şifalı ot toplamak itibar kazandırır.",
                "route": "/oyun/firsatlar",
            },
            "festival": {
                "priority": "normal",
                "icon": "🎉",
                "title": "Festivale Katıl",
                "desc": "Bölgede festival var! Katıl, eğlen, para kazan.",
                "route": "/oyun/firsatlar",
            },
            "ticaret_patlaması": {
                "priority": "high",
                "icon": "📈",
                "title": "Ticaret Patlaması",
                "desc": "Bölgede ticaret patlaması var. Fırsatlar sayfasını kontrol et.",
                "route": "/oyun/firsatlar",
            },
            "haydut_saldırıları": {
                "priority": "urgent",
                "icon": "⚔️",
                "title": "Haydut Tehlikesi",
                "desc": "Bölgede haydut saldırıları var. Yalnız seyahat etme.",
                "route": "/oyun/firsatlar",
            },
            "yangın": {
                "priority": "urgent",
                "icon": "🔥",
                "title": "Yangın Felaketi",
                "desc": "Bölgede yangın çıktı. Etkilenenlere yardım et veya fırsat değerlendir.",
                "route": "/oyun/firsatlar",
            },
            "yeni_maden": {
                "priority": "normal",
                "icon": "⛏️",
                "title": "Yeni Maden",
                "desc": "Bölgede yeni bir maden keşfedildi. Yatırım veya çalışma fırsatı var.",
                "route": "/oyun/firsatlar",
            },
        }

        already_routes = {s.get("route") for s in suggestions}
        for ev in global_events:
            ev_type = ev.get("type", "")
            template = WORLD_EVENT_SUGGESTIONS.get(ev_type)
            if template and "/oyun/firsatlar" not in already_routes:
                suggestions.append({
                    **template,
                    "action": "world_event_opportunity",
                    "event_type": ev_type,
                    "event_location": ev.get("location_name", ""),
                })
                already_routes.add("/oyun/firsatlar")
                break
    except Exception:
        pass  # world_events modülü erişilemezse sessizce geç

    # En fazla 5 öneri, priority'ye göre sırala
    priority_order = {"urgent": 0, "high": 1, "normal": 2, "low": 3}
    suggestions.sort(key=lambda x: priority_order.get(x.get("priority"), 3))
    return suggestions[:5]


# ─────────────────────────────────────────────────────────────
# CRIME DECAY — haftalık suç azalması
# ─────────────────────────────────────────────────────────────

def apply_crime_decay(state):
    """Her hafta suç puanı biraz düşer — zaman geçince unutulur."""
    player = state["player"]
    decay = CRIME.get("crime_decay_per_week", 1)
    if player.get("crime", 0) > 0:
        player["crime"] = max(0, player["crime"] - decay)


# ─────────────────────────────────────────────────────────────
# HAFTA PLANI — R1 Hafta Döngüsü (GDD v7 Bölüm I, R1)
# ─────────────────────────────────────────────────────────────

HAFTA_PLANI_SECENEKLERI = {
    "is": [
        {
            "id": "calis",
            "label": "Çalış",
            "icon": "⚒️",
            "etki": "Standart gelir. Güvenli, öngörülebilir.",
            "event_weights": {"is": 1.5, "sosyal": 0.8, "kisisel": 0.8},
        },
        {
            "id": "fazla_mesai",
            "label": "Fazla Mesai",
            "icon": "🔥",
            "etki": "Gelir ↑ ama sağlık riski artar.",
            "event_weights": {"is": 2.0, "sosyal": 0.5, "kisisel": 0.5},
        },
        {
            "id": "ticaret",
            "label": "Ticaret",
            "icon": "🛒",
            "etki": "Pazar fırsatları ve fiyat bilgisi açılır.",
            "event_weights": {"is": 1.2, "pazar": 1.8, "sosyal": 1.0},
        },
    ],
    "sosyal": [
        {
            "id": "hamam",
            "label": "Hamam",
            "icon": "🛁",
            "etki": "Dedikodu eventleri ve yeni bağlantılar öne çıkar.",
            "event_weights": {"dedikodu": 2.0, "sosyal": 1.5, "is": 0.7},
        },
        {
            "id": "ziyaret",
            "label": "Ziyaret",
            "icon": "🏡",
            "etki": "İlişki puanları daha kolay artar.",
            "event_weights": {"npc": 2.0, "sosyal": 1.5, "is": 0.7},
        },
        {
            "id": "pazar",
            "label": "Pazar",
            "icon": "🏪",
            "etki": "Ticaret fırsatları ve karşılaşma eventleri.",
            "event_weights": {"pazar": 1.8, "npc": 1.3, "is": 0.9},
        },
    ],
    "kisisel": [
        {
            "id": "dinlen",
            "label": "Dinlen",
            "icon": "😴",
            "etki": "Sağlık ve açlık daha hızlı iyileşir.",
            "event_weights": {"iyilesme": 2.0, "is": 0.6, "risk": 0.5},
        },
        {
            "id": "antrenman",
            "label": "Antrenman",
            "icon": "💪",
            "etki": "Güç ve dayanıklılık stat eventleri artar.",
            "event_weights": {"stat": 1.8, "is": 0.8, "risk": 0.7},
        },
        {
            "id": "dua_okuma",
            "label": "Dua/Okuma",
            "icon": "📖",
            "etki": "İtibar ve bilgelik eventleri öne çıkar.",
            "event_weights": {"itibar": 1.6, "stat": 1.2, "is": 0.8},
        },
    ],
}

# Varsayılan plan — oyuncu hiç seçmese de her şey çalışır
_DEFAULT_HAFTA_PLANI = {
    "is":      "calis",
    "sosyal":  "pazar",
    "kisisel": "dua_okuma",
}


def get_default_hafta_plani() -> dict:
    """Varsayılan hafta planını döner (değiştirilebilir kopya)."""
    return dict(_DEFAULT_HAFTA_PLANI)


def validate_hafta_plani(plan: dict) -> tuple[bool, str]:
    """
    Gelen plan dict'ini doğrular.
    Returns: (gecerli_mi, hata_mesaji)
    """
    required_slots = {"is", "sosyal", "kisisel"}
    if not required_slots.issubset(plan.keys()):
        missing = required_slots - set(plan.keys())
        return False, f"Eksik slotlar: {', '.join(missing)}"

    for slot, secim in plan.items():
        if slot not in HAFTA_PLANI_SECENEKLERI:
            return False, f"Geçersiz slot: {slot}"
        valid_ids = [s["id"] for s in HAFTA_PLANI_SECENEKLERI[slot]]
        if secim not in valid_ids:
            return False, f"'{slot}' için geçersiz seçim: '{secim}'. Geçerli: {valid_ids}"

    return True, ""


def get_hafta_plani_state(state: dict) -> dict:
    """
    Oyuncunun aktif hafta planını state'den çeker.
    Yoksa varsayılanı döner ve state'e yazar.
    """
    player = state["player"]
    if "hafta_plani" not in player:
        player["hafta_plani"] = get_default_hafta_plani()
    return player["hafta_plani"]


def hafta_plani_beklenti_metni(plan: dict) -> str:
    """
    Seçili plana göre kısa beklenti açıklaması üretir.
    Dashboard'da "Seçili plan: ... Beklenti: ..." satırı için.
    """
    slot_labels = []
    risk_hints = []

    slot_map = {
        "is": ("İş", {"fazla_mesai": "sağlık ↓ riski"}),
        "sosyal": ("Sosyal", {}),
        "kisisel": ("Kişisel", {}),
    }

    for slot_key, (slot_label, risk_map) in slot_map.items():
        secim_id = plan.get(slot_key, "")
        secenekler = HAFTA_PLANI_SECENEKLERI.get(slot_key, [])
        sec = next((s for s in secenekler if s["id"] == secim_id), None)
        if sec:
            slot_labels.append(sec["label"])
            if secim_id in risk_map:
                risk_hints.append(risk_map[secim_id])

    plan_str = " + ".join(slot_labels) if slot_labels else "Belirsiz"
    if risk_hints:
        return f"Seçili plan: {plan_str} — risk: {', '.join(risk_hints)}"
    return f"Seçili plan: {plan_str}"


# ─────────────────────────────────────────────────────────────
# HAFTA SONU HASADI — _build_hafta_hasadi
# ─────────────────────────────────────────────────────────────
# Event türüne göre manşet ağırlığı — ne kadar büyük bir haber?
_EVENT_MANSET_WEIGHT: dict[str, int] = {
    "ölüm":            10,
    "cinayet":         10,
    "savaş_ilanı":      9,
    "tahta_çıkış":      9,
    "savaş_hareketi":   8,
    "isyan":            8,
    "barış":            7,
    "haydut_baskını":   7,
    "rank_bonusu":      7,
    "kıtlık_etkisi":    6,
    "evlilik":          6,
    "şenlik":           5,
    "doğum":            5,
    "meslek_edinme":    5,
    "zanaat_durgun":    4,
    "aile_destek":      4,
    "göç":              4,
}

# Sessiz hafta — haber yoksa gösterilecek fallback manşetler
_MANSET_FALLBACK: list[str] = [
    "Bu hafta sessiz geçti. Belki de fırtına öncesi sükunettir.",
    "Pek bir şey olmadı. Ya da olan şeyler henüz konuşulmaya başlanmadı.",
    "Şehir sakin, ama sükûnet bazen en büyük haberdir.",
    "Herkes kendi işiyle meşguldü bu hafta. Belki öyle olmalı.",
    "Bir şeyler oldu, ama akıllara kazınacak türden değildi.",
]

# Kulak misafiri — söylenti yoksa gösterilecek fallback satırlar
_KULAK_FALLBACK: list[str] = [
    "Bir seyyah bu hafta şehirden geçti; nereye gittiğini kimse sormadı.",
    "Kalabalık içinde bir isim fısıldandı — ama rüzgâr götürdü.",
    "Bu hafta pek söylenti dolaşmadı. Sessizlik de bir işarettir.",
    "Biri bir şey söyledi, kulağa geldi; ama kimse üstüne basmadı.",
    "Çarşı bugün temkinliydi — dedikodu bile kısık sesle yapılır oldu.",
]


def _build_hafta_hasadi(
    state: dict,
    before: dict,
    after: dict,
    turn_before: int,
) -> dict:
    """
    Hafta Sonu Hasadı paketini 3 bölüm halinde döner.

    Bölümler
    --------
    manset        : Bu haftanın en önemli 1 olayı (text + type + weight).
                    Ağırlık tablosuna göre seçilir; eşitler arasında rastgele.
    kazanclar     : diff_snapshots(before, after) listesi.
                    Para / sağlık / itibar / stat delta'ları.
    kulak_misafiri: 1 söylenti/ipucu satırı.
                    Önce oyuncunun adını geçiren, sonra aynı bölge,
                    sonra genel yeni söylentiler; hiç yoksa fallback.

    Parametreler
    ------------
    state        — advance_time() SONRASI güncel state
    before       — advance_time() ÖNCE snapshot_player() çıktısı
    after        — advance_time() SONRA snapshot_player() çıktısı
    turn_before  — advance çağrılmadan önceki state['turn'] değeri
    """
    current_turn: int = state.get("turn", 0)

    # ── MANŞET ──────────────────────────────────────────────────
    # Bu turda tarihe geçen olaylar (turn_before < day <= current_turn)
    this_week: list[dict] = [
        e for e in state.get("history", [])
        if turn_before < e.get("day", 0) <= current_turn
    ]

    if this_week:
        def _w(ev: dict) -> int:
            return _EVENT_MANSET_WEIGHT.get(ev.get("type", ""), 1)

        max_w = max(_w(e) for e in this_week)
        # Aynı en yüksek ağırlıktaki eventlerin hepsi aday — rastgele seç
        top_candidates = [e for e in this_week if _w(e) >= max_w]
        chosen = random.choice(top_candidates)
        manset = {
            "text":   chosen.get("narrative") or chosen.get("text", ""),
            "type":   chosen.get("type", "bilinmiyor"),
            "weight": max_w,
        }
    else:
        manset = {
            "text":   random.choice(_MANSET_FALLBACK),
            "type":   "sessiz_hafta",
            "weight": 0,
        }

    # ── KAZANÇLAR ────────────────────────────────────────────────
    # diff_snapshots zaten game_engine.py'da mevcut — direkt kullan
    kazanclar: list[dict] = diff_snapshots(before, after)

    # ── KULAK MİSAFİRİ ───────────────────────────────────────────
    all_rumors: list[dict] = state.get("rumors", [])
    player      = state["player"]
    player_name = player.get("name", "")
    # Söylentiler kingdom_id taşır — oyuncunun krallığını lokasyonundan bul
    _loc = next((l for l in state.get("world", {}).get("locations", [])
                 if l.get("id") == player.get("location_id")), None)
    player_loc  = _loc.get("kingdom_id") if _loc else None

    kulak_misafiri: dict
    if all_rumors:
        recent = all_rumors[-25:]  # sadece en yeni 25 söylenti
        # 1. Oyuncunun adını içeren söylentiler (itibar yansıması)
        player_rumors = [r for r in recent if player_name and player_name in r.get("text", "")]
        # 2. Oyuncunun bulunduğu bölgeye ait söylentiler
        local_rumors  = [r for r in recent
                         if r.get("kingdom_id") in (player_loc, None)]
        # Öncelik sırası: oyuncu → yerel → genel
        candidates = player_rumors or local_rumors or recent
        picked = random.choice(candidates)
        kulak_misafiri = {
            "text":       picked.get("text", ""),
            "type":       picked.get("type", ""),
            "actionable": bool(picked.get("action")),
            "action":     picked.get("action"),   # None veya {kind, ...}
        }
    else:
        kulak_misafiri = {
            "text":       random.choice(_KULAK_FALLBACK),
            "type":       "sessiz",
            "actionable": False,
            "action":     None,
        }

    return {
        "manset":         manset,
        "kazanclar":      kazanclar,
        "kulak_misafiri": kulak_misafiri,
    }
