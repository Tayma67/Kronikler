/**
 * Ayarlar — KÜL & KÖZ görsel yeniden tasarım.
 * Duygu görevi: "Sessiz köşe." — sade ama aynı dilden; az süs,
 * mum ışığı sükuneti. İşlevsellik birebir korunur.
 */
import { useEffect, useState, useCallback } from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { getAudioSettings, setAudioSettings, playSfx } from "@/lib/audio";
import { toast } from "sonner";
import { PageHeader, Panel, Pill } from "@/components/ui/Kit";

function Slider({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.25rem 0" }}>
      <span className="label-tiny" style={{ width: "4.5rem", flexShrink: 0 }}>{label}</span>
      <input type="range" min="0" max="100" value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        style={{ flex: 1, accentColor: "#C9A84C" }} />
      <span className="font-display" style={{
        fontSize: "0.66rem", fontWeight: 700, color: "var(--color-parchment-dim)",
        width: "2.4rem", textAlign: "right", flexShrink: 0,
      }}>
        %{Math.round(value * 100)}
      </span>
    </div>
  );
}

export default function Settings() {
  const [audio, setAudio] = useState(getAudioSettings());
  const [fontScale, setFontScale] = useState(
    Number(localStorage.getItem("kronikler_font_scale") || 100));
  const [slot, setSlot] = useState(localStorage.getItem("kronikler_save_slot") || "1");
  const [achievements, setAchievements] = useState(null);
  const [stats, setStats] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([
        api.get("/meta/achievements"),
        api.get("/meta/stats"),
      ]);
      setAchievements(a.data);
      setStats(s.data);
    } catch (e) {
      // Aktif oyun yoksa sessizce geç
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
    localStorage.setItem("kronikler_font_scale", String(fontScale));
  }, [fontScale]);

  const updateAudio = (patch) => {
    const next = setAudioSettings(patch);
    setAudio(next);
  };

  const changeSlot = (n) => {
    localStorage.setItem("kronikler_save_slot", n);
    setSlot(n);
    toast.success(`Kayıt ${n} aktif — sayfa yenileniyor...`);
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="page-shell rise-in" data-testid="settings-page" style={{ padding: "0 0 1.5rem" }}>
      <PageHeader
        kicker="Sessiz Köşe"
        icon="🕯"
        title="Ayarlar"
        sub="Mum ışığında bir nefes; kervan beklesin, sen düzeni kur."
      />

      {/* ── Kayıt Slotları ── */}
      <Panel title="Kayıt Slotları" icon="📜" tone="ash">
        <p className="font-serif" style={{
          fontSize: "0.74rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)", marginBottom: "0.6rem",
        }}>
          Her slot bağımsız bir hayat. Slot değiştirince sayfa yenilenir.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
          {["1", "2", "3"].map((n) => (
            <button key={n}
              onClick={() => { if (slot !== n) { playSfx("page"); changeSlot(n); } }}
              className="font-display"
              style={{
                padding: "0.55rem 0.4rem", borderRadius: "6px", cursor: "pointer",
                fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: slot === n
                  ? "1px solid rgba(201,168,76,0.55)"
                  : "1px solid var(--color-border)",
                background: slot === n
                  ? "linear-gradient(160deg, rgba(201,168,76,0.12) 0%, rgba(20,14,7,0.5) 60%)"
                  : "transparent",
                color: slot === n ? "var(--color-gold)" : "var(--color-parchment-muted)",
                boxShadow: slot === n ? "0 0 12px rgba(201,168,76,0.15)" : "none",
              }}>
              Kayıt {n} {slot === n && "✓"}
            </button>
          ))}
        </div>
      </Panel>

      <div style={{ height: "0.75rem" }} />

      {/* ── Ses ── */}
      <Panel title="Ses" icon={audio.muted ? "🔇" : "🔊"} tone="ash">
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: "0.5rem",
        }}>
          <span className="font-serif" style={{
            fontSize: "0.82rem", fontStyle: "italic", color: "var(--color-parchment-dim)",
          }}>
            Tüm sesler
          </span>
          <Pill tone={audio.muted ? "blood" : "sage"}
            onClick={() => updateAudio({ muted: !audio.muted })}>
            {audio.muted ? "Kapalı" : "Açık"}
          </Pill>
        </div>
        <Slider label="Efektler" value={audio.sfx}
          onChange={(v) => { updateAudio({ sfx: v }); playSfx("coin"); }} />
        <Slider label="Müzik" value={audio.music}
          onChange={(v) => updateAudio({ music: v })} />
        <button onClick={() => playSfx("achievement")}
          className="font-display"
          style={{
            marginTop: "0.4rem", background: "none", border: "none", padding: 0,
            cursor: "pointer", fontSize: "0.56rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "var(--color-gold-dim)", textDecoration: "underline",
            display: "flex", alignItems: "center", gap: "0.3rem",
          }}>
          🎵 Sesi dene
        </button>
      </Panel>

      <div style={{ height: "0.75rem" }} />

      {/* ── Erişilebilirlik ── */}
      <Panel title="Erişilebilirlik" icon="🔤" tone="ash">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <span className="label-tiny" style={{ width: "4.5rem", flexShrink: 0 }}>Yazı boyutu</span>
          {[90, 100, 110, 125].map((s) => (
            <button key={s}
              onClick={() => { playSfx("click"); setFontScale(s); }}
              className="font-display"
              style={{
                padding: "0.3rem 0.55rem", borderRadius: "4px", cursor: "pointer",
                fontSize: "0.6rem", fontWeight: 700,
                border: fontScale === s
                  ? "1px solid rgba(201,168,76,0.55)"
                  : "1px solid var(--color-border)",
                background: fontScale === s ? "rgba(201,168,76,0.10)" : "transparent",
                color: fontScale === s ? "var(--color-gold)" : "var(--color-parchment-muted)",
              }}>
              %{s}
            </button>
          ))}
        </div>
      </Panel>

      {/* ── İstatistikler ── */}
      {stats && (
        <>
          <div style={{ height: "0.75rem" }} />
          <Panel title="İstatistikler" icon="📊" tone="gold">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              {[
                ["Nesil", stats.generation],
                ["Oynanan yıl", stats.years_played],
                ["Hanedan puanı", stats.dynasty?.score ?? 0],
                ["Servet", `${stats.records.money}⚜`],
                ["İtibar", stats.records.reputation],
                ["Ün", stats.records.fame],
                ["Mülk", stats.records.properties],
                ["Çocuk", stats.records.children],
                ["Biten hikâye", stats.records.stories_completed],
                ["Savaş Z/Y", `${stats.records.battles_won}/${stats.records.battles_lost}`],
              ].map(([k, v]) => (
                <div key={k} className="row-frame" style={{
                  justifyContent: "space-between", padding: "0.4rem 0.6rem",
                }}>
                  <span className="label-tiny">{k}</span>
                  <span className="font-display" style={{
                    fontSize: "0.7rem", fontWeight: 700, color: "var(--color-parchment)",
                  }}>
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}

      {/* ── Başarımlar ── */}
      {achievements && (
        <>
          <div style={{ height: "0.75rem" }} />
          <Panel title="Başarımlar" icon="🏆" tone="gold"
            right={<Pill tone="gold">{achievements.unlocked}/{achievements.total}</Pill>}>
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem",
              maxHeight: "20rem", overflowY: "auto",
            }}>
              {achievements.achievements.map((a) => (
                <div key={a.id}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: "0.5rem",
                    padding: "0.45rem 0.55rem", borderRadius: "5px",
                    border: a.unlocked
                      ? "1px solid rgba(201,168,76,0.4)"
                      : "1px solid var(--color-border)",
                    background: a.unlocked
                      ? "linear-gradient(160deg, rgba(201,168,76,0.08) 0%, rgba(20,14,7,0.5) 60%)"
                      : "rgba(10,7,4,0.35)",
                    opacity: a.unlocked ? 1 : 0.5,
                    boxShadow: a.unlocked ? "0 0 10px rgba(201,168,76,0.08)" : "none",
                  }}>
                  <span style={{
                    fontSize: "0.95rem", flexShrink: 0,
                    filter: a.unlocked ? "drop-shadow(0 0 6px rgba(201,168,76,0.35))" : "none",
                  }}>
                    {a.unlocked ? a.icon : "🔒"}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="font-display" style={{
                      fontSize: "0.64rem", fontWeight: 700, lineHeight: 1.25,
                      color: a.unlocked ? "var(--color-gold)" : "var(--color-parchment-muted)",
                    }}>
                      {a.title}
                    </div>
                    <div className="font-serif" style={{
                      fontSize: "0.62rem", fontStyle: "italic", lineHeight: 1.35,
                      color: "var(--color-parchment-muted)",
                    }}>
                      {a.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
