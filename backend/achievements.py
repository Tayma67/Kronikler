# -*- coding: utf-8 -*-
"""Başarım sistemi — GDD v5 Faz 5E (50 başarım).

Veri-tabanlı: her başarım state üzerinde çalışan bir koşul lambda'sı taşır.
check_achievements(state) haftalık tick'te ve istek anında çağrılır;
yeni açılanlar state["achievements"] listesine yazılır ve event düşer.
"""


def _p(state):
    return state["player"]


ACHIEVEMENTS = [
    # ── Yaşam yolculuğu ──────────────────────────────────────────────────
    {"id": "ilk_adim", "icon": "👣", "title": "İlk Adım",
     "desc": "İlk ayı ilerlet.", "check": lambda s: s.get("turn", 0) >= 1},
    {"id": "bir_yil", "icon": "🌱", "title": "Dört Mevsim",
     "desc": "Bir yıl hayatta kal.", "check": lambda s: s.get("turn", 0) >= 52},
    {"id": "bes_yil", "icon": "🌳", "title": "Kök Salmak",
     "desc": "Beş yıl hayatta kal.", "check": lambda s: s.get("turn", 0) >= 260},
    {"id": "delikanli", "icon": "🧑", "title": "Delikanlılık Çağı",
     "desc": "13 yaşına ulaş.", "check": lambda s: _p(s).get("age", 7) >= 13},
    {"id": "yetiskin", "icon": "🎖", "title": "Reşit",
     "desc": "18 yaşına ulaş.", "check": lambda s: _p(s).get("age", 7) >= 18},
    {"id": "orta_yas", "icon": "🧔", "title": "Hayatın Ortası",
     "desc": "40 yaşına ulaş.", "check": lambda s: _p(s).get("age", 7) >= 40},
    {"id": "ihtiyar", "icon": "🧓", "title": "Ak Saçlar",
     "desc": "60 yaşına ulaş.", "check": lambda s: _p(s).get("age", 7) >= 60},
    {"id": "asirlik", "icon": "🦉", "title": "Yaşayan Efsane",
     "desc": "70 yaşını gör.", "check": lambda s: _p(s).get("age", 7) >= 70},

    # ── Servet ───────────────────────────────────────────────────────────
    {"id": "ilk_yuz", "icon": "🪙", "title": "İlk Yüzlük",
     "desc": "100 altın biriktir.", "check": lambda s: _p(s).get("money", 0) >= 100},
    {"id": "bin_akce", "icon": "💰", "title": "Kese Doldu",
     "desc": "1.000 altın biriktir.", "check": lambda s: _p(s).get("money", 0) >= 1000},
    {"id": "bes_bin", "icon": "🏦", "title": "Varlıklı",
     "desc": "5.000 altın biriktir.", "check": lambda s: _p(s).get("money", 0) >= 5000},
    {"id": "elli_bin", "icon": "👑", "title": "Servet Sahibi",
     "desc": "50.000 altın biriktir.", "check": lambda s: _p(s).get("money", 0) >= 50000},

    # ── Mülk ─────────────────────────────────────────────────────────────
    {"id": "ilk_mulk", "icon": "🏡", "title": "Toprak Sahibi",
     "desc": "İlk mülkünü satın al.", "check": lambda s: len(s.get("properties", [])) >= 1},
    {"id": "mulk_baronu", "icon": "🏘", "title": "Mülk Baronu",
     "desc": "Aynı anda 5 mülke sahip ol.", "check": lambda s: len(s.get("properties", [])) >= 5},
    {"id": "konak_sahibi", "icon": "🏰", "title": "Konak Sahibi",
     "desc": "Evini konağa genişlet.",
     "check": lambda s: any(p["type"] == "ev" and p["config"].get("tier", 1) >= 4
                            for p in s.get("properties", []))},
    {"id": "isveren", "icon": "🤝", "title": "İşveren",
     "desc": "3 işçi çalıştır.",
     "check": lambda s: sum(len(p.get("workers", [])) for p in s.get("properties", [])) >= 3},
    {"id": "ilk_hasat", "icon": "🌾", "title": "İlk Hasat",
     "desc": "Tarlandan hasat topla.",
     "check": lambda s: any(e.get("type") == "mülk_hasat" for e in s.get("chronicle", []))},

    # ── Hikâye ───────────────────────────────────────────────────────────
    {"id": "ilk_hikaye", "icon": "📖", "title": "Hikâye Anlatıcısı",
     "desc": "İlk hikâye yayını tamamla.",
     "check": lambda s: any(q["status"] == "tamamlandı" for q in s.get("story_quests", []))},
    {"id": "uc_hikaye", "icon": "📚", "title": "Kader Dokuyucusu",
     "desc": "3 hikâye yayını tamamla.",
     "check": lambda s: sum(1 for q in s.get("story_quests", [])
                            if q["status"] == "tamamlandı") >= 3},
    {"id": "kullerin_efendisi", "icon": "🔥", "title": "Küllerin Efendisi",
     "desc": "Küllerin Sırrı'nı çöz.",
     "check": lambda s: s.get("story_flags", {}).get("kül_tamam") is True},
    {"id": "cemiyet_golgesi", "icon": "🕯", "title": "Gölgelerin İçinde",
     "desc": "Gizli Cemiyet'e katıl.",
     "check": lambda s: s.get("story_flags", {}).get("cemiyet_üye") is True},
    {"id": "veba_kahramani", "icon": "⚕", "title": "Salgının Kahramanı",
     "desc": "Vebadan şehri kurtar.",
     "check": lambda s: s.get("story_flags", {}).get("veba_kahraman") is True},
    {"id": "ipek_baronu", "icon": "🐪", "title": "İpek Yolu Baronu",
     "desc": "İpek Yolu Rüyası'nı gerçekleştir.",
     "check": lambda s: s.get("story_flags", {}).get("ipek_baron") is True},
    {"id": "haydut_krali_b", "icon": "🗡", "title": "Ormanın Kralı",
     "desc": "Haydut Kralı ol.",
     "check": lambda s: s.get("story_flags", {}).get("haydut_kral") is True},
    {"id": "tutorial_tamam", "icon": "🎓", "title": "İlk Yılın Bilgesi",
     "desc": "İlk Yıl rehberini tamamla.",
     "check": lambda s: s.get("story_flags", {}).get("tutorial_tamam") is True},

    # ── Savaş ────────────────────────────────────────────────────────────
    {"id": "ilk_zafer", "icon": "⚔", "title": "İlk Kan",
     "desc": "Bir çatışma kazan.",
     "check": lambda s: any(e.get("type") == "savaş_zaferi" for e in s.get("chronicle", []))},
    {"id": "turnuva_sampiyonu", "icon": "🏆", "title": "Turnuva Şampiyonu",
     "desc": "Bir turnuvayı kazan.",
     "check": lambda s: any(e.get("type") == "savaş_zaferi" and "Turnuva" in e.get("text", "")
                            for e in s.get("chronicle", []))},
    {"id": "komutan", "icon": "🎖", "title": "Komutan",
     "desc": "Örgüt savaşında orduya komuta et.",
     "check": lambda s: any(e.get("type") == "komutan_savaşı" for e in s.get("chronicle", []))},
    {"id": "savas_ustasi", "icon": "🥋", "title": "Savaş Ustası",
     "desc": "Savaş becerisini 7'ye çıkar.",
     "check": lambda s: _p(s).get("skills", {}).get("combat", 0) >= 7},
    {"id": "yara_izi", "icon": "🩹", "title": "Yara İzleri",
     "desc": "Bir yaralanmadan sağ çık.",
     "check": lambda s: bool(_p(s).get("injuries")) or
                        any(e.get("type") == "savaş_kaybı" for e in s.get("chronicle", []))},

    # ── Beceri & stat ────────────────────────────────────────────────────
    {"id": "zeki", "icon": "🧠", "title": "Keskin Zihin",
     "desc": "Zekayı 8'e çıkar.", "check": lambda s: _p(s)["stats"].get("intelligence", 0) >= 8},
    {"id": "guclu", "icon": "💪", "title": "Demir Bilek",
     "desc": "Gücü 8'e çıkar.", "check": lambda s: _p(s)["stats"].get("strength", 0) >= 8},
    {"id": "karizmatik", "icon": "✨", "title": "Büyüleyici",
     "desc": "Karizmayı 8'e çıkar.", "check": lambda s: _p(s)["stats"].get("charisma", 0) >= 8},
    {"id": "tuccar_ruhu", "icon": "📈", "title": "Tüccar Ruhu",
     "desc": "Ticaret becerisini 7'ye çıkar.",
     "check": lambda s: _p(s).get("skills", {}).get("trade", 0) >= 7},
    {"id": "usta_eller", "icon": "🛠", "title": "Usta Eller",
     "desc": "Zanaat becerisini 7'ye çıkar.",
     "check": lambda s: _p(s).get("skills", {}).get("crafting", 0) >= 7},

    # ── Toplum ───────────────────────────────────────────────────────────
    {"id": "saygin", "icon": "🎩", "title": "Saygın",
     "desc": "İtibarını 50'ye çıkar.", "check": lambda s: _p(s).get("reputation", 0) >= 50},
    {"id": "efsane_itibar", "icon": "🌟", "title": "Halkın Efsanesi",
     "desc": "İtibarını 80'e çıkar.", "check": lambda s: _p(s).get("reputation", 0) >= 80},
    {"id": "korku_sal", "icon": "😈", "title": "Adı Korkuyla Anılan",
     "desc": "Korku seviyeni 30'a çıkar.", "check": lambda s: _p(s).get("fear", 0) >= 30},
    {"id": "evlilik", "icon": "💍", "title": "Yuva Kuran",
     "desc": "Evlen.", "check": lambda s: bool(_p(s).get("spouse_id"))},
    {"id": "ebeveyn", "icon": "👶", "title": "Ebeveyn",
     "desc": "Çocuk sahibi ol.", "check": lambda s: bool(_p(s).get("children_ids"))},
    {"id": "buyuk_aile", "icon": "👨‍👩‍👧‍👦", "title": "Büyük Aile",
     "desc": "3 çocuk sahibi ol.", "check": lambda s: len(_p(s).get("children_ids", [])) >= 3},
    {"id": "orgut_uyesi", "icon": "🛡", "title": "Örgütlü",
     "desc": "Bir örgüte katıl.", "check": lambda s: bool(_p(s).get("faction_id"))},

    # ── Hanedan & geç oyun ───────────────────────────────────────────────
    {"id": "ikinci_nesil", "icon": "🔄", "title": "Nesilden Nesile",
     "desc": "İkinci nesle geç.", "check": lambda s: s.get("generation", 1) >= 2},
    {"id": "ucuncu_nesil", "icon": "🌀", "title": "Hanedan Zinciri",
     "desc": "Üçüncü nesle geç.", "check": lambda s: s.get("generation", 1) >= 3},
    {"id": "taninan_aile", "icon": "🏛", "title": "Tanınan Aile",
     "desc": "Hanedan puanını 50'ye çıkar.",
     "check": lambda s: s.get("dynasty", {}).get("score", 0) >= 50},
    {"id": "soylu_hanedan", "icon": "⚜", "title": "Soylu Hanedan",
     "desc": "Hanedan puanını 200'e çıkar.",
     "check": lambda s: s.get("dynasty", {}).get("score", 0) >= 200},
    {"id": "kral", "icon": "👑", "title": "Taht Sahibi",
     "desc": "Kral ol.", "check": lambda s: _p(s).get("profession") == "kral"},
    {"id": "kurucu", "icon": "🏗", "title": "Kurucu",
     "desc": "Kendi yerleşimini kur.",
     "check": lambda s: any(l.get("founded_by_player") for l in s["world"]["locations"])},
    {"id": "vasiyet_yazan", "icon": "📜", "title": "Son Söz",
     "desc": "Vasiyetini düzenle.",
     "check": lambda s: bool(s.get("will", {}).get("style"))},
    {"id": "cag_taniyan", "icon": "🌍", "title": "Çağların Tanığı",
     "desc": "Bir çağ olayına tanıklık et.",
     "check": lambda s: any(e.get("type") == "çağ_olayı" for e in s.get("chronicle", []))},
]


def ensure_achievements(state):
    state.setdefault("achievements", [])


def check_achievements(state, day=None):
    """Koşulları tara; yeni açılanları işle ve listesini döndür."""
    ensure_achievements(state)
    unlocked = set(state["achievements"])
    newly = []
    for ach in ACHIEVEMENTS:
        if ach["id"] in unlocked:
            continue
        try:
            if ach["check"](state):
                state["achievements"].append(ach["id"])
                newly.append(ach)
        except Exception:
            continue
    if newly:
        from simulation import _push_event
        for ach in newly:
            _push_event(state, day if day is not None else state.get("turn", 0),
                        "başarım", f"🏅 Başarım açıldı: {ach['icon']} {ach['title']}")
    return newly


def achievement_list(state):
    ensure_achievements(state)
    unlocked = set(state["achievements"])
    return [{"id": a["id"], "icon": a["icon"], "title": a["title"],
             "desc": a["desc"], "unlocked": a["id"] in unlocked}
            for a in ACHIEVEMENTS]
