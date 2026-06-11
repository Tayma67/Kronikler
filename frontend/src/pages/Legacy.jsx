import { useEffect, useState, useCallback } from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { useGame } from "@/lib/GameContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Crown, Loader2, Scroll, Heart, GraduationCap, Castle,
  TrendingUp, Baby, MapPin, Coins,
} from "lucide-react";

const WILL_STYLES = [
  { id: "eşit", label: "Eşit Pay", desc: "Her çocuğa eşit; küslük çıkmaz. (%60 para mirası)" },
  { id: "tek_varis", label: "Tek Varis", desc: "Servet bölünmez ama kardeşler küser. (%75)" },
  { id: "hayır", label: "Hayır İşleri", desc: "Adın dualarla anılır: +15 itibar yeni nesle. (%40)" },
];

function Section({ icon: Icon, title, children }) {
  return (
    <div className="border border-stone-800 rounded-sm p-3.5 space-y-2.5">
      <h2 className="text-xs font-heading tracking-widest text-stone-500 uppercase flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-orange-500/80" /> {title}
      </h2>
      {children}
    </div>
  );
}

export default function Legacy() {
  const { setState, setLastActionPage } = useGame();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [settlementName, setSettlementName] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/legacy/overview");
      setData(data);
    } catch (e) {
      toast.error(extractErrorMessage(e));
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const act = async (fn, msg) => {
    setBusy(true);
    try {
      const res = await fn();
      if (msg) toast.success(msg);
      if (res?.state) setState(res.state);
      await refresh();
      return res;
    } catch (e) {
      toast.error(extractErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-stone-600" />
      </div>
    );
  }

  const throneReqs = Object.entries(data.throne).filter(([k]) => k !== "already_king");
  const throneReady = throneReqs.every(([, v]) => v.ok);

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-4" data-testid="legacy-page">
      <h1 className="text-lg font-heading text-stone-200 flex items-center gap-2">
        <Crown className="w-4 h-4 text-amber-500" /> Hanedan
      </h1>

      {/* Hanedan puanı */}
      <div className="border border-amber-900/40 bg-amber-950/10 rounded-sm p-4 text-center space-y-1">
        <div className="text-2xl font-heading text-amber-300">{data.dynasty.score}</div>
        <div className="text-xs text-stone-300">{data.dynasty.title}</div>
        <div className="text-[10px] text-stone-500">{data.dynasty.generation}. nesil</div>
        {data.dynasty.log.length > 0 && (
          <div className="text-left pt-2 space-y-0.5 border-t border-stone-800/50 mt-2">
            {data.dynasty.log.slice(0, 5).map((l, i) => (
              <div key={i} className="flex justify-between text-[10px] text-stone-500">
                <span>{l.reason}</span>
                <span className={l.pts > 0 ? "text-emerald-500" : "text-red-500"}>
                  {l.pts > 0 ? "+" : ""}{l.pts}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Eş ilişkisi */}
      {data.spouse && (
        <Section icon={Heart} title="Evlilik">
          <div className="flex items-center justify-between text-xs">
            <span className="text-stone-300">{data.spouse.name}</span>
            <span className={data.spouse.relationship > 40 ? "text-emerald-400"
              : data.spouse.relationship > 20 ? "text-amber-400" : "text-red-400"}>
              İlişki: {data.spouse.relationship}
            </span>
          </div>
          {data.spouse.relationship <= 25 && (
            <p className="text-[10px] text-red-400/80">
              ⚠ Evlilik soğuyor — iltifat et, hediye ver, vakit geçir.
            </p>
          )}
        </Section>
      )}

      {/* Çocuk yatırımları */}
      {data.children.length > 0 && (
        <Section icon={GraduationCap} title="Çocuk Eğitimi">
          <p className="text-[10px] text-stone-500">
            Eğitim yönü seç; haftalık masraf işler, nesil geçişinde başlangıç bonusu olur.
          </p>
          {data.children.map((c) => (
            <div key={c.id} className="border border-stone-800/50 rounded-sm p-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-200 flex items-center gap-1">
                  <Baby className="w-3 h-3 text-stone-500" /> {c.name} ({c.age})
                </span>
                {c.track && (
                  <span className="text-[10px] text-emerald-400">
                    {data.tracks[c.track]?.label} · {c.weeks} hafta
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(data.tracks).map(([key, t]) => (
                  <button key={key} disabled={busy}
                    onClick={() => act(async () =>
                      (await api.post("/legacy/child-invest",
                        { child_id: c.id, track: c.track === key ? null : key })).data)}
                    className={`text-[9px] px-1.5 py-0.5 rounded-sm border ${
                      c.track === key
                        ? "border-emerald-800 text-emerald-300 bg-stone-900"
                        : "border-stone-800 text-stone-500"}`}>
                    {t.label} ({t.weekly_cost}a/h)
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* Vasiyet */}
      <Section icon={Scroll} title="Vasiyet">
        <p className="text-[10px] text-stone-500">
          Mirasın nasıl bölüneceğini şimdiden belirle — nesil geçişini şekillendirir.
        </p>
        <div className="space-y-1.5">
          {WILL_STYLES.map((w) => (
            <button key={w.id} disabled={busy}
              onClick={() => act(async () =>
                (await api.post("/legacy/will", { style: w.id })).data, "Vasiyet güncellendi.")}
              className={`w-full text-left px-3 py-2 rounded-sm border ${
                data.will.style === w.id
                  ? "border-amber-800 bg-stone-900"
                  : "border-stone-800 hover:border-stone-700"}`}>
              <div className="text-xs text-stone-200">{w.label}
                {data.will.style === w.id && <span className="text-amber-400 ml-2">✓</span>}
              </div>
              <div className="text-[10px] text-stone-500">{w.desc}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* Taht iddiası */}
      <Section icon={Crown} title="Taht Yolu">
        {data.throne.already_king ? (
          <p className="text-xs text-amber-300">👑 Tahttasın. Hükmün sürsün!</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              {throneReqs.map(([key, v]) => (
                <div key={key} className={`text-[10px] flex justify-between border rounded-sm px-2 py-1 ${
                  v.ok ? "border-emerald-900/50 text-emerald-400" : "border-stone-800 text-stone-500"}`}>
                  <span>{{ age: "Yaş", reputation: "İtibar", fame: "Ün", money: "Altın" }[key]}</span>
                  <span>{v.have}/{v.need}</span>
                </div>
              ))}
            </div>
            <button disabled={busy || !throneReady}
              onClick={() => {
                if (window.confirm("Taht iddiası tehlikelidir: kampanya 3000 altın; başarısızlık sürgün ve itibar kaybı demek. Devam?"))
                  act(async () => {
                    const res = (await api.post("/legacy/claim-throne")).data;
                    res.result.outcome === "zafer"
                      ? toast.success("TAHT SENİN! 👑")
                      : toast.error("İddia bastırıldı...");
                    setLastActionPage({ path: "/oyun/hanedan", label: "Hanedan" });
                    navigate("/oyun");
                    return res;
                  });
              }}
              className={`w-full py-2 rounded-sm text-xs font-heading border ${
                throneReady
                  ? "border-amber-700 text-amber-300 hover:bg-stone-900"
                  : "border-stone-800 text-stone-600 cursor-not-allowed"}`}>
              Taht İddiasında Bulun
            </button>
          </>
        )}
      </Section>

      {/* Şehir kurma */}
      <Section icon={Castle} title="Yerleşim Kur">
        <p className="text-[10px] text-stone-500">
          {data.settlement_cost} altına kendi köyünü kur: haritada senin adınla yaşar,
          kurucu konağı hediye. (Yaş 25+)
        </p>
        <div className="flex gap-2">
          <input value={settlementName} onChange={(e) => setSettlementName(e.target.value)}
            placeholder="Yerleşim adı..."
            className="flex-1 bg-stone-950 border border-stone-800 rounded-sm px-2 py-1.5 text-xs text-stone-200 placeholder:text-stone-600" />
          <button disabled={busy || data.money < data.settlement_cost || settlementName.trim().length < 3}
            onClick={() => act(async () => {
              const res = (await api.post("/legacy/found", { name: settlementName })).data;
              toast.success("Yerleşim kuruldu! 🏘");
              if (res.state) setState(res.state);
              setLastActionPage({ path: "/oyun/hanedan", label: "Hanedan" });
              navigate("/oyun");
              return res;
            })}
            className={`px-3 py-1.5 rounded-sm text-xs font-heading border flex items-center gap-1 ${
              data.money >= data.settlement_cost && settlementName.trim().length >= 3
                ? "border-orange-800 text-orange-400 hover:bg-stone-900"
                : "border-stone-800 text-stone-600 cursor-not-allowed"}`}>
            <MapPin className="w-3 h-3" /> Kur
          </button>
        </div>
        <p className="text-[10px] text-stone-600 flex items-center gap-1">
          <Coins className="w-3 h-3" /> Keseniz: {Math.round(data.money)}a
        </p>
      </Section>

      {/* Nesil geçmişi */}
      {data.legacy_history.length > 0 && (
        <Section icon={TrendingUp} title="Nesil Geçmişi">
          {data.legacy_history.map((h, i) => (
            <div key={i} className="flex justify-between text-[10px] text-stone-500">
              <span>{h.generation}. nesil — {h.previous_name}</span>
              <span>{h.origin} · {Math.round(h.inherited_money)}a miras</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
