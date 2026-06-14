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
