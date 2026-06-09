"""
chronicle_summary.py
Oyuncunun tarihçesinden anlamlı bir haftalık/genel özet üretir.
"""
from collections import Counter
from narrative_engine import generate_year_story
from calendar_tr import WEEKS_PER_YEAR


# Olay tiplerinin Türkçe etiketi
EVENT_LABELS = {
    "doğum":           "Doğum",
    "ölüm":            "Ölüm",
    "evlilik":         "Evlilik",
    "savaş_ilanı":     "Savaş ilanı",
    "barış":           "Barış anlaşması",
    "kıtlık":          "Kıtlık",
    "şenlik":          "Şenlik",
    "ticaret":         "Ticaret",
    "hırsızlık":       "Hırsızlık",
    "hakaret":         "Hakaret",
    "dedikodu":        "Dedikodu",
    "hediye":          "Hediye",
    "çalışma":         "Çalışma",
    "görev_tamamlandı":"Görev tamamlandı",
    "savaş_zaferi":    "Savaş zaferi",
    "misilleme":       "Misilleme",
    "kaçırma":         "Kaçırma",
}

# Bu tipler önemli — ozette öne çıkar
IMPORTANT_TYPES = {
    "ölüm", "evlilik", "savaş_ilanı", "savaş_zaferi",
    "kaçırma", "kıtlık", "görev_tamamlandı", "barış",
}


def weekly_summary(state):
    """
    Son haftanın (4 turn) özetini çıkar.
    Hem makine tarafında kullanılabilir hem de frontend'e servis edilebilir.
    """
    chronicle = state.get("chronicle", [])
    history   = state.get("history", [])
    turn      = state.get("turn", 0)
    player    = state.get("player", {})

    # chronicle boşsa history'yi kullan
    events = chronicle if chronicle else history

    # Son 4 turn (1 ay)
    recent = [e for e in events if e.get("day", 0) >= max(0, turn - 4)]
    # En son 10 olay (her halükarda)
    last_10 = events[-10:] if events else []

    # Önemli olaylar (dönem sınırsız, son 20 olay içinde)
    last_20 = events[-20:] if events else []
    important = [
        e for e in last_20
        if e.get("type") in IMPORTANT_TYPES
    ]

    # Tip sayaçları (recent)
    type_counts = Counter(e.get("type", "bilinmeyen") for e in recent)
    top_types = [
        {"type": t, "label": EVENT_LABELS.get(t, t.replace("_", " ").title()), "count": c}
        for t, c in type_counts.most_common(5)
    ]

    # Hayatta mı özeti
    alive = player.get("alive", True)
    age   = player.get("age", 0)
    name  = player.get("name", "Karakter")
    profession = player.get("profession", "")

    # Kısa düz metin özet — narrative_engine ile zenginleştirilmiş
    def _brief():
        recent_events = [e for e in events if e.get("day", 0) >= max(0, turn - WEEKS_PER_YEAR)]
        return generate_year_story(recent_events, player)

    return {
        # Sayısal meta
        "total_events":   len(events),
        "recent_events":  last_10,
        "recent_count":   len(recent),
        "important_events": important[-5:],   # son 5 önemli olay
        "top_event_types": top_types,

        # Metin özeti
        "brief": _brief(),

        # Oyuncu anlık durum
        "player_snapshot": {
            "name":       name,
            "age":        age,
            "profession": profession,
            "alive":      alive,
            "reputation": player.get("reputation", 0),
            "money":      player.get("money", 0),
            "health":     player.get("health", 100),
        },

        # Zaman bağlamı
        "turn": turn,
        "period": f"Turn {max(0, turn - 4)}–{turn}",
    }


def full_chronicle(state, limit=50):
    """
    Kronik sayfası için tüm geçmişi yapılandırılmış döndür.
    Her yıl için generate_year_story ile anlatılı özet eklenir.
    """
    player = state.get("player", {})
    events = state.get("chronicle", state.get("history", []))
    recent = list(reversed(events[-limit:]))

    # Ay/dönem grupla
    grouped = {}
    for ev in recent:
        day    = ev.get("day", 0)
        period = f"Turn {(day // 4) * 4 + 1}–{(day // 4) * 4 + 4}"
        grouped.setdefault(period, []).append(ev)

    periods = [
        {"period": p, "events": evs}
        for p, evs in grouped.items()
    ]

    # Yıllık hikaye özetleri — her oyun yılı için bir paragraf
    year_stories = []
    for year_idx in range(max(0, state.get("turn", 0) // WEEKS_PER_YEAR) + 1):
        year_start = year_idx * WEEKS_PER_YEAR
        year_end   = year_start + WEEKS_PER_YEAR
        year_evs   = [e for e in events if year_start <= e.get("day", 0) < year_end]
        if year_evs or year_idx == 0:
            # Oyuncunun o yıldaki yaşını tahmin et
            year_player = dict(player)
            year_player["age"] = player.get("base_age", 7) + year_idx
            year_stories.append({
                "year_idx":   year_idx,
                "year_label": f"Yıl {year_idx + 1}",
                "story":      generate_year_story(year_evs, year_player),
                "event_count": len(year_evs),
            })

    return {
        "total":       len(events),
        "periods":     periods,
        "brief":       weekly_summary(state)["brief"],
        "year_stories": list(reversed(year_stories)),  # En yeni yıl önce
    }
