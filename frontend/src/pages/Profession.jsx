/**
 * Meslek & Kariyer — KÜL & KÖZ.
 * Duygu görevi: "Zanaatım kimliğim" — kariyer merdiveni dikey bir yol gibi.
 * İşlevsellik (API çağrıları, state akışı) birebir korunur.
 */
import React, { useState } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { playSfx } from "@/lib/audio";
import { toast } from "sonner";
import { PageHeader, Panel, Pill, GoldRule, EmptyState, Coin, TONES } from "@/components/ui/Kit";

// ── Meslek tanımları (frontend'de gösterim için) ──────────────────────────
const PROFESSION_DATA = {
  "işsiz":          { icon: "😴", tone: "ash",   income: [0, 0],   trains: [] },
  "köylü":          { icon: "🌾", tone: "sage",  income: [0, 2],   trains: ["Dayanıklılık"] },
  "çiftçi":         { icon: "🌿", tone: "sage",  income: [1, 4],   trains: ["Dayanıklılık", "Zanaatkarlık"] },
  "avcı":           { icon: "🏹", tone: "gold",  income: [1, 6],   trains: ["Savaş", "Dayanıklılık"] },
  "demirci çırağı": { icon: "🔨", tone: "ember", income: [1, 4],   trains: ["Zanaatkarlık", "Güç"] },
  "demirci":        { icon: "⚒️", tone: "ember", income: [4, 12],  trains: ["Zanaatkarlık", "Güç"] },
  "tüccar":         { icon: "💰", tone: "gold",  income: [3, 8],   trains: ["Ticaret", "Sosyal", "Karizm"] },
  "haydut":         { icon: "🗡️", tone: "blood", income: [3, 12],  trains: ["Savaş", "Ticaret"] },
  "asker":          { icon: "⚔️", tone: "blood", income: [2, 5],   trains: ["Savaş", "Güç", "Dayanıklılık"] },
  "şövalye":        { icon: "🛡️", tone: "ink",   income: [6, 18],  trains: ["Savaş", "Güç", "Karizm"] },
  "şifacı":         { icon: "🌿", tone: "sage",  income: [3, 10],  trains: ["Zanaatkarlık", "Sosyal", "Zeka"] },
  "zanaatkar":      { icon: "🛠️", tone: "ash",   income: [2, 7],   trains: ["Zanaatkarlık", "Zeka"] },
  "katip":          { icon: "📜", tone: "ink",   income: [2, 7],   trains: ["Zeka"] },
  "rahip":          { icon: "✝️", tone: "ink",   income: [2, 8],   trains: ["Sosyal", "Karizm"] },
  "lord":           { icon: "👑", tone: "gold",  income: [15, 70], trains: ["Sosyal", "Savaş", "Karizm"] },
};

// ── Kariyer aşamaları önizleme ────────────────────────────────────────────
const CAREER_STAGES_PREVIEW = {
  "köylü":          ["Köylü", "Deneyimli Köylü", "Köy Ağası"],
  "çiftçi":         ["Çiftçi", "Verimli Çiftçi", "Toprak Sahibi", "Köy Zengini"],
  "avcı":           ["Avcı", "Tecrübeli Avcı", "Baş Avcı", "Efsane Avcı"],
  "demirci çırağı": ["Demirci Çırağı", "Yardımcı Demirci", "Kalfa Demirci"],
  "demirci":        ["Demirci", "Usta Demirci", "Demirci Üstadı", "Lonca Demircisi", "Efsane Demirci"],
  "tüccar":         ["Pazarcı", "Dükkan Sahibi", "Tüccar", "Kervan Sahibi", "Lonca Üyesi", "Lonca Yöneticisi", "Büyük Lonca Üstadı"],
  "asker":          ["Genç Asker", "Savaşmış Er", "Onbaşı", "Subaşı", "Yüzbaşı", "Bölge Komutanı", "Paşa"],
  "şövalye":        ["Şövalye", "Seçkin Şövalye", "Şampiyonu", "Efsane Şövalye"],
  "haydut":         ["Sıradan Hırsız", "Silahşör", "Çete Üyesi", "Çete Lideri", "Haraç Beyi", "Eşkıya Sultanı"],
  "şifacı":         ["Çırak Hekim", "Şifacı", "Hekim", "Ünlü Hekim", "Başhekim"],
  "zanaatkar":      ["Zanaatkar Çırak", "Kalfa", "Usta", "Tanınan Usta", "Lonca Başkanı"],
  "katip":          ["Katip", "Baş Katip", "Divân Kâtibi", "Divân Reisi"],
  "rahip":          ["Sıradan Mürit", "İmam", "Kadı", "Baş Kadı", "Müftü", "Şeyhülislam"],
  "lord":           ["Bey", "Güçlü Bey", "Vali", "Sultan"],
};

// ── Meslek değiştirme gereksinimleri (backend JOB_REQUIREMENTS ile senkronize) ──
const PROFESSION_REQS = {
  "köylü":          { minAge: 7,  stats: { strength: 2, stamina: 2 } },
  "çiftçi":         { minAge: 10, stats: { strength: 3, stamina: 3 } },
  "avcı":           { minAge: 12, stats: { stamina: 4, intelligence: 3 } },
  "demirci çırağı": { minAge: 13, stats: { strength: 4, stamina: 3 } },
  "demirci":        { minAge: 16, stats: { strength: 6, stamina: 5 }, skill: { crafting: 3 } },
  "tüccar":         { minAge: 14, stats: { charisma: 5, intelligence: 4 }, skill: { trade: 2 } },
  "haydut":         { minAge: 14, stats: { strength: 4, stamina: 3 } },
  "asker":          { minAge: 16, stats: { strength: 5, stamina: 5 }, skill: { combat: 2 } },
  "şövalye":        { minAge: 18, stats: { strength: 7, stamina: 6, charisma: 4 }, skill: { combat: 5 } },
  "şifacı":         { minAge: 16, stats: { intelligence: 6, charisma: 4 }, skill: { crafting: 3 } },
  "zanaatkar":      { minAge: 14, stats: { intelligence: 4, strength: 3 }, skill: { crafting: 2 } },
  "katip":          { minAge: 14, stats: { intelligence: 6 }, skill: { social: 2 } },
  "rahip":          { minAge: 18, stats: { intelligence: 5, charisma: 6 }, skill: { social: 4 } },
  "lord":           { minAge: 18, stats: { charisma: 6, strength: 5, intelligence: 5 }, skill: { combat: 5, social: 4 } },
};

// Stat ve skill görünen adları
const STAT_LABELS = {
  strength: "Güç", stamina: "Dayanıklılık",
  intelligence: "Zeka", charisma: "Karizm",
};
const SKILL_LABELS = {
  combat: "Savaş", trade: "Ticaret",
  crafting: "Zanaat", social: "Sosyal",
};

// ── sub-components ────────────────────────────────────────────────────────
function IncomeRange({ lo, hi }) {
  if (lo === 0 && hi === 0) {
    return (
      <span className="font-serif" style={{ fontSize: "0.74rem", fontStyle: "italic", color: "var(--color-parchment-muted)" }}>
        Gelir yok
      </span>
    );
  }
  return (
    <span style={{ whiteSpace: "nowrap" }}>
      <Coin value={`${lo}–${hi}`} size="0.78rem" />
      <span className="label-tiny" style={{ marginLeft: "0.2rem" }}>/gün</span>
    </span>
  );
}

function TrainBadge({ label }) {
  return <Pill tone="ash">{label}</Pill>;
}

/* Kariyer merdiveni — dikey yol: geçilen basamaklar altın, sıradaki köz */
function CareerLadder({ stages, currentTitle }) {
  if (!stages?.length) return null;
  const curIdx = stages.indexOf(currentTitle);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {stages.map((title, i) => {
        const passed = curIdx >= 0 && i < curIdx;
        const current = i === curIdx;
        const color = current ? "var(--color-gold)" : passed ? "var(--color-gold-dim)" : "var(--color-parchment-muted)";
        return (
          <div key={title} style={{ display: "flex", gap: "0.6rem", alignItems: "stretch" }}>
            {/* Yol çizgisi + basamak */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "14px" }}>
              {i > 0 && (
                <div style={{
                  width: "1px", flex: 1, minHeight: "0.45rem",
                  background: passed || current ? "rgba(201,168,76,0.5)" : "rgba(122,106,79,0.3)",
                }} />
              )}
              <div style={{
                width: current ? "10px" : "7px", height: current ? "10px" : "7px",
                borderRadius: "50%", flexShrink: 0,
                background: current ? "var(--color-gold)" : passed ? "var(--color-gold-dim)" : "rgba(122,106,79,0.4)",
                boxShadow: current ? "0 0 10px rgba(201,168,76,0.6)" : "none",
              }} />
            </div>
            <div className="font-display" style={{
              fontSize: current ? "0.76rem" : "0.64rem",
              fontWeight: current ? 700 : 600,
              color, padding: i > 0 ? "0.4rem 0 0.1rem" : "0 0 0.1rem",
              letterSpacing: "0.06em",
              textShadow: current ? "0 0 10px rgba(201,168,76,0.35)" : "none",
              display: "flex", alignItems: "flex-end", gap: "0.4rem",
            }}>
              {title}
              {current && <span style={{ fontSize: "0.55rem", color: "var(--color-gold-dim)" }}>← buradasın</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkResult({ result, onClose }) {
  if (!result) return null;
  const { career } = result;
  return (
    <div className="bg-black/80" style={{
      position: "fixed", inset: 0, zIndex: 50, display: "flex",
      alignItems: "center", justifyContent: "center", padding: "1rem",
    }}>
      <div className="card-frame rise-in" style={{ width: "100%", maxWidth: "24rem", overflow: "hidden" }}>
        <div style={{
          padding: "1rem 1.25rem 0.7rem", borderBottom: "1px solid var(--color-border)",
          background: "linear-gradient(to right, rgba(201,168,76,0.08), transparent 70%)",
        }}>
          <div className="font-display" style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            fontSize: "0.74rem", fontWeight: 700, letterSpacing: "0.18em",
            textTransform: "uppercase", color: "var(--color-gold)",
          }}>
            🔥 ÇALIŞMA SONUCU
          </div>
        </div>
        <div style={{ padding: "1.1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.7rem" }}>

          {/* Hikayeli anlatı */}
          {result.work_narrative && (
            <p className="font-serif" style={{
              fontSize: "0.8rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
              lineHeight: 1.55, margin: 0, paddingBottom: "0.7rem",
              borderBottom: "1px solid var(--color-border)",
            }}>
              {result.work_narrative}
            </p>
          )}

          {/* Kariyer terfisi — EN ÖNEMLİ BİLGİ */}
          {career?.promoted && career.current_stage && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: "0.5rem",
              border: "1px solid rgba(201,168,76,0.45)", background: "rgba(201,168,76,0.08)",
              borderRadius: "6px", padding: "0.6rem 0.75rem",
              boxShadow: "0 0 16px rgba(201,168,76,0.15)",
            }}>
              <span style={{ fontSize: "1rem" }}>⭐</span>
              <div>
                <div className="font-display" style={{
                  fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.14em",
                  textTransform: "uppercase", color: "var(--color-gold)",
                }}>
                  Yeni Unvan!
                </div>
                <div className="font-display" style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--color-parchment)", marginTop: "0.15rem" }}>
                  {career.current_stage.title}
                </div>
                {career.current_stage.desc && (
                  <div className="font-serif" style={{
                    fontSize: "0.72rem", fontStyle: "italic", color: "var(--color-gold-dim)", marginTop: "0.15rem",
                  }}>
                    {career.current_stage.desc}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gelir */}
          {result.income > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem" }}>📈</span>
              <span className="font-serif" style={{ fontSize: "0.82rem", color: "var(--color-parchment-dim)" }}>
                Kazanç: <Coin value={result.income} size="0.85rem" />
              </span>
            </div>
          )}

          {/* Ay döndü */}
          {result.week_passed && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem" }}>🌙</span>
              <span className="font-serif" style={{ fontSize: "0.8rem", fontStyle: "italic", color: "var(--color-parchment-dim)" }}>
                Bir ay tamamlandı — eğitim uygulandı
              </span>
            </div>
          )}

          {/* Stat/Skill seviye atlama */}
          {result.leveled?.length > 0 && result.leveled.map(([type, name, lvl], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.85rem" }}>✨</span>
              <span className="font-display" style={{ fontSize: "0.76rem", fontWeight: 700, color: TONES.sage.text }}>
                {name} seviye {lvl}'e yükseldi!
              </span>
            </div>
          ))}

          {/* Kariyer progress bar (terfi yoksa göster) */}
          {career && !career.promoted && career.next_stage && (
            <div style={{ paddingTop: "0.2rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span className="label-tiny">Kariyer: {career.current_stage?.title}</span>
                <span className="font-display" style={{ fontSize: "0.56rem", color: "var(--color-parchment-muted)" }}>
                  {career.job_xp} / {career.next_stage.xp_required} XP
                </span>
              </div>
              <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${career.progress_pct ?? 0}%`, borderRadius: "2px",
                  background: "linear-gradient(to right, rgba(224,90,48,0.7), #E05A30)",
                  boxShadow: "0 0 6px rgba(224,90,48,0.45)", transition: "width 0.7s ease",
                }} />
              </div>
            </div>
          )}

        </div>
        <div style={{ padding: "0 1.25rem 1.25rem" }}>
          <button onClick={onClose} className="btn-ember"
            style={{ width: "100%", padding: "0.65rem 0", fontSize: "0.66rem" }}>
            Devam Et →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main ──────────────────────────────────────────────────────────────────
export default function Profession() {
  const { state, fetchState } = useGame() || {};
  const [working, setWorking]         = useState(false);
  const [changing, setChanging]       = useState(false);
  const [workResult, setWorkResult]   = useState(null);
  const [showChange, setShowChange]   = useState(false);
  const [confirmProf, setConfirmProf] = useState(null);
  // R2: çalışma tarzı (varsayılan hatırlanır) + bekleyen meslek mini-olayı
  const [workStyle, setWorkStyle] = useState(
    localStorage.getItem("kronikler_work_style") || "normal");
  const [workEvent, setWorkEvent] = useState(null);
  const WORK_STYLES = [
    { id: "garantici", label: "Garantici", icon: "🛡️", hint: "×0.8 · risksiz" },
    { id: "normal",    label: "Normal",    icon: "⚒️", hint: "×1.0" },
    { id: "hirsli",    label: "Hırslı",    icon: "🔥", hint: "×1.4 · %15 risk" },
    { id: "kaytarici", label: "Kaytarıcı", icon: "😴", hint: "×0.4 · sağlık +" },
  ];
  const pickStyle = (id) => {
    playSfx("click");
    setWorkStyle(id);
    localStorage.setItem("kronikler_work_style", id);
  };

  const player   = state?.player || {};
  const age      = player?.age || 0;
  const prof     = player?.profession || "işsiz";
  const profData = PROFESSION_DATA[prof] || PROFESSION_DATA["işsiz"];
  const career   = player?.career || {};
  const profTone = TONES[profData.tone] || TONES.gold;

  const handleWork = async () => {
    setWorking(true);
    try {
      const { data } = await api.post(`/game/work?style=${workStyle}`);
      if (data.needs_choice) {
        // R2 SIRADA: meslek mini-olayı — seçim modalı açılır
        setWorkEvent(data.work_event);
      } else {
        if (fetchState) await fetchState();
        playSfx("success");
        setWorkResult(data);
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Çalışılamadı.");
    } finally {
      setWorking(false);
    }
  };

  const resolveWorkEvent = async (choiceId) => {
    setWorking(true);
    try {
      const { data } = await api.post("/game/work/resolve", { choice_id: choiceId });
      setWorkEvent(null);
      if (fetchState) await fetchState();
      playSfx("success");
      setWorkResult(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Seçim uygulanamadı.");
      setWorkEvent(null);
    } finally {
      setWorking(false);
    }
  };

  const handleChangeProfession = async (newProf) => {
    setChanging(true);
    try {
      await api.post("/game/job", { profession: newProf });
      if (fetchState) await fetchState();
      setShowChange(false);
      playSfx("page");
      toast.success(`Mesleğin değişti: ${newProf}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Meslek değiştirilemedi.");
    } finally {
      setChanging(false);
    }
  };

  if (!state) return null;

  // Kilit kontrolü — yaş, önkoşul meslek, stat ve skill
  const isLocked = (id) => {
    const req = PROFESSION_REQS[id];
    if (!req) return false;
    if (age < (req.minAge || 0)) return true;
    if (req.prev && player?.profession !== req.prev) return true;
    if (req.stats) {
      for (const [stat, val] of Object.entries(req.stats)) {
        if ((player?.stats?.[stat] || 0) < val) return true;
      }
    }
    if (req.skill) {
      for (const [skill, val] of Object.entries(req.skill)) {
        if ((player?.skills?.[skill] || 0) < val) return true;
      }
    }
    return false;
  };

  const available = Object.entries(PROFESSION_DATA).filter(([id]) => {
    if (id === "işsiz" || id === prof) return false;
    return !isLocked(id);
  });

  const locked = Object.entries(PROFESSION_DATA).filter(([id]) => {
    if (id === "işsiz" || id === prof) return false;
    return isLocked(id);
  });

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 6rem" }}>

      <PageHeader
        kicker="Zanaat & Alın Teri"
        icon={profData.icon}
        title={career.title || prof}
        sub="Zanaatın kimliğindir — adın, ellerinin işiyle anılır."
        right={
          career.stage?.income_multiplier > 1 ? (
            <div style={{ textAlign: "right" }}>
              <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>Kariyer Bonusu</div>
              <span className="font-display" style={{
                fontSize: "0.95rem", fontWeight: 700, color: TONES.sage.text,
                textShadow: "0 0 10px rgba(74,154,90,0.4)",
              }}>
                ×{career.stage.income_multiplier.toFixed(1)}
              </span>
            </div>
          ) : null
        }
      />

      {/* ── Mevcut meslek ── */}
      <Panel title="Tezgâhın Başında" icon="⚒" tone="gold"
        right={<Pill tone={profData.tone}>{prof}</Pill>}>

        {/* Kimlik satırı */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem", marginBottom: "0.8rem" }}>
          <span style={{ fontSize: "2rem", filter: `drop-shadow(0 0 10px ${profTone.text}55)` }}>
            {profData.icon}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-display" style={{
              fontSize: "1.15rem", fontWeight: 700, color: profTone.text,
              textShadow: `0 0 12px ${profTone.text}44`, lineHeight: 1.2,
            }}>
              {career.title || prof}
            </div>
            <div className="font-serif" style={{
              fontSize: "0.72rem", fontStyle: "italic", color: "var(--color-parchment-muted)", marginTop: "0.15rem",
            }}>
              {age} yaş · {player?.location_name || "Bilinmiyor"}
            </div>
            {career.stage?.desc && (
              <p className="font-serif" style={{
                fontSize: "0.76rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
                marginTop: "0.35rem", marginBottom: 0, lineHeight: 1.5,
              }}>
                {career.stage.desc}
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem", marginBottom: "0.8rem" }}>
          <div>
            <div className="label-tiny" style={{ marginBottom: "0.25rem" }}>Günlük Kazanç</div>
            <IncomeRange lo={profData.income[0]} hi={profData.income[1]} />
          </div>
          <div>
            <div className="label-tiny" style={{ marginBottom: "0.25rem" }}>Geliştirdiği Alanlar</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {profData.trains.length > 0
                ? profData.trains.map(t => <TrainBadge key={t} label={t} />)
                : <span className="font-serif" style={{ fontSize: "0.74rem", color: "var(--color-parchment-muted)" }}>—</span>
              }
            </div>
          </div>
        </div>

        {/* Kariyer merdiveni — dikey yol */}
        {CAREER_STAGES_PREVIEW[prof] && (
          <>
            <GoldRule label="Kariyer Yolu" />
            <CareerLadder stages={CAREER_STAGES_PREVIEW[prof]} currentTitle={career.title} />
          </>
        )}

        {/* Kariyer progress */}
        <div style={{ margin: "0.8rem 0 0.7rem" }}>
          {career.next_stage ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", gap: "0.5rem" }}>
                <span className="font-serif" style={{ fontSize: "0.74rem", fontStyle: "italic", color: "var(--color-parchment-muted)" }}>
                  Sonraki unvan:{" "}
                  <span className="font-display" style={{ fontStyle: "normal", fontWeight: 700, color: profTone.text }}>
                    {career.next_stage.title}
                  </span>
                </span>
                <span className="font-display" style={{ fontSize: "0.6rem", color: "var(--color-parchment-muted)", flexShrink: 0 }}>
                  {career.job_xp ?? 0} / {career.next_stage.xp_required} XP
                </span>
              </div>
              <div style={{ height: "5px", background: "rgba(255,255,255,0.07)", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${career.progress_pct ?? 0}%`, borderRadius: "2px",
                  background: `linear-gradient(to right, ${profTone.text}88, ${profTone.text})`,
                  boxShadow: `0 0 6px ${profTone.text}55`, transition: "width 0.5s ease",
                }} />
              </div>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span className="font-display" style={{ fontSize: "0.8rem", fontWeight: 700, color: profTone.text }}>
                {career.title}
              </span>
              <span className="font-serif" style={{ fontSize: "0.74rem", fontStyle: "italic", color: "var(--color-parchment-muted)" }}>
                — bu meslekte zirvedesin.
              </span>
            </div>
          )}
        </div>

        {/* Aylık çalışma progress — 7 gün kutusu */}
        <div style={{ marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
            <span className="label-tiny">Aylık Çalışma</span>
            <span className="font-display" style={{ fontSize: "0.6rem", color: "var(--color-parchment-muted)" }}>
              {player?.work_units || 0}/7 gün
            </span>
          </div>
          <div style={{ display: "flex", gap: "3px" }}>
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                style={{
                  flex: 1, height: "8px", borderRadius: "2px", transition: "all 0.3s",
                  background: i < (player?.work_units || 0)
                    ? "linear-gradient(to bottom, #C9A84C, #8B6914)"
                    : "rgba(255,255,255,0.06)",
                  boxShadow: i < (player?.work_units || 0) ? "0 0 6px rgba(201,168,76,0.4)" : "none",
                }}
              />
            ))}
          </div>
          <div className="font-serif" style={{
            fontSize: "0.66rem", fontStyle: "italic", color: "var(--color-parchment-muted)", marginTop: "0.25rem",
          }}>
            Ay dolunca eğitim uygulanır — alın teri stat olur.
          </div>
        </div>

        {/* R2: Çalışma Tarzı — görünür risk/ödül farkıyla 4 seçenek */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.35rem", marginBottom: "0.6rem" }}>
          {WORK_STYLES.map((s) => (
            <button key={s.id} onClick={() => pickStyle(s.id)} disabled={working}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem",
                padding: "0.45rem 0.1rem", borderRadius: "5px", cursor: "pointer", transition: "all 0.15s",
                border: workStyle === s.id ? "1px solid rgba(201,168,76,0.55)" : "1px solid var(--color-border)",
                background: workStyle === s.id ? "rgba(201,168,76,0.1)" : "transparent",
              }}>
              <span style={{ fontSize: "0.85rem" }}>{s.icon}</span>
              <span className="font-display" style={{
                fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                color: workStyle === s.id ? "var(--color-gold)" : "var(--color-parchment-muted)",
              }}>
                {s.label}
              </span>
              <span style={{ fontSize: "0.46rem", color: "var(--color-parchment-muted)" }}>{s.hint}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleWork}
          disabled={working || prof === "işsiz"}
          className="btn-ember"
          style={{
            width: "100%", padding: "0.8rem 0", fontSize: "0.7rem",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
          }}
        >
          {working ? "⏳ ÇALIŞIYOR…" : "⚒ BİR GÜN ÇALIŞ"}
        </button>

        {prof === "işsiz" && (
          <p className="font-serif" style={{
            textAlign: "center", fontSize: "0.74rem", fontStyle: "italic",
            color: "var(--color-parchment-muted)", marginTop: "0.5rem", marginBottom: 0,
          }}>
            Bir meslek seç, sonra çalışabilirsin.
          </p>
        )}
      </Panel>

      <GoldRule label="Yol Ayrımı" />

      {/* ── Meslek değiştir ── */}
      <Panel title="Meslek Değiştir" icon="🔀" tone="ash"
        right={
          <button
            onClick={() => setShowChange(v => !v)}
            className="font-display"
            style={{
              background: "none", border: "none", padding: 0, cursor: "pointer",
              fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
              color: "var(--color-gold-dim)", display: "flex", alignItems: "center", gap: "0.25rem",
            }}
          >
            {showChange ? "Kapat ▲" : "Göster ▼"}
          </button>
        }>
        {!showChange && (
          <p className="font-serif" style={{
            fontSize: "0.76rem", fontStyle: "italic", color: "var(--color-parchment-muted)", margin: 0,
          }}>
            Başka bir yol mu arıyorsun? Her zanaat yeni bir hikâye açar — ama eski emeğin geride kalır.
          </p>
        )}

        {showChange && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {available.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {available.map(([id, data]) => {
                  const t = TONES[data.tone] || TONES.gold;
                  return (
                    <button
                      key={id}
                      onClick={() => { playSfx("click"); setConfirmProf(id); }}
                      disabled={changing}
                      className="row-frame"
                      style={{
                        width: "100%", textAlign: "left", cursor: "pointer",
                        alignItems: "flex-start", padding: "0.65rem 0.75rem",
                        border: confirmProf === id ? `1.5px solid ${t.text}` : undefined,
                        background: confirmProf === id ? t.bg : undefined,
                        opacity: changing ? 0.5 : 1,
                      }}
                    >
                      <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{data.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-display" style={{
                          fontSize: "0.8rem", fontWeight: 700, textTransform: "capitalize", color: t.text,
                        }}>
                          {id}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.25rem" }}>
                          {data.trains.map(t2 => <TrainBadge key={t2} label={t2} />)}
                        </div>
                        {CAREER_STAGES_PREVIEW[id] && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                            {CAREER_STAGES_PREVIEW[id].map((title, i) => (
                              <React.Fragment key={title}>
                                <span className="font-serif" style={{ fontSize: "0.62rem", fontStyle: "italic", color: "var(--color-parchment-muted)" }}>
                                  {title}
                                </span>
                                {i < CAREER_STAGES_PREVIEW[id].length - 1 && (
                                  <span style={{ fontSize: "0.5rem", color: "var(--color-gold-dim)" }}>→</span>
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <IncomeRange lo={data.income[0]} hi={data.income[1]} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Meslek değiştirme onay paneli */}
            {confirmProf && (() => {
              const cd = PROFESSION_DATA[confirmProf];
              const currentXp = career.job_xp || 0;
              const ct = TONES[cd?.tone] || TONES.gold;
              return (
                <div className="card-frame" style={{
                  padding: "0.85rem", border: "1px solid rgba(224,90,48,0.45)",
                  display: "flex", flexDirection: "column", gap: "0.6rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{cd?.icon}</span>
                    <div>
                      <div className="font-display" style={{
                        fontSize: "0.95rem", fontWeight: 700, textTransform: "capitalize", color: ct.text,
                      }}>
                        {confirmProf}
                      </div>
                      <div className="font-serif" style={{ fontSize: "0.7rem", fontStyle: "italic", color: "var(--color-parchment-muted)" }}>
                        olarak devam etmek istiyor musun?
                      </div>
                    </div>
                  </div>
                  {currentXp > 0 && (
                    <div className="font-serif" style={{
                      display: "flex", alignItems: "flex-start", gap: "0.4rem",
                      fontSize: "0.74rem", fontStyle: "italic", color: TONES.ember.text,
                      border: "1px solid rgba(224,90,48,0.35)", background: "rgba(224,90,48,0.06)",
                      borderRadius: "5px", padding: "0.5rem 0.65rem",
                    }}>
                      <span>⚠</span>
                      <span>Mevcut <strong>{currentXp} kariyer XP</strong>'in sıfırlanacak. Bu geri alınamaz.</span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => { handleChangeProfession(confirmProf); setConfirmProf(null); }}
                      disabled={changing}
                      className="btn-ember"
                      style={{ flex: 1, padding: "0.55rem 0", fontSize: "0.62rem" }}
                    >
                      Evet, Değiştir
                    </button>
                    <button
                      onClick={() => setConfirmProf(null)}
                      className="btn-ghost-ash"
                      style={{ padding: "0.55rem 1rem", fontSize: "0.62rem" }}
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              );
            })()}

            {locked.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <GoldRule label="Kilitli Meslekler" />
                {locked.map(([id, data]) => {
                  const req = PROFESSION_REQS[id];
                  return (
                    <div key={id} className="row-frame" style={{ alignItems: "flex-start", opacity: 0.55 }}>
                      <span style={{ fontSize: "1.4rem", filter: "grayscale(1)", flexShrink: 0 }}>{data.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div className="font-display" style={{
                          fontSize: "0.78rem", fontWeight: 700, textTransform: "capitalize",
                          color: "var(--color-parchment-muted)",
                        }}>
                          {id}
                        </div>
                        <div className="font-serif" style={{
                          fontSize: "0.66rem", color: "var(--color-parchment-muted)",
                          marginTop: "0.15rem", display: "flex", flexDirection: "column", gap: "0.05rem",
                        }}>
                          {age < (req?.minAge || 0) && (
                            <div>Yaş: {age}/{req.minAge}</div>
                          )}
                          {req?.stats && Object.entries(req.stats).map(([stat, val]) => {
                            const playerVal = player?.stats?.[stat] || 0;
                            const ok = playerVal >= val;
                            return (
                              <div key={stat} style={{ color: ok ? "rgba(111,191,127,0.6)" : undefined }}>
                                {STAT_LABELS[stat] || stat}: {playerVal}/{val}{ok ? " ✓" : ""}
                              </div>
                            );
                          })}
                          {req?.skill && Object.entries(req.skill).map(([skill, val]) => {
                            const playerVal = player?.skills?.[skill] || 0;
                            const ok = playerVal >= val;
                            return (
                              <div key={skill} style={{ color: ok ? "rgba(111,191,127,0.6)" : undefined }}>
                                {SKILL_LABELS[skill] || skill} skili: {playerVal}/{val}{ok ? " ✓" : ""}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <span style={{ fontSize: "0.85rem", opacity: 0.6, flexShrink: 0 }}>🔒</span>
                    </div>
                  );
                })}
              </div>
            )}

            {available.length === 0 && locked.length === 0 && (
              <EmptyState
                icon="🧭"
                title="Şu an değiştirebileceğin başka bir meslek yok."
                sub="Büyü, güçlen — yeni yollar kendiliğinden açılır."
              />
            )}
          </div>
        )}
      </Panel>

      {workResult && (
        <WorkResult result={workResult} onClose={() => setWorkResult(null)} />
      )}
    {/* R2: Meslek Mini-Olayı modalı — iş sahnesinde seçim */}
    {workEvent && (
      <div className="bg-black/80" style={{
        position: "fixed", inset: 0, zIndex: 60, display: "flex",
        alignItems: "center", justifyContent: "center", padding: "1rem",
      }}>
        <div className="card-frame" style={{
          width: "100%", maxWidth: "24rem", overflow: "hidden",
          border: "1px solid rgba(201,168,76,0.4)",
        }}>
          <div style={{ height: "3px", width: "100%", background: "linear-gradient(90deg, #8B6914, #C9A84C, #8B6914)" }} />
          <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div style={{ textAlign: "center", fontSize: "2.2rem", filter: "drop-shadow(0 0 12px rgba(201,168,76,0.35))" }}>⚒️</div>
            <div className="font-display" style={{
              textAlign: "center", fontSize: "0.6rem", letterSpacing: "0.25em",
              textTransform: "uppercase", color: "var(--color-gold-dim)",
            }}>
              İş Başında Bir An
            </div>
            <p className="font-serif" style={{
              fontSize: "0.86rem", fontStyle: "italic", textAlign: "center",
              color: "var(--color-parchment)", lineHeight: 1.55, margin: 0,
            }}>
              {workEvent.metin}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {workEvent.secenekler.map((c) => (
                <button key={c.id} disabled={working}
                  onClick={() => resolveWorkEvent(c.id)}
                  className="row-frame"
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    flexDirection: "column", alignItems: "flex-start", gap: "0.15rem",
                    opacity: working ? 0.5 : 1,
                  }}>
                  <span className="font-serif" style={{ fontSize: "0.82rem", color: "var(--color-parchment)" }}>
                    {c.metin}
                  </span>
                  {c.test && (
                    <span className="font-display" style={{ fontSize: "0.6rem", color: TONES.ink.text }}>
                      🎲 Sınav: {c.test.stat || c.test.skill} {c.test.esik}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
