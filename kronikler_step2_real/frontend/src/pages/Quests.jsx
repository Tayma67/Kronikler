import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useState, useMemo, useEffect } from "react";
import { ListChecks, MapPin, Baby, Lock, CheckCircle2, Hourglass } from "lucide-react";

const STATUS_LABEL = {
  açık: "Açık",
  kabul_edildi: "Kabul Edildi",
  tamamlandı: "Tamamlandı",
  başarısız: "Başarısız",
};

const STATUS_COLOR = {
  açık: "text-amber-400 border-amber-900",
  kabul_edildi: "text-orange-400 border-orange-900",
  tamamlandı: "text-emerald-400 border-emerald-900",
  başarısız: "text-red-400 border-red-900",
};

function QuestCard({ q, busy, onAccept, onComplete }) {
  const isLocal = q._isLocal;
  return (
    <div key={q.id} className="card-frame p-4" data-testid={`quest-${q.id}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-heading text-stone-100">{q.title}</h3>
        <span className={`text-[10px] px-2 py-0.5 border rounded-sm font-heading tracking-wider ${STATUS_COLOR[q.status]}`}>
          {STATUS_LABEL[q.status]}
        </span>
      </div>
      <p className="text-sm text-stone-400 mb-3">{q.description}</p>
      <div className="flex justify-between items-center text-xs text-stone-500">
        <span className={`flex items-center gap-1 ${isLocal ? "text-amber-500" : ""}`}>
          <MapPin className="w-3 h-3" />
          {q.location_name}
          {isLocal && <span className="text-amber-600 font-heading ml-1">BURADASIN</span>}
        </span>
        <span>Ödül: <span className="text-amber-400">{q.reward}a</span></span>
      </div>
      <div className="flex gap-2 mt-3">
        {q.status === "açık" && (
          <button onClick={() => onAccept(q.id)} disabled={busy === q.id} data-testid={`quest-accept-${q.id}`} className="btn-ghost-ash px-3 py-1.5 text-xs">
            Kabul Et
          </button>
        )}
        {(q.status === "açık" || q.status === "kabul_edildi") && (
          <button onClick={() => onComplete(q.id)} disabled={busy === q.id} data-testid={`quest-complete-${q.id}`} className="btn-ember px-3 py-1.5 text-xs font-heading tracking-wider">
            Tamamlamayı Dene
          </button>
        )}
      </div>
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
    try {
      const { data } = await api.post("/game/quest/accept", { quest_id: id });
      setState(data);
      toast.success("Görev kabul edildi.");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hata");
    } finally {
      setBusy(null);
    }
  };

  const complete = async (id) => {
    setBusy(id);
    try {
      const { data } = await api.post("/game/quest/complete", { quest_id: id });
      setState(data);
      toast.success("Görev sonuçlandı.");
    } catch (e) {
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
    <div className="space-y-6 rise-in">
      <div>
        <div className="label-tiny">Görev Defteri</div>
        <h1 className="font-heading text-3xl text-stone-100 flex items-center gap-3">
          <ListChecks className="w-7 h-7 text-orange-600" /> Yapılacaklar
          {activeQuests.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-orange-500 text-stone-950 text-xs font-heading font-bold">
              {activeQuests.length}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
          {localActive.length > 0 && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-amber-500" />
              <span className="text-amber-400 font-heading">{playerLocationName}</span>
              <span className="text-stone-600">·</span>
              <span>{localActive.length} burada</span>
            </span>
          )}
          {localActive.length > 0 && remoteActive.length > 0 && <span className="text-stone-700">·</span>}
          {remoteActive.length > 0 && (
            <span>{remoteActive.length} başka şehirde</span>
          )}
          {activeQuests.length === 0 && (
            <span>Aktif görev yok. Dünyayı gezmaya devam et.</span>
          )}
        </div>
      </div>

      {/* Yerel görevler */}
      {localActive.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-3.5 h-3.5 text-amber-500" />
            <span className="label-tiny text-amber-600">{playerLocationName} — Buradaki Görevler</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {localActive.map(q => (
              <QuestCard key={q.id} q={q} busy={busy} onAccept={accept} onComplete={complete} />
            ))}
          </div>
        </div>
      )}

      {/* Uzak görevler */}
      {remoteActive.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="label-tiny text-stone-500">Diğer Şehirlerdeki Görevler</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {remoteActive.map(q => (
              <QuestCard key={q.id} q={q} busy={busy} onAccept={accept} onComplete={complete} />
            ))}
          </div>
        </div>
      )}

      {/* Tamamlanan / başarısız */}
      {pastQuests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="label-tiny text-stone-600">Geçmiş</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {pastQuests.map(q => (
              <QuestCard key={q.id} q={q} busy={busy} onAccept={accept} onComplete={complete} />
            ))}
          </div>
        </div>
      )}

      {quests.length === 0 && (
        <div className="text-stone-500">
          Henüz bir görev yok. Birkaç gün geçir, dünya kendi sorunlarını yaratır.
        </div>
      )}

      {/* ── Aile Yolu ── */}
      {activeFamilyQuests.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3 pt-4 border-t border-stone-800">
            <Baby className="w-3.5 h-3.5 text-amber-500" />
            <span className="label-tiny text-amber-600">Aile Yolu</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {activeFamilyQuests.map((q) => {
              const Icon = q.status === "tamamlandı" ? CheckCircle2
                         : q.status === "kilitli"    ? Lock : Hourglass;
              return (
                <div key={q.id} className="card-frame p-4">
                  <div className="flex justify-between items-start mb-2 gap-3">
                    <h3 className="font-heading text-stone-100 flex items-center gap-2">
                      <Icon className="w-4 h-4 text-stone-400" />
                      {q.title}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 border rounded-sm font-heading tracking-wider text-amber-400 border-amber-900">
                      {q.status}
                    </span>
                  </div>
                  <p className="text-sm text-stone-400 mb-2">{q.description}</p>
                  <div className="text-xs text-stone-500">
                    Veren: {q.giver_role === "anne" ? "Annen" : "Baban"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
