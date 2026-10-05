// Yaşayan Nüfus (Aşama 1) — kalıcı kişiler, aileler, gerçek evlilik/doğum/ölüm. Tasarım: NUFUS.md.
// Saf modül: game.ts'e bağımlı değildir; yerleşim listesi, hedef nüfus ve bölge bilgisi bağlamla (ctx) gelir.
// Değişmezler (testlerle korunur): kimlik eşsiz · yaşayanlarda eşlik simetrik · tek eş · yakın akraba evlenmez ·
// ebeveyn-çocuk ≥16 yaş · co ⇔ baba/anne tutarlı · ölü kadroda görünmez · referanslar ya çözülür ya yoktur.
import { NPC, generateNPCs, npcSocialGraph, mkRng, npcAgeProfession, TRAITS, NPC_PROFS, QUIRKS, GOALS, locSeed } from "./world";
import { NAME_POOLS, Lang, soyadCinsli } from "./locale-data";

export type Cins = "erkek" | "kadın";
const R32 = 4294967296; // mulberry32 çıktısı t/2³² — r×2³² tam sayıdır, isim indeksi kayıpsız korunur
const ix = (a: string[], v: string) => Math.max(0, a.indexOf(v));
export const huyOf = (k: Kisi) => TRAITS[k.tr] ?? TRAITS[0];
export const tuhaflikOf = (k: Kisi) => QUIRKS[k.qk] ?? QUIRKS[0];
export const hayalOf = (k: Kisi) => GOALS[k.gl] ?? GOALS[0];
export const OYUNCU = "@"; // eş alanında oyuncuyu temsil eder

export interface Kisi {
  id: string; g: Cins;
  dy: number;              // doğum yılı (dünya yılı) — yaş = worldYears - dy
  loc: string; prof: string;
  tr: number; qk: number; gl: number; // TRAITS / QUIRKS / GOALS indeksleri (kayıt küçük kalsın)
  af?: number; ns?: number; // ilk ad: temel kadro r-değeri ×2³² (af, tamsayı — kayıpsız) ya da tohum (ns)
  sf?: number; ss?: number; // soyad: aynı biçim — babadan geçer
  ad?: string;             // sabit ilk ad (oyuncunun evladı: konduğu ad her dilde aynı yazılır)
  sa?: string;             // sabit soyad (oyuncu ailesi: oyuncunun seçtiği soyad her dilde aynı yazılır)
  ol?: number;             // ölüm yılı (yoksa yaşıyor)
  es?: string;             // eş kimliği; OYUNCU = oyuncu
  baba?: string; anne?: string; cocuk?: string[];
  ey?: number;             // evlilik yılı
  dost?: string[]; hasim?: string[];
  gd?: boolean; gh?: boolean; usta?: boolean; // hayaline erdi · oyuncu hayaline omuz verdi · oyuncunun yetiştirdiği usta
  kr?: { y: number; e: string; m: string }; // son meslek kararı: yıl, bırakılan meslek, kıt olduğu için yöneldiği mal
}
export interface Nufus { v: 1; k: Record<string, Kisi>; n: number } // n: yeni kimlik sayacı

export interface NufusCtx {
  yerler: string[];                      // tüm yerleşimler (sıra korunur)
  hedef: (loc: string) => number;        // yerleşimin hedef nüfusu
  bolge: (loc: string) => string;        // bölge (yakın göç / evlilik)
}

// ── İsim ──
const AD_DILLERI: Lang[] = ["tr", "en", "es", "pt", "ar", "ru"];
export function kisiIlkAd(k: Kisi, lang: Lang = "tr"): string {
  if (k.ad) return k.ad;
  const pool = NAME_POOLS[lang] || NAME_POOLS.tr; const arr = k.g === "erkek" ? pool.m : pool.f;
  return k.af != null ? arr[Math.min(arr.length - 1, Math.floor((k.af / R32) * arr.length))] : arr[((k.ns ?? 0) >>> 0) % arr.length];
}
export function kisiSoyad(k: Kisi, lang: Lang = "tr"): string {
  if (k.sa) return k.sa;
  const pool = NAME_POOLS[lang] || NAME_POOLS.tr;
  return soyadCinsli(k.sf != null ? pool.s[Math.min(pool.s.length - 1, Math.floor((k.sf / R32) * pool.s.length))] : pool.s[((k.ss ?? 0) >>> 0) % pool.s.length], lang, k.g);
}
export function kisiAdi(k: Kisi, lang: Lang = "tr"): string { return `${kisiIlkAd(k, lang)} ${kisiSoyad(k, lang)}`; }
export const yasOf = (k: Kisi, wy: number) => (k.ol != null ? k.ol : wy) - k.dy;
export const yasiyor = (k: Kisi | undefined): k is Kisi => !!k && k.ol == null;

// ── Kadro görünümü (eski NPC biçimiyle uyumlu) ──
// Kimlik-tabanlı önbellek: aynı nüfus nesnesi için yer listeleri bir kez çıkarılır (clone sonrası yeni nesne → yeni kayıt).
const _yerIdx = new WeakMap<object, Record<string, string[]>>();
function yerIndeksi(pop: Nufus): Record<string, string[]> {
  let ix = _yerIdx.get(pop.k);
  if (!ix) { ix = {}; for (const id in pop.k) { const k = pop.k[id]; if (k.ol == null) (ix[k.loc] = ix[k.loc] || []).push(id); } _yerIdx.set(pop.k, ix); }
  return ix;
}
export function kisiNpc(k: Kisi, wy: number, lang: Lang = "tr"): NPC {
  const age = yasOf(k, wy);
  return {
    id: k.id, name: kisiAdi(k, lang), age, gender: k.g, profession: npcAgeProfession(k.prof, age),
    trait: huyOf(k), quirk: tuhaflikOf(k), goal: age < 14 || k.gd ? "" : hayalOf(k), loc: k.loc, alive: k.ol == null, es: k.es,
  };
}
// Nüfus değiştiren her akış sonunda çağrılır: yer listeleri bir sonraki okumada yeniden çıkarılır.
export function nufusDegisti(pop: Nufus): void { _yerIdx.delete(pop.k); }
export function kadro(pop: Nufus, loc: string, wy: number, lang: Lang = "tr"): NPC[] {
  return (yerIndeksi(pop)[loc] || []).map((id) => kisiNpc(pop.k[id], wy, lang));
}
export function yasayanSayisi(pop: Nufus, loc: string): number { return (yerIndeksi(pop)[loc] || []).length; }

// ── Akrabalık ──
function ebeveynler(pop: Nufus, id?: string): string[] { const k = id ? pop.k[id] : undefined; return k ? [k.baba, k.anne].filter((x): x is string => !!x) : []; }
export function kardesler(pop: Nufus, id: string): string[] {
  const out = new Set<string>();
  for (const pa of ebeveynler(pop, id)) for (const c of pop.k[pa]?.cocuk || []) if (c !== id) out.add(c);
  return [...out];
}
// Yakın akraba: aynı kişi, ebeveyn/büyükebeveyn, ortak ebeveyn (kardeş) veya ortak büyükebeveyn (kuzen, amca/teyze-yeğen).
export function yakinAkraba(pop: Nufus, a: string, b: string): boolean {
  if (a === b) return true;
  const pa = ebeveynler(pop, a), pb = ebeveynler(pop, b);
  const ga = pa.flatMap((x) => ebeveynler(pop, x)), gb = pb.flatMap((x) => ebeveynler(pop, x));
  if (pa.includes(b) || pb.includes(a) || ga.includes(b) || gb.includes(a)) return true;
  const sa = new Set([...pa, ...ga]);
  return [...pb, ...gb].some((x) => sa.has(x));
}

// ── Kurulum (yeni oyun ve eski kayıt göçü) ──
// Temel kadronun ad/soyad r-değerleri: generateNPCs ile aynı rng tüketim sırası (cins, ad, soyad, yaş, meslek, huy, tuhaflık, hayal).
function temelRDegerleri(seed: number, n: number): { af: number; sf: number }[] {
  const r = mkRng(seed); const out: { af: number; sf: number }[] = [];
  for (let i = 0; i < n; i++) { r(); const af = Math.round(r() * R32); const sf = Math.round(r() * R32); r(); r(); r(); r(); r(); out.push({ af, sf }); }
  return out;
}
const AILE_BAGI = ["es", "ebeveyn", "evlat", "kardes"];
export interface EskiDunya {
  wy: number;
  evo?: Record<string, { dead?: boolean; prof?: string; goalHelped?: boolean; goalDone?: boolean; usta?: boolean }>;
  born?: (NPC & { nameSeed?: number; bornY?: number })[];
  oyuncuEs?: { seed: number; ey: number } | null; // oyuncu bir NPC ile evliyse (spouse_seed = locSeed(npcId))
}
export function nufusKur(ctx: NufusCtx, eski: EskiDunya): Nufus {
  const pop: Nufus = { v: 1, k: {}, n: 0 }; const wy = eski.wy; const evo = eski.evo || {};
  for (const loc of ctx.yerler) {
    const n = ctx.hedef(loc);
    const base = generateNPCs(locSeed(loc), n, "tr", loc);
    const rd = temelRDegerleri(locSeed(loc), n);
    const graph = npcSocialGraph(loc, base);
    // Aile soyadı (applyFamilySurnames ile birebir): aile kökü = en yaşlı erkek (yoksa en yaşlı üye), eşitlikte kimlik.
    const root: Record<string, string> = {}; for (const b of base) root[b.id] = b.id;
    const find = (x: string): string => { while (root[x] !== x) { root[x] = root[root[x]]; x = root[x]; } return x; };
    for (const b of base) for (const t of graph[b.id] || []) if (AILE_BAGI.includes(t.kind)) { const ra = find(b.id), rb = find(t.otherId); if (ra !== rb) root[ra] = rb; }
    const aileler: Record<string, number[]> = {};
    base.forEach((b, i) => { (aileler[find(b.id)] = aileler[find(b.id)] || []).push(i); });
    const sfOf: number[] = rd.map((x) => x.sf);
    for (const key in aileler) {
      const ix = aileler[key]; if (ix.length < 2) continue;
      const mem = ix.map((i) => base[i]); const males = mem.filter((m) => m.gender === "erkek");
      const src = (males.length ? males : mem).slice().sort((a, b) => b.age - a.age || (a.id < b.id ? -1 : 1))[0];
      const srcSf = rd[base.indexOf(src)].sf; for (const i of ix) sfOf[i] = srcSf;
    }
    base.forEach((b, i) => {
      const e = evo[b.id] || {};
      // Gerçek yaş (eski sistem 95'te sabitliyordu): 100'ü aşmış olan göçte ömrünü tamamlamış sayılır.
      const k: Kisi = { id: b.id, g: b.gender, dy: -b.age, loc, prof: e.prof || b.profession, tr: ix(TRAITS, b.trait), qk: ix(QUIRKS, b.quirk), gl: ix(GOALS, b.goal), af: rd[i].af, sf: sfOf[i] };
      if (e.dead || wy + b.age >= 100) k.ol = Math.min(wy, k.dy + 99);
      if (e.goalDone) k.gd = true; if (e.goalHelped) k.gh = true; if (e.usta) k.usta = true;
      pop.k[k.id] = k;
    });
    for (const b of base) for (const t of graph[b.id] || []) {
      const k = pop.k[b.id]; const o = pop.k[t.otherId]; if (!k || !o) continue;
      if (t.kind === "es") k.es = o.id;
      else if (t.kind === "ebeveyn") { if (o.g === "erkek") k.baba = o.id; else k.anne = o.id; }
      else if (t.kind === "evlat") (k.cocuk = k.cocuk || []).includes(o.id) || k.cocuk.push(o.id);
      else if (t.kind === "dost") (k.dost = k.dost || []).push(o.id);
      else if (t.kind === "rakip") (k.hasim = k.hasim || []).push(o.id);
    }
  }
  // Eski doğanlar (yaşayanlar) + çocukluk dostu kayıtları
  for (const b of eski.born || []) {
    if (b.alive === false || pop.k[b.id]) continue;
    const yas = (b.age || 0) + Math.max(0, wy - (b.bornY ?? wy));
    const seed = b.nameSeed ?? locSeed(b.id);
    const e = evo[b.id] || {};
    const k: Kisi = { id: b.id, g: b.gender, dy: wy - yas, loc: b.loc || ctx.yerler[0], prof: e.prof || b.profession, tr: ix(TRAITS, b.trait), qk: ix(QUIRKS, b.quirk), gl: ix(GOALS, b.goal), ns: seed, ss: seed * 2 + 1 };
    if (e.dead || yas >= 100) k.ol = Math.min(wy, k.dy + 99);
    if (e.goalDone) k.gd = true; if (e.goalHelped) k.gh = true; if (e.usta) k.usta = true;
    pop.k[k.id] = k;
  }
  // Ölenlerin eşleri dul kalır (yaşayan eşlik simetrik; ölünün eş kaydı tarih olarak durur).
  for (const id in pop.k) { const k = pop.k[id]; if (k.ol == null && k.es && pop.k[k.es]?.ol != null) delete k.es; }
  // Oyuncunun NPC eşi: başka bir NPC ile evli görünüyorsa o bağ çözülür (oyuncunun evliliği gerçektir).
  if (eski.oyuncuEs) {
    const es = Object.values(pop.k).find((k) => k.ol == null && locSeed(k.id) === eski.oyuncuEs!.seed);
    if (es) { if (es.es && pop.k[es.es]) delete pop.k[es.es].es; es.es = OYUNCU; es.ey = eski.oyuncuEs.ey; }
  }
  return pop;
}

// ── Yaşam tiki (yılda bir) ──
export type NufusOlay =
  | { t: "olum"; id: string }
  | { t: "evlilik"; a: string; b: string }
  | { t: "dogum"; id: string; anne: string; baba: string }
  | { t: "goc"; id: string; nereden: string; nereye: string }
  | { t: "gelen"; id: string; nereye: string };
export interface YilOpts {
  wy: number;               // yeni dünya yılı
  rng?: () => number;
  korunan?: Set<string>;    // budanmayacak kimlikler (oyuncuyla bağı olanlar)
  oyuncuLoc?: string; oyuncuCins?: Cins; oyuncuYas?: number; oyuncuBekar?: boolean;
  olumCarpani?: number;     // çağ olayları (salgın) için
  sabit?: Set<string>;      // oyuncunun ailesi (anne, baba, evlatları): evlilik pazarına ve göçe girmez, ocağında kalır
  muaf?: Set<string>;       // ölüm zarından muaf (oyuncu yaşarken evlatları — onların akıbeti oyuncunun hikâyesidir)
}
export function olumOlasiligi(yas: number): number {
  if (yas >= 100) return 1;
  if (yas < 1) return 0.03; if (yas < 5) return 0.01; if (yas < 50) return 0.004;
  if (yas < 60) return 0.012; if (yas < 70) return 0.03; if (yas < 80) return 0.07; if (yas < 90) return 0.15; return 0.3;
}
export function yeniKimlik(pop: Nufus): string {
  let id = ""; do { id = "k" + (pop.n = (pop.n || 0) + 1).toString(36); } while (pop.k[id]); return id;
}
function sec<T>(a: T[], rng: () => number): T { return a[Math.floor(rng() * a.length)]; }
const rIx = (a: unknown[], rng: () => number) => Math.floor(rng() * a.length);
export function yeniGelen(pop: Nufus, wy: number, loc: string, g: Cins, yas: number, rng: () => number): Kisi {
  const id = yeniKimlik(pop);
  const k: Kisi = { id, g, dy: wy - yas, loc, prof: sec(NPC_PROFS, rng), tr: rIx(TRAITS, rng), qk: rIx(QUIRKS, rng), gl: rIx(GOALS, rng), ns: Math.floor(rng() * 1e9), ss: Math.floor(rng() * 1e9) };
  pop.k[id] = k; return k;
}
const HASIM_HUY = ["kibirli", "hırslı", "kurnaz"];

// Nüfusu yerinde günceller ve gerçekleşen olayları döndürür. Oyuncunun eşi (es === OYUNCU) ölüm zarından muaftır:
// onun ömrünü oyuncu akışı yönetir (dul kalma oyuncuya ait sahnedir).
export function nufusYil(pop: Nufus, ctx: NufusCtx, o: YilOpts): NufusOlay[] {
  const rng = o.rng || Math.random; const wy = o.wy; const out: NufusOlay[] = [];
  const yas = (k: Kisi) => wy - k.dy;
  const canli = () => Object.values(pop.k).filter((k) => k.ol == null);
  // 1) Ölümler
  for (const k of canli()) {
    if (k.es === OYUNCU || o.muaf?.has(k.id)) continue;
    if (rng() < olumOlasiligi(yas(k)) * (o.olumCarpani ?? 1)) {
      k.ol = wy;
      if (k.es && pop.k[k.es]?.ol == null && pop.k[k.es]) delete pop.k[k.es].es; // eş dul kalır
      out.push({ t: "olum", id: k.id });
    }
  }
  // 2) Evlilikler — yerleşim içinde (yüzde ~15 bölgeden)
  const bekar = (k: Kisi) => k.ol == null && !k.es && !o.sabit?.has(k.id);
  const yerde: Record<string, Kisi[]> = {};
  for (const k of canli()) (yerde[k.loc] = yerde[k.loc] || []).push(k);
  for (const loc of ctx.yerler) {
    const kadinlar = (yerde[loc] || []).filter((k) => k.g === "kadın" && bekar(k) && yas(k) >= 16 && yas(k) <= 45);
    for (const kz of kadinlar) {
      const y = yas(kz); if (rng() >= (y <= 30 ? 0.35 : 0.15)) continue;
      const bolgeden = rng() < 0.15;
      const havuz = (bolgeden ? ctx.yerler.filter((l) => l !== loc && ctx.bolge(l) === ctx.bolge(loc)).flatMap((l) => yerde[l] || []) : (yerde[loc] || []))
        .filter((e) => e.g === "erkek" && bekar(e) && yas(e) >= 18 && yas(e) <= 60 && yas(e) - y >= -3 && yas(e) - y <= 15 && !yakinAkraba(pop, kz.id, e.id));
      if (!havuz.length) continue;
      let best: Kisi | null = null, bs = -1e9;
      for (const e of havuz) {
        const fark = yas(e) - y;
        const sc = -Math.abs(fark - 4) + (e.tr === kz.tr ? 2 : 0) - (HASIM_HUY.includes(huyOf(e)) && HASIM_HUY.includes(huyOf(kz)) ? 2 : 0) + rng() * 3;
        if (sc > bs) { bs = sc; best = e; }
      }
      if (!best) continue;
      kz.es = best.id; best.es = kz.id; kz.ey = wy; best.ey = wy;
      if (kz.loc !== best.loc) { const eskiYer = kz.loc; kz.loc = best.loc; out.push({ t: "goc", id: kz.id, nereden: eskiYer, nereye: best.loc }); }
      out.push({ t: "evlilik", a: best.id, b: kz.id });
    }
  }
  // 3) Doğumlar — nüfus dengesine göre ayarlı doğurganlık
  const sayim: Record<string, number> = {}; for (const k of canli()) sayim[k.loc] = (sayim[k.loc] || 0) + 1;
  for (const anne of canli()) {
    if (anne.g !== "kadın" || !anne.es || anne.es === OYUNCU) continue;
    const baba = pop.k[anne.es]; if (!baba || baba.ol != null) continue;
    const y = yas(anne); if (y < 16 || y > 44) continue;
    const cocuklar = (anne.cocuk || []).map((c) => pop.k[c]).filter((c): c is Kisi => !!c);
    if (cocuklar.length >= 8 || cocuklar.some((c) => c.dy >= wy)) continue; // en fazla 8, yılda bir
    const hedef = ctx.hedef(anne.loc), mevcut = sayim[anne.loc] || 0;
    const oran = mevcut / Math.max(1, hedef);
    if (oran >= 1.35) continue; // kalabalık yerde yeni doğum yok (göç dengeler)
    const denge = Math.max(0.05, Math.min(2.5, Math.pow(1 / Math.max(0.2, oran), 3)));
    const p = (y < 30 ? 0.3 : y < 38 ? 0.2 : 0.08) * Math.pow(0.85, cocuklar.length) * denge;
    if (rng() >= p) continue;
    const g: Cins = rng() < 0.5 ? "erkek" : "kadın";
    const ayni = g === "erkek" ? baba : anne, obur = g === "erkek" ? anne : baba;
    const u = rng();
    const prof = u < 0.5 ? ayni.prof : u < 0.65 ? obur.prof : sec(NPC_PROFS, rng);
    const tu = rng();
    const id = yeniKimlik(pop);
    const c: Kisi = {
      id, g, dy: wy, loc: anne.loc, prof, tr: tu < 0.35 ? baba.tr : tu < 0.6 ? anne.tr : rIx(TRAITS, rng),
      qk: rIx(QUIRKS, rng), gl: rIx(GOALS, rng), ns: Math.floor(rng() * 1e9), baba: baba.id, anne: anne.id,
    };
    if (baba.sa) c.sa = baba.sa; else if (baba.sf != null) c.sf = baba.sf; else c.ss = baba.ss ?? Math.floor(rng() * 1e9); // soyadı babadan (oyuncu ailesinin yazılı soyadı dahil)
    const aile = [anne, baba, ...(anne.cocuk || []).map((x) => pop.k[x]).filter((x): x is Kisi => !!x && x.ol == null)];
    for (let d = 0; d < 12 && AD_DILLERI.some((L) => { const ad = kisiIlkAd(c, L); return aile.some((x) => kisiIlkAd(x, L) === ad); }); d++) c.ns = Math.floor(rng() * 1e9); // anne-babasının ya da yaşayan kardeşinin adı konmaz
    pop.k[id] = c; (anne.cocuk = anne.cocuk || []).push(id); (baba.cocuk = baba.cocuk || []).push(id);
    sayim[anne.loc] = (sayim[anne.loc] || 0) + 1;
    out.push({ t: "dogum", id, anne: anne.id, baba: baba.id });
  }
  // 4) Göç — kalabalık yerlerden (hedefin %120'si üstü) seyrek yerlere (%90 altı) bekâr yetişkinler; önce aynı bölge.
  {
    let hamle = 0;
    const seyrek = () => ctx.yerler.filter((l) => (sayim[l] || 0) < ctx.hedef(l) * 0.9);
    for (const kaynak of ctx.yerler) {
      while ((sayim[kaynak] || 0) > ctx.hedef(kaynak) * 1.2 && hamle < 40) {
        const hedefler = seyrek().sort((a, b) => (ctx.bolge(a) === ctx.bolge(kaynak) ? 0 : 1) - (ctx.bolge(b) === ctx.bolge(kaynak) ? 0 : 1) || (sayim[a] || 0) / ctx.hedef(a) - (sayim[b] || 0) / ctx.hedef(b));
        if (!hedefler.length) break;
        const kisi = canli().find((k) => k.loc === kaynak && bekar(k) && yas(k) >= 18 && yas(k) <= 45 && !(k.cocuk || []).some((c) => pop.k[c]?.ol == null && yas(pop.k[c]) < 14));
        if (!kisi) break;
        kisi.loc = hedefler[0]; sayim[kaynak]--; sayim[hedefler[0]] = (sayim[hedefler[0]] || 0) + 1; hamle++;
        out.push({ t: "goc", id: kisi.id, nereden: kaynak, nereye: hedefler[0] });
      }
    }
  }
  // 4b) Hâlâ hedefin %75'inin altındaki yerlere bekâr yetişkin göçü; yoksa dışarıdan yeni gelen.
  for (const loc of ctx.yerler) {
    const hedef = ctx.hedef(loc);
    let guard = 0;
    while ((sayim[loc] || 0) < Math.ceil(hedef * 0.75) && guard++ < 6) {
      const kaynaklar = ctx.yerler.filter((l) => l !== loc && (sayim[l] || 0) > ctx.hedef(l)).sort((a, b) => (ctx.bolge(a) === ctx.bolge(loc) ? 0 : 1) - (ctx.bolge(b) === ctx.bolge(loc) ? 0 : 1));
      let tasinan: Kisi | null = null;
      for (const l of kaynaklar) { tasinan = canli().find((k) => k.loc === l && bekar(k) && yas(k) >= 18 && yas(k) <= 40) || null; if (tasinan) break; }
      if (tasinan) { const eskiYer = tasinan.loc; sayim[eskiYer]--; tasinan.loc = loc; out.push({ t: "goc", id: tasinan.id, nereden: eskiYer, nereye: loc }); }
      else { const k = yeniGelen(pop, wy, loc, rng() < 0.5 ? "erkek" : "kadın", 18 + Math.floor(rng() * 18), rng); out.push({ t: "gelen", id: k.id, nereye: loc }); }
      sayim[loc] = (sayim[loc] || 0) + 1;
    }
  }
  // 5) Bekâr yaşıt güvencesi: bekâr oyuncunun (18-50) yerinde çağına yakın karşı cinsten bekâr ikiden azsa biri yerleşir.
  if (o.oyuncuBekar && o.oyuncuLoc && o.oyuncuCins && o.oyuncuYas != null && o.oyuncuYas >= 18 && o.oyuncuYas <= 50) {
    const ka: Cins = o.oyuncuCins === "erkek" ? "kadın" : "erkek";
    const uygun = canli().filter((k) => k.loc === o.oyuncuLoc && k.g === ka && bekar(k) && yas(k) >= 18 && Math.abs(yas(k) - o.oyuncuYas!) <= 12);
    if (uygun.length < 2) {
      const k = yeniGelen(pop, wy, o.oyuncuLoc, ka, Math.max(18, Math.min(50, o.oyuncuYas - 2 + Math.floor(rng() * 6))), rng);
      out.push({ t: "gelen", id: k.id, nereye: o.oyuncuLoc });
    }
  }
  // 6) Budama — 60 yıl önce ölmüş ve korunmayan kayıtlar; ardından tavan (2000) için en eski ölüler.
  nufusBuda(pop, wy, o.korunan || new Set());
  nufusDegisti(pop);
  return out;
}
// ── Bağ evrimi (Aşama 3): aynı yerde yaşayanlar arasında dostluk ve hasımlık kendiliğinden doğar, uzaklık ve zamanla söner. ──
// Dostluk: huy uyumu (aynı huy, sıcak huylar); hasımlık: aynı meslekte hırslı/kibirli/kurnaz rekabeti. Bağlar simetriktir.
const SICAK_HUY = ["neşeli", "sıcakkanlı", "misafirperver", "cömert"];
export type BagOlay = { t: "dost" | "hasim"; a: string; b: string };
function bagla(pop: Nufus, a: Kisi, b: Kisi, tur: "dost" | "hasim") { (a[tur] = a[tur] || []).push(b.id); (b[tur] = b[tur] || []).push(a.id); }
function coz(a: Kisi, b: Kisi, tur: "dost" | "hasim") {
  for (const [x, y] of [[a, b], [b, a]] as const) { if (x[tur]) { x[tur] = x[tur]!.filter((i) => i !== y.id); if (!x[tur]!.length) delete x[tur]; } }
}
export function bagEvrimi(pop: Nufus, wy: number, rng: () => number = Math.random): BagOlay[] {
  const out: BagOlay[] = [];
  const yas = (k: Kisi) => wy - k.dy;
  const yerde: Record<string, Kisi[]> = {};
  for (const k of Object.values(pop.k)) if (k.ol == null && yas(k) >= 16) (yerde[k.loc] = yerde[k.loc] || []).push(k);
  // Sönme: uzaklaşan dostluk yüzde 10, zamanla affedilen hasımlık yüzde 8 (aynı yerde aynı meslekte süren rekabet sönmez)
  for (const k of Object.values(pop.k)) {
    if (k.ol != null) continue;
    for (const d of [...(k.dost || [])]) { const o = pop.k[d]; if (o && (o.ol != null || (d > k.id && o.loc !== k.loc && rng() < 0.1))) coz(k, o, "dost"); } // ölen dostun yeri boşalır
    for (const h of [...(k.hasim || [])]) { const o = pop.k[h]; if (o && (o.ol != null || (h > k.id && !(o.loc === k.loc && o.prof === k.prof) && rng() < 0.08))) coz(k, o, "hasim"); }
  }
  for (const loc in yerde) {
    const L = yerde[loc]; if (L.length < 2) continue;
    const deneme = Math.ceil(L.length / 2);
    for (let i = 0; i < deneme; i++) {
      const a = L[Math.floor(rng() * L.length)], b = L[Math.floor(rng() * L.length)];
      if (a === b || a.es === b.id || a.dost?.includes(b.id) || a.hasim?.includes(b.id) || yakinAkraba(pop, a.id, b.id)) continue;
      const ha = huyOf(a), hb = huyOf(b);
      const rakip = a.prof === b.prof && a.prof !== "işsiz" && (HASIM_HUY.includes(ha) || HASIM_HUY.includes(hb));
      if (rakip && (a.hasim?.length || 0) < 2 && (b.hasim?.length || 0) < 2 && rng() < 0.5) { bagla(pop, a, b, "hasim"); out.push({ t: "hasim", a: a.id, b: b.id }); continue; }
      let uyum = (a.tr === b.tr ? 2 : 0) + (SICAK_HUY.includes(ha) ? 1 : 0) + (SICAK_HUY.includes(hb) ? 1 : 0) - (ha === "kibirli" || hb === "kibirli" ? 1 : 0) - (Math.abs(yas(a) - yas(b)) > 25 ? 1 : 0);
      if (uyum >= 1 && (a.dost?.length || 0) < 3 && (b.dost?.length || 0) < 3 && rng() < (uyum >= 2 ? 0.7 : 0.25)) { bagla(pop, a, b, "dost"); out.push({ t: "dost", a: a.id, b: b.id }); }
    }
  }
  nufusDegisti(pop);
  return out;
}

// Bir kişiyi nüfustan kaldırır ve ona işaret eden her bağı temizler (vâris oyuncu olunca kaydı kalkar).
export function kisiSil(pop: Nufus, id: string): void {
  const k = pop.k[id]; if (!k) return;
  for (const pa of [k.baba, k.anne]) { const x = pa ? pop.k[pa] : undefined; if (x?.cocuk) { x.cocuk = x.cocuk.filter((c) => c !== id); if (!x.cocuk.length) delete x.cocuk; } }
  if (k.es && pop.k[k.es]?.es === id) delete pop.k[k.es].es;
  for (const c of k.cocuk || []) { const ck = pop.k[c]; if (ck) { if (ck.baba === id) delete ck.baba; if (ck.anne === id) delete ck.anne; } }
  for (const tur of ["dost", "hasim"] as const) for (const o of k[tur] || []) { const x = pop.k[o]; if (x?.[tur]) { x[tur] = x[tur]!.filter((i) => i !== id); if (!x[tur]!.length) delete x[tur]; } }
  delete pop.k[id];
  nufusDegisti(pop);
}

export const NUFUS_TAVAN = 2000;
export function nufusBuda(pop: Nufus, wy: number, korunan: Set<string>): void {
  const sil = new Set<string>();
  const ebeveyn = new Set<string>(); // yaşayanların ebeveynleri (soy ağacı için saklanır)
  for (const k of Object.values(pop.k)) if (k.ol == null) { if (k.baba) ebeveyn.add(k.baba); if (k.anne) ebeveyn.add(k.anne); }
  const olu = Object.values(pop.k).filter((k) => k.ol != null && !korunan.has(k.id));
  for (const k of olu) if (!ebeveyn.has(k.id) || (k.ol as number) < wy - 60) sil.add(k.id);
  const fazla = Object.keys(pop.k).length - sil.size - NUFUS_TAVAN;
  if (fazla > 0) for (const k of olu.filter((x) => !sil.has(x.id)).sort((a, b) => (a.ol as number) - (b.ol as number)).slice(0, fazla)) sil.add(k.id);
  if (!sil.size) return;
  for (const id of sil) delete pop.k[id];
  for (const k of Object.values(pop.k)) { // sarkan referans kalmasın
    if (k.baba && !pop.k[k.baba]) delete k.baba;
    if (k.anne && !pop.k[k.anne]) delete k.anne;
    if (k.es && k.es !== OYUNCU && !pop.k[k.es]) delete k.es;
    if (k.cocuk) { k.cocuk = k.cocuk.filter((c) => pop.k[c]); if (!k.cocuk.length) delete k.cocuk; }
    if (k.dost) { k.dost = k.dost.filter((c) => pop.k[c]); if (!k.dost.length) delete k.dost; }
    if (k.hasim) { k.hasim = k.hasim.filter((c) => pop.k[c]); if (!k.hasim.length) delete k.hasim; }
  }
}

// ── Profil: bir kişinin aile ve bağları (gösterim) ──
export type BagTuru = "es" | "baba" | "anne" | "evlat" | "kardes" | "dost" | "hasim";
export function kisiBaglari(pop: Nufus, id: string): { tur: BagTuru; id: string }[] {
  const k = pop.k[id]; if (!k) return [];
  const out: { tur: BagTuru; id: string }[] = [];
  if (k.es && k.es !== OYUNCU && pop.k[k.es]) out.push({ tur: "es", id: k.es });
  for (const x of Object.values(pop.k)) if (x.es === id && x.ol != null && x.id !== k.es) out.push({ tur: "es", id: x.id }); // rahmetli eş(ler)
  if (k.baba && pop.k[k.baba]) out.push({ tur: "baba", id: k.baba });
  if (k.anne && pop.k[k.anne]) out.push({ tur: "anne", id: k.anne });
  for (const c of k.cocuk || []) if (pop.k[c]) out.push({ tur: "evlat", id: c });
  for (const s of kardesler(pop, id)) out.push({ tur: "kardes", id: s });
  for (const d of k.dost || []) if (pop.k[d]) out.push({ tur: "dost", id: d });
  for (const h of k.hasim || []) if (pop.k[h]) out.push({ tur: "hasim", id: h });
  return out;
}

// ── Değişmez denetimi (test ve geliştirme için) ──
export function nufusDenetle(pop: Nufus, wy: number): string[] {
  const hata: string[] = [];
  for (const id in pop.k) {
    const k = pop.k[id];
    if (k.id !== id) hata.push(`kimlik uyumsuz ${id}`);
    if (k.ol == null && k.es && k.es !== OYUNCU) {
      const e = pop.k[k.es];
      if (!e) hata.push(`eş yok ${id}`); else if (e.ol != null) hata.push(`ölüyle evli ${id}`); else if (e.es !== id) hata.push(`eşlik simetrik değil ${id}`);
      else if (e.g === k.g) hata.push(`aynı cins evlilik ${id}`);
    }
    for (const pa of [k.baba, k.anne]) if (pa) {
      const p = pop.k[pa];
      if (!p) hata.push(`ebeveyn yok ${id}`);
      else { if (!(p.cocuk || []).includes(id)) hata.push(`co tutarsız ${id}`); if (k.dy - p.dy < 16) hata.push(`ebeveyn yaşı ${id}`); }
    }
    for (const c of k.cocuk || []) { const ck = pop.k[c]; if (!ck) hata.push(`çocuk yok ${id}`); else if (ck.baba !== id && ck.anne !== id) hata.push(`ebeveyn tutarsız ${id}`); }
    if (k.ol == null && k.es !== OYUNCU && wy - k.dy > 100) hata.push(`ölümsüz ${id}`);
  }
  if (Object.values(pop.k).filter((k) => k.ol == null && k.es === OYUNCU).length > 1) hata.push("oyuncunun birden çok eşi");
  for (const id in pop.k) { const k = pop.k[id];
    for (const tur of ["dost", "hasim"] as const) for (const o of k[tur] || []) { const x = pop.k[o]; if (!x) hata.push(`${tur} yok ${id}`); else if (!(x[tur] || []).includes(id)) hata.push(`${tur} simetrik değil ${id}`); if (o === id) hata.push(`kendine ${tur} ${id}`); }
    for (const o of k.dost || []) if ((k.hasim || []).includes(o)) hata.push(`hem dost hem hasım ${id}`);
  }
  return hata;
}
