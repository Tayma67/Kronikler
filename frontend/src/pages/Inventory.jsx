/**
 * Heybe & Kuşam — KÜL & KÖZ komple tasarım referans sayfası.
 * Duygu görevi: "Sırtımdakiler benim hikâyemin kanıtı."
 * Kit kullanımı: PageHeader, Panel, Stat, Pill, EmptyState, Coin.
 * İşlevsellik (API çağrıları, data-testid'ler) birebir korunur.
 */
import { useEffect, useState, useMemo } from "react";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { playSfx } from "@/lib/audio";
import { toast } from "sonner";
import { PageHeader, Panel, Stat, Pill, EmptyState, Coin, GoldRule } from "@/components/ui/Kit";

const SLOT_META = [
  { key: "head",   label: "Baş",      icon: "👑" },
  { key: "body",   label: "Vücut",    icon: "🥋" },
  { key: "weapon", label: "Silah",    icon: "⚔" },
  { key: "hands",  label: "Eller",    icon: "🧤" },
  { key: "legs",   label: "Bacaklar", icon: "🛡" },
  { key: "feet",   label: "Ayaklar",  icon: "🥾" },
];

const TYPE_ICON = {
  food: "🍞", drink: "🍶", consumable: "🧪", weapon: "⚔", armor: "🥋",
};

export default function Inventory() {
  const { state, setState } = useGame();
  const [items, setItems] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/game/items")
      .then(({ data }) => setItems(data.items || {}))
      .catch(() => {});   // uç başarısız olursa sessizce geç (unhandled rejection olmasın)
  }, []);

  const inv = state.player.inventory || {};
  const equipment = state.player.equipment || {};
  const bonuses = state.player.equipment_bonuses || { attack: 0, defense: 0, charisma: 0 };
  const invEntries = Object.entries(inv).filter(([, q]) => q > 0);

  const consumeItem = async (key) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/use_item", { item: key, qty: 1 });
      setState(data.state);
      playSfx("success");
      const a = data.applied || {};
      const parts = [];
      if (a.hunger) parts.push(`+${a.hunger} açlık`);
      if (a.health) parts.push(`+${a.health} sağlık`);
      toast.success(`${data.item_name} kullanıldı${parts.length ? ` (${parts.join(", ")})` : ""}`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Kullanılamadı");
    } finally {
      setBusy(false);
    }
  };

  const equipItem = async (key) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/equip", { item: key });
      setState(data);
      playSfx("sword");
      toast.success("Kuşandın");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Kuşanılamadı");
    } finally {
      setBusy(false);
    }
  };

  const unequip = async (slot) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/unequip", { slot });
      setState(data);
      playSfx("click");
      toast.success("Çıkardın");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Çıkarılamadı");
    } finally {
      setBusy(false);
    }
  };

  const currentLoc = state.world.locations.find((l) => l.id === state.player.location_id);
  const netWorth = useMemo(() => {
    let v = state.player.money;
    if (currentLoc) {
      for (const [g, q] of invEntries) {
        v += (currentLoc.prices?.[g] || 0) * q;
      }
    }
    return Math.round(v);
  }, [invEntries, currentLoc, state.player.money]);

  return (
    <div className="page-shell rise-in" style={{ padding: "0 0 1.5rem" }}>
      <PageHeader
        kicker="Sırtındakiler"
        icon="🎒"
        title="Heybe & Kuşam"
        sub="Taşıdıkların, kuşandıkların — hikâyenin kanıtları."
        right={
          <div style={{ textAlign: "right" }}>
            <div className="label-tiny" style={{ marginBottom: "0.1rem" }}>Toplam Değer</div>
            <Coin value={netWorth} size="1rem" />
          </div>
        }
      />

      {/* ── Kuşam ── */}
      <Panel title="Kuşam" icon="🛡" tone="ember">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          {SLOT_META.map((slot) => {
            const itemKey = equipment[slot.key];
            const item = itemKey ? items[itemKey] : null;
            return (
              <div key={slot.key} data-testid={`slot-${slot.key}`}
                style={{
                  position: "relative", minHeight: "82px",
                  padding: "0.55rem 0.65rem",
                  borderRadius: "6px",
                  border: item
                    ? "1px solid rgba(201,168,76,0.45)"
                    : "1px dashed rgba(122,106,79,0.4)",
                  background: item
                    ? "linear-gradient(160deg, rgba(201,168,76,0.10) 0%, rgba(20,14,7,0.6) 60%)"
                    : "rgba(10,7,4,0.45)",
                  boxShadow: item ? "0 0 14px rgba(201,168,76,0.10), inset 0 1px 0 rgba(201,168,76,0.12)" : "none",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span style={{ fontSize: "0.8rem", opacity: item ? 1 : 0.45 }}>{slot.icon}</span>
                  <span className="label-tiny">{slot.label}</span>
                </div>
                {item ? (
                  <>
                    <div className="font-display" style={{
                      fontSize: "0.74rem", fontWeight: 700, color: "var(--color-gold)",
                      textShadow: "0 0 10px rgba(201,168,76,0.3)", lineHeight: 1.2,
                    }}>
                      {item.name}
                    </div>
                    <button onClick={() => unequip(slot.key)} disabled={busy}
                      data-testid={`unequip-${slot.key}`}
                      className="font-display"
                      style={{
                        alignSelf: "flex-start", background: "none", border: "none",
                        padding: 0, cursor: "pointer", fontSize: "0.52rem",
                        letterSpacing: "0.15em", textTransform: "uppercase",
                        color: "var(--color-parchment-muted)",
                      }}>
                      ✕ çıkar
                    </button>
                  </>
                ) : (
                  <div className="font-serif" style={{
                    fontSize: "0.7rem", fontStyle: "italic",
                    color: "var(--color-parchment-muted)", opacity: 0.6,
                  }}>
                    boş
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <GoldRule label="Kuşamın Gücü" />
        <Stat icon="⚔" label="Saldırı"  value={`+${bonuses.attack}`}  tone="ember" />
        <Stat icon="🛡" label="Savunma" value={`+${bonuses.defense}`} tone="sage" />
        <Stat icon="✨" label="Karizma" value={`+${bonuses.charisma}`} tone="ink" />
      </Panel>

      <div style={{ height: "0.75rem" }} />

      {/* ── Heybe ── */}
      <Panel title="Heybe" icon="🎒" tone="gold"
        right={<Pill tone="ash">{invEntries.length} çeşit</Pill>}>
        {invEntries.length === 0 ? (
          <EmptyState icon="🎒"
            title="Heyben bomboş."
            sub="Pazara uğra, eline geçeni biriktir — kıtlık kapıda beklemez." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {invEntries.map(([key, qty]) => {
              const item = items[key];
              const emoji = item ? (TYPE_ICON[item.type] || "📦") : "📦";
              const canUse = item && (item.type === "food" || item.type === "drink" || item.type === "consumable");
              const canEquip = item && item.slot;
              return (
                <div key={key} className="row-frame" data-testid={`inv-row-${key}`}>
                  <span style={{ fontSize: "1rem", flexShrink: 0,
                                 filter: "drop-shadow(0 0 6px rgba(201,168,76,0.2))" }}>
                    {emoji}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.45rem" }}>
                      <span className="font-serif" style={{
                        fontSize: "0.88rem", color: "var(--color-parchment)",
                        textTransform: "capitalize", fontWeight: 600,
                      }}>
                        {item ? item.name : key}
                      </span>
                      <span className="font-display" style={{
                        fontSize: "0.6rem", color: "var(--color-gold-dim)", fontWeight: 700,
                      }}>
                        ×{qty}
                      </span>
                    </div>
                    {item?.desc && (
                      <div className="font-serif" style={{
                        fontSize: "0.68rem", fontStyle: "italic",
                        color: "var(--color-parchment-muted)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {item.desc}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }}>
                    {canUse && (
                      <button onClick={() => consumeItem(key)} disabled={busy}
                        data-testid={`use-${key}`} className="font-display"
                        style={{
                          padding: "0.3rem 0.6rem", borderRadius: "4px",
                          border: "1px solid rgba(74,154,90,0.5)",
                          background: "rgba(74,154,90,0.08)", color: "#6FBF7F",
                          fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.12em",
                          cursor: "pointer",
                        }}>
                        KULLAN
                      </button>
                    )}
                    {canEquip && (
                      <button onClick={() => equipItem(key)} disabled={busy}
                        data-testid={`equip-${key}`} className="font-display"
                        style={{
                          padding: "0.3rem 0.6rem", borderRadius: "4px",
                          border: "1px solid rgba(201,168,76,0.5)",
                          background: "rgba(201,168,76,0.08)", color: "var(--color-gold)",
                          fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.12em",
                          cursor: "pointer",
                        }}>
                        KUŞAN
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="font-serif" style={{
          marginTop: "0.7rem", fontSize: "0.7rem", fontStyle: "italic",
          color: "var(--color-parchment-muted)",
        }}>
          Alıp satmak için pazara in: <span style={{ color: "var(--color-parchment-dim)" }}>{currentLoc?.name}</span>
        </div>
      </Panel>
    </div>
  );
}
