"""Procedural world generation for Kronikler: Küllerin Mirası — v2 (expanded)."""
import random
import uuid
from datetime import datetime, timezone

# ─── Turkish name pools (5x expanded) ──────────────────────────────────────

MALE_NAMES = [
    # Classic pool
    "Alparslan", "Bayram", "Berk", "Cemal", "Demir", "Ertan", "Faruk", "Gökhan",
    "Hasan", "İlhan", "Kerem", "Kaya", "Mahmut", "Mehmet", "Mert", "Murat",
    "Mustafa", "Nazım", "Orhan", "Polat", "Recep", "Selim", "Şahin", "Tuğrul",
    "Umut", "Veli", "Yiğit", "Aslan", "Burak", "Doğan", "Emre", "Fatih",
    "Gazi", "Hamza", "İbrahim", "Kasım", "Levent", "Mansur", "Necati", "Onur",
    "Reşat", "Sefa", "Talip", "Uğur", "Yusuf", "Zeki", "Bora", "Cengiz",
    # Expanded — Ottoman/medieval Anatolian
    "Abdurrahman", "Alaeddin", "Arslan", "Aydın", "Balaban", "Bayezid",
    "Budak", "Cafer", "Davud", "Dursun", "Erdoğan", "Erkan", "Ertuğrul",
    "Evren", "Feridun", "Ferhat", "Furkan", "Hakkı", "Halil", "Harun",
    "İsmail", "Kaplan", "Kılıç", "Koray", "Korhan", "Kutay", "Mirza",
    "Musa", "Nuri", "Oğuz", "Osman", "Ömer", "Rauf", "Salih", "Samet",
    "Sinan", "Süleyman", "Tahsin", "Taner", "Tayfur", "Timur", "Tonguç",
    "Turgut", "Umur", "Ural", "Utku", "Yaşar", "Yener", "Yunus", "Zahir",
    "Adem", "Ahmet", "Ali", "Atilla", "Batuhan", "Baykal", "Berkin",
    "Beyhan", "Bilal", "Bülent", "Celal", "Cem", "Cihat", "Coşkun",
    "Çetin", "Deniz", "Devlet", "Divan", "Doğrul", "Ekrem", "Ender",
    "Engin", "Enes", "Eray", "Ercan", "Erdal", "Fuat", "Göktürk",
    "Güven", "Haluk", "Hikmet", "Hüseyin", "Hüsnü", "İlkay", "İsmet",
    "Kağan", "Kamil", "Kamuran", "Kenan", "Kürşat", "Lütfü", "Metin",
    "Mithat", "Muammer", "Muhittin", "Münir", "Namık", "Nedim", "Niyazi",
    "Numan", "Nurettin", "Ömer", "Özcan", "Sabri", "Sacit", "Sadık",
    "Semih", "Serdar", "Serhat", "Serkan", "Sezer", "Soner", "Sunay",
    "Suphi", "Tuncay", "Turan", "Türker", "Ufuk", "Vahit", "Vedat",
    "Volkan", "Yalçın", "Yavuz", "Yurdakul", "Zafer", "Zülfikar",
    "Abdülkadir", "Abdüllatif", "Ahsen", "Akın", "Alp", "Alpay",
    "Bayat", "Baysak", "Berkay", "Bertan", "Birol", "Boyacı", "Boyraz",
    "Bulut", "Bülend", "Cansever", "Çınar", "Çoban", "Dağhan", "Dursali",
    "Ebubekir", "Edip", "Efendi", "Ejder", "Eker", "Elvan", "Erdem",
    "Erdemir", "Ergün", "Erhan", "Erim", "Erkut", "Ersin", "Ertaş",
    "Ezber", "Gencer", "Genç", "Gündoğan", "Güneri", "Günhan", "Güngör",
]

FEMALE_NAMES = [
    # Classic pool
    "Asena", "Ayşe", "Berrin", "Ceren", "Defne", "Elif", "Fatma", "Gül",
    "Hayriye", "İclal", "Jale", "Kübra", "Leyla", "Melek", "Naciye", "Nilgün",
    "Özge", "Pelin", "Rabia", "Sevim", "Şükriye", "Tülay", "Ümmü", "Yasemin",
    "Zehra", "Aliye", "Bahar", "Cemile", "Duru", "Esma", "Feride", "Gülşen",
    "Hande", "İlknur", "Kader", "Lale", "Meryem", "Nesrin", "Oya", "Perihan",
    # Expanded
    "Adalet", "Akgül", "Alev", "Almila", "Altun", "Asel", "Aydan",
    "Aygün", "Aysun", "Azime", "Bedia", "Belkıs", "Berna", "Birgül",
    "Buse", "Büşra", "Canan", "Cansu", "Cemre", "Çiçek", "Çiğdem",
    "Didem", "Dilara", "Dilek", "Dudu", "Edibe", "Elmas", "Emel",
    "Esen", "Fatima", "Ferda", "Gülay", "Gülbahar", "Gülden", "Güler",
    "Gülistan", "Gülnaz", "Güzin", "Hacer", "Hafize", "Hanife", "Hatice",
    "Hediye", "Hilal", "Hülya", "Işıl", "İlkem", "Kadriye", "Kamile",
    "Kevser", "Latife", "Lütfiye", "Maide", "Meral", "Müzeyyen",
    "Naile", "Nalan", "Nazan", "Nebile", "Nermin", "Nihal", "Nihan",
    "Nisa", "Nuray", "Nurcan", "Nuriye", "Nüket", "Reyhan", "Rukiye",
    "Safiye", "Saime", "Saliha", "Samiye", "Seda", "Selma", "Serap",
    "Seval", "Sezen", "Sibel", "Songül", "Sultan", "Şadiye", "Şafak",
    "Şahide", "Şerife", "Şükran", "Tuba", "Tuğba", "Tuğçe", "Türkan",
    "Ülkü", "Ümit", "Vedia", "Yıldız", "Yurdagül", "Zübeyde", "Zümrüt",
    "Abide", "Aklın", "Altan", "Altınay", "Aslı", "Atıfet", "Aygül",
    "Aysel", "Ayten", "Azra", "Behice", "Binnaz", "Birsen", "Ceylan",
    "Demet", "Deniz", "Derya", "Ebru", "Efsun", "Emine", "Esen",
    "Esin", "Esra", "Eylem", "Fidan", "Figen", "Filiz", "Firdevs",
    "Gönül", "Güldane", "Gülhayat", "Gülten", "Gülümser", "Hicran",
    "Huriye", "Hüsniye", "İffet", "İlhan", "İnci", "İncinur", "Kezban",
    "Kumru", "Küntepe", "Leyla", "Mahfuz", "Makbule", "Mediha", "Melike",
    "Meltem", "Menekşe", "Muazzez", "Münire", "Nadide", "Nefise",
    "Nevzat", "Nigar", "Nilüfer", "Nurhayat", "Nuri", "Pakize", "Saadet",
    "Sabriye", "Safinaz", "Sahra", "Selamet", "Semra", "Serpil",
    "Suzan", "Şenay", "Şengül", "Tülin", "Vildan", "Zeynep",
]

SURNAMES = [
    # Classic
    "Demirhan", "Yıldız", "Karaoğlu", "Aslanbey", "Çelikbaş", "Kılıçdar",
    "Akkaya", "Karadağ", "Gümüştekin", "Bozkurt", "Şahinoğlu", "Yıldırım",
    "Tuna", "Korkmaz", "Çakır", "Polat", "Yağmur", "Boran", "Tepe",
    "Han", "Paşa", "Ak", "Kara", "Demir", "Taş", "Ay", "Kurt",
    # Expanded
    "Akay", "Akbaş", "Akbulut", "Akar", "Akdoğan", "Akgün", "Akın",
    "Akman", "Aksoy", "Aktaş", "Akyol", "Alkan", "Alp", "Altay",
    "Altun", "Arı", "Arıkan", "Arslan", "Aslan", "Avcı", "Aydın",
    "Bahadır", "Bakır", "Bal", "Barış", "Başer", "Baydar", "Bayındır",
    "Bilgin", "Bilici", "Bingöl", "Bozdemir", "Bozgeyik", "Bozkaya",
    "Boztepe", "Çakıroğlu", "Çelik", "Çetin", "Çınar", "Coşkun",
    "Dağ", "Dağlı", "Dalkılıç", "Demirbaş", "Duman", "Durmuş",
    "Elçi", "Elmas", "Eraslan", "Eren", "Ergin", "Erkan", "Eroğlu",
    "Ertekin", "Ertuğrul", "Evren", "Gedik", "Genç", "Gündoğdu",
    "Güneş", "Güngör", "Gürbüz", "Gürel", "Gürler", "Işık",
    "Kahraman", "Kalkan", "Kaptan", "Karahan", "Karakuş", "Karaman",
    "Karasu", "Karatay", "Kayhan", "Keleş", "Keskin", "Kıran",
    "Kılıç", "Kocaman", "Koçak", "Küçük", "Mutlu", "Ocak",
    "Özbek", "Özdemir", "Özden", "Özer", "Özgür", "Özkan", "Özkaya",
    "Özmen", "Pala", "Parmak", "Peker", "Saygı", "Sert", "Sezgin",
    "Solmaz", "Şen", "Şimşek", "Tekin", "Toprak", "Tosun", "Tuncer",
    "Turan", "Türk", "Uysal", "Uzun", "Ünal", "Ünsal", "Vardar",
    "Yalçın", "Yaman", "Yazıcı", "Yeşil", "Yılmaz", "Yücel", "Zengin",
    "Açıkel", "Ağaoğlu", "Ağır", "Akça", "Akçay", "Alçı", "Alıç",
    "Anar", "Aran", "Arat", "Arcan", "Arıoğlu", "Armağan", "Asım",
    "Ataman", "Atay", "Ateş", "Atmaca", "Avcıoğlu", "Aydoğdu",
    "Aygün", "Babaoğlu", "Bağcı", "Bağdatlı", "Bağlı", "Bakar",
    "Balaban", "Baldır", "Balıkcı", "Başaran", "Başbug", "Bayat",
    "Bayraktar", "Baytaş", "Bekar", "Bekiroğlu", "Bekirli", "Belen",
    "Berber", "Berberoğlu", "Biçer", "Bilek", "Bingöllü", "Bircan",
    "Birinci", "Bıçakcı", "Bodur", "Bolat", "Boyacıoğlu", "Boyraz",
    "Bulut", "Buluş", "Bülbül", "Büyük", "Büyükkaya",
]

KINGDOM_NAMES = [
    "Külhanlı Hanedanı", "Demirhan Krallığı", "Altınyay Beyliği",
    "Kuzgun İmparatorluğu", "Akpınar Eyaleti", "Bozkır Hanlığı",
    "Tunca Beylerbeyliği", "Karahan Sultanlığı",
]
KINGDOM_CULTURES = [
    "Külhanlı", "Demirhan", "Altınyay", "Kuzgun", "Akpınar",
    "Bozkır", "Tunca", "Karahan",
]
KINGDOM_RELIGIONS = ["Ateş Yolu", "Eski Tanrılar", "Tek Tanrı", "Atalar Kültü", "Güneş Tarikatı"]

CITY_NAMES = [
    "Karşılkale", "Boranözü", "Akyaman", "Gümüşharç", "Demiryurt",
    "Külboğa", "Akkarsu", "Yıldıztepe", "Karadüğüm", "Bozhisar",
    "Altınova", "Tunçkent", "Demirkent", "Karakent", "Gümüşkent",
    "Taşkent", "Bozköy", "Akşehir", "Karagedik", "Yenişehir",
    "Derinpınar", "Güçlükale", "Sarıkale", "Mavi Liman", "Çifte Minareli",
]
VILLAGE_NAMES = [
    "Kavaklıdere", "Söğütpınar", "Çayıraltı", "Karaçam", "Akçakaya",
    "Yağmurlu", "Taşköprü", "Kurttepe", "Yeniyurt", "Eskidere",
    "Karayel", "Boğazkesen", "Çamlıbel", "Akdoğan", "Karakuyu",
    "Yarımca", "Karagöl", "Akçapınar", "Boyalıca", "Ulukışla",
    "Kavakönü", "Dereköy", "Bağlarbaşı", "Taşlıca", "Yazıköy",
    "Kuştepe", "Çamoluk", "Değirmenbaşı", "Sarısu", "Gölbaşı",
    "Ballıca", "Çaltı", "Kızılcık", "Elmacık", "Üzümlü",
    "Armudu", "Ahlatlı", "Kestaneli", "Cevizlik", "Dutluca",
    "Sazlıca", "Kamışlı", "Çeltikli", "Koyunbaba", "Keçiköy",
    "Sığırcı", "Kuzugüden", "Tavukçular", "Mandıra", "Çobanpınar",
]
CASTLE_NAMES = [
    "Demir Kapı", "Kara Kule", "Yılan Kayası", "Ak Burç", "Külkale",
    "Sarp Geçit", "Kuzgun Pençesi", "Külperi Kulesi", "Gri Sur", "Boz Ocak",
    "Demirburç", "Karataş Kalesi", "Yıldız Kalesi", "Tunç Kapısı", "Kılıç Burcu",
    "Doğan Kalesi", "Kartal Yuvası", "Bozkır Surları", "Demir Hisar", "Taş Parmak",
]

PROFESSIONS_COMMON = [
    # Tarım & hayvancılık
    "çiftçi", "çoban", "bahçıvan", "balıkçı", "avcı", "arıcı",
    # Hammadde (Faz 1A: üretim zinciri girişleri)
    "madenci", "oduncu",
    # Zanaatkâr
    "demirci", "marangoz", "kunduracı", "fırıncı", "değirmenci",
    "çömlekçi", "dokumacı", "boyacı", "sepici", "kasap",
    "kuyumcu", "silahçı", "zırh_ustası", "berber", "terzi", "şarapçı",
    # Ticaret & hizmet
    "tüccar", "seyyar_satıcı", "han_sahibi", "kervancı",
    "katip", "tellal", "sarraf",
    # Eğitim & din
    "rahip", "öğretmen", "şifacı", "eczacı", "falcı",
    # Güvenlik & suç
    "asker", "haydut", "muhafız", "cellat",
    # Sanat & eğlence
    "müzisyen", "cambaz", "hikâyeci",
    # İdari
    "köy_muhtarı",
]
PROFESSIONS_NOBLE = ["lord", "general", "veliaht", "kral", "şövalye", "vezir", "emir"]

PERSONALITY_TRAITS = [
    # Sosyal
    "kibirli", "alçakgönüllü", "cömert", "cimri", "konuşkan", "suskun",
    "neşeli", "asık_suratlı", "merhametli", "acımasız", "sadık", "vefasız",
    # Cesaret & güç
    "cesur", "korkak", "hırslı", "tembel", "sabırlı", "öfkeli",
    # Zihinsel
    "kurnaz", "saf", "pratik", "hayalperest", "meraklı", "şüpheci",
    # Değerler
    "dindar", "asi", "gelenekçi", "fedakâr", "bencil", "adaletli",
    # Duygusal
    "duygusal", "soğuk", "romantik", "pragmatik", "içine_kapalı",
    # Davranış
    "titiz", "dağınık", "güvenilir", "ikiyüzlü", "çekingen", "girişken",
    # Özel
    "huysuz", "hoşgörülü", "mütevazi", "gösterişçi", "maceracı", "muhafazakâr",
]

# Faz 1A: Üretim zinciri malları eklendi (hammadde → ara ürün → son ürün)
GOODS = [
    # Gıda zinciri
    "buğday", "un", "ekmek", "et",
    # Tekstil zinciri
    "yün", "kumaş", "kıyafet",
    # Metal zinciri
    "demir_cevheri", "demir", "silah", "alet",
    # Şarap zinciri
    "üzüm", "şıra", "şarap",
    # Ahşap zinciri
    "odun", "kereste", "mobilya",
    # Deri zinciri
    "deri", "işlenmiş_deri", "zırh", "çizme",
    # Lüks ithal (kervan malları — yerel üretimi yok)
    "ipek", "baharat",
]
GOOD_BASE_PRICES = {
    "buğday": 4, "un": 7, "ekmek": 6, "et": 12,
    "yün": 6, "kumaş": 10, "kıyafet": 28,
    "demir_cevheri": 10, "demir": 25, "silah": 60, "alet": 32,
    "üzüm": 5, "şıra": 14, "şarap": 18,
    "odun": 5, "kereste": 14, "mobilya": 55,
    "deri": 8, "işlenmiş_deri": 14, "zırh": 55, "çizme": 20,
    "ipek": 45, "baharat": 35,
}

PLAYER_START_PROFESSIONS = [
    "köylü", "çiftçi", "asker", "tüccar", "avcı", "demirci çırağı",
]

# ─── Backstory generation ───────────────────────────────────────────────────

_BACKSTORY_TEMPLATES = {
    "çiftçi": [
        "Babası gibi tarlayı sürer; toprağı sever ama vergileri nefret eder.",
        "Gençliğinde tüccar olmayı hayal etti, ama toprak onu bırakmadı.",
        "Üç yıl önce kötü bir hasat geçirdi; borcun altından hâlâ çıkamadı.",
        "Kendi tohumunu özenle saklar, başkasıyla paylaşmaz.",
    ],
    "demirci": [
        "Ondört yaşından beri körük başında; kolları kütük gibi.",
        "Bir zamanlar kral için kılıç yaptı; hikâyesini her fırsatta anlatır.",
        "Ustasının sırrını taşır: demiri karanlıkta bile göre göre çalışır.",
        "Köyün en saygın esnafı; yetim çocuklara ücretsiz nal taktığı söylenir.",
    ],
    "tüccar": [
        "Üç şehirde dükkânı var; dördüncüsünü açmak için tasarruf ediyor.",
        "Yolda soyuldu, yeniden başladı; bu yüzden paraya çok sıkı sarılır.",
        "Söylentiye göre tefecilerle de iş yapıyor; kimse sormuyor.",
        "Kervanlarla gençliğini geçirdi; şimdi tek bir köyde kalmaya alışamıyor.",
    ],
    "avcı": [
        "Ormanda tek başına haftalarca kalabilir; köy hayatını sıkıcı bulur.",
        "Genç yaşta bir ayıyla karşılaşmış; bacağındaki iz hatıra.",
        "Avdan kazandığı kürkleri lordlara satar; kimse nasıl yaptığını bilmez.",
        "Hava durumunu hayvanlara bakarak tahmin eder; nadiren yanılır.",
    ],
    "asker": [
        "Beş yıl savaştı; barışa alışmakta güçlük çekiyor.",
        "Lordun emriyle şehre taşındı; doğduğu köyü özlüyor.",
        "Sol kolu savaşta yaralandı; ama hâlâ kılıç tutabiliyor.",
        "Arkadaşlarının çoğunu savaşta kaybetti; içki içmeden uyuyamıyor.",
    ],
    "balıkçı": [
        "Sabahın ilk ışığında suya çıkar; akşama kadar döner.",
        "Denizde fırtınaya yakalandı; o günden beri dua etmeyi öğrendi.",
        "En iyi oltasını babadan miras aldı; kimseye dokundurtmuyor.",
        "Balığın çok olduğu yerleri sezgiyle buluyor; rakipler kıskanıyor.",
    ],
    "rahip": [
        "Tanrı'nın sesini on yaşında duyduğunu söylüyor; kimse inanmıyor.",
        "Eskiden paralı askermiş; pişmanlığı tapınağa sürükledi.",
        "Fakire ekmek dağıtır, zenginden bağış toplar; dengesi hiç bozulmaz.",
        "Kutsal metinlerin kopyasını yıllarca gizlemek zorunda kaldı.",
    ],
    "şifacı": [
        "Bitkilerle yirmi yıl geçirdi; her yaprağın adını biliyor.",
        "Şehrin doktorundan çok daha iyidir; ama diploması olmadığı için tanınmıyor.",
        "Gece karanlıkta çağrılır; sabah ortada olmaz.",
        "Zehirleyiciden hastalık yapıcıya kadar her şeyi hazırlayabilir; sakini tutuyor.",
    ],
    "haydut": [
        "Bir zamanlar sıradan bir köylüydü; vergiler onu yola çıkardı.",
        "Lordu tarafından haksız yere kovulmuş; intikam hâlâ gündeminde.",
        "Sadece zenginlerden alır; zayıflara dokunmaz — ya da öyle söyler.",
        "Yüzündeki derin iz bir eski arkadaştan kaldı.",
    ],
    "lord": [
        "Babasının topraklarını devraldı; genişletmek niyetinde.",
        "Gençliğinde savaşta bir rakip lordun oğlunu kendi eliyle öldürdü.",
        "Halkını sever ama vergileri gerçek amacını saklar.",
        "Gece vakti divana çıkmaz; danışmanların iktidarı elinde tutar.",
    ],
    "kral": [
        "Elli yıllık hükümdarlık; rakipler bitmiş, ama zafer tadı geçmiş.",
        "Veliahtı hep küçümsedi; şimdi yaşlılıkta ona muhtaç.",
        "Dördüncü evlilik; önceki üç eşini farklı nedenlerle kaybetti.",
        "Vergi toplamada usta; halk onu sever mi bilmez, korkar kesin.",
    ],
    "çoban": [
        "Sürüsünü otlatırken düşünceye dalar; şairliğe hevesleniyor.",
        "Bir kurdun sürüye girdiğini gece tek başına fark etti ve kovdu.",
        "Dağları çok iyi biliyor; kaybolmak isteyenler ona gelir.",
        "Yalnızlığa o kadar alıştı ki kalabalık onu rahatsız ediyor.",
    ],
    "kuyumcu": [
        "Altını sadece dokunuşuyla değerlendirebilir.",
        "Bir lordan çalıntı taşı satın aldığını bilmeden almış; sonra sessiz kaldı.",
        "Ellerindeki titreme yaşlılıktan değil korkudan geliyor.",
        "Dükkânını kapamayı düşünüyor; alıcı bulamıyor.",
    ],
    "marangoz": [
        "Her işini yavaş yapar; ama yaptıkları yüzyıl dayanır.",
        "Usta olduğunu kimse bilmiyor; yaptığı kapı hâlâ lefte duruyor.",
        "Gençliğinde kilise sütunları yaptı; o sütunlar onu geçecek.",
        "Araçlarını daha çok sever yaptıklarından; her birinin adı var.",
    ],
    "fırıncı": [
        "Şafaktan önce kalkar; şehrin ilk ışığı onun ocağından çıkar.",
        "Ekmeğinin sırrını ölümsüzlüğe taşıyacak; tarifi kimseye vermedi.",
        "Kötü yıllarda bile fakire ekmek verdi; şimdi herkes borcunu biliyor.",
        "Hamuru yoğururken şarkı söyler; sesi fırından dışarı taşar.",
    ],
    "müzisyen": [
        "Bir lordun şenliğinde çalmış; lordluk değişince kapı kapandı.",
        "Eski bir aşk şarkısını söylediğinde ağladığı görülmüş.",
        "Sazını kendi yaptı; hiç ustası olmadı.",
        "Halkın içinde çalar; para yerine bazen ekmek alır.",
    ],
    "DEFAULT": [
        "Doğduğu yerde büyüdü; oradan çıkmayı hiç düşünmedi.",
        "Hayatı sıradan; ama içinde anlatılmamış bir hikâye saklı.",
        "Söz az, iş çok; komşular onu öyle tanır.",
        "Gençliğinde çok daha farklı biri olmayı hayal etmişti.",
        "Geçmişini konuşmaz; ama gözleri çok şey anlatır.",
        "Şansını bir kez zorlamış, kazanamamış; bir daha denemedi.",
    ],
}

_PHYSICAL_BUILDS = ["ince", "orta yapılı", "iri yarı", "bodur", "uzun boylu", "kısa boylu"]
_PHYSICAL_FEATURES = [
    "kırmızı saçlı", "ak saçlı", "kır sakallı", "kör gözlü", "topal",
    "yüzünde bir yara izi olan", "koyu tenli", "soluk tenli", "çilli",
    "uzun boyunlu", "geniş omuzlu", "dökülen saçlı", "sıkı dudaklı",
    "derin gözlü", "iri burunlu", "kaşları sık", "dirseklerinde nasır olan",
    "sert bakışlı", "yumuşak sesli", "gür sesli",
]
_QUIRKS = [
    "Konuşurken elleri durmaz.",
    "Her cümleye 'velhasıl' diyerek başlar.",
    "Göz temasından kaçınır.",
    "Çok sık kahkaha atar.",
    "Yavaş ve ölçülü konuşur.",
    "Her şeyi tekrarlayarak söyler.",
    "Yemek sırasında hiç konuşmaz.",
    "Geceleri uyuyamadığını söyler.",
    "Her sabah aynı duayı okur.",
    "Para konuşmasında sesi düşer.",
    "Daima en ucuz seçeneği tercih eder.",
    "İnsanların gözlerine uzun uzun bakar.",
    "Şarkı mırıldanmadan yürüyemez.",
    "Elleri her zaman temizdir.",
    "Elleri her zaman kirlidir.",
    "Çantasında her zaman bir ekmek taşır.",
]


def _generate_backstory(npc, rng):
    prof = npc.get("profession", "DEFAULT")
    pool = _BACKSTORY_TEMPLATES.get(prof, _BACKSTORY_TEMPLATES["DEFAULT"])
    backstory = rng.choice(pool)
    build = rng.choice(_PHYSICAL_BUILDS)
    feature = rng.choice(_PHYSICAL_FEATURES)
    quirk = rng.choice(_QUIRKS)
    return {
        "summary": backstory,
        "appearance": f"{build.capitalize()}, {feature}.",
        "quirk": quirk,
    }


# ─── Core generation helpers ────────────────────────────────────────────────

def new_id() -> str:
    return uuid.uuid4().hex[:16]


def _pick_name(gender: str) -> str:
    given = random.choice(MALE_NAMES if gender == "erkek" else FEMALE_NAMES)
    return f"{given} {random.choice(SURNAMES)}"


def _make_location(kind: str, name: str, kingdom_id: str, kingdom_name: str):
    pop_map = {
        "şehir": (4000, 12000),
        "köy": (80, 600),
        "kale": (50, 400),
    }
    low, high = pop_map[kind]
    population = random.randint(low, high)
    wealth = random.randint(20, 90) if kind == "şehir" else random.randint(10, 70)
    security = random.randint(30, 95) if kind != "köy" else random.randint(10, 70)
    prosperity = random.randint(20, 90)
    prices = {g: max(1, round(GOOD_BASE_PRICES[g] * random.uniform(0.7, 1.4), 1))
              for g in GOODS}
    market = {}
    for g in GOODS:
        market[g] = {
            "price": prices[g],
            "base": GOOD_BASE_PRICES[g],
            "supply": max(5, int(population * random.uniform(0.05, 0.15))),
            "demand": max(5, int(population * random.uniform(0.05, 0.15))),
        }
    return {
        "id": new_id(),
        "kind": kind,
        "name": name,
        "kingdom_id": kingdom_id,
        "kingdom_name": kingdom_name,
        "population": population,
        "wealth": wealth,
        "security": security,
        "prosperity": prosperity,
        "prices": prices,
        "market": market,
        "production": random.choice(GOODS),
        "ruler_id": None,
    }


def _make_npc(location, kingdom_id, kingdom_name, religion, profession=None):
    gender = random.choice(["erkek", "kadın"])
    age = random.randint(16, 72)
    prof = profession or random.choice(PROFESSIONS_COMMON)
    wealth = {
        "lord": random.randint(5000, 25000),
        "general": random.randint(2000, 8000),
        "kral": random.randint(20000, 80000),
        "veliaht": random.randint(8000, 25000),
        "vezir": random.randint(3000, 12000),
        "emir": random.randint(4000, 18000),
        "tüccar": random.randint(500, 5000),
        "haydut": random.randint(20, 800),
        "sarraf": random.randint(800, 6000),
        "kuyumcu": random.randint(400, 3000),
    }.get(prof, random.randint(10, 500))

    rng = random.Random(new_id())
    npc_id = new_id()
    backstory = _generate_backstory({"profession": prof}, rng)
    # Pick 2-3 personality traits
    n_traits = rng.choices([2, 3], weights=[7, 3])[0]
    traits = rng.sample(PERSONALITY_TRAITS, n_traits)

    # Profession-specific skill level (1-5)
    skill_level = rng.choices([1, 2, 3, 4, 5], weights=[20, 30, 30, 15, 5])[0]
    if age > 50:
        skill_level = min(5, skill_level + 1)

    return {
        "id": npc_id,
        "name": _pick_name(gender),
        "gender": gender,
        "age": age,
        "profession": prof,
        "skill_level": skill_level,           # NEW: 1-5 uzmanlık seviyesi
        "personality": traits,
        "wealth": wealth,
        "health": random.randint(60, 100),
        "kingdom_id": kingdom_id,
        "kingdom_name": kingdom_name,
        "religion": religion,
        "location_id": location["id"],
        "location_name": location["name"],
        "home_location_id": location["id"],   # NEW: doğduğu/yaşadığı yer
        "spouse_id": None,
        "children_ids": [],
        "parent_ids": [],
        "friend_ids": [],
        "rival_ids": [],
        "goal": random.choice([
            "servet kazanmak", "iyi bir eş bulmak", "ün kazanmak",
            "evini büyütmek", "intikam almak", "ailesini korumak",
            "lord olmak", "ticaret yolu kurmak", "huzurlu yaşamak",
        ]),
        "mood": random.choice(["neşeli", "yorgun", "umutsuz", "kararlı", "huzurlu", "öfkeli"]),
        "alive": True,
        "interactions": {},
        "memory": [],
        "personal_events": [],
        "bounty": 0,
        "turn_counter": 0,
        # NEW: Derin profil alanları
        "backstory": backstory["summary"],
        "appearance": backstory["appearance"],
        "quirk": backstory["quirk"],
        "local_reputation": rng.randint(-20, 60),  # Bu NPC'nin yerel itibarı
        "secrets": [],                              # Gizli tuttuğu bilgiler
        "npc_relationships": {},                    # NPC↔NPC ilişkileri: {npc_id: score}
    }


def _link_family(npcs):
    """Yetişkin NPC'leri eş olarak eşleştir ve çocukları ata."""
    adults = [n for n in npcs if 22 <= n["age"] <= 55 and n["spouse_id"] is None]
    random.shuffle(adults)
    pairs_formed = 0
    i = 0
    while i < len(adults) - 1 and pairs_formed < len(adults) // 3:
        a = adults[i]
        # Önceki turda partner olarak atanmış olabilir — üzerine yazma!
        if a["spouse_id"] is not None:
            i += 1
            continue
        partner = next(
            (b for b in adults[i+1:] if b["gender"] != a["gender"]
             and b["spouse_id"] is None and b["kingdom_id"] == a["kingdom_id"]),
            None,
        )
        if partner:
            a["spouse_id"] = partner["id"]
            partner["spouse_id"] = a["id"]
            # Aile soyadı birliği: kadın ve çocuklar erkeğin soyadını taşır
            husband = a if a["gender"] == "erkek" else partner
            wife = partner if husband is a else a
            h_surname = husband["name"].split()[-1]
            wife["name"] = f"{wife['name'].split()[0]} {h_surname}"
            n_children = random.randint(0, 3)
            for _ in range(n_children):
                child = next(
                    (c for c in npcs if c["age"] < 18
                     and not c["parent_ids"]
                     and c["location_id"] == a["location_id"]),
                    None,
                )
                if child:
                    child["parent_ids"] = [a["id"], partner["id"]]
                    a["children_ids"].append(child["id"])
                    partner["children_ids"].append(child["id"])
                    child["name"] = f"{child['name'].split()[0]} {h_surname}"
            pairs_formed += 1
        i += 1


def _assign_crushes(npcs):
    """Bazı bekar yetişkinlere aynı bölgeden birine crush_on ata (~%15)."""
    singles = [n for n in npcs if n.get("spouse_id") is None and 16 <= n.get("age", 0) <= 55]
    random.shuffle(singles)
    for npc in singles:
        if random.random() > 0.15:
            continue
        candidates = [
            c for c in singles
            if c["id"] != npc["id"]
            and c["location_id"] == npc["location_id"]
            and c.get("gender") != npc.get("gender")
            and c.get("crush_on") != npc["id"]
        ]
        if candidates:
            npc["crush_on"] = random.choice(candidates)["id"]


def _assign_npc_relationships(npcs):
    """NPC'ler arasında arkadaş/rakip bağları kur — her NPC için ~2-4 bağ."""
    npc_by_loc = {}
    for n in npcs:
        npc_by_loc.setdefault(n["location_id"], []).append(n)

    for loc_npcs in npc_by_loc.values():
        for npc in loc_npcs:
            if not npc.get("alive", True):
                continue
            # Her NPC için aynı lokasyondan 1-3 arkadaş, 0-2 rakip
            candidates = [c for c in loc_npcs if c["id"] != npc["id"]]
            n_friends = min(len(candidates), random.randint(1, 3))
            friends = random.sample(candidates, n_friends)
            for f in friends:
                score = random.randint(10, 60)
                npc.setdefault("npc_relationships", {})[f["id"]] = score
                f.setdefault("npc_relationships", {})[npc["id"]] = score
                if f["id"] not in npc.get("friend_ids", []):
                    npc.setdefault("friend_ids", []).append(f["id"])
            n_rivals = random.choices([0, 1, 2], weights=[6, 3, 1])[0]
            non_friends = [c for c in candidates if c["id"] not in [f["id"] for f in friends]]
            rivals = random.sample(non_friends, min(len(non_friends), n_rivals))
            for r in rivals:
                score = random.randint(-60, -10)
                npc.setdefault("npc_relationships", {})[r["id"]] = score
                r.setdefault("npc_relationships", {})[npc["id"]] = score
                if r["id"] not in npc.get("rival_ids", []):
                    npc.setdefault("rival_ids", []).append(r["id"])


def generate_world(n_kingdoms=5, n_cities=8, n_villages=22, n_castles=12, n_npcs=1000):
    kingdoms = []
    locations = []
    npcs = []

    k_names = random.sample(KINGDOM_NAMES, min(n_kingdoms, len(KINGDOM_NAMES)))
    cultures = random.sample(KINGDOM_CULTURES, min(n_kingdoms, len(KINGDOM_CULTURES)))
    for i in range(n_kingdoms):
        kid = new_id()
        kingdoms.append({
            "id": kid,
            "name": k_names[i % len(k_names)],
            "culture": cultures[i % len(cultures)],
            "religion": random.choice(KINGDOM_RELIGIONS),
            "treasury": random.randint(5000, 30000),
            "stability": random.randint(40, 90),
            "king_id": None,
            "heir_id": None,
            "at_war_with": [],
            "allies": [],
        })

    def distribute(n, kingdoms_list):
        out = []
        for idx in range(n):
            out.append(kingdoms_list[idx % len(kingdoms_list)])
        return out

    city_assign   = distribute(n_cities,   kingdoms)
    village_assign = distribute(n_villages, kingdoms)
    castle_assign  = distribute(n_castles,  kingdoms)

    used_city_names    = (random.sample(CITY_NAMES,    min(n_cities,   len(CITY_NAMES)))
                          + [f"Şehir-{i}" for i in range(max(0, n_cities - len(CITY_NAMES)))])
    used_village_names = (random.sample(VILLAGE_NAMES, min(n_villages, len(VILLAGE_NAMES)))
                          + [f"Köy-{i}" for i in range(max(0, n_villages - len(VILLAGE_NAMES)))])
    used_castle_names  = (random.sample(CASTLE_NAMES,  min(n_castles,  len(CASTLE_NAMES)))
                          + [f"Kale-{i}" for i in range(max(0, n_castles - len(CASTLE_NAMES)))])

    for i in range(n_cities):
        k = city_assign[i]
        locations.append(_make_location("şehir", used_city_names[i], k["id"], k["name"]))
    for i in range(n_villages):
        k = village_assign[i]
        locations.append(_make_location("köy", used_village_names[i], k["id"], k["name"]))
    for i in range(n_castles):
        k = castle_assign[i]
        locations.append(_make_location("kale", used_castle_names[i], k["id"], k["name"]))

    # NPC dağılım ağırlıkları: şehir en çok, köy az
    weights = [{"şehir": 5, "kale": 2, "köy": 1}[loc["kind"]] for loc in locations]
    total_w = sum(weights)
    counts = [max(2, round(n_npcs * w / total_w)) for w in weights]
    diff = n_npcs - sum(counts)
    while diff != 0:
        idx = random.randrange(len(counts))
        if diff > 0:
            counts[idx] += 1; diff -= 1
        elif counts[idx] > 2:
            counts[idx] -= 1; diff += 1

    # Krallara, veliahta ve lordlara özel NPC oluştur
    for k in kingdoms:
        capital = next((l for l in locations if l["kingdom_id"] == k["id"] and l["kind"] == "şehir"), None)
        if not capital:
            capital = next(l for l in locations if l["kingdom_id"] == k["id"])
        king = _make_npc(capital, k["id"], k["name"], k["religion"], profession="kral")
        king["age"] = random.randint(40, 65)
        npcs.append(king)
        k["king_id"] = king["id"]
        heir = _make_npc(capital, k["id"], k["name"], k["religion"], profession="veliaht")
        heir["age"] = random.randint(18, 30)
        npcs.append(heir)
        k["heir_id"] = heir["id"]
        # Vezir
        vezir = _make_npc(capital, k["id"], k["name"], k["religion"], profession="vezir")
        vezir["age"] = random.randint(35, 60)
        npcs.append(vezir)
        for castle in [l for l in locations if l["kingdom_id"] == k["id"] and l["kind"] == "kale"]:
            lord = _make_npc(castle, k["id"], k["name"], k["religion"], profession="lord")
            lord["age"] = random.randint(30, 60)
            npcs.append(lord)
            castle["ruler_id"] = lord["id"]

    remaining = n_npcs - len(npcs)
    for i, loc in enumerate(locations):
        k = next(kk for kk in kingdoms if kk["id"] == loc["kingdom_id"])
        already = sum(1 for n in npcs if n["location_id"] == loc["id"])
        share = max(0, counts[i] - already)
        for _ in range(share):
            if remaining <= 0:
                break
            npcs.append(_make_npc(loc, k["id"], k["name"], k["religion"]))
            remaining -= 1
        if remaining <= 0:
            break
    while remaining > 0:
        loc = random.choice(locations)
        k = next(kk for kk in kingdoms if kk["id"] == loc["kingdom_id"])
        npcs.append(_make_npc(loc, k["id"], k["name"], k["religion"]))
        remaining -= 1

    _link_family(npcs)
    _assign_crushes(npcs)
    _assign_npc_relationships(npcs)   # NEW

    from city_governance import make_governance, _find_governor_for_location
    world_partial = {"world": {"kingdoms": kingdoms, "locations": locations, "npcs": npcs}}
    governances = []
    for loc in locations:
        governor_id = _find_governor_for_location(loc, world_partial)
        gov = make_governance(
            location_id=loc["id"],
            kind=loc.get("kind", "köy"),
            kingdom_id=loc.get("kingdom_id"),
            governor_id=governor_id,
        )
        governances.append(gov)

    return {
        "kingdoms":    kingdoms,
        "locations":   locations,
        "npcs":        npcs,
        "governances": governances,
    }


def generate_player(world, name=None, gender=None, surname=None):
    """V3: Player starts at age 7 with weak base stats."""
    gender = gender or random.choice(["erkek", "kadın"])
    given = random.choice(MALE_NAMES if gender == "erkek" else FEMALE_NAMES)
    surname = surname or random.choice(SURNAMES)
    player_name = name or f"{given} {surname}"
    villages = [l for l in world["locations"] if l["kind"] == "köy"]
    location = random.choice(villages) if villages else random.choice(world["locations"])
    kingdom = next(k for k in world["kingdoms"] if k["id"] == location["kingdom_id"])
    mother, father = _make_family_for_player(world, player_name, surname, location, kingdom)
    player = {
        "name": player_name,
        "gender": gender,
        "base_age": 7,
        "age": 7,
        "culture": kingdom["culture"],
        "religion": kingdom["religion"],
        "kingdom_id": kingdom["id"],
        "kingdom_name": kingdom["name"],
        "surname": surname,
        "money": 0,
        "profession": "işsiz",
        "education": "yok",
        "reputation": 0,
        "honor": 0,
        "fear": 0,
        "fame": 0,
        "health": 100,
        "hunger": 100,
        "crime": 0,
        "location_id": location["id"],
        "location_name": location["name"],
        "spouse_id": None,
        "children_ids": [],
        "parent_ids": [mother["id"], father["id"]],
        "inventory": {"ekmek": 2},
        "equipment": {"weapon": None, "head": None, "body": "köylü_giysisi",
                      "hands": None, "legs": None, "feet": None},
        "wanted_in": [],
        "interaction_counts": {},
        "dead": False,
        "stats": {"strength": 1, "intelligence": 1, "charisma": 1, "stamina": 2},
        "stat_xp": {"strength": 0, "intelligence": 0, "charisma": 0, "stamina": 0},
        "skills": {"combat": 0, "trade": 0, "crafting": 0, "social": 0},
        "skill_xp": {"combat": 0, "trade": 0, "crafting": 0, "social": 0},
        "buffs": {},
    }
    return player, mother, father


def _make_family_for_player(world, child_name, surname, location, kingdom):
    mother = _make_npc(location, kingdom["id"], kingdom["name"],
                       kingdom["religion"], profession=random.choice(["çiftçi", "fırıncı", "şifacı"]))
    mother["gender"] = "kadın"
    mother["age"] = random.randint(28, 40)
    mname = random.choice(FEMALE_NAMES)
    mother["name"] = f"{mname} {surname}"
    mother["children_ids"] = ["PLAYER"]
    mother["mood"] = "huzurlu"
    mother["health"] = random.randint(70, 95)
    father = _make_npc(location, kingdom["id"], kingdom["name"],
                       kingdom["religion"], profession=random.choice(["demirci", "çiftçi", "avcı", "marangoz"]))
    father["gender"] = "erkek"
    father["age"] = random.randint(30, 45)
    fname = random.choice(MALE_NAMES)
    father["name"] = f"{fname} {surname}"
    father["children_ids"] = ["PLAYER"]
    father["mood"] = "kararlı"
    father["health"] = random.randint(70, 95)
    mother["spouse_id"] = father["id"]
    father["spouse_id"] = mother["id"]
    world["npcs"].append(mother)
    world["npcs"].append(father)
    return mother, father


def initial_history():
    return [
        {
            "id": new_id(),
            "day": 0,
            "type": "başlangıç",
            "text": "Küllerin Mirası: Yeni bir yolculuk başlıyor. Dünya kendi kaderini yazmaya devam ediyor.",
        }
    ]