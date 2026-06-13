// Dünya modeli — NPC'ler, eşyalar, pazar. Offline, deterministik üretim.
export interface NPC { id: string; name: string; age: number; gender: "erkek" | "kadın"; profession: string; trait: string; quirk: string; }
// Kişilik özellikleri (deterministik atanır).
export const TRAITS = ["neşeli","ciddi","kibirli","cömert","dertli","yalnız","kurnaz","mert","dindar","hırslı","utangaç","sıcakkanlı"];
const QUIRKS = ["sürekli hava durumundan dert yanar","eski günleri anlatmayı sever","herkese lakap takar","az konuşur çok dinler","yüksek sesle güler","pazarlığa bayılır","komşularını çekiştirir","bir türküyü mırıldanır"];
export interface Item { id: string; name: string; icon: string; buy: number; sell: number; kind: "yiyecek" | "esya" | "silah"; heal?: number; feed?: number; }

const AD_E = ["Mehmet","Ahmet","Mustafa","Hasan","Hüseyin","İbrahim","Osman","Yusuf","Murat","Kerem","Emre","Cihan","Barış","Tolga","Mert"];
const AD_K = ["Ayşe","Fatma","Zeynep","Emine","Hatice","Elif","Nur","Reyhan","Cansu","Derya","Sevda","Pınar","Gül","Nazlı","Hande"];
const SOYAD = ["Atay","Bircan","Demirhan","Saygı","Açıkel","Dalkılıç","Kayhan","Bal","Yıldırım","Toprak","Çelik","Aydın","Korkmaz","Şahin"];
const NPC_PROFS = ["çiftçi","demirci","tüccar","balıkçı","avcı","çoban","fırıncı","müzisyen","şifacı","asker","işsiz"];

function pick<T>(a: T[], r: () => number): T { return a[Math.floor(r() * a.length)]; }

// Tohumlu basit RNG (deterministik dünya). mulberry32.
export function mkRng(seed: number) {
  let s = seed >>> 0;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function generateNPCs(seed: number, n = 30): NPC[] {
  const r = mkRng(seed);
  const out: NPC[] = [];
  for (let i = 0; i < n; i++) {
    const gender: "erkek" | "kadın" = r() < 0.5 ? "erkek" : "kadın";
    const ad = gender === "erkek" ? pick(AD_E, r) : pick(AD_K, r);
    out.push({
      id: "npc_" + i, name: `${ad} ${pick(SOYAD, r)}`,
      age: 14 + Math.floor(r() * 55), gender, profession: pick(NPC_PROFS, r),
      trait: pick(TRAITS, r), quirk: pick(QUIRKS, r),
    });
  }
  return out;
}

export const ITEMS: Record<string, Item> = {
  ekmek:   { id: "ekmek",   name: "Ekmek",     icon: "🍞", buy: 3,  sell: 1,  kind: "yiyecek", feed: 25 },
  peynir:  { id: "peynir",  name: "Peynir",    icon: "🧀", buy: 5,  sell: 2,  kind: "yiyecek", feed: 30 },
  et:      { id: "et",      name: "Et",        icon: "🍖", buy: 9,  sell: 4,  kind: "yiyecek", feed: 45 },
  bugday:  { id: "bugday",  name: "Buğday",    icon: "🌾", buy: 2,  sell: 1,  kind: "esya" },
  sifa:    { id: "sifa",    name: "Şifalı Ot", icon: "🌿", buy: 12, sell: 5,  kind: "yiyecek", heal: 30 },
  bicak:   { id: "bicak",   name: "Bıçak",     icon: "🗡", buy: 20, sell: 8,  kind: "silah" },
};

// Pazar malları — lokasyona göre küçük fiyat dalgalanması.
export function marketGoods(locationSeed: number): Item[] {
  const r = mkRng(locationSeed);
  return Object.values(ITEMS).map((it) => {
    const m = 0.85 + r() * 0.4;
    return { ...it, buy: Math.max(1, Math.round(it.buy * m)), sell: Math.max(1, Math.round(it.sell * m)) };
  });
}

export function locSeed(name: string): number {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h;
}
