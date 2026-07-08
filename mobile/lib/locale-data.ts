// Lokalizasyon verisi — bölge adları + NPC isim havuzları (6 dil).
// Bölgeler kanonik sırayla (game.ts PLACES ile aynı sıra) hizalı.
export type Lang = "tr" | "en" | "es" | "pt" | "ar" | "ru";
export const LANGS: { code: Lang; label: string; flag: string; rtl: boolean }[] = [
  { code: "tr", label: "Türkçe",   flag: "🇹🇷", rtl: false },
  { code: "en", label: "English",  flag: "🇬🇧", rtl: false },
  { code: "es", label: "Español",  flag: "🇪🇸", rtl: false },
  { code: "pt", label: "Português",flag: "🇧🇷", rtl: false },
  { code: "ar", label: "العربية",  flag: "🇸🇦", rtl: true },
  { code: "ru", label: "Русский",  flag: "🇷🇺", rtl: false },
];

// Kanonik bölge sırası (game.ts PLACES adlarıyla birebir): index bazlı eşleme.
export const PLACE_CANON = ["Üzümlü","Akpınar","Demirhan","Yenişehir","Karaağaç","Söğütlü","Bozkır","Gümüşhisar","Çakıllı","Kavaklı","Sarıkaya","Akşehir"];
export const PLACE_NAMES: Record<Lang, string[]> = {
  tr: PLACE_CANON,
  en: ["Vinevale","Whitespring","Ironhold","Newburgh","Blackelm","Willowby","Greymoor","Silverkeep","Pebbleford","Poplarton","Goldrock","Whitehaven"],
  es: ["Uvaledo","Fuenteblanca","Herrería","Villanueva","Olmonegro","Sauceda","Páramo","Platacerro","Guijarro","Alamedo","Peñadoro","Puertoblanco"],
  pt: ["Uvário","Fonte Branca","Ferreiro","Vila Nova","Olmo Negro","Salgueiral","Charneca","Prataforte","Seixal","Choupal","Rocha de Ouro","Porto Branco"],
  ar: ["كرمستان","الينبوع","حصن الحديد","المدينة الجديدة","الدردار","الصفصاف","البادية","حصن الفضة","الحصباء","الحور","صخرة الذهب","الميناء الأبيض"],
  ru: ["Виноградное","Белый Ключ","Железоград","Новоград","Чёрный Вяз","Ивовка","Серолесье","Среброград","Каменка","Тополёвка","Златоскал","Беломорье"],
};
export function placeName(canonical: string, lang: Lang): string {
  const i = PLACE_CANON.indexOf(canonical);
  if (i < 0) return canonical;
  return (PLACE_NAMES[lang] && PLACE_NAMES[lang][i]) || canonical;
}

// NPC isim havuzları (erkek/kadın ad + soyad), dile göre.
export const NAME_POOLS: Record<Lang, { m: string[]; f: string[]; s: string[] }> = {
  tr: {
    m: ["Mehmet","Ahmet","Mustafa","Hasan","Hüseyin","İbrahim","Osman","Yusuf","Murat","Kerem","Emre","Cihan","Barış","Tolga","Mert"],
    f: ["Ayşe","Fatma","Zeynep","Emine","Hatice","Elif","Nur","Reyhan","Cansu","Derya","Sevda","Pınar","Gül","Nazlı","Hande"],
    s: ["Atay","Bircan","Demirhan","Saygı","Açıkel","Dalkılıç","Kayhan","Bal","Yıldırım","Toprak","Çelik","Aydın","Korkmaz","Şahin"],
  },
  en: {
    m: ["William","John","Robert","Edmund","Henry","Thomas","Walter","Hugh","Roger","Geoffrey","Richard","Simon","Gilbert","Ralph","Edward"],
    f: ["Alice","Maud","Agnes","Edith","Joan","Margery","Cecily","Isabel","Eleanor","Matilda","Beatrice","Rose","Emma","Aveline","Sybil"],
    s: ["Ashford","Blackwood","Carter","Smith","Marsh","Thatcher","Fletcher","Hale","Stone","Wells","Reeve","Carver","Holt","Frost"],
  },
  es: {
    m: ["Juan","Pedro","Diego","Rodrigo","Alfonso","Fernando","Gonzalo","Ramiro","Sancho","Martín","Lope","García","Bermudo","Nuño","Álvaro"],
    f: ["María","Inés","Leonor","Urraca","Blanca","Constanza","Teresa","Elvira","Sancha","Mencía","Catalina","Isabel","Aldonza","Jimena","Beatriz"],
    s: ["del Valle","Herrero","Ríos","Castro","Vega","Montes","Salazar","Cuéllar","Bravo","Acero","Aguilar","Pardo","Sierra","León"],
  },
  pt: {
    m: ["João","Pedro","Diogo","Rodrigo","Afonso","Fernão","Gonçalo","Vasco","Sancho","Martim","Lopo","Garcia","Nuno","Álvaro","Egas"],
    f: ["Maria","Inês","Leonor","Urraca","Branca","Constança","Teresa","Elvira","Sancha","Mécia","Catarina","Isabel","Aldonça","Mor","Beatriz"],
    s: ["do Vale","Ferreiro","Rios","Castro","Veiga","Montes","Salazar","Bravo","Aço","Aguiar","Pardo","Serra","Leão","Pinto"],
  },
  ar: {
    m: ["محمد","أحمد","علي","حسن","حسين","إبراهيم","عثمان","يوسف","عمر","خالد","سليمان","داود","يعقوب","صلاح","طارق"],
    f: ["فاطمة","عائشة","زينب","مريم","خديجة","ليلى","نور","رحمة","سعاد","هند","سارة","أمينة","حليمة","نادية","سلمى"],
    s: ["الحدّاد","النجّار","التاجر","الصيّاد","الراعي","الخبّاز","القيسي","الدمشقي","الحلبي","المصري","الأندلسي","الفارسي","الكردي","البغدادي"],
  },
  ru: {
    m: ["Иван","Пётр","Фёдор","Дмитрий","Алексей","Михаил","Никита","Борис","Глеб","Ярослав","Святослав","Олег","Игорь","Роман","Владимир"],
    f: ["Мария","Анна","Ольга","Дарья","Евдокия","Прасковья","Ксения","Варвара","Елена","Татьяна","Анастасия","Софья","Марфа","Наталья","Любовь"],
    s: ["Кузнецов","Плотников","Гончаров","Рыбаков","Пастухов","Соколов","Медведев","Волков","Морозов","Орлов","Зайцев","Лебедев","Карпов","Громов"],
  },
};

// Meslek adı + kariyer unvanları (6 dil). game.ts PROFESSIONS ile aynı id ve kademe sayısı.
type ProfL = { name: string; tiers: string[] };
export const PROF_L10N: Record<Lang, Record<string, ProfL>> = {
  tr: {
    çiftçi:{name:"Çiftçi",tiers:["Irgat","Çiftçi","Toprak Sahibi"]}, demirci:{name:"Demirci",tiers:["Demirci Çırağı","Demirci","Usta Demirci"]},
    tüccar:{name:"Tüccar",tiers:["Seyyar Satıcı","Tüccar","Tüccar Başı"]}, balıkçı:{name:"Balıkçı",tiers:["Ağcı","Balıkçı","Reis"]},
    avcı:{name:"Avcı",tiers:["İzci","Avcı","Usta Avcı"]}, marangoz:{name:"Marangoz",tiers:["Çırak","Marangoz","Usta Marangoz"]},
    çoban:{name:"Çoban",tiers:["Sürü Yamağı","Çoban","Sürü Sahibi"]}, fırıncı:{name:"Fırıncı",tiers:["Hamurkâr","Fırıncı","Ekmekçi Başı"]},
    asker:{name:"Asker",tiers:["Acemi","Asker","Onbaşı","Sipahi"]}, müzisyen:{name:"Müzisyen",tiers:["Çırak Ozan","Müzisyen","Saz Üstadı"]},
    şifacı:{name:"Şifacı",tiers:["Otacı","Şifacı","Hekim"]}, katip:{name:"Kâtip",tiers:["Çömez","Kâtip","Divan Kâtibi"]},
    kuyumcu:{name:"Kuyumcu",tiers:["Çırak","Kuyumcu","Usta Kuyumcu"]}, dokumacı:{name:"Dokumacı",tiers:["Çırak","Dokumacı","Usta Dokumacı"]},
    hancı:{name:"Hancı",tiers:["Hizmetkâr","Hancı","Han Sahibi"]},
    çocuk:{name:"Çocuk",tiers:["Çocuk"]}, çırak:{name:"Çırak",tiers:["Çırak"]}, işsiz:{name:"İşsiz",tiers:["İşsiz"]},
  },
  en: {
    çiftçi:{name:"Farmer",tiers:["Farmhand","Farmer","Landowner"]}, demirci:{name:"Smith",tiers:["Smith's Apprentice","Smith","Master Smith"]},
    tüccar:{name:"Merchant",tiers:["Peddler","Merchant","Master Merchant"]}, balıkçı:{name:"Fisher",tiers:["Netman","Fisher","Skipper"]},
    avcı:{name:"Hunter",tiers:["Tracker","Hunter","Master Hunter"]}, marangoz:{name:"Carpenter",tiers:["Apprentice","Carpenter","Master Carpenter"]},
    çoban:{name:"Shepherd",tiers:["Herd Boy","Shepherd","Flock Owner"]}, fırıncı:{name:"Baker",tiers:["Doughhand","Baker","Head Baker"]},
    asker:{name:"Soldier",tiers:["Recruit","Soldier","Corporal","Cavalryman"]}, müzisyen:{name:"Musician",tiers:["Apprentice Bard","Musician","Master Minstrel"]},
    şifacı:{name:"Healer",tiers:["Herbalist","Healer","Physician"]}, katip:{name:"Scribe",tiers:["Novice","Scribe","Court Scribe"]},
    kuyumcu:{name:"Jeweler",tiers:["Apprentice","Jeweler","Master Jeweler"]}, dokumacı:{name:"Weaver",tiers:["Apprentice","Weaver","Master Weaver"]},
    hancı:{name:"Innkeeper",tiers:["Servant","Innkeeper","Inn Owner"]},
    çocuk:{name:"Child",tiers:["Child"]}, çırak:{name:"Apprentice",tiers:["Apprentice"]}, işsiz:{name:"Unemployed",tiers:["Unemployed"]},
  },
  es: {
    çiftçi:{name:"Granjero",tiers:["Peón","Granjero","Terrateniente"]}, demirci:{name:"Herrero",tiers:["Aprendiz de herrero","Herrero","Maestro herrero"]},
    tüccar:{name:"Mercader",tiers:["Buhonero","Mercader","Gran mercader"]}, balıkçı:{name:"Pescador",tiers:["Redero","Pescador","Patrón"]},
    avcı:{name:"Cazador",tiers:["Rastreador","Cazador","Maestro cazador"]}, marangoz:{name:"Carpintero",tiers:["Aprendiz","Carpintero","Maestro carpintero"]},
    çoban:{name:"Pastor",tiers:["Zagal","Pastor","Dueño del rebaño"]}, fırıncı:{name:"Panadero",tiers:["Amasador","Panadero","Maestro panadero"]},
    asker:{name:"Soldado",tiers:["Recluta","Soldado","Cabo","Jinete"]}, müzisyen:{name:"Músico",tiers:["Aprendiz de bardo","Músico","Maestro juglar"]},
    şifacı:{name:"Sanador",tiers:["Herbolario","Sanador","Médico"]}, katip:{name:"Escriba",tiers:["Novicio","Escriba","Escriba de la corte"]},
    kuyumcu:{name:"Joyero",tiers:["Aprendiz","Joyero","Maestro joyero"]}, dokumacı:{name:"Tejedor",tiers:["Aprendiz","Tejedor","Maestro tejedor"]},
    hancı:{name:"Posadero",tiers:["Sirviente","Posadero","Dueño de posada"]},
    çocuk:{name:"Niño",tiers:["Niño"]}, çırak:{name:"Aprendiz",tiers:["Aprendiz"]}, işsiz:{name:"Desempleado",tiers:["Desempleado"]},
  },
  pt: {
    çiftçi:{name:"Agricultor",tiers:["Jornaleiro","Agricultor","Proprietário"]}, demirci:{name:"Ferreiro",tiers:["Aprendiz de ferreiro","Ferreiro","Mestre ferreiro"]},
    tüccar:{name:"Mercador",tiers:["Vendedor ambulante","Mercador","Grande mercador"]}, balıkçı:{name:"Pescador",tiers:["Rederiro","Pescador","Mestre"]},
    avcı:{name:"Caçador",tiers:["Rastreador","Caçador","Mestre caçador"]}, marangoz:{name:"Carpinteiro",tiers:["Aprendiz","Carpinteiro","Mestre carpinteiro"]},
    çoban:{name:"Pastor",tiers:["Pastorinho","Pastor","Dono do rebanho"]}, fırıncı:{name:"Padeiro",tiers:["Amassador","Padeiro","Mestre padeiro"]},
    asker:{name:"Soldado",tiers:["Recruta","Soldado","Cabo","Cavaleiro"]}, müzisyen:{name:"Músico",tiers:["Aprendiz de bardo","Músico","Mestre menestrel"]},
    şifacı:{name:"Curandeiro",tiers:["Ervanário","Curandeiro","Médico"]}, katip:{name:"Escrivão",tiers:["Noviço","Escrivão","Escrivão da corte"]},
    kuyumcu:{name:"Joalheiro",tiers:["Aprendiz","Joalheiro","Mestre joalheiro"]}, dokumacı:{name:"Tecelão",tiers:["Aprendiz","Tecelão","Mestre tecelão"]},
    hancı:{name:"Estalajadeiro",tiers:["Servo","Estalajadeiro","Dono da estalagem"]},
    çocuk:{name:"Criança",tiers:["Criança"]}, çırak:{name:"Aprendiz",tiers:["Aprendiz"]}, işsiz:{name:"Desempregado",tiers:["Desempregado"]},
  },
  ar: {
    çiftçi:{name:"مزارع",tiers:["أجير","مزارع","مالك أرض"]}, demirci:{name:"حدّاد",tiers:["صبي الحدّاد","حدّاد","حدّاد ماهر"]},
    tüccar:{name:"تاجر",tiers:["بائع متجوّل","تاجر","كبير التجّار"]}, balıkçı:{name:"صيّاد سمك",tiers:["شبّاك","صيّاد","ريّس"]},
    avcı:{name:"صيّاد",tiers:["كشّاف","صيّاد","صيّاد ماهر"]}, marangoz:{name:"نجّار",tiers:["صبي","نجّار","نجّار ماهر"]},
    çoban:{name:"راعٍ",tiers:["صبي الرعي","راعٍ","صاحب قطيع"]}, fırıncı:{name:"خبّاز",tiers:["عجّان","خبّاز","كبير الخبّازين"]},
    asker:{name:"جندي",tiers:["مجنّد","جندي","عريف","فارس"]}, müzisyen:{name:"موسيقي",tiers:["شاعر متدرّب","موسيقي","أستاذ العزف"]},
    şifacı:{name:"معالج",tiers:["عشّاب","معالج","طبيب"]}, katip:{name:"كاتب",tiers:["مبتدئ","كاتب","كاتب الديوان"]},
    kuyumcu:{name:"صائغ",tiers:["صبي","صائغ","صائغ ماهر"]}, dokumacı:{name:"نسّاج",tiers:["صبي","نسّاج","نسّاج ماهر"]},
    hancı:{name:"صاحب خان",tiers:["خادم","صاحب خان","مالك الخان"]},
    çocuk:{name:"طفل",tiers:["طفل"]}, çırak:{name:"صبي",tiers:["صبي"]}, işsiz:{name:"عاطل",tiers:["عاطل"]},
  },
  ru: {
    çiftçi:{name:"Земледелец",tiers:["Батрак","Земледелец","Землевладелец"]}, demirci:{name:"Кузнец",tiers:["Подмастерье кузнеца","Кузнец","Мастер-кузнец"]},
    tüccar:{name:"Торговец",tiers:["Коробейник","Торговец","Купец"]}, balıkçı:{name:"Рыбак",tiers:["Сетевик","Рыбак","Старшина"]},
    avcı:{name:"Охотник",tiers:["Следопыт","Охотник","Мастер-охотник"]}, marangoz:{name:"Плотник",tiers:["Подмастерье","Плотник","Мастер-плотник"]},
    çoban:{name:"Пастух",tiers:["Подпасок","Пастух","Хозяин стада"]}, fırıncı:{name:"Пекарь",tiers:["Тестомес","Пекарь","Старший пекарь"]},
    asker:{name:"Солдат",tiers:["Новобранец","Солдат","Капрал","Всадник"]}, müzisyen:{name:"Музыкант",tiers:["Ученик барда","Музыкант","Мастер-менестрель"]},
    şifacı:{name:"Лекарь",tiers:["Травник","Лекарь","Врач"]}, katip:{name:"Писарь",tiers:["Новичок","Писарь","Придворный писарь"]},
    kuyumcu:{name:"Ювелир",tiers:["Подмастерье","Ювелир","Мастер-ювелир"]}, dokumacı:{name:"Ткач",tiers:["Подмастерье","Ткач","Мастер-ткач"]},
    hancı:{name:"Трактирщик",tiers:["Слуга","Трактирщик","Хозяин трактира"]},
    çocuk:{name:"Ребёнок",tiers:["Ребёнок"]}, çırak:{name:"Подмастерье",tiers:["Подмастерье"]}, işsiz:{name:"Безработный",tiers:["Безработный"]},
  },
};
export function professionNameL(id: string, lang: Lang): string {
  return (PROF_L10N[lang]?.[id] || PROF_L10N.tr[id])?.name || id;
}
export function careerTitleL(id: string, careerXp: number, lang: Lang): string {
  const p = PROF_L10N[lang]?.[id] || PROF_L10N.tr[id]; if (!p) return id;
  const tier = Math.min(p.tiers.length - 1, Math.floor(careerXp / 30));
  return p.tiers[tier];
}

// ── NPC kişilik metinleri (world.ts'teki TRAITS/QUIRKS/GOALS ile birebir sıralı) ──
// Oyun mantığı kanonik TR değeri kullanır; bunlar yalnız GÖSTERİM içindir.
const TRAITS_TR = ["neşeli","ciddi","kibirli","cömert","dertli","yalnız","kurnaz","mert","dindar","hırslı","utangaç","sıcakkanlı"];
const QUIRKS_TR = ["sürekli hava durumundan dert yanar","eski günleri anlatmayı sever","herkese lakap takar","az konuşur çok dinler","yüksek sesle güler","pazarlığa bayılır","komşularını çekiştirir","bir türküyü mırıldanır","sözüne hep bir atasözü katar","cebinde kuru üzüm taşır, çocuklara dağıtır","gölgeye bakıp vakti şaşmaz bilir","selamı herkese adıyla verir"];
const GOALS_TR = ["bir dükkân açmanın hayalini kuruyor","kızını/oğlunu evermek istiyor","borçlarından kurtulmaya çalışıyor","hacca gitmeyi diliyor","toprak satın almak için biriktiriyor","ustabaşı olmak istiyor","küs olduğu kardeşiyle barışmak istiyor","bir ev yaptırmanın derdinde","kervan ticaretine atılmak istiyor","adını duyurmak istiyor","yıllardır görmediği memleketini görmek istiyor","çırağını kendi dükkânına kavuşturmak istiyor"];
const TRAITS_L: Record<Lang, string[]> = {
  tr: TRAITS_TR,
  en: ["cheerful","serious","arrogant","generous","troubled","lonely","cunning","valiant","pious","ambitious","shy","warm-hearted"],
  es: ["alegre","serio","arrogante","generoso","atribulado","solitario","astuto","valiente","devoto","ambicioso","tímido","afable"],
  pt: ["alegre","sério","arrogante","generoso","atribulado","solitário","astuto","valente","devoto","ambicioso","tímido","afável"],
  ar: ["مرح","جادّ","متكبّر","كريم","مهموم","وحيد","ماكر","شجاع","تقيّ","طموح","خجول","ودود"],
  ru: ["весёлый","серьёзный","надменный","щедрый","удручённый","одинокий","хитрый","доблестный","набожный","честолюбивый","застенчивый","душевный"],
};
const QUIRKS_L: Record<Lang, string[]> = {
  tr: QUIRKS_TR,
  en: ["always complains about the weather","loves telling of the old days","gives everyone nicknames","speaks little, listens much","laughs out loud","loves to haggle","gossips about the neighbors","hums a folk tune","peppers every remark with a proverb","keeps raisins in a pocket to hand out to children","tells the hour by a shadow, never wrong","greets everyone by name"],
  es: ["siempre se queja del clima","le encanta hablar de los viejos tiempos","les pone apodos a todos","habla poco y escucha mucho","ríe a carcajadas","le encanta regatear","critica a sus vecinos","tararea una tonada","adereza cada frase con un refrán","lleva pasas en el bolsillo para repartir a los niños","sabe la hora por la sombra, sin fallar","saluda a todos por su nombre"],
  pt: ["queixa-se sempre do tempo","adora falar dos velhos tempos","dá alcunhas a toda a gente","fala pouco e ouve muito","ri alto","adora regatear","fala mal dos vizinhos","cantarola uma toada","tempera cada frase com um provérbio","traz passas no bolso para dar às crianças","sabe as horas pela sombra, sem falhar","cumprimenta todos pelo nome"],
  ar: ["يشكو الطقس دائمًا","يحبّ الحديث عن الأيّام الخوالي","يطلق الألقاب على الجميع","يقلّ كلامه ويكثر إصغاؤه","يضحك بصوت عالٍ","يعشق المساومة","يغتاب جيرانه","يدندن أغنية شعبيّة","يقرن كلامه دائما بمثل","يحمل زبيبا في جيبه يوزعه على الصغار","يعرف الوقت من الظل ولا يخطئ","يسلم على الجميع بأسمائهم"],
  ru: ["вечно жалуется на погоду","любит рассказывать о былом","всем раздаёт прозвища","мало говорит, много слушает","громко смеётся","обожает торговаться","судачит о соседях","напевает народную песню","к каждому слову прибавляет пословицу","носит в кармане изюм и раздаёт его детям","по тени безошибочно узнаёт час","здоровается с каждым по имени"],
};
const GOALS_L: Record<Lang, string[]> = {
  tr: GOALS_TR,
  en: ["dreams of opening a shop","wants to marry off a child","is trying to clear debts","wishes to go on pilgrimage","is saving to buy land","wants to become a foreman","wants to reconcile with an estranged sibling","is set on building a house","wants to take up caravan trade","wants to make a name","longs to see the homeland not seen for years","wants to see the apprentice set up with a shop"],
  es: ["sueña con abrir una tienda","quiere casar a un hijo","intenta saldar sus deudas","desea peregrinar","ahorra para comprar tierra","quiere ser capataz","quiere reconciliarse con un hermano distanciado","se empeña en construir una casa","quiere lanzarse al comercio de caravanas","quiere hacerse un nombre","anhela ver su tierra natal tras muchos años","quiere ver a su aprendiz con tienda propia"],
  pt: ["sonha em abrir uma loja","quer casar um filho","tenta saldar as dívidas","deseja peregrinar","poupa para comprar terra","quer tornar-se capataz","quer reconciliar-se com um irmão afastado","está empenhado em construir uma casa","quer lançar-se no comércio de caravanas","quer fazer um nome","anseia por ver a terra natal após muitos anos","quer ver o aprendiz com loja própria"],
  ar: ["يحلم بفتح دكّان","يريد تزويج ابنه/ابنته","يحاول سداد ديونه","يتمنّى الحجّ","يدّخر لشراء أرض","يريد أن يصير رئيس عمّال","يريد الصلح مع أخٍ مقاطع","عازم على بناء بيت","يريد خوض تجارة القوافل","يريد أن يُشتهَر","يشتاق إلى رؤية بلدته التي لم يرها منذ سنين","يريد أن يرى صبيه صاحب دكان"],
  ru: ["мечтает открыть лавку","хочет женить/выдать замуж дитя","пытается расплатиться с долгами","желает совершить паломничество","копит на покупку земли","хочет стать старшим мастером","хочет помириться с отдалившимся родичем","намерен построить дом","хочет заняться караванной торговлей","хочет прославить своё имя","тоскует по родным краям, не виданным годами","хочет увидеть подмастерье с собственной лавкой"],
};
function personaL(arrTR: string[], arrL: Record<Lang, string[]>, v: string, lang: Lang): string {
  const i = arrTR.indexOf(v); if (i < 0) return v; return (arrL[lang] || arrL.tr)[i] || v;
}
export function traitL(v: string, lang: Lang): string { return personaL(TRAITS_TR, TRAITS_L, v, lang); }
export function quirkL(v: string, lang: Lang): string { return personaL(QUIRKS_TR, QUIRKS_L, v, lang); }
export function goalL(v: string, lang: Lang): string { return personaL(GOALS_TR, GOALS_L, v, lang); }
