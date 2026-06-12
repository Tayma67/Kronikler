"""Hikâye Yönetmeni + Nemesis + Sonuç Tohumları — GDD v7 S3 & S4 çekirdeği
(Adım 5 + Adım 6).

"Her hayat bir roman yapısında akar: kuruluş → kriz → doruk → çözülme."

L4D'nin AI Director'ı + Shadow of Mordor'un Nemesis'i, metin tabanlı yaşam
simülasyonuna uyarlanır. Haftalık tek geçiş, mevcut sistemlerin ÜZERİNE:

  GERİLİM    — kızgın hanedan + kötü nam + borç + nemesis + savaştan hesaplanır
  TEMPO      — Durgunluk Dedektörü (8 hafta sessizlik → kıvılcım kartı),
               Nefes Kuralı (doruktan sonra 3-5 hafta pozitif garanti),
               Doruk Üretimi (gerilim 80+ → TEK BÜYÜK EVENT)
  NEMESİS    — seni yenen/küçük düşüren NPC geri döner; ölürse kan davası
               çocuğuna geçer. Maks 2 aktif nemesis.
  PERDELER   — hayat romanın bölümleri: "Bölüm III: Karaoğlu'yla Savaş
               Yılları" (Chronicle 2.0 başlıkları)
  TOHUMLAR   — bugün ektiğin 10 yıl sonra kapını çalar; yönetmen büyük
               tohumları doruk anında patlatır; nesil aşabilir.
"""
import random

from world_gen import new_id


# Oyuncunun HİKÂYESİNE dokunan olaylar durgunluğu kırar; arka plan
# NPC doğum/ölümleri kırmaz (yoksa kalabalık dünyada yönetmen hiç konuşmaz).
ONEMLI_EVENT_TIPLERI = {
    "nesil_devri", "savaş_ilanı", "savaş_zaferi", "savaş_kaybı", "cinayet",
    "kaçırma", "sabotaj", "isyan", "doruk", "nemesis", "tohum", "kıvılcım",
    "hapis", "vefa", "evlilik_teklifi",
}


def _event_important(e):
    if e.get("type") in ONEMLI_EVENT_TIPLERI:
        return True
    # Kişisel kapsamlı büyük olaylar (oyuncunun düğünü, yakınının ölümü...)
    return e.get("scope") == "kişisel" and e.get("type") in (
        "ölüm", "doğum", "evlilik", "hanedan")


# ═══════════════════════════════════════════════════════════════════════════
# DURUM
# ═══════════════════════════════════════════════════════════════════════════

def ensure_director(state):
    y = state.get("yonetmen")
    if y is None:
        y = {
            "gerilim": 25,
            "son_doruk_haftasi": -999,
            "aktif_yay": "kurulus",
            "nemesis_ids": [],
            "kullanilan_kartlar": [],
            "son_onemli_hafta": state.get("turn", 0),
            "nefes_kalan": 0,
            "perdeler": [{"no": 1, "baslik": "Bölüm I: Küller Arasında",
                          "baslangic": state.get("turn", 0), "bitis": None}],
        }
        state["yonetmen"] = y
    state.setdefault("tohumlar", [])
    return y


def _push(state, etype, text, narrative=None, scope="kişisel"):
    try:
        from simulation import _push_event
        _push_event(state, state.get("turn", 0), etype, text,
                    narrative=narrative, scope=scope)
    except Exception:
        pass


def _npc(state, nid):
    return next((n for n in state["world"]["npcs"] if n["id"] == nid), None)


# ═══════════════════════════════════════════════════════════════════════════
# GERİLİM — bağlamdan hesaplanır, yumuşak sürüklenir
# ═══════════════════════════════════════════════════════════════════════════

def _tension_target(state):
    player = state["player"]
    t = 20
    # Kızgın hanedanlar
    kizgin = sum(1 for d in state["world"].get("dynasties", [])
                 if not d.get("sonmus") and d.get("oyuncuya_tutum", 0) <= -30)
    t += min(24, kizgin * 12)
    # Müttefik hanedan rahatlatır
    if state.get("allied_dynasties"):
        t -= 8
    # Nam
    try:
        from npc_mind import compute_nam, dominant_nam
        dom = dominant_nam(compute_nam(state))
        if dom == "zalim":
            t += 10
        elif dom in ("cömert", "mert"):
            t -= 5
    except Exception:
        pass
    # Hakkındaki kötü söylentiler
    kotu = sum(1 for r in state.get("player_rumors", []) if r.get("yon", -1) < 0)
    t += min(12, kotu * 4)
    # Sefalet & sağlık
    if player.get("money", 0) < 25:
        t += 10
    if player.get("health", 100) < 40:
        t += 10
    # Nemesis
    y = state.get("yonetmen", {})
    t += 12 * len(y.get("nemesis_ids", []))
    # Dünya savaşta mı
    if state["world"].get("wars"):
        t += 8
    return max(0, min(100, t))


def _update_tension(state, y):
    hedef = _tension_target(state)
    fark = hedef - y["gerilim"]
    y["gerilim"] = max(0, min(100, y["gerilim"] + max(-8, min(8, round(fark * 0.35)))))


# ═══════════════════════════════════════════════════════════════════════════
# TOHUMLAR (S4) — ek, filizlenme, nesil aşma
# ═══════════════════════════════════════════════════════════════════════════

def sow_seed(state, kaynak, text, hafta_min, hafta_max, agirlik="orta",
             nesil_asabilir=False, kosul=None, etki=None, npc_id=None):
    """Tohum ek. text: filizlenme anlatısı ({p}=oyuncu adı yer tutucusu).
    etki: {"money": +x, "reputation": +y} gibi basit delta sözlüğü.
    kosul: {"itibar_min": 50} / {"para_min": 100} — sağlanana dek bekler."""
    ensure_director(state)
    tohum = {
        "id": f"{kaynak}_{new_id()[:6]}",
        "kaynak": kaynak,
        "ekim_haftasi": state.get("turn", 0),
        "hafta_min": int(hafta_min),
        "hafta_max": int(hafta_max),
        "kosul": kosul,
        "text": text,
        "agirlik": agirlik,            # kucuk | orta | buyuk
        "nesil_asabilir": bool(nesil_asabilir),
        "npc_id": npc_id,
    }
    state["tohumlar"].append(tohum)
    if len(state["tohumlar"]) > 30:
        state["tohumlar"] = state["tohumlar"][-30:]
    if etki:
        tohum["etki"] = etki
    return tohum


def _kosul_ok(state, kosul):
    if not kosul:
        return True
    p = state["player"]
    if "itibar_min" in kosul and p.get("reputation", 0) < kosul["itibar_min"]:
        return False
    if "para_min" in kosul and p.get("money", 0) < kosul["para_min"]:
        return False
    return True


def _germinate(state, tohum):
    state["tohumlar"].remove(tohum)
    p = state["player"]
    text = tohum["text"].replace("{p}", p.get("name", "sen"))
    # NPC'ye bağlı tohumsa ve NPC öldüyse anlatı yumuşar
    npc = _npc(state, tohum.get("npc_id")) if tohum.get("npc_id") else None
    if tohum.get("npc_id") and (not npc or not npc.get("alive")):
        text += " (O artık yaşamıyor; haber vasiyetiyle geldi.)"
    for k, v in (tohum.get("etki") or {}).items():
        if k == "money":
            p["money"] = round(p.get("money", 0) + v, 1)
        elif k == "reputation":
            p["reputation"] = p.get("reputation", 0) + v
        elif k == "health":
            p["health"] = max(1, min(100, p.get("health", 100) + v))
    _push(state, "tohum", f"🌰 Geçmiş kapını çaldı: {text}", narrative=text)
    return text


def _seed_tick(state, y, doruk_aninda=False):
    """Haftada en fazla 1 filizlenme. Büyük tohumlar doruğu bekler."""
    turn = state.get("turn", 0)
    adaylar = []
    for t in list(state["tohumlar"]):
        yas = turn - t["ekim_haftasi"]
        if yas >= t["hafta_max"]:
            adaylar.append((t, True))          # vadesi doldu — zorla
        elif yas >= t["hafta_min"] and _kosul_ok(state, t.get("kosul")):
            if t["agirlik"] == "buyuk":
                if doruk_aninda:
                    adaylar.append((t, True))  # yönetmen doruğa saklamıştı
            elif random.random() < 0.05:
                adaylar.append((t, False))
    if not adaylar:
        return None
    # Zorlananlar önce; sonra en eski
    adaylar.sort(key=lambda x: (not x[1], x[0]["ekim_haftasi"]))
    tohum = adaylar[0][0]
    y["son_onemli_hafta"] = turn
    return _germinate(state, tohum)


def inherit_seeds(state):
    """Nesil devrinde: sadece nesil aşabilen tohumlar kalır.
    'Babanın tohumu, oğlu biçer.'"""
    ensure_director(state)
    state["tohumlar"] = [t for t in state["tohumlar"] if t.get("nesil_asabilir")]
    y = state["yonetmen"]
    y["gerilim"] = 30
    y["nefes_kalan"] = 0
    _open_act(state, y, "Yeni Nesil: Miras ve Hesaplar")


# ═══════════════════════════════════════════════════════════════════════════
# NEMESİS — "Yüzündeki yara izini tanıdın."
# ═══════════════════════════════════════════════════════════════════════════

def mark_nemesis_candidate(state, npc):
    """Oyuncuyu yenen / küçük düşüren NPC aday olur (do_attack vb. çağırır)."""
    npc["nemesis_candidate"] = True


def _nemesis_tick(state, y):
    turn = state.get("turn", 0)
    # Ölen nemesis → kan davası nesle geçer
    for nid in list(y["nemesis_ids"]):
        npc = _npc(state, nid)
        if npc and npc.get("alive"):
            continue
        y["nemesis_ids"].remove(nid)
        cocuklar = [c for c in (npc.get("children_ids", []) if npc else [])
                    if (_npc(state, c) or {}).get("alive")]
        if cocuklar:
            varis = _npc(state, cocuklar[0])
            varis["nemesis_candidate"] = True
            varis["revenge_pending"] = True
            try:
                from npc_mind import add_memory
                add_memory(varis, "yakinima_zarar", turn,
                           detay="kan davası — ebeveyninin düşmanı")
            except Exception:
                pass
            _push(state, "nemesis",
                  f"⚔ {npc['name']} öldü ama defteri kapanmadı: kan davası "
                  f"{varis['name']}'e geçti.")
    # Aday terfisi (maks 2 aktif)
    if len(y["nemesis_ids"]) < 2:
        try:
            from npc_mind import effective_rel
        except Exception:
            effective_rel = lambda s, n: s.get("relationships", {}).get(n["id"], 0)
        adaylar = [n for n in state["world"]["npcs"]
                   if n.get("alive") and n["id"] not in y["nemesis_ids"]
                   and (n.get("nemesis_candidate") or n.get("revenge_pending"))
                   and effective_rel(state, n) <= -25]
        if adaylar and random.random() < 0.25:
            sec = random.choice(adaylar)
            y["nemesis_ids"].append(sec["id"])
            sec["nemesis_since"] = turn
            _push(state, "nemesis",
                  f"🗡 {sec['name']} seni unutmadı. Adını anan biri varmış — "
                  "iyi şeyler söylemiyormuş.")
    # Haftalık dönüş sahnesi
    for nid in y["nemesis_ids"]:
        npc = _npc(state, nid)
        if not npc or random.random() > 0.06:
            continue
        player = state["player"]
        sahneler = [
            (f"Yüzündeki ifadeyi tanıdın — {npc['name']}. Yıllar geçmiş, "
             f"ama o bakış aynı. Artık {npc.get('profession','başka biri')} "
             "olmuş; ve seni gördü.", None),
            (f"{npc['name']}'in adamları çarşıda seni sordu. İsmini "
             "söylemeden gitmişler.", None),
            (f"Kesende bir hafiflik: {npc['name']}'in işi olduğuna yemin "
             "edebilirsin.", "para"),
        ]
        text, tip = random.choice(sahneler)
        if tip == "para" and player.get("money", 0) > 20:
            kayip = random.randint(5, 15)
            player["money"] = round(player["money"] - kayip, 1)
            text += f" (-{kayip} altın)"
        _push(state, "nemesis", f"🗡 {text}", narrative=text)
        y["gerilim"] = min(100, y["gerilim"] + 6)
        y["son_onemli_hafta"] = turn
        break


def _nemesis_showdown(state, y):
    """Doruk: nemesis ile hesaplaşma sahnesi."""
    nid = y["nemesis_ids"][0]
    npc = _npc(state, nid)
    if not npc:
        return False
    player = state["player"]
    kazandin = random.random() < (0.45 + player.get("skills", {}).get("combat", 0) * 0.04)
    if kazandin:
        y["nemesis_ids"].remove(nid)
        npc["nemesis_candidate"] = False
        npc["revenge_pending"] = False
        text = (f"⚔ HESAPLAŞMA: {npc['name']} karşına dikildi — yıllardır "
                "beklediği an. Ama bu sefer sen hazırdın. Herkesin önünde "
                "geri adım attı. Bu defter kapandı.")
        player["reputation"] = player.get("reputation", 0) + 5
    else:
        kayip = min(player.get("money", 0) * 0.15, 80)
        player["money"] = round(player.get("money", 0) - kayip, 1)
        player["health"] = max(10, player.get("health", 100) - 15)
        text = (f"⚔ HESAPLAŞMA: {npc['name']} seni köşeye sıkıştırdı. "
                f"Bu raundu o aldı: -{round(kayip)} altın, yara bere. "
                "Ama hesap hâlâ açık.")
    _push(state, "doruk", text, narrative=text)
    return True


# ═══════════════════════════════════════════════════════════════════════════
# KIVILCIM KARTLARI — durgunluk dedektörü çekince
# ═══════════════════════════════════════════════════════════════════════════

def _spark_cards(state, y):
    """Bağlama uygun kıvılcım kartları (id, uygulanabilir mi, exec)."""
    player = state["player"]
    turn = state.get("turn", 0)
    cards = []

    def push_card(cid, ok, fn):
        if ok and cid not in y["kullanilan_kartlar"][-6:]:
            cards.append((cid, fn))

    # Eski dost — sıra arkadaşı / yardım ettiğin biri çıkagelir
    dost = next((n for n in state["world"]["npcs"] if n.get("alive")
                 and any(m["tur"] in ("sira_arkadasi", "yardim", "borc_kurtarma")
                         for m in n.get("anilar", []))), None)
    def _eski_dost():
        text = (f"{dost['name']} kapında: 'Seni unutmadım.' Eski günler "
                "konuşuldu; ayrılırken eline bir kese tutuşturdu.")
        player["money"] = round(player.get("money", 0) + random.randint(10, 25), 1)
        _push(state, "kıvılcım", f"✨ {text}", narrative=text)
    push_card("eski_dost", dost is not None, _eski_dost)

    # Gizemli yabancı — tohum eker
    def _yabanci():
        text = ("Handa bir yabancı sana uzun uzun baktı, sonra masana mühürlü "
                "bir madalyon bıraktı: 'Vakti gelince anlarsın.'")
        _push(state, "kıvılcım", f"✨ {text}", narrative=text)
        sow_seed(state, "gizemli_yabanci",
                 "O madalyonun sahibi seni buldu: meğer bir hanedanın kayıp "
                 "vârisini arıyormuş — ve iz sendeymiş. Teşekkür kesesi ağır.",
                 hafta_min=52, hafta_max=208, agirlik="buyuk",
                 nesil_asabilir=True, etki={"money": 120, "reputation": 6})
    push_card("gizemli_yabanci", True, _yabanci)

    # Yaralı yolcu — iyilik tohumu
    def _yolcu():
        text = ("Yol kenarında yaralı bir yolcu buldun; yarasını sardın, "
                "suyunu paylaştın. Adını bile sormadı, ama yüzünü unutmadı.")
        _push(state, "kıvılcım", f"✨ {text}", narrative=text)
        sow_seed(state, "yarali_yolcu",
                 "Yıllar önce yarasını sardığın yolcu bir kervan ağası çıktı. "
                 "Seni buldu: 'Borcum var' — yanında çalışma teklifi ve hediye.",
                 hafta_min=156, hafta_max=312, agirlik="orta",
                 nesil_asabilir=False, etki={"money": 60, "reputation": 4})
    push_card("yarali_yolcu", True, _yolcu)

    # Kayıp kese — bulunan para geri döner
    def _kese():
        bulunan = random.randint(12, 30)
        player["money"] = round(player.get("money", 0) + bulunan, 1)
        text = (f"Pazar yerinde düşmüş bir kese buldun: {bulunan} altın. "
                "Etrafta kimse yoktu... ya da sen öyle sandın.")
        _push(state, "kıvılcım", f"✨ {text}", narrative=text)
        sow_seed(state, "kayip_kese",
                 "Kesenin sahibi yıllar sonra karşına çıktı — o gün seni "
                 "gören bir çift göz varmış. Hesap soruldu.",
                 hafta_min=26, hafta_max=104, agirlik="kucuk",
                 etki={"money": -20, "reputation": -3})
    push_card("kayip_kese", True, _kese)

    # Hanedan elçisi — en sıcak hanedan jest yapar
    ds = [d for d in state["world"].get("dynasties", [])
          if not d.get("sonmus") and d.get("oyuncuya_tutum", 0) > 15]
    def _elci():
        d = max(ds, key=lambda x: x["oyuncuya_tutum"])
        player["money"] = round(player.get("money", 0) + 15, 1)
        d["oyuncuya_tutum"] = min(100, d["oyuncuya_tutum"] + 3)
        text = (f"{d['sembol']} {d['ad']} hanedanından bir elçi küçük bir "
                "armağan bıraktı: 'Reisimiz seni hatırlıyor.'")
        _push(state, "kıvılcım", f"✨ {text}", narrative=text)
    push_card("hanedan_elcisi", bool(ds), _elci)

    # Nemesis izi — gerilim tırmandırır
    def _iz():
        npc = _npc(state, y["nemesis_ids"][0])
        text = (f"Bir çocuk sana katlanmış bir not getirdi. İçinde tek satır: "
                f"'Unutmadım.' İmza yok — ama {npc['name'] if npc else 'o'} "
                "olduğunu biliyorsun.")
        _push(state, "kıvılcım", f"🗡 {text}", narrative=text)
        y["gerilim"] = min(100, y["gerilim"] + 8)
    push_card("nemesis_izi", bool(y["nemesis_ids"]), _iz)

    # Fırtına — doku için negatif kıvılcım (nefes dışında)
    props = state.get("properties", [])
    def _firtina():
        if props:
            p = random.choice(props)
            p["condition"] = max(5, p.get("condition", 100) - 8)
            text = f"Gece fırtınası {p['name']}'i hırpaladı (kondisyon -8)."
        else:
            kayip = min(player.get("money", 0), 8)
            player["money"] = round(player.get("money", 0) - kayip, 1)
            text = f"Fırtına çatını uçurdu; onarım {round(kayip)} altına patladı."
        _push(state, "kıvılcım", f"🌩 {text}", narrative=text)
    push_card("firtina", y["nefes_kalan"] == 0 and y["gerilim"] < 45, _firtina)

    return cards


def _draw_spark(state, y):
    cards = _spark_cards(state, y)
    if not cards:
        return
    cid, fn = random.choice(cards)
    fn()
    y["kullanilan_kartlar"].append(cid)
    y["kullanilan_kartlar"] = y["kullanilan_kartlar"][-12:]
    y["son_onemli_hafta"] = state.get("turn", 0)


# ═══════════════════════════════════════════════════════════════════════════
# DORUK — gerilim 80'i aşınca TEK BÜYÜK EVENT
# ═══════════════════════════════════════════════════════════════════════════

def _climax(state, y):
    turn = state.get("turn", 0)
    yapildi = False
    # Öncelik 1: nemesis hesaplaşması
    if y["nemesis_ids"]:
        yapildi = _nemesis_showdown(state, y)
    # Öncelik 2: bekleyen büyük tohum
    if not yapildi:
        yapildi = _seed_tick(state, y, doruk_aninda=True) is not None
    # Öncelik 3: en kızgın hanedanın büyük hamlesi
    if not yapildi:
        dusman = next((d for d in state["world"].get("dynasties", [])
                       if not d.get("sonmus") and d.get("oyuncuya_tutum", 0) <= -40), None)
        if dusman:
            player = state["player"]
            props = state.get("properties", [])
            if props:
                p = random.choice(props)
                p["condition"] = max(5, p.get("condition", 100) - 35)
                zarar = f"{p['name']} gece basıldı — enkaz gibi (kondisyon -35)"
            else:
                kayip = min(player.get("money", 0) * 0.2, 100)
                player["money"] = round(player.get("money", 0) - kayip, 1)
                zarar = f"adamları seni ıssızda sıkıştırdı (-{round(kayip)} altın)"
            text = (f"⚔ {dusman['sembol']} {dusman['ad']} maskesini attı: {zarar}. "
                    "Bu artık açık bir savaş.")
            _push(state, "doruk", text, narrative=text)
            yapildi = True
    # Son çare: isyan gölgesi
    if not yapildi:
        loc = next((l for l in state["world"]["locations"]
                    if l["id"] == state["player"].get("location_id")), None)
        if loc is not None:
            loc["security"] = max(5, loc.get("security", 50) - 15)
            text = (f"🔥 {loc['name']} kaynıyor: vergi isyanı sokağa taştı, "
                    "dükkânlar kepenk indirdi. Güvenlik çöktü.")
            _push(state, "doruk", text, narrative=text)
            yapildi = True
    if yapildi:
        y["son_doruk_haftasi"] = turn
        y["son_onemli_hafta"] = turn
        y["gerilim"] = max(20, y["gerilim"] - 45)
        y["nefes_kalan"] = random.randint(3, 5)
        _set_act(state, y, "cozulme")
    return yapildi


def _breath_tick(state, y):
    """Nefes Kuralı: doruktan sonra 3-5 hafta pozitif garanti."""
    if y["nefes_kalan"] <= 0:
        return
    y["nefes_kalan"] -= 1
    if random.random() < 0.55:
        player = state["player"]
        secenek = [
            "Komşular kapına sıcak ekmek bıraktı. Küçük şey — ama iyi geldi.",
            "Bu hafta işler yolunda gitti; akşamları erken ve huzurlu bitti.",
            "Çocuklar sokakta adını bir oyuna kattı. Gülümsedin.",
            "Pazarda bir yabancı borcunu senin yerine ödedi: 'İyiliğin dolaşır.'",
        ]
        text = random.choice(secenek)
        if "borcunu" in text:
            player["money"] = round(player.get("money", 0) + 8, 1)
        _push(state, "nefes", f"🌤 {text}", narrative=text)


# ═══════════════════════════════════════════════════════════════════════════
# PERDELER — Chronicle 2.0 bölüm başlıkları
# ═══════════════════════════════════════════════════════════════════════════

_ROMA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
         "XI", "XII", "XIII", "XIV", "XV"]


def _act_title(state, y, yay):
    if yay == "kriz":
        dusman = next((d for d in state["world"].get("dynasties", [])
                       if not d.get("sonmus") and d.get("oyuncuya_tutum", 0) <= -40), None)
        if y["nemesis_ids"]:
            npc = _npc(state, y["nemesis_ids"][0])
            if npc:
                return f"{npc['name'].split()[0]}'in Gölgesi"
        if dusman:
            return f"{dusman['ad']}'yla Savaş Yılları"
        try:
            from npc_mind import compute_nam, dominant_nam
            if dominant_nam(compute_nam(state)) == "zalim":
                return "Kara Nam Günleri"
        except Exception:
            pass
        return "Fırtına Bulutları"
    if yay == "cozulme":
        return "Yaraların Sarılması"
    if yay == "yukselis":
        return "Yükseliş Yılları"
    if yay == "durgun":
        return "Sakin Yıllar"
    return "Küller Arasında"


def _open_act(state, y, baslik):
    turn = state.get("turn", 0)
    perdeler = y["perdeler"]
    if perdeler:
        son = perdeler[-1]
        if son["baslangic"] >= turn - 4 and son["bitis"] is None:
            son["baslik"] = f"Bölüm {_ROMA[min(son['no']-1, 14)]}: {baslik}"
            return                      # çok taze perdeyi yeniden adlandır
        son["bitis"] = turn
    no = (perdeler[-1]["no"] + 1) if perdeler else 1
    perdeler.append({"no": no,
                     "baslik": f"Bölüm {_ROMA[min(no-1, 14)]}: {baslik}",
                     "baslangic": turn, "bitis": None})
    y["perdeler"] = perdeler[-20:]


def _set_act(state, y, yay):
    if y["aktif_yay"] == yay:
        return
    y["aktif_yay"] = yay
    _open_act(state, y, _act_title(state, y, yay))


# ═══════════════════════════════════════════════════════════════════════════
# DRAMATURJİK SEÇİM — life event havuzunu yönetmen süzer
# ═══════════════════════════════════════════════════════════════════════════

def _event_tone(ev):
    """Bir life event'in tonunu kaba sınıfla: gergin | yumusak | notr."""
    neg = pos = 0
    for c in ev.get("choices", []):
        for k, v in (c.get("effects") or {}).items():
            if k in ("health",) and isinstance(v, (int, float)) and v < 0:
                neg += 1
            elif k in ("crime", "fear") and isinstance(v, (int, float)) and v > 0:
                neg += 1
            elif k in ("money", "reputation", "fame") and isinstance(v, (int, float)):
                pos += 1 if v > 0 else 0
                neg += 1 if v < -30 else 0
    if neg >= 3:
        return "gergin"
    if neg == 0 and pos >= 2:
        return "yumusak"
    return "notr"


def director_event_bias(state, eligible):
    """maybe_trigger_life_event çağırır: yönetmen havuzu daraltır.
    Nefes haftalarında gergin eventler elenir; kriz yayında öne çıkar."""
    y = state.get("yonetmen")
    if not y or not eligible:
        return eligible
    if y.get("nefes_kalan", 0) > 0:
        sakin = [e for e in eligible if _event_tone(e) != "gergin"]
        return sakin or eligible
    if y.get("aktif_yay") == "kriz" or y.get("gerilim", 0) >= 60:
        gergin = [e for e in eligible if _event_tone(e) == "gergin"]
        if gergin and random.random() < 0.6:
            return gergin
    return eligible


# ═══════════════════════════════════════════════════════════════════════════
# ANA TİCK — simulation.advance_time haftada bir çağırır
# ═══════════════════════════════════════════════════════════════════════════

def director_tick(state, day):
    y = ensure_director(state)
    turn = state.get("turn", 0)

    # Bu hafta oyuncunun hikâyesine dokunan olay oldu mu?
    for e in reversed(state.get("history", [])[-12:]):
        if e.get("day") != turn:
            break
        if _event_important(e):
            y["son_onemli_hafta"] = turn
            break

    _update_tension(state, y)
    _nemesis_tick(state, y)

    # Nefes: pozitif garanti penceresi (doruk ve kıvılcım bastırılır)
    if y["nefes_kalan"] > 0:
        _breath_tick(state, y)
        _seed_tick(state, y)
        _update_acts(state, y, turn)
        return

    # Doruk Üretimi
    if (y["gerilim"] >= 80 and turn - y["son_doruk_haftasi"] >= 26):
        if _climax(state, y):
            return

    # Tohum filizlenmesi (küçük/orta)
    _seed_tick(state, y)

    # Durgunluk Dedektörü: 8+ hafta önemli olay yoksa kıvılcım çek
    if turn - y["son_onemli_hafta"] >= 8:
        _draw_spark(state, y)

    _update_acts(state, y, turn)


def _update_acts(state, y, turn):
    yay = y["aktif_yay"]
    perde_yasi = turn - (y["perdeler"][-1]["baslangic"] if y["perdeler"] else 0)
    if yay == "kurulus" and turn >= 26:
        _set_act(state, y, "yukselis")
    elif yay in ("yukselis", "durgun") and y["gerilim"] >= 60:
        _set_act(state, y, "kriz")
    elif yay == "cozulme" and y["nefes_kalan"] <= 0:
        _set_act(state, y, "kriz" if y["gerilim"] >= 60 else "yukselis")
    # Sakin geçişler bir perdeyi en az 20 hafta yaşatır — roman, takvim değil
    elif yay == "yukselis" and y["gerilim"] < 35 \
            and turn - y["son_onemli_hafta"] >= 16 and perde_yasi >= 20:
        _set_act(state, y, "durgun")
    elif yay == "durgun" and turn - y["son_onemli_hafta"] < 4 \
            and perde_yasi >= 20:
        _set_act(state, y, "yukselis")


# ═══════════════════════════════════════════════════════════════════════════
# S4 RETROAKTİF — mevcut life-event seçimleri tohum eker (GDD tablosu)
# (event_id, choice_index) → tohum tarifi. apply_life_event_choice çağırır.
# ═══════════════════════════════════════════════════════════════════════════

LIFE_EVENT_SEEDS = {
    # Bulunan parayı kestir → sahibi o gün seni görmüş (GDD örneği)
    ("event_found_money", 0): dict(
        kaynak="bulunan_para", hafta_min=104, hafta_max=520, agirlik="kucuk",
        text="Çocukken çamurdan aldığın o keseyi biri görmüştü. Yıllar sonra "
             "karşına dikildi: 'O para babamındı.' Çarşı dinliyordu.",
        etki={"money": -20, "reputation": -4}),
    # Parayı teslim et → muhtarlık unutmaz
    ("event_found_money", 1): dict(
        kaynak="durust_cocuk", hafta_min=156, hafta_max=520, agirlik="kucuk",
        text="Muhtar ölmeden önce seni anlatmış: 'O çocuk para teslim "
             "etmişti, ona güvenin.' Bu söz kapıları açıyor.",
        etki={"reputation": 6}),
    # Yaralı hayvana yardım → sahibi iş önerir, 3-6 yıl (GDD örneği)
    ("event_stray_animal", 0): dict(
        kaynak="yarali_hayvan", hafta_min=156, hafta_max=312, agirlik="orta",
        text="O köpek yavrusunu hatırlıyor musun? Meğer kervan ağasının "
             "kayıp tazısıymış. Sahibi seni buldu: minnetin karşılığı ağır "
             "bir kese ve dostluk.",
        etki={"money": 70, "reputation": 4}),
    ("event_stray_animal", 1): dict(
        kaynak="yarali_hayvan", hafta_min=156, hafta_max=312, agirlik="orta",
        text="Şifacıya taşıdığın o yavrunun sahibi yıllar sonra kapını "
             "çaldı — unutmamış. 'Borçluyum' dedi ve sözünü tuttu.",
        etki={"money": 50, "reputation": 3}),
    # Okul kavgasında zayıfı savun → lonca başı oldu, borçlu (GDD örneği)
    ("event_schoolfight", 1): dict(
        kaynak="zayifi_savundu", hafta_min=520, hafta_max=1040,
        agirlik="buyuk", nesil_asabilir=True,
        text="O gün okulda savunduğun çelimsiz çocuk bugün lonca başı. "
             "Seni görünce ayağa kalktı: 'Bu adam benim için yumruk yedi.' "
             "Artık loncada sözün geçiyor.",
        etki={"money": 100, "reputation": 8}),
    # Güçlünün yanını tut → zayıf geri döndü, affetmedi (GDD örneği)
    ("event_schoolfight", 0): dict(
        kaynak="guclunun_yani", hafta_min=520, hafta_max=1040,
        agirlik="buyuk", nesil_asabilir=True,
        text="Okulda ezilmesine seyirci kalıp güçlünün yanında durduğun "
             "çocuk geri döndü — ve affetmedi. Şimdi sözü geçen biri; "
             "kapılar yüzüne kapanıyor.",
        etki={"reputation": -8}),
    # Yangında donakal → kurban yükseldi, hatırlıyor (GDD örneği)
    ("event_village_fire", 2): dict(
        kaynak="yangin_sustun", hafta_min=260, hafta_max=624,
        agirlik="buyuk", nesil_asabilir=True,
        text="Ahırı yanarken izlediğin komşu bugün şehirde sözü geçen bir "
             "adam. Seni tanıdı: 'Sen o gece duran çocuksun.' Bakışı buz "
             "gibiydi.",
        etki={"reputation": -6}),
    # Yangında kova taşı → köy unutmaz
    ("event_village_fire", 0): dict(
        kaynak="yangin_kahramani", hafta_min=156, hafta_max=520,
        agirlik="orta",
        text="O yangın gecesini köy hâlâ anlatıyor — ve hikâyede sen "
             "varsın. Yaşlılar çocuklarına seni örnek gösteriyor.",
        etki={"reputation": 6}),
    # Hasatta yaşlıyı geç → ailesi soğudu
    ("event_harvest_help", 2): dict(
        kaynak="hasat_gecti", hafta_min=104, hafta_max=416, agirlik="kucuk",
        text="O kış zorlanan yaşlı çiftçinin oğlu büyüdü ve değirmeni "
             "devraldı. Babasını yalnız bırakanları tek tek biliyor.",
        etki={"reputation": -3}),
    # Hasatta yardım → vefa
    ("event_harvest_help", 0): dict(
        kaynak="hasat_vefa", hafta_min=156, hafta_max=520, agirlik="orta",
        text="Hasadına koştuğun yaşlı adam vasiyetinde seni anmış: 'Ellerine "
             "sağlık' diye bir kese bırakmış.",
        etki={"money": 45, "reputation": 3}),
}


def sow_from_life_event(state, event_id, choice_index):
    """Life event seçimi tohum tarifine denk geliyorsa ek. Sessiz — oyuncu
    bilmez; en güçlü an 'BUNU HATIRLIYORLAR MIYDI?' anıdır."""
    spec = LIFE_EVENT_SEEDS.get((event_id, choice_index))
    if not spec:
        return None
    return sow_seed(state, **spec)


# ═══════════════════════════════════════════════════════════════════════════
# ROMANIN SON SAYFASI — ölüm sahnesi / nesil devri özeti (Chronicle 2.0)
# ═══════════════════════════════════════════════════════════════════════════

def final_page(state):
    """Hayat romanın kapanış sayfası: perdeler + nam + nemesis + hanedanlar.
    begin_inheritance, eski oyuncu için bunu üretip mirasa iliştirir."""
    y = ensure_director(state)
    player = state["player"]
    turn = state.get("turn", 0)
    isim = player.get("name", "Bir yolcu")
    yas = player.get("age", "?")

    satirlar = []
    satirlar.append(f"{isim}, {yas} yaşında bu dünyadan göçtü. "
                    f"Hikâyesi {len(y['perdeler'])} perde sürdü.")

    # Nam — nasıl hatırlanacak
    epitaf = "Sessizce yaşadı, sessizce gitti."
    try:
        from npc_mind import compute_nam, dominant_nam
        dom = dominant_nam(compute_nam(state))
        epitaflar = {
            "cömert": "Sofrası açıktı; ardından dua edenler çok.",
            "zalim": "Adı anıldığında hâlâ ürperenler var.",
            "çapkın": "Gönlü geniş, sözü tatlıydı — fazlasıyla.",
            "dindar": "Yüzü hep kıbleye dönüktü; öyle de gömüldü.",
            "mert": "Sözünün eriydi. Bu az şey değildir.",
        }
        if dom:
            epitaf = epitaflar.get(dom, epitaf)
            satirlar.append(f"Halk onu '{dom}' diye bildi.")
    except Exception:
        dom = None

    # Hanedan cephesi
    dost = [d for d in state["world"].get("dynasties", [])
            if not d.get("sonmus") and d.get("oyuncuya_tutum", 0) >= 30]
    dusman = [d for d in state["world"].get("dynasties", [])
              if not d.get("sonmus") and d.get("oyuncuya_tutum", 0) <= -30]
    if dost:
        satirlar.append("Cenazesinde " + ", ".join(
            f"{d['sembol']} {d['ad']}" for d in dost[:2]) + " hanedanı saf tuttu.")
    if dusman:
        satirlar.append(", ".join(f"{d['sembol']} {d['ad']}" for d in dusman[:2])
                        + " hanedanı ise sadece öldüğünden emin olmaya geldi.")

    # Nemesis — kapanmamış defter
    for nid in y.get("nemesis_ids", []):
        npc = _npc(state, nid)
        if npc and npc.get("alive"):
            satirlar.append(f"{npc['name']} ile defteri kapanmadı — "
                            "bu hesap mirasla birlikte geçer.")

    # Toprağın altındakiler
    kalan = [t for t in state.get("tohumlar", []) if t.get("nesil_asabilir")]
    if kalan:
        satirlar.append(f"Ve toprağın altında {len(kalan)} tohum hâlâ "
                        "bekliyor: babanın ektiğini oğul biçecek.")

    # Son perdeyi kapat
    if y["perdeler"] and y["perdeler"][-1]["bitis"] is None:
        y["perdeler"][-1]["bitis"] = turn

    return {
        "baslik": f"{isim}'in Hikâyesi — Son Sayfa",
        "satirlar": satirlar,
        "epitaf": epitaf,
        "perdeler": list(y["perdeler"]),
        "nam": dom,
        "yas": yas,
        "perde_sayisi": len(y["perdeler"]),
    }


# ═══════════════════════════════════════════════════════════════════════════
# YÜZEY — GET /game/yonetmen
# ═══════════════════════════════════════════════════════════════════════════

def director_view(state):
    y = ensure_director(state)
    nemesisler = []
    for nid in y["nemesis_ids"]:
        npc = _npc(state, nid)
        if npc:
            nemesisler.append({"id": nid, "name": npc["name"],
                               "since": npc.get("nemesis_since"),
                               "alive": npc.get("alive", False)})
    yay_label = {"kurulus": "Kuruluş", "yukselis": "Yükseliş", "kriz": "Kriz",
                 "doruk": "Doruk", "cozulme": "Çözülme", "durgun": "Durgunluk"}
    return {
        "gerilim": y["gerilim"],
        "aktif_yay": y["aktif_yay"],
        "yay_label": yay_label.get(y["aktif_yay"], y["aktif_yay"]),
        "nefes_kalan": y["nefes_kalan"],
        "perdeler": y["perdeler"],
        "nemesisler": nemesisler,
        "bekleyen_tohum": len(state.get("tohumlar", [])),
        "turn": state.get("turn", 0),
    }
