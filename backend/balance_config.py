"""
balance_config.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Tüm oyun denge parametreleri tek dosyada.
Değiştirmek için buraya bak — başka dosyaya gerek yok.
"""

# ─── ZAMAN SİSTEMİ ────────────────────────────────────────────────────────
TIME = {
    "hours_per_action": 2,       # Her aksiyon kaç saat alır
    "hours_per_day": 24,         # Günde kaç saat
    "days_per_week": 7,          # Haftada kaç gün
    "weeks_per_month": 4,        # Ayda kaç hafta
    "months_per_year": 12,       # Yılda kaç ay
    "ticks_per_week": 1,         # advance_time'daki granülasyon
}

# ─── OYUNCU BAŞLANGIÇ DEĞERLERİ ───────────────────────────────────────────
PLAYER_START = {
    "health": 100,
    "hunger": 100,
    "money": 10,
    "reputation": 0,
    "crime": 0,
    "base_age": 7,
}

# ─── STAT PROGRESSION ─────────────────────────────────────────────────────
STAT = {
    "max": 10,
    "xp_per_level_base": 10,     # İlk level için gereken XP
    "xp_per_level_scale": 5,     # Her levelde eklenen XP
    # Stat'in sınır değeri — bunu aşmak imkansız
    "hard_cap": 10,
}

# ─── SKILL PROGRESSION ────────────────────────────────────────────────────
SKILL = {
    "max": 10,
    "xp_per_level_base": 10,
    "xp_per_level_scale": 5,
    "hard_cap": 10,
    # Aşağıdaki değerler kaç haftada bir skill XP azalır (kullanılmazsa)
    "decay_weeks": 0,            # 0 = decay yok
}

# ─── AÇLIK / SAĞLIK ───────────────────────────────────────────────────────
SURVIVAL = {
    "hunger_loss_per_week": 5,   # Haftalık açlık azalması
    "hunger_loss_min": 2,        # En az bu kadar düşer (stamina ile azaltılır)
    "stamina_hunger_reduction": 0.15,  # Her stamina puanı açlık kaybını bu kadar azaltır
    "starvation_damage": 2,      # Açlık sıfırda haftalık hasar
    "health_regen_per_week": 1,  # Dolu mide = haftalık iyileşme
    "old_age_death_threshold": 70,
    "old_age_death_chance": 0.02,
    # Mevsim açlık çarpanları
    "season_hunger_mult": {
        "İlkbahar": 1.0,
        "Yaz": 1.1,
        "Sonbahar": 0.9,
        "Kış": 1.3,
    },
}

# ─── NPC DAVRANIŞI ────────────────────────────────────────────────────────
NPC = {
    # Günlük rutine göre haftalık pasif XP kazanımı
    "routine_xp_per_week": 2,
    # Goal progress — her hafta kadar ilerler
    "goal_progress_per_week_min": 1,
    "goal_progress_per_week_max": 4,
    # İlişki haftalık doğal bozulması (aktif olmayan ilişkiler)
    "relationship_decay_per_week": 0,  # 0 = decay yok (şimdilik)
    # Misilleme — revenge_pending olan NPC'nin saldırı şansı
    "revenge_attack_chance_per_week": 0.08,
    # NPC ruh hali normalizasyon hızı
    "mood_normalize_weeks": 3,
    # NPC max hafıza girişi
    "memory_max": 12,
    # Daily log max
    "daily_log_max": 8,
    # Goal history max (completed goals list cap)
    "goal_history_max": 20,
}

# ─── İLİŞKİ SİSTEMİ ───────────────────────────────────────────────────────
RELATIONSHIP = {
    "max": 100,
    "min": -100,
    "dating_threshold": 20,      # Çıkma teklifi için min ilişki
    "proposal_threshold": 50,    # Evlilik teklifi için min ilişki
    # İltifat cooldown — kaç haftada bir etkili
    "compliment_cooldown_weeks": 3,
    # Spam cezası başladığı penalty oranı
    "compliment_spam_threshold": 0.5,
}

# ─── SUÇ SİSTEMİ ──────────────────────────────────────────────────────────
CRIME = {
    "soldier_check_min_crime": 30,   # Bu altında asker tetiklenmez
    "jail_threshold": 80,            # Bu üstünde hapis cezası
    "jail_weeks_min": 2,
    "jail_weeks_max": 6,
    "fine_base": 50,
    "fine_per_crime_point": 2,
    "crime_decay_per_week": 1,       # Her hafta crime puanı düşer (zaman geçince unutulur)
    # Eylem başına suç maliyetleri
    "cost": {
        "saldırı": 25,
        "kaçırma": 65,
        "hırsızlık": 35,
        "cinayet": 90,
        "dedikodu": 0,
    },
}

# ─── EKONOMİ ──────────────────────────────────────────────────────────────
ECONOMY = {
    # Fiyat dalgalanması
    "price_volatility": 0.15,        # Her hafta ±%15 fiyat değişimi
    "min_price_ratio": 0.3,          # Base fiyatın en az %30'u
    "max_price_ratio": 3.0,          # Base fiyatın en fazla 3 katı
    # Ticaret kâr marjı
    "trade_margin_base": 0.10,       # %10 fiyat farkı
    "trade_skill_bonus": 0.02,       # Her trade skill seviyesi +%2 kâr
    # Ekonomi enflasyonu (haftalık)
    "inflation_per_week": 0.001,     # %0.1 haftalık enflasyon
    # Lokasyon zenginlik limitleri
    "wealth_max": 100,
    "wealth_min": 1,
}

# ─── ÜRETİM ZİNCİRLERİ (Faz 1A) ───────────────────────────────────────────
PRODUCTION_BALANCE = {
    # Her hammadde üreticisi NPC kaç kişilik nüfusu temsil eder
    "people_per_producer": 6,
    # Temsil çarpanı tavanı (tek çiftçi koca şehri tek başına doyuramasın)
    "household_factor_max": 8.0,
    # Zanaatkârın dönüşüm kârından servetine yazılan pay (kalanı vergi/işçilik)
    "craftsman_wage_share": 0.4,
}

# Haftalık nüfus tüketimi: mal → nüfus_oranı (pop × oran = tüketilen adet)
# Talep yaratır + arzı düşürür. Lüks mallar (şarap, mobilya, kıyafet)
# lokasyon zenginliğiyle ölçeklenir (wealth_scaled).
CONSUMPTION = {
    "ekmek":   {"frac": 0.012, "wealth_scaled": False},
    "buğday":  {"frac": 0.006, "wealth_scaled": False},
    "et":      {"frac": 0.006, "wealth_scaled": False},
    "un":      {"frac": 0.002, "wealth_scaled": False},   # ev fırınları
    "odun":    {"frac": 0.004, "wealth_scaled": False},   # ısınma
    "kumaş":   {"frac": 0.002, "wealth_scaled": False},
    "üzüm":    {"frac": 0.004, "wealth_scaled": False},  # taze meyve
    "yün":     {"frac": 0.002, "wealth_scaled": False},  # ev eğirmeciliği
    "deri":    {"frac": 0.0015, "wealth_scaled": False}, # ev kullanımı
    "kıyafet": {"frac": 0.0015, "wealth_scaled": True},
    "çizme":   {"frac": 0.001,  "wealth_scaled": True},
    "alet":    {"frac": 0.001,  "wealth_scaled": False},  # çiftçi/zanaat ihtiyacı
    "şarap":   {"frac": 0.002,  "wealth_scaled": True},
    "mobilya": {"frac": 0.0005, "wealth_scaled": True},
    "demir":   {"frac": 0.001,  "wealth_scaled": False},
    "silah":   {"frac": 0.0008, "wealth_scaled": False},
    "zırh":    {"frac": 0.0003, "wealth_scaled": False},
}

# ─── DÜNYA OLAYLARI ───────────────────────────────────────────────────────
WORLD_EVENTS = {
    # Her ayda kaç event tetiklenir (ortalama)
    "events_per_month_min": 1,
    "events_per_month_max": 3,
    # Oyuncu lokasyonundaki olayların etki çarpanı
    "player_location_multiplier": 1.5,
    # State-based trigger eşikleri
    "drought_wealth_threshold": 30,       # Servet bu altında → kuraklık şansı artar
    "bandit_crime_threshold": 50,         # Bölge suç bu üstünde → haydut şansı artar
    "festival_stability_threshold": 70,  # İstikrar bu üstünde → festival şansı artar
}

# ─── REPUTATION SİSTEMİ ───────────────────────────────────────────────────
REPUTATION = {
    "max": 100,
    "min": -100,
    # Haftalık doğal azalma (aktif olmazsan unutulursun)
    "decay_per_week": 0,             # 0 = decay yok şimdilik
    # Eşik değerleri (unvan için)
    "thresholds": {
        -50: "Sürgün",
        -20: "Güvenilmez",
        0:   "Tanınmayan",
        20:  "Tanınan",
        50:  "Saygın",
        80:  "Efsane",
    },
}

# ─── GAME LOOP ────────────────────────────────────────────────────────────
GAME_LOOP = {
    # Bir aksiyondan sonra kaç NPC tepki verebilir
    "max_npc_reactions_per_action": 3,
    # Cascade event zinciri max derinliği
    "max_cascade_depth": 2,
    # Frontend'e gönderilen max sonuç özeti uzunluğu
    "max_consequence_lines": 6,
    # Action queue max boyutu
    "action_queue_max": 10,
}

# ─── FACTION ÜYELİK SİSTEMİ ───────────────────────────────────────────────
FACTION_MEMBERSHIP = {
    # ── Gönüllü ayrılma — birikim tablosu (hafta) ─────────────────────────
    # İndeks = kaçıncı ayrılma (0-bazlı). Son değerden sonrası kalıcı yasak.
    "leave_cooldown_table": [4, 26, 52, -1],   # -1 = kalıcı yasak
    # Kovulma — birikim tablosu (hafta)
    "kicked_cooldown_table": [8, 39, -1],       # 3. kovulmada kalıcı
    # İsyan — birikim tablosu (hafta)
    "rebel_ban_table":      [26, 52, -1],       # 2. isyanda kalıcı

    # ── Temiz geçmiş indirimi ──────────────────────────────────────────────
    # Kesintisiz aktif üye kalınan hafta sayısı bu eşiği geçerse
    # bir sonraki ihlalde sayaç 1 basamak geri düşer (minimum 0).
    "good_standing_weeks": 104,   # 2 yıl (~104 hafta)
    # İndirim uygulandığında cooldown tablosu değeri kaçta kesilir (yarı)
    "good_standing_divisor": 2,

    # ── Kalıcı yasak etiketi ───────────────────────────────────────────────
    "permanent_ban_marker": -1,

    # ── Oyuncu üyelik durumları ────────────────────────────────────────────
    "statuses": {
        "active":   "Aktif Üye",
        "left":     "Ayrıldı",
        "kicked":   "Kovuldu",
        "rebel":    "İsyancı",
        "banned":   "Yasaklı",
    },
}

# ─── MEKTEP ───────────────────────────────────────────────────────────────
SCHOOL = {
    "lessons_per_week": 1,           # Haftada max ders sayısı
    "exam_frequency_weeks": 4,       # Sınav sıklığı
    "exam_pass_base_chance": 0.35,
    "exam_stat_bonus": 0.07,         # Her stat puanı → +%7 geçme şansı
    "exam_lesson_count_bonus": 0.03, # Her ders sayısı → +%3 geçme şansı
    "exam_pass_xp": 15,              # Sınav geçince bonus XP
    "club_weekly_passive_xp": True,  # Kulüp üyesi pasif XP alır
}

# ─── YETİŞKİNLİK BONUSLARI ────────────────────────────────────────────────
COMING_OF_AGE = {
    "stat_bonus": {"strength": 1, "intelligence": 1, "charisma": 1, "stamina": 1},
    "skill_bonus": {"combat": 1, "trade": 1, "crafting": 1, "social": 1},
    "money_bonus": 25,
}

# ─── ŞEHİR YÖNETİMİ ───────────────────────────────────────────────────────
GOVERNANCE = {
    "min_age_lord":          13,
    "min_age_city_lord":     16,
    "min_age_king":          18,
    "min_reputation_lord":   30,
    "min_reputation_king":   70,
    "legitimacy_decay_rate": 2,    # haftada doğal meşruiyet düşüşü
    "happiness_tax_threshold": 25, # bu %'nin üstünde vergi mutluluğu düşürür
    "revolt_happiness_threshold":  20,  # mutluluk bu altına düşünce isyan riski
    "revolt_legitimacy_threshold": 15,  # meşruiyet bu altına düşünce lord düşer
}

# ─── FACTION TİPLERİ & HİYERARŞİLER ──────────────────────────────────────
FACTION_TYPES = [
    "krallık_ordusu",
    "tuccar_loncasi",
    "zanaatkar_loncasi",
    "paralı_asker",
    "ilim_cemiyeti",
    "sifaci_birligi",
    "dini_tarikat",
    "oyuncu_kumpanya",
    "eskiya_cetesi",
    "gizli_cemiyet",
]

FACTION_TYPE_LABELS = {
    "krallık_ordusu":   "Krallık Ordusu",
    "tuccar_loncasi":   "Tüccar Loncası",
    "zanaatkar_loncasi":"Zanaatkar Loncası",
    "paralı_asker":     "Paralı Asker Loncası",
    "ilim_cemiyeti":    "İlim Cemiyeti",
    "sifaci_birligi":   "Şifacı Birliği",
    "dini_tarikat":     "Dini Tarikat",
    "oyuncu_kumpanya":  "Seyyah Kumpanya",
    "eskiya_cetesi":    "Eşkıya Çetesi",
    "gizli_cemiyet":    "Gizli Cemiyet",
}

FACTION_TYPE_GOALS = {
    "krallık_ordusu":   "Düzeni korumak, toprakları savunmak",
    "tuccar_loncasi":   "Ticaret yolları, fiyat istikrarı",
    "zanaatkar_loncasi":"Zanaat standartları, tekel",
    "paralı_asker":     "İş bulmak, itibar korumak",
    "ilim_cemiyeti":    "Bilgiyi toplamak, yaymak",
    "sifaci_birligi":   "Halk sağlığı, ilaç tekeli",
    "dini_tarikat":     "İnancı yaymak, manevi rehberlik",
    "oyuncu_kumpanya":  "Geçim, şöhret, hikayeleri yaşatmak",
    "eskiya_cetesi":    "Hayatta kalmak, zenginleşmek",
    "gizli_cemiyet":    "Güç dengesini yönetmek",
}

FACTION_HIERARCHIES = {
    "krallık_ordusu": [
        "Er", "Onbaşı", "Çavuş", "Teğmen", "Yüzbaşı",
        "Binbaşı", "Albay", "General", "Başkomutan", "Kral",
    ],
    "tuccar_loncasi": [
        "Çırak", "Kalfa", "Usta", "Kıdemli Usta",
        "Lonca Temsilcisi", "Lonca Başkanı", "Büyük Üstat", "Lonca Patriği",
    ],
    "zanaatkar_loncasi": [
        "Çırak", "Kalfa", "Usta", "Baş Usta", "Lonca Nazırı", "Büyük Usta",
    ],
    "paralı_asker": [
        "Acemi", "Kılıç Kardeşi", "Tecrübeli Savaşçı", "Kıdemli Savaşçı",
        "Çavuş", "Yüzbaşı", "Kaptan", "Kaptanlar Kaptanı", "Şef",
    ],
    "ilim_cemiyeti": [
        "Öğrenci", "Araştırmacı", "Alim", "Kıdemli Alim",
        "Üstad", "Büyük Üstad", "Baş Kadı",
    ],
    "sifaci_birligi": [
        "Çırak", "Şifacı Yardımcısı", "Şifacı",
        "Baş Şifacı", "Üstad Hekim", "Büyük Hekim",
    ],
    "dini_tarikat": [
        "Novice", "Rahip", "Keşiş", "Baş Keşiş", "Papaz",
        "Başpapaz", "Piskopos", "Baş Piskopos", "Patrik",
    ],
    "oyuncu_kumpanya": [
        "Figüran", "Oyuncu", "Kıdemli Oyuncu",
        "Solist", "Yıldız", "Kumpanya Lideri",
    ],
    "eskiya_cetesi": [
        "Yeni Kan", "Haydut", "Tecrübeli Haydut",
        "Sağ El", "Çete Başı", "Efsane",
    ],
    "gizli_cemiyet": [
        "Gölge", "Ajan", "Kıdemli Ajan", "Uzman",
        "Müfettiş", "Gölge Konseyi Üyesi", "Büyük Üstat",
    ],
}

# Rank yükseltme için minimum gereksinimler
# Her index = o rank'a geçiş için {min_weeks, contribution (quest sayısı)}
FACTION_RANK_REQUIREMENTS = {
    "tuccar_loncasi": [
        {"min_weeks": 4,   "contribution": 2},
        {"min_weeks": 12,  "contribution": 5},
        {"min_weeks": 26,  "contribution": 10},
        {"min_weeks": 52,  "contribution": 20},
        {"min_weeks": 104, "contribution": 35},
        {"min_weeks": 156, "contribution": 50},
        {"min_weeks": 260, "contribution": 80},
    ],
    "zanaatkar_loncasi": [
        {"min_weeks": 4,   "contribution": 2},
        {"min_weeks": 13,  "contribution": 6},
        {"min_weeks": 30,  "contribution": 12},
        {"min_weeks": 60,  "contribution": 25},
        {"min_weeks": 120, "contribution": 40},
    ],
    "krallık_ordusu": [
        {"min_weeks": 4,   "contribution": 3},
        {"min_weeks": 12,  "contribution": 6},
        {"min_weeks": 24,  "contribution": 12},
        {"min_weeks": 48,  "contribution": 20},
        {"min_weeks": 96,  "contribution": 35},
        {"min_weeks": 156, "contribution": 55},
        {"min_weeks": 260, "contribution": 80},
        {"min_weeks": 400, "contribution": 120},
        {"min_weeks": 600, "contribution": 180},
    ],
    "paralı_asker": [
        {"min_weeks": 3,   "contribution": 2},
        {"min_weeks": 10,  "contribution": 5},
        {"min_weeks": 20,  "contribution": 10},
        {"min_weeks": 40,  "contribution": 18},
        {"min_weeks": 80,  "contribution": 30},
        {"min_weeks": 140, "contribution": 50},
        {"min_weeks": 220, "contribution": 75},
        {"min_weeks": 350, "contribution": 110},
    ],
    "ilim_cemiyeti": [
        {"min_weeks": 6,   "contribution": 3},
        {"min_weeks": 18,  "contribution": 8},
        {"min_weeks": 40,  "contribution": 15},
        {"min_weeks": 80,  "contribution": 28},
        {"min_weeks": 160, "contribution": 50},
        {"min_weeks": 280, "contribution": 80},
    ],
    "sifaci_birligi": [
        {"min_weeks": 5,   "contribution": 2},
        {"min_weeks": 15,  "contribution": 6},
        {"min_weeks": 35,  "contribution": 12},
        {"min_weeks": 70,  "contribution": 22},
        {"min_weeks": 130, "contribution": 38},
    ],
    "dini_tarikat": [
        {"min_weeks": 4,   "contribution": 2},
        {"min_weeks": 12,  "contribution": 5},
        {"min_weeks": 26,  "contribution": 10},
        {"min_weeks": 52,  "contribution": 18},
        {"min_weeks": 100, "contribution": 30},
        {"min_weeks": 180, "contribution": 50},
        {"min_weeks": 300, "contribution": 80},
        {"min_weeks": 500, "contribution": 130},
    ],
    "oyuncu_kumpanya": [
        {"min_weeks": 3,   "contribution": 2},
        {"min_weeks": 10,  "contribution": 5},
        {"min_weeks": 22,  "contribution": 10},
        {"min_weeks": 50,  "contribution": 20},
        {"min_weeks": 100, "contribution": 35},
    ],
    "eskiya_cetesi": [
        {"min_weeks": 2,   "contribution": 2},
        {"min_weeks": 8,   "contribution": 4},
        {"min_weeks": 18,  "contribution": 8},
        {"min_weeks": 40,  "contribution": 15},
        {"min_weeks": 80,  "contribution": 28},
    ],
    "gizli_cemiyet": [
        {"min_weeks": 6,   "contribution": 3},
        {"min_weeks": 20,  "contribution": 8},
        {"min_weeks": 45,  "contribution": 16},
        {"min_weeks": 90,  "contribution": 28},
        {"min_weeks": 160, "contribution": 48},
        {"min_weeks": 280, "contribution": 80},
    ],
}

# Nüfuz eşikleri ve etkileri
INFLUENCE_THRESHOLDS = {
    25:  "faaliyet",   # şehirde quest/ticaret avantajı
    50:  "baskı",      # vergi/politika etkisi
    75:  "aday",       # kendi adamını aday gösterebilir
    100: "kontrol",    # lord artık bu faction'ın adamı
}
