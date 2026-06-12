/**
 * Gölge İşleri — KÜL & KÖZ.
 * Duygu görevi: "Gölgede iş çeviriyorum" — ink/blood tonlar, risk merdiveni,
 * keşif rozeti. İşlevsellik (API çağrıları, state akışı) birebir korunur.
 */
import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { playSfx } from "@/lib/audio";
import { toast } from "sonner";
import { PageHeader, Panel, Pill, GoldRule, EmptyState, Coin, TONES } from "@/components/ui/Kit";

// ─── R6: Risk merdiveni — basamak basamak karanlık ──────────────────────────
const RISK_TONES = {
  "düşük":  { tone: "sage",  step: 1 },
  "orta":   { tone: "gold",  step: 2 },
  "yüksek": { tone: "ember", step: 3 },
  "kritik": { tone: "blood", step: 4 },
};
const JOB_ICONS = {
  yankesicilik: "🤏", dukkan_soyma: "🏚", kervan_baskini: "🐫", konak_soygunu: "🏰",
};
const GOOD_LABELS = { "ipek": "İpek", "baharat": "Baharat", "mücevher": "Mücevher" };

/* Risk merdiveni göstergesi — 4 basamak */
function RiskLadder({ risk }) {
  const cfg = RISK_TONES[risk] || RISK_TONES["orta"];
  const t = TONES[cfg.tone];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "2px" }} title={`Risk: ${risk}`}>
      {[1, 2, 3, 4].map((s) => (
        <div key={s} style={{
          width: "5px", height: `${4 + s * 3}px`, borderRadius: "1px",
          background: s <= cfg.step ? t.text : "rgba(122,106,79,0.3)",
          boxShadow: s <= cfg.step ? `0 0 5px ${t.text}66` : "none",
        }} />
      ))}
    </div>
  );
}

// ─── Güvenlik Risk Göstergesi ─────────────────────────────────────────────────
function SecurityBadge({ security }) {
  const t = security >= 70 ? TONES.blood : security >= 40 ? TONES.gold : TONES.sage;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
      <span className="label-tiny">🛡 Bölge Güvenliği</span>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, maxWidth: "55%" }}>
        <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${security}%`, borderRadius: "2px",
            background: `linear-gradient(to right, ${t.text}99, ${t.text})`,
            boxShadow: `0 0 6px ${t.text}55`,
          }} />
        </div>
        <span className="font-display" style={{ fontSize: "0.66rem", fontWeight: 700, color: t.text, flexShrink: 0 }}>
          {security}/100
        </span>
      </div>
    </div>
  );
}

// ─── R6.1: İş Kartı ──────────────────────────────────────────────────────────
function JobCard({ job, selected, onSelect, disabled }) {
  const cfg = RISK_TONES[job.risk] || RISK_TONES["orta"];
  const t = TONES[cfg.tone];
  const locked = !!job.locked;
  return (
    <button
      onClick={() => { playSfx("click"); onSelect(job.id); }}
      disabled={disabled}
      style={{
        width: "100%", textAlign: "left", padding: "0.8rem 0.85rem", borderRadius: "8px",
        cursor: "pointer", transition: "all 0.2s",
        display: "flex", flexDirection: "column", gap: "0.45rem",
        border: selected ? `1.5px solid ${t.text}` : `1px solid ${t.border}`,
        background: selected
          ? `linear-gradient(160deg, ${t.bg}, rgba(10,7,4,0.7))`
          : `linear-gradient(160deg, ${locked ? "rgba(10,7,4,0.5)" : t.bg}, transparent)`,
        boxShadow: selected ? `0 0 16px ${t.text}33, inset 0 1px 0 ${t.text}22` : "none",
        opacity: locked && !selected ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "1.05rem", filter: `drop-shadow(0 0 6px ${t.text}44)` }}>
            {JOB_ICONS[job.id] || "🗡"}
          </span>
          <span className="font-display" style={{ fontSize: "0.82rem", fontWeight: 700, color: t.text }}>
            {job.label}
          </span>
          {job.scouted && <Pill tone="ink">🔭 Keşfedildi</Pill>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexShrink: 0 }}>
          <RiskLadder risk={job.risk} />
          <span className="font-display" style={{
            fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.14em",
            textTransform: "uppercase", color: t.text,
          }}>
            {job.risk}
          </span>
        </div>
      </div>

      <p className="font-serif" style={{
        fontSize: "0.78rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
        margin: 0, lineHeight: 1.45,
      }}>
        {job.desc}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.7rem" }}>
        <Coin value={`${job.reward_min}–${job.reward_max}`} size="0.7rem" />
        <span className="font-display" style={{ fontSize: "0.6rem", color: "var(--color-parchment-muted)" }}>
          suç +{job.crime_pts}
        </span>
        <span className="font-display" style={{
          fontSize: "0.6rem", fontWeight: 700,
          color: job.chance_pct >= 55 ? TONES.sage.text : job.chance_pct >= 35 ? TONES.gold.text : TONES.blood.text,
        }}>
          şans %{job.chance_pct}
        </span>
      </div>

      {locked && (
        <div className="font-serif" style={{
          display: "flex", alignItems: "center", gap: "0.4rem",
          fontSize: "0.68rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
          border: "1px dashed rgba(122,106,79,0.4)", borderRadius: "4px", padding: "0.3rem 0.5rem",
        }}>
          🔒 {job.locked}
        </div>
      )}
    </button>
  );
}

// ─── R6.2: İcra Sahnesi Modalı ───────────────────────────────────────────────
function SceneModal({ scene, onChoose, busy }) {
  const CHOICE_TONES = {
    saklan:      "ink",
    sustur:      "blood",
    kac:         "ember",
    kacis_plani: "sage",
  };
  return (
    <div className="bg-black/75" style={{
      position: "fixed", inset: 0, zIndex: 50, display: "flex",
      alignItems: "center", justifyContent: "center", padding: "1rem",
    }}>
      <div className="card-frame rise-in" style={{
        width: "100%", maxWidth: "24rem", padding: "1.25rem",
        border: "1px solid rgba(200,64,64,0.4)",
        display: "flex", flexDirection: "column", gap: "0.9rem",
      }}>
        <div className="font-display" style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          fontSize: "0.82rem", fontWeight: 700, color: TONES.blood.text,
          textShadow: "0 0 10px rgba(200,64,64,0.3)",
        }}>
          ⚠ {scene.label} — İşler Sarpa Sardı
        </div>
        <p className="font-serif" style={{
          fontSize: "0.88rem", fontStyle: "italic", color: "var(--color-parchment)",
          border: "1px solid rgba(200,64,64,0.25)", background: "rgba(200,64,64,0.06)",
          borderRadius: "6px", padding: "0.65rem 0.75rem", margin: 0, lineHeight: 1.5,
        }}>
          {scene.scene}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {scene.choices.map(c => {
            const t = TONES[CHOICE_TONES[c.id] || "ash"];
            return (
              <button key={c.id} onClick={() => onChoose(c.id)} disabled={busy}
                style={{
                  width: "100%", textAlign: "left", padding: "0.6rem 0.75rem",
                  borderRadius: "6px", cursor: "pointer", transition: "all 0.15s",
                  border: `1px solid ${t.border}`, background: t.bg,
                  opacity: busy ? 0.4 : 1,
                }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem" }}>
                  <span className="font-display" style={{
                    fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: t.text,
                  }}>
                    {c.label}
                  </span>
                  {c.test && <Pill tone="ash">🎲 {c.test}</Pill>}
                </div>
                <p className="font-serif" style={{
                  fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                  margin: "0.15rem 0 0",
                }}>
                  {c.hint}
                </p>
              </button>
            );
          })}
        </div>
        <p className="font-serif" style={{
          fontSize: "0.66rem", fontStyle: "italic", textAlign: "center",
          color: "var(--color-parchment-muted)", margin: 0,
        }}>
          Geri dönüş yok — bir yol seç.
        </p>
      </div>
    </div>
  );
}

// ─── Sonuç Ekranı ─────────────────────────────────────────────────────────────
function CrimeResult({ result, onDone }) {
  const cfg = {
    temiz:      { icon: "🕊", tone: "sage" },
    goruldun:   { icon: "👁", tone: "gold" },
    kacti:      { icon: "👣", tone: "ash" },
    yakalandin: { icon: "⛓", tone: "blood" },
  }[result.outcome] || { icon: "🗡", tone: "ash" };
  const t = TONES[cfg.tone];

  return (
    <div className="rise-in" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div className="card-frame" style={{
        padding: "1.25rem", textAlign: "center",
        border: `1px solid ${t.border}`,
        background: `linear-gradient(165deg, ${t.bg}, rgba(15,11,6,0.6))`,
        display: "flex", flexDirection: "column", gap: "0.6rem",
      }}>
        <div style={{ fontSize: "2rem", filter: `drop-shadow(0 0 12px ${t.text}55)` }}>{cfg.icon}</div>
        <div className="font-display" style={{
          fontSize: "1.4rem", fontWeight: 700, letterSpacing: "0.18em",
          color: t.text, textShadow: `0 0 14px ${t.text}44`,
        }}>
          {result.title}
        </div>
        <p className="font-serif" style={{
          fontSize: "0.85rem", fontStyle: "italic", color: "var(--color-parchment-dim)", margin: 0,
        }}>
          {result.note}
        </p>
        {result.gain > 0 && (
          <div><Coin value={result.gain} size="1.1rem" /></div>
        )}
        {result.fine > 0 && (
          <div className="font-serif" style={{ fontSize: "0.8rem", color: TONES.blood.text }}>
            Ceza: <span className="font-display" style={{ fontWeight: 700 }}>{result.fine} ⚜</span> ödendi
          </div>
        )}
      </div>

      {/* Ganimet — sıcak mal işaretli */}
      {result.loot?.length > 0 && (
        <Panel title="Ganimet" icon="💰" tone="ember">
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {result.loot.map((l, i) => (
              <Pill key={i} tone="ember" pulse={l.hot ? "danger" : undefined}>
                {GOOD_LABELS[l.good] || l.good} ×{l.qty}{l.hot ? " · 🔥 sıcak" : ""}
              </Pill>
            ))}
          </div>
          <p className="font-serif" style={{
            fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
            marginTop: "0.5rem", marginBottom: 0,
          }}>
            Sıcak mal satarken dikkat: çalıntı olduğu anlaşılırsa adın lekelenir.
            Çete bağlantısı malı güvenle eritir.
          </p>
        </Panel>
      )}

      {result.witness && (
        <div className="row-frame" style={{
          border: "1px solid rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.05)",
        }}>
          <span style={{ fontSize: "0.9rem" }}>👁</span>
          <span className="font-serif" style={{ fontSize: "0.78rem", fontStyle: "italic", color: TONES.gold.text }}>
            {result.witness} seni gördü — bunu unutmayacak.
          </span>
        </div>
      )}

      {result.rep_notes?.length > 0 && (
        <Panel title="İtibar Etkileri" icon="🎭" tone="ink">
          {result.rep_notes.map((msg, i) => (
            <p key={i} className="font-serif" style={{
              fontSize: "0.78rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
              margin: "0.1rem 0",
            }}>
              {msg}
            </p>
          ))}
        </Panel>
      )}

      <button onClick={onDone}
        className="btn-ghost-ash"
        style={{ width: "100%", padding: "0.65rem 0", fontSize: "0.68rem" }}>
        Gölgeye Karış
      </button>
    </div>
  );
}

// ─── Eşkıya Çetesi Paneli ────────────────────────────────────────────────────
function EskiyaPanel({ state, onResult, busy, setBusy, setState }) {
  const player = state?.player || {};
  const factions = state?.world?.factions || [];
  const playerFaction = factions.find(f => f.id === player.faction_id);
  const isEskiya = playerFaction?.type === "eskiya_cetesi";

  const eskiyaFactions = factions.filter(f => f.type === "eskiya_cetesi" && f.active);
  const [selectedFaction, setSelectedFaction] = useState(eskiyaFactions[0]?.id || null);
  const [actionType, setActionType] = useState("kervan_soygunu");

  const ESKIYA_ACTIONS = [
    {
      id: "kervan_soygunu",
      label: "Kervan Soygunu",
      desc: "Tüccar kervanlarına baskın yap. Yüksek kâr, yüksek risk.",
      reward: "100–500",
      icon: "⚔",
      tone: "ember",
    },
    {
      id: "haraç",
      label: "Haraç Al",
      desc: "Kasaba ve köylerden koruma parası topla.",
      reward: "40–200",
      icon: "🤝",
      tone: "gold",
    },
    {
      id: "faction_baskını",
      label: "Faction Baskını",
      desc: "Rakip faction üslerine saldır, değerli şeyler çal.",
      reward: "50–300",
      rewardNote: "+ nüfuz kaybı",
      icon: "🔥",
      tone: "blood",
    },
  ];

  const handleAction = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/crime", { crime_type: "kaçakçılık" });
      if (data.state) setState(data.state);
      const o = data.outcome || {};
      playSfx(o.success ? "success" : "fail");
      onResult({
        outcome: o.success ? "temiz" : "yakalandin",
        title: o.success ? "OPERASYON BAŞARILI" : "YAKALANDIN",
        note: o.success
          ? "Çete payını aldı, sen de kendi payını cebe attın."
          : "Operasyon ters gitti; bekçiler ensendeydi.",
        gain: o.gain || 0,
        fine: o.fine || 0,
        rep_notes: o.rep_changes || [],
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || "Operasyon başarısız.");
    } finally {
      setBusy(false);
    }
  };

  if (!eskiyaFactions.length && !isEskiya) {
    return (
      <Panel title="Eşkıya Çetesi" icon="🏴" tone="ash">
        <EmptyState
          icon="🏴"
          title="Bu bölgede aktif bir eşkıya çetesi yok."
          sub="Bir faction kur ya da dün kurulmuş bir çeteye katıl."
        />
      </Panel>
    );
  }

  return (
    <Panel title="Eşkıya Operasyonu" icon="🏴" tone="ember"
      right={isEskiya ? <Pill tone="ember">{playerFaction?.name}</Pill> : null}>

      {eskiyaFactions.length > 1 && !isEskiya && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "0.75rem" }}>
          <div className="label-tiny">Birlikte Çalış</div>
          {eskiyaFactions.map(f => (
            <button
              key={f.id}
              onClick={() => setSelectedFaction(f.id)}
              className="row-frame"
              style={{
                width: "100%", textAlign: "left", cursor: "pointer",
                border: selectedFaction === f.id
                  ? "1px solid rgba(224,90,48,0.55)" : "1px solid var(--color-border)",
                background: selectedFaction === f.id ? "rgba(224,90,48,0.08)" : undefined,
              }}
            >
              <span className="font-serif" style={{
                fontSize: "0.8rem",
                color: selectedFaction === f.id ? TONES.ember.text : "var(--color-parchment-dim)",
              }}>
                {f.name} · {f.member_count || 0} üye
              </span>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
        <div className="label-tiny">Operasyon Türü</div>
        {ESKIYA_ACTIONS.map(a => {
          const t = TONES[a.tone];
          const active = actionType === a.id;
          return (
            <button
              key={a.id}
              onClick={() => { playSfx("click"); setActionType(a.id); }}
              style={{
                width: "100%", textAlign: "left", padding: "0.65rem 0.75rem",
                borderRadius: "7px", cursor: "pointer", transition: "all 0.15s",
                display: "flex", flexDirection: "column", gap: "0.25rem",
                border: active ? `1.5px solid ${t.text}` : `1px solid ${t.border}`,
                background: active ? t.bg : "transparent",
                boxShadow: active ? `0 0 12px ${t.text}33` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.95rem" }}>{a.icon}</span>
                <span className="font-display" style={{ fontSize: "0.78rem", fontWeight: 700, color: t.text }}>
                  {a.label}
                </span>
              </div>
              <p className="font-serif" style={{
                fontSize: "0.74rem", fontStyle: "italic", color: "var(--color-parchment-dim)", margin: 0,
              }}>
                {a.desc}
              </p>
              <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Coin value={a.reward} size="0.66rem" />
                {a.rewardNote && (
                  <span className="font-display" style={{ fontSize: "0.56rem", color: "var(--color-parchment-muted)" }}>
                    {a.rewardNote}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ height: "0.75rem" }} />

      <button
        onClick={handleAction}
        disabled={busy || !selectedFaction}
        className="btn-ember"
        style={{
          width: "100%", padding: "0.7rem 0", fontSize: "0.74rem",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
        }}
      >
        {busy ? "⏳ Operasyon…" : "⚔ OPERASYONA GEÇ"}
      </button>
    </Panel>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function Crime() {
  const { state, setState, setLastActionPage } = useGame();
  const navigate = useNavigate();
  const location = useLocation();
  const [jobs, setJobs] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [scene, setScene] = useState(null);
  const [tab, setTab] = useState("bireysel"); // bireysel | eskiya

  const player = state?.player || {};
  const playerAge = player.age ?? 0;
  const tooYoung = playerAge < 13;

  const currentLoc = useMemo(() => {
    return state?.world?.locations?.find((l) => l.id === player.location_id);
  }, [state, player.location_id]);

  const crimeRecord = player.crime ?? 0;
  const crimeTier =
    crimeRecord >= 80 ? { label: "Aranan Suçlu", tone: "blood" } :
    crimeRecord >= 40 ? { label: "Şüpheli", tone: "ember" } :
    crimeRecord >= 15 ? { label: "Kayıt Var", tone: "gold" } :
    { label: "Temiz", tone: "sage" };

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await api.get("/game/crime/jobs");
      setJobs(data);
    } catch { /* sessizce geç */ }
  }, []);

  useEffect(() => {
    if (!tooYoung) fetchJobs();
  }, [fetchJobs, tooYoung, state?.turn]);

  const selectedJob = jobs?.jobs?.find(j => j.id === selected);

  /* ── R6.1: Keşif ── */
  const handleScout = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data } = await api.post("/game/crime/scout", { job_id: selected });
      if (data.state) setState(data.state);
      playSfx("success");
      toast.success(`${data.note} (${data.bonus})`, { duration: 6000 });
      await fetchJobs();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Keşif yapılamadı.");
    } finally { setBusy(false); }
  };

  /* ── R6.2: İcra ── */
  const handleExecute = async () => {
    if (!selected) { toast.error("Bir iş seç."); return; }
    setBusy(true);
    playSfx("sword");
    try {
      const { data } = await api.post("/game/crime/execute", { job_id: selected });
      if (data.needs_choice) {
        setScene(data);
      } else {
        if (data.state) setState(data.state);
        playSfx(data.result?.outcome === "temiz" ? "success" : "fail");
        setResult(data.result);
        await fetchJobs();
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "İş gerçekleştirilemedi.");
    } finally { setBusy(false); }
  };

  const handleResolve = async (choiceId) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/crime/resolve", { choice: choiceId });
      if (data.state) setState(data.state);
      setScene(null);
      playSfx(data.result?.outcome === "temiz" ? "success" : "fail");
      setResult(data.result);
      await fetchJobs();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Seçim çözülemedi.");
    } finally { setBusy(false); }
  };

  if (tooYoung) {
    return (
      <div className="page-shell rise-in">
        <PageHeader
          kicker="Gölge"
          icon="🌒"
          title="Yasadışı İşler"
          sub="Geceyle iş tutanın adı gündüz anılmaz."
        />
        <Panel title="Kapalı Kapı" icon="🔒" tone="ash">
          <EmptyState
            icon="🔒"
            title="Henüz çok küçüksün."
            sub="13 yaşında bu yollar açılır — acele etme, gölge bekler."
          />
        </Panel>
      </div>
    );
  }

  if (result) {
    return (
      <div className="page-shell rise-in">
        <PageHeader
          kicker="Gölge"
          icon="🌒"
          title="Yasadışı İşler"
          sub="Geceyle iş tutanın adı gündüz anılmaz."
        />
        <CrimeResult
          result={result}
          onDone={() => {
            setResult(null);
            setSelected(null);
            // Eylem tamamlandı — tur ilerledi, anasayfaya dön (geri dön butonlu)
            setLastActionPage?.({ path: location.pathname, label: "Gölge" });
            navigate("/oyun");
          }}
        />
      </div>
    );
  }

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
      {/* İcra sahnesi */}
      {scene && <SceneModal scene={scene} onChoose={handleResolve} busy={busy} />}

      <PageHeader
        kicker="Gölge"
        icon="🌒"
        title="Yasadışı İşler"
        sub="İş seç, istersen önce keşfet, sonra harekete geç — her şeyin bir bedeli var."
        right={<Pill tone={crimeTier.tone} pulse={crimeRecord >= 80 ? "danger" : undefined}>{crimeTier.label}</Pill>}
      />

      {/* Suç sicili */}
      <Panel title="Suç Sicili" icon="⚖" tone={crimeTier.tone}
        right={
          <span className="font-display" style={{ fontSize: "0.66rem", color: "var(--color-parchment-muted)" }}>
            {crimeRecord}/100
          </span>
        }>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{ flex: 1, height: "5px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${Math.min(100, crimeRecord)}%`, borderRadius: "2px",
              background: "linear-gradient(to right, #8B6914, #C9A84C 40%, #E05A30 75%, #C84040)",
              boxShadow: "0 0 6px rgba(224,90,48,0.45)", transition: "width 0.8s ease",
            }} />
          </div>
          <span className="font-display" style={{
            fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
            color: TONES[crimeTier.tone].text,
          }}>
            {crimeTier.label}
          </span>
        </div>
        {currentLoc && (
          <>
            <GoldRule />
            <SecurityBadge security={currentLoc.security} />
            {Object.keys(player.hot_goods || {}).length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.45rem" }}>
                <span style={{ fontSize: "0.8rem" }}>🔥</span>
                <span className="font-serif" style={{
                  fontSize: "0.72rem", fontStyle: "italic", color: TONES.ember.text,
                }}>
                  Elinde sıcak mal var:{" "}
                  {Object.entries(player.hot_goods)
                    .map(([g, q]) => `${GOOD_LABELS[g] || g} ×${q}`)
                    .join(", ")}
                </span>
              </div>
            )}
          </>
        )}
      </Panel>

      <div style={{ height: "0.75rem" }} />

      {/* Tab switcher */}
      <div style={{
        display: "flex", gap: 0, border: "1px solid var(--color-border)",
        borderRadius: "6px", overflow: "hidden", marginBottom: "0.85rem",
      }}>
        {["bireysel", "eskiya"].map(t => (
          <button
            key={t}
            onClick={() => { playSfx("page"); setTab(t); }}
            className="font-display"
            style={{
              flex: 1, padding: "0.6rem 0", cursor: "pointer", transition: "all 0.2s",
              fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
              border: "none",
              background: tab === t ? "rgba(123,79,175,0.12)" : "transparent",
              color: tab === t ? TONES.ink.text : "var(--color-parchment-muted)",
              boxShadow: tab === t ? "inset 0 -2px 0 rgba(123,79,175,0.6)" : "none",
            }}
          >
            {t === "bireysel" ? "🗡 Bireysel İş" : "⚔ Çete Operasyonu"}
          </button>
        ))}
      </div>

      {tab === "eskiya" ? (
        <EskiyaPanel
          state={state}
          onResult={setResult}
          busy={busy}
          setBusy={setBusy}
          setState={setState}
        />
      ) : (
        <>
          {/* İş kartları */}
          <GoldRule label="İş Seç" />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {!jobs && (
              <EmptyState icon="🕯" title="Sokaklar dinleniyor…" sub="Gölgedeki işler toparlanıyor." />
            )}
            {jobs?.jobs?.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                selected={selected === job.id}
                onSelect={setSelected}
                disabled={busy}
              />
            ))}
          </div>

          {/* Eylem butonları */}
          {selectedJob && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.85rem" }}>
              {!selectedJob.scouted && (
                <button
                  onClick={handleScout}
                  disabled={busy}
                  className="btn-ghost-ash"
                  style={{
                    width: "100%", padding: "0.65rem 0", fontSize: "0.64rem",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                  }}
                >
                  {busy ? "⏳" : "🔭"} KEŞİF YAP (1 ay) — +%20 şans & kaçış planı
                </button>
              )}
              <button
                onClick={handleExecute}
                disabled={busy || !!selectedJob.locked}
                className="btn-ember"
                style={{
                  width: "100%", padding: "0.8rem 0", fontSize: "0.76rem",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
                }}
              >
                {busy ? "⏳ İş başında…" : `🌒 HAREKETE GEÇ (%${selectedJob.chance_pct})`}
              </button>
              {selectedJob.locked && (
                <p className="font-serif" style={{
                  fontSize: "0.68rem", fontStyle: "italic", color: "var(--color-parchment-muted)",
                  display: "flex", alignItems: "center", gap: "0.35rem", margin: 0,
                }}>
                  🔒 {selectedJob.locked}
                </p>
              )}
            </div>
          )}

          {/* Uyarı */}
          <div className="row-frame" style={{ marginTop: "0.85rem", alignItems: "flex-start" }}>
            <span style={{ fontSize: "0.85rem", marginTop: "0.05rem" }}>⚠</span>
            <span className="font-serif" style={{
              fontSize: "0.72rem", fontStyle: "italic", color: "var(--color-parchment-muted)", lineHeight: 1.5,
            }}>
              İş ortasında işler sarpa sarabilir: saklan, sustur ya da kaç.
              Görülürsen tanık unutmaz; yakalanırsan ceza ödersin. Büyük işlerin
              ganimeti sıcaktır — satarken yakalanma riski taşır.
            </span>
          </div>
        </>
      )}
    </div>
  );
}
