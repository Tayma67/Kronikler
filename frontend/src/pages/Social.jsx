import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { Loader2, Star, Shield, Eye, Flame, ShoppingBag, TrendingUp, TrendingDown } from "lucide-react";

// ─── Stat bar ─────────────────────────────────────────────────────────────────
function StatBar({ value, max = 100, colorClass = "stat-bar-fill" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="stat-bar mt-1">
      <div className={colorClass} style={{ width: `${pct}%`, height: "100%" }} />
    </div>
  );
}

// ─── Büyük stat kartı ─────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, max = 100, colorClass, badgeLabel, badgeColor, description }) {
  return (
    <div className="card-frame p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colorClass}`} />
          <span className="label-tiny">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] px-1.5 py-0.5 border rounded-sm font-heading tracking-wider ${badgeColor}`}>
            {badgeLabel}
          </span>
          <span className={`font-heading text-lg ${colorClass}`}>{Math.round(value)}</span>
        </div>
      </div>
      <StatBar value={value} max={max} colorClass={colorClass === "text-amber-400" ? "stat-bar-fill" : colorClass === "text-emerald-400" ? "stat-bar-fill-good" : colorClass === "text-red-400" ? "stat-bar-fill-bad" : "stat-bar-fill-cool"} />
      <p className="text-xs text-stone-500">{description}</p>
    </div>
  );
}

// ─── Etiket hesaplamaları ─────────────────────────────────────────────────────
function repInfo(rep) {
  if (rep >= 60) return { label: "Efsanevi", color: "border-amber-700 text-amber-400" };
  if (rep >= 30) return { label: "Saygın", color: "border-emerald-700 text-emerald-400" };
  if (rep >= 10) return { label: "Bilinen", color: "border-sky-700 text-sky-400" };
  if (rep >= -10) return { label: "Sıradan", color: "border-stone-600 text-stone-400" };
  if (rep >= -30) return { label: "Şüpheli", color: "border-orange-700 text-orange-400" };
  return { label: "Kötü Şöhret", color: "border-red-700 text-red-400" };
}

function honorInfo(hon) {
  if (hon >= 70) return { label: "Onurlu", color: "border-emerald-700 text-emerald-400" };
  if (hon >= 40) return { label: "Dürüst", color: "border-sky-700 text-sky-400" };
  if (hon >= 15) return { label: "Bilindik", color: "border-stone-600 text-stone-400" };
  return { label: "Şerefsiz", color: "border-red-700 text-red-400" };
}

function fearInfo(fear) {
  if (fear >= 60) return { label: "Dehşet", color: "border-red-700 text-red-400" };
  if (fear >= 35) return { label: "Ürkütücü", color: "border-orange-700 text-orange-400" };
  if (fear >= 15) return { label: "Dikkat Çeken", color: "border-stone-600 text-stone-400" };
  return { label: "Zararsız", color: "border-stone-700 text-stone-500" };
}

function fameInfo(fame) {
  if (fame >= 60) return { label: "Ünlü", color: "border-violet-700 text-violet-400" };
  if (fame >= 30) return { label: "Tanınan", color: "border-purple-700 text-purple-400" };
  if (fame >= 10) return { label: "Duyulan", color: "border-stone-600 text-stone-400" };
  return { label: "Anonim", color: "border-stone-700 text-stone-500" };
}

// ─── Ticaret çarpanı göstergesi ───────────────────────────────────────────────
function TradeRow({ label, mult, type }) {
  const discount = type === "buy" ? 1 - mult : mult - 1;
  const isGood = type === "buy" ? mult < 1 : mult > 1;
  const pct = Math.abs(Math.round(discount * 100));
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-stone-800/50 last:border-0">
      <span className="text-stone-400">{label}</span>
      <div className="flex items-center gap-1.5">
        {pct > 0 ? (
          <>
            {isGood ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400" />}
            <span className={isGood ? "text-emerald-400" : "text-red-400"}>
              {isGood ? "-" : "+"}{pct}%
            </span>
          </>
        ) : (
          <span className="text-stone-500">Standart</span>
        )}
        <span className="text-stone-600 text-xs">(×{mult.toFixed(2)})</span>
      </div>
    </div>
  );
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────
export default function Social() {
  const { state } = useGame();
  const [social, setSocial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/game/social")
      .then(({ data }) => setSocial(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [state?.turn]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-stone-600" />
    </div>
  );

  const player = state?.player || {};
  const rep   = social?.reputation  ?? player.reputation  ?? 0;
  const honor = social?.honor       ?? player.honor       ?? 0;
  const fear  = social?.fear        ?? player.fear        ?? 0;
  const fame  = social?.fame        ?? player.fame        ?? 0;
  const buyMult  = social?.trade_buy_mult  ?? 1;
  const sellMult = social?.trade_sell_mult ?? 1;
  const atkRisk  = social?.attack_risk     ?? 0.05;

  const ri = repInfo(rep);
  const hi = honorInfo(honor);
  const fi = fearInfo(fear);
  const fai = fameInfo(fame);

  return (
    <div className="space-y-5 rise-in">
      {/* Başlık */}
      <div>
        <div className="label-tiny">Toplumdaki Yer</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <Star className="w-6 h-6 text-amber-600" /> Sosyal Statü
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          Adın nasıl anılıyor, senden nasıl çekiniyorlar.
        </p>
      </div>

      {/* Unvan */}
      <div className="card-frame p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="label-tiny mb-1">Genel Unvan</div>
          <div className={`font-heading text-2xl ${ri.color.replace("border-", "text-").replace("/", "")}`}>
            {ri.label}
          </div>
          <p className="text-stone-500 text-xs mt-0.5">İtibar değerine göre toplumsal konumun</p>
        </div>
        <div className="text-right">
          <div className="label-tiny mb-1">İtibar</div>
          <div className="font-heading text-3xl text-stone-100">{rep > 0 ? `+${rep}` : rep}</div>
        </div>
      </div>

      {/* 4 ana stat */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          icon={Shield}
          label="İtibar"
          value={rep}
          max={100}
          colorClass="text-amber-400"
          badgeLabel={ri.label}
          badgeColor={ri.color}
          description="NPC'lerin sana güvenini ve saygısını belirler. Yüksek itibar fiyatları etkiler."
        />
        <StatCard
          icon={Star}
          label="Şeref"
          value={honor}
          max={100}
          colorClass="text-emerald-400"
          badgeLabel={hi.label}
          badgeColor={hi.color}
          description="Verdiğin sözlere, dürüstlüğüne verilen değer. Lord'lar şerefine bakar."
        />
        <StatCard
          icon={Flame}
          label="Korku"
          value={fear}
          max={100}
          colorClass="text-red-400"
          badgeLabel={fi.label}
          badgeColor={fi.color}
          description="Senden çekinme seviyesi. Yüksek korku NPC saldırılarını azaltır ama ilişki kurmayı zorlaştırır."
        />
        <StatCard
          icon={Eye}
          label="Ün"
          value={fame}
          max={100}
          colorClass="text-violet-400"
          badgeLabel={fai.label}
          badgeColor={fai.color}
          description="Adının ne kadar uzağa ulaştığı. Ünlü olunca yeni fırsatlar kapısı açılır."
        />
      </div>

      {/* Ticaret etkileri */}
      <div className="card-frame p-4 space-y-1">
        <div className="flex items-center gap-2 mb-3">
          <ShoppingBag className="w-4 h-4 text-amber-600" />
          <span className="label-tiny">Pazar Etkileri</span>
        </div>
        <TradeRow label="Satın alırken fiyat" mult={buyMult} type="buy" />
        <TradeRow label="Satarken fiyat" mult={sellMult} type="sell" />
        <div className="flex items-center justify-between text-sm py-1.5 pt-2">
          <span className="text-stone-400">NPC saldırı riski</span>
          <span className={atkRisk > 0.15 ? "text-red-400" : atkRisk > 0.08 ? "text-orange-400" : "text-emerald-400"}>
            %{Math.round(atkRisk * 100)}
          </span>
        </div>
      </div>

      {/* İpucu */}
      <div className="border border-stone-800/50 rounded-sm p-3 text-xs text-stone-500 space-y-1">
        <p>• <span className="text-stone-400">İtibar</span> arttırmak için: yardım et, görev tamamla, bağış yap</p>
        <p>• <span className="text-stone-400">Şeref</span> için dürüst ve onurlu davran, sözünü tut</p>
        <p>• <span className="text-stone-400">Ün</span> için savaş kazan, büyük olayların içinde ol</p>
        <p>• <span className="text-stone-400">Korku</span> suç ve şiddetle artar — double-edged sword</p>
      </div>
    </div>
  );
}
