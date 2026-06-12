"""
narrative_engine.py  ·  Kronikler v34+
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Oyun eventlerini kişisel, atmosferik 2. şahıs Türkçe anlatıya çevirir.

Üretilen metin event objesine `narrative` alanı olarak eklenir.
Flat `text` alanı geriye dönük uyumluluk için korunur.

Kullanım (simulation.py'dan):
    from narrative_engine import narrate_death, narrate_birth, ...
    narrative = narrate_death(npc, state["player"], state, day)
    # sonra _push_event içinde event["narrative"] = narrative
"""

import random
from calendar_tr import season_for_turn


# ─────────────────────────────────────────────────────────────────────────────
# OYUNCU–NPC İLİŞKİ TESPİTİ
# ─────────────────────────────────────────────────────────────────────────────

def _player_relation(npc: dict, player: dict, state: dict) -> str:
    """Oyuncu ile NPC arasındaki en yakın ilişki bağını döndürür."""
    npc_id = npc.get("id", "")

    # Eş
    if npc.get("spouse_id") == "PLAYER" or player.get("spouse_id") == npc_id:
        return "eş"

    # Çocuk (npc oyuncunun çocuğu)
    if "PLAYER" in (npc.get("parent_ids") or []) or npc_id in player.get("children_ids", []):
        return "çocuk"

    # Ebeveyn (npc oyuncunun ebeveynlerinden biri)
    if npc_id in player.get("parent_ids", []) or "PLAYER" in (npc.get("children_ids") or []):
        return "ebeveyn"

    # Kardeş — ortak en az bir ebeveyn
    player_parents = set(p for p in player.get("parent_ids", []) if p and p != "PLAYER")
    npc_parents    = set(p for p in (npc.get("parent_ids") or []) if p and p != "PLAYER")
    if player_parents & npc_parents:
        return "kardeş"

    # Arkadaş / rakip — relationships skor veya friend/rival listesi
    rel_score = state.get("relationships", {}).get(npc_id, 0)
    if rel_score >= 60 or "PLAYER" in (npc.get("friend_ids") or []):
        return "arkadaş"
    if rel_score <= -40 or "PLAYER" in (npc.get("rival_ids") or []):
        return "rakip"

    return "yabancı"


# ─────────────────────────────────────────────────────────────────────────────
# MEVSİM BAĞLAM PREFİXLERİ
# ─────────────────────────────────────────────────────────────────────────────

_SEASON_PREFIX = {
    "İlkbahar": [
        "Bahar havası sokaklardayken",
        "Tohumlar taze topraktayken",
        "İlkbaharın ortasında",
    ],
    "Yaz": [
        "Temmuz sıcağının altında",
        "Yazın en uzun gününde",
        "Güneş yakıcıyken",
    ],
    "Sonbahar": [
        "Yapraklar dökülerken",
        "Sonbahar soğuğu bastırırken",
        "Hasatın son demlerinde",
    ],
    "Kış": [
        "Kış karanlığında",
        "Soğuğun kemiği kırmasıyla",
        "Kar altında",
    ],
}


def _season_prefix(turn: int) -> str:
    season = season_for_turn(turn)
    opts = _SEASON_PREFIX.get(season, [])
    return random.choice(opts) if opts else ""


def _pick(templates: list, **ctx) -> str:
    tpl = random.choice(templates)
    try:
        return tpl.format(**ctx)
    except KeyError:
        return tpl


# ─────────────────────────────────────────────────────────────────────────────
# ÖLÜM NARATİFLERİ
# ─────────────────────────────────────────────────────────────────────────────

_DEATH: dict[str, list[str]] = {
    "eş": [
        "{name}, {age} yaşında {location}'da son nefesini verdi. "
        "Haberi duyduğunda bir an her şey dondu. "
        "O geride bıraktığı boşluğu doldurmak mümkün değil.",

        "{name} gitti. Kelimeler yetmiyor — sadece biliyorsun: "
        "o artık yok, sen hâlâ varsın. "
        "{age} yıllık bir hayat bitti; seninle geçirdiği her güne gönlünde ayrı bir yer vardı.",

        "{location}'dan haber geldi. {name}, {age} yaşında. "
        "Sabah uyandığında o yer soğuktu. "
        "Bu acı bir süre geçmeyecek — ve geçmemeli de.",
    ],
    "çocuk": [
        "{name} daha {age} yaşındaydı. "
        "Bazı kayıplar anlaşılmaz; bu onlardan biri. "
        "{location}'da bir ses kesildi.",

        "{location}'dan acı haber: {name}, {age} yaşında hayatını kaybetti. "
        "Bu tür acıları kimse hazmetmeden yaşayamaz — sadece taşınır.",
    ],
    "ebeveyn": [
        "{location}'da {name} hayatını kaybetti. {age} yaşındaydı. "
        "Senden önce başladı bu hayat — şimdi senden önce bitti. "
        "Bazı soruları artık soramayacaksın.",

        "{name} ({age}) gitti. Bir çağ kapandı. "
        "Şimdi sıra sende.",
    ],
    "kardeş": [
        "{name} ({age}), {location}'da hayatını kaybetti. "
        "Aynı kandan geliyordunuz. "
        "Bu boşluk farklı bir ağırlık taşıyor.",

        "Haberci {location}'dan döndü: {name} artık yok, {age} yaşında. "
        "Ortak bir şey gitti aranızdan — ne olduğunu tam tarif etmek güç.",
    ],
    "arkadaş": [
        "{location}'dan acı haber: {name} ({age}) hayatını kaybetti. "
        "Birlikte paylaştığın anlar şimdi zihninde daha keskin hissettiriyor. "
        "Yokluk her şeyi keskinleştiriyor.",

        "{name} ({age}) öldü. "
        "Tanıdığın biriydi; dünyanın bir parçası eksildi.",
    ],
    "rakip": [
        "{name} ({age}) öldü. "
        "Garip bir his: seni şaşırtan şey, üzüldüğün. "
        "Düşman da olsa, o artık yok. "
        "Aranızdaki tüm hesaplar onunla gitti.",

        "{location}'da {name} hayatını kaybetti. "
        "Çatışmalarınızın gölgesi şimdi sadece sende kaldı.",
    ],
    "yabancı": [
        "{location}'da {name} ({age}) hayatını kaybetti. "
        "Tanımıyordun — ama birisinin sevdiği biriydi.",

        "{name} ({age}), {location}'da dünyaya gözlerini yumdu. "
        "Şehrin tarihi bir satır daha uzadı.",
    ],
}


def narrate_death(npc: dict, player: dict, state: dict, turn: int) -> str:
    """Ölüm olayı için kişiselleştirilmiş narratif döndür."""
    relation  = _player_relation(npc, player, state)
    templates = _DEATH.get(relation, _DEATH["yabancı"])
    core      = _pick(templates,
                      name=npc.get("name", "?"),
                      age=npc.get("age", "?"),
                      location=npc.get("location_name", "bilinmeyen bir yerde"))
    prefix = _season_prefix(turn)
    return f"{prefix}, {core}" if prefix else core


# ─────────────────────────────────────────────────────────────────────────────
# DOĞUM NARATİFLERİ
# ─────────────────────────────────────────────────────────────────────────────

_BIRTH: dict[str, list[str]] = {
    "çocuk": [
        "{child_name} dünyaya geldi. "
        "Ellerine baktın — küçücük, ama gerçek. "
        "Yeni bir ses, yeni bir sorumluluk; ikisi de seve seve.",

        "Dün gece çığlık, bu sabah sessizlik ve ardından başka bir ses: {child_name}. "
        "Aile büyüdü. Sen de biraz.",
    ],
    "kardeş": [
        "{child_name} dünyaya geldi. "
        "{parent_name}'in yüzündeki ifadeyi uzun süre unutamazsın. "
        "Aile büyüdü; yeni bir umut, yeni bir ses.",

        "{location}'da {parent_name}'in çocuğu {child_name} dünyaya adım attı. "
        "Aile büyüdü.",
    ],
    "yabancı": [
        "{parent_name} ve eşinin çocuğu {child_name} dünyaya geldi. "
        "{location}'da hayat bir kez daha başladı — "
        "böyle haberler insanın içini ısıtıyor.",

        "{location}'da {child_name} adında biri nefes almaya başladı. "
        "Henüz bilmiyor; ama dünya bir gün onu tanıyacak belki.",
    ],
}


def narrate_birth(child: dict, mother: dict, player: dict, state: dict, turn: int) -> str:
    """Doğum olayı için kişiselleştirilmiş narratif döndür."""
    child_id = child.get("id", "")

    # Oyuncunun çocuğu mu?
    if ("PLAYER" in (child.get("parent_ids") or [])
            or child_id in player.get("children_ids", [])):
        relation = "çocuk"
    # Annenin ID'si oyuncunun parent_ids'inde mi? (kardeş)
    elif (mother.get("id") in player.get("parent_ids", [])
          or "PLAYER" in (mother.get("children_ids") or [])):
        relation = "kardeş"
    else:
        relation = "yabancı"

    templates = _BIRTH.get(relation, _BIRTH["yabancı"])
    return _pick(templates,
                 child_name=child.get("name", "?"),
                 parent_name=mother.get("name", "?"),
                 location=child.get("location_name", "bilinmeyen bir yerde"))


# ─────────────────────────────────────────────────────────────────────────────
# EVLİLİK NARATİFLERİ
# ─────────────────────────────────────────────────────────────────────────────

_MARRIAGE: dict[str, list[str]] = {
    "player": [
        "{partner_name} ile yemin ettin. "
        "Sözler ağırdı — ama taşıyabileceğini hissediyorsun.",

        "{location}'da {partner_name}'e baktın. O da sana baktı. "
        "Şahitler tanık oldu; artık geri dönüş yok.",
    ],
    "yakın": [
        "{a_name} ile {b_name}, {location}'da dünya evine girdi. "
        "Güzel bir gündü. İçin biraz ısındı.",

        "{a_name} ve {b_name} {location}'da birleşti. "
        "Bu tür haberlerin tadı bambaşka.",
    ],
    "yabancı": [
        "{a_name} ile {b_name} {location}'da evlendi. "
        "Şehirde düğün var — mutluluk bazen bulaşıcı olur.",

        "{location}'da {a_name} ile {b_name} dünya evine girdi. "
        "Hayat devam ediyor.",
    ],
}


def narrate_marriage(a: dict, b: dict, player: dict, state: dict) -> str:
    """Evlilik olayı için narratif döndür."""
    if a.get("spouse_id") == "PLAYER" or b.get("spouse_id") == "PLAYER":
        partner = b if (a.get("id") or "") == "PLAYER" else a
        return _pick(_MARRIAGE["player"],
                     partner_name=partner.get("name", "?"),
                     location=a.get("location_name", "?"))

    rel_a = _player_relation(a, player, state)
    rel_b = _player_relation(b, player, state)
    yakın_set = {"ebeveyn", "kardeş", "arkadaş", "çocuk", "eş"}
    group = "yakın" if (rel_a in yakın_set or rel_b in yakın_set) else "yabancı"

    return _pick(_MARRIAGE[group],
                 a_name=a.get("name", "?"),
                 b_name=b.get("name", "?"),
                 location=a.get("location_name", "?"))


# ─────────────────────────────────────────────────────────────────────────────
# DÜNYA OLAYLARI NARATİFLERİ
# ─────────────────────────────────────────────────────────────────────────────

_WAR = [
    "Haberci soluk soluğa geldi: {k1} ile {k2} arasında savaş ilan edildi. "
    "Sınırlar kapandı, kervanlar durdu. Her şey değişecek.",

    "{k1} ve {k2} birbirine savaş açtı. "
    "Sabah pazar kalabalığı duydu; öğleden sonra herkes biliyordu. "
    "Şimdi asıl soru: sen nerede duracaksın?",

    "{k1} elçisi geri dönmedi — bu, savaş demekti. "
    "{k2} cephesi açıldı. Topraklar bu yıl kızıl geçecek.",
]

_PEACE = [
    "{k1} ile {k2} arasında anlaşma sağlandı. "
    "Silahlar bırakıldı. Herkes biraz kazandı, herkes biraz kaybetti. "
    "Böyle olur barış.",

    "Savaş bitti: {k1} ve {k2} masaya oturdu. "
    "Şimdi daha zor iş — birlikte yaşamak.",

    "{k1} ve {k2} barış imzaladı. "
    "Kelimelerle kuruldu bu anlaşma; zamanla sınanacak.",
]

_FAMINE = [
    "{location}'da ekmek fiyatı geçen ay ikiydi, bu ay üç. "
    "Ambarlar kapandı, insanlar içine çekildi. Kıtlık kapıda.",

    "Kıtlık {location}'a ulaştı. "
    "Köylüler şehre akıyor; yüzlerinde soğuk ve açlık — "
    "ama ağırlıklı olarak umutsuzluk var.",

    "{location}'da hasat tutmadı. "
    "Fiyatlar yükseldi, sabır azaldı. Bu kış zor geçecek.",
]

_RAID = [
    "Haydutlar {location}'ı bastı. "
    "Güvenlik sarsıldı. Ama haberin ötesinde: o gece bazıları can verdi. "
    "Adlarını bilmiyorsun.",

    "{location}'dan haberler kötü: haydutlar geçti. "
    "Mal gitti, güvenlik düştü, tedirginlik kaldı.",
]

_FESTIVAL = [
    "{location}'da bugün şenlik var. "
    "Davullar çalıyor, tüccarlar gülümsüyor. "
    "Bir gün için herkes aynı tarafta.",

    "Şenlik {location}'ı kapladı. "
    "Kötü günler bir kenara bırakıldı — en azından bugün için. "
    "Ama bir gün de bir şeydir.",
]

_REVOLT = [
    "{k}'de bir lord isyan bayrağı kaldırdı. "
    "İstikrar sarsıldı. Bu tür sarsıntılar her zaman habersiz gelir.",

    "Haber {k}'den: bir lord tahta karşı çıktı. "
    "Niyeti ne — henüz kimse bilmiyor.",
]

_THRONE = [
    "{name} tahtı devraldı. {kingdom}'da yeni bir çağ başlıyor — "
    "ya barış getirecek, ya da yeni hesaplar açacak.",

    "Taht değişti: {name} artık {kingdom}'un hükümdarı. "
    "Eski dengelerin yerini yenileri alacak.",
]


def narrate_war(k1_name: str, k2_name: str) -> str:
    return _pick(_WAR, k1=k1_name, k2=k2_name)


def narrate_peace(k1_name: str, k2_name: str) -> str:
    return _pick(_PEACE, k1=k1_name, k2=k2_name)


def narrate_famine(loc_name: str) -> str:
    return _pick(_FAMINE, location=loc_name)


def narrate_raid(loc_name: str) -> str:
    return _pick(_RAID, location=loc_name)


def narrate_festival(loc_name: str) -> str:
    return _pick(_FESTIVAL, location=loc_name)


def narrate_revolt(kingdom_name: str) -> str:
    return _pick(_REVOLT, k=kingdom_name)


def narrate_throne(new_king_name: str, kingdom_name: str) -> str:
    return _pick(_THRONE, name=new_king_name, kingdom=kingdom_name)


# ─────────────────────────────────────────────────────────────────────────────
# YILLIK HİKAYE ÖZETİ (Chronicle için)
# ─────────────────────────────────────────────────────────────────────────────

_YEAR_OPENERS = [
    "{name}'in {age}. yaşında geçen bu yıl kolay değildi.",
    "{age} yaşındaydın. Bu yıl iz bıraktı.",
    "{name} için {age}. yaş böyle geçti:",
    "Yıl döndü; {name} artık {age} yaşında.",
]

_YEAR_CLOSERS = [
    "Yıl bitti. Bir şeyler değişti — içinde ve dışında.",
    "Bu yıl geride kaldı. Bir kısmı ağırdı, bir kısmı güzeldi.",
    "Başka bir yıl geçti. Birikim devam ediyor.",
    "Yıl bitti. Yarın başka bir yıl olacak — bakalım.",
]

_NO_MAJOR_EVENTS = [
    "Büyük sarsıntılar yoktu bu yıl. Hayat sessizce aktı — ki bazen bu da ayrı bir armağandır.",
    "Yıl sakin geçti. Küçük kazanımlar, küçük kayıplar. Dengede.",
    "Çok şey olmadı bu yıl. Ya da olmayan şeyler de bir şeydir.",
]


def generate_year_story(year_events: list, player: dict) -> str:
    """
    Bir oyun yılına ait eventlerden anlatılı özet paragraf üretir.
    Kronik sayfasında 'Bu Yılın Hikayesi' olarak gösterilir.

    Args:
        year_events: O yıla ait event objeleri listesi
        player: Oyuncu dict'i (name, age, profession, location_name)

    Returns:
        2-4 cümlelik Türkçe paragraf (str)
    """
    name       = player.get("name", "Kahraman")
    age        = player.get("age", "?")
    profession = player.get("profession", "")
    location   = player.get("location_name", "")

    if not year_events:
        opener = _pick(_YEAR_OPENERS, name=name, age=age)
        closer = _pick(_NO_MAJOR_EVENTS)
        return f"{opener} {closer}"

    # Yılın öne çıkan eventlerini kategorize et
    deaths     = [e for e in year_events if e.get("type") == "ölüm"]
    births     = [e for e in year_events if e.get("type") == "doğum"]
    marriages  = [e for e in year_events if e.get("type") == "evlilik"]
    wars       = [e for e in year_events if e.get("type") == "savaş_ilanı"]
    victories  = [e for e in year_events if e.get("type") == "savaş_zaferi"]
    promotions = [e for e in year_events if e.get("type") in ("kariyer_terfi", "meslek_değişimi", "meslek_edinme")]
    quests     = [e for e in year_events if e.get("type") == "görev_tamamlandı"]
    crimes     = [e for e in year_events if e.get("type") in ("suç", "hapis", "yakalandı")]

    parts = []

    # Açılış
    opener = _pick(_YEAR_OPENERS, name=name, age=age)
    parts.append(opener)

    # Meslek bilgisi varsa
    if profession and profession not in ("işsiz", "çocuk", ""):
        parts.append(f"{profession.capitalize()} olarak hayatını sürdürdün{f', {location}' if location else ''}.")

    # En ağır olay: ölüm
    if deaths:
        # Narrative alanı varsa kullan, yoksa flat text
        death_ev = deaths[0]
        narr = death_ev.get("narrative") or death_ev.get("text", "")
        if narr:
            # İlk cümleyi al (çok uzun olmasın)
            first_sentence = narr.split(".")[0] + "."
            parts.append(f"Yılın en ağır anı buydu: {first_sentence}")
        elif len(deaths) > 1:
            parts.append(f"Bu yıl {len(deaths)} kayıp oldu.")

    # Olumlu olaylar
    if births:
        parts.append(f"Ama bu yıl yeni hayatlar da başladı — {len(births)} doğum.")
    if marriages:
        parts.append(f"{len(marriages)} düğün sevinci yaşandı.")
    if victories:
        parts.append("Savaş meydanında ayakta kaldın.")
    if promotions:
        parts.append(f"Meslekte bir adım daha atıldı.")
    if quests:
        parts.append(f"{'Verilen' if len(quests) == 1 else f'{len(quests)}'} söz tutuldu.")
    if wars:
        parts.append(f"Savaş bulutları {len(wars)} kez gökyüzünü kapladı.")
    if crimes and not victories:
        parts.append("Yasanın gölgesinde de gezildi bu yıl.")

    # Hiç özel şey yoksa
    if len(parts) <= 2:
        parts.append(random.choice(_NO_MAJOR_EVENTS))

    # Kapanış
    parts.append(_pick(_YEAR_CLOSERS))

    return " ".join(parts)
