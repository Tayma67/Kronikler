import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { playSfx } from "@/lib/audio";
import { toast } from "sonner";
import {
  Swords, Loader2, RefreshCw, Crown, Handshake, Gift,
  ChevronDown, ChevronUp, ScrollText,
} from "lucide-react";

// ─── Tutum göstergesi ─────────────────────────────────────────────────────────
function AttitudeBadge({ value, allied }) {
  if (allied) return (
    <span className="text-[9px] px-1.5 py-0.5 border border-amber-700 text-amber-300 rounded-sm font-heading tracking-wider">
      🤝 MÜTTEFİK
    </span>
  );
  if (value == null) return null;
  const cfg = value <= -40 ? { label: "Düşman", cls: "border-red-800 text-red-400" }
    : value <= -15 ? { label: "Soğuk", cls: "border-orange-900 text-orange-400" }
    : value < 15 ? { label: "Mesafeli", cls: "border-stone-700 text-stone-400" }
    : value < 40 ? { label: "Sıcak", cls: "border-emerald-900 text-emerald-400" }
    : { label: "Dost", cls: "border-emerald-700 text-emerald-300" };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 border rounded-sm font-heading tracking-wider ${cfg.cls}`}>
      {cfg.label} ({value > 0 ? `+${value}` : value})
    </span>
  );
}

// ─── Hanedan satırı ───────────────────────────────────────────────────────────
function DynastyRow({ row, busy, onOverture, delta }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`card-frame overflow-hidden ${row.oyuncu ? "border border-amber-700/60" : ""} ${row.sonmus ? "opacity-40" : ""}`}>
      <button onClick={() => !row.oyuncu && setOpen(!open)}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left">
        <span className="font-heading text-stone-600 text-sm w-7 flex items-center gap-0.5">
          {row.sira}
          {delta > 0 && <span className="text-emerald-400 text-[10px]">▲</span>}
          {delta < 0 && <span className="text-red-400 text-[10px]">▼</span>}
        </span>
        <span className="text-xl shrink-0">{row.sembol}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-heading text-sm ${row.oyuncu ? "text-amber-300" : "text-stone-100"}`}>
              {row.ad}{row.oyuncu ? " (SEN)" : " Hanedanı"}
            </span>
            {row.sonmus && <span className="text-[9px] text-stone-600 font-heading">SÖNDÜ</span>}
            {!row.oyuncu && !row.sonmus && <AttitudeBadge value={row.tutum} allied={row.ittifak} />}
          </div>
          <div className="text-[10px] text-stone-500 truncate">{row.strateji}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-heading text-amber-200">{row.servet.toLocaleString()} 🪙</div>
          <div className="text-[10px] text-stone-500">
            {row.mulk_sayisi} mülk · itibar {row.itibar} · {row.nesil}. nesil
          </div>
        </div>
        {!row.oyuncu && (open ? <ChevronUp className="w-3.5 h-3.5 text-stone-600" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-600" />)}
      </button>

      {open && !row.oyuncu && (
        <div className="px-4 pb-3 pt-1 border-t border-stone-800 space-y-2">
          <div className="text-[11px] text-stone-500">
            Reis:{" "}
            {row.reis_id
              ? <Link to={`/oyun/npc/${row.reis_id}`} className="text-amber-400">{row.reis_adi}</Link>
              : row.reis_adi}
            {" "}· {row.uye_sayisi} üye
          </div>
          {(row.log || []).length > 0 && (
            <div className="space-y-1">
              <div className="text-[9px] font-heading tracking-[0.2em] text-stone-600 uppercase flex items-center gap-1">
                <ScrollText className="w-2.5 h-2.5" /> Son Hamleler
              </div>
              {row.log.map((l, i) => (
                <div key={i} className="text-[10px] text-stone-400 italic">
                  {1247 + Math.floor(l.hafta / 12)}: {l.text}
                </div>
              ))}
            </div>
          )}
          {!row.sonmus && !row.ittifak && (
            <button disabled={busy} onClick={() => onOverture(row.id)}
              className="w-full mt-1 py-1.5 text-[10px] font-heading tracking-wider border border-amber-900/60 text-amber-300 hover:bg-amber-950/20 rounded-sm flex items-center justify-center gap-1.5">
              <Gift className="w-3 h-3" /> Hediye Konvoyu Gönder (100 altın · tutum +12)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Teklif kartı ─────────────────────────────────────────────────────────────
function OfferCard({ offer, busy, onRespond, turn }) {
  const kalan = Math.max(0, (offer.expires || 0) - (turn || 0));
  return (
    <div className="card-frame p-3.5 border border-purple-900/40 bg-purple-950/10 rise-in">
      <p className="text-xs text-stone-200 leading-relaxed">{offer.text}</p>
      {kalan > 0 && (
        <p className={`text-[10px] mt-1 italic ${kalan <= 3 ? "text-red-400" : "text-stone-500"}`}>
          ⏳ Elçi {kalan} ay daha bekleyecek{kalan <= 3 ? " — sabrı tükeniyor!" : "."}
        </p>
      )}
      <div className="flex gap-1.5 mt-2.5">
        <button disabled={busy} onClick={() => onRespond(offer.id, "kabul")}
          className="flex-1 py-1.5 text-[10px] font-heading tracking-wider border border-emerald-800 text-emerald-300 hover:bg-emerald-950/30 rounded-sm flex items-center justify-center gap-1">
          <Handshake className="w-3 h-3" /> Kabul Et
        </button>
        <button disabled={busy} onClick={() => onRespond(offer.id, "red")}
          className="flex-1 py-1.5 text-[10px] font-heading tracking-wider border border-stone-700 text-stone-400 hover:bg-stone-900 rounded-sm">
          Reddet
        </button>
      </div>
    </div>
  );
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────
export default function Dynasties() {
  const { setState } = useGame();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [rankDelta, setRankDelta] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/game/hanedanlar");
      setData(data);
      // Lig psikolojisi: geçen ziyarete göre sıra değişim okları
      try {
        const onceki = JSON.parse(localStorage.getItem("kronikler_lig") || "{}");
        const simdiki = {}, delta = {};
        for (const r of data.tablo) {
          simdiki[r.id] = r.sira;
          if (onceki[r.id]) delta[r.id] = onceki[r.id] - r.sira; // + = yükseldi
        }
        setRankDelta(delta);
        localStorage.setItem("kronikler_lig", JSON.stringify(simdiki));
      } catch { /* sıra okları süs — asla kırmasın */ }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const respond = async (offerId, karar) => {
    setBusy(true);
    try {
      const { data: res } = await api.post("/game/hanedanlar/teklif", { offer_id: offerId, karar });
      playSfx(karar === "kabul" ? "achievement" : "click");
      toast.success(res.response, { duration: 5000 });
      (res.consequences || []).forEach((c) => toast(c, { duration: 4000 }));
      if (res.state) setState(res.state);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Olmadı.");
    } finally { setBusy(false); }
  };

  const overture = async (dynastyId) => {
    setBusy(true);
    try {
      const { data: res } = await api.post(`/game/hanedanlar/${dynastyId}/yakinlasma`);
      toast.success(res.response, { duration: 5000 });
      if (res.state) setState(res.state);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Olmadı.");
    } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5 rise-in">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="label-tiny">Lig Tablosu</div>
          <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
            <Swords className="w-6 h-6 text-amber-600" /> Rakip Hanedanlar
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Aynı oyunu oynayan altı aile daha var — mülk alıyor, evleniyor, büyüyorlar.
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="btn-ghost-ash px-3 py-1.5 text-xs flex items-center gap-1.5">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Yenile
        </button>
      </div>

      {/* Teklifler */}
      {(data?.teklifler || []).length > 0 && (
        <div className="space-y-2">
          <div className="text-[9px] font-heading tracking-[0.2em] text-purple-400/80 uppercase">
            📜 Kapında Elçiler Var
          </div>
          {data.teklifler.map((o) => (
            <OfferCard key={o.id} offer={o} busy={busy} onRespond={respond} turn={data.turn} />
          ))}
        </div>
      )}

      {/* Tablo */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-stone-600" />
        </div>
      ) : !data ? (
        <div className="card-frame p-10 text-center">
          <Crown className="w-8 h-8 text-stone-700 mx-auto mb-3" />
          <p className="text-stone-500 text-sm font-heading tracking-wider">Hanedanlar henüz sahneye çıkmadı.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.tablo.map((row) => (
            <DynastyRow key={row.id} row={row} busy={busy} onOverture={overture}
              delta={rankDelta[row.id] || 0} />
          ))}
        </div>
      )}

      <p className="text-[10px] text-stone-600 italic">
        Düşman hanedan kuyunu kazar; müttefik hanedan zor günde omuz verir.
        Tutum, reisin sana dair anılarından beslenir — ve nesilden nesle taşınır.
      </p>
    </div>
  );
}
