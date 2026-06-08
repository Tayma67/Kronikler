import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import SkillTree from "@/pages/SkillTree";
import {
  Heart, Coins, ShieldAlert, Briefcase, Sword,
  Users, Sparkles, Baby, Apple,
  Star, Flame, Eye, Crown,
  Package, Shirt, Hand, Footprints, ShieldHalf, FlaskRound,
  Award, Scroll,
} from "lucide-react";

// ── Karakter Sekmeleri ──────────────────────────────────────────────────────
const TABS = [
  { id: "ozellikler", label: "Özellikler", icon: Sparkles, badge: null },
  { id: "dunya",      label: "Dünya",      icon: Users,    badge: null },
  { id: "seruven",    label: "Serüven",    icon: Award,    badge: "perk" },
];

// ── Stat meta ───────────────────────────────────────────────────────────────
const STAT_META = [
  { key: "strength",     label: "Güç",          icon: Sword,    color: "text-red-400",     fill: "bg-red-700" },
  { key: "intelligence", label: "Zekâ",         icon: Sparkles, color: "text-sky-400",     fill: "bg-sky-700" },
  { key: "charisma",     label: "Karizma",      icon: Users,    color: "text-pink-400",    fill: "bg-pink-700" },
  { key: "stamina",      label: "Dayanıklılık", icon: Heart,    color: "text-emerald-400", fill: "bg-emerald-700" },
];

// ── İlişkiler sabitleri ─────────────────────────────────────────────────────
const BANDS = [
  { id: "dost",     label: "Dostlar",   test: (s) => s >= 50,             cls: "border-emerald-800 text-emerald-300" },
  { id: "arkadaş",  label: "Arkadaşlar",test: (s) => s >= 20 && s < 50,   cls: "border-emerald-900/70 text-emerald-200" },
  { id: "nötr",     label: "Nötr",      test: (s) => s > -20 && s < 20,   cls: "border-stone-700 text-stone-300" },
  { id: "rakip",    label: "Rakipler",  test: (s) => s <= -20 && s > -50, cls: "border-red-900/70 text-red-300" },
  { id: "düşman",   label: "Düşmanlar", test: (s) => s <= -50,            cls: "border-red-800 text-red-400" },
];

// ── Stat flavor sıfatlar ─────────────────────────────────────────────────────
const STAT_FLAVOR = {
  1:  { label: "Sefil",     color: "text-red-500" },
  2:  { label: "Kırık",     color: "text-red-400" },
  3:  { label: "Zayıf",     color: "text-orange-500" },
  4:  { label: "Vasat",     color: "text-orange-400" },
  5:  { label: "Ortalama",  color: "text-stone-400" },
  6:  { label: "Yetkin",    color: "text-stone-300" },
  7:  { label: "Güçlü",     color: "text-emerald-400" },
  8:  { label: "Üstün",     color: "text-emerald-300" },
  9:  { label: "Usta",      color: "text-amber-400" },
  10: { label: "Efsanevi",  color: "text-amber-200" },
};

// ── İlişki skoru etiketleri ──────────────────────────────────────────────────
const REL_FLAVOR = [
  { min: 80,        label: "Sadık",       color: "text-emerald-300" },
  { min: 50,        label: "Güvenilir",   color: "text-emerald-400" },
  { min: 20,        label: "Dost",        color: "text-emerald-500" },
  { min: 5,         label: "Yakın",       color: "text-stone-300" },
  { min: -4,        label: "Nötr",        color: "text-stone-500" },
  { min: -19,       label: "Soğuk",       color: "text-orange-500" },
  { min: -49,       label: "Düşman",      color: "text-red-400" },
  { min: -Infinity, label: "Kan Davası",  color: "text-red-500" },
];

function getRelFlavor(score) {
  return REL_FLAVOR.find(r => score >= r.min) ?? REL_FLAVOR[REL_FLAVOR.length - 1];
}

// ── Envanter slot meta ──────────────────────────────────────────────────────
const SLOT_META = [
  { key: "head",   label: "Baş",      icon: Crown },
  { key: "body",   label: "Vücut",    icon: Shirt },
  { key: "weapon", label: "Silah",    icon: Sword },
  { key: "hands",  label: "Eller",    icon: Hand },
  { key: "legs",   label: "Bacaklar", icon: ShieldHalf },
  { key: "feet",   label: "Ayaklar",  icon: Footprints },
];

const TYPE_ICON = {
  food:       Apple,
  drink:      FlaskRound,
  consumable: FlaskRound,
  weapon:     Sword,
  armor:      Shirt,
};

// ── Tarihi Başarı türleri ────────────────────────────────────────────────────
const MILESTONE_TYPES = {
  savaş_zaferi:    { icon: "🏆", label: "Savaş Zaferi" },
  evlilik:         { icon: "💍", label: "Evlendi" },
  doğum:           { icon: "👶", label: "Çocuk Sahibi Oldu" },
  meslek_değişimi: { icon: "🔄", label: "Meslek Değiştirdi" },
  kariyer_terfi:   { icon: "⭐", label: "Kariyer Terfisi" },
  nesil_devri:     { icon: "🌿", label: "Nesil Devri" },
  miras:           { icon: "📜", label: "Miras Aldı" },
  okul:            { icon: "📚", label: "Eğitim Tamamladı" },
};

// ── Küçük bileşenler ────────────────────────────────────────────────────────
function Bar({ value, max = 10, fill = "bg-orange-700", small = false }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bg-stone-900 rounded-sm overflow-hidden ${small ? "h-1.5" : "h-2"}`}>
      <div className={`h-full ${fill}`} style={{ width: `${w}%` }} />
    </div>
  );
}


function SocialBar({ icon: Icon, label, value, max, displayVal, color, iconColor }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className={`flex items-center gap-1 label-tiny ${iconColor}`}>
          <Icon className="w-3 h-3" />
          {label}
        </div>
        <span className="text-stone-400 text-xs font-mono">{displayVal > 0 ? "+" : ""}{displayVal}</span>
      </div>
      <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── [3.1] HeroCard ───────────────────────────────────────────────────────────
function HeroCard({ p }) {
  const repColor =
    (p.social?.reputation ?? 0) >= 30  ? "border-emerald-600 text-emerald-300 bg-emerald-900/30" :
    (p.social?.reputation ?? 0) >= 10  ? "border-stone-400  text-stone-200  bg-stone-700/40"    :
    (p.social?.reputation ?? 0) >= -10 ? "border-stone-600  text-stone-400  bg-stone-800/30"    :
    (p.social?.reputation ?? 0) >= -30 ? "border-orange-600 text-orange-300 bg-orange-900/30"   :
                                          "border-red-600    text-red-300    bg-red-900/30";

  return (
    <div className="card-frame p-5 space-y-4">
      {/* Üst satır: isim + itibar badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="label-tiny mb-1">Karakter</div>
          <h1
            data-testid="char-name"
            className="font-heading text-3xl text-stone-100 leading-tight truncate"
          >
            {p.name}
          </h1>
          {/* Kimlik satırı */}
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-stone-400 text-sm">
            <span data-testid="char-age">{p.age} yaşında</span>
            <span className="text-stone-700">·</span>
            <span className="capitalize">{p.gender}</span>
            <span className="text-stone-700">·</span>
            <span>{p.culture}</span>
            <span className="text-stone-700">·</span>
            <span>{p.religion}</span>
          </div>
          {/* Çocuk badge */}
          {p.is_child && (
            <span className="inline-flex items-center gap-1 mt-2 text-[10px] uppercase tracking-wider
                             text-amber-400 border border-amber-900 px-1.5 py-0.5 rounded-sm">
              <Baby className="w-3 h-3" /> Çocuk · 13 yaşında özgürleşeceksin
            </span>
          )}
        </div>

        {/* İtibar badge — sağ üst */}
        {p.social?.reputation_label && (
          <div className="shrink-0 text-right">
            <div className="label-tiny mb-1">İtibar</div>
            <span className={`text-xs font-heading px-2 py-1 rounded-sm border ${repColor}`}>
              {p.social.reputation_label}
            </span>
            <div className="text-[10px] text-stone-500 mt-0.5">
              {p.social.reputation > 0 ? "+" : ""}{p.social.reputation}
            </div>
          </div>
        )}
      </div>

      {/* Meslek + Kariyer */}
      <div className="flex items-center gap-2 flex-wrap">
        <Briefcase className="w-3.5 h-3.5 text-stone-500 shrink-0" />
        <span className="text-stone-200 capitalize text-sm">{p.profession}</span>
        {p.career?.title && (
          <>
            <span className="text-stone-700 text-xs">→</span>
            <span className="text-amber-400 text-xs font-heading">{p.career.title}</span>
          </>
        )}
        {/* Kariyer progress bar — sadece next_stage varsa */}
        {p.career?.next_stage && (
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-16 bg-stone-800 rounded-full h-1">
              <div
                className="bg-amber-500 h-1 rounded-full"
                style={{ width: `${Math.min(100, p.career.progress_pct || 0)}%` }}
              />
            </div>
            <span className="text-[10px] text-stone-500">
              {p.career.job_xp || 0}/{p.career.next_stage.xp_required}
            </span>
          </div>
        )}
      </div>

      <div className="divider-ash" />

      {/* Alt KPI satırı: 4 vital */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Coins,       label: "Altın",  value: p.money,         color: "text-amber-400",   warn: false },
          { icon: Heart,       label: "Sağlık", value: p.health,        color: "text-emerald-400", warn: (p.health ?? 100) < 30 },
          { icon: Apple,       label: "Açlık",  value: p.hunger ?? 100, color: "text-orange-300",  warn: (p.hunger ?? 100) < 25 },
          { icon: ShieldAlert, label: "Suç",    value: p.crime || 0,    color: "text-red-400",     warn: (p.crime || 0) > 20 },
        ].map(({ icon: Icon, label, value, color, warn }) => (
          <div key={label} className={`text-center p-2 rounded-sm border ${warn ? "border-red-900/60 bg-red-950/20" : "border-stone-800 bg-stone-900/40"}`}>
            <Icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${warn ? "text-red-400" : "text-stone-500"}`} />
            <div className={`font-heading text-sm ${warn ? "text-red-300" : color}`}>{value}</div>
            <div className="text-[9px] text-stone-600 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Özellikler sekmesi ──────────────────────────────────────────────────────
function TabOzellikler({ p, skillsData }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Stats + Skill Tree */}
      <div className="card-frame p-5 lg:col-span-2 space-y-5">
        <div>
          <div className="label-tiny mb-3">Temel Yetenekler (1-10)</div>
          <div className="grid grid-cols-2 gap-4">
            {STAT_META.map((s) => {
              const v    = p.stats?.[s.key] ?? 0;
              const xp   = p.stat_xp?.[s.key] ?? 0;
              const next = 25 + v * 15;
              const Icon = s.icon;
              return (
                <div key={s.key} data-testid={`stat-${s.key}`}>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className="flex items-center gap-1.5">
                      <Icon className={`w-3 h-3 ${s.color}`} />
                      <span className={s.color}>{s.label}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-heading italic ${STAT_FLAVOR[v]?.color ?? "text-stone-400"}`}>
                        {STAT_FLAVOR[v]?.label ?? ""}
                      </span>
                      <span className="text-stone-500 font-heading">{v}/10</span>
                    </span>
                  </div>
                  <Bar value={v} max={10} fill={s.fill} />
                  <div className="text-[10px] text-stone-500 mt-0.5">XP: {xp}/{next}</div>
                </div>
              );
            })}
          </div>

          {/* [3.2] Stat Dağıt linki */}
          <div className="flex justify-end mt-2">
            <Link
              to="/oyun/statlar"
              className="text-[11px] font-heading tracking-wider text-orange-500 hover:text-orange-400
                         border border-orange-900/50 hover:border-orange-700 px-2 py-1 rounded-sm
                         transition-colors"
            >
              Stat Dağıt →
            </Link>
          </div>
        </div>

        <div className="divider-ash" />
        <SkillTree skillsData={skillsData} />
      </div>

      <div className="space-y-6">
        {/* Toplumsal Statü */}
        {p.social && (
          <div className="card-frame p-5 space-y-4">
            <h2 className="font-heading text-lg text-stone-100 flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" /> Toplumsal Statü
            </h2>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold px-2 py-0.5 rounded-full border ${
                p.social.reputation >= 30  ? "border-emerald-500 text-emerald-300 bg-emerald-900/30" :
                p.social.reputation >= 10  ? "border-stone-400 text-stone-200 bg-stone-700/40" :
                p.social.reputation >= -10 ? "border-stone-500 text-stone-400 bg-stone-800/40" :
                p.social.reputation >= -30 ? "border-orange-500 text-orange-300 bg-orange-900/30" :
                                              "border-red-500 text-red-300 bg-red-900/30"
              }`}>
                {p.social.reputation_label}
              </span>
              <span className="text-stone-500 text-xs">({p.social.reputation > 0 ? "+" : ""}{p.social.reputation})</span>
            </div>
            <div className="space-y-3">
              <SocialBar icon={Star}  label="İtibar" value={p.social.reputation + 100} max={200} displayVal={p.social.reputation} color="bg-amber-500"  iconColor="text-amber-400" />
              <SocialBar icon={Crown} label="Şeref"  value={p.social.honor}            max={100} displayVal={p.social.honor}      color="bg-sky-500"    iconColor="text-sky-400" />
              <SocialBar icon={Flame} label="Korku"  value={p.social.fear}             max={100} displayVal={p.social.fear}       color="bg-red-600"    iconColor="text-red-400" />
              <SocialBar icon={Eye}   label="Ün"     value={p.social.fame}             max={100} displayVal={p.social.fame}       color="bg-purple-500" iconColor="text-purple-400" />
            </div>
            <div className="divider-ash" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-stone-800/50 rounded p-2 text-center">
                <div className="text-stone-400 mb-0.5">Alım fiyatı</div>
                <div className={p.social.trade_buy_mult <= 1 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                  ×{p.social.trade_buy_mult.toFixed(2)}
                </div>
              </div>
              <div className="bg-stone-800/50 rounded p-2 text-center">
                <div className="text-stone-400 mb-0.5">Satış fiyatı</div>
                <div className={p.social.trade_sell_mult >= 1 ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                  ×{p.social.trade_sell_mult.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="text-xs text-stone-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3 h-3" />
              <span>Saldırıya uğrama riski: </span>
              <span className={p.social.attack_risk > 0.15 ? "text-red-400 font-semibold" : p.social.attack_risk > 0.05 ? "text-orange-300" : "text-emerald-400"}>
                %{Math.round(p.social.attack_risk * 100)}
              </span>
            </div>
          </div>
        )}

        {/* AileCard KALDIRILDI — Dünya sekmesine taşındı */}
      </div>
    </div>
  );
}

function AileCard({ p }) {
  const { state } = useGame();
  const navigate = useNavigate();
  const parents  = (p.parent_ids || []).map((id) => state.world.npcs.find((n) => n.id === id)).filter(Boolean);
  const spouse   = p.spouse_id ? state.world.npcs.find((n) => n.id === p.spouse_id) : null;
  const children = (p.children_ids || []).filter((id) => id !== "PLAYER").map((cid) => state.world.npcs.find((n) => n.id === cid)).filter(Boolean);

  return (
    <div className="card-frame p-5 space-y-4">
      <h2 className="font-heading text-lg text-stone-100 flex items-center gap-2"><Users className="w-4 h-4 text-stone-500" /> Aile</h2>
      {parents.length > 0 && (
        <div>
          <div className="label-tiny mb-1">Ebeveynler</div>
          <ul className="text-sm text-stone-300 space-y-0.5">
            {parents.map((par) => (
              <li key={par.id} data-testid={`parent-${par.id}`}>
                <button onClick={() => navigate(`/oyun/npc/${par.id}`)} className="text-amber-400 hover:text-amber-300 hover:underline transition-colors text-left">
                  {par.name}
                </button>
                <span className="text-stone-500"> · {par.profession} · {par.age}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div>
        <div className="label-tiny mb-1">Eş</div>
        {spouse ? (
          <button onClick={() => navigate(`/oyun/npc/${spouse.id}`)} className="text-amber-400 hover:text-amber-300 hover:underline transition-colors text-sm">
            {spouse.name}
          </button>
        ) : (
          <span className="text-stone-500 text-sm">—</span>
        )}
      </div>
      <div>
        <div className="label-tiny mb-1">Çocuklar ({children.length})</div>
        {children.length === 0 ? (
          <div className="text-stone-500 text-sm">Henüz yok</div>
        ) : (
          <ul className="text-sm text-stone-300 space-y-1">
            {children.map((c) => (
              <li key={c.id}>
                <button onClick={() => navigate(`/oyun/npc/${c.id}`)} className="text-amber-400 hover:text-amber-300 hover:underline transition-colors">
                  {c.name}
                </button>
                <span className="text-stone-500"> ({c.age})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="divider-ash" />
      <div>
        {/* [3.3] Meslek Değiştir linki */}
        <div className="flex items-center justify-between mb-1">
          <div className="label-tiny">Meslek</div>
          <Link
            to="/oyun/meslek"
            className="text-[10px] text-stone-500 hover:text-orange-400 transition-colors font-heading tracking-wider"
          >
            Değiştir →
          </Link>
        </div>
        <div className="flex items-center gap-2 text-stone-200 capitalize">
          <Briefcase className="w-3 h-3 text-stone-500" /> {p.profession}
        </div>
        {/* Kariyer aşaması ve ilerleme */}
        {p.career && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-amber-400 font-medium">⚡ {p.career.title}</span>
              {p.career.next_stage && (
                <span className="text-stone-500 text-[10px]">
                  → {p.career.next_stage.title}
                </span>
              )}
            </div>
            {p.career.next_stage ? (
              <div className="w-full bg-stone-700 rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, p.career.progress_pct || 0)}%` }}
                />
              </div>
            ) : (
              <div className="text-[10px] text-amber-600">✦ Zirve</div>
            )}
            <div className="text-[10px] text-stone-500 mt-0.5">
              {p.career.next_stage
                ? `${p.career.job_xp || 0} / ${p.career.next_stage?.xp_required || "?"} iş xp`
                : "En yüksek kariyer aşamasındasın"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dünya sekmesi (Aile + İlişkiler) ────────────────────────────────────────
function TabDunya() {
  const { state } = useGame();
  const p = state.player;

  const grouped = useMemo(() => {
    const out = {};
    for (const band of BANDS) out[band.id] = [];
    for (const [npcId, score] of Object.entries(state.relationships || {})) {
      const npc  = state.world.npcs.find((n) => n.id === npcId);
      if (!npc) continue;
      const band = BANDS.find((b) => b.test(score));
      if (band) out[band.id].push({ npc, score });
    }
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
    }
    return out;
  }, [state]);

  const total = Object.values(grouped).reduce((s, a) => s + a.length, 0);

  return (
    <div className="space-y-6">
      {/* Aile */}
      <AileCard p={p} />

      {/* İlişkiler başlığı */}
      <div>
        <div className="label-tiny mb-3 flex items-center gap-2">
          <Heart className="w-3 h-3 text-stone-400" /> İlişkiler
        </div>

        {/* Özet satırı */}
        <div className="flex items-center flex-wrap gap-2 text-xs mb-4">
          <span className="text-stone-400">
            {total === 0 ? "Henüz kimseyle bağ kurmadın." : `${total} kişiyle ilişkin var`}
          </span>
          {total > 0 && (
            <>
              <span className="text-stone-700">·</span>
              {BANDS.filter(b => grouped[b.id].length > 0).map(band => (
                <span key={band.id} className={`font-heading tracking-wider border px-1.5 py-0.5 rounded-sm ${band.cls}`}>
                  {grouped[band.id].length} {band.label}
                </span>
              ))}
            </>
          )}
        </div>

        {/* Band grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {BANDS.map((band) => (
            <div key={band.id} className="card-frame p-4">
              <div className={`text-xs px-2 py-1 inline-block border rounded-sm font-heading tracking-wider ${band.cls}`}>
                {band.label} ({grouped[band.id].length})
              </div>
              <ul className="mt-3 space-y-1.5">
                {grouped[band.id].map(({ npc, score }) => (
                  <li key={npc.id} className="flex justify-between items-center text-sm">
                    <Link to={`/oyun/npc/${npc.id}`} className="text-stone-200 hover:text-orange-400 truncate mr-2" data-testid={`rel-${npc.id}`}>
                      {npc.name}
                    </Link>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-heading italic ${getRelFlavor(score).color}`}>
                        {getRelFlavor(score).label}
                      </span>
                      <span className="text-stone-600 text-xs">{score > 0 ? `+${score}` : score}</span>
                    </div>
                  </li>
                ))}
                {grouped[band.id].length === 0 && (
                  <li className="text-stone-600 text-xs italic">—</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Envanter sekmesi ─────────────────────────────────────────────────────────
// [3.4] Filtre sabitleri
const FILTERS = [
  { key: "hepsi",  label: "Hepsi" },
  { key: "food",   label: "Yiyecek" },
  { key: "weapon", label: "Silah" },
  { key: "armor",  label: "Zırh" },
  { key: "other",  label: "Diğer" },
];

function TabEnvanter() {
  const { state, setState } = useGame();
  const [items, setItems]   = useState({});
  const [busy, setBusy]     = useState(false);
  const [filter, setFilter] = useState("hepsi"); // [3.4]

  useEffect(() => {
    api.get("/game/items").then(({ data }) => setItems(data.items || {}));
  }, []);

  const inv        = state.player.inventory   || {};
  const equipment  = state.player.equipment   || {};
  const bonuses    = state.player.equipment_bonuses || { attack: 0, defense: 0, charisma: 0 };
  const invEntries = Object.entries(inv).filter(([, q]) => q > 0);

  // [3.4] Filtre mantığı
  const filteredEntries = invEntries.filter(([key]) => {
    if (filter === "hepsi") return true;
    const item = items[key];
    if (!item) return filter === "other";
    if (filter === "other") return !["food", "drink", "consumable", "weapon", "armor"].includes(item.type);
    if (filter === "food") return ["food", "drink", "consumable"].includes(item.type);
    return item.type === filter;
  });

  const currentLoc = state.world.locations.find((l) => l.id === state.player.location_id);
  const netWorth   = useMemo(() => {
    let v = state.player.money;
    if (currentLoc) {
      for (const [g, q] of invEntries) v += (currentLoc.prices?.[g] || 0) * q;
    }
    return Math.round(v);
  }, [invEntries, currentLoc, state.player.money]);

  const consumeItem = async (key) => {
    setBusy(true);
    try {
      const { data } = await api.post("/game/use_item", { item: key, qty: 1 });
      setState(data.state);
      const a     = data.applied || {};
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
      toast.success("Çıkardın");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Çıkarılamadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Donanım */}
      <div className="card-frame p-5 lg:col-span-1">
        <h2 className="font-heading text-lg text-stone-100 mb-4">Donanım</h2>
        <div className="grid grid-cols-2 gap-2">
          {SLOT_META.map((slot) => {
            const itemKey = equipment[slot.key];
            const item    = itemKey ? items[itemKey] : null;
            const Icon    = slot.icon;
            return (
              <div
                key={slot.key}
                data-testid={`slot-${slot.key}`}
                className={`border rounded-sm p-3 min-h-[88px] flex flex-col justify-between ${
                  item ? "border-orange-800/60 bg-stone-900/50" : "border-stone-800 bg-stone-950/40"
                }`}
              >
                <div className="flex items-center gap-1 label-tiny">
                  <Icon className="w-3 h-3" /> {slot.label}
                </div>
                {item ? (
                  <>
                    <div className="text-sm text-stone-100 font-heading mt-1">{item.name}</div>
                    <button
                      onClick={() => unequip(slot.key)}
                      disabled={busy}
                      data-testid={`unequip-${slot.key}`}
                      className="text-[10px] text-stone-500 hover:text-orange-400 self-start mt-1"
                    >
                      çıkar
                    </button>
                  </>
                ) : (
                  <div className="text-xs text-stone-600 italic mt-2">boş</div>
                )}
              </div>
            );
          })}
        </div>
        <div className="divider-ash my-4" />
        <div className="text-xs space-y-1">
          <div className="flex justify-between"><span className="text-stone-500">Saldırı</span><span className="text-red-400 font-heading">+{bonuses.attack}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Savunma</span><span className="text-sky-400 font-heading">+{bonuses.defense}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Karizma</span><span className="text-pink-400 font-heading">+{bonuses.charisma}</span></div>
        </div>
      </div>

      {/* Eşyalar */}
      <div className="card-frame p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg flex items-center gap-2 text-stone-100"><Package className="w-4 h-4" /> Eşyalarım</h2>
          <div className="text-xs text-stone-500">Toplam Değer: <span className="text-amber-400">{netWorth} altın</span></div>
        </div>

        {/* [3.4] Filtre bar */}
        <div className="flex gap-1 flex-wrap mb-3">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2 py-1 text-[10px] font-heading tracking-wider rounded-sm border transition-colors ${
                filter === f.key
                  ? "border-orange-700 bg-orange-950/40 text-orange-400"
                  : "border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* [3.4] filteredEntries kullan */}
        {filteredEntries.length === 0 ? (
          <div className="text-stone-500 text-sm">
            {filter === "hepsi" ? "Heyben bomboş." : `${FILTERS.find(f => f.key === filter)?.label} türünde eşya yok.`}
          </div>
        ) : (
          <ul className="divide-y divide-stone-900">
            {filteredEntries.map(([key, qty]) => {
              const item     = items[key];
              const TypeIcon = item ? (TYPE_ICON[item.type] || Package) : Package;
              const canUse   = item && (item.type === "food" || item.type === "drink" || item.type === "consumable");
              const canEquip = item && item.slot;
              return (
                <li key={key} className="py-2 flex items-center gap-3" data-testid={`inv-row-${key}`}>
                  <TypeIcon className="w-4 h-4 text-stone-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-stone-100 capitalize">
                      {item ? item.name : key}
                      <span className="text-stone-500 text-xs ml-2">×{qty}</span>
                    </div>
                    {item?.desc && <div className="text-[11px] text-stone-500 truncate">{item.desc}</div>}
                  </div>
                  <div className="flex gap-1.5">
                    {canUse && (
                      <button onClick={() => consumeItem(key)} disabled={busy} data-testid={`use-${key}`}
                        className="px-2 py-1 text-[10px] border border-emerald-900 text-emerald-400 hover:bg-emerald-900/30 rounded-sm font-heading tracking-wider">
                        KULLAN
                      </button>
                    )}
                    {canEquip && (
                      <button onClick={() => equipItem(key)} disabled={busy} data-testid={`equip-${key}`}
                        className="px-2 py-1 text-[10px] border border-orange-900 text-orange-400 hover:bg-orange-900/30 rounded-sm font-heading tracking-wider">
                        KUŞAN
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="text-xs text-stone-500 mt-3">
          Satmak veya almak için bir şehrin pazarına git: <span className="text-stone-300">{currentLoc?.name}</span>
        </div>
      </div>
    </div>
  );
}

// ── Serüven sekmesi (Envanter + Ünvanlar) ────────────────────────────────────
function TabSeruven({ p, skillsData }) {
  return (
    <div className="space-y-8">
      {/* Envanter bölümü */}
      <div>
        <div className="label-tiny mb-3 flex items-center gap-2">
          <Package className="w-3 h-3 text-stone-400" /> Envanter
        </div>
        <TabEnvanter />
      </div>

      <div className="divider-ash" />

      {/* Ünvanlar bölümü */}
      <div>
        <div className="label-tiny mb-3 flex items-center gap-2">
          <Award className="w-3 h-3 text-stone-400" /> Ünvanlar & Başarılar
        </div>
        <TabUnvanlar p={p} skillsData={skillsData} />
      </div>
    </div>
  );
}

// ── Ünvanlar sekmesi ─────────────────────────────────────────────────────────
function TabUnvanlar({ p, skillsData }) {
  const { state } = useGame();

  const perks   = p.perks   || {};
  const skills  = p.skills  || {};

  const perkList = [];
  if (skillsData?.perks) {
    for (const [skillKey, perkIds] of Object.entries(perks)) {
      for (const pid of perkIds) {
        const meta = skillsData.perks?.[skillKey]?.find?.(pk => pk.id === pid);
        if (meta) perkList.push({ ...meta, skill: skillKey });
      }
    }
  }

  const repLabel = p.social?.reputation_label;

  // [3.6] Tarihi Başarılar
  const milestones = useMemo(() => {
    const seen = new Set();
    return (state.events || [])
      .filter(ev => MILESTONE_TYPES[ev.type] && !seen.has(ev.type) && seen.add(ev.type))
      .slice(0, 12);
  }, [state.events]);

  return (
    <div className="space-y-6">
      {/* İtibar ünvanı */}
      {repLabel && (
        <div className="card-frame p-5">
          <div className="label-tiny mb-3 flex items-center gap-2"><Crown className="w-3 h-3 text-amber-400" />İtibar Ünvanı</div>
          <div className="flex items-center gap-3">
            <span className={`text-base font-heading px-3 py-1 rounded-sm border ${
              (p.social?.reputation ?? 0) >= 30  ? "border-emerald-600 text-emerald-300 bg-emerald-900/30" :
              (p.social?.reputation ?? 0) >= 10  ? "border-stone-500 text-stone-200 bg-stone-800/40" :
              (p.social?.reputation ?? 0) >= -10 ? "border-stone-600 text-stone-400 bg-stone-800/30" :
              (p.social?.reputation ?? 0) >= -30 ? "border-orange-600 text-orange-300 bg-orange-900/30" :
                                                    "border-red-600 text-red-300 bg-red-900/30"
            }`}>
              {repLabel}
            </span>
          </div>
        </div>
      )}

      {/* Skill seviyeleri */}
      <div className="card-frame p-5">
        <div className="label-tiny mb-4 flex items-center gap-2"><Award className="w-3 h-3 text-orange-400" />Skill Seviyeleri</div>
        {Object.keys(skills).length === 0 ? (
          <p className="text-stone-500 text-sm">Henüz hiçbir skill geliştirilmedi.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(skills).map(([key, level]) => (
              <div key={key} className="bg-stone-900/50 border border-stone-800 rounded-sm p-3 text-center">
                <div className="font-heading text-xl text-orange-400">{level}</div>
                <div className="text-[11px] text-stone-400 capitalize mt-0.5">{key}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kazanılmış Perk'ler */}
      <div className="card-frame p-5">
        <div className="label-tiny mb-4 flex items-center gap-2"><Sparkles className="w-3 h-3 text-sky-400" />Kazanılmış Perk'ler</div>
        {perkList.length === 0 ? (
          <p className="text-stone-500 text-sm">Henüz perk kazanılmadı. Skill ağacından yetenek geliştir.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {perkList.map((pk, i) => (
              <div key={i} className="flex items-start gap-3 bg-stone-900/40 border border-stone-800 rounded-sm p-3">
                <span className="text-xl">{pk.icon}</span>
                <div>
                  <div className="text-stone-100 text-sm font-heading">{pk.label}</div>
                  <div className="text-stone-500 text-xs mt-0.5">{pk.desc}</div>
                  <div className="text-[10px] text-orange-600 mt-1 uppercase tracking-wider">{pk.skill} · seviye {pk.level}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* [3.6] Tarihi Başarılar */}
      <div className="card-frame p-5">
        <div className="label-tiny mb-4 flex items-center gap-2">
          <Scroll className="w-3 h-3 text-stone-400" /> Tarihi Başarılar
        </div>
        {milestones.length === 0 ? (
          <p className="text-stone-500 text-sm">Henüz önemli bir olay yaşanmadı.</p>
        ) : (
          <div className="space-y-2">
            {milestones.map((ev, i) => {
              const m = MILESTONE_TYPES[ev.type];
              return (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-stone-900 last:border-0">
                  <span className="text-base shrink-0">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-heading text-stone-300">{m.label}</div>
                    <div className="text-[11px] text-stone-500 truncate">{ev.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Ana CharacterSheet bileşeni ──────────────────────────────────────────────
export default function CharacterSheet() {
  const { state }   = useGame();
  const [tab, setTab] = useState("ozellikler");
  const [skillsData, setSkillsData] = useState(null);

  const stateTurn = state?.turn;
  const stateAge  = state?.player?.age;
  useEffect(() => {
    if (!state) return;
    api.get("/game/skills").then(({ data }) => setSkillsData(data)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateTurn, stateAge]);

  if (!state) return null;
  const p = state.player;

  // [3.2] Bekleyen perk seçimi badge'i
  const hasPerkChoice = (skillsData?.perk_choices?.length ?? 0) > 0;

  return (
    <div className="space-y-6 rise-in">
      {/* HeroCard */}
      <HeroCard p={p} />

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-stone-800 overflow-x-auto pb-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-1.5 px-4 py-2 text-xs font-heading tracking-wider border-b-2 transition-all whitespace-nowrap ${
                tab === t.id
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              <Icon className="w-3 h-3" />
              {t.label}
              {t.badge === "perk" && hasPerkChoice && (
                <span className="absolute top-1.5 right-1 w-1.5 h-1.5 rounded-full bg-red-500 ring-1 ring-stone-950" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab içeriği */}
      <div>
        {tab === "ozellikler" && <TabOzellikler p={p} skillsData={skillsData} />}
        {tab === "dunya"      && <TabDunya />}
        {tab === "seruven"    && <TabSeruven p={p} skillsData={skillsData} />}
      </div>
    </div>
  );
}
