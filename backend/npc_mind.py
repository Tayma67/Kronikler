"""NPC Zihni — GDD v7 S2 (Adım 2).

"NPC'ler senin hakkında konuşuyor — ve unutmuyorlar."

Dört parça, hepsi mevcut sistemlerin ÜZERİNE oturur:
  1. Yapısal anı nesnesi  — npc["anilar"]: tur, hedef, hafta, duygu_yuku,
     unutma_hizi, travma, taniklar. Haftalık decay; travmalar asla silinmez.
     İlişki skoru = taban (state["relationships"]) + Σ(aktif anıların yükü).
  2. Davranış eşikleri    — 5 kademe (aktif düşman → sadık müttefik),
     somut etkiler: selam, ticaret çarpanı, bilgi paylaşımı.
  3. NPC amaç eylemleri   — öğrenilen amaca Yardım Et / Sömür / Görmezden gel.
     Yardım kalıcı +20 anı ve "sana borçlu" tohumlar; sömürü pazarlık kozu
     verir ama sezilirse kalıcı kırgınlık bırakır.
  4. Dedikodu ağı & nam   — tanıklı skandal anılar oyuncu hakkında söylentiye
     dönüşür (yayılma = tanık × skandal × yoğunluk). Son 2 yılın anılarından
     nam profili (cömert/zalim/çapkın/dindar/mert) çıkar; baskın nam somut
     etki yapar. Söylentiye Yüzleş / Yay / Sustur (rüşvet).
"""
import random
import uuid


# ═══════════════════════════════════════════════════════════════════════════
# 1) ANI TÜRLERİ — 30 tür: (duygu_yuku, unutma_hizi, skandal, nam, travma)
#    skandal 0..1: dedikoduya sızma eğilimi. nam: hangi nam sayacını besler.
# ═══════════════════════════════════════════════════════════════════════════

MEMORY_TYPES = {
    # ── olumlu ──
    "iltifat":          {"yuk":  +4, "unutma": 0.94, "skandal": 0.0, "nam": None},
    "guzel_sohbet":     {"yuk":  +3, "unutma": 0.94, "skandal": 0.0, "nam": None},
    "icten_sohbet":     {"yuk":  +6, "unutma": 0.96, "skandal": 0.0, "nam": None},
    "hediye":           {"yuk":  +8, "unutma": 0.96, "skandal": 0.0, "nam": "cömert"},
    "comert_hediye":    {"yuk": +15, "unutma": 0.98, "skandal": 0.2, "nam": "cömert"},
    "sadaka":           {"yuk": +10, "unutma": 0.97, "skandal": 0.2, "nam": "cömert"},
    "yardim":           {"yuk": +20, "unutma": 0.995, "skandal": 0.3, "nam": "cömert"},
    "borc_kurtarma":    {"yuk": +25, "unutma": 0.997, "skandal": 0.4, "nam": "cömert"},
    "hayat_kurtarma":   {"yuk": +40, "unutma": 1.0,  "skandal": 0.6, "nam": "mert", "travma": True},
    "savunma":          {"yuk": +15, "unutma": 0.99, "skandal": 0.4, "nam": "mert"},
    "sir_saklama":      {"yuk": +12, "unutma": 0.99, "skandal": 0.0, "nam": "mert"},
    "soz_tutma":        {"yuk":  +8, "unutma": 0.97, "skandal": 0.0, "nam": "mert"},
    "dugun":            {"yuk": +20, "unutma": 0.995, "skandal": 0.2, "nam": None},
    "sira_arkadasi":    {"yuk":  +6, "unutma": 0.999, "skandal": 0.0, "nam": None},
    "ibadet_tanigi":    {"yuk":  +3, "unutma": 0.95, "skandal": 0.2, "nam": "dindar"},
    "ortak_kazanc":     {"yuk":  +7, "unutma": 0.96, "skandal": 0.0, "nam": None},
    # ── olumsuz ──
    "rahatsizlik":      {"yuk":  -3, "unutma": 0.93, "skandal": 0.0, "nam": None},
    "tatsiz_konu":      {"yuk":  -4, "unutma": 0.94, "skandal": 0.0, "nam": None},
    "haddini_asma":     {"yuk":  -6, "unutma": 0.95, "skandal": 0.1, "nam": None},
    "bluf":             {"yuk":  -4, "unutma": 0.94, "skandal": 0.1, "nam": None},
    "alay":             {"yuk":  -8, "unutma": 0.96, "skandal": 0.2, "nam": "zalim"},
    "hakaret":          {"yuk": -15, "unutma": 0.98, "skandal": 0.5, "nam": "zalim"},
    "tehdit":           {"yuk": -20, "unutma": 0.985, "skandal": 0.6, "nam": "zalim"},
    "iftira":           {"yuk": -12, "unutma": 0.97, "skandal": 0.4, "nam": "zalim"},
    "somuru":           {"yuk": -15, "unutma": 0.98, "skandal": 0.3, "nam": "zalim"},
    "dolandiricilik":   {"yuk": -22, "unutma": 0.985, "skandal": 0.6, "nam": "zalim"},
    "hirsizlik_tanigi": {"yuk": -18, "unutma": 0.98, "skandal": 0.7, "nam": "zalim"},
    "suc_tanigi":       {"yuk": -15, "unutma": 0.98, "skandal": 0.8, "nam": "zalim"},
    "saldiri":          {"yuk": -35, "unutma": 1.0,  "skandal": 0.9, "nam": "zalim", "travma": True},
    "kacirma":          {"yuk": -50, "unutma": 1.0,  "skandal": 1.0, "nam": "zalim", "travma": True},
    "yakinima_zarar":   {"yuk": -30, "unutma": 1.0,  "skandal": 0.6, "nam": "zalim", "travma": True},
    "ihanet":           {"yuk": -30, "unutma": 1.0,  "skandal": 0.5, "nam": None,    "travma": True},
    "flort_tanigi":     {"yuk":  -1, "unutma": 0.96, "skandal": 0.4, "nam": "çapkın"},
    "reddedilme":       {"yuk":  -2, "unutma": 0.95, "skandal": 0.3, "nam": "çapkın"},
}

NAM_TRAITS = ["cömert", "zalim", "çapkın", "dindar", "mert"]

# Anı türü → söylenti cümlesi şablonları ({k}: kaynak adı, {p}: oyuncu adı)
_RUMOR_LINES = {
    "hakaret":          ["{p}, {k}'i herkesin içinde aşağılamış.",
                         "Duydun mu? {p} ağzına geleni söylemiş {k}'e."],
    "tehdit":           ["{p}, {k}'i tehdit etmiş — gözü dönmüş diyorlar."],
    "saldiri":          ["{p}, {k}'e saldırmış. Kan dökülmüş.",
                         "Çarşıda konuşulan o: {p} yumruklarıyla konuşuyormuş."],
    "kacirma":          ["{p} adam kaçırıyormuş! {k}'in başına gelen herkesin dilinde."],
    "hirsizlik_tanigi": ["{k}, {p}'i el işi üstünde görmüş. Eli uzunmuş diyorlar."],
    "suc_tanigi":       ["{p}'in karanlık işler çevirdiğini {k} kendi gözüyle görmüş."],
    "dolandiricilik":   ["{p} güveni boşa çıkarmış; {k}'i dolandırmış diyorlar."],
    "somuru":           ["{p}, {k}'in derdini koz yapmış. İçten pazarlıklıymış."],
    "iftira":           ["{p}'in dili zehirli — {k}'in arkasından kuyu kazmış."],
    "alay":             ["{p}, {k}'le alay etmiş; küçük düşürmeyi seviyormuş."],
    "yakinima_zarar":   ["{p} yüzünden {k}'in ocağına ateş düşmüş."],
    "flort_tanigi":     ["{p}'in gözü dışarıdaymış; {k} görmüş.",
                         "{p} gönül işlerinde pek hızlıymış, öyle diyorlar."],
    "reddedilme":       ["{p} kapı kapı gönül dileniyormuş; {k}'den reddi yemiş."],
    "comert_hediye":    ["{p} eli açık biriymiş; {k}'e verdiği hediye dillerde."],
    "sadaka":           ["{p} fakir fukarayı gözetiyormuş; {k} de nasiplenmiş."],
    "yardim":           ["{p}, {k}'in zor gününde yanında durmuş. Mert adammış."],
    "borc_kurtarma":    ["{p}, {k}'i borç batağından çekip çıkarmış. Böylesi az bulunur."],
    "hayat_kurtarma":   ["{p}, {k}'in hayatını kurtarmış! Kahraman diyorlar."],
    "savunma":          ["{p}, {k}'i yalnız bırakmamış; mertçe önüne dikilmiş."],
    "ibadet_tanigi":    ["{p}'i dualarında gören var; dindar biriymiş."],
    "ihanet":           ["{p} güvenilmez biriymiş; {k} sırtından bıçaklanmış."],
}

# Anı türü → NPC'nin hatırlayış cümlesi (sohbette "seni hatırlıyor" satırı)
_REMEMBER_LINES = {
    "hakaret": "bana hakaret etmişti", "tehdit": "beni tehdit etmişti",
    "saldiri": "bana el kaldırmıştı", "kacirma": "beni kaçırmıştı",
    "yakinima_zarar": "yakınıma zarar vermişti", "ihanet": "bana ihanet etmişti",
    "somuru": "derdimi koz yapmıştı", "bluf": "pazarlıkta blöf yapmıştı",
    "hediye": "bana hediye vermişti", "comert_hediye": "bana cömert bir hediye vermişti",
    "sadaka": "bana el uzatmıştı", "yardim": "zor günümde yanımdaydı",
    "borc_kurtarma": "beni borçtan kurtarmıştı", "hayat_kurtarma": "hayatımı kurtarmıştı",
    "dugun": "düğünümüzde yanımdaydı", "sira_arkadasi": "mektepte sıra arkadaşımdı",
    "icten_sohbet": "benimle içten konuşmuştu", "iltifat": "bana güzel sözler söylemişti",
    "suc_tanigi": "onu karanlık bir işte görmüştüm",
    "hirsizlik_tanigi": "onu el işi üstünde görmüştüm",
    "iftira": "arkamdan konuşmuştu", "alay": "benimle alay etmişti",
    "savunma": "beni savunmuştu", "sir_saklama": "sırrımı tutmuştu",
}


# ═══════════════════════════════════════════════════════════════════════════
# ANI EKLEME / DECAY / İLİŞKİ SKORU
# ═══════════════════════════════════════════════════════════════════════════

def add_memory(npc, tur, hafta, hedef="player", yuk=None, taniklar=None, detay=""):
    """Yapısal anı ekle. Bilinmeyen tür sessizce yok sayılır (geriye uyum)."""
    spec = MEMORY_TYPES.get(tur)
    if not spec:
        return None
    ani = {
        "tur": tur,
        "hedef": hedef,
        "hafta": int(hafta),
        "duygu_yuku": float(yuk if yuk is not None else spec["yuk"]),
        "unutma_hizi": 1.0 if spec.get("travma") else spec["unutma"],
        "travma": bool(spec.get("travma")),
        "taniklar": list(taniklar or []),
        "detay": detay,
        "yayildi": False,
    }
    mems = npc.setdefault("anilar", [])
    mems.append(ani)
    if len(mems) > 24:
        # Travmalar korunur; en sönük (|yük| küçük) travmasız anı düşer
        zayif = sorted((m for m in mems if not m["travma"]),
                       key=lambda m: abs(m["duygu_yuku"]))
        if zayif:
            mems.remove(zayif[0])
        else:
            mems.pop(0)
    return ani


def decay_memories(npc):
    """Haftalık: duygu yükü unutma hızıyla söner; sönen travmasız anı silinir."""
    mems = npc.get("anilar")
    if not mems:
        return
    keep = []
    for m in mems:
        m["duygu_yuku"] = round(m["duygu_yuku"] * m.get("unutma_hizi", 0.95), 3)
        if m.get("travma") or abs(m["duygu_yuku"]) >= 1.0:
            keep.append(m)
    npc["anilar"] = keep


def memory_sum(npc, hedef="player"):
    """Σ aktif anıların duygu yükü."""
    return round(sum(m["duygu_yuku"] for m in npc.get("anilar", [])
                     if m.get("hedef") == hedef))


def effective_rel(state, npc):
    """GDD: ilişki_skoru = taban + Σ(aktif_anıların_duygu_yükü)."""
    taban = state.get("relationships", {}).get(npc["id"], 0)
    return max(-100, min(100, taban + memory_sum(npc)))


def top_memories(npc, n=2, hedef="player"):
    """En ağır n anının hatırlayış cümleleri — sohbet yüzeyi için."""
    mems = [m for m in npc.get("anilar", []) if m.get("hedef") == hedef
            and abs(m["duygu_yuku"]) >= 3]
    mems.sort(key=lambda m: abs(m["duygu_yuku"]), reverse=True)
    out = []
    for m in mems[:n]:
        line = _REMEMBER_LINES.get(m["tur"])
        if line:
            out.append({"text": line, "yon": 1 if m["duygu_yuku"] > 0 else -1,
                        "travma": m["travma"]})
    return out


# ═══════════════════════════════════════════════════════════════════════════
# 2) DAVRANIŞ EŞİKLERİ — GDD tablosu birebir
# ═══════════════════════════════════════════════════════════════════════════

TIERS = [
    (-101, -40, {"key": "aktif_dusman", "label": "Aktif düşman",
                 "selam": False, "al_carpan": 1.20, "bilgi": False,
                 "desc": "Selam vermez, ticarette %20 zam, fraksiyonda aleyhte oy"}),
    (-40, -20, {"key": "soguk", "label": "Soğuk",
                "selam": True, "al_carpan": 1.08, "bilgi": False,
                "desc": "Pazarlıkta kötü niyet, bilgi paylaşmaz"}),
    (-20, 20, {"key": "notr", "label": "Nötr",
               "selam": True, "al_carpan": 1.0, "bilgi": True,
               "desc": "Standart"}),
    (20, 50, {"key": "dost", "label": "Dost",
              "selam": True, "al_carpan": 0.95, "bilgi": True,
              "desc": "İndirim, bilgi paylaşımı"}),
    (50, 101, {"key": "sadik", "label": "Sadık müttefik",
               "selam": True, "al_carpan": 0.90, "bilgi": True,
               "desc": "Zor anında yardım, sırrını saklar"}),
]


def behavior_tier(score):
    for lo, hi, t in TIERS:
        if lo <= score < hi:
            return t
    return TIERS[2][2]


# ═══════════════════════════════════════════════════════════════════════════
# 3) NPC AMAÇ EYLEMLERİ — Yardım Et / Sömür
# ═══════════════════════════════════════════════════════════════════════════

def goal_help_cost(state, npc):
    """Amaca yardımın bedeli: borçluysa borcu, değilse amaca göre altın."""
    debt = npc.get("debt", 0)
    if npc.get("goal") == "borc_odemek" and debt > 0:
        return debt, "borc"
    domain_cost = {"wealth": 30, "family": 20, "power": 40, "career": 25,
                   "social": 20, "vengeance": 35, "personal": 20, "religion": 25}
    try:
        from npc_profile import GOAL_BY_KEY
        domain = GOAL_BY_KEY.get(npc.get("goal"), {}).get("domain", "personal")
    except Exception:
        domain = "personal"
    return domain_cost.get(domain, 25), "altin"


def goal_action(state, npc, eylem):
    """Öğrenilen amaca eylem. Döndürür (result, err)."""
    intel = state.get("npc_intel", {}).get(npc["id"], {})
    if not intel.get("amac"):
        return None, "Önce amacını öğrenmelisin — sohbette derdini sor."
    player = state["player"]
    turn = state.get("turn", 0)

    if eylem == "yardim":
        if npc.get("amac_yardim_edildi"):
            return None, "Bu amaca zaten yardım ettin."
        cost, ctype = goal_help_cost(state, npc)
        if player.get("money", 0) < cost:
            return None, f"Yeterli altının yok ({cost} gerekli)."
        player["money"] = round(player["money"] - cost, 1)
        if ctype == "borc":
            npc["debt"] = 0
            tur = "borc_kurtarma"
            line = f"{npc['name']}'in borcunu kapattın. Gözleri doldu: 'Bu iyiliği unutmam.'"
        else:
            npc["savings"] = npc.get("savings", 0) + cost
            tur = "yardim"
            line = f"{npc['name']}'e amacı için {cost} altın ve emek verdin. 'Sana borçluyum.'"
        add_memory(npc, tur, turn, detay=f"amaç: {npc.get('goal')}")
        npc["amac_yardim_edildi"] = True
        npc["owes_player"] = True
        npc["goal_progress"] = min(100, npc.get("goal_progress", 0) + 30)
        progress_now = npc["goal_progress"]
        # S4 tohum: bu iyilik yıllar sonra beklenmedik biçimde döner
        try:
            from story_director import sow_seed
            sow_seed(state, "amac_yardimi",
                     f"{npc['name']} yükselmişti — ve seni unutmamıştı. Bir gün "
                     "kapına adamları geldi: 'Velinimetimiz seni çağırıyor.' "
                     "Eski iyiliğin sofrayla, keseyle ve itibarla döndü.",
                     hafta_min=104, hafta_max=416, agirlik="buyuk",
                     nesil_asabilir=True, npc_id=npc["id"],
                     etki={"money": 90, "reputation": 6})
        except Exception:
            pass
        try:
            from simulation import _push_event, advance_time
            _push_event(state, turn, "yardım",
                        f"{player['name']}, {npc['name']}'in amacına destek oldu.")
            advance_time(state, weeks=1)
        except Exception:
            pass
        return {
            "response": line,
            "consequences": [f"-{cost} altın", "İlişki +20 (kalıcı anı)",
                             "💡 Bu kişi sana borçlu — günü gelince ödeyecek",
                             f"Amaç ilerlemesi +30 (%{progress_now})"],
            "effective_rel": effective_rel(state, npc),
        }, None

    if eylem == "somur":
        if intel.get("koz"):
            return None, "Bu bilgiyi zaten koz yaptın."
        intel["koz"] = True
        state.setdefault("npc_intel", {})[npc["id"]] = intel
        consequences = ["🗡 Pazarlıkta artık taban fiyatını görüyor ve eziyorsun"]
        try:
            from skills import add_skill_xp
            add_skill_xp(player, "trade", 2)
        except Exception:
            pass
        sezdi = random.random() < 0.35
        if sezdi:
            add_memory(npc, "somuru", turn, detay="derdini koz yaptı")
            consequences.append(f"⚠ {npc['name']} sezdi — kalıcı kırgınlık (ilişki -15)")
            line = f"Derdini koza çevirdin. Ama {npc['name']}'in bakışları değişti — anladı."
        else:
            line = f"Derdini koza çevirdin. {npc['name']} hiçbir şeyden habersiz."
        return {
            "response": line,
            "consequences": consequences,
            "sezdi": sezdi,
            "effective_rel": effective_rel(state, npc),
        }, None

    return None, "Geçersiz eylem."


# ═══════════════════════════════════════════════════════════════════════════
# 4) DEDİKODU AĞI — tanıklı anılar söylentiye dönüşür
# ═══════════════════════════════════════════════════════════════════════════

def _location_density(state, loc_id):
    """Lokasyon yoğunluğu 0.3..1.0 — kalabalık yer, hızlı dedikodu."""
    if not loc_id:
        return 0.5
    count = sum(1 for n in state["world"]["npcs"]
                if n.get("alive") and n.get("location_id") == loc_id)
    return max(0.3, min(1.0, count / 15))


def gossip_tick(state):
    """Haftalık: işlenmemiş skandal anılar oyuncu söylentisine dönüşür.
    GDD: yayılma_şansı = tanık_sayısı × olay_skandalı × lokasyon_yoğunluğu."""
    turn = state.get("turn", 0)
    rumors = state.setdefault("player_rumors", [])

    # Aktif söylentiler sönümlenir
    for r in rumors:
        r["siddet"] = round(r.get("siddet", 1) - 0.15, 2)
    state["player_rumors"] = [r for r in rumors if r["siddet"] > 0][-12:]
    rumors = state["player_rumors"]

    player_name = state["player"].get("name", "Biri")
    for npc in state["world"]["npcs"]:
        if not npc.get("alive"):
            continue
        for m in npc.get("anilar", []):
            if m.get("yayildi") or m.get("hedef") != "player":
                continue
            if turn - m.get("hafta", 0) > 8:
                m["yayildi"] = True   # bayat — artık dile düşmez
                continue
            spec = MEMORY_TYPES.get(m["tur"], {})
            skandal = spec.get("skandal", 0)
            if skandal <= 0:
                m["yayildi"] = True
                continue
            m["yayildi"] = True
            tanik = 1 + len(m.get("taniklar", []))   # anı sahibi de anlatır
            yogunluk = _location_density(state, npc.get("location_id"))
            sans = min(0.9, tanik * skandal * yogunluk * 0.35)
            if random.random() >= sans:
                continue
            templates = _RUMOR_LINES.get(m["tur"])
            if not templates:
                continue
            text = random.choice(templates).format(k=npc["name"], p=player_name)
            rumors.append({
                "id": uuid.uuid4().hex[:12],
                "hafta": turn,
                "tur": m["tur"],
                "nam": spec.get("nam"),
                "yon": 1 if m["duygu_yuku"] > 0 else -1,
                "siddet": min(3, max(1, round(abs(m["duygu_yuku"]) / 12))),
                "text": text,
                "kaynak_id": npc["id"],
                "kaynak_name": npc["name"],
                "loc_id": npc.get("location_id"),
            })
    state["player_rumors"] = rumors[-12:]


# ═══════════════════════════════════════════════════════════════════════════
# NAM PROFİLİ — son 2 yılın anılarından
# ═══════════════════════════════════════════════════════════════════════════

def compute_nam(state):
    """Nam profili: tüm NPC anıları (son 104 hafta) + aktif söylentiler."""
    turn = state.get("turn", 0)
    nam = {t: 0 for t in NAM_TRAITS}
    for npc in state["world"]["npcs"]:
        for m in npc.get("anilar", []):
            if m.get("hedef") != "player" or turn - m.get("hafta", 0) > 104:
                continue
            trait = MEMORY_TYPES.get(m["tur"], {}).get("nam")
            if trait:
                nam[trait] += min(3, 1 + abs(int(m["duygu_yuku"])) // 12)
    # Söylentiler namı büyütür: dedikodu, gerçeğin megafonu
    for r in state.get("player_rumors", []):
        if r.get("nam"):
            nam[r["nam"]] += round(r.get("siddet", 1)) * 2
    return nam


def dominant_nam(nam):
    """Baskın nam: en az 8 puan ve ikinciden belirgin önde olmalı."""
    if not nam:
        return None
    sirali = sorted(nam.items(), key=lambda kv: kv[1], reverse=True)
    top, second = sirali[0], sirali[1]
    if top[1] >= 8 and top[1] >= second[1] * 1.3:
        return top[0]
    return None


def nam_effects(state):
    """Baskın namın somut etkileri — GDD birebir + iki yumuşak etki."""
    nam = compute_nam(state)
    dom = dominant_nam(nam)
    fx = {"profil": nam, "dominant": dom, "etkiler": []}
    if dom == "zalim":
        fx["korku_iskontosu"] = True
        fx["evlilik_ret"] = True
        fx["etkiler"] = ["İnsanlar senden çekiniyor — pazarlıkta korku iskontosu",
                         "İyi aileler evlilik teklifini reddediyor"]
    elif dom == "cömert":
        fx["kriz_halk_destegi"] = 0.8
        fx["pazarlik_sicaklik"] = True
        fx["etkiler"] = ["İsyan/kriz anında halk seni destekler",
                         "Esnaf seni güler yüzle karşılıyor"]
    elif dom == "çapkın":
        fx["flort_bonus"] = 0.08
        fx["evlilik_suphesi"] = 0.20
        fx["etkiler"] = ["Flörtte adın işini kolaylaştırıyor",
                         "Ciddi evlilik adayları sana şüpheyle bakıyor"]
    elif dom == "dindar":
        fx["dindar_bonus"] = True
        fx["etkiler"] = ["Rahipler ve dindar NPC'ler sana sıcak davranıyor"]
    elif dom == "mert":
        fx["bilgi_bonus"] = 0.10
        fx["etkiler"] = ["İnsanlar sana güveniyor — kişisel sorularda şansın artar"]
    return fx


# ═══════════════════════════════════════════════════════════════════════════
# SÖYLENTİ EYLEMLERİ — Yüzleş / Yay / Sustur (rüşvet)
# ═══════════════════════════════════════════════════════════════════════════

def rumor_action(state, rumor_id, eylem):
    rumors = state.get("player_rumors", [])
    r = next((x for x in rumors if x["id"] == rumor_id), None)
    if not r:
        return None, "Bu söylenti artık dolaşımda değil."
    player = state["player"]
    social = player.get("skills", {}).get("social", 0)
    charisma = player.get("stats", {}).get("charisma", 1)
    kaynak = next((n for n in state["world"]["npcs"]
                   if n["id"] == r.get("kaynak_id") and n.get("alive")), None)
    turn = state.get("turn", 0)

    if eylem == "yuzles":
        sans = max(0.15, min(0.85, 0.40 + social * 0.05 + charisma * 0.03
                             - r.get("siddet", 1) * 0.08))
        if random.random() < sans:
            rumors.remove(r)
            if kaynak:
                add_memory(kaynak, "soz_tutma", turn, detay="yüzleşmede dik durdu")
            player["reputation"] = player.get("reputation", 0) + 2
            return {"response": f"{r.get('kaynak_name','Kaynağın')} yüzüne karşı sözünü "
                                "yutmak zorunda kaldı. Söylenti söndü.",
                    "consequences": ["Söylenti söndü", "İtibar +2 (dik durdun)",
                                     "Nam: mert +"],
                    "sonuc": "sondu"}, None
        r["siddet"] = min(4, r.get("siddet", 1) + 1)
        if kaynak:
            add_memory(kaynak, "tehdit", turn, yuk=-8, detay="yüzleşme kötü bitti")
        return {"response": "Yüzleşme ters tepti — 'Bak, bir de üstüme geliyor!' "
                            "Söylenti alevlendi.",
                "consequences": ["⚠ Söylenti şiddetlendi", "Kaynakla ilişki bozuldu"],
                "sonuc": "alevlendi"}, None

    if eylem == "yay":
        if r.get("yon", -1) <= 0:
            return None, "Kendi aleyhindeki lafı yaymak akıl kârı değil."
        r["siddet"] = min(4, r.get("siddet", 1) + 1)
        player["reputation"] = player.get("reputation", 0) + 1
        return {"response": "Sözü sen de salladın: hamamdan çarşıya, çarşıdan hana. "
                            "Namın büyüyor.",
                "consequences": ["Söylenti güçlendi", "İtibar +1"],
                "sonuc": "buyudu"}, None

    if eylem == "sustur":
        cost = 15 * round(r.get("siddet", 1))
        if player.get("money", 0) < cost:
            return None, f"Susturmak için {cost} altın gerekli."
        player["money"] = round(player["money"] - cost, 1)
        if random.random() < 0.70:
            rumors.remove(r)
            return {"response": f"{cost} altın doğru ellere dağıldı. Konuşan diller "
                                "bir anda unutkanlaştı.",
                    "consequences": [f"-{cost} altın", "Söylenti susturuldu"],
                    "sonuc": "susturuldu"}, None
        rumors.append({
            "id": uuid.uuid4().hex[:12], "hafta": turn, "tur": "dolandiricilik",
            "nam": "zalim", "yon": -1, "siddet": 2,
            "text": f"{player.get('name','Biri')} ağızları rüşvetle kapatmaya çalışıyormuş. "
                    "Demek ki doğruymuş.",
            "kaynak_id": r.get("kaynak_id"), "kaynak_name": r.get("kaynak_name"),
            "loc_id": r.get("loc_id"),
        })
        return {"response": "Para el değiştirdi ama biri boş boğazlık etti: "
                            "'Rüşvet dağıtıyor!' İş büyüdü.",
                "consequences": [f"-{cost} altın", "⚠ Rüşvet söylentisi doğdu (zalim nam +)"],
                "sonuc": "geri_tepti"}, None

    return None, "Geçersiz eylem."
