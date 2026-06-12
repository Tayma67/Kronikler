/**
 * Aile Görevleri — KÜL & KÖZ.
 * Duygu görevi: "Verilmiş sözlerim" — anne babanın fermanları, parşömen hissi.
 * İşlevsellik (API çağrısı, durum mantığı, data-testid'ler) birebir korunur.
 */
import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { PageHeader, Panel, Pill, EmptyState, Coin } from "@/components/ui/Kit";

const STATUS_LABEL = {
  "kilitli": "Kilitli",
  "açık": "Açık",
  "tamamlandı": "Tamamlandı",
};

const STATUS_TONE = {
  "kilitli":     "ash",
  "açık":        "gold",
  "tamamlandı":  "sage",
};

const STATUS_ICON = {
  "kilitli":     "🔒",
  "açık":        "⏳",
  "tamamlandı":  "✓",
};

function objectiveText(obj, progress) {
  if (obj.type === "collect")       return `${obj.item} topla (${progress}/${obj.qty})`;
  if (obj.type === "work_count")    return `Bir ay çalış (${progress}/${obj.qty})`;
  if (obj.type === "chat_count")    return `Biriyle konuş (${progress}/${obj.qty})`;
  if (obj.type === "travel_count")  return `Bir yere git (${progress}/${obj.qty})`;
  if (obj.type === "equip")         return `Kuşan: ${obj.item}`;
  return JSON.stringify(obj);
}

export default function FamilyQuests() {
  const { state } = useGame();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/game/family-quests").then(({ data }) => setData(data));
  }, [state.turn, state.player.age]);

  const quests = data?.quests || state.family_quests || [];
  const p = state.player;

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
      <PageHeader
        kicker="Aile Yolu"
        icon="🏠"
        title="Aile Görevleri"
        sub={p.is_child
          ? "Daha bir çocuksun; ailen sana yol gösteriyor. Her sözden, büyürken kalacak bir hüner doğar."
          : "Çocukluğun geride kaldı — bu sözler artık seni şekillendirdi."}
      />

      {quests.length === 0 ? (
        <Panel title="Sessiz Ocak" icon="🕯" tone="ash">
          <EmptyState icon="🏠"
            title="Ailenin sana verdiği bir vazife yok."
            sub="Aylar geçtikçe ocağın büyükleri senden bir şeyler isteyecek." />
        </Panel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {quests.map((q) => {
            const tone = STATUS_TONE[q.status] || "ash";
            const locked = q.status === "kilitli";
            return (
              <div key={q.id} className="card-frame" data-testid={`family-quest-${q.id}`}
                style={{ padding: "0.85rem", opacity: locked ? 0.65 : 1 }}>
                {/* Ferman başlığı */}
                <div style={{
                  display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", gap: "0.6rem", marginBottom: "0.45rem",
                }}>
                  <h3 className="font-display" style={{
                    fontSize: "0.92rem", fontWeight: 700, margin: 0,
                    color: q.status === "tamamlandı" ? "var(--color-parchment-dim)" : "var(--color-parchment)",
                    display: "flex", alignItems: "center", gap: "0.45rem",
                    textShadow: locked ? "none" : "0 0 10px rgba(201,168,76,0.15)",
                  }}>
                    <span style={{ fontSize: "0.85rem", opacity: locked ? 0.6 : 1 }}>
                      {STATUS_ICON[q.status] || "📜"}
                    </span>
                    {q.title}
                  </h3>
                  <Pill tone={tone}>{STATUS_LABEL[q.status]}</Pill>
                </div>

                {/* Anlatı */}
                <p className="font-serif" style={{
                  fontSize: "0.82rem", fontStyle: "italic", lineHeight: 1.5,
                  color: "var(--color-parchment-dim)", margin: "0 0 0.6rem",
                }}>
                  {q.description}
                </p>

                {/* Hedef satırı */}
                <div className="row-frame" style={{ padding: "0.4rem 0.6rem" }}>
                  <span style={{ fontSize: "0.8rem", flexShrink: 0 }}>🎯</span>
                  <span className="font-display" style={{
                    fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.06em",
                    color: "var(--color-parchment)",
                  }}>
                    {objectiveText(q.objective, q.progress)}
                  </span>
                </div>

                {/* Alt bilgi: veren + ödül/yaş */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginTop: "0.55rem", gap: "0.5rem",
                }}>
                  <span className="font-serif" style={{
                    fontSize: "0.72rem", fontStyle: "italic",
                    color: "var(--color-parchment-muted)",
                  }}>
                    {q.giver_role === "anne" ? "👩 Annenin sözü" : "🧔 Babanın sözü"}
                  </span>
                  {q.min_age > p.age ? (
                    <Pill tone="ash">🔒 {q.min_age} yaşında açılır</Pill>
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                      <span className="label-tiny">Ödül</span>
                      {q.reward.money ? <Coin value={q.reward.money} size="0.74rem" /> : null}
                      {q.reward.item ? (
                        <Pill tone="ember">+{Object.keys(q.reward.item)[0]}</Pill>
                      ) : null}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
