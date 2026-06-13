import { useState, useEffect } from "react";

/**
 * LifeNovel — "Hayatın Romanı"
 * Oyuncunun hayatını resimli bir kitap gibi okutur: her bölüm (perde) bir
 * sayfa — dönemin hero görseli, Cinzel Decorative başlık, o dönemin yıllık
 * düzyazısı (drop-cap), altın süslemeler. Oyunun ruhu ("her hayat bir roman").
 *
 * props:
 *   name        — oyuncu adı
 *   baseAge     — başlangıç yaşı (yaş = baseAge + turn/12)
 *   chapters    — [{ no, baslik, baslangic, bitis }]  (perdeler)
 *   yearStories — [{ year_idx, year_label, story }]
 *   alive       — hayatta mı (final dipnot için)
 *   onClose
 */

// Dönemin hero görseli (yaşa göre kuşak + mevsim)
function chapterImage(age, season = "sonbahar") {
  const s = season;
  if (age < 13) return `/images/hero/cocuk_${s}.jpg`;
  const band = age < 30 ? "genc" : age < 55 ? "orta" : "yasli";
  return `/images/hero/${band}_${s}.jpg`;
}

// Oyuncunun kişisel dönüm noktaları (romanın "senin hayatından" anları)
const MILESTONES = {
  evlilik: "💍", doğum: "👶", kariyer_terfi: "👑", tahta_çıkış: "👑",
  savaş_zaferi: "⚔", başarım: "🏆", mülk_alım: "🏠", şehir_kuruluşu: "🏛",
  meslek_edinme: "⚒", meslek_değişimi: "⚒", komutan_savaşı: "⚔",
  rank_bonusu: "🛡", nesil_devri: "🕊",
};

export default function LifeNovel({ name, baseAge = 7, chapters = [], yearStories = [], history = [], alive = true, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Yıl hikâyelerini bölümlere dağıt (yıl ortası turn'üne göre)
  const chapsSorted = [...chapters].sort((a, b) => (a.no || 0) - (b.no || 0));
  const yearToChapter = (yIdx) => {
    const midTurn = yIdx * 12 + 6;
    for (const c of chapsSorted) {
      const end = c.bitis == null ? Infinity : c.bitis;
      if (midTurn >= (c.baslangic ?? 0) && midTurn < end) return c.no;
    }
    return chapsSorted.length ? chapsSorted[chapsSorted.length - 1].no : 1;
  };
  const storiesByChapter = {};
  for (const ys of yearStories) {
    const cn = yearToChapter(ys.year_idx ?? 0);
    (storiesByChapter[cn] ||= []).push(ys);
  }
  Object.values(storiesByChapter).forEach(arr =>
    arr.sort((a, b) => (a.year_idx ?? 0) - (b.year_idx ?? 0)));

  // Kişisel dönüm noktalarını bölümlere dağıt (olay turn'üne göre)
  const turnToChapter = (turn) => {
    for (const c of chapsSorted) {
      const end = c.bitis == null ? Infinity : c.bitis;
      if (turn >= (c.baslangic ?? 0) && turn < end) return c.no;
    }
    return chapsSorted.length ? chapsSorted[chapsSorted.length - 1].no : 1;
  };
  const milestonesByChapter = {};
  for (const ev of history) {
    const icon = MILESTONES[ev.type];
    if (!icon) continue;
    const t = ev.day ?? ev.turn ?? 0;
    const cn = turnToChapter(t);
    const line = (ev.text || "").split("\n")[0].replace(/^[^\wçğıöşüÇĞİÖŞÜ"']*/, "").trim();
    if (line) (milestonesByChapter[cn] ||= []).push({ icon, text: line, t });
  }
  Object.values(milestonesByChapter).forEach(arr => {
    arr.sort((a, b) => a.t - b.t);
    // aynı bölümde en fazla 5 anı (kalabalık olmasın)
    if (arr.length > 5) arr.splice(5);
  });

  // Bölüm yoksa tek "bölüm" gibi davran
  const renderChapters = chapsSorted.length ? chapsSorted : [{ no: 1, baslik: "Hikâyem", baslangic: 0, bitis: null }];

  const splitTitle = (baslik) => {
    const m = (baslik || "").match(/^(Bölüm\s+[IVXLC0-9]+)\s*[:：-]?\s*(.*)$/i);
    if (m) return [m[1], m[2]];
    return ["", baslik || ""];
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&family=Crimson+Text:ital,wght@0,400;1,400;0,600&display=swap');
        .ln-root { position: fixed; inset: 0; z-index: 9998; overflow-y: auto;
          background:
            radial-gradient(ellipse 120% 50% at 50% -8%, rgba(201,168,76,0.10) 0%, transparent 55%),
            linear-gradient(180deg, #100b06 0%, #0a0703 60%, #070502 100%); }
        .ln-grain::after { content:""; position:fixed; inset:0; pointer-events:none; opacity:0.5;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E"); }
        .ln-wrap { max-width: 540px; margin: 0 auto; padding: 0 22px 80px; }
        .ln-fade { transition: opacity 0.9s ease; opacity: 0; }
        .ln-fade.shown { opacity: 1; }
        .ln-close { position: fixed; top: calc(env(safe-area-inset-top,0px) + 12px); right: 16px; z-index: 2;
          width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(201,168,76,0.35);
          background: rgba(8,5,2,0.7); color: #c9a84c; font-size: 18px; cursor: pointer; backdrop-filter: blur(6px); }
        .ln-cover { text-align: center; padding: calc(env(safe-area-inset-top,0px) + 56px) 0 18px; }
        .ln-cover-kicker { font-family:'Cinzel',serif; font-size:10px; letter-spacing:0.5em; color:#8a6a2a; text-transform:uppercase; }
        .ln-cover-title { font-family:'Cinzel Decorative',serif; font-size:clamp(26px,7vw,40px); color:#d9b65a; line-height:1.15; margin-top:10px;
          text-shadow:0 2px 18px rgba(0,0,0,0.8), 0 0 34px rgba(201,168,76,0.25); }
        .ln-cover-sub { font-family:'Crimson Text',serif; font-style:italic; font-size:14px; color:#8a7250; margin-top:8px; }
        .ln-flourish { text-align:center; color:#7a5a22; font-size:14px; letter-spacing:0.5em; margin:22px 0; }
        .ln-chapter { margin-top: 30px; }
        .ln-banner { position:relative; height:120px; border-radius:10px; overflow:hidden; border:1px solid rgba(201,168,76,0.18);
          box-shadow:0 8px 26px rgba(0,0,0,0.5); margin-bottom:-46px; }
        .ln-banner-img { position:absolute; inset:0; background-size:cover; background-position:center 38%; filter:saturate(0.85); }
        .ln-banner-veil { position:absolute; inset:0; background:linear-gradient(180deg, rgba(8,5,2,0.35) 0%, rgba(8,5,2,0.55) 45%, #0a0703 100%); }
        .ln-ch-head { position:relative; text-align:center; padding-top:8px; }
        .ln-ch-no { font-family:'Cinzel',serif; font-size:10px; letter-spacing:0.55em; color:#8a6a2a; text-transform:uppercase; }
        .ln-ch-title { font-family:'Cinzel Decorative',serif; font-size:clamp(19px,5.2vw,26px); color:#e0bb58; margin-top:4px;
          text-shadow:0 2px 12px rgba(0,0,0,0.85); }
        .ln-ch-rule { width:60%; height:1px; margin:14px auto 18px;
          background:linear-gradient(to right, transparent, rgba(201,168,76,0.5), transparent); }
        .ln-prose { font-family:'Crimson Text',serif; font-size:16px; line-height:1.95; color:#cbb38c; text-align:justify; }
        .ln-prose p { margin: 0 0 16px; }
        .ln-prose .yr { display:block; font-family:'Cinzel',serif; font-size:9px; letter-spacing:0.3em; color:#6a5226; text-transform:uppercase; margin-bottom:3px; }
        .ln-drop::first-letter { font-family:'Cinzel Decorative',serif; font-size:3.1em; float:left; line-height:0.82; padding:4px 8px 0 0; color:#d9b65a; }
        .ln-end { text-align:center; margin-top:40px; font-family:'Crimson Text',serif; font-style:italic; color:#8a7250; font-size:15px; line-height:1.8; }
        .ln-mile-wrap { margin-top: 22px; }
        .ln-mile-head { font-family:'Cinzel',serif; font-size:9px; letter-spacing:0.4em; color:#6a5226; text-transform:uppercase; text-align:center; margin-bottom:11px; }
        .ln-mile { display:flex; align-items:flex-start; gap:10px; padding:8px 12px; margin-bottom:7px; border-left:2px solid rgba(201,168,76,0.45);
          background:linear-gradient(90deg, rgba(201,168,76,0.07), transparent); border-radius:0 6px 6px 0; }
        .ln-mile-icon { font-size:15px; line-height:1.5; filter:drop-shadow(0 0 4px rgba(201,168,76,0.3)); }
        .ln-mile-text { font-family:'Crimson Text',serif; font-style:italic; font-size:14px; color:#c0a578; line-height:1.55; }
      `}</style>

      <div className={`ln-root ln-grain ln-fade ${visible ? "shown" : ""}`}>
        <button className="ln-close" onClick={onClose} aria-label="Kapat">✕</button>
        <div className="ln-wrap">
          {/* Kapak */}
          <div className="ln-cover">
            <div className="ln-cover-kicker">Hayatın Romanı</div>
            <div className="ln-cover-title">{name || "Kahraman"}</div>
            <div className="ln-cover-sub">— bir ömrün hikâyesi, küllerin diyarında —</div>
          </div>

          <div className="ln-flourish">❧ ⚜ ❧</div>

          {/* Bölümler */}
          {renderChapters.map((c, ci) => {
            const stories = storiesByChapter[c.no] || [];
            const midTurn = ((c.baslangic ?? 0) + (c.bitis ?? ((c.baslangic ?? 0) + 12))) / 2;
            const ageAt = baseAge + Math.floor(midTurn / 12);
            const seasons = ["ilkbahar", "yaz", "sonbahar", "kis"];
            const season = seasons[Math.floor(midTurn / 3) % 4] || "sonbahar";
            const [chNo, chTitle] = splitTitle(c.baslik);
            return (
              <div className="ln-chapter" key={c.no ?? ci}>
                <div className="ln-banner">
                  <div className="ln-banner-img" style={{ backgroundImage: `url(${chapterImage(ageAt, season)})` }} />
                  <div className="ln-banner-veil" />
                </div>
                <div className="ln-ch-head">
                  <div className="ln-ch-no">{chNo || `Bölüm ${c.no}`}</div>
                  <div className="ln-ch-title">{chTitle}</div>
                </div>
                <div className="ln-ch-rule" />
                {stories.length ? (
                  <div className="ln-prose">
                    {stories.map((ys, i) => (
                      <div key={i}>
                        <span className="yr">{ys.year_label}</span>
                        <p className={i === 0 ? "ln-drop" : ""}>{ys.story}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ln-prose" style={{ fontStyle: "italic", color: "#7a6a4f", textAlign: "center" }}>
                    Bu bölümün satırları henüz yazılıyor…
                  </p>
                )}
                {(milestonesByChapter[c.no] || []).length > 0 && (
                  <div className="ln-mile-wrap">
                    <div className="ln-mile-head">— senin hayatından —</div>
                    {milestonesByChapter[c.no].map((m, i) => (
                      <div className="ln-mile" key={i}>
                        <span className="ln-mile-icon">{m.icon}</span>
                        <span className="ln-mile-text">{m.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="ln-flourish">❧ ⚜ ❧</div>
          <div className="ln-end">
            {alive
              ? "…ve hikâye devam ediyor. Bir sonraki sayfayı sen yazacaksın."
              : "Son. Ama küllerin altında bir tohum, yeni bir hikâyeyi bekliyor."}
          </div>
        </div>
      </div>
    </>
  );
}
