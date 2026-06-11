"""100 haftalık otomatik denge simülasyonu — GDD v5 Sürekli Kural #4.

Headless dünya kurar, N hafta ilerletir, fiyat/arz/servet eğrilerini CSV'ye
döker ve özet denge raporu basar.

Kullanım (backend/ dizininden):
    python tools/balance_sim.py --weeks 100 --seed 42
Çıktılar: ../test_reports/balance_prices.csv, balance_supply.csv,
          balance_summary.txt
"""
import argparse
import csv
import os
import random
import sys
import statistics

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from world_gen import generate_world, generate_player, GOODS, GOOD_BASE_PRICES
from simulation import advance_time, _ensure_state_fields


def build_state(seed):
    random.seed(seed)
    world = generate_world(n_kingdoms=5, n_cities=8, n_villages=22, n_castles=12, n_npcs=1000)
    player, mother, father = generate_player(world)
    state = {
        "user_id": "balance_sim",
        "turn": 0, "day": 0,
        "world": world, "player": player,
        "relationships": {}, "quests": [], "history": [],
        "family_quests": [],
    }
    _ensure_state_fields(state)
    # Oyuncu pasif gözlemci: açlık gürültüsünü kapat
    state["player"]["inventory"] = {"ekmek": 10000}
    try:
        from faction_system import init_factions_for_world
        init_factions_for_world(state, 0)
    except Exception as e:
        print(f"  ! faction init atlandı: {e}")
    return state


def avg_price(state, good):
    prices = [l["market"][good]["price"] for l in state["world"]["locations"]
              if good in l.get("market", {})]
    return round(statistics.mean(prices), 2) if prices else 0.0


def total_supply(state, good):
    return sum(l["market"][good]["supply"] for l in state["world"]["locations"]
               if good in l.get("market", {}))


def run(weeks, seed, out_dir):
    state = build_state(seed)
    os.makedirs(out_dir, exist_ok=True)

    price_rows, supply_rows = [], []
    famine_weeks = 0
    starved_weeks = 0

    for w in range(1, weeks + 1):
        hist_before = len(state["history"])
        advance_time(state, weeks=1)
        new_events = state["history"][hist_before:]
        week_famines = sum(1 for e in new_events if e["type"] == "kıtlık_etkisi")
        week_starved = sum(1 for e in new_events if e["type"] == "zanaat_durgun")
        if week_famines:
            famine_weeks += 1
        if week_starved:
            starved_weeks += 1

        prow = {"week": w}
        srow = {"week": w}
        for g in GOODS:
            prow[g] = avg_price(state, g)
            srow[g] = total_supply(state, g)
        prow["famine_events"] = week_famines
        srow["avg_wealth"] = round(statistics.mean(
            [l["wealth"] for l in state["world"]["locations"]]), 1)
        price_rows.append(prow)
        supply_rows.append(srow)

        if w % 20 == 0:
            alive = sum(1 for n in state["world"]["npcs"] if n.get("alive"))
            print(f"  hafta {w}: canlı NPC={alive}, "
                  f"buğday={prow['buğday']}a, ekmek={prow['ekmek']}a, "
                  f"silah={prow['silah']}a, kıtlık_olayı={week_famines}")

    # ── CSV yaz ──
    for fname, rows in [("balance_prices.csv", price_rows),
                        ("balance_supply.csv", supply_rows)]:
        path = os.path.join(out_dir, fname)
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        print(f"  yazıldı: {path}")

    # ── Özet rapor ──
    lines = [f"DENGE RAPORU — {weeks} hafta, seed={seed}", "=" * 60]
    problems = []
    last_quarter = price_rows[-max(1, weeks // 4):]
    for g in GOODS:
        base = GOOD_BASE_PRICES[g]
        avg_p = statistics.mean(r[g] for r in last_quarter)
        ratio = avg_p / base
        supply_end = supply_rows[-1][g]
        flag = ""
        if ratio > 2.5:
            flag = " ⚠ KRONİK KITLIK (fiyat tavana yapışık)"
            problems.append(g)
        elif ratio < 0.45:
            flag = " ⚠ AŞIRI ARZ (fiyat tabana yapışık)"
            problems.append(g)
        lines.append(f"{g:16s} baz={base:>5.1f}  son_çeyrek_ort={avg_p:>7.2f}  "
                     f"oran={ratio:>4.2f}  son_arz={supply_end:>6d}{flag}")
    famine_rate = famine_weeks / weeks
    starve_rate = starved_weeks / weeks
    lines.append("-" * 60)
    lines.append(f"Kıtlık olayı görülen hafta oranı: {famine_rate:.0%} (hedef < %15)")
    lines.append(f"Zanaat durgunluğu görülen hafta oranı: {starve_rate:.0%}")
    lines.append(f"Sorunlu mal sayısı: {len(problems)} → {', '.join(problems) or 'yok'}")
    report = "\n".join(lines)
    print("\n" + report)
    with open(os.path.join(out_dir, "balance_summary.txt"), "w", encoding="utf-8") as f:
        f.write(report + "\n")
    return len(problems), famine_rate


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", type=int, default=100)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default=os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "test_reports"))
    args = ap.parse_args()
    run(args.weeks, args.seed, args.out)
