// İnce ses efektleri (çevrimdışı, paket içi WAV). Varsayılan KAPALI; ayarlardan açılır.
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { isReduceMotion } from "./perf";

const KEY = "kronikler_sound_v1";
let enabled = false;
let tap: AudioPlayer | null = null;
let advance: AudioPlayer | null = null;
let zafer: AudioPlayer | null = null;
let can: AudioPlayer | null = null;
let cingirak: AudioPlayer | null = null;
let kilic: AudioPlayer | null = null;
let davul: AudioPlayer | null = null;
let yenilgi: AudioPlayer | null = null;
let kese: AudioPlayer | null = null;
let ninni: AudioPlayer | null = null;
let saz: AudioPlayer | null = null;
let nal: AudioPlayer | null = null;
let dugun: AudioPlayer | null = null;
let ney: AudioPlayer | null = null;
let su: AudioPlayer | null = null;

// ── Arka plan müziği: Kervan Yolu teması (prosedürel, paket içi, 48 sn dikişsiz döngü). Ayrı anahtar; varsayılan AÇIK. ──
const MKEY = "kronikler_music_v1";
let musicEnabled = true;
let music: AudioPlayer | null = null;
export async function loadMusicSetting(): Promise<boolean> {
  // Pil dostu: sade moddaki (düşük RAM) cihazlarda müzik varsayılanı KAPALI — kullanıcı ayarlardan açarsa tercihi kalıcıdır.
  try {
    const v = await AsyncStorage.getItem(MKEY);
    if (v !== null) musicEnabled = v === "1";
    else { musicEnabled = !isReduceMotion(); await AsyncStorage.setItem(MKEY, musicEnabled ? "1" : "0"); }
  } catch {}
  if (musicEnabled) startMusic();
  return musicEnabled;
}
export function isMusicEnabled(): boolean { return musicEnabled; }
export async function setMusicEnabled(on: boolean): Promise<void> {
  musicEnabled = on;
  try { await AsyncStorage.setItem(MKEY, on ? "1" : "0"); } catch {}
  if (on) startMusic(); else stopMusic();
}
export function startMusic() {
  try {
    if (!music) { music = createAudioPlayer(require("../assets/sfx/muzik.wav")); music.loop = true; music.volume = 0.32; }
    music.play();
  } catch {}
}
export function stopMusic() { try { music?.pause(); } catch {} }
// Uygulama arka plana geçince müzik susar, dönünce kaldığı yerden sürer.
AppState.addEventListener("change", (st) => {
  if (!musicEnabled) return;
  try { if (st === "active") music?.play(); else music?.pause(); } catch {}
});

export async function loadSoundSetting(): Promise<boolean> {
  try { const v = await AsyncStorage.getItem(KEY); enabled = v === "1"; } catch {}
  return enabled;
}
export function isSoundEnabled(): boolean { return enabled; }
export async function setSoundEnabled(on: boolean): Promise<void> {
  enabled = on;
  try { await AsyncStorage.setItem(KEY, on ? "1" : "0"); } catch {}
}

function ensure() {
  try {
    if (!tap) tap = createAudioPlayer(require("../assets/sfx/tap.wav"));
    if (!advance) advance = createAudioPlayer(require("../assets/sfx/advance.wav"));
    if (!zafer) zafer = createAudioPlayer(require("../assets/sfx/zafer.wav"));
    if (!can) can = createAudioPlayer(require("../assets/sfx/can.wav"));
    if (!cingirak) cingirak = createAudioPlayer(require("../assets/sfx/cingirak.wav"));
    if (!kilic) kilic = createAudioPlayer(require("../assets/sfx/kilic.wav"));
    if (!davul) davul = createAudioPlayer(require("../assets/sfx/davul.wav"));
    if (!yenilgi) yenilgi = createAudioPlayer(require("../assets/sfx/yenilgi.wav"));
    if (!kese) kese = createAudioPlayer(require("../assets/sfx/kese.wav"));
    if (!ninni) ninni = createAudioPlayer(require("../assets/sfx/ninni.wav"));
    if (!saz) saz = createAudioPlayer(require("../assets/sfx/saz.wav"));
    if (!nal) nal = createAudioPlayer(require("../assets/sfx/nal.wav"));
    if (!dugun) dugun = createAudioPlayer(require("../assets/sfx/dugun.wav"));
    if (!ney) ney = createAudioPlayer(require("../assets/sfx/ney.wav"));
    if (!su) su = createAudioPlayer(require("../assets/sfx/su.wav"));
  } catch {}
}
function fire(p: AudioPlayer | null) {
  if (!enabled || !p) return;
  try { p.seekTo(0); p.play(); } catch {}
}
export function playTap() { if (!enabled) return; ensure(); fire(tap); }
export function playAdvance() { if (!enabled) return; ensure(); fire(advance); }
// Büyük anlar artık kendi sesini taşır: kutlama arpeji, ölüm çanı, şenlik çıngırağı.
export function playFanfare() { if (!enabled) return; ensure(); fire(zafer); }
export function playVictory() { if (!enabled) return; ensure(); fire(zafer); }
export function playToll() { if (!enabled) return; ensure(); fire(can); }
export function playChime() { if (!enabled) return; ensure(); fire(cingirak); }
// Savaş sesleri: giriş davulu, çelik çınlaması, yenilgi gümbürtüsü — meydanın kendi dili.
export function playWarDrum() { if (!enabled) return; ensure(); fire(davul); }
export function playClash() { if (!enabled) return; ensure(); fire(kilic); }
export function playDefeat() { if (!enabled) return; ensure(); fire(yenilgi); }
export function playCoin() { if (!enabled) return; ensure(); fire(kese); }
export function playLullaby() { if (!enabled) return; ensure(); fire(ninni); } // doğum: müzik kutusu motifi
export function playSaz() { if (!enabled) return; ensure(); fire(saz); }       // ikilem kapıyı çaldı: mızrap vurgusu
export function playHooves() { if (!enabled) return; ensure(); fire(nal); }    // yolculuk: dörtnala
export function playWedding() { if (!enabled) return; ensure(); fire(dugun); } // düğün: zurna-davul oyun havası
export function playNey() { if (!enabled) return; ensure(); fire(ney); }       // ibadet/tekke: ney nefesi
export function playWater() { if (!enabled) return; ensure(); fire(su); }      // hamam: tas suyu, mermer yankısı
