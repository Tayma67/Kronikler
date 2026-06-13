// İkilemler — ay ilerlerken çıkan anlatısal seçimler. Saf veri; etki applyDilemma ile uygulanır.
import { GameState, Delta, Player } from "./game";

export interface Choice { label: string; delta: Delta; result: string; }
export interface Dilemma {
  id: string; title: string; text: string; icon: string;
  when?: (p: Player) => boolean;
  choices: Choice[];
}

export const DILEMMAS: Dilemma[] = [
  {
    id: "dilenci", icon: "prayer-beads", title: "Yol Kenarında Bir Dilenci",
    text: "Titreyen elini sana uzatan yaşlı bir dilenci, bir lokma ekmek diliyor.",
    choices: [
      { label: "Sadaka ver (−5 akçe)", delta: { money: -5, honor: 6, reputation: 2 }, result: "Dilenciye sadaka verdin; içinden bir ferahlık geçti." },
      { label: "Yanından geç", delta: { honor: -3 }, result: "Başını çevirip geçtin. Bakışları arkandan geldi." },
    ],
  },
  {
    id: "kese", icon: "coins", title: "Yerde Bir Kese",
    text: "Çamurun içinde, ağzı akçeyle dolu bir kese buldun. Sahibi görünürde yok.",
    choices: [
      { label: "Cebe at", delta: { money: 30, honor: -8, reputation: -4 }, result: "Keseyi cebe attın. Akçe akçedir; ama vicdanın bir an sızladı." },
      { label: "Sahibini ara", delta: { honor: 10, reputation: 6 }, result: "Keseyi sahibine ulaştırdın. Dürüstlüğün diyarda konuşuldu." },
    ],
  },
  {
    id: "hasta", icon: "healing", title: "Hasta Bir Yolcu",
    text: "Yol kenarında ateşler içinde yatan bir yolcu yardım istiyor. Hastalık bulaşabilir.",
    when: (p) => p.age >= 13,
    choices: [
      { label: "Yardım et", delta: { health: -8, honor: 9, reputation: 4 }, result: "Yolcuya baktın; biraz halsiz düştün ama vicdanın rahat." },
      { label: "Uzak dur", delta: { honor: -2 }, result: "Riske girmedin, yoluna devam ettin." },
    ],
  },
  {
    id: "haydut", icon: "crossed-swords", title: "Yol Kesen Haydut",
    text: "Pusudan çıkan bir haydut, geçiş için akçe istiyor.",
    when: (p) => p.age >= 13,
    choices: [
      { label: "Akçeyi ver (−20)", delta: { money: -20, fear: -2 }, result: "İstediğini verip kurtuldun. Cebin hafifledi." },
      { label: "Karşı koy", delta: { health: -18, fear: 8, fame: 4 }, result: "Haydutla boğuştun; yara aldın ama adın korkusuz diye anıldı." },
    ],
  },
  {
    id: "tuccar", icon: "scales", title: "Tüccarın Teklifi",
    text: "Bir tüccar, kervana ortak olursan kârı katlayacağını söylüyor. Ya da batarsın.",
    when: (p) => p.age >= 16 && p.money >= 40,
    choices: [
      { label: "Yatırım yap (−40)", delta: { money: 50, reputation: 3 }, result: "Kervan sağ döndü; yatırımın katlanarak geri geldi." },
      { label: "Riske girme", delta: {}, result: "Teklifi geri çevirdin. Belki de doğrusu buydu." },
    ],
  },
  {
    id: "dervis", icon: "scroll-open", title: "Gezgin Bir Derviş",
    text: "Yorgun bir derviş, bir gece konukluk karşılığında hikmetli sözler vaat ediyor.",
    when: (p) => p.age >= 13,
    choices: [
      { label: "Konuk et", delta: { stat_points: 1, honor: 4 }, result: "Dervişin sohbetinden bir şeyler öğrendin (özellik puanı kazandın)." },
      { label: "Geri çevir", delta: {}, result: "Kapını açmadın; derviş sessizce uzaklaştı." },
    ],
  },
  {
    id: "kavga", icon: "fist", title: "Meydanda Kavga",
    text: "Çarşıda iki adam kavgaya tutuştu, kalabalık büyüyor.",
    when: (p) => p.age >= 13,
    choices: [
      { label: "Araya gir", delta: { health: -6, reputation: 6, honor: 4 }, result: "Kavgayı ayırdın; birkaç yumruk yedin ama saygı kazandın." },
      { label: "Uzaktan izle", delta: {}, result: "Karışmadın, olanları izlemekle yetindin." },
    ],
  },
  {
    id: "sifa_otu", icon: "herbs", title: "Şifacının Hediyesi",
    text: "Yardım ettiğin bir şifacı, sana bir tutam şifalı ot bırakıyor.",
    when: (p) => p.age >= 13,
    choices: [
      { label: "Teşekkürle al", delta: { addItem: "sifa", honor: 2 }, result: "Şifalı otu heybene koydun. Bir gün lazım olur." },
    ],
  },
  {
    id: "kayip_cocuk", icon: "family", title: "Kaybolmuş Çocuk",
    text: "Pazarda ağlayan bir çocuk annesini arıyor. Kalabalık aldırmıyor.",
    when: (p) => p.age >= 14,
    choices: [
      { label: "Annesini bul", delta: { honor: 8, reputation: 4 }, result: "Çocuğu ailesine kavuşturdun; dualarını aldın." },
      { label: "Görmezden gel", delta: { honor: -3 }, result: "Acelen vardı, yoluna devam ettin." },
    ],
  },
  {
    id: "kumar", icon: "coins", title: "Han Köşesinde Kumar",
    text: "Hanın loş köşesinde zar atılıyor. Talihini denemek ister misin?",
    when: (p) => p.age >= 16 && p.money >= 20,
    choices: [
      { label: "Oyna (−20 akçe)", delta: { money: 25 }, result: "Zar senden yana döndü; kasayı topladın." },
      { label: "Uzak dur", delta: {}, result: "Kumarın sonu hüsran, dedin ve geçtin." },
    ],
  },
  {
    id: "borc", icon: "scales", title: "Dostun Borç İstiyor",
    text: "Eski bir dostun zor durumda; senden borç istiyor.",
    when: (p) => p.age >= 16 && p.money >= 30,
    choices: [
      { label: "Borç ver (−25)", delta: { money: -25, honor: 6, reputation: 3 }, result: "Dostuna el uzattın; mertliğin konuşuldu." },
      { label: "Reddet", delta: { honor: -2 }, result: "Kesen sıkıydı; geri çevirdin." },
    ],
  },
  {
    id: "vaiz", icon: "prayer-beads", title: "Meydanda Vaiz",
    text: "Bir vaiz halkı dine davet ediyor, bağış topluyor.",
    when: (p) => p.age >= 13,
    choices: [
      { label: "Bağış yap (−8)", delta: { money: -8, honor: 4 }, result: "Bağışını verdin; içine huzur doldu." },
      { label: "Dinle ve geç", delta: {}, result: "Vaazı dinledin ama kesene dokunmadın." },
    ],
  },
  {
    id: "usta_teklif", icon: "anvil", title: "Ustadan Teklif",
    text: "Yaşlı bir usta çırağı olmanı, zanaatını öğretmeyi teklif ediyor.",
    when: (p) => p.age >= 13 && p.age < 30,
    choices: [
      { label: "Kabul et", delta: { stat_points: 1 }, result: "Ustanın yanında çok şey öğrendin." },
      { label: "Kendi yolum var", delta: {}, result: "Nazikçe reddettin." },
    ],
  },
  {
    id: "at_pazari", icon: "map", title: "At Pazarı",
    text: "Bir at cambazı, sağlam görünen bir atı ucuza satıyor. Ama gözü kaçamak.",
    when: (p) => p.age >= 16 && p.money >= 25,
    choices: [
      { label: "Satın al (−25)", delta: { money: -5, reputation: 2 }, result: "At iyi çıktı; kısa sürede masrafını çıkardı." },
      { label: "Şüphelen, alma", delta: {}, result: "İçin rahat etmedi, vazgeçtin." },
    ],
  },
  {
    id: "yetim", icon: "baby", title: "Kapındaki Yetim",
    text: "Soğuk bir gecede kapına bir yetim sığındı.",
    when: (p) => p.age >= 18,
    choices: [
      { label: "İçeri al, doyur", delta: { honor: 10, reputation: 5 }, result: "Yetimi koruyup kolladın; vicdanın aydınlandı." },
      { label: "Geri çevir", delta: { honor: -6 }, result: "Kapını açmadın; o gece uykun kaçtı." },
    ],
  },
];

// Tura göre bir ikilem seç (deterministik değil; çağıran olasılıkla tetikler).
export function pickDilemma(s: GameState): Dilemma | null {
  const p = s.player;
  if (p.dead) return null;
  const pool = DILEMMAS.filter((d) => !d.when || d.when(p));
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
