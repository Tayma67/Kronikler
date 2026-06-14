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
// Eşya adları (pazar, heybe, atölye, hediye — her yerde).
const IT: Record<Lang, Dict> = {
  tr: { "it.ekmek":"Ekmek","it.peynir":"Peynir","it.et":"Et","it.balik":"Balık","it.corba":"Çorba","it.bal":"Bal","it.sarap":"Şarap","it.sifa":"Şifalı Ot","it.iksir":"Şifa İksiri","it.bugday":"Buğday","it.un":"Un","it.yun":"Yün","it.demir":"Demir","it.kereste":"Kereste","it.deri":"Deri","it.bicak":"Bıçak","it.kilic":"Kılıç","it.celik_kilic":"Çelik Kılıç","it.savas_balta":"Savaş Baltası","it.yay":"Av Yayı","it.deri_zirh":"Deri Zırh","it.zincir_zirh":"Zincir Zırh","it.kalkan":"Kalkan" },
  en: { "it.ekmek":"Bread","it.peynir":"Cheese","it.et":"Meat","it.balik":"Fish","it.corba":"Soup","it.bal":"Honey","it.sarap":"Wine","it.sifa":"Healing Herb","it.iksir":"Healing Potion","it.bugday":"Wheat","it.un":"Flour","it.yun":"Wool","it.demir":"Iron","it.kereste":"Timber","it.deri":"Leather","it.bicak":"Knife","it.kilic":"Sword","it.celik_kilic":"Steel Sword","it.savas_balta":"War Axe","it.yay":"Hunting Bow","it.deri_zirh":"Leather Armor","it.zincir_zirh":"Chainmail","it.kalkan":"Shield" },
  es: { "it.ekmek":"Pan","it.peynir":"Queso","it.et":"Carne","it.balik":"Pescado","it.corba":"Sopa","it.bal":"Miel","it.sarap":"Vino","it.sifa":"Hierba curativa","it.iksir":"Poción curativa","it.bugday":"Trigo","it.un":"Harina","it.yun":"Lana","it.demir":"Hierro","it.kereste":"Madera","it.deri":"Cuero","it.bicak":"Cuchillo","it.kilic":"Espada","it.celik_kilic":"Espada de acero","it.savas_balta":"Hacha de guerra","it.yay":"Arco de caza","it.deri_zirh":"Armadura de cuero","it.zincir_zirh":"Cota de malla","it.kalkan":"Escudo" },
  pt: { "it.ekmek":"Pão","it.peynir":"Queijo","it.et":"Carne","it.balik":"Peixe","it.corba":"Sopa","it.bal":"Mel","it.sarap":"Vinho","it.sifa":"Erva curativa","it.iksir":"Poção curativa","it.bugday":"Trigo","it.un":"Farinha","it.yun":"Lã","it.demir":"Ferro","it.kereste":"Madeira","it.deri":"Couro","it.bicak":"Faca","it.kilic":"Espada","it.celik_kilic":"Espada de aço","it.savas_balta":"Machado de guerra","it.yay":"Arco de caça","it.deri_zirh":"Armadura de couro","it.zincir_zirh":"Cota de malha","it.kalkan":"Escudo" },
  ar: { "it.ekmek":"خبز","it.peynir":"جبن","it.et":"لحم","it.balik":"سمك","it.corba":"حساء","it.bal":"عسل","it.sarap":"نبيذ","it.sifa":"عشبة شافية","it.iksir":"جرعة شفاء","it.bugday":"قمح","it.un":"دقيق","it.yun":"صوف","it.demir":"حديد","it.kereste":"خشب","it.deri":"جلد","it.bicak":"سكين","it.kilic":"سيف","it.celik_kilic":"سيف فولاذي","it.savas_balta":"فأس حرب","it.yay":"قوس صيد","it.deri_zirh":"درع جلدي","it.zincir_zirh":"درع حلقي","it.kalkan":"ترس" },
  ru: { "it.ekmek":"Хлеб","it.peynir":"Сыр","it.et":"Мясо","it.balik":"Рыба","it.corba":"Похлёбка","it.bal":"Мёд","it.sarap":"Вино","it.sifa":"Целебная трава","it.iksir":"Зелье лечения","it.bugday":"Пшеница","it.un":"Мука","it.yun":"Шерсть","it.demir":"Железо","it.kereste":"Древесина","it.deri":"Кожа","it.bicak":"Нож","it.kilic":"Меч","it.celik_kilic":"Стальной меч","it.savas_balta":"Боевой топор","it.yay":"Охотничий лук","it.deri_zirh":"Кожаный доспех","it.zincir_zirh":"Кольчуга","it.kalkan":"Щит" },
};
// Çatışma karşılaşmaları (başlık + açıklama).
// Loncalar (ad + tanıtım + üyelik avantajı + görev etiketi/açıklaması) + stat adları + sosyal.
const FAC: Record<Lang, Dict> = {
  tr: { "fac.tuccar.n":"Tüccarlar Loncası","fac.tuccar.b":"İpek yolunun akçesi onların avucunda döner.","fac.tuccar.p":"Pazarda alış fiyatları senin için biraz düşer.","fac.tuccar.tl":"Kervan hesabı tut","fac.demirci.n":"Demirciler Loncası","fac.demirci.b":"Köz ve örs; her kılıcın ve sabanın atası.","fac.demirci.p":"İşten kazancın artar.","fac.demirci.tl":"Ocakta körük çek","fac.asker.n":"Asker Ocağı","fac.asker.b":"Sınır boylarının kalkanı; sancağın gölgesi.","fac.asker.p":"Suç ve tehlikede sağlık kaybın azalır.","fac.asker.tl":"Devriyeye çık","fac.sifaci.n":"Şifacılar Meclisi","fac.sifaci.b":"Ot, dua ve sabır; canın sessiz bekçileri.","fac.sifaci.p":"Her ay az da olsa sağlık tazelenir.","fac.sifaci.tl":"Hastalara bak","fac.golge.n":"Gölge Kardeşliği","fac.golge.b":"Adı anılmaz, yüzü görülmez; her kapıda bir kulağı vardır.","fac.golge.p":"Gölge işlerinde yakalanma riskin azalır.","fac.golge.tl":"Haber taşı",
        "st.strength":"Güç","st.intelligence":"Zekâ","st.charisma":"Karizma","st.stamina":"Dayanıklılık", "fac.suitStat":"Uygun özellik","fac.repute":"İTİBAR","fac.leave":"SAFLARINDAN AYRIL","fac.front":"CEPHEYE GİT","org.subtitle":"Loncalara görev gör, itibar kazan; güvenildiğinde saflarına katıl.","org.youMember":"üyesisin" },
  en: { "fac.tuccar.n":"Merchants' Guild","fac.tuccar.b":"The coin of the silk road turns in their palm.","fac.tuccar.p":"Market buy prices drop a little for you.","fac.tuccar.tl":"Keep caravan ledgers","fac.demirci.n":"Smiths' Guild","fac.demirci.b":"Ember and anvil; father of every blade and plow.","fac.demirci.p":"Your work earns more.","fac.demirci.tl":"Work the bellows","fac.asker.n":"Soldiers' Hearth","fac.asker.b":"Shield of the frontier; shadow of the banner.","fac.asker.p":"You lose less health in crime and danger.","fac.asker.tl":"Go on patrol","fac.sifaci.n":"Healers' Council","fac.sifaci.b":"Herb, prayer and patience; quiet keepers of life.","fac.sifaci.p":"A little health renews each month.","fac.sifaci.tl":"Tend the sick","fac.golge.n":"Shadow Brotherhood","fac.golge.b":"Unnamed, unseen; yet an ear at every door.","fac.golge.p":"Lower risk of getting caught in shadow work.","fac.golge.tl":"Carry word",
        "st.strength":"Strength","st.intelligence":"Intellect","st.charisma":"Charisma","st.stamina":"Stamina", "fac.suitStat":"Best stat","fac.repute":"STANDING","fac.leave":"LEAVE THE RANKS","fac.front":"TO THE FRONT","org.subtitle":"Do guild tasks, earn standing; join the ranks once trusted.","org.youMember":"member" },
  es: { "fac.tuccar.n":"Gremio de Mercaderes","fac.tuccar.b":"La moneda de la ruta de la seda gira en su palma.","fac.tuccar.p":"Los precios de compra bajan un poco para ti.","fac.tuccar.tl":"Llevar cuentas de caravana","fac.demirci.n":"Gremio de Herreros","fac.demirci.b":"Brasa y yunque; padre de toda espada y arado.","fac.demirci.p":"Tu trabajo rinde más.","fac.demirci.tl":"Mover el fuelle","fac.asker.n":"Hogar de Soldados","fac.asker.b":"Escudo de la frontera; sombra del estandarte.","fac.asker.p":"Pierdes menos salud en crimen y peligro.","fac.asker.tl":"Salir de patrulla","fac.sifaci.n":"Consejo de Sanadores","fac.sifaci.b":"Hierba, oración y paciencia; guardianes de la vida.","fac.sifaci.p":"Algo de salud se renueva cada mes.","fac.sifaci.tl":"Cuidar enfermos","fac.golge.n":"Hermandad de la Sombra","fac.golge.b":"Sin nombre, sin rostro; un oído en cada puerta.","fac.golge.p":"Menos riesgo de ser atrapado en las sombras.","fac.golge.tl":"Llevar mensajes",
        "st.strength":"Fuerza","st.intelligence":"Inteligencia","st.charisma":"Carisma","st.stamina":"Resistencia", "fac.suitStat":"Mejor atributo","fac.repute":"REPUTACIÓN","fac.leave":"DEJAR LAS FILAS","fac.front":"AL FRENTE","org.subtitle":"Haz tareas del gremio, gana reputación; únete cuando confíen en ti.","org.youMember":"miembro" },
  pt: { "fac.tuccar.n":"Guilda dos Mercadores","fac.tuccar.b":"A moeda da rota da seda gira na palma deles.","fac.tuccar.p":"Os preços de compra baixam um pouco para ti.","fac.tuccar.tl":"Manter contas da caravana","fac.demirci.n":"Guilda dos Ferreiros","fac.demirci.b":"Brasa e bigorna; pai de toda lâmina e arado.","fac.demirci.p":"O teu trabalho rende mais.","fac.demirci.tl":"Mover o fole","fac.asker.n":"Lar dos Soldados","fac.asker.b":"Escudo da fronteira; sombra do estandarte.","fac.asker.p":"Perdes menos saúde no crime e no perigo.","fac.asker.tl":"Sair em patrulha","fac.sifaci.n":"Conselho dos Curandeiros","fac.sifaci.b":"Erva, oração e paciência; guardiões da vida.","fac.sifaci.p":"Alguma saúde renova-se a cada mês.","fac.sifaci.tl":"Cuidar dos doentes","fac.golge.n":"Irmandade da Sombra","fac.golge.b":"Sem nome, sem rosto; um ouvido em cada porta.","fac.golge.p":"Menor risco de seres apanhado nas sombras.","fac.golge.tl":"Levar recados",
        "st.strength":"Força","st.intelligence":"Inteligência","st.charisma":"Carisma","st.stamina":"Resistência", "fac.suitStat":"Melhor atributo","fac.repute":"REPUTAÇÃO","fac.leave":"DEIXAR AS FILEIRAS","fac.front":"PARA A FRENTE","org.subtitle":"Faz tarefas da guilda, ganha reputação; junta-te quando confiarem em ti.","org.youMember":"membro" },
  ar: { "fac.tuccar.n":"نقابة التجّار","fac.tuccar.b":"عملة طريق الحرير تدور في كفّهم.","fac.tuccar.p":"تنخفض أسعار الشراء قليلاً لك.","fac.tuccar.tl":"امسك دفاتر القافلة","fac.demirci.n":"نقابة الحدّادين","fac.demirci.b":"جمر وسندان؛ أبو كل سيف ومحراث.","fac.demirci.p":"يزداد كسبك من العمل.","fac.demirci.tl":"انفخ الكير","fac.asker.n":"موقد الجند","fac.asker.b":"درع الثغور؛ ظلّ الرّاية.","fac.asker.p":"تفقد صحة أقل في الجريمة والخطر.","fac.asker.tl":"اخرج في دورية","fac.sifaci.n":"مجلس المعالجين","fac.sifaci.b":"عشب ودعاء وصبر؛ حرّاس الحياة الصامتون.","fac.sifaci.p":"تتجدّد صحتك قليلاً كل شهر.","fac.sifaci.tl":"اعتنِ بالمرضى","fac.golge.n":"أخوّة الظل","fac.golge.b":"لا اسم ولا وجه؛ لكن لها أذن عند كل باب.","fac.golge.p":"يقلّ خطر الإمساك بك في أعمال الظل.","fac.golge.tl":"انقل خبرًا",
        "st.strength":"القوة","st.intelligence":"الذكاء","st.charisma":"الجاذبية","st.stamina":"التحمّل", "fac.suitStat":"أفضل صفة","fac.repute":"السُّمعة","fac.leave":"غادر الصفوف","fac.front":"إلى الجبهة","org.subtitle":"أدِّ مهامّ النقابة واكسب السمعة؛ انضمّ حين يُوثَق بك.","org.youMember":"عضو" },
  ru: { "fac.tuccar.n":"Гильдия торговцев","fac.tuccar.b":"Монета шёлкового пути вертится в их ладони.","fac.tuccar.p":"Цены покупки немного ниже для тебя.","fac.tuccar.tl":"Вести счета каравана","fac.demirci.n":"Гильдия кузнецов","fac.demirci.b":"Жар и наковальня; отец каждого клинка и плуга.","fac.demirci.p":"Заработок от труда выше.","fac.demirci.tl":"Раздувать меха","fac.asker.n":"Очаг солдат","fac.asker.b":"Щит рубежей; тень знамени.","fac.asker.p":"Меньше теряешь здоровья в риске и преступлении.","fac.asker.tl":"Идти в дозор","fac.sifaci.n":"Совет лекарей","fac.sifaci.b":"Трава, молитва и терпение; тихие хранители жизни.","fac.sifaci.p":"Немного здоровья восстанавливается каждый месяц.","fac.sifaci.tl":"Лечить больных","fac.golge.n":"Братство тени","fac.golge.b":"Без имени, без лица; но ухо у каждой двери.","fac.golge.p":"Меньше риск попасться в тёмных делах.","fac.golge.tl":"Нести весть",
        "st.strength":"Сила","st.intelligence":"Ум","st.charisma":"Харизма","st.stamina":"Выносливость", "fac.suitStat":"Лучшая черта","fac.repute":"РЕПУТАЦИЯ","fac.leave":"ПОКИНУТЬ РЯДЫ","fac.front":"НА ФРОНТ","org.subtitle":"Выполняй задания гильдии, зарабатывай репутацию; вступай, когда доверятся.","org.youMember":"состоишь" },
};
const MISC: Record<Lang, Dict> = {
  tr: { "misc.age":"yaş","misc.jobless":"İşsiz","misc.male":"Erkek","misc.female":"Kadın","misc.generation":"nesil","misc.have":"Elinde","misc.buy":"AL","misc.sell":"SAT","misc.bargain":"PAZARLIK","misc.craft":"ÜRET","misc.join":"KATIL","misc.member":"ÜYE","misc.use":"KULLAN","misc.equip":"KUŞAN","misc.remove":"ÇIKAR" },
  en: { "misc.age":"yrs","misc.jobless":"Jobless","misc.male":"Man","misc.female":"Woman","misc.generation":"gen.","misc.have":"Have","misc.buy":"BUY","misc.sell":"SELL","misc.bargain":"HAGGLE","misc.craft":"CRAFT","misc.join":"JOIN","misc.member":"MEMBER","misc.use":"USE","misc.equip":"EQUIP","misc.remove":"REMOVE" },
  es: { "misc.age":"años","misc.jobless":"Sin oficio","misc.male":"Hombre","misc.female":"Mujer","misc.generation":"gen.","misc.have":"Tienes","misc.buy":"COMPRAR","misc.sell":"VENDER","misc.bargain":"REGATEAR","misc.craft":"CREAR","misc.join":"UNIRSE","misc.member":"MIEMBRO","misc.use":"USAR","misc.equip":"EQUIPAR","misc.remove":"QUITAR" },
  pt: { "misc.age":"anos","misc.jobless":"Sem ofício","misc.male":"Homem","misc.female":"Mulher","misc.generation":"ger.","misc.have":"Tens","misc.buy":"COMPRAR","misc.sell":"VENDER","misc.bargain":"REGATEAR","misc.craft":"CRIAR","misc.join":"ENTRAR","misc.member":"MEMBRO","misc.use":"USAR","misc.equip":"EQUIPAR","misc.remove":"REMOVER" },
  ar: { "misc.age":"سنة","misc.jobless":"بلا مهنة","misc.male":"رجل","misc.female":"امرأة","misc.generation":"جيل","misc.have":"لديك","misc.buy":"شراء","misc.sell":"بيع","misc.bargain":"مساومة","misc.craft":"صنع","misc.join":"انضمام","misc.member":"عضو","misc.use":"استخدم","misc.equip":"تجهيز","misc.remove":"إزالة" },
  ru: { "misc.age":"лет","misc.jobless":"Без дела","misc.male":"Мужчина","misc.female":"Женщина","misc.generation":"пок.","misc.have":"В наличии","misc.buy":"КУПИТЬ","misc.sell":"ПРОДАТЬ","misc.bargain":"ТОРГ","misc.craft":"СОЗДАТЬ","misc.join":"ВСТУПИТЬ","misc.member":"ЧЛЕН","misc.use":"ИСПОЛЬЗ.","misc.equip":"НАДЕТЬ","misc.remove":"СНЯТЬ" },
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
  tr: { ...TR, ...SCR.tr, ...CB.tr, ...ENC.tr, ...IT.tr, ...MISC.tr, ...FAC.tr }, en: { ...EN, ...SCR.en, ...CB.en, ...ENC.en, ...IT.en, ...MISC.en, ...FAC.en }, es: { ...ES, ...SCR.es, ...CB.es, ...ENC.es, ...IT.es, ...MISC.es, ...FAC.es },
  pt: { ...PT, ...SCR.pt, ...CB.pt, ...ENC.pt, ...IT.pt, ...MISC.pt, ...FAC.pt }, ar: { ...AR, ...SCR.ar, ...CB.ar, ...ENC.ar, ...IT.ar, ...MISC.ar, ...FAC.ar }, ru: { ...RU, ...SCR.ru, ...CB.ru, ...ENC.ru, ...IT.ru, ...MISC.ru, ...FAC.ru },
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
