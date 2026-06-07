"""
school.py — Mektep ve Çocukluk Aktiviteleri sistemi (7–12 yaş)

Mektep sistemi:
  - 4 ders türü: Kur'an/Din, Matematik, Tarih/Edebiyat, Beden Terbiyesi
  - Her derste hoca NPC'si var (dünya NPClerinden atanır)
  - Haftada 1 ders seç → XP kazan, hoca ilişkisi gelişir
  - Her 4 haftada sınav → başarı stat bonus, başarısızlık motivasyon kaybı
  - 3 öğrenci topluluğu: Medrese Korosu, Güreş Kulübü, Çırak Loncası
  - Topluluk üyeliği haftalık pasif XP + özel aile görevi açar

Çocukluk aktiviteleri (haftada 1 seçilebilir):
  1. Mektep (yukarıdaki)
  2. Sokak oyunları (mevsime göre farklı)
  3. Aile işine yardım (work_count ilerletir)
  4. Pazar gezisi (trade + social)
  5. Mevsimsel etkinlikler (hasat, kar, çiçek toplama...)
  6. Özel olaylar (doğum günü, bayram, düğün, cenaze — rastgele tetiklenir)
"""
import random
from calendar_tr import season_for_turn, player_age

# ──────────────────────────────────────────────
# DERS TANIMI
# ──────────────────────────────────────────────
LESSONS = {
    "din": {
        "name": "Din & Ahlak",
        "icon": "📖",
        "description": "Hoca Efendi Kur'an okumayı ve ahlak kurallarını öğretiyor.",
        "stat_xp": {"intelligence": 8, "charisma": 4},
        "skill_xp": {"social": 6},
        "min_age": 7,
        "exam_stat": "intelligence",
        "flavor_lines": [
            "Hoca Efendi 'Bismillah' dedi, sen de tekrarladın.",
            "Bugün sabır ve şükür üzerine bir ders işledin.",
            "Ezber yaptın; kelimeler kafanda çınlıyor.",
        ],
    },
    "matematik": {
        "name": "Hesap & Geometri",
        "icon": "🔢",
        "description": "Rakamlar, ölçüler ve şekillerin sırrını öğren.",
        "stat_xp": {"intelligence": 12, "stamina": 2},
        "skill_xp": {"trade": 5},
        "min_age": 8,
        "exam_stat": "intelligence",
        "flavor_lines": [
            "Tahtada bir çember çizdin — hoca başını salladı.",
            "Toplama ve çıkarma artık aklında daha hızlı.",
            "Hesabı çözdüğünde sınıf sana baktı.",
        ],
    },
    "edebiyat": {
        "name": "Tarih & Edebiyat",
        "icon": "📜",
        "description": "Eski şairlerin dizeleri ve geçmişin büyük olayları.",
        "stat_xp": {"intelligence": 10, "charisma": 6},
        "skill_xp": {"social": 5, "trade": 2},
        "min_age": 9,
        "exam_stat": "charisma",
        "flavor_lines": [
            "Bir destan dinledin, kahramanın sesi hâlâ kulaklarında.",
            "Hoca geçmiş savaşları anlatırken gözlerin büyüdü.",
            "Bir şiiri ezberleyip sınıfta okudun.",
        ],
    },
    "beden": {
        "name": "Beden Terbiyesi",
        "icon": "🤸",
        "description": "Güreş, koşu ve nişancılık — bedenini güçlendir.",
        "stat_xp": {"strength": 8, "stamina": 8},
        "skill_xp": {"combat": 5},
        "min_age": 7,
        "exam_stat": "strength",
        "flavor_lines": [
            "Rakibini yere serdin — hoca alkışladı.",
            "Uzun bir koşu yaptın, bacakların yanıyor ama kalbın güçlü.",
            "Nişan almayı öğreniyorsun; ok henüz tam gitmiyor.",
        ],
    },
}

# ──────────────────────────────────────────────
# ÖĞRENCİ TOPLULUKLARI
# ──────────────────────────────────────────────
CLUBS = {
    "medrese_korosu": {
        "name": "Medrese Korosu",
        "icon": "🎶",
        "description": "Haftada bir toplanır, ilahiler ve şiirler söylenir. Sesi güzel olanlar davet edilir.",
        "weekly_xp": {"skill_xp": {"social": 2}, "stat_xp": {"charisma": 3}},
        "join_req": {"stat": "charisma", "min_val": 2},
        "family_quest_unlock": "koro_performansi",
        "max_members": 8,
    },
    "gures_kulubu": {
        "name": "Güreş Kulübü",
        "icon": "💪",
        "description": "Güçlü olanlar burada toplanır. Yıllık turnuvada şampiyon olmak büyük şeref.",
        "weekly_xp": {"skill_xp": {"combat": 2}, "stat_xp": {"strength": 3, "stamina": 2}},
        "join_req": {"stat": "strength", "min_val": 2},
        "family_quest_unlock": "gures_turnuvasi",
        "max_members": 10,
    },
    "cirak_loncasi": {
        "name": "Çırak Loncası",
        "icon": "🔧",
        "description": "Esnafların çocukları burada buluşur, ticaret ve zanaatı erken öğrenir.",
        "weekly_xp": {"skill_xp": {"crafting": 2, "trade": 1}, "stat_xp": {"intelligence": 2}},
        "join_req": {"stat": "intelligence", "min_val": 2},
        "family_quest_unlock": "lonca_teslimati",
        "max_members": 12,
    },
}

# ──────────────────────────────────────────────
# SINAV ŞABLONLARI
# ──────────────────────────────────────────────
EXAM_PASS_LINES = [
    "Sınıfın önünde adını okudular — geçtin!",
    "Hoca 'Aferin' dedi. Annen duysa çok sevinirdi.",
    "Doğru cevabı bildin. Herkes sana baktı.",
    "Sınavı geçtin; bir adım daha büyüdün.",
]
EXAM_FAIL_LINES = [
    "Cevap veremeden sustun. Hoca başını salladı.",
    "Soruları anlayamadın. Ama bir sonrakinde daha iyi olacaksın.",
    "Başarısız oldun — ama düşmek utanç değil, kalkmamak utanç.",
]

# ──────────────────────────────────────────────
# MEVSİMSEL ÇOCUKLUK AKTİVİTELERİ
# ──────────────────────────────────────────────
SEASONAL_ACTIVITIES = {
    "İlkbahar": [
        {
            "id": "cicek_toplama",
            "name": "Çiçek Toplama",
            "icon": "🌸",
            "desc": "Bahar geldi! Tarlalar çiçek açtı. Annen için çiçek topla.",
            "stat_xp": {"charisma": 5, "stamina": 3},
            "skill_xp": {"social": 3},
            "flavor": "Ellerinde rengarenk çiçekler; bahar kokusu burnunda.",
        },
        {
            "id": "tohum_ekimi",
            "name": "Tohum Ekimine Yardım",
            "icon": "🌱",
            "desc": "Köylüler tarlaya tohum ekiyor. Yardım et, ekmeğin nereden geldiğini öğren.",
            "stat_xp": {"strength": 4, "stamina": 5},
            "skill_xp": {"crafting": 3},
            "flavor": "Toprak ellerin arasında ezildi. Bir gün ekmek olacak.",
        },
    ],
    "Yaz": [
        {
            "id": "yuzme",
            "name": "Derede Yüzme",
            "icon": "🏊",
            "desc": "Sıcak bir yaz günü. Çocuklar dereye koşuyor — sen de!",
            "stat_xp": {"stamina": 7, "strength": 4},
            "skill_xp": {"combat": 2},
            "flavor": "Serin su bedenini sardı. Bugün her şeyi unuttun.",
        },
        {
            "id": "hasat_yardim",
            "name": "Hasat Yardımı",
            "icon": "🌾",
            "desc": "Hasat zamanı! Herkese el gerek. Tarlada çalış.",
            "stat_xp": {"strength": 6, "stamina": 6},
            "skill_xp": {"crafting": 4},
            "flavor": "Güneş yakarken çalıştın. Akşam sofrası daha lezzetli.",
        },
    ],
    "Sonbahar": [
        {
            "id": "mantar_toplama",
            "name": "Ormanda Mantar Toplama",
            "icon": "🍄",
            "desc": "Sonbaharın sisi ormanı gizemli kıldı. Mantar topla, ama kaybolma!",
            "stat_xp": {"intelligence": 6, "stamina": 4},
            "skill_xp": {"crafting": 3, "trade": 2},
            "flavor": "Koklayarak doğruyu buldun. Hoca bunu öğretmemişti.",
        },
        {
            "id": "bozuk_cati",
            "name": "Çatı Onarımına Yardım",
            "icon": "🏠",
            "desc": "Kış gelmeden çatıyı onarmak gerek. Babanla birlikte çalış.",
            "stat_xp": {"strength": 5, "stamina": 5},
            "skill_xp": {"crafting": 5},
            "flavor": "Çekiç salladın, çivi duvara girdi. Baban güldü.",
        },
    ],
    "Kış": [
        {
            "id": "kar_oyunu",
            "name": "Kar Topu Savaşı",
            "icon": "❄️",
            "desc": "Köy bembeyaz. Çocuklar kar topu savaşına çağırıyor!",
            "stat_xp": {"charisma": 6, "stamina": 5},
            "skill_xp": {"social": 4, "combat": 2},
            "flavor": "Üşüdün ama güldün. En güzel anılar en soğuk gecelerde doğar.",
        },
        {
            "id": "ates_basinda",
            "name": "Ateş Başında Hikâye",
            "icon": "🔥",
            "desc": "Kış gecesi uzun. Köylüler bir araya geldi, hikâyeler anlatıyor.",
            "stat_xp": {"intelligence": 7, "charisma": 5},
            "skill_xp": {"social": 5},
            "flavor": "Bir ihtiyarın sesi odayı doldurdu. Gözlerin kapandı ama uyumadın.",
        },
    ],
}

# ──────────────────────────────────────────────
# ÖZEL OLAYLAR (Rastgele Tetiklenir, Haftada %20)
# ──────────────────────────────────────────────
SPECIAL_EVENTS = [
    {
        "id": "koy_dugunu",
        "name": "Köy Düğünü",
        "icon": "💍",
        "desc": "Komşular evleniyor! Köy bayram havası içinde. Düğüne katıl.",
        "stat_xp": {"charisma": 8, "stamina": 4},
        "skill_xp": {"social": 6},
        "flavor": "Davullar çaldı, sen de döndün. Mutluluğun bulaşıcı olduğunu öğrendin.",
        "min_age": 7,
    },
    {
        "id": "bayram_kutlama",
        "name": "Bayram Kutlaması",
        "icon": "🎉",
        "desc": "Bayram sabahı! Büyüklerin ellerini öp, harçlığını topla.",
        "stat_xp": {"charisma": 6, "intelligence": 4},
        "skill_xp": {"social": 5},
        "money_bonus": random.randint(3, 10),
        "flavor": "Elini öptükçe cebine akçe girdi. Bayram böyle güzel.",
        "min_age": 7,
    },
    {
        "id": "seyyah_geldi",
        "name": "Seyyah Geldi",
        "icon": "🧳",
        "desc": "Uzak diyarlardan bir seyyah köye geldi. Anlattıkları inanılmaz!",
        "stat_xp": {"intelligence": 10, "charisma": 4},
        "skill_xp": {"trade": 4, "social": 3},
        "flavor": "Duyduklarını hiç unutmayacaksın. Dünya sandığından büyükmüş.",
        "min_age": 8,
    },
    {
        "id": "yangin_yardim",
        "name": "Yangın Sönürmede Yardım",
        "icon": "🔥",
        "desc": "Bir komşunun ahırı tutuştu! Herkes koşuyor — sen de!",
        "stat_xp": {"stamina": 10, "strength": 6},
        "skill_xp": {"combat": 3},
        "flavor": "Ellerin yanık, ama ahır kurtuldu. Köy seni kahraman gördü.",
        "min_age": 9,
    },
    {
        "id": "yasli_ogretmen",
        "name": "Yaşlı Öğretmenle Sohbet",
        "icon": "👴",
        "desc": "Emekli bir hocanın önünden geçiyordun. Seni çağırdı — dinle.",
        "stat_xp": {"intelligence": 8, "charisma": 6},
        "skill_xp": {"social": 5},
        "flavor": "Tek bir sohbet bazen bir yıllık dersten çok şey öğretir.",
        "min_age": 8,
    },
    {
        "id": "cenaze_toreni",
        "name": "Köyde Cenaze",
        "icon": "🕯️",
        "desc": "Köyün yaşlısı vefat etti. Herkes dua ediyor, sen de katıl.",
        "stat_xp": {"intelligence": 5, "charisma": 3},
        "skill_xp": {"social": 3},
        "flavor": "İlk kez ölümle bu kadar yakın duruyorsun. Hayat kısa.",
        "min_age": 9,
    },
]

# ──────────────────────────────────────────────
# EK AİLE GÖREVLERİ (Mektep topluluklarından açılır)
# ──────────────────────────────────────────────
SCHOOL_FAMILY_QUESTS = [
    {
        "id": "koro_performansi",
        "title": "Koro Performansı",
        "giver_role": "anne",
        "min_age": 8,
        "description": "Annen seni koro performansına hazırlamana yardım ediyor. 3 ders işle.",
        "objective": {"type": "lesson_count", "qty": 3},
        "reward": {
            "money": 10,
            "stat_xp": {"charisma": 20, "intelligence": 10},
            "skill_xp": {"social": 12},
            "flavor": "Sestin herkesi doldurdu. Annen gözlerini siliyor.",
        },
        "club_required": "medrese_korosu",
    },
    {
        "id": "gures_turnuvasi",
        "title": "Güreş Turnuvası",
        "giver_role": "baba",
        "min_age": 9,
        "description": "Baban seni turnuvaya hazırlıyor. 5 beden dersi işle.",
        "objective": {"type": "lesson_count", "qty": 5, "lesson_type": "beden"},
        "reward": {
            "money": 20,
            "stat_xp": {"strength": 25, "stamina": 20},
            "skill_xp": {"combat": 15},
            "flavor": "Turnuvada üçüncü oldun. Baban omzuna vurdu: 'İlk zafer bu!'",
        },
        "club_required": "gures_kulubu",
    },
    {
        "id": "lonca_teslimati",
        "title": "Lonca Teslimatı",
        "giver_role": "baba",
        "min_age": 10,
        "description": "Lonca ustası senden bir sipariş hazırlamanı istiyor. 3 matematik + 2 zanaat dersi.",
        "objective": {"type": "lesson_count", "qty": 5},
        "reward": {
            "money": 25,
            "stat_xp": {"intelligence": 20, "strength": 10},
            "skill_xp": {"crafting": 18, "trade": 10},
            "flavor": "Ustaya teslim ettin. 'Bu çocuk iyi olacak' dedi.",
        },
        "club_required": "cirak_loncasi",
    },
]


# ──────────────────────────────────────────────
# STATE HELPERS
# ──────────────────────────────────────────────

def ensure_school_state(state):
    """Player state'ine mektep alanlarını ekle (migration safe)."""
    p = state["player"]
    p.setdefault("school", {
        "enrolled": True,
        "lessons_this_week": 0,          # Bu hafta kaç ders işlendi (max 1)
        "total_lessons": 0,
        "lesson_counts": {k: 0 for k in LESSONS},  # Per-lesson count
        "exam_week_counter": 0,          # 4 haftada bir sınav
        "exam_history": [],              # [{lesson, passed, turn}]
        "clubs": [],                     # Üye olunan kulüp idleri
        "club_xp_weeks": 0,              # Pasif XP hafta sayacı
        "teacher_relations": {},         # {lesson_id: relation_score}
        "activity_log": [],              # Son 10 aktivite
        "special_event_this_week": None, # Bu hafta tamamlanan özel etkinlik id'si
        "seasonal_done_this_week": [],   # Bu hafta yapılan mevsimsel aktivite id'leri (list, MongoDB uyumlu)
    })
    # Migration: eski kayıtlara yeni alanları ekle
    school = p["school"]
    school.setdefault("special_event_this_week", None)
    if "seasonal_done_this_week" not in school:
        school["seasonal_done_this_week"] = []
    # set olarak kaydedilmiş eski veriyi düzelt
    elif isinstance(school["seasonal_done_this_week"], set):
        school["seasonal_done_this_week"] = list(school["seasonal_done_this_week"])
    # Mektep aile görevleri — zaten var mı?
    existing_ids = {q["id"] for q in state.get("family_quests", [])}
    for sq in SCHOOL_FAMILY_QUESTS:
        if sq["id"] not in existing_ids:
            from calendar_tr import player_age
            age = player_age(state)
            state.setdefault("family_quests", []).append({
                "id": sq["id"],
                "title": sq["title"],
                "description": sq["description"],
                "giver_id": None,  # atanacak
                "giver_role": sq["giver_role"],
                "min_age": sq["min_age"],
                "objective": sq["objective"],
                "reward": sq["reward"],
                "progress": 0,
                "status": "kilitli",
                "type": "school",
                "club_required": sq.get("club_required"),
            })


def _add_activity_log(state, entry):
    school = state["player"]["school"]
    log = school.setdefault("activity_log", [])
    log.append({"turn": state.get("turn", 0), **entry})
    if len(log) > 20:
        school["activity_log"] = log[-20:]


def _apply_xp(player, stat_xp=None, skill_xp=None):
    from skills import add_stat_xp, add_skill_xp
    leveled = []
    for stat, xp in (stat_xp or {}).items():
        result = add_stat_xp(player, stat, xp)
        if result:
            leveled.append(result)
    for skill, xp in (skill_xp or {}).items():
        result = add_skill_xp(player, skill, xp)
        if result:
            leveled.append(result)
    return leveled


# ──────────────────────────────────────────────
# ANA İŞLEMLER
# ──────────────────────────────────────────────

def attend_lesson(state, lesson_id):
    """
    Oyuncu bir ders işler.
    Returns: {ok, xp_gained, leveled, flavor, already_done_today}
    """
    ensure_school_state(state)
    player = state["player"]
    school = player["school"]
    age = player_age(state)
    lesson = LESSONS.get(lesson_id)

    if not lesson:
        return {"ok": False, "error": "Geçersiz ders."}
    if age >= 13:
        return {"ok": False, "error": "Artık mektep çağında değilsin."}
    if age < lesson["min_age"]:
        return {"ok": False, "error": f"Bu ders {lesson['min_age']} yaşından itibaren açılır."}
    if school["lessons_this_week"] >= 1:
        return {"ok": False, "error": "Bu hafta zaten bir ders işledin. Bir sonraki haftaya kadar bekle."}

    # XP ver
    leveled = _apply_xp(player, lesson["stat_xp"], lesson["skill_xp"])

    # Sayaçlar
    school["lessons_this_week"] += 1
    school["total_lessons"] += 1
    school["lesson_counts"][lesson_id] = school["lesson_counts"].get(lesson_id, 0) + 1
    school["exam_week_counter"] += 1

    # Hoca ilişkisi
    rel = school["teacher_relations"].get(lesson_id, 0)
    school["teacher_relations"][lesson_id] = min(100, rel + random.randint(2, 5))

    flavor = random.choice(lesson["flavor_lines"])

    # Sınav tetikle?
    exam_result = None
    if school["exam_week_counter"] >= 4:
        school["exam_week_counter"] = 0
        exam_result = _run_exam(state, lesson_id)

    # Aile görevi ilerlet
    _progress_school_quests(state, "lesson", lesson_id)

    _add_activity_log(state, {
        "type": "ders",
        "lesson": lesson_id,
        "lesson_name": lesson["name"],
        "flavor": flavor,
    })

    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "ders",
                f"{player['name']} {lesson['name']} dersi işledi.")

    return {
        "ok": True,
        "lesson": lesson["name"],
        "xp_gained": {"stat_xp": lesson["stat_xp"], "skill_xp": lesson["skill_xp"]},
        "leveled": leveled,
        "flavor": flavor,
        "exam_result": exam_result,
        "teacher_relation": school["teacher_relations"][lesson_id],
    }


def _run_exam(state, lesson_id):
    """4 haftada bir sınav. Stat'e göre başarı şansı."""
    player = state["player"]
    lesson = LESSONS.get(lesson_id, {})
    exam_stat = lesson.get("exam_stat", "intelligence")
    stat_val = player.get("stats", {}).get(exam_stat, 1)
    lesson_count = player["school"]["lesson_counts"].get(lesson_id, 0)

    # Şans: base 0.4 + stat etkisi + çalışma etkisi
    chance = min(0.92, 0.35 + stat_val * 0.07 + lesson_count * 0.03)
    passed = random.random() < chance

    if passed:
        # Bonus XP
        _apply_xp(player, {exam_stat: 15}, {"social": 3})
        line = random.choice(EXAM_PASS_LINES)
    else:
        # Motivasyon kaybı (küçük ceza)
        player["school"]["teacher_relations"][lesson_id] = max(
            0, player["school"]["teacher_relations"].get(lesson_id, 0) - 5
        )
        line = random.choice(EXAM_FAIL_LINES)

    result = {
        "passed": passed,
        "stat_tested": exam_stat,
        "flavor": line,
        "bonus_xp": {exam_stat: 15} if passed else {},
    }
    player["school"]["exam_history"].append({
        "lesson": lesson_id,
        "passed": passed,
        "turn": state.get("turn", 0),
    })
    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "sinav",
                f"{'Geçti' if passed else 'Kaldı'}: {lesson.get('name', lesson_id)} sınavı.")
    return result


def join_club(state, club_id):
    """Öğrenci topluluğuna katıl."""
    ensure_school_state(state)
    player = state["player"]
    school = player["school"]
    age = player_age(state)
    club = CLUBS.get(club_id)

    if not club:
        return {"ok": False, "error": "Böyle bir kulüp yok."}
    if age >= 13:
        return {"ok": False, "error": "Artık mektep çağında değilsin."}
    if club_id in school["clubs"]:
        return {"ok": False, "error": f"Zaten {club['name']} üyesisin."}
    if len(school["clubs"]) >= 2:
        return {"ok": False, "error": "En fazla 2 kulübe üye olabilirsin."}

    req_stat = club["join_req"]["stat"]
    req_val  = club["join_req"]["min_val"]
    if player.get("stats", {}).get(req_stat, 1) < req_val:
        return {"ok": False, "error": f"{req_stat.upper()} en az {req_val} olmalı."}

    school["clubs"].append(club_id)

    # Kulübe ait aile görevini aç
    quest_id = club.get("family_quest_unlock")
    if quest_id:
        for q in state.get("family_quests", []):
            if q["id"] == quest_id and q["status"] == "kilitli" and age >= q["min_age"]:
                q["status"] = "açık"

    _add_activity_log(state, {"type": "kulup_katilim", "club": club_id, "club_name": club["name"]})
    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "kulup",
                f"{player['name']} {club['name']} kulübüne katıldı.")

    return {"ok": True, "club": club["name"], "flavor": f"{club['name']}'a hoş geldin!"}


def leave_club(state, club_id):
    """Kulüpten ayrıl."""
    ensure_school_state(state)
    school = state["player"]["school"]
    if club_id not in school["clubs"]:
        return {"ok": False, "error": "Bu kulübün üyesi değilsin."}
    school["clubs"].remove(club_id)
    return {"ok": True}


def do_seasonal_activity(state, activity_id):
    """Mevsimsel aktivite yap."""
    ensure_school_state(state)
    player = state["player"]
    school = player["school"]
    age = player_age(state)
    season = season_for_turn(state.get("turn", 0))
    season_acts = SEASONAL_ACTIVITIES.get(season, [])
    act = next((a for a in season_acts if a["id"] == activity_id), None)

    if not act:
        return {"ok": False, "error": "Bu mevsimde bu aktivite yok."}
    if age >= 13:
        return {"ok": False, "error": "Artık çocukluk aktiviteleri yapamıyorsun."}

    # Tekrar kullanım koruması: bu aktivite bu hafta zaten yapıldı mı?
    done_list = school.get("seasonal_done_this_week", [])
    if activity_id in done_list:
        return {"ok": False, "error": f"Bu hafta '{act['name']}' aktivitesine zaten katıldın. Bir sonraki haftaya kadar bekle."}

    leveled = _apply_xp(player, act.get("stat_xp"), act.get("skill_xp"))

    # Bu haftaki tamamlananlar listesine ekle
    done_list.append(activity_id)
    school["seasonal_done_this_week"] = done_list

    _add_activity_log(state, {"type": "mevsimsel", "id": activity_id, "name": act["name"]})
    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "aktivite", f"{player['name']}: {act['name']}.")

    return {
        "ok": True,
        "activity": act["name"],
        "flavor": act["flavor"],
        "xp_gained": {"stat_xp": act.get("stat_xp", {}), "skill_xp": act.get("skill_xp", {})},
        "leveled": leveled,
    }


def do_special_event(state, event_id):
    """Özel etkinliğe katıl."""
    ensure_school_state(state)
    player = state["player"]
    age = player_age(state)
    school = player["school"]
    event = next((e for e in SPECIAL_EVENTS if e["id"] == event_id), None)

    if not event:
        return {"ok": False, "error": "Böyle bir etkinlik yok."}
    if age < event.get("min_age", 7):
        return {"ok": False, "error": "Bu etkinlik için henüz küçüksün."}
    if age >= 13:
        return {"ok": False, "error": "Artık çocukluk aktiviteleri yapamıyorsun."}

    # Tekrar kullanım koruması: bu hafta zaten bir özel etkinlik tamamlandı mı?
    if school.get("special_event_this_week") is not None:
        done_id = school["special_event_this_week"]
        done_name = next((e["name"] for e in SPECIAL_EVENTS if e["id"] == done_id), done_id)
        return {"ok": False, "error": f"Bu hafta zaten bir özel etkinliğe katıldın ({done_name}). Bir sonraki haftaya kadar bekle."}

    leveled = _apply_xp(player, event.get("stat_xp"), event.get("skill_xp"))
    money = event.get("money_bonus", 0)
    if callable(money):
        money = money()
    if money:
        player["money"] = round(player.get("money", 0) + money, 1)

    # Bu haftanın etkinliğini kaydet
    school["special_event_this_week"] = event_id

    _add_activity_log(state, {"type": "ozel_olay", "id": event_id, "name": event["name"]})
    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "ozel_olay", f"{player['name']}: {event['name']}.")

    return {
        "ok": True,
        "event": event["name"],
        "flavor": event["flavor"],
        "xp_gained": {"stat_xp": event.get("stat_xp", {}), "skill_xp": event.get("skill_xp", {})},
        "money_bonus": money,
        "leveled": leveled,
    }


def weekly_school_tick(state):
    """advance_time içinden çağrılır — her hafta."""
    player = state.get("player", {})
    if player.get("age", 99) >= 13:
        return
    school = player.get("school")
    if not school:
        return

    # Haftalık sayaçları sıfırla
    school["lessons_this_week"] = 0
    school["special_event_this_week"] = None
    school["seasonal_done_this_week"] = []

    # Kulüp pasif XP
    for club_id in school.get("clubs", []):
        club = CLUBS.get(club_id)
        if not club:
            continue
        _apply_xp(player,
                  club["weekly_xp"].get("stat_xp"),
                  club["weekly_xp"].get("skill_xp"))

    # Rastgele özel olay tetikle (%20 şans)
    age = player_age(state)
    if random.random() < 0.20:
        eligible = [e for e in SPECIAL_EVENTS if e.get("min_age", 7) <= age]
        if eligible:
            event = random.choice(eligible)
            # Sadece history'e ekle, oyuncu kabul edecek
            state.setdefault("pending_special_event", event["id"])


def get_school_summary(state):
    """Frontend için mektep özeti."""
    ensure_school_state(state)
    player = state["player"]
    school = player["school"]
    age = player_age(state)
    season = season_for_turn(state.get("turn", 0))

    done_seasonal = school.get("seasonal_done_this_week", [])
    special_done_this_week = school.get("special_event_this_week") is not None

    return {
        "lessons": {
            lid: {
                **LESSONS[lid],
                "count": school["lesson_counts"].get(lid, 0),
                "teacher_relation": school["teacher_relations"].get(lid, 0),
                "available": age >= LESSONS[lid]["min_age"],
                "can_attend_today": school["lessons_this_week"] < 1,
            }
            for lid in LESSONS
        },
        "clubs": {
            cid: {
                **CLUBS[cid],
                "joined": cid in school["clubs"],
                "can_join": (
                    cid not in school["clubs"]
                    and len(school["clubs"]) < 2
                    and player.get("stats", {}).get(CLUBS[cid]["join_req"]["stat"], 1)
                    >= CLUBS[cid]["join_req"]["min_val"]
                ),
            }
            for cid in CLUBS
        },
        "seasonal_activities": [
            {**act, "done_this_week": act["id"] in done_seasonal}
            for act in SEASONAL_ACTIVITIES.get(season, [])
        ],
        "special_events": SPECIAL_EVENTS,
        "pending_special_event": state.get("pending_special_event"),
        "special_event_done_this_week": special_done_this_week,
        "total_lessons": school["total_lessons"],
        "exam_history": school["exam_history"][-5:],
        "activity_log": school["activity_log"][-10:],
        "current_season": season,
        "exam_due_in": max(0, 4 - school["exam_week_counter"]),
    }


def _progress_school_quests(state, action_type, payload=None):
    """Mektep tabanlı aile görevlerini ilerlet."""
    for q in state.get("family_quests", []):
        if q.get("status") != "açık":
            continue
        obj = q.get("objective", {})
        otype = obj.get("type")

        if otype == "lesson_count" and action_type == "lesson":
            required_type = obj.get("lesson_type")
            if required_type and payload != required_type:
                continue
            q["progress"] = q.get("progress", 0) + 1
            if q["progress"] >= obj["qty"]:
                q["status"] = "tamamlandı"
                _apply_reward_school(state, q)


def _apply_reward_school(state, quest):
    from skills import add_stat_xp, add_skill_xp
    player = state["player"]
    reward = quest.get("reward", {})
    if reward.get("money"):
        player["money"] = round(player.get("money", 0) + reward["money"], 1)
    for stat, xp in (reward.get("stat_xp") or {}).items():
        add_stat_xp(player, stat, xp)
    for skill, xp in (reward.get("skill_xp") or {}).items():
        add_skill_xp(player, skill, xp)
    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "aile_görevi",
                f"Görev tamamlandı: {quest['title']}. {reward.get('flavor', '')}")
