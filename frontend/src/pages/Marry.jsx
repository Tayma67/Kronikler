/**
 * Evlilik & Aile — KÜL & KÖZ.
 * Duygu görevi: "Bir ömür kararı" — adaylar zarif, teklif anı törensel.
 * İşlevsellik (aday filtresi, teklif akışı, koşullar) birebir korunur.
 */
import { useMemo, useState } from "react";
import { profLabel } from "@/lib/labels";
import { Link } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { playSfx } from "@/lib/audio";
import { toast } from "sonner";
import { PageHeader, Panel, Pill, EmptyState, GoldRule } from "@/components/ui/Kit";

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
function relColor(score) {
  if (score >= 70) return "#E07B9A";
  if (score >= 50) return "#C9A84C";
  if (score >= 30) return "#E05A30";
  return "#7A6A4F";
}
function relLabel(score) {
  if (score >= 70) return "Aşık";
  if (score >= 50) return "Yakın Dost";
  if (score >= 30) return "Arkadaş";
  return "Tanışık";
}
function npcAvatar(npc) {
  const age = npc.age || 30;
  if (npc.gender === "kadın") return age >= 55 ? "👵" : age < 13 ? "👧" : "👩";
  return age >= 55 ? "🧓" : age < 13 ? "👦" : "🧔";
}
/* İlişki bandı: -100..+100 → kırmızı→taş→yeşil geçişli */
function RelBar({ score }) {
  const pct = Math.max(0, Math.min(100, ((score + 100) / 200) * 100));
  return (
    <div style={{
      height: "5px", borderRadius: "3px", overflow: "hidden",
      background: "rgba(255,255,255,0.06)", marginTop: "0.35rem",
    }}>
      <div style={{
        height: "100%", width: `${pct}%`, borderRadius: "3px",
        background: "linear-gradient(to right, #C84040, #7A6A4F 50%, #4A9A5A)",
        backgroundSize: `${pct > 0 ? 10000 / pct : 100}% 100%`,
        boxShadow: "0 0 6px rgba(201,168,76,0.3)",
        transition: "width 0.5s ease",
      }} />
    </div>
  );
}

// ─── Çocuk kartı ─────────────────────────────────────────────────────────────
function ChildCard({ child }) {
  const isAlive = child.alive !== false;
  return (
    <div className="row-frame" style={!isAlive ? { opacity: 0.55 } : undefined}>
      <span style={{ fontSize: "1.1rem", flexShrink: 0,
                     filter: isAlive ? "drop-shadow(0 0 6px rgba(201,168,76,0.25))" : "grayscale(1)" }}>
        {isAlive ? (child.gender === "kadın" ? "👧" : "👦") : "🪦"}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {isAlive
          ? <Link to={`/oyun/npc/${child.id}`} className="font-display" style={{
              fontSize: "0.82rem", fontWeight: 700, color: "var(--color-parchment)",
              textDecoration: "none",
            }}>{child.name}</Link>
          : <span className="font-display" style={{
              fontSize: "0.82rem", fontWeight: 700,
              color: "var(--color-parchment-muted)", textDecoration: "line-through",
            }}>{child.name}</span>}
        <p className="font-serif" style={{
          fontSize: "0.7rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", margin: "0.1rem 0 0",
        }}>
          {child.age} yaşında
          {child.profession && child.age >= 10 ? ` · ${profLabel(child.profession)}` : ""}
          {!isAlive ? " · Hakk'a yürüdü" : ""}
        </p>
      </div>
      {isAlive && child.age >= 13 && (
        <Pill tone="ash">Yetişkin</Pill>
      )}
    </div>
  );
}

// ─── Evli ekranı ─────────────────────────────────────────────────────────────
function MarriedView({ spouse, relationship, children }) {
  const score = relationship ?? 0;
  const isAlive = spouse.alive !== false;

  if (!isAlive) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {/* Dul ekranı */}
        <Panel title="Rahmetli Eşin" icon="🕯" tone="ash">
          <div style={{ textAlign: "center", padding: "0.6rem 0" }}>
            <div style={{ fontSize: "1.6rem", marginBottom: "0.4rem", opacity: 0.6 }}>🥀</div>
            <p className="font-display" style={{
              fontSize: "1.15rem", fontWeight: 700,
              color: "var(--color-parchment-dim)", margin: 0,
            }}>{spouse.name}</p>
            <p className="font-serif" style={{
              fontSize: "0.8rem", fontStyle: "italic",
              color: "var(--color-parchment-muted)", marginTop: "0.25rem",
            }}>
              Hakk'a yürüdü; adı duanda yaşar.
            </p>
            <GoldRule />
            <p className="font-serif" style={{
              fontSize: "0.74rem", fontStyle: "italic",
              color: "var(--color-parchment-muted)", margin: 0,
            }}>
              Yeniden ocak kurmak istersen birini bul, gönlünü kazan, bağını güçlendir.
            </p>
          </div>
        </Panel>
        {/* Çocuklar (varsa) */}
        {children.length > 0 && <ChildrenSection children={children} />}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Eş kartı */}
      <Panel title="Hayat Yoldaşın" icon="💍" tone="gold"
        right={<Pill tone={score >= 50 ? "sage" : score >= 30 ? "ember" : "ash"}>{relLabel(score)}</Pill>}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{
            fontSize: "1.8rem", flexShrink: 0,
            filter: "drop-shadow(0 0 10px rgba(201,168,76,0.35))",
          }}>
            {npcAvatar(spouse)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Link
              to={`/oyun/npc/${spouse.id}`}
              className="font-display"
              style={{
                fontSize: "1.1rem", fontWeight: 700, color: "var(--color-parchment)",
                textDecoration: "none", textShadow: "0 0 12px rgba(201,168,76,0.2)",
              }}
            >
              {spouse.name}
            </Link>
            <p className="font-serif" style={{
              fontSize: "0.74rem", fontStyle: "italic",
              color: "var(--color-parchment-muted)", margin: "0.15rem 0 0",
            }}>
              {spouse.age} yaşında · {spouse.profession || "Mesleği bilinmiyor"}
            </p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <span className="font-display" style={{
              fontSize: "1.35rem", fontWeight: 700, color: relColor(score),
              textShadow: `0 0 10px ${relColor(score)}55`,
            }}>{score > 0 ? `+${score}` : score}</span>
            <div className="label-tiny">gönül bağı</div>
          </div>
        </div>
        <RelBar score={score} />
        {score < 30 && (
          <p className="font-serif" style={{
            fontSize: "0.74rem", fontStyle: "italic", color: "#E05A30",
            borderLeft: "2px solid rgba(224,90,48,0.5)", paddingLeft: "0.5rem",
            marginTop: "0.6rem", marginBottom: 0,
          }}>
            Aranızdaki köz sönüyor. Hediye ver, vakit ayır, gönlünü al.
          </p>
        )}
      </Panel>

      {/* Çocuklar */}
      {children.length > 0 && <ChildrenSection children={children} />}
      {children.length === 0 && (
        <p className="font-serif" style={{
          textAlign: "center", fontSize: "0.74rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", margin: 0,
        }}>
          Henüz çocuğunuz yok. Aylar geçtikçe ocak kalabalıklaşabilir.
        </p>
      )}
    </div>
  );
}

function ChildrenSection({ children }) {
  return (
    <Panel title="Çocukların" icon="👶" tone="sage"
      right={<Pill tone="sage">{children.length}</Pill>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {children.map((c) => <ChildCard key={c.id} child={c} />)}
      </div>
    </Panel>
  );
}

// ─── Aday kartı ───────────────────────────────────────────────────────────────
function CandidateCard({ npc, score, isDating, busy, onPropose }) {
  const canPropose = isDating && score >= 50;
  const needsDating = !isDating;

  return (
    <div className="card-frame" style={{
      padding: "0.85rem",
      ...(isDating ? {
        borderColor: "rgba(201,168,76,0.45)",
        boxShadow: "0 0 16px rgba(201,168,76,0.12), 0 4px 16px rgba(0,0,0,0.45)",
      } : {}),
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
        <span style={{ fontSize: "1.5rem", flexShrink: 0,
                       filter: "drop-shadow(0 0 8px rgba(201,168,76,0.25))" }}>
          {npcAvatar(npc)}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link to={`/oyun/npc/${npc.id}`} className="font-display" style={{
            fontSize: "0.92rem", fontWeight: 700, color: "var(--color-parchment)",
            textDecoration: "none",
          }}>
            {npc.name}
          </Link>
          <p className="font-serif" style={{
            fontSize: "0.72rem", fontStyle: "italic",
            color: "var(--color-parchment-muted)", margin: "0.15rem 0 0",
          }}>
            {npc.age} yaşında · {npc.profession || "?"} · {npc.gender === "kadın" ? "Kadın" : "Erkek"}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <span className="font-display" style={{
            fontSize: "1.05rem", fontWeight: 700, color: relColor(score),
          }}>{score > 0 ? `+${score}` : score}</span>
          <div className="font-display" style={{
            fontSize: "0.52rem", letterSpacing: "0.12em", textTransform: "uppercase",
            color: relColor(score),
          }}>{relLabel(score)}</div>
        </div>
      </div>

      <RelBar score={score} />

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: "0.5rem", marginTop: "0.65rem",
      }}>
        {isDating ? (
          <Pill tone="gold">💞 Gönül yoldaşın</Pill>
        ) : (
          <span className="font-serif" style={{
            fontSize: "0.72rem", fontStyle: "italic",
            color: "var(--color-parchment-muted)",
          }}>Henüz gönül bağı yok</span>
        )}

        {canPropose ? (
          <button
            onClick={() => onPropose(npc.id)}
            disabled={busy === npc.id}
            className="btn-ember"
            style={{ padding: "0.45rem 0.85rem", fontSize: "0.6rem" }}
          >
            {busy === npc.id ? "⏳ " : "💍 "}İzdivaç Teklif Et
          </button>
        ) : (
          <span className="font-display" style={{
            fontSize: "0.56rem", letterSpacing: "0.1em", textTransform: "uppercase",
            color: "var(--color-parchment-muted)", display: "inline-flex",
            alignItems: "center", gap: "0.3rem",
          }}>
            🔒 {needsDating ? "Önce gönlünü kazan (flört et)" : `Gönül bağı ${score}/50 gerekli`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────
export default function Marry() {
  const { state, setState } = useGame();
  const [busy, setBusy] = useState(null);

  const player        = useMemo(() => state?.player || {}, [state?.player]);
  const relationships = useMemo(() => state?.relationships || {}, [state?.relationships]);
  const playerAge     = player.age || 0;
  const spouseId      = player.spouse_id;
  const childrenIds   = useMemo(() => player.children_ids || [], [player.children_ids]);

  // Eşi bul (ölmüşse de göster)
  const spouse = useMemo(() => {
    if (!spouseId) return null;
    return state?.world?.npcs?.find((n) => n.id === spouseId) || null;
  }, [spouseId, state]);

  // Çocukları bul
  const children = useMemo(() => {
    if (!childrenIds.length || !state?.world?.npcs) return [];
    return state.world.npcs.filter((n) => childrenIds.includes(n.id))
      .sort((a, b) => a.age - b.age);
  }, [childrenIds, state]);

  // Evli + eş ölmüşse yeniden evlenme izni
  const spouseDead = spouse && spouse.alive === false;
  const isMarried  = spouseId && !spouseDead;

  // Adaylar
  const candidates = useMemo(() => {
    if (isMarried || !state?.world?.npcs) return [];
    const loc = player.location_id;
    const relStatus = player.relationship_status || {};
    return state.world.npcs
      .filter((n) =>
        n.alive !== false &&
        n.location_id === loc &&
        !n.spouse_id &&
        (n.age || 0) >= 18 &&
        (relationships[n.id] || 0) >= 10
      )
      .map((n) => ({
        npc: n,
        score: relationships[n.id] || 0,
        isDating: relStatus[n.id] === "dating",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [state, player, isMarried, relationships]);

  const handlePropose = async (npcId) => {
    setBusy(npcId);
    playSfx("click");
    try {
      const { data } = await api.post(`/game/npc/${npcId}/propose`);
      if (data.state) setState(data.state);
      if (data.accepted) {
        playSfx("success");
        toast.success("Teklif kabul edildi! Kutlu olsun.");
      } else {
        playSfx("fail");
        toast("Teklif reddedildi.", { description: data.reason || "" });
      }
    } catch (e) {
      playSfx("fail");
      toast.error(e.response?.data?.detail || "Teklif gönderilemedi.");
    } finally {
      setBusy(null);
    }
  };

  if (playerAge < 13) {
    return (
      <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
        <PageHeader
          kicker="Aile Ocağı"
          icon="💍"
          title="Evlilik"
          sub="Bir ömür kararı — ama her şeyin bir vakti var."
        />
        <Panel title="Vakti Değil" icon="🔒" tone="ash">
          <EmptyState icon="🌱"
            title="Henüz çok küçüksün."
            sub="13 yaşına geldiğinde evlilik kapısı aralanır." />
        </Panel>
      </div>
    );
  }

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
      <PageHeader
        kicker="Aile Ocağı"
        icon="💍"
        title="Evlilik & Aile"
        sub={isMarried
          ? "Ocağın tütüyor; yoldaşınla aynı yastığa baş koyuyorsun."
          : spouseDead
            ? "Eşini kaybettin; ocak sessiz ama hayat sürüyor."
            : "Bir ömür kararı — bulunduğun diyarda gönlüne göre biri var mı?"}
      />

      {/* Aile durumu */}
      {(isMarried || spouseDead) && spouse ? (
        <MarriedView spouse={spouse} relationship={relationships[spouse.id]} children={children} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {/* Varsa çocuklar (dul durumdayken de göster) */}
          {spouseDead && children.length > 0 && (
            <ChildrenSection children={children} />
          )}

          {candidates.length === 0 ? (
            <Panel title="Gönül Defteri" icon="💔" tone="ash">
              <EmptyState icon="🥀"
                title="Bu diyarda gönlüne göre kimse yok."
                sub="Bağı en az 10 olan bekâr birini bul, flört et, vakit geçir." />
            </Panel>
          ) : (
            <>
              <Panel title="İzdivaç Âdâbı" icon="📜" tone="ink">
                <ul className="font-serif" style={{
                  listStyle: "none", margin: 0, padding: 0, fontSize: "0.78rem",
                  fontStyle: "italic", color: "var(--color-parchment-dim)",
                  display: "flex", flexDirection: "column", gap: "0.35rem",
                }}>
                  <li>❧ Önce gönlünü kazan: kişiyle <span style={{ color: "var(--color-parchment)" }}>"Flört Et"</span> diyerek bağ kur.</li>
                  <li>❧ Gönül bağı <span style={{ color: "var(--color-gold)" }}>50'yi</span> aşınca izdivaç teklifi mümkün olur.</li>
                  <li>❧ Hediye ver, iltifat et, vakit geçir — bağ böyle perçinlenir.</li>
                </ul>
              </Panel>

              <Panel title="Bu Diyardaki Adaylar" icon="🌹" tone="gold"
                right={<Pill tone="gold">{candidates.length} aday</Pill>}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {candidates.map(({ npc, score, isDating }) => (
                    <CandidateCard
                      key={npc.id}
                      npc={npc}
                      score={score}
                      isDating={isDating}
                      busy={busy}
                      onPropose={handlePropose}
                    />
                  ))}
                </div>
              </Panel>
            </>
          )}
        </div>
      )}
    </div>
  );
}
