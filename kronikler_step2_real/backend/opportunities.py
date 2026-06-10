"""Dynamic Opportunities System — Fırsatlar
Generates living-world opportunities that feel organic, not quest-board.
Each turn, the world produces a pool of opportunities based on world state,
season, player location, and active NPCs.
"""
import random
from world_events import event_affects_opportunities
from world_gen import (
    new_id, MALE_NAMES, FEMALE_NAMES, SURNAMES,
    PROFESSIONS_COMMON, GOODS,
)

# ─── Constants ───────────────────────────────────────────────────────────────

MAX_ACTIVE_OPPORTUNITIES = 8   # displayed at once
OPPORTUNITY_EXPIRE_TURNS = 4   # vanish after 4 weeks if not touched

# Opportunity categories — affects icon + card styling on frontend
CAT_WORK       = "iş"          # pay/labor
CAT_CRIME      = "suç"         # illegal, risky
CAT_SOCIAL     = "sosyal"      # relationship/NPC gains
CAT_ADVENTURE  = "macera"      # danger + reward
CAT_PERSONAL   = "kişisel"     # family / romance / personal

# Each template: (category, weight, generator_fn)
# generator_fn(state) -> dict or None

# ─── Name helpers ─────────────────────────────────────────────────────────────

def _rname(gender="erkek"):
    first = random.choice(MALE_NAMES if gender == "erkek" else FEMALE_NAMES)
    last  = random.choice(SURNAMES)
    return f"{first} {last}"

def _pick_npc_name(state):
    """Pick a living NPC name from current location, or invent one."""
    loc = state["player"].get("location_id")
    npcs = [n for n in state["world"]["npcs"]
            if n.get("alive") and n.get("location_id") == loc]
    if npcs:
        n = random.choice(npcs)
        return n["name"], n["id"]
    return _rname(random.choice(["erkek", "kadın"])), None

def _loc_name(state):
    loc_id = state["player"].get("location_id")
    for loc in (state["world"].get("cities", []) +
                state["world"].get("villages", []) +
                state["world"].get("castles", [])):
        if loc["id"] == loc_id:
            return loc["name"]
    return "bu yerde"

def _season(state):
    return state.get("calendar", {}).get("season", "Kış")

def _wealth(state):
    """Return 'yüksek'/'orta'/'düşük' for current location wealth."""
    loc_id = state["player"].get("location_id")
    for locs in (state["world"].get("cities", []),
                 state["world"].get("villages", []),
                 state["world"].get("castles", [])):
        for loc in locs:
            if loc["id"] == loc_id:
                w = loc.get("wealth", 50)
                if w > 65: return "yüksek"
                if w > 35: return "orta"
                return "düşük"
    return "orta"

def _is_city(state):
    loc_id = state["player"].get("location_id")
    return any(c["id"] == loc_id for c in state["world"].get("cities", []))


# ─── Individual Opportunity Generators ────────────────────────────────────────
# Each returns a dict or None (None = skip this one this time)

def _opp_caravan_guard(state):
    name, npc_id = _pick_npc_name(state)
    dest = random.choice(["yakın köye", "uzak şehre", "kale kapısına"])
    pay = random.randint(12, 30)
    risk_lvl = random.choice(["düşük", "orta", "yüksek"])
    risk_map = {"düşük": "Yol sakin, tehlike az.",
                "orta": "Yolda haydut haberleri var.",
                "yüksek": "Kanlı bir geçitten geçilecek."}
    return dict(
        category=CAT_WORK,
        title="Kervan Koruma",
        description=f"{name} adlı tüccar {dest} giden yük kervanına muhafız arıyor.",
        reward_gold=pay,
        reward_relation=0,
        reward_reputation=1,
        risk=risk_map[risk_lvl],
        risk_level=risk_lvl,
        expires_in=3,
        npc_id=npc_id,
        skill_check="combat",
        tags=["para", "yolculuk"],
        min_age=13,
    )

def _opp_missing_son(state):
    name, npc_id = _pick_npc_name(state)
    pay = random.randint(20, 45)
    return dict(
        category=CAT_SOCIAL,
        title="Kayıp Oğul",
        description=f"{name} üç haftadır kayıp oğlunu arıyor. Çevrede soruşturma yapman için senden yardım istiyor.",
        reward_gold=pay,
        reward_relation=15,
        reward_reputation=2,
        risk="Kayıp kişi tehlikeli biriyle birlikte olabilir.",
        risk_level="orta",
        expires_in=4,
        npc_id=npc_id,
        skill_check="social",
        tags=["ilişki", "para"],
    )

def _opp_lord_guard(state):
    pay = random.randint(25, 50)
    return dict(
        category=CAT_WORK,
        title="Lord Muhafızlığı",
        description=f"Yerel lord geçici muhafız kadrosu oluşturuyor. Ücret iyi, itaat şart.",
        reward_gold=pay,
        reward_relation=5,
        reward_reputation=3,
        risk="Lordun düşmanları saldırabilir. Siyasi tehlike de var.",
        risk_level="yüksek",
        expires_in=2,
        npc_id=None,
        skill_check="combat",
        tags=["para", "itibar", "tehlike"],
        min_age=13,
    )

def _opp_inn_work(state):
    pay = random.randint(5, 14)
    days = random.randint(1, 3)
    return dict(
        category=CAT_WORK,
        title="Han İşi",
        description=f"Yakındaki han {days} haftalık geçici çalışan arıyor. Temizlik, servis, taşımacılık.",
        reward_gold=pay,
        reward_relation=3,
        reward_reputation=0,
        risk="Sarhoş müşterilerle baş etmek gerekebilir.",
        risk_level="düşük",
        expires_in=2,
        npc_id=None,
        skill_check="social",
        tags=["para", "kolay"],
    )

def _opp_merchant_partner(state):
    name, npc_id = _pick_npc_name(state)
    good = random.choice(GOODS)
    profit = random.randint(18, 40)
    return dict(
        category=CAT_WORK,
        title="Ticaret Ortaklığı",
        description=f"{name}, {good} ticareti için kısa süreli bir ortak arıyor. Kâr eşit paylaşılacak.",
        reward_gold=profit,
        reward_relation=8,
        reward_reputation=1,
        risk="Ticaret beklenenden kötü giderse zarar edebilirsin.",
        risk_level="orta",
        expires_in=3,
        npc_id=npc_id,
        skill_check="trade",
        tags=["para", "ilişki"],
    )

def _opp_wolf_hunt(state):
    season = _season(state)
    pay = random.randint(15, 28)
    if season == "Kış":
        desc = "Köylüler kış açlığıyla saldırganlaşan kurt sürüsünü temizlemek için av düzenliyor."
        risk = "Sürü büyük. Bir av kazaya uğrayabilir."
    else:
        desc = "Sürüler çiftlik hayvanlarına saldırıyor. Köylüler kolektif av için gönüllü arıyor."
        risk = "Ormanda kaybolma ihtimali mevcut."
    return dict(
        category=CAT_ADVENTURE,
        title="Kurt Avı",
        description=desc,
        reward_gold=pay,
        reward_relation=10,
        reward_reputation=2,
        risk=risk,
        risk_level="orta",
        expires_in=2,
        npc_id=None,
        skill_check="combat",
        tags=["macera", "para", "itibar"],
        min_age=13,
    )

def _opp_marriage_proposal(state):
    """A family looking for a match for their daughter/son."""
    if state["player"].get("spouse_id"):
        return None  # already married
    gender = state["player"].get("gender", "erkek")
    target_gender = "kadın" if gender == "erkek" else "erkek"
    family_name = random.choice(SURNAMES)
    pay = random.randint(0, 20)
    dowry_note = f"{pay} altın çeyiz" if pay > 0 else "mütevazı bir çeyiz"
    target = "oğluna" if target_gender == "erkek" else "kızına"
    return dict(
        category=CAT_PERSONAL,
        title="Aile Ricası",
        description=f"{family_name} ailesi {target} uygun bir eş arıyor. Seni tanıtmak istiyorlar. {dowry_note} söz konusu.",
        reward_gold=pay,
        reward_relation=20,
        reward_reputation=1,
        risk="Evlilik uzun vadeli bir bağlılık. Uyumsuzluk mutsuzluğa yol açar.",
        risk_level="düşük",
        expires_in=4,
        npc_id=None,
        skill_check="social",
        tags=["kişisel", "ilişki"],
    )

def _opp_fugitive_shelter(state):
    name, npc_id = _pick_npc_name(state)
    pay = random.randint(8, 22)
    return dict(
        category=CAT_CRIME,
        title="Kaçak Barındırma",
        description=f"Bir kaçak {name} aracılığıyla sana ulaştı. Birkaç hafta saklanacak bir yer karşılığında iyi ücret ödeyecek.",
        reward_gold=pay,
        reward_relation=12,
        reward_reputation=-2,
        risk="Yetkililer onu arıyor. Yakalanırsan suç ortağı sayılırsın.",
        risk_level="yüksek",
        expires_in=2,
        npc_id=npc_id,
        skill_check="social",
        tags=["para", "suç", "tehlikeli"],
    )

def _opp_blacksmith_apprentice(state):
    return dict(
        category=CAT_WORK,
        title="Demirci Çıraklığı",
        description="Yaşlı demirci birkaç haftalık işe yardım edecek birini arıyor. Para az ama zanaat öğrenilir.",
        reward_gold=random.randint(4, 10),
        reward_relation=5,
        reward_reputation=1,
        risk="Ağır iş. Yorgunluk kesin.",
        risk_level="düşük",
        expires_in=3,
        npc_id=None,
        skill_check="trade",
        tags=["iş", "öğrenme"],
    )

def _opp_debt_collector(state):
    pay = random.randint(15, 30)
    return dict(
        category=CAT_CRIME,
        title="Alacak Tahsilatı",
        description="Yerel tefeci kayıt dışı borç tahsilatı için taşeron arıyor. Sorgulamadan iş yapacak biri.",
        reward_gold=pay,
        reward_relation=-5,
        reward_reputation=-3,
        risk="Borcunu ödeyemeyen kişi saldırıya geçebilir. İş bilinirse itibar zedelenir.",
        risk_level="yüksek",
        expires_in=2,
        npc_id=None,
        skill_check="combat",
        tags=["para", "suç", "tehlikeli"],
    )

def _opp_message_delivery(state):
    name, npc_id = _pick_npc_name(state)
    pay = random.randint(6, 16)
    dest = random.choice(["bir köye", "komşu şehre", "yakın kaleye"])
    return dict(
        category=CAT_WORK,
        title="Haber Götür",
        description=f"{name} {dest} acil bir mesaj iletmek istiyor. Güvenilir biri lazım.",
        reward_gold=pay,
        reward_relation=6,
        reward_reputation=0,
        risk="Hava koşulları veya yol güvenliği sorun çıkarabilir.",
        risk_level="düşük",
        expires_in=2,
        npc_id=npc_id,
        skill_check="social",
        tags=["para", "kolay", "yolculuk"],
    )

def _opp_bandit_tip(state):
    pay = random.randint(20, 40)
    return dict(
        category=CAT_ADVENTURE,
        title="Haydut Kampı İhbarı",
        description="Bölgede küçük bir haydut kampı olduğu söyleniyor. Temizleyecek olan her şeyi alabilir.",
        reward_gold=pay,
        reward_relation=0,
        reward_reputation=3,
        risk="Haydutlar iyi silahlı olabilir. Yalnız gidersen tehlikeli.",
        risk_level="yüksek",
        expires_in=3,
        npc_id=None,
        skill_check="combat",
        tags=["macera", "para", "tehlikeli"],
        min_age=13,
    )

def _opp_harvest_help(state):
    season = _season(state)
    if season not in ("İlkbahar", "Yaz"):
        return None
    pay = random.randint(6, 12)
    return dict(
        category=CAT_WORK,
        title="Hasat Yardımı",
        description="Tarlalar doldu ama yeterli el yok. Çiftçi birkaç haftalık işçi arıyor.",
        reward_gold=pay,
        reward_relation=4,
        reward_reputation=0,
        risk="Ağır beden işi.",
        risk_level="düşük",
        expires_in=2,
        npc_id=None,
        skill_check="trade",
        tags=["para", "kolay"],
    )

def _opp_spy_for_merchant(state):
    name, npc_id = _pick_npc_name(state)
    pay = random.randint(18, 35)
    return dict(
        category=CAT_CRIME,
        title="Rakip Casusluk",
        description=f"{name} rakip tüccarın fiyatlarını ve stok bilgisini öğrenmek istiyor. Gizlilik şart.",
        reward_gold=pay,
        reward_relation=7,
        reward_reputation=-1,
        risk="Tespitte itibar kaybı veya fiziksel tehlike söz konusu.",
        risk_level="orta",
        expires_in=3,
        npc_id=npc_id,
        skill_check="social",
        tags=["para", "suç", "gizli"],
    )

def _opp_npc_introduction(state):
    """Meeting a potentially important NPC."""
    name, npc_id = _pick_npc_name(state)
    if not npc_id:
        return None
    intro_types = [
        f"{name} seninle tanışmak istiyor. Kasabada adını duymuş.",
        f"{name} sana ilgi duyduğunu belli ediyor. Sohbet için davet etti.",
        f"{name} pazar meydanında sana yaklaştı, bir iş teklifi sunmak istediğini söyledi.",
    ]
    return dict(
        category=CAT_SOCIAL,
        title="Yeni Tanışma",
        description=random.choice(intro_types),
        reward_gold=0,
        reward_relation=20,
        reward_reputation=0,
        risk="Yabancılar her zaman iyi niyetli olmayabilir.",
        risk_level="düşük",
        expires_in=2,
        npc_id=npc_id,
        skill_check="social",
        tags=["ilişki", "npc"],
    )

def _opp_stolen_goods(state):
    pay = random.randint(15, 30)
    return dict(
        category=CAT_CRIME,
        title="Kaçak Mal Satışı",
        description="Biri sana çalıntı mal satabileceğini fısıldadı. Piyasa fiyatının yarısına.",
        reward_gold=pay,
        reward_relation=0,
        reward_reputation=-2,
        risk="Mal sahibi veya yetkililer izini sürebilir.",
        risk_level="yüksek",
        expires_in=1,
        npc_id=None,
        skill_check="trade",
        tags=["para", "suç", "tehlikeli"],
    )

def _opp_healing_herbs(state):
    season = _season(state)
    if season == "Kış":
        return None
    return dict(
        category=CAT_ADVENTURE,
        title="Şifalı Ot Toplama",
        description="Yaşlı şifacı ormandan nadir bitki istiyor. Tarifi verdi, ödülü hazır.",
        reward_gold=random.randint(8, 18),
        reward_relation=8,
        reward_reputation=1,
        risk="Ormanda vahşi hayvan ya da kaybolma riski.",
        risk_level="düşük",
        expires_in=3,
        npc_id=None,
        skill_check="social",
        tags=["macera", "para"],
    )

def _opp_tournament(state):
    if not _is_city(state):
        return None
    pay = random.randint(30, 60)
    return dict(
        category=CAT_ADVENTURE,
        title="Şehir Turnuvası",
        description="Şehirde dövüş turnuvası düzenleniyor. Katılım açık, ödül yüksek.",
        reward_gold=pay,
        reward_relation=0,
        reward_reputation=5,
        risk="Güçlü rakipler. Yenilmek itibarı zedeler, yaralanma da olası.",
        risk_level="yüksek",
        expires_in=2,
        npc_id=None,
        skill_check="combat",
        tags=["macera", "itibar", "tehlikeli"],
        min_age=13,
    )


# ─── Dünya Olayı Bazlı Fırsatlar ────────────────────────────────────────────

def _opp_drought_water(state):
    """Kuraklık varsa: su taşımacılığı fırsatı."""
    try:
        from world_events import get_active_world_events
        active = get_active_world_events(state)
        if not any(e["type"] == "kuraklık" for e in active):
            return None
    except Exception:
        return None
    ev = next(e for e in get_active_world_events(state) if e["type"] == "kuraklık")
    pay = random.randint(20, 45)
    return dict(
        category=CAT_WORK,
        title="Su Taşıması (Kuraklık)",
        description=f"{ev['location_name']}'de kuraklık nedeniyle su kuyuları kurudu. Uzak kaynaktan su taşıyacak birine ihtiyaç var.",
        reward_gold=pay,
        reward_relation=2,
        reward_reputation=2,
        risk="Ağır yük, uzun yol. Yorgunluk garantili.",
        risk_level="düşük",
        expires_in=3,
        npc_id=None,
        skill_check="stamina",
        tags=["su", "kuraklık", "para", "ağır_iş"],
    )


def _opp_plague_healer(state):
    """Salgın varsa: ilaç/ot toplama fırsatı."""
    try:
        from world_events import get_active_world_events
        active = get_active_world_events(state)
        if not any(e["type"] == "salgın_hastalık" for e in active):
            return None
    except Exception:
        return None
    ev = next(e for e in get_active_world_events(state) if e["type"] == "salgın_hastalık")
    pay = random.randint(30, 60)
    return dict(
        category=CAT_ADVENTURE,
        title="Şifalı Ot Arayışı (Salgın)",
        description=f"{ev['location_name']}'de salgın var. Yaşlı hekim hastalara şifalı ot toplanmasını istiyor. Tehlikeli bölgeden geçmek şart.",
        reward_gold=pay,
        reward_relation=5,
        reward_reputation=3,
        risk="Hasta bölgeye girmek enfeksiyon riski taşır.",
        risk_level="orta",
        expires_in=3,
        npc_id=None,
        skill_check="social",
        tags=["şifa", "salgın", "macera"],
    )


def _opp_festival_entertainer(state):
    """Festival varsa: eğlence/şarkı fırsatı."""
    try:
        from world_events import get_active_world_events
        active = get_active_world_events(state)
        if not any(e["type"] == "festival" for e in active):
            return None
    except Exception:
        return None
    ev = next(e for e in get_active_world_events(state) if e["type"] == "festival")
    pay = random.randint(10, 30)
    return dict(
        category=CAT_SOCIAL,
        title="Festival Eğlencesi",
        description=f"{ev['location_name']}'de festival var! Müzisyen, cambaz veya satıcı olarak katıl. Halk coşkulu, para akıyor.",
        reward_gold=pay,
        reward_relation=4,
        reward_reputation=2,
        risk="Rakip eğlenceciler var. Seyirciyi etkileyemezsen para yok.",
        risk_level="düşük",
        expires_in=2,
        npc_id=None,
        skill_check="social",
        tags=["festival", "eğlence", "sosyal"],
    )


def _opp_trade_boom(state):
    """Ticaret patlaması varsa: hızlı kazanç fırsatı."""
    try:
        from world_events import get_active_world_events
        active = get_active_world_events(state)
        if not any(e["type"] == "ticaret_patlaması" for e in active):
            return None
    except Exception:
        return None
    ev = next(e for e in get_active_world_events(state) if e["type"] == "ticaret_patlaması")
    pay = random.randint(25, 55)
    good = random.choice(["kumaş", "demir", "ekmek", "et"])
    return dict(
        category=CAT_WORK,
        title="Hızlı Ticaret Fırsatı (Patlama)",
        description=f"Ticaret patlaması devam ediyor! {ev['location_name']}'de {good} alıp başka şehirde satmak büyük kazanç sağlayabilir.",
        reward_gold=pay,
        reward_relation=0,
        reward_reputation=1,
        risk="Piyasa hızlı değişiyor, gecikme kayba yol açabilir.",
        risk_level="orta",
        expires_in=2,
        npc_id=None,
        skill_check="trade",
        tags=["ticaret", "hızlı_para", "patlama"],
    )


def _opp_bandit_hunt(state):
    """Haydut saldırıları varsa: ödüllü avlanma fırsatı."""
    try:
        from world_events import get_active_world_events
        active = get_active_world_events(state)
        if not any(e["type"] == "haydut_saldırıları" for e in active):
            return None
    except Exception:
        return None
    ev = next(e for e in get_active_world_events(state) if e["type"] == "haydut_saldırıları")
    pay = random.randint(40, 80)
    return dict(
        category=CAT_ADVENTURE,
        title="Haydut Avcılığı (Bölge Tehlikesi)",
        description=f"{ev['location_name']} çevresinde haydutlar cirit atıyor. Lord haydut başlarına ödül koydu. Cesur birileri lazım.",
        reward_gold=pay,
        reward_relation=3,
        reward_reputation=5,
        risk="Organize çete. Ölüm riski yüksek.",
        risk_level="yüksek",
        expires_in=4,
        npc_id=None,
        skill_check="combat",
        tags=["haydut", "ödül", "tehlikeli"],
        min_age=13,
    )


def _opp_soldier_recruitment(state):
    """Asker toplama varsa: destek/kaçırma fırsatı."""
    try:
        from world_events import get_active_world_events
        active = get_active_world_events(state)
        if not any(e["type"] == "asker_toplama" for e in active):
            return None
    except Exception:
        return None
    pay = random.randint(15, 35)
    return dict(
        category=CAT_WORK,
        title="Ordu Lojistiği (Asker Çağrısı)",
        description="Ordu toplanıyor. Komutan yiyecek, silah ve teçhizat taşıyacak yardımcılar arıyor. İyi ücret, ama cepheye yakın.",
        reward_gold=pay,
        reward_relation=2,
        reward_reputation=1,
        risk="Savaş bölgesine yakın olmak tehlikeli.",
        risk_level="orta",
        expires_in=3,
        npc_id=None,
        skill_check="stamina",
        tags=["ordu", "lojistik", "savaş"],
        min_age=13,
    )


def _opp_mine_investor(state):
    """Yeni maden keşfi varsa: yatırım fırsatı."""
    try:
        from world_events import get_active_world_events
        active = get_active_world_events(state)
        if not any(e["type"] == "yeni_maden" for e in active):
            return None
    except Exception:
        return None
    ev = next(e for e in get_active_world_events(state) if e["type"] == "yeni_maden")
    return dict(
        category=CAT_WORK,
        title="Maden Yatırımı",
        description=f"{ev['location_name']}'de yeni maden bulundu! Maden sahibi ortak arıyor. Az parayla çok kazanma şansı.",
        reward_gold=random.randint(50, 100),
        reward_relation=3,
        reward_reputation=2,
        risk="Maden hatalı çıkarsa para gider. Dolandırıcı olabilir.",
        risk_level="orta",
        expires_in=4,
        npc_id=None,
        skill_check="trade",
        tags=["maden", "yatırım", "risk"],
    )


# ─── Generator registry ───────────────────────────────────────────────────────

ALL_GENERATORS = [
    (CAT_WORK,      8,  _opp_caravan_guard),
    (CAT_SOCIAL,    6,  _opp_missing_son),
    (CAT_WORK,      5,  _opp_lord_guard),
    (CAT_WORK,      9,  _opp_inn_work),
    (CAT_WORK,      7,  _opp_merchant_partner),
    (CAT_ADVENTURE, 6,  _opp_wolf_hunt),
    (CAT_PERSONAL,  4,  _opp_marriage_proposal),
    (CAT_CRIME,     5,  _opp_fugitive_shelter),
    (CAT_WORK,      6,  _opp_blacksmith_apprentice),
    (CAT_CRIME,     4,  _opp_debt_collector),
    (CAT_WORK,      8,  _opp_message_delivery),
    (CAT_ADVENTURE, 5,  _opp_bandit_tip),
    (CAT_WORK,      7,  _opp_harvest_help),
    (CAT_CRIME,     4,  _opp_spy_for_merchant),
    (CAT_SOCIAL,    6,  _opp_npc_introduction),
    (CAT_CRIME,     3,  _opp_stolen_goods),
    (CAT_ADVENTURE, 5,  _opp_healing_herbs),
    (CAT_ADVENTURE, 4,  _opp_tournament),
    # Dünya Olayı Bazlı (düşük weight ama dünya olayı yoksa zaten None döner)
    (CAT_WORK,      6,  _opp_drought_water),
    (CAT_ADVENTURE, 6,  _opp_plague_healer),
    (CAT_SOCIAL,    7,  _opp_festival_entertainer),
    (CAT_WORK,      7,  _opp_trade_boom),
    (CAT_ADVENTURE, 7,  _opp_bandit_hunt),
    (CAT_WORK,      5,  _opp_soldier_recruitment),
    (CAT_WORK,      5,  _opp_mine_investor),
]


# ─── Core API ─────────────────────────────────────────────────────────────────

def ensure_opportunities(state):
    """Initialise the opportunities list if missing."""
    state.setdefault("opportunities", [])


def _make_opportunity(state, gen_fn):
    """Call a generator, stamp with id/turn, return dict or None."""
    opp = gen_fn(state)
    if opp is None:
        return None
    # Yaş kısıtlaması kontrolü: oyuncunun yaşı min_age'i karşılamıyorsa fırsat oluşturma
    player_age = state.get("player", {}).get("age", 0)
    if opp.get("min_age", 0) > player_age:
        return None
    opp["id"] = new_id()
    opp["turn_created"] = state.get("turn", 0)
    opp["status"] = "açık"          # açık | kabul_edildi | tamamlandı | reddedildi
    opp["expires_at"] = state.get("turn", 0) + opp.pop("expires_in", 3)
    return opp


def refresh_opportunities(state):
    """
    Called at: game start, each advance_time tick, and on explicit /refresh.
    - Expire old ones
    - Top up to MAX_ACTIVE_OPPORTUNITIES with new ones
    """
    ensure_opportunities(state)
    turn = state.get("turn", 0)

    # 1. Expire old opportunities
    # A-4: Tamamlanan/reddedilen fırsatları 10 tur sonra temizle; kabul edilmişleri tut
    state["opportunities"] = [
        o for o in state["opportunities"]
        if (
            o["status"] == "kabul_edildi"
            or (o["status"] == "açık" and o.get("expires_at", 0) > turn)
            or (o["status"] in ("tamamlandı", "reddedildi")
                and o.get("expires_at", 0) + 10 > turn)
        )
    ]

    # 2. How many do we need?
    active_count = sum(1 for o in state["opportunities"] if o["status"] == "açık")
    need = MAX_ACTIVE_OPPORTUNITIES - active_count
    if need <= 0:
        return

    # 3. Pick generators (weighted)
    pool = list(ALL_GENERATORS)
    random.shuffle(pool)
    weights = [w for (_, w, _) in pool]
    fns     = [fn for (_, _, fn) in pool]

    attempts = 0
    added    = 0
    while added < need and attempts < need * 4:
        fn = random.choices(fns, weights=weights, k=1)[0]
        opp = _make_opportunity(state, fn)
        if opp:
            state["opportunities"].append(opp)
            added += 1
        attempts += 1


def accept_opportunity(state, opp_id: str) -> dict:
    """Mark opportunity as accepted."""
    opp = next((o for o in state["opportunities"] if o["id"] == opp_id), None)
    if not opp:
        raise ValueError("Fırsat bulunamadı.")
    if opp["status"] != "açık":
        raise ValueError("Bu fırsat artık mevcut değil.")
    # Yaş kısıtlaması kontrolü
    player_age = state.get("player", {}).get("age", 0)
    min_age = opp.get("min_age", 0)
    if min_age > player_age:
        raise ValueError(f"Bu görevi üstlenmek için çok küçüksün. (Gerekli yaş: {min_age})")
    opp["status"] = "kabul_edildi"
    return opp


def decline_opportunity(state, opp_id: str) -> dict:
    """Mark opportunity as declined and remove it."""
    opp = next((o for o in state["opportunities"] if o["id"] == opp_id), None)
    if not opp:
        raise ValueError("Fırsat bulunamadı.")
    if opp["status"] != "açık":
        raise ValueError("Bu fırsat artık mevcut değil.")
    opp["status"] = "reddedildi"
    return opp


def complete_opportunity(state, opp_id: str) -> dict:
    """
    Resolve an accepted opportunity.
    Returns {"success": bool, "message": str, "gold_gained": int, "rep_gained": int}
    """
    opp = next((o for o in state["opportunities"] if o["id"] == opp_id), None)
    if not opp:
        raise ValueError("Fırsat bulunamadı.")
    if opp["status"] not in ("kabul_edildi", "açık"):
        raise ValueError("Bu fırsat tamamlanamaz.")

    player = state["player"]
    skills = player.get("skills", {})

    # Skill-based success chance
    check = opp.get("skill_check", "social")
    skill_val = skills.get(check, 0)
    risk_mult = {"düşük": 0.80, "orta": 0.60, "yüksek": 0.40}.get(
        opp.get("risk_level", "orta"), 0.60
    )
    chance = min(0.92, risk_mult + skill_val * 0.07)

    success = random.random() < chance

    if success:
        gold = opp.get("reward_gold", 0)
        rep  = opp.get("reward_reputation", 0)
        rel  = opp.get("reward_relation", 0)
        player["money"] = round(player.get("money", 0) + gold, 1)
        player["reputation"] = player.get("reputation", 0) + rep

        # Relationship gain with NPC if any
        npc_id = opp.get("npc_id")
        if npc_id and rel > 0:
            rels = state.setdefault("relationships", {})
            rels[npc_id] = min(100, rels.get(npc_id, 0) + rel)

        opp["status"] = "tamamlandı"
        msg = _success_message(opp, gold, rep)
        return {"success": True, "message": msg, "gold_gained": gold, "rep_gained": rep}
    else:
        # Penalties
        rep_loss = max(1, opp.get("reward_reputation", 1))
        player["reputation"] = player.get("reputation", 0) - rep_loss
        # Health penalty for high-risk failures
        if opp.get("risk_level") == "yüksek":
            player["health"] = max(1, player.get("health", 100) - random.randint(5, 15))

        opp["status"] = "başarısız"
        msg = _fail_message(opp)
        return {"success": False, "message": msg, "gold_gained": 0, "rep_gained": -rep_loss}


def _success_message(opp, gold, rep) -> str:
    category = opp.get("category", "iş")
    title = opp.get("title", "Fırsat")
    if category == CAT_CRIME:
        endings = [
            f"'{title}' işi tamamlandı. Kimse görmedi. {gold} altın cebinde.",
            f"Riskli ama başardın. {gold} altın el değiştirdi.",
        ]
    elif category == CAT_SOCIAL:
        endings = [
            f"'{title}' — gönüller kazanıldı. {gold} altın ve yeni bir bağ.",
            f"İyi iş çıkardın. İnsanlar seni hatırlayacak.",
        ]
    elif category == CAT_ADVENTURE:
        endings = [
            f"Tehlikeyi atlattın. '{title}' tamamlandı, {gold} altın ve {rep} itibar kazandın.",
            f"Maceran meyvesini verdi. {gold} altın ve şöhret.",
        ]
    else:
        endings = [
            f"'{title}' başarıyla tamamlandı. {gold} altın kazandın.",
            f"İş bitti, herkes memnun. {gold} altın.",
        ]
    return random.choice(endings)


def _fail_message(opp) -> str:
    title = opp.get("title", "Fırsat")
    endings = [
        f"'{title}' planladığın gibi gitmedi. İtibar zedelendi.",
        f"Başarısız oldun. '{title}' sana kazandırmadı.",
        f"Beklenmedik bir engel çıktı. '{title}' fiyaskoyla bitti.",
    ]
    return random.choice(endings)


# bridge dead-code usage

def _world_event_modifiers(state):
    return event_affects_opportunities(state)
