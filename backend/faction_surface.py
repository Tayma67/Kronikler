"""Fraksiyon Yüzeyi — GDD v7 R8.

faction_system.py (4.000+ satır) derin ama UI'da veri döküyor, sahne sunmuyor:
  8.1 Haftalık Fraksiyon Sahnesi — üyeysen haftada 1 kısa karar eventi
      (görev teklifi, iç çekişme, dedikodu)
  8.2 Rütbe = Somut İmtiyaz — her rütbenin NE verdiği tek kartta;
      tüccar loncasında gerçek pazar indirimi işler
  8.3 Sahne Olarak Olaylar — savaş/darbe/koalisyon kayıtları log satırı
      değil 3-5 satırlık mini sahne olarak sunulur
"""
import random


# ── 8.2 Rütbe imtiyaz tabloları ──────────────────────────────────────────
# mech anahtarları gerçek mekaniklere bağlanır; diğerleri mevcut sistemlerin
# (savaş ganimeti, rütbe bonusu, oy hakkı) görünür dökümüdür.
RANK_PERKS = {
    "tuccar_loncasi": [
        {"min_rank": 0, "perk": "Lonca hanlarında yatak ve sıcak yemek"},
        {"min_rank": 2, "perk": "Pazarda %5 alım indirimi", "mech": "trade_buy_discount"},
        {"min_rank": 4, "perk": "Satışta %5 lonca primi", "mech": "trade_sell_bonus"},
        {"min_rank": 5, "perk": "Lonca meclisinde oy hakkı"},
        {"min_rank": 6, "perk": "Kervanlara lonca muhafızı eşliği"},
    ],
    "zanaatkar_loncasi": [
        {"min_rank": 0, "perk": "Atölyelerde ucuz tezgâh kirası"},
        {"min_rank": 2, "perk": "Pazarda %5 alım indirimi", "mech": "trade_buy_discount"},
        {"min_rank": 3, "perk": "Usta damgası — ürünlerine güven"},
        {"min_rank": 4, "perk": "Lonca nazırlığında söz hakkı"},
    ],
    "krallık_ordusu": [
        {"min_rank": 0, "perk": "Kışlada yatak, talim hakkı"},
        {"min_rank": 1, "perk": "Savaşta rütbe ganimet payı (+5/rütbe)"},
        {"min_rank": 3, "perk": "Savaş bonusu büyür (+6 güç katkısı)"},
        {"min_rank": 6, "perk": "Komuta yetkisi — savaş bonusu (+10)"},
    ],
    "paralı_asker": [
        {"min_rank": 0, "perk": "Kumpanya sofrasında yer"},
        {"min_rank": 1, "perk": "Savaşta rütbe ganimet payı"},
        {"min_rank": 4, "perk": "Sözleşme pazarlığında pay artışı"},
        {"min_rank": 6, "perk": "Kendi bölüğünü komuta"},
    ],
    "ilim_cemiyeti": [
        {"min_rank": 0, "perk": "Kütüphaneye giriş"},
        {"min_rank": 2, "perk": "Alimlerle münazara — bilgelik çevresi"},
        {"min_rank": 4, "perk": "Cemiyet kararlarında oy hakkı"},
        {"min_rank": 6, "perk": "Arabuluculuk heyetinde koltuk"},
    ],
    "sifaci_birligi": [
        {"min_rank": 0, "perk": "Şifahanede öncelikli bakım"},
        {"min_rank": 2, "perk": "Şifalı ot tedariki"},
        {"min_rank": 4, "perk": "Birlik adına şifa dağıtma yetkisi"},
    ],
    "dini_tarikat": [
        {"min_rank": 0, "perk": "Dergâhta yatak ve aş"},
        {"min_rank": 3, "perk": "Cemaat önünde vaaz hakkı — itibar çevresi"},
        {"min_rank": 6, "perk": "Tarikat meclisinde oy hakkı"},
    ],
    "eskiya_cetesi": [
        {"min_rank": 0, "perk": "Çete koruması — sıcak malı güvenle eritme", "mech": "fence"},
        {"min_rank": 2, "perk": "Baskın ganimetinden pay"},
        {"min_rank": 4, "perk": "Kendi pusunu kurma yetkisi"},
    ],
}

_DEFAULT_PERKS = [
    {"min_rank": 0, "perk": "Üyelik koruması ve sofrada yer"},
    {"min_rank": 2, "perk": "İç meclislerde söz hakkı"},
    {"min_rank": 4, "perk": "Karar oylamalarında oy hakkı"},
]


def player_perk_card(state):
    """Oyuncunun fraksiyonu için rütbe-imtiyaz kartı."""
    player = state["player"]
    fac_id = player.get("faction_id")
    if not fac_id:
        return None
    fac = next((f for f in state["world"].get("factions", []) if f.get("id") == fac_id), None)
    if not fac:
        return None
    rank = player.get("faction_rank", 0)
    table = fac.get("rank_table", [])
    perks = RANK_PERKS.get(fac.get("type"), _DEFAULT_PERKS)
    return {
        "faction_name": fac.get("name"),
        "faction_type": fac.get("type"),
        "rank": rank,
        "title": table[rank] if rank < len(table) else "Üye",
        "next_title": table[rank + 1] if rank + 1 < len(table) else None,
        "perks": [{**p, "unlocked": rank >= p["min_rank"],
                   "rank_title": table[p["min_rank"]] if p["min_rank"] < len(table) else "?"}
                  for p in perks],
    }


def faction_trade_mult(state, action):
    """8.2 mekanik imtiyaz: lonca üyeliği pazar fiyatına işler."""
    player = state["player"]
    fac_id = player.get("faction_id")
    if not fac_id:
        return 1.0
    fac = next((f for f in state["world"].get("factions", []) if f.get("id") == fac_id), None)
    if not fac:
        return 1.0
    rank = player.get("faction_rank", 0)
    if fac.get("type") in ("tuccar_loncasi", "zanaatkar_loncasi") and rank >= 2 and action == "al":
        return 0.95
    if fac.get("type") == "tuccar_loncasi" and rank >= 4 and action == "sat":
        return 1.05
    return 1.0


# ── 8.1 Haftalık fraksiyon sahnesi ───────────────────────────────────────
_SCENES = [
    {
        "id": "gorev_teklifi",
        "text": "{officer}, omzuna elini koydu: \"{fac} için küçük bir iş var. "
                "Ağzı sıkı, eli çabuk biri lazım — sen geldin aklıma.\"",
        "choices": [
            {"id": "kabul", "label": "İşi üstlen", "hint": "katkı + birkaç akçe"},
            {"id": "reddet", "label": "Bu sefer olmaz", "hint": "gözden biraz düşersin"},
        ],
    },
    {
        "id": "ic_cekisme",
        "text": "{fac} içinde iki kıdemli üye birbirine girdi; koridorlar ikiye bölündü. "
                "Herkes senin hangi safta olduğunu merak ediyor.",
        "choices": [
            {"id": "taraf_guclu", "label": "Kıdemlinin yanında dur", "hint": "güvenli ama silik"},
            {"id": "taraf_zayif", "label": "Haklı gördüğünü savun", "hint": "riskli ama karakterli"},
            {"id": "uzak_dur", "label": "İki taraftan da uzak dur", "hint": "kimseye bulaşma"},
        ],
    },
    {
        "id": "dedikodu",
        "text": "Ocak başında fısıltılar: {fac} kasasından para mı eksilmiş, "
                "yoksa lider mi birilerine fazla yakın? Kulağını uzatabilirsin.",
        "choices": [
            {"id": "dinle", "label": "Kulak kabart", "hint": "bilgi güçtür"},
            {"id": "onemseme", "label": "Dedikoduya karnım tok", "hint": "temiz kal"},
        ],
    },
]

_OFFICERS = ["Ustabaşı", "Kıdemli üyelerden biri", "Liderin sağ kolu", "Eski bir emektar"]


def ensure_weekly_scene(state):
    """Üyeysen ve bu ay sahne yoksa %65 şansla bir tane kur."""
    player = state["player"]
    fac_id = player.get("faction_id")
    if not fac_id:
        state.pop("faction_scene", None)
        return None
    fac = next((f for f in state["world"].get("factions", []) if f.get("id") == fac_id), None)
    if not fac:
        return None
    turn = state.get("turn", 0)
    scene = state.get("faction_scene")
    if scene and scene.get("turn") == turn:
        return scene if not scene.get("resolved") else None
    if random.random() > 0.65:
        state["faction_scene"] = {"turn": turn, "skipped": True, "resolved": True}
        return None
    tpl = random.choice(_SCENES)
    scene = {
        "turn": turn, "id": tpl["id"], "faction_id": fac_id,
        "text": tpl["text"].format(fac=fac.get("name", "Fraksiyon"),
                                   officer=random.choice(_OFFICERS)),
        "choices": tpl["choices"],
        "resolved": False,
    }
    state["faction_scene"] = scene
    return scene


def resolve_scene(state, choice_id):
    """Haftalık sahnenin seçimini çöz."""
    scene = state.get("faction_scene")
    if not scene or scene.get("resolved"):
        return None, "Bekleyen bir fraksiyon sahnesi yok."
    player = state["player"]
    scene["resolved"] = True
    sid = scene["id"]

    def _xp(kind, key, amt):
        try:
            from skills import add_skill_xp, add_stat_xp
            (add_skill_xp if kind == "skill" else add_stat_xp)(player, key, amt)
        except Exception:
            pass

    if sid == "gorev_teklifi":
        if choice_id == "kabul":
            gain = random.randint(8, 25)
            player["money"] = round(player.get("money", 0) + gain, 1)
            player["faction_contribution"] = player.get("faction_contribution", 0) + 8
            _xp("skill", "social", 1)
            return {"note": f"İşi sessizce hallettin. Eline {gain} akçe sıkıştırdılar; "
                            f"adın güvenilirler arasına yazıldı (+8 katkı).",
                    "contribution": 8, "money": gain}, None
        return {"note": "Geri çevirdin. Kimse bir şey demedi ama bakışlar nottu aldı."}, None

    if sid == "ic_cekisme":
        if choice_id == "taraf_guclu":
            player["faction_contribution"] = player.get("faction_contribution", 0) + 4
            return {"note": "Kıdemlinin safında durdun. Güvenli liman — ama sırtını "
                            "sıvazlayan el, yarın omzuna basabilir (+4 katkı).",
                    "contribution": 4}, None
        if choice_id == "taraf_zayif":
            if random.random() < 0.5:
                player["faction_contribution"] = player.get("faction_contribution", 0) + 10
                player["reputation"] = player.get("reputation", 0) + 2
                return {"note": "Haklı çıktı! Senin dik duruşun konuşuluyor "
                                "(+10 katkı, +2 itibar).", "contribution": 10}, None
            player["faction_contribution"] = max(0, player.get("faction_contribution", 0) - 3)
            return {"note": "Savunduğun taraf kaybetti; bir süre soğuk yüzlerle "
                            "yaşayacaksın (−3 katkı)."}, None
        return {"note": "İkisinden de uzak durdun. Toz dumana karışmadın — "
                        "ama köşede durmak da bir tercihti."}, None

    if sid == "dedikodu":
        if choice_id == "dinle":
            _xp("skill", "social", 2)
            lines = [
                "Kasadaki eksiğin liderin kumar borcuna gittiği fısıldanıyor.",
                "İki kıdemli üyenin rakip fraksiyonla yemek yediği görülmüş.",
                "Yeni katılan üyenin geçmişi karanlıkmış — kimse nereden geldiğini bilmiyor.",
            ]
            return {"note": f"Kulağına çalınan: {random.choice(lines)} (+2 sosyal)",
                    "intel": True}, None
        return {"note": "Dedikoduya sırtını döndün. Bazen bilmemek de bir huzur."}, None

    return None, "Geçersiz seçim."


# ── 8.3 Olaylar → mini sahne ─────────────────────────────────────────────
_DRESS = {
    "savaş_ilanı": {
        "title": "SAVAŞ DAVULLARI",
        "pre": "Haberciler dört nala şehirlere dağıldı.",
        "post": "Demirciler gece gündüz çalışıyor; analar oğullarına sarılıyor.",
    },
    "savas_ilani": {
        "title": "SAVAŞ DAVULLARI",
        "pre": "Haberciler dört nala şehirlere dağıldı.",
        "post": "Demirciler gece gündüz çalışıyor; analar oğullarına sarılıyor.",
    },
    "koalisyon": {
        "title": "İTTİFAK MASASI",
        "pre": "Kapalı kapılar ardında mühürler basıldı.",
        "post": "Dengeler değişti — küçükler artık o kadar küçük değil.",
    },
    "darbe": {
        "title": "İÇERİDEN HANÇER",
        "pre": "Gece yarısı koridorlarda ayak sesleri çoğaldı.",
        "post": "Sabah olduğunda eski sancak yerde, yeni yüzler taht odasındaydı.",
    },
    "baris": {
        "title": "KILIÇLAR KINDA",
        "pre": "İki taraf da yorgundu; ulaklar beyaz bayrakla gidip geldi.",
        "post": "Çarşılar yeniden açıldı, yollar nefes aldı.",
    },
    "oyuncu_rutbe_atladi": {
        "title": "YÜKSELİŞ",
        "pre": "Meclis huzurunda adın okundu.",
        "post": "Artık sana selam verenlerin beli biraz daha bükük.",
    },
}


def dress_events(state, limit=10):
    """Oyuncunun fraksiyonunun son olaylarını + büyük dünya olaylarını
    3-5 satırlık mini sahnelere giydir."""
    player = state["player"]
    fac_id = player.get("faction_id")
    pool = []
    if fac_id:
        fac = next((f for f in state["world"].get("factions", []) if f.get("id") == fac_id), None)
        if fac:
            pool.extend(fac.get("event_log", [])[-15:])
    # Büyük dünya olayları (fraksiyon dışı ama herkesi ilgilendiren)
    majors = [e for e in state.get("history", [])[-40:]
              if e.get("type") in _DRESS and e.get("id") not in {p.get("id") for p in pool}]
    pool.extend(majors[-5:])
    pool.sort(key=lambda e: e.get("day", 0), reverse=True)

    out = []
    for e in pool[:limit]:
        d = _DRESS.get(e.get("type"))
        if d:
            out.append({
                "day": e.get("day"), "type": e.get("type"),
                "title": d["title"],
                "lines": [d["pre"], e.get("text", ""), d["post"]],
            })
        else:
            out.append({
                "day": e.get("day"), "type": e.get("type"),
                "title": None,
                "lines": [e.get("text", "")],
            })
    return out
