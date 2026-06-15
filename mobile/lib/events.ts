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
    id: "yasli_torun", icon: "family", title: "Ocak Başında Hikâye",
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
      { label: "Ortak ol (−60)", delta: { money: 90, fame: 5, reputation: 4 }, result: "Kervan kârla döndü; payın katlanarak geldi." },
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
      { label: "Stok yap, riske gir (−35)", delta: { money: 60, reputation: 2 }, result: "Söylenti doğru çıktı; depoladığın malı kârla sattın." },
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
];

// Tura göre bir ikilem seç (deterministik değil; çağıran olasılıkla tetikler).
export function pickDilemma(s: GameState): Dilemma | null {
  const p = s.player;
  if (p.dead) return null;
  const pool = DILEMMAS.filter((d) => !d.when || d.when(p));
  if (pool.length === 0) return null;
  // Kimliğe tepki veren olaylar daha ağırlıklı: dünyanın seni tanıdığı hissi.
  const weighted: Dilemma[] = [];
  for (const d of pool) { const w = d.identity ? 3 : 1; for (let i = 0; i < w; i++) weighted.push(d); }
  return weighted[Math.floor(Math.random() * weighted.length)];
}
