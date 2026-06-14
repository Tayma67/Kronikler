// Lokalizasyon altyapısı — dil durumu (kalıcı) + t() çeviri.
// Eksik anahtar Türkçe'ye, o da yoksa anahtarın kendisine düşer (oyun hiç bozulmaz).
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Lang, LANGS } from "./locale-data";

const KEY = "kronikler_lang_v1";

// Çeviri sözlüğü. İlk dilim: ana menü, yeni oyun, ayarlar, ortak aksiyonlar, menü.
type Dict = Record<string, string>;
const TR: Dict = {
  "app.subtitle": "Kül & Köz · çevrimdışı",
  "menu.continue": "Devam Et", "menu.newGame": "Yeni Oyun", "menu.settings": "Ayarlar", "menu.language": "Dil",
  "menu.title": "Menü",
  "common.back": "‹ Geri", "common.continue": "DEVAM", "common.cancel": "Vazgeç",
  "act.eat": "YE", "act.work": "ÇALIŞ", "act.advance": "AYI İLERLE",
  "new.title": "YENİ OYUN", "new.nameLabel": "AD SOYAD", "new.namePlaceholder": "Adını ve soyadını gir",
  "new.gender": "CİNSİYET", "new.male": "Erkek", "new.female": "Kız",
  "new.create": "DÜNYAYI YARAT", "new.creating": "DÜNYA YARATILIYOR…",
  "new.errName": "Lütfen adını gir (en az 2 harf)", "new.errGender": "Lütfen cinsiyetini seç",
  "new.beginLife": "HAYATINA BAŞLA ›", "new.tapNext": "DEVAM İÇİN DOKUN",
  "settings.title": "Ayarlar", "settings.sound": "SESLER", "settings.soundDesc": "İnce dokunma ve ay sesleri",
  "settings.generation": "NESİL", "settings.newLife": "YENİ HAYAT BAŞLAT", "settings.reset": "Mevcut oyun silinsin mi?",
  "sec.livelihood": "Geçim", "sec.power": "Güç & Mevki", "sec.realm": "Diyar & Soy", "sec.records": "Kayıt & Anı",
  "dash.journal": "HAYAT GÜNLÜĞÜ", "dash.empty": "Günlüğün henüz boş. Ayı ilerlet, hikâyen başlasın.",
  "settings.haptics": "TİTREŞİM", "settings.hapticsDesc": "Önemli anlarda hafif dokunsal geri bildirim",
};
const EN: Dict = {
  "app.subtitle": "Ash & Ember · offline",
  "menu.continue": "Continue", "menu.newGame": "New Game", "menu.settings": "Settings", "menu.language": "Language",
  "menu.title": "Menu",
  "common.back": "‹ Back", "common.continue": "CONTINUE", "common.cancel": "Cancel",
  "act.eat": "EAT", "act.work": "WORK", "act.advance": "ADVANCE MONTH",
  "new.title": "NEW GAME", "new.nameLabel": "FULL NAME", "new.namePlaceholder": "Enter your name and surname",
  "new.gender": "GENDER", "new.male": "Man", "new.female": "Woman",
  "new.create": "CREATE WORLD", "new.creating": "CREATING WORLD…",
  "new.errName": "Please enter your name (min 2 letters)", "new.errGender": "Please choose your gender",
  "new.beginLife": "BEGIN YOUR LIFE ›", "new.tapNext": "TAP TO CONTINUE",
  "settings.title": "Settings", "settings.sound": "SOUNDS", "settings.soundDesc": "Subtle taps and month chimes",
  "settings.generation": "GENERATION", "settings.newLife": "START A NEW LIFE", "settings.reset": "Delete the current game?",
  "sec.livelihood": "Livelihood", "sec.power": "Power & Status", "sec.realm": "Realm & Lineage", "sec.records": "Records",
  "dash.journal": "LIFE JOURNAL", "dash.empty": "Your journal is empty. Advance the month to begin your story.",
  "settings.haptics": "VIBRATION", "settings.hapticsDesc": "Subtle haptic feedback on key moments",
};
const ES: Dict = {
  "app.subtitle": "Ceniza y Brasa · sin conexión",
  "menu.continue": "Continuar", "menu.newGame": "Nueva Partida", "menu.settings": "Ajustes", "menu.language": "Idioma",
  "menu.title": "Menú",
  "common.back": "‹ Atrás", "common.continue": "CONTINUAR", "common.cancel": "Cancelar",
  "act.eat": "COMER", "act.work": "TRABAJAR", "act.advance": "AVANZAR MES",
  "new.title": "NUEVA PARTIDA", "new.nameLabel": "NOMBRE COMPLETO", "new.namePlaceholder": "Escribe tu nombre y apellido",
  "new.gender": "GÉNERO", "new.male": "Hombre", "new.female": "Mujer",
  "new.create": "CREAR MUNDO", "new.creating": "CREANDO MUNDO…",
  "new.errName": "Escribe tu nombre (mín. 2 letras)", "new.errGender": "Elige tu género",
  "new.beginLife": "COMIENZA TU VIDA ›", "new.tapNext": "TOCA PARA CONTINUAR",
  "settings.title": "Ajustes", "settings.sound": "SONIDOS", "settings.soundDesc": "Toques sutiles y campanadas",
  "settings.generation": "GENERACIÓN", "settings.newLife": "EMPEZAR UNA NUEVA VIDA", "settings.reset": "¿Borrar la partida actual?",
  "sec.livelihood": "Sustento", "sec.power": "Poder y Estatus", "sec.realm": "Reino y Linaje", "sec.records": "Registros",
  "dash.journal": "DIARIO DE VIDA", "dash.empty": "Tu diario está vacío. Avanza el mes para empezar tu historia.",
  "settings.haptics": "VIBRACIÓN", "settings.hapticsDesc": "Respuesta háptica sutil en momentos clave",
};
const PT: Dict = {
  "app.subtitle": "Cinza e Brasa · offline",
  "menu.continue": "Continuar", "menu.newGame": "Novo Jogo", "menu.settings": "Definições", "menu.language": "Idioma",
  "menu.title": "Menu",
  "common.back": "‹ Voltar", "common.continue": "CONTINUAR", "common.cancel": "Cancelar",
  "act.eat": "COMER", "act.work": "TRABALHAR", "act.advance": "AVANÇAR MÊS",
  "new.title": "NOVO JOGO", "new.nameLabel": "NOME COMPLETO", "new.namePlaceholder": "Escreve o teu nome e apelido",
  "new.gender": "GÉNERO", "new.male": "Homem", "new.female": "Mulher",
  "new.create": "CRIAR MUNDO", "new.creating": "A CRIAR MUNDO…",
  "new.errName": "Escreve o teu nome (mín. 2 letras)", "new.errGender": "Escolhe o teu género",
  "new.beginLife": "COMEÇA A TUA VIDA ›", "new.tapNext": "TOCA PARA CONTINUAR",
  "settings.title": "Definições", "settings.sound": "SONS", "settings.soundDesc": "Toques subtis e sinos",
  "settings.generation": "GERAÇÃO", "settings.newLife": "COMEÇAR UMA NOVA VIDA", "settings.reset": "Apagar o jogo atual?",
  "sec.livelihood": "Sustento", "sec.power": "Poder e Estatuto", "sec.realm": "Reino e Linhagem", "sec.records": "Registos",
  "dash.journal": "DIÁRIO DE VIDA", "dash.empty": "O teu diário está vazio. Avança o mês para começar a tua história.",
  "settings.haptics": "VIBRAÇÃO", "settings.hapticsDesc": "Resposta tátil subtil em momentos importantes",
};
const AR: Dict = {
  "app.subtitle": "رماد وجمر · بلا اتصال",
  "menu.continue": "متابعة", "menu.newGame": "لعبة جديدة", "menu.settings": "الإعدادات", "menu.language": "اللغة",
  "menu.title": "القائمة",
  "common.back": "‹ رجوع", "common.continue": "متابعة", "common.cancel": "إلغاء",
  "act.eat": "كُل", "act.work": "اعمل", "act.advance": "تقدّم شهرًا",
  "new.title": "لعبة جديدة", "new.nameLabel": "الاسم الكامل", "new.namePlaceholder": "أدخل اسمك ولقبك",
  "new.gender": "الجنس", "new.male": "رجل", "new.female": "امرأة",
  "new.create": "اخلق العالم", "new.creating": "يجري خلق العالم…",
  "new.errName": "اكتب اسمك (حرفان على الأقل)", "new.errGender": "اختر جنسك",
  "new.beginLife": "ابدأ حياتك ›", "new.tapNext": "اضغط للمتابعة",
  "settings.title": "الإعدادات", "settings.sound": "الأصوات", "settings.soundDesc": "نقرات خفيفة وأجراس",
  "settings.generation": "الجيل", "settings.newLife": "ابدأ حياة جديدة", "settings.reset": "حذف اللعبة الحالية؟",
  "sec.livelihood": "المعيشة", "sec.power": "القوة والمكانة", "sec.realm": "الديار والنسل", "sec.records": "السجلّات",
  "dash.journal": "يوميات الحياة", "dash.empty": "يومياتك فارغة. تقدّم شهرًا لتبدأ حكايتك.",
  "settings.haptics": "الاهتزاز", "settings.hapticsDesc": "ارتجاع لمسي خفيف في اللحظات المهمة",
};
const RU: Dict = {
  "app.subtitle": "Пепел и Жар · офлайн",
  "menu.continue": "Продолжить", "menu.newGame": "Новая игра", "menu.settings": "Настройки", "menu.language": "Язык",
  "menu.title": "Меню",
  "common.back": "‹ Назад", "common.continue": "ДАЛЕЕ", "common.cancel": "Отмена",
  "act.eat": "ЕСТЬ", "act.work": "РАБОТА", "act.advance": "СЛЕД. МЕСЯЦ",
  "new.title": "НОВАЯ ИГРА", "new.nameLabel": "ПОЛНОЕ ИМЯ", "new.namePlaceholder": "Введите имя и фамилию",
  "new.gender": "ПОЛ", "new.male": "Мужчина", "new.female": "Женщина",
  "new.create": "СОЗДАТЬ МИР", "new.creating": "СОЗДАНИЕ МИРА…",
  "new.errName": "Введите имя (мин. 2 буквы)", "new.errGender": "Выберите пол",
  "new.beginLife": "НАЧАТЬ ЖИЗНЬ ›", "new.tapNext": "НАЖМИТЕ, ЧТОБЫ ПРОДОЛЖИТЬ",
  "settings.title": "Настройки", "settings.sound": "ЗВУКИ", "settings.soundDesc": "Тихие нажатия и колокола",
  "settings.generation": "ПОКОЛЕНИЕ", "settings.newLife": "НАЧАТЬ НОВУЮ ЖИЗНЬ", "settings.reset": "Удалить текущую игру?",
  "sec.livelihood": "Заработок", "sec.power": "Власть и статус", "sec.realm": "Край и род", "sec.records": "Записи",
  "dash.journal": "ДНЕВНИК ЖИЗНИ", "dash.empty": "Дневник пуст. Проживите месяц, чтобы начать историю.",
  "settings.haptics": "ВИБРАЦИЯ", "settings.hapticsDesc": "Лёгкая тактильная отдача в ключевые моменты",
};
// Ekran/menü etiketleri (navigasyon).
const CB: Record<Lang, Dict> = {
  tr: { "cb.subtitle":"Tur tabanlı dövüş: hamle/savuştur/özel — düşmanın niyetini sez.", "cb.fight":"DÖVÜŞ", "cb.settle":"HESAPLAŞ", "cb.claim":"ZAFERİ TOPLA", "cb.retreat":"GERİ ÇEKİL", "cb.you":"Sen", "cb.enemy":"Düşman", "cb.enemyPower":"düşman gücü", "cb.knifeYes":"Bıçağın yanında.", "cb.knifeNo":"Bir bıçak işine yarardı.", "cb.hamle":"Hamle", "cb.savustur":"Savuştur", "cb.ozel":"Özel", "cb.reward":"Ödül", "cb.fame":"şöhret", "cb.settleTime":"Hesaplaşma vakti." },
  en: { "cb.subtitle":"Turn-based duel: strike/parry/special — read the foe's intent.", "cb.fight":"FIGHT", "cb.settle":"SETTLE IT", "cb.claim":"CLAIM VICTORY", "cb.retreat":"RETREAT", "cb.you":"You", "cb.enemy":"Foe", "cb.enemyPower":"foe power", "cb.knifeYes":"Your knife is ready.", "cb.knifeNo":"A knife would help.", "cb.hamle":"Strike", "cb.savustur":"Parry", "cb.ozel":"Special", "cb.reward":"Reward", "cb.fame":"fame", "cb.settleTime":"Time to settle the score." },
  es: { "cb.subtitle":"Duelo por turnos: golpe/parada/especial — lee la intención del rival.", "cb.fight":"LUCHAR", "cb.settle":"AJUSTAR CUENTAS", "cb.claim":"RECLAMAR VICTORIA", "cb.retreat":"RETIRARSE", "cb.you":"Tú", "cb.enemy":"Rival", "cb.enemyPower":"poder rival", "cb.knifeYes":"Tu cuchillo está listo.", "cb.knifeNo":"Un cuchillo vendría bien.", "cb.hamle":"Golpe", "cb.savustur":"Parada", "cb.ozel":"Especial", "cb.reward":"Recompensa", "cb.fame":"fama", "cb.settleTime":"Hora de saldar cuentas." },
  pt: { "cb.subtitle":"Duelo por turnos: golpe/aparar/especial — lê a intenção do inimigo.", "cb.fight":"LUTAR", "cb.settle":"ACERTAR CONTAS", "cb.claim":"RECLAMAR VITÓRIA", "cb.retreat":"RECUAR", "cb.you":"Tu", "cb.enemy":"Inimigo", "cb.enemyPower":"poder do inimigo", "cb.knifeYes":"A tua faca está pronta.", "cb.knifeNo":"Uma faca daria jeito.", "cb.hamle":"Golpe", "cb.savustur":"Aparar", "cb.ozel":"Especial", "cb.reward":"Recompensa", "cb.fame":"fama", "cb.settleTime":"Hora de acertar contas." },
  ar: { "cb.subtitle":"نزال بالأدوار: ضربة/صدّ/خاصة — اقرأ نيّة خصمك.", "cb.fight":"قاتل", "cb.settle":"صفِّ الحساب", "cb.claim":"انتزع النصر", "cb.retreat":"انسحب", "cb.you":"أنت", "cb.enemy":"الخصم", "cb.enemyPower":"قوة الخصم", "cb.knifeYes":"سكينك جاهز.", "cb.knifeNo":"سكين سيفيدك.", "cb.hamle":"ضربة", "cb.savustur":"صدّ", "cb.ozel":"خاصة", "cb.reward":"مكافأة", "cb.fame":"شهرة", "cb.settleTime":"حان وقت تصفية الحساب." },
  ru: { "cb.subtitle":"Пошаговый поединок: удар/блок/особый — угадай намерение врага.", "cb.fight":"БОЙ", "cb.settle":"СВЕСТИ СЧЁТЫ", "cb.claim":"ЗАБРАТЬ ПОБЕДУ", "cb.retreat":"ОТСТУПИТЬ", "cb.you":"Ты", "cb.enemy":"Враг", "cb.enemyPower":"сила врага", "cb.knifeYes":"Нож при тебе.", "cb.knifeNo":"Нож бы пригодился.", "cb.hamle":"Удар", "cb.savustur":"Блок", "cb.ozel":"Особый", "cb.reward":"Награда", "cb.fame":"слава", "cb.settleTime":"Пора свести счёты." },
};
// Çatışma karşılaşmaları (başlık + açıklama).
const ENC: Record<Lang, Dict> = {
  tr: { "enc.haydut.t":"Yol Haydutları","enc.haydut.d":"Pusudaki haydutlar kervanına göz dikti.","enc.duello.t":"Meydan Okuma","enc.duello.d":"Bir yiğit seni teke tek dövüşe çağırdı.","enc.sinir.t":"Sınır Çatışması","enc.sinir.d":"Sancak beyinin emrinde sınırı koru.","enc.kusatma.t":"Kale Kuşatması","enc.kusatma.d":"Surların önünde kanlı bir kuşatma." },
  en: { "enc.haydut.t":"Road Bandits","enc.haydut.d":"Bandits in ambush eye your caravan.","enc.duello.t":"The Challenge","enc.duello.d":"A warrior calls you to single combat.","enc.sinir.t":"Border Skirmish","enc.sinir.d":"Hold the frontier for the sanjak-bey.","enc.kusatma.t":"Castle Siege","enc.kusatma.d":"A bloody siege before the walls." },
  es: { "enc.haydut.t":"Bandidos del camino","enc.haydut.d":"Bandidos emboscados acechan tu caravana.","enc.duello.t":"El desafío","enc.duello.d":"Un guerrero te reta a combate singular.","enc.sinir.t":"Escaramuza fronteriza","enc.sinir.d":"Defiende la frontera por el bey.","enc.kusatma.t":"Asedio al castillo","enc.kusatma.d":"Un asedio sangriento ante los muros." },
  pt: { "enc.haydut.t":"Bandidos da estrada","enc.haydut.d":"Bandidos à espreita visam a tua caravana.","enc.duello.t":"O desafio","enc.duello.d":"Um guerreiro chama-te para combate singular.","enc.sinir.t":"Escaramuça na fronteira","enc.sinir.d":"Defende a fronteira pelo bei.","enc.kusatma.t":"Cerco ao castelo","enc.kusatma.d":"Um cerco sangrento diante das muralhas." },
  ar: { "enc.haydut.t":"قطّاع الطرق","enc.haydut.d":"لصوص في كمين يترصّدون قافلتك.","enc.duello.t":"التحدّي","enc.duello.d":"محارب يدعوك إلى نزال فردي.","enc.sinir.t":"اشتباك حدودي","enc.sinir.d":"احمِ الحدود بأمر البك.","enc.kusatma.t":"حصار القلعة","enc.kusatma.d":"حصار دموي أمام الأسوار." },
  ru: { "enc.haydut.t":"Разбойники","enc.haydut.d":"Разбойники из засады метят на твой караван.","enc.duello.t":"Вызов","enc.duello.d":"Воин зовёт тебя на поединок.","enc.sinir.t":"Пограничная стычка","enc.sinir.d":"Удержи рубеж по приказу бея.","enc.kusatma.t":"Осада замка","enc.kusatma.d":"Кровавая осада у стен." },
};
const SCR: Record<Lang, Dict> = {
  tr: { "scr.meslek":"Meslek","scr.pazar":"Pazar","scr.atolye":"Atölye","scr.mulkler":"Mülkler","scr.firsatlar":"Fırsatlar","scr.gorevler":"Açık İşler","scr.mektep":"Mektep","scr.beceriler":"Beceri Ağacı","scr.orgutler":"Örgütler / Loncalar","scr.sosyal":"Mevki & İtibar","scr.savas":"Çatışma","scr.suc":"Gölge İşleri","scr.sehir":"Şehir / Diyar","scr.harita":"Diyar Haritası","scr.haberler":"Diyardan Haberler","scr.hanedan":"Hanedan","scr.nesil":"Nesil & Vâris","scr.hikayeler":"Hikâyelerim","scr.basarimlar":"Başarımlar","scr.tarih":"Kronik","scr.roman":"Hayatın Romanı","scr.ayarlar":"Ayarlar" },
  en: { "scr.meslek":"Profession","scr.pazar":"Market","scr.atolye":"Workshop","scr.mulkler":"Properties","scr.firsatlar":"Opportunities","scr.gorevler":"Open Tasks","scr.mektep":"School","scr.beceriler":"Skill Tree","scr.orgutler":"Guilds & Orders","scr.sosyal":"Status & Repute","scr.savas":"Combat","scr.suc":"Shadow Work","scr.sehir":"Town / Realm","scr.harita":"Realm Map","scr.haberler":"Tidings","scr.hanedan":"Dynasty","scr.nesil":"Heirs & Will","scr.hikayeler":"My Tales","scr.basarimlar":"Achievements","scr.tarih":"Chronicle","scr.roman":"Life Story","scr.ayarlar":"Settings" },
  es: { "scr.meslek":"Profesión","scr.pazar":"Mercado","scr.atolye":"Taller","scr.mulkler":"Propiedades","scr.firsatlar":"Oportunidades","scr.gorevler":"Tareas","scr.mektep":"Escuela","scr.beceriler":"Habilidades","scr.orgutler":"Gremios y Órdenes","scr.sosyal":"Estatus y Fama","scr.savas":"Combate","scr.suc":"Trabajo en Sombras","scr.sehir":"Pueblo / Reino","scr.harita":"Mapa del Reino","scr.haberler":"Noticias","scr.hanedan":"Dinastía","scr.nesil":"Herederos","scr.hikayeler":"Mis Historias","scr.basarimlar":"Logros","scr.tarih":"Crónica","scr.roman":"La Novela","scr.ayarlar":"Ajustes" },
  pt: { "scr.meslek":"Profissão","scr.pazar":"Mercado","scr.atolye":"Oficina","scr.mulkler":"Propriedades","scr.firsatlar":"Oportunidades","scr.gorevler":"Tarefas","scr.mektep":"Escola","scr.beceriler":"Habilidades","scr.orgutler":"Guildas e Ordens","scr.sosyal":"Estatuto e Fama","scr.savas":"Combate","scr.suc":"Trabalho das Sombras","scr.sehir":"Vila / Reino","scr.harita":"Mapa do Reino","scr.haberler":"Notícias","scr.hanedan":"Dinastia","scr.nesil":"Herdeiros","scr.hikayeler":"As Minhas Histórias","scr.basarimlar":"Conquistas","scr.tarih":"Crónica","scr.roman":"O Romance","scr.ayarlar":"Definições" },
  ar: { "scr.meslek":"المهنة","scr.pazar":"السوق","scr.atolye":"الورشة","scr.mulkler":"الأملاك","scr.firsatlar":"الفرص","scr.gorevler":"المهام","scr.mektep":"المدرسة","scr.beceriler":"شجرة المهارات","scr.orgutler":"النقابات والطرق","scr.sosyal":"المكانة والصيت","scr.savas":"القتال","scr.suc":"أعمال الظل","scr.sehir":"البلدة / الديار","scr.harita":"خريطة الديار","scr.haberler":"الأخبار","scr.hanedan":"السلالة","scr.nesil":"الورثة والوصية","scr.hikayeler":"حكاياتي","scr.basarimlar":"الإنجازات","scr.tarih":"السجلّ","scr.roman":"رواية الحياة","scr.ayarlar":"الإعدادات" },
  ru: { "scr.meslek":"Профессия","scr.pazar":"Рынок","scr.atolye":"Мастерская","scr.mulkler":"Владения","scr.firsatlar":"Возможности","scr.gorevler":"Задачи","scr.mektep":"Школа","scr.beceriler":"Древо навыков","scr.orgutler":"Гильдии и ордена","scr.sosyal":"Статус и слава","scr.savas":"Бой","scr.suc":"Тёмные дела","scr.sehir":"Город / Край","scr.harita":"Карта края","scr.haberler":"Вести","scr.hanedan":"Династия","scr.nesil":"Наследники","scr.hikayeler":"Мои истории","scr.basarimlar":"Достижения","scr.tarih":"Хроника","scr.roman":"Роман жизни","scr.ayarlar":"Настройки" },
};
const DICTS: Record<Lang, Dict> = {
  tr: { ...TR, ...SCR.tr, ...CB.tr, ...ENC.tr }, en: { ...EN, ...SCR.en, ...CB.en, ...ENC.en }, es: { ...ES, ...SCR.es, ...CB.es, ...ENC.es },
  pt: { ...PT, ...SCR.pt, ...CB.pt, ...ENC.pt }, ar: { ...AR, ...SCR.ar, ...CB.ar, ...ENC.ar }, ru: { ...RU, ...SCR.ru, ...CB.ru, ...ENC.ru },
};

interface Ctx { lang: Lang; rtl: boolean; setLang: (l: Lang) => void; t: (key: string) => string; }
const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("tr");
  useEffect(() => { (async () => { try { const v = await AsyncStorage.getItem(KEY); if (v && DICTS[v as Lang]) setLangState(v as Lang); } catch {} })(); }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); AsyncStorage.setItem(KEY, l).catch(() => {}); }, []);
  const t = useCallback((key: string) => DICTS[lang][key] ?? TR[key] ?? key, [lang]);
  const rtl = LANGS.find((l) => l.code === lang)?.rtl ?? false;
  return <LangContext.Provider value={{ lang, rtl, setLang, t }}>{children}</LangContext.Provider>;
}
export function useI18n(): Ctx {
  const c = useContext(LangContext);
  if (!c) throw new Error("useI18n must be used within LanguageProvider");
  return c;
}
