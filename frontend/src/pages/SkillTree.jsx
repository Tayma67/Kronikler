/**
 * SkillTree.jsx
 * İnteraktif Skill Perk Ağacı — CharacterSheet içinden çağrılır
 * Her skill için 3 node: seviye 3, 6, 9
 */
import { useState } from "react";
import { Sword, ShoppingBasket, Hammer, Users, Lock, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";

const SKILL_META = {
  combat:   { label: "Savaş",   icon: Sword,          color: "text-red-400",    bg: "bg-red-950/40",   border: "border-red-900",   fill: "bg-red-700"   },
  trade:    { label: "Ticaret", icon: ShoppingBasket,  color: "text-amber-400",  bg: "bg-amber-950/30", border: "border-amber-900", fill: "bg-amber-700" },
  crafting: { label: "Zanaat",  icon: Hammer,          color: "text-stone-300",  bg: "bg-stone-900/40", border: "border-stone-700", fill: "bg-stone-500" },
  social:   { label: "Sosyal",  icon: Users,           color: "text-pink-400",   bg: "bg-pink-950/40",  border: "border-pink-900",  fill: "bg-pink-700"  },
};

const PERKS = {
  combat: [
    { level: 3, id: "iki_el",          label: "İki Elli Saldırı",   desc: "Her vuruşta +%15 hasar",          icon: "⚔️" },
    { level: 6, id: "ustaca_savunma",  label: "Ustaca Savunma",     desc: "Alınan hasar -%20",               icon: "🛡️" },
    { level: 9, id: "katil",           label: "Ölümcül Vuruş",      desc: "Kritik vuruş şansı +%25",         icon: "💀" },
  ],
  trade: [
    { level: 3, id: "pazarlık",        label: "Pazarlık",           desc: "Alışta %10 indirim, satışta +%10",icon: "💬" },
    { level: 6, id: "kervan",          label: "Kervan Rotası",      desc: "Uzun seyahatlerde para kazanırsın",icon: "🐪" },
    { level: 9, id: "tüccar_lordu",    label: "Tüccar Lordu",       desc: "Kentlerde özel fiyatlar",         icon: "👑" },
  ],
  crafting: [
    { level: 3, id: "tamir",           label: "Tamir",              desc: "Silah/zırh dayanıklılığı artar",  icon: "🔧" },
    { level: 6, id: "kaliteli_üretim", label: "Kaliteli Üretim",    desc: "Ürün satışı +%20 para",           icon: "⭐" },
    { level: 9, id: "usta_zanaatkar",  label: "Usta Zanaatkar",     desc: "Nadir eşyalar yapabilirsin",      icon: "🏆" },
  ],
  social: [
    { level: 3, id: "ikna",            label: "İkna",               desc: "Diyalog ilişki kazancı +1",       icon: "🗣️" },
    { level: 6, id: "etki",            label: "Etki",               desc: "Soylularla konuşma eşiği -1",     icon: "✨" },
    { level: 9, id: "lider",           label: "Lider",              desc: "Büyük gruplar seni dinler",        icon: "🦅" },
  ],
};

function PerkNode({ perk, skillLevel, unlocked, isLast }) {
  const [hovered, setHovered] = useState(false);
  const reachable = skillLevel >= perk.level;
  const locked = !reachable;
  const active = unlocked;

  return (
    <div className="flex flex-col items-center">
      {/* Connector line above (except first) */}
      <div className={`w-px h-6 ${active ? "bg-amber-600" : reachable ? "bg-stone-600" : "bg-stone-800"}`} />

      {/* Node */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`relative w-full rounded-sm border p-3 transition-all duration-200 cursor-default
          ${active
            ? "border-amber-600 bg-amber-950/60 shadow-[0_0_12px_rgba(217,119,6,0.25)]"
            : reachable
            ? "border-stone-600 bg-stone-900/60 hover:border-stone-400"
            : "border-stone-800 bg-stone-950/40 opacity-50"
          }`}
      >
        <div className="flex items-start gap-3">
          <span className={`text-xl ${locked ? "grayscale opacity-40" : ""}`}>{perk.icon}</span>
          <div className="flex-1 min-w-0">
            <div className={`font-heading text-xs tracking-wide ${active ? "text-amber-300" : reachable ? "text-stone-200" : "text-stone-600"}`}>
              {perk.label}
            </div>
            <div className="text-[10px] text-stone-500 mt-0.5">{perk.desc}</div>
          </div>
          <div className="shrink-0">
            {active
              ? <CheckCircle2 className="w-4 h-4 text-amber-500" />
              : locked
              ? <Lock className="w-3.5 h-3.5 text-stone-700" />
              : <div className={`w-3.5 h-3.5 rounded-full border-2 border-stone-600`} />
            }
          </div>
        </div>

        {/* Level badge */}
        <div className={`absolute -top-2 -right-2 text-[9px] font-heading px-1.5 py-0.5 rounded-sm
          ${active ? "bg-amber-700 text-amber-100" : reachable ? "bg-stone-700 text-stone-300" : "bg-stone-900 text-stone-600"}`}>
          Sv {perk.level}
        </div>
      </div>
    </div>
  );
}

function SkillBranch({ skillKey, skillData, expanded, onToggle }) {
  const meta = SKILL_META[skillKey];
  const perks = PERKS[skillKey] || [];
  const Icon = meta.icon;

  const currentLevel = skillData?.level ?? 0;
  const currentXp = skillData?.xp ?? 0;
  const nextXp = skillData?.xp_next ?? 10;
  const unlockedPerks = skillData?.perks || [];

  const xpPct = nextXp > 0 ? Math.min(100, (currentXp / nextXp) * 100) : 0;
  const unlockedCount = perks.filter(p => unlockedPerks.includes(p.id)).length;

  return (
    <div className={`card-frame border ${meta.border} ${meta.bg} overflow-hidden`}>
      {/* Branch Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 hover:bg-white/5 transition-colors"
      >
        <Icon className={`w-5 h-5 ${meta.color} shrink-0`} />
        <div className="flex-1 text-left">
          <div className={`font-heading text-sm ${meta.color}`}>{meta.label}</div>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-xs text-stone-500">Seviye {currentLevel}</div>
            <div className="flex-1 h-1 bg-stone-900 rounded-sm overflow-hidden max-w-[80px]">
              <div className={`h-full ${meta.fill} transition-all`} style={{ width: `${xpPct}%` }} />
            </div>
            <div className="text-[10px] text-stone-600">{currentXp}/{nextXp} XP</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {unlockedCount > 0 && (
            <span className={`text-[9px] font-heading px-1.5 py-0.5 rounded-sm bg-amber-900/60 text-amber-400`}>
              {unlockedCount}/{perks.length} perk
            </span>
          )}
          {expanded
            ? <ChevronUp className="w-4 h-4 text-stone-500" />
            : <ChevronDown className="w-4 h-4 text-stone-500" />
          }
        </div>
      </button>

      {/* Perk Tree */}
      {expanded && (
        <div className="px-4 pb-4">
          {/* Visual tree line */}
          <div className="flex flex-col items-stretch max-w-sm mx-auto">
            {/* Root node */}
            <div className="flex flex-col items-center mb-0">
              <div className={`w-2 h-2 rounded-full ${currentLevel > 0 ? meta.fill : "bg-stone-800"} mx-auto`} />
            </div>

            {perks.map((perk, i) => (
              <PerkNode
                key={perk.id}
                perk={perk}
                skillLevel={currentLevel}
                unlocked={unlockedPerks.includes(perk.id)}
                isLast={i === perks.length - 1}
              />
            ))}
          </div>

          {/* Progress to next perk */}
          {currentLevel < 9 && (
            <div className="mt-4 text-center">
              {(() => {
                const nextPerk = perks.find(p => p.level > currentLevel);
                if (!nextPerk) return null;
                const levelsNeeded = nextPerk.level - currentLevel;
                return (
                  <div className="text-[10px] text-stone-600 font-heading">
                    {levelsNeeded > 0
                      ? `"${nextPerk.label}" için ${levelsNeeded} seviye daha gerek`
                      : `"${nextPerk.label}" açık!`
                    }
                  </div>
                );
              })()}
            </div>
          )}

          {currentLevel >= 9 && (
            <div className="mt-4 text-center text-[10px] text-amber-500 font-heading">
              ✦ TÜM PERKLER AÇILDI ✦
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SkillTree({ skillsData }) {
  const [expanded, setExpanded] = useState({ combat: true, trade: false, crafting: false, social: false });

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  if (!skillsData) {
    return (
      <div className="text-stone-600 text-sm text-center py-8">
        Skill verisi yükleniyor…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="label-tiny">Yetenek Ağacı</div>
      </div>
      {Object.keys(PERKS).map(skillKey => (
        <SkillBranch
          key={skillKey}
          skillKey={skillKey}
          skillData={skillsData[skillKey]}
          expanded={expanded[skillKey]}
          onToggle={() => toggle(skillKey)}
        />
      ))}
    </div>
  );
}
