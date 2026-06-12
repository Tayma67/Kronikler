/**
 * Görev Defteri — KÜL & KÖZ.
 * Duygu görevi: "Verilmiş sözlerim" — görevler ferman/parşömen hissi taşır.
 * İşlevsellik (kabul/tamamlama akışı, gruplama, data-testid'ler) birebir korunur.
 */
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { playSfx } from "@/lib/audio";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { PageHeader, Panel, Pill, EmptyState, Coin, GoldRule } from "@/components/ui/Kit";

const STATUS_LABEL = {
  açık: "Açık",
  kabul_edildi: "Söz Verildi",
  tamamlandı: "Tamamlandı",
  başarısız: "Başarısız",
};

const STATUS_TONE = {
  açık: "gold",
  kabul_edildi: "ember",
  tamamlandı: "sage",
  başarısız: "blood",
};

function QuestCard({ q, busy, onAccept, onComplete }) {
  const isLocal = q._isLocal;
  const isPast = q.status === "tamamlandı" || q.status === "başarısız";
  return (
    <div key={q.id} className="card-frame" data-testid={`quest-${q.id}`}
      style={{
        padding: "0.85rem",
        opacity: isPast ? 0.65 : 1,
        ...(isLocal && !isPast ? {
          borderColor: "rgba(201,168,76,0.4)",
          boxShadow: "0 0 14px rgba(201,168,76,0.1), 0 4px 16px rgba(0,0,0,0.45)",
        } : {}),
      }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: "0.6rem", marginBottom: "0.45rem",
      }}>
        <h3 className="font-display" style={{
          fontSize: "0.92rem", fontWeight: 700, margin: 0,
          color: "var(--color-parchment)", display: "flex",
          alignItems: "center", gap: "0.45rem",
        }}>
          <span style={{ fontSize: "0.85rem" }}>📜</span>
          {q.title}
        </h3>
        <Pill tone={STATUS_TONE[q.status] || "ash"}>{STATUS_LABEL[q.status]}</Pill>
      </div>
      <p className="font-serif" style={{
        fontSize: "0.82rem", fontStyle: "italic", lineHeight: 1.5,
        color: "var(--color-parchment-dim)", margin: "0 0 0.6rem",
      }}>
        {q.description}
      </p>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem",
      }}>
        <span className="font-serif" style={{
          fontSize: "0.72rem", fontStyle: "italic",
          color: isLocal ? "var(--color-gold)" : "var(--color-parchment-muted)",
          display: "inline-flex", alignItems: "center", gap: "0.3rem",
        }}>
          🗺 {q.location_name}
          {isLocal && (
            <span className="font-display" style={{
              fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.12em",
              color: "var(--color-gold-bright)", textTransform: "uppercase",
            }}>· buradasın</span>
          )}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
          <span className="label-tiny">Ödül</span>
          <Coin value={q.reward} size="0.76rem" />
        </span>
      </div>
      {(q.status === "açık" || q.status === "kabul_edildi") && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.7rem" }}>
          {q.status === "açık" && (
            <button onClick={() => onAccept(q.id)} disabled={busy === q.id}
              data-testid={`quest-accept-${q.id}`} className="btn-ghost-ash"
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.6rem" }}>
              Söz Ver
            </button>
          )}
          <button onClick={() => onComplete(q.id)} disabled={busy === q.id}
            data-testid={`quest-complete-${q.id}`} className="btn-ember"
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.6rem", flex: 1 }}>
            ⚜ Tamamlamayı Dene
          </button>
        </div>
      )}
    </div>
  );
}

export default function Quests() {
  const { state, setState } = useGame();
  const [busy, setBusy] = useState(null);

  const playerLocationId = state?.player?.location_id;
  const playerLocationName = state?.player?.location_name || "Bilinmiyor";

  const quests = useMemo(() => {
    const all = [...(state.quests || [])].reverse();
    return all.map(q => ({ ...q, _isLocal: q.location_id === playerLocationId }));
  }, [state, playerLocationId]);

  const accept = async (id) => {
    setBusy(id);
    playSfx("click");
    try {
      const { data } = await api.post("/game/quest/accept", { quest_id: id });
      setState(data);
      playSfx("page");
      toast.success("Görev kabul edildi.");
    } catch (e) {
      playSfx("fail");
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  const complete = async (id) => {
    setBusy(id);
    playSfx("click");
    try {
      const { data } = await api.post("/game/quest/complete", { quest_id: id });
      setState(data);
      playSfx("success");
      toast.success("Görev sonuçlandı.");
    } catch (e) {
      playSfx("fail");
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  const activeQuests  = quests.filter(q => q.status === "açık" || q.status === "kabul_edildi");
  const localActive   = activeQuests.filter(q => q._isLocal);
  const remoteActive  = activeQuests.filter(q => !q._isLocal);
  const pastQuests    = quests.filter(q => q.status === "tamamlandı" || q.status === "başarısız");

  const [familyData, setFamilyData] = useState(null);
  const familyQuests = familyData?.quests || state.family_quests || [];
  const activeFamilyQuests = familyQuests.filter(q => q.status === "açık");

  useEffect(() => {
    api.get("/game/family-quests").then(({ data }) => setFamilyData(data)).catch(() => {});
  }, [state.turn, state.player?.age]);

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
      <PageHeader
        kicker="Görev Defteri"
        icon="📜"
        title="Verilmiş Sözlerim"
        sub={activeQuests.length === 0
          ? "Defter boş — ama dünya kendi dertlerini yaratmakta gecikmez."
          : `${activeQuests.length} söz açık duruyor; ${localActive.length > 0 ? `${localActive.length}'i bu diyarda` : "hepsi uzak diyarlarda"}.`}
        right={activeQuests.length > 0 ? (
          <Pill tone="ember" pulse="danger">{activeQuests.length} açık</Pill>
        ) : null}
      />

      {/* Yerel görevler */}
      {localActive.length > 0 && (
        <Panel title={`${playerLocationName} — Buradaki Sözler`} icon="🗺" tone="gold"
          right={<Pill tone="gold">{localActive.length}</Pill>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {localActive.map(q => (
              <QuestCard key={q.id} q={q} busy={busy} onAccept={accept} onComplete={complete} />
            ))}
          </div>
        </Panel>
      )}

      {localActive.length > 0 && remoteActive.length > 0 && <div style={{ height: "0.75rem" }} />}

      {/* Uzak görevler */}
      {remoteActive.length > 0 && (
        <Panel title="Uzak Diyarlardaki Sözler" icon="🐎" tone="ash"
          right={<Pill tone="ash">{remoteActive.length}</Pill>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {remoteActive.map(q => (
              <QuestCard key={q.id} q={q} busy={busy} onAccept={accept} onComplete={complete} />
            ))}
          </div>
        </Panel>
      )}

      {/* Tamamlanan / başarısız */}
      {pastQuests.length > 0 && (
        <>
          <GoldRule label="Geçmişin Tozu" />
          <Panel title="Kapanmış Defter" icon="🕯" tone="ash"
            right={<Pill tone="ash">{pastQuests.length}</Pill>}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {pastQuests.map(q => (
                <QuestCard key={q.id} q={q} busy={busy} onAccept={accept} onComplete={complete} />
              ))}
            </div>
          </Panel>
        </>
      )}

      {quests.length === 0 && (
        <Panel title="Boş Defter" icon="🪶" tone="ash">
          <EmptyState icon="📜"
            title="Henüz kimse senden bir şey istemedi."
            sub="Birkaç ay geçir; dünya kendi sorunlarını yaratır." />
        </Panel>
      )}

      {/* ── Aile Yolu ── */}
      {activeFamilyQuests.length > 0 && (
        <>
          <GoldRule label="Aile Yolu" />
          <Panel title="Ocağın Sözleri" icon="🏠" tone="ember"
            right={<Pill tone="ember">{activeFamilyQuests.length}</Pill>}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {activeFamilyQuests.map((q) => (
                <div key={q.id} className="card-frame" style={{ padding: "0.85rem" }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", gap: "0.6rem", marginBottom: "0.45rem",
                  }}>
                    <h3 className="font-display" style={{
                      fontSize: "0.9rem", fontWeight: 700, margin: 0,
                      color: "var(--color-parchment)", display: "flex",
                      alignItems: "center", gap: "0.45rem",
                    }}>
                      <span style={{ fontSize: "0.85rem" }}>
                        {q.status === "tamamlandı" ? "✓" : q.status === "kilitli" ? "🔒" : "⏳"}
                      </span>
                      {q.title}
                    </h3>
                    <Pill tone="gold">{q.status}</Pill>
                  </div>
                  <p className="font-serif" style={{
                    fontSize: "0.8rem", fontStyle: "italic", lineHeight: 1.5,
                    color: "var(--color-parchment-dim)", margin: "0 0 0.5rem",
                  }}>{q.description}</p>
                  <span className="font-serif" style={{
                    fontSize: "0.72rem", fontStyle: "italic",
                    color: "var(--color-parchment-muted)",
                  }}>
                    {q.giver_role === "anne" ? "👩 Annenin sözü" : "🧔 Babanın sözü"}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
