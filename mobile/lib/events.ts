// İkilemler — ay ilerlerken çıkan anlatısal seçimler. Saf veri; etki applyDilemma ile uygulanır.
import { GameState, Delta, Player } from "./game";

export interface Choice { label: string; delta: Delta; result: string; }
export interface Dilemma {
  id: string; title: string; text: string; icon: string;
  when?: (p: Player) => boolean;
  identity?: boolean; // kimliğe (nam/korku/şeref/şöhret) tepki veren olay — daha sık çıkar
  choices: Choice[];
}

export const DILEMMAS: Dilemma[] = [
  // ── Orta yaş / yaşlılık / ekonomik kriz ikilemleri (Vercel life_events_v2 boşluğu) ──
  {
    id: "gec_cesme", icon: "house", title: "Adsız Çeşme",
    text: "Loncan, meydanda senin adını taşıyacak bir çeşme yaptırmak istiyor; taşın yarısı senin kesenden. Ad mı kalsın, su mu?",
    when: (p) => p.age >= 55,
    choices: [
      { label: "Adını ver, keseni aç", delta: { money: -40, fame: 4, nam: { comert: 2 } }, result: "Çeşme yükseldi; mermerine adın kazındı. Su içen herkes adını okuyor — kimi dua ediyor, kimi 'gösteriş' diyor." },
      { label: "Adsız kalsın", delta: { honor: 5, nam: { dindar: 2 } }, result: "Su aktı, ad kalmadı. Yalnız taşçı biliyor kimin yaptırdığını — bir de sen. Bazı hayırlar sessiz akar." },
    ],
  },
  {
    id: "gec_hesap", icon: "scroll", title: "Eski Hesap",
    text: "Gençken haksızlık ettiğin birinin oğlu kapında: babası ölmüş, defterinde senin adın yazılıymış. Ne gençsin ne de o mesele taze — ama kapıda duruyor.",
    when: (p) => p.age >= 60,
    choices: [
      { label: "Helallik dile", delta: { money: -20, honor: 6, reputation: 2 }, result: "Başını eğdin, hakkı teslim ettin; oğlan keseden çok sözüne baktı. Kapıdan giderken 'babam duysaydı yeterdi' dedi." },
      { label: "Geçmişi göm", delta: { fear: 2, nam: { zalim: 1 } }, result: "Kapıyı yavaşça kapadın; mesele dışarıda kaldı. Ama o defter bir yerde durdukça, kapı da arada bir çalınacak." },
    ],
  },
  {
    id: "orta_borc", icon: "coins", title: "Borç Tuzağı",
    text: "İşler kötü; bir tefeci ağır faizle borç öneriyor. Kese şişer ama zincir de gelir.",
    when: (p) => p.age >= 25,
    choices: [
      { label: "Borcu al", delta: { money: 40, fear: 2, nam: { capkin: 1 } }, result: "Keseyi aldın; şimdilik rahatladın ama tefecinin gözü artık üstünde." },
      { label: "Dişini sık", delta: { honor: 4 }, result: "Borca bulaşmadın; karın aç ama boynun dik kaldı." },
    ],
  },
  {
    id: "orta_tefeci", icon: "skull", title: "Tefecinin Yolu",
    text: "Eline geçen parayı faizle işletmen öneriliyor. Kazanç tatlı, ama lanet de ağır.",
    when: (p) => p.age >= 28,
    choices: [
      { label: "Faizle işlet", delta: { money: 35, reputation: -6, nam: { zalim: 6 } }, result: "Paran para doğurdu; ama mahallede adın 'kan emici'ye çıktı." },
      { label: "Helalinden kazan", delta: { honor: 6, nam: { dindar: 3 } }, result: "Doğru yoldan şaşmadın; kesen ince, vicdanın temiz." },
    ],
  },
  {
    id: "orta_vergi", icon: "scroll", title: "Vergi Tahsildarı",
    text: "Tahsildar kapına dayandı; hesapta olmayan bir vergi istiyor. Rüşvetle de kapatılır.",
    when: (p) => p.age >= 25,
    choices: [
      { label: "Avucuna sıkıştır", delta: { money: -25, reputation: 2 }, result: "Birkaç akçeyle meseleyi kapattın; tahsildar güler yüzle gitti." },
      { label: "Diren", delta: { fear: 4, honor: 5, reputation: -2 }, result: "Boyun eğmedin; tahsildar diş gıcırdatarak çekildi, ama defterine yazdı." },
    ],
  },
  {
    id: "orta_usta", icon: "anvil", title: "Ustanın Azarı",
    text: "Bir büyüğün, herkesin içinde seni haksız yere azarladı. Kan beynine sıçradı.",
    when: (p) => p.age >= 16 && p.age < 50,
    choices: [
      { label: "Sus, geç", delta: { honor: 3, nam: { mert: 2 } }, result: "Dilini tuttun; olgunluğun konuştu, içindeki fırtınayı yuttun." },
      { label: "Dik dur", delta: { fear: 5, reputation: -3, honor: 2 }, result: "Karşılık verdin; kimi 'küstah' dedi, kimi 'yürekli' — ama kimse unutmadı." },
    ],
  },
  {
    id: "orta_miras", icon: "scroll-open", title: "Miras Kavgası",
    text: "Bir akrabanın ardından miras paylaşımı kızıştı. Hakkını istersen aile dağılabilir.",
    when: (p) => p.age >= 45,
    choices: [
      { label: "Hakkını al", delta: { money: 60, reputation: -4 }, result: "Payını söke söke aldın; kesen doldu ama sofranda birkaç yüz eksildi." },
      { label: "Feragat et", delta: { honor: 10, nam: { comert: 5 } }, result: "Hakkından vazgeçtin; 'gönlü zengin' diye anıldın, akraban minnettar kaldı." },
    ],
  },
  {
    id: "kriz_kitlik", icon: "healing", title: "Kıtlık Kapıda",
    text: "Hasat tutmadı, kıtlık söylentileri dolaşıyor. Elindeki erzakı saklayıp vurgun yapabilirsin.",
    when: (p) => p.age >= 18,
    choices: [
      { label: "Stokla, pahalı sat", delta: { money: 45, reputation: -8, nam: { zalim: 5 } }, result: "Aç günlerde erzakı katmerli sattın; kasan doldu, halkın lanetini aldın." },
      { label: "Komşunla paylaş", delta: { money: -15, honor: 8, reputation: 6, nam: { comert: 6 } }, result: "Ekmeğini böldün; o kış kimse senin kapından aç dönmedi." },
    ],
  },
  // ── Yaşam evresi çeşitliliği (çocukluk/gençlik/yetişkinlik/yaşlılık) ──
  {
    id: "cocuk_kus", icon: "healing", title: "Yaralı Kuş",
    text: "Kanadı kırık bir kuş yuvadan düşmüş, çırpınıyor.",
    when: (p) => p.age < 13,
    choices: [
      { label: "Bağrına bas, iyileştir", delta: { honor: 4, nam: { dindar: 2 } }, result: "Günlerce besledin; kanadı tutunca gökyüzüne saldın. İçin ısındı." },
      { label: "Doğaya bırak", delta: {}, result: "Kaderine bıraktın; tabiatın işine karışmadın." },
    ],
  },
  {
    id: "cocuk_yalan", icon: "scroll", title: "Küçük Bir Yalan",
    text: "Kırdığın testiyi soruyorlar; suç başkasına atılabilir.",
    when: (p) => p.age >= 7 && p.age < 13,
    choices: [
      { label: "Doğruyu söyle", delta: { honor: 6, reputation: 2 }, result: "Azar işittin ama dürüstlüğün konuşuldu." },
      { label: "Sus, üstüne atma", delta: { honor: -3, nam: { zalim: 1 } }, result: "Kurtuldun; ama içinde küçük bir leke kaldı." },
    ],
  },
  {
    id: "genc_ilkask", icon: "ring", title: "İlk Sevda",
    text: "Gönlün birine kaydı; çarşıda her gün yolunu gözlüyorsun.",
    when: (p) => p.age >= 14 && p.age < 22 && !p.married,
    choices: [
      { label: "İçini dök", delta: { nam: { capkin: 4 } }, result: "Yüreğini açtın; kabul de gelse ret de, delikanlılığın damga vurdu." },
      { label: "İçine at", delta: { honor: 2 }, result: "Sözü yuttun; sevda içinde bir türkü gibi kaldı." },
    ],
  },
  {
    id: "genc_meydan", icon: "crossed-swords", title: "Meydan Okuma",
    text: "Mahallenin kabadayısı seni er meydanına çağırıyor; herkes bakıyor.",
    when: (p) => p.age >= 15 && p.age < 26,
    choices: [
      { label: "Meydanı kabul et", delta: { health: -6, honor: 8, fear: 3 }, result: "Yumruk yedin yumruk attın; kazan ya da kaybet, korkak demediler." },
      { label: "Geç, oyununa gelme", delta: { honor: -2 }, result: "Bilgece geçtin; kimi 'akıllı' dedi, kimi yan baktı." },
    ],
  },
  {
    id: "yetiskin_ortaklik", icon: "coins", title: "Ortaklık Teklifi",
    text: "Bir tüccar seni ortaklığa çağırıyor; kâr da var, batma riski de.",
    when: (p) => p.age >= 22 && p.age < 55,
    choices: [
      { label: "Ortak ol", delta: { money: 30, fear: 1 }, result: "Sermayeni kattın; talih yâr olursa kazanırsın." },
      { label: "Tek başına yürü", delta: { honor: 2 }, result: "Riske girmedin; kendi yağınla kavruldun." },
    ],
  },
  {
    id: "yasli_vasiyet", icon: "scroll-open", title: "Vasiyet Vakti",
    text: "Yaşın ilerledi; biriktirdiğini ne yapacağını düşünüyorsun.",
    when: (p) => p.age >= 55,
    choices: [
      { label: "Bir kısmını hayra ver", delta: { money: -25, honor: 10, nam: { comert: 6, dindar: 3 } }, result: "Yoksulun duasını aldın; adın hayırla anılacak." },
      { label: "Hepsini vârise sakla", delta: { money: 10 }, result: "Her akçeyi soyuna sakladın; bereketi onlara kalsın." },
    ],
  },
  // ── Yol/yolcu karşılaşmaları (Vercel travel_rework yolcu profilleri) — çok-seçimli ──
  {
    id: "yol_dervis", icon: "prayer-beads", title: "Yolda Bir Derviş",
    text: "Tozlu yolda bir derviş yanına ilişti; gözleri derin, sözü az.",
    when: (p) => p.age >= 13,
    choices: [
      { label: "Sohbetine kulak ver", delta: { honor: 4, nam: { dindar: 3 } }, result: "Birkaç hikmet sözü gönlüne işledi; içine bir huzur doldu." },
      { label: "Yoluna devam et", delta: {}, result: "Selam verip geçtin; aklın işindeydi." },
    ],
  },
  {
    id: "yol_kacak", icon: "coins", title: "Kaçak Tüccar",
    text: "Bir kaçak tüccar, gümrüksüz malı yarı fiyatına fısıldıyor.",
    when: (p) => p.age >= 16,
    choices: [
      { label: "Ucuza kap", delta: { money: 20, fear: 1, nam: { zalim: 2 } }, result: "Kelepir malı aldın; ama bu işin ucu yanabilir." },
      { label: "Bulaşma", delta: { honor: 3 }, result: "Temiz kaldın; kese ince ama vicdan rahat." },
    ],
  },
  {
    id: "yol_asker", icon: "crossed-swords", title: "Yaşlı Bir Gazi",
    text: "Yol kenarında bir gazi, eski seferlerini anlatıyor.",
    when: (p) => p.age >= 14,
    choices: [
      { label: "Anlattıklarını dinle", delta: { stat_points: 1 }, result: "Savaş hilelerini dinledin; bir şeyler öğrendin (özellik puanı)." },
      { label: "Vaktin yok", delta: {}, result: "Başınla selam verip geçtin." },
    ],
  },
  {
    id: "yol_haydut", icon: "skull", title: "Yol Kesen",
    text: "Daracık geçitte bir haydut yolunu kesti: 'Geçiş parası!'",
    when: (p) => p.age >= 15,
    choices: [
      { label: "Bahşişi ver", delta: { money: -15 }, result: "Birkaç akçeyle başını derde sokmadan geçtin." },
      { label: "Diren", delta: { health: -8, honor: 6, fear: 3 }, result: "Diretip yumruk salladın; hırpalandın ama boyun eğmedin." },
    ],
  },
  // ── Yaşam olayı genişlemesi (Vercel life_events/life_events_v2 ruhu): zayıf katmanlar ──
  {
    id: "cocuk_kavga", icon: "crossed-swords", title: "Mektepte Kavga",
    text: "Çelimsiz bir sıra arkadaşını iri bir çocuk itip kakıyor; gözleri sana çevrildi.",
    when: (p) => p.age >= 7 && p.age < 13,
    choices: [
      { label: "Zayıfı savun", delta: { health: -5, honor: 8, reputation: 3 }, result: "Önüne dikildin; biraz hırpalandın ama o çocuk seni hiç unutmayacak." },
      { label: "Karışma", delta: { honor: -3 }, result: "Başını önüne eğip geçtin. İçinde bir burukluk kaldı." },
    ],
  },
  {
    id: "cocuk_kese", icon: "coins", title: "Çamurda Bir Kese",
    text: "Çamurun içinde küçük bir kese buldun. Uzaktan bir adam sana bakıyor gibi.",
    when: (p) => p.age < 13,
    choices: [
      { label: "Cebe at", delta: { money: 12, honor: -6, reputation: -2 }, result: "Keseyi sakladın. O bakışları yıllarca hatırlayacaksın belki." },
      { label: "Sahibini ara", delta: { honor: 8, reputation: 4 }, result: "Keseyi sahibine ulaştırdın; 'dürüst çocuk' diye anıldın." },
    ],
  },
  {
    id: "cocuk_cirak", icon: "anvil", title: "Ustanın Teklifi",
    text: "Mahallenin ustası sana çıraklık öneriyor — ama oyun zamanından olacaksın.",
    when: (p) => p.age >= 9 && p.age < 13,
    choices: [
      { label: "Çıraklığı kap", delta: { stat_points: 1, honor: 2 }, result: "Küçük yaşta el emeğine giriştin; akranların oynarken sen öğrendin." },
      { label: "Çocukluğunu yaşa", delta: { honor: 1 }, result: "Şimdilik oyunu seçtin; çocukluk bir kez yaşanır." },
    ],
  },
  {
    id: "yetiskin_kumar", icon: "coins", title: "Hanın Arka Odası",
    text: "Hanın arka odasındaki zar masasına davet edildin. Kazanç da var, rezalet de.",
    when: (p) => p.age >= 16,
    choices: [
      { label: "Masaya otur", delta: { money: 18, fear: 1, nam: { capkin: 2 } }, result: "Zarlar senden yana döndü bu gece; ama masanın sahibi yüzünü belledi." },
      { label: "Kalkıp git", delta: { honor: 3 }, result: "Kumara bulaşmadın; kesen ince ama vicdanın rahat." },
    ],
  },
  {
    id: "yetiskin_yangin", icon: "healing", title: "Komşunun Yangını",
    text: "Komşunun ahırı tutuşmuş; alevler yükseliyor, herkes donakalmış.",
    when: (p) => p.age >= 14,
    choices: [
      { label: "Kova taşı", delta: { health: -8, honor: 10, reputation: 6 }, result: "Ateşe daldın, kova taşıdın; köy o geceyi hâlâ anlatıyor." },
      { label: "Uzaktan seyret", delta: { honor: -5, reputation: -3 }, result: "Kıpırdamadın. O gece duran biri olarak hatırlanacaksın." },
    ],
  },
  {
    id: "yasli_hac", icon: "prayer-beads", title: "Hac Kervanı",
    text: "Bir kervan hac yoluna düşüyor. Katılmak ister misin? Yol uzun ve zahmetli.",
    when: (p) => p.age >= 45,
    choices: [
      { label: "Yola düş", delta: { money: -40, honor: 8, nam: { dindar: 6 } }, result: "Zahmetli yolu göze aldın; döndüğünde adın 'hacı' diye anıldı." },
      { label: "Şimdilik kalma", delta: {}, result: "Yol bir başka bahara kaldı; niyetin kalbinde duruyor." },
    ],
  },
  {
    id: "yasli_torun", icon: "scroll-open", title: "Torunun Merakı",
    text: "Torunun dizine oturmuş geçmişini soruyor: 'Sen gençken nasıldın?'",
    when: (p) => p.age >= 50,
    choices: [
      { label: "Hikâyeni anlat", delta: { honor: 4, reputation: 2 }, result: "Geçmişini anlattın; gözleri parladı, adın bir kuşak daha yaşayacak." },
      { label: "Geçiştir", delta: {}, result: "'Çok şey yaşadım' deyip geçtin; kimi sır mezara gider." },
    ],
  },
  {
    id: "yasli_miras", icon: "coins", title: "Mirasın Gölgesi",
    text: "Evlatların, sen henüz hayattayken mirası konuşmaya başladı. Kulağına geldi.",
    when: (p) => p.age >= 50 && (p.children?.length || 0) > 0,
    choices: [
      { label: "Adilce paylaştır", delta: { honor: 6, reputation: 3 }, result: "Herkese hakkını açıkça söyledin; ocakta huzur kaldı." },
      { label: "Sırrını koru", delta: { fear: 4, nam: { zalim: 2 } }, result: "Ağzını sıkı tuttun; belirsizlik onları hizada tutuyor." },
    ],
  },
  // ── Fraksiyon haftalık sahneleri (Vercel faction_surface ensure_weekly_scene) — yalnız lonca üyesine ──
  {
    id: "frak_gorev", icon: "scroll-open", title: "Loncadan Gizli Bir İş",
    text: "Loncan senden el altından bir iş istiyor: rakip bir tezgâhın defterine göz atıp haber getir.",
    when: (p) => p.faction != null && p.age >= 13,
    choices: [
      { label: "Üstlen", delta: { standing: 12, reputation: -2, money: 14 }, result: "İşi sessizce hallettin; loncada sözün biraz daha geçer oldu." },
      { label: "Geri çevir", delta: { standing: -4, honor: 3 }, result: "Bu işe bulaşmadın; loncadakiler hafif somurttu ama vicdanın rahat." },
    ],
  },
  {
    id: "frak_cekisme", icon: "crossed-swords", title: "Lonca İçinde Çekişme",
    text: "İki kıdemli üye loncanın yönü için çekişiyor; ikisi de senden destek bekliyor.",
    when: (p) => p.faction != null && p.age >= 13,
    choices: [
      { label: "Güçlüden yana ol", delta: { standing: 10, honor: -4 }, result: "Kazanan tarafa yaslandın; mevkin yükseldi ama bazı gözler sana soğudu." },
      { label: "Tarafsız kal", delta: { reputation: 2 }, result: "İki tarafı da idare ettin; kimseyi küstürmeden sıyrıldın." },
    ],
  },
  {
    id: "frak_dedikodu", icon: "speaker", title: "Lonca Sırrı",
    text: "Bir lonca kardeşi sana rakip loncanın zayıf anını fısıldıyor. Bu bilgi koz olabilir.",
    when: (p) => p.faction != null && p.age >= 13,
    choices: [
      { label: "Bilgiyi kullan", delta: { money: 22, standing: 6, honor: -3 }, result: "Sırrı kendi çıkarına çevirdin; kesen şişti, ama ağzın da bağlı kalmalı." },
      { label: "Sırrı sakla", delta: { honor: 6, standing: 3 }, result: "Lafı kendine sakladın; lonca kardeşin güvenini kazandın." },
    ],
  },
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
      { label: "Yatırım yap (−40)", delta: { money: 10, reputation: 3 }, result: "Kervan sağ döndü; yatırdığın 40 akçe geri geldi, üstüne kâr ve itibar." },
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
      { label: "Oyna (−20 akçe)", delta: { money: 5 }, result: "Zar senden yana döndü; ortaya koyduğun parayı kurtardın, üstüne biraz kâr." },
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

  // ── Kimliğe tepki veren olaylar: dünya artık seni TANIYOR ──
  {
    id: "harac", icon: "skull", title: "Korkulan Adın Yankısı", identity: true,
    text: "Pazarın esnafı, 'senin gibi birine kimse dokunamaz' diyerek kapına bir kese bırakıyor — koruma karşılığı haraç.",
    when: (p) => p.age >= 14 && (p.fear >= 35 || (p.nam?.zalim || 0) >= 35),
    choices: [
      { label: "Keseyi al (+25 akçe)", delta: { money: 25, fear: 5, reputation: -6, nam: { zalim: 4 } }, result: "Keseyi aldın; korkun para getirdi ama adın biraz daha karardı." },
      { label: "Geri çevir", delta: { honor: 5, reputation: 4, fear: -3 }, result: "Haraca tenezzül etmedin; esnafın sana bakışı yumuşadı." },
    ],
  },
  {
    id: "aracilik", icon: "scales", title: "Saygın Söze İhtiyaç", identity: true,
    text: "İki aile bir tarla yüzünden bıçak çekecek; adil bilindiğini duymuşlar, araya girmeni istiyorlar.",
    when: (p) => p.age >= 18 && (p.reputation >= 35 || p.honor >= 45),
    choices: [
      { label: "Arabuluculuk yap", delta: { reputation: 6, honor: 6, fame: 3 }, result: "İki tarafı uzlaştırdın; sözün diyarda ağırlık kazandı." },
      { label: "Karışmam", delta: { reputation: -4 }, result: "Geri durdun; 'demek o kadar da saygın değilmiş' dediler." },
    ],
  },
  {
    id: "kaside", icon: "lyre", title: "Adına Kaside", identity: true,
    text: "Gezgin bir şair, namını her şehre yaymak için yanına katılmak istiyor — karşılığında bir kese.",
    when: (p) => p.age >= 16 && p.fame >= 45,
    choices: [
      { label: "Hâmiliğini üstlen (−20)", delta: { money: -20, fame: 8, reputation: 2 }, result: "Şairin dilinde adın daha da büyüdü." },
      { label: "İhtiyacım yok", delta: {}, result: "Şairi gönderdin; namın kendi başına yeter, dedin." },
    ],
  },
  {
    id: "comert_yuku", icon: "coins", title: "Eli Açık Olmanın Bedeli", identity: true,
    text: "Kapına yine bir kalabalık birikti; cömertliğini duyan herkes bir şeyler umuyor.",
    when: (p) => p.age >= 16 && (p.nam?.comert || 0) >= 45,
    choices: [
      { label: "Hepsine dağıt (−30)", delta: { money: -30, honor: 6, reputation: 3, nam: { comert: 3 } }, result: "Kesen boşaldı ama dualar üstüne yağdı." },
      { label: "Bu sefer olmaz", delta: { reputation: -4, nam: { comert: -3 } }, result: "Kapını kapadın; 'demek o eski cömert değil' diye söylendiler." },
    ],
  },
  {
    id: "golge_davet", icon: "hood", title: "Gölgeden Bir Davet", identity: true,
    text: "Karanlık işlerin adamları ününü duymuş; bir 'iş' için seni masaya çağırıyorlar.",
    when: (p) => p.age >= 16 && (p.fear >= 40 || (p.nam?.zalim || 0) >= 40) && p.honor < 40,
    choices: [
      { label: "Masaya otur", delta: { money: 35, fear: 6, reputation: -5, nam: { zalim: 5 } }, result: "Tehlikeli bir iş çevirdin; kesen doldu, adın daha da ürkütücü oldu." },
      { label: "Bu yola girmem", delta: { honor: 4 }, result: "Teklifi reddettin; bazı kapıların kapalı kalması iyidir." },
    ],
  },
  {
    id: "lekeli_ad", icon: "tombstone", title: "Lekeli Ad", identity: true,
    text: "Girdiğin handa fısıltılar kesiliyor; kötü ünün önünden gidiyor. Biri seni sınamak istiyor.",
    when: (p) => p.age >= 16 && p.reputation <= -20,
    choices: [
      { label: "Efendiliğini göster", delta: { reputation: 8, honor: 4 }, result: "Beklenmedik bir olgunluk gösterdin; ön yargılar biraz kırıldı." },
      { label: "Ününe yaraşır davran", delta: { fear: 6, reputation: -3, nam: { zalim: 3 } }, result: "Korkuttun; ününe ün kattın ama yalnızlığın derinleşti." },
    ],
  },

  // ── ÇOCUKLUK (yaşam evresi: 7–12) ──
  {
    id: "cocuk_oyun", icon: "family", title: "Mahalle Oyunu",
    text: "Çocuklar meydanda topaç çeviriyor, seni de çağırıyorlar.",
    when: (p) => p.age < 13,
    choices: [
      { label: "Oyuna katıl", delta: { honor: 1 }, result: "Doyasıya oynadın; akşama dek gülüşün eksilmedi." },
      { label: "Kenarda izle", delta: {}, result: "Uzaktan izlemekle yetindin; içinde bir buruğluk kaldı." },
    ],
  },
  {
    id: "cocuk_kabadayi", icon: "fist", title: "Mahallenin Kabadayısı",
    text: "İri bir çocuk küçükleri sıkıştırıyor, sıra sana geldi.",
    when: (p) => p.age >= 8 && p.age < 13,
    choices: [
      { label: "Karşı dur", delta: { health: -3, fear: 3, fame: 2 }, result: "Korkmadan dikildin; burnun kanadı ama kimse seni hafife alamadı." },
      { label: "Büyüklere söyle", delta: { honor: 2 }, result: "Akıllıca davrandın; kabadayı azar işitti." },
    ],
  },
  {
    id: "cocuk_kitap", icon: "book", title: "Tozlu Bir Kitap",
    text: "Mahalle imamı, okumaya hevesli görünen sana eski bir kitap uzatıyor.",
    when: (p) => p.age >= 9 && p.age < 13,
    choices: [
      { label: "Hevesle oku", delta: { stat_points: 1, nam: { dindar: 3 } }, result: "Harfleri söktün; yeni bir dünya aralandı (özellik puanı)." },
      { label: "İlgilenme", delta: {}, result: "Kitabı geri verdin; oyun aklındaydı." },
    ],
  },

  // ── EVLİLİK & OCAK (married) ──
  {
    id: "es_dargin", icon: "ring", title: "Eşinle Dargınlık",
    text: "Küçük bir mesele büyüdü; eşinle aranıza soğukluk girdi.",
    when: (p) => p.married,
    choices: [
      { label: "Gönlünü al", delta: { money: -5, honor: 4, reputation: 2 }, result: "Bir tatlı söz, bir küçük armağan — buzlar çözüldü." },
      { label: "İnat et", delta: { honor: -3 }, result: "Sustun, küstün; ocağın bir süre sessiz kaldı." },
    ],
  },
  {
    id: "es_hastalik", icon: "healing", title: "Eşin Hasta",
    text: "Eşin ateşler içinde yatıyor; hekim pahalı ama umut orada.",
    when: (p) => p.married && p.money >= 20,
    choices: [
      { label: "Hekim çağır (−20)", delta: { money: -20, honor: 6, reputation: 3 }, result: "Hekim eşini ayağa kaldırdı; minnet gözlerinden okundu." },
      { label: "Şifalı ota güven", delta: { honor: -2 }, result: "Otlarla idare ettin; eşin zar zor toparlandı." },
    ],
  },

  // ── EVLAT (children > 0) ──
  {
    id: "evlat_dert", icon: "baby", title: "Evladının Derdi",
    text: "Evladın bir hata yaptı ve sana çekinerek geldi.",
    when: (p) => p.children.length > 0,
    choices: [
      { label: "Şefkatle yol göster", delta: { honor: 5, nam: { comert: 3 } }, result: "Azarlamadan anlattın; evladının gözünde büyüdün." },
      { label: "Sert ceza ver", delta: { fear: 4, honor: -2 }, result: "Korkuyla terbiye ettin; itaat etti ama mesafe açıldı." },
    ],
  },
  {
    id: "evlat_dugun", icon: "ring", title: "Evladına Talip",
    text: "Evladına bir talip çıktı; köklü ama soğuk bir aile.",
    when: (p) => p.children.length > 0 && p.age >= 35,
    choices: [
      { label: "Gönlüne bak, sor", delta: { honor: 4, reputation: 2 }, result: "Evladının rızasını gözettin; ocağın huzuru korundu." },
      { label: "Çıkar için onayla", delta: { money: 50, reputation: -3, nam: { comert: -2 } }, result: "Servet geldi ama evladının bakışı bir başka oldu." },
    ],
  },

  // ── YAŞLILIK (yaşam evresi: 58+) ──
  {
    id: "yasli_ocakbasi", icon: "family", title: "Ocak Başında Hikâye",
    text: "Soğuk bir gece; gençler etrafına toplanmış, bir hikâye bekliyor.",
    when: (p) => p.age >= 58,
    choices: [
      { label: "Ömründen anlat", delta: { fame: 3, honor: 3 }, result: "Yaşadıklarını anlattın; sözlerin gençlerin hafızasına kazındı." },
      { label: "Yorgunum, başka zaman", delta: {}, result: "Gözlerin ağırdı; ocağın başında dalıp gittin." },
    ],
  },
  {
    id: "yasli_vakif", icon: "prayer-beads", title: "Geriye Kalan",
    text: "Ömrünün akşamında, ardında ne bırakacağını düşünüyorsun. Bir hayrat kurabilirsin.",
    when: (p) => p.age >= 58 && p.money >= 60,
    choices: [
      { label: "Çeşme/hayrat yaptır (−60)", delta: { money: -60, fame: 12, honor: 12, nam: { comert: 6 } }, result: "Adına bir hayrat yaptırdın; su aktıkça adın anılacak." },
      { label: "Serveti vârise sakla", delta: {}, result: "Birikimini olduğu gibi bıraktın; karar vârisin olsun dedin." },
    ],
  },
  {
    id: "yasli_hekim", icon: "healing", title: "Hekimin Öğüdü",
    text: "Hekim, yaşına dikkat etmeni, dinlenmeni söylüyor. Ama işler bekliyor.",
    when: (p) => p.age >= 58,
    choices: [
      { label: "Dinlen, kendine bak", delta: { health: 10 }, result: "Bir süre dinlendin; bedenin biraz toparlandı." },
      { label: "Çalışmaya devam", delta: { money: 15, health: -6 }, result: "Yaşına aldırmadın; kese doldu ama bedenin yoruldu." },
    ],
  },

  // ── GENEL HAYAT & FELAKET ──
  {
    id: "carsi_yangin", icon: "fist", title: "Çarşıda Yangın",
    text: "Bir dükkândan çıkan alev çarşıyı sarıyor; içeride mahsur kalanlar var.",
    when: (p) => p.age >= 14,
    choices: [
      { label: "Söndürmeye koş", delta: { health: -10, honor: 10, reputation: 8, fame: 5 }, result: "Aleve aldırmadan daldın; yandın ama kahraman diye anıldın." },
      { label: "Kaç, canını kurtar", delta: { honor: -3 }, result: "Geri çekildin; alevler arkanda yükseldi." },
    ],
  },
  {
    id: "sel_baskini", icon: "herbs", title: "Sel Bastı",
    text: "Dere taştı, evler su altında; komşular el bekliyor.",
    when: (p) => p.age >= 14,
    choices: [
      { label: "Kurtarmaya yardım et", delta: { health: -6, reputation: 6, honor: 6, nam: { comert: 4 } }, result: "Sırılsıklam oldun ama nice canı suya kaptırmadın." },
      { label: "Kendi evine bak", delta: {}, result: "Önce kendi eşiğini korudun; kimse bir şey demedi ama..." },
    ],
  },
  {
    id: "hac_daveti", icon: "prayer-beads", title: "Hac Yolu", identity: true,
    text: "Bir kafile yola çıkıyor; dindarlığın bilindiği için seni de çağırıyorlar.",
    when: (p) => p.age >= 25 && (p.nam?.dindar || 0) >= 25 && p.money >= 40,
    choices: [
      { label: "Yola çık (−40)", delta: { money: -40, honor: 12, fame: 8, nam: { dindar: 8 } }, result: "Zorlu bir yolculuktan döndün; gönlün huzurla, adın 'Hacı' diye doldu." },
      { label: "Bu sene olmaz", delta: {}, result: "Niyetini sakladın; belki seneye, dedin." },
    ],
  },
  {
    id: "kervan_ortak", icon: "scales", title: "Kervana Ortaklık", identity: true,
    text: "Bir kervanbaşı, ticaret aklına güvenip seni ortaklığa çağırıyor — büyük kâr, büyük risk.",
    when: (p) => p.age >= 18 && p.money >= 60 && (p.skills?.trade || 0) >= 2,
    choices: [
      { label: "Ortak ol (−60)", delta: { money: 30, fame: 5, reputation: 4 }, result: "Kervan kârla döndü; koyduğun 60 akçe geri geldi, üstüne kâr, şöhret ve itibar." },
      { label: "Riske girme", delta: {}, result: "Temkinli davrandın; fırsat geçti ama kesen yerinde." },
    ],
  },
  {
    id: "haydut_teklif", icon: "skull", title: "Eşkıya Çağrısı", identity: true,
    text: "Dağdaki eşkıyalar, korkusuzluğunu duymuş; çeteye katılmanı istiyorlar.",
    when: (p) => p.age >= 16 && (p.fear >= 25 || (p.nam?.zalim || 0) >= 25) && p.reputation < 30,
    choices: [
      { label: "Bir vurgun yap", delta: { money: 45, fear: 8, reputation: -8, nam: { zalim: 6 } }, result: "Bir kervanı bastınız; kese doldu, adın dağlara korku saldı." },
      { label: "Reddet, namusunu koru", delta: { honor: 5 }, result: "Dağ yolunu reddettin; ekmek helal olsun dedin." },
    ],
  },
  {
    id: "yetim_cirak", icon: "anvil", title: "Kimsesiz Çırak",
    text: "Aç bir yetim, kapında çıraklık ve bir tas çorba diliyor.",
    when: (p) => p.age >= 22 && p.profession !== "işsiz",
    choices: [
      { label: "Yanına al, öğret", delta: { honor: 8, reputation: 5, nam: { comert: 5 } }, result: "Çırağına sanatını öğrettin; hem ona hem adına hayır oldu." },
      { label: "Geri çevir", delta: { honor: -3 }, result: "Kapını açmadın; çocuk başını önüne eğip gitti." },
    ],
  },

  // ── Portlanan sistemlere tepki veren olaylar ──
  {
    id: "vali_vergi", icon: "scales", title: "Vali Olarak Vergi Kararı", identity: true,
    text: "Valisi olduğun şehirde hazine zayıf. Vergiyi artırabilir ya da halkı kollayabilirsin.",
    when: (p) => (p.governorships?.length || 0) > 0,
    choices: [
      { label: "Vergiyi artır (+akçe)", delta: { money: 40, reputation: -6, fear: 4 }, result: "Kese doldu ama halk homurdandı." },
      { label: "Halkı kolla", delta: { reputation: 8, honor: 5, nam: { comert: 3 } }, result: "Vergiyi hafiflettin; halk seni bağrına bastı." },
    ],
  },
  {
    id: "beylik_sadakat", icon: "crown", title: "Beyin Çağrısı", identity: true,
    text: "Beyliğinin beyi sadakatini sınıyor; bir armağan ve biat bekliyor.",
    when: (p) => p.age >= 16 && p.reputation >= 10,
    choices: [
      { label: "Biat et, armağan sun (−25)", delta: { money: -25, reputation: 8, fame: 4 }, result: "Beyin gözüne girdin; kapılar aralandı." },
      { label: "Onurunla geri dur", delta: { honor: 5, reputation: -3, nam: { mert: 3 } }, result: "Boyun eğmedin; kimi mert dedi, kimi küstah." },
    ],
  },
  {
    id: "spekulasyon", icon: "coins", title: "Pazar Söylentisi", identity: true,
    text: "Bir tüccar, fiyatların yakında fırlayacağını fısıldıyor — şimdi alırsan vurur musun?",
    when: (p) => p.age >= 16 && p.money >= 40 && (p.skills?.trade || 0) >= 1,
    choices: [
      { label: "Stok yap, riske gir (−35)", delta: { money: 25, reputation: 2 }, result: "Söylenti doğru çıktı; harcadığın 35 akçe geri geldi, üstüne kâr." },
      { label: "Güvenme, geç", delta: {}, result: "Temkinli kaldın; söylenti bu kez boş çıktı, iyi ki girmedin." },
    ],
  },
  {
    id: "lonca_sadakat", icon: "scales", title: "Loncanın İsteği", identity: true,
    text: "Loncan zor bir görev için seni çağırıyor; reddedersen itibarın sarsılır.",
    when: (p) => !!p.faction && p.age >= 14,
    choices: [
      { label: "Görevi üstlen", delta: { reputation: 5, honor: 3, health: -4 }, result: "Lonca için yoruldun ama saygın arttı." },
      { label: "Bu sefer olmaz", delta: { reputation: -5 }, result: "Geri çevirdin; loncadaki itibarın biraz zedelendi." },
    ],
  },
  // ── Yeni sistemlere tepki veren ikilemler (işçi/kalite/zanaat/dostluk) ──
  {
    id: "isci_zammi", icon: "coins", title: "Bir İşçinin Talebi",
    text: "Mülkündeki işçilerden biri huzuruna çıkıp zam istiyor: \"Alın terim daha fazlasını hak ediyor efendim.\"",
    when: (p) => p.properties.some((pr) => (pr.workers || []).length > 0),
    choices: [
      { label: "Zammı ver (cömert)", delta: { money: -8, reputation: 4, nam: { comert: 3 } }, result: "İşçinin yüzü güldü; adın eli açık bir efendi olarak anıldı." },
      { label: "Sertçe geri çevir", delta: { money: 3, reputation: -3, fear: 2, nam: { zalim: 2 } }, result: "İşçi başını eğip çekildi; kapında çalışanlar senden çekinir oldu." },
    ],
  },
  {
    id: "kusurlu_sikayet", icon: "anvil", title: "Kusurlu Mal Şikâyeti",
    text: "Bir müşteri öfkeyle geri döndü: \"Senden aldığım mal ilk kullanışta elimde paramparça oldu! Bunun hesabını ver.\"",
    when: (p) => Object.values(p.inv_q || {}).some((q) => (q.kusurlu || 0) > 0),
    choices: [
      { label: "Parasını iade et", delta: { money: -10, reputation: 5, honor: 4 }, result: "Zararını karşıladın; dürüstlüğün çarşıda konuşuldu." },
      { label: "Suçu ona at", delta: { reputation: -6, fear: 2, nam: { zalim: 2 } }, result: "Adamı kapı dışarı ettin; ama dedikodun kötü yayıldı." },
    ],
  },
  {
    id: "usta_siparis", icon: "anvil", title: "Usta İşi Sipariş",
    text: "Varlıklı bir bey kapına geldi: yalnız usta ellerden çıkacak, ince işçilik isteyen bir sipariş için seni arıyor.",
    when: (p) => p.skills.crafting >= 5,
    choices: [
      { label: "Siparişi al (zahmetli)", delta: { money: 35, reputation: 5, honor: 3 }, result: "Geceni gündüzüne kattın; ortaya çıkan eser beyi mest etti, adın ustalıkla anıldı." },
      { label: "Vaktim yok", delta: {}, result: "Bey omuz silkip başka kapı aradı." },
    ],
  },
  {
    id: "dost_rakip", icon: "family", title: "İki Arada",
    text: "Bir dostunun eski rakibi sana yanaşıp kulağına fısıldıyor: \"Onun yerine benim safımda dur, kazançlı çıkarsın.\"",
    when: (p) => p.age >= 15,
    choices: [
      { label: "Dostuna sadık kal", delta: { honor: 6, reputation: 3, nam: { mert: 3 } }, result: "Sözünden dönmedin; sadakatin dostunun gönlünde taht kurdu." },
      { label: "Çıkarına bak", delta: { money: 12, honor: -5, reputation: -2 }, result: "Cebin doldu ama vefasızlığın el altından konuşuldu." },
    ],
  },
  // ── Yeni yaşam dilimleri: evlilik, ebeveynlik, at/yol, ihtiyarlık, lonca, çocukluk, valilik ──
  {
    id: "es_kusluk", icon: "family", title: "Ocakta Soğukluk",
    text: "Eşinle küçük bir mesele büyüdü; iki gündür evde sözler kısa, bakışlar uzak.",
    when: (p) => p.married,
    choices: [
      { label: "İlk adımı at", delta: { honor: 3, nam: { mert: 2 } }, result: "Gururu bir yana koydun; sofra yeniden ısındı, evin içi aydınlandı." },
      { label: "İnat et", delta: { fear: 2, honor: -2 }, result: "Sen sustun, o sustu; soğukluk günlerce evin içinde dolaştı." },
    ],
  },
  {
    id: "es_hediye", icon: "gems", title: "Unutulan Gün",
    text: "Evlendiğiniz günün yıl dönümü yaklaşıyor. Kesende bir hediyelik akçe var ama ay sonu da yakın.",
    when: (p) => p.married && p.money >= 25,
    choices: [
      { label: "Hediye al", delta: { money: -20, reputation: 3, nam: { comert: 3 } }, result: "Küçük bir armağan, büyük bir tebessüm; komşular bile bahsetti." },
      { label: "Bu yıl olmasın", delta: { honor: -2 }, result: "Gün sessiz geçti; kimse bir şey demedi ama bir şey eksikti." },
    ],
  },
  {
    id: "evlat_yalan", icon: "baby", title: "Küçük Yalan",
    text: "Evladının komşunun bahçesinden meyve aşırdığını öğrendin; üstelik sorulunca inkâr etti.",
    when: (p) => p.children.length >= 1,
    choices: [
      { label: "Karşısına otur, konuş", delta: { honor: 4, nam: { dindar: 2 } }, result: "Bağırmadan anlattın; çocuk hem utandı hem anladı. Komşuya da helallik dilendi." },
      { label: "Üstünü ört", delta: { honor: -3, fear: 1 }, result: "Meseleyi kapattın; ama çocuk yanlışın bedelsiz olduğunu da öğrendi." },
    ],
  },
  {
    id: "cocuk_hayal", icon: "star", title: "Evladının Hayali",
    text: "Evladın gözleri parlayarak bir hayalini açtı; hevesini beslemek biraz akçe ister.",
    when: (p) => p.children.length >= 1 && p.money >= 20,
    choices: [
      { label: "Hevesini destekle", delta: { money: -15, reputation: 2, nam: { comert: 2 } }, result: "Küçük bir masrafla büyük bir sevinç aldın; evladın bunu hiç unutmayacak." },
      { label: "Ayakları yere bassın", delta: { honor: 1 }, result: "Hayal başka, hayat başka dedin; çocuk sustu ama gözlerindeki ışık biraz söndü." },
    ],
  },
  {
    id: "at_nal", icon: "camel", title: "Nalsız Yol",
    text: "Atın nalını attı; nalbant ücret istiyor ama yol da seni bekliyor.",
    when: (p) => !!p.horse && p.money >= 15,
    choices: [
      { label: "Nalbanta uğra", delta: { money: -12 }, result: "Atın sağlam nallarla yola koyuldu; yol boyu içinden 'iyi ki' dedin." },
      { label: "Böyle de gider", delta: { health: -5 }, result: "Yarı yolda at aksadı; düşe kalka vardın, her yanın ağrıyor." },
    ],
  },
  {
    id: "yasli_nasihat", icon: "prayer-beads", title: "Nasihat İsteyen Genç",
    text: "Mahalleden bir genç, hayat yolunu sormak için kapına geldi; gözünde saygı, elinde küçük bir armağan.",
    when: (p) => p.age >= 55,
    choices: [
      { label: "Bildiğini paylaş", delta: { reputation: 4, nam: { dindar: 2 } }, result: "Bir ömrün dersini bir akşamda anlattın; genç, elini öpüp ayrıldı." },
      { label: "Bedava akıl olmaz", delta: { money: 10, reputation: -3 }, result: "Nasihatin ücretini aldın; genç teşekkür etti ama mahallede tuhaf karşılandı." },
    ],
  },
  {
    id: "yasli_eskidost", icon: "coins", title: "Eski Defter",
    text: "Yıllar önce borç verdiğin eski bir dost kapına geldi; unuttuğun alacağı ödemeye gelmiş.",
    when: (p) => p.age >= 60,
    choices: [
      { label: "Helal olsun de", delta: { honor: 8, nam: { comert: 4 } }, result: "Defteri gönlünle kapattın; dostun gözleri doldu, hakkını helal etti." },
      { label: "Faiziyle al", delta: { money: 30, reputation: -4, nam: { zalim: 3 } }, result: "Eski hesabı diniyle günüyle tahsil ettin; dostluk defteri de kapandı." },
    ],
  },
  {
    id: "lonca_oy", icon: "crown", title: "Loncada Oylama",
    text: "Loncanda başa kimin geçeceği oylanıyor: yaşlı usta mı, ateşli genç mi? Sözün geçiyor.",
    when: (p) => !!p.faction,
    choices: [
      { label: "Ustadan yana dur", delta: { standing: 8, honor: 2 }, result: "Tecrübeye oy verdin; ocakta ağırbaşlılığınla anıldın." },
      { label: "Genci destekle", delta: { standing: -4, fear: 3, fame: 2 }, result: "Değişimden yana durdun; kimi alkışladı, eskiler ise not aldı." },
    ],
  },
  {
    id: "cirak_hata", icon: "anvil", title: "Çırağın Hatası",
    text: "Yanında çalışan çırak pahalı bir malzemeyi ziyan etti; suçu üstlenmekten korkup titriyor.",
    when: (p) => p.skills.crafting >= 3 && p.money >= 20,
    choices: [
      { label: "Zararı sen üstlen", delta: { money: -15, honor: 5, nam: { comert: 3 } }, result: "Zarar senin kesenden çıktı ama çırağın gözünde bir dağ kadar büyüdün." },
      { label: "Çıraktan kes", delta: { fear: 3, reputation: -2, nam: { zalim: 2 } }, result: "Bedelini ona ödettin; iş öğrendi belki ama sevgi öğrenmedi." },
    ],
  },
  {
    id: "cocukluk_kus", icon: "leaf", title: "Kanadı Kırık Kuş",
    text: "Dere kenarında kanadı kırık bir kuş buldun; arkadaşların sapan taşı için toplanmış bakıyor.",
    when: (p) => p.age < 13,
    choices: [
      { label: "Kuşa bak", delta: { honor: 2, nam: { comert: 2 } }, result: "Kuşu sarıp sarmaladın; günler sonra pencereden uçup gitti, içinde tatlı bir sızı kaldı." },
      { label: "Sapanı kap", delta: { fear: 1, nam: { zalim: 2 } }, result: "Taş attın, kuş kaçtı; arkadaşlar güldü ama içinde bir yer buruştu." },
    ],
  },
  {
    id: "cocukluk_kese", icon: "coins", title: "Düşen Kese",
    text: "Pazar kalabalığında bir tüccarın kesesi düştü; kimse görmedi, sen gördün.",
    when: (p) => p.age < 13,
    choices: [
      { label: "Koş, yetiştir", delta: { money: 2, honor: 4, reputation: 2 }, result: "Keseyi sahibine ulaştırdın; tüccar başını okşayıp eline birkaç akçe sıkıştırdı." },
      { label: "Cebe at", delta: { money: 8, honor: -4 }, result: "Kese cebinde eridi; kimse görmedi ama sen biliyorsun." },
    ],
  },
  {
    id: "vali_dilek", icon: "scroll", title: "Kapıdaki Köylü",
    text: "Yönettiğin şehirden yaşlı bir köylü, koca bir yol tepip derdini anlatmaya kapına gelmiş.",
    when: (p) => (p.governorships || []).length >= 1,
    choices: [
      { label: "İçeri al, dinle", delta: { money: -10, reputation: 4, honor: 3 }, result: "Derdini dinleyip elinden tuttun; köyüne 'vali bizi görüyor' diye döndü." },
      { label: "Kapıdan çevir", delta: { fear: 2, reputation: -3 }, result: "Vaktin yok dedin; köylü boynu bükük döndü, kapındaki nöbetçi bile üzüldü." },
    ],
  },
  {
    id: "cocuk_kus", icon: "leaf", title: "Kanadı Kırık Kuş",
    text: "Dere kenarında kanadı kırık bir kuş buldun; kuşçu 'üç akçe veririm' diyor.",
    when: (p) => p.age >= 7 && p.age < 13,
    choices: [
      { label: "Sar, sağalt, uçur", delta: { honor: 3, nam: { mert: 1 } }, result: "Haftalarca ekmek kırıntısıyla besledin; bir sabah avucundan havalandı. Gökyüzünde senin de bir payın oldu." },
      { label: "Kuşçuya sat", delta: { money: 3 }, result: "Üç akçe kesende şıngırdadı; kafesin önünden geçerken gözlerini kaçırdın." },
    ],
  },
  {
    id: "genc_muhurlu_mektup", icon: "scroll", title: "Mühürlü Mektup",
    text: "Kadıya mühürlü bir mektup götürüyorsun; handa bir yabancı 'içindekini söyle, kese senin' diye fısıldıyor.",
    when: (p) => p.age >= 15 && p.age < 25,
    choices: [
      { label: "Mühre dokunmadan teslim et", delta: { honor: 5, nam: { mert: 2 } }, result: "Mektup mühürlü ulaştı; kadı yüzüne bakıp 'emin adammışsın' dedi. Bazı keseler alınmaz, taşınır." },
      { label: "Buharda aç, sat", delta: { money: 25, honor: -6, fear: 1, nam: { zalim: 2 } }, result: "Kese doldu ama mühür bir daha eskisi gibi oturmadı; kadının kâtibi sana uzun uzun baktı." },
    ],
  },
  {
    id: "orta_yangin_iki_kapi", icon: "flame", title: "Yangında İki Kapı",
    text: "Çarşıda yangın! Alev bir yanda senin tezgâhını, öbür yanda yaşlı hasırcının dükkânını yalıyor. İkisine birden yetişemezsin.",
    when: (p) => p.age >= 30,
    choices: [
      { label: "Yaşlının dükkânına koş", delta: { honor: 6, money: -20, reputation: 5, nam: { mert: 3 } }, result: "Hasırcının ocağını söndürdün; kendi tezgâhından geriye is kaldı. Çarşı o günü unutmadı: zarar senin, ad senin." },
      { label: "Kendi tezgâhını kurtar", delta: { money: 15 }, result: "Malını alevden çekip aldın. Hasırcı küllerin başında sessizce oturuyordu; kimse bir şey demedi, demesine gerek de yoktu." },
    ],
  },
  {
    id: "yasli_sandik", icon: "amphora", title: "Sandıktaki Mektuplar",
    text: "Tavan arasındaki sandıktan gençliğinde yazıp gönderemediğin mektuplar çıktı; torunlar merakla bakıyor.",
    when: (p) => p.age >= 60,
    choices: [
      { label: "Ocak başında oku", delta: { reputation: 2, health: 1 }, result: "Mektuplar ocak başında bir bir okundu; gülen de oldu, gözü dolan da. O gece sandık değil, yürek boşaldı." },
      { label: "Ateşe ver, geçmiş geçmişte kalsın", delta: { honor: 1 }, result: "Kâğıtlar alevde kıvrıldı; kokusu bir an gençliğini getirdi, sonra duman oldu. Bazı sözler sahibiyle gider." },
    ],
  },
  {
    id: "cocuk_firtina", icon: "sheep", title: "Fırtına Gecesi",
    text: "Gece bastıran fırtınada komşunun kuzusu dışarıda kalmış; meleme sesi rüzgârı deliyor. Büyükler uyuyor.",
    when: (p) => p.age >= 7 && p.age < 13,
    choices: [
      { label: "Gizlice çık, kuzuyu kurtar", delta: { honor: 4, health: -3, nam: { mert: 2 } }, result: "Sırılsıklam döndün ama kuzu kucağındaydı. Komşu sabah kapıya geldi; adın 'yürekli' kaldı." },
      { label: "Yorganın altında kal", delta: { health: 1 }, result: "Sabah kuzu ahırın saçağında bulundu — üşümüş ama sağ. İçinde küçük bir eziklik kaldı." },
    ],
  },
  {
    id: "genc_suclama", icon: "scales", title: "Suçu Yüklenen",
    text: "Çarşıda devrilen küfeler senin dikkatsizliğindi; ama suçu yanındaki arkadaşın üstlendi. Esnaf ondan tazminat istiyor.",
    when: (p) => p.age >= 14 && p.age < 22,
    choices: [
      { label: "Öne çık, doğruyu söyle", delta: { honor: 8, reputation: -4, nam: { mert: 3 } }, result: "Bedelini sen ödedin; kimi güldü, kimi şapka çıkardı. Arkadaşın o günden sonra yanından ayrılmadı." },
      { label: "Sus, bırak o ödesin", delta: { fear: 2, honor: -5 }, result: "Sustun. Arkadaşın borcunu ödedi, sana bir şey demedi — ama bakışı eskisi gibi değil." },
    ],
  },
  {
    id: "yetiskin_kuyu", icon: "bucket", title: "Ortak Kuyu",
    text: "Kurak yazda sınırdaki kuyu tartışma çıkardı: komşu, suyun çoğunu senin çektiğini söylüyor. Muhtar ikinizi de dinliyor.",
    when: (p) => p.age >= 22 && p.age < 55,
    choices: [
      { label: "Nöbet düzeni öner, ilk hakkı ona ver", delta: { reputation: 6, honor: 3, money: -10 }, result: "Kuyuya nöbet çizelgesi asıldı; ilk kova onun. Muhtar 'akıl bunda' dedi; komşuluk kurtuldu." },
      { label: "Kuyu benim tarafımda, diren", delta: { money: 8, reputation: -5, fear: 2 }, result: "Sınır taşı senden yana çıktı; su senin. Ama komşunun selamı kesildi, kapısı sana kapandı." },
    ],
  },
  {
    id: "yetiskin_gurbetci", icon: "backpack", title: "Gurbetten Dönen",
    text: "Çocukluk arkadaşın gurbetten eli boş döndü; utana sıkıla bir sermaye istiyor: 'Bir tezgâh kurayım, ödeyeceğim.'",
    when: (p) => p.age >= 25 && p.age < 60,
    choices: [
      { label: "Sermayeyi ver", delta: { money: -35, reputation: 3, nam: { comert: 3 } }, result: "Keseyi uzattın; gözleri doldu. 'Bu iyiliği unutmam' dedi — gurbet görmüş adamın sözü ağırdır." },
      { label: "Kibarca geri çevir", delta: { honor: -2 }, result: "Elin varmadı ama kesen de el vermedi. Arkadaşın anlayışla başını salladı; içinde ufak bir burukluk kaldı." },
    ],
  },
  {
    id: "orta_sirdas", icon: "hood", title: "Sırdaş",
    text: "Yakın dostun sana açıldı: sevdiğiyle başka diyara kaçacaklar; ailesi kızı zorla başkasına verecekmiş. 'Kimseye söyleme' dedi.",
    when: (p) => p.age >= 28 && p.age < 55,
    choices: [
      { label: "Sırrı tut", delta: { honor: 3, fear: 2, nam: { mert: 2 } }, result: "Bir sabah ikisi de yoktu. Aileler kapını aşındırdı; sen sustun. Sözün senettir artık — ama gözler üstünde." },
      { label: "Kızın ailesine haber ver", delta: { reputation: 4, honor: -4 }, result: "Kaçış son gece bozuldu. Aile sana dua etti, kasaba 'sağduyulu' dedi — dostun ise bir daha yüzüne bakmadı." },
    ],
  },
  {
    id: "yasli_cinar", icon: "leaf", title: "Meydandaki Çınar",
    text: "Gençliğinde diktiğin çınar meydanı gölgeliyor; ama kökleri çeşmenin yolunu tıkamış. Kasaba keselim diyor — ustalar 'kökü çevirmek pahalı' diyor.",
    when: (p) => p.age >= 55,
    choices: [
      { label: "Ustaların parasını öde, çınarı kurtar", delta: { money: -30, reputation: 5, fame: 3 }, result: "Kökler taş olukla çevrildi; su yeniden aktı, çınar yerinde kaldı. Gölgesinde oturanlar adını anıyor." },
      { label: "Bırak kessinler, odunu payına düşsün", delta: { money: 12 }, result: "Balta sesleri bir gün sürdü. Kışlık odunun çıktı; ama meydan artık yazın gölgesiz." },
    ],
  },
  {
    id: "genc_at_yarisi", icon: "compass", title: "Beyzadenin Atı",
    text: "Beyzade, panayır yarışında kendi atını sürmen için seni seçti: 'Kaybedersen adını unuturum, kazanırsan herkes öğrenir.'",
    when: (p) => p.age >= 14 && p.age < 22,
    choices: [
      { label: "Eyere atla, yarışa gir", delta: { health: -3, fame: 4, nam: { mert: 2 } }, result: "Toza karışıp uçtun; kazanamasan da düşmeden bitirdin, meydan adını aldı. Beyzade eyer kayışını sana bıraktı." },
      { label: "Atı tımarla, yarışı ona bırak", delta: { money: 8, reputation: 2 }, result: "Atı sen hazırladın, yarışı o kazandı; kesesinden payını ayırdı. Herkes bilir: at kazanır, seyis yetiştirir." },
    ],
  },
  {
    id: "genc_usta_sirri", icon: "anvil", title: "Ustanın Sırrı",
    text: "Rakip dükkânın kalfası seni kuytuda buldu: ustanın meşhur işinin sırrını satarsan kese dolusu akçe senin.",
    when: (p) => p.age >= 15 && p.age < 24 && p.profession !== "işsiz",
    choices: [
      { label: "Reddet, ustana söyle", delta: { honor: 6, reputation: 3, nam: { mert: 2 } }, result: "Ustan dinledi, uzun uzun sustu; sonra tezgâhın anahtarını sana uzattı: 'Sır zaten sendeymiş.'" },
      { label: "Sırrı sat, keseyi al", delta: { money: 20, honor: -6, fear: 1 }, result: "Akçe cebe girdi ama çarşıda iki dükkân aynı işi yapar oldu; ustanın bakışlarından kaçar oldun." },
    ],
  },
  {
    id: "orta_terazi", icon: "scales", title: "Eksik Tartan Terazi",
    text: "Pazarda zahire aldığın tüccarın terazisinin hileli olduğunu fark ettin — herkesten eksik tartıyor. Adam senin de eski alacaklın.",
    when: (p) => p.age >= 28 && p.age < 50,
    choices: [
      { label: "Kadıya bildir, çarşıyı koru", delta: { reputation: 5, honor: 4, nam: { mert: 2 } }, result: "Terazi meydanda kırıldı, esnaf sana dua etti. Alacağın yandı ama adın 'doğru insan' diye anılır oldu." },
      { label: "Sus, alacağına say", delta: { money: 12, honor: -4 }, result: "Adam alacağını fazlasıyla kapattı; terazi eksik tartmaya devam etti. Kazandın ama pazar kaybetti." },
    ],
  },
  {
    id: "orta_komsu_duvar", icon: "house", title: "Komşunun Duvarı",
    text: "Komşun avlu duvarını yenilerken iki karış senin tarafına taşırdı. Kadıya gitsen kazanırsın; ama adam kışın çocuğuna kaftanını sermiş biri.",
    when: (p) => p.age >= 30 && p.age < 55 && p.properties.length >= 1,
    choices: [
      { label: "Tatlı dille konuş, sınırı düzelttir", delta: { reputation: 4, honor: 3 }, result: "Adam kızardı, güldü, duvarı kendi eliyle geri aldı. Kahveniz o akşam onun avlusunda içildi." },
      { label: "İki karışı hediye say", delta: { money: -15, reputation: 6, nam: { comert: 2 } }, result: "'Duvar senin olsun, gölgesi bize yeter' dedin. Söz mahallede dolaştı; iki karış toprak, iki kat hayır dua getirdi." },
    ],
  },
];

// ── Şenlikler: yılın nabzı — sabit aylarda dönen mevsim sahneleri. ──
// Takvim (calendar.ts): turn % 12 → 0=Ocak … 11=Aralık. Nevruz = Mart (2), Hasat Şenliği = Ağustos (7), Kış Meclisi = Aralık (11).
// Her şenliğin çocuk (<16) ve yetişkin (16+) varyantı var — 7 yaşındaki sofra kurmaz, ateşten atlar.
// Ödüller küçük ve yılda bir (festival_turn kilidi applyDilemma'da) — farm edilemez.
export const FESTIVALS: { month: number; variants: Dilemma[] }[] = [
  {
    month: 2,
    variants: [
      {
        id: "fest_nevruz_c", icon: "flame", title: "Nevruz Ateşi",
        text: "Bahar geldi; meydanda Nevruz ateşi yandı. Büyük çocuklar birer birer üstünden atlıyor.",
        when: (p) => p.age < 16,
        choices: [
          { label: "Ateşin üstünden atla", delta: { health: -2, fame: 2, nam: { mert: 2 } }, result: "Alev eteğini yaladı ama atladın; meydan alkışladı, adın cesura çıktı." },
          { label: "Kenardan seyret", delta: { hunger: 4 }, result: "Ateşi uzaktan izledin; dağıtılan lokmadan payını alıp gecenin tadını çıkardın." },
        ],
      },
      {
        id: "fest_nevruz_c2", icon: "party", title: "Nevruz Boyaları",
        text: "Meydanda yumurta boyanıyor, tokuşturma yarışı başlıyor. Senin yumurtan sapasağlam — herkes tokuşmak istiyor.",
        when: (p) => p.age < 16,
        choices: [
          { label: "Yarışa gir, hepsini tokuştur", delta: { hunger: 6, nam: { capkin: 1 } }, result: "Yumurtan üç meydan gezdi kırılmadı; kazandığın boyalı yumurtalarla eve döndün, dillere destan oldun." },
          { label: "Yumurtanı küçük kardeşe ver", delta: { honor: 2, nam: { comert: 2 } }, result: "Küçüğün gözleri parladı; senin yumurtanla yarışı o kazandı. Zaferi onundu, sevabı senin." },
        ],
      },
      {
        id: "fest_nevruz", icon: "flame", title: "Nevruz",
        text: "Yeni yılın ateşi yandı; komşular meydanda. Böyle günde el açık, gönül ferah gerek derler.",
        when: (p) => p.age >= 16,
        choices: [
          { label: "Sofra kur, konu komşuyu doyur", delta: { money: -30, reputation: 5, nam: { comert: 4 } }, result: "Kapını açtın, kazanın kaynadı; mahalle senin sofranda yeni yıla girdi." },
          { label: "Ocağının başında dua et", delta: { honor: 4, nam: { dindar: 3 } }, result: "Kalabalığa karışmadın; ocağının başında geçen yıla şükredip yenisine niyet ettin." },
        ],
      },
      {
        id: "fest_nevruz_2", icon: "crossed-swords", title: "Nevruz Güreşleri",
        text: "Meydanda er meydanı kuruldu; davul vuruyor, pehlivanlar yağlanıyor. Tellal seni de çağırıyor: 'Var mısın?'",
        when: (p) => p.age >= 16,
        choices: [
          { label: "Soyun, er meydanına çık", delta: { health: -3, fame: 3, nam: { mert: 2 } }, result: "Sırtın yere gelse de gelmese de meydan seni alkışladı; Nevruz'da güreşen unutulmaz." },
          { label: "Davul ekibine katıl, coştur", delta: { reputation: 2, nam: { capkin: 1 } }, result: "Tokmak elinde akşama dek vurdun; güreşten çok davulun konuşuldu, gülen gözler seni buldu." },
        ],
      },
      {
        id: "fest_nevruz_3", icon: "flame", title: "Ateşten Atlayış",
        text: "Nevruz ateşi dizildi; delikanlılar sıra sıra atlıyor. 'Dert ateşte kalır' diye bağırıyor ihtiyarlar. Sıra sende.",
        when: (p) => p.age >= 16,
        choices: [
          { label: "Ateşten atla", delta: { health: -2, fame: 2, nam: { mert: 1 } }, result: "Alev eteğini yaladı ama öte yakaya gülerek indin; 'dertlerin ateşte kaldı' diye bağrıştı meydan." },
          { label: "Köz başında kestane dağıt", delta: { money: -10, reputation: 3, nam: { comert: 2 } }, result: "Atlamayanlara köz kestanesi dağıttın; avuçlar ısındı, adın tatlı anıldı." },
        ],
      },
      {
        id: "fest_nevruz_4", icon: "party", title: "Yumurta Tokuşu",
        text: "Nevruz sabahı boyalı yumurtalar tokuşuyor; kasabanın yenilmezi ortada, elinde geçen yılın şampiyonu. Sıra sende.",
        when: (p) => p.age >= 14,
        choices: [
          { label: "Tokuştur", delta: { fame: 2, nam: { mert: 1 } }, result: "Ustaca bir vuruşla yenilmezin yumurtası çatladı; meydan güldü, adın bir bahar boyu anıldı." },
          { label: "Sıranı çocuğa ver", delta: { reputation: 2, nam: { comert: 1 } }, result: "Sıranı küçük bir çocuğa verdin; yumurta çatladığında sanki sen kazanmış gibi sevindin." },
        ],
      },
      {
        id: "fest_nevruz_5", icon: "party", title: "Bahar Salıncağı",
        text: "Nevruz'da meydandaki ulu dala urgan atılmış, salıncak kurulmuş; büyük küçük sıraya girmiş, urganı çekecek güçlü kol aranıyor.",
        when: (p) => p.age >= 14,
        choices: [
          { label: "Urganı sen çek", delta: { reputation: 2, nam: { comert: 1 } }, result: "Akşama dek salıncak salladın; çocuk kahkahaları meydanı doldurdu, kolun düştü ama gönlün şen." },
          { label: "Sıraya gir, doyasıya sallan", delta: { fame: 1 }, result: "Göğe değecek gibi sallandın; bir an her şey hafifledi — Nevruz dediğin bu." },
        ],
      },
    ],
  },
  {
    month: 7,
    variants: [
      {
        id: "fest_hasat_c", icon: "wheat", title: "Harman Şenliği",
        text: "Harman kalktı, köy meydanında şenlik var. Çocuklar başak toplama yarışına diziliyor.",
        when: (p) => p.age < 16,
        choices: [
          { label: "Yarışa katıl", delta: { money: 6, hunger: -4 }, result: "Ter döktün ama kucağın başak doldu; harman ağası avucuna birkaç akçe sıkıştırdı." },
          { label: "Davulcunun peşine takıl", delta: { hunger: 6, fame: 1 }, result: "Gün boyu davulun peşinde teptin; pilavdan payını kaptın, herkes seni tanıdı." },
        ],
      },
      {
        id: "fest_hasat_c2", icon: "sheep", title: "Harman Atlaması",
        text: "Saman yığınları dağ gibi; büyük çocuklar en tepeden atlıyor. Sıra sana geldi, aşağıda herkes bakıyor.",
        when: (p) => p.age < 16,
        choices: [
          { label: "En tepeden atla", delta: { health: -2, fame: 2, nam: { mert: 1 } }, result: "Havada bir an asılı kaldın; samana gömüldüğünde meydan alkıştan yıkılıyordu. Dizin sıyrıldı, adın büyüdü." },
          { label: "Aşağıda gözleme kuyruğuna gir", delta: { hunger: 5 }, result: "Sıcak gözleme, taze kaymak; atlayanlar acıkınca sana imrendi. Herkesin şenliği kendine." },
        ],
      },
      {
        id: "fest_hasat", icon: "wheat", title: "Hasat Şenliği",
        text: "Harman sonu şenliği kuruldu: yağlı güreş, kazan kazan pilav. Er meydanı seni de çağırıyor.",
        when: (p) => p.age >= 16,
        choices: [
          { label: "Güreşe çık", delta: { health: -5, fame: 4, nam: { mert: 3 } }, result: "Er meydanında ter döktün; sırtın yere gelse de gelmese de, yiğitliğin dillere düştü." },
          { label: "Kese aç, davul kirala", delta: { money: -25, fame: 3, nam: { comert: 3 } }, result: "Şenliğin davulu senin akçenle gümledi; köylü o geceyi senin adınla andı." },
        ],
      },
      {
        id: "fest_hasat_2", icon: "coins", title: "Harman Pazarı",
        text: "Harman sonrası pazar taştı; kervanlar erken mal kapatıyor. Bir yanda tezgâh fırsatı, bir yanda imeceye çağıran komşular.",
        when: (p) => p.age >= 16,
        choices: [
          { label: "Tezgâh aç, kervanlara sat", delta: { money: 18, nam: { capkin: 1 } }, result: "Gün batmadan tezgâh boşaldı; kesen şenlik akşamına dolu girdi." },
          { label: "İmeceye omuz ver", delta: { reputation: 5, nam: { comert: 3 }, hunger: 4 }, result: "Dul kadının harmanı senin kolunla kalktı; akşam sofrasında baş köşe senindi." },
        ],
      },
      {
        id: "fest_hasat_3", icon: "wheat", title: "Son Demet",
        text: "Tarladaki son demeti biçme şerefi kavga konusu oldu; iki delikanlı birbirine girmek üzere. Orakçılar sana bakıyor.",
        when: (p) => p.age >= 16,
        choices: [
          { label: "Demeti ikiye böl, ikisine de ver", delta: { reputation: 3, honor: 2 }, result: "Orağı alıp demeti ortadan böldün; iki eve de bereket girdi, kavga gülüşmeye döndü. 'Aklıselim' dediler." },
          { label: "Yarıştır: kim önce varırsa onun", delta: { fame: 2, nam: { capkin: 1 } }, result: "İki delikanlıyı tarla başına dizdin; koşu şenliğe döndü, kazanan demeti havaya kaldırdı. Gülen kazandı, küsen kalmadı." },
        ],
      },
      {
        id: "fest_hasat_4", icon: "wheat", title: "İmece Sofrası",
        text: "Harman sonu imece sofrası kuruluyor; kazanlar kaynıyor, kepçe başı boş, el eksik.",
        when: (p) => p.age >= 14,
        choices: [
          { label: "Kepçe başına geç", delta: { reputation: 2, nam: { comert: 1 } }, result: "Akşama kadar kepçe salladın; herkes doyunca sofranın bereketi senin adınla anıldı." },
          { label: "Sofraya kuzu bağışla", delta: { money: -15, fame: 2, nam: { comert: 2 } }, result: "Kazana kuzu düştü; imece sofrası bayram sofrasına döndü, dualar peş peşe geldi." },
        ],
      },
      {
        id: "fest_hasat_5", icon: "wheat", title: "Son Araba",
        text: "Harmandan dönen son araba yolda dingilini kırdı; akşam iniyor, saplar yolda kalmış.",
        when: (p) => p.age >= 14,
        choices: [
          { label: "Omuz ver, arabayı kurtar", delta: { reputation: 2, nam: { mert: 1 } }, result: "Dingil bağlandı, saplar ambara girdi; arabacı hakkını helal etti, harman tam kapandı." },
          { label: "Köye haber sal", delta: { reputation: 1 }, result: "Köyden el geldi, yük paylaşıldı; sen koşturan ayak oldun, adın anıldı." },
        ],
      },
    ],
  },
  {
    month: 11,
    variants: [
      {
        id: "fest_kis_c", icon: "book", title: "Kış Gecesi",
        text: "Kar kapıyı kapattı; ocak başında uzun gece. Yaşlılar masal anlatıyor, dışarıda kartopu savaşı var.",
        when: (p) => p.age < 16,
        choices: [
          { label: "Masal dinle", delta: { honor: 2 }, result: "Dizinin dibinde masal dinledin; dedenin sesi yüreğine, masalın hikmeti aklına işledi." },
          { label: "Kartopu savaşına koş", delta: { health: -1, hunger: -5, fame: 1 }, result: "Yanakların kızarana dek koştun; eve buz gibi ama kahkahayla döndün." },
        ],
      },
      {
        id: "fest_kis_c2", icon: "star", title: "Bilmece Gecesi",
        text: "Kış meclisinde bilmece sırası çocuklara geldi; kazanana ihtiyar dedenin kesesinden gümüş bir düğme var.",
        when: (p) => p.age < 16,
        choices: [
          { label: "Kafanı yor, bilmeceleri çöz", delta: { stat_points: 1 }, result: "Üç bilmeceyi üst üste çözdün; dede düğmeyi avucuna bastırıp 'bu kafa boşa gitmesin' dedi." },
          { label: "Kestane koşusuna geç", delta: { hunger: 5, nam: { comert: 1 } }, result: "Ocaktan patlayan kestaneleri kapıp meclise dağıttın; bilmeceyi bilemedin ama geceyi sen tatlandırdın." },
        ],
      },
      {
        id: "fest_kis", icon: "book", title: "Kış Meclisi",
        text: "Uzun kış gecesi; ocak başı meclisi kuruldu. Söz sırayla dolaşıyor — dinleyen çok, anlatan az.",
        when: (p) => p.age >= 16,
        choices: [
          { label: "Sen anlat", delta: { fame: 3, reputation: 2 }, result: "Söz sende döndü; başından geçeni öyle anlattın ki meclis dağılana dek adın anıldı." },
          { label: "Ocağına misafir al", delta: { money: -15, reputation: 4, nam: { comert: 2 } }, result: "Yolda kalmışı ocağına buyur ettin; çorbanı bölüştün, duasını aldın." },
        ],
      },
      {
        id: "fest_kis_2", icon: "book", title: "Meddah Gecesi",
        text: "Kış meclisine gezgin bir meddah düştü; ocak başında hikâye hikâyeye ekleniyor. Sıra sana gelince meclis sustu.",
        when: (p) => p.age >= 16,
        choices: [
          { label: "Kendi başından geçeni anlat", delta: { fame: 4, nam: { capkin: 1 } }, result: "Hikâyen meddahı bile sarstı; 'bunu ben anlatacağım diyar diyar' dedi. Adın kış yollarına çıktı." },
          { label: "Sözü gençlere bırak", delta: { honor: 3, reputation: 2 }, result: "Utangaç bir çırak senin bakışınla cesaret buldu, meclisi güldürdü. Büyüklük bazen susmaktır." },
        ],
      },
      {
        id: "fest_kis_3", icon: "house", title: "Karda Kalan Yolcu",
        text: "Kış meclisi dağılırken kapına karla kaplı bir yolcu vurdu; hanlar dolu, tipi bastırıyor.",
        when: (p) => p.age >= 16,
        choices: [
          { label: "İçeri al, sofranı paylaş", delta: { money: -8, honor: 3, nam: { comert: 2, dindar: 1 } }, result: "Yolcu ocağının başında çözüldü; bir kâse çorbaya bir gece hikâye anlattı, sabah dualarla yola düştü." },
          { label: "Ahırı göster, battaniye ver", delta: { reputation: 1 }, result: "Samanlığa yer, sırtına battaniye verdin; kapı arası da olsa tipide dam damdır. Yolcu minnetle uyudu." },
        ],
      },
      {
        id: "fest_kis_4", icon: "flame", title: "Helva Gecesi",
        text: "Kış meclisinin helva gecesi: kazan ateşte, tahta kaşık elden ele geziyor, sıra sana geliyor.",
        when: (p) => p.age >= 14,
        choices: [
          { label: "Helvayı sen kavur", delta: { reputation: 2 }, result: "Kaşığı devrettiğinde helva kokusu sokağa taşmıştı; eline sağlık sesleri geceyi ısıttı." },
          { label: "Kavrulurken hikâye anlat", delta: { fame: 2 }, result: "Helva dönerken sen de bir hikâye döndürdün; kaşık durdu, kulaklar sende kaldı." },
        ],
      },
      {
        id: "fest_kis_5", icon: "flame", title: "Kar Feneri",
        text: "Kış meclisine gelenler için yol zifiri karanlık; ihtiyarlar mescit yolunda fener eksikliğinden yakınıyor.",
        when: (p) => p.age >= 14,
        choices: [
          { label: "Fenerini yol boyuna as", delta: { money: -6, honor: 2, nam: { dindar: 1 } }, result: "Fenerin geceyi böldü; meclise gelen her ihtiyar kapıda sana dua etti." },
          { label: "Kapı kapı fenerci topla", delta: { reputation: 2 }, result: "Beş kapıdan beş fener çıktı; yol ışıl ışıl, meclis her zamankinden kalabalıktı." },
        ],
      },
    ],
  },
];
// Bu ayın şenliğini döndür (varsa ve henüz çözülmediyse). Sabit ay → yılda bir; kilit applyDilemma'da kurulur.
export function pickFestival(s: GameState): Dilemma | null {
  const p = s.player;
  if (p.dead) return null;
  if (p.festival_turn === s.turn) return null; // bu ayın şenliği çözüldü
  const f = FESTIVALS.find((x) => x.month === s.turn % 12);
  if (!f) return null;
  const uygun = f.variants.filter((d) => !d.when || d.when(p));
  return uygun.length ? uygun[Math.floor(Math.random() * uygun.length)] : null;
}

// Tura göre bir ikilem seç (deterministik değil; çağıran olasılıkla tetikler).
export function pickDilemma(s: GameState): Dilemma | null {
  const p = s.player;
  if (p.dead) return null;
  // Tekrar koruması: son görülen ikilemler (ring 6) havuz dışı — havuz tümüyle tükenirse yoksayılır (kilitlenme yok).
  const recent = s.recent_dilemmas || [];
  let pool = DILEMMAS.filter((d) => (!d.when || d.when(p)) && !recent.includes(d.id));
  if (pool.length === 0) pool = DILEMMAS.filter((d) => !d.when || d.when(p));
  if (pool.length === 0) return null;
  // Kimliğe tepki veren olaylar daha ağırlıklı: dünyanın seni tanıdığı hissi.
  const weighted: Dilemma[] = [];
  for (const d of pool) { const w = d.identity ? 3 : 1; for (let i = 0; i < w; i++) weighted.push(d); }
  return weighted[Math.floor(Math.random() * weighted.length)];
}
