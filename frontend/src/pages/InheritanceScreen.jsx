/**
 * InheritanceScreen.jsx
 * Oyuncu öldüğünde gösterilen nesil devri ekranı.
 * Props: state, onInherit(childId|null)
 */
import { useState, useEffect } from "react";
import { Skull, Baby, ChevronRight, Sparkles } from "lucide-react";

function StatRow({ label, value, inherited }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-stone-500 font-heading tracking-wider">{label}</span>
      <div className="flex items-center gap-2">
        {inherited != null && (
          <span className="text-amber-600 text-[10px]">+{inherited} miras</span>
        )}
        <span className="text-stone-200 font-heading">{value}</span>
      </div>
    </div>
  );
}

export default function InheritanceScreen({ playerName, generation, options, inheritedStats, inheritedSkills, inheritedMoney, onInherit, busy }) {
  const [selected, setSelected] = useState(null);
  const [phase, setPhase] = useState("eulogy"); // eulogy → choice → confirm
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const heirs = options?.filter(o => o.type === "çocuk") || [];
  const exileOption = options?.find(o => o.type === "sürgün");

  const handleSelect = (opt) => {
    setSelected(opt);
    setPhase("confirm");
  };

  const handleConfirm = () => {
    onInherit(selected?.id ?? null);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&family=Crimson+Text:ital,wght@0,400;1,400&display=swap');
        .inh-root { position: fixed; inset: 0; z-index: 9999; background: #060404; display: flex; align-items: center; justify-content: center; overflow-y: auto; padding: 24px; }
        .inh-card { max-width: 520px; width: 100%; }
        .inh-fade { transition: opacity 0.8s ease; }
        .inh-fade.hidden { opacity: 0; }
        .inh-fade.shown  { opacity: 1; }
        .inh-title { font-family: 'Cinzel Decorative', serif; font-size: clamp(22px, 6vw, 40px); color: #c0a060; text-align: center; margin-bottom: 4px; }
        .inh-sub   { font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.5em; color: #5a4020; text-transform: uppercase; text-align: center; }
        .inh-quote { font-family: 'Crimson Text', serif; font-style: italic; font-size: clamp(14px, 3vw, 17px); color: #907050; text-align: center; line-height: 1.8; }
        .inh-divider { width: 40px; height: 1px; background: linear-gradient(to right, transparent, #5a3a18, transparent); margin: 20px auto; }
        .inh-section { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 0.6em; color: #5a4020; text-transform: uppercase; margin-bottom: 12px; }
        .inh-heir-btn { width: 100%; background: #0e0b07; border: 1px solid #3a2a14; padding: 14px 16px; text-align: left; cursor: pointer; transition: border-color 0.2s, background 0.2s; margin-bottom: 8px; }
        .inh-heir-btn:hover { border-color: #c8944a55; background: #181008; }
        .inh-heir-btn.selected { border-color: #c8944a; background: #1e1208; }
        .inh-heir-name { font-family: 'Cinzel', serif; font-size: 14px; color: #d4a96a; }
        .inh-heir-info { font-family: 'Crimson Text', serif; font-size: 12px; color: #705040; margin-top: 2px; }
        .inh-btn-primary { width: 100%; padding: 12px; font-family: 'Cinzel', serif; font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase; color: #c8944a; background: #0e0b07; border: 1px solid #c8944a55; cursor: pointer; transition: all 0.2s; margin-top: 16px; }
        .inh-btn-primary:hover { background: #1e1208; box-shadow: 0 0 20px #c8944a22; }
        .inh-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }
        .inh-inheritance-box { background: #0e0b07; border: 1px solid #3a2a14; padding: 16px; margin-top: 12px; }
        .inh-badge { display: inline-flex; align-items: center; gap: 4px; font-family: 'Cinzel', serif; font-size: 10px; color: #c8944a; background: #1e1208; border: 1px solid #3a2a14; padding: 4px 8px; margin: 2px; }
        .inh-gen { font-family: 'Cinzel Decorative', serif; font-size: 11px; color: #5a4020; text-align: center; }
      `}</style>

      <div className="inh-root">
        <div className={`inh-card inh-fade ${visible ? "shown" : "hidden"}`}>

          {/* ── Eulogy phase ─────────────────────────── */}
          {phase === "eulogy" && (
            <>
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">⚰️</div>
                <div className="inh-title">{playerName}</div>
                <div className="inh-sub">Hayatını Tamamladı</div>
                <div className="inh-gen" style={{ marginTop: 8 }}>
                  {generation}. Nesil
                </div>
              </div>

              <div className="inh-divider" />

              <p className="inh-quote">
                "Her son bir başlangıçtır.<br />
                Küllerin içinde bir miras saklıdır<br />
                ve o miras seninle devam eder."
              </p>

              <div className="inh-divider" />

              {/* Inherited bonuses */}
              {(inheritedStats || inheritedMoney > 0) && (
                <div className="inh-inheritance-box">
                  <div className="inh-section" style={{ marginBottom: 10 }}>Nesle Bırakılan Miras</div>
                  <div className="flex flex-wrap">
                    {Object.entries(inheritedStats || {}).map(([k, v]) => v > 1 && (
                      <span key={k} className="inh-badge">+{v} {k.toUpperCase()}</span>
                    ))}
                    {Object.entries(inheritedSkills || {}).map(([k, v]) => v > 0 && (
                      <span key={k} className="inh-badge" style={{ color: "#7aaa60" }}>+{v} {k}</span>
                    ))}
                    {inheritedMoney > 0 && (
                      <span className="inh-badge" style={{ color: "#d4a96a" }}>+{inheritedMoney} Altın</span>
                    )}
                  </div>
                </div>
              )}

              <button className="inh-btn-primary" onClick={() => setPhase("choice")}>
                Nesli Devam Ettir →
              </button>
            </>
          )}

          {/* ── Choice phase ─────────────────────────── */}
          {phase === "choice" && (
            <>
              <div className="text-center mb-6">
                <Baby className="mx-auto mb-3" style={{ width: 36, height: 36, color: "#c8944a" }} />
                <div className="inh-title" style={{ fontSize: "clamp(18px,4vw,28px)" }}>
                  Varisi Seç
                </div>
                <p className="inh-quote" style={{ marginTop: 8 }}>
                  Kim bu mirası taşıyacak?
                </p>
              </div>

              {heirs.length > 0 && (
                <>
                  <div className="inh-section">Çocukların</div>
                  {heirs.map(h => (
                    <button
                      key={h.id}
                      className={`inh-heir-btn ${selected?.id === h.id ? "selected" : ""}`}
                      onClick={() => handleSelect(h)}
                    >
                      <div className="inh-heir-name">{h.name}</div>
                      <div className="inh-heir-info">
                        {h.age} yaşında · {h.gender} · {h.profession}
                      </div>
                    </button>
                  ))}
                  <div className="inh-divider" />
                </>
              )}

              {exileOption && (
                <>
                  <div className="inh-section">Alternatif</div>
                  <button
                    className={`inh-heir-btn ${selected?.type === "sürgün" ? "selected" : ""}`}
                    onClick={() => handleSelect(exileOption)}
                  >
                    <div className="inh-heir-name">🌍 {exileOption.name}</div>
                    <div className="inh-heir-info">
                      Aynı dünyada yeni bir çocuk olarak başla — miras yok, ama dünya devam ediyor.
                    </div>
                  </button>
                </>
              )}

              {selected && (
                <button className="inh-btn-primary" onClick={() => setPhase("confirm")}>
                  Seçimi Onayla →
                </button>
              )}
            </>
          )}

          {/* ── Confirm phase ────────────────────────── */}
          {phase === "confirm" && selected && (
            <>
              <div className="text-center mb-6">
                <Sparkles className="mx-auto mb-3" style={{ width: 36, height: 36, color: "#c8944a" }} />
                <div className="inh-title" style={{ fontSize: "clamp(18px,4vw,28px)" }}>
                  {selected.type === "çocuk" ? selected.name : "Yeni Hayat"}
                </div>
                <div className="inh-sub">
                  {selected.type === "çocuk" ? `${selected.age} yaşında başlıyor` : "Sürgün · 7 yaşında başlıyor"}
                </div>
              </div>

              {selected.type === "çocuk" && (
                <div className="inh-inheritance-box">
                  <div className="inh-section" style={{ marginBottom: 10 }}>Bu Nesle Aktarılan</div>
                  <div className="flex flex-wrap">
                    {Object.entries(inheritedStats || {}).map(([k, v]) => v > 1 && (
                      <span key={k} className="inh-badge">+{v} {k.toUpperCase()}</span>
                    ))}
                    {inheritedMoney > 0 && (
                      <span className="inh-badge" style={{ color: "#d4a96a" }}>+{inheritedMoney} Altın</span>
                    )}
                  </div>
                </div>
              )}

              {selected.type === "sürgün" && (
                <p className="inh-quote">
                  Miras yok, ama aynı dünya. Aynı krallıklar, aynı NPC'ler.<br />
                  Belki bir gün atanın izini bulursun.
                </p>
              )}

              <button
                className="inh-btn-primary"
                onClick={handleConfirm}
                disabled={busy}
              >
                {busy ? "Yükleniyor…" : "Maceraya Başla →"}
              </button>

              <button
                onClick={() => setPhase("choice")}
                style={{ display: "block", width: "100%", marginTop: 8, padding: "8px", fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: "0.3em", color: "#5a4020", background: "transparent", border: "none", cursor: "pointer" }}
              >
                ← Geri Dön
              </button>
            </>
          )}

        </div>
      </div>
    </>
  );
}
