// Sıkça Sorulan Sorular / mekanik rehberi. Metinler doğrudan koddaki mekaniklere göre yazıldı.
// 6 dilde tam içerik (faqFor); bilinmeyen dil TR'ye düşer.
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
      { q: "Özellik puanını nasıl alır, nasıl harcarım?", a: "Mektepte çalışırken (arada bir), sınavlarda ve bazı olaylarda kazanırsın. Karakter ekranından istediğin özelliğe dağıtırsın (özellik tavanı 10)." },
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
      { q: "Atölyede üretim için ne gerekir?", a: "Sıradan tarifler mesleğe bakmaz: yeterli Zanaat becerisi ve malzeme yeter. Yalnız ustalık tarifleri (turfanda sepeti, tuzlu balık, ballı çörek, yün kaftan) o mesleğin elindedir — kartında yazar. Üretmek Zanaat'ı geliştirir." },
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
      { q: "Kadı duruşması nasıl işler?", a: "Ağır bir suçta yakalanırsan (taçlı ya da zaten zindanda değilsen) ceza kesilmeden önce kadı huzuruna çıkarsın; perde suç ekranında bekler. Üç yol var: yakınlığı yüksek bir dostun varsa TANIK çağırırsın (beraat şansı yüksek ama dostun hatırı incinir), KENDİNİ SAVUNURSUN (Karizma ve Zekâ konuşur; başarıda para cezası yarılanır, zindan düşer), ya da BOYUN EĞERSİN (+1 şeref, bilinen ceza). Perdeyi çözmeden ayı ilerletirsen boyun eğmiş sayılırsın." },
      { q: "Zindana nasıl düşerim, nasıl çıkarım?", a: "Ağır suçta (soygun ve üstü) yakalanırsan kadı zindan hükmü verebilir; asker ocağındaysan ceza yarıya iner. İçerideyken tezgâh, yol, lonca, sefer ve suç kapalıdır; her ay cezadan bir ay erir. Erken çıkışın tek yolu gardiyana rüşvet — pahalıdır, şerefinden götürür." },
      { q: "Loncaya nasıl katılırım?", a: "Önce loncaya görev yaparak itibar (standing) biriktir; eşiği geçince saflarına katılırsın. Onurlu loncalar mert/şerefe, Gölge Kardeşliği korku/zalime daha hızlı güvenir." },
      { q: "Savaş/cephe nasıl çalışır?", a: "Mensubu olduğun teşkilat savaşa girerse cepheye gidebilirsin; zafer şöhret, şeref ve mert namı kazandırır. Düşmanların (nemesis) seni bulabilir." },
      { q: "Suç işlemeli miyim?", a: "Yankesicilik/soygun hızlı para getirir ama risklidir. Başarı Karizma + korku gücüne; yakalanma cezası itibarına bağlıdır. Şerefli/dindar biri yakalanınca çok daha fazla kaybeder." },
    ],
  },
  {
    icon: "compass", title: "Fırsatlar & İkilemler",
    items: [
      { q: "Bağ mülkü ve hasat payı nedir?", a: "Tapu defterinin altıncı kalemi bağdır: 4000 akçe, +55 taban gelir, 2 işçi yuvası — ev ile dükkân arasında bir basamak. Ayrıca piyasada bir hasat olayı patladığında (bağ bozumu, bereketli kırkım, bereketli hasat) ilgili mülkün sahibine mülk başına küçük bir pay düşer; olay başına bir kez, enflasyonla ölçekli." },
      { q: "Kelam Yolu ne verir?", a: "Evladın beşinci eğitim yolu: haftada 2 akçe ister, aylar biriktikçe kademe olur; o evlat vâris olduğunda sosyal becerisiyle ve fazladan itibarla başlar. Yol değiştirirsen birikim sıfırdan başlar." },
      { q: "Olaylar kendini tekrar ediyor mu?", a: "Havuzlar her sürümde genişliyor: divanda 24 arzuhal, 37 mikro an, her meslekte 5 iş günü, 52 çarşı fısıltısı, 44 dünya haberi ve 16 efsane karşılaşması. Ayrıca yakın geçmişte gördüğün ikilemler bir süre tekrar gelmez — tekrar koruması var." },
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
  {
    icon: "scroll", title: "Devlet, Saray & Meslek",
    items: [
      { q: "Hükümdar seferi nasıl yürür?", a: "Sefer artık tek zarla bitmez: tuğ çözülünce ordu ÜÇ AY yürür. İlk ay yürüyüştür (öncüler geçit tutar ya da yağmur yolu çamura çevirir), ikinci ay kuşatmadır (lağımcılar sur deler ya da ordugâha hastalık düşer) — her olay ordu gücünü oynatır. Üçüncü ay hüküm okunur: temel şansına birikmiş ordu gücü eklenir. Maiyetindeki muhafızlar ve müttefik haneler orduya baştan güç katar. Sefer sürerken panoda kırmızı şerit yanar; taç düşerse ordu dağılır, tuğlar geri döner." },
      { q: "Vali olunca neler yapabilirim?", a: "Yeterli itibarla bir şehre vali olursun (Diyar ekranından). Vergi oranını ayarlar (gelir ↔ halk memnuniyeti), şehir hazinesini halka hizmet/asayiş için harcar, meşruiyetini hayır işiyle tazelersin. Ek olarak FERMAN çıkarabilirsin (adalet, vergi affı, angarya, pazar serbestisi — bekleme süreli, tradeoff'lu) ve kalıcı BAYINDIRLIK ESERİ yaptırabilirsin (çeşme/köprü/imarethane/burç — memnuniyet/gelir tabanını yükseltir + şöhret). Meşruiyetin düşerse azledilir, halk çok küserse isyan çıkar; ara sıra Divan-ı hümâyun hazineden pay ister." },
      { q: "Tahta çıkınca (hükümdar) ne değişir?", a: "Yaş, hane gücü, itibar, şöhret ve akçe şartlarını karşılayıp bir lonca desteği (ya da sarayda Vezir+ mevki) ile tahta iddia edersin. Hükümdar olunca OTORİTE'n olur: Dîvân-ı hümâyunda fermanlar çıkarır (adaletnâme, imar, genel af, şenlik, ağır vergi), rakip beyliklere SEFER düzenler (zafer → ilhak + ganimet + şöhret), şehirlere sadık VALİ atar/azledersin (haraç geliri). Otorite ihmal edilirse aşınır; dibe vurursa isyan tahtını devirebilir. Saray olayları (elçi, kıtlık, vezir entrikası) otoriteni etkiler." },
      { q: "Meslek Fırsatı (imza eylemi) nedir?", a: "Her mesleğin, normal çalışmanın ötesinde kendine özgü, bekleme süreli bir imza eylemi vardır (Meslek ekranında): demirci şaheser döver, tüccar uzak ticaret seferine çıkar, şifacı salgınla savaşır, asker sınır akınına katılır, çiftçi hasat şenliği düzenler… Mesleğin temel özelliğiyle test edilir; başarı kademene göre büyük kazanç + şöhret/itibar + beceri getirir. Tehlikeli olanlar (demirci/balıkçı/avcı/asker/şifacı) başarısızlıkta sağlık riski taşır." },
      { q: "Saraya nasıl girerim, rütbeler nedir?", a: "Tahtta değilsen (16+ yaş, yeterli itibar ve zekâ — kâtipsen daha kolay) Örgütler ekranından saray/divan hizmetine girebilirsin. Kâtip olarak başlar, Divan Hizmeti vererek hizmet puanı + hükümdar itibarı (favor) + maaş kazanır, Defterdar → Nişancı → Vezir → Sadrazam'a yükselirsin. Pîşkeş sunarak favor satın alabilirsin. Favor ihmal edilirse aşınır, dibe vurursa azledilirsin; rakip saraylı entrikaları ve sultan lütufları olur. Vezir+ mevki tahta iddia için arka sağlar." },
    ],
  },
  {
    icon: "banner", title: "Hanedan Yolları (Yeni Sistemler)",
    items: [
      { q: "Gözde evlat ve veraset krizi nedir?", a: "35 yaşından sonra iki ve daha çok yaşayan evladın varsa Nesil ekranından birini gözde ilan edebilirsin: gözdenin bağı güçlenir, kardeşlerin bağı incinir ve ocakta veraset gerilimi birikir. Gerilim taşarsa pay davası patlar (akçe ve itibar götürür), ara ara sitem sahneleri düşer. Gözdeyi sonradan değiştirmek de bedellidir. Ödülü ölümde görülür: ocak gözdeye kalırsa vâris +5 itibarla, başkasına kalırsa -5 ile başlar." },
      { q: "Gölge Oyunları (entrika) nasıl çalışır?", a: "Hanedan ekranında rakip bir haneye leke, sabotaj ya da nifak komplosu kurarsın (bedelli). İş aylar içinde örülür; zekân, keseyle tuttuğun eller ve Gölge Kardeşliği üyeliği hızlandırır. Fısıltı birikirse ifşa olursun: itibar ve şeref kaybı, kan davası riski — taçlıysan meşruiyetin erir. Dikkat: kin tutan haneler sana da komplo örer; çarşıda kulak tut, casusbaşın varsa kendiliğinden haber verir." },
      { q: "Maiyet ve Saray Heyeti ne kazandırır?", a: "Savaş ekranından en fazla üç muhafız tutarsın: her biri savaşta güç katar, yolda haydutları caydırır; aylık ulufe ister, ödenmezse teker teker dağılırlar. Taç sahibiysen ayrıca vezir (otoriteyi diri tutar), hazinedar (mülk gelirini artırır) ve casusbaşı (komploları anında bildirir) atarsın; taç düşerse heyet dağılır." },
      { q: "Zar Meclisi kazandırır mı?", a: "Suç ekranındaki han köşesinde ayda bir el oynarsın; kasa hep avantajlıdır — uzun vadede kaybettirir, üstelik dindar namını törpüler. Heyecanı için oyna, geçim için değil." },
      { q: "İbadet ne kazandırır?", a: "Yetişkin uğraşları arasında İbadet vardır: gönlünü toplar, Dindar namını ve biraz sağlık kazandırır; ara sıra bir dervişle sohbet denk gelir. Yaşlılıkta aynı yolun adı Tekke'dir — zikir yaşlı gönlü dinlendirir." },
      { q: "Hastalık yakamı bırakmıyor, ne yapayım?", a: "İki kronik var: 35 sonrası düşkün bünyede öksürük göğse yerleşir (her ay sızdırır, arada alevlenir); 48 sonrası eklem ağrısı yaştan gelir — sağlıklıyı da bulur, sızıntısı hafif ama tutulması sık ve kürü daha inatçı. Hekime Görün düğmesi sağlık toplar ve her muayenede kroniği kesme şansı taşır." },
      { q: "Vakıf fonu ne işe yarar?", a: "Vakıf kurduktan sonra fona sınırsız bağış yapabilirsin (ayda bir). 25 bin / 100 bin / 250 bin / 1 milyon akçe eşiklerinde vakfın mertebe atlar: şöhret ve cömert nam kazanırsın. Fon ayrıca mersiyene ve vârisinin başlangıç itibarına akar." },
      { q: "Ölünce eşyalarım ne olur?", a: "Kuşandığın silah, kalitesiyle birlikte yadigâr olarak vârisin sandığına geçer. Servetin vasiyet payına göre, mülklerin ve konağın ise olduğu gibi vârise kalır; gerisi hayatınla birlikte gider." },
      { q: "Çırak nasıl alırım, ne kazandırır?", a: "İlişkin iyi olan bir gence kişi ekranından çıraklık teklif edebilirsin. Ay ay emek verip 24 aya ulaşınca çırağın usta olur — adın zanaat çevresinde büyür. Atasının çırağı, yıllar sonra vârisin kapısını da çalabilir." },
      { q: "Kan davası nasıl başlar, nasıl biter?", a: "Bir haneyle tutum dibe vurursa kıvılcım çakabilir. Dava ısındıkça pusular artar. Hanedan ekranından sulh parası ödeyebilir ya da karşılık verebilirsin; en sonda meydan savaşı vardır. Bitmeyen dava, ısısı yarılanmış hâlde vârise geçer." },
      { q: "Hanelerle ittifak nasıl kurulur, bozulur mu?", a: "Hanedan ekranındaki hane listesinden soğuk olmayan hanelere ittifak teklif edebilir, bekârsan dünür gönderebilirsin (ayda bir girişim). Şansı tutumları ve saygınlığın belirler; ret tutumu düşürür. Kurulan ittifak vârise geçer — ama dostluk soğur da tutum dibe vurursa el sıkışma bozulur." },
    ],
  },
  {
    icon: "family", title: "Yaşayan Hane (Yeni)",
    items: [
      { q: "Hayat Şeridi nedir, nereden açılır?", a: "Kronik ekranının başındaki altın düğme (üç ve daha çok dönüm noktası biriktiyse) ya da ölüm perdesindeki 'Hayat Şeridini İzle' bağlantısı, ömrünün büyük anlarını tam ekran, kare kare oynatır. Kareler kendiliğinden akar (yaklaşık dört saniyede bir), dokunuş sonraki kareye geçirir, son kare perdeyi kendiliğinden indirir. Sade modda otomatik akış kapalıdır — dokunarak ilerlersin." },
      { q: "Panoda beliren küçük seçim kartı ne?", a: "Ay içinde bazen tek satırlık bir an düşer: sağanak, sokak kedisi, devrilen tabla... İki küçük seçenekten birini seçebilir ya da hiç dokunmayabilirsin — ay ilerleyince kendiliğinden kaybolur. Etkileri küçüktür; hayata renk katmak içindir." },
      { q: "Eşimle vakit geçirmek ne kazandırır?", a: "Karakter ekranındaki düğme eşinin mizacına göre başka türlü akar: şefkatli eş teselli eder, çalışkan eş hesabı tutar (ikramın yarısı döner), dikbaşlı eşle tatlı-sert atışırsın, dindar eşle akşam duası edersin. Her seferinde eş bağı artar; bağ, yıldönümü sıcaklığını ve dulluk acısını belirler." },
      { q: "Evlat bağı ne işe yarar?", a: "Evlatlarınla İlgilen düğmesi en küçüğünün yaşına göre bir sahne açar: bebekle oyun, mektepliyle ders, gençle zanaat, yetişkinle sofra. Her ilgi bağı büyütür. Bağı yüksek (60+) evlat vâris olursa +2 itibarla, gözbebeğin (85+) +1 özellik puanıyla başlar." },
      { q: "Yaşlılıkta oyun sönükleşir mi?", a: "Hayır — 70'ten sonra hayat kendi anılarını getirir: şafak yalnızlığı, giden dostun boş tezgâhı, adının senden önce yürümesi... 55 üstü hikâye yayları, torun anları ve Tekke uğraşı da bu çağın dokusudur." },
      { q: "Savaş sonuçları neden hep farklı anlatılıyor?", a: "Her karşılaşmanın kendi zafer ve yenilgi hikâyesi vardır: eşkıya reisini zincire vurursun, Kara Alp önünde diz çöker... Efsane karşılaşmalar (Gece Canavarı, Kara Alp) ancak adın duyulunca yolunu bulur." },
    ],
  },
  {
        icon: "banner", title: "Çevrimiçi Diyar (Çok Oyunculu)",
    items: [
      { q: "Dönüş Parşömeni nedir?", a: "Diyara her dönüşünde, yokluğunda biriken kişisel hadiseler (hediye altını, fidye, düğün, veraset, ganimet...) tam ekran bir parşömende listelenir: ilk sekiz hadise satır satır, fazlası günlükte; altın farkın yeşil ya da kırmızı yazar. Tek dokunuşla meclise dönersin — hiçbir şey sessizce kaybolmaz." },
      { q: "Ortak kumpas nasıl işler?", a: "Tahtta oturan bir beye karşı diplomasi ekranından kumpasa katılırsın (zincirli katılamaz; müttefik/eş korunur). Kumpas gizlidir — yalnız üyeler görür. İkinci el gelip bir ay demlenince darbe gecesi zar atılır: üyelerin toplam gücü, beyin gücü ve sancak savunmasına karşı tartılır. Başarıda en güçlü üye tahta oturur ama HERKES şerefinden pay öder; haber kapıları içeriden açan elleri söylemez. Bozulan kumpasın üyeleri adlarıyla çarşıya düşer, şeref ağır yara alır. Beyin GÖZCÜSÜ nöbetteyse fısıltıları duyar: darbe şansı yarıya iner. Üç ay yalnız kalan kumpas kendiliğinden söner." },
      { q: "Ortak kervan soyulabilir mi?", a: "Evet — ortak olmayan bir oyuncu kervan kartından boğaza pusu kurabilir (tek pusucu; ilk gelen kapar, zincirdeki kuramaz). Kervan döneceği gece zar atılır: baskın tutarsa havuzun yüzde 60'ı maskeli pusucuya gider, ortaklara kırık iade düşer ve kimseye kimlik söylenmez — ama pusucunun şerefi gizlice erir. Ortaklardan birinin GÖZCÜSÜ nöbetteyse baskın şansı sert düşer; bozulan pusuda kimlik diyara ilan edilir ve şeref büyük yara alır. Kervan yolunda gölge iması gördüysen gözcü tutmak tam zamanıdır." },
      { q: "Diyarda bir bey ölürse sancağı kime kalır?", a: "Dünürlük paktıyla bağlı eşi hayattaysa sancak doğrudan ona geçer: haber bütün diyara düşer, eş beyliğin başına oturur ve iddia yarışı hiç açılmaz. Eş yoksa (ya da o da göçtüyse) sancak boşalır, ocak NPC'ye döner ve beylik yeniden iddiaya açılır. Bu diyarda evlilik yalnız gönül işi değil, veraset sigortasıdır." },
      { q: "Rehin almak ve fidye nasıl işler?", a: "Diplomasi ekranından bir beye rehin düellosu açarsın (savunan avantajlı; gözcüsü varsa daha da zor). Kazanırsan rakip zincire vurulur: fidye ödenene dek sefer açamaz, düello yapamaz, taht isteyemez. Fidyeyi ödediğinde altın senin kesene düşer; dilersen fidyesiz salıverirsin (+şeref). 12 ay ödenmeyen fidyenin rehinesi kaçar ve rehincinin şerefi zedelenir." },
      { q: "Gözcü nöbeti ne sağlar?", a: "Diplomasi ekranından 250 akçeye altı aylık gözcü tutarsın. Nöbet boyunca sana yönelik suikast şansı yarıya iner, sabotajcı çok daha kolay yakalanır, casus başarılı olsa bile fark edilir ve kim olduğunu öğrenirsin; rehin girişimine karşı da sur yükselir. Süre dolunca haber gelir, dilersen tazelersin." },
      { q: "Çok oyunculu diyar nasıl hissettirir? Meclis şeridi nedir?", a: "Diyar oyun ekranının tepesinde canlı bir yoldaş şeridi vardır: kim çevrimiçi, kim aya hazır, senin adın altınla. Tek dokunuş naralar (selam, takdir, meydan okuma, yardım çağrısı) herkese anında düşer; genel sohbetin son 12 sözü diyarda saklanır, sonradan gelen meclisin kaldığı yerden dinler." },
      { q: "Yıllık defneler (Yılın Beyi/Yıldızı/Alicenabı) nasıl kazanılır?", a: "Her oyun yılı kapanışında sunucu üç defne dağıtır: yıl içinde GÜCÜNÜ en çok büyüten Yılın Beyi, ŞÖHRETİNİ en çok artıran Yılın Yıldızı, ŞEREFİNİ en çok yükselten Yılın Alicenabı olur. Nişan bir yıl ad yanında görünür, sonraki kapanışta el değiştirebilir. İlk yılın ölçüm yılıdır; artış olmayan dalda defne verilmez." },
      { q: "Meclis Reisi seçimi nasıl işler?", a: "Diplomasi ekranından yıl boyunca dilediğin beye 'reis oyu' verirsin; son oyun geçerlidir, kendine oy veremezsin. Yıl kapanışında en çok oyu alan (eşitlikte şerefi yüksek olan) Meclis Reisi seçilir ve bir yıl nişan taşır. Reislik güç vermez — ağırlık verir: kim seçildi, herkes görür." },
      { q: "Ortak sefer ('omuz ver') nedir, ne kazandırır?", a: "Bir bey o ay beylik seferine çıkacaksa diplomasi ekranından ona omuz verebilirsin: kişisel gücünün yarısı onun ordusuna eklenir. Zaferde ganimet haberi düşer; kazansın kaybetsin, sözünde durduğun için şeref kazanırsın (Alicenap defnesini de besler). Kendi seferine omuz veremezsin." },
    ],
  },
  {
    icon: "scroll", title: "Kül Yemini (Ana Destan)",
    items: [
      { q: "Kan Defteri nedir, nasıl açılır ve kapanır?", a: "Bir hane ile kan davası kana bulanınca (3. aşama) Kan Defteri açılır: dava artık soy defterine yazılıdır. İlk kuşak Kan Yazısı'nda yemin eder ya da sulha and içer; yeminliye İlk Bedel sahnesi düşer (gece baskını ya da kadı). Defter vârise geçer — sürdürebilir ya da ocakta yakabilirsin (+şeref). İkinci kuşak çarşıda gölgesini ölçer; üçüncü kuşakta Hüküm gecesi gelir: kıyım, dünürlük ya da bedel. Hangi ucu seçersen seç, defter kapanır ve 'Defter Kapandı' başarımı senindir." },
      { q: "Kül Yemini nedir, nasıl başlar?", a: "Oyunun nesiller aşan ana hikâyesi. 13 yaşından sonra ilk yıllarda köyün en yaşlısı seni döşeğine çağırır ve kül rengi mührü emanet eder. Kabul edersen destan başlar; geri çekilirsen mühür iki yıl sonra son bir kez kapını çalar." },
      { q: "Sahneyi kaçırır mıyım? İlerlememi nereden görürüm?", a: "Kaçırmazsın: destan sahneleri panoda altın çerçeveli Kül Yemini kartında bekler, kaybolmaz. Hangi perdede olduğun ve kaç sahne geçtiğin karakter kartındaki Kül Yemini bandında yazar." },
      { q: "Ölürsem ya da mührü satarsam ne olur?", a: "Destan vârisine geçer; kaldığı yerden devam eder. Mührü Karakuş'a satarsan ihanet dalına girersin: kapılar, mührü geri alıp kefaret ödemeden açılmaz. Destanı tamamlayan Yemin Tamam başarımını alır; sonraki vârisler Mühür Nişanı ile (+2 itibar) doğar." },
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
      { q: "How do I get and spend stat points?", a: "You earn them occasionally while studying at school, from exams and some events. Spend them on the Character screen (each stat caps at 10)." },
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
      { q: "What does crafting require?", a: "Ordinary recipes need no profession: enough Crafting skill and materials will do. Only master recipes (early-harvest basket, salted fish, honey bun, wool caftan) belong to their trade — the card says so. Crafting raises your Crafting skill." },
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
      { q: "How does the judge's trial work?", a: "Caught at a grave crime (unless crowned or already in the dungeon), you stand before the judge before the sentence falls; the scene waits on the crime screen. Three roads: call a WITNESS if a close friend stands by you (acquittal is likely, but the friendship bruises), DEFEND yourself (Charisma and Intellect do the talking; success halves the fine and spares the dungeon), or SUBMIT (+1 honor, the known penalty). Advance the month without deciding, and submission is assumed." },
      { q: "How do I end up in the dungeon — and get out?", a: "Get caught at a serious crime (robbery or worse) and the qadi may sentence you; the Soldiers' Hearth serves half. Inside, the workshop, roads, guilds, campaigns and crime are closed; each month melts a month off. The only early exit is bribing the jailer — costly, and it stains your honor." },
      { q: "How do I join a guild?", a: "First build standing by doing guild tasks; once past the threshold you can join. Honorable guilds trust valor/honor faster; the Shadow Brotherhood trusts fear/cruelty." },
      { q: "How does war work?", a: "If your faction goes to war you can join the front; victory grants fame, honor and valiant nam. Enemies (a nemesis) may come looking for you." },
      { q: "Should I commit crime?", a: "Pickpocketing/robbery bring quick money but are risky. Success scales with Charisma + fear; the penalty if caught scales with your standing. An honorable/pious person loses far more when caught." },
    ],
  },
  {
    icon: "compass", title: "Opportunities & Dilemmas",
    items: [
      { q: "What are the vineyard and the harvest share?", a: "The sixth deed in the ledger is the vineyard: 4000 akçe, +55 base income, 2 worker slots — a step between the house and the shop. Also, when a harvest event breaks out in the market (the vintage, the bountiful shearing, the bountiful harvest), owners of the matching property get a small share per holding; once per event, scaled by inflation." },
      { q: "What does the Way of Words give?", a: "The fifth education track for a child: 2 akçe a week, and the accumulating months become tiers; when that child inherits, they start with social skill and extra reputation. Switching tracks restarts the accumulation." },
      { q: "Do events repeat themselves?", a: "The pools grow with every release: 24 petitions at the divan, 37 micro-moments, 5 work days per trade, 52 bazaar whispers, 44 world news items and 16 legend encounters. Dilemmas you saw recently are also held back for a while — there is repeat protection." },
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
  {
    icon: "scroll", title: "State, Court & Vocation",
    items: [
      { q: "How does a sovereign's campaign run?", a: "A campaign is no longer a single roll: once the standards are unbound, the army marches for THREE MONTHS. The first month is the march (the vanguard holds the passes, or rain turns the road to mud), the second is the siege (sappers breach the wall, or sickness falls upon the camp) — each event sways the army's edge. In the third month the verdict is read: the accumulated edge is added to your base odds. Retinue guards and allied houses strengthen the army from the start. While the campaign lasts, a red banner burns on the board; if the crown falls, the army disperses and the standards return." },
      { q: "What can I do as a governor?", a: "With enough standing you become governor of a city (from the Realm screen). You set the tax rate (income ↔ public contentment), spend the city treasury on services/security, and shore up your legitimacy with charity. You can also issue EDICTS (justice, tax amnesty, corvée, free market — cooldown-gated, with trade-offs) and raise lasting PUBLIC WORKS (fountain/bridge/soup kitchen/tower — they lift the contentment/income floor and grant fame). If legitimacy falls you are deposed; if the people sour, unrest erupts; now and then the imperial council demands a cut of the treasury." },
      { q: "What changes when I take the throne?", a: "Meeting the age, dynasty power, standing, fame and gold thresholds — with a guild's backing (or a Vizier+ court office) — you claim the throne. As ruler you gain AUTHORITY: you issue council decrees (edict of justice, building drive, general amnesty, festival, heavy tax), launch CAMPAIGNS against rival realms (victory → annexation + spoils + fame), and appoint/dismiss loyal GOVERNORS (tribute income). Authority erodes if neglected; if it bottoms out, revolt can topple your throne. Court events (envoys, famine, vizier plots) sway your authority." },
      { q: "What is a Signature Work (vocation action)?", a: "Beyond ordinary work, each profession has its own cooldown-gated signature action (on the Vocation screen): the smith forges a masterwork, the merchant sails a far trade venture, the healer fights a plague, the soldier joins a border raid, the farmer holds a harvest feast… It is tested against the profession's core attribute; success brings a large reward scaled by your rank, plus fame/standing and skill. The dangerous ones (smith/fisher/hunter/soldier/healer) risk your health on failure." },
      { q: "How do I enter the court, and what are the ranks?", a: "If you are not on the throne (age 16+, enough standing and wit — easier as a scribe) you can enter court/council service from the Organizations screen. You start as Scribe, and by performing Council Duty you gain service points + the ruler's favor + a salary, rising Treasurer → Chancellor → Vizier → Grand Vizier. You can offer a gift to buy favor. Favor erodes if neglected and you are dismissed if it bottoms out; rival courtier plots and royal favors occur. A Vizier+ office gives you backing to claim the throne." },
    ],
  },
  {
    icon: "banner", title: "Dynasty Paths (New Systems)",
    items: [
      { q: "What are the favored child and the succession crisis?", a: "Past the age of 35, with two or more living children, you may name one the favorite from the Generation screen: the favorite's bond deepens, the siblings' bonds bruise, and succession tension gathers in the hearth. If the tension boils over, an inheritance dispute erupts (it costs akçe and reputation), and scenes of reproach drop in between. Changing the favorite later has its price too. The reward shows at death: if the hearth passes to the favorite, the heir starts with +5 reputation; to anyone else, with -5." },
      { q: "How do the Shadow Games (intrigue) work?", a: "From the dynasty screen you set a smear, sabotage or discord plot against a rival house (for a fee). The work is woven over months; your intelligence, hired hands and Shadow Brotherhood membership speed it up. If the whispers pile up you are exposed: reputation and honor loss, feud risk — and a crowned schemer bleeds legitimacy. Beware: grudging houses plot against you too; keep an ear in the bazaar, or a spymaster will warn you automatically." },
      { q: "What do the Retinue and the Court give?", a: "From the war screen you hire up to three guards: each adds power in battle and deters road bandits; they take a monthly wage and leave one by one if unpaid. As a crowned ruler you also appoint a vizier (keeps authority alive), a treasurer (boosts property income) and a spymaster (reports plots instantly); lose the crown and the court dissolves." },
      { q: "Does the Dice Circle pay?", a: "In the inn corner of the crime screen you play one hand a month; the house always has the edge — in the long run you lose, and your pious name suffers too. Play for the thrill, not for a living." },
      { q: "What does Worship give?", a: "Worship is one of the adult pursuits: it settles your heart, builds your Devout renown and a little health; now and then you fall into talk with a dervish. In old age the same path is the Lodge — dhikr eases the old heart." },
      { q: "Illness will not let go of me — what do I do?", a: "There are two chronics: after 35, in a weakened body, the cough settles in the chest (monthly drain, occasional flares); after 48 aching joints come with age — they find the healthy too, drain less but seize more often, and the cure is more stubborn. See the Healer restores health and each visit carries a chance to cure the chronic." },
      { q: "What is the endowment fund for?", a: "After founding the endowment you can donate without limit (once a month). At 25k / 100k / 250k / 1M coins the endowment rises in rank: you gain fame and generous renown. The fund also flows into your eulogy and your heir's starting standing." },
      { q: "What happens to my things when I die?", a: "The weapon you wear passes to your heir's chest as an heirloom, quality and all. Your wealth passes by the will's share, your properties and manor pass whole; the rest goes with your life." },
      { q: "How do I take an apprentice and what does it give?", a: "You can offer apprenticeship to a youth you are close to, from their profile. Mentor them month by month; at 24 months your apprentice becomes a master — your name grows among the craft. Your ancestor's apprentice may knock on your heir's door years later." },
      { q: "How does a blood feud start and end?", a: "If relations with a house hit rock bottom, a spark may catch. As the feud heats, ambushes grow. From the dynasty screen you can pay for peace or strike back; at the end waits a pitched battle. An unfinished feud passes to your heir at half heat." },
      { q: "How are house alliances made — can they break?", a: "From the house list on the dynasty screen you can propose alliance to houses that are not cold, or send matchmakers if unmarried (one attempt a month). Their attitude and your standing set the odds; refusal lowers attitude. An alliance passes to your heir — but if the friendship goes cold and attitude hits bottom, the handshake breaks." },
    ],
  },
  {
    icon: "family", title: "The Living Hearth (New)",
    items: [
      { q: "What is the Reel of a Life, and where does it open?", a: "The gold button at the top of the chronicle (once three or more turning points have gathered), or the 'Watch the Reel of a Life' link on the death screen, plays your life's great moments full-screen, frame by frame. Frames flow on their own (about every four seconds), a tap advances to the next, and the final frame lowers the curtain by itself. In reduced-motion mode the auto-flow is off — you advance by tapping." },
      { q: "What is the small choice card on the dashboard?", a: "Now and then a one-line moment lands during the month: a downpour, a street cat, a tipped-over tray... Pick one of two small options or ignore it entirely — it fades on its own when the month passes. Effects are tiny; it is there to color life." },
      { q: "What does spending time with my spouse do?", a: "The button on the character screen plays out by your spouse's temper: a tender spouse consoles you, a diligent one keeps the accounts (half your treat comes back), with a headstrong one you bicker and laugh, with a devout one you share the evening prayer. Each time the spouse bond grows; the bond sets anniversary warmth and the grief of widowhood." },
      { q: "What is the child bond for?", a: "The Tend to Your Children button opens a scene by your youngest's age: play with the baby, lessons with the schoolchild, craft with the youth, a shared table with the adult. Every act of care grows the bond. An heir with a high bond (60+) starts with +2 reputation; the apple of your eye (85+) starts with +1 attribute point." },
      { q: "Does the game fade in old age?", a: "No — past 70 life brings its own memories: the solitude of dawn, an old friend's empty stall, your name walking ahead of you... Story arcs past 55, grandchild moments and the Tekke pursuit are the fabric of that age." },
      { q: "Why is every battle told differently?", a: "Each encounter has its own victory and defeat tale: you put the bandit chief in chains, Kara Alp kneels before you... Legendary encounters (the Night Terror, Kara Alp) only find you once your name is known." },
    ],
  },
  {
        icon: "banner", title: "The Online Realm (Multiplayer)",
    items: [
      { q: "What is the Return Scroll?", a: "Whenever you return to the realm, the personal tidings that piled up in your absence (gift gold, ransoms, weddings, inheritance, spoils...) are listed on a full-screen scroll: the first eight line by line, the rest in the log; your gold delta shows in green or red. One tap returns you to the assembly — nothing vanishes silently." },
      { q: "How does a joint conspiracy work?", a: "From the diplomacy screen you join a conspiracy against a seated bey (no one in chains may join; allies and spouses are protected). The plot is secret — only members see it. Once a second hand arrives and it steeps for a month, dice roll on the night of the coup: the members' combined power is weighed against the bey's power and the banner's defenses. On success the strongest member takes the seat, but EVERYONE pays a share of honor; the news never names the hands that opened the gates from within. A foiled plot drops its members' names in the bazaar, and honor takes a heavy wound. If the bey keeps a WATCHER, the whispers are heard: coup odds are halved. A plot left alone for three months burns out." },
      { q: "Can the joint caravan be robbed?", a: "Yes — a player who holds no stake can lay an ambush in the gorge from the caravan card (one ambusher; first come, first served, and no one in chains may try). Dice roll the night the caravan returns: if the raid lands, 60 percent of the pool goes to the masked ambusher, backers get a broken refund and no name is spoken — though the raider's honor quietly erodes. If any backer has a WATCHER on guard, the raid odds drop hard; a foiled ambush is announced to the realm by name, and honor takes a heavy wound. If you see shadows hinted along the caravan road, it is high time to hire a watcher." },
      { q: "If a bey dies in the realm, who keeps the banner?", a: "If a spouse bound by a marriage pact still lives, the banner passes straight to them: the news spreads through the whole realm, the spouse takes the seat, and no claim race opens at all. If there is no spouse (or they too have passed), the banner falls vacant, the hearth returns to an NPC, and the beylik opens to claims again. In this realm, marriage is not only a matter of the heart — it is succession insurance." },
      { q: "How do hostage-taking and ransom work?", a: "From the diplomacy screen you open a capture duel against a bey (the defender has the edge; harder still if they keep a watcher). Win, and the rival is chained: no campaigns, duels or throne claims until the ransom is paid. When they pay, the gold falls into your purse; or release them without ransom (+honor). If the ransom goes unpaid for 12 months, the hostage escapes and the captor's honor suffers." },
      { q: "What does the watcher's guard provide?", a: "From the diplomacy screen you hire a watcher for 250 akçe, six months. While the guard lasts, assassination odds against you are halved, saboteurs are caught far more easily, spies are noticed even when they succeed — and you learn who they were; attempts to chain you hit a higher wall. You are notified when the term ends, and may renew." },
      { q: "How does the multiplayer realm feel? What is the companions strip?", a: "The realm's game screen carries a live companions strip: who is online, who voted to advance the month, your own name in gold. One-tap battle cries (greeting, praise, challenge, call for help) land instantly for everyone; the last 12 words of the public chat are kept in the realm, so latecomers pick up the hall mid-conversation." },
      { q: "How are the yearly laurels (Bey/Star/Most Generous of the Year) won?", a: "At the close of each game year the server awards three laurels: whoever grew their POWER most becomes Bey of the Year, whoever raised their FAME most becomes Star of the Year, and whoever lifted their HONOR most becomes Most Generous of the Year. The badge shows beside your name for a year and can change hands at the next close. Your first year is the measuring year; no laurel is given in a branch with no growth." },
      { q: "How does the Speaker of the Hall election work?", a: "From the diplomacy screen you may cast a speaker vote for any bey all year long; your last vote counts, and you cannot vote for yourself. At year's end the most-voted bey (ties broken by higher honor) becomes Speaker and wears the badge for a year. The office grants no power — it grants weight: everyone sees who was chosen." },
      { q: "What is backing a campaign ('lend your shoulder')?", a: "If a bey marches on a beylik this month, you can back them from the diplomacy screen: half your personal power joins their army. Victory drops a spoils notice; win or lose, you gain honor for keeping your word (it also feeds the Most Generous laurel). You cannot back your own campaign." },
    ],
  },
  {
    icon: "scroll", title: "The Ash Oath (Main Saga)",
    items: [
      { q: "What is the Blood Ledger, and how does it open and close?", a: "When a feud with a house turns to blood (stage 3), the Blood Ledger opens: the case is written into the line itself. The first generation swears the blood-oath or vows peace at the Blood Writing; the sworn get the First Price scene (a night raid or the judge). The ledger passes to your heir — carry it on, or burn it in the hearth (+honor). The second generation measures its shadow in the bazaar; in the third comes the night of Judgment: slaughter, kinship, or a price. Whichever end you choose, the ledger closes and 'The Ledger Closed' achievement is yours." },
      { q: "What is the Ash Oath and how does it begin?", a: "The game's main story, spanning generations. In the first years after you turn 13, the village elder summons you to a deathbed and entrusts an ash-grey seal. Accept and the saga begins; step back and the seal knocks once more, two years later." },
      { q: "Can I miss a scene? Where do I see my progress?", a: "You cannot miss one: saga scenes wait on the main board in the gold-framed Ash Oath card and never vanish. Your current act and scene count are shown in the Ash Oath band on the character card." },
      { q: "What happens if I die, or sell the seal?", a: "The saga passes to your heir and continues where it left off. Selling the seal to Karakus opens the betrayal branch: no gate opens until the seal is won back and atonement is paid. Completing the saga grants The Oath Fulfilled achievement; later heirs are born with the Seal Token (+2 standing)." },
    ],
  },
];


const ES: FaqSection[] = [
  {
    icon: "hourglass", title: "Tiempo y Vida",
    items: [
      { q: "¿Cómo avanza el mes/año?", a: "Avanzas el tiempo con el botón grande de la pantalla principal. Con cada avance baja tu hambre, ocurren sucesos y de vez en cuando surge un dilema o una oportunidad." },
      { q: "¿Qué hacen el hambre y la salud?", a: "Si el hambre llega a 0, tu salud empieza a mermar. Si la salud llega a 0, tu personaje muere. Comiendo repones el hambre; descansando o curándote, la salud." },
      { q: "¿Qué pasa cuando muero?", a: "Si tienes un heredero, continúas con su vida (nueva generación). Parte de tu herencia, un tercio de tu fama y tu tierra natal pasan al heredero." },
    ],
  },
  {
    icon: "shield", title: "Atributos y Habilidades",
    items: [
      { q: "¿Para qué sirven los atributos (Fuerza/Inteligencia/Carisma/Aguante)?", a: "La Fuerza cuenta en el combate; la Inteligencia, en el comercio y la artesanía; el Carisma, en la charla, el regateo y el crimen; el Aguante, en el trabajo y la fatiga. Las heridas pueden bajar los atributos temporalmente." },
      { q: "¿Cómo gano y gasto puntos de atributo?", a: "Los ganas estudiando en la escuela (de vez en cuando), en los exámenes y en algunos sucesos. Los repartes desde la pantalla de Personaje en el atributo que quieras (el tope de cada atributo es 10)." },
      { q: "¿Cómo crecen las habilidades (Combate/Comercio/Artesanía/Social)?", a: "Suben solas al actuar: pelear desarrolla Combate; regatear y comerciar, Comercio; producir en el taller, Artesanía; la charla y la escuela, Social. En los niveles 3, 6 y 9 se desbloquea un don en el Árbol de Habilidades." },
    ],
  },
  {
    icon: "flame", title: "Prestigio · Honor · Temor · Fama",
    items: [
      { q: "¿Qué determina la Fama?", a: "CUÁNTO y HASTA DÓNDE se conoce tu nombre. Con poca fama, en las ciudades lejanas nadie te conoce; tu carácter (honor, temor, etc.) solo llega a los demás en la medida en que te reconocen." },
      { q: "¿Qué es el reconocimiento? ¿Tierra natal frente a tierra ajena?", a: "Es el grado en que una persona corriente del lugar donde estás te trata según tu nombre. En tu tierra natal (la ciudad donde naciste) todos te conocen un poco; al ir a otra ciudad, solo tu fama te acompaña. En la pantalla de Personaje ves 'cómo te ve la gente' y el porcentaje de reconocimiento." },
      { q: "¿Pros y contras del Honor?", a: "A FAVOR: el matrimonio y los tratos con familias respetables se facilitan, ganas prestigio más rápido en los gremios honorables y las casas confían en ti. EN CONTRA: si te atrapan en un crimen, tu prestigio cae con más fuerza — tienes un nombre que perder." },
      { q: "¿Pros y contras del Temor?", a: "A FAVOR: tus crímenes prosperan más (la víctima se paraliza) y tu palabra pesa al regatear (el vendedor cede para quitarte de encima). EN CONTRA: la gente se retrae al conversar, bajan tus opciones de matrimonio y los gremios honorables guardan las distancias." },
      { q: "¿Cómo cambia el Prestigio?", a: "Los banquetes, la limosna, las tareas de gremio, las oportunidades y las decisiones honorables lo suben; el crimen, la intimidación y el fracaso lo bajan. Determina cómo te tratan las casas y abre o cierra ciertas puertas." },
    ],
  },
  {
    icon: "star", title: "Renombre (el Color de tu Fama)",
    items: [
      { q: "¿Qué es el renombre?", a: "El carácter que lleva tu nombre: Generoso, Cruel, Mujeriego, Devoto, Valiente. Se acumula con tus actos y moldea cómo se te acerca la gente (en la medida en que te reconocen)." },
      { q: "Generoso / Devoto", a: "Generoso: te gana el cariño del pueblo y suaviza la intimidación (ya no asustas a nadie). Devoto: añade respeto y te acerca a las familias devotas; pero si un devoto es atrapado en un crimen, la hipocresía se castiga con más dureza." },
      { q: "Mujeriego / Valiente", a: "Mujeriego: facilita crear vínculos con el flirteo y los cumplidos; pero las familias tradicionales y fieles recelan de esa fama. Valiente: te gana respeto en toda casa y la lealtad de aliados y gremios; pero tu honradez dificulta los asuntos turbios (el crimen)." },
      { q: "Cruel", a: "Se combina con el temor para potenciar la intimidación y el crimen; pero te cuesta el cariño del pueblo y la confianza de las instituciones honorables." },
    ],
  },
  {
    icon: "coins", title: "Dinero y Sustento",
    items: [
      { q: "¿Cómo gano dinero?", a: "Toma una profesión y trabaja; compra y vende en el mercado; produce en el taller y vende; compra propiedades y cobra rentas e ingresos; acepta tareas de gremio y oportunidades." },
      { q: "¿Cómo funciona el regateo?", a: "Tu opción de regateo depende de Carisma + habilidad de Comercio; si aciertas, consigues descuento. Si eres conocido (querido o temido), tu palabra pesa más." },
      { q: "¿Qué necesito para producir en el taller?", a: "Las recetas comunes no piden oficio: basta con Artesanía suficiente y los materiales. Solo las recetas de maestría (cesta de primicias, pescado en salazón, bollo de miel, caftán de lana) pertenecen a su oficio — lo indica la carta. La carta de cada receta muestra el nivel y los materiales necesarios (tienes/faltan). Producir desarrolla la Artesanía." },
    ],
  },
  {
    icon: "family", title: "Relaciones y Matrimonio",
    items: [
      { q: "¿Cómo mejoro una relación?", a: "Entra en la carta de una persona y conversa (charla, halaga, escucha sus penas, bromea) o dale un regalo. Cada persona tiene su temperamento; la intención equivocada puede salirte al revés. Un renombre cálido y querido aumenta lo que ganas al conversar." },
      { q: "¿Cómo me caso?", a: "Necesitas una cercanía de 50+ con la persona y que ambos tengan 18+. Entonces se abre la 'Propuesta de Matrimonio'. La aceptación depende de la cercanía + Carisma + tu renombre (valiente/honor la suben, mujeriego/temor la bajan)." },
    ],
  },
  {
    icon: "crossed-swords", title: "Gremios · Guerra · Crimen",
    items: [
      { q: "¿Cómo funciona el juicio del cadí?", a: "Si te atrapan en un crimen grave (salvo que lleves corona o ya estés en la mazmorra), compareces ante el cadí antes de que caiga la condena; la escena espera en la pantalla de crimen. Tres caminos: llamar a un TESTIGO si tienes una amistad cercana (la absolución es probable, pero la amistad se resiente), DEFENDERTE (hablan el Carisma y el Intelecto; con éxito la multa se reduce a la mitad y la mazmorra se evita), o SOMETERTE (+1 honor, la pena conocida). Si avanzas el mes sin decidir, se da por sometimiento." },
      { q: "¿Cómo caigo en la mazmorra y cómo salgo?", a: "Si te atrapan en un crimen grave (asalto o peor) el cadí puede sentenciarte; el Hogar de Soldados cumple la mitad. Dentro, el taller, los caminos, los gremios, las campañas y el crimen quedan cerrados; cada mes funde un mes de condena. La única salida temprana es sobornar al carcelero — caro, y mancha tu honor." },
      { q: "¿Cómo me uno a un gremio?", a: "Primero acumula prestigio (standing) haciendo tareas para el gremio; al superar el umbral entras en sus filas. Los gremios honorables confían antes en el valiente y honorable; la Hermandad de la Sombra, en el temor y la crueldad." },
      { q: "¿Cómo funciona la guerra/el frente?", a: "Si la organización a la que perteneces entra en guerra, puedes ir al frente; la victoria da fama, honor y renombre de Valiente. Tus enemigos (némesis) pueden encontrarte." },
      { q: "¿Debería cometer crímenes?", a: "El carterismo y el robo dan dinero rápido, pero son arriesgados. El éxito depende de Carisma + tu poder de temor; el castigo si te atrapan, de tu prestigio. Alguien honorable o devoto pierde mucho más al ser atrapado." },
    ],
  },
  {
    icon: "compass", title: "Oportunidades y Dilemas",
    items: [
      { q: "¿Qué son el viñedo y la parte de cosecha?", a: "La sexta escritura del libro es el viñedo: 4000 akçe, +55 de renta base, 2 plazas de trabajador — un peldaño entre la casa y la tienda. Además, cuando estalla un evento de cosecha en el mercado (la vendimia, el esquileo abundante, la cosecha abundante), los dueños de la propiedad correspondiente reciben una pequeña parte por finca; una vez por evento, ajustada a la inflación." },
      { q: "¿Qué da la senda de la palabra?", a: "La quinta senda educativa del hijo: 2 akçe por semana, y los meses acumulados se vuelven grados; cuando ese hijo hereda, empieza con habilidad social y reputación extra. Cambiar de senda reinicia lo acumulado." },
      { q: "¿Se repiten los eventos?", a: "Las reservas crecen con cada versión: 24 peticiones en el diván, 37 micro-momentos, 5 jornadas por oficio, 52 susurros del bazar, 44 noticias del mundo y 16 encuentros legendarios. Además, los dilemas recientes se retienen un tiempo: hay protección contra repeticiones." },
      { q: "¿Qué son las oportunidades/dilemas que aparecen en pantalla?", a: "Al avanzar el mes, de vez en cuando surge una oportunidad (aceptar/dejar pasar) o un dilema (elección). Las oportunidades traen recompensa y riesgo; si el atributo requerido es alto, sube tu opción de éxito." },
      { q: "¿Para qué sirve la pantalla de Tareas?", a: "Reúne en una sola lista los asuntos pendientes importantes (repartir puntos de atributo, elegir un don, casarte, unirte a un gremio, la guerra, el heredero...) y te lleva a la pantalla correspondiente. Debajo tiene además el panel de 'Misiones de Familia'." },
    ],
  },
  {
    icon: "castle", title: "Sistemas del Reino",
    items: [
      { q: "¿Cómo funciona la caravana? ¿Qué es la ruta?", a: "En el mercado inviertes monedas y envías una caravana. Sigue la ruta origen→parada(s) intermedia(s)→destino, avanzando una parada al mes. En el camino pueden asaltarla bandidos (tu prestigio, tu habilidad de comercio y tu temor bajan el riesgo; tu fuerza y tu habilidad de combate reducen la pérdida). Al llegar, el beneficio vuelve sobre el capital superviviente. Puedes seguir el avance desde la pantalla principal y el mercado." },
      { q: "¿Qué son el control del sanjak y las guerras de gremios?", a: "Cada uno de los 4 sanjaks lo domina un gremio. Con el tiempo los gremios rivales lo codician, la tensión se acumula y estalla una guerra por un sanjak; el vencedor se lo queda. Si tu gremio toma parte, puedes ir al frente desde Gremios y Órdenes e influir en el resultado. Si tu gremio domina el sanjak donde estás, las tareas de gremio allí pagan un 25% más." },
      { q: "¿Qué aporta contratar trabajadores para una propiedad?", a: "Contratas para tus propiedades trabajadores de entre la gente de esa ciudad (número de plazas según tipo y nivel). El trabajador aumenta la producción pero pide un salario mensual; con baja condición/prosperidad el salario puede comerse la ganancia. En el panel de trabajadores ves el ingreso neto mensual (verde/rojo). El rendimiento del trabajador viene de la edad + el encaje con su profesión + el temperamento." },
      { q: "¿Qué es la calidad de los objetos?", a: "Los bienes duraderos como armas, armaduras y elixires vienen en 4 calidades: defectuoso, corriente, bueno y obra maestra. Con una habilidad de Artesanía alta produces mejor calidad. Lo de calidad se vende más caro en el mercado; la calidad del arma/armadura que llevas también se refleja en tu poder de combate y tu defensa." },
      { q: "¿Para qué sirven el círculo del PNJ y 'ayudar a su meta'?", a: "Cada PNJ tiene una familia, amigos y rivales (su círculo) y una meta de vida; los ves en la pantalla del PNJ. Puedes ayudar a su meta (a cambio de monedas: gran cercanía + renombre Generoso) o explotarla (le sacas monedas pero quemas su confianza, renombre Cruel)." },
    ],
  },
  {
    icon: "scroll", title: "Estado, Corte y Profesión",
    items: [
      { q: "¿Cómo transcurre la campaña del soberano?", a: "La campaña ya no es una sola tirada: soltados los estandartes, el ejército marcha TRES MESES. El primer mes es la marcha (la vanguardia toma los pasos, o la lluvia vuelve barro el camino), el segundo es el asedio (los zapadores abren brecha, o la enfermedad cae sobre el campamento) — cada suceso mueve la fuerza del ejército. Al tercer mes se lee el veredicto: la fuerza acumulada se suma a tu probabilidad base. Los guardias del séquito y las casas aliadas refuerzan el ejército desde el inicio. Mientras dura la campaña arde una franja roja en el panel; si cae la corona, el ejército se dispersa y los estandartes vuelven." },
      { q: "¿Qué puedo hacer como gobernador?", a: "Con suficiente prestigio te vuelves gobernador de una ciudad (desde la pantalla del Reino). Ajustas la tasa de impuestos (ingresos ↔ contento del pueblo), gastas el tesoro de la ciudad en servicios y seguridad para la gente, y renuevas tu legitimidad con obras de caridad. Además puedes emitir DECRETOS (justicia, amnistía fiscal, trabajos forzados, mercado libre — con tiempo de espera y sus contrapartidas) y levantar OBRAS PÚBLICAS permanentes (fuente/puente/casa de caridad/torreón — suben la base de contento/ingresos + fama). Si tu legitimidad cae, te destituyen; si el pueblo se enfada demasiado, estalla la revuelta; de vez en cuando el Consejo Imperial reclama una parte del tesoro." },
      { q: "¿Qué cambia al subir al trono (soberano)?", a: "Cumpliendo los requisitos de edad, poder de tu casa, prestigio, fama y monedas — con el respaldo de un gremio (o un cargo de Visir o superior en la corte) — reclamas el trono. Como soberano tienes AUTORIDAD: emites decretos en el Consejo Imperial (carta de justicia, obras, amnistía general, festejo, impuesto duro), lanzas CAMPAÑAS contra los beyliks rivales (victoria → anexión + botín + fama) y nombras o destituyes GOBERNADORES leales en las ciudades (ingreso por tributo). La autoridad se desgasta si la descuidas; si toca fondo, una revuelta puede derribar tu trono. Los sucesos de palacio (embajadores, hambruna, intrigas del visir) afectan tu autoridad." },
      { q: "¿Qué es la Oportunidad de Profesión (acción distintiva)?", a: "Cada profesión tiene, más allá del trabajo normal, una acción distintiva propia con tiempo de espera (en la pantalla de Profesión): el herrero forja una obra maestra, el mercader parte en una expedición de comercio lejano, el sanador combate una epidemia, el soldado se une a una incursión fronteriza, el granjero organiza la fiesta de la cosecha… Se pone a prueba con el atributo principal de la profesión; el éxito trae, según tu rango, una gran ganancia + fama/prestigio + habilidad. Las peligrosas (herrero/pescador/cazador/soldado/sanador) arriesgan tu salud si fracasas." },
      { q: "¿Cómo entro en la corte y cuáles son los rangos?", a: "Si no estás en el trono (16+ años, prestigio e inteligencia suficientes — más fácil si eres escriba), puedes entrar al servicio de la corte y el consejo desde la pantalla de Gremios y Órdenes. Empiezas como Escriba; cumpliendo el Servicio del Consejo ganas puntos de servicio + el favor del soberano + un salario, y asciendes: Tesorero → Canciller → Visir → Gran Visir. Puedes comprar favor ofreciendo un presente. El favor se desgasta si lo descuidas y, si toca fondo, te destituyen; hay intrigas de cortesanos rivales y mercedes del sultán. Un cargo de Visir o superior te da respaldo para aspirar al trono." },
    ],
  },
  {
    icon: "banner", title: "Caminos de la dinastía (sistemas nuevos)",
    items: [
      { q: "¿Qué son el hijo predilecto y la crisis de sucesión?", a: "Pasados los 35 años, con dos o más hijos vivos, puedes nombrar a uno predilecto desde la pantalla de Generación: el lazo del predilecto se afianza, los lazos de los hermanos se resienten y la tensión sucesoria se acumula en el hogar. Si la tensión desborda, estalla un pleito de herencia (cuesta akçe y reputación) y entre medias caen escenas de reproche. Cambiar de predilecto más tarde también tiene precio. La recompensa se ve en la muerte: si el hogar pasa al predilecto, el heredero empieza con +5 de reputación; si pasa a otro, con -5." },
      { q: "¿Cómo funcionan los Juegos de sombras (intriga)?", a: "Desde la pantalla de dinastía urdes una conspiración de mancha, sabotaje o discordia contra una casa rival (con coste). La obra se teje en meses; tu inteligencia, las manos contratadas y la Hermandad de la Sombra la aceleran. Si los rumores se acumulan quedas expuesto: pérdida de reputación y honor, riesgo de vendetta — y el intrigante coronado sangra legitimidad. Ojo: las casas rencorosas también traman contra ti; pon oreja en el bazar o un jefe de espías te avisará solo." },
      { q: "¿Qué dan el séquito y la corte?", a: "Desde la pantalla de guerra contratas hasta tres guardias: cada uno suma poder en batalla y disuade a los bandidos; cobran paga mensual y se van uno a uno si no la reciben. Como soberano además nombras visir (mantiene la autoridad), tesorero (aumenta la renta) y jefe de espías (avisa de las tramas al instante); si cae la corona, la corte se disuelve." },
      { q: "¿El corro de dados es rentable?", a: "En el rincón de la posada juegas una mano al mes; la casa siempre lleva ventaja — a la larga pierdes, y tu fama piadosa también sufre. Juega por la emoción, no para vivir." },
      { q: "¿Qué da la Oración?", a: "La Oración es una ocupación adulta: serena el corazón, aumenta tu fama de Devoto y algo de salud; a veces conversas con un derviche. En la vejez el mismo camino es la Logia." },
      { q: "La enfermedad no me suelta, ¿qué hago?", a: "Hay dos crónicas: después de los 35, en un cuerpo débil, la tos se asienta en el pecho (drena cada mes, a veces se aviva); después de los 48 el dolor articular llega con la edad — alcanza también al sano, drena menos pero se agarrota más a menudo y su cura es más terca. Ver al sanador recupera salud y cada visita puede curar la crónica." },
      { q: "¿Para qué sirve el fondo de la fundación?", a: "Tras fundarla puedes donar sin límite (una vez al mes). En 25 mil / 100 mil / 250 mil / 1 millón la fundación sube de rango: ganas fama y renombre generoso. El fondo también fluye a tu elegía y al prestigio inicial del heredero." },
      { q: "¿Qué pasa con mis cosas al morir?", a: "El arma que llevas pasa al arcón del heredero como reliquia, con su calidad. La riqueza pasa según el testamento; propiedades y mansión pasan enteras; el resto se va con tu vida." },
      { q: "¿Cómo tomo un aprendiz y qué me da?", a: "Puedes ofrecer el aprendizaje a un joven cercano desde su perfil. Guíalo mes a mes; a los 24 meses tu aprendiz se hace maestro — tu nombre crece en el oficio. El aprendiz del antepasado puede llamar años después a la puerta del heredero." },
      { q: "¿Cómo empieza y acaba una venganza de sangre?", a: "Si la relación con una casa toca fondo, puede saltar la chispa. Al calentarse, crecen las emboscadas. Desde la pantalla de dinastía puedes pagar la paz o devolver el golpe; al final espera la batalla campal. La venganza inconclusa pasa al heredero con la mitad del calor." },
      { q: "¿Cómo se hacen las alianzas y pueden romperse?", a: "Desde la lista de casas puedes proponer alianza a las que no sean frías, o enviar casamenteros si estás soltero (un intento al mes). Su actitud y tu prestigio fijan la suerte; el rechazo baja la actitud. La alianza pasa al heredero — pero si la amistad se enfría del todo, el apretón se rompe." },
    ],
  },
  {
    icon: "family", title: "El hogar vivo (Nuevo)",
    items: [
      { q: "¿Qué es la Cinta de una Vida y dónde se abre?", a: "El botón dorado al inicio de la crónica (cuando se reúnen tres o más hitos), o el enlace 'Ver la cinta de la vida' en la pantalla de muerte, reproduce los grandes momentos de tu vida a pantalla completa, cuadro a cuadro. Los cuadros fluyen solos (cada cuatro segundos aproximadamente), un toque avanza al siguiente y el último cuadro baja el telón por sí mismo. En modo de movimiento reducido el flujo automático está apagado — avanzas tocando." },
      { q: "¿Qué es la pequeña tarjeta de elección del panel?", a: "De vez en cuando cae un momento de una línea durante el mes: un aguacero, un gato callejero, una bandeja volcada... Elige una de dos opciones pequeñas o ignórala — desaparece sola al pasar el mes. Sus efectos son mínimos; está para dar color a la vida." },
      { q: "¿Qué me da pasar tiempo con mi cónyuge?", a: "El botón de la pantalla de personaje fluye según su temperamento: el cariñoso consuela, el diligente lleva las cuentas (vuelve la mitad del convite), con el testarudo discutes y ríes, con el devoto compartes la oración de la tarde. Cada vez crece el vínculo conyugal; el vínculo marca el calor del aniversario y el dolor de la viudez." },
      { q: "¿Para qué sirve el vínculo con los hijos?", a: "El botón Ocúpate de tus hijos abre una escena según la edad del menor: juego con el bebé, lecciones con el escolar, oficio con el joven, mesa con el adulto. Cada gesto agranda el vínculo. Un heredero con vínculo alto (60+) empieza con +2 de reputación; la niña de tus ojos (85+), con +1 punto de atributo." },
      { q: "¿El juego se apaga en la vejez?", a: "No — pasados los 70 la vida trae sus propios recuerdos: la soledad del alba, el puesto vacío de un viejo amigo, tu nombre caminando delante de ti... Los arcos de los 55+, los nietos y la senda del Tekke son la trama de esa edad." },
      { q: "¿Por qué cada batalla se cuenta distinto?", a: "Cada encuentro tiene su propia historia de victoria y derrota: encadenas al cabecilla, Kara Alp se arrodilla ante ti... Los encuentros legendarios (el Terror Nocturno, Kara Alp) solo te encuentran cuando tu nombre ya suena." },
    ],
  },
  {
        icon: "banner", title: "El Reino en Línea (Multijugador)",
    items: [
      { q: "¿Qué es el Pergamino de Regreso?", a: "Cada vez que vuelves al reino, las nuevas personales acumuladas en tu ausencia (oro de regalos, rescates, bodas, herencias, botín...) se listan en un pergamino a pantalla completa: las primeras ocho línea a línea, el resto en el diario; tu diferencia de oro aparece en verde o rojo. Un toque te devuelve al concejo — nada se pierde en silencio." },
      { q: "¿Cómo funciona la conjura conjunta?", a: "Desde la pantalla de diplomacia te unes a una conjura contra un bey en el trono (nadie encadenado puede unirse; aliados y cónyuges están protegidos). La conjura es secreta — solo los miembros la ven. Cuando llega la segunda mano y reposa un mes, los dados ruedan la noche del golpe: el poder combinado de los miembros se pesa contra el poder del bey y las defensas del estandarte. Con éxito, el miembro más fuerte ocupa el asiento, pero TODOS pagan parte de su honor; la noticia nunca nombra a las manos que abrieron las puertas desde dentro. Una conjura frustrada arroja los nombres de sus miembros al bazar y el honor sufre una herida grave. Si el bey tiene VIGÍA, los susurros se oyen: la probabilidad del golpe se reduce a la mitad. Una conjura sola tres meses se apaga." },
      { q: "¿Pueden robar la caravana común?", a: "Sí — quien no tenga parte puede tender una emboscada en el desfiladero desde la tarjeta de la caravana (una sola emboscada; el primero se la queda, y nadie encadenado puede intentarlo). La noche del regreso ruedan los dados: si el asalto triunfa, el 60 por ciento del fondo va al emboscado enmascarado, los socios reciben un reembolso roto y no se dice ningún nombre — aunque el honor del asaltante se erosiona en silencio. Si algún socio tiene VIGÍA de guardia, las probabilidades caen en picado; una emboscada frustrada se anuncia al reino con nombre y el honor sufre una herida grave. Si ves sombras insinuadas en la ruta, es hora de contratar vigía." },
      { q: "Si un bey muere en el reino, ¿quién se queda con el estandarte?", a: "Si vive un cónyuge unido por pacto matrimonial, el estandarte pasa directamente a esa persona: la noticia recorre todo el reino, el cónyuge ocupa el asiento y la carrera de reclamos ni se abre. Si no hay cónyuge (o también falleció), el estandarte queda vacante, el hogar vuelve a un PNJ y el beylicato se abre de nuevo a reclamos. En este reino el matrimonio no es solo cosa del corazón: es un seguro de sucesión." },
      { q: "¿Cómo funcionan la captura y el rescate?", a: "Desde la pantalla de diplomacia abres un duelo de captura contra un bey (el defensor tiene ventaja; más aún si tiene vigía). Si ganas, el rival queda encadenado: sin campañas, duelos ni trono hasta pagar el rescate. Cuando paga, el oro cae en tu bolsa; o libéralo sin rescate (+honor). Si el rescate no se paga en 12 meses, el rehén escapa y el honor del captor sufre." },
      { q: "¿Qué ofrece la guardia del vigía?", a: "Desde diplomacia contratas un vigía por 250 akçe, seis meses. Mientras dura la guardia, las probabilidades de asesinato contra ti se reducen a la mitad, los saboteadores caen con mucha más facilidad, los espías son notados incluso si triunfan — y sabrás quiénes eran; los intentos de encadenarte chocan con un muro más alto. Al terminar el plazo recibes aviso y puedes renovar." },
      { q: "¿Cómo se siente el reino multijugador? ¿Qué es la franja de compañeros?", a: "La pantalla del reino lleva una franja viva de compañeros: quién está en línea, quién votó avanzar el mes, tu nombre en oro. Los gritos de un toque (saludo, elogio, desafío, llamada de ayuda) llegan al instante a todos; las últimas 12 palabras del chat general se guardan en el reino, y quien llega tarde escucha la sala desde donde quedó." },
      { q: "¿Cómo se ganan los laureles anuales (Bey/Estrella/Magnánimo del año)?", a: "Al cerrar cada año de juego el servidor reparte tres laureles: quien más creció su PODER es el Bey del año, quien más subió su FAMA es la Estrella del año y quien más elevó su HONOR es el Magnánimo del año. La insignia se ve junto al nombre durante un año y puede cambiar de manos al siguiente cierre. Tu primer año es de medición; sin crecimiento no hay laurel en esa rama." },
      { q: "¿Cómo funciona la elección del presidente del consejo?", a: "Desde la pantalla de diplomacia puedes dar tu voto a cualquier bey durante todo el año; vale el último voto y no puedes votarte a ti mismo. Al cierre del año, el más votado (en empate, el de mayor honor) es elegido presidente y lleva la insignia un año. El cargo no da poder — da peso: todos ven a quién eligieron." },
      { q: "¿Qué es respaldar una campaña ('dar el hombro')?", a: "Si un bey marcha este mes contra un beylicato, puedes respaldarlo desde diplomacia: la mitad de tu poder personal se suma a su ejército. En la victoria cae un aviso de botín; ganes o pierdas, ganas honor por cumplir tu palabra (también alimenta el laurel del Magnánimo). No puedes respaldar tu propia campaña." },
    ],
  },
  {
    icon: "scroll", title: "El Juramento de Ceniza (Saga principal)",
    items: [
      { q: "¿Qué es el Libro de Sangre y cómo se abre y se cierra?", a: "Cuando una disputa con una casa se tiñe de sangre (etapa 3), se abre el Libro de Sangre: el caso queda escrito en el linaje. La primera generación jura el pacto de sangre o promete paz en la Escritura de Sangre; a quien jura le llega la escena del Primer Precio (asalto nocturno o el juez). El libro pasa al heredero — puedes continuarlo o quemarlo en el hogar (+honor). La segunda generación mide su sombra en el bazar; en la tercera llega la noche del Veredicto: matanza, parentesco o precio. Elijas el final que elijas, el libro se cierra y el logro 'El libro cerrado' es tuyo." },
      { q: "Que es el Juramento de Ceniza y como empieza?", a: "La historia principal del juego, que abarca generaciones. En los primeros anios tras cumplir 13, el anciano de la aldea te llama a su lecho y te confia un sello gris ceniza. Si lo aceptas, la saga comienza; si te retiras, el sello llama una vez mas dos anios despues." },
      { q: "Puedo perderme una escena? Donde veo mi progreso?", a: "No puedes perderla: las escenas esperan en el tablero, en la tarjeta dorada del Juramento de Ceniza, y nunca desaparecen. Tu acto actual y las escenas superadas se muestran en la banda del juramento de la ficha de personaje." },
      { q: "Que pasa si muero o vendo el sello?", a: "La saga pasa a tu heredero y continua donde quedo. Vender el sello a Karakus abre la rama de la traicion: ninguna puerta se abre hasta recobrarlo y pagar la expiacion. Completar la saga otorga el logro Juramento Cumplido; los herederos posteriores nacen con la Insignia del Sello (+2 de reputacion)." },
    ],
  },
];

const PT: FaqSection[] = [
  {
    icon: "hourglass", title: "Tempo & Vida",
    items: [
      { q: "Como avançam os meses/anos?", a: "Avanças o tempo com o botão grande do ecrã principal. A cada avanço a tua fome diminui, acontecem eventos e, de vez em quando, surge um dilema ou uma oportunidade." },
      { q: "O que fazem a fome e a saúde?", a: "Se a fome chegar a 0, a tua saúde começa a esgotar-se. Se a saúde chegar a 0, a tua personagem morre. Recuperas a fome comendo e a saúde descansando ou com curas." },
      { q: "O que acontece quando morro?", a: "Se tiveres um herdeiro, continuas com a vida dele (nova geração). Parte da tua herança, um terço da tua fama e a tua terra natal passam ao herdeiro." },
    ],
  },
  {
    icon: "shield", title: "Atributos & Perícias",
    items: [
      { q: "Para que servem os atributos (Força/Inteligência/Carisma/Resistência)?", a: "A Força conta no combate, a Inteligência no comércio/ofício, o Carisma na conversa/regateio/crime, a Resistência no trabalho e na fadiga. Os ferimentos podem baixar temporariamente os atributos." },
      { q: "Como ganho e gasto pontos de atributo?", a: "Ganhas ao estudar na escola (de vez em quando), nos exames e nalguns eventos. Distribuis no ecrã da Personagem pelo atributo que quiseres (limite de 10 por atributo)." },
      { q: "Como evoluem as perícias (Combate/Comércio/Ofício/Social)?", a: "Sobem por si à medida que ages: lutar desenvolve o Combate, regatear/negociar o Comércio, produzir na oficina o Ofício, conversar/ir à escola o Social. Nos níveis 3, 6 e 9 desbloqueias um dote na Árvore de Perícias." },
    ],
  },
  {
    icon: "flame", title: "Reputação · Honra · Medo · Fama",
    items: [
      { q: "O que determina a Fama?", a: "O QUANTO e ATÉ ONDE o teu nome é conhecido. Com fama baixa, ninguém te conhece nas cidades distantes; o teu carácter (honra/medo etc.) só chega aos outros na medida em que és reconhecido." },
      { q: "O que é o reconhecimento? Terra natal vs terras alheias?", a: "É o grau em que uma pessoa comum do sítio onde estás reage ao teu nome. Na tua terra natal (cidade onde nasceste) toda a gente te conhece um pouco; noutra cidade só a tua fama te acompanha. No ecrã da Personagem vês 'como o povo te vê' + a percentagem de reconhecimento." },
      { q: "Prós e contras da Honra?", a: "PRÓS: o casamento e os acordos com famílias respeitáveis tornam-se mais fáceis, ganhas reputação depressa nas guildas honradas, as casas confiam em ti. CONTRAS: se fores apanhado num crime, a tua reputação cai com mais força — tens um nome a perder." },
      { q: "Prós e contras do Medo?", a: "PRÓS: o teu êxito no crime aumenta (a vítima gela), a tua palavra pesa no regateio (o mercador baixa o preço para se ver livre de ti). CONTRAS: as pessoas retraem-se na conversa, as hipóteses de casamento caem, as guildas honradas mantêm distância." },
      { q: "Como muda a Reputação?", a: "Banquetes, esmolas, tarefas de guilda, oportunidades e escolhas honradas fazem-na subir; o crime, a intimidação e o fracasso fazem-na descer. Determina a atitude das casas para contigo e abre ou fecha certas portas." },
    ],
  },
  {
    icon: "star", title: "Renome (A Cor da Tua Fama)",
    items: [
      { q: "O que é o Renome?", a: "O carácter que o teu nome carrega: Generoso, Cruel, Mulherengo, Devoto, Valente. Acumula-se com os teus atos e molda a forma como as pessoas te abordam (na medida do reconhecimento)." },
      { q: "Generoso / Devoto", a: "Generoso: ganha-te o afeto do povo e suaviza a intimidação (já não metes medo). Devoto: acrescenta respeito e aproxima-te das famílias devotas; mas se um devoto for apanhado num crime, a hipocrisia é punida com mais dureza." },
      { q: "Mulherengo / Valente", a: "Mulherengo: facilita criar laços com namoricos e elogios; mas as famílias tradicionais/leais arreceiam-se desse renome. Valente: é respeitado em todas as casas e ganha lealdade de aliados e guildas; mas a tua honestidade dificulta os trabalhos sorrateiros (crime)." },
      { q: "Cruel", a: "Junta-se ao medo e aumenta o poder de intimidação/crime; mas faz-te perder o afeto do povo e a confiança das instituições honradas." },
    ],
  },
  {
    icon: "coins", title: "Dinheiro & Sustento",
    items: [
      { q: "Como ganho dinheiro?", a: "Arranja uma profissão e trabalha; compra e vende no mercado; produz na oficina e vende; compra propriedades e recolhe rendas/rendimentos; aceita tarefas de guilda e oportunidades." },
      { q: "Como funciona o regateio?", a: "A tua hipótese no regateio depende do Carisma + perícia de Comércio; se tiveres êxito, obténs desconto. Se fores conhecido (amado ou temido), a tua palavra pesa mais." },
      { q: "O que é preciso para produzir na oficina?", a: "As receitas comuns não pedem profissão: basta Ofício suficiente e os materiais. Só as receitas de mestria (cesto de primícias, peixe salgado, pão de mel, cafetã de lã) pertencem ao seu ofício — o cartão indica-o. O cartão de cada receita mostra o nível e os materiais exigidos (tens/precisas). Produzir desenvolve o Ofício." },
    ],
  },
  {
    icon: "family", title: "Relações & Casamento",
    items: [
      { q: "Como desenvolvo uma relação?", a: "Abre o cartão de uma pessoa e conversa (dois dedos de conversa, elogio, ouvir desabafos, piada), dá presentes. Cada pessoa tem a sua índole; a intenção errada pode sair pela culatra. Um renome caloroso/querido aumenta os ganhos da conversa." },
      { q: "Como me caso?", a: "Precisas de 50+ de proximidade com a pessoa e ambos têm de ter 18+. Depois abre-se o 'Pedido de Casamento'. A hipótese de aceitação depende da proximidade + Carisma + do teu renome (valente/honra ajudam, mulherengo/medo prejudicam)." },
    ],
  },
  {
    icon: "crossed-swords", title: "Guildas · Guerra · Crime",
    items: [
      { q: "Como funciona o julgamento do cádi?", a: "Se te apanham num crime grave (salvo se usares coroa ou já estiveres na masmorra), compareces perante o cádi antes de a sentença cair; a cena espera no ecrã do crime. Três caminhos: chamar uma TESTEMUNHA se tiveres uma amizade próxima (a absolvição é provável, mas a amizade ressente-se), DEFENDERES-TE (falam o Carisma e o Intelecto; com êxito a multa cai para metade e a masmorra é poupada), ou SUBMETERES-TE (+1 honra, a pena conhecida). Se avanças o mês sem decidir, conta como submissão." },
      { q: "Como caio na masmorra e como saio?", a: "Se fores apanhado num crime grave (assalto ou pior) o cádi pode sentenciar-te; o Lar dos Soldados cumpre metade. Lá dentro, a oficina, as estradas, as guildas, as campanhas e o crime ficam fechados; cada mês derrete um mês de pena. A única saída antecipada é subornar o carcereiro — caro, e mancha a tua honra." },
      { q: "Como entro numa guilda?", a: "Primeiro acumula reputação (standing) fazendo tarefas para a guilda; ao passares o limiar, juntas-te às fileiras. As guildas honradas confiam mais depressa no valente/honrado; a Irmandade da Sombra, no medo/cruel." },
      { q: "Como funciona a guerra/frente?", a: "Se a organização a que pertences entrar em guerra, podes ir para a frente; a vitória traz fama, honra e renome de valente. Os teus inimigos (némesis) podem encontrar-te." },
      { q: "Devo cometer crimes?", a: "Bater carteiras/assaltar rende dinheiro rápido mas é arriscado. O êxito depende do Carisma + poder do medo; o castigo, se fores apanhado, depende da tua reputação. Quem é honrado/devoto perde muito mais ao ser apanhado." },
    ],
  },
  {
    icon: "compass", title: "Oportunidades & Dilemas",
    items: [
      { q: "O que são a vinha e a parte da colheita?", a: "A sexta escritura do livro é a vinha: 4000 akçe, +55 de renda base, 2 vagas de trabalhador — um degrau entre a casa e a loja. Além disso, quando um evento de colheita rebenta no mercado (a vindima, a tosquia farta, a colheita farta), os donos da propriedade correspondente recebem uma pequena parte por prédio; uma vez por evento, ajustada à inflação." },
      { q: "O que dá a senda da palavra?", a: "A quinta senda educativa do filho: 2 akçe por semana, e os meses acumulados tornam-se graus; quando esse filho herda, começa com perícia social e reputação extra. Trocar de senda reinicia a acumulação." },
      { q: "Os eventos repetem-se?", a: "As reservas crescem a cada versão: 24 petições no divã, 37 micro-momentos, 5 jornadas por ofício, 52 sussurros do bazar, 44 notícias do mundo e 16 encontros lendários. Além disso, os dilemas recentes ficam retidos por um tempo — há proteção contra repetição." },
      { q: "O que são as oportunidades/dilemas que aparecem no ecrã?", a: "Ao avançares o mês, de vez em quando surge uma oportunidade (aceitar/recusar) ou um dilema (escolha). As oportunidades trazem recompensa e risco; se o atributo exigido estiver alto, as tuas hipóteses de êxito aumentam." },
      { q: "Para que serve o ecrã de Tarefas?", a: "Reúne numa só lista os assuntos importantes pendentes (distribuir pontos de atributo, escolher um dote, casar, entrar numa guilda, guerra, herdeiro...) e leva-te ao ecrã certo. Em baixo tem também o painel de 'Marcos Familiares'." },
    ],
  },
  {
    icon: "castle", title: "Sistemas do Reino",
    items: [
      { q: "Como funciona a caravana? O que é a rota?", a: "No mercado investes moedas e envias uma caravana. A caravana segue uma rota origem→paragem(ns) intermédia(s)→destino, avançando uma paragem por mês. No caminho pode haver ataques de bandidos (a tua reputação, a perícia de comércio e o medo baixam o risco; a força e a perícia de combate reduzem a perda). À chegada, o lucro é calculado sobre o capital que sobreviveu. Podes acompanhar o progresso no ecrã principal e no mercado." },
      { q: "O que são o domínio do sanjaco e as guerras de guildas?", a: "Cada um dos 4 sanjacos é dominado por uma guilda. Com o tempo, guildas rivais cobiçam-nos, a tensão acumula-se e rebenta uma guerra por um sanjaco; quem vencer fica com ele. Se a tua guilda for parte, podes ir à frente a partir de Guildas e Ordens e influenciar o resultado. Se a tua guilda dominar o sanjaco onde estás, as tarefas de guilda aí pagam 25% mais." },
      { q: "O que ganho ao contratar trabalhadores para as propriedades?", a: "Contratas para as tuas propriedades trabalhadores de entre o povo dessa cidade (número de vagas conforme o tipo e o nível). O trabalhador aumenta a produção mas exige salário mensal; com estado/prosperidade baixos, o salário pode comer o lucro. O painel de trabalhadores mostra o rendimento líquido mensal (verde/vermelho). A produtividade vem da idade + adequação da profissão + índole." },
      { q: "O que é a qualidade dos itens?", a: "Os bens duráveis como armas, armaduras e elixires têm 4 qualidades: defeituoso, comum, bom e obra-prima. Com perícia de Ofício alta produzes com mais qualidade. Os bens de qualidade vendem-se mais caros no mercado; a qualidade da arma/armadura que trazes equipada também se reflete no teu poder de combate e na tua defesa." },
      { q: "O que são o círculo do NPC e a 'ajuda à meta'?", a: "Cada NPC tem uma família, amigos e rivais (o seu círculo) e uma meta de vida; vês tudo isso no ecrã do NPC. Podes ajudar a sua meta (a troco de moedas, ganhas grande proximidade + renome de generoso) ou explorá-la (arrancas moedas mas queimas a confiança dele, renome de cruel)." },
    ],
  },
  {
    icon: "scroll", title: "Estado, Corte & Profissão",
    items: [
      { q: "Como decorre a campanha do soberano?", a: "A campanha já não é um só lance: soltos os estandartes, o exército marcha TRÊS MESES. O primeiro mês é a marcha (a vanguarda toma os desfiladeiros, ou a chuva torna o caminho em lama), o segundo é o cerco (os sapadores abrem brecha, ou a doença cai sobre o acampamento) — cada evento mexe na força do exército. No terceiro mês lê-se o veredicto: a força acumulada soma-se à tua probabilidade base. Os guardas do séquito e as casas aliadas reforçam o exército desde o início. Enquanto dura a campanha arde uma faixa vermelha no painel; se a coroa cai, o exército dispersa e os estandartes voltam." },
      { q: "O que posso fazer como governador?", a: "Com reputação suficiente tornas-te governador de uma cidade (a partir do ecrã do Reino). Ajustas a taxa de imposto (receita ↔ contentamento do povo), gastas o tesouro da cidade em serviços/segurança para o povo e renovas a tua legitimidade com obras de caridade. Além disso podes emitir DECRETOS (justiça, perdão fiscal, corveia, mercado livre — com tempo de espera e contrapartidas) e mandar erguer OBRAS PÚBLICAS permanentes (fonte/ponte/cozinha de caridade/torreão — sobem a base de contentamento/receita + fama). Se a tua legitimidade cair és destituído, se o povo ficar muito ressentido rebenta uma revolta; de vez em quando o conselho imperial exige uma parte do tesouro." },
      { q: "O que muda quando subo ao trono (soberano)?", a: "Cumprindo os requisitos de idade, poder da dinastia, reputação, fama e moedas — e com o apoio de uma guilda (ou um posto de Vizir+ na corte) — reivindicas o trono. Como soberano passas a ter AUTORIDADE: emites decretos no conselho imperial (édito de justiça, campanha de obras, amnistia geral, festa, imposto severo), lanças CAMPANHAS contra beilhiques rivais (vitória → anexação + espólio + fama) e nomeias/destituis GOVERNADORES leais nas cidades (receita de tributo). A autoridade desgasta-se se for negligenciada; se bater no fundo, uma revolta pode derrubar o teu trono. Os eventos da corte (enviados, fome, intrigas de vizires) afetam a tua autoridade." },
      { q: "O que é a Oportunidade de Profissão (ação de assinatura)?", a: "Para lá do trabalho normal, cada profissão tem uma ação de assinatura própria, com tempo de espera (no ecrã de Profissão): o ferreiro forja uma obra-prima, o mercador parte numa expedição de comércio longínquo, o curandeiro combate uma epidemia, o soldado junta-se a uma incursão na fronteira, o agricultor organiza a festa da colheita… É testada com o atributo base da profissão; o êxito traz um grande ganho conforme o teu escalão + fama/reputação + perícia. As perigosas (ferreiro/pescador/caçador/soldado/curandeiro) arriscam a tua saúde em caso de fracasso." },
      { q: "Como entro na corte e quais são os postos?", a: "Se não estiveres no trono (16+ anos, reputação e inteligência suficientes — mais fácil se fores escrivão), podes entrar ao serviço da corte/conselho a partir do ecrã de Guildas e Ordens. Começas como Escrivão e, ao cumprir o Dever do Conselho, ganhas pontos de serviço + favor do soberano + salário, subindo a Tesoureiro → Chanceler → Vizir → Grão-Vizir. Podes oferecer um presente para comprar favor. O favor desgasta-se se for negligenciado e, se bater no fundo, és destituído; há intrigas de cortesãos rivais e mercês do soberano. Um posto de Vizir+ dá-te apoio para reivindicar o trono." },
    ],
  },
  {
    icon: "banner", title: "Caminhos da dinastia (sistemas novos)",
    items: [
      { q: "O que são o filho predileto e a crise de sucessão?", a: "Passados os 35 anos, com dois ou mais filhos vivos, podes nomear um predileto no ecrã de Geração: o laço do predileto firma-se, os laços dos irmãos ressentem-se e a tensão sucessória acumula-se no lar. Se a tensão transborda, estala um pleito de herança (custa akçe e reputação) e pelo meio caem cenas de queixume. Trocar de predileto mais tarde também tem preço. A recompensa vê-se na morte: se o lar passa ao predileto, o herdeiro começa com +5 de reputação; se passa a outro, com -5." },
      { q: "Como funcionam os Jogos de sombras (intriga)?", a: "No ecrã da dinastia urdes uma conspiração de mancha, sabotagem ou discórdia contra uma casa rival (com custo). A obra tece-se em meses; a tua inteligência, as mãos contratadas e a Irmandade da Sombra aceleram-na. Se os sussurros se acumulam ficas exposto: perda de reputação e honra, risco de vendeta — e o intrigante coroado sangra legitimidade. Atenção: as casas rancorosas também tramam contra ti; põe o ouvido no bazar ou um mestre de espiões avisará sozinho." },
      { q: "O que dão o séquito e a corte?", a: "No ecrã de guerra contratas até três guardas: cada um soma poder em batalha e dissuade os bandidos; recebem soldo mensal e partem um a um se não for pago. Como soberano nomeias ainda vizir (mantém a autoridade), tesoureiro (aumenta a renda) e mestre de espiões (avisa das tramas no instante); caindo a coroa, a corte dissolve-se." },
      { q: "A roda dos dados compensa?", a: "No canto da estalagem jogas uma mão por mês; a casa leva sempre vantagem — a longo prazo perdes, e a tua fama piedosa também sofre. Joga pela emoção, não para viver." },
      { q: "O que dá a Oração?", a: "A Oração é uma ocupação adulta: assenta o coração, aumenta a tua fama de Devoto e um pouco de saúde; às vezes conversas com um dervixe. Na velhice o mesmo caminho é a Loja Sufi." },
      { q: "A doença não me larga — que faço?", a: "Há duas crónicas: depois dos 35, num corpo fraco, a tosse assenta no peito (drena por mês, por vezes reacende); depois dos 48 as dores nas juntas vêm com a idade — encontram também o saudável, drenam menos mas prendem mais vezes e a cura é mais teimosa. Ver o curandeiro recupera saúde e cada visita pode curar a crónica." },
      { q: "Para que serve o fundo da fundação?", a: "Depois de a fundares podes doar sem limite (uma vez por mês). Aos 25 mil / 100 mil / 250 mil / 1 milhão a fundação sobe de grau: ganhas fama e renome generoso. O fundo também flui para a tua elegia e o prestígio inicial do herdeiro." },
      { q: "O que acontece às minhas coisas quando morro?", a: "A arma que usas passa à arca do herdeiro como relíquia, com a sua qualidade. A riqueza passa pela parte do testamento; propriedades e mansão passam inteiras; o resto vai com a tua vida." },
      { q: "Como tomo um aprendiz e o que me dá?", a: "Podes oferecer a aprendizagem a um jovem próximo, no perfil dele. Orienta-o mês a mês; aos 24 meses o teu aprendiz torna-se mestre — o teu nome cresce no ofício. O aprendiz do antepassado pode bater anos depois à porta do herdeiro." },
      { q: "Como começa e acaba uma vingança de sangue?", a: "Se a relação com uma casa bater no fundo, a faísca pode saltar. Ao aquecer, crescem as emboscadas. No ecrã de dinastia podes pagar a paz ou retaliar; no fim espera a batalha campal. A vingança inacabada passa ao herdeiro com metade do calor." },
      { q: "Como se fazem as alianças e podem quebrar-se?", a: "Na lista de casas podes propor aliança às que não estejam frias, ou enviar casamenteiros se fores solteiro (uma tentativa por mês). A atitude delas e o teu prestígio definem a sorte; a recusa baixa a atitude. A aliança passa ao herdeiro — mas se a amizade esfriar de vez, o aperto de mão quebra." },
    ],
  },
  {
    icon: "family", title: "O lar vivo (Novo)",
    items: [
      { q: "O que é a Fita de uma Vida e onde se abre?", a: "O botão dourado no início da crónica (quando se juntam três ou mais marcos), ou a ligação 'Ver a fita da vida' no ecrã da morte, reproduz os grandes momentos da tua vida em ecrã inteiro, quadro a quadro. Os quadros fluem sozinhos (cerca de quatro em quatro segundos), um toque avança para o seguinte e o último quadro baixa o pano por si. No modo de movimento reduzido o fluxo automático está desligado — avanças tocando." },
      { q: "O que é o pequeno cartão de escolha no painel?", a: "De vez em quando cai um momento de uma linha durante o mês: um aguaceiro, um gato de rua, um tabuleiro virado... Escolhe uma de duas opções pequenas ou ignora — some sozinho quando o mês passa. Os efeitos são mínimos; existe para dar cor à vida." },
      { q: "O que ganho ao passar tempo com o meu cônjuge?", a: "O botão do ecrã de personagem corre conforme o temperamento: o carinhoso consola, o diligente faz as contas (metade do mimo volta), com o teimoso discutes e ris, com o devoto partilhas a oração da tarde. De cada vez o laço conjugal cresce; o laço define o calor do aniversário e a dor da viuvez." },
      { q: "Para que serve o laço com os filhos?", a: "O botão Cuida dos teus filhos abre uma cena conforme a idade do mais novo: brincadeira com o bebé, lições com o estudante, ofício com o jovem, mesa com o adulto. Cada gesto aumenta o laço. Um herdeiro com laço alto (60+) começa com +2 de reputação; a menina dos teus olhos (85+), com +1 ponto de atributo." },
      { q: "O jogo esmorece na velhice?", a: "Não — depois dos 70 a vida traz as suas próprias memórias: a solidão da alvorada, a banca vazia de um velho amigo, o teu nome a andar à tua frente... Os arcos dos 55+, os netos e a senda do Tekke são o tecido dessa idade." },
      { q: "Porque é que cada batalha é contada de forma diferente?", a: "Cada encontro tem a sua própria história de vitória e derrota: acorrentas o chefe dos salteadores, Kara Alp ajoelha-se diante de ti... Os encontros lendários (o Terror da Noite, Kara Alp) só te acham quando o teu nome já corre." },
    ],
  },
  {
        icon: "banner", title: "O Reino Online (Multijogador)",
    items: [
      { q: "O que é o Pergaminho de Regresso?", a: "Sempre que voltas ao reino, as novas pessoais acumuladas na tua ausência (ouro de presentes, resgates, casamentos, heranças, despojos...) são listadas num pergaminho de ecrã inteiro: as primeiras oito linha a linha, o resto no diário; a tua diferença de ouro aparece a verde ou vermelho. Um toque devolve-te ao conselho — nada se perde em silêncio." },
      { q: "Como funciona a conjura conjunta?", a: "No ecrã de diplomacia juntas-te a uma conjura contra um bei no trono (ninguém em correntes pode juntar-se; aliados e cônjuges estão protegidos). A conjura é secreta — só os membros a veem. Quando chega a segunda mão e repousa um mês, os dados rolam na noite do golpe: o poder combinado dos membros pesa-se contra o poder do bei e as defesas do estandarte. Com êxito, o membro mais forte ocupa o assento, mas TODOS pagam parte da honra; a notícia nunca nomeia as mãos que abriram as portas por dentro. Uma conjura frustrada lança os nomes dos membros no bazar e a honra sofre uma ferida grave. Se o bei tiver VIGIA, os sussurros são ouvidos: a probabilidade do golpe cai para metade. Uma conjura só durante três meses apaga-se." },
      { q: "A caravana comum pode ser roubada?", a: "Sim — quem não tem parte pode armar emboscada no desfiladeiro a partir do cartão da caravana (um só emboscador; o primeiro fica com ela, e ninguém em correntes pode tentar). Na noite do regresso rolam os dados: se o assalto vinga, 60 por cento do fundo vai para o emboscador mascarado, os sócios recebem um reembolso quebrado e nenhum nome é dito — embora a honra do assaltante se desgaste em silêncio. Se algum sócio tiver VIGIA de guarda, as probabilidades caem a pique; uma emboscada frustrada é anunciada ao reino com nome e a honra sofre uma ferida grave. Se vires sombras insinuadas na rota, é hora de contratar vigia." },
      { q: "Se um bei morre no reino, quem fica com o estandarte?", a: "Se vive um cônjuge unido por pacto de casamento, o estandarte passa diretamente a essa pessoa: a notícia corre todo o reino, o cônjuge ocupa o assento e a corrida de reivindicações nem chega a abrir. Se não há cônjuge (ou também partiu), o estandarte fica vago, o lar volta a um NPC e o beilhique reabre a reivindicações. Neste reino o casamento não é só coisa do coração: é um seguro de sucessão." },
      { q: "Como funcionam a captura e o resgate?", a: "No ecrã de diplomacia abres um duelo de captura contra um bei (o defensor tem vantagem; mais ainda se tiver vigia). Se venceres, o rival fica acorrentado: sem campanhas, duelos nem trono até pagar o resgate. Quando paga, o ouro cai na tua bolsa; ou liberta-o sem resgate (+honra). Se o resgate ficar por pagar 12 meses, o refém escapa e a honra do captor sofre." },
      { q: "O que dá a guarda do vigia?", a: "Na diplomacia contratas um vigia por 250 akçe, seis meses. Enquanto dura a guarda, as probabilidades de assassinato contra ti caem para metade, os sabotadores são apanhados com muito mais facilidade, os espiões são notados mesmo quando têm êxito — e ficas a saber quem eram; as tentativas de te acorrentar batem num muro mais alto. No fim do prazo és avisado e podes renovar." },
      { q: "Como é o reino multijogador? O que é a faixa de companheiros?", a: "O ecrã do reino traz uma faixa viva de companheiros: quem está online, quem votou avançar o mês, o teu nome a ouro. Os brados de um toque (saudação, elogio, desafio, pedido de ajuda) chegam no instante a todos; as últimas 12 palavras do chat geral ficam guardadas no reino, e quem chega tarde ouve a sala de onde parou." },
      { q: "Como se ganham os louros anuais (Bei/Estrela/Magnânimo do ano)?", a: "No fecho de cada ano de jogo o servidor entrega três louros: quem mais cresceu o PODER é o Bei do ano, quem mais subiu a FAMA é a Estrela do ano e quem mais elevou a HONRA é o Magnânimo do ano. A insígnia aparece junto ao nome por um ano e pode mudar de mãos no fecho seguinte. O primeiro ano é de medição; sem crescimento não há louro nesse ramo." },
      { q: "Como funciona a eleição do presidente do conselho?", a: "No ecrã de diplomacia podes dar o teu voto a qualquer bei durante o ano; vale o último voto e não podes votar em ti. No fecho do ano, o mais votado (em empate, o de maior honra) é eleito presidente e usa a insígnia por um ano. O cargo não dá poder — dá peso: todos veem quem foi escolhido." },
      { q: "O que é apoiar uma campanha ('dar o ombro')?", a: "Se um bei marcha este mês contra um beilhique, podes apoiá-lo pela diplomacia: metade do teu poder pessoal junta-se ao exército dele. Na vitória cai um aviso de espólios; ganhes ou percas, ganhas honra por cumprir a palavra (também alimenta o louro do Magnânimo). Não podes apoiar a tua própria campanha." },
    ],
  },
  {
    icon: "scroll", title: "O Juramento de Cinza (Saga principal)",
    items: [
      { q: "O que é o Livro de Sangue e como abre e fecha?", a: "Quando uma contenda com uma casa se tinge de sangue (fase 3), abre-se o Livro de Sangue: o caso fica escrito na linhagem. A primeira geração jura o pacto de sangue ou promete paz na Escrita de Sangue; a quem jura chega a cena do Primeiro Preço (assalto noturno ou o juiz). O livro passa ao herdeiro — podes continuá-lo ou queimá-lo na lareira (+honra). A segunda geração mede a sua sombra no bazar; na terceira chega a noite do Veredicto: matança, parentesco ou preço. Escolhas o fim que escolheres, o livro fecha e a conquista 'O livro fechado' é tua." },
      { q: "O que e o Juramento de Cinza e como comeca?", a: "A historia principal do jogo, que atravessa geracoes. Nos primeiros anos depois dos 13, o anciao da aldeia chama-te ao seu leito e confia-te um selo cinzento. Se o aceitares, a saga comeca; se recuares, o selo bate a porta mais uma vez, dois anos depois." },
      { q: "Posso perder uma cena? Onde vejo o meu progresso?", a: "Nao podes: as cenas esperam no painel, no cartao dourado do Juramento de Cinza, e nunca desaparecem. O ato atual e as cenas vencidas aparecem na faixa do juramento na ficha de personagem." },
      { q: "O que acontece se eu morrer ou vender o selo?", a: "A saga passa ao teu herdeiro e continua de onde parou. Vender o selo a Karakus abre o ramo da traicao: nenhuma porta se abre ate o recuperares e pagares a expiacao. Completar a saga da a conquista Juramento Cumprido; os herdeiros seguintes nascem com a Insignia do Selo (+2 de reputacao)." },
    ],
  },
];

const AR: FaqSection[] = [
  {
    icon: "hourglass", title: "الزمن والحياة",
    items: [
      { q: "كيف يتقدّم الشهر/السنة؟", a: "تقدّم الزمن بالزرّ الكبير في الشاشة الرئيسية. مع كل تقدّم ينخفض جوعك، وتقع أحداث، وتظهر بين الحين والآخر معضلة أو فرصة." },
      { q: "ماذا يفعل الجوع والصحة؟", a: "إذا هبط الجوع إلى 0 بدأت صحّتك بالذوبان. وإذا بلغت الصحة 0 ماتت شخصيّتك. بالأكل تستعيد جوعك، وبالراحة/العلاج تستعيد صحّتك." },
      { q: "ماذا يحدث حين أموت؟", a: "إن كان لك وريث واصلت اللعب بحياته (جيل جديد). ينتقل إلى الوريث جزء من ثروتك وثلث شهرتك ومسقط رأسك." },
    ],
  },
  {
    icon: "shield", title: "الصفات والمهارات",
    items: [
      { q: "ما فائدة الصفات (القوّة/الذكاء/الكاريزما/التحمّل)؟", a: "القوّة تنفع في القتال، والذكاء في التجارة والحِرفة، والكاريزما في الحديث والمساومة والجريمة، والتحمّل في العمل والإرهاق. وقد تُنقص الجروح الصفات مؤقتًا." },
      { q: "كيف أكسب نقاط الصفات وكيف أنفقها؟", a: "تكسبها أثناء الدراسة في المكتب (بين الحين والآخر) وفي الامتحانات وبعض الأحداث. وتوزّعها من شاشة الشخصية على الصفة التي تريد (سقف الصفة 10)." },
      { q: "كيف تنمو المهارات (القتال/التجارة/الحِرفة/الاجتماعية)؟", a: "تنمو تلقائيًا مع أفعالك: القتال يرفع مهارة القتال، والمساومة والبيع والشراء التجارة، والإنتاج في الورشة الحِرفة، والحديث والمكتب المهارة الاجتماعية. وعند المستويات 3 و6 و9 تُفتَح موهبة من شجرة المهارات." },
    ],
  },
  {
    icon: "flame", title: "السمعة · الشرف · الخوف · الشهرة",
    items: [
      { q: "ماذا تحدّد الشهرة؟", a: "كم يُعرَف اسمك وإلى أيّ مدى يبلغ. حين تكون شهرتك منخفضة لا يعرفك أحد في المدن البعيدة؛ وشخصيّتك (شرفك وخوفك وغيرهما) لا تنعكس عليك إلا بقدر ما يعرفك الناس." },
      { q: "ما التعرّف؟ ومسقط الرأس مقابل الغربة؟", a: "هو درجة تعامل شخص عاديّ معك بحسب اسمك حيثما كنت. في مسقط رأسك (مدينة مولدك) يعرفك الجميع قليلًا؛ وإذا ذهبت إلى مدينة أخرى لم يحملك إلا شهرتك. وفي شاشة الشخصية ترى «كيف يراك الناس» + نسبة التعرّف عليك." },
      { q: "الشرف — ما له وما عليه؟", a: "لَه: يسهل الزواج والاتفاق مع الأُسَر المحترمة، وتُكسَب المكانة في النقابات الشريفة أسرع، وتثق بك البيوت. وعليه: إن قُبض عليك في جريمة هبطت سمعتك هبوطًا أقسى — فلك اسم تخسره." },
      { q: "الخوف — ما له وما عليه؟", a: "لَه: يزداد نجاحك في الجريمة (يتجمّد الضحية)، وتُسمَع كلمتك في المساومة (ينزل التاجر بالسعر ليتخلّص منك). وعليه: يتحفّظ الناس في الحديث معك، وتهبط فرص الزواج، وتقف النقابات الشريفة منك على مسافة." },
      { q: "كيف تتغيّر السمعة؟", a: "ترفعها الولائم والصدقة ومهامّ النقابة والفرص والخيارات الشريفة؛ وتخفضها الجريمة والترهيب والفشل. وهي تحدّد موقف الأُسَر منك وتفتح بعض الأبواب أو تغلقها." },
    ],
  },
  {
    icon: "star", title: "الصيت (لون شهرتك)",
    items: [
      { q: "ما الصيت؟", a: "الشخصية التي يحملها اسمك: كريم، قاسٍ، ماجن، تقيّ، شجاع. يتراكم بأفعالك ويشكّل طريقة تعامل الناس معك (بقدر التعرّف عليك)." },
      { q: "كريم / تقيّ", a: "الكريم: يكسبك محبّة في عيون العامّة ويليّن الترهيب (فلم تعُد مخيفًا). التقيّ: يزيدك وقارًا ويقرّبك من الأُسَر المتديّنة؛ لكن إن قُبض على التقيّ في جريمة عوقب على الرياء عقابًا أشدّ." },
      { q: "ماجن / شجاع", a: "الماجن: يسهّل بناء العلاقات بالغزل والإطراء؛ لكنّ الأُسَر العريقة/الوفيّة تنفر من هذا الصيت. الشجاع: يُحترَم في كل بيت ويكسبك ولاء الحلفاء والنقابة؛ لكنّ استقامتك تصعّب الأعمال الخفيّة (الجريمة)." },
      { q: "قاسٍ", a: "يجتمع مع الخوف فيزيد قوّة الترهيب والجريمة؛ لكنه يفقدك محبّة العامّة وثقة المؤسّسات الشريفة." },
    ],
  },
  {
    icon: "coins", title: "المال والمعيشة",
    items: [
      { q: "كيف أكسب المال؟", a: "اتّخذ مهنة واعمل؛ بِع واشترِ في السوق؛ أنتج في الورشة وبِع؛ اشترِ أملاكًا واجمع الإيجار/الدخل؛ وتولَّ مهامّ النقابة والفرص." },
      { q: "كيف تعمل المساومة؟", a: "حظّك في المساومة يعتمد على الكاريزما + مهارة التجارة؛ فإن نجحت نلت خصمًا. وإن كنت معروفًا (محبوبًا أو مهيبًا) كان لكلمتك وقع أكبر." },
      { q: "ماذا يلزم للإنتاج في الورشة؟", a: "الوصفات العادية لا تشترط مهنة: تكفي مهارة حِرفة كافية والموادّ. أما وصفات الإتقان (سلة البواكير، السمك المملح، كعكة العسل، قفطان الصوف) فهي حكر على أصحاب مهنتها — والبطاقة تبيّن ذلك. وفي بطاقة كل وصفة يُكتَب المستوى المطلوب والموادّ (المتوافر/المطلوب). والإنتاج يطوّر الحِرفة." },
    ],
  },
  {
    icon: "family", title: "العلاقات والزواج",
    items: [
      { q: "كيف أطوّر العلاقة؟", a: "ادخل بطاقة الشخص وتحدّث إليه (سلام وسؤال، إطراء، إصغاء إلى الهموم، مزاح) وقدّم هديّة. لكلّ شخص مزاجه؛ والنيّة الخاطئة قد ترتدّ عليك. والصيت الدافئ/المحبوب يزيد كسبك من الحديث." },
      { q: "كيف أتزوّج؟", a: "يلزم أن تبلغ الألفة مع الطرف الآخر 50+، وأن يكون كلاكما 18+. عندها يظهر «عرض الزواج». وفرصة القبول تعتمد على الألفة + الكاريزما + صيتك (الشجاعة/الشرف يرفعانها، والمجون/الخوف يخفضانها)." },
    ],
  },
  {
    icon: "crossed-swords", title: "النقابات · الحرب · الجريمة",
    items: [
      { q: "كيف تجري محاكمة القاضي؟", a: "إن وقعت في جرم ثقيل (ما لم تكن على العرش أو في الزنزانة أصلا) مثلت أمام القاضي قبل نزول العقوبة؛ والمشهد ينتظر في شاشة الجريمة. ثلاث طرق: استدعاء شاهد إن كان لك صديق وثيق (البراءة راجحة لكن الصداقة تنجرح)، أو الدفاع عن النفس (تتكلم الكاريزما والذكاء؛ عند النجاح تنصف الغرامة وتسقط الزنزانة)، أو الإذعان (+1 شرف والعقوبة المعروفة). وإن قدمت الشهر بلا قرار حسب إذعانا." },
      { q: "كيف أقع في الزنزانة وكيف أخرج؟", a: "إن قُبض عليك في جريمة كبيرة (سطو فما فوق) فقد يحكم القاضي بالسجن؛ وأهل موقد الجند يقضون نصف المدة. في الداخل تُغلق الورشة والطرق والنقابات والحملات والجريمة؛ وكل شهر يذيب شهرًا من الحكم. المخرج المبكر الوحيد رشوة السجّان — وهي مكلفة وتلطّخ شرفك." },
      { q: "كيف أنضمّ إلى نقابة؟", a: "اكسب أولًا مكانة لدى النقابة بأداء المهامّ؛ فإذا تجاوزت العتبة انضممت إلى صفوفها. النقابات الشريفة تثق بالشجاع/الشريف أسرع، وأخوية الظل تثق بالخوف/القسوة أسرع." },
      { q: "كيف تعمل الحرب/الجبهة؟", a: "إذا دخل التنظيم الذي تنتمي إليه حربًا أمكنك الذهاب إلى الجبهة؛ والنصر يكسبك شهرة وشرفًا وصيت الشجاع. وقد يجدك أعداؤك (الغريم)." },
      { q: "هل أرتكب الجرائم؟", a: "النشل/السطو يجلبان مالًا سريعًا لكنهما محفوفان بالخطر. النجاح يعتمد على الكاريزما + قوّة الخوف؛ وعقوبة القبض عليك تعتمد على سمعتك. والشريف/التقيّ يخسر عند القبض عليه أكثر بكثير." },
    ],
  },
  {
    icon: "compass", title: "الفرص والمعضلات",
    items: [
      { q: "ما الكرم وما نصيب الحصاد؟", a: "القيد السادس في دفتر الطابو هو الكرم: 4000 آقجة و+55 دخلا أساسيا وموضعان للعمال — درجة بين البيت والدكان. وأيضا حين يقع في السوق حدث حصاد (قطاف الكرم، الجز الوفير، الحصاد الوفير) ينال أصحاب الملك المعني نصيبا صغيرا عن كل ملك؛ مرة واحدة لكل حدث، ويتدرج مع التضخم." },
      { q: "ماذا يعطي طريق الكلام؟", a: "طريق التعليم الخامس للولد: درهمان في الأسبوع، وتتحول الشهور المتراكمة إلى درجات؛ وحين يرث ذلك الولد يبدأ بمهارة اجتماعية وسمعة زائدة. وتغيير الطريق يعيد التراكم من الصفر." },
      { q: "هل تتكرر الأحداث؟", a: "التجمعات تتسع مع كل إصدار: 24 عريضة في الديوان، 37 لحظة صغيرة، 5 أيام عمل لكل مهنة، 52 همسة سوق، 44 خبرا من العالم و16 مواجهة أسطورية. كما أن المعضلات التي رأيتها مؤخرا تحجب فترة — هناك حماية من التكرار." },
      { q: "ما الفرصة/المعضلة التي تظهر على الشاشة؟", a: "أثناء تقديم الشهر تظهر بين الحين والآخر فرصة (تولَّ/انصرف) أو معضلة (اختيار). الفرص تحمل مكافأة ومخاطرة؛ وكلّما علت الصفة المطلوبة زادت فرصة نجاحك." },
      { q: "لِمَ شاشة المهام؟", a: "تجمع الأعمال المهمّة المعلّقة (وزّع نقاط الصفات، اختر موهبة، تزوّج، انضمّ إلى نقابة، الحرب، الوريث...) في قائمة واحدة وتأخذك إلى الشاشة المعنيّة. وتحتها أيضًا لوحة «مهامّ العائلة»." },
    ],
  },
  {
    icon: "castle", title: "أنظمة الديار",
    items: [
      { q: "كيف تعمل القافلة؟ وما الطريق؟", a: "تستثمر قطعًا نقدية من السوق وترسل قافلة. تسير القافلة على طريق: البداية ← المحطّة الوسطى (المحطّات) ← الهدف، وتتقدّم محطّة كل شهر. وقد يهاجمها قطّاع الطرق في الطريق (سمعتك ومهارتك في التجارة وخوفك تُنقص الخطر؛ وقوّتك ومهارتك في القتال تقلّلان الخسارة). وعند الوصول يعود الربح على رأس المال الناجي. وتتابع التقدّم من الشاشة الرئيسية ومن السوق." },
      { q: "ما السيطرة على السنجق وحروب النقابات؟", a: "كلّ واحد من السناجق الأربعة بيد نقابة. ومع الوقت تطمع فيها النقابات المنافسة، فيتراكم التوتّر وتندلع حرب على سنجق؛ ومن ينتصر يستولي عليه. إن كانت نقابتك طرفًا أمكنك الذهاب إلى الجبهة من شاشة المنظمات والتأثير في النتيجة. وإذا كانت نقابتك تسيطر على السنجق الذي أنت فيه، دفعت مهامّ النقابة هناك 25% أكثر." },
      { q: "ماذا يفيد توظيف العمّال في الأملاك؟", a: "توظّف في أملاكك عمّالًا من أهل تلك المدينة (عدد المواضع بحسب النوع والدرجة). العامل يزيد الإنتاج لكنه يطلب أجرًا شهريًا؛ وعند تدنّي الحال/الرخاء قد تأكل الأجور الربح. وفي لوحة العمّال يظهر صافي الدخل الشهري (أخضر/أحمر). وإنتاجية العامل تأتي من العمر + ملاءمة المهنة + المزاج." },
      { q: "ما جودة الأغراض؟", a: "السلع المعمّرة كالسلاح والدرع والإكسير تأتي في 4 درجات جودة: معيب، عاديّ، جيّد، صنعة أستاذ. وكلّما علت مهارتك في الحِرفة أنتجت جودة أعلى. السلعة الجيّدة تُباع في السوق بثمن أغلى؛ وجودة سلاحك ودرعك اللذين تحملهما تنعكس أيضًا على قوّتك القتالية ودفاعك." },
      { q: "ما دائرة الشخصية وما فائدة «مساعدة الهدف»؟", a: "لكلّ شخصية عائلة وأصدقاء وخصوم (دائرتها) وهدف في الحياة؛ تراها كلها في شاشة تلك الشخصية. يمكنك أن تساعد هدفه (قطع نقدية مقابل ألفة كبيرة + صيت الكريم) أو أن تستغلّه (تنتزع قطعًا لكنك تحرق ثقته، وتنال صيت القاسي)." },
    ],
  },
  {
    icon: "scroll", title: "الدولة والبلاط والمهنة",
    items: [
      { q: "كيف تجري حملة العاهل؟", a: "لم تعد الحملة رمية واحدة: حين تحل الرايات يزحف الجيش ثلاثة أشهر. الشهر الأول للزحف (تمسك الطليعة الممرات أو يحول المطر الطريق وحلا)، والثاني للحصار (يفتح النقابون ثغرة أو يقع المرض في المعسكر) — وكل حدث يحرك قوة الجيش. وفي الثالث يقرأ الحكم: تضاف القوة المتراكمة إلى حظك الأساسي. حراس الحاشية والبيوت الحليفة يقوون الجيش من البداية. وما دامت الحملة قائمة يشتعل شريط أحمر في اللوحة؛ وإن سقط التاج تفرق الجيش وعادت الرايات." },
      { q: "ماذا أستطيع حين أصير واليًا؟", a: "بسمعة كافية تصير واليًا على مدينة (من شاشة الديار). تضبط نسبة الضريبة (الدخل ↔ رضا الأهالي)، وتنفق خزينة المدينة على خدمة الناس والأمن، وتجدّد شرعيّتك بأعمال الخير. ويمكنك فوق ذلك إصدار فرمانات (العدل، عفو الضرائب، السخرة، حرية السوق — بمهلة انتظار ومقايضات) وتشييد أثر عمرانيّ دائم (نافورة/جسر/دار إطعام/برج — يرفع قاعدة الرضا/الدخل ويمنح شهرة). إن هبطت شرعيّتك عُزلت، وإن سخط الأهالي كثيرًا اندلع العصيان؛ وبين الحين والآخر يطلب الديوان الهمايوني نصيبًا من الخزينة." },
      { q: "ماذا يتغيّر حين أعتلي العرش (الحاكم)؟", a: "تستوفي شروط العمر وقوّة السلالة والسمعة والشهرة والقطع النقدية، وتدّعي العرش بدعم نقابة (أو بمنصب الوزير فأعلى في البلاط). وحين تصير الحاكم تكون لك «سلطة»: تُصدر الفرمانات في الديوان الهمايوني (فرمان العدل، الإعمار، العفو العامّ، الاحتفال، الضريبة الثقيلة)، وتشنّ حملات على البكويات المنافسة (النصر ← الضمّ + الغنيمة + الشهرة)، وتعيّن على المدن ولاة أوفياء وتعزلهم (دخل الخراج). إن أُهملت السلطة تآكلت؛ وإن بلغت القاع أطاح العصيان بعرشك. وأحداث البلاط (الرسل، المجاعة، مكائد الوزراء) تؤثّر في سلطتك." },
      { q: "ما فرصة المهنة (العمل المميّز)؟", a: "لكلّ مهنة، فوق العمل المعتاد، عمل مميّز خاصّ بها بمهلة انتظار (في شاشة المهنة): الحدّاد يطرق تحفة، والتاجر يخرج في رحلة تجارة بعيدة، والمعالج يحارب الوباء، والجنديّ يشارك في غارة على الثغر، والفلّاح يقيم احتفال الحصاد... يُختبَر بالصفة الأساسية للمهنة؛ والنجاح يجلب بحسب رتبتك كسبًا كبيرًا + شهرة/سمعة + مهارة. والمهن الخطرة (الحدّاد/صيّاد السمك/الصيّاد/الجنديّ/المعالج) تحمل عند الفشل خطرًا على الصحة." },
      { q: "كيف أدخل البلاط وما الرتب؟", a: "إن لم تكن على العرش (عمر 16+، وسمعة وذكاء كافيان — والأمر أيسر إن كنت كاتبًا) أمكنك دخول خدمة البلاط/الديوان من شاشة المنظمات. تبدأ كاتبًا، وبأداء خدمة الديوان تكسب نقاط خدمة + حظوة الحاكم + راتبًا، وترتقي: دفتردار ← نيشانجي ← الوزير ← الصدر الأعظم. ويمكنك شراء الحظوة بتقديم هديّة. إن أُهملت الحظوة تآكلت، وإن بلغت القاع عُزلت؛ وتقع مكائد رجال البلاط المنافسين وتأتي ألطاف السلطان. ومنصب الوزير فأعلى يمنحك سندًا لادّعاء العرش." },
    ],
  },
  {
    icon: "banner", title: "دروب السلالة (أنظمة جديدة)",
    items: [
      { q: "ما الولد المفضل وأزمة الوراثة؟", a: "بعد الخامسة والثلاثين، إن كان لك ولدان حيان أو أكثر، يمكنك تسمية أحدهم مفضلا من شاشة الأجيال: يشتد رباط المفضل وتنجرح روابط إخوته ويتراكم توتر الوراثة في الدار. إن فاض التوتر انفجر نزاع الميراث (يكلف أقجة وسمعة) وتتخلله مشاهد عتاب. وتغيير المفضل لاحقا له ثمنه أيضا. ويظهر الجزاء عند الموت: إن آل الموقد إلى المفضل بدأ الوارث بخمس سمعة زيادة، وإن آل إلى غيره بدأ بنقص خمس." },
      { q: "كيف تعمل ألاعيب الظل (الدسائس)؟", a: "من شاشة السلالة تنسج مؤامرة تشويه أو تخريب أو فتنة ضد بيت منافس (بمقابل). يحاك العمل على أشهر؛ يسرعه ذكاؤك والأيدي المستأجرة وعضوية إخوة الظل. وإن تراكم الهمس انكشفت: خسارة سمعة وشرف وخطر ثأر — والمتآمر المتوج تنزف هيبته. واحذر: البيوت الحاقدة تتآمر عليك أيضا؛ أرهف السمع في السوق أو يبلغك رئيس الجواسيس تلقائيا." },
      { q: "ماذا تمنح الحاشية وبلاط القصر؟", a: "من شاشة الحرب تستأجر حتى ثلاثة حراس: كل منهم يزيد قوتك في المعركة ويردع قطاع الطرق؛ يطلبون علوفة شهرية ويرحلون واحدا واحدا إن لم تدفع. وإن كنت متوجا تعين أيضا وزيرا (يحفظ الهيبة) وأمين خزانة (يزيد دخل الأملاك) ورئيس جواسيس (يبلغ عن المؤامرات فورا)؛ وإذا سقط التاج تفرق البلاط." },
      { q: "هل يربح مجلس النرد؟", a: "في ركن الخان تلعب يدا واحدة في الشهر؛ والغلبة دائما لصاحب البيت — على المدى الطويل تخسر، ويخدش ذلك صيتك التقي أيضا. العب للمتعة لا للرزق." },
      { q: "ماذا تمنح العبادة؟", a: "العبادة من مشاغل الكبار: تجمع قلبك وتزيد سمعة التديّن وقليلًا من الصحة؛ وأحيانًا تجالس درويشًا. وفي الشيخوخة الطريق نفسه هو التكية." },
      { q: "المرض لا يفارقني، ماذا أفعل؟", a: "هناك مرضان مزمنان: بعد الخامسة والثلاثين يستقر السعال في صدر البدن الضعيف (يستنزف شهريًا ويشتد أحيانًا)؛ وبعد الثامنة والأربعين يأتي ألم المفاصل مع العمر — يصيب السليم أيضًا، يستنزف أقل لكنه يتيبّس أكثر وشفاؤه أعند. زر «زر الطبيب» يستعيد الصحة وكل زيارة تحمل فرصة الشفاء." },
      { q: "ما فائدة صندوق الوقف؟", a: "بعد إنشاء الوقف يمكنك التبرع بلا حد (مرة في الشهر). عند 25 ألفًا / 100 ألف / 250 ألفًا / مليون قطعة يرتقي وقفك مرتبة: تكسب شهرة وسمعة كرم. ويصبّ الصندوق أيضًا في مرثيتك ومكانة وريثك الأولى." },
      { q: "ماذا يحدث لأشيائي عند موتي؟", a: "السلاح الذي ترتديه ينتقل إلى صندوق وريثك إرثًا بجودته. ثروتك تنتقل بحسب حصة الوصية، وعقاراتك وقصرك ينتقلان كما هما؛ والباقي يذهب مع حياتك." },
      { q: "كيف أتخذ صبيًا وماذا يفيدني؟", a: "يمكنك عرض التتلمذ على شابّ تربطك به علاقة طيبة من صفحته. وجّهه شهرًا بشهر؛ وعند 24 شهرًا يصير صبيّك معلمًا — ويكبر اسمك بين أهل الحرفة. وقد يطرق صبيُّ الجدّ بابَ الوريث بعد سنين." },
      { q: "كيف يبدأ الثأر وكيف ينتهي؟", a: "إذا بلغت العلاقة مع أحد البيوت الحضيض فقد تنقدح الشرارة. وكلما اشتد الثأر كثرت الكمائن. من شاشة السلالة يمكنك دفع مال الصلح أو الرد؛ وفي النهاية معركة الميدان. والثأر الذي لا ينتهي ينتقل إلى الوريث بنصف حرارته." },
      { q: "كيف تُعقد التحالفات مع البيوت وهل تنفكّ؟", a: "من قائمة البيوت في شاشة السلالة يمكنك عرض التحالف على البيوت غير الباردة، أو إرسال الخُطّاب إن كنت أعزب (محاولة واحدة شهريًا). موقفهم ومكانتك يحددان الحظ؛ والرفض يخفض الموقف. التحالف ينتقل إلى الوريث — لكن إذا بردت الصداقة وبلغ الموقف الحضيض انفكّت المصافحة." },
    ],
  },
  {
    icon: "family", title: "البيت الحي (جديد)",
    items: [
      { q: "ما شريط العمر ومن أين يفتح؟", a: "الزر الذهبي في أول السجل (متى اجتمعت ثلاث لحظات فارقة أو أكثر)، أو رابط شاهد شريط العمر في شاشة الوفاة، يعرض لحظات عمرك الكبرى بملء الشاشة كادرا كادرا. تجري الكوادر وحدها (كل نحو أربع ثوان)، واللمسة تنقل إلى التالي، والكادر الأخير ينزل الستار بنفسه. وفي الوضع الهادئ يتوقف الجريان التلقائي — تتقدم باللمس." },
      { q: "ما بطاقة الاختيار الصغيرة في اللوحة؟", a: "بين حين وآخر تهبط خلال الشهر لحظة من سطر واحد: وابل مطر، قط شارع، طبلية منقلبة... اختر أحد خيارين صغيرين أو تجاهلها — تختفي وحدها بمرور الشهر. آثارها ضئيلة؛ وُجدت لتلوين الحياة." },
      { q: "ماذا يفيد قضاء الوقت مع الزوج؟", a: "زر شاشة الشخصية يجري بحسب طبع شريكك: الحنون يواسي، والمجتهد يمسك الحساب (يعود نصف ما أنفقت)، والعنيد تتشاجر معه ثم تضحكان، والتقي تشاركه دعاء المساء. في كل مرة تنمو رابطة الزوجية؛ والرابطة تحدد دفء الذكرى ولوعة الترمل." },
      { q: "ما فائدة رابطة الولد؟", a: "زر الاعتناء بالأولاد يفتح مشهدًا بحسب عمر الأصغر: لعب مع الرضيع، درس مع التلميذ، حرفة مع اليافع، مائدة مع الراشد. كل عناية تكبر الرابطة. الوريث ذو الرابطة العالية (+60) يبدأ بسمعة +2؛ وقرة العين (+85) بنقطة خاصية إضافية." },
      { q: "هل تخبو اللعبة في الشيخوخة؟", a: "لا — بعد السبعين تجيء الحياة بذكرياتها: وحدة الفجر، بسطة الصديق الراحل، اسمك يمشي قبلك... وأقواس ما بعد الخامسة والخمسين ولحظات الأحفاد ودرب التكية نسيجُ ذلك العمر." },
      { q: "لماذا تُروى كل معركة بشكل مختلف؟", a: "لكل مواجهة حكاية نصر وهزيمة خاصة: تُقيّد زعيم قطاع الطرق بالسلاسل، ويجثو قره ألب أمامك... والمواجهات الأسطورية (رعب الليل وقره ألب) لا تجدك إلا حين يذيع اسمك." },
    ],
  },
  {
        icon: "banner", title: "الديار عبر الإنترنت (لعب جماعي)",
    items: [
      { q: "ما رق العودة؟", a: "كلما عدت إلى الديار عرضت الأخبار الشخصية التي تراكمت في غيابك (ذهب الهدايا والفدى والأعراس والوراثة والغنائم...) في رق بملء الشاشة: الثمانية الأولى سطرا سطرا والباقي في السجل؛ وفرق ذهبك يكتب بالأخضر أو الأحمر. لمسة واحدة تعيدك إلى المجلس — لا شيء يضيع في صمت." },
      { q: "كيف تعمل المؤامرة المشتركة؟", a: "من شاشة الدبلوماسية تنضم إلى مؤامرة على بك على العرش (لا ينضم من في القيود؛ والحليف والزوج محميان). المؤامرة سرية — لا يراها إلا أعضاؤها. حين تأتي اليد الثانية وتختمر شهرا يرمى النرد ليلة الانقلاب: توزن قوة الأعضاء المجتمعة أمام قوة البك ودفاعات الراية. عند النجاح يجلس أقوى الأعضاء على العرش لكن الجميع يدفعون من شرفهم؛ والخبر لا يسمي الأيدي التي فتحت الأبواب من الداخل. أما المؤامرة المفضوحة فتسقط أسماء أعضائها في السوق ويجرح الشرف جرحا ثقيلا. وإن كان للبك رقيب في نوبته سمعت الهمسات: ينخفض حظ الانقلاب إلى النصف. والمؤامرة التي تبقى وحيدة ثلاثة أشهر تنطفئ." },
      { q: "هل يمكن سلب القافلة المشتركة؟", a: "نعم — من لا حصة له يمكنه نصب كمين في المضيق من بطاقة القافلة (كمين واحد؛ من سبق ملك، ولا يحق لمن في القيود). ليلة عودة القافلة يرمى النرد: إن نجحت الغارة ذهب 60 في المئة من الصندوق إلى المقنع، ونال الشركاء ردا مكسورا ولا يذكر اسم — غير أن شرف الغائر يتآكل في الخفاء. وإن كان لأحد الشركاء رقيب في نوبته هبط حظ الغارة هبوطا حادا؛ والكمين المفضوح يعلن اسمه في الديار ويجرح الشرف جرحا بالغا. إن لمحت ظلالا على درب القافلة فقد حان وقت استئجار رقيب." },
      { q: "إن مات بك في الديار فلمن تؤول الراية؟", a: "إن كان له شريك حي يربطه ميثاق مصاهرة انتقلت الراية إليه مباشرة: يذيع الخبر في الديار كلها ويجلس الشريك في المقعد ولا يفتح سباق الدعاوى أصلا. وإن لم يكن شريك (أو رحل هو أيضا) شغرت الراية وعاد الموقد إلى شخصية الحاسوب وفتحت الإمارة للدعاوى من جديد. فالزواج في هذه الديار ليس شأن قلب فحسب بل ضمان وراثة." },
      { q: "كيف يعمل الأسر والفدية؟", a: "من شاشة الدبلوماسية تفتح مبارزة أسر ضد بك (المدافع أرجح؛ وأصعب إن كان عنده رقيب). إن فزت قيد الخصم: لا حملة ولا مبارزة ولا عرش حتى تدفع الفدية. حين يدفع يسقط الذهب في كيسك؛ أو أطلقه بلا فدية (+شرف). وإن لم تدفع الفدية اثني عشر شهرا هرب الأسير وخدش شرف الآسر." },
      { q: "ماذا تمنح نوبة الرقيب؟", a: "من الدبلوماسية تستأجر رقيبا بمئتين وخمسين أقجة لستة أشهر. ما دامت النوبة قائمة ينخفض حظ اغتيالك إلى النصف، ويقع المخرب بسهولة أكبر، ويلاحظ الجاسوس حتى لو نجح — وتعرف من كان؛ ومحاولات تقييدك تصطدم بسور أعلى. عند انقضاء المدة يصلك خبر ويمكنك التجديد." },
      { q: "كيف تبدو الديار الجماعية؟ وما شريط الرفاق؟", a: "يحمل شاشة الديار شريط رفاق حي: من متصل، ومن صوت لتقدم الشهر، واسمك بالذهب. الصيحات بلمسة واحدة (سلام، إشادة، تحد، نداء عون) تصل للجميع فورا؛ وتحفظ الديار آخر 12 كلمة من المحادثة العامة، فمن يأتي متأخرا يسمع المجلس من حيث توقف." },
      { q: "كيف تكسب أكاليل السنة (بك السنة/نجمها/أكرمها)؟", a: "عند انقضاء كل سنة لعب يوزع الخادم ثلاثة أكاليل: من نمت قوته أكثر يصير بك السنة، ومن علت شهرته أكثر نجم السنة، ومن ارتفع شرفه أكثر أكرم أهل السنة. يظهر الوسام بجوار الاسم سنة كاملة وقد ينتقل عند الانقضاء التالي. سنتك الأولى سنة قياس؛ ولا إكليل في فرع بلا نماء." },
      { q: "كيف يجري انتخاب رئيس المجلس؟", a: "من شاشة الدبلوماسية تدلي بصوتك لأي بك طوال السنة؛ العبرة بآخر صوت، ولا يجوز التصويت لنفسك. عند انقضاء السنة ينتخب صاحب أكثر الأصوات (وعند التعادل الأعلى شرفا) رئيسا للمجلس ويحمل الوسام سنة. الرئاسة لا تمنح قوة — بل وزنا: الجميع يرى من اختير." },
      { q: "ما مساندة الحملة (مد الكتف)؟ وما مكسبها؟", a: "إن خرج بك هذا الشهر لحملة على إمارة، يمكنك مساندته من شاشة الدبلوماسية: ينضم نصف قوتك الشخصية إلى جيشه. في النصر يصلك خبر الغنيمة؛ وفزت أم خسرت تكسب شرفا لوفائك بكلمتك (وهو يغذي إكليل الأكرم أيضا). ولا تساند حملتك أنت." },
    ],
  },
  {
    icon: "scroll", title: "يمين الرماد (الملحمة الرئيسية)",
    items: [
      { q: "ما دفتر الدم وكيف يفتح ويغلق؟", a: "حين تصطبغ الخصومة مع بيت بالدم (المرحلة الثالثة) يفتح دفتر الدم: تكتب القضية في سجل النسل. الجيل الأول يحلف يمين الدم أو ينذر الصلح في كتابة الدم؛ ومن حلف جاءته مشهد أول الثمن (غارة ليل أو القاضي). ينتقل الدفتر إلى الوارث — تواصله أو تحرقه في الموقد (+شرف). الجيل الثاني يقيس ظله في السوق؛ وفي الثالث تأتي ليلة الحكم: مذبحة أو مصاهرة أو فدية. أيا كان الختام، يغلق الدفتر وينال إنجاز أغلق الدفتر." },
      { q: "ما يمين الرماد وكيف يبدأ؟", a: "القصة الرئيسية للعبة، تمتد عبر الأجيال. في السنوات الأولى بعد بلوغك الثالثة عشرة يستدعيك شيخ القرية إلى فراشه ويعهد إليك بختم بلون الرماد. إن قبلته بدأت الملحمة؛ وإن تراجعت طرق الختم بابك مرة أخيرة بعد عامين." },
      { q: "هل قد تفوتني مشاهد؟ وأين أرى تقدمي؟", a: "لا تفوتك: مشاهد الملحمة تنتظر في اللوحة داخل بطاقة يمين الرماد الذهبية ولا تختفي. ويظهر فصلك الحالي وعدد المشاهد في شريط اليمين على بطاقة الشخصية." },
      { q: "ماذا يحدث إن متّ أو بعت الختم؟", a: "تنتقل الملحمة إلى وريثك وتستمر من حيث توقفت. بيع الختم لقره قوش يفتح فرع الخيانة: لا يُفتح باب حتى يُستردّ الختم وتُدفع الكفّارة. ومن يُتمّ الملحمة ينال إنجاز اليمين التام؛ ويولد الورثة اللاحقون بنيشان الختم (+2 سمعة)." },
    ],
  },
];

const RU: FaqSection[] = [
  {
    icon: "hourglass", title: "Время и жизнь",
    items: [
      { q: "Как идут месяцы и годы?", a: "Большой кнопкой на главном экране ты продвигаешь время. С каждым шагом убывает сытость, случаются события, порой выпадает дилемма или возможность." },
      { q: "Что делают голод и здоровье?", a: "Если сытость упадёт до 0, здоровье начнёт таять. Если здоровье дойдёт до 0, твой персонаж умрёт. Едой ты восполняешь сытость, отдыхом и лечением — здоровье." },
      { q: "Что происходит после смерти?", a: "Если у тебя есть наследник, ты продолжаешь его жизнью (новое поколение). Часть состояния, треть славы и родной город переходят наследнику." },
    ],
  },
  {
    icon: "shield", title: "Свойства и навыки",
    items: [
      { q: "Зачем нужны свойства (Сила/Ум/Харизма/Выносливость)?", a: "Сила решает в бою, Ум — в торговле и ремесле, Харизма — в беседе, торге и тёмных делах, Выносливость — в работе и усталости. Раны могут временно снижать свойства." },
      { q: "Как получать и тратить очки свойств?", a: "Ты зарабатываешь их за учёбой в школе (время от времени), на экзаменах и в некоторых событиях. Распределяешь их на экране персонажа на любое свойство (потолок свойства — 10)." },
      { q: "Как растут навыки (Бой/Торговля/Ремесло/Общение)?", a: "Сами собой, по мере действий: драки поднимают Бой, торг и покупки — Торговлю, работа в мастерской — Ремесло, беседы и школа — Общение. На уровнях 3, 6 и 9 в Древе навыков открывается умение." },
    ],
  },
  {
    icon: "flame", title: "Репутация · Честь · Страх · Слава",
    items: [
      { q: "Что определяет слава (fame)?", a: "НАСКОЛЬКО и КАК ДАЛЕКО известно твоё имя. Пока слава мала, в дальних городах тебя никто не знает; твой характер (честь, страх и прочее) отражается на людях лишь настолько, насколько ты узнаваем." },
      { q: "Что такое узнаваемость? Родной город и чужбина?", a: "Это то, насколько обычный человек там, где ты находишься, судит о тебе по имени. В родном городе (где ты родился) тебя все немного знают; в другом городе тебя несёт лишь твоя слава. На экране персонажа видно, как народ на тебя смотрит, и процент узнаваемости." },
      { q: "Плюсы и минусы чести?", a: "ПЛЮС: легче жениться и договариваться с уважаемыми семьями, в честных гильдиях репутация растёт быстрее, дома тебе доверяют. МИНУС: попадёшься на преступлении — репутация рухнет куда сильнее: тебе есть что терять." },
      { q: "Плюсы и минусы страха?", a: "ПЛЮС: тёмные дела удаются чаще (жертва цепенеет), в торге твоё слово весомее (торговец уступает, лишь бы отвязаться). МИНУС: в беседе люди сторонятся, шансы на брак падают, честные гильдии держатся на расстоянии." },
      { q: "Как меняется репутация?", a: "Пиры, милостыня, задания гильдии, возможности и честные поступки поднимают её; преступления, запугивание и провалы роняют. Она определяет отношение домов к тебе и открывает или закрывает некоторые двери." },
    ],
  },
  {
    icon: "star", title: "Молва (цвет твоей славы)",
    items: [
      { q: "Что такое молва?", a: "Характер, который несёт твоё имя: Щедрый, Жестокий, Повеса, Набожный, Доблестный. Она копится из твоих поступков и определяет, как люди к тебе подходят (в меру узнаваемости)." },
      { q: "Щедрый / Набожный", a: "Щедрый: даёт любовь народа, смягчает запугивание (тебя больше не боятся). Набожный: прибавляет уважения, сближает с набожными семьями; но если набожный попадётся на преступлении, лицемерие карается куда тяжелее." },
      { q: "Повеса / Доблестный", a: "Повеса: флирт и комплименты быстрее строят отношения; но родовитые и верные семьи шарахаются от такой молвы. Доблестный: уважаем в каждом доме, приносит верность союзников и гильдии; но честность мешает тёмным делам (преступлениям)." },
      { q: "Жестокий", a: "В связке со страхом усиливает запугивание и тёмные дела; но лишает любви народа и доверия честных заведений." },
    ],
  },
  {
    icon: "coins", title: "Деньги и заработок",
    items: [
      { q: "Как заработать?", a: "Возьми профессию и работай; покупай и продавай на рынке; производи в мастерской и продавай; покупай владения и собирай ренту; бери задания гильдии и возможности." },
      { q: "Как работает торг?", a: "Шанс сторговаться зависит от Харизмы + навыка Торговли; удастся — получишь скидку. Если ты известен (любим или внушаешь страх), твоё слово весит больше." },
      { q: "Что нужно для работы в мастерской?", a: "Обычные рецепты не требуют профессии: хватит навыка Ремесла и материалов. Лишь мастерские рецепты (корзина первого урожая, солёная рыба, медовая булочка, шерстяной кафтан) принадлежат своему ремеслу — это указано на карточке. На карточке каждого рецепта указаны нужный уровень и материалы (есть/нужно). Производство развивает Ремесло." },
    ],
  },
  {
    icon: "family", title: "Отношения и брак",
    items: [
      { q: "Как развивать отношения?", a: "Открой карточку человека и говори с ним (поболтай, сделай комплимент, выслушай, пошути), дари подарки. У каждого свой нрав; неверный подход может выйти боком. Тёплая, любимая народом молва усиливает отдачу от бесед." },
      { q: "Как жениться?", a: "Нужна близость 50+ с человеком, и вам обоим должно быть 18+. Тогда откроется «Предложение руки». Шанс согласия зависит от близости + Харизмы + твоей молвы (доблесть и честь помогают, повеса и страх мешают)." },
    ],
  },
  {
    icon: "crossed-swords", title: "Гильдии · Война · Преступление",
    items: [
      { q: "Как проходит суд кадия?", a: "Попавшись на тяжком преступлении (если нет короны и темница ещё не дом), предстаёшь перед кадием до приговора; сцена ждёт на экране преступления. Три пути: позвать СВИДЕТЕЛЯ, если рядом близкая дружба (оправдание вероятно, но дружба саднит), ЗАЩИЩАТЬСЯ (говорят харизма и интеллект; при успехе штраф половинится, темница минует), или ПОКОРИТЬСЯ (+1 честь, известная кара). Продвинешь месяц без решения — зачтётся покорность." },
      { q: "Как попасть в темницу — и как выйти?", a: "Попадись на тяжком преступлении (грабёж и хуже) — и кадий может вынести приговор; Очаг солдат отбывает половину. Внутри закрыты мастерская, дороги, гильдии, походы и преступления; каждый месяц плавит месяц срока. Единственный ранний выход — взятка тюремщику: дорого и пятнает честь." },
      { q: "Как вступить в гильдию?", a: "Сначала копи уважение (standing), выполняя задания для гильдии; перейдёшь порог — вступишь в её ряды. Честные гильдии быстрее доверяют доблестным и честным, Братство Тени — страху и жестокости." },
      { q: "Как работает война и фронт?", a: "Если твоя организация вступает в войну, ты можешь пойти на фронт; победа приносит славу, честь и молву доблестного. Враги (заклятый недруг) могут тебя разыскать." },
      { q: "Стоит ли идти на преступление?", a: "Карманные кражи и грабёж дают быстрые деньги, но рискованны. Успех зависит от Харизмы + силы страха; кара при поимке — от твоей репутации. Честный или набожный, попавшись, теряет куда больше." },
    ],
  },
  {
    icon: "compass", title: "Возможности и дилеммы",
    items: [
      { q: "Что такое виноградник и доля урожая?", a: "Шестая запись в книге владений — виноградник: 4000 акче, +55 базового дохода, 2 места для работников — ступень между домом и лавкой. К тому же, когда на рынке случается урожайное событие (сбор винограда, щедрая стрижка, щедрый урожай), хозяева соответствующих владений получают небольшую долю с каждого; один раз за событие, с поправкой на инфляцию." },
      { q: "Что даёт Путь слова?", a: "Пятый учебный путь для ребёнка: 2 акче в неделю, накопленные месяцы становятся ступенями; унаследовав очаг, такое дитя начинает с навыком общения и добавочной репутацией. Смена пути обнуляет накопленное." },
      { q: "Повторяются ли события?", a: "Пулы растут с каждым выпуском: 24 прошений в диване, 37 микро-моментов, 5 рабочих дней у каждого ремесла, 52 базарных шёпотов, 44 мировых новостей и 16 легендарных встреч. А недавние дилеммы на время придерживаются — есть защита от повторов." },
      { q: "Что за возможности и дилеммы на экране?", a: "Пока ты продвигаешь месяц, порой выпадает возможность (взяться/отказаться) или дилемма (выбор). Возможности несут награду и риск; чем выше нужное свойство, тем больше шанс успеха." },
      { q: "Для чего экран задач?", a: "Он собирает важные ожидающие дела (распределить очки свойств, выбрать умение, жениться, вступить в гильдию, война, наследник...) в один список и ведёт на нужный экран. Ниже есть и панель «Семейные вехи»." },
    ],
  },
  {
    icon: "castle", title: "Системы края",
    items: [
      { q: "Как работает караван? Что такое маршрут?", a: "На рынке ты вкладываешь монеты и отправляешь караван. Он идёт по маршруту начало→промежуточные стоянки→цель, продвигаясь на одну стоянку в месяц. В пути возможно нападение разбойников (репутация, навык торговли и страх снижают риск; сила и навык боя уменьшают потери). По прибытии прибыль возвращается с уцелевшего капитала. За ходом можно следить с главного экрана и с рынка." },
      { q: "Что такое власть над санджаком и войны гильдий?", a: "Каждый из 4 санджаков держит одна гильдия. Со временем соперники начинают на них зариться, копится напряжение, и за санджак вспыхивает война; победитель забирает его. Если твоя гильдия в деле, можешь пойти на фронт из «Гильдий и орденов» и повлиять на исход. Если твоя гильдия владеет санджаком, где ты находишься, задания гильдии там платят на 25% больше." },
      { q: "Что даёт наём работников во владения?", a: "Ты нанимаешь во владения людей из того города (число мест зависит от типа и уровня). Работник повышает выработку, но требует месячного жалованья; при плохом состоянии или низком процветании жалованье может съесть прибыль. В панели работников виден месячный чистый доход (зелёный/красный). Выработка складывается из возраста + соответствия профессии + нрава." },
      { q: "Что такое качество вещей?", a: "Долговечные товары — оружие, броня, эликсиры — бывают 4 качеств: бракованный, обычный, добротный, мастерской работы. Чем выше твой навык Ремесла, тем качественнее выходит вещь. Качественный товар продаётся на рынке дороже; качество надетого оружия и брони влияет и на боевую мощь, и на защиту." },
      { q: "Что дают круг NPC и «помощь его цели»?", a: "У каждого NPC есть семья, друзья и соперники (его круг) и жизненная цель; всё это видно на экране NPC. Можно помочь его цели (за монеты — большая близость + молва щедрого) или использовать её (выбьешь монеты, но сожжёшь доверие — молва жестокого)." },
    ],
  },
  {
    icon: "scroll", title: "Государство, двор и профессия",
    items: [
      { q: "Как идёт поход государя?", a: "Поход больше не решается одним броском: когда бунчуки развязаны, войско идёт ТРИ МЕСЯЦА. Первый месяц — марш (авангард занимает перевалы, или дождь превращает дорогу в грязь), второй — осада (сапёры пробивают стену, или на лагерь падает хворь) — каждое событие качает силу войска. На третий месяц читают приговор: накопленная сила прибавляется к базовому шансу. Стражи свиты и союзные дома усиливают войско с самого начала. Пока идёт поход, на панели горит красная лента; если корона падёт, войско разойдётся и бунчуки вернутся." },
      { q: "Что я могу как наместник?", a: "С достаточной репутацией ты становишься наместником города (с экрана края). Ты настраиваешь налог (доход ↔ довольство народа), тратишь городскую казну на службы и порядок, укрепляешь законность благими делами. Вдобавок можешь издавать УКАЗЫ (правосудие, налоговая амнистия, повинность, свобода рынка — с временем ожидания и своей ценой) и возводить долговечные ПОСТРОЙКИ (фонтан/мост/бесплатная кухня/башня — поднимают основу довольства и дохода + слава). Упадёт законность — тебя сместят; если народ вконец озлобится — вспыхнет мятеж; время от времени высокий диван требует долю из казны." },
      { q: "Что меняется на троне (государь)?", a: "Выполнив условия по возрасту, мощи дома, репутации, славе и монетам и заручившись поддержкой гильдии (или чином Визиря+ при дворе), ты претендуешь на трон. Став государем, ты обретаешь ВЛАСТЬ: издаёшь указы в диване (указ о правосудии, строительный поход, всеобщая амнистия, праздник, тяжёлый налог), водишь ПОХОДЫ на соседние бейлики (победа → присоединение + добыча + слава), назначаешь и смещаешь верных НАМЕСТНИКОВ в городах (доход с дани). Заброшенная власть тает; упадёт до дна — мятеж может низвергнуть трон. Придворные события (послы, голод, заговор визиря) влияют на власть." },
      { q: "Что такое Особое дело (фирменное действие профессии)?", a: "У каждой профессии, помимо обычной работы, есть своё особое действие с временем ожидания (на экране профессии): кузнец куёт шедевр, купец идёт в дальний торговый поход, лекарь борется с мором, солдат идёт в пограничный набег, крестьянин устраивает праздник урожая... Проверяется главным свойством профессии; успех даёт большой заработок по твоему рангу + славу/репутацию + навык. Опасные (кузнец/рыбак/охотник/солдат/лекарь) при провале грозят здоровью." },
      { q: "Как попасть ко двору и что за чины?", a: "Если ты не на троне (16+ лет, достаточно репутации и ума — писарю проще), можешь поступить на службу двора и дивана с экрана «Гильдии и ордена». Начинаешь Писарем, несёшь Службу дивана, зарабатывая очки службы + милость государя (favor) + жалованье, и растёшь: Дефтердар → Нишанджи → Визирь → Великий визирь. Милость можно и купить, поднеся дар. Заброшенная милость тает; упадёт до дна — тебя отстранят; бывают козни соперников-придворных и щедроты султана. Чин Визиря+ даёт опору для притязания на трон." },
    ],
  },
  {
    icon: "banner", title: "Пути династии (новые системы)",
    items: [
      { q: "Что такое любимое дитя и кризис наследования?", a: "После 35 лет, если живы двое и больше детей, на экране Поколения можно назвать одного любимцем: связь с любимцем крепнет, связи братьев и сестёр саднят, а в очаге копится напряжение наследования. Перельётся через край — вспыхнет тяжба о доле (стоит акче и репутации), между делом падают сцены упрёка. Сменить любимца позже — тоже своя цена. Награда видна в смерти: если очаг переходит любимцу, наследник начинает с +5 репутации; иначе — с -5." },
      { q: "Как работают Теневые игры (интриги)?", a: "С экрана династии ты плетёшь заговор — очернение, саботаж или раздор — против враждебного дома (за плату). Дело вьётся месяцами; ум, нанятые руки и членство в Братстве теней ускоряют его. Накопится шёпот — будешь раскрыт: потеря репутации и чести, риск кровной вражды, а коронованный интриган теряет и легитимность. Берегись: злопамятные дома плетут и против тебя; держи ухо востро на базаре, а начальник лазутчиков предупредит сам." },
      { q: "Что дают свита и двор?", a: "На экране войны нанимаешь до трёх стражей: каждый добавляет силы в бою и отпугивает разбойников; им нужно месячное жалованье, без него уходят один за другим. Коронованный правитель также назначает визиря (поддерживает власть), казначея (увеличивает доход с владений) и начальника лазутчиков (мгновенно доносит о заговорах); падёт корона — распадётся и двор." },
      { q: "Выгодны ли кости?", a: "В углу хана играешь одну партию в месяц; перевес всегда у заведения — в долгую проигрываешь, да и набожная слава страдает. Играй ради азарта, не ради заработка." },
      { q: "Что даёт Молитва?", a: "Молитва — одно из занятий взрослого: она умиротворяет сердце, растит славу Набожного и немного здоровья; порой случается беседа с дервишем. В старости этот же путь — Обитель." },
      { q: "Болезнь не отпускает — что делать?", a: "Хроник две: после 35 в ослабшем теле кашель оседает в груди (тянет здоровье, порой обостряется); после 48 с возрастом приходит ломота в суставах — находит и здоровых, тянет меньше, но сводит чаще, и лечится упрямее. «К лекарю» восстанавливает здоровье, и каждый визит даёт шанс излечить хронику." },
      { q: "Зачем нужен фонд вакфа?", a: "Основав вакф, можешь жертвовать без предела (раз в месяц). На порогах 25 тыс. / 100 тыс. / 250 тыс. / 1 млн вакф поднимается на ступень: ты получаешь славу и щедрую молву. Фонд также вливается в твою элегию и стартовое положение наследника." },
      { q: "Что станет с моими вещами после смерти?", a: "Оружие, что ты носишь, переходит в сундук наследника как реликвия — вместе с качеством. Богатство переходит по доле завещания; владения и усадьба — целиком; остальное уходит с твоей жизнью." },
      { q: "Как взять подмастерье и что это даёт?", a: "Предложи ученичество юноше, с которым близок, на его странице. Наставляй месяц за месяцем; через 24 месяца твой подмастерье становится мастером — твоё имя растёт среди ремесла. Подмастерье предка может годы спустя постучать в дверь наследника." },
      { q: "Как начинается и кончается кровная месть?", a: "Если отношения с домом падают на дно, может вспыхнуть искра. Чем жарче вражда, тем больше засад. На экране династии можно заплатить за мир или ударить в ответ; в конце ждёт открытая битва. Неоконченная месть переходит наследнику с половиной жара." },
      { q: "Как заключаются союзы с домами — могут ли они распасться?", a: "В списке домов на экране династии можно предложить союз нехолодным домам или заслать сватов, если холост (одна попытка в месяц). Их отношение и твоя репутация задают шанс; отказ снижает отношение. Союз переходит наследнику — но если дружба остынет до дна, рукопожатие рвётся." },
    ],
  },
  {
    icon: "family", title: "Живой очаг (Новое)",
    items: [
      { q: "Что такое Лента жизни и где она открывается?", a: "Золотая кнопка в начале летописи (когда накопится три и больше вех) или ссылка Смотреть ленту жизни на экране смерти проигрывает великие мгновения жизни во весь экран, кадр за кадром. Кадры текут сами (примерно раз в четыре секунды), касание переводит к следующему, последний кадр сам опускает занавес. В щадящем режиме автопоток выключен — листаешь касанием." },
      { q: "Что за маленькая карточка выбора на панели?", a: "Иногда среди месяца выпадает момент в одну строку: ливень, уличный кот, опрокинутый лоток... Выбери один из двух небольших вариантов или не трогай вовсе — с новым месяцем карточка исчезнет сама. Эффекты крошечные; она нужна, чтобы расцветить жизнь." },
      { q: "Что даёт время с супругом?", a: "Кнопка на экране персонажа играет по нраву супруга: ласковый утешит, работящий сведёт счета (половина угощения вернётся), с упрямым повздоришь и посмеёшься, с набожным разделишь вечернюю молитву. Каждый раз растёт супружеская связь; она задаёт тепло годовщин и горечь вдовства." },
      { q: "Зачем нужна связь с ребёнком?", a: "Кнопка «Позаботиться о детях» открывает сцену по возрасту младшего: игра с малышом, урок со школьником, ремесло с юношей, стол со взрослым. Каждая забота растит связь. Наследник с крепкой связью (60+) начинает с +2 репутации; свет очей (85+) — с +1 очком свойства." },
      { q: "Не гаснет ли игра в старости?", a: "Нет — после 70 жизнь приносит собственные воспоминания: одиночество рассвета, пустой лоток старого друга, имя, идущее впереди тебя... Сюжетные арки после 55, внуки и стезя текке — ткань этого возраста." },
      { q: "Почему каждая битва рассказана по-разному?", a: "У каждой стычки своя история победы и поражения: атамана заковываешь в цепи, Кара Алп преклоняет колено... Легендарные встречи (Ночной ужас, Кара Алп) находят тебя лишь когда имя твоё гремит." },
    ],
  },
  {
        icon: "banner", title: "Сетевой край (мультиплеер)",
    items: [
      { q: "Что такое Свиток возвращения?", a: "При каждом возвращении в край личные вести, накопившиеся за отлучку (золото даров, выкупы, свадьбы, наследство, добыча...), выводятся на полноэкранном свитке: первые восемь построчно, остальное в летописи; разница золота пишется зелёным или красным. Одно касание возвращает в собрание — ничто не пропадает беззвучно." },
      { q: "Как работает общий заговор?", a: "С экрана дипломатии вступаешь в заговор против бея на престоле (закованным нельзя; союзники и супруги защищены). Заговор тайный — его видят только участники. Когда приходит вторая рука и заговор месяц настаивается, в ночь переворота бросают кости: общая сила участников взвешивается против силы бея и защиты знамени. При успехе сильнейший участник садится на престол, но ВСЕ платят долей чести; весть не называет рук, открывших ворота изнутри. Сорванный заговор роняет имена участников на базар, и честь тяжело ранена. Если у бея ДОЗОРНЫЙ, шёпот слышен: шанс переворота падает вдвое. Заговор, оставшийся одиноким три месяца, угасает." },
      { q: "Можно ли ограбить общий караван?", a: "Да — игрок без пая может устроить засаду в ущелье с карточки каравана (засада одна; кто первый, тот и занял, а закованным нельзя). В ночь возвращения бросают кости: если налёт удался, 60 процентов казны уходит замаскированному налётчику, пайщики получают урезанный возврат, и имени никто не называет — но честь налётчика тихо тает. Если у любого пайщика ДОЗОРНЫЙ на посту, шанс налёта резко падает; сорванную засаду объявляют краю по имени, и честь получает тяжёлую рану. Заметив тени на караванном пути — самое время нанять дозорного." },
      { q: "Если бей умирает в краю, кому достаётся знамя?", a: "Если жив супруг, связанный брачным пактом, знамя переходит прямо к нему: весть разносится по всему краю, супруг занимает место, и гонка притязаний вовсе не открывается. Если супруга нет (или тоже не стало), знамя пустеет, очаг возвращается к NPC, и бейлик снова открыт притязаниям. Брак в этом краю — не только дело сердца, но и страховка наследования." },
      { q: "Как работают пленение и выкуп?", a: "С экрана дипломатии открываешь пленную дуэль против бея (преимущество у защищающегося; ещё труднее, если у него дозорный). Победа — и соперник в цепях: ни походов, ни дуэлей, ни трона, пока не уплачен выкуп. Когда он платит, золото падает в твой кошель; или отпусти без выкупа (+честь). Если выкуп не уплачен 12 месяцев, пленник сбегает, а честь пленителя страдает." },
      { q: "Что даёт дозор?", a: "На экране дипломатии нанимаешь дозорного за 250 акче на шесть месяцев. Пока длится дозор, шанс покушения на тебя падает вдвое, саботажников ловят куда легче, шпионов замечают даже при успехе — и ты узнаёшь, кто это был; попытки заковать тебя бьются о более высокую стену. По истечении срока приходит весть, и дозор можно продлить." },
      { q: "Каков мультиплеерный край на ощупь? Что за лента соратников?", a: "На экране края живёт лента соратников: кто в сети, кто проголосовал двигать месяц, твоё имя — золотом. Кличи в одно касание (приветствие, похвала, вызов, зов о помощи) мгновенно видят все; последние 12 слов общего чата хранятся в крае, и опоздавший слышит собрание с того места, где оно остановилось." },
      { q: "Как достаются годовые лавры (Бей/Звезда/Великодушие года)?", a: "На исходе каждого игрового года сервер вручает три лавра: кто больше всех нарастил СИЛУ — Бей года, кто выше поднял СЛАВУ — Звезда года, кто больше возвысил ЧЕСТЬ — Великодушие года. Знак виден у имени целый год и может сменить владельца на следующем исходе. Первый год — год замера; в ветви без роста лавра не дают." },
      { q: "Как устроены выборы главы собрания?", a: "С экрана дипломатии весь год можно отдавать голос любому бею; считается последний голос, за себя голосовать нельзя. На исходе года набравший больше всех голосов (при равенстве — с большей честью) становится главой собрания и носит знак год. Должность не даёт силы — даёт вес: все видят, кого выбрали." },
      { q: "Что такое поддержка похода (подставить плечо)?", a: "Если бей в этом месяце идёт походом на бейлик, поддержи его с экрана дипломатии: половина твоей личной силы вольётся в его войско. Победа принесёт весть о добыче; выиграл или проиграл — получишь честь за сдержанное слово (это питает и лавр Великодушия). Свой собственный поход поддержать нельзя." },
    ],
  },
  {
    icon: "scroll", title: "Клятва пепла (главная сага)",
    items: [
      { q: "Что такое Кровавая книга и как она открывается и закрывается?", a: "Когда вражда с домом обагряется кровью (третья ступень), открывается Кровавая книга: дело вписано в сам род. Первое поколение приносит кровную клятву или клянётся миром в Кровавой записи; поклявшимся выпадает сцена Первой платы (ночной налёт или кадий). Книга переходит наследнику — продолжай её или сожги в очаге (+честь). Второе поколение мерит свою тень на базаре; в третьем приходит ночь Приговора: резня, родство или цена. Какой бы конец ни был выбран, книга закрывается, и достижение 'Книга закрыта' твоё." },
      { q: "Что такое Клятва пепла и как она начинается?", a: "Главная история игры, длящаяся поколениями. В первые годы после 13 лет старейшина деревни зовёт к своему ложу и вверяет пепельно-серую печать. Принять — и сага начнётся; отступить — и печать постучит ещё один раз, два года спустя." },
      { q: "Можно ли пропустить сцену? Где виден прогресс?", a: "Пропустить нельзя: сцены саги ждут на главном экране в золотой карточке Клятвы пепла и не исчезают. Текущий акт и число пройденных сцен показаны в полосе клятвы на карточке персонажа." },
      { q: "Что будет, если умереть или продать печать?", a: "Сага переходит к наследнику и продолжается с того же места. Продажа печати Карагушу открывает ветвь предательства: ни одни ворота не откроются, пока печать не возвращена и не уплачено искупление. Завершившему сагу — достижение Клятва исполнена; последующие наследники рождаются со знаком печати (+2 репутации)." },
    ],
  },
];

export function faqFor(lang: string): FaqSection[] {
  switch (lang) {
    case "en": return EN;
    case "es": return ES;
    case "pt": return PT;
    case "ar": return AR;
    case "ru": return RU;
    default: return TR;
  }
}
