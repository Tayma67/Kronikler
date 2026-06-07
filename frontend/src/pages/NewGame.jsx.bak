import { useEffect, useState } from "react";
import { useGame } from "@/lib/GameContext";
import { useNavigate } from "react-router-dom";
import { Flame, Loader2, Shield, Sparkles } from "lucide-react";

export default function NewGame() {
  const { state, fetchState, newGame } = useGame();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname]     = useState("");
  const [gender, setGender]       = useState("");   // "erkek" | "kadın"
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState("");

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (state && state.world) navigate("/oyun");
  }, [state, navigate]);

  const start = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName.trim()) {
      setError("Lütfen adını gir");
      return;
    }
    if (firstName.trim().length < 2) {
      setError("Ad en az 2 karakter olmalı");
      return;
    }
    if (firstName.trim().length > 20) {
      setError("Ad en fazla 20 karakter olmalı");
      return;
    }
    if (surname.trim().length > 20) {
      setError("Soyad en fazla 20 karakter olmalı");
      return;
    }
    if (!gender) {
      setError("Lütfen cinsiyetini seç");
      return;
    }

    setBusy(true);
    try {
      await newGame(firstName.trim(), surname.trim(), gender);
      navigate("/oyun");
    } catch (err) {
      setError(err?.response?.data?.detail || "Oyun başlatılamadı. Lütfen tekrar dene.");
    } finally {
      setBusy(false);
    }
  };

  if (state === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-stone-500">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-stone-950 flex items-center justify-center p-4 overflow-hidden">
      <div className="card-frame max-w-2xl w-full p-6 sm:p-10 rise-in overflow-y-auto max-h-full">
        <div className="flex items-center gap-3 mb-6">
          <Flame className="w-8 h-8 text-orange-600 ember-flicker" />
          <h1 className="font-heading text-3xl text-stone-100">Yeni Yolculuk</h1>
        </div>
        <div className="divider-ash mb-6" />
        <p className="text-stone-300 leading-relaxed mb-3 text-sm sm:text-base">
          Bu, kahramanların değil <span className="text-orange-400">çocukların</span> hikâyesi.
          Yedi yaşındasın. Külleri savrulmuş bu dünyada bir köyde annenle babanın yanında
          doğdun. Zayıf bir kolun, küçük bir aklın var; üstünde köylü giysisi, heybende
          iki dilim ekmek. Hayat seni bekliyor.
        </p>
        <p className="text-stone-300 leading-relaxed mb-3 text-sm sm:text-base">
          1 tur = 1 hafta. 48 hafta sonra bir yaş büyüyeceksin.
          Her kış sandığın incelecek, her yaz tarlalar dolacak. Aç kalırsan zayıflarsın,
          aç bırakmazsan büyürsün. Çocukken yaptığın her şey —ne kadar tahta sopa salladığın,
          kaç kez pazarda pazarlık ettiğin— büyüyünce <span className="text-amber-400">kalıcı statlara</span> dönüşecek.
        </p>
        <p className="text-stone-400 italic text-xs sm:text-sm mb-6">
          13 yaşında dünya sana açılacak: meslek, savaş, ticaret, evlilik. O zamana kadar
          ailenin görevleri yolun olsun.
        </p>

        <form onSubmit={start} className="space-y-5">
          {/* Ad + Soyad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-tiny block mb-2">Adın</label>
              <input
                type="text"
                required
                data-testid="new-game-firstname"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Adını gir..."
                className="w-full bg-stone-950 border border-stone-800 px-4 py-3 text-stone-200 focus:border-orange-700 outline-none rounded-sm"
                maxLength={20}
                disabled={busy}
              />
            </div>
            <div>
              <label className="label-tiny block mb-2">Soyadın <span className="text-stone-600 normal-case font-sans text-[10px]">(isteğe bağlı)</span></label>
              <input
                type="text"
                data-testid="new-game-surname"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Soyadını gir..."
                className="w-full bg-stone-950 border border-stone-800 px-4 py-3 text-stone-200 focus:border-orange-700 outline-none rounded-sm"
                maxLength={20}
                disabled={busy}
              />
            </div>
          </div>

          {/* Cinsiyet seçimi */}
          <div>
            <label className="label-tiny block mb-3">Cinsiyetin</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender("erkek")}
                disabled={busy}
                className={`flex items-center justify-center gap-2 py-3 border rounded-sm font-heading tracking-wider text-sm transition-colors
                  ${gender === "erkek"
                    ? "border-orange-700 bg-orange-950/40 text-orange-300"
                    : "border-stone-800 text-stone-400 hover:border-stone-600 hover:bg-stone-900/40"}`}
              >
                <Shield className="w-4 h-4" />
                Erkek
              </button>
              <button
                type="button"
                onClick={() => setGender("kadın")}
                disabled={busy}
                className={`flex items-center justify-center gap-2 py-3 border rounded-sm font-heading tracking-wider text-sm transition-colors
                  ${gender === "kadın"
                    ? "border-orange-700 bg-orange-950/40 text-orange-300"
                    : "border-stone-800 text-stone-400 hover:border-stone-600 hover:bg-stone-900/40"}`}
              >
                <Sparkles className="w-4 h-4" />
                Kadın
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-400 border border-red-900/60 px-3 py-2 rounded-sm bg-red-950/30" data-testid="new-game-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !gender || !firstName.trim()}
            data-testid="new-game-start"
            className="w-full btn-ember px-8 py-3 font-heading tracking-widest text-sm disabled:opacity-50"
          >
            {busy ? "DÜNYA YARATILIYOR…" : "DÜNYAYI YARAT"}
          </button>
        </form>
      </div>
    </div>
  );
}