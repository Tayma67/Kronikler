"""Seyahat Reworku — GDD v7 R7.

Işınlanma devrinin sonu: yol bir mekân.
  - Rota seçimi: Ana Yol (güvenli, han molası) · Patika (hızlı ama
    haydut+hava) · Kervana Katıl (yolcu sohbeti, ticaret fırsatı)
  - Yol eventi GARANTİLİ (en az 1) ve her event gerçek karar içerir.
  - Yolcu profilleri (derviş, kaçak, tüccar, asker) sohbet lezzeti taşır.

Akış: /travel/start rota+event kurar → /travel/resolve seçimi çözer,
oyuncuyu taşır ve ayı ilerletir.
"""
import random


ROUTES = {
    "ana_yol": {
        "label": "Ana Yol", "icon": "🛤",
        "risk": "düşük", "desc": "Taş döşeli, bekçili yol. Han molası seni bekler.",
        "perk": "Güvenli · sosyal fırsat",
    },
    "patika": {
        "label": "Patika", "icon": "⛰",
        "risk": "yüksek", "desc": "Dağdan kestirme. Haydut ve hava insafına kalırsın.",
        "perk": "Sert yol · seni pişirir",
    },
    "kervan": {
        "label": "Kervana Katıl", "icon": "🐫",
        "risk": "düşük", "desc": "Bir tüccar kervanına katıl. Yol uzar, sohbet koyulaşır.",
        "perk": "Yolcu sohbeti · ticaret fırsatı",
    },
}

# Kervan yolcu profilleri — her biri kendi mini sohbet eli
_TRAVELERS = {
    "derviş": {
        "name": "Yaşlı Derviş", "line": "Ateşin başında tespih çeken bir derviş sana yer açtı: \"Yol, yürüyene öğretir evlat.\"",
        "choices": [
            {"id": "dinle", "label": "Hikâyesini dinle", "test": None,
             "hint": "huzur bulursun"},
            {"id": "tartis", "label": "Fikirleriyle tartış", "test": "zekâ",
             "hint": "keskin bir zihin sınavı"},
        ],
    },
    "kaçak": {
        "name": "Gözleri Kaçamak Bir Yolcu", "line": "Kapüşonlu bir yolcu sürekli arkasına bakıyor. Bir şeyden — ya da birinden — kaçtığı belli.",
        "choices": [
            {"id": "sirrini_sor", "label": "Güvenini kazanıp sırrını sor", "test": "sosyal",
             "hint": "tehlikeli bilgi, değerli bağlantı"},
            {"id": "mesafe", "label": "Mesafeni koru", "test": None,
             "hint": "belaya bulaşma"},
        ],
    },
    "tüccar": {
        "name": "Geveze Tüccar", "line": "Baharat kokan heybesiyle bir tüccar lafa daldı: \"Bu yollar bana yirmi yıldır ekmek yediriyor.\"",
        "choices": [
            {"id": "pazarlik_sohbeti", "label": "Ticaretin inceliklerini sor", "test": None,
             "hint": "ustadan ders"},
            {"id": "mal_bak", "label": "Heybesindeki baharata bak (25 akçe)", "test": None,
             "hint": "yol fiyatına mal"},
        ],
    },
    "asker": {
        "name": "Terhis Olmuş Asker", "line": "Yüzü yaralı bir asker matarasını uzattı: \"Sınırdan dönüyorum. Anlatsam roman olur.\"",
        "choices": [
            {"id": "savas_hikayeleri", "label": "Savaş hikâyelerini dinle", "test": None,
             "hint": "tecrübe konuşur"},
            {"id": "bilek_guresi", "label": "Bilek güreşine tutuş (5 akçe bahis)", "test": "güç",
             "hint": "gururuna güveniyorsan"},
        ],
    },
}

# Rota event havuzları
_EVENTS = {
    "ana_yol": [
        {
            "id": "han_molasi",
            "text": "Gün batarken yol üstü hanına vardın. Ocak harlı, yolcular kalabalık.",
            "choices": [
                {"id": "sohbet", "label": "Yolcularla sohbete katıl", "test": "sosyal",
                 "hint": "kulağına bir şeyler çalınabilir"},
                {"id": "ikram", "label": "Meclise bir testi şarap ısmarla (8 akçe)", "test": None,
                 "hint": "adın cömertliğe çıkar"},
                {"id": "erken_yat", "label": "Erken yat, gücünü topla", "test": None,
                 "hint": "dinç uyanırsın"},
            ],
        },
        {
            "id": "gezgin_satici",
            "text": "Yolda tezgâhını sırtında taşıyan bir çerçiye rastladın. \"Şehir fiyatının yarısına!\" diye sesleniyor.",
            "choices": [
                {"id": "iksir_al", "label": "Şifa iksiri al (40 akçe)", "test": None,
                 "hint": "şehirde 80 akçe eder"},
                {"id": "sorgula", "label": "Malın nereden geldiğini sorgula", "test": "zekâ",
                 "hint": "belki bir kurnazlık yakalarsın"},
                {"id": "gec", "label": "Selam verip geç", "test": None,
                 "hint": "yoluna bak"},
            ],
        },
    ],
    "patika": [
        {
            "id": "haydut_pusu",
            "text": "Dar geçitte önüne üç gölge düştü. Paslı ama kararlı kılıçlar: \"Kesen ya da kelle!\"",
            "choices": [
                {"id": "savas", "label": "Kılıcını çek", "test": "dövüş",
                 "hint": "kazanırsan ganimet senin"},
                {"id": "para_ver", "label": "Keseni uzat", "test": None,
                 "hint": "paranın onda biri, canın sağ"},
                {"id": "kac", "label": "Sarp yamaçtan kaç", "test": "dayanıklılık",
                 "hint": "yakalanırsan hem dayak hem para"},
            ],
        },
        {
            "id": "firtina",
            "text": "Gökyüzü bir anda karardı; dolu tanesi taş gibi iniyor. Sığınacak yer görünmüyor.",
            "choices": [
                {"id": "siginak", "label": "Kaya kovuğu ara", "test": "zekâ",
                 "hint": "doğru okursan kuru kalırsın"},
                {"id": "devam", "label": "Dişini sık, yürümeye devam et", "test": None,
                 "hint": "hastalanabilirsin ama yol kısalır"},
            ],
        },
        {
            "id": "ucurum_kestirmesi",
            "text": "Patika ikiye ayrıldı: uçurum kenarından yarım günlük kestirme ya da güvenli dolambaç.",
            "choices": [
                {"id": "tirman", "label": "Uçurum kenarını dene", "test": "dayanıklılık",
                 "hint": "bacakların çelikleşir — ya da kırılır"},
                {"id": "dolan", "label": "Güvenli yoldan dolan", "test": None,
                 "hint": "sıkıcı ama sağlam"},
            ],
        },
    ],
    "kervan": [
        {"id": "yolcu_sohbeti", "text": None, "choices": None},  # profile doldurur
        {
            "id": "kervan_firsati",
            "text": "Kervancıbaşı fazla yükünü gösterdi: \"Varış yerinde sırtımda kalmasın, sana yol fiyatına bırakırım.\"",
            "choices": [
                {"id": "yuk_al", "label": "2 top kumaş al (15 akçe)", "test": None,
                 "hint": "şehirde daha pahalı"},
                {"id": "pazarlik", "label": "Daha da indirmeye çalış", "test": "sosyal",
                 "hint": "tutarsa yarı fiyat, tutmazsa teklif kaçar"},
                {"id": "gec", "label": "İhtiyacım yok", "test": None,
                 "hint": "yoluna bak"},
            ],
        },
    ],
}


def route_list():
    return [{"id": rid, **r} for rid, r in ROUTES.items()]


def start_travel(state, dest_loc, route_id):
    """Rotayı kur, garantili yol eventini seç. pending_travel yazar."""
    if route_id not in ROUTES:
        return None, "Geçersiz rota."
    ev = random.choice(_EVENTS[route_id])
    pending = {
        "dest_id": dest_loc["id"], "dest_name": dest_loc["name"],
        "route": route_id, "event_id": ev["id"],
        "turn": state.get("turn", 0),
    }
    if ev["id"] == "yolcu_sohbeti":
        profile_key = random.choice(list(_TRAVELERS.keys()))
        p = _TRAVELERS[profile_key]
        pending["profile"] = profile_key
        scene = {"text": p["line"], "choices": p["choices"],
                 "traveler": p["name"]}
    else:
        scene = {"text": ev["text"], "choices": ev["choices"]}
    state["pending_travel"] = pending
    return {
        "needs_choice": True,
        "route": route_id, "route_label": ROUTES[route_id]["label"],
        "dest_name": dest_loc["name"],
        **scene,
    }, None


def _test(player, stat_or_skill, base=0.40, per=0.07):
    stats = player.get("stats", {})
    skills = player.get("skills", {})
    val = {"zekâ": stats.get("intelligence", 1), "güç": stats.get("strength", 1),
           "dayanıklılık": stats.get("stamina", 1), "sosyal": skills.get("social", 0),
           "dövüş": skills.get("combat", 0)}.get(stat_or_skill, 1)
    return random.random() < min(0.9, base + val * per)


def _xp(player, kind, key, amt):
    try:
        from skills import add_skill_xp, add_stat_xp
        (add_skill_xp if kind == "skill" else add_stat_xp)(player, key, amt)
    except Exception:
        pass


def resolve_travel(state, choice_id):
    """Yol eventini çöz. Döndürür (result, err). Taşıma/zamanı route halleder."""
    pending = state.get("pending_travel")
    if not pending:
        return None, "Süren bir yolculuk yok."
    state.pop("pending_travel", None)
    player = state["player"]
    ev = pending["event_id"]
    r = {"dest_id": pending["dest_id"], "dest_name": pending["dest_name"],
         "route": pending["route"], "effects": []}

    def eff(text):
        r["effects"].append(text)

    inv = player.setdefault("inventory", {})

    # ── Ana Yol ──
    if ev == "han_molasi":
        if choice_id == "sohbet":
            if _test(player, "sosyal"):
                _xp(player, "skill", "social", 2)
                eff("Sohbet koyulaştı; bir kervancı sana pazar dedikodularını döktü (+2 sosyal).")
            else:
                _xp(player, "skill", "social", 1)
                eff("Kimse yüz vermedi; köşende çorbanı içtin (+1 sosyal).")
        elif choice_id == "ikram":
            if player.get("money", 0) >= 8:
                player["money"] = round(player["money"] - 8, 1)
                player["reputation"] = player.get("reputation", 0) + 2
                _xp(player, "stat", "charisma", 1)
                eff("Meclis şerefine kadeh kaldırdı; adın cömertliğe çıktı (+2 itibar).")
            else:
                eff("Kesende 8 akçe yokmuş — mahcup oldun.")
        else:  # erken_yat
            player["health"] = min(100, player.get("health", 100) + 5)
            eff("Kuş tüyü olmasa da temiz bir döşekte uyudun (+5 sağlık).")

    elif ev == "gezgin_satici":
        if choice_id == "iksir_al":
            if player.get("money", 0) >= 40:
                player["money"] = round(player["money"] - 40, 1)
                inv["şifa_iksiri"] = inv.get("şifa_iksiri", 0) + 1
                eff("Şifa iksirini yarı fiyata kaptın (+1 şifa iksiri).")
            else:
                eff("Kesen yetmedi; çerçi omuz silkip yoluna gitti.")
        elif choice_id == "sorgula":
            if _test(player, "zekâ"):
                _xp(player, "stat", "intelligence", 1)
                player["money"] = round(player.get("money", 0) + 10, 1)
                eff("Malın kaçak olduğunu sezdin; susma payı olarak 10 akçe kopardın (+1 zekâ).")
            else:
                eff("Çerçi lafı dolandırdı, sen de işin peşini bıraktın.")
        else:
            eff("Selamı alıp yoluna baktın.")

    # ── Patika ──
    elif ev == "haydut_pusu":
        if choice_id == "savas":
            if _test(player, "dövüş", base=0.35, per=0.08):
                gain = random.randint(20, 60)
                player["money"] = round(player.get("money", 0) + gain, 1)
                _xp(player, "skill", "combat", 2)
                eff(f"Haydutlar dağıldı; elebaşının kesesi sende kaldı (+{gain} akçe, +2 dövüş).")
            else:
                loss = round(player.get("money", 0) * 0.2, 1)
                player["money"] = round(player.get("money", 0) - loss, 1)
                player["health"] = max(5, player.get("health", 100) - 15)
                eff(f"Dayak yedin, keseni kaptırdın (−{loss} akçe, −15 sağlık).")
        elif choice_id == "para_ver":
            loss = round(player.get("money", 0) * 0.1, 1)
            player["money"] = round(player.get("money", 0) - loss, 1)
            eff(f"Keseni uzattın; haydutlar yol verdi (−{loss} akçe).")
        else:  # kac
            if _test(player, "dayanıklılık", base=0.45):
                _xp(player, "stat", "stamina", 1)
                eff("Yamaçtan keçi gibi kaçtın; arkandan küfürler yankılandı (+1 dayanıklılık).")
            else:
                loss = round(player.get("money", 0) * 0.1, 1)
                player["money"] = round(player.get("money", 0) - loss, 1)
                player["health"] = max(5, player.get("health", 100) - 10)
                eff(f"Yakalandın; hem dayak hem haraç (−{loss} akçe, −10 sağlık).")

    elif ev == "firtina":
        if choice_id == "siginak":
            if _test(player, "zekâ"):
                _xp(player, "stat", "intelligence", 1)
                eff("Rüzgârın yönünü okuyup kuru bir kovuk buldun; fırtınayı seyrettin (+1 zekâ).")
            else:
                player["health"] = max(5, player.get("health", 100) - 8)
                eff("Bulduğun kovuk sel yatağıymış — sırılsıklam donedin (−8 sağlık).")
        else:
            player["health"] = max(5, player.get("health", 100) - 12)
            _xp(player, "stat", "stamina", 1)
            eff("Doluya karşı yürüdün; hasta gibisin ama yol kısaldı (−12 sağlık, +1 dayanıklılık).")

    elif ev == "ucurum_kestirmesi":
        if choice_id == "tirman":
            if _test(player, "dayanıklılık"):
                _xp(player, "stat", "stamina", 2)
                eff("Uçurum kenarında nefesin kesildi ama bacakların çelikleşti (+2 dayanıklılık).")
            else:
                player["health"] = max(5, player.get("health", 100) - 15)
                eff("Ayağın kaydı; son anda bir köke tutundun (−15 sağlık).")
        else:
            eff("Dolambaçlı ama sağlam yoldan vardın. Macera başka bahara.")

    # ── Kervan ──
    elif ev == "yolcu_sohbeti":
        profile = pending.get("profile", "derviş")
        if profile == "derviş":
            if choice_id == "dinle":
                player["health"] = min(100, player.get("health", 100) + 5)
                _xp(player, "stat", "intelligence", 1)
                eff("Dervişin kıssaları içini yıkadı (+5 sağlık, +1 zekâ).")
            else:
                if _test(player, "zekâ"):
                    _xp(player, "stat", "intelligence", 2)
                    eff("Tartışmada dervişi bile güldürdün: \"Sende ışık var evlat\" (+2 zekâ).")
                else:
                    player["reputation"] = player.get("reputation", 0) - 1
                    eff("Lafların havada kaldı; kervan ehli kıs kıs güldü (−1 itibar).")
        elif profile == "kaçak":
            if choice_id == "sirrini_sor":
                if _test(player, "sosyal"):
                    _xp(player, "skill", "social", 2)
                    player["money"] = round(player.get("money", 0) + 15, 1)
                    eff("Kaçak, borçlu olduğu tefecinin sakladığı keseden bahsetti; tüyo para etti (+15 akçe, +2 sosyal).")
                else:
                    eff("Yolcu kabuğuna çekildi; bir daha tek kelime etmedi.")
            else:
                eff("Mesafeni korudun; bazı yolcuların hikâyesi bilinmese daha iyidir.")
        elif profile == "tüccar":
            if choice_id == "pazarlik_sohbeti":
                _xp(player, "skill", "trade", 2)
                eff("Yirmi yıllık kurnazlıkları bir gecede dinledin (+2 ticaret).")
            else:
                if player.get("money", 0) >= 25:
                    player["money"] = round(player["money"] - 25, 1)
                    inv["baharat"] = inv.get("baharat", 0) + 1
                    eff("Heybeden bir kese baharatı yol fiyatına aldın (+1 baharat).")
                else:
                    eff("Kesen yetmedi; tüccar nazikçe heybesini kapadı.")
        else:  # asker
            if choice_id == "savas_hikayeleri":
                _xp(player, "skill", "combat", 2)
                eff("Sınır hikâyelerinden kılıç tutuşu bile öğrendin (+2 dövüş).")
            else:
                if player.get("money", 0) >= 5 and _test(player, "güç"):
                    player["money"] = round(player.get("money", 0) + 5, 1)
                    _xp(player, "stat", "strength", 1)
                    eff("Bileğini masaya çaktın; asker gülerek bahsi ödedi (+5 akçe, +1 güç).")
                elif player.get("money", 0) >= 5:
                    player["money"] = round(player["money"] - 5, 1)
                    eff("Bileğin masaya çakıldı; bahis gitti, dostluk kaldı (−5 akçe).")
                else:
                    eff("Bahse girecek akçen bile yok; asker matarasından bir yudum verdi.")

    elif ev == "kervan_firsati":
        if choice_id == "yuk_al":
            if player.get("money", 0) >= 15:
                player["money"] = round(player["money"] - 15, 1)
                inv["kumaş"] = inv.get("kumaş", 0) + 2
                eff("İki top kumaşı yol fiyatına aldın (+2 kumaş).")
            else:
                eff("Kesen yetmedi; kervancı omuz silkti.")
        elif choice_id == "pazarlik":
            if _test(player, "sosyal"):
                if player.get("money", 0) >= 8:
                    player["money"] = round(player["money"] - 8, 1)
                    inv["kumaş"] = inv.get("kumaş", 0) + 2
                    _xp(player, "skill", "trade", 2)
                    eff("Kervancı kahkahayla indirdi: \"Dilin keskinmiş!\" (2 kumaş 8 akçeye, +2 ticaret).")
                else:
                    eff("Fiyatı indirttin ama kesen 8 akçeyi bile bulamadı.")
            else:
                eff("Üsteledin; kervancı sıkılıp teklifini geri çekti.")
        else:
            eff("İhtiyacın yoktu; yükün hafif kalsın.")

    else:
        return None, "Geçersiz olay."

    return r, None
