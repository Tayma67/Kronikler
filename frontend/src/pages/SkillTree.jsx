/**
 * SkillTree.jsx — Adım 16
 * Yeni 3-seçenekli perk sistemiyle güncellendi.
 * Her perk seviyesinde oyuncunun seçtiği perk gösterilir.
 * Henüz seçilmemiş (ama seçilebilir) seviyeler öne çıkar.
 */
import { useState } from "react";
import { Sword, ShoppingBasket, Hammer, Users, Lock, CheckCircle2, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

const SKILL_META = {
  combat:   { label: "Savaş",   icon: Sword,          color: "text-red-400",    bg: "bg-red-950/40",   border: "border-red-900",   fill: "bg-red-700"   },
  trade:    { label: "Ticaret", icon: ShoppingBasket,  color: "text-amber-400",  bg: "bg-amber-950/30", border: "border-amber-900", fill: "bg-amber-700" },
  crafting: { label: "Zanaat",  icon: Hammer,          color: "text-stone-300",  bg: "bg-stone-900/40", border: "border-stone-700", fill: "bg-stone-500" },
  social:   { label: "Sosyal",  icon: Users,           color: "text-pink-400",   bg: "bg-pink-950/40",  border: "border-pink-900",  fill: "bg-pink-700"  },
};

const PERK_LEVELS = [3, 6, 9];

/**
 * Tek bir perk seviye düğümü.
 * Durumlar: locked | pending (skill ≥ level, henüz seçilmedi) | chosen | not_reached
 */
function PerkLevelNode({ level, skillLevel, chosenPerk, perkOptions }) {
  const [expanded, setExpanded] = useState(false);
  const reached = skillLevel >= level;
  const chosen = chosenPerk !== null && chosenPerk !== undefined;
  const pending = reached && !chosen; // Skill yeterli ama seçim yapılmadı

  return (
    <div className="flex flex-col items-stretch">
      {/* Connector */}
      <div className={`mx-auto w-px h-5 ${reached ? "bg-amber-700/60" : "bg-stone-800"}`} />

      {/* Node header */}
      <button
        onClick={() => reached && setExpanded(e => !e)}
        className={`rounded-lg border p-3 text-left transition-all duration-200 ${
          pending
            ? "border-amber-500/60 bg-amber-950/30 shadow-[0_0_10px_rgba(217,119,6,0.15)] cursor-pointer hover:bg-amber-950/50"
            : chosen
            ? "border-emerald-800/60 bg-emerald-950/20 cursor-pointer hover:bg-emerald-950/30"
            : "border-stone-800 bg-stone-950/30 opacity-50 cursor-default"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Level badge */}
          <span className={`text-xs font-bold px-2 py-0.5 rounded-sm shrink-0 ${
            pending ? "bg-amber-700 text-amber-100" :
            chosen  ? "bg-emerald-800 text-emerald-200" :
            "bg-stone-800 text-stone-600"
          }`}>
            Sv {level}
          </span>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {pending && (
              <div className="flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-amber-300 text-xs font-semibold">Perk bekleniyor</span>
              </div>
            )}
            {chosen && (
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{chosenPerk.perk_icon || "⭐"}</span>
                <div>
                  <div className="text-emerald-300 text-xs font-semibold">{chosenPerk.perk_name}</div>
                  <div className="text-stone-500 text-[10px] truncate">{chosenPerk.perk_desc}</div>
                </div>
              </div>
            )}
            {!reached && (
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-stone-700 shrink-0" />
                <span className="text-stone-700 text-xs">{level} seviye gerekli</span>
              </div>
            )}
          </div>

          {/* Status icon */}
          <div className="shrink-0">
            {chosen  && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {pending && <span className="text-amber-400 text-xs">●</span>}
          </div>

          {/* Expand arrow */}
          {reached && (
            expanded
              ? <ChevronUp className="w-3.5 h-3.5 text-stone-500 shrink-0" />
              : <ChevronDown className="w-3.5 h-3.5 text-stone-500 shrink-0" />
          )}
        </div>
      </button>

      {/* Expanded: seçenekleri göster */}
      {expanded && reached && perkOptions && (
        <div className="mt-1.5 ml-2 space-y-1.5 pb-1">
          {perkOptions.map((opt) => {
            const isChosen = chosen && chosenPerk.perk_key === opt.key;
            const isOther = chosen && !isChosen; // Başkası seçildi
            return (
              <div
                key={opt.key}
                className={`rounded-lg border px-3 py-2.5 transition-all ${
                  isChosen
                    ? "border-emerald-700/60 bg-emerald-950/30"
                    : isOther
                    ? "border-stone-800/40 bg-stone-950/20 opacity-40"
                    : pending
                    ? "border-amber-800/30 bg-amber-950/10 hover:bg-amber-950/20"
                    : "border-stone-800/40 bg-stone-950/20"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className={`text-xl shrink-0 ${isOther ? "grayscale" : ""}`}>{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${isChosen ? "text-emerald-300" : isOther ? "text-stone-600" : "text-stone-300"}`}>
                      {opt.name}
                      {isChosen && <span className="ml-2 text-[9px] bg-emerald-800 text-emerald-200 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Seçildi ✓</span>}
                    </div>
                    <div className={`text-[10px] mt-0.5 leading-relaxed ${isOther ? "text-stone-700" : "text-stone-500"}`}>
                      {opt.desc}
                    </div>
                    <div className={`text-[10px] mt-1 font-mono ${isChosen ? "text-emerald-500" : isOther ? "text-stone-700" : "text-stone-600"}`}>
                      → {opt.effect_preview}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {pending && (
            <p className="text-[10px] text-amber-600 text-center pt-1 italic">
              ⚡ Hafta ilerlet — perk seçim ekranı açılacak
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function SkillBranch({ skillKey, skillData, expanded, onToggle }) {
  const meta = SKILL_META[skillKey];
  const Icon = meta.icon;

  const currentLevel = skillData?.level ?? 0;
  const currentXp = skillData?.xp ?? 0;
  const nextXp = skillData?.xp_next ?? 10;
  const chosenPerks = skillData?.chosen_perks || []; // [{skill, level, perk_key, perk_name, perk_desc, perk_icon}]
  const perkChoices = skillData?.perk_choices || {}; // {3: [...], 6: [...], 9: [...]}

  const xpPct = nextXp > 0 ? Math.min(100, (currentXp / nextXp) * 100) : 0;
  const chosenCount = PERK_LEVELS.filter(lv =>
    chosenPerks.some(p => p.level === lv)
  ).length;

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
          {chosenCount > 0 && (
            <span className="text-[9px] font-heading px-1.5 py-0.5 rounded-sm bg-emerald-900/60 text-emerald-400">
              {chosenCount}/{PERK_LEVELS.length} perk
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
          <div className="flex flex-col items-stretch">
            {/* Root */}
            <div className={`mx-auto w-2 h-2 rounded-full ${currentLevel > 0 ? meta.fill : "bg-stone-800"}`} />

            {PERK_LEVELS.map((level) => {
              const chosenPerk = chosenPerks.find(p => p.level === level) || null;
              const options = perkChoices[level] || null;
              return (
                <PerkLevelNode
                  key={level}
                  level={level}
                  skillLevel={currentLevel}
                  chosenPerk={chosenPerk}
                  perkOptions={options}
                />
              );
            })}
          </div>

          {currentLevel >= 9 && chosenCount === PERK_LEVELS.length && (
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

  const skillLevels = skillsData.skills || {};
  const skillXp    = skillsData.skill_xp || {};
  const chosenPerksAll = skillsData.chosen_perks || [];
  const perkChoicesAll = skillsData.perk_choices || {};

  // Her skill için veri paketle
  const buildSkillData = (skillKey) => {
    const level = skillLevels[skillKey] ?? 0;
    const xp = skillXp[skillKey] ?? 0;
    const xpNext = 10 + level * 5;
    return {
      level,
      xp,
      xp_next: xpNext,
      chosen_perks: chosenPerksAll.filter(p => p.skill === skillKey),
      perk_choices: perkChoicesAll[skillKey] || {},
    };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="label-tiny">Yetenek Ağacı</div>
      </div>
      {["combat", "trade", "crafting", "social"].map(skillKey => (
        <SkillBranch
          key={skillKey}
          skillKey={skillKey}
          skillData={buildSkillData(skillKey)}
          expanded={expanded[skillKey]}
          onToggle={() => toggle(skillKey)}
        />
      ))}
    </div>
  );
}
