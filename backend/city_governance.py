"""
city_governance.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
KATMAN 1: Lokasyona bağlı siyasi yapı.
  - Her lokasyonun bir yönetim objesi vardır.
  - Yönetici (muhtar/lord/kral) bir NPC veya oyuncu olabilir.
  - Vergi, garnizon, halk mutluluğu, meşruiyet bu katmanda tutulur.
  - Faction nüfuzu bu katman üzerinden etki eder.

Faction sistemi (faction_system.py) ile ilişki:
  - Faction nüfuzu 75+ olursa → bu dosyadaki apply_faction_influence() çağrılır.
  - Lord değişiminde → tüm factionların nüfuzu yeniden hesaplanır.
"""
import random
from simulation import _push_event

# ─── Yardımcı ──────────────────────────────────────────────────────────────

def _new_id():
    import uuid
    return uuid.uuid4().hex[:12]


def _title_for(kind: str) -> str:
    return {
        "köy":     "Muhtar",
        "kasaba":  "Lord",
        "şehir":   "Büyük Lord",
        "kale":    "Kale Beyi",
        "krallık": "Kral",
    }.get(kind, "Yönetici")


# ─── Veri Modeli ───────────────────────────────────────────────────────────

def make_governance(location_id: str, kind: str, kingdom_id: str = None,
                    governor_id: str = None) -> dict:
    """Her lokasyon için yönetim objesi oluştur."""
    return {
        "id":                    _new_id(),
        "location_id":           location_id,
        "kingdom_id":            kingdom_id,
        "kind":                  kind,
        "governor_id":           governor_id,        # NPC id veya "PLAYER" veya None
        "governor_title":        _title_for(kind),
        "governor_legitimacy":   70,                 # 0-100
        "treasury":              random.randint(50, 300),
        "tax_rate":              15,                 # % olarak
        "garrison_size":         _default_garrison(kind),
        "population_happiness":  60,                 # 0-100
        "autonomy":              50,                 # 0-100
        "faction_influence":     {},                 # {faction_id: 0-100}
        "controlled_by_faction": None,               # gizli kontrol: faction_id
        "control_is_secret":     False,
        "pending_candidate":     None,               # aday_id: lord boş kalınca atanır
        "event_log":             [],
    }


def _default_garrison(kind: str) -> int:
    return {"köy": 2, "kasaba": 8, "kale": 20, "şehir": 15, "krallık": 0}.get(kind, 5)


# ─── Tick ──────────────────────────────────────────────────────────────────

def governance_world_tick(state: dict, turn: int) -> None:
    """
    Haftalık yönetim tick'i. advance_time() içinden çağrılır.
    1. Vergi toplama
    2. Halk mutluluğu hesaplama
    3. Meşruiyet güncelleme
    4. Faction nüfuz etkileri
    5. Lord değişim / isyan kontrolü
    """
    from balance_config import GOVERNANCE, INFLUENCE_THRESHOLDS
    govs = state["world"].get("governances", [])

    for gov in govs:
        loc = next((l for l in state["world"]["locations"]
                    if l["id"] == gov["location_id"]), None)
        if not loc:
            continue

        # 1. Vergi toplama
        if gov["governor_id"]:
            tax_income = int(loc.get("wealth", 50) * gov["tax_rate"] / 100)
            gov["treasury"] = gov.get("treasury", 0) + tax_income

            # Oyuncu yöneticiyse hazineden pay alır
            if gov["governor_id"] == "PLAYER":
                player = state["player"]
                share = max(1, tax_income // 4)
                player["money"] = round(player.get("money", 0) + share, 1)

        # 2. Halk mutluluğu
        happiness = gov["population_happiness"]
        if gov["tax_rate"] > GOVERNANCE["happiness_tax_threshold"]:
            happiness -= (gov["tax_rate"] - GOVERNANCE["happiness_tax_threshold"]) // 5
        happiness = min(100, happiness + 1)  # Pasif yavaş iyileşme
        gov["population_happiness"] = max(0, happiness)

        # 3. Meşruiyet güncelleme
        leg = gov["governor_legitimacy"]
        leg -= GOVERNANCE["legitimacy_decay_rate"]   # doğal bozunum
        if happiness > 60:
            leg += 1   # mutlu halk meşruiyeti destekler
        gov["governor_legitimacy"] = max(0, min(100, leg))

        # 4. Faction nüfuz etkilerini uygula
        for fac_id, influence in list(gov["faction_influence"].items()):
            _apply_influence_effects(gov, fac_id, influence, state, turn)

        # 5. İsyan / lord değişim kontrolü
        _check_governance_crisis(gov, state, turn)


def _apply_influence_effects(gov: dict, fac_id: str, influence: int,
                              state: dict, turn: int) -> None:
    """Nüfuz eşik etkilerini uygula."""
    from balance_config import INFLUENCE_THRESHOLDS
    fac = next((f for f in state["world"].get("factions", [])
                if f["id"] == fac_id), None)
    if not fac:
        return

    if influence >= 100 and gov["controlled_by_faction"] != fac_id:
        # Tam kontrol ele geçirildi
        gov["controlled_by_faction"] = fac_id
        gov["control_is_secret"] = fac.get("type") == "gizli_cemiyet"
        _gov_log(gov, turn,
                 f"{fac['name']} şehrin yönetimini ele geçirdi "
                 f"({'gizlice' if gov['control_is_secret'] else 'açıkça'}).")
        _push_event(state, turn, "faction_kontrol",
                    f"{fac['name']}, {gov['location_id']} üzerinde tam kontrol kurdu.")

    elif influence >= 75 and gov.get("pending_candidate") is None:
        # Kendi adamını aday göster
        if fac.get("leader_id") and fac["leader_id"] != "PLAYER":
            gov["pending_candidate"] = fac["leader_id"]
            _gov_log(gov, turn,
                     f"{fac['name']} bir sonraki lord değişiminde aday gösterecek.")

    elif influence >= 50:
        # Vergi politikası etkisi: yüksek nüfuzlu faction vergiyi kısmen kontrol eder
        if fac.get("type") == "tuccar_loncasi" and gov["tax_rate"] > 20:
            gov["tax_rate"] = max(15, gov["tax_rate"] - 1)
            _gov_log(gov, turn, f"{fac['name']} vergi indirimi sağladı.")


def _check_governance_crisis(gov: dict, state: dict, turn: int) -> None:
    """İsyan, lord düşüşü veya halk ayaklanması kontrolü."""
    from balance_config import GOVERNANCE
    happiness  = gov["population_happiness"]
    legitimacy = gov["governor_legitimacy"]

    # Meşruiyet kriziyle lord düşer
    if legitimacy < GOVERNANCE["revolt_legitimacy_threshold"] and gov["governor_id"]:
        old_gov = gov["governor_id"]
        _change_governor(gov, None, state, turn,
                         reason="Meşruiyetini yitirdi, koltuğunu kaybetti.")
        _push_event(state, turn, "lord_düşüşü",
                    f"{gov['location_id']} yöneticisi ({old_gov}) meşruiyet krizi yüzünden düştü.")

    # Mutluluk kriziyle isyan riski
    elif (happiness < GOVERNANCE["revolt_happiness_threshold"]
          and random.random() < 0.05):
        gov["population_happiness"] = min(100, happiness + 20)  # isyan sonrası geçici iyileşme
        gov["treasury"] = max(0, gov.get("treasury", 0) - 50)
        _gov_log(gov, turn, "Halk ayaklandı! Hazine yağmalandı.")
        _push_event(state, turn, "halk_isyanı",
                    f"{gov['location_id']} halkı ayaklandı.")


# ─── Yönetici Değişimi ─────────────────────────────────────────────────────

def _change_governor(gov: dict, new_governor_id, state: dict, turn: int,
                     reason: str = "") -> None:
    """Lord değişimi: miras, atama veya güç boşluğu."""
    old = gov["governor_id"]
    gov["governor_id"]         = new_governor_id
    gov["governor_legitimacy"] = 50 if new_governor_id else 0
    gov["controlled_by_faction"] = None   # kontrol sıfırlanır
    gov["control_is_secret"]    = False
    _gov_log(gov, turn,
             f"Yönetici değişti: {old or 'boş'} → {new_governor_id or 'boş'}. {reason}")

    # Yeni yönetici atanmamışsa: pending_candidate varsa ata
    if not new_governor_id and gov.get("pending_candidate"):
        cand = gov["pending_candidate"]
        gov["governor_id"]         = cand
        gov["governor_legitimacy"] = 40
        gov["pending_candidate"]   = None
        _gov_log(gov, turn, f"Aday {cand} yönetici oldu.")
        _push_event(state, turn, "yeni_lord",
                    f"{gov['location_id']} yeni yöneticisi: {cand}.")


def change_governor(location_id: str, new_governor_id, state: dict, turn: int,
                    reason: str = "") -> dict:
    """Dışarıdan çağrılabilen public API."""
    gov = get_governance(state, location_id)
    if not gov:
        return {"success": False, "reason": "Yönetim objesi bulunamadı."}
    _change_governor(gov, new_governor_id, state, turn, reason)
    return {"success": True}


# ─── Oyuncu Aday Olma ──────────────────────────────────────────────────────

def player_run_for_governor(state: dict, location_id: str, turn: int) -> dict:
    """Oyuncu bir konuma yönetici adayı olur."""
    from balance_config import GOVERNANCE
    player = state["player"]
    age    = player.get("age", 0)
    rep    = player.get("reputation", 0)

    gov = get_governance(state, location_id)
    if not gov:
        return {"success": False, "reason": "Bu konumun yönetim bilgisi yok."}

    kind = gov["kind"]

    # Yaş ve itibar kontrolleri
    min_age = GOVERNANCE["min_age_lord"]
    min_rep = GOVERNANCE["min_reputation_lord"]
    if kind == "şehir":
        min_age = GOVERNANCE["min_age_city_lord"]
    elif kind in ("krallık",):
        min_age = GOVERNANCE["min_age_king"]
        min_rep = GOVERNANCE["min_reputation_king"]

    if age < min_age:
        return {"success": False,
                "reason": f"Bu konuma aday olmak için en az {min_age} yaşında olmalısın."}
    if rep < min_rep:
        return {"success": False,
                "reason": f"Bu konuma aday olmak için en az {min_rep} itibar gerekli (şu an: {rep})."}

    # Mevcut yönetici oyuncuysa zaten yönetici
    if gov["governor_id"] == "PLAYER":
        return {"success": False, "reason": "Bu konumu zaten yönetiyorsun."}

    gov["pending_candidate"] = "PLAYER"
    _gov_log(gov, turn, f"Oyuncu ({player['name']}) yöneticilik adaylığını koydu.")
    _push_event(state, turn, "adaylık",
                f"{player['name']}, {location_id} yöneticiliğine aday oldu.")
    return {"success": True,
            "message": f"Adaylığın kaydedildi. Mevcut yönetici düşünce sıraya gireceksin."}


# ─── Nüfuz Güncelleme (faction_system'den çağrılır) ───────────────────────

def update_faction_influence(state: dict, faction_id: str, location_id: str,
                              delta: int, turn: int) -> int:
    """
    Faction'ın bir lokasyondaki nüfuzunu değiştir.
    Yeni nüfuz değerini döndürür.
    """
    gov = get_governance(state, location_id)
    if not gov:
        return 0
    current = gov["faction_influence"].get(faction_id, 0)
    new_val  = max(0, min(100, current + delta))
    gov["faction_influence"][faction_id] = new_val

    # Eşik geçildi mi kontrol et
    _apply_influence_effects(gov, faction_id, new_val, state, turn)
    return new_val


# ─── Sorgular ──────────────────────────────────────────────────────────────

def get_governance(state: dict, location_id: str) -> dict | None:
    """Lokasyon id'sine göre governance objesi döndür."""
    return next(
        (g for g in state["world"].get("governances", [])
         if g["location_id"] == location_id),
        None,
    )


def get_governance_summary(state: dict, location_id: str) -> dict:
    """Frontend için özet bilgi."""
    gov = get_governance(state, location_id)
    if not gov:
        return {}
    fac_influences = []
    for fac_id, inf in gov["faction_influence"].items():
        fac = next((f for f in state["world"].get("factions", [])
                    if f["id"] == fac_id), None)
        if fac:
            fac_influences.append({
                "faction_id":   fac_id,
                "faction_name": fac.get("name", "?"),
                "faction_type": fac.get("type", "?"),
                "influence":    inf,
            })
    fac_influences.sort(key=lambda x: x["influence"], reverse=True)

    governor_name = None
    if gov["governor_id"] and gov["governor_id"] != "PLAYER":
        npc = next((n for n in state["world"]["npcs"]
                    if n["id"] == gov["governor_id"]), None)
        if npc:
            governor_name = npc.get("name", "?")
    elif gov["governor_id"] == "PLAYER":
        governor_name = state["player"].get("name", "Oyuncu")

    return {
        "location_id":           gov["location_id"],
        "kind":                  gov["kind"],
        "governor_title":        gov["governor_title"],
        "governor_id":           gov["governor_id"],
        "governor_name":         governor_name,
        "governor_legitimacy":   gov["governor_legitimacy"],
        "population_happiness":  gov["population_happiness"],
        "tax_rate":              gov["tax_rate"],
        "treasury":              gov["treasury"],
        "garrison_size":         gov["garrison_size"],
        "autonomy":              gov["autonomy"],
        "faction_influences":    fac_influences,
        "controlled_by_faction": gov["controlled_by_faction"],
        "control_is_secret":     gov["control_is_secret"],
        "event_log":             gov["event_log"][-10:],
    }


def get_all_governances_summary(state: dict) -> list:
    """Tüm governance objelerinin özetini döndür."""
    return [get_governance_summary(state, g["location_id"])
            for g in state["world"].get("governances", [])]


# ─── Yardımcılar ───────────────────────────────────────────────────────────

def _gov_log(gov: dict, turn: int, text: str) -> None:
    gov["event_log"].append({"turn": turn, "text": text})
    if len(gov["event_log"]) > 50:
        gov["event_log"] = gov["event_log"][-50:]


def ensure_governances(state: dict) -> None:
    """Eski save'lerde governances listesi yoksa oluştur."""
    if "governances" not in state["world"]:
        state["world"]["governances"] = []
    existing_locs = {g["location_id"] for g in state["world"]["governances"]}
    for loc in state["world"].get("locations", []):
        if loc["id"] not in existing_locs:
            # Mevcut kral/lord bilgisini NPC'lerden bul
            governor_id = _find_governor_for_location(loc, state)
            gov = make_governance(
                location_id=loc["id"],
                kind=loc.get("kind", "köy"),
                kingdom_id=loc.get("kingdom_id"),
                governor_id=governor_id,
            )
            state["world"]["governances"].append(gov)


def _find_governor_for_location(loc: dict, state: dict):
    """Lokasyona uygun NPC yöneticiyi bul (kral/lord mesleklerinden)."""
    kind = loc.get("kind", "köy")
    if kind == "şehir":
        target_profs = ("kral", "lord")
    elif kind == "kale":
        target_profs = ("lord", "şövalye")
    else:
        target_profs = ("köylü",)  # köylerin genelde muhtarı yok, None döner

    if kind in ("köy", "kasaba"):
        return None  # Küçük yerleşimler başlangıçta yöneticisiz

    for npc in state["world"].get("npcs", []):
        if (npc.get("alive") and
                npc.get("location_id") == loc["id"] and
                npc.get("profession") in target_profs):
            return npc["id"]
    return None


# ─── Oyuncu Vergi Ödeme ────────────────────────────────────────────────────

def player_pay_taxes(state: dict, location_id: str, amount: int, turn: int) -> dict:
    """
    Oyuncu bir lokasyona vergi öder (veya bağış yapar).
    - Oyuncunun parasından düşülür.
    - Şehir hazinesine eklenir.
    - Halk memnuniyeti ve meşruiyet hafifçe artar.
    """
    player = state["player"]
    money  = player.get("money", 0)

    if amount <= 0:
        return {"success": False, "reason": "Geçersiz miktar."}
    if money < amount:
        return {"success": False, "reason": f"Yeterli paran yok ({money:.1f} altın)."}

    gov = get_governance(state, location_id)
    if not gov:
        # Governance yoksa sessizce başarılı say (eski dünya verileri için)
        player["money"] = round(money - amount, 1)
        return {"success": True, "message": "Vergi ödendi.", "remaining": player["money"]}

    player["money"] = round(money - amount, 1)
    gov["treasury"]  = gov.get("treasury", 0) + amount

    # Küçük memnuniyet ve meşruiyet bonusu
    bonus_hap = min(3, amount // 20)
    bonus_leg = min(2, amount // 50)
    gov["population_happiness"]  = min(100, gov["population_happiness"] + bonus_hap)
    gov["governor_legitimacy"]   = min(100, gov["governor_legitimacy"]  + bonus_leg)

    _gov_log(gov, turn,
             f"Oyuncu {amount} altın vergi/bağış yaptı. "
             f"Hazine: {gov['treasury']}, Mutluluk+{bonus_hap}, Meşruiyet+{bonus_leg}.")
    _push_event(state, turn, "vergi_ödeme",
                f"{player['name']}, {location_id}'e {amount} altın vergi ödedi.")
    return {
        "success": True,
        "message": f"{amount} altın ödendi.",
        "remaining": player["money"],
        "treasury":  gov["treasury"],
    }
