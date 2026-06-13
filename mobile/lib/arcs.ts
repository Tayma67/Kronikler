// Hikâye yayları — çok aşamalı, seçimli anlatı. Etkiler applyDilemma deltası ile uygulanır.
import { Player, Delta } from "./game";

export interface ArcChoice { label: string; result: string; delta?: Delta; next: string | "end"; }
export interface ArcStage { id: string; text: string; choices: ArcChoice[]; }
export interface Arc {
  id: string; title: string; icon: string; blurb: string;
  when: (p: Player, tension: number) => boolean;
  start: string; stages: Record<string, ArcStage>;
}

export const ARCS: Arc[] = [
  {
    id: "kan_davasi", title: "Kan Davası", icon: "crossed-swords",
    blurb: "Bir husumet, gölgen gibi peşine takıldı.",
    when: (p) => p.age >= 16 && (p.fear >= 10 || p.reputation < 0),
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Pazarda bir adam yolunu kesti: 'Babamın ölümünden seni sorumlu tutuyorum.' Kalabalık birikiyor.", choices: [
        { label: "Sakin ol, konuş", result: "Onu yatıştırmaya çalıştın; öfkesi azaldı ama gözü hâlâ üstünde.", delta: { honor: 3 }, next: "s2" },
        { label: "Meydan oku", result: "Gözünü kırpmadan karşılık verdin; husumet alevlendi.", delta: { fear: 6, honor: -2 }, next: "s2b" },
      ]},
      s2: { id: "s2", text: "Adam birkaç ay sonra yine karşına çıktı. Bu kez yalnız ve tedirgin. Barışmak ister gibi.", choices: [
        { label: "Elini uzat (barış)", result: "Husumeti dostlukla bitirdin; diyarda mertliğin konuşuldu.", delta: { honor: 10, reputation: 8 }, next: "end" },
        { label: "Reddet", result: "Affetmedin. İçindeki düğüm kaldı.", delta: { fear: 4, honor: -4 }, next: "end" },
      ]},
      s2b: { id: "s2b", text: "Husumet büyüdü; adam adamlarıyla seni sıkıştırdı. Bir gece baskını kaçınılmaz.", choices: [
        { label: "Yüzleş", result: "Korkusuzca yüzleştin; yara aldın ama adın 'yılmaz' diye anıldı.", delta: { health: -15, fear: 10, fame: 8 }, next: "end" },
        { label: "Diyarı terk et", result: "Bir süre uzaklaştın; husumet soğudu ama itibarın zedelendi.", delta: { reputation: -6 }, next: "end" },
      ]},
    },
  },
  {
    id: "define", title: "Define Haritası", icon: "map",
    blurb: "Yırtık bir harita, bir ömürlük servet vaat ediyor.",
    when: (p) => p.age >= 15,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Bir seyyah, ölüm döşeğinde sana yarım bir harita bıraktı. Eksik parça bir hancıda olabilir.", choices: [
        { label: "Hancıyı bul (−15 akçe)", result: "Hancıyı para ile konuşturdun; haritanın diğer yarısı elinde.", delta: { money: -15 }, next: "s2" },
        { label: "Tek başına ara", result: "Aylarca boş yere aradın; iz bulamadın.", delta: { honor: 0 }, next: "end" },
      ]},
      s2: { id: "s2", text: "Harita seni ıssız bir mağaraya götürdü. İçeride bir sandık — ama tavan çatırdıyor.", choices: [
        { label: "Riski göze al", result: "Son anda sandığı kaptın; içi altın doluydu!", delta: { money: 120, fame: 6 }, next: "end" },
        { label: "Geri çekil", result: "Canını riske atmadın; eli boş ama sağ döndün.", next: "end" },
      ]},
    },
  },
  {
    id: "yukselis", title: "Yükseliş", icon: "crown",
    blurb: "Sancakbeyinin gözüne girmek bir fırsat kapısı.",
    when: (p) => p.age >= 18 && p.reputation >= 15,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Sancakbeyi, sadık adamlar arıyor. Bir aracı seni tavsiye etti. Huzura çıkacaksın.", choices: [
        { label: "Hediye ile git (−30 akçe)", result: "Cömert hediyen beyi memnun etti.", delta: { money: -30, reputation: 4 }, next: "s2" },
        { label: "Eli boş ama sözünle git", result: "Hitabetin beyi etkiledi.", delta: { reputation: 2 }, next: "s2" },
      ]},
      s2: { id: "s2", text: "Bey sana bir görev verdi: asi bir köyü yatıştır. Zorla mı, sözle mi?", choices: [
        { label: "Sözle ikna et", result: "Köyü kan dökmeden yatıştırdın; beyin gözdesi oldun.", delta: { reputation: 12, honor: 8, fame: 8 }, next: "end" },
        { label: "Zorla bastır", result: "Köyü zorla yatıştırdın; bey memnun ama halk senden korkuyor.", delta: { fear: 12, reputation: 4, honor: -6 }, next: "end" },
      ]},
    },
  },
  {
    id: "veba", title: "Veba Günleri", icon: "skull",
    blurb: "Kara ölüm diyara çöktü; herkes bir seçim yapacak.",
    when: (p) => p.age >= 14,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Veba köyü sardı. Şifacılar el atmanı istiyor ama bulaşma riski büyük.", choices: [
        { label: "Hastalara yardım et", result: "Canını ortaya koydun; hastalara baktın.", delta: { health: -12, honor: 14, reputation: 10 }, next: "s2" },
        { label: "Evine kapan", result: "Kendini izole ettin; sağ kaldın ama vicdanın sızladı.", delta: { honor: -4 }, next: "end" },
      ]},
      s2: { id: "s2", text: "Veba geçti. Sağ kalanlar seni bir kahraman gibi anıyor. Bir de salgın sonrası kıtlık var.", choices: [
        { label: "Ambarını aç (−25 akçe)", result: "Aç halka erzak dağıttın; adın efsaneleşti.", delta: { money: -25, fame: 16, honor: 10 }, next: "end" },
        { label: "Kendine sakla", result: "Erzakını korudun; cebin doldu ama gönüller kırıldı.", delta: { reputation: -8 }, next: "end" },
      ]},
    },
  },
];

export function arcById(id: string | null): Arc | undefined { return ARCS.find((a) => a.id === id); }
// Uygun, henüz tamamlanmamış ve aktif olmayan yaylar.
export function availableArcs(p: Player, completed: string[], tension: number, activeId: string | null): Arc[] {
  return ARCS.filter((a) => a.id !== activeId && !completed.includes(a.id) && a.when(p, tension));
}
