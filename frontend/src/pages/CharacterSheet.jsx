import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import SkillTree from "@/pages/SkillTree";
import {
  Heart, Coins, ShieldAlert, Briefcase, Sword,
  Users, Sparkles, Baby, Apple,
  Star, Flame, Eye, Crown,
  Link as LinkIcon,
  Package, Shirt, Hand, Footprints, ShieldHalf, FlaskRound,
  Award,
} from "lucide-react";
import { Link } from "react-router-dom";

// ── Karakter Sekmeleri ──────────────────────────────────────────────────────
const TABS = [
  { id: "ozellikler", label: "Özellikler",       icon: Sparkles },
  { id: "iliskiler",  label: "İlişkiler",         icon: Heart },
  { id: "envanter",   label: "Envanter",          icon: Package },
  { id: "unvanlar",   label: "Ünvanlar",          icon: Award },
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

// ── Küçük bileşenler ────────────────────────────────────────────────────────
function Bar({ value, max = 10, fill = "bg-orange-700", small = false }) {
  const w = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={`bg-stone-900 rounded-sm overflow-hidden ${small ? "h-1.5" : "h-2"}`}>
      <div className={`h-full ${fill}`} style={{ width: `${w}%` }} />
    </div>
  );
}

function KpiBlock({ icon: Icon, label, value, color = "text-stone-200" }) {
  return (
    <div>
      <div className="flex items-center gap-1 label-tiny mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className={`font-heading text-2xl ${color}`}>{value}</div>
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

// ── Özellikler sekmesi ──────────────────────────────────────────────────────
function TabOzellikler({ p, skillsData }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Stats + Skill Tree */}
      <div className="card-frame p-5 lg:col-span-2 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiBlock icon={Coins}      label="Altın"  value={p.money}            color="text-amber-400" />
          <KpiBlock icon={Heart}      label="Sağlık" value={p.health}           color="text-emerald-400" />
          <KpiBlock icon={Apple}      label="Açlık"  value={p.hunger ?? 100}    color={(p.hunger ?? 100) < 25 ? "text-red-400" : "text-orange-300"} />
          <KpiBlock icon={ShieldAlert}label="Suç"    value={p.crime || 0}       color="text-red-400" />
        </div>
        <div className="divider-ash" />

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
                    <span className="text-stone-300 font-heading">{v}/10</span>
                  </div>
                  <Bar value={v} max={10} fill={s.fill} />
                  <div className="text-[10px] text-stone-500 mt-0.5">XP: {xp}/{next}</div>
                </div>
              );
            })}
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

        {/* Aile */}
        <AileCard p={p} />
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
        <div className="label-tiny mb-1">Meslek</div>
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

// ── İlişkiler sekmesi ───────────────────────────────────────────────────────
function TabIliskiler() {
  const { state } = useGame();
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
    <div className="space-y-4">
      <p className="text-stone-400 text-sm">
        {total === 0 ? "Henüz kimseyle bağ kurmadın." : `${total} kişiyle bir ilişkin var.`}
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {BANDS.map((band) => (
          <div key={band.id} className="card-frame p-4">
            <div className={`text-xs px-2 py-1 inline-block border rounded-sm font-heading tracking-wider ${band.cls}`}>
              {band.label} ({grouped[band.id].length})
            </div>
            <ul className="mt-3 space-y-1.5">
              {grouped[band.id].map(({ npc, score }) => (
                <li key={npc.id} className="flex justify-between text-sm">
                  <Link to={`/oyun/npc/${npc.id}`} className="text-stone-200 hover:text-orange-400 truncate mr-2" data-testid={`rel-${npc.id}`}>
                    {npc.name}
                  </Link>
                  <span className="text-stone-500 text-xs shrink-0">{score > 0 ? `+${score}` : score}</span>
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
  );
}

// ── Envanter sekmesi ─────────────────────────────────────────────────────────
function TabEnvanter() {
  const { state, setState } = useGame();
  const [items, setItems]   = useState({});
  const [busy, setBusy]     = useState(false);

  useEffect(() => {
    api.get("/game/items").then(({ data }) => setItems(data.items || {}));
  }, []);

  const inv        = state.player.inventory   || {};
  const equipment  = state.player.equipment   || {};
  const bonuses    = state.player.equipment_bonuses || { attack: 0, defense: 0, charisma: 0 };
  const invEntries = Object.entries(inv).filter(([, q]) => q > 0);

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
        {invEntries.length === 0 ? (
          <div className="text-stone-500 text-sm">Heyben bomboş.</div>
        ) : (
          <ul className="divide-y divide-stone-900">
            {invEntries.map(([key, qty]) => {
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

// ── Ünvanlar sekmesi ─────────────────────────────────────────────────────────
function TabUnvanlar({ p, skillsData }) {
  // Açılmış perks'leri göster
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

  // Reputation label badge
  const repLabel = p.social?.reputation_label;

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

  return (
    <div className="space-y-6 rise-in">
      {/* Başlık */}
      <div>
        <div className="label-tiny">Karakter</div>
        <h1 className="font-heading text-3xl text-stone-100">{p.name}</h1>
        <p className="text-stone-400 text-sm flex items-center flex-wrap gap-x-2">
          <span>{p.gender}</span>·<span data-testid="char-age">{p.age} yaşında</span>
          {p.is_child && (
            <span className="text-[10px] uppercase tracking-wider text-amber-400 border border-amber-900 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
              <Baby className="w-3 h-3" /> Çocuk · 13 yaşında özgürleşeceksin
            </span>
          )}
          <span>·</span><span>{p.culture}</span>·<span>{p.religion}</span>
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-stone-800 overflow-x-auto pb-0">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-heading tracking-wider border-b-2 transition-all whitespace-nowrap ${
                tab === t.id
                  ? "border-orange-500 text-orange-400"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              <Icon className="w-3 h-3" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab içeriği */}
      <div>
        {tab === "ozellikler" && <TabOzellikler p={p} skillsData={skillsData} />}
        {tab === "iliskiler"  && <TabIliskiler />}
        {tab === "envanter"   && <TabEnvanter />}
        {tab === "unvanlar"   && <TabUnvanlar p={p} skillsData={skillsData} />}
      </div>
    </div>
  );
}
