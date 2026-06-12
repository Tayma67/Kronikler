// Meslek/ünvan görünür adları — 1200'ler Anadolu'suna uygun.
// İç kodda anahtarlar değişmez (kral, veliaht...), sadece oyuncuya
// gösterilen ad dönüştürülür.
export const PROF_LABELS = {
  kral: "Sultan",
  veliaht: "Şehzade",
  lord: "Bey",
  general: "Subaşı",
};

export function profLabel(p) {
  if (!p) return "";
  return PROF_LABELS[p] || p.replace(/_/g, " ");
}
