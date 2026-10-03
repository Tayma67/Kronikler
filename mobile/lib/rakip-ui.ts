// Rakip Usta — arayüz yardımcıları: rakibin yerel adı ve lonca bayrağı yarış kartının (genel 3D sınav kartı) verisi.
import { GameState, Player, rakipAktif, rakipOranlari, rakipYollari, RAKIP_HEDEF } from "./game";
import type { SinavKartiVeri } from "./kart3d";
import { localFirstName } from "./world";
import { applyParams } from "./i18n";
import type { Lang } from "./locale-data";

export function rakipAdi(p: Player, lang: Lang): string {
  const r = p.rakip; return r ? localFirstName(r.seed, r.g, lang) : "";
}

// Bekleyen yarış yoksa null. Sonucun alt satırı önceden hesaplanır: bu yarış rekabeti bitiriyorsa bitiş metni, değilse yeni bayrak sayısı.
export function rakipKartVerisi(s: GameState, t: (k: string) => string, lang: Lang, sonra = false): SinavKartiVeri | null {
  const p = s.player; const r = rakipAktif(p);
  if (!r || r.yaris == null) return null;
  const alt = (g: number, m: number) => (g >= RAKIP_HEDEF ? t("rk.end.ustun") : m >= RAKIP_HEDEF ? t("rk.end.yenik") : applyParams(t("rk.flags"), [g, m, RAKIP_HEDEF]));
  return {
    prof: r.prof, hedefUnvan: "rakip-" + r.yaris, yollar: rakipYollari(p), oranlar: rakipOranlari(p),
    ozel: {
      ust: t("rk.card"), baslik: applyParams(t("rk.vs"), [rakipAdi(p, lang)]), sahne: t("rk.scene"),
      yolAd: [t("rk.y0"), t("rk.y1"), t("rk.y2")], how: t("rk.how"), okB: t("rk.win"), noB: t("rk.lose"),
      ok: [t("rk.ok0"), t("rk.ok1"), t("rk.ok2")], no: [t("rk.no0"), t("rk.no1"), t("rk.no2")],
      okAlt: alt(r.galip + 1, r.maglup), noAlt: alt(r.galip, r.maglup + 1), icon: "banner", sonra: sonra ? t("rk.later") : undefined,
    },
  };
}
