/**
 * Ses sistemi — GDD v5 Faz 5C.
 * Web Audio API ile sentezlenen SFX (dosya gerektirmez; mobil dostu, ~0 KB).
 * Müzik parçaları Faz 7'de dosya olarak eklenecek; seviye ayarları hazır.
 */

const SETTINGS_KEY = "kronikler_audio";

export function getAudioSettings() {
  try {
    return {
      sfx: 0.6,
      music: 0.4,
      muted: false,
      ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}),
    };
  } catch {
    return { sfx: 0.6, music: 0.4, muted: false };
  }
}

export function setAudioSettings(patch) {
  const next = { ...getAudioSettings(), ...patch };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

let ctx = null;
function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Tek nota çal: frekans, süre, dalga tipi, gecikme */
function tone(ac, freq, dur, type = "sine", delay = 0, gainMult = 1) {
  const settings = getAudioSettings();
  if (settings.muted || settings.sfx <= 0) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ac.currentTime + delay;
  const vol = 0.12 * settings.sfx * gainMult;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Ortaçağ temalı kısa SFX seti — hepsi sentez */
const SFX = {
  click:   (ac) => tone(ac, 660, 0.06, "square", 0, 0.5),
  coin:    (ac) => { tone(ac, 880, 0.08, "triangle"); tone(ac, 1320, 0.12, "triangle", 0.06); },
  success: (ac) => { tone(ac, 523, 0.1, "sine"); tone(ac, 659, 0.1, "sine", 0.08); tone(ac, 784, 0.18, "sine", 0.16); },
  fail:    (ac) => { tone(ac, 220, 0.15, "sawtooth", 0, 0.6); tone(ac, 165, 0.25, "sawtooth", 0.1, 0.6); },
  week:    (ac) => { tone(ac, 392, 0.12, "sine"); tone(ac, 494, 0.16, "sine", 0.1); },
  sword:   (ac) => { tone(ac, 1200, 0.05, "sawtooth", 0, 0.4); tone(ac, 800, 0.08, "sawtooth", 0.03, 0.4); },
  hurt:    (ac) => tone(ac, 180, 0.2, "square", 0, 0.5),
  page:    (ac) => tone(ac, 1500, 0.04, "triangle", 0, 0.3),
  notify:  (ac) => { tone(ac, 988, 0.08, "sine"); tone(ac, 1319, 0.14, "sine", 0.07); },
  achievement: (ac) => {
    [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, 0.15, "triangle", i * 0.09));
  },
};

export function playSfx(name) {
  try {
    const ac = audioCtx();
    if (!ac || !SFX[name]) return;
    SFX[name](ac);
  } catch {
    /* ses asla oyunu kırmasın */
  }
}
