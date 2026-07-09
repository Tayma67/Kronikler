// NPC Zihni — Vercel npc_mind.py portu (S2): yapısal anı, decay, ilişki=taban+Σanı,
// davranış kademeleri, dedikodu kaynağı, nam türetme. Saf modül (game.ts'e bağımsız).

export interface Memory {
  tur: string;        // anı türü (MEMORY_TYPES anahtarı)
  hafta: number;      // eklendiği tur
  yuk: number;        // duygu yükü (decay ile söner)
  unutma: number;     // unutma hızı (her tur yuk *= unutma)
  travma: boolean;    // travma → asla silinmez, yuk sabit
  taniklar: string[]; // tanık NPC id'leri (dedikodu için)
  yayildi: boolean;   // dedikoduya dönüştü mü
  kaynak?: string;    // anı sahibinin adı (dedikodu kaynağı, anlık)
}

// Dedikoduya dönüşebilen anı türleri için söylenti varyant sayısı (rumor.<tur>.<i> anahtarları).
export const RUMOR_VARIANTS: Record<string, number> = {
  hakaret: 2, tehdit: 2, saldiri: 2, kacirma: 1, hirsizlik_tanigi: 1, suc_tanigi: 1,
  dolandiricilik: 1, somuru: 1, iftira: 2, alay: 2, yakinima_zarar: 1, flort_tanigi: 2,
  reddedilme: 1, comert_hediye: 2, sadaka: 2, yardim: 2, borc_kurtarma: 2,
  hayat_kurtarma: 2, savunma: 2, ibadet_tanigi: 2, ihanet: 1,
};

export interface MemSpec { yuk: number; unutma: number; skandal: number; nam: string | null; travma?: boolean; }

// 34 anı türü — (yuk, unutma, skandal, nam, travma). Vercel MEMORY_TYPES birebir.
export const MEMORY_TYPES: Record<string, MemSpec> = {
  // olumlu
  iltifat:        { yuk:  +4, unutma: 0.94, skandal: 0.0, nam: null },
  guzel_sohbet:   { yuk:  +3, unutma: 0.94, skandal: 0.0, nam: null },
  icten_sohbet:   { yuk:  +6, unutma: 0.96, skandal: 0.0, nam: null },
  hediye:         { yuk:  +8, unutma: 0.96, skandal: 0.0, nam: "comert" },
  comert_hediye:  { yuk: +15, unutma: 0.98, skandal: 0.2, nam: "comert" },
  sadaka:         { yuk: +10, unutma: 0.97, skandal: 0.2, nam: "comert" },
  yardim:         { yuk: +20, unutma: 0.995, skandal: 0.3, nam: "comert" },
  borc_kurtarma:  { yuk: +25, unutma: 0.997, skandal: 0.4, nam: "comert" },
  hayat_kurtarma: { yuk: +40, unutma: 1.0,  skandal: 0.6, nam: "mert", travma: true },
  savunma:        { yuk: +15, unutma: 0.99, skandal: 0.4, nam: "mert" },
  sir_saklama:    { yuk: +12, unutma: 0.99, skandal: 0.0, nam: "mert" },
  soz_tutma:      { yuk:  +8, unutma: 0.97, skandal: 0.0, nam: "mert" },
  dugun:          { yuk: +20, unutma: 0.995, skandal: 0.2, nam: null },
  ibadet_tanigi:  { yuk:  +3, unutma: 0.95, skandal: 0.2, nam: "dindar" },
  ortak_kazanc:   { yuk:  +7, unutma: 0.96, skandal: 0.0, nam: null },
  // olumsuz
  rahatsizlik:    { yuk:  -3, unutma: 0.93, skandal: 0.0, nam: null },
  tatsiz_konu:    { yuk:  -4, unutma: 0.94, skandal: 0.0, nam: null },
  haddini_asma:   { yuk:  -6, unutma: 0.95, skandal: 0.1, nam: null },
  bluf:           { yuk:  -4, unutma: 0.94, skandal: 0.1, nam: null },
  alay:           { yuk:  -8, unutma: 0.96, skandal: 0.2, nam: "zalim" },
  hakaret:        { yuk: -15, unutma: 0.98, skandal: 0.5, nam: "zalim" },
  tehdit:         { yuk: -20, unutma: 0.985, skandal: 0.6, nam: "zalim" },
  iftira:         { yuk: -12, unutma: 0.97, skandal: 0.4, nam: "zalim" },
  somuru:         { yuk: -15, unutma: 0.98, skandal: 0.3, nam: "zalim" },
  dolandiricilik: { yuk: -22, unutma: 0.985, skandal: 0.6, nam: "zalim" },
  hirsizlik_tanigi:{ yuk: -18, unutma: 0.98, skandal: 0.7, nam: "zalim" },
  suc_tanigi:     { yuk: -15, unutma: 0.98, skandal: 0.8, nam: "zalim" },
  saldiri:        { yuk: -35, unutma: 1.0,  skandal: 0.9, nam: "zalim", travma: true },
  kacirma:        { yuk: -50, unutma: 1.0,  skandal: 1.0, nam: "zalim", travma: true },
  yakinima_zarar: { yuk: -30, unutma: 1.0,  skandal: 0.6, nam: "zalim", travma: true },
  ihanet:         { yuk: -30, unutma: 1.0,  skandal: 0.5, nam: null,    travma: true },
  flort_tanigi:   { yuk:  -1, unutma: 0.96, skandal: 0.4, nam: "capkin" },
  reddedilme:     { yuk:  -2, unutma: 0.95, skandal: 0.3, nam: "capkin" },
};

export const NAM_TRAITS = ["comert", "zalim", "capkin", "dindar", "mert"];

// Yapısal anı ekle. Bilinmeyen tür sessizce yok sayılır. 24 tavan; travmalar korunur.
export function addMemory(anilar: Memory[], tur: string, hafta: number, opts?: { yuk?: number; taniklar?: string[]; kaynak?: string }): Memory | null {
  const spec = MEMORY_TYPES[tur];
  if (!spec) return null;
  const m: Memory = {
    tur,
    hafta: Math.floor(hafta),
    yuk: opts?.yuk != null ? opts.yuk : spec.yuk,
    unutma: spec.travma ? 1.0 : spec.unutma,
    travma: !!spec.travma,
    taniklar: opts?.taniklar ? [...opts.taniklar] : [],
    yayildi: false,
    kaynak: opts?.kaynak,
  };
  anilar.push(m);
  if (anilar.length > 24) {
    const zayif = anilar.filter((x) => !x.travma).sort((a, b) => Math.abs(a.yuk) - Math.abs(b.yuk));
    if (zayif.length) anilar.splice(anilar.indexOf(zayif[0]), 1);
    else anilar.shift();
  }
  return m;
}

// Haftalık: duygu yükü unutma hızıyla söner; sönen travmasız anı silinir.
export function decayMemories(anilar: Memory[]): Memory[] {
  const keep: Memory[] = [];
  for (const m of anilar) {
    m.yuk = Math.round(m.yuk * (m.unutma ?? 0.95) * 1000) / 1000;
    if (m.travma || Math.abs(m.yuk) >= 1.0) keep.push(m);
  }
  return keep;
}

export function memorySum(anilar: Memory[] | undefined): number {
  if (!anilar || !anilar.length) return 0;
  return Math.round(anilar.reduce((a, m) => a + m.yuk, 0));
}

// GDD: ilişki_skoru = taban + Σ(aktif anıların duygu yükü).
export function effectiveRel(base: number, anilar: Memory[] | undefined): number {
  return Math.max(-100, Math.min(100, base + memorySum(anilar)));
}

// En ağır n anının türü + yönü (sohbet/NPC ekranı "seni hatırlıyor" yüzeyi).
export function topMemories(anilar: Memory[] | undefined, n = 2): { tur: string; yon: number; travma: boolean }[] {
  if (!anilar) return [];
  const mems = anilar.filter((m) => Math.abs(m.yuk) >= 3).sort((a, b) => Math.abs(b.yuk) - Math.abs(a.yuk));
  return mems.slice(0, n).map((m) => ({ tur: m.tur, yon: m.yuk > 0 ? 1 : -1, travma: m.travma }));
}

// Davranış kademeleri — Vercel TIERS birebir (selam, ticaret çarpanı, bilgi paylaşımı).
export interface Tier { key: string; selam: boolean; al_carpan: number; bilgi: boolean; }
export const TIERS: { lo: number; hi: number; t: Tier }[] = [
  { lo: -101, hi: -40, t: { key: "aktif_dusman", selam: false, al_carpan: 1.20, bilgi: false } },
  { lo: -40, hi: -20, t: { key: "soguk", selam: true, al_carpan: 1.08, bilgi: false } },
  { lo: -20, hi: 20, t: { key: "notr", selam: true, al_carpan: 1.0, bilgi: true } },
  { lo: 20, hi: 50, t: { key: "dost", selam: true, al_carpan: 0.95, bilgi: true } },
  { lo: 50, hi: 101, t: { key: "sadik", selam: true, al_carpan: 0.90, bilgi: true } },
];

export function behaviorTier(score: number): Tier {
  for (const { lo, hi, t } of TIERS) if (score >= lo && score < hi) return t;
  return TIERS[2].t;
}

// Nam profili: tüm NPC anıları (son 24 ay) → nam sayaçları. Söylentiler de büyütür.
export function computeNamFromMemories(allAnilar: Memory[][], turn: number, rumors?: { nam?: string | null; siddet?: number }[]): Record<string, number> {
  const nam: Record<string, number> = { comert: 0, zalim: 0, capkin: 0, dindar: 0, mert: 0 };
  for (const anilar of allAnilar) {
    for (const m of anilar) {
      if (turn - m.hafta > 24) continue;
      const trait = MEMORY_TYPES[m.tur]?.nam;
      if (trait) nam[trait] += Math.min(3, 1 + Math.floor(Math.abs(m.yuk)) / 12 | 0);
    }
  }
  if (rumors) for (const r of rumors) if (r.nam && nam[r.nam] != null) nam[r.nam] += Math.round(r.siddet ?? 1) * 2;
  return nam;
}

export function dominantNam(nam: Record<string, number>): string | null {
  const sirali = Object.entries(nam).sort((a, b) => b[1] - a[1]);
  if (!sirali.length) return null;
  const [top, second] = [sirali[0], sirali[1] || ["", 0]];
  if (top[1] >= 8 && top[1] >= (second[1] as number) * 1.3) return top[0];
  return null;
}
