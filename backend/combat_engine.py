"""Taktik Savaş Motoru v2 — GDD v5 Faz 3A.

Tur-tabanlı, 3 aşamalı kart-seçim modeli (mobil dostu):
1. HAZIRLIK: Duruş seç (saldırgan / dengeli / savunmacı) + ekipman bonusları
2. ÇATIŞMA (3-6 tur): Her tur 3 eylem kartından biri:
   Hamle / Savuştur / Özel Yetenek (combat skill 3+ ile açılır)
   Rakip niyeti kısmen görünür ("kılıcını kaldırıyor...") →
   taş-kağıt-makas: Hamle > Özel, Özel > Savuştur, Savuştur > Hamle
   + stat ağırlığı (beraberlikte ve hasarda)
3. SONUÇ: Yaralanma sistemi — ölüm yerine kademeli:
   sıyrık → yara (haftalarca stat cezası) → sakatlık (kalıcı) →
   ölüm (sadece kritik dövüşlerde)

Kaçma her zaman seçenek (itibar bedeli ile).
Savaş türleri (3B): düello, soygun savunması, turnuva, kuşatma aşaması,
fraksiyon komutanlığı (3C — combat yerine 3 stratejik karar).
"""
import random
from locales import t

# ── Kartlar ve üstünlük çemberi ──────────────────────────────────────────
CARDS = ["hamle", "savustur", "ozel"]
BEATS = {"hamle": "ozel", "ozel": "savustur", "savustur": "hamle"}

CARD_LABELS = {"hamle": "Hamle", "savustur": "Savuştur", "ozel": "Özel Yetenek"}

# Rakip niyet ipuçları (kısmen doğru: %70 gerçek niyeti yansıtır)
INTENT_HINTS = {
    "hamle":    ["savas.niyet_hamle_1", "savas.niyet_hamle_2"],
    "savustur": ["savas.niyet_savustur_1", "savas.niyet_savustur_2"],
    "ozel":     ["savas.niyet_ozel_1", "savas.niyet_ozel_2"],
}

STANCES = {
    "saldırgan":  {"atk": 1.35, "def": 0.70, "label": "Saldırgan"},
    "dengeli":    {"atk": 1.00, "def": 1.00, "label": "Dengeli"},
    "savunmacı":  {"atk": 0.70, "def": 1.40, "label": "Savunmacı"},
}

# ── Savaş türleri (3B) ───────────────────────────────────────────────────
BATTLE_TYPES = {
    "duello": {
        "label": "Düello", "rounds": (3, 5), "critical": False,
        "enemy": {"hp": (45, 70), "atk": (8, 14), "skill": (1, 4)},
        "loot": (15, 60), "rep_win": 3, "flee_rep": -2,
    },
    "soygun": {
        "label": "Soygun Savunması", "rounds": (4, 6), "critical": True,
        "enemy": {"hp": (60, 100), "atk": (10, 18), "skill": (2, 5)},
        "loot": (40, 140), "rep_win": 4, "flee_rep": -1,
    },
    "turnuva": {
        "label": "Turnuva", "rounds": (3, 4), "critical": False,
        "enemy": {"hp": (50, 80), "atk": (9, 15), "skill": (2, 6)},
        "loot": (0, 0), "rep_win": 2, "flee_rep": -3,
        "stages": 3,           # eleme usulü: 3 rakip art arda
        "prize": (120, 250),   # final ödülü
    },
    "kusatma": {
        "label": "Kale Kuşatması", "rounds": (4, 6), "critical": True,
        "enemy": {"hp": (70, 110), "atk": (12, 20), "skill": (3, 6)},
        "loot": (80, 250), "rep_win": 8, "flee_rep": -4,
        "stages": 3,           # surlar → gedik → iç kale
    },
}

ENEMY_NAMES = {
    "duello":  ["Küstah Bıçkın", "Onur Düşkünü Asker", "Eski Rakip", "Şöhret Avcısı"],
    "soygun":  ["Yol Kesen Haydut", "Kervan Soyguncusu", "Maskeli Eşkıya", "Çete Artığı"],
    "turnuva": ["Turnuva Şampiyonu", "Demir Bilek", "Gözü Pek Şövalye", "Bozkır Kurdu"],
    "kusatma": ["Sur Muhafızı", "Kale Komutanı", "Son Savunucu", "Burç Okçusu"],
}


# ── Yaralanma sistemi ────────────────────────────────────────────────────
INJURY_TIERS = [
    # (ad, stat cezası, hafta, kalıcı mı)
    {"id": "siyrik",   "label": "Sıyrık",   "stat": None,       "delta": 0,  "weeks": 0,  "permanent": False},
    {"id": "yara",     "label": "Yara",     "stat": "strength", "delta": -1, "weeks": 4,  "permanent": False},
    {"id": "agir_yara","label": "Ağır Yara","stat": "stamina",  "delta": -2, "weeks": 8,  "permanent": False},
    {"id": "sakatlik", "label": "Sakatlık", "stat": "stamina",  "delta": -1, "weeks": 0,  "permanent": True},
]


def ensure_combat_fields(state):
    state["player"].setdefault("injuries", [])


def roll_injury(state, severity_roll, critical):
    """severity_roll 0..1 → yaralanma kademesi. critical=False ise ölüm yok."""
    player = state["player"]
    ensure_combat_fields(state)
    if severity_roll < 0.45:
        tier = INJURY_TIERS[0]
    elif severity_roll < 0.75:
        tier = INJURY_TIERS[1]
    elif severity_roll < 0.92:
        tier = INJURY_TIERS[2]
    else:
        if critical and random.random() < 0.35:
            player["dead"] = True
            return {"id": "olum", "label": "Ölümcül Yara"}
        tier = INJURY_TIERS[3]
        # GDD v8 D2: kalıcı sakatlık tavanı 3 — sarmalı durdur, sonrası
        # ağır yaraya (geçici) düşer. Yenilen oyuncu kalıcı çukura girmesin.
        kalici = sum(1 for i in player.get("injuries", []) if i.get("permanent"))
        if kalici >= 3:
            tier = INJURY_TIERS[2]
    if tier["stat"]:
        injury = {"id": tier["id"], "label": tier["label"], "stat": tier["stat"],
                  "delta": tier["delta"], "weeks_left": tier["weeks"],
                  "permanent": tier["permanent"]}
        player["injuries"].append(injury)
        if tier["permanent"]:
            stats = player.setdefault("stats", {})
            stats[tier["stat"]] = max(1, stats.get(tier["stat"], 1) + tier["delta"])
    return dict(INJURY_TIERS[INJURY_TIERS.index(tier)]) if tier in INJURY_TIERS else tier


def injury_penalty(player, stat):
    """Aktif (geçici) yaralanmaların stat cezası toplamı."""
    return sum(i["delta"] for i in player.get("injuries", [])
               if not i.get("permanent") and i.get("stat") == stat
               and i.get("weeks_left", 0) > 0)


def injury_tick(state):
    """Haftalık: geçici yaralar iyileşir. advance_time'dan çağrılır."""
    player = state["player"]
    injuries = player.get("injuries", [])
    if not injuries:
        return
    for i in injuries:
        if not i.get("permanent") and i.get("weeks_left", 0) > 0:
            i["weeks_left"] -= 1
    player["injuries"] = [i for i in injuries
                          if i.get("permanent") or i.get("weeks_left", 0) > 0]


# ── Çekirdek hesaplar ────────────────────────────────────────────────────
def _player_combat_stats(state):
    from items import equipment_bonuses
    player = state["player"]
    eq = equipment_bonuses(player)
    strength = player["stats"].get("strength", 1) + injury_penalty(player, "strength")
    stamina = player["stats"].get("stamina", 1) + injury_penalty(player, "stamina")
    combat = player["skills"].get("combat", 0)
    atk = 6 + max(0, strength) * 2 + combat * 2 + eq["attack"]
    dfn = 2 + max(0, stamina) + eq["defense"]
    return {"atk": atk, "def": dfn, "combat": combat,
            "ozel_unlocked": combat >= 3}


def _make_enemy(btype_key, stage=0):
    bt = BATTLE_TYPES[btype_key]
    scale = 1.0 + stage * 0.25       # turnuva/kuşatma aşamaları güçlenir
    return {
        "name": random.choice(ENEMY_NAMES[btype_key]),
        "hp": int(random.randint(*bt["enemy"]["hp"]) * scale),
        "max_hp": 0,  # aşağıda set edilir
        "atk": int(random.randint(*bt["enemy"]["atk"]) * scale),
        "skill": random.randint(*bt["enemy"]["skill"]) + stage,
    }


def _enemy_pick_card(enemy, player_last_card):
    """Rakip YZ: beceriye göre oyuncunun son kartına counter eğilimi."""
    if player_last_card and random.random() < 0.15 + enemy["skill"] * 0.06:
        # Oyuncunun son kartını yeneni seç
        counter = next(c for c, beaten in BEATS.items() if beaten == player_last_card)
        return counter
    return random.choice(CARDS)


def _intent_hint(true_card):
    """%70 gerçek niyet, %30 şaşırtmaca ipucu."""
    shown = true_card if random.random() < 0.70 else random.choice(CARDS)
    return t(random.choice(INTENT_HINTS[shown]))


# ── Savaş akışı ──────────────────────────────────────────────────────────
def start_combat(state, btype_key, bet=0):
    if btype_key not in BATTLE_TYPES:
        return None, "Geçersiz savaş türü."
    if state.get("active_combat"):
        return None, t("savas.hata_aktif")
    bt = BATTLE_TYPES[btype_key]
    player = state["player"]
    if btype_key == "turnuva":
        bet = max(0, min(int(bet or 0), int(player.get("money", 0))))
        player["money"] = round(player["money"] - bet, 1)
    enemy = _make_enemy(btype_key, stage=0)
    enemy["max_hp"] = enemy["hp"]
    combat = {
        "type": btype_key,
        "phase": "hazirlik",
        "stance": None,
        "round": 0,
        "max_rounds": random.randint(*bt["rounds"]),
        "stage": 0,
        "stages": bt.get("stages", 1),
        "enemy": enemy,
        "player_hp": player.get("health", 100),
        "player_last_card": None,
        "enemy_next_card": _enemy_pick_card(enemy, None),
        "bet": bet,
        "score": 0,            # tur kazanma sayacı (süre dolarsa belirleyici)
        "log": [t("savas.baslangic", tur=bt["label"], dusman=enemy["name"])],
    }
    combat["intent"] = _intent_hint(combat["enemy_next_card"])
    state["active_combat"] = combat
    return combat_view(state), None


def choose_stance(state, stance):
    combat = state.get("active_combat")
    if not combat or combat["phase"] != "hazirlik":
        return None, t("savas.hata_faz")
    if stance not in STANCES:
        return None, "Geçersiz duruş."
    combat["stance"] = stance
    combat["phase"] = "catisma"
    combat["round"] = 1
    combat["log"].append(t("savas.durus_secildi", durus=STANCES[stance]["label"]))
    return combat_view(state), None


def play_card(state, card):
    combat = state.get("active_combat")
    if not combat or combat["phase"] != "catisma":
        return None, t("savas.hata_faz")
    pstats = _player_combat_stats(state)
    if card not in CARDS:
        return None, "Geçersiz kart."
    if card == "ozel" and not pstats["ozel_unlocked"]:
        return None, t("savas.hata_ozel_kilitli")

    stance = STANCES[combat["stance"]]
    enemy = combat["enemy"]
    ecard = combat["enemy_next_card"]
    log = combat["log"]
    rnd = combat["round"]

    # Taş-kağıt-makas çözümü
    if BEATS[card] == ecard:        # oyuncu üstün
        winner = "player"
    elif BEATS[ecard] == card:      # rakip üstün
        winner = "enemy"
    else:                           # beraberlik → stat ağırlığı
        p_weight = pstats["atk"] + random.randint(0, 10)
        e_weight = enemy["atk"] + enemy["skill"] * 2 + random.randint(0, 10)
        winner = "player" if p_weight >= e_weight else "enemy"

    ozel_mult = 1.5 if card == "ozel" else 1.0
    if winner == "player":
        dmg = max(2, int((pstats["atk"] * stance["atk"] * ozel_mult
                          + random.randint(-4, 4)) * 0.7))
        enemy["hp"] = max(0, enemy["hp"] - dmg)
        combat["score"] += 1
        log.append(t("savas.tur_kazandin", tur=rnd, kart=CARD_LABELS[card],
                     dusman_kart=CARD_LABELS[ecard], hasar=dmg))
    else:
        edmg = max(1, int((enemy["atk"] * (1.5 if ecard == "ozel" else 1.0)
                           + random.randint(-3, 3)) - pstats["def"] * stance["def"] * 0.5))
        combat["player_hp"] = max(0, combat["player_hp"] - edmg)
        log.append(t("savas.tur_kaybettin", tur=rnd, kart=CARD_LABELS[card],
                     dusman_kart=CARD_LABELS[ecard], hasar=edmg))

    combat["player_last_card"] = card
    state["player"]["health"] = combat["player_hp"]

    # Tur sonu kontrolleri
    if enemy["hp"] <= 0:
        return _stage_won(state), None
    if combat["player_hp"] <= 0:
        return _combat_lost(state), None
    if rnd >= combat["max_rounds"]:
        # Süre doldu: skor belirler
        if combat["score"] * 2 >= combat["max_rounds"]:
            return _stage_won(state), None
        return _combat_lost(state), None

    combat["round"] += 1
    combat["enemy_next_card"] = _enemy_pick_card(enemy, card)
    combat["intent"] = _intent_hint(combat["enemy_next_card"])
    return combat_view(state), None


def flee(state):
    combat = state.get("active_combat")
    if not combat:
        return None, t("savas.hata_faz")
    bt = BATTLE_TYPES[combat["type"]]
    player = state["player"]
    player["reputation"] = player.get("reputation", 0) + bt["flee_rep"]
    result = {
        "outcome": "kaçış", "log": combat["log"] + [t("savas.kacis")],
        "rep_change": bt["flee_rep"], "injury": None, "loot": 0,
    }
    state.pop("active_combat", None)
    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "savaş_kaçış",
                t("savas.event_kacis", oyuncu=player["name"]))
    return result, None


def _stage_won(state):
    combat = state["active_combat"]
    bt = BATTLE_TYPES[combat["type"]]
    combat["stage"] += 1
    if combat["stage"] < combat["stages"]:
        # Sonraki aşama (turnuva turu / kuşatma evresi)
        enemy = _make_enemy(combat["type"], stage=combat["stage"])
        enemy["max_hp"] = enemy["hp"]
        combat["enemy"] = enemy
        combat["round"] = 1
        combat["score"] = 0
        combat["max_rounds"] = random.randint(*bt["rounds"])
        combat["enemy_next_card"] = _enemy_pick_card(enemy, None)
        combat["intent"] = _intent_hint(combat["enemy_next_card"])
        combat["log"].append(t("savas.asama_gecildi", asama=combat["stage"],
                               toplam=combat["stages"], dusman=enemy["name"]))
        view = combat_view(state)
        view["stage_won"] = True
        return view
    return _combat_won(state)


def _combat_won(state):
    combat = state["active_combat"]
    bt = BATTLE_TYPES[combat["type"]]
    player = state["player"]
    loot = random.randint(*bt["loot"]) if bt["loot"][1] > 0 else 0
    if combat["type"] == "turnuva":
        prize = random.randint(*bt["prize"])
        loot = prize + combat["bet"] * 3      # bahis 3 katı döner
    player["money"] = round(player.get("money", 0) + loot, 1)
    player["reputation"] = player.get("reputation", 0) + bt["rep_win"]
    # Kazanan da hafif yara alabilir (aldığı hasara göre)
    hp_lost_frac = 1 - combat["player_hp"] / max(1, player.get("health", 100) or 100)
    injury = None
    if random.random() < hp_lost_frac * 0.6:
        injury = roll_injury(state, random.uniform(0, 0.7), critical=False)
    from skills import add_skill_xp, add_stat_xp
    add_skill_xp(player, "combat", 4)
    add_stat_xp(player, "strength", 1)
    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "savaş_zaferi",
                t("savas.event_zafer", oyuncu=player["name"],
                  tur=bt["label"], dusman=combat["enemy"]["name"]))
    result = {
        "outcome": "zafer",
        "log": combat["log"] + [t("savas.zafer", ganimet=loot)],
        "loot": loot, "rep_change": bt["rep_win"],
        "injury": injury,
        "xp": {"combat": 4, "strength": 1},
    }
    state.pop("active_combat", None)
    return result


def _combat_lost(state):
    combat = state["active_combat"]
    bt = BATTLE_TYPES[combat["type"]]
    player = state["player"]
    player["health"] = max(1, combat["player_hp"]) if not bt["critical"] \
        else max(0, combat["player_hp"])
    # Yaralanma şiddeti: kalan cana ters orantılı
    severity = random.uniform(0.4, 1.0)
    injury = roll_injury(state, severity, critical=bt["critical"])
    money_loss = 0
    if combat["type"] == "soygun":
        money_loss = round(player.get("money", 0) * 0.25, 1)
        player["money"] = round(player["money"] - money_loss, 1)
    if player.get("dead"):
        outcome = "ölüm"
    else:
        outcome = "yenilgi"
        player["health"] = max(5, player["health"])
    from skills import add_skill_xp
    add_skill_xp(player, "combat", 1)   # yenilgiden de öğrenilir
    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "savaş_kaybı",
                t("savas.event_yenilgi", oyuncu=player["name"],
                  dusman=combat["enemy"]["name"]))
    result = {
        "outcome": outcome,
        "log": combat["log"] + [t("savas.yenilgi", yara=injury["label"] if injury else "—")],
        "injury": injury, "loot": -money_loss, "rep_change": 0,
    }
    state.pop("active_combat", None)
    return result


def combat_view(state):
    """UI için güvenli görünüm (rakibin gerçek kartı gizli, sadece niyet)."""
    combat = state.get("active_combat")
    if not combat:
        return None
    pstats = _player_combat_stats(state)
    bt = BATTLE_TYPES[combat["type"]]
    return {
        "type": combat["type"],
        "type_label": bt["label"],
        "phase": combat["phase"],
        "stance": combat["stance"],
        "round": combat["round"],
        "max_rounds": combat["max_rounds"],
        "stage": combat["stage"] + 1,
        "stages": combat["stages"],
        "enemy": {"name": combat["enemy"]["name"], "hp": combat["enemy"]["hp"],
                  "max_hp": combat["enemy"]["max_hp"]},
        "player_hp": combat["player_hp"],
        "intent": combat.get("intent"),
        "score": combat["score"],
        "ozel_unlocked": pstats["ozel_unlocked"],
        "stances": {k: {"label": v["label"], "atk": v["atk"], "def": v["def"]}
                    for k, v in STANCES.items()},
        "cards": [{"id": c, "label": CARD_LABELS[c],
                   "locked": c == "ozel" and not pstats["ozel_unlocked"]}
                  for c in CARDS],
        "log": combat["log"][-12:],
        "bet": combat.get("bet", 0),
    }


# ── 3C: Fraksiyon savaşı komutan modu ────────────────────────────────────
COMMANDER_DECISIONS = {
    "cephe": {
        "label": "Cephe Seçimi",
        "options": {
            "merkez": {"label": "Merkezden yüklen", "mod": 0.10, "risk": 0.05},
            "kanat":  {"label": "Kanatlardan kuşat", "mod": 0.15, "risk": 0.10},
            "tepe":   {"label": "Yüksek zemini tut", "mod": 0.05, "risk": 0.0},
        },
    },
    "ikmal": {
        "label": "İkmal Hattı",
        "options": {
            "bol":    {"label": "Bol erzak taşı (yavaş)", "mod": 0.05, "risk": 0.0},
            "hafif":  {"label": "Hafif seyahat (hızlı)", "mod": 0.10, "risk": 0.08},
        },
    },
    "baskin": {
        "label": "Gece Baskını",
        "options": {
            "evet":  {"label": "Gece baskını düzenle", "mod": 0.15, "risk": 0.12},
            "hayir": {"label": "Sabahı bekle", "mod": 0.0, "risk": 0.0},
        },
    },
}


def commander_modifier(state, decisions):
    """3 stratejik karar → savaş sonucunu ±%30 etkileyen çarpan.
    Her kararın getirisi riskle dengelidir; intelligence riski azaltır.
    Döndürür (çarpan, log)."""
    total = 0.0
    log = []
    intel = state["player"]["stats"].get("intelligence", 1)
    risk_shield = min(0.5, intel * 0.05)   # zeka riski yarıya kadar azaltır
    for key, cfg in COMMANDER_DECISIONS.items():
        choice = decisions.get(key)
        opt = cfg["options"].get(choice)
        if not opt:
            continue
        if opt["risk"] and random.random() < opt["risk"] * (1 - risk_shield):
            total -= opt["mod"]            # plan ters tepti
            log.append(t("savas.komutan_ters", karar=opt["label"]))
        else:
            total += opt["mod"]
            log.append(t("savas.komutan_tuttu", karar=opt["label"]))
    total = max(-0.30, min(0.30, total))
    return total, log
