// İnce ses efektleri (çevrimdışı, paket içi WAV). Varsayılan KAPALI; ayarlardan açılır.
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "kronikler_sound_v1";
let enabled = false;
let tap: AudioPlayer | null = null;
let advance: AudioPlayer | null = null;
let zafer: AudioPlayer | null = null;
let can: AudioPlayer | null = null;
let cingirak: AudioPlayer | null = null;

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
