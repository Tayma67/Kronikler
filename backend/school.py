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
        "description": "Ayda bir toplanır, ilahiler ve şiirler söylenir. Sesi güzel olanlar davet edilir.",
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
# DERS İÇİ OLAYLAR — Adım 17
# Her ders için olay havuzu. Ders katılımında %60 şansla biri seçilir.
# Her olay: id, senaryo metni (soru), 2-3 seçim seçeneği.
# Her seçenek: id, label, flavor (sonuç metni), stat/skill etkileri.
# ──────────────────────────────────────────────
LESSON_EVENTS = {
    "din": [
        {
            "id": "hoca_soru",
            "scene": "Hoca Efendi gözlerini sınıfta gezdirdi — ve parmağını sana doğrultu. \"Söyle bakalım, bugün anlattıklarımdan ne anladın?\" Herkes sana bakıyor.",
            "icon": "📖",
            "choices": [
                {
                    "id": "cevapla",
                    "label": "Cevapla",
                    "hint": "Aklında kalanları söyle",
                    "stat_check": {"stat": "intelligence", "threshold": 3},
                    "success": {
                        "flavor": "Söylediklerini hoca başını hafifçe sallayarak dinledi. \"Güzel.\" dedi. Kalbinde ufak bir ışık yandı.",
                        "stat_xp": {"intelligence": 12, "charisma": 8},
                        "skill_xp": {"social": 5},
                        "teacher_rel": 8,
                    },
                    "failure": {
                        "flavor": "Dilinden doğru kelimeler çıkmadı. Hoca sabırla bekledi. \"Bir dahaki derse daha dikkatli ol\" dedi.",
                        "stat_xp": {"intelligence": 6},
                        "skill_xp": {},
                        "teacher_rel": -2,
                    },
                },
                {
                    "id": "sus",
                    "label": "Sessiz kal",
                    "hint": "Başını eğ, geçmesini bekle",
                    "stat_check": None,
                    "success": {
                        "flavor": "Sessiz kaldın. Hoca bir süre bekledi, sonra başka birine döndü. Rahatladın — ama bir şeyleri kaçırdığını hissediyorsun.",
                        "stat_xp": {"intelligence": 4},
                        "skill_xp": {},
                        "teacher_rel": -1,
                    },
                    "failure": None,
                },
                {
                    "id": "yanindakinden_sor",
                    "label": "Yanındakinden sor",
                    "hint": "Fısılda, belki duyulmaz",
                    "stat_check": {"stat": "charisma", "threshold": 3},
                    "success": {
                        "flavor": "Yanındaki arkadaşın kulağına fısıldadı. Hoca fark etmedi. Cevap doğruydu — ama bu sefer başkasının sayesinde.",
                        "stat_xp": {"charisma": 8},
                        "skill_xp": {"social": 6},
                        "teacher_rel": 0,
                    },
                    "failure": {
                        "flavor": "\"Orada ne fısıldıyorsunuz?\" Hoca seni gördü. Yüzün kızardı. Bir dahaki sefere dikkatli olursun.",
                        "stat_xp": {"charisma": 3},
                        "skill_xp": {},
                        "teacher_rel": -6,
                    },
                },
            ],
        },
        {
            "id": "arkadas_ezber",
            "scene": "Sıradaki arkadaşın bugün dersini hiç çalışmamış. Ezber okutma sırası yaklaşıyor; gözlerinde panik var, senden yardım umut ediyor.",
            "icon": "🤝",
            "choices": [
                {
                    "id": "yardim_et",
                    "label": "Fısıldayarak yardım et",
                    "hint": "Arkadaşlık önemli",
                    "stat_check": {"stat": "charisma", "threshold": 2},
                    "success": {
                        "flavor": "Sayfayı gösterdin, o okudu, geçti. Akşam \"Sağ ol\" dedi — gözlerinde gerçek bir minnet vardı.",
                        "stat_xp": {"charisma": 10},
                        "skill_xp": {"social": 8},
                        "teacher_rel": 0,
                    },
                    "failure": {
                        "flavor": "Hoca gördü. İkiniz de uyarı aldınız. Arkadaşın mahçup, sen de.",
                        "stat_xp": {"charisma": 4},
                        "skill_xp": {"social": 2},
                        "teacher_rel": -5,
                    },
                },
                {
                    "id": "gozden_uzak_kal",
                    "label": "Görmezden gel",
                    "hint": "Senin derdin değil",
                    "stat_check": None,
                    "success": {
                        "flavor": "Öne baktın. Arkadaşın kekeleyerek geçti; hoca duymazdan geldi. Ama arkadaşın sana bakmadı.",
                        "stat_xp": {"intelligence": 5},
                        "skill_xp": {},
                        "teacher_rel": 0,
                    },
                    "failure": None,
                },
                {
                    "id": "hocaya_soyle",
                    "label": "Hocaya söyle",
                    "hint": "Kural kuraldır",
                    "stat_check": None,
                    "success": {
                        "flavor": "Hoca durumu anlayarak arkadaşına ek süre verdi. Ama o, sana soğuk baktı. Doğruyu yaptın mıydın?",
                        "stat_xp": {"intelligence": 6},
                        "skill_xp": {"social": -3},
                        "teacher_rel": 7,
                    },
                    "failure": None,
                },
            ],
        },
    ],
    "matematik": [
        {
            "id": "zor_hesap",
            "scene": "Hoca tahtaya bir hesap problemi yazdı. \"Kim çözebilir?\" diye sordu. Kimse kalkmıyor — gözler seni tarıyor.",
            "icon": "🔢",
            "choices": [
                {
                    "id": "tahtaya_cik",
                    "label": "Tahtaya çık",
                    "hint": "Riske gir",
                    "stat_check": {"stat": "intelligence", "threshold": 4},
                    "success": {
                        "flavor": "Tebeşiri aldın, adımları yazdın, sonucu buldun. Hoca \"Doğru\" dedi. Sınıfın sessizliği saygıdan geliyordu.",
                        "stat_xp": {"intelligence": 15, "charisma": 8},
                        "skill_xp": {"trade": 5, "social": 4},
                        "teacher_rel": 10,
                    },
                    "failure": {
                        "flavor": "Tebeşirle yazdın — ama bir yerde hata yaptın. Hoca nazikçe düzeltti. \"Deneme cesareti de bir erdemdir\" dedi.",
                        "stat_xp": {"intelligence": 8, "charisma": 4},
                        "skill_xp": {"trade": 2},
                        "teacher_rel": 4,
                    },
                },
                {
                    "id": "gozle_izle",
                    "label": "Gözle izle",
                    "hint": "Nasıl çözüldüğünü öğren",
                    "stat_check": None,
                    "success": {
                        "flavor": "Bir başkası kalktı. Sen adımları dikkatle takip ettin. Anlamak bazen seyretmekle başlar.",
                        "stat_xp": {"intelligence": 7},
                        "skill_xp": {"trade": 3},
                        "teacher_rel": 0,
                    },
                    "failure": None,
                },
                {
                    "id": "dürüst_ol",
                    "label": "\"Bilmiyorum\" de",
                    "hint": "Dürüstlük de bir erdem",
                    "stat_check": None,
                    "success": {
                        "flavor": "\"Bilmiyorum, ama öğrenmek istiyorum\" dedin. Hoca hafifçe güldü. \"En azından dürüstsün\" dedi ve açıkladı.",
                        "stat_xp": {"intelligence": 6, "charisma": 6},
                        "skill_xp": {"social": 4},
                        "teacher_rel": 5,
                    },
                    "failure": None,
                },
            ],
        },
        {
            "id": "kopya",
            "scene": "Sınav esnasında arkadaşın yanına yaklaştı, fısıldadı: \"Bir soruya takıldım, cevabını göster.\" Hoca dönük, ama her an bakabilir.",
            "icon": "📝",
            "choices": [
                {
                    "id": "izin_ver",
                    "label": "Cevabı göster",
                    "hint": "Arkadaşını kurtar",
                    "stat_check": {"stat": "charisma", "threshold": 3},
                    "success": {
                        "flavor": "Hoca fark etmedi. Arkadaşın geçti. Sana minnetle baktı. Ama kendi cevabından emin miydin?",
                        "stat_xp": {"charisma": 9},
                        "skill_xp": {"social": 7},
                        "teacher_rel": 0,
                    },
                    "failure": {
                        "flavor": "Hoca döndü. İkisi de kağıt iptal. Arkadaşın \"Ben istemedim\" dedi. Bir ihanet mi, yoksa paniği mi?",
                        "stat_xp": {"intelligence": 3},
                        "skill_xp": {},
                        "teacher_rel": -10,
                    },
                },
                {
                    "id": "reddet",
                    "label": "Hayır, kendi çöz",
                    "hint": "Bu sefer değil",
                    "stat_check": None,
                    "success": {
                        "flavor": "\"Hayır\" dedin sessizce. Arkadaşın surat asti. Ama sınav bitti, sen rahat geçtin.",
                        "stat_xp": {"intelligence": 8},
                        "skill_xp": {},
                        "teacher_rel": 2,
                    },
                    "failure": None,
                },
                {
                    "id": "baska_sor",
                    "label": "\"Öbür soruya bak\"",
                    "hint": "Yön ver ama kopya verme",
                    "stat_check": None,
                    "success": {
                        "flavor": "\"Üçüncü soruyu kontrol et\" dedin. Başka bir şey söylemedin. Arkadaşın anladı; biraz kızgın, ama tamamen yıkılmadı.",
                        "stat_xp": {"intelligence": 7, "charisma": 5},
                        "skill_xp": {"social": 3},
                        "teacher_rel": 1,
                    },
                    "failure": None,
                },
            ],
        },
    ],
    "edebiyat": [
        {
            "id": "siir_oku",
            "scene": "Hoca bugün gönüllü şiir okutacak. Sınıf sessiz, kimse kalkacak gibi görünmüyor. Hoca gözlerini dolduruyor.",
            "icon": "📜",
            "choices": [
                {
                    "id": "gonullu_ol",
                    "label": "Gönüllü ol",
                    "hint": "Herkesin önünde oku",
                    "stat_check": {"stat": "charisma", "threshold": 3},
                    "success": {
                        "flavor": "Kalktın, aldın kitabı. Sesi titremeden okudun. Hoca bir şeyler not etti. Sınıf sessizdi — o iyi bir sessizlikti.",
                        "stat_xp": {"charisma": 14, "intelligence": 8},
                        "skill_xp": {"social": 8},
                        "teacher_rel": 10,
                    },
                    "failure": {
                        "flavor": "Sesi biraz titredi, bir kelimeye takıldın. Hoca nazikçe tamamladı. \"Bir dahaki sefere daha iyi olacak\" dedi.",
                        "stat_xp": {"charisma": 7, "intelligence": 5},
                        "skill_xp": {"social": 4},
                        "teacher_rel": 4,
                    },
                },
                {
                    "id": "sessiz_kal",
                    "label": "Sessiz kal",
                    "hint": "Bu kadar dikkat istemiyorsun",
                    "stat_check": None,
                    "success": {
                        "flavor": "Başkası kalktı. Dinledin. Şiir güzeldi. Belki bir gün sen de okursun.",
                        "stat_xp": {"intelligence": 6, "charisma": 3},
                        "skill_xp": {},
                        "teacher_rel": 0,
                    },
                    "failure": None,
                },
                {
                    "id": "arkadasi_oner",
                    "label": "Arkadaşını öner",
                    "hint": "\"O iyi okur\" de",
                    "stat_check": {"stat": "charisma", "threshold": 2},
                    "success": {
                        "flavor": "\"Hocam, Yusuf iyi okur\" dedin. Arkadaşın korkuyla kalktı — ama güzel okudu. Sana teşekkür etti.",
                        "stat_xp": {"charisma": 10},
                        "skill_xp": {"social": 9},
                        "teacher_rel": 3,
                    },
                    "failure": {
                        "flavor": "Arkadaşını işaret ettin ama o hazır değildi. Kekeleyerek geçti. Sana dargın baktı.",
                        "stat_xp": {"charisma": 4},
                        "skill_xp": {"social": -2},
                        "teacher_rel": 0,
                    },
                },
            ],
        },
        {
            "id": "eski_kitap",
            "scene": "Mektep raflarında tozlu bir hikaye kitabı buldun — kimse okumamış. İçinde eski diyarlardan hikayeler, kahramanlar, savaşlar var.",
            "icon": "📚",
            "choices": [
                {
                    "id": "gece_oku",
                    "label": "Gece lambası yanında oku",
                    "hint": "Bütün gece bitir",
                    "stat_check": None,
                    "success": {
                        "flavor": "Sabah gözlerin yanıyordu. Ama zihnin doluydu — kahramanların isimleri, yollar, kararlar. Bazı şeyler uykudan değerlidir.",
                        "stat_xp": {"intelligence": 14},
                        "skill_xp": {"social": 3, "trade": 2},
                        "teacher_rel": 0,
                    },
                    "failure": None,
                },
                {
                    "id": "arkadas_paylas",
                    "label": "Arkadaşınla paylaş",
                    "hint": "İyi şeyleri birlikte yaşa",
                    "stat_check": None,
                    "success": {
                        "flavor": "Birlikte okudunuz, dönüşümlü sayfalar. Konuşmanız geç vakitlere uzadı. Kitap bitti, ama söyleşi bitmedi.",
                        "stat_xp": {"intelligence": 9, "charisma": 7},
                        "skill_xp": {"social": 8},
                        "teacher_rel": 0,
                    },
                    "failure": None,
                },
                {
                    "id": "sat",
                    "label": "Çarşıya götür, sat",
                    "hint": "Parasal değeri daha büyük olabilir",
                    "stat_check": None,
                    "success": {
                        "flavor": "Bir bakkalın rafına koydu. 3 akçe verdi. Kitap gitti. Bir şeylerin para etmediğini daha sonra anlayacaksın.",
                        "stat_xp": {"intelligence": 3},
                        "skill_xp": {"trade": 6},
                        "teacher_rel": 0,
                        "money_bonus": 3,
                    },
                    "failure": None,
                },
            ],
        },
    ],
    "beden": [
        {
            "id": "zorbalik",
            "scene": "Beden dersinin ortasında sınıfın kabadayısı önünü kesti. \"Bugün benimle güreşirsin\" dedi. Herkes izliyor.",
            "icon": "💪",
            "choices": [
                {
                    "id": "karsilik_ver",
                    "label": "Güreş",
                    "hint": "Kaçma, karşı dur",
                    "stat_check": {"stat": "strength", "threshold": 3},
                    "success": {
                        "flavor": "Döndün, tutundu, devirmek için hamle yaptın. Bir adım attı — senin zeminin daha sağlamdı. Yere serdin. Sınıf \"Oh!\" dedi.",
                        "stat_xp": {"strength": 14, "stamina": 8},
                        "skill_xp": {"combat": 10},
                        "teacher_rel": 3,
                    },
                    "failure": {
                        "flavor": "Tutundun ama devirilemedi. O kuvvetliydi. Düştün. Ama kalktın ve sürdürdün. Hoca \"Vazgeçmedi\" dedi alçak sesle.",
                        "stat_xp": {"strength": 8, "stamina": 6},
                        "skill_xp": {"combat": 5},
                        "teacher_rel": 2,
                    },
                },
                {
                    "id": "goz_ardi",
                    "label": "Göz ardı et",
                    "hint": "Zamanını harcama",
                    "stat_check": None,
                    "success": {
                        "flavor": "\"Seninle uğraşmam\" deyip geçtin. O gülümsedi. Bazıları saygı duydu, bazıları eğlendi. Savaşlara değil, hedeflere odaklandın.",
                        "stat_xp": {"intelligence": 6, "charisma": 4},
                        "skill_xp": {"social": 2},
                        "teacher_rel": 0,
                    },
                    "failure": None,
                },
                {
                    "id": "hocaya_sikayet",
                    "label": "Hocaya şikâyet et",
                    "hint": "Kuralı uygulat",
                    "stat_check": None,
                    "success": {
                        "flavor": "Hoca durdu, ikisini de uyardı. Kabadayı ceza aldı. Ama bazı çocuklar \"muhbir\" diye mırıldandı.",
                        "stat_xp": {"intelligence": 5, "charisma": 3},
                        "skill_xp": {"social": -2},
                        "teacher_rel": 8,
                    },
                    "failure": None,
                },
            ],
        },
        {
            "id": "turnuva",
            "scene": "Hoca ani bir duyuru yaptı: \"Bu ay güreş turnuvası! Katılmak isteyen var mı?\" Birkaç el kalktı. Seni de bekliyor.",
            "icon": "🏆",
            "choices": [
                {
                    "id": "katil",
                    "label": "Katıl",
                    "hint": "Meydana çık",
                    "stat_check": {"stat": "strength", "threshold": 3},
                    "success": {
                        "flavor": "İlk rakibini geçtin. İkincisi zordu. Finale kalmadın ama üçüncü oldun. Hoca adını duyurdu. Gurur acı değil, tatlıydı.",
                        "stat_xp": {"strength": 16, "stamina": 10, "charisma": 6},
                        "skill_xp": {"combat": 12},
                        "teacher_rel": 8,
                    },
                    "failure": {
                        "flavor": "İlk turda düştün. Ağrıyordu. Ama herkes orada seni gördü. Kaçmadın — bu bile bir zaferdi.",
                        "stat_xp": {"strength": 8, "stamina": 6},
                        "skill_xp": {"combat": 6},
                        "teacher_rel": 3,
                    },
                },
                {
                    "id": "izle_ogren",
                    "label": "İzle ve öğren",
                    "hint": "Tekniklerini gözlemle",
                    "stat_check": None,
                    "success": {
                        "flavor": "Kenardan her hamleti, her manevrayı gözlemledin. Zihninde not aldın. Bir dahaki turnuva farklı olacak.",
                        "stat_xp": {"intelligence": 8, "stamina": 4},
                        "skill_xp": {"combat": 7},
                        "teacher_rel": 1,
                    },
                    "failure": None,
                },
                {
                    "id": "antrenman_teklifi",
                    "label": "\"Sonraki için antrenman yaparım\"",
                    "hint": "Hazır olmak istemiyorsun ama istiyorsun",
                    "stat_check": None,
                    "success": {
                        "flavor": "Hoca duydu: \"Güzel karar\" dedi. Sana özel bir antrenman programı verecek — bir sonraki turnuvada daha hazır olacaksın.",
                        "stat_xp": {"stamina": 8, "intelligence": 5},
                        "skill_xp": {"combat": 4},
                        "teacher_rel": 6,
                    },
                    "failure": None,
                },
            ],
        },
    ],
}

# EVENT_TRIGGER_CHANCE — ders başına olay tetiklenme olasılığı (R5.1: 0.65 → 0.85)
LESSON_EVENT_CHANCE = 0.85


# ── R5.1: Her olaya eklenen "cesur" seçenek — yüksek risk, hoca anısına yazılır
BRAVE_CHOICES = {
    "din": {
        "id": "cesur", "label": "⚡ Hocaya kendi yorumunu savun",
        "hint": "Cesur — hoca ya bayılır ya köpürür",
        "stat_check": {"stat": "intelligence", "threshold": 5},
        "success": {
            "flavor": "Sözlerin sınıfı sessizliğe boğdu. Hoca uzun uzun baktı: \"Bu yaşta bu idrak...\" Defterine bir şey not etti.",
            "stat_xp": {"intelligence": 18, "charisma": 10}, "skill_xp": {"social": 6},
            "teacher_rel": 12, "memory": "derste kendi yorumunu savunacak kadar cesurdu",
        },
        "failure": {
            "flavor": "Yorumun haddini aştı. Hoca kaşlarını çattı: \"Önce öğren, sonra konuş.\" Sınıf önünde küçüldün.",
            "stat_xp": {"intelligence": 5}, "skill_xp": {},
            "teacher_rel": -8, "memory": "haddini aşan laflar etti, kulağına küpe olsun",
        },
    },
    "matematik": {
        "id": "cesur", "label": "⚡ Hocanın çözümünde açık bulduğunu söyle",
        "hint": "Cesur — haklıysan parlarsın, değilsen yanarsın",
        "stat_check": {"stat": "intelligence", "threshold": 5},
        "success": {
            "flavor": "Tahtaya çıkıp eksik adımı gösterdin. Hoca önce sustu, sonra güldü: \"Pes. Bu çocuk beni geçecek.\"",
            "stat_xp": {"intelligence": 20, "charisma": 8}, "skill_xp": {"trade": 6},
            "teacher_rel": 12, "memory": "hocasının hesabındaki açığı yakaladı",
        },
        "failure": {
            "flavor": "\"Açık\" dediğin şey kendi yanlışındı. Hoca tebeşiri uzattı: \"Buyur, düzelt bakalım.\" Düzeltemedin.",
            "stat_xp": {"intelligence": 6}, "skill_xp": {},
            "teacher_rel": -8, "memory": "bilmeden hocasına kafa tuttu",
        },
    },
    "edebiyat": {
        "id": "cesur", "label": "⚡ Kendi yazdığın dizeleri oku",
        "hint": "Cesur — şair çıkarsın ya da rezil olursun",
        "stat_check": {"stat": "charisma", "threshold": 5},
        "success": {
            "flavor": "Dizelerini okudun; sınıf nefesini tuttu. Hoca: \"Bu mısralar senin mi gerçekten?\" Gözleri parlıyordu.",
            "stat_xp": {"charisma": 18, "intelligence": 8}, "skill_xp": {"social": 8},
            "teacher_rel": 12, "memory": "kendi dizeleriyle sınıfı büyüledi",
        },
        "failure": {
            "flavor": "Kafiyeler döküldü, vezin şaştı. Arka sıradan kıkırdamalar yükseldi. Hoca nazikçe oturttu.",
            "stat_xp": {"charisma": 5}, "skill_xp": {},
            "teacher_rel": -6, "memory": "şairlik hevesi vezinden önce bitti",
        },
    },
    "beden": {
        "id": "cesur", "label": "⚡ Hocayla güreş tutmayı teklif et",
        "hint": "Cesur — efsane olursun ya da toza yapışırsın",
        "stat_check": {"stat": "strength", "threshold": 5},
        "success": {
            "flavor": "Hocayı kündeye getiremedin ama üç nefes dayandın. Hoca seni kaldırırken gülüyordu: \"Bu cesaret terbiye edilirse pehlivan olur.\"",
            "stat_xp": {"strength": 16, "stamina": 12}, "skill_xp": {"combat": 8},
            "teacher_rel": 12, "memory": "hocasına güreş teklif edecek kadar yürekliydi",
        },
        "failure": {
            "flavor": "İki saniyede sırtın mindere yapıştı. Sınıf güldü; hoca elini uzattı: \"Cesaret iyi, ölçü şart.\"",
            "stat_xp": {"strength": 6, "stamina": 4}, "skill_xp": {},
            "teacher_rel": -4, "memory": "gözü kara ama bileği ham",
        },
    },
}


def pick_lesson_event(state, lesson_id):
    """
    Ders için rastgele bir olay seç (%LESSON_EVENT_CHANCE şansla).
    Returns event dict or None.
    """
    if random.random() > LESSON_EVENT_CHANCE:
        return None
    events = LESSON_EVENTS.get(lesson_id, [])
    if not events:
        return None
    # Aynı haftada aynı olay tekrarlanmasın (hafızalı)
    player = state["player"]
    school = player.get("school", {})
    seen_this_week = set(school.get("events_seen_this_week", []))
    available = [e for e in events if e["id"] not in seen_this_week]
    if not available:
        available = events  # Hepsi görüldüyse hepsinden seçilebilir
    return random.choice(available)


def resolve_lesson_event(state, lesson_id, event_id, choice_id):
    """
    Oyuncu bir ders olayında seçimini yaptı. Sonucu hesapla ve uygula.
    attend_lesson ile birlikte çağrılır.
    """
    events = LESSON_EVENTS.get(lesson_id, [])
    event = next((e for e in events if e["id"] == event_id), None)
    if not event:
        return {"ok": False, "error": "Olay bulunamadı."}
    # R5.1: "cesur" her olayda var — derse özgü tanımdan gelir
    if choice_id == "cesur":
        choice = BRAVE_CHOICES.get(lesson_id)
    else:
        choice = next((c for c in event["choices"] if c["id"] == choice_id), None)
    if not choice:
        return {"ok": False, "error": "Seçenek bulunamadı."}

    player = state["player"]
    school = player.get("school", {})

    # Stat check varsa başarı/başarısızlık belirle
    outcome = choice["success"]
    stat_check = choice.get("stat_check")
    if stat_check:
        stat_val = player.get("stats", {}).get(stat_check["stat"], 1)
        roll = random.random()
        chance = min(0.90, 0.35 + stat_val * 0.12)
        if roll > chance and choice.get("failure"):
            outcome = choice["failure"]

    # XP uygula
    leveled = _apply_xp(
        player,
        outcome.get("stat_xp"),
        outcome.get("skill_xp") if (outcome.get("skill_xp") or {}) else None,
    )

    # Negatif social skill xp varsa uygula
    for skill, xp in (outcome.get("skill_xp") or {}).items():
        if xp < 0:
            from skills import add_skill_xp
            add_skill_xp(player, skill, xp)  # negatif XP

    # Para bonusu
    money = outcome.get("money_bonus", 0)
    if money:
        player["money"] = round(player.get("money", 0) + money, 1)

    # Hoca ilişkisi
    teacher_delta = outcome.get("teacher_rel", 0)
    if teacher_delta:
        rel = school.get("teacher_relations", {}).get(lesson_id, 0)
        school.setdefault("teacher_relations", {})[lesson_id] = max(-20, min(100, rel + teacher_delta))

    # R5.1: cesur seçimler hoca hafızasına yazılır
    if outcome.get("memory"):
        mem = school.setdefault("teacher_memory", {}).setdefault(lesson_id, [])
        mem.append(outcome["memory"])
        if len(mem) > 6:
            school["teacher_memory"][lesson_id] = mem[-6:]

    # Bu ayki görülen olaylar
    seen = school.get("events_seen_this_week", [])
    if event_id not in seen:
        seen.append(event_id)
    school["events_seen_this_week"] = seen

    from simulation import _push_event
    lesson_name = LESSONS.get(lesson_id, {}).get("name", lesson_id)
    _push_event(
        state, state.get("turn", 0), "ders_olay",
        f"{player['name']} — {lesson_name}: {event['scene'][:60]}… [{choice['label']}]"
    )

    return {
        "ok": True,
        "event_id": event_id,
        "choice_id": choice_id,
        "flavor": outcome["flavor"],
        "xp_gained": {
            "stat_xp": {k: v for k, v in (outcome.get("stat_xp") or {}).items() if v > 0},
            "skill_xp": {k: v for k, v in (outcome.get("skill_xp") or {}).items() if v > 0},
        },
        "money_bonus": money,
        "leveled": leveled,
        "teacher_rel_delta": teacher_delta,
    }


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
        "lessons_this_week": 0,          # Bu ay kaç ders işlendi (max 1)
        "total_lessons": 0,
        "lesson_counts": {k: 0 for k in LESSONS},  # Per-lesson count
        "exam_week_counter": 0,          # 4 ayda bir sınav
        "exam_history": [],              # [{lesson, passed, turn}]
        "clubs": [],                     # Üye olunan kulüp idleri
        "club_xp_weeks": 0,              # Pasif XP hafta sayacı
        "teacher_relations": {},         # {lesson_id: relation_score}
        "activity_log": [],              # Son 10 aktivite
        "special_event_this_week": None, # Bu ay tamamlanan özel etkinlik id'si
        "seasonal_done_this_week": [],   # Bu ay yapılan mevsimsel aktivite id'leri (list, MongoDB uyumlu)
        "events_seen_this_week": [],     # Bu ay görülen ders olayı id'leri
    })
    # Migration: eski kayıtlara yeni alanları ekle
    school = p["school"]
    school.setdefault("special_event_this_week", None)
    school.setdefault("events_seen_this_week", [])
    # R5: sınıf rekabeti + hoca hafızası
    school.setdefault("teacher_memory", {})
    school.setdefault("term_week", 0)
    school.setdefault("term_no", 1)
    school.setdefault("player_score", 0.0)
    school.setdefault("last_term", None)
    school.setdefault("graduated", False)
    if not school.get("classmates"):
        school["classmates"] = _make_classmates(state)
    else:
        _adopt_real_classmates(state, school["classmates"])
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


_FALLBACK_CLASSMATES = ["Veli", "Ayşe", "Mahmut", "Zeliha", "İbrahim", "Hatice", "Yusuf"]


def _make_classmates(state):
    """R5.2: 5 sınıf arkadaşı — mümkünse dünyadaki gerçek çocuk NPC'ler.
    Gerçek id'ler 5.3'te (yetişkinlikte geri dönüş) işe yarar."""
    player = state.get("player", {})
    loc_id = player.get("location_id")
    kids = [n for n in state.get("world", {}).get("npcs", [])
            if n.get("alive") and 6 <= n.get("age", 99) <= 12]
    kids.sort(key=lambda n: 0 if n.get("location_id") == loc_id else 1)
    mates = []
    for n in kids[:5]:
        mates.append({
            "npc_id": n["id"],
            "name": n["name"].split()[0] if n.get("name") else "Çocuk",
            "aptitude": round(random.uniform(0.6, 1.4), 2),
            "score": 0.0,
        })
    i = 0
    while len(mates) < 5:
        mates.append({
            "npc_id": None,
            "name": _FALLBACK_CLASSMATES[i % len(_FALLBACK_CLASSMATES)],
            "aptitude": round(random.uniform(0.6, 1.4), 2),
            "score": 0.0,
        })
        i += 1
    return mates


def _adopt_real_classmates(state, mates):
    """Dünya başta hep yetişkin doğar; çocuk NPC'ler sonradan doğar.
    Uydurma sıra arkadaşlarını, ortaya çıkan gerçek çocuklarla değiştir
    (5.3'teki geri dönüş gerçek id ister)."""
    synth = [m for m in mates if not m.get("npc_id")]
    if not synth:
        return
    used = {m.get("npc_id") for m in mates}
    kids = [n for n in state.get("world", {}).get("npcs", [])
            if n.get("alive") and 6 <= n.get("age", 99) <= 12
            and n["id"] not in used]
    if not kids:
        return
    loc_id = state.get("player", {}).get("location_id")
    kids.sort(key=lambda n: 0 if n.get("location_id") == loc_id else 1)
    for m in synth:
        if not kids:
            break
        n = kids.pop(0)
        m["npc_id"] = n["id"]
        m["name"] = n["name"].split()[0] if n.get("name") else m["name"]


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
    Oyuncu derse gidiyor.
    Eğer olay tetiklenirse:
      returns {ok: True, needs_event_choice: True, lesson_event: {...}}
      → Henüz XP verilmez, state kaydedilmez. Frontend seçim modalını açar.
    Olay yoksa normal akış:
      returns {ok: True, lesson: ..., xp_gained: ..., leveled: ..., flavor: ..., exam_result: ...}
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
        return {"ok": False, "error": "Bu ay zaten bir ders işledin. Bir sonraki haftaya kadar bekle."}

    # Ders olayı tetikle?
    event = pick_lesson_event(state, lesson_id)
    if event:
        # Olayın choice'larını frontend için hazırla (stat_check bilgisini gizle)
        safe_choices = []
        for c in event["choices"]:
            safe_choices.append({
                "id": c["id"],
                "label": c["label"],
                "hint": c.get("hint", ""),
            })
        # R5.1: her olaya derse özgü "cesur" seçenek eklenir
        brave = BRAVE_CHOICES.get(lesson_id)
        if brave:
            safe_choices.append({
                "id": "cesur", "label": brave["label"],
                "hint": brave["hint"], "brave": True,
            })
        return {
            "ok": True,
            "needs_event_choice": True,
            "lesson_event": {
                "id": event["id"],
                "scene": event["scene"],
                "icon": event.get("icon", "📖"),
                "lesson_id": lesson_id,
                "lesson_name": lesson["name"],
                "choices": safe_choices,
            },
        }

    # Olay yok → normal akış
    return _complete_lesson(state, lesson_id)


def _complete_lesson(state, lesson_id, event_result=None):
    """
    Dersi tamamla: XP ver, sayaçları ilerlet, sınav kontrol et.
    event_result: resolve_lesson_event'ten gelen sonuç (varsa)
    """
    player = state["player"]
    school = player["school"]
    lesson = LESSONS[lesson_id]

    # Base ders XP'si
    leveled = _apply_xp(player, lesson["stat_xp"], lesson["skill_xp"])

    # Sayaçlar
    school["lessons_this_week"] += 1
    school["total_lessons"] += 1
    school["lesson_counts"][lesson_id] = school["lesson_counts"].get(lesson_id, 0) + 1
    school["exam_week_counter"] += 1
    school.setdefault("events_seen_this_week", [])  # migration

    # R5.2: sınıf puanı — ders +1, olaydan yüzünün akıyla çıkmak +0.5
    bonus = 0.5 if event_result and event_result.get("teacher_rel_delta", 0) > 0 else 0.0
    school["player_score"] = round(school.get("player_score", 0.0) + 1.0 + bonus, 2)

    # Hoca ilişkisi (base dersten küçük bonus)
    rel = school["teacher_relations"].get(lesson_id, 0)
    school["teacher_relations"][lesson_id] = min(100, rel + random.randint(1, 3))

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
        "flavor": event_result["flavor"] if event_result else flavor,
    })

    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "ders",
                flavor or f"{player['name']}, {lesson['name']} dersini işledi.")

    result = {
        "ok": True,
        "lesson": lesson["name"],
        "xp_gained": {"stat_xp": lesson["stat_xp"], "skill_xp": lesson["skill_xp"]},
        "leveled": leveled,
        "flavor": flavor,
        "exam_result": exam_result,
        "teacher_relation": school["teacher_relations"][lesson_id],
    }

    # Olay sonucunu birleştir
    if event_result:
        result["event_resolved"] = event_result
        result["flavor"] = event_result["flavor"]
        # Olay XP'sini de leveled listesine ekle
        result["leveled"] = list(set(leveled + event_result.get("leveled", [])))
        # Para bonusunu birleştir
        if event_result.get("money_bonus"):
            result["money_bonus"] = event_result["money_bonus"]

    return result


def attend_lesson_with_choice(state, lesson_id, event_id, choice_id):
    """
    İki adımlı akış: Olay seçimi yapıldı, şimdi dersi tamamla.
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
    if school["lessons_this_week"] >= 1:
        return {"ok": False, "error": "Bu ay zaten bir ders işledin."}

    # Olayı çöz
    event_result = resolve_lesson_event(state, lesson_id, event_id, choice_id)
    if not event_result["ok"]:
        return event_result

    # Dersi tamamla
    return _complete_lesson(state, lesson_id, event_result=event_result)


def _run_exam(state, lesson_id):
    """4 ayda bir sınav. Stat'e göre başarı şansı."""
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
        stat_tr = {"strength": "Kuvvet", "intelligence": "Zekâ",
                   "charisma": "Karizma", "stamina": "Dayanıklılık"}
        return {"ok": False,
                "error": f"{stat_tr.get(req_stat, req_stat)} en az {req_val} olmalı."}

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
                f"{player['name']}, {club['name']}'na adımını attı. Yeni bir topluluk, yeni bir başlangıç.")

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

    # Tekrar kullanım koruması: bu aktivite bu ay zaten yapıldı mı?
    done_list = school.get("seasonal_done_this_week", [])
    if activity_id in done_list:
        return {"ok": False, "error": f"Bu ay '{act['name']}' aktivitesine zaten katıldın. Bir sonraki haftaya kadar bekle."}

    leveled = _apply_xp(player, act.get("stat_xp"), act.get("skill_xp"))

    # Bu ayki tamamlananlar listesine ekle
    done_list.append(activity_id)
    school["seasonal_done_this_week"] = done_list

    _add_activity_log(state, {"type": "mevsimsel", "id": activity_id, "name": act["name"]})
    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "aktivite",
                act.get("flavor") or f"{player['name']}, {act['name']} aktivitesine katıldı.")

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

    # Tekrar kullanım koruması: bu ay zaten bir özel etkinlik tamamlandı mı?
    if school.get("special_event_this_week") is not None:
        done_id = school["special_event_this_week"]
        done_name = next((e["name"] for e in SPECIAL_EVENTS if e["id"] == done_id), done_id)
        return {"ok": False, "error": f"Bu ay zaten bir özel etkinliğe katıldın ({done_name}). Bir sonraki haftaya kadar bekle."}

    leveled = _apply_xp(player, event.get("stat_xp"), event.get("skill_xp"))
    money = event.get("money_bonus", 0)
    if callable(money):
        money = money()
    if money:
        player["money"] = round(player.get("money", 0) + money, 1)

    # Bu aynın etkinliğini kaydet + tamamlananlar listesine ekle
    school["special_event_this_week"] = event_id
    completed = school.setdefault("completed_special_events", [])
    if event_id not in completed:
        completed.append(event_id)

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
    """advance_time içinden çağrılır — her ay."""
    player = state.get("player", {})
    school = player.get("school")
    if player.get("age", 99) >= 13:
        # R5.3: mezuniyet — sıra arkadaşları unutmaz
        if school and not school.get("graduated"):
            _graduate(state)
        return
    if not school:
        return

    # Haftalık sayaçları sıfırla
    school["lessons_this_week"] = 0
    school["special_event_this_week"] = None
    school["seasonal_done_this_week"] = []
    school["events_seen_this_week"] = []

    # R5.2: sınıf rekabeti — arkadaşlar da boş durmuyor
    for m in school.get("classmates", []):
        m["score"] = round(m.get("score", 0.0)
                           + m.get("aptitude", 1.0) * random.uniform(0.5, 1.2), 2)
    school["term_week"] = school.get("term_week", 0) + 1
    if school["term_week"] >= 12:
        _finish_term(state)

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
    school = player.get("school", {})
    done_events = set(school.get("completed_special_events", []))
    if random.random() < 0.20:
        eligible = [
            e for e in SPECIAL_EVENTS
            if e.get("min_age", 7) <= age
            and e["id"] not in done_events  # Aynı özel olay ikinci kez tetiklenemesin
        ]
        if eligible:
            event = random.choice(eligible)
            state.setdefault("pending_special_event", event["id"])


def _standings(school, player_name="Sen"):
    """Sınıf sıralaması: oyuncu + 5 arkadaş, puana göre."""
    rows = [{"name": player_name, "score": round(school.get("player_score", 0.0), 1),
             "is_player": True}]
    for m in school.get("classmates", []) or []:
        rows.append({"name": m["name"], "score": round(m.get("score", 0.0), 1),
                     "is_player": False})
    rows.sort(key=lambda r: r["score"], reverse=True)
    for i, r in enumerate(rows):
        r["rank"] = i + 1
    return rows


def _finish_term(state):
    """R5.2: dönem sonu sıralaması. Birinciye özel ödül."""
    player = state["player"]
    school = player["school"]
    rows = _standings(school, player.get("name", "Sen").split()[0])
    player_rank = next(r["rank"] for r in rows if r["is_player"])
    first = rows[0]

    from simulation import _push_event
    if player_rank == 1:
        _apply_xp(player, {"intelligence": 15, "charisma": 10}, {"social": 8})
        player["reputation"] = player.get("reputation", 0) + 3
        line = (f"Dönem sonu: hoca herkesin önünde adını okudu — SINIF BİRİNCİSİ! "
                f"Babalar çocuklarına seni örnek gösteriyor (+3 itibar).")
    elif player_rank == 2:
        line = f"Dönem sonu: ikincisin. Birinci {first['name']} — adı kulağında küpe olsun."
    else:
        line = (f"Dönem sonu: {player_rank}. sıradasın. Birinci {first['name']} "
                f"burnu havada dolaşıyor.")
    _push_event(state, state.get("turn", 0), "ders", line)
    _add_activity_log(state, {"type": "dönem", "flavor": line})

    school["last_term"] = {
        "term_no": school.get("term_no", 1),
        "player_rank": player_rank,
        "first_name": first["name"],
        "standings": rows,
    }
    school["term_no"] = school.get("term_no", 1) + 1
    school["term_week"] = 0
    school["player_score"] = 0.0
    for m in school.get("classmates", []) or []:
        m["score"] = 0.0


def _graduate(state):
    """R5.3: mektep biter ama sıra arkadaşlığı kalır (S4 tohumu)."""
    player = state["player"]
    school = player["school"]
    school["graduated"] = True
    mate_ids = []
    rels = state.setdefault("relationships", {})
    for m in school.get("classmates", []) or []:
        if not m.get("npc_id"):
            continue
        npc = next((n for n in state["world"]["npcs"] if n["id"] == m["npc_id"]), None)
        if not npc or not npc.get("alive"):
            continue
        mate_ids.append(m["npc_id"])
        rels[m["npc_id"]] = min(100, rels.get(m["npc_id"], 0) + 10)
        try:
            from npc_profile import push_personal_memory
            push_personal_memory(npc, f"{player.get('name', 'Biri')}: mektepte sıra arkadaşıydı",
                                 tur="sira_arkadasi", hafta=state.get("turn", 0))
        except Exception:
            pass
    if mate_ids:
        state.setdefault("seeds", []).append({
            "type": "eski_sira_arkadasi",
            "npc_ids": mate_ids,
            "turn": state.get("turn", 0),
        })
        from simulation import _push_event
        _push_event(state, state.get("turn", 0), "ders",
                    f"{player['name']} mektep çağını geride bıraktı. "
                    f"Sıra arkadaşları bu günleri unutmayacak.")


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
        # R5.2: sınıf rekabeti
        "rekabet": {
            "standings": _standings(school, state["player"].get("name", "Sen").split()[0]),
            "term_week": school.get("term_week", 0),
            "term_no": school.get("term_no", 1),
            "weeks_left": max(0, 12 - school.get("term_week", 0)),
            "last_term": school.get("last_term"),
        },
        "teacher_memory": school.get("teacher_memory", {}),
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
