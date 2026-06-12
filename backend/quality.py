"""Mal Kalitesi — GDD v7 R3.2.

Pazardaki zanaat mallarının her lokasyonda haftalık bir "parti kalitesi" olur:
  kusurlu ×0.6 · sıradan ×1.0 · iyi ×1.5 · usta_işi ×2.5

- İyi / usta işi GÖRÜNÜR: listelenen fiyata prim yansır.
- Kusurlu GİZLİDİR: satıcı saklar. "İncele" (zekâ testi) açarsa ucuza alırsın;
  açmadan alırsan normal fiyat ödersin ve mal elinde kusurlu çıkar.
- Kusurlu malı başka pazarda TAM fiyata satmaya kalkmak mümkündür —
  yakalanırsan fiyat çöker ve adın lekelenir (nam riski).

Envanter yığın bazlı olduğundan kalite, mal başına tek bayrakla taşınır:
player["inv_quality"][good] = kalite (sıradan ise hiç yazılmaz).
"""
import hashlib
import random

# Zanaat malları — ham ürünlerde (buğday, odun...) parti kalitesi olmaz
QUALITY_GOODS = (
    "kıyafet", "kumaş", "silah", "alet", "zırh", "çizme",
    "işlenmiş_deri", "mobilya", "şarap",
)

QUALITIES = {
    "kusurlu":  {"label": "Kusurlu",  "mult": 0.6, "icon": "⚠️", "visible": False},
    "sıradan":  {"label": "Sıradan",  "mult": 1.0, "icon": "",   "visible": True},
    "iyi":      {"label": "İyi",      "mult": 1.5, "icon": "✨", "visible": True},
    "usta_işi": {"label": "Usta İşi", "mult": 2.5, "icon": "🏆", "visible": True},
}

_WEIGHTS = [("kusurlu", 15), ("sıradan", 62), ("iyi", 18), ("usta_işi", 5)]


def _lot_rng(loc_id, good, turn):
    h = hashlib.md5(f"kalite|{loc_id}|{good}|{turn}".encode()).hexdigest()
    return random.Random(int(h[:12], 16))


def roll_lot_quality(loc_id, good, turn):
    """Haftaya göre deterministik parti kalitesi."""
    rng = _lot_rng(loc_id, good, turn)
    total = sum(w for _, w in _WEIGHTS)
    pick = rng.uniform(0, total)
    acc = 0
    for q, w in _WEIGHTS:
        acc += w
        if pick <= acc:
            return q
    return "sıradan"


def tick_market_quality(loc, turn):
    """Haftalık tick: zanaat mallarının parti kalitesini yenile."""
    market = loc.get("market") or {}
    for good in QUALITY_GOODS:
        if good in market:
            market[good]["kalite"] = roll_lot_quality(loc["id"], good, turn)


def _intel_key(loc_id, good, turn):
    return f"{loc_id}|{good}|{turn}"


def lot_view(state, loc, good):
    """Oyuncunun bu parti hakkında GÖRDÜĞÜ: görünür kalite + incelendi mi."""
    m = loc.get("market", {}).get(good, {})
    kalite = m.get("kalite", "sıradan")
    if good not in QUALITY_GOODS:
        return {"kalite": None, "known": True, "inspectable": False}
    turn = state.get("turn", 0)
    intel = state["player"].get("quality_intel", {})
    inspected = intel.get(_intel_key(loc["id"], good, turn))
    if QUALITIES[kalite]["visible"]:
        return {"kalite": kalite, "known": True, "inspectable": False}
    # kusurlu: ancak inceleme açtıysa bilinir
    if inspected == "revealed":
        return {"kalite": kalite, "known": True, "inspectable": False}
    return {"kalite": "sıradan", "known": False,
            "inspectable": inspected != "tried"}


def inspect_lot(state, loc, good):
    """İncele — zekâ testi. Ayda bir deneme hakkı (lokasyon+mal başına)."""
    if good not in QUALITY_GOODS:
        return {"ok": False, "note": "Bu malın incelenecek bir işçiliği yok."}
    player = state["player"]
    turn = state.get("turn", 0)
    intel = player.setdefault("quality_intel", {})
    key = _intel_key(loc["id"], good, turn)
    if intel.get(key):
        return {"ok": False, "note": "Bu partiyi bu ay zaten elden geçirdin."}
    iq = player.get("stats", {}).get("intelligence", 1)
    trade = player.get("skills", {}).get("trade", 0)
    chance = min(0.9, 0.35 + iq * 0.06 + trade * 0.03)
    kalite = loc["market"][good].get("kalite", "sıradan")
    if random.random() < chance:
        intel[key] = "revealed"
        info = QUALITIES[kalite]
        if kalite == "kusurlu":
            note = "Dikişleri söküktü, demiri çatlaktı — bu parti KUSURLU. Ucuza kapatabilirsin."
        elif kalite in ("iyi", "usta_işi"):
            note = f"Elden geçirdin: gerçekten {info['label'].lower()} bir parti."
        else:
            note = "Elden geçirdin: sıradan bir parti, ne eksik ne fazla."
        try:
            from skills import add_stat_xp
            add_stat_xp(player, "intelligence", 1)
        except Exception:
            pass
        return {"ok": True, "kalite": kalite, "note": note}
    intel[key] = "tried"
    return {"ok": False, "tried": True,
            "note": "Evirip çevirdin ama bir şey anlamadın. Satıcı kaşlarını çattı."}


def buy_quality(state, loc, good):
    """Alımda uygulanacak (çarpan, satın_alınan_kalite, not).
    Kusurlu + bilinmiyor → normal fiyat ödenir, mal kusurlu çıkar (tuzak)."""
    if good not in QUALITY_GOODS:
        return 1.0, None, None
    kalite = loc.get("market", {}).get(good, {}).get("kalite", "sıradan")
    view = lot_view(state, loc, good)
    if kalite == "kusurlu":
        if view["known"]:
            return QUALITIES["kusurlu"]["mult"], "kusurlu", \
                "Kusurlu partiyi ucuza kapattın — artık ne yapacağın sana kalmış."
        return 1.0, "kusurlu", \
            "Eve varınca fark ettin: mal KUSURLU çıktı. Tam fiyat ödedin!"
    if kalite in ("iyi", "usta_işi"):
        return QUALITIES[kalite]["mult"], kalite, None
    return 1.0, None, None


def apply_bought_quality(player, good, kalite):
    """Satın alınan kaliteyi envanter bayrağına işle (sıradan = bayrak yok)."""
    iq = player.setdefault("inv_quality", {})
    if kalite and kalite != "sıradan":
        iq[good] = kalite
    else:
        iq.pop(good, None)


def sell_quality(state, good, qty):
    """Satışta uygulanacak (çarpan, not, yakalandı_mı).
    Kusurlu malı tam fiyata satmak risklidir: yakalanırsan fiyat çöker + nam."""
    player = state["player"]
    kalite = player.get("inv_quality", {}).get(good)
    if not kalite or good not in QUALITY_GOODS:
        return 1.0, None, False
    if kalite in ("iyi", "usta_işi"):
        info = QUALITIES[kalite]
        return info["mult"], \
            f"{info['icon']} {info['label']} mal — alıcılar primi seve seve verdi.", False
    # kusurlu
    trade = player.get("skills", {}).get("trade", 0)
    caught_chance = max(0.08, 0.35 + qty * 0.01 - trade * 0.03)
    if random.random() < caught_chance:
        player["crime"] = min(100, player.get("crime", 0) + 3)
        return 0.6, "⚠️ Alıcı kusuru fark etti! Malı yarı yamalak fiyata kakaladın, adın çıktı.", True
    return 1.0, "Kusuru kimse fark etmedi... Bu sefer yırttın.", False


def clear_sold_quality(player, good):
    """Mal stoğu sıfırlanınca kalite bayrağını düşür."""
    if player.get("inventory", {}).get(good, 0) <= 0:
        player.get("inv_quality", {}).pop(good, None)
