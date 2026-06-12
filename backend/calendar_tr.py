"""Turkish in-game calendar — ZAMAN REFORMU (GDD v8).

1 tur = 1 AY. 12 ay = 1 yıl. Mevsim = 3 tur.

Neden: hafta bazında 7→13 yaş 312 ilerleme, tam ömür ~3000 dokunuştu —
oyunu öldüren tempo. Ay bazında: çocukluk 72, tam ömür ~750 ilerleme;
mevsimler gerçekten hissediliyor.

NOT: Değişken adları geriye uyum için korunur (WEEKS_PER_* her yerde
import ediliyor) — anlamları artık 'tur' birimidir. Tüm motor tur-bazlı
çalıştığı için tek kaynaktan senkron olur.

Months 1..12: Ocak ... Aralık.
Seasons:
  İlkbahar: Mart, Nisan, Mayıs (3,4,5)
  Yaz:      Haziran, Temmuz, Ağustos (6,7,8)
  Sonbahar: Eylül, Ekim, Kasım (9,10,11)
  Kış:      Aralık, Ocak, Şubat (12,1,2)
"""

WEEKS_PER_MONTH = 1                 # 1 tur = 1 ay
MONTHS_PER_YEAR = 12
WEEKS_PER_YEAR = WEEKS_PER_MONTH * MONTHS_PER_YEAR  # 12 tur = 1 yıl
BASE_YEAR = 1247  # in-world starting year

MONTHS_TR = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
]

SEASON_OF_MONTH = {
    1: "Kış", 2: "Kış",
    3: "İlkbahar", 4: "İlkbahar", 5: "İlkbahar",
    6: "Yaz", 7: "Yaz", 8: "Yaz",
    9: "Sonbahar", 10: "Sonbahar", 11: "Sonbahar",
    12: "Kış",
}

# Season effects on world (e.g., farming/hunting)
SEASON_EFFECTS = {
    "İlkbahar": {"production_mult": 1.15, "hunger_mult": 0.9,
                 "flavor": "Çiçekler açıyor, tarlalar uyanıyor."},
    "Yaz":      {"production_mult": 1.25, "hunger_mult": 1.0,
                 "flavor": "Sıcak uzun günler, hasat zamanı yaklaşıyor."},
    "Sonbahar": {"production_mult": 1.10, "hunger_mult": 1.0,
                 "flavor": "Yapraklar düşüyor, halk kışa hazırlık yapıyor."},
    "Kış":      {"production_mult": 0.55, "hunger_mult": 1.3,
                 "flavor": "Soğuk acımasız, sandıklar incelir."},
}


def current_calendar(state):
    """Return current in-game calendar info based on state['turn']."""
    turn = state.get("turn", 0)
    year_idx = turn // WEEKS_PER_YEAR
    rem = turn % WEEKS_PER_YEAR
    month_idx = rem // WEEKS_PER_MONTH  # 0..11
    week_in_month = (rem % WEEKS_PER_MONTH) + 1  # 1..4
    month_no = month_idx + 1
    month_name = MONTHS_TR[month_idx]
    season = SEASON_OF_MONTH[month_no]
    return {
        "turn": turn,
        "week_in_month": week_in_month,
        "month_no": month_no,
        "month_name": month_name,
        "year": BASE_YEAR + year_idx,
        "year_in_game": year_idx,
        "season": season,
        "season_flavor": SEASON_EFFECTS[season]["flavor"],
    }


def player_age(state):
    """Player age = base_age + completed years since start."""
    base = state.get("player", {}).get("base_age", 7)
    return base + (state.get("turn", 0) // WEEKS_PER_YEAR)


def season_for_turn(turn):
    rem = turn % WEEKS_PER_YEAR
    month_idx = rem // WEEKS_PER_MONTH
    return SEASON_OF_MONTH[month_idx + 1]
