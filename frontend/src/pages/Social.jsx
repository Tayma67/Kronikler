/**
 * Sosyal Statü — KÜL & KÖZ.
 * Duygu görevi: "Namım ve şerefim" — itibar/şeref/korku/ün dört mühür.
 * İşlevsellik (API çağrısı, eşikler, hesaplar) birebir korunur.
 */
import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { PageHeader, Panel, Pill, GoldRule, TONES } from "@/components/ui/Kit";

// ─── Mühür kartı ──────────────────────────────────────────────────────────────
function SealCard({ icon, label, value, max = 100, tone, badgeLabel, badgeTone, description }) {
  const t = TONES[tone] || TONES.gold;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="card-frame" style={{ padding: "0.8rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", minWidth: 0 }}>
          <span style={{ fontSize: "1.05rem", filter: `drop-shadow(0 0 8px ${t.text}55)` }}>{icon}</span>
          <span className="font-display" style={{
            fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", color: t.text,
          }}>{label}</span>
        </div>
        <span className="font-display" style={{
          fontSize: "1.15rem", fontWeight: 700, color: "var(--color-parchment)",
          textShadow: `0 0 10px ${t.text}40`,
        }}>{Math.round(value)}</span>
      </div>
      <div style={{
        height: "5px", borderRadius: "3px", overflow: "hidden",
        background: "rgba(255,255,255,0.06)", margin: "0.55rem 0",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: "3px",
          background: `linear-gradient(to right, ${t.text}88, ${t.text})`,
          boxShadow: `0 0 8px ${t.text}55`, transition: "width 0.5s ease",
        }} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", justifyContent: "space-between" }}>
        <p className="font-serif" style={{
          fontSize: "0.7rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", margin: 0, lineHeight: 1.45,
        }}>{description}</p>
        <Pill tone={badgeTone}>{badgeLabel}</Pill>
      </div>
    </div>
  );
}

// ─── Etiket hesaplamaları ─────────────────────────────────────────────────────
function repInfo(rep) {
  if (rep >= 60) return { label: "Efsanevi", tone: "gold" };
  if (rep >= 30) return { label: "Saygın", tone: "sage" };
  if (rep >= 10) return { label: "Bilinen", tone: "ink" };
  if (rep >= -10) return { label: "Sıradan", tone: "ash" };
  if (rep >= -30) return { label: "Şüpheli", tone: "ember" };
  return { label: "Kötü Şöhret", tone: "blood" };
}

function honorInfo(hon) {
  if (hon >= 70) return { label: "Onurlu", tone: "sage" };
  if (hon >= 40) return { label: "Dürüst", tone: "ink" };
  if (hon >= 15) return { label: "Bilindik", tone: "ash" };
  return { label: "Şerefsiz", tone: "blood" };
}

function fearInfo(fear) {
  if (fear >= 60) return { label: "Dehşet", tone: "blood" };
  if (fear >= 35) return { label: "Ürkütücü", tone: "ember" };
  if (fear >= 15) return { label: "Dikkat Çeken", tone: "ash" };
  return { label: "Zararsız", tone: "ash" };
}

function fameInfo(fame) {
  if (fame >= 60) return { label: "Ünlü", tone: "ink" };
  if (fame >= 30) return { label: "Tanınan", tone: "ink" };
  if (fame >= 10) return { label: "Duyulan", tone: "ash" };
  return { label: "Anonim", tone: "ash" };
}

// ─── Ticaret çarpanı göstergesi ───────────────────────────────────────────────
function TradeRow({ label, mult, type }) {
  const discount = type === "buy" ? 1 - mult : mult - 1;
  const isGood = type === "buy" ? mult < 1 : mult > 1;
  const pct = Math.abs(Math.round(discount * 100));
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0.45rem 0", borderBottom: "1px solid rgba(46,36,22,0.6)",
    }}>
      <span className="font-serif" style={{ fontSize: "0.84rem", color: "var(--color-parchment-dim)" }}>
        {label}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        {pct > 0 ? (
          <span className="font-display" style={{
            fontSize: "0.78rem", fontWeight: 700,
            color: isGood ? "#4A9A5A" : "#C84040",
          }}>
            {isGood ? "▾ −" : "▴ +"}{pct}%
          </span>
        ) : (
          <span className="font-serif" style={{
            fontSize: "0.76rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
          }}>Olağan</span>
        )}
        <span className="font-display" style={{
          fontSize: "0.62rem", color: "var(--color-parchment-muted)",
        }}>(×{mult.toFixed(2)})</span>
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
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "5rem 0" }}>
      <span className="font-display ember-flicker" style={{
        fontSize: "0.62rem", letterSpacing: "0.25em", textTransform: "uppercase",
      }}>
        Nam salınıyor…
      </span>
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
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
      <PageHeader
        kicker="Toplumdaki Yerin"
        icon="🏅"
        title="Namım & Şerefim"
        sub="Adın nasıl anılıyor, kimler eğiliyor, kimler çekiniyor."
      />

      {/* Unvan */}
      <Panel title="Genel Unvan" icon="📯" tone={ri.tone}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <div className="font-display" style={{
              fontSize: "1.4rem", fontWeight: 700, color: TONES[ri.tone].text,
              letterSpacing: "0.05em",
              textShadow: `0 0 16px ${TONES[ri.tone].text}45`,
            }}>
              {ri.label}
            </div>
            <p className="font-serif" style={{
              fontSize: "0.72rem", fontStyle: "italic",
              color: "var(--color-parchment-muted)", margin: "0.2rem 0 0",
            }}>
              Çarşıda, handa, sarayda adın böyle anılıyor.
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="label-tiny" style={{ marginBottom: "0.15rem" }}>İtibar</div>
            <div className="font-display" style={{
              fontSize: "1.7rem", fontWeight: 700, color: "var(--color-parchment)",
              textShadow: "0 0 14px rgba(201,168,76,0.25)",
            }}>{rep > 0 ? `+${rep}` : rep}</div>
          </div>
        </div>
      </Panel>

      <GoldRule label="Dört Mühür" />

      {/* 4 ana stat */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.6rem" }}>
        <SealCard
          icon="🛡"
          label="İtibar"
          value={rep}
          max={100}
          tone="gold"
          badgeLabel={ri.label}
          badgeTone={ri.tone}
          description="Halkın sana güveni ve saygısı. Yüksek itibar pazarda fiyatları yumuşatır."
        />
        <SealCard
          icon="⚖"
          label="Şeref"
          value={honor}
          max={100}
          tone="sage"
          badgeLabel={hi.label}
          badgeTone={hi.tone}
          description="Verdiğin sözlere, dürüstlüğüne verilen değer. Beyler şerefine bakar."
        />
        <SealCard
          icon="🔥"
          label="Korku"
          value={fear}
          max={100}
          tone="blood"
          badgeLabel={fi.label}
          badgeTone={fi.tone}
          description="Senden çekinme seviyesi. Korku saldırıları savar ama gönül bağlarını zorlaştırır."
        />
        <SealCard
          icon="🌟"
          label="Ün"
          value={fame}
          max={100}
          tone="ink"
          badgeLabel={fai.label}
          badgeTone={fai.tone}
          description="Adının ulaştığı menzil. Ünün yayıldıkça yeni kapılar aralanır."
        />
      </div>

      <div style={{ height: "0.75rem" }} />

      {/* Ticaret etkileri */}
      <Panel title="Pazar Etkileri" icon="⚖" tone="gold">
        <TradeRow label="Satın alırken fiyat" mult={buyMult} type="buy" />
        <TradeRow label="Satarken fiyat" mult={sellMult} type="sell" />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.55rem 0 0.1rem",
        }}>
          <span className="font-serif" style={{ fontSize: "0.84rem", color: "var(--color-parchment-dim)" }}>
            Yol kesilme riski
          </span>
          <span className="font-display" style={{
            fontSize: "0.82rem", fontWeight: 700,
            color: atkRisk > 0.15 ? "#C84040" : atkRisk > 0.08 ? "#E05A30" : "#4A9A5A",
          }}>
            %{Math.round(atkRisk * 100)}
          </span>
        </div>
      </Panel>

      <div style={{ height: "0.75rem" }} />

      {/* İpucu */}
      <Panel title="Kâtibin Notları" icon="🪶" tone="ash">
        <ul className="font-serif" style={{
          listStyle: "none", margin: 0, padding: 0, fontSize: "0.78rem",
          fontStyle: "italic", color: "var(--color-parchment-dim)",
          display: "flex", flexDirection: "column", gap: "0.35rem", lineHeight: 1.5,
        }}>
          <li>❧ <span style={{ color: "var(--color-gold)" }}>İtibar</span> için: yardım et, görev bitir, sadaka ver.</li>
          <li>❧ <span style={{ color: "#4A9A5A" }}>Şeref</span> için dürüst ol, verdiğin sözü tut.</li>
          <li>❧ <span style={{ color: "#7B4FAF" }}>Ün</span> için cenk kazan, büyük hadiselerin içinde ol.</li>
          <li>❧ <span style={{ color: "#C84040" }}>Korku</span> suç ve kılıçla artar — iki ucu keskin bıçaktır.</li>
        </ul>
      </Panel>
    </div>
  );
}
