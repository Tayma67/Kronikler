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

ARCS.push(
  {
    id: "gizli_ask", title: "Gizli Aşk", icon: "ring",
    blurb: "Kalbin, ulaşılması güç birine kapıldı.",
    when: (p) => p.age >= 17 && !p.married,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Bir bey kızına/oğluna gönül verdin ama aileler arasında uçurum var. Aracı bir ihtiyar yol gösteriyor.", choices: [
        { label: "Şiirle gönlünü kazan", result: "Yazdığın beyitler dilden dile dolaştı; kapı aralandı.", delta: { fame: 4 }, next: "s2" },
        { label: "Servetinle etkile", result: "Cömert hediyelerle ailenin gözüne girdin.", delta: { money: -30 }, next: "s2" },
      ]},
      s2: { id: "s2", text: "Buluşma ayarlandı ama bir rakip de aynı kişinin peşinde. Ne yaparsın?", choices: [
        { label: "Mertçe yarış", result: "Onurunla yarıştın ve kalbi kazandın.", delta: { honor: 8, reputation: 6, fame: 6 }, next: "end" },
        { label: "Rakibi gözden düşür", result: "Entrikayla rakibi saf dışı bıraktın; muradına erdin ama için buruk.", delta: { fear: 6, honor: -5 }, next: "end" },
      ]},
    },
  },
  {
    id: "isyan", title: "Köylü İsyanı", icon: "crossed-swords",
    blurb: "Ağır vergiler halkı ayağa kaldırdı; bir taraf seçmelisin.",
    when: (p, tension) => p.age >= 18 && p.reputation >= 5,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Köylüler voyvodanın zulmüne baş kaldırdı. Hem halk hem bey senden yana olmanı bekliyor.", choices: [
        { label: "Halkın yanında dur", result: "Mazlumun yanında saf tuttun; halk seni bağrına bastı.", delta: { reputation: 12, honor: 10, fear: 4 }, next: "s2h" },
        { label: "Beyin yanında dur", result: "Düzenden yana çıktın; bey sana borçlandı ama halk küstü.", delta: { reputation: -6, money: 40, fear: 8 }, next: "s2b" },
      ]},
      s2h: { id: "s2h", text: "İsyan büyüdü. Önderlik sana düştü. Sonuna kadar gider misin?", choices: [
        { label: "Önderlik et", result: "İsyanı zafere taşıdın; adın türkülere girdi.", delta: { fame: 18, reputation: 10 }, next: "end" },
        { label: "Uzlaşma sağla", result: "Kan dökülmeden uzlaşma sağladın; bilgeliğin konuşuldu.", delta: { honor: 12, reputation: 8 }, next: "end" },
      ]},
      s2b: { id: "s2b", text: "İsyan bastırıldı. Bey seni ödüllendirmek istiyor ama halkın gözünde hainsin.", choices: [
        { label: "Ödülü al", result: "Kese doldu ama sokakta yüzüne bakan olmadı.", delta: { money: 80, reputation: -10, fear: 10 }, next: "end" },
        { label: "Ödülü reddet", result: "Ödülü reddedip halktan özür diledin; itibarın bir nebze onarıldı.", delta: { honor: 6, reputation: 4 }, next: "end" },
      ]},
    },
  },
);

ARCS.push(
  {
    id: "kitlik_kisi", title: "Kıtlık Kışı", icon: "skull",
    blurb: "Amansız bir kış kapıda; ambarlar boşalıyor.",
    when: (p) => p.age >= 14,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Kar her şeyi yuttu, halk aç. Elindeki azığı ne yaparsın?", choices: [
        { label: "Komşularla paylaş", result: "Azığını paylaştın; karnın aç kaldı ama vicdanın tok.", delta: { hunger: -15, honor: 12, reputation: 8 }, next: "s2" },
        { label: "Kendine sakla", result: "Azığını sakladın; sağ çıktın ama gözler üstünde.", delta: { reputation: -6 }, next: "s2" },
      ]},
      s2: { id: "s2", text: "Kış nihayet kırıldı. Hayatta kalanlar baharı karşılıyor.", choices: [
        { label: "Şükür ziyafeti ver", result: "Sağ kalanlara küçük bir ziyafet verdin; umut yeşerdi.", delta: { money: -15, fame: 8, honor: 6 }, next: "end" },
        { label: "Sessizce devam et", result: "Bahar geldi, hayat kaldığı yerden sürdü.", next: "end" },
      ]},
    },
  },
  {
    id: "sahte_dervis", title: "Sahte Derviş", icon: "hood",
    blurb: "Kutsal görünüşlü bir yabancı, halkın parasına göz dikti.",
    when: (p) => p.age >= 16 && p.reputation >= 8,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Bir 'derviş' mucizeler vaat edip bağış topluyor. Sen sahtekârlığı sezdin.", choices: [
        { label: "Halkı uyar", result: "Sahtekârı ifşa ettin; halk sana minnettar, o kaçtı.", delta: { honor: 8, reputation: 8, fear: 3 }, next: "end" },
        { label: "Ortak ol (pay al)", result: "Dolaba ortak oldun; kesen doldu ama bir sır taşıyorsun.", delta: { money: 40, honor: -10, fear: 4 }, next: "end" },
        { label: "Karışma", result: "Sessiz kaldın; ne kazandın ne kaybettin.", next: "end" },
      ]},
    },
  },
);

// ── Kimliğe bağlı yaylar: meslek, lonca, nam, aile, taht ──
ARCS.push(
  {
    id: "cephe_cagri", title: "Cephe Çağrısı", icon: "crossed-swords",
    blurb: "Sınır boylarından davul sesleri geliyor; kılıcına ihtiyaç var.",
    when: (p) => p.age >= 17 && (p.profession === "asker" || p.faction === "asker" || (p.skills?.combat || 0) >= 3),
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Bir akıncı beyi, seçme yiğitlerini topluyor. Sınırda zorlu bir sefer var.", choices: [
        { label: "Sefere katıl", result: "Atına atladın, sancağın altında yürüdün.", delta: { fame: 4 }, next: "s2" },
        { label: "Bu sefer geri dur", result: "Evinde kaldın; kimi 'akıllı' dedi, kimi 'çekingen'.", delta: { reputation: -3 }, next: "end" },
      ]},
      s2: { id: "s2", text: "Çarpışma kızıştı; safların bozulmak üzere. Bir hamle her şeyi değiştirebilir.", choices: [
        { label: "Öne atıl", result: "Sancağı kaptın, safları topladın; zafer senin adınla anıldı.", delta: { health: -16, fame: 16, fear: 8, nam: { mert: 8 } }, next: "end" },
        { label: "Düzeni koru, savun", result: "Soğukkanlı kaldın; çok can kurtardın, az kan döktün.", delta: { health: -6, honor: 10, reputation: 8, nam: { mert: 5 } }, next: "end" },
      ]},
    },
  },
  {
    id: "kervan_komplo", title: "Kervan Komplosu", icon: "scales",
    blurb: "Bir kervanın yükünde göründüğünden fazlası var.",
    when: (p) => p.age >= 18 && (p.profession === "tüccar" || p.faction === "tuccar" || (p.skills?.trade || 0) >= 3),
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Bir tüccar, 'sorulmayacak' bir yükü ucuza devretmek istiyor. Kâr büyük, ama yük şaibeli.", choices: [
        { label: "Pazarlık et, al", result: "Yükü kapattın; sandıkların altında bir sır taşıyorsun.", delta: { money: -20 }, next: "s2" },
        { label: "Temiz iş yaparım, reddet", result: "Şaibeli işe bulaşmadın; vicdanın rahat.", delta: { honor: 5 }, next: "end" },
      ]},
      s2: { id: "s2", text: "Yolda voyvodanın adamları kervanı durdurdu. Yükü açarlarsa hapı yuttun.", choices: [
        { label: "Rüşvetle geç (−30)", result: "Birkaç akçe el değiştirdi; kervan yoluna devam etti, kâr cebinde.", delta: { money: 80, fear: 4, nam: { zalim: 3 } }, next: "end" },
        { label: "İtiraf et, yükü teslim et", result: "Suçu üstlenip yükü teslim ettin; ceza yedin ama dürüstlüğün not edildi.", delta: { money: -25, honor: 8, reputation: 6 }, next: "end" },
      ]},
    },
  },
  {
    id: "tekke_sirri", title: "Tekkenin Sırrı", icon: "prayer-beads",
    blurb: "Dindarlığın bir tekkenin kapısını araladı.",
    when: (p) => p.age >= 18 && (p.nam?.dindar || 0) >= 30,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Bir şeyh seni halvete çağırdı; gönül erbabı olduğunu söylüyor. Ama tekkede bir huzursuzluk var.", choices: [
        { label: "Hizmete gir", result: "Tekkenin işlerine omuz verdin; gönlüne dinginlik doldu.", delta: { honor: 6, nam: { dindar: 6 } }, next: "s2" },
        { label: "Uzaktan saygı duy", result: "Eşikte durdun; niyetini içinde tuttun.", delta: {}, next: "end" },
      ]},
      s2: { id: "s2", text: "Şeyhin müridlerinden biri tekke malını çalıyor. Sırrı öğrendin.", choices: [
        { label: "Şeyhe bildir", result: "Hırsızı ifşa ettin; tekkenin itibarını kurtardın, şeyhin gözdesi oldun.", delta: { honor: 10, fame: 6, reputation: 6 }, next: "end" },
        { label: "Sus, karışma", result: "Sır sende kaldı; huzurun biraz gölgelendi.", delta: { honor: -3 }, next: "end" },
      ]},
    },
  },
  {
    id: "yasak_ask", title: "Dile Düşen Aşk", icon: "ring",
    blurb: "Bir gönül macerası diyarın diline düştü.",
    when: (p) => p.age >= 18 && (p.nam?.capkin || 0) >= 30,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Bir bey ailesinden biriyle yasak bir yakınlığın duyuldu. Dedikodu çığ gibi büyüyor.", choices: [
        { label: "Gururla sahip çık", result: "İnkâr etmedin; kimi 'mert' dedi, kimi 'edepsiz'.", delta: { fame: 6, honor: -3, nam: { capkin: 5 } }, next: "s2" },
        { label: "Geri çekil, inkâr et", result: "Meseleyi örtbas ettin; fısıltılar yavaşça dindi.", delta: { reputation: -2 }, next: "end" },
      ]},
      s2: { id: "s2", text: "Ailenin reisi seni karşısına aldı: ya nikâh ya da diyarı terk.", choices: [
        { label: "Nikâhı iste", result: "Mertçe talip oldun; gönüller birleşti, dedikodu duaya döndü.", delta: { honor: 8, reputation: 6, fame: 6 }, next: "end" },
        { label: "Diyarı bir süre terk et", result: "Ortalık yatışana dek uzaklaştın; itibarın yara aldı.", delta: { reputation: -8, fame: 3 }, next: "end" },
      ]},
    },
  },
  {
    id: "saray_entrika", title: "Saray Entrikası", icon: "crown",
    blurb: "Taht bir gün bile rahat bırakmıyor; gölgeler kıpırdanıyor.",
    when: (p) => !!p.crowned,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Sadık bildiğin bir vezir, arkandan bir hizip topluyor. Casusun haber getirdi.", choices: [
        { label: "Sertçe bastır", result: "Hizbi dağıttın; korkun sarayı sardı, kimse kıpırdayamıyor.", delta: { fear: 12, reputation: -4, nam: { zalim: 5 } }, next: "s2" },
        { label: "Sabırla kuşat", result: "Sessizce delillerini topladın; veziri kendi oyununda yakaladın.", delta: { honor: 8, fame: 6 }, next: "s2" },
      ]},
      s2: { id: "s2", text: "Vezir huzurunda diz çöktü; halk meydanda kararını bekliyor.", choices: [
        { label: "Affet, ibret olsun", result: "Bağışladın; adaletin destanlara girdi.", delta: { honor: 12, reputation: 10, fame: 10 }, next: "end" },
        { label: "Cezalandır", result: "İbret-i âlem ettin; taht sağlam ama gönüller ürperdi.", delta: { fear: 14, fame: 8, nam: { zalim: 6 } }, next: "end" },
      ]},
    },
  },
  {
    id: "miras_kavgasi", title: "Miras Kavgası", icon: "family",
    blurb: "Henüz ölmeden, evlatların payını tartışmaya başladı.",
    when: (p) => p.age >= 45 && p.children.length >= 2,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "İki evladın, daha sen hayattayken mülkün için çekişiyor. Ocağına huzursuzluk düştü.", choices: [
        { label: "Adaletle paylaştır", result: "Herkese hakkını verdin; homurdandılar ama düzen korundu.", delta: { honor: 8, reputation: 4 }, next: "end" },
        { label: "Gözdene yontmak iste", result: "Birini kayırdın; ocağında kalıcı bir çatlak açıldı.", delta: { honor: -6, fear: 3 }, next: "end" },
      ]},
    },
  },
  {
    id: "lonca_secimi", title: "Lonca Seçimi", icon: "scales",
    blurb: "Loncanda kethüdâlık için adın geçiyor.",
    when: (p) => p.age >= 22 && !!p.faction && p.reputation >= 20,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Loncanın ileri gelenleri yeni bir kethüdâ seçecek; bir rakibin daha var.", choices: [
        { label: "Hizmetinle ikna et", result: "Geçmiş emeğini hatırlattın; oylar sana döndü.", delta: { reputation: 8, fame: 6, honor: 4 }, next: "end" },
        { label: "Ziyafetle gönül al (−30)", result: "Cömert bir sofra kurdun; oylar bollukla geldi.", delta: { money: -30, reputation: 6, fame: 5, nam: { comert: 4 } }, next: "end" },
      ]},
    },
  },
  {
    id: "kayip_kardes", title: "Kayıp Kardeş", icon: "family",
    blurb: "Yıllar önce kaybolan bir yakının izi belirdi.",
    when: (p) => p.age >= 20,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Bir yabancı, çocukken ayrı düştüğün kardeşin olduğunu söylüyor. Gözleri tanıdık ama sözleri şüpheli.", choices: [
        { label: "Bağrına bas", result: "İnandın, kucakladın; bir akraban daha oldu, gönlün ısındı.", delta: { honor: 5, reputation: 3 }, next: "s2" },
        { label: "Önce sına", result: "Sorular sordun, geçmişi yokladın; temkinin yerindeydi.", delta: {}, next: "s2" },
      ]},
      s2: { id: "s2", text: "Bir süre sonra 'kardeşin' senden borç istedi; niyeti belirsiz.", choices: [
        { label: "Güven, yardım et (−25)", result: "El uzattın; ya gerçek bir kardeş kazandın ya da bir ders.", delta: { money: -25, honor: 4 }, next: "end" },
        { label: "Kapını kapat", result: "Şüphen ağır bastı; belki haklıydın, belki bir kardeşi yitirdin.", delta: { honor: -2 }, next: "end" },
      ]},
    },
  },
  {
    id: "namus_duello", title: "Bir Namus Meselesi", icon: "crossed-swords",
    blurb: "Sözün mertlikle anılır; biri onu çiğnedi.",
    when: (p) => p.age >= 18 && (p.nam?.mert || 0) >= 30,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Bir küstah, meydanda adını lekeledi ve seni er meydanına çağırdı.", choices: [
        { label: "Düelloyu kabul et", result: "Meydana çıktın; herkesin gözü üstünde.", delta: { fear: 4 }, next: "s2" },
        { label: "Onurunla görmezden gel", result: "Tenezzül etmedin; kimi bilgece, kimi 'korktu' dedi.", delta: { honor: 3, reputation: -2 }, next: "end" },
      ]},
      s2: { id: "s2", text: "Kılıçlar çekildi. Bir an, bir hamle.", choices: [
        { label: "Alt et ama canını bağışla", result: "Yendin ve affettin; mertliğin dilden dile dolaştı.", delta: { health: -8, honor: 12, fame: 10, nam: { mert: 6 } }, next: "end" },
        { label: "Acımasızca bitir", result: "Rakibini yere serdin; adın korku saldı, vicdanın sızladı.", delta: { health: -8, fear: 12, fame: 8, nam: { zalim: 5, mert: -2 } }, next: "end" },
      ]},
    },
  },
  {
    id: "sifa_supheli", title: "Salgın ve Şüphe", icon: "healing",
    blurb: "Şifacılığın hem dua hem de töhmet getirir.",
    when: (p) => p.age >= 18 && (p.profession === "şifacı" || p.faction === "sifaci"),
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Tedavi ettiğin bir hasta öldü; ailesi seni suçluyor, kalabalık galeyanda.", choices: [
        { label: "Sakince hakikati anlat", result: "Bilginle açıkladın; çoğu ikna oldu, töhmet dağıldı.", delta: { honor: 6, reputation: 5 }, next: "end" },
        { label: "Suçu kabullen, diyet öde (−30)", result: "Tartışmayı para ile kapattın; huzur döndü ama için buruk.", delta: { money: -30, honor: 2 }, next: "end" },
      ]},
    },
  },
);

// Yaşlılık yayları: hayatın son üçte biri anlatısal olarak boş kalmasın (yaş 55+).
ARCS.push(
  {
    id: "torun_ocagi", title: "Torun Ocağı", icon: "family",
    blurb: "Küçük ayaklar avluda; ocağın yanında sana bir yer açıldı.",
    when: (p) => p.age >= 55 && p.children.length >= 1,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Torunun dizinin dibine oturdu: 'Dede, gençliğini anlat' diyor. Gözlerinde merak, elinde senin eski çakın.", choices: [
        { label: "Ömrünü anlat", result: "Gözleri parlayarak dinledi; adın bir kuşak daha yaşayacak.", delta: { fame: 4, honor: 2 }, next: "s2" },
        { label: "Zanaatını göster", result: "Küçük eller beceriksiz ama hevesli; ocakta yeni bir kıvılcım yandı.", delta: { reputation: 3 }, next: "s2" },
      ]},
      s2: { id: "s2", text: "Bir akşam torunun sordu: 'Dede, senin düşmanların var mıydı?' Avluda bir sessizlik oldu.", choices: [
        { label: "Doğruyu söyle", result: "Acısıyla tatlısıyla anlattın; sana daha da bağlandı. Doğruluk da mirastır.", delta: { honor: 6 }, next: "end" },
        { label: "Bir masal anlat", result: "Onu eski husumetlerin gölgesinden korudun; belki bir gün kendi öğrenir.", delta: { reputation: 2 }, next: "end" },
      ]},
    },
  },
  {
    id: "eski_dost_vedasi", title: "Eski Dostun Vedası", icon: "hourglass",
    blurb: "Bir ömür yan yana yürüdüğün adam, son yolculuğuna hazırlanıyor.",
    when: (p) => p.age >= 57,
    start: "s1",
    stages: {
      s1: { id: "s1", text: "Haber geldi: gençlik yoldaşın ölüm döşeğinde, seni soruyormuş. Yol uzak, kemiklerin ağrıyor.", choices: [
        { label: "Yanına koş", result: "Son nefesinde elini tuttun; helalleştiniz. Yol seni yordu ama gönlün hafif.", delta: { health: -3, honor: 6 }, next: "s2" },
        { label: "Bir mektup yolla", result: "Sözlerin ona ulaştı; ama gözlerine bakamadın. İçinde bir sızı kaldı.", delta: { honor: -2, reputation: 1 }, next: "s2b" },
      ]},
      s2: { id: "s2", text: "Dostun sana eski kılıç kayışını bıraktı — ve bir vasiyet: 'Oğlumu affet. Sana ettiğini biliyorum.'", choices: [
        { label: "Affet", result: "Mezar başında oğlunun elini sıktın. Diyar, ak sakalına bir kez daha hürmet etti.", delta: { honor: 8, reputation: 4 }, next: "end" },
        { label: "Affetme", result: "Kayışı aldın, elini sıkmadın. Vasiyet yerde kaldı; gece uykuların bölük.", delta: { fear: 3, honor: -3 }, next: "end" },
      ]},
      s2b: { id: "s2b", text: "Cenazede ailesi sana son mektubunu uzattı. Mühürü kırılmamış; adın üstünde.", choices: [
        { label: "Mezar başında yüksek sesle oku", result: "Sözleri diyarı ağlattı; dostluğunuz destan oldu.", delta: { fame: 4, reputation: 2 }, next: "end" },
        { label: "Kimseye gösterme", result: "Mektubu koynunda taşıyorsun. Bazı sözler yalnız iki kişiye aittir.", delta: { honor: 2 }, next: "end" },
      ]},
    },
  },
);

export function arcById(id: string | null): Arc | undefined { return ARCS.find((a) => a.id === id); }
// Uygun, henüz tamamlanmamış ve aktif olmayan yaylar.
export function availableArcs(p: Player, completed: string[], tension: number, activeId: string | null): Arc[] {
  return ARCS.filter((a) => a.id !== activeId && !completed.includes(a.id) && a.when(p, tension));
}
