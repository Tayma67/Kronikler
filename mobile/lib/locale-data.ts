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
