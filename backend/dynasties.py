"""Rakip Hanedanlar — GDD v7 S1 (Adım 3).

"Dünya senin sandbox'ın değil; aynı oyunu oynayan 6 aile daha var."

- 6 AI hanedanı, 6 arketip: her biri oyuncuyla aynı kuralları oynar —
  mülk alır/satar, evlenir, vâris yetiştirir, fraksiyon destekler, ölür
  ve vârisle devam eder.
- Haftalık tick hafiftir: hanedan başına TEK eylem, utility skoruyla:
      eylem_skoru = hedefe_katkı×3 + servet_uygunluğu + risk_toleransı×arketip
- Kıt kaynak: lokasyon başına sınırlı mülk slotu. Karaoğlu 3 dükkânı
  kapmışsa oyuncu bunu HİSSEDER (property_system.buy_property bunu sorar).
- S2 köprüsü: hanedanın oyuncuya tutumu, REİSİN ZİHNİNDEN beslenir —
  reise hakaret edersen hanedan soğur; reisi borçtan kurtarırsan ısınır.
- Nesil sürekliliği: tutum hanedan nesnesinde yaşar → babanın düşmanı,
  oğlunun da düşmanıdır (inheritance.begin_inheritance yumuşatır, silmez).
"""
import random

from world_gen import new_id


# ═══════════════════════════════════════════════════════════════════════════
# ARKETİPLER — GDD tablosu
# ═══════════════════════════════════════════════════════════════════════════

ARCHETYPES = {
    "acimasiz_tuccar": {
        "ad": "Karaoğlu", "sembol": "🐺", "renk": "#8B0000",
        "strateji": "Tekel kurma, fiyat kırma",
        "profs": ("tüccar", "sarraf", "kervancı"),
        "servet": (3000, 6000), "risk": 0.7, "itibar": (25, 45),
        "hedef": "tekel_ticaret",
        "baslangic_mulk": ["dükkân", "dükkân", "işlik"],
        "tutum0": (-30, 0),     # rakipsen sabote eder
    },
    "eski_soylu": {
        "ad": "Akhanlı", "sembol": "👑", "renk": "#B8860B",
        "strateji": "İtibar ve evlilik ittifakları",
        "profs": ("lord", "veliaht", "katip", "kuyumcu"),
        "servet": (5000, 9000), "risk": 0.3, "itibar": (55, 80),
        "hedef": "itibar_zirvesi",
        "baslangic_mulk": ["ev", "han"],
        "tutum0": (-15, 5),     # küçümser; statün artarsa teklif eder
    },
    "golge_eli": {
        "ad": "Yılankıran", "sembol": "🗡️", "renk": "#4B0082",
        "strateji": "Suç, şantaj, kaçakçılık",
        "profs": ("haydut", "tüccar", "falcı"),
        "servet": (2000, 4500), "risk": 0.85, "itibar": (5, 20),
        "hedef": "golge_agi",
        "baslangic_mulk": ["han"],
        "tutum0": (-20, 10),    # borçlandırır, sır toplar
    },
    "dindar_hayirsever": {
        "ad": "Nurdağlı", "sembol": "☪️", "renk": "#2E8B57",
        "strateji": "İtibar tekeli, vakıflar",
        "profs": ("rahip", "şifacı", "katip"),
        "servet": (2500, 5000), "risk": 0.2, "itibar": (50, 75),
        "hedef": "vakif_agi",
        "baslangic_mulk": ["ev", "tarla"],
        "tutum0": (0, 20),      # ahlaki baskı ama kriz anında güvenilir
    },
    "asker_ocagi": {
        "ad": "Demirkol", "sembol": "⚔️", "renk": "#555577",
        "strateji": "Fraksiyon savaşları, kale gücü",
        "profs": ("general", "asker", "şövalye"),
        "servet": (2500, 5000), "risk": 0.6, "itibar": (35, 55),
        "hedef": "kale_gucu",
        "baslangic_mulk": ["işlik"],
        "tutum0": (-10, 10),    # güce saygı, zayıflığı ezer
    },
    "yukselen_koylu": {
        "ad": "Topraklı", "sembol": "🌱", "renk": "#6B8E23",
        "strateji": "Sıfırdan yükseliş — oyuncunun aynası",
        "profs": ("çiftçi", "çoban", "değirmenci", "köylü"),
        "servet": (400, 900), "risk": 0.5, "itibar": (10, 25),
        "hedef": "yukselis",
        "baslangic_mulk": ["tarla"],
        "tutum0": (-5, 25),     # doğal rakip VEYA doğal kardeş
    },
}

# Mülk tipi → haftalık tahmini gelir (hanedan defteri basit tutar)
MULK_GELIR = {"tarla": 10, "dükkân": 20, "işlik": 30, "han": 34, "ev": 3}
MULK_BEDEL = {"tarla": 800, "dükkân": 2000, "işlik": 3500, "han": 6000, "ev": 1500}

# Lokasyon başına mülk slotu — kıt kaynak hissinin kaynağı
def loc_slots(loc):
    return {"şehir": 8, "kale": 3}.get(loc.get("kind"), 4)


HANEDAN_EYLEMLER = [
    "mulk_al", "mulk_sat", "evlilik_teklifi", "fraksiyon_hamlesi",
    "oyuncuya_sabotaj", "oyuncuya_ittifak", "varis_yatirimi", "skandal_ortbas",
]


# ═══════════════════════════════════════════════════════════════════════════
# KURULUM
# ═══════════════════════════════════════════════════════════════════════════

def ensure_dynasties(state):
    """6 hanedanı kur (idempotent — eski kayıtlar lazy migrate olur)."""
    world = state["world"]
    if world.get("dynasties"):
        return world["dynasties"]
    rng = random.Random(state.get("turn", 0) * 31 + 7)
    npcs = [n for n in world["npcs"] if n.get("alive")]
    locations = world.get("locations", [])
    used_npcs = set()
    dynasties = []

    for key, arc in ARCHETYPES.items():
        reis = next((n for n in npcs
                     if n["id"] not in used_npcs
                     and n.get("profession") in arc["profs"]
                     and n.get("age", 30) >= 25), None)
        if not reis:
            reis = next((n for n in npcs if n["id"] not in used_npcs
                         and n.get("age", 30) >= 25), None)
        if not reis:
            continue
        used_npcs.add(reis["id"])
        # Üyeler: reisin ailesi + aynı lokasyondan 1-2 meslektaş
        uyeler = [reis["id"]]
        family_ids = (list(reis.get("children_ids", []))
                      + ([reis["spouse_id"]] if reis.get("spouse_id")
                         and reis["spouse_id"] != "PLAYER" else []))
        for fid in family_ids[:3]:
            m = next((n for n in npcs if n["id"] == fid and n["id"] not in used_npcs), None)
            if m:
                uyeler.append(m["id"]); used_npcs.add(m["id"])
        for n in npcs:
            if len(uyeler) >= 5:
                break
            if (n["id"] not in used_npcs and n.get("location_id") == reis.get("location_id")
                    and n.get("profession") in arc["profs"]):
                uyeler.append(n["id"]); used_npcs.add(n["id"])
        cocuklar = [i for i in reis.get("children_ids", []) if i in uyeler]
        varis = cocuklar[0] if cocuklar else (uyeler[1] if len(uyeler) > 1 else None)

        # Başlangıç mülkleri: reisin lokasyonu + komşu lokasyonlar
        mulkler = []
        home = next((l for l in locations if l["id"] == reis.get("location_id")), None)
        pool = ([home] if home else []) + [l for l in locations if l is not home]
        for i, mtype in enumerate(arc["baslangic_mulk"]):
            loc = pool[min(i // 2, len(pool) - 1)] if pool else None
            if not loc:
                break
            mulkler.append({"id": new_id(), "type": mtype,
                            "loc_id": loc["id"], "loc_name": loc["name"],
                            "income": MULK_GELIR.get(mtype, 5)})

        d = {
            "id": key,
            "ad": arc["ad"],
            "sembol": arc["sembol"],
            "renk": arc["renk"],
            "karakter": key,
            "strateji": arc["strateji"],
            "uyeler": uyeler,
            "reis": reis["id"],
            "varis": varis,
            "servet": rng.randint(*arc["servet"]),
            "mulkler": mulkler,
            "itibar": rng.randint(*arc["itibar"]),
            "oyuncuya_tutum": rng.randint(*arc["tutum0"]),
            "stratejik_hedef": arc["hedef"],
            "log": [],
            "nesil": 1,
            "sonmus": False,
        }
        for uid in uyeler:
            n = next((x for x in npcs if x["id"] == uid), None)
            if n:
                n["dynasty_id"] = key
        dynasties.append(d)

    world["dynasties"] = dynasties
    return dynasties


def get_dynasty(state, did):
    return next((d for d in state["world"].get("dynasties", [])
                 if d["id"] == did), None)


def _npc(state, nid):
    return next((n for n in state["world"]["npcs"] if n["id"] == nid), None)


def _log(state, d, text, scope=None):
    d.setdefault("log", []).append({"hafta": state.get("turn", 0), "text": text})
    d["log"] = d["log"][-10:]
    try:
        from simulation import _push_event
        _push_event(state, state.get("turn", 0), "hanedan",
                    f"{d['sembol']} {text}", scope=scope)
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════
# KIT KAYNAK — lokasyon mülk doluluk sorgusu (property_system de kullanır)
# ═══════════════════════════════════════════════════════════════════════════

def used_slots(state, loc_id):
    """Lokasyondaki dolu mülk slotu: hanedan mülkleri + oyuncu mülkleri."""
    n = sum(1 for p in state.get("properties", []) if p.get("location_id") == loc_id)
    for d in state["world"].get("dynasties", []):
        n += sum(1 for m in d.get("mulkler", []) if m.get("loc_id") == loc_id)
    return n


def free_slots(state, loc):
    return max(0, loc_slots(loc) - used_slots(state, loc["id"]))


def slot_owners(state, loc_id):
    """Bu lokasyondaki mülklerin sahipleri — 'kim kapmış' yüzeyi."""
    owners = []
    for d in state["world"].get("dynasties", []):
        for m in d.get("mulkler", []):
            if m.get("loc_id") == loc_id:
                owners.append({"sahip": d["ad"], "sembol": d["sembol"], "type": m["type"]})
    return owners


# ═══════════════════════════════════════════════════════════════════════════
# HAFTALIK TİCK — hanedan başına TEK eylem (utility skoru)
# ═══════════════════════════════════════════════════════════════════════════

def dynasty_world_tick(state, day):
    ensure_dynasties(state)
    for d in state["world"].get("dynasties", []):
        if d.get("sonmus"):
            continue
        _succession_check(state, d)
        if d.get("sonmus"):
            continue
        _income_tick(state, d)
        _attitude_drift(state, d)
        # Haftada %60 ihtimalle eylem — her hafta hamle yapmak robotik olur
        if random.random() < 0.60:
            _take_action(state, d, day)


def _succession_check(state, d):
    """Reis öldüyse vâris devralır; kimse kalmadıysa hanedan söner."""
    reis = _npc(state, d["reis"])
    if reis and reis.get("alive"):
        return
    alive = [i for i in d.get("uyeler", []) if (_npc(state, i) or {}).get("alive")]
    d["uyeler"] = alive
    varis = d.get("varis")
    new_reis = varis if varis in alive else (alive[0] if alive else None)
    if not new_reis:
        d["sonmus"] = True
        _log(state, d, f"{d['ad']} hanedanı tarihe karıştı — son üyesi de öldü.",
             scope="makro")
        return
    d["reis"] = new_reis
    d["nesil"] = d.get("nesil", 1) + 1
    d["varis"] = next((i for i in alive if i != new_reis), None)
    n = _npc(state, new_reis)
    _log(state, d, f"{d['ad']} hanedanında bayrak el değiştirdi: "
                   f"{n['name']} reisliği devraldı.", scope="makro")


def _income_tick(state, d):
    gelir = sum(m.get("income", 5) for m in d.get("mulkler", []))
    gider = 3 * len(d.get("uyeler", []))
    d["servet"] = max(0, d["servet"] + gelir - gider)


def _attitude_drift(state, d):
    """S2 köprüsü: tutum, reisin zihnindeki oyuncu anılarına doğru akar."""
    reis = _npc(state, d["reis"])
    if not reis:
        return
    try:
        from npc_mind import effective_rel
        hedef = effective_rel(state, reis)
    except Exception:
        hedef = 0
    t = d.get("oyuncuya_tutum", 0)
    delta = max(-3, min(3, (hedef - t) * 0.10))
    d["oyuncuya_tutum"] = max(-100, min(100, round(t + delta)))


def _arch(d):
    return ARCHETYPES.get(d.get("karakter"), ARCHETYPES["yukselen_koylu"])


def _action_scores(state, d):
    """GDD: eylem_skoru = hedefe_katkı×3 + servet_uygunluğu + risk×arketip."""
    arc = _arch(d)
    risk = arc["risk"]
    hedef = d.get("stratejik_hedef", "")
    tutum = d.get("oyuncuya_tutum", 0)
    player = state["player"]
    scores = {}

    # hedefe_katkı (0..1) eylem×hedef matrisi
    katki = {
        "mulk_al":          {"tekel_ticaret": 1.0, "yukselis": 0.9, "vakif_agi": 0.6,
                             "itibar_zirvesi": 0.5, "kale_gucu": 0.4, "golge_agi": 0.4},
        "evlilik_teklifi":  {"itibar_zirvesi": 1.0, "yukselis": 0.5},
        "fraksiyon_hamlesi":{"kale_gucu": 1.0, "vakif_agi": 0.8, "golge_agi": 0.7,
                             "itibar_zirvesi": 0.6},
        "oyuncuya_sabotaj": {"tekel_ticaret": 0.8, "golge_agi": 1.0},
        "oyuncuya_ittifak": {"yukselis": 0.8, "vakif_agi": 0.6, "itibar_zirvesi": 0.4,
                             "tekel_ticaret": 0.3},
        "varis_yatirimi":   {"itibar_zirvesi": 0.7, "kale_gucu": 0.6, "yukselis": 0.6,
                             "vakif_agi": 0.5, "tekel_ticaret": 0.4, "golge_agi": 0.4},
        "skandal_ortbas":   {"itibar_zirvesi": 0.6, "vakif_agi": 0.7},
        "mulk_sat":         {},
    }

    for eylem in HANEDAN_EYLEMLER:
        hk = katki.get(eylem, {}).get(hedef, 0.2)
        servet_uy = 0.0
        if eylem == "mulk_al":
            # Büyüme tavanı: tekelci 14, diğerleri 8 mülkte doyar —
            # baskı kurar ama haritayı tamamen kilitlemez
            tavan = 14 if hedef == "tekel_ticaret" else 8
            if len(d.get("mulkler", [])) >= tavan:
                servet_uy = -3.0
            else:
                servet_uy = 1.0 if d["servet"] > 2500 else (0.3 if d["servet"] > 1200 else -1.0)
        elif eylem == "mulk_sat":
            servet_uy = 1.5 if (d["servet"] < 150 and d.get("mulkler")) else -2.0
        elif eylem == "skandal_ortbas":
            servet_uy = 0.8 if (d["itibar"] < 20 and d["servet"] > 300) else -1.5
        elif eylem == "varis_yatirimi":
            varis = _npc(state, d.get("varis"))
            if varis and varis.get("skill_level", 1) >= 5:
                servet_uy = -2.5          # vâris zaten üstat — para çöpe gider
            else:
                servet_uy = 0.5 if d["servet"] > 600 else -0.5
        elif eylem == "fraksiyon_hamlesi":
            # Sık bağış hanedanı kurutur: yakın geçmişte yapıldıysa erteler
            son = d.get("_son_fraksiyon", -99)
            if state.get("turn", 0) - son < 6:
                servet_uy = -2.0
            else:
                servet_uy = 0.4 if d["servet"] > 800 else -0.5

        risk_c = 0.0
        if eylem == "oyuncuya_sabotaj":
            # Düşmanlık + cüret ister; dost/müttefik hanedan sabote etmez
            if d["id"] in state.get("allied_dynasties", []):
                risk_c = -5.0
            else:
                risk_c = risk * 1.2 if tutum < -20 else -3.0
        elif eylem == "oyuncuya_ittifak":
            risk_c = 0.8 if tutum > 25 else -2.5
        elif eylem == "evlilik_teklifi":
            # Oyuncunun statüsü arttıkça soylu teklif eder
            rep = player.get("reputation", 0)
            risk_c = 0.8 if (tutum > 10 and rep > 25) else -1.5

        scores[eylem] = hk * 3 + servet_uy + risk_c + random.uniform(-0.3, 0.3)
    return scores


def _take_action(state, d, day):
    scores = _action_scores(state, d)
    eylem = max(scores, key=scores.get)
    if scores[eylem] <= 0:
        return
    handler = {
        "mulk_al": _do_mulk_al, "mulk_sat": _do_mulk_sat,
        "evlilik_teklifi": _do_evlilik, "fraksiyon_hamlesi": _do_fraksiyon,
        "oyuncuya_sabotaj": _do_sabotaj, "oyuncuya_ittifak": _do_ittifak,
        "varis_yatirimi": _do_varis, "skandal_ortbas": _do_ortbas,
    }.get(eylem)
    if handler:
        handler(state, d, day)


# ── Eylemler ───────────────────────────────────────────────────────────────

def _do_mulk_al(state, d, day):
    arc = _arch(d)
    tercih = {"tekel_ticaret": ["dükkân", "işlik"], "itibar_zirvesi": ["han", "ev"],
              "golge_agi": ["han", "dükkân"], "vakif_agi": ["tarla", "ev"],
              "kale_gucu": ["işlik", "tarla"], "yukselis": ["tarla", "dükkân"]}
    types = tercih.get(d["stratejik_hedef"], ["dükkân"])
    mtype = random.choice(types)
    bedel = MULK_BEDEL.get(mtype, 1500)
    if d["servet"] < bedel:
        return
    # Boş slotu olan lokasyon — oyuncunun lokasyonu öncelikli (rekabet hissi)
    locs = list(state["world"]["locations"])
    player_loc = state["player"].get("location_id")
    locs.sort(key=lambda l: 0 if l["id"] == player_loc else random.random() + 0.5)
    # Son slotu kapmakta çoğu hanedan tereddüt eder (oyuncuya nefes payı);
    # gölge eli ve tekelci tüccar acımasızdır — kapar.
    acimasiz = d["stratejik_hedef"] in ("tekel_ticaret", "golge_agi")
    loc = next((l for l in locs if free_slots(state, l) > 1
                or (free_slots(state, l) == 1 and (acimasiz or random.random() < 0.3))),
               None)
    if not loc:
        return
    d["servet"] -= bedel
    d["mulkler"].append({"id": new_id(), "type": mtype, "loc_id": loc["id"],
                         "loc_name": loc["name"], "income": MULK_GELIR.get(mtype, 5)})
    scope = "kişisel" if loc["id"] == player_loc else None
    kalan = free_slots(state, loc)
    ek = f" Artık {loc['name']}'de yalnızca {kalan} boş mülk kaldı." if kalan <= 2 else ""
    _log(state, d, f"{d['ad']} hanedanı {loc['name']}'de bir {mtype} satın aldı.{ek}",
         scope=scope)


def _do_mulk_sat(state, d, day):
    if not d.get("mulkler"):
        return
    m = d["mulkler"].pop()
    d["servet"] += int(MULK_BEDEL.get(m["type"], 1500) * 0.7)
    _log(state, d, f"{d['ad']} hanedanı zor günde {m['loc_name']}'deki "
                   f"{m['type']} mülkünü elden çıkardı.")


def _do_evlilik(state, d, day):
    player = state["player"]
    # Oyuncuya teklif: bekâr + yetişkin + tutum/itibar uygunsa
    if (not player.get("spouse_id") and player.get("age", 0) >= 16
            and d.get("oyuncuya_tutum", 0) > 10):
        aday = None
        for uid in d.get("uyeler", []):
            n = _npc(state, uid)
            if (n and n.get("alive") and not n.get("spouse_id")
                    and 16 <= n.get("age", 0) <= 45 and uid != d["reis"]):
                aday = n
                break
        if aday and not any(o["type"] == "evlilik" and o["dynasty_id"] == d["id"]
                            for o in state.get("dynasty_offers", [])):
            state.setdefault("dynasty_offers", []).append({
                "id": new_id(), "type": "evlilik", "dynasty_id": d["id"],
                "dynasty_ad": d["ad"], "sembol": d["sembol"],
                "npc_id": aday["id"], "npc_name": aday["name"],
                "hafta": state.get("turn", 0), "expires": state.get("turn", 0) + 12,
                "text": (f"{d['sembol']} {d['ad']} hanedanı resmî bir elçi gönderdi: "
                         f"{aday['name']} ile evlilik bağı kurup iki haneyi "
                         "birleştirmeyi teklif ediyorlar."),
            })
            _log(state, d, f"{d['ad']} hanedanı sana evlilik ittifakı teklif etti!",
                 scope="kişisel")
            return
    # Değilse iç evlilik (renk olayı)
    d["itibar"] = min(100, d["itibar"] + 2)
    _log(state, d, f"{d['ad']} hanedanı bir düğünle itibarını perçinledi.")


def _do_fraksiyon(state, d, day):
    factions = state["world"].get("factions") or []
    if not factions or d["servet"] < 200:
        return
    fac = random.choice(factions)
    bagis = min(150, d["servet"] // 8)
    d["_son_fraksiyon"] = state.get("turn", 0)
    d["servet"] -= bagis
    fac["treasury"] = fac.get("treasury", 0) + bagis
    d["itibar"] = min(100, d["itibar"] + 1)
    _log(state, d, f"{d['ad']} hanedanı {fac.get('name','bir örgüt')}'e "
                   f"{bagis} altın akıttı — nüfuz büyüyor.")


def _do_sabotaj(state, d, day):
    """Oyuncuya sabotaj: mülküne zarar / işçisini çalma / kara çamur."""
    player = state["player"]
    props = state.get("properties", [])
    anlasildi = random.random() < 0.5
    if props:
        p = random.choice(props)
        dmg = random.randint(12, 25)
        p["condition"] = max(5, p.get("condition", 100) - dmg)
        text = f"{p['name']} sabote edildi — kondisyon -{dmg}."
    elif player.get("money", 0) > 50:
        kayip = random.randint(10, 30)
        player["money"] = round(player["money"] - kayip, 1)
        text = f"Bir gece kesen kesildi: -{kayip} altın. İşin arkasında el var."
    else:
        text = "Hakkında kara bir fısıltı dolaşmaya başladı."
    d["oyuncuya_tutum"] = max(-100, d["oyuncuya_tutum"] - 3)
    if anlasildi:
        reis = _npc(state, d["reis"])
        state.setdefault("player_rumors", []).append({
            "id": new_id()[:12], "hafta": state.get("turn", 0),
            "tur": "iftira", "nam": None, "yon": -1, "siddet": 1,
            "text": (f"{d['sembol']} {d['ad']} hanedanının senin kuyunu "
                     "kazdığı fısıldanıyor."),
            "kaynak_id": reis["id"] if reis else None,
            "kaynak_name": d["ad"], "loc_id": player.get("location_id"),
        })
        try:
            from simulation import _push_event
            _push_event(state, day, "sabotaj",
                        f"⚠ {text} {d['sembol']} {d['ad']}'nun işi olduğu fısıldanıyor.",
                        scope="kişisel")
        except Exception:
            pass
    else:
        try:
            from simulation import _push_event
            _push_event(state, day, "sabotaj", f"⚠ {text} Fail meçhul.",
                        scope="kişisel")
        except Exception:
            pass
    _log(state, d, "Gölgede bir iş halledildi.")


def _do_ittifak(state, d, day):
    if any(o["type"] == "ittifak" and o["dynasty_id"] == d["id"]
           for o in state.get("dynasty_offers", [])):
        return
    if d["id"] in state.get("allied_dynasties", []):
        return
    state.setdefault("dynasty_offers", []).append({
        "id": new_id(), "type": "ittifak", "dynasty_id": d["id"],
        "dynasty_ad": d["ad"], "sembol": d["sembol"],
        "hafta": state.get("turn", 0), "expires": state.get("turn", 0) + 12,
        "text": (f"{d['sembol']} {d['ad']} hanedanı ittifak öneriyor: ortak "
                 "kervan, ortak düşman, zor günde omuz."),
    })
    _log(state, d, f"{d['ad']} hanedanı sana ittifak teklif etti!", scope="kişisel")


def _do_varis(state, d, day):
    if d["servet"] < 100:
        return
    d["servet"] -= 100
    d["itibar"] = min(100, d["itibar"] + 1)
    varis = _npc(state, d.get("varis"))
    if varis:
        varis["skill_level"] = min(5, varis.get("skill_level", 1) + 1)
        _log(state, d, f"{d['ad']} hanedanı vârisi {varis['name']}'i yetiştiriyor.")
    else:
        _log(state, d, f"{d['ad']} hanedanı geleceğe yatırım yaptı.")


def _do_ortbas(state, d, day):
    if d["servet"] < 150:
        return
    d["servet"] -= 150
    d["itibar"] = min(100, d["itibar"] + 5)
    _log(state, d, f"{d['ad']} hanedanı bir skandalı parayla örtbas etti.")


# ═══════════════════════════════════════════════════════════════════════════
# OYUNCU YÜZEYİ — lig tablosu + teklifler + oyuncu hamleleri
# ═══════════════════════════════════════════════════════════════════════════

def league_table(state):
    """Hanedanlar sayfası: 6 aile + OYUNCU aynı tabloda (lig psikolojisi)."""
    ensure_dynasties(state)
    player = state["player"]
    try:
        from property_system import property_value
        p_mulk_deger = sum(property_value(p) for p in state.get("properties", []))
    except Exception:
        p_mulk_deger = 0
    rows = [{
        "id": "player", "ad": player.get("name", "Sen"), "sembol": "🔥",
        "renk": "#C9A84C", "oyuncu": True,
        "servet": int(player.get("money", 0) + p_mulk_deger),
        "itibar": player.get("reputation", 0),
        "mulk_sayisi": len(state.get("properties", [])),
        "nesil": state.get("generation", 1),
        "tutum": None, "strateji": "Kendi hikâyeni yazıyorsun",
    }]
    for d in state["world"].get("dynasties", []):
        reis = _npc(state, d["reis"])
        rows.append({
            "id": d["id"], "ad": d["ad"], "sembol": d["sembol"], "renk": d["renk"],
            "oyuncu": False, "sonmus": d.get("sonmus", False),
            "servet": d["servet"] + sum(MULK_BEDEL.get(m["type"], 1500)
                                        for m in d.get("mulkler", [])) * 7 // 10,
            "itibar": d["itibar"],
            "mulk_sayisi": len(d.get("mulkler", [])),
            "nesil": d.get("nesil", 1),
            "tutum": d.get("oyuncuya_tutum", 0),
            "strateji": d.get("strateji", ""),
            "reis_adi": reis["name"] if reis else "—",
            "reis_id": d["reis"],
            "uye_sayisi": len(d.get("uyeler", [])),
            "ittifak": d["id"] in state.get("allied_dynasties", []),
            "log": list(reversed(d.get("log", [])))[:4],
        })
    rows.sort(key=lambda r: (-r["servet"]))
    for i, r in enumerate(rows):
        r["sira"] = i + 1
    # Süresi geçen teklifler düşer
    turn = state.get("turn", 0)
    state["dynasty_offers"] = [o for o in state.get("dynasty_offers", [])
                               if o.get("expires", 0) > turn]
    return {"tablo": rows, "teklifler": state["dynasty_offers"], "turn": turn}


def respond_offer(state, offer_id, karar):
    """Hanedan teklifine cevap: kabul | red."""
    offers = state.get("dynasty_offers", [])
    offer = next((o for o in offers if o["id"] == offer_id), None)
    if not offer:
        return None, "Teklif artık geçerli değil."
    d = get_dynasty(state, offer["dynasty_id"])
    offers.remove(offer)
    if not d:
        return None, "Hanedan bulunamadı."
    turn = state.get("turn", 0)
    player = state["player"]

    if karar == "red":
        d["oyuncuya_tutum"] = max(-100, d["oyuncuya_tutum"] - 10)
        _log(state, d, f"{d['ad']} hanedanının teklifi reddedildi — gururları kırıldı.")
        return {"response": f"Elçiyi eli boş gönderdin. {d['ad']} bunu unutmayacak.",
                "consequences": ["Hanedan tutumu -10"]}, None

    if offer["type"] == "ittifak":
        state.setdefault("allied_dynasties", []).append(d["id"])
        d["oyuncuya_tutum"] = min(100, d["oyuncuya_tutum"] + 30)
        reis = _npc(state, d["reis"])
        if reis:
            try:
                from npc_mind import add_memory
                add_memory(reis, "soz_tutma", turn, detay="ittifak kuruldu")
            except Exception:
                pass
        _log(state, d, f"{d['ad']} hanedanı ile ittifak kuruldu!", scope="kişisel")
        return {"response": f"{d['sembol']} {d['ad']} ile el sıkıştınız. "
                            "Artık zor günde yanında bir hanedan var.",
                "consequences": ["Hanedan tutumu +30",
                                 "🤝 Müttefik hanedan: sabotaj kesilir, kriz desteği"]}, None

    if offer["type"] == "evlilik":
        if player.get("spouse_id"):
            return None, "Zaten evlisin — elçi mahcup ayrıldı."
        npc = _npc(state, offer["npc_id"])
        if not npc or not npc.get("alive") or npc.get("spouse_id"):
            return None, "Aday artık müsait değil."
        player["spouse_id"] = npc["id"]
        npc["spouse_id"] = "PLAYER"
        player.setdefault("relationship_status", {})[npc["id"]] = "married"
        state.setdefault("relationships", {})[npc["id"]] = min(
            100, state.get("relationships", {}).get(npc["id"], 0) + 40)
        state.setdefault("allied_dynasties", []).append(d["id"])
        d["oyuncuya_tutum"] = min(100, d["oyuncuya_tutum"] + 40)
        player["reputation"] = player.get("reputation", 0) + 8
        try:
            from npc_mind import add_memory
            add_memory(npc, "dugun", turn)
            reis = _npc(state, d["reis"])
            if reis:
                add_memory(reis, "dugun", turn, detay="hanedan evliliği")
        except Exception:
            pass
        try:
            from simulation import _push_event
            _push_event(state, turn, "evlilik",
                        f"{player['name']} ile {npc['name']} evlendi — "
                        f"{d['ad']} hanedanıyla kan bağı kuruldu.", scope="kişisel")
        except Exception:
            pass
        _log(state, d, f"{d['ad']} hanedanı oyuncuyla kan bağı kurdu — düğün!")
        return {"response": f"💍 {npc['name']} ile evlendin. {d['sembol']} {d['ad']} "
                            "artık ailen.",
                "consequences": ["Hanedan tutumu +40", "İtibar +8",
                                 "🤝 Müttefik hanedan", "💍 Evlendin"]}, None

    return None, "Bilinmeyen teklif türü."


def player_overture(state, dynasty_id):
    """Oyuncu hanedana yakınlaşma jesti: 100 altınlık hediye konvoyu.
    Tutum yeterliyse ittifaka dönüşür."""
    d = get_dynasty(state, dynasty_id)
    if not d or d.get("sonmus"):
        return None, "Hanedan bulunamadı."
    if d["id"] in state.get("allied_dynasties", []):
        return None, "Zaten müttefiksiniz."
    player = state["player"]
    if player.get("money", 0) < 100:
        return None, "Hediye konvoyu için 100 altın gerekli."
    player["money"] = round(player["money"] - 100, 1)
    d["servet"] += 100
    d["oyuncuya_tutum"] = min(100, d["oyuncuya_tutum"] + 12)
    reis = _npc(state, d["reis"])
    if reis:
        try:
            from npc_mind import add_memory
            add_memory(reis, "comert_hediye", state.get("turn", 0),
                       detay="hanedana hediye konvoyu")
        except Exception:
            pass
    _log(state, d, f"Oyuncudan {d['ad']} hanedanına hediye konvoyu geldi.")
    if d["oyuncuya_tutum"] > 30:
        _do_ittifak(state, d, state.get("turn", 0))
        return {"response": f"{d['sembol']} {d['ad']} hediyeni kabul etti — ve bir "
                            "ittifak elçisi yola çıktı bile.",
                "consequences": ["-100 altın", "Tutum +12",
                                 "📜 İttifak teklifi geldi — Hanedanlar sayfasında"]}, None
    return {"response": f"{d['sembol']} {d['ad']} hediyeni kabul etti. Buzlar eriyor.",
            "consequences": ["-100 altın", "Tutum +12"]}, None


# ═══════════════════════════════════════════════════════════════════════════
# NESİL SÜREKLİLİĞİ — tutum mirası (inheritance.begin_inheritance çağırır)
# ═══════════════════════════════════════════════════════════════════════════

def inherit_attitudes(state):
    """Babanın düşman hanedanı, oğlunun da düşmanıdır — ama yeni nesil
    sayfayı bir parça temiz açar (tutum %80 taşınır)."""
    for d in state["world"].get("dynasties", []):
        t = d.get("oyuncuya_tutum", 0)
        d["oyuncuya_tutum"] = round(t * 0.8)
        if abs(t) >= 30:
            yon = "düşmanlığı" if t < 0 else "dostluğu"
            _log(state, d, f"{d['ad']} hanedanının eski nesle {yon} "
                           "yeni nesle de taşındı.")
    # Müttefiklik kan bağı değilse yeniden kazanılmalı
    state["allied_dynasties"] = [
        did for did in state.get("allied_dynasties", [])
        if (get_dynasty(state, did) or {}).get("oyuncuya_tutum", 0) > 20
    ]
