/**
 * CharacterSheet.jsx  —  Veri köprüsü + DÜNYA & SERÜVEN sekme içerikleri
 *
 *  1) useGame() context'inden oyun verisini çeker
 *  2) /game/skills + /game/items API çağrılarını yapar
 *  3) Veriyi KarakterEkrani'nin beklediği formata map'ler
 *  4) DÜNYA ve SERÜVEN sekmelerini mockup'a göre render eder
 *  5) KarakterEkrani bileşenini render eder
 */

import { useState, useEffect, useMemo } from "react";
import { profLabel } from "@/lib/labels";
import { useNavigate, Link } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import KarakterEkrani from "./KarakterEkrani";
import { portreYolu } from "@/components/ui/Gorsel";

/* ══════════════════════════════════════════════════════
   RENK PALETİ (KarakterEkrani ile aynı)
══════════════════════════════════════════════════════ */
const C = {
  bg:         "#0A0A0A",
  card:       "#111111",
  card2:      "#16120A",
  card3:      "#1A1500",
  gold:       "#C9A84C",
  goldBright: "#F0C040",
  goldDim:    "#5A4010",
  goldBorder: "rgba(201,168,76,0.22)",
  goldBg:     "rgba(201,168,76,0.07)",
  text:       "#D8C8A0",
  textDim:    "#7A7060",
  textMid:    "#A09070",
  red:        "#C0392B",
  amber:      "#E67E22",
  blue:       "#3498DB",
  green:      "#27AE60",
  purple:     "#9B59B6",
  greenDim:   "#1E4A2A",
};

/* ══════════════════════════════════════════════════════
   SABITLER
══════════════════════════════════════════════════════ */
const BANDS = [
  { id: "dost",    label: "DOSTLAR",    test: (s) => s >= 50 },
  { id: "arkadaş", label: "ARKADAŞLAR", test: (s) => s >= 20 && s < 50 },
  { id: "nötr",    label: "NÖTR",       test: (s) => s > -20 && s < 20 },
  { id: "rakip",   label: "RAKİPLER",   test: (s) => s <= -20 && s > -50 },
  { id: "düşman",  label: "DÜŞMANLAR",  test: (s) => s <= -50 },
];

const REL_FLAVOR = [
  { min: 80,        label: "Sadık",        color: "#4A9A5A", bg: "rgba(74,154,90,0.15)"  },
  { min: 60,        label: "Güvenilir",    color: "#5A9A6A", bg: "rgba(90,154,106,0.15)" },
  { min: 40,        label: "Dost",         color: "#6AAA7A", bg: "rgba(106,170,122,0.15)"},
  { min: 20,        label: "Yakın",        color: "#B8A880", bg: "rgba(184,168,128,0.15)"},
  { min: -4,        label: "Nötr",         color: "#7A6A4F", bg: "rgba(122,106,79,0.15)" },
  { min: -19,       label: "Soğuk",        color: "#C88040", bg: "rgba(200,128,64,0.15)" },
  { min: -49,       label: "Düşman",       color: "#C84040", bg: "rgba(200,64,64,0.15)"  },
  { min: -Infinity, label: "Kan Davası",   color: "#A82020", bg: "rgba(168,32,32,0.15)"  },
];
const getRelFlavor = (score) =>
  REL_FLAVOR.find(r => score >= r.min) ?? REL_FLAVOR[REL_FLAVOR.length - 1];

const MILESTONE_TYPES = {
  savaş_zaferi:    { icon: "🏆", label: "Savaş Zaferi"        },
  evlilik:         { icon: "💍", label: "Evlilik"              },
  doğum:           { icon: "👶", label: "Çocuk Sahibi Oldu"    },
  meslek_değişimi: { icon: "🔄", label: "Meslek Değiştirdi"    },
  kariyer_terfi:   { icon: "⭐", label: "Kariyer Terfisi"      },
  nesil_devri:     { icon: "🌿", label: "Nesil Devri"          },
  miras:           { icon: "📜", label: "Miras Aldı"           },
  okul:            { icon: "📚", label: "Eğitim Tamamladı"     },
  ticaret:         { icon: "🤝", label: "İlk Ticaret"          },
  yolculuk:        { icon: "🗺", label: "Yolculuk"             },
};

const ITEM_FILTERS = ["HEPSİ", "YİYECEK", "SİLAH", "ZIRH", "DİĞER"];
const ITEM_TYPE_MAP = {
  food: "YİYECEK", drink: "YİYECEK", consumable: "YİYECEK",
  weapon: "SİLAH", armor: "ZIRH", armor_body: "ZIRH",
  armor_head: "ZIRH", material: "DİĞER",
};

const EQUIP_SLOTS = [
  { key: "head",   label: "BAŞ",   emoji: "⛑️" },
  { key: "body",   label: "VÜCUT", emoji: "🛡️" },
  { key: "weapon", label: "SİLAH", emoji: "⚔️" },
  { key: "hands",  label: "ELLER", emoji: "🧤" },
  { key: "legs",   label: "BACAK", emoji: "👖" },
  { key: "feet",   label: "AYAK",  emoji: "👢" },
];

const SOCIAL_LABELS = {
  reputation: [
    { min: 60, label: "Efsanevi" }, { min: 40, label: "Saygı Duyulan" },
    { min: 20, label: "Tanınan"  }, { min: 0,  label: "Sıradan"       },
    { min: -20, label: "Şüpheli" }, { min: -Infinity, label: "Rezil"  },
  ],
  honor: [
    { min: 60, label: "Onurlu"    }, { min: 30, label: "Güvenilir" },
    { min: 0,  label: "Tarafsız" }, { min: -Infinity, label: "Şerefsiz" },
  ],
  fear: [
    { min: 60, label: "Dehşet"   }, { min: 30, label: "Korkulan" },
    { min: 10, label: "Saygılı" }, { min: 0,  label: "Önemsiz"  },
    { min: -Infinity, label: "Güvensiz" },
  ],
  fame: [
    { min: 60, label: "Ünlü"    }, { min: 30, label: "Bilinen"  },
    { min: 10, label: "Tanınan" }, { min: 0,  label: "Belirsiz" },
    { min: -Infinity, label: "Bilinmez" },
  ],
};
const socialLabel = (key, value = 0) =>
  (SOCIAL_LABELS[key] || []).find(l => value >= l.min)?.label ?? "—";

/* ══════════════════════════════════════════════════════
   ORTAK YARDIMCI BİLEŞENLER
══════════════════════════════════════════════════════ */

/** Altın ayırıcı çizgi + elmas */
function GoldDivider() {
  return (
    <div style={{ display: "flex", alignItems: "center", margin: "0 4px" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${C.goldDim})` }} />
      <div style={{ width: 4, height: 4, background: C.gold, transform: "rotate(45deg)", margin: "0 6px", boxShadow: `0 0 4px ${C.gold}` }} />
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.goldDim}, transparent)` }} />
    </div>
  );
}

/** Bölüm başlığı + sağ bağlantı */
function SectionHeader({ title, linkText, onLink }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14, color: C.gold, letterSpacing: "0.1em" }}>
        {title}
      </span>
      {linkText && onLink && (
        <button onClick={onLink} style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 3,
          fontFamily: "'Cinzel', serif", fontSize: 9.5, color: C.textMid, letterSpacing: "0.1em",
        }}>
          {linkText}
          <span style={{ fontSize: 13, lineHeight: 1 }}>›</span>
        </button>
      )}
    </div>
  );
}

/** Kart kabı */
function Section({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.goldBorder}`,
      borderRadius: 10, padding: 14,
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      ...style,
    }}>
      {children}
    </div>
  );
}

/** Yuvarlak portre — src yoksa yaş-kuşak portresine (gender/id) düşer */
function CirclePortrait({ src, emoji = "👤", size = 52, name, age, gender, id, extra }) {
  const resolved = src || (gender != null ? portreYolu(age, gender, id ?? name) : null);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        border: `2px solid ${C.goldBorder}`,
        background: "#1A1208", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 12px rgba(201,168,76,0.15)`,
        flexShrink: 0,
      }}>
        {resolved
          ? <img src={resolved} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: size * 0.44 }}>{emoji}</span>
        }
      </div>
      {name && (
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9.5, color: C.text, textAlign: "center", fontWeight: 600, maxWidth: size + 8, lineHeight: 1.2 }}>
          {name}
        </span>
      )}
      {age != null && (
        <span style={{ fontFamily: "'Lora', serif", fontSize: 9, color: C.textDim, textAlign: "center" }}>
          {age} Yaş
        </span>
      )}
      {extra}
    </div>
  );
}

/** Envanter item kartı */
function ItemCard({ icon, name, qty, onUse, canUse }) {
  return (
    <div style={{
      width: 60, height: 64, flexShrink: 0,
      background: C.card2, border: `1px solid ${C.goldBorder}`,
      borderRadius: 8, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 2,
      position: "relative", cursor: canUse ? "pointer" : "default",
    }} onClick={canUse ? onUse : undefined}>
      <span style={{ fontSize: 22 }}>{icon || "📦"}</span>
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: C.gold, fontWeight: 700 }}>
        ×{qty}
      </span>
      {canUse && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
          background: C.green, borderRadius: "0 0 8px 8px",
        }} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SERÜVEN SEKMESİ
══════════════════════════════════════════════════════ */
function TabSeruven() {
  const { state, setState } = useGame();
  const [items, setItems]   = useState({});
  const [invFilter, setInvFilter] = useState("HEPSİ");
  const [busy, setBusy]     = useState(false);
  const [skillsData, setSkillsData] = useState(null);

  useEffect(() => {
    api.get("/game/items").then(({ data }) => setItems(data.items || {})).catch(() => {});
    api.get("/game/skills").then(({ data }) => setSkillsData(data)).catch(() => {});
  }, []);

  const p = state.player;

  /* ── Ekipman ── */
  const equipment = useMemo(() => p.equipment || {}, [p.equipment]);

  /* ── Ekipman bonusları ── */
  // equipment değerleri item KEY'leridir (string); bonusları backend
  // _decorate içinde hesaplar → player.equipment_bonuses
  const eqBonuses = useMemo(() => {
    const eb = p.equipment_bonuses || {};
    return {
      saldırı: eb.attack || 0,
      savunma: eb.defense || 0,
      karizma: eb.charisma_passive || 0,
    };
  }, [p.equipment_bonuses]);

  /* ── Envanter ── */
  const invEntries = useMemo(() =>
    Object.entries(p.inventory || {}).filter(([, q]) => q > 0),
    [p.inventory]
  );

  const filteredInv = useMemo(() => {
    if (invFilter === "HEPSİ") return invEntries;
    return invEntries.filter(([key]) => {
      const item = items[key];
      return ITEM_TYPE_MAP[item?.type] === invFilter;
    });
  }, [invEntries, invFilter, items]);

  const totalWeight = invEntries.reduce((acc, [k]) => {
    const item = items[k];
    return acc + (items[k]?.weight || 0);
  }, 0);

  /* ── Perkler ── */
  const perks = useMemo(() => {
    if (!skillsData || !p.perks) return [];
    const result = [];
    for (const [skillKey, perkIds] of Object.entries(p.perks)) {
      for (const pid of perkIds || []) {
        const meta = skillsData.perks?.[skillKey]?.find?.(pk => pk.id === pid);
        if (meta) result.push({
          icon:        meta.icon        || "⭐",
          name:        meta.name        || pid,
          description: meta.effect_desc || meta.description || "",
          level:       meta.level       || 1,
        });
      }
    }
    return result;
  }, [p.perks, skillsData]);

  /* ── Tarihi başarılar ── */
  const milestones = useMemo(() => {
    const seen = new Set();
    return (state.history || state.events || [])
      .filter(ev => MILESTONE_TYPES[ev.type] && !seen.has(ev.type + ev.day) && seen.add(ev.type + ev.day))
      .slice(-12).reverse();
  }, [state.history, state.events]);

  const consumeItem = async (key) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post("/game/use_item", { item: key, qty: 1 });
      setState(data.state);
      toast.success(`${data.item_name || key} kullanıldı`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Kullanılamadı");
    } finally { setBusy(false); }
  };

  /* ── Tarih formatı ── */
  const formatDay = (day) => {
    if (!day) return "";
    return `Gün ${day}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ════ EKİPMAN ════ */}
      <Section>
        <SectionHeader title="EKİPMAN" />
        <div style={{ display: "flex", gap: 8 }}>
          {/* Sol: 6 slot 3x2 */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              {EQUIP_SLOTS.slice(0, 3).map(slot => {
                const item = equipment[slot.key] || equipment[slot.label.toLowerCase()] || null;
                return (
                  <div key={slot.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 7.5, color: C.textDim, letterSpacing: "0.14em" }}>
                      {slot.label}
                    </span>
                    <div style={{
                      width: "100%", aspectRatio: "1", minHeight: 56,
                      background: "#0D0A06", border: `1.5px solid ${C.goldBorder}`,
                      borderRadius: 8, display: "flex", alignItems: "center",
                      justifyContent: "center", position: "relative", overflow: "hidden",
                    }}>
                      {item
                        ? (item.image
                          ? <img src={item.image} alt={item.name} style={{ width: "80%", height: "80%", objectFit: "contain" }} />
                          : <span style={{ fontSize: 22 }}>{item.icon || slot.emoji}</span>)
                        : <span style={{ fontSize: 18, opacity: 0.18 }}>{slot.emoji}</span>
                      }
                      {/* Kalite çubuğu */}
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
                        background: item ? `linear-gradient(90deg, ${C.goldDim}, ${C.gold})` : "transparent",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {EQUIP_SLOTS.slice(3).map(slot => {
                const item = equipment[slot.key] || null;
                return (
                  <div key={slot.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 7.5, color: C.textDim, letterSpacing: "0.14em" }}>
                      {slot.label}
                    </span>
                    <div style={{
                      width: "100%", aspectRatio: "1", minHeight: 56,
                      background: "#0D0A06", border: `1.5px solid ${C.goldBorder}`,
                      borderRadius: 8, display: "flex", alignItems: "center",
                      justifyContent: "center", position: "relative", overflow: "hidden",
                    }}>
                      {item
                        ? (item.image
                          ? <img src={item.image} alt={item.name} style={{ width: "80%", height: "80%", objectFit: "contain" }} />
                          : <span style={{ fontSize: 22 }}>{item.icon || slot.emoji}</span>)
                        : <span style={{ fontSize: 18, opacity: 0.18 }}>{slot.emoji}</span>
                      }
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: 2,
                        background: item ? `linear-gradient(90deg, ${C.goldDim}, ${C.gold})` : "transparent",
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sağ: Bonus paneli */}
          <div style={{
            width: 120, background: C.card2, border: `1px solid ${C.goldBorder}`,
            borderRadius: 8, padding: "10px 10px",
            display: "flex", flexDirection: "column", gap: 6, flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
              <span style={{ fontSize: 11 }}>✦</span>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8.5, color: C.gold, fontWeight: 700, letterSpacing: "0.08em" }}>
                Ekipman Bonusu
              </span>
            </div>
            {[
              { icon: "⚔️", label: "Saldırı",  value: eqBonuses.saldırı, color: C.red   },
              { icon: "🛡️", label: "Savunma",  value: eqBonuses.savunma,  color: C.blue  },
              { icon: "👑", label: "Karizma",  value: eqBonuses.karizma,  color: C.purple},
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: `1px solid rgba(201,168,76,0.1)` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10 }}>{row.icon}</span>
                  <span style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.textMid }}>{row.label}</span>
                </div>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 700, color: row.value > 0 ? C.green : C.textDim }}>
                  {row.value > 0 ? `+${row.value}` : row.value}
                </span>
              </div>
            ))}
            <button style={{
              marginTop: "auto", padding: "6px 4px",
              background: "transparent", border: `1px solid ${C.goldBorder}`,
              borderRadius: 6, cursor: "pointer",
              fontFamily: "'Cinzel', serif", fontSize: 8.5,
              color: C.gold, letterSpacing: "0.06em",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 3,
            }}>
              Tüm Bonuslar <span style={{ fontSize: 12 }}>›</span>
            </button>
          </div>
        </div>
      </Section>

      {/* ════ ENVANTER ════ */}
      <Section>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: 14, color: C.gold, letterSpacing: "0.1em" }}>
            ENVANTER
          </span>
          <span style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.textDim }}>
            Taşıma {totalWeight} / 60 KG
          </span>
        </div>

        {/* Filtre tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 10, overflowX: "auto" }}>
          {ITEM_FILTERS.map(f => (
            <button key={f} onClick={() => setInvFilter(f)} style={{
              padding: "4px 10px", borderRadius: 6, cursor: "pointer",
              fontFamily: "'Cinzel', serif", fontSize: 8.5, fontWeight: 700,
              letterSpacing: "0.08em", flexShrink: 0,
              background:   invFilter === f ? C.gold      : "transparent",
              color:        invFilter === f ? C.bg        : C.textDim,
              border:      `1px solid ${invFilter === f ? C.gold : C.goldBorder}`,
              transition:  "all 0.15s",
            }}>{f}</button>
          ))}
        </div>

        {/* İtem grid */}
        {filteredInv.length === 0 ? (
          <p style={{ fontFamily: "'Lora', serif", fontStyle: "italic", color: C.textDim, fontSize: 12, textAlign: "center", padding: "12px 0" }}>
            {invFilter === "HEPSİ" ? "Heybe bomboş." : `Bu kategoride eşya yok.`}
          </p>
        ) : (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {filteredInv.map(([key, qty]) => {
              const item   = items[key] || {};
              const canUse = ["food","drink","consumable"].includes(item.type);
              return (
                <ItemCard
                  key={key}
                  icon={item.icon || "📦"}
                  name={item.name || key}
                  qty={qty}
                  canUse={canUse}
                  onUse={() => consumeItem(key)}
                />
              );
            })}
          </div>
        )}
      </Section>

      {/* ════ PERKLER ════ */}
      {perks.length > 0 && (
        <Section>
          <SectionHeader title="PERKLER" />
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
            {perks.map((perk, i) => (
              <div key={i} style={{
                minWidth: 100, flexShrink: 0,
                background: C.card2, border: `1px solid ${C.goldBorder}`,
                borderRadius: 8, padding: "10px 8px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 5,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "linear-gradient(135deg, #2A1A08, #1A1008)",
                  border: `1px solid ${C.goldBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18,
                }}>{perk.icon}</div>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700, color: C.gold, textAlign: "center", letterSpacing: "0.04em", lineHeight: 1.3 }}>
                  {perk.name}
                </span>
                <span style={{ fontFamily: "'Lora', serif", fontSize: 8.5, color: C.textDim, textAlign: "center", lineHeight: 1.35 }}>
                  {perk.description}
                </span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8.5, color: C.textMid }}>
                  Seviye {perk.level}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ════ TARİHİ BAŞARILAR ════ */}
      <Section>
        <SectionHeader title="TARİHİ BAŞARILAR" />
        {milestones.length === 0 ? (
          <p style={{ fontFamily: "'Lora', serif", fontStyle: "italic", color: C.textDim, fontSize: 12, textAlign: "center", padding: "10px 0" }}>
            Henüz tarihi bir olay yaşanmadı.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {milestones.map((ev, i) => {
              const m = MILESTONE_TYPES[ev.type] || { icon: "📌", label: ev.type };
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 0",
                  borderBottom: i < milestones.length - 1 ? `1px solid rgba(201,168,76,0.1)` : "none",
                }}>
                  {/* İkon çemberi */}
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                    background: C.card2, border: `1px solid ${C.goldBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16,
                  }}>{m.icon}</div>

                  {/* Bilgi */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 700, color: C.text, letterSpacing: "0.04em" }}>
                      {m.label}
                    </div>
                    <div style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.textDim, marginTop: 2, lineHeight: 1.3 }}>
                      {ev.text || ev.narrative || ""}
                    </div>
                  </div>

                  {/* Tarih + chevron */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Lora', serif", fontSize: 9, color: C.textDim }}>
                      {formatDay(ev.day)}
                    </span>
                    <span style={{ color: C.textDim, fontSize: 14 }}>›</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   DÜNYA SEKMESİ
══════════════════════════════════════════════════════ */
function TabDunya() {
  const { state } = useGame();
  const navigate  = useNavigate();
  const p = state.player;
  const [activeRelBand, setActiveRelBand] = useState("dost");
  const [showMore, setShowMore]           = useState(false);

  /* ── Aile ── */
  const allNpcs   = state.world?.npcs || [];
  const findNpc   = (id) => allNpcs.find(n => n.id === id);

  const parents   = (p.parent_ids  || []).map(findNpc).filter(Boolean);
  const spouse    = p.spouse_id ? findNpc(p.spouse_id) : null;
  const spouseRel = spouse ? (state.relationships?.[spouse.id] ?? 0) : 0;
  const children  = (p.children_ids || []).filter(id => id !== "PLAYER").map(findNpc).filter(Boolean);

  /* ── İlişkiler grouped ── */
  const grouped = useMemo(() => {
    const npcs = state.world?.npcs || [];
    const out = {};
    for (const band of BANDS) out[band.id] = [];
    for (const [npcId, score] of Object.entries(state.relationships || {})) {
      const npc  = npcs.find(n => n.id === npcId);
      if (!npc) continue;
      const band = BANDS.find(b => b.test(score));
      if (band) out[band.id].push({ npc, score });
    }
    for (const k of Object.keys(out))
      out[k].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
    return out;
  }, [state]);

  const totalRel = BANDS.reduce((acc, b) => acc + grouped[b.id].length, 0);
  const currentBandList = grouped[activeRelBand] || [];
  const visibleRels = showMore ? currentBandList : currentBandList.slice(0, 3);

  /* ── Hanedan ── */
  // Gerçek hanedan verisi state.dynasty'de yaşar (Faz 4 legacy sistemi)
  const dyn = state.dynasty || { score: 0, generation: state.generation || 1 };
  const dynScore = dyn.score || 0;
  const dynTitle =
    dynScore >= 300 ? "Efsanevi Hanedan" :
    dynScore >= 200 ? "Soylu Hanedan" :
    dynScore >= 100 ? "Saygın Aile" :
    dynScore >= 50  ? "Tanınan Aile" : "Sıradan Aile";
  const dynBonus =
    dynScore >= 200 ? "Nesil mirası: tüm statlar +1, +150 altın, ün +10" :
    dynScore >= 100 ? "Nesil mirası: karizma +1, +75 altın" :
    dynScore >= 50  ? "Nesil mirası: +40 altın" : null;
  const surname = (p.name || "").split(" ").slice(-1)[0] || "";
  const clan = {
    name: surname ? `${surname} Ailesi` : "Hanedan",
    crest: "🛡️",
    type: dynTitle,
    rank: `${state.generation || 1}. Nesil`,
    power: dynScore,
    lands: (state.properties || []).length,
    cities: (state.world?.locations || []).filter(l => l.founded_by_player).length,
    bonus: dynBonus,
    heritage: (state.legacy_history || []).length
      ? `${state.legacy_history.length} nesil geriye uzanan bir soy`
      : null,
  };

  /* ── Mutluluk etiketi ── */
  const happinessLabel = (score) => {
    if (score >= 80) return "Çok Mutlu";
    if (score >= 50) return "Mutlu";
    if (score >= 20) return "Nötr";
    if (score >= 0)  return "Mutsuz";
    return "Çok Mutsuz";
  };
  const happinessColor = (score) => {
    if (score >= 50) return C.green;
    if (score >= 20) return C.amber;
    return C.red;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

      {/* ════ AİLE ════ */}
      <Section>
        <SectionHeader title="AİLE" linkText="Soy Ağacını Gör" onLink={() => navigate("/oyun/aile")} />

        <div style={{ display: "flex", gap: 0, overflowX: "auto", alignItems: "flex-start" }}>

          {/* ANNE-BABA */}
          <div style={{ flex: 1, minWidth: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 7.5, color: C.textDim, letterSpacing: "0.14em", marginBottom: 2 }}>
              ANNE · BABA
            </span>
            <GoldDivider />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", paddingTop: 6 }}>
              {parents.length > 0
                ? parents.map(par => (
                  <CirclePortrait
                    key={par.id}
                    src={par.portrait_url}
                    name={par.name}
                    age={par.age}
                    gender={par.gender}
                    id={par.id}
                    size={48}
                  />
                ))
                : <span style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.textDim, fontStyle: "italic" }}>—</span>
              }
            </div>
          </div>

          {/* Dikey ayırıcı */}
          <div style={{ width: 1, background: C.goldBorder, margin: "0 8px", alignSelf: "stretch", minHeight: 80 }} />

          {/* EŞ */}
          <div style={{ flex: 1, minWidth: 80, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 7.5, color: C.textDim, letterSpacing: "0.14em", marginBottom: 2 }}>
              EŞ
            </span>
            <GoldDivider />
            <div style={{ paddingTop: 6 }}>
              {spouse ? (
                <CirclePortrait
                  src={spouse.portrait_url}
                  name={spouse.name}
                  age={spouse.age}
                  gender={spouse.gender}
                  id={spouse.id}
                  size={48}
                  extra={
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, marginTop: 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <span style={{ fontSize: 10 }}>💚</span>
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: happinessColor(spouseRel), fontWeight: 700 }}>
                          {spouseRel}
                        </span>
                      </div>
                      <span style={{ fontFamily: "'Lora', serif", fontSize: 8.5, color: happinessColor(spouseRel) }}>
                        {happinessLabel(spouseRel)}
                      </span>
                    </div>
                  }
                />
              ) : (
                <span style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.textDim, fontStyle: "italic" }}>—</span>
              )}
            </div>
          </div>

          {/* Dikey ayırıcı */}
          <div style={{ width: 1, background: C.goldBorder, margin: "0 8px", alignSelf: "stretch", minHeight: 80 }} />

          {/* ÇOCUKLAR */}
          <div style={{ flex: 1.2, minWidth: 90, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 7.5, color: C.textDim, letterSpacing: "0.14em", marginBottom: 2 }}>
              ÇOCUKLAR
            </span>
            <GoldDivider />
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", paddingTop: 6 }}>
              {children.map(c => (
                <CirclePortrait key={c.id} src={c.portrait_url} name={c.name} age={c.age} gender={c.gender} id={c.id} size={44} />
              ))}
              {/* + butonu */}
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                border: `1.5px dashed ${C.goldBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}>
                <span style={{ fontSize: 18, color: C.textDim }}>+</span>
              </div>
            </div>
            {children.length > 3 && (
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: C.textDim }}>
                Daha Fazlası
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* ════ HANEDAN ════ */}
      {(clan.name || clan.crest) && (
        <Section>
          <SectionHeader title="HANEDAN" />
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>

            {/* Sol: arma + isim */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 80 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 8,
                background: "linear-gradient(135deg, #2A1A08, #1A1008)",
                border: `2px solid ${C.gold}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, boxShadow: `0 0 14px rgba(201,168,76,0.2)`,
              }}>{clan.crest || "🦁"}</div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 13, fontWeight: 700, color: C.gold, textAlign: "center" }}>
                {clan.name}
              </span>
              {clan.type && (
                <span style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.textDim, textAlign: "center" }}>
                  {clan.type}
                </span>
              )}
              {clan.rank && (
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 10 }}>👑</span>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: C.gold }}>
                    {clan.rank}
                  </span>
                </div>
              )}
            </div>

            {/* Sağ: istatistikler */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  {[
                    { label: "Hanedan Nüfuzu", icon: "👑", value: clan.power ?? clan.nufuz ?? 0 },
                    { label: "Topraklar",       icon: "🏰", value: clan.lands ?? clan.topraklar ?? 0 },
                    { label: "Yönetilen Şehirler", icon: "👑", value: clan.cities ?? clan.sehirler ?? 0 },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 0", borderBottom: `1px solid rgba(201,168,76,0.08)` }}>
                      <span style={{ fontSize: 11 }}>{r.icon}</span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: C.textDim, flex: 1 }}>{r.label}</span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700, color: C.text }}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
                  {clan.fame_label && (
                    <div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: C.textDim, marginBottom: 2 }}>Hanedan Ünü</div>
                      <div style={{ fontFamily: "'Lora', serif", fontSize: 11, color: C.text }}>{clan.fame_label}</div>
                    </div>
                  )}
                  {clan.heritage && (
                    <div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: C.textDim, marginBottom: 2 }}>Miras</div>
                      <div style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.textMid, lineHeight: 1.3 }}>{clan.heritage}</div>
                    </div>
                  )}
                  {clan.bonus && (
                    <div>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: C.textDim, marginBottom: 2 }}>Hanedan Bonusu</div>
                      <div style={{ fontFamily: "'Lora', serif", fontSize: 10, color: C.green, lineHeight: 1.4 }}>{clan.bonus}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* ════ İLİŞKİLER ════ */}
      <Section>
        <SectionHeader
          title="İLİŞKİLER"
          linkText="Tüm İlişkileri Gör"
          onLink={() => navigate("/oyun/iliskiler")}
        />

        {/* Band filtre tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto", paddingBottom: 2 }}>
          {BANDS.map(band => {
            const count   = grouped[band.id].length;
            const isActive = activeRelBand === band.id;
            const bandColor = band.id === "düşman" ? C.red : band.id === "rakip" ? C.amber : C.green;
            return (
              <button key={band.id} onClick={() => { setActiveRelBand(band.id); setShowMore(false); }}
                style={{
                  padding: "4px 9px", borderRadius: 20, cursor: "pointer", flexShrink: 0,
                  fontFamily: "'Cinzel', serif", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.07em",
                  border: `1px solid ${isActive ? bandColor : C.goldBorder}`,
                  background: isActive ? `${bandColor}22` : "transparent",
                  color: isActive ? bandColor : C.textDim,
                  transition: "all 0.15s",
                }}>
                {band.label} ({count})
              </button>
            );
          })}
        </div>

        {/* İlişki listesi */}
        {currentBandList.length === 0 ? (
          <p style={{ fontFamily: "'Lora', serif", fontStyle: "italic", color: C.textDim, fontSize: 12, textAlign: "center", padding: "12px 0" }}>
            Bu kategoride kimse yok.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {visibleRels.map(({ npc, score }, i) => {
              const flavor     = getRelFlavor(score);
              const barPct     = Math.min(100, Math.abs(score));
              const barColor   = score >= 0 ? C.green : C.red;
              const extraFlavor = score >= 50 ? [{ label: getRelFlavor(score).label, color: flavor.color }] : [];

              return (
                <div key={npc.id} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                  borderBottom: i < visibleRels.length - 1 ? `1px solid rgba(201,168,76,0.1)` : "none",
                  cursor: "pointer",
                }} onClick={() => navigate(`/oyun/npc/${npc.id}`)}>

                  {/* Portre */}
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                    background: "#1A1208", border: `2px solid ${C.goldBorder}`,
                    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>
                    <img src={npc.portrait_url || portreYolu(npc.age, npc.gender, npc.id)} alt={npc.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>

                  {/* İsim + bar + etiketler */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 12, fontWeight: 700, color: C.text }}>
                        {npc.name}
                      </span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: barColor, fontWeight: 700 }}>
                        {score > 0 ? score : score}
                      </span>
                    </div>
                    {/* İlişki çubuğu */}
                    <div style={{ width: "60%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 3, marginBottom: 5, overflow: "hidden" }}>
                      <div style={{ width: `${barPct}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                    {/* Etiketler */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span style={{
                        fontFamily: "'Cinzel', serif", fontSize: 8, fontWeight: 600,
                        padding: "2px 7px", borderRadius: 10,
                        background: `${flavor.bg}`, border: `1px solid ${flavor.color}55`,
                        color: flavor.color, letterSpacing: "0.05em",
                      }}>{flavor.label}</span>
                      {npc.profession && (
                        <span style={{
                          fontFamily: "'Cinzel', serif", fontSize: 8, fontWeight: 600,
                          padding: "2px 7px", borderRadius: 10,
                          background: "rgba(201,168,76,0.08)", border: `1px solid ${C.goldBorder}`,
                          color: C.textMid, letterSpacing: "0.05em",
                        }}>{profLabel(npc.profession)}</span>
                      )}
                    </div>
                  </div>

                  <span style={{ color: C.textDim, fontSize: 14, flexShrink: 0 }}>›</span>
                </div>
              );
            })}

            {/* Daha fazla göster */}
            {currentBandList.length > 3 && (
              <button onClick={() => setShowMore(m => !m)} style={{
                marginTop: 8, width: "100%", padding: "7px",
                background: "transparent", border: `1px solid ${C.goldBorder}`,
                borderRadius: 8, cursor: "pointer",
                fontFamily: "'Cinzel', serif", fontSize: 9, color: C.textDim, letterSpacing: "0.1em",
              }}>
                {showMore ? "▲ Daha Az" : `▼ Daha Fazla (${currentBandList.length - 3})`}
              </button>
            )}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   STAT XP EŞİĞİ
══════════════════════════════════════════════════════ */
const statXpMax = (level) => 25 + level * 15;

/* ══════════════════════════════════════════════════════
   VERİ DÖNÜŞTÜRÜCÜ
══════════════════════════════════════════════════════ */
function buildCharacter(p, skills) {
  const statOf = (key) => {
    const level = p.stats?.[key] ?? 1;
    return { level, xp: p.stat_xp?.[key] ?? 0, xp_max: statXpMax(level) };
  };
  const buyMult  = p.social?.trade_buy_mult  != null
    ? Math.round((p.social.trade_buy_mult  - 1) * 100) : 0;
  const sellMult = p.social?.trade_sell_mult != null
    ? Math.round((p.social.trade_sell_mult - 1) * 100) : 0;

  return {
    name:          p.name           || "Karakter",
    // Oyuncunun portrait_url'i yok — dashboard'la aynı yaş-kuşak portresini
    // kullan (cinsiyet + yaşa göre, isimden sabit varyant).
    portrait:      p.portrait_url   || portreYolu(p.age, p.gender, p.id || p.name || "ben"),
    clan_crest:    p.clan_crest     || null,
    age:           p.age            ?? 0,
    gender:        p.gender         || "erkek",
    ethnicity:     p.ethnicity      || p.culture || "",
    religion:      p.religion       || "",
    career:        p.profession     || "İşsiz",
    career_title:  p.career?.title                      || "Çırak",
    career_level:  p.career?.level                      ?? 0,
    career_xp:     p.career?.job_xp                     ?? 0,
    career_xp_max: p.career?.next_stage?.xp_required    ?? 3000,
    is_child:      (p.age ?? 0) < 13,
    freedom_age:   13,
    health:        p.health         ?? 100,
    health_max:    100,
    energy:        p.hunger         ?? 100,
    energy_max:    100,
    gold:          p.money          ?? 0,
    crown_level:   p.social?.fame   ?? 0,
    stat_points:   p.stat_points    ?? 0,
    strength:      statOf("strength"),
    intelligence:  statOf("intelligence"),
    charisma:      statOf("charisma"),
    stamina:       statOf("stamina"),
    reputation:        p.social?.reputation ?? 0,
    reputation_label:  socialLabel("reputation", p.social?.reputation),
    honor:             p.social?.honor      ?? 0,
    honor_label:       socialLabel("honor",      p.social?.honor),
    fear:              p.social?.fear       ?? 0,
    fear_label:        socialLabel("fear",        p.social?.fear),
    fame:              p.social?.fame       ?? 0,
    fame_label:        socialLabel("fame",        p.social?.fame),
    buy_multiplier:  buyMult,
    sell_multiplier: sellMult,
    special_skills:  skills,
    crime:           p.crime ?? 0,
  };
}

/* ══════════════════════════════════════════════════════
   ANA BİLEŞEN
══════════════════════════════════════════════════════ */
export default function CharacterSheet() {
  const { state }    = useGame() || {};
  const navigate     = useNavigate();
  const [skillsData, setSkillsData] = useState(null);

  useEffect(() => {
    api.get("/game/skills")
      .then(({ data }) => setSkillsData(data))
      .catch(() => {});
  }, [state?.turn, state?.player?.age]);

  const skills = useMemo(() => {
    if (!skillsData || !state?.player?.perks) return [];
    const result = [];
    for (const [skillKey, perkIds] of Object.entries(state?.player?.perks || {})) {
      for (const pid of perkIds || []) {
        const meta = skillsData.perks?.[skillKey]?.find?.(pk => pk.id === pid);
        if (meta) result.push({
          icon:        meta.icon        || "⭐",
          name:        meta.name        || pid,
          description: meta.effect_desc || meta.description || "",
          level:       meta.level       || 1,
        });
      }
    }
    return result;
  }, [state?.player?.perks, skillsData]);

  if (!state) return null;

  const p = state.player;

  const handleNavigate = (tabId) => {
    const routes = {
      anasayfa:    "/oyun",
      karakter:    "/oyun/karakter",
      "şehir":     "/oyun/sehir",
      "ilişkiler": "/oyun/iliskiler",
      "menü":      "/oyun",
    };
    navigate(routes[tabId] || "/oyun");
  };

  return (
    <KarakterEkrani
      character={buildCharacter(p, skills)}
      onBack={() => navigate(-1)}
      onSettings={() => navigate("/oyun/ayarlar")}
      onNavigate={handleNavigate}
      onCareerClick={() => navigate("/oyun/meslek")}
      dunyaContent={<TabDunya />}
      seruvenContent={<TabSeruven />}
    />
  );
}
