// Sıkça Sorulan Sorular / mekanik rehberi. Metinler doğrudan koddaki mekaniklere göre yazıldı.
// Diğer diller TR'ye düşer (faqFor).
export interface FaqItem { q: string; a: string; }
export interface FaqSection { icon: string; title: string; items: FaqItem[]; }

const TR: FaqSection[] = [
  {
    icon: "hourglass", title: "Zaman & Yaşam",
    items: [
      { q: "Ay/yıl nasıl ilerler?", a: "Ana ekrandaki büyük düğmeyle zamanı ilerletirsin. Her ilerlemede açlığın azalır, olaylar yaşanır, ara sıra ikilem veya fırsat çıkar." },
      { q: "Açlık ve sağlık ne yapar?", a: "Açlık 0'a inerse sağlığın erimeye başlar. Sağlık 0 olursa karakterin ölür. Yemek yiyerek açlığını, dinlenerek/şifayla sağlığını toparlarsın." },
      { q: "Ölünce ne olur?", a: "Bir vârisin varsa onun hayatıyla devam edersin (yeni nesil). Mirasın bir kısmı, şöhretinin üçte biri ve memleketin vârise geçer." },
    ],
  },
  {
    icon: "shield", title: "Özellikler & Beceriler",
    items: [
      { q: "Özellikler (Güç/Zekâ/Karizma/Dayanıklılık) ne işe yarar?", a: "Güç savaşta, Zekâ ticaret/zanaatta, Karizma sohbet/pazarlık/suçta, Dayanıklılık iş ve yorgunlukta etkilidir. Yaralanmalar özellikleri geçici düşürebilir." },
      { q: "Özellik puanını nasıl alır, nasıl harcarım?", a: "Mektepte çalışırken (½ ihtimalle) ve bazı olaylarda kazanırsın. Karakter ekranından istediğin özelliğe dağıtırsın." },
      { q: "Beceriler (Savaş/Ticaret/Zanaat/Sosyal) nasıl gelişir?", a: "Eyleme geçtikçe kendiliğinden artar: dövüşmek Savaş'ı, pazarlık/alışveriş Ticaret'i, atölyede üretim Zanaat'ı, sohbet/mektep Sosyal'i geliştirir. 3, 6 ve 9. seviyede Beceri Ağacı'ndan bir hüner açılır." },
    ],
  },
  {
    icon: "flame", title: "İtibar · Şeref · Korku · Şöhret",
    items: [
      { q: "Şöhret (fame) neyi belirler?", a: "Adının NE KADAR ve NE UZAĞA tanındığını. Şöhretin düşükken uzak şehirlerde seni kimse tanımaz; karakterin (şeref/korku vb.) ancak tanındığın ölçüde sana yansır." },
      { q: "Tanınma nedir? Memleket vs gurbet?", a: "Bulunduğun yerde sıradan birinin sana adına göre davranma derecesidir. Memleketinde (doğduğun şehir) herkes seni biraz tanır; başka şehre gidince yalnızca şöhretin taşır. Karakter ekranında 'halk seni nasıl görüyor' + tanınma yüzdesini görürsün." },
      { q: "Şeref'in artısı/eksisi?", a: "ARTI: evlilik ve saygın ailelerle anlaşmak kolaylaşır, onurlu loncalarda itibar hızlı kazanılır, haneler güvenir. EKSİ: suçta yakalanırsan itibarın daha sert düşer — kaybedecek bir adın vardır." },
      { q: "Korku'nun artısı/eksisi?", a: "ARTI: suç başarın artar (kurban donar), pazarlıkta sözün geçer (esnaf seni geçiştirmek için iner). EKSİ: sohbette insanlar çekinir, evlilik şansı düşer, onurlu loncalar mesafeli durur." },
      { q: "İtibar nasıl değişir?", a: "Ziyafet, sadaka, lonca görevi, fırsat ve onurlu seçimler artırır; suç, gözdağı ve başarısızlık düşürür. Hanelerin sana tavrını ve bazı kapıları belirler." },
    ],
  },
  {
    icon: "star", title: "Nam (Şöhretinin Rengi)",
    items: [
      { q: "Nam nedir?", a: "Adının taşıdığı kişilik: Cömert, Zalim, Çapkın, Dindar, Mert. Davranışlarınla birikir ve insanların sana yaklaşımını şekillendirir (tanınma ölçüsünde)." },
      { q: "Cömert / Dindar", a: "Cömert: halkın gözünde sevgi kazandırır, gözdağını yumuşatır (artık korkutucu değilsindir). Dindar: saygınlık katar, dindar ailelerle yakınlaştırır; ama dindar biri suçta yakalanırsa riyakârlık daha ağır cezalandırılır." },
      { q: "Çapkın / Mert", a: "Çapkın: flört ve iltifatla ilişki kurmayı kolaylaştırır; ama köklü/sadık aileler bu namdan ürker. Mert: her hanede saygı görür, müttefik ve lonca sadakati kazandırır; ama dürüstlüğün sinsi işleri (suç) zorlaştırır." },
      { q: "Zalim", a: "Korkuyla birleşip gözdağı/suç gücünü artırır; ama halkın sevgisini ve onurlu kurumların güvenini kaybettirir." },
    ],
  },
  {
    icon: "coins", title: "Para & Geçim",
    items: [
      { q: "Nasıl para kazanırım?", a: "Bir meslek tut ve çalış; pazarda alıp sat; atölyede üretip sat; mülk al, kira/gelir topla; lonca görevleri ve fırsatları üstlen." },
      { q: "Pazarlık nasıl işler?", a: "Pazarlık şansın Karizma + Ticaret becerine bağlıdır; başarırsan indirim alırsın. Tanınmışsan (sevilen ya da korkulan) sözün daha çok geçer." },
      { q: "Atölyede üretim için ne gerekir?", a: "Meslek şartı YOKTUR. Tek gereken: yeterli Zanaat becerisi ve gerekli malzeme. Her tarifin kartında gerekli seviye ve malzeme (var/gerek) yazılıdır. Üretmek Zanaat'ı geliştirir." },
    ],
  },
  {
    icon: "family", title: "İlişkiler & Evlilik",
    items: [
      { q: "İlişkiyi nasıl geliştiririm?", a: "Bir kişinin kartına girip sohbet et (hoşbeş, iltifat, dert dinle, şaka), hediye ver. Her kişinin mizacı vardır; yanlış niyet ters tepebilir. Sıcak/sevilen bir namın sohbet kazancını artırır." },
      { q: "Nasıl evlenirim?", a: "Karşı kişiyle yakınlık 50+, ikiniz de 18+ olmalı. Sonra 'Evlenme Teklifi' açılır. Kabul şansı yakınlık + Karizma + namına (mert/şeref artırır, çapkın/korku düşürür) bağlıdır." },
    ],
  },
  {
    icon: "crossed-swords", title: "Loncalar · Savaş · Suç",
    items: [
      { q: "Loncaya nasıl katılırım?", a: "Önce loncaya görev yaparak itibar (standing) biriktir; eşiği geçince saflarına katılırsın. Onurlu loncalar mert/şerefe, Gölge Kardeşliği korku/zalime daha hızlı güvenir." },
      { q: "Savaş/cephe nasıl çalışır?", a: "Mensubu olduğun teşkilat savaşa girerse cepheye gidebilirsin; zafer şöhret, şeref ve mert namı kazandırır. Düşmanların (nemesis) seni bulabilir." },
      { q: "Suç işlemeli miyim?", a: "Yankesicilik/soygun hızlı para getirir ama risklidir. Başarı Karizma + korku gücüne; yakalanma cezası itibarına bağlıdır. Şerefli/dindar biri yakalanınca çok daha fazla kaybeder." },
    ],
  },
  {
    icon: "compass", title: "Fırsatlar & İkilemler",
    items: [
      { q: "Ekrana çıkan fırsat/ikilem nedir?", a: "Ayı ilerletirken ara sıra bir fırsat (üstlen/vazgeç) ya da bir ikilem (seçim) çıkar. Fırsatlar ödül-risk taşır; gereken özelliğin yüksekse başarı şansın artar." },
      { q: "Görevler ekranı ne için?", a: "Bekleyen önemli işleri (özellik puanı dağıt, hüner seç, evlen, loncaya katıl, savaş, vâris...) tek listede toplar ve ilgili ekrana götürür. Altında 'Aile Görevleri' paneli de vardır." },
    ],
  },
  {
    icon: "castle", title: "Diyar Sistemleri",
    items: [
      { q: "Kervan nasıl çalışır? Rota nedir?", a: "Pazardan akçe yatırıp kervan gönderirsin. Kervan başlangıç→ara konak(lar)→hedef rotası izler, her ay bir konak ilerler. Yolda eşkıya saldırısı olabilir (itibarın, ticaret becerin ve korkun riski düşürür; gücün ile dövüş becerin kaybı azaltır). Varışta hayatta kalan sermaye üzerinden kâr döner. İlerlemeyi ana ekrandan ve pazardan izleyebilirsin." },
      { q: "Sancak hakimiyeti ve ocak savaşları nedir?", a: "4 sancağın her birini bir lonca tutar. Zamanla rakip loncalar göz diker, gerilim birikir ve bir sancak için savaş patlar; kazanan sancağı ele geçirir. Loncan taraf olursa Örgütler'den cepheye gidip sonucu etkileyebilirsin. Loncan bulunduğun sancağa hâkimse oradaki lonca görevleri %25 fazla kazandırır." },
      { q: "Mülke işçi almak ne sağlar?", a: "Mülklerine o şehrin halkından işçi alırsın (tip ve kademeye göre slot sayısı). İşçi üretimi artırır ama aylık ücret ister; düşük kondisyon/refahta ücret kârı yiyebilir. İşçi panelinde aylık net gelir (yeşil/kırmızı) görünür. İşçi verimi yaş + meslek uyumu + mizaçtan gelir." },
      { q: "Eşya kalitesi nedir?", a: "Silah, zırh, iksir gibi dayanıklı mallar 4 kalitede olur: kusurlu, sıradan, iyi, usta işi. Zanaat becerin yüksekse daha kaliteli üretirsin. Kaliteli mal pazarda daha pahalı satılır; kuşandığın silah/zırhın kalitesi savaş gücüne ve savunmana da yansır." },
      { q: "NPC'nin çevresi ve 'amaca yardım' ne işe yarar?", a: "Her NPC'nin bir ailesi, dostları ve rakipleri (çevresi) ile bir hayat hedefi vardır; bunları NPC ekranında görürsün. Amacına yardım edebilir (akçe karşılığı büyük yakınlık + cömert nam) ya da istismar edebilirsin (akçe koparır ama güvenini yakar, zalim nam)." },
    ],
  },
];

const EN: FaqSection[] = [
  {
    icon: "hourglass", title: "Time & Life",
    items: [
      { q: "How does time advance?", a: "Use the big button on the main screen to advance. Each step lowers hunger, triggers events, and occasionally a dilemma or opportunity." },
      { q: "What do hunger and health do?", a: "If hunger hits 0, health starts draining. If health hits 0, your character dies. Eat to restore hunger; rest/heal to restore health." },
      { q: "What happens when I die?", a: "If you have an heir, you continue as the next generation. Part of your wealth, a third of your fame, and your homeland pass to the heir." },
    ],
  },
  {
    icon: "shield", title: "Attributes & Skills",
    items: [
      { q: "What are attributes for?", a: "Strength in combat, Intellect in trade/crafting, Charisma in talk/haggling/crime, Stamina in work and fatigue. Injuries can temporarily lower attributes." },
      { q: "How do I get and spend stat points?", a: "You earn them studying at school (½ chance) and from some events. Spend them on the Character screen." },
      { q: "How do skills grow?", a: "Automatically as you act: fighting raises Combat, trade/haggling Trade, crafting Crafting, talk/school Social. At levels 3, 6 and 9 a perk unlocks on the Skill Tree." },
    ],
  },
  {
    icon: "flame", title: "Standing · Honor · Fear · Fame",
    items: [
      { q: "What does Fame determine?", a: "How widely and how far your name is known. With low fame, strangers in distant towns won't know you; your character (honor/fear etc.) only reaches others to the degree you're recognized." },
      { q: "What is Recognition? Home vs away?", a: "How much an ordinary person where you are reacts to your name. In your homeland (birth town) everyone knows you a little; travel elsewhere and only your fame carries. The Character screen shows how people see you + a recognition %." },
      { q: "Honor — pros & cons?", a: "PRO: marriage and dealing with respectable houses get easier, honorable guilds trust you faster. CON: if caught committing a crime your standing falls harder — you have a name to lose." },
      { q: "Fear — pros & cons?", a: "PRO: crime succeeds more (victims freeze), and you bargain better (sellers cave). CON: people are guarded in conversation, marriage odds drop, honorable guilds keep their distance." },
      { q: "How does Standing change?", a: "Feasts, alms, guild tasks, opportunities and honorable choices raise it; crime, intimidation and failure lower it. It shapes how noble houses treat you." },
    ],
  },
  {
    icon: "star", title: "Nam (the Color of Your Name)",
    items: [
      { q: "What is Nam?", a: "The character your name carries: Generous, Cruel, Rake, Pious, Valiant. It builds from your actions and shapes how people approach you (scaled by recognition)." },
      { q: "Generous / Pious", a: "Generous: earns public affection, softens intimidation (you're no longer scary). Pious: adds respect and warms pious families; but a pious person caught in crime is punished harder for hypocrisy." },
      { q: "Rake / Valiant", a: "Rake: makes flirting and compliments build relationships faster; but traditional/loyal houses recoil from the reputation. Valiant: respected by every house, earns ally and guild loyalty; but your honesty makes sneaky deeds (crime) harder." },
      { q: "Cruel", a: "Combines with fear to boost intimidation and crime; but costs you public affection and the trust of honorable institutions." },
    ],
  },
  {
    icon: "coins", title: "Money & Livelihood",
    items: [
      { q: "How do I earn money?", a: "Take a profession and work; buy and sell at market; craft and sell; buy property for income; take guild tasks and opportunities." },
      { q: "How does haggling work?", a: "Your bargain chance depends on Charisma + Trade skill; success gets you a discount. If you're well known (loved or feared) your word carries more weight." },
      { q: "What does crafting require?", a: "NO profession is required. All you need is enough Crafting skill and the materials. Each recipe card shows the required level and materials (have/need). Crafting raises your Crafting skill." },
    ],
  },
  {
    icon: "family", title: "Relationships & Marriage",
    items: [
      { q: "How do I build a relationship?", a: "Open a person's card and talk (small talk, compliment, listen, joke), or give a gift. Everyone has a temperament; the wrong intent can backfire. A warm/beloved reputation boosts your conversation gains." },
      { q: "How do I marry?", a: "You need 50+ closeness with the person and both 18+. Then 'Propose' appears. Acceptance depends on closeness + Charisma + your nam (valiant/honor help, rake/fear hurt)." },
    ],
  },
  {
    icon: "crossed-swords", title: "Guilds · War · Crime",
    items: [
      { q: "How do I join a guild?", a: "First build standing by doing guild tasks; once past the threshold you can join. Honorable guilds trust valor/honor faster; the Shadow Brotherhood trusts fear/cruelty." },
      { q: "How does war work?", a: "If your faction goes to war you can join the front; victory grants fame, honor and valiant nam. Enemies (a nemesis) may come looking for you." },
      { q: "Should I commit crime?", a: "Pickpocketing/robbery bring quick money but are risky. Success scales with Charisma + fear; the penalty if caught scales with your standing. An honorable/pious person loses far more when caught." },
    ],
  },
  {
    icon: "compass", title: "Opportunities & Dilemmas",
    items: [
      { q: "What are the pop-ups?", a: "While advancing, an opportunity (take/pass) or a dilemma (choice) occasionally appears. Opportunities carry reward and risk; a higher relevant attribute improves your odds." },
      { q: "What is the Tasks screen for?", a: "It gathers pending important matters (spend stat points, pick a perk, marry, join a guild, war, heir...) in one list and takes you to the right screen. It also has a 'Family Milestones' panel below." },
    ],
  },
  {
    icon: "castle", title: "Realm Systems",
    items: [
      { q: "How do caravans and routes work?", a: "From the market you invest coin and send a caravan. It follows an origin→stop(s)→destination route, advancing one stop per month. Bandits may strike en route (reputation, trade skill and dread lower the risk; strength and combat skill reduce the loss). On arrival, profit returns on the surviving capital. You can follow the journey from the home screen and the market." },
      { q: "What is sanjak control and guild war?", a: "Each of the 4 sanjaks is held by a guild. Over time rivals covet them, tension builds, and a war erupts over a sanjak; the winner takes it. If your guild is involved you can go to the front from Guilds and sway the outcome. If your guild holds the sanjak you are in, guild tasks there pay 25% more." },
      { q: "What do property workers do?", a: "You hire workers from the town's folk onto your properties (slot count by type and tier). Workers raise output but cost a monthly wage; at low condition/prosperity the wage can eat the profit. The worker panel shows the monthly net (green/red). Productivity comes from age + profession fit + temperament." },
      { q: "What is item quality?", a: "Durable goods (weapons, armor, elixirs) come in 4 tiers: faulty, ordinary, good, masterwork. Higher crafting skill yields better quality. Quality goods sell for more; the quality of your equipped weapon/armor also affects your combat power and defense." },
      { q: "What is an NPC's circle and 'help their goal'?", a: "Every NPC has a family, friends and rivals (their circle) and a life goal, shown on the NPC's screen. You can help their goal (coin for a big bond + generous repute) or exploit it (extort coin but burn their trust, cruel repute)." },
    ],
  },
];

export function faqFor(lang: string): FaqSection[] {
  return lang === "en" ? EN : TR;
}
