"""Dünya Olayları Sistemi — Her ay (4 hafta) dünya olayları oluşur.
Olaylar oyuncudan bağımsız olarak dünyayı etkiler: ekonomi, güvenlik,
mutluluk, NPC diyalogları ve fırsatlar bu olaylardan etkilenir.
"""
import random
from world_gen import new_id, GOODS, GOOD_BASE_PRICES

# ─── Olay Kategorileri ──────────────────────────────────────────────────────

CAT_DOGA     = "doğa"       # Kuraklık, yangın, bereketli hasat
CAT_SOSYAL   = "sosyal"     # Festival, dini kutlama, soylu düğünü
CAT_EKONOMI  = "ekonomi"    # Ticaret patlaması, yeni maden
CAT_TEHLIKE  = "tehlike"    # Salgın, haydut, asker toplama
CAT_HABER    = "haber"      # Ünlü birinin ölümü, göç dalgası

# Her olay tipi: (category, base_chance_per_month, min_duration_weeks, max_duration_weeks)
# duration = olay kaç hafta aktif kalır
EVENT_TYPES = {
    "kuraklık": (CAT_DOGA, 0.18, 4, 12),
    "bereketli_hasat": (CAT_DOGA, 0.20, 2, 4),
    "büyük_yangın": (CAT_DOGA, 0.10, 1, 2),
    "salgın_hastalık": (CAT_TEHLIKE, 0.12, 4, 8),
    "haydut_saldırıları": (CAT_TEHLIKE, 0.22, 2, 6),
    "asker_toplama": (CAT_TEHLIKE, 0.15, 2, 4),
    "ticaret_patlaması": (CAT_EKONOMI, 0.15, 3, 6),
    "yeni_maden": (CAT_EKONOMI, 0.08, 4, 8),
    "festival": (CAT_SOSYAL, 0.25, 1, 2),
    "dini_kutlama": (CAT_SOSYAL, 0.20, 1, 2),
    "soylu_düğünü": (CAT_SOSYAL, 0.15, 1, 2),
    "göç_dalgası": (CAT_HABER, 0.12, 2, 4),
    "ünlü_ölümü": (CAT_HABER, 0.10, 1, 2),
}

# ─── Olay Efektleri ─────────────────────────────────────────────────────────

def _apply_event_effects(state, event_type, loc, day):
    """Olayın dünya üzerindeki anlık etkilerini uygular."""
    from simulation import _recompute_prices, _push_event

    market = loc.get("market", {})

    if event_type == "kuraklık":
        # Gıda fiyatları yükselir, tarım geliri düşer
        loc["wealth"] = max(5, loc["wealth"] - random.randint(5, 15))
        for good in ("buğday", "ekmek", "et"):
            if good in market:
                market[good]["supply"] = max(0, market[good]["supply"] - random.randint(15, 35))
                market[good]["demand"] = min(9999, market[good]["demand"] + random.randint(10, 25))
        _recompute_prices(loc)

    elif event_type == "bereketli_hasat":
        # Gıda bolluğu, çiftçi geliri artar
        loc["wealth"] = min(100, loc["wealth"] + random.randint(5, 12))
        loc["prosperity"] = min(100, loc["prosperity"] + random.randint(3, 8))
        for good in ("buğday", "ekmek", "et"):
            if good in market:
                market[good]["supply"] = min(9999, market[good]["supply"] + random.randint(20, 50))
        _recompute_prices(loc)

    elif event_type == "büyük_yangın":
        # Büyük kayıp, odun talebi artar
        loc["wealth"] = max(5, loc["wealth"] - random.randint(10, 25))
        loc["security"] = max(5, loc["security"] - random.randint(5, 15))
        loc["prosperity"] = max(5, loc["prosperity"] - random.randint(8, 20))
        if "odun" in market:
            market["odun"]["demand"] = min(9999, market["odun"]["demand"] + random.randint(20, 40))
        _recompute_prices(loc)

    elif event_type == "salgın_hastalık":
        # Nüfus sağlık kaybı, ticaret durur
        loc["prosperity"] = max(5, loc["prosperity"] - random.randint(5, 15))
        loc["security"] = max(5, loc["security"] - random.randint(3, 10))
        # Hastalan NPC'ler
        npcs_here = [n for n in state["world"]["npcs"]
                     if n.get("alive") and n.get("location_id") == loc["id"]]
        victims = random.sample(npcs_here, min(len(npcs_here), random.randint(2, 6)))
        for npc in victims:
            npc["health"] = max(10, npc["health"] - random.randint(10, 30))

    elif event_type == "haydut_saldırıları":
        # Güvenlik düşer, ticaret zarar görür
        loc["security"] = max(5, loc["security"] - random.randint(10, 25))
        loc["wealth"] = max(5, loc["wealth"] - random.randint(3, 12))
        # Kervan malları azalır
        for good in random.sample(list(market.keys()), min(3, len(market))):
            market[good]["supply"] = max(0, market[good]["supply"] - random.randint(5, 15))
        _recompute_prices(loc)

    elif event_type == "asker_toplama":
        # Genç erkek NPC'ler tehlikede, silah talebi artar
        if "silah" in market:
            market["silah"]["demand"] = min(9999, market["silah"]["demand"] + random.randint(20, 40))
        _recompute_prices(loc)

    elif event_type == "ticaret_patlaması":
        # Tüm mallar talep görür, servete katkı
        loc["wealth"] = min(100, loc["wealth"] + random.randint(8, 18))
        loc["prosperity"] = min(100, loc["prosperity"] + random.randint(5, 12))
        for good in market:
            market[good]["demand"] = min(9999, market[good]["demand"] + random.randint(8, 20))
        _recompute_prices(loc)

    elif event_type == "yeni_maden":
        # Maden arzı artar, uzun vadeli refah
        loc["wealth"] = min(100, loc["wealth"] + random.randint(5, 15))
        if "demir" in market:
            market["demir"]["supply"] = min(9999, market["demir"]["supply"] + random.randint(30, 60))
        _recompute_prices(loc)

    elif event_type == "festival":
        # Mutluluk artar, yiyecek tüketimi artar
        loc["prosperity"] = min(100, loc["prosperity"] + random.randint(5, 15))
        for good in ("ekmek", "et"):
            if good in market:
                market[good]["demand"] = min(9999, market[good]["demand"] + random.randint(10, 20))
        _recompute_prices(loc)
        # NPC'ler mutlu olur
        npcs_here = [n for n in state["world"]["npcs"]
                     if n.get("alive") and n.get("location_id") == loc["id"]]
        for npc in npcs_here[:min(len(npcs_here), 10)]:
            npc["health"] = min(100, npc.get("health", 80) + random.randint(2, 8))

    elif event_type == "dini_kutlama":
        # Topluluk bağı güçlenir
        loc["prosperity"] = min(100, loc["prosperity"] + random.randint(3, 10))
        loc["security"] = min(100, loc["security"] + random.randint(2, 6))

    elif event_type == "soylu_düğünü":
        # Zenginler şehre gelir, ticaret canlanır
        loc["wealth"] = min(100, loc["wealth"] + random.randint(5, 12))
        loc["prosperity"] = min(100, loc["prosperity"] + random.randint(5, 10))
        for good in ("kumaş", "ipek") if "ipek" in market else ("kumaş",):
            if good in market:
                market[good]["demand"] = min(9999, market[good]["demand"] + random.randint(10, 25))
        _recompute_prices(loc)

    elif event_type == "göç_dalgası":
        # Nüfus artar, tüm kaynaklar artar ama güvenlik düşer
        loc["security"] = max(5, loc["security"] - random.randint(3, 10))
        loc["population"] = int(loc.get("population", 100) * random.uniform(1.05, 1.15))
        for good in market:
            market[good]["demand"] = min(9999, market[good]["demand"] + random.randint(5, 15))
        _recompute_prices(loc)

    elif event_type == "ünlü_ölümü":
        # Yas havası, ekonomi yavaşlar
        loc["prosperity"] = max(5, loc["prosperity"] - random.randint(3, 8))


# ─── Olay Metinleri ─────────────────────────────────────────────────────────

def _event_texts(event_type, loc_name, extra=None):
    """Olay için başlık ve detay metni döndürür."""
    texts = {
        "kuraklık": {
            "title": f"Kuraklık: {loc_name}",
            "headline": f"{loc_name}'de Kuraklık Baş Gösterdi",
            "detail": (
                f"Yağmurlar kesildi, tarlalar çatladı. {loc_name}'de buğday ve besin "
                f"fiyatları hızla yükseliyor. Çiftçilerin geçimi tehlikede. "
                f"Tüccarlar gıda stoğu için şehre akın ediyor."
            ),
            "effects": [
                "🌾 Gıda fiyatları yükseldi",
                "💰 Çiftçi geliri düştü",
                "📦 Buğday arzı azaldı",
            ],
        },
        "bereketli_hasat": {
            "title": f"Bereketli Hasat: {loc_name}",
            "headline": f"{loc_name}'de Bol Hasat Sevinci",
            "detail": (
                f"Bu yıl {loc_name} toprakları bereketini sonuna kadar sundu. "
                f"Ahırlar tahıl dolu, çiftçilerin yüzü gülüyor. "
                f"Gıda fiyatları düştü, halk bolluk içinde."
            ),
            "effects": [
                "🌾 Gıda bolluğu yaşandı",
                "💰 Çiftçi geliri arttı",
                "📈 Refah yükseldi",
            ],
        },
        "büyük_yangın": {
            "title": f"Büyük Yangın: {loc_name}",
            "headline": f"{loc_name}'de Yangın Felaketi",
            "detail": (
                f"Gece yarısı çıkan bir yangın {loc_name}'in büyük bölümünü küle çevirdi. "
                f"Mahalleler hasar gördü, halk evsiz kaldı. "
                f"İnşaat için tahta ve malzeme talebi fırladı."
            ),
            "effects": [
                "🔥 Büyük hasar oluştu",
                "🏚️ Güvenlik azaldı",
                "🪵 Odun talebi arttı",
            ],
        },
        "salgın_hastalık": {
            "title": f"Salgın: {loc_name}",
            "headline": f"{loc_name}'de Hastalık Yayılıyor",
            "detail": (
                f"Bilinmeyen bir hastalık {loc_name}'de hızla yayılmaya başladı. "
                f"Hasta sayısı her geçen gün artıyor, pazar yerleri boşaldı. "
                f"Hekimler çare arıyor, halk evlerine kapandı."
            ),
            "effects": [
                "🤒 NPC'ler sağlık kaybetti",
                "📉 Ticaret durdu",
                "😰 Refah düştü",
            ],
        },
        "haydut_saldırıları": {
            "title": f"Haydut Saldırıları: {loc_name}",
            "headline": f"{loc_name} Yolları Güvensiz",
            "detail": (
                f"Organize haydut çeteleri {loc_name} çevresinde yolları tuttu. "
                f"Kervanlar soyuluyor, tüccarlar başka güzergahlar arıyor. "
                f"Bölge güvenliği tehlikeli biçimde düştü."
            ),
            "effects": [
                "⚔️ Güvenlik düştü",
                "🛒 Ticaret zarar gördü",
                "💸 Mal kaybı yaşandı",
            ],
        },
        "asker_toplama": {
            "title": f"Asker Çağrısı: {loc_name}",
            "headline": f"{loc_name}'de Asker Toplanıyor",
            "detail": (
                f"Kral fermanı geldi: {loc_name}'den genç erkekler askere çağrıldı. "
                f"Silah ve teçhizat talebi fırladı. "
                f"Ayrılacak olanlar için veda törenleri düzenlendi."
            ),
            "effects": [
                "⚔️ Silah talebi arttı",
                "👨‍👩‍👦 Aileler ayrılıyor",
                "🏰 Ordu büyüyor",
            ],
        },
        "ticaret_patlaması": {
            "title": f"Ticaret Patlaması: {loc_name}",
            "headline": f"{loc_name}'de Ekonomi Coştu",
            "detail": (
                f"Uzak diyarlardan tüccarlar {loc_name}'e akın etti. "
                f"Yeni ticaret anlaşmaları imzalandı, çarşılar canlandı. "
                f"Her türlü mal yüksek fiyatla el değiştiriyor."
            ),
            "effects": [
                "📈 Tüm mal fiyatları yükseldi",
                "💰 Zenginlik arttı",
                "🛍️ Talep patladı",
            ],
        },
        "yeni_maden": {
            "title": f"Maden Keşfi: {loc_name}",
            "headline": f"{loc_name}'de Zengin Maden Bulundu",
            "detail": (
                f"Dağ eteklerinde zengin bir maden damarı keşfedildi! "
                f"{loc_name} demir ve değerli maden açısından önemli bir merkez olmaya hazırlanıyor. "
                f"İşçiler bölgeye akın ediyor."
            ),
            "effects": [
                "⛏️ Demir arzı arttı",
                "💰 Bölge zenginleşti",
                "👷 İşçi talebi arttı",
            ],
        },
        "festival": {
            "title": f"Festival: {loc_name}",
            "headline": f"{loc_name}'de Büyük Festival",
            "detail": (
                f"Yılın en büyük festivali {loc_name}'de başladı! "
                f"Uzak köylerden insanlar akın etti, çeşit çeşit yiyecekler sunuluyor. "
                f"Müzik, dans ve eğlence üç gün sürecek. Yeni tanışmalar kurulabilir."
            ),
            "effects": [
                "😊 Mutluluk arttı",
                "🍖 Yiyecek talebi yükseldi",
                "🤝 Yeni tanışmalar oluştu",
            ],
        },
        "dini_kutlama": {
            "title": f"Dini Kutlama: {loc_name}",
            "headline": f"{loc_name}'de Kutsal Gün",
            "detail": (
                f"Büyük dini bayram {loc_name}'de törenlerle kutlandı. "
                f"Halk ibadethanelere doldu, din adamları dua okudu. "
                f"Topluluk bağları güçlendi, huzur ortamı hakim oldu."
            ),
            "effects": [
                "🙏 Topluluk bağı güçlendi",
                "🕊️ Huzur arttı",
                "🏛️ Güvenlik yükseldi",
            ],
        },
        "soylu_düğünü": {
            "title": f"Soylu Düğünü: {loc_name}",
            "headline": f"{loc_name}'de Görkemli Düğün",
            "detail": (
                f"Bölgenin önde gelen soylu ailelerinden biri büyük bir düğün yapıyor. "
                f"Yüzlerce davetli {loc_name}'e geldi. Lüks kumaş ve mücevher talebi patladı. "
                f"Şehir hayatı canlandı, halk merakla izliyor."
            ),
            "effects": [
                "👑 Soylular şehre geldi",
                "💍 Kumaş talebi arttı",
                "🎊 Refah yükseldi",
            ],
        },
        "göç_dalgası": {
            "title": f"Göç Dalgası: {loc_name}",
            "headline": f"Büyük Göç {loc_name}'e Ulaştı",
            "detail": (
                f"Uzak bölgelerden kaçan binlerce kişi {loc_name}'e sığındı. "
                f"Nüfus aniden arttı, barınak ve yiyecek talebi fırladı. "
                f"Şehir bu ani büyümeyle başa çıkmaya çalışıyor."
            ),
            "effects": [
                "👥 Nüfus arttı",
                "📦 Kaynak talebi yükseldi",
                "⚠️ Güvenlik azaldı",
            ],
        },
        "ünlü_ölümü": {
            "title": f"Büyük Kayıp: {extra or loc_name}",
            "headline": f"Ünlü Kişinin Ölüm Haberi",
            "detail": (
                f"Bölgenin en saygın isimlerinden {extra or 'yaşlı bir bilge'} hayata gözlerini yumdu. "
                f"Halk yasa büründü, anma törenleri düzenlendi. "
                f"Onun bıraktığı boşluğu doldurmak kolay olmayacak."
            ),
            "effects": [
                "😢 Yas havası hakim",
                "📉 Refah geçici düştü",
                "🕯️ Anma törenleri başladı",
            ],
        },
    }
    return texts.get(event_type, {
        "title": f"Dünya Olayı: {loc_name}",
        "headline": f"{loc_name}'de bir olay yaşandı",
        "detail": "Dünyada bir şeyler değişiyor.",
        "effects": [],
    })


# ─── Dünya Olayı Oluşturma ──────────────────────────────────────────────────

def _pick_npc_name_for_event(state):
    """Önemli bir NPC ismi döndür (ünlü ölümü için)."""
    candidates = [n for n in state["world"]["npcs"]
                  if n.get("alive") and n.get("profession") in
                  ("lord", "general", "din_adamı", "şövalye", "vali")]
    if candidates:
        npc = random.choice(candidates)
        return npc["name"]
    return "yaşlı bir bilge"


def generate_world_event(state, day):
    """
    Olasılığa göre bir dünya olayı oluştur ve world_events listesine ekle.
    Ayda bir tetiklenir (4 haftada 1).
    """
    state.setdefault("world_events", [])

    locs = state["world"].get("locations", [])
    if not locs:
        return None

    # Her olay tipi için şans hesapla
    eligible = []
    for etype, (cat, chance, min_dur, max_dur) in EVENT_TYPES.items():
        if random.random() < chance:
            eligible.append((etype, cat, min_dur, max_dur))

    if not eligible:
        return None

    # Seç ve uygula
    event_type, cat, min_dur, max_dur = random.choice(eligible)

    # Yer seç (yangın ve maden kaleye olmaz)
    if event_type in ("büyük_yangın", "yeni_maden", "festival", "bereketli_hasat"):
        candidates = [l for l in locs if l.get("kind") != "kale"]
    else:
        candidates = locs
    if not candidates:
        candidates = locs

    loc = random.choice(candidates)
    duration = random.randint(min_dur, max_dur)

    # Ünlü ölümü için NPC ismi
    extra = _pick_npc_name_for_event(state) if event_type == "ünlü_ölümü" else None

    texts = _event_texts(event_type, loc["name"], extra)

    event = {
        "id": new_id(),
        "type": event_type,
        "category": cat,
        "title": texts["title"],
        "headline": texts["headline"],
        "detail": texts["detail"],
        "effects": texts["effects"],
        "location_id": loc["id"],
        "location_name": loc["name"],
        "started_day": day,
        "duration": duration,
        "ends_day": day + duration * 7,   # hafta → gün
        "active": True,
        "extra": extra,
    }

    # Anlık etkileri uygula
    _apply_event_effects(state, event_type, loc, day)

    state["world_events"].append(event)

    # Tarih kaydı
    from simulation import _push_event
    _push_event(state, day, f"dünya_olayı_{cat}", texts["headline"])

    # Eski olayları kapat
    for ev in state["world_events"]:
        if ev["active"] and ev["ends_day"] <= day and ev["id"] != event["id"]:
            ev["active"] = False

    # Maksimum 50 olay sakla
    if len(state["world_events"]) > 50:
        state["world_events"] = state["world_events"][-50:]

    return event


def tick_world_events(state, day):
    """
    Her haftada çağrılır:
    - Süresi dolanları kapat
    - Her ay (4 haftada 1) yeni olay üret
    """
    # Süresi dolan olayları kapat
    for ev in state.get("world_events", []):
        if ev["active"] and ev["ends_day"] <= day:
            ev["active"] = False

    # Her 4 haftada bir olay üret (ay başı)
    turn = state.get("turn", 0)
    if turn % 4 == 0:  # 4 hafta = 1 ay
        generate_world_event(state, day)


def get_active_world_events(state):
    """Şu anda aktif olan dünya olaylarını döndür."""
    return [ev for ev in state.get("world_events", []) if ev.get("active")]


def get_all_world_events(state, limit=30):
    """Son N dünya olayını döndür (aktif + geçmiş)."""
    events = state.get("world_events", [])
    return list(reversed(events[-limit:]))


def world_events_context(state):
    """
    NPC diyalogları ve fırsatlar için dünya olayı bağlamı döndür.
    """
    active = get_active_world_events(state)
    if not active:
        return ""
    lines = []
    for ev in active[:3]:
        lines.append(f"- {ev['headline']} ({ev['location_name']})")
    return "Güncel Dünya Olayları:\n" + "\n".join(lines)


def event_affects_location(state, location_id):
    """Bu konumu etkileyen aktif olaylar var mı?"""
    active = get_active_world_events(state)
    return [ev for ev in active if ev["location_id"] == location_id]


def event_affects_opportunities(state):
    """Aktif olaylara göre fırsatları etkileyen faktörler döndür."""
    active = get_active_world_events(state)
    modifiers = {
        "extra_tags": [],
        "gold_bonus": 0,
        "risk_modifier": 0,
        "extra_opportunities": [],
    }
    for ev in active:
        if ev["type"] == "haydut_saldırıları":
            modifiers["risk_modifier"] += 1  # yüksek risk
            modifiers["extra_tags"].append("haydut")
        elif ev["type"] == "ticaret_patlaması":
            modifiers["gold_bonus"] += 10
            modifiers["extra_tags"].append("ticaret")
        elif ev["type"] == "festival":
            modifiers["extra_tags"].append("festival")
            modifiers["extra_opportunities"].append("festival_görevlisi")
        elif ev["type"] == "salgın_hastalık":
            modifiers["extra_tags"].append("hastalık")
            modifiers["extra_opportunities"].append("hekim_yardımı")
        elif ev["type"] == "asker_toplama":
            modifiers["extra_tags"].append("askeri")
            modifiers["extra_opportunities"].append("asker_desteği")
    return modifiers
