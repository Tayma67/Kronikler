import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Heart, HeartOff, Crown, Users, Loader2, Lock,
  CheckCircle2, Baby, Skull, Ribbon,
} from "lucide-react";

// ─── Yardımcılar ──────────────────────────────────────────────────────────────
function relColor(score) {
  if (score >= 70) return "text-pink-400";
  if (score >= 50) return "text-rose-400";
  if (score >= 30) return "text-orange-400";
  return "text-stone-500";
}
function relLabel(score) {
  if (score >= 70) return "Aşık";
  if (score >= 50) return "Yakın Dost";
  if (score >= 30) return "Arkadaş";
  return "Tanışık";
}
function RelBar({ score }) {
  const pct = Math.max(0, Math.min(100, ((score + 100) / 200) * 100));
  const color = score >= 50 ? "bg-pink-600" : score >= 30 ? "bg-orange-700" : "bg-stone-600";
  return (
    <div className="stat-bar mt-1">
      <div className={`h-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Çocuk kartı ─────────────────────────────────────────────────────────────
function ChildCard({ child }) {
  const isAlive = child.alive !== false;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-sm border ${isAlive ? "border-stone-800/50 bg-stone-900/20" : "border-stone-900/50 bg-stone-950/30 opacity-60"}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAlive ? "bg-pink-950/40 border border-pink-900/40" : "bg-stone-900/40 border border-stone-800/40"}`}>
        {isAlive
          ? <Baby className="w-4 h-4 text-pink-400" />
          : <Skull className="w-3.5 h-3.5 text-stone-600" />}
      </div>
      <div className="flex-1 min-w-0">
        {isAlive
          ? <Link to={`/oyun/npc/${child.id}`} className="font-heading text-sm text-stone-200 hover:text-pink-400 transition-colors">{child.name}</Link>
          : <span className="font-heading text-sm text-stone-600 line-through">{child.name}</span>}
        <p className="text-[10px] text-stone-600 mt-0.5">
          {child.age} yaş
          {child.profession && child.age >= 10 ? ` · ${child.profession}` : ""}
          {!isAlive ? " · Hayatını kaybetti" : ""}
        </p>
      </div>
      {isAlive && child.age >= 13 && (
        <span className="label-tiny text-stone-600">Yetişkin</span>
      )}
    </div>
  );
}

// ─── Evli ekranı ─────────────────────────────────────────────────────────────
function MarriedView({ spouse, relationship, children }) {
  const score = relationship ?? 0;
  const isAlive = spouse.alive !== false;

  if (!isAlive) {
    return (
      <div className="space-y-4">
        {/* Dul ekranı */}
        <div className="card-frame p-5 border border-stone-800/50 bg-stone-950/20 text-center space-y-3">
          <Ribbon className="w-8 h-8 text-stone-600 mx-auto" />
          <div>
            <div className="label-tiny mb-1 text-stone-600">Rahmetli Eşin</div>
            <p className="font-heading text-xl text-stone-500">{spouse.name}</p>
            <p className="text-stone-600 text-sm mt-0.5 italic">Hayatını kaybetti.</p>
          </div>
          <p className="text-xs text-stone-600">
            Yeniden evlenebilmek için birini bul, flört et ve ilişkini güçlendir.
          </p>
        </div>
        {/* Çocuklar (varsa) */}
        {children.length > 0 && <ChildrenSection children={children} />}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Eş kartı */}
      <div className="card-frame p-5 border border-pink-900/50 bg-pink-950/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-pink-950/40 border border-pink-900/40 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-pink-400" />
          </div>
          <div className="flex-1">
            <div className="label-tiny mb-0.5">Eşin</div>
            <Link
              to={`/oyun/npc/${spouse.id}`}
              className="font-heading text-xl text-stone-100 hover:text-pink-400 transition-colors"
            >
              {spouse.name}
            </Link>
            <p className="text-stone-400 text-xs mt-0.5">
              {spouse.age} yaş · {spouse.profession || "Bilinmiyor"}
            </p>
          </div>
          <div className="text-right">
            <span className={`font-heading text-2xl ${relColor(score)}`}>{score > 0 ? `+${score}` : score}</span>
            <p className={`text-[10px] font-heading tracking-wider ${relColor(score)}`}>{relLabel(score)}</p>
          </div>
        </div>
        <div>
          <RelBar score={score} />
        </div>
        {score < 30 && (
          <p className="text-xs text-amber-600/80 italic border-l-2 border-amber-900/50 pl-2">
            İlişkin zayıflıyor. Hediye ver, zaman geçir, iltifat et.
          </p>
        )}
      </div>

      {/* Çocuklar */}
      {children.length > 0 && <ChildrenSection children={children} />}
      {children.length === 0 && (
        <p className="text-center text-stone-700 text-xs italic">
          Henüz çocuğunuz yok. Zaman geçtikçe aile büyüyebilir.
        </p>
      )}
    </div>
  );
}

function ChildrenSection({ children }) {
  return (
    <div>
      <div className="label-tiny mb-2 flex items-center gap-1.5">
        <Baby className="w-3 h-3" /> Çocuklarınız ({children.length})
      </div>
      <div className="space-y-2">
        {children.map((c) => <ChildCard key={c.id} child={c} />)}
      </div>
    </div>
  );
}

// ─── Aday kartı ───────────────────────────────────────────────────────────────
function CandidateCard({ npc, score, isDating, busy, onPropose }) {
  const canPropose = isDating && score >= 50;
  const needsDating = !isDating;

  return (
    <div className={`card-frame p-4 space-y-3 border ${isDating ? "border-pink-900/50 bg-pink-950/10" : "border-stone-800/50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Link to={`/oyun/npc/${npc.id}`} className="font-heading text-stone-100 hover:text-orange-400 transition-colors">
            {npc.name}
          </Link>
          <p className="text-xs text-stone-500 mt-0.5">
            {npc.age} yaş · {npc.profession || "?"} · {npc.gender === "kadın" ? "Kadın" : "Erkek"}
          </p>
        </div>
        <div className="text-right">
          <span className={`font-heading text-lg ${relColor(score)}`}>{score > 0 ? `+${score}` : score}</span>
          <p className={`text-[10px] font-heading tracking-wider ${relColor(score)}`}>{relLabel(score)}</p>
        </div>
      </div>

      <RelBar score={score} />

      <div className="flex items-center justify-between gap-2 pt-0.5">
        {isDating ? (
          <span className="flex items-center gap-1 text-xs text-pink-400 font-heading tracking-wider">
            <Heart className="w-3 h-3" /> Çıkıyorsunuz
          </span>
        ) : (
          <span className="text-xs text-stone-600 italic">Henüz çıkmıyorsunuz</span>
        )}

        {canPropose ? (
          <button
            onClick={() => onPropose(npc.id)}
            disabled={busy === npc.id}
            className="btn-ember px-3 py-1.5 text-xs font-heading tracking-widest flex items-center gap-1.5"
          >
            {busy === npc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Heart className="w-3 h-3" />}
            Evlenme Teklif Et
          </button>
        ) : (
          <div className="flex items-center gap-1 text-xs text-stone-600">
            <Lock className="w-3 h-3" />
            {needsDating ? "Önce çıkın (flört et)" : `İlişki ${score}/50 gerekli`}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Ana sayfa ────────────────────────────────────────────────────────────────
export default function Marry() {
  const { state, setState } = useGame();
  const [busy, setBusy] = useState(null);

  const player     = state?.player || {};
  const relationships = state?.relationships || {};
  const playerAge  = player.age || 0;
  const spouseId   = player.spouse_id;
  const childrenIds = player.children_ids || [];

  // Eşi bul (ölmüşse de göster)
  const spouse = useMemo(() => {
    if (!spouseId) return null;
    return state?.world?.npcs?.find((n) => n.id === spouseId) || null;
  }, [spouseId, state]);

  // Çocukları bul
  const children = useMemo(() => {
    if (!childrenIds.length || !state?.world?.npcs) return [];
    return state.world.npcs.filter((n) => childrenIds.includes(n.id))
      .sort((a, b) => a.age - b.age);
  }, [childrenIds, state]);

  // Evli + eş ölmüşse yeniden evlenme izni
  const spouseDead = spouse && spouse.alive === false;
  const isMarried  = spouseId && !spouseDead;

  // Adaylar
  const candidates = useMemo(() => {
    if (isMarried || !state?.world?.npcs) return [];
    const loc = player.location_id;
    const relStatus = player.relationship_status || {};
    return state.world.npcs
      .filter((n) =>
        n.alive !== false &&
        n.location_id === loc &&
        !n.spouse_id &&
        (n.age || 0) >= 18 &&
        (relationships[n.id] || 0) >= 10
      )
      .map((n) => ({
        npc: n,
        score: relationships[n.id] || 0,
        isDating: relStatus[n.id] === "dating",
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [state, player, isMarried, relationships]);

  const handlePropose = async (npcId) => {
    setBusy(npcId);
    try {
      const { data } = await api.post(`/game/npc/${npcId}/propose`);
      if (data.state) setState(data.state);
      if (data.accepted) {
        toast.success("Teklif kabul edildi! Kutlu olsun.");
      } else {
        toast("Teklif reddedildi.", { description: data.reason || "" });
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Teklif gönderilemedi.");
    } finally {
      setBusy(null);
    }
  };

  if (playerAge < 13) {
    return (
      <div className="rise-in space-y-4">
        <div>
          <div className="label-tiny">Aile</div>
          <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
            <Heart className="w-6 h-6 text-pink-600" /> Evlilik
          </h1>
        </div>
        <div className="card-frame p-6 text-center space-y-3 border border-stone-800/50">
          <Lock className="w-8 h-8 text-stone-700 mx-auto" />
          <p className="text-stone-400 font-heading">Henüz çok küçüksün.</p>
          <p className="text-stone-600 text-sm">13 yaşına geldiğinde evlilik kapısı açılır.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 rise-in">
      {/* Başlık */}
      <div>
        <div className="label-tiny">Aile</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <Heart className="w-6 h-6 text-pink-600" /> Evlilik & Aile
        </h1>
        <p className="text-stone-400 text-sm mt-1">
          {isMarried ? "Evlisin." : spouseDead ? "Eşini kaybettin." : "Şu an bekar. Bulunduğun yerde uygun biri var mı?"}
        </p>
      </div>

      {/* Aile durumu */}
      {(isMarried || spouseDead) && spouse ? (
        <MarriedView spouse={spouse} relationship={relationships[spouse.id]} children={children} />
      ) : (
        <>
          {/* Varsa çocuklar (dul durumdayken de göster) */}
          {spouseDead && children.length > 0 && (
            <ChildrenSection children={children} />
          )}

          {candidates.length === 0 ? (
            <div className="card-frame p-8 text-center space-y-3">
              <HeartOff className="w-8 h-8 text-stone-700 mx-auto" />
              <p className="text-stone-500 font-heading">Burada uygun aday yok.</p>
              <p className="text-stone-600 text-xs">İlişkin en az 10 olan bekar birini bul, flört et, zaman geç.</p>
            </div>
          ) : (
            <>
              <div className="border border-stone-800/50 rounded-sm p-3 text-xs text-stone-500 space-y-1">
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-stone-600" />
                  NPC ile <span className="text-stone-400">"Flört Et"</span> → çıkıyorsunuz durumuna geç
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-stone-600" />
                  İlişki <span className="text-stone-400">50+</span> olduğunda evlenme teklifi aktifleşir
                </p>
                <p className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-stone-600" />
                  NPC sayfasında hediye ver, iltifat et, zaman geçirerek güçlendir
                </p>
              </div>
              <div>
                <div className="label-tiny mb-3 flex items-center gap-2">
                  <Users className="w-3 h-3" /> Bu bölgedeki adaylar ({candidates.length})
                </div>
                <div className="space-y-3">
                  {candidates.map(({ npc, score, isDating }) => (
                    <CandidateCard
                      key={npc.id}
                      npc={npc}
                      score={score}
                      isDating={isDating}
                      busy={busy}
                      onPropose={handlePropose}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
