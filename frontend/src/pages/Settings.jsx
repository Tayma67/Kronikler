import { useEffect, useState, useCallback } from "react";
import { api, extractErrorMessage } from "@/lib/api";
import { getAudioSettings, setAudioSettings, playSfx } from "@/lib/audio";
import { toast } from "sonner";
import {
  Settings as SettingsIcon, Loader2, Volume2, VolumeX, Save,
  Trophy, BarChart3, Type, Music,
} from "lucide-react";

function Section({ icon: Icon, title, children }) {
  return (
    <div className="border border-stone-800 rounded-sm p-3.5 space-y-2.5">
      <h2 className="text-xs font-heading tracking-widest text-stone-500 uppercase flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-orange-500/80" /> {title}
      </h2>
      {children}
    </div>
  );
}

function Slider({ label, value, onChange }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-stone-400 w-16">{label}</span>
      <input type="range" min="0" max="100" value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="flex-1 accent-orange-600" />
      <span className="text-stone-500 w-8 text-right">%{Math.round(value * 100)}</span>
    </div>
  );
}

export default function Settings() {
  const [audio, setAudio] = useState(getAudioSettings());
  const [fontScale, setFontScale] = useState(
    Number(localStorage.getItem("kronikler_font_scale") || 100));
  const [slot, setSlot] = useState(localStorage.getItem("kronikler_save_slot") || "1");
  const [achievements, setAchievements] = useState(null);
  const [stats, setStats] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [a, s] = await Promise.all([
        api.get("/meta/achievements"),
        api.get("/meta/stats"),
      ]);
      setAchievements(a.data);
      setStats(s.data);
    } catch (e) {
      // Aktif oyun yoksa sessizce geç
    }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    document.documentElement.style.fontSize = `${fontScale}%`;
    localStorage.setItem("kronikler_font_scale", String(fontScale));
  }, [fontScale]);

  const updateAudio = (patch) => {
    const next = setAudioSettings(patch);
    setAudio(next);
  };

  const changeSlot = (n) => {
    localStorage.setItem("kronikler_save_slot", n);
    setSlot(n);
    toast.success(`Kayıt ${n} aktif — sayfa yenileniyor...`);
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="max-w-2xl mx-auto px-3 py-4 space-y-4" data-testid="settings-page">
      <h1 className="text-lg font-heading text-stone-200 flex items-center gap-2">
        <SettingsIcon className="w-4 h-4 text-orange-500" /> Ayarlar
      </h1>

      <Section icon={Save} title="Kayıt Slotları">
        <p className="text-[10px] text-stone-500">
          Her slot bağımsız bir hayat. Slot değiştirince sayfa yenilenir.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3"].map((n) => (
            <button key={n} onClick={() => slot !== n && changeSlot(n)}
              className={`py-2 rounded-sm text-xs font-heading border ${
                slot === n
                  ? "border-orange-800 text-orange-300 bg-stone-900"
                  : "border-stone-800 text-stone-500 hover:text-stone-300"}`}>
              Kayıt {n} {slot === n && "✓"}
            </button>
          ))}
        </div>
      </Section>

      <Section icon={audio.muted ? VolumeX : Volume2} title="Ses">
        <div className="flex items-center justify-between">
          <span className="text-xs text-stone-400">Tüm sesler</span>
          <button onClick={() => updateAudio({ muted: !audio.muted })}
            className={`text-xs px-3 py-1 rounded-sm border ${
              audio.muted
                ? "border-red-900 text-red-400"
                : "border-emerald-900 text-emerald-400"}`}>
            {audio.muted ? "Kapalı" : "Açık"}
          </button>
        </div>
        <Slider label="Efektler" value={audio.sfx}
          onChange={(v) => { updateAudio({ sfx: v }); playSfx("coin"); }} />
        <Slider label="Müzik" value={audio.music}
          onChange={(v) => updateAudio({ music: v })} />
        <button onClick={() => playSfx("achievement")}
          className="text-[10px] text-stone-500 underline flex items-center gap-1">
          <Music className="w-3 h-3" /> Sesi dene
        </button>
      </Section>

      <Section icon={Type} title="Erişilebilirlik">
        <div className="flex items-center gap-3 text-xs">
          <span className="text-stone-400 w-16">Yazı boyutu</span>
          {[90, 100, 110, 125].map((s) => (
            <button key={s} onClick={() => setFontScale(s)}
              className={`px-2 py-1 rounded-sm border ${
                fontScale === s
                  ? "border-orange-800 text-orange-300"
                  : "border-stone-800 text-stone-500"}`}>
              %{s}
            </button>
          ))}
        </div>
      </Section>

      {stats && (
        <Section icon={BarChart3} title="İstatistikler">
          <div className="grid grid-cols-2 gap-1.5">
            {[
              ["Nesil", stats.generation],
              ["Oynanan yıl", stats.years_played],
              ["Hanedan puanı", stats.dynasty?.score ?? 0],
              ["Servet", `${stats.records.money}a`],
              ["İtibar", stats.records.reputation],
              ["Ün", stats.records.fame],
              ["Mülk", stats.records.properties],
              ["Çocuk", stats.records.children],
              ["Biten hikâye", stats.records.stories_completed],
              ["Savaş Z/Y", `${stats.records.battles_won}/${stats.records.battles_lost}`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-[11px] border border-stone-800/50 rounded-sm px-2 py-1">
                <span className="text-stone-500">{k}</span>
                <span className="text-stone-300">{v}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {achievements && (
        <Section icon={Trophy} title={`Başarımlar — ${achievements.unlocked}/${achievements.total}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-80 overflow-y-auto">
            {achievements.achievements.map((a) => (
              <div key={a.id}
                className={`flex items-start gap-2 border rounded-sm px-2 py-1.5 ${
                  a.unlocked
                    ? "border-amber-900/50 bg-amber-950/10"
                    : "border-stone-800/50 opacity-50"}`}>
                <span className="text-base shrink-0">{a.unlocked ? a.icon : "🔒"}</span>
                <div className="min-w-0">
                  <div className={`text-[11px] ${a.unlocked ? "text-amber-300" : "text-stone-500"}`}>
                    {a.title}
                  </div>
                  <div className="text-[9px] text-stone-600 leading-tight">{a.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
