"""Çalışma Reworku — GDD v7 R2.

Üç Katman Kuralı'nı 'work' eylemine uygular:
  ÖNCE (Çalışma Tarzı): Garantici / Normal / Hırslı / Kaytarıcı —
    görünür risk/ödül farkıyla 4 seçenek.
  SIRADA (Meslek Mini-Olayı, %30): mesleğe özel havuzdan seçimli sahne;
    her seçim push_personal_memory üretir → S2 NPC Zihni'ne bağlanır.
  SONRA (Ustalık): mevcut add_job_xp / kariyer sistemi (game_routes'ta).

Veri > kod: tarzlar ve olay havuzları dict.
"""
import random


# ── 2.1 Çalışma Tarzı ─────────────────────────────────────────────────────
WORK_STYLES = {
    "garantici": {
        "label": "Garantici", "icon": "🛡️",
        "income_mult": 0.8, "fail_chance": 0.0,
        "desc": "Az ama garanti. Risk yok.",
        "risk": None,
    },
    "normal": {
        "label": "Normal", "icon": "⚒️",
        "income_mult": 1.0, "fail_chance": 0.0,
        "desc": "Dengeli tempo.",
        "risk": None,
    },
    "hirsli": {
        "label": "Hırslı", "icon": "🔥",
        "income_mult": 1.4, "fail_chance": 0.15,
        "desc": "Daha çok kazan; başarısızlıkta gelir düşer + yorgunluk.",
        "risk": "%15 başarısızlık · sağlık ↓",
    },
    "kaytarici": {
        "label": "Kaytarıcı", "icon": "😴",
        "income_mult": 0.4, "fail_chance": 0.20,
        "desc": "Az çalış; yakalanırsan itibar düşer ama sağlık korunur.",
        "risk": "%20 yakalanma · itibar ↓",
    },
}

DEFAULT_STYLE = "normal"


def work_styles_payload():
    return [
        {"id": k, "label": v["label"], "icon": v["icon"],
         "desc": v["desc"], "risk": v["risk"], "income_mult": v["income_mult"]}
        for k, v in WORK_STYLES.items()
    ]


def apply_work_style(state, base_income, style_id):
    """Tarz çarpanını + riskini uygula. Döndürür (income, note, dict_extra)."""
    style = WORK_STYLES.get(style_id) or WORK_STYLES[DEFAULT_STYLE]
    player = state["player"]
    income = base_income * style["income_mult"]
    note = None
    extra = {}

    if style["fail_chance"] and random.random() < style["fail_chance"]:
        if style_id == "hirsli":
            income *= 0.3
            player["health"] = max(10, player.get("health", 100) - random.randint(4, 9))
            note = "Hırsın iş kazasına yol açtı: gelir düştü, beden yoruldu."
            extra["failed"] = True
        elif style_id == "kaytarici":
            player["reputation"] = max(-100, player.get("reputation", 0) - 2)
            note = "Kaytardığın görüldü; itibarın bir nebze zedelendi."
            extra["caught"] = True
    else:
        if style_id == "kaytarici":
            player["health"] = min(100, player.get("health", 100) + 2)
        elif style_id == "garantici":
            note = "Temkinli çalıştın; kazanç az ama kesin."

    extra["style_label"] = style["label"]
    return round(income, 1), note, extra


# ── 2.2 Meslek Mini-Olayları ──────────────────────────────────────────────
# Her olay: id, metin, secenekler[{id, metin, sonuc:{income_mult, money,
#   health, reputation, crime, skill_xp, memory(tür,duygu), sonuc_metin}}]
# Mesleğe özel havuz yoksa GENEL havuz kullanılır.
PROFESSION_EVENTS = {
    "demirci": [
        {"id": "acele_silah", "metin": "Ağa'nın oğlu acele bir kılıç istiyor — çifte ücret ama kusur riski yüksek. Kabul?",
         "secenekler": [
             {"id": "kabul", "metin": "Kabul et, gece çalış",
              "test": {"skill": "crafting", "esik": 3},
              "basari": {"income_mult": 2.0, "reputation": 4, "skill_xp": {"crafting": 3},
                         "memory": ("musteri_memnun", 12), "sonuc_metin": "Kılıç kusursuz çıktı; ağanın oğlu cömert ödedi."},
              "basarisizlik": {"income_mult": 0.7, "reputation": -3,
                               "memory": ("musteri_kizgin", -10), "sonuc_metin": "Çelik çatladı; müşteri homurdanarak gitti."}},
             {"id": "ret", "metin": "Reddet, işini bozma",
              "sonuc": {"sonuc_metin": "Acele işe hayır dedin; ağanın oğlu başka kapıya gitti."}},
         ]},
        {"id": "nadir_cevher", "metin": "Pazarda ucuza bir parça nadir cevher var — menşei belirsiz. Al?",
         "secenekler": [
             {"id": "al", "metin": "Al, kim soracak",
              "sonuc": {"money": -8, "income_mult": 1.6, "crime": 3,
                        "memory": ("riskli_is", -3), "sonuc_metin": "Cevheri işledin; çıkan alet bir servet etti — ama menşei aklını kurcalıyor."}},
             {"id": "sor", "metin": "Önce nereden geldiğini sor",
              "sonuc": {"skill_xp": {"intelligence": 1}, "sonuc_metin": "Satıcı kem küm etti; uzak durdun, içgüdün doğruydu."}},
         ]},
    ],
    "tüccar": [
        {"id": "sicak_mal", "metin": "Kervandan ucuza kalan mal — 'sıcak' olabilir. Al?",
         "secenekler": [
             {"id": "al", "metin": "Al, kâr büyük",
              "sonuc": {"income_mult": 1.8, "crime": 4,
                        "memory": ("riskli_is", -4), "sonuc_metin": "Malı üçe katladın — ama sonradan çalıntı olduğunu duydun."}},
             {"id": "ret", "metin": "Temiz iş yap, reddet",
              "sonuc": {"reputation": 2, "sonuc_metin": "Şüpheli maldan uzak durdun; namın temiz kaldı."}},
         ]},
        {"id": "borclu_musteri", "metin": "Eski bir müşteri borcunu ödeyemiyor, 'biraz daha süre' diyor. Ne yaparsın?",
         "secenekler": [
             {"id": "sure", "metin": "Süre ver, güven inşa et",
              "sonuc": {"income_mult": 0.8, "memory": ("borc_erteledi", 8),
                        "sonuc_metin": "Süre verdin; adam minnettar, bir gün sana sadık bir alıcı olacak."}},
             {"id": "bask", "metin": "Baskı yap, parayı al",
              "sonuc": {"income_mult": 1.2, "reputation": -2, "memory": ("baski_yapti", -12),
                        "sonuc_metin": "Borcu söktün ama adam bir daha kapına gelmeyecek."}},
         ]},
    ],
    "çiftçi": [
        {"id": "komsu_okuz", "metin": "Komşunun öküzü tarlana girip ekini çiğnedi. Ne yaparsın?",
         "secenekler": [
             {"id": "tazminat", "metin": "Tazminat iste",
              "sonuc": {"money": 12, "memory": ("anlasmazlik", -6),
                        "sonuc_metin": "Komşu söylene söylene tazminatı ödedi; aranıza soğukluk girdi."}},
             {"id": "gormezden", "metin": "Görmezden gel",
              "sonuc": {"reputation": 2, "memory": ("hosgoru", 8),
                        "sonuc_metin": "'Olur böyle şeyler' dedin; komşun bunu unutmayacak — iyi anlamda."}},
             {"id": "alikoy", "metin": "Öküzü alıkoy",
              "sonuc": {"money": 20, "crime": 5, "memory": ("dusmanlik", -15),
                        "sonuc_metin": "Öküzü ahırına çektin; komşunla artık açık düşmansınız."}},
         ]},
        {"id": "kotu_hava", "metin": "Gökyüzü kararıyor — fırtına gelebilir. Hasadı erken mi toplasan?",
         "secenekler": [
             {"id": "erken", "metin": "Erken topla, garantile",
              "sonuc": {"income_mult": 0.85, "sonuc_metin": "Olgunlaşmamış da olsa ürünü kurtardın; fırtına gece bastırdı."}},
             {"id": "bekle", "metin": "Bekle, olgunlaşsın",
              "test": {"stat": "intelligence", "esik": 4},
              "basari": {"income_mult": 1.5, "sonuc_metin": "Hava döndü; tam olgun ürünü bol bol topladın."},
              "basarisizlik": {"income_mult": 0.4, "health": -4, "sonuc_metin": "Fırtına ekini yatırdı; az şey kurtarabildin."}},
         ]},
    ],
    "asker": [
        {"id": "rusvet", "metin": "Bir tüccar 'gözünü bir an kapa' diye kese uzatıyor. Alır mısın?",
         "secenekler": [
             {"id": "al", "metin": "Keseyi al",
              "sonuc": {"money": 25, "crime": 6, "memory": ("rusvet_aldi", -8),
                        "sonuc_metin": "Keseyi cebe attın; kolay para, ama kirli."}},
             {"id": "ret", "metin": "Reddet, görevini yap",
              "sonuc": {"reputation": 4, "memory": ("durust_asker", 10),
                        "sonuc_metin": "Rüşveti geri çevirdin; komutanın kulağına gitti, gözüne girdin."}},
         ]},
    ],
    "avcı": [
        {"id": "nadir_av", "metin": "İzini sürdüğün geyik nadir bir cinsten — kürkü pahalı ama avı zor.",
         "secenekler": [
             {"id": "kovala", "metin": "Peşine düş",
              "test": {"stat": "stamina", "esik": 4},
              "basari": {"income_mult": 2.2, "skill_xp": {"combat": 2}, "sonuc_metin": "Saatlerce iz sürdün ve vurdun; kürk bir servet etti."},
              "basarisizlik": {"health": -6, "sonuc_metin": "Geyik dağa kaçtı; sen yorgun ve eli boş döndün."}},
             {"id": "vazgec", "metin": "Sıradan avla yetin",
              "sonuc": {"sonuc_metin": "Garanti olanı seçtin; tavşan da ekmek parası eder."}},
         ]},
    ],
    "şifacı": [
        {"id": "agir_hasta", "metin": "Ağır bir hasta getirildi — tedavisi riskli, ölürse suçlanırsın.",
         "secenekler": [
             {"id": "tedavi", "metin": "Tedaviyi dene",
              "test": {"stat": "intelligence", "esik": 5},
              "basari": {"income_mult": 2.0, "reputation": 6, "memory": ("hayat_kurtardi", 14),
                         "sonuc_metin": "Hastayı ölümden döndürdün; ailesi seni el üstünde tutuyor."},
              "basarisizlik": {"reputation": -5, "memory": ("hasta_kaybetti", -10),
                               "sonuc_metin": "Elinden geleni yaptın ama kurtaramadın; dedikodu çıktı."}},
             {"id": "yonlendir", "metin": "Başka şifacıya yönlendir",
              "sonuc": {"sonuc_metin": "Riske girmedin; hasta başka kapıya taşındı."}},
         ]},
    ],
}

# Mesleği özel havuzda olmayanlar için genel havuz
GENERIC_EVENTS = [
    {"id": "yorgun_gun", "metin": "Bugün işler ağır; zorlanıyorsun. Nasıl devam edersin?",
     "secenekler": [
         {"id": "diren", "metin": "Diş sık, çalış",
          "sonuc": {"income_mult": 1.2, "health": -3, "stat_xp": {"stamina": 1},
                    "sonuc_metin": "Yorgunluğa rağmen tamamladın; bedenin güçlendi."}},
         {"id": "ara", "metin": "Mola ver, yavaşla",
          "sonuc": {"income_mult": 0.8, "health": 2, "sonuc_metin": "Biraz dinlendin; az kazandın ama dinçsin."}},
     ]},
    {"id": "iyi_firsat", "metin": "Bir tanıdık ek iş öneriyor — vakit alır ama ücreti iyi.",
     "secenekler": [
         {"id": "kabul", "metin": "Kabul et",
          "sonuc": {"income_mult": 1.5, "health": -2, "memory": ("is_birligi", 6),
                    "sonuc_metin": "Ek işi bitirdin; cebin doldu, tanıdığın memnun."}},
         {"id": "ret", "metin": "Vaktim yok de",
          "sonuc": {"sonuc_metin": "Kibarca reddettin; bugünlük kendi işine baktın."}},
     ]},
]

WORK_EVENT_CHANCE = 0.30


def roll_work_event(prof):
    """%30 ihtimalle mesleğe uygun bir mini-olay seç. Yoksa None."""
    if random.random() > WORK_EVENT_CHANCE:
        return None
    pool = PROFESSION_EVENTS.get(prof) or GENERIC_EVENTS
    ev = random.choice(pool)
    # Frontend'e güvenli kopya: sadece metin + seçenek etiketleri
    return {
        "id": ev["id"],
        "metin": ev["metin"],
        "secenekler": [{"id": s["id"], "metin": s["metin"],
                        "test": s.get("test")} for s in ev["secenekler"]],
    }


def _find_event(prof, event_id):
    pool = PROFESSION_EVENTS.get(prof) or GENERIC_EVENTS
    return next((e for e in pool if e["id"] == event_id), None)


def resolve_work_event(state, prof, event_id, choice_id):
    """Mini-olay seçimini çöz. Döndürür sonuç dict'i:
    {income_mult, result_text, ...} — work endpoint geliri buna göre ayarlar."""
    ev = _find_event(prof, event_id)
    if not ev:
        return {"income_mult": 1.0, "result_text": ""}
    choice = next((s for s in ev["secenekler"] if s["id"] == choice_id), None)
    if not choice:
        return {"income_mult": 1.0, "result_text": ""}

    # Testli mi düz mü?
    if "test" in choice:
        test = choice["test"]
        player = state["player"]
        if "stat" in test:
            have = player.get("stats", {}).get(test["stat"], 0)
        else:
            have = player.get("skills", {}).get(test["skill"], 0)
        ok = have >= test["esik"] or random.random() < max(0.15, 0.5 + 0.12 * (have - test["esik"]))
        outcome = choice["basari"] if ok else choice["basarisizlik"]
    else:
        outcome = choice["sonuc"]

    _apply_work_outcome(state, prof, outcome)
    return {
        "income_mult": outcome.get("income_mult", 1.0),
        "money": outcome.get("money", 0),
        "result_text": outcome.get("sonuc_metin", ""),
    }


def _apply_work_outcome(state, prof, outcome):
    """Olay sonucunun yan etkilerini uygula (income hariç — o work'te)."""
    player = state["player"]
    if outcome.get("money"):
        player["money"] = round(player.get("money", 0) + outcome["money"], 1)
    if outcome.get("health"):
        player["health"] = max(0, min(100, player.get("health", 100) + outcome["health"]))
    if outcome.get("reputation"):
        player["reputation"] = player.get("reputation", 0) + outcome["reputation"]
    if outcome.get("crime"):
        player["crime"] = max(0, player.get("crime", 0) + outcome["crime"])
    for stat, xp in outcome.get("stat_xp", {}).items():
        try:
            from skills import add_stat_xp
            add_stat_xp(player, stat, xp)
        except Exception:
            pass
    for sk, xp in outcome.get("skill_xp", {}).items():
        try:
            from skills import add_skill_xp
            add_skill_xp(player, sk, xp)
        except Exception:
            pass
    # Hafıza tohumu: çalışılan yerdeki bir NPC'ye anı yaz (S2'ye köprü)
    mem = outcome.get("memory")
    if mem:
        _seed_work_memory(state, mem)


def _seed_work_memory(state, mem):
    """İş sahnesinin duygusal izini yerel bir NPC'ye/oyuncuya işle.
    S2 NPC Zihni geldiğinde yapısal anıya dönüşecek; şimdilik npc_profile
    push_personal_memory ile uyumlu."""
    tur, duygu = mem
    player = state["player"]
    locals_ = [n for n in state["world"]["npcs"]
               if n.get("alive") and n.get("location_id") == player.get("location_id")
               and n.get("profession") not in ("çocuk",)]
    if not locals_:
        return
    npc = random.choice(locals_)
    # Anı satırı (string) + duygu ilişki skoruna yansır.
    # S2 NPC Zihni geldiğinde bu, yapısal anı nesnesine yükseltilecek.
    label = {
        "musteri_memnun": "iyi iş çıkardın, müşteri memnun kaldı",
        "musteri_kizgin": "işi batırdın, müşteri kızgın",
        "riskli_is": "karanlık bir işe bulaştığını sezdiler",
        "borc_erteledi": "borcuna süre tanıdın, minnettar",
        "baski_yapti": "borç için baskı yaptın",
        "anlasmazlik": "bir anlaşmazlık yaşadınız",
        "hosgoru": "hoşgörülü davrandın",
        "dusmanlik": "aranızda düşmanlık doğdu",
        "rusvet_aldi": "rüşvet aldığını gördüler",
        "durust_asker": "dürüstlüğünle göze girdin",
        "hayat_kurtardi": "bir hayat kurtardın",
        "hasta_kaybetti": "bir hastayı kaybettin",
        "is_birligi": "iyi bir iş birliği yaptınız",
    }.get(tur, "yolların kesişti")
    try:
        from npc_profile import push_personal_memory
        push_personal_memory(npc, f"{player.get('name','Biri')}: {label}")
    except Exception:
        pass
    # Duygu yükünü ilişki skoruna işle
    rels = state.setdefault("relationships", {})
    rels[npc["id"]] = max(-100, min(100, rels.get(npc["id"], 0)
                                    + max(-5, min(5, round(duygu / 3)))))
