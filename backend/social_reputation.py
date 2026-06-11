"""
TOPLUMSAL STATÜ VE İTİBAR SİSTEMİ
====================================
reputation  — genel itibar   (-100 … +100)
honor       — şeref          (0 … 100)
fear        — korku seviyesi (0 … 100)
fame        — ün             (0 … 100)

Bu modül:
- Değerleri değiştiren yardımcı fonksiyonlar
- NPC'lerin bu değerlere göre tepkilerini döndüren fonksiyonlar
- Ticaret fiyatlarına uygulanan çarpanlar
- Saldırı ihtimali hesabı
"""

from __future__ import annotations
import random

# ─── Sınır yardımcıları ────────────────────────────────────────────────────

def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


# ─── Değer değiştirme ──────────────────────────────────────────────────────

def change_reputation(player: dict, delta: float, reason: str = "") -> str:
    """reputation'ı değiştir, sınırla ve açıklama döndür."""
    old = player.get("reputation", 0)
    player["reputation"] = _clamp(old + delta, -100, 100)
    diff = player["reputation"] - old
    if diff == 0:
        return ""
    sign = "+" if diff > 0 else ""
    return f"İtibar {sign}{diff:.0f} ({reason})" if reason else f"İtibar {sign}{diff:.0f}"


def change_honor(player: dict, delta: float, reason: str = "") -> str:
    old = player.get("honor", 0)
    player["honor"] = _clamp(old + delta, 0, 100)
    diff = player["honor"] - old
    if diff == 0:
        return ""
    sign = "+" if diff > 0 else ""
    return f"Şeref {sign}{diff:.0f} ({reason})" if reason else f"Şeref {sign}{diff:.0f}"


def change_fear(player: dict, delta: float, reason: str = "") -> str:
    old = player.get("fear", 0)
    player["fear"] = _clamp(old + delta, 0, 100)
    diff = player["fear"] - old
    if diff == 0:
        return ""
    sign = "+" if diff > 0 else ""
    return f"Korku {sign}{diff:.0f} ({reason})" if reason else f"Korku {sign}{diff:.0f}"


def change_fame(player: dict, delta: float, reason: str = "") -> str:
    old = player.get("fame", 0)
    player["fame"] = _clamp(old + delta, 0, 100)
    diff = player["fame"] - old
    if diff == 0:
        return ""
    sign = "+" if diff > 0 else ""
    return f"Ün {sign}{diff:.0f} ({reason})" if reason else f"Ün {sign}{diff:.0f}"


# ─── Eylem tabanlı otomatik güncellemeler ──────────────────────────────────

def apply_good_deed(player: dict, magnitude: int = 1) -> list[str]:
    """Yardım etmek, iyilik yapmak → itibar & şeref artar."""
    msgs = []
    msgs.append(change_reputation(player, 2 * magnitude, "iyi davranış"))
    msgs.append(change_honor(player, 3 * magnitude, "iyi davranış"))
    return [m for m in msgs if m]


def apply_heroic_act(player: dict) -> list[str]:
    """Kahramanlık → ün artar, şeref & itibar da artar."""
    msgs = []
    msgs.append(change_reputation(player, 5, "kahramanlık"))
    msgs.append(change_honor(player, 5, "kahramanlık"))
    msgs.append(change_fame(player, 8, "kahramanlık"))
    return [m for m in msgs if m]


def apply_crime_committed(player: dict, severity: int = 1) -> list[str]:
    """Suç işlemek → itibar düşer, korku biraz artar."""
    msgs = []
    msgs.append(change_reputation(player, -3 * severity, "suç"))
    msgs.append(change_honor(player, -2 * severity, "suç"))
    msgs.append(change_fear(player, 1 * severity, "suç"))
    return [m for m in msgs if m]


def apply_attack_or_kill(player: dict, victim_status: int = 1) -> list[str]:
    """Saldırmak / öldürmek → itibar düşer, korku artar."""
    msgs = []
    msgs.append(change_reputation(player, -5 * victim_status, "saldırı"))
    msgs.append(change_honor(player, -4 * victim_status, "saldırı"))
    msgs.append(change_fear(player, 6 * victim_status, "saldırı"))
    return [m for m in msgs if m]


def apply_battle_victory(player: dict) -> list[str]:
    """Savaş zaferi → ün & biraz korku artar."""
    msgs = []
    msgs.append(change_reputation(player, 2, "savaş zaferi"))
    msgs.append(change_fame(player, 3, "savaş zaferi"))
    msgs.append(change_fear(player, 2, "savaş zaferi"))
    return [m for m in msgs if m]


def apply_help_npc(player: dict) -> list[str]:
    """NPC'ye yardım etmek → itibar & şeref artar."""
    return apply_good_deed(player, magnitude=1)


# ─── NPC tepki metinleri ───────────────────────────────────────────────────

_HIGH_REP_LINES = [
    "Senin hakkında iyi şeyler duydum.",
    "İtibarın önünden yürüyor, hoş geldin.",
    "Adın bu çevrede saygıyla anılıyor.",
    "Güvenilir biri olduğunu biliyorum.",
    "Seninle iş yapmak şeref olur.",
]

_LOW_REP_LINES = [
    "Sana güvenmiyorum.",
    "Adın pek iyi çıkmıyor bu taraflarda.",
    "Seninle ilişki içinde olmak istemiyorum.",
    "Duygularım karışık; dikkatli olalım.",
    "İşim bitmişse gidebilirsin.",
]

_HIGH_FEAR_LINES = [
    "Sorun çıkarmak istemem…",
    "Seninle kavga etmek aklımda yok.",
    "Çevrenizde pek iyi şeyler söylemiyor insanlar… dikkatli konuşayım.",
    "Sakin olalım. Burada sorun istemiyorum.",
    "Adını duydum. Dikkatli olacağım.",
]

_HIGH_FAME_LINES = [
    "Seni tanımıyor muyum? Evet, o sen değil misin!",
    "Pek çok kişi senden bahsediyor, şaşırtıcı!",
    "Şöhretin bu köye kadar ulaşmış demek.",
    "Dedikodular doğruymuş, gerçekten karşılaştık.",
    "Seni görmek ayrı bir şeref!",
]

_HIGH_HONOR_LINES = [
    "Onurlu bir kişilikten beklediğim bu değildi.",
    "Şerefin senin için önemli olduğunu görüyorum.",
    "Sözüne güvenirim, şerefli biri olduğun biliniyor.",
]


def npc_reaction_flavor(player: dict, rng: random.Random = None) -> str | None:
    """
    Oyuncunun itibar değerlerine göre NPC'nin ekleyeceği kısa bir cümle.
    En baskın değeri önceliklendirir.
    rng verilmezse global random kullanılır.
    """
    r = rng or random
    rep  = player.get("reputation", 0)
    fear = player.get("fear", 0)
    fame = player.get("fame", 0)
    honor = player.get("honor", 0)

    # Öncelik: korku > ün > yüksek itibar > düşük itibar > şeref
    if fear >= 40:
        return r.choice(_HIGH_FEAR_LINES)
    if fame >= 30:
        return r.choice(_HIGH_FAME_LINES)
    if rep >= 30:
        return r.choice(_HIGH_REP_LINES)
    if rep <= -20:
        return r.choice(_LOW_REP_LINES)
    if honor >= 40:
        return r.choice(_HIGH_HONOR_LINES)
    return None


# ─── Ticaret fiyatı çarpanı ────────────────────────────────────────────────

def trade_price_multiplier(player: dict, action: str) -> float:
    """
    action = "al" → satıcı oyuncuya fiyat uygular
    action = "sat" → alıcı oyuncuya fiyat öner

    Yüksek itibar → satın alırken ucuz, satarken pahalı
    Düşük itibar  → tam tersi
    """
    rep  = player.get("reputation", 0)
    fame = player.get("fame", 0)
    fear = player.get("fear", 0)

    # Temel itibar bonusu: max ±8%
    rep_factor = rep * 0.0008         # +30 itibar → +2.4%
    # Ünlü biri daha iyi fiyat alır
    fame_factor = fame * 0.0004       # +50 ün → +2%
    # Korku fiyatı olumsuz etkiler (tüccar kaçmak ister)
    fear_penalty = fear * 0.0003      # -50 korku → -1.5%

    # S10: Lonca üyeliği bonusu — tüccar loncası veya zanaatkar loncası üyesiyse
    lonca_bonus = 0.0
    memberships = player.get("faction_memberships", {})
    for _fid, mem in memberships.items():
        if mem.get("status") == "active":
            faction_type = mem.get("type", "")
            if faction_type in ("tuccar_loncasi", "zanaatkar_loncasi"):
                # Her rank +1% avantaj (rank_index 0-bazlı)
                rank_idx = mem.get("rank_index", 0)
                lonca_bonus += 0.01 * (rank_idx + 1)
    # Lonca bonusu max %5 ile sınırlı
    lonca_bonus = min(0.05, lonca_bonus)

    combined = rep_factor + fame_factor - fear_penalty + lonca_bonus

    if action == "al":
        # İtibar artınca alım fiyatı düşer
        return max(0.80, 1.0 - combined)
    else:
        # İtibar artınca satış fiyatı yükselir
        return min(1.20, 1.0 + combined)


# ─── Rastgele saldırı ihtimali (NPC'nin oyuncuya saldırması) ───────────────

def npc_attack_probability(player: dict, base_prob: float = 0.05) -> float:
    """
    Düşük itibar + düşük korku → NPC'ler saldırabilir.
    Yüksek korku → NPC'ler kaçar.
    """
    rep  = player.get("reputation", 0)
    fear = player.get("fear", 0)

    # Düşük itibar saldırı şansını artırır
    rep_modifier  = max(0, -rep) * 0.002   # -50 itibar → +10%
    # Yüksek korku saldırı şansını düşürür
    fear_modifier = fear * 0.003           # +40 korku → -12%

    prob = base_prob + rep_modifier - fear_modifier
    return _clamp(prob, 0.0, 0.60)


# ─── Fırsat erişim kontrolü ────────────────────────────────────────────────

def opportunity_accessible(player: dict, min_rep: int = 0,
                            min_fame: int = 0, min_honor: int = 0) -> bool:
    """Belirli bir fırsatın oyuncuya açık olup olmadığını kontrol eder."""
    return (
        player.get("reputation", 0) >= min_rep
        and player.get("fame", 0) >= min_fame
        and player.get("honor", 0) >= min_honor
    )


# ─── Lord/Kral kabul kontrolü ──────────────────────────────────────────────

def lord_will_receive(player: dict, npc_profession: str) -> bool:
    """Lord veya kral oyuncuyu huzuruna kabul eder mi?"""
    rep   = player.get("reputation", 0)
    fame  = player.get("fame", 0)
    honor = player.get("honor", 0)
    social_score = rep + fame * 0.5 + honor * 0.3

    if npc_profession == "kral":
        return social_score >= 40
    if npc_profession in ("lord", "general"):
        return social_score >= 15
    return True


# ─── Oyuncu sosyal özeti (API'ye eklenebilir) ─────────────────────────────

def social_summary(player: dict) -> dict:
    """Oyuncunun toplumsal statüsünün özet sözlüğü."""
    rep   = player.get("reputation", 0)
    honor = player.get("honor", 0)
    fear  = player.get("fear", 0)
    fame  = player.get("fame", 0)

    if rep >= 60:
        rep_label = "Efsanevi"
    elif rep >= 30:
        rep_label = "Saygın"
    elif rep >= 10:
        rep_label = "Bilinen"
    elif rep >= -10:
        rep_label = "Sıradan"
    elif rep >= -30:
        rep_label = "Şüpheli"
    else:
        rep_label = "Kötü Şöhret"

    return {
        "reputation": rep,
        "reputation_label": rep_label,
        "honor": honor,
        "fear": fear,
        "fame": fame,
        "trade_buy_mult": round(trade_price_multiplier(player, "al"), 3),
        "trade_sell_mult": round(trade_price_multiplier(player, "sat"), 3),
        "attack_risk": round(npc_attack_probability(player), 3),
    }
