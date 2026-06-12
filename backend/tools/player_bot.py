"""Oyuncu-bot: oyunu GERÇEK HTTP rotaları üzerinden, bir oyuncu gibi oynar.

mongomock-motor ile DB'siz çalışır. Amaç: çökme, 500, tutarsız state,
saçma sayılar ve boş yüzeyleri yakalamak. Çalıştır:

    cd backend && python tools/player_bot.py [hafta_sayisi]
"""
import os
import random
import sys
import json

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("MONGO_URL", "mongodb://mock")
os.environ.setdefault("DB_NAME", "kronikler_bot")
os.environ.setdefault("JWT_SECRET", "bot-secret")

from mongomock_motor import AsyncMongoMockClient
import motor.motor_asyncio
motor.motor_asyncio.AsyncIOMotorClient = lambda *a, **k: AsyncMongoMockClient()

import server  # noqa: E402  (motor patch'inden SONRA)
from fastapi.testclient import TestClient  # noqa: E402

random.seed(int(os.environ.get("BOT_SEED", "42")))

PROBLEMS = []          # (önem, etiket, detay)
ACTIONS = {"ok": 0, "guard": 0, "fail": 0}
TAG_STATS = {}         # tag -> {"ok": n, "guard": n}


def tag_count(tag, kind):
    t = TAG_STATS.setdefault(tag.split("?")[0], {"ok": 0, "guard": 0})
    t[kind] += 1


def problem(onem, etiket, detay):
    PROBLEMS.append((onem, etiket, str(detay)[:300]))


class Bot:
    def __init__(self):
        self.c = TestClient(server.app, raise_server_exceptions=False)
        self.token = None
        self.state = None
        self.week_log = []

    DEVICE_ID = "bot-device-0001"

    # ── HTTP yardımcıları ─────────────────────────────────────────────────
    def req(self, method, path, json_body=None, expect_guard_ok=True, tag=None):
        # Frontend gibi: her istekte X-Device-ID (oyun kimliği budur)
        h = {"X-Device-ID": self.DEVICE_ID, "X-Save-Slot": "1", "X-Lang": "tr"}
        if self.token:
            h["Authorization"] = f"Bearer {self.token}"
        r = self.c.request(method, path, json=json_body, headers=h)
        tag = tag or f"{method} {path}"
        if r.status_code >= 500:
            ACTIONS["fail"] += 1
            problem("KRİTİK", tag, f"HTTP {r.status_code}: {r.text[:200]}")
            return None
        if r.status_code >= 400:
            # 400'ler çoğu zaman oyun kuralı (para yok vs) — guard sayılır
            ACTIONS["guard"] += 1
            tag_count(tag, "guard")
            if not expect_guard_ok:
                problem("ORTA", tag, f"HTTP {r.status_code}: {r.text[:160]}")
            return None
        ACTIONS["ok"] += 1
        tag_count(tag, "ok")
        try:
            data = r.json()
        except Exception:
            problem("KRİTİK", tag, "JSON parse edilemedi")
            return None
        # Para izi: hangi istek parayı eksiye düşürdü?
        if os.environ.get("BOT_MONEY_TRACE") and self.token is not None:
            sr = self.c.get("/api/game/state",
                            headers={"X-Device-ID": self.DEVICE_ID})
            if sr.status_code == 200:
                m = sr.json().get("player", {}).get("money")
                last = getattr(self, "_last_money", None)
                if m is not None and m < -0.01 and (last is None or last >= 0):
                    problem("KRİTİK", "PARA NEGATİFE DÜŞTÜ",
                            f"{tag} sonrası: {last} → {m}")
                    print(f"  💸 NEGATİF: {tag} | {last} → {m}", flush=True)
                self._last_money = m
        return data

    def get(self, path, **kw):
        return self.req("GET", path, **kw)

    def post(self, path, body=None, **kw):
        return self.req("POST", path, json_body=body or {}, **kw)

    # ── Oturum ────────────────────────────────────────────────────────────
    def boot(self):
        r = self.post("/api/auth/register",
                      {"email": "bot@example.com", "password": "botpass1",
                       "name": "Bot Oyuncu"}, expect_guard_ok=False)
        assert r and r.get("token"), "register başarısız — auth router mount?"
        self.token = r["token"]
        me = self.get("/api/auth/me", expect_guard_ok=False)
        assert me and me.get("email") == "bot@example.com"
        r = self.post("/api/game/new",
                      {"first_name": "Kael", "surname": "Botoğlu",
                       "gender": "erkek"}, expect_guard_ok=False)
        assert r, "new game başarısız"
        self.state = r

    def refresh(self):
        s = self.get("/api/game/state", expect_guard_ok=False)
        if s:
            self.state = s
        return self.state

    # ── Sağlık kontrolleri (debugger şapkası) ────────────────────────────
    def invariants(self, week):
        s = self.state
        if not s:
            return
        p = s.get("player", {})
        def bad(msg):
            problem("KRİTİK", f"invariant (hafta {week})", msg)
        if p.get("money") is None or (isinstance(p["money"], float) and p["money"] != p["money"]):
            bad(f"money NaN/None: {p.get('money')}")
        if p.get("money", 0) < -0.01:
            bad(f"money negatif: {p['money']}")
        if not (0 <= p.get("health", 0) <= 100):
            bad(f"health aralık dışı: {p.get('health')}")
        if p.get("age", 0) > 110:
            bad(f"yaş saçma: {p.get('age')}")
        try:
            json.dumps(s, default=str)
        except Exception as e:
            bad(f"state JSON'lanamadı: {e}")

    # ── Haftalık oyun döngüsü ────────────────────────────────────────────
    def play_week(self, week):
        s = self.refresh()
        if not s:
            return
        p = s["player"]
        age = p.get("age", 0)

        # Çocukluğu hızlı sar: haftaların %70'inde sadece ilerle (4 hafta)
        if age < 13 and random.random() < 0.7:
            pend = s.get("pending_life_event")
            if pend:
                ci = random.randrange(len(pend.get("choices", [{}])))
                self.post("/api/game/life-event/choose",
                          {"event_id": pend["id"], "choice_index": ci},
                          tag="life-event/choose")
            adv = self.post("/api/game/advance?weeks=4", {}, tag="advance",
                            expect_guard_ok=False)
            self.state = adv.get("state", adv) if adv else self.state
            self.invariants(week)
            return

        # Bekleyen life event'i çöz (rastgele seçim — oyuncu gibi)
        pend = s.get("pending_life_event")
        if pend:
            ci = random.randrange(len(pend.get("choices", [{}])))
            self.post("/api/game/life-event/choose",
                      {"event_id": pend["id"], "choice_index": ci},
                      expect_guard_ok=False, tag="life-event/choose")

        # Hafta planı (yetişkinse çeşitlendir)
        if random.random() < 0.5:
            plani = self.get("/api/game/hafta-plani")
            if plani and plani.get("options"):
                pass  # opsiyon şeması neyse onu kullan
        # Sosyal: yakındaki bir NPC ile sohbet eli
        npcs = [n for n in s["world"]["npcs"]
                if n.get("alive") and n.get("location_id") == p.get("location_id")]
        if npcs and random.random() < 0.7:
            npc = random.choice(npcs)
            hand = self.get(f"/api/game/npc/{npc['id']}/cards", tag="npc/cards")
            if hand and hand.get("cards"):
                card = random.choice(hand["cards"])
                self.post(f"/api/game/npc/{npc['id']}/card",
                          {"card_id": card["id"]}, tag="npc/card")
                # Amaç açıldıysa bazen yardım et / sömür
                if hand.get("amac_eylem") and random.random() < 0.5:
                    eylem = random.choice(["yardim", "somur"])
                    self.post(f"/api/game/npc/{npc['id']}/amac",
                              {"eylem": eylem}, tag="npc/amac")

        # Karın doyur — gerçek oyuncu gibi: para varsa ekmek al
        inv = p.get("inventory", {}) or {}
        yiyecek = sum(q for g, q in inv.items() if g in ("ekmek", "et", "balık", "elma"))
        if yiyecek < 3 and p.get("money", 0) > 10:
            self.post("/api/game/trade", {"good": "ekmek", "qty": 3, "action": "al"},
                      tag="trade(ekmek)")

        # Çocuk: mektep (lessons dict ya da list olabilir — ikisini de taşı)
        if age < 13 and random.random() < 0.5:
            okul = self.get("/api/game/school", tag="school")
            lessons = (okul or {}).get("lessons") or {}
            lids = (list(lessons.keys()) if isinstance(lessons, dict)
                    else [l.get("id") for l in lessons if l.get("id")])
            if lids:
                lid = random.choice(lids)
                r = self.post(f"/api/game/school/lesson/{lid}", tag="school/lesson")
                if r and (r.get("result") or {}).get("needs_event_choice"):
                    self.post(f"/api/game/school/lesson/{lid}/choice",
                              {"choice_index": 0}, tag="school/choice")

        # Stat puanı dağıt
        if p.get("stat_points", 0) > 0:
            self.post("/api/game/stat/allocate",
                      {"stat": random.choice(["strength", "intelligence",
                                              "charisma", "stamina"])},
                      tag="stat/allocate")

        # Meslek edin (yetişkin ve işsizse)
        if age >= 13 and p.get("profession") in (None, "", "işsiz", "çocuk"):
            jl = self.get("/api/game/jobs", tag="jobs")
            for j in (jl or {}).get("jobs", [])[:6]:
                if self.post("/api/game/job", {"profession": j.get("job")},
                             tag="job"):
                    break

        # Yetişkin eylemleri
        if age >= 13 and random.random() < 0.5:
            secim = random.random()
            if secim < 0.25:   # ticaret + pazarlık
                loc = next((l for l in s["world"]["locations"]
                            if l["id"] == p["location_id"]), None)
                market = (loc or {}).get("market") or {}
                if market:
                    good = random.choice(list(market.keys()))
                    b = self.post("/api/game/bargain/start",
                                  {"good": good, "qty": 1, "action": "al"},
                                  tag="bargain/start")
                    if b:
                        self.post("/api/game/bargain/move",
                                  {"move": random.choice(["kabul", "karsi", "blof"])},
                                  tag="bargain/move")
                    self.post("/api/game/trade",
                              {"good": good, "qty": 1, "action": "al"},
                              tag="trade")
            elif secim < 0.45:  # iş
                w = self.post("/api/game/work", {}, tag="work")
                if w and w.get("needs_resolve"):
                    self.post("/api/game/work/resolve",
                              {"choice": 0}, tag="work/resolve")
            elif secim < 0.6 and age >= 16:  # suç
                cj = self.get("/api/game/crime/jobs")
                if cj and cj.get("jobs"):
                    j = random.choice(cj["jobs"])
                    self.post("/api/game/crime/execute", {"job_id": j["id"]},
                              tag="crime/execute")
                    self.post("/api/game/crime/resolve", {"choice": 0},
                              tag="crime/resolve")
            elif secim < 0.7:  # sosyal jest / evlilik yolu
                rels = s.get("relationships", {})
                if not p.get("spouse_id") and age >= 16:
                    # En sıcak bekâr NPC'ye flört/evlilik dene
                    aday = next((n for n in sorted(
                        npcs, key=lambda x: -rels.get(x["id"], 0))
                        if not n.get("spouse_id") and n.get("age", 0) >= 18), None)
                    if aday:
                        durum = (p.get("relationship_status") or {}).get(aday["id"])
                        if durum == "dating" and rels.get(aday["id"], 0) >= 50:
                            self.post(f"/api/game/npc/{aday['id']}/propose",
                                      tag="propose")
                        elif rels.get(aday["id"], 0) >= 20:
                            self.post(f"/api/game/npc/{aday['id']}/flirt",
                                      tag="flirt")
                        else:
                            self.post(f"/api/game/npc/{aday['id']}/compliment",
                                      tag="compliment")
                elif npcs:
                    npc = random.choice(npcs)
                    self.post(f"/api/game/npc/{npc['id']}/compliment",
                              tag="compliment")
            elif secim < 0.8 and p.get("money", 0) > 60:  # hanedan
                lt = self.get("/api/game/hanedanlar", tag="hanedanlar")
                if lt:
                    for o in lt.get("teklifler", []):
                        self.post("/api/game/hanedanlar/teklif",
                                  {"offer_id": o["id"],
                                   "karar": random.choice(["kabul", "red"])},
                                  tag="hanedan/teklif")
                    dlr = [r for r in lt.get("tablo", []) if not r.get("oyuncu")
                           and not r.get("sonmus")]
                    if dlr and random.random() < 0.4:
                        d = random.choice(dlr)
                        self.post(f"/api/game/hanedanlar/{d['id']}/yakinlasma",
                                  tag="hanedan/yakinlasma")
            elif secim < 0.9 and age >= 16:  # savaş
                opts = self.get("/api/combat/options", tag="combat/options")
                acik = [t for t in (opts or {}).get("types", [])
                        if not t.get("locked")]
                if acik and p.get("health", 0) > 50:
                    bt = random.choice(acik)
                    r = self.post("/api/combat/start",
                                  {"type": bt["id"], "bet": 0},
                                  tag="combat/start")
                    view = (r or {}).get("combat")
                    tur = 0
                    while view and tur < 24:
                        tur += 1
                        if view.get("phase") == "stance":
                            r = self.post("/api/combat/stance",
                                          {"stance": random.choice(
                                              list(view.get("stances", {"dengeli": 1})))},
                                          tag="combat/stance")
                        else:
                            kartlar = [c["id"] for c in view.get("cards", [])
                                       if not c.get("locked")] or ["saldir"]
                            r = self.post("/api/combat/card",
                                          {"card": random.choice(kartlar)},
                                          tag="combat/card")
                        if not r:
                            break
                        if "result" in r:        # savaş bitti
                            break
                        view = r.get("combat")
            else:  # mülk
                cat = self.get("/api/property/catalog", tag="property/catalog")
                if cat and p.get("money", 0) > 900:
                    self.post("/api/property/buy",
                              {"type": "tarla", "location_id": p["location_id"]},
                              tag="property/buy")

        # Nam & söylenti yüzeyi
        if random.random() < 0.25:
            nam = self.get("/api/game/nam", tag="nam")
            if nam and nam.get("soylentiler") and random.random() < 0.6:
                r0 = nam["soylentiler"][0]
                self.post("/api/game/nam/eylem",
                          {"rumor_id": r0["id"],
                           "eylem": random.choice(["yuzles", "sustur", "yay"])},
                          tag="nam/eylem")

        # Yüzey okumaları (oyuncunun açtığı sayfalar) — 500 avı
        for path in ("/api/game/yonetmen", "/api/game/rumors",
                     "/api/game/chronicle/summary", "/api/game/social",
                     "/api/game/world-news", "/api/game/opportunities",
                     "/api/story/journal", "/api/game/family-quests"):
            if random.random() < 0.15:
                self.get(path, tag=path)

        # Haftayı ilerlet
        adv = self.post("/api/game/advance", {"weeks": 1}, tag="advance",
                        expect_guard_ok=False)
        if adv is None:
            problem("KRİTİK", f"advance (hafta {week})", "ilerleme başarısız")
        self.state = adv.get("state", adv) if adv else self.state
        self.invariants(week)

    # ── Ölüm / nesil ─────────────────────────────────────────────────────
    def handle_death(self):
        s = self.refresh()
        if not s or not s["player"].get("dead"):
            return False
        opts = self.get("/api/game/inheritance/options", tag="inheritance/options")
        body = {}
        if opts and opts.get("options"):
            body = {"child_id": opts["options"][0].get("id")}
        r = self.post("/api/game/inheritance/begin", body,
                      tag="inheritance/begin", expect_guard_ok=False)
        if r:
            print(f"  ☠ Nesil devri! Yeni oyuncu: "
                  f"{(r.get('state') or r).get('player', {}).get('name')}")
            return True
        return False


def main(weeks=120):
    bot = Bot()
    bot.boot()
    print(f"Bot başladı: {bot.state['player']['name']}, "
          f"yaş {bot.state['player']['age']}")
    for week in range(1, weeks + 1):
        try:
            bot.play_week(week)
        except Exception as e:
            import traceback
            problem("KRİTİK", f"bot crash (hafta {week})",
                    traceback.format_exc()[-300:])
            break
        if bot.state and bot.state.get("player", {}).get("dead"):
            if not bot.handle_death():
                break
        if week % 20 == 0:
            p = bot.state.get("player", {})
            print(f"  hafta {week}: yaş {p.get('age')} | {p.get('money')} altın "
                  f"| sağlık {p.get('health')} | itibar {p.get('reputation')}")

    print("\n══════ RAPOR ══════")
    print(f"İstekler: {ACTIONS['ok']} OK · {ACTIONS['guard']} kural-engeli "
          f"· {ACTIONS['fail']} HATA")
    print("Kapsam (tag: ok/guard):")
    for tag, t in sorted(TAG_STATS.items()):
        print(f"  {tag}: {t['ok']}/{t['guard']}")
    if not PROBLEMS:
        print("Sorun bulunamadı.")
    onem_sira = {"KRİTİK": 0, "ORTA": 1, "DÜŞÜK": 2}
    seen = set()
    for onem, etiket, detay in sorted(PROBLEMS, key=lambda x: onem_sira.get(x[0], 3)):
        key = (onem, etiket, detay[:80])
        if key in seen:
            continue
        seen.add(key)
        print(f"[{onem}] {etiket}\n    {detay}")
    return 1 if any(p[0] == "KRİTİK" for p in PROBLEMS) else 0


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 120
    sys.exit(main(n))
