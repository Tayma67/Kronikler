"""Stats, jobs, and skill tree.

Stats: strength, intelligence, charisma, stamina (each 1-10)
Skill trees: combat, trade, crafting, social (each 0-10; unlock perks at thresholds)

Jobs require minimum stats and minimum age.
Each profession trains specific skills when /work is called.
"""

STAT_KEYS = ["strength", "intelligence", "charisma", "stamina"]
SKILL_KEYS = ["combat", "trade", "crafting", "social"]


JOB_REQUIREMENTS = {
    "işsiz":            {"age": 0,  "stats": {},                                              "skill": {}},
    "köylü":            {"age": 7,  "stats": {"strength": 2, "stamina": 2},                   "skill": {}},
    "çiftçi":           {"age": 10, "stats": {"strength": 3, "stamina": 3},                   "skill": {}},
    "avcı":             {"age": 12, "stats": {"stamina": 4, "intelligence": 3},               "skill": {}},
    "demirci çırağı":   {"age": 13, "stats": {"strength": 4, "stamina": 3},                   "skill": {}},
    "demirci":          {"age": 16, "stats": {"strength": 6, "stamina": 5},                   "skill": {"crafting": 3}},
    "tüccar":           {"age": 14, "stats": {"charisma": 5, "intelligence": 4},              "skill": {"trade": 2}},
    "asker":            {"age": 16, "stats": {"strength": 5, "stamina": 5},                   "skill": {"combat": 2}},
    "şövalye":          {"age": 18, "stats": {"strength": 7, "stamina": 6, "charisma": 4},    "skill": {"combat": 5}},
    "haydut":           {"age": 14, "stats": {"strength": 4, "stamina": 3},                   "skill": {}},
    "şifacı":           {"age": 16, "stats": {"intelligence": 6, "charisma": 4},              "skill": {"crafting": 3}},
    "zanaatkar":        {"age": 14, "stats": {"intelligence": 4, "strength": 3},              "skill": {"crafting": 2}},
    "katip":            {"age": 14, "stats": {"intelligence": 6},                             "skill": {"social": 2}},
    "rahip":            {"age": 18, "stats": {"intelligence": 5, "charisma": 6},              "skill": {"social": 4}},
    "lord":             {"age": 18, "stats": {"charisma": 6, "strength": 5, "intelligence": 5}, "skill": {"combat": 5, "social": 4}},
}


# ─── Kariyer Hattı Sistemi ───
# Her meslek kendi kariyer yoluna sahip.
# career_stages: sıralı unvan listesi. Her eleman:
#   {
#     "stage": 0-indexed int,
#     "title": unvan adı (TR),
#     "xp_required": bu aşamaya geçmek için gereken job_xp (kümülatif),
#     "income_multiplier": gelir çarpanı,
#     "perks": [perk_key listesi — bu aşamada açılır],
#     "desc": kısa açıklama,
#   }
# job_xp: her çalışma günü 1 kazanılır (varsayılan). Özel olaylar bonus verebilir.

CAREER_STAGES = {
    "köylü": [
        {"stage": 0, "title": "Köylü",         "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Köyde bir emekçi."},
        {"stage": 1, "title": "Deneyimli Köylü","xp_required": 30,  "income_multiplier": 1.2, "perks": [], "desc": "Yılların verdiği tecrübeyle işleri kolaylaştırıyorsun."},
        {"stage": 2, "title": "Köy Ağası",      "xp_required": 100, "income_multiplier": 1.5, "perks": ["halk_dostu"], "desc": "Köylüler sana danışır. Ağırlığın var."},
    ],
    "çiftçi": [
        {"stage": 0, "title": "Çiftçi",         "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Toprağını süren bir çiftçi."},
        {"stage": 1, "title": "Verimli Çiftçi", "xp_required": 40,  "income_multiplier": 1.3, "perks": [], "desc": "Mahsulün komşularından bol."},
        {"stage": 2, "title": "Toprak Sahibi",  "xp_required": 120, "income_multiplier": 1.7, "perks": ["malzeme_tasarrufu"], "desc": "Birden fazla tarla işletiyorsun."},
        {"stage": 3, "title": "Köy Zengini",    "xp_required": 280, "income_multiplier": 2.2, "perks": [], "desc": "Bölgede en varlıklı çiftçi. Lordlar seni tanıyor."},
    ],
    "avcı": [
        {"stage": 0, "title": "Avcı",           "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Ormanlarda iz süren bir avcı."},
        {"stage": 1, "title": "Tecrübeli Avcı", "xp_required": 35,  "income_multiplier": 1.3, "perks": [], "desc": "Av hayvanlarını tanır, tuzakları iyi kurarsın."},
        {"stage": 2, "title": "Baş Avcı",       "xp_required": 100, "income_multiplier": 1.6, "perks": [], "desc": "Bölgenin en iyi avcısı. Lord senin avına gelir."},
        {"stage": 3, "title": "Efsane Avcı",    "xp_required": 250, "income_multiplier": 2.0, "perks": [], "desc": "Adın destanlara geçti. Zor hayvanları avlayabilirsin."},
    ],
    "demirci çırağı": [
        {"stage": 0, "title": "Demirci Çırağı", "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Ustanın körüğünü işletiyor, demiri şekillendirmeyi öğreniyorsun."},
        {"stage": 1, "title": "Yardımcı Demirci","xp_required": 30, "income_multiplier": 1.2, "perks": [], "desc": "Basit işleri tek başına halledebilirsin."},
        {"stage": 2, "title": "Kalfa Demirci",  "xp_required": 80,  "income_multiplier": 1.5, "perks": [], "desc": "Usta seni kendi başına bırakıyor artık."},
    ],
    "demirci": [
        {"stage": 0, "title": "Demirci",         "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Kendi atölyende çalışan bir demirci."},
        {"stage": 1, "title": "Usta Demirci",    "xp_required": 50,  "income_multiplier": 1.4, "perks": ["tamir"], "desc": "Kaliteli işler çıkarıyorsun. Siparişler geliyor."},
        {"stage": 2, "title": "Demirci Üstadı",  "xp_required": 150, "income_multiplier": 1.9, "perks": ["kaliteli_üretim"], "desc": "Lordlar silah ve zırh için seni tercih ediyor."},
        {"stage": 3, "title": "Lonca Demircisi", "xp_required": 350, "income_multiplier": 2.5, "perks": [], "desc": "Lonca üyesisin. Sektörün standartlarını belirliyorsun."},
        {"stage": 4, "title": "Efsane Demirci",  "xp_required": 700, "income_multiplier": 3.5, "perks": ["usta_zanaatkar"], "desc": "Adın ülkeye yayıldı. Her silahında imzan var."},
    ],
    "tüccar": [
        {"stage": 0, "title": "Pazarcı",         "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Küçük bir stantta mal satan biri."},
        {"stage": 1, "title": "Dükkan Sahibi",   "xp_required": 40,  "income_multiplier": 1.3, "perks": ["pazarlık"], "desc": "Sabit dükkanın açıldı. Müşteri kitlen oluşuyor."},
        {"stage": 2, "title": "Tüccar",          "xp_required": 120, "income_multiplier": 1.7, "perks": [], "desc": "Şehirlerarası ticaret yapıyorsun."},
        {"stage": 3, "title": "Kervan Sahibi",   "xp_required": 280, "income_multiplier": 2.3, "perks": ["kervan_patronu"], "desc": "Kendi kervanın var. Uzak şehirlere mal taşıyorsun."},
        {"stage": 4, "title": "Lonca Üyesi",     "xp_required": 500, "income_multiplier": 3.0, "perks": ["lonca_bağlantısı"], "desc": "Loncaya kabul edildin. Özel mallar ve korumalara erişimin var."},
        {"stage": 5, "title": "Lonca Yöneticisi","xp_required": 900, "income_multiplier": 4.0, "perks": [], "desc": "Loncanın yönetim kurulundasın."},
        {"stage": 6, "title": "Büyük Lonca Üstadı","xp_required": 1500,"income_multiplier": 6.0,"perks": ["tüccar_lordu"], "desc": "Şehir ekonomisini yönetiyorsun."},
    ],
    "asker": [
        {"stage": 0, "title": "Genç Asker",       "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Yeni askerlik hayatına atıldın."},
        {"stage": 1, "title": "Savaşmış Er",       "xp_required": 40,  "income_multiplier": 1.2, "perks": [], "desc": "İlk muharebelerini gördün. Tecrübe kazanıyorsun."},
        {"stage": 2, "title": "Onbaşı",            "xp_required": 100, "income_multiplier": 1.5, "perks": [], "desc": "Küçük bir birliğin başına geçtin."},
        {"stage": 3, "title": "Subaşı",            "xp_required": 220, "income_multiplier": 2.0, "perks": [], "desc": "Daha büyük birlikler emrindeyken daha az kayıp veriyorsun."},
        {"stage": 4, "title": "Yüzbaşı",           "xp_required": 450, "income_multiplier": 2.8, "perks": [], "desc": "Yüz kişilik bir birliği yönetiyorsun."},
        {"stage": 5, "title": "Bölge Komutanı",    "xp_required": 800, "income_multiplier": 4.0, "perks": [], "desc": "Bir bölgenin savunmasından sorumlusun."},
        {"stage": 6, "title": "Paşa",              "xp_required": 1400,"income_multiplier": 6.0, "perks": [], "desc": "Sultan'ın güvendiği komutanlardan birisin."},
    ],
    "şövalye": [
        {"stage": 0, "title": "Şövalye",           "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Bir lordu himaye eden şövalye."},
        {"stage": 1, "title": "Seçkin Şövalye",    "xp_required": 60,  "income_multiplier": 1.5, "perks": [], "desc": "Ünün yayılıyor. Dövüş tekniklerin mükemmelleşiyor."},
        {"stage": 2, "title": "Şampiyonu",         "xp_required": 180, "income_multiplier": 2.2, "perks": [], "desc": "Turnuvalarda boy gösteriyorsun. Lordlar seni istiyor."},
        {"stage": 3, "title": "Efsane Şövalye",    "xp_required": 400, "income_multiplier": 3.5, "perks": ["efsanevi_savaşçı"], "desc": "Adın destanlara geçti. Düşmanlar safından ayrılıyor."},
    ],
    "haydut": [
        {"stage": 0, "title": "Sıradan Hırsız",    "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Küçük çaplı soygunlarla geçimini sağlıyorsun."},
        {"stage": 1, "title": "Silahşör",           "xp_required": 30,  "income_multiplier": 1.4, "perks": [], "desc": "Artık silahın var ve onu kullanmaktan çekinmiyorsun."},
        {"stage": 2, "title": "Çete Üyesi",         "xp_required": 80,  "income_multiplier": 1.8, "perks": [], "desc": "Bir çetenin parçasısın. Güvenliğin arttı."},
        {"stage": 3, "title": "Çete Lideri",        "xp_required": 200, "income_multiplier": 2.5, "perks": [], "desc": "Kendi çeteni kuruyorsun. Bölgede adın duyuluyor."},
        {"stage": 4, "title": "Haraç Beyi",         "xp_required": 450, "income_multiplier": 3.5, "perks": [], "desc": "Bir bölgeyi kontrol ediyorsun. Haraç topluyorsun."},
        {"stage": 5, "title": "Eşkıya Sultanı",     "xp_required": 900, "income_multiplier": 5.0, "perks": [], "desc": "Gayrı resmi hükümdar gibisin. Lordlar senden izin alıyor."},
    ],
    "şifacı": [
        {"stage": 0, "title": "Çırak Hekim",       "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Temel ilaçları karıştırmayı öğreniyorsun."},
        {"stage": 1, "title": "Şifacı",             "xp_required": 40,  "income_multiplier": 1.4, "perks": [], "desc": "Hastalarını iyileştirebiliyorsun."},
        {"stage": 2, "title": "Hekim",              "xp_required": 120, "income_multiplier": 1.9, "perks": [], "desc": "Kasabada tek hekim sensin. Herkes kapını çalıyor."},
        {"stage": 3, "title": "Ünlü Hekim",        "xp_required": 280, "income_multiplier": 2.8, "perks": [], "desc": "Lordlar özel hekim olarak yanına çağırıyor."},
        {"stage": 4, "title": "Başhekim",           "xp_required": 600, "income_multiplier": 4.0, "perks": [], "desc": "Salgın hastalıkları durdurabilecek bilgiye ulaştın."},
    ],
    "zanaatkar": [
        {"stage": 0, "title": "Zanaatkar Çırak",   "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Ustanın atölyesinde mesleği öğreniyorsun."},
        {"stage": 1, "title": "Kalfa",              "xp_required": 40,  "income_multiplier": 1.3, "perks": ["tamir"], "desc": "Temel işleri güvenilir şekilde yapabilirsin."},
        {"stage": 2, "title": "Usta",               "xp_required": 120, "income_multiplier": 1.8, "perks": ["usta_çırak"], "desc": "Kendi çıraklarını yetiştirebilirsin."},
        {"stage": 3, "title": "Tanınan Usta",       "xp_required": 280, "income_multiplier": 2.5, "perks": ["kaliteli_üretim"], "desc": "Adın bölgede duyuluyor. Özel siparişler geliyor."},
        {"stage": 4, "title": "Lonca Başkanı",      "xp_required": 600, "income_multiplier": 3.5, "perks": ["lonca_başkanı"], "desc": "Zanaatkarların loncasına başkanlık ediyorsun."},
    ],
    "katip": [
        {"stage": 0, "title": "Katip",              "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Belgeleri yazan, kayıt tutan biri."},
        {"stage": 1, "title": "Baş Katip",          "xp_required": 50,  "income_multiplier": 1.4, "perks": [], "desc": "Önemli belgeleri sen düzenliyorsun."},
        {"stage": 2, "title": "Divân Kâtibi",       "xp_required": 150, "income_multiplier": 2.0, "perks": ["dedikodu_ağı"], "desc": "Yüksek makamların yazışmalarına erişimin var."},
        {"stage": 3, "title": "Divân Reisi",        "xp_required": 350, "income_multiplier": 3.0, "perks": [], "desc": "Devletin resmi yazışmalarını yönetiyorsun. Çok şey biliyorsun."},
    ],
    "rahip": [
        {"stage": 0, "title": "Sıradan Mürit",      "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Dini öğrenmenin başındaki biri."},
        {"stage": 1, "title": "İmam",               "xp_required": 50,  "income_multiplier": 1.3, "perks": ["ikna"], "desc": "Bir mahallenin dini liderliğini yapıyorsun."},
        {"stage": 2, "title": "Kadı",               "xp_required": 150, "income_multiplier": 1.8, "perks": [], "desc": "Dini yargıç olarak anlaşmazlıkları çözüyorsun."},
        {"stage": 3, "title": "Baş Kadı",           "xp_required": 350, "income_multiplier": 2.5, "perks": ["etki"], "desc": "Şehrin tüm dini mahkemelerini yönetiyorsun."},
        {"stage": 4, "title": "Müftü",              "xp_required": 700, "income_multiplier": 3.5, "perks": [], "desc": "Fetva çıkarma yetkin var. Kral bile dikkat ediyor."},
        {"stage": 5, "title": "Şeyhülislam",        "xp_required": 1200,"income_multiplier": 5.0, "perks": ["lider"], "desc": "Sultan senden fetva alıyor. Dini otorite zirvedeyken."},
    ],
    "lord": [
        {"stage": 0, "title": "Bey",                "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Küçük bir toprak parçasının sahibisin."},
        {"stage": 1, "title": "Güçlü Bey",          "xp_required": 100, "income_multiplier": 2.0, "perks": [], "desc": "Diğer beyler seni hesaba katıyor."},
        {"stage": 2, "title": "Vali",               "xp_required": 300, "income_multiplier": 3.5, "perks": ["lider"], "desc": "Bir bölgenin yöneticisisin."},
        {"stage": 3, "title": "Sultan",             "xp_required": 800, "income_multiplier": 7.0, "perks": [], "desc": "Zirve. Diğer lordlar sana biat ediyor."},
    ],
    "işsiz": [
        {"stage": 0, "title": "İşsiz",              "xp_required": 0,   "income_multiplier": 1.0, "perks": [], "desc": "Hiçbir işin yok."},
    ],
}

# XP eşiği: her iş günü için kazanılan job_xp (varsayılan=1, özel olaylar bonus verir)
JOB_XP_PER_WORK_DAY = 1
# Kariyer atlama için gereken job_xp'i hızlandıran perk bonusları
JOB_XP_PERK_BONUS = {
    "pazarlık": 0.1,      # +%10 job xp (tüccar)
    "usta_çırak": 0.15,   # +%15 job xp (zanaatkar)
    "efsanevi_savaşçı": 0.1,
}


def get_career_stages(profession: str) -> list:
    """Bir mesleğin kariyer aşamalarını döndür."""
    return CAREER_STAGES.get(profession, [
        {"stage": 0, "title": profession.title(), "xp_required": 0,
         "income_multiplier": 1.0, "perks": [], "desc": ""}
    ])


def get_current_career_stage(player) -> dict:
    """Oyuncunun mevcut kariyer aşamasını döndür."""
    profession = player.get("profession", "işsiz")
    job_xp = player.get("job_xp", 0)
    stages = get_career_stages(profession)
    current = stages[0]
    for stage in stages:
        if job_xp >= stage["xp_required"]:
            current = stage
        else:
            break
    return current


def get_next_career_stage(player) -> dict | None:
    """Bir sonraki kariyer aşamasını döndür. Zirvedeyse None."""
    profession = player.get("profession", "işsiz")
    job_xp = player.get("job_xp", 0)
    stages = get_career_stages(profession)
    for stage in stages:
        if job_xp < stage["xp_required"]:
            return stage
    return None


def get_career_progress_pct(player) -> float:
    """Mevcut kariyer aşamasında ilerleme yüzdesi (0-100)."""
    profession = player.get("profession", "işsiz")
    job_xp = player.get("job_xp", 0)
    stages = get_career_stages(profession)
    current_xp_req = 0
    next_xp_req = None
    for i, stage in enumerate(stages):
        if job_xp >= stage["xp_required"]:
            current_xp_req = stage["xp_required"]
            if i + 1 < len(stages):
                next_xp_req = stages[i + 1]["xp_required"]
    if next_xp_req is None:
        return 100.0
    span = next_xp_req - current_xp_req
    if span <= 0:
        return 100.0
    return min(100.0, (job_xp - current_xp_req) / span * 100)


def add_job_xp(player, xp: int = 1) -> dict | None:
    """
    Oyuncuya job_xp ekle. Kariyer aşaması atlandıysa yeni aşamayı döndür.
    Returns: {"promoted": True, "new_stage": {...}} veya None.
    """
    # Perk bonus kontrolü (has_perk bu dosyanın sonunda tanımlı — inline kontrol)
    chosen_perks = player.get("chosen_perks", [])
    active_perk_keys = {p.get("perk_key") or p.get("perk") for p in chosen_perks}

    bonus_mult = 1.0
    for perk_key, bonus in JOB_XP_PERK_BONUS.items():
        if perk_key in active_perk_keys:
            bonus_mult += bonus

    effective_xp = max(1, round(xp * bonus_mult))

    old_stage = get_current_career_stage(player)
    player["job_xp"] = player.get("job_xp", 0) + effective_xp
    new_stage = get_current_career_stage(player)

    if new_stage["stage"] > old_stage["stage"]:
        return {"promoted": True, "new_stage": new_stage, "old_stage": old_stage}
    return None


# Job → skill XP gained per /work tick (per turn)
JOB_SKILL_TRAINING = {
    "çiftçi":           {"crafting": 1, "stamina_xp": 1},
    "köylü":            {"stamina_xp": 1},
    "avcı":             {"combat": 1, "stamina_xp": 1},
    "demirci çırağı":   {"crafting": 2, "strength_xp": 1},
    "demirci":          {"crafting": 2, "strength_xp": 1},
    "tüccar":           {"trade": 2, "social": 1, "charisma_xp": 1},
    "asker":            {"combat": 2, "strength_xp": 1, "stamina_xp": 1},
    "şövalye":          {"combat": 3, "strength_xp": 1},
    "haydut":           {"combat": 1, "trade": 1},
    "şifacı":           {"crafting": 1, "social": 1, "intelligence_xp": 1},
    "zanaatkar":        {"crafting": 2, "intelligence_xp": 1},
    "katip":            {"social": 2, "intelligence_xp": 1},
    "rahip":            {"social": 2, "intelligence_xp": 1, "charisma_xp": 1},
    "lord":             {"social": 1, "combat": 1, "charisma_xp": 1},
    "işsiz":            {},
}


# ─── Eski tek-seçenek perk listesi (geriye dönük uyumluluk için korunur) ───
SKILL_PERKS = {
    "combat": [
        (3, "iki_el", "İki elli saldırı — saldırı +%15"),
        (6, "ustaca_savunma", "Ustaca savunma — alınan hasar -%20"),
        (9, "katil", "Ölümcül vuruş — kritik şansı +%25"),
    ],
    "trade": [
        (3, "pazarlık", "Pazarlık — alışta %10 indirim, satışta %10 zam"),
        (6, "kervan", "Kervan rotası — uzun seyahatlerde para kazanırsın"),
        (9, "tüccar_lordu", "Tüccar Lordu — kentlerde özel fiyatlar"),
    ],
    "crafting": [
        (3, "tamir", "Tamir — silah/zırh dayanıklılığı artar"),
        (6, "kaliteli_üretim", "Kaliteli üretim — sattığın ürün %20 fazla para getirir"),
        (9, "usta_zanaatkar", "Usta zanaatkar — nadir eşyalar yapabilirsin"),
    ],
    "social": [
        (3, "ikna", "İkna — diyalog ilişki kazançları +1"),
        (6, "etki", "Etki — soyluların eşiği -1"),
        (9, "lider", "Lider — büyük gruplar seni dinler"),
    ],
}


# ─── Adım 16: 3-Seçenekli Perk Sistemi ───
# Her skill × her seviye için 3 seçenek. Oyuncu birini seçer, seçim geri alınamaz.
SKILL_PERK_CHOICES = {
    "combat": {
        3: [
            {
                "key": "kılıç_ustası",
                "name": "Kılıç Ustası",
                "desc": "Kesici silah hasarı +%20. Uzun vadede rakipler senden çekinir.",
                "icon": "⚔️",
                "effect_preview": "Saldırı hasarı +%20",
            },
            {
                "key": "kalkan_arkası",
                "name": "Kalkan Arkası",
                "desc": "Savunma +%25. Temkinli savaşçının yolu — uzun hayatta kalma.",
                "icon": "🛡️",
                "effect_preview": "Savunma +%25",
            },
            {
                "key": "çift_el",
                "name": "Çift El",
                "desc": "İki silah birden kullanırsın. Hız artar, zırh bonusu azalır.",
                "icon": "✊",
                "effect_preview": "Saldırı hızı +1, Savunma -%10",
            },
        ],
        6: [
            {
                "key": "hız_saldırı",
                "name": "Hız Saldırısı",
                "desc": "İlk saldırıyı sen yaparsın. Baskın ve kaçış senaryolarında avantaj.",
                "icon": "💨",
                "effect_preview": "Savaşta inisiyatif +1",
            },
            {
                "key": "savunma_ustası",
                "name": "Savunma Ustası",
                "desc": "Her saldırıda %20 daha az hasar alırsın. Uzun çarpışmalarda belirleyici.",
                "icon": "🛡️",
                "effect_preview": "Alınan hasar -%20",
            },
            {
                "key": "savaş_çığlığı",
                "name": "Savaş Çığlığı",
                "desc": "Savaş öncesi moral haykırışı. Düşman birliklerinin morali düşer.",
                "icon": "📢",
                "effect_preview": "Düşman moral -10",
            },
        ],
        9: [
            {
                "key": "katil",
                "name": "Ölümcül Vuruş",
                "desc": "Kritik vuruş şansı +%25. Efsane savaşçıların nihai silahı.",
                "icon": "💀",
                "effect_preview": "Kritik şansı +%25",
            },
            {
                "key": "efsanevi_savaşçı",
                "name": "Efsanevi Savaşçı",
                "desc": "Ünün yayılmış. Zayıf rakipler savaşmadan teslim olur.",
                "icon": "🏆",
                "effect_preview": "Zayıf düşmanlar teslim olur",
            },
            {
                "key": "son_nefes",
                "name": "Son Nefes",
                "desc": "Ölüm anında bir kez devreye girer. Sağlık %20'ye sıçrar.",
                "icon": "❤️",
                "effect_preview": "Ölümde 1 kez hayatta kal",
            },
        ],
    },
    "trade": {
        3: [
            {
                "key": "kuyumcu_gözü",
                "name": "Kuyumcu Gözü",
                "desc": "Sahte ve değersiz malı anında tanırsın. Bir daha kandırılamazsın.",
                "icon": "👁️",
                "effect_preview": "Sahte mal tuzağı bağışıklığı",
            },
            {
                "key": "pazarlık",
                "name": "Pazarlık Ustası",
                "desc": "Alışta %10 indirim, satışta %10 zam. Her işlem biraz daha kazançlı.",
                "icon": "💰",
                "effect_preview": "Alış -%10, Satış +%10",
            },
            {
                "key": "kervan_patronu",
                "name": "Kervan Patronu",
                "desc": "Çalışanlara maaş değil kâr payı verirsin. Uzun vadede avantajlı.",
                "icon": "🐪",
                "effect_preview": "Kervan işletim maliyeti -%30",
            },
        ],
        6: [
            {
                "key": "uzak_pazar",
                "name": "Uzak Pazar",
                "desc": "Uzak şehirlerin fiyatlarını haberci göndermeden öğrenirsin.",
                "icon": "🗺️",
                "effect_preview": "Uzak şehir fiyat bilgisi",
            },
            {
                "key": "piyasa_manipülasyonu",
                "name": "Piyasa Manipülasyonu",
                "desc": "Yayacağın söylentiler fiyatları etkileyebilir. Güçlü ama riskli.",
                "icon": "📰",
                "effect_preview": "Söylenti ile fiyat oynatma",
            },
            {
                "key": "lonca_bağlantısı",
                "name": "Lonca Bağlantısı",
                "desc": "Lonca kanalıyla özel mallar ve siparişlere erişim.",
                "icon": "🤝",
                "effect_preview": "Lonca mal erişimi açılır",
            },
        ],
        9: [
            {
                "key": "tüccar_lordu",
                "name": "Tüccar Lordu",
                "desc": "Kentlerde özel fiyatlar. Tüccar olduğunuzu herkes bilir.",
                "icon": "👑",
                "effect_preview": "Tüm şehirlerde %15 fiyat avantajı",
            },
            {
                "key": "tekelci",
                "name": "Tekelci",
                "desc": "Bir malı piyasadan çekince fiyatı iki katına çıkar.",
                "icon": "📦",
                "effect_preview": "Monopol satış bonusu x2",
            },
            {
                "key": "bankacı",
                "name": "Bankacı",
                "desc": "Verdiğin borçlarda faiz +%50. Lordlar ve beyler senden borç alır.",
                "icon": "🏦",
                "effect_preview": "Borç faizi +%50",
            },
        ],
    },
    "crafting": {
        3: [
            {
                "key": "tamir",
                "name": "Tamir Ustası",
                "desc": "Ekipman dayanıklılığı +%50. Kendi silahını ve başkasınınkileri tamir edersin.",
                "icon": "🔧",
                "effect_preview": "Ekipman dayanıklılığı +%50",
            },
            {
                "key": "hız_üretimi",
                "name": "Hız Üretimi",
                "desc": "Üretim süresi %30 azalır. Daha fazla sipariş teslim edersin.",
                "icon": "⚡",
                "effect_preview": "Üretim hızı +%30",
            },
            {
                "key": "malzeme_tasarrufu",
                "name": "Malzeme Tasarrufu",
                "desc": "Her üretimde %20 daha az hammadde tüketirsin.",
                "icon": "💡",
                "effect_preview": "Hammadde tüketimi -%20",
            },
        ],
        6: [
            {
                "key": "kaliteli_üretim",
                "name": "Kaliteli Üretim",
                "desc": "Ürettiğin her ürün %20 daha fazla para getirir. Kalite şöhret yaratır.",
                "icon": "⭐",
                "effect_preview": "Satış fiyatı +%20",
            },
            {
                "key": "nadir_malzeme",
                "name": "Nadir Malzeme Bilgisi",
                "desc": "Piyasada bulunmayan hammaddeleri nereden bulacağını bilirsin.",
                "icon": "💎",
                "effect_preview": "Nadir hammadde erişimi",
            },
            {
                "key": "usta_çırak",
                "name": "Usta-Çırak",
                "desc": "Çırak tutunca üretimin iki katına çıkar, kalite korunur.",
                "icon": "👨‍🏭",
                "effect_preview": "Çırak ile üretim x2",
            },
        ],
        9: [
            {
                "key": "usta_zanaatkar",
                "name": "Usta Zanaatkar",
                "desc": "Efsane kalitede ürün yapabilirsin. Lordlar sipariş kuyruğuna girer.",
                "icon": "🔨",
                "effect_preview": "Efsane kalite üretim açılır",
            },
            {
                "key": "lonca_başkanı",
                "name": "Lonca Şampiyonu",
                "desc": "Lonca standartlarını sen belirlersin. Rakiplerin senden izin alır.",
                "icon": "🏛️",
                "effect_preview": "Lonca yönetimi bonusu",
            },
            {
                "key": "efsane_eser",
                "name": "Efsane Eser",
                "desc": "Her 10 ayda bir efsane eser yapabilirsin. Tarihe geçer.",
                "icon": "✨",
                "effect_preview": "Tarihe geçen eser üretimi",
            },
        ],
    },
    "social": {
        3: [
            {
                "key": "ikna",
                "name": "İkna",
                "desc": "Her diyalog etkileşiminde ilişki kazancı +1. Konuşmak güçtür.",
                "icon": "🗣️",
                "effect_preview": "Diyalog ilişki bonusu +1",
            },
            {
                "key": "gözlemci",
                "name": "Gözlemci",
                "desc": "NPC'lerin gizli duygularını ve niyetlerini hissedersin.",
                "icon": "👀",
                "effect_preview": "NPC gizli bilgi görünür",
            },
            {
                "key": "halk_dostu",
                "name": "Halk Dostu",
                "desc": "Olumlu itibar olayları daha sık ve daha güçlü gelir.",
                "icon": "🤗",
                "effect_preview": "İtibar olayları +%30 güçlü",
            },
        ],
        6: [
            {
                "key": "etki",
                "name": "Etki",
                "desc": "Soylularla etkileşim eşiği azalır. Kapılar daha kolay açılır.",
                "icon": "🎭",
                "effect_preview": "Soylu eşiği -1",
            },
            {
                "key": "dedikodu_ağı",
                "name": "Dedikodu Ağı",
                "desc": "Her ay kasabadan 2 ücretsiz dedikodu alırsın.",
                "icon": "🕵️",
                "effect_preview": "Haftalık 2 ücretsiz dedikodu",
            },
            {
                "key": "ajan_bağlantısı",
                "name": "Ajan Bağlantısı",
                "desc": "Şehirde bir ajan ağı kurarsın. Bilgi maliyeti %50 azalır.",
                "icon": "🕶️",
                "effect_preview": "Bilgi toplama maliyeti -%50",
            },
        ],
        9: [
            {
                "key": "lider",
                "name": "Lider",
                "desc": "100+ kişilik grupları yönetebilirsin. Büyük kararlar senin.",
                "icon": "👑",
                "effect_preview": "Büyük grup yönetimi açılır",
            },
            {
                "key": "karizma_aura",
                "name": "Karizma Aurası",
                "desc": "Orada olduğun her ortamda tüm NPC'lerin tutumu iyileşir.",
                "icon": "✨",
                "effect_preview": "Aura: tüm NPC tutumu +5",
            },
            {
                "key": "gizli_bilgi",
                "name": "Gizli Bilgi",
                "desc": "En güçlülerin sırlarına ulaşırsın. Mahkeme entrikalarında belirleyici.",
                "icon": "📜",
                "effect_preview": "Mahkeme gizli bilgi erişimi",
            },
        ],
    },
}

# Skill isimlerinin Türkçesi
SKILL_NAMES_TR = {
    "combat": "Savaş",
    "trade": "Ticaret",
    "crafting": "Zanaat",
    "social": "Sosyal",
}


def get_perk_choices_for_level(skill: str, level: int):
    """3 seçeneği döndürür. Yoksa None."""
    return SKILL_PERK_CHOICES.get(skill, {}).get(level, None)


def get_pending_perk_choice(player):
    """Oyuncunun bekleyen ilk perk seçimini döndürür veya None."""
    queue = player.get("pending_perk_queue", [])
    return queue[0] if queue else None


def enqueue_perk_choice(player, skill: str, level: int):
    """Bir perk seçim isteği kuyruğa ekle."""
    choices = get_perk_choices_for_level(skill, level)
    if not choices:
        return  # Bu seviyede seçenek tanımlı değil, atla
    queue = player.setdefault("pending_perk_queue", [])
    # Aynı skill+level çift kez eklenmemeli
    already = any(p["skill"] == skill and p["level"] == level for p in queue)
    if already:
        return
    queue.append({
        "skill": skill,
        "level": level,
        "skill_name_tr": SKILL_NAMES_TR.get(skill, skill),
        "options": choices,
    })


def apply_perk_choice(player, skill: str, level: int, perk_key: str) -> dict:
    """
    Seçimi kaydet, kuyruktan çıkar.
    Returns: {"ok": True, "perk_name": ..., "perk_desc": ...} veya {"ok": False, "error": ...}
    """
    # Seçeneğin geçerli olduğunu doğrula
    choices = get_perk_choices_for_level(skill, level)
    if not choices:
        return {"ok": False, "error": "Bu seviye için perk seçeneği yok."}

    chosen = next((c for c in choices if c["key"] == perk_key), None)
    if not chosen:
        return {"ok": False, "error": "Geçersiz perk seçeneği."}

    # Seçimi kaydet
    chosen_perks = player.setdefault("chosen_perks", [])
    # Aynı skill+level için zaten seçim yapılmış mı?
    existing = next((p for p in chosen_perks if p["skill"] == skill and p["level"] == level), None)
    if existing:
        return {"ok": False, "error": "Bu seviye için zaten seçim yapıldı."}

    chosen_perks.append({
        "skill": skill,
        "level": level,
        "perk_key": perk_key,
        "perk_name": chosen["name"],
        "perk_desc": chosen["desc"],
        "perk_icon": chosen["icon"],
    })

    # Kuyruktan çıkar
    queue = player.get("pending_perk_queue", [])
    player["pending_perk_queue"] = [
        p for p in queue if not (p["skill"] == skill and p["level"] == level)
    ]

    return {
        "ok": True,
        "perk_key": perk_key,
        "perk_name": chosen["name"],
        "perk_desc": chosen["desc"],
        "perk_icon": chosen["icon"],
        "skill_name_tr": SKILL_NAMES_TR.get(skill, skill),
    }


def get_age_group(age):
    if age < 13:
        return "çocuk"
    if age < 18:
        return "ergen"
    if age < 50:
        return "yetişkin"
    if age < 65:
        return "olgun"
    return "yaşlı"


def check_job_eligible(player, job):
    """Returns (ok: bool, reasons: list[str])"""
    req = JOB_REQUIREMENTS.get(job)
    if not req:
        return False, [f"'{job}' geçerli bir meslek değil."]
    reasons = []
    if player.get("age", 0) < req["age"]:
        reasons.append(f"Yaş yetersiz ({req['age']}+ gerekli, sen {player.get('age')})")
    stats = player.get("stats", {})
    for s, v in req["stats"].items():
        if stats.get(s, 0) < v:
            reasons.append(f"{s}: {stats.get(s, 0)}/{v}")
    skills = player.get("skills", {})
    for s, v in req["skill"].items():
        if skills.get(s, 0) < v:
            reasons.append(f"{s} skill: {skills.get(s, 0)}/{v}")
    return len(reasons) == 0, reasons


def list_eligible_jobs(player):
    out = []
    for job in JOB_REQUIREMENTS.keys():
        ok, reasons = check_job_eligible(player, job)
        out.append({"job": job, "eligible": ok, "missing": reasons,
                    "requirements": JOB_REQUIREMENTS[job]})
    return out


# XP needed to gain a skill level
def xp_for_next_skill_level(current_level):
    return 10 + current_level * 5


def xp_for_next_stat_level(current_level):
    return 25 + current_level * 15


def add_skill_xp(player, skill, xp):
    """Apply xp to a skill; level up if threshold reached.
    Returns new level if leveled up else None.
    If a perk choice exists for the new level, it's enqueued in pending_perk_queue.
    """
    skills = player.setdefault("skills", {})
    skill_xp = player.setdefault("skill_xp", {})
    if skill not in skills:
        skills[skill] = 0
    if skill not in skill_xp:
        skill_xp[skill] = 0
    skill_xp[skill] += xp
    leveled = None
    while skills[skill] < 10 and skill_xp[skill] >= xp_for_next_skill_level(skills[skill]):
        skill_xp[skill] -= xp_for_next_skill_level(skills[skill])
        skills[skill] += 1
        leveled = skills[skill]
        # Perk seçimi var mı?
        enqueue_perk_choice(player, skill, leveled)
    return leveled


def add_stat_xp(player, stat, xp):
    """Slower than skill XP. Stats cap at 10."""
    stats = player.setdefault("stats", {})
    stat_xp = player.setdefault("stat_xp", {})
    if stat not in stats:
        stats[stat] = 1
    if stat not in stat_xp:
        stat_xp[stat] = 0
    stat_xp[stat] += xp
    leveled = None
    while stats[stat] < 10 and stat_xp[stat] >= xp_for_next_stat_level(stats[stat]):
        stat_xp[stat] -= xp_for_next_stat_level(stats[stat])
        stats[stat] += 1
        leveled = stats[stat]
    return leveled


def apply_work_training(player, profession, multiplier=1):
    """When player works one turn, distribute XP gains."""
    training = JOB_SKILL_TRAINING.get(profession, {})
    leveled = []
    for key, xp in training.items():
        xp = xp * multiplier
        if key.endswith("_xp"):
            stat = key.replace("_xp", "")
            lvl = add_stat_xp(player, stat, xp)
            if lvl is not None:
                leveled.append(("stat", stat, lvl))
        else:
            lvl = add_skill_xp(player, key, xp)
            if lvl is not None:
                leveled.append(("skill", key, lvl))
    return leveled


def unlocked_perks(player):
    """
    Oyuncunun seçtiği perkleri döndürür (chosen_perks).
    Geriye dönük uyumluluk için: chosen_perks yoksa eski SKILL_PERKS mantığıyla doldurur.
    """
    chosen = player.get("chosen_perks", [])
    if chosen:
        return chosen  # Yeni sistem

    # Eski sistem geriye dönük uyumluluk
    out = []
    skills = player.get("skills", {})
    for skill, perks in SKILL_PERKS.items():
        for threshold, key, desc in perks:
            if skills.get(skill, 0) >= threshold:
                out.append({"skill": skill, "level": threshold, "perk_key": key, "perk_name": key, "perk_desc": desc})
    return out


def has_perk(player, perk_key):
    return any(p.get("perk_key") == perk_key or p.get("perk") == perk_key for p in unlocked_perks(player))
