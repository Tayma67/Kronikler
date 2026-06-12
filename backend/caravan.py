"""caravan.py — Kervan & Ticaret Rotası Motoru (Adım 8A)

Kervan yaşam döngüsü:
  create_caravan()  →  state["active_caravan"] oluşur
  process_caravan_tick()  →  simulation.advance_time() içinden çağrılır
  disband_caravan()  →  malları geri alır / kervanı siler

State içindeki şema:
    state["active_caravan"] = {
        "id": str,
        "goods": { good: {"qty": int, "buy_price": float} },
        "cash_on_hand": float,       # kervanın yanında taşıdığı nakit
        "origin_id": str,
        "destination_id": str,
        "route": [loc_id, ...],      # origin → ... → destination
        "current_step": int,          # 0 = origin, len(route)-1 = destination
        "status": "traveling"|"arrived"|"attacked"|"disbanded",
        "attack_events": [],
        "started_turn": int,
        "arrived_turn": int|None,
        "profit": float|None,
        "profit_detail": {},
    }
"""
import random
import uuid
from typing import Optional

# ─── Sabitler ────────────────────────────────────────────────────────────────

GOOD_LABELS = {
    "buğday": "Buğday", "ekmek": "Ekmek", "et": "Et",
    "demir": "Demir", "odun": "Odun", "kumaş": "Kumaş", "silah": "Silah",
}

# Temel saldırı şansı (her adım için)
BASE_ATTACK_CHANCE = 0.12      # %12

# Maksimum kervan kapasitesi (toplam ürün miktarı)
MAX_CARGO_UNITS = 200

# Minimum yolculuk adımı (aynı şehir seçilemez)
MIN_ROUTE_STEPS = 1

# Kervan kurma minimum parası
MIN_CAPITAL = 50.0


# ─── Yardımcı Fonksiyonlar ──────────────────────────────────────────────────

def _new_id() -> str:
    return str(uuid.uuid4())[:8]


def ensure_caravan_state(state: dict) -> None:
    """State'e caravan alanları ekler (yoksa)."""
    if "active_caravan" not in state:
        state["active_caravan"] = None
    if "caravan_history" not in state:
        state["caravan_history"] = []


def _get_locations(state: dict) -> list:
    return state.get("world", {}).get("locations", [])


def _find_location(state: dict, loc_id: str) -> Optional[dict]:
    return next((l for l in _get_locations(state) if l["id"] == loc_id), None)


def _calculate_route(state: dict, origin_id: str, destination_id: str) -> list[str]:
    """
    Basit rota hesaplama: origin → [ara şehirler] → destination.
    Gerçek yol ağı yoksa, mesafeye göre 1-3 ara nokta ekler.
    Her adım = 1 haftalık ilerleme.
    """
    locations = _get_locations(state)
    origin = _find_location(state, origin_id)
    destination = _find_location(state, destination_id)

    if not origin or not destination:
        return [origin_id, destination_id]

    # Aynı krallık = 1 ara adım, farklı krallık = 2-3 ara adım
    same_kingdom = origin.get("kingdom_id") == destination.get("kingdom_id")

    # Ara şehirleri bul (ne origin ne destination)
    candidates = [
        l for l in locations
        if l["id"] not in (origin_id, destination_id)
        and l.get("market")
        and l.get("kind") in ("şehir", "köy")
    ]

    # Orta nokta sayısı
    n_waypoints = 1 if same_kingdom else random.randint(1, 2)
    n_waypoints = min(n_waypoints, len(candidates))

    waypoints = []
    if candidates and n_waypoints > 0:
        # Aynı krallık adaylarına öncelik ver
        same_k = [c for c in candidates if c.get("kingdom_id") == origin.get("kingdom_id")]
        pool = same_k if same_kingdom and same_k else candidates
        waypoints = [w["id"] for w in random.sample(pool, min(n_waypoints, len(pool)))]

    return [origin_id] + waypoints + [destination_id]


def _attack_chance(state: dict, player: dict) -> float:
    """Saldırıya uğrama olasılığını hesaplar."""
    chance = BASE_ATTACK_CHANCE

    # Suç skoru yüksekse daha az koruma
    crime = player.get("crime", 0)
    if crime > 50:
        chance += 0.05
    if crime > 80:
        chance += 0.05

    # İtibar yüksekse daha az saldırı
    reputation = player.get("reputation", 0)
    if reputation > 60:
        chance -= 0.04
    if reputation > 80:
        chance -= 0.03

    # Faction savaşı varsa daha tehlikeli
    if state.get("faction_war_active"):
        chance += 0.08

    # Ticaret skoru yüksekse rotayı daha iyi biliyor
    trade_skill = player.get("skills", {}).get("trade", 0)
    if trade_skill >= 30:
        chance -= 0.03
    if trade_skill >= 60:
        chance -= 0.03

    return max(0.03, min(0.40, chance))


def _attack_outcome(state: dict, player: dict, caravan: dict) -> dict:
    """
    Saldırı gerçekleştiğinde sonuç hesapla.
    Güç & Dövüş becerisine göre malların bir kısmını kurtarabilir.
    Returns: { "type": "tam_kayıp"|"kısmi_kayıp", "lost_pct": float, "summary": str }
    """
    strength = player.get("stats", {}).get("strength", 10)
    combat = player.get("skills", {}).get("combat", 0)
    # Savunma puanı (0-100)
    defense_score = (strength * 0.4 + combat * 0.6)

    if defense_score >= 70:
        lost_pct = random.uniform(0.10, 0.30)
        typ = "kısmi_kayıp"
        summary = "Saldırıya karşı direndin, malların bir kısmını kaybettin."
    elif defense_score >= 40:
        lost_pct = random.uniform(0.30, 0.60)
        typ = "kısmi_kayıp"
        summary = "Eşkıyalar mallarının yarısını çaldı."
    else:
        lost_pct = random.uniform(0.60, 0.90)
        typ = "tam_kayıp" if lost_pct > 0.75 else "kısmi_kayıp"
        summary = "Güçsüz kaldın, eşkıyalar çoğu malı aldı."

    return {"type": typ, "lost_pct": round(lost_pct, 2), "summary": summary}


# ─── Kervan İşlemleri ────────────────────────────────────────────────────────

def create_caravan(
    state: dict,
    destination_id: str,
    goods: dict,          # { good: qty } — envanterdeki mallar
    cash_on_hand: float,  # kervanın yanına alınan nakit (kâr değil, sermaye)
) -> dict:
    """
    Yeni kervan kurar. Malları envanterden düşer, state'e active_caravan yazar.
    Returns: { "caravan": caravan_dict, "route": [...], "steps": int }
    """
    ensure_caravan_state(state)
    player = state["player"]

    if state["active_caravan"] is not None:
        raise ValueError("Zaten aktif bir kervanın var.")

    origin_id = player["location_id"]
    if origin_id == destination_id:
        raise ValueError("Başlangıç ve hedef aynı olamaz.")

    dest = _find_location(state, destination_id)
    if not dest:
        raise ValueError("Hedef konum bulunamadı.")

    if not dest.get("market"):
        raise ValueError("Hedef konumda pazar yok.")

    # Kargo kontrolü
    total_units = sum(goods.values())
    if total_units < 1:
        raise ValueError("En az 1 birim mal yüklemelisin.")
    if total_units > MAX_CARGO_UNITS:
        raise ValueError(f"Maksimum kargo kapasitesi {MAX_CARGO_UNITS} birim.")

    # Envanter kontrolü & düşme
    inv = player.setdefault("inventory", {})
    caravan_goods = {}
    for good, qty in goods.items():
        if qty <= 0:
            continue
        if inv.get(good, 0) < qty:
            raise ValueError(f"Envanterde yeterli {GOOD_LABELS.get(good, good)} yok.")
        # Origin pazarındaki alış fiyatını kaydet
        origin_loc = _find_location(state, origin_id)
        buy_price = origin_loc["market"].get(good, {}).get("price", 1.0) if origin_loc else 1.0
        caravan_goods[good] = {"qty": qty, "buy_price": round(buy_price, 1)}
        inv[good] -= qty
        if inv[good] <= 0:
            del inv[good]

    # Nakit kontrolü
    if cash_on_hand < 0:
        cash_on_hand = 0.0
    if player["money"] < cash_on_hand:
        raise ValueError("Yeterli paran yok.")
    player["money"] = round(player["money"] - cash_on_hand, 1)

    # Rota hesapla
    route = _calculate_route(state, origin_id, destination_id)

    caravan = {
        "id": _new_id(),
        "goods": caravan_goods,
        "cash_on_hand": round(cash_on_hand, 1),
        "origin_id": origin_id,
        "origin_name": _find_location(state, origin_id)["name"] if _find_location(state, origin_id) else "Bilinmiyor",
        "destination_id": destination_id,
        "destination_name": dest["name"],
        "route": route,
        "current_step": 0,       # origin'de başlıyor
        "status": "traveling",
        "attack_events": [],
        "started_turn": state.get("turn", 0),
        "arrived_turn": None,
        "profit": None,
        "profit_detail": {},
    }

    state["active_caravan"] = caravan

    from simulation import _push_event
    goods_summary = ", ".join(
        f"{v['qty']} {GOOD_LABELS.get(k, k)}" for k, v in caravan_goods.items()
    )
    _push_event(state, state.get("turn", 0), "kervan",
                f"{player['name']} kervan kurdu: {goods_summary}. Hedef: {dest['name']}.")

    return {
        "caravan": caravan,
        "route_names": [_find_location(state, lid)["name"] for lid in route
                        if _find_location(state, lid)],
        "total_steps": len(route) - 1,
    }


def get_caravan_status(state: dict) -> dict:
    """Aktif kervan durumunu döndürür. Yoksa None."""
    ensure_caravan_state(state)
    caravan = state["active_caravan"]
    if caravan is None:
        return {"active": False, "caravan": None}

    route = caravan["route"]
    current_step = caravan["current_step"]
    total_steps = len(route) - 1

    # Ara konum adları
    current_loc_id = route[min(current_step, len(route) - 1)]
    current_loc = _find_location(state, current_loc_id)

    route_names = []
    for lid in route:
        loc = _find_location(state, lid)
        route_names.append(loc["name"] if loc else lid)

    return {
        "active": True,
        "caravan": caravan,
        "current_location_name": current_loc["name"] if current_loc else "Yolda",
        "route_names": route_names,
        "steps_completed": current_step,
        "total_steps": total_steps,
        "steps_remaining": max(0, total_steps - current_step),
        "progress_pct": round((current_step / max(1, total_steps)) * 100),
    }


def disband_caravan(state: dict) -> dict:
    """
    Kervanı dağıtır. Malları oyuncunun envanterine geri ekler.
    Sadece 'traveling' durumundaki kervanlar dağıtılabilir.
    """
    ensure_caravan_state(state)
    caravan = state["active_caravan"]
    if caravan is None:
        raise ValueError("Aktif kervan yok.")
    if caravan["status"] not in ("traveling",):
        raise ValueError("Bu kervan artık dağıtılamaz.")

    player = state["player"]
    inv = player.setdefault("inventory", {})

    # Malları geri ekle
    recovered = {}
    for good, gdata in caravan["goods"].items():
        qty = gdata["qty"]
        inv[good] = inv.get(good, 0) + qty
        recovered[good] = qty

    # Nakiti geri al (kısmi kayıp yok — dağıtma ceza değil)
    player["money"] = round(player["money"] + caravan["cash_on_hand"], 1)

    caravan["status"] = "disbanded"
    state["caravan_history"].append(caravan)
    state["active_caravan"] = None

    from simulation import _push_event
    _push_event(state, state.get("turn", 0), "kervan",
                f"{player['name']} kervanını dağıttı. Mallar geri alındı.")

    return {
        "success": True,
        "recovered_goods": recovered,
        "cash_returned": caravan["cash_on_hand"],
    }


# ─── Haftalık Tick (simulation.py'dan çağrılır) ─────────────────────────────

def process_caravan_tick(state: dict) -> Optional[dict]:
    """
    Her ay advance_time() içinden çağrılır.
    Kervanı bir adım ilerletir; saldırı riski ve varış kontrolü yapar.
    Returns: event dict (UI'da gösterilecek bilgi) ya da None.
    """
    ensure_caravan_state(state)
    caravan = state["active_caravan"]
    if caravan is None or caravan["status"] != "traveling":
        return None

    player = state["player"]
    route = caravan["route"]
    total_steps = len(route) - 1

    # Bir adım ilerle
    caravan["current_step"] = min(caravan["current_step"] + 1, total_steps)
    current_step = caravan["current_step"]

    event_result = None

    # ── Saldırı kontrolü (her adımda, varışta değil) ──
    if current_step < total_steps:
        chance = _attack_chance(state, player)
        if random.random() < chance:
            outcome = _attack_outcome(state, player, caravan)
            lost_pct = outcome["lost_pct"]

            # Malları azalt
            total_lost_value = 0.0
            for good in list(caravan["goods"].keys()):
                gdata = caravan["goods"][good]
                lost_qty = max(0, int(gdata["qty"] * lost_pct))
                gdata["qty"] -= lost_qty
                total_lost_value += lost_qty * gdata["buy_price"]
                if gdata["qty"] <= 0:
                    del caravan["goods"][good]

            attack_event = {
                "turn": state.get("turn", 0),
                "step": current_step,
                "outcome": outcome["type"],
                "lost_pct": lost_pct,
                "lost_value": round(total_lost_value, 1),
                "summary": outcome["summary"],
            }
            caravan["attack_events"].append(attack_event)

            current_loc_id = route[current_step]
            loc_name = (_find_location(state, current_loc_id) or {}).get("name", "yolda")

            from simulation import _push_event
            _push_event(state, state.get("turn", 0), "kervan_saldırı",
                        f"Kervan {loc_name} yakınında eşkıyalara uğradı! {outcome['summary']}")

            event_result = {
                "type": "attack",
                "summary": outcome["summary"],
                "lost_value": round(total_lost_value, 1),
            }

            # Tüm mallar gittiyse kervan yıkıldı
            if not caravan["goods"]:
                caravan["status"] = "attacked"
                player["money"] = round(player["money"] + caravan["cash_on_hand"], 1)
                caravan["cash_on_hand"] = 0.0
                state["caravan_history"].append(caravan)
                state["active_caravan"] = None
                event_result["type"] = "caravan_destroyed"
                event_result["summary"] = "Tüm mallar çalındı! Kervan dağıldı."
                return event_result

    # ── Varış kontrolü ──
    if current_step >= total_steps:
        arrival_result = _process_arrival(state, caravan)
        event_result = {"type": "arrived", **arrival_result}

    return event_result


def _process_arrival(state: dict, caravan: dict) -> dict:
    """Kervan hedefe ulaştığında kâr/zarar hesapla, state'i güncelle."""
    player = state["player"]
    destination_id = caravan["destination_id"]
    dest_loc = _find_location(state, destination_id)

    if not dest_loc or not dest_loc.get("market"):
        # Pazar yok — malları envantere geri at
        inv = player.setdefault("inventory", {})
        for good, gdata in caravan["goods"].items():
            inv[good] = inv.get(good, 0) + gdata["qty"]
        caravan["status"] = "arrived"
        caravan["arrived_turn"] = state.get("turn", 0)
        caravan["profit"] = 0.0
        state["caravan_history"].append(caravan)
        state["active_caravan"] = None
        return {"profit": 0.0, "summary": "Hedef pazara ulaşıldı ama pazar bulunamadı. Mallar iade edildi."}

    market = dest_loc["market"]
    total_revenue = 0.0
    total_cost = 0.0
    profit_detail = {}

    from social_reputation import trade_price_multiplier
    sell_mult = trade_price_multiplier(player, "sat")

    for good, gdata in caravan["goods"].items():
        qty = gdata["qty"]
        buy_price = gdata["buy_price"]
        sell_price = market.get(good, {}).get("price", buy_price)
        sell_total = round(sell_price * qty * sell_mult, 1)
        cost_total = round(buy_price * qty, 1)

        revenue = sell_total
        total_revenue += revenue
        total_cost += cost_total

        profit_detail[good] = {
            "qty": qty,
            "buy_price": buy_price,
            "sell_price": round(sell_price * sell_mult, 1),
            "revenue": revenue,
            "cost": cost_total,
            "margin": round(revenue - cost_total, 1),
        }

        # Pazar stoğunu güncelle
        if good in market:
            market[good]["supply"] = min(9999, market[good]["supply"] + qty)
            market[good]["demand"] = max(1, market[good].get("demand", 10) - qty)

        # Stok eklendi → fiyatı yeniden hesapla
        from simulation import _recompute_prices
        _recompute_prices(dest_loc)

    profit = round(total_revenue - total_cost, 1)
    net_cash = round(total_revenue + caravan["cash_on_hand"], 1)

    player["money"] = round(player["money"] + net_cash, 1)

    # Trade skill XP
    from skills import add_skill_xp
    xp_gain = max(1, int(abs(profit) / 20))
    add_skill_xp(player, "trade", xp_gain)

    # İtibar bonusu (büyük kâr)
    if profit > 200:
        player["reputation"] = min(100, player.get("reputation", 0) + 2)

    caravan["profit"] = profit
    caravan["profit_detail"] = profit_detail
    caravan["arrived_turn"] = state.get("turn", 0)
    caravan["status"] = "arrived"
    caravan["cash_on_hand"] = 0.0

    from simulation import _push_event
    emoji = "📈" if profit > 0 else "📉"
    _push_event(state, state.get("turn", 0), "kervan_varış",
                f"Kervan {dest_loc['name']}'e ulaştı. {emoji} Kâr/Zarar: {profit:+.1f} altın.")

    state["caravan_history"].append(caravan)
    state["active_caravan"] = None

    return {
        "profit": profit,
        "total_revenue": round(total_revenue, 1),
        "total_cost": round(total_cost, 1),
        "net_cash_returned": net_cash,
        "profit_detail": profit_detail,
        "summary": f"Kervan hedefe ulaştı! {'Kâr' if profit >= 0 else 'Zarar'}: {profit:+.1f} altın.",
        "destination_name": dest_loc["name"],
    }
