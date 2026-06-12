"""NPC Deepening Package V2 — goals ×2.5, activities ×5, secrets, skill_level.

Backwards compatible: every accessor calls `ensure_profile(npc)` first to
lazily migrate old NPCs.
"""
import random


# ═══════════════════════════════════════════════════════════════════════════
# LIFE GOALS  (12 → 30)
# ═══════════════════════════════════════════════════════════════════════════

GOALS = [
    # — Wealth —
    {"key": "zengin_olmak",          "label": "Zengin olmak",                "domain": "wealth"},
    {"key": "borc_odemek",           "label": "Borçlarından kurtulmak",      "domain": "wealth"},
    {"key": "kucuk_isletme",         "label": "Kendi işini kurmak",          "domain": "wealth"},
    {"key": "hazine_bulmak",         "label": "Gizli bir hazine bulmak",     "domain": "wealth"},
    # — Family —
    {"key": "evlenmek",              "label": "Evlenmek",                    "domain": "family"},
    {"key": "cocuk_sahibi",          "label": "Çocuk sahibi olmak",          "domain": "family"},
    {"key": "aileyi_buyutmek",       "label": "Aileyi büyütmek",             "domain": "family"},
    {"key": "soyunu_devam",          "label": "Soyunu devam ettirmek",       "domain": "family"},
    {"key": "ailesini_korumak",      "label": "Ailesini korumak",            "domain": "family"},
    # — Power —
    {"key": "lord_olmak",            "label": "Lord olmak",                  "domain": "power"},
    {"key": "toprak_sahiplenmek",    "label": "Arazi sahibi olmak",          "domain": "power"},
    {"key": "cephe_kurmak",          "label": "Siyasi bir cephe kurmak",     "domain": "power"},
    # — Career —
    {"key": "tuccar_olmak",          "label": "Tüccar olmak",                "domain": "career"},
    {"key": "asker_olmak",           "label": "Asker olmak",                 "domain": "career"},
    {"key": "usta_olmak",            "label": "Sanatında usta olmak",        "domain": "career"},
    {"key": "sifaci_olmak",          "label": "Şifacı olmak",                "domain": "career"},
    {"key": "ticaret_yolu_kurmak",   "label": "Ticaret yolu açmak",          "domain": "career"},
    # — Social —
    {"key": "saygi_kazanmak",        "label": "Saygı kazanmak",              "domain": "social"},
    {"key": "un_kazanmak",           "label": "Ün kazanmak",                 "domain": "social"},
    {"key": "efsane_olmak",          "label": "Efsane olarak anılmak",       "domain": "social"},
    # — Vengeance / Justice —
    {"key": "intikam_almak",         "label": "İntikam almak",               "domain": "vengeance"},
    {"key": "sucsuzlugunu_kanitlamak", "label": "Suçsuzluğunu kanıtlamak",   "domain": "vengeance"},
    # — Personal —
    {"key": "evine_donmek",          "label": "Evine dönmek",                "domain": "personal"},
    {"key": "ozgurluge_kavusmak",    "label": "Özgürlüğe kavuşmak",          "domain": "personal"},
    {"key": "yolculuk_yapmak",       "label": "Dünyayı gezmek",              "domain": "personal"},
    {"key": "korkusunu_yenmek",      "label": "Korkusunu yenmek",            "domain": "personal"},
    {"key": "huzura_kavusmak",       "label": "Huzura kavuşmak",             "domain": "personal"},
    {"key": "sirri_saklamak",        "label": "Sırrını kabrine götürmek",    "domain": "personal"},
    {"key": "kacmak",                "label": "Her şeyden kaçmak",           "domain": "personal"},
    # — Religion —
    {"key": "dini_gorev",            "label": "Dini görevini tamamlamak",    "domain": "religion"},
]

GOAL_BY_KEY = {g["key"]: g for g in GOALS}

GOAL_TALK = {
    "zengin_olmak": [
        "Bir gün cebim altın dolu olacak, herkesin yüzüne bakacağım.",
        "Para her şeyi çözer, bunu öğrendim.",
        "Köyün en zengini olmadan ölmeyeceğim.",
    ],
    "borc_odemek": [
        "Boğazımda bir borç düğümü var, çözemiyorum.",
        "Tefeci kapımı aşındırıyor, bir an önce ödesem...",
        "Geceleyin hesap yaparım, çıkmıyor işte.",
    ],
    "kucuk_isletme": [
        "Küçük bir dükkân açsam, kendim olurdum.",
        "Başkasının emrinde çalışmaktan bıktım.",
        "Sermayem olsa, yarın başlardım.",
    ],
    "hazine_bulmak": [
        "Dedelerim bir harita bırakmış, hâlâ bakıyorum.",
        "Şehir altında ne var, kimse bilmiyor.",
        "Yanlış yerde değil miyim, diye düşünüyorum bazen.",
    ],
    "evlenmek": [
        "İyi bir eş bulsam, hayatım yerine otururdu.",
        "Yalnızlık insanı kemiriyor, bilsen.",
        "Belki sana uygun biri vardır gözünde?",
    ],
    "cocuk_sahibi": [
        "Bir çocuğum olsa, gece uyuyabilirim sanırım.",
        "Soyumun devam etmesi lazım, başka ne var ki?",
    ],
    "aileyi_buyutmek": [
        "Bir oğlumun daha olmasını isterim, kollarım için.",
        "Aile dediğin kalabalık olmalı.",
    ],
    "soyunu_devam": [
        "Soyadımı taşıyacak biri kalmalı arkamda.",
        "Babam çok emek verdi; boşa gitmemeli.",
    ],
    "ailesini_korumak": [
        "Ailem için ne gerekiyorsa yaparım, sorma.",
        "Onları koruyamazsam, başka hiçbir şeyin önemi yok.",
        "Geceleri bir ses duyunca ilk aklıma onlar gelir.",
    ],
    "lord_olmak": [
        "Bu eller bir kale tutacak günü görür inşallah.",
        "Lordluğa giden yol kanlı, ama benim için açık.",
    ],
    "toprak_sahiplenmek": [
        "Bir karış toprak sahibi olmak istiyorum.",
        "Arazi sahibi olan adam bükülmez.",
        "Kiracı kalmak kaderim değil.",
    ],
    "cephe_kurmak": [
        "Tek başıma bir şey değiştirmek zor; birleşmek lazım.",
        "Doğru insanları bir araya getirsem...",
        "Şehirde fısıldaşanları biliyorum, onlara ulaşmam lazım.",
    ],
    "tuccar_olmak": [
        "Bir gün kendi kervanım olacak.",
        "Şimdilik ufak alıp satıyorum, hesabım büyük.",
    ],
    "asker_olmak": [
        "Bir gün lordun sancağı altında savaşacağım.",
        "Bu kollar saban için fazla, kılıç için biçilmiş kaftan.",
    ],
    "usta_olmak": [
        "Sanatımda usta olmadan rahat yüzü göremem.",
        "Eski ustalar gibi anılmak istiyorum.",
    ],
    "sifaci_olmak": [
        "Bitkilerden ilaç yapmayı öğrenmek istiyorum.",
        "Şehrin tek şifacısı hasta; onun yerini almak benim hakkım.",
        "Hayat kurtarabilmek... bundan büyük ne var?",
    ],
    "ticaret_yolu_kurmak": [
        "İki şehri birleştiren bir yol açsam, zengin olurum.",
        "Kervan geçmiyor çünkü kimse riski almıyor — ben alırım.",
        "Dağ yolunu bilen tek adamım; kullanmak lazım.",
    ],
    "saygi_kazanmak": [
        "Adımın anılmasını istiyorum, kötülükle değil.",
        "İnsanların selam vermesi yeter bana.",
    ],
    "un_kazanmak": [
        "Adım duyulmalı, o kadar.",
        "Ün olmadan güç olmaz, güç olmadan her şey geçici.",
        "Şarkıcılar beni söyleseydi ne iyi olurdu.",
    ],
    "efsane_olmak": [
        "Öldükten sonra da konuşulsam yeter.",
        "Tarih yazan insanlar mı, yoksa tarih mi insanları yazar?",
        "Büyük işler yapmadan gitmeyeceğim.",
    ],
    "intikam_almak": [
        "Bir kişi var, onun ölümünü bekliyorum.",
        "İntikam soğuk yenirse daha tatlı derler, doğru.",
    ],
    "sucsuzlugunu_kanitlamak": [
        "Herkes beni suçlu biliyor; ama değilim.",
        "Gerçek ortaya çıkacak, sabır isteyecek sadece.",
        "O gün yaşananları anlayabilecek birine ihtiyacım var.",
    ],
    "evine_donmek": [
        "Doğduğum kasaba uzakta kaldı, bir gün döneceğim.",
        "Bu topraklar yabancı, kalbim hep oraya bakıyor.",
    ],
    "ozgurluge_kavusmak": [
        "Kimsenin emrinde olmadan yaşamak istiyorum.",
        "Zincirler görünmez olabilir; ama zincir.",
        "Bir gün sadece kendim için karar vereceğim.",
    ],
    "yolculuk_yapmak": [
        "Harita üzerindeki yerleri görmek istiyorum.",
        "Gitmediğim bir şehir kalmasa ne iyi olurdu.",
        "Denizi hiç görmedim, bu yanlış.",
    ],
    "korkusunu_yenmek": [
        "Korktuğum şeyin üstüne yürümek lazım.",
        "Bir gün o kapıdan gireceğim.",
        "Korkak diye anılmak istemiyorum.",
    ],
    "huzura_kavusmak": [
        "Sadece huzur istiyorum, başka bir şey değil.",
        "Gece rahat uyumak bile yeterdi.",
        "Kafamdaki sesleri susturmayı öğrenmek istiyorum.",
    ],
    "sirri_saklamak": [
        "Bir şey var, ölümüme kadar söylemeyeceğim.",
        "Bilmek bazen zulüm, bilmemek bazen kurtuluş.",
        "Bazı sırlar mezara gitmeli.",
    ],
    "kacmak": [
        "Bu şehirden, bu insanlardan, hepsinden uzaklaşmak istiyorum.",
        "Bir gün sabah kalkar, kimseye söylemeden giderim.",
        "Başka bir hayat var bir yerlerde.",
    ],
    "dini_gorev": [
        "Kutsal yere varmadan rahat edemeyeceğim.",
        "Tanrı'ma borcum var; ödemeyi erteledim çok.",
        "Bu hayatı bir kerelik hacca giderek tamamlamak istiyorum.",
    ],
}


# ═══════════════════════════════════════════════════════════════════════════
# MOODS
# ═══════════════════════════════════════════════════════════════════════════

MOODS = ["mutlu", "üzgün", "öfkeli", "korkmuş", "umutlu", "stresli", "heyecanlı", "huzurlu"]

MOOD_GREETING = {
    "mutlu":      ["Bugün keyfim yerinde, sözünü esirgeme.", "İçim açık, ne istersen sor."],
    "üzgün":      ["Pek konuşacak halde değilim.", "İçim daralıyor son zamanlarda."],
    "öfkeli":     ["Bugün canımı sıkma.", "Yanlış zamanda geldin."],
    "korkmuş":    ["Sessizce konuş, biri duyabilir.", "Etrafıma bakıyorum, sen de bak."],
    "umutlu":     ["İşler düzelecek gibi, hissediyorum.", "Bu hafta iyi bir habere gebe."],
    "stresli":    ["Aklım bin yerde, kısa kes.", "Üstümde çok yük var şu sıra."],
    "heyecanlı":  ["Söyleyecek çok şeyim var aslında!", "Aklımda bir fikir döner."],
    "huzurlu":    ["Sakin sakin konuşalım.", "İyiyim, şükür."],
}


# ═══════════════════════════════════════════════════════════════════════════
# RECENT EVENTS
# ═══════════════════════════════════════════════════════════════════════════

EVENT_LABELS = {
    "child_born":        "Yeni bir çocuğu oldu",
    "child_lost":        "Çocuğunu kaybetti",
    "spouse_lost":       "Eşini kaybetti",
    "spouse_married":    "Evlendi",
    "lost_money":        "Büyük para kaybetti",
    "earned_money":      "Bol kazanç sağladı",
    "friend_died":       "Yakın bir dostu öldü",
    "moved_house":       "Taşındı",
    "fell_ill":          "Hastalandı",
    "recovered":         "İyileşti",
    "promoted":          "Yükseldi (terfi)",
    "demoted":           "Düştü",
    "robbed":            "Soyuldu",
    "argument":          "Bir komşuyla kavga etti",
    "good_harvest":      "İyi bir hasat kaldırdı",
    "bad_harvest":       "Mahsulü mahvoldu",
    "festival":          "Köyde bir şölen var",
    "rumor_heard":       "Bir söylenti duydu",
    "secret_revealed":   "Sırrı ortaya çıktı",
    "debt_paid":         "Borcunu kapattı",
    "new_rival":         "Yeni bir rakip edinди",
    "skill_improved":    "Sanatında ilerledi",
}

EVENT_MOOD_DELTA = {
    "child_born":       ("mutlu",      +2),
    "child_lost":       ("üzgün",      -4),
    "spouse_lost":      ("üzgün",      -5),
    "spouse_married":   ("mutlu",      +3),
    "lost_money":       ("stresli",    -2),
    "earned_money":     ("mutlu",      +2),
    "friend_died":      ("üzgün",      -3),
    "moved_house":      ("stresli",    -1),
    "fell_ill":         ("üzgün",      -2),
    "recovered":        ("umutlu",     +2),
    "promoted":         ("heyecanlı",  +3),
    "demoted":          ("öfkeli",     -2),
    "robbed":           ("öfkeli",     -3),
    "argument":         ("öfkeli",     -1),
    "good_harvest":     ("mutlu",      +2),
    "bad_harvest":      ("stresli",    -2),
    "festival":         ("heyecanlı",  +2),
    "rumor_heard":      (None,          0),
    "secret_revealed":  ("korkmuş",    -4),
    "debt_paid":        ("huzurlu",    +3),
    "new_rival":        ("öfkeli",     -2),
    "skill_improved":   ("heyecanlı",  +2),
}


# ═══════════════════════════════════════════════════════════════════════════
# SECRETS  (sır sistemi)
# ═══════════════════════════════════════════════════════════════════════════

_SECRETS_BY_PROFESSION = {
    "haydut": [
        "Bir cinayet işledi; kimse bilmiyor.",
        "Asıl adı farklı; yeni bir kimlikle yaşıyor.",
        "Soyduğu paranın bir kısmını yetimhaneye gönderiyor.",
    ],
    "tüccar": [
        "Tartılarını hile ile ayarlıyor.",
        "Rakibini iflas ettirmek için sahte söylenti yaydı.",
        "Vergisinin yarısını saklıyor.",
        "Kaçakçılık yapıyor ama yakalanmamış.",
    ],
    "rahip": [
        "Dini bir şüphe içinde; inancını kaybetmekten korkuyor.",
        "Kilise kasasından küçük miktarlar çalıyor.",
        "Yasak bir aşk yaşadı, sonra terk etti.",
    ],
    "asker": [
        "Savaşta bir müttefiki vurdu; kaza mıydı, kasıt mıydı?",
        "Lordunun emrini yerine getirmedi ve örtbas etti.",
        "Savaş ganimetini başkalarıyla paylaşmadı.",
    ],
    "şifacı": [
        "Birisini yanlışlıkla zehirledi; iyileşti ama sırrı sakladı.",
        "Yasak iksir hazırlayabilir; talebi reddedemiyor.",
        "Birine karşı duyduğu derin nefreti belli etmiyor.",
    ],
    "lord": [
        "Halkından sakladığı vergi gelirleri var.",
        "Eski bir düşmanın torununu sarayında saklıyor.",
        "Taht hakkının şüpheli olduğunu biliyor.",
    ],
    "kral": [
        "Veliahtın gerçek babası değil.",
        "Barış antlaşmasını gizlice ihlal ediyor.",
        "Kendisine komplo kurulduğunu biliyor, bekliyor.",
    ],
    "çiftçi": [
        "Komşusunun tarlasından sınır taşını kaydırdı.",
        "Vergi sayımında ürününü az gösterdi.",
        "Lordun ambarından gece buğday çalıyor.",
    ],
    "DEFAULT": [
        "Başka bir şehirde çocuğu var, hiç görmedi.",
        "Suçsuz yere birini suçladı, pişman ama itiraf edemiyor.",
        "Kaçtığı bir geçmişi var.",
        "Birini seviyor ama söyleyemiyor.",
        "Büyük bir borcunu gizliyor.",
        "Yıllar önce bir hata yaptı; hâlâ peşinden geliyor.",
    ],
}

QUIRK_SECRETS = [
    "Geceleri mum yakarak bir şeyler yazıyor.",
    "Belirli bir sembolle karşılaşınca titrediği görülüyor.",
    "Şehrin dışına tek başına çıkıyor; neden gittiğini söylemiyor.",
    "Elinde eski bir mektup var; kimseye okutmuyor.",
    "Belirli kişilerle aynı ortamda bulunmaktan kaçınıyor.",
]


def generate_secret(npc, rng):
    """Return a secret string for this NPC based on profession."""
    prof = npc.get("profession", "DEFAULT")
    pool = _SECRETS_BY_PROFESSION.get(prof, _SECRETS_BY_PROFESSION["DEFAULT"])
    pool = pool + _SECRETS_BY_PROFESSION["DEFAULT"]  # always pad with generics
    return rng.choice(pool)


# ═══════════════════════════════════════════════════════════════════════════
# ACTIVITIES  (original ~50 + expanded ~60 = ~110 total)
# ═══════════════════════════════════════════════════════════════════════════

ACTIVITIES_BY_PROFESSION = {
    "çiftçi": [
        "tarlada çalıştı", "saban onardı", "sebze dikti", "değirmene gitti",
        "tohum ayıkladı", "çitle uğraştı", "sulama kanalını açtı",
        "komşuyla ekin biçti", "kuyudan su çekti", "ot yaktı",
        "mahsulü ambara taşıdı", "hayvanları güttü", "çiftliği temizledi",
    ],
    "fırıncı": [
        "ekmek pişirdi", "un aldı", "fırını tamir etti",
        "şeker ekmeği denedi", "sabah erken hamur yoğurdu",
        "ocak temizledi", "un çuvalı taşıdı", "pazar için börek yaptı",
    ],
    "demirci": [
        "nal dövdü", "kılıç biledi", "kömür biriktirdi",
        "sabanı yeniden dövdü", "körüğü tamir etti", "kilit yaptı",
        "zırh halkası işledi", "müşteri için bıçak yaptı",
        "ocağı sıfırdan yaktı", "çivi döktü", "kazma yaptı",
    ],
    "marangoz": [
        "odun yarmaya gitti", "sandık yaptı", "kapı tamir etti",
        "çatı kirişi biçti", "tahta zımparaladı", "araba tekerleği onardı",
        "masa sıfırladı", "duba yaptı", "mobilya boyladı",
    ],
    "avcı": [
        "ormanda dolaştı", "tuzak kurdu", "geyik avladı",
        "yay kirişini değiştirdi", "deri işledi", "iz sürdü",
        "gece beklemesi yaptı", "kuş tüyü topladı", "balık tuttu",
        "yavru hayvan buldu, serbest bıraktı",
    ],
    "balıkçı": [
        "ağ attı", "tekneyi onardı", "balık tuzlamaya başladı",
        "olta dizdi", "balık satmak için pazara gitti",
        "tekneyi yağladı", "fırtınada rıhtımda bekledi",
        "yeni ağ ördü", "derin sulara açıldı",
    ],
    "tüccar": [
        "pazara gitti", "kervan sahibiyle pazarlık etti", "yeni ürün getirdi",
        "fiyatları not etti", "tartı ayarladı", "depoyu saydı",
        "uzak şehirden yük bekledi", "müşteriye kredi verdi",
        "rekabetçinin malını inceledi", "senet düzenledi",
    ],
    "sarraf": [
        "altın tartı yaptı", "sikke saflığını test etti",
        "kasa kilidi kontrol etti", "borç defteri güncelledi",
        "faiz hesapladı", "müşteriyle tartıştı",
        "değerli taş değerlendirdi",
    ],
    "asker": [
        "nöbet tuttu", "antrenman yaptı", "lordun adına yola çıktı",
        "kışlanın temizliğini yaptı", "silah bakımı yaptı",
        "yeni erlerle egzersiz yaptı", "süvari tatbikatına katıldı",
        "devriye gezdi", "kışlada ateş başında oturdu",
        "taktik tartışmasına girdi",
    ],
    "haydut": [
        "yol kesti", "saklandı", "ganimet sayışı yaptı",
        "mağarayı süpürdü", "sahte belge hazırladı",
        "yeni bir çıkış yolu keşfetti", "ihbar endişesiyle yer değiştirdi",
        "ortakları ile kavga etti",
    ],
    "kral": [
        "kabul gününe katıldı", "lordlarla görüştü", "vergiyi denetledi",
        "elçi aldı", "savaş konseyi topladı",
        "hazinesi için rapor dinledi", "şikâyeti bizzat dinledi",
        "saray şölenine hazırlandı",
    ],
    "lord": [
        "şölen verdi", "köylüleri dinledi", "askerlerini denetledi",
        "vergi topladı", "kale duvarlarını gezdi",
        "komşu lordla müzakere etti", "dedikodu dinledi",
        "mahkeme kurdu, dava gördü",
    ],
    "vezir": [
        "krala rapor sundu", "elçiyle gizli görüştü",
        "saray harcamalarını denetledi", "entrika örmeye çalıştı",
        "veliahtı eğitti", "taht odası hazırlıklarını yaptı",
    ],
    "veliaht": [
        "ata bindi", "kılıç dersine girdi", "vezirden strateji öğrendi",
        "sarayda sıkıldı", "küçük kardeşiyle tartıştı",
        "şehirde gizlice dolaştı",
    ],
    "rahip": [
        "dua etti", "vaaz hazırladı", "fakire yardım etti",
        "kutsal metni kopyaladı", "cenaze töreni yönetti",
        "tapınağı süpürdü", "oruç tuttu",
        "dilenci kovdu, sonra pişman oldu",
    ],
    "şifacı": [
        "hastaları gezdi", "ot topladı", "merhem hazırladı",
        "iksir denemesi yaptı", "ateşli hastayı izledi",
        "acemi çırağı eğitti", "hasadını kurutmaya astı",
        "nadir bir bitki için ormana girdi",
    ],
    "eczacı": [
        "ilaç tarifi yazdı", "bitkileri kuruttu",
        "taze malzeme sipariş etti", "zehir panzehiri hazırladı",
        "karışık bitkilerden usul aradı",
    ],
    "seyyar_satıcı": [
        "çarşıda bağırdı", "yük eşeğini yükledi",
        "şehir kapısında bekçiyle tartıştı", "küçük hile denedi",
        "akşam sayım yaptı", "yeni şehre yollandı",
    ],
    "kervancı": [
        "güzergâhı belirledi", "eşekleri saydı",
        "yük kontrolü yaptı", "muhafız tuttu",
        "han sahibiyle fiyat tartıştı", "yolu keşfetti",
    ],
    "katip": [
        "belge yazdı", "vergi kaydını güncelledi",
        "haritayı kopyaladı", "okuma yazma öğretti",
        "mühür baskıladı", "saray arşivini düzenledi",
    ],
    "köy_muhtarı": [
        "anlaşmazlık çözdü", "vergi hesapladı",
        "köy toplantısı yaptı", "şikâyeti lord'a iletti",
        "komşu köyle sınır tartıştı",
    ],
    "müzisyen": [
        "bir lordun şenliğinde çaldı", "pazar meydanında şarkı söyledi",
        "yeni beste denedi", "sazını akort etti",
        "eski ustanın şarkısını öğrendi", "para yerine ekmek aldı",
    ],
    "cambaz": [
        "pazar alanında gösteri yaptı", "yeni numara öğrendi",
        "çadırı kurdu", "artistle kavga etti",
    ],
    "hikâyeci": [
        "ateş başında masal anlattı", "yeni hikâye derledi",
        "çocukları hayran bıraktı", "lordun konuğu oldu",
        "tarihî olayı dramatize etti",
    ],
    "berber": [
        "saç traşı yaptı", "sakalı düzeltti",
        "sülük uyguladı", "yarayı sardı", "dedikodu dinledi",
        "makasını biledi",
    ],
    "çoban": [
        "sürüsünü otlattı", "kurdun izini takip etti",
        "kayıp kuzuyu aradı", "kırda mola verdi",
        "kaval çaldı", "dağda uyudu",
    ],
    "kuyumcu": [
        "altın eritti", "yüzük işledi",
        "müşterinin taşını değerlendirdi", "kalıbı temizledi",
        "değerli taş tarttı", "sahte altını ayırt etti",
    ],
    "kunduracı": [
        "deri kesti", "ayakkabı dikti",
        "çizme tamir etti", "müşteri ölçüsü aldı",
        "malzeme aldı", "eski kalıbı bozdu",
    ],
    "çömlekçi": [
        "kil yoğurdu", "çark döndürdü", "sırlama yaptı",
        "pişirme fırınını ateşledi", "kırık parçayı onardı",
    ],
    "dokumacı": [
        "tezgah kurdu", "iplik büktü", "desen çizdi",
        "kumaş boyladı", "sipariş teslim etti",
    ],
    "kasap": [
        "hayvan kesti", "et parçaladı", "tuzlamaya koydu",
        "pazara teşhir etti", "kemiği kemirdi",
    ],
    "cellat": [
        "infaz hazırlığı yaptı", "mahkûmu bekledi",
        "alet biledi", "kimseyle konuşmadı",
    ],
    "falcı": [
        "falcıya danışan oldu", "kartlarını düzenledi",
        "ritüel hazırladı", "müşterinin geleceğini anlattı",
        "yanılıp özür dilemedi",
    ],
}

GENERIC_ACTIVITIES = [
    "komşusuyla konuştu", "dinlendi", "ailesiyle vakit geçirdi",
    "pazara çıktı", "hava aldı", "iş aletini onardı",
    "çarşıda bir şeyler aldı", "çocuklarla oynadı",
    "yaşlı bir komşuya yardım etti", "kapı önünde oturdu",
    "şehir kapısında adamları izledi", "kahve içmek için durdu",
    "kötü habere üzüldü", "eski bir arkadaşla karşılaştı",
    "mektup yazdı ama göndermedi",
]

LIFE_EVENTS_WEEKLY = [
    "festival", "argument", "good_harvest", "bad_harvest",
    "earned_money", "lost_money", "rumor_heard", "fell_ill", "recovered",
    "skill_improved", "debt_paid", "new_rival",
]

# ─── Skill level display ────────────────────────────────────────────────────
SKILL_LEVEL_LABELS = {
    1: "Çırak",
    2: "Acemi",
    3: "Deneyimli",
    4: "Usta",
    5: "Üstat",
}


def skill_level_label(npc):
    return SKILL_LEVEL_LABELS.get(npc.get("skill_level", 1), "Bilinmiyor")


# ═══════════════════════════════════════════════════════════════════════════
# PROFILE BOOTSTRAP
# ═══════════════════════════════════════════════════════════════════════════

def ensure_profile(npc):
    """Lazily attach deep profile fields to a stock NPC."""
    if npc.get("_profile_v2"):
        return
    rng = random.Random(hash(npc["id"]) & 0xFFFFFFFF)

    # ── Goals ──
    if "goal" not in npc or npc["goal"] not in GOAL_BY_KEY:
        if isinstance(npc.get("goal"), str) and npc["goal"] not in GOAL_BY_KEY:
            npc["_legacy_goal"] = npc["goal"]
        npc["goal"] = _pick_goal_for_npc(npc, rng)
    npc.setdefault("goal_progress", rng.randint(5, 60))
    npc.setdefault("goal_history", [])

    # ── Mood ──
    if "current_mood" not in npc:
        existing = npc.get("mood")
        if existing in MOODS:
            npc["current_mood"] = existing
        else:
            mapping = {
                "huzurlu": "huzurlu", "kararlı": "umutlu", "öfkeli": "öfkeli",
                "umutsuz": "üzgün",   "yorgun":  "stresli", "neşeli": "mutlu",
                "korkak":  "korkmuş", "merhametli": "huzurlu",
            }
            npc["current_mood"] = mapping.get(existing, rng.choice(MOODS))
    npc.setdefault("mood_score", 0)

    # ── Memory / events ──
    npc.setdefault("recent_events",   [])
    npc.setdefault("personal_memory", [])
    npc.setdefault("daily_log",       [])
    npc.setdefault("debt",   rng.choice([0, 0, 0, rng.randint(20, 200)]))
    npc.setdefault("savings", rng.randint(5, 60))

    # ── Secrets (v2 new) ──
    if not npc.get("secrets"):
        # ~40% of NPCs have 1 secret; ~10% have 2
        n_secrets = rng.choices([0, 1, 2], weights=[50, 40, 10])[0]
        npc["secrets"] = [generate_secret(npc, rng) for _ in range(n_secrets)]

    # ── Skill level (v2 new) — if not set by world_gen ──
    if "skill_level" not in npc:
        sl = rng.choices([1, 2, 3, 4, 5], weights=[20, 30, 30, 15, 5])[0]
        if npc.get("age", 25) > 50:
            sl = min(5, sl + 1)
        npc["skill_level"] = sl

    npc["_profile_v2"] = True


def _pick_goal_for_npc(npc, rng):
    prof  = npc.get("profession", "köylü")
    age   = npc.get("age", 25)
    has_spouse    = bool(npc.get("spouse_id"))
    has_children  = bool(npc.get("children_ids"))

    if prof in ("haydut",):
        return rng.choices(
            ["intikam_almak", "zengin_olmak", "ozgurluge_kavusmak", "kacmak"],
            weights=[3, 4, 2, 1])[0]
    if prof in ("kral",):
        return rng.choices(
            ["soyunu_devam", "un_kazanmak", "cephe_kurmak"],
            weights=[3, 2, 2])[0]
    if prof in ("lord",):
        return rng.choices(
            ["toprak_sahiplenmek", "saygi_kazanmak", "aileyi_buyutmek"],
            weights=[3, 3, 1])[0]
    if prof in ("asker", "şövalye", "general"):
        return rng.choices(
            ["asker_olmak", "saygi_kazanmak", "evlenmek", "un_kazanmak"],
            weights=[2, 3, 3, 1])[0]
    if prof in ("tüccar", "seyyar_satıcı", "kervancı"):
        return rng.choices(
            ["zengin_olmak", "tuccar_olmak", "borc_odemek", "ticaret_yolu_kurmak"],
            weights=[4, 3, 2, 1])[0]
    if prof in ("demirci", "marangoz", "kunduracı", "çömlekçi", "dokumacı", "kuyumcu"):
        return rng.choices(
            ["usta_olmak", "kucuk_isletme", "zengin_olmak", "evlenmek"],
            weights=[4, 2, 2, 2])[0]
    if prof in ("şifacı", "eczacı"):
        return rng.choices(
            ["sifaci_olmak", "usta_olmak", "saygi_kazanmak"],
            weights=[4, 3, 2])[0]
    if prof in ("rahip", "falcı"):
        return rng.choices(
            ["dini_gorev", "huzura_kavusmak", "sirri_saklamak"],
            weights=[4, 3, 2])[0]
    if prof in ("müzisyen", "hikâyeci", "cambaz"):
        return rng.choices(
            ["un_kazanmak", "efsane_olmak", "yolculuk_yapmak"],
            weights=[4, 2, 3])[0]
    if prof in ("haydut", "cellat"):
        return rng.choices(
            ["kacmak", "ozgurluge_kavusmak", "borc_odemek"],
            weights=[3, 3, 2])[0]
    # Age-based fallback
    if age < 22:
        return rng.choice(["evlenmek", "zengin_olmak", "asker_olmak", "yolculuk_yapmak"])
    if not has_spouse:
        return rng.choice(["evlenmek", "zengin_olmak", "saygi_kazanmak"])
    if not has_children:
        return "cocuk_sahibi"
    return rng.choice(["aileyi_buyutmek", "saygi_kazanmak", "zengin_olmak", "borc_odemek"])


# ═══════════════════════════════════════════════════════════════════════════
# EVENT HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def push_recent_event(npc, etype, day, extra=""):
    ensure_profile(npc)
    label = EVENT_LABELS.get(etype, etype)
    text  = f"{label}{(' — ' + extra) if extra else ''}"
    npc["recent_events"].append({"day": day, "type": etype, "text": text})
    if len(npc["recent_events"]) > 10:
        npc["recent_events"] = npc["recent_events"][-10:]
    mood, delta = EVENT_MOOD_DELTA.get(etype, (None, 0))
    if mood:
        npc["mood_score"] = max(-10, min(10, npc.get("mood_score", 0) + delta))
        if abs(delta) >= 3 or random.random() < 0.5:
            npc["current_mood"] = mood


def push_personal_memory(npc, line, tur=None, hafta=0, yuk=None, taniklar=None):
    """Düz hafıza satırı + (tur verilirse) S2 yapısal anı.

    Eski çağrılar (sadece line) aynen çalışır; tur geçen çağrılar
    npc["anilar"]'a duygu yüklü, unutma hızlı, tanıklı anı nesnesi ekler.
    """
    ensure_profile(npc)
    npc["personal_memory"].append(line)
    if len(npc["personal_memory"]) > 12:
        npc["personal_memory"] = npc["personal_memory"][-12:]
    if tur:
        try:
            from npc_mind import add_memory
            add_memory(npc, tur, hafta, yuk=yuk, taniklar=taniklar, detay=line)
        except Exception:
            pass


def recompute_mood(npc):
    ensure_profile(npc)
    score = npc.get("mood_score", 0)
    if npc.get("health", 100) < 25:
        npc["current_mood"] = "üzgün"; return
    if score >= 5:
        npc["current_mood"] = "mutlu"
    elif score <= -5:
        npc["current_mood"] = "üzgün"
    elif score <= -2:
        if "öfkeli" in npc.get("personality", []):
            npc["current_mood"] = "öfkeli"
        else:
            npc["current_mood"] = "stresli"
    elif score >= 2:
        npc["current_mood"] = "umutlu"
    npc["mood_score"] = score - 1 if score > 0 else (score + 1 if score < 0 else 0)


# ═══════════════════════════════════════════════════════════════════════════
# WEEKLY TICK
# ═══════════════════════════════════════════════════════════════════════════

def npc_weekly_tick(npc, state, rng):
    """Each week: pick an activity; small chance of life event; mood drifts."""
    ensure_profile(npc)
    if not npc.get("alive", True):
        return
    pool = (ACTIVITIES_BY_PROFESSION.get(npc["profession"], GENERIC_ACTIVITIES)
            + GENERIC_ACTIVITIES)
    act = rng.choice(pool)
    npc["daily_log"].append({"day": state["turn"], "text": act})
    if len(npc["daily_log"]) > 8:
        npc["daily_log"] = npc["daily_log"][-8:]

    # Life event (~10%)
    if rng.random() < 0.10:
        et = rng.choice(LIFE_EVENTS_WEEKLY)
        if et == "good_harvest"  and npc["profession"] != "çiftçi": et = "earned_money"
        if et == "bad_harvest"   and npc["profession"] != "çiftçi": et = "lost_money"
        if et == "skill_improved":
            if rng.random() < 0.3:
                npc["skill_level"] = min(5, npc.get("skill_level", 1) + 1)
            push_recent_event(npc, et, state["turn"])
        elif et == "earned_money":
            gain = rng.randint(5, 50)
            npc["savings"] = npc.get("savings", 0) + gain
            push_recent_event(npc, et, state["turn"], f"+{gain} altın")
        elif et == "lost_money":
            loss = rng.randint(5, 50)
            npc["savings"] = max(0, npc.get("savings", 0) - loss)
            push_recent_event(npc, et, state["turn"], f"-{loss} altın")
        elif et == "debt_paid":
            npc["debt"] = 0
            push_recent_event(npc, et, state["turn"])
        else:
            push_recent_event(npc, et, state["turn"])

    # Goal progress — amaçlar kendi başına ilerler (S2)
    if rng.random() < 0.18:
        npc["goal_progress"] = min(100, npc.get("goal_progress", 0) + rng.randint(1, 4))
        if npc["goal_progress"] >= 100:
            push_recent_event(npc, "promoted", state["turn"], "Hedefe ulaştı")
            npc["goal_history"].append(npc["goal"])
            npc["goal"] = _pick_goal_for_npc(npc, rng)
            npc["goal_progress"] = 0
            npc.pop("amac_yardim_edildi", None)
            # S2 tohumu: amacına oyuncu sayesinde ulaşan NPC borcunu öder
            if npc.pop("owes_player", None):
                player = state.get("player", {})
                pay = rng.randint(15, 40)
                npc["savings"] = max(0, npc.get("savings", 0) - pay // 2)
                player["money"] = round(player.get("money", 0) + pay, 1)
                push_personal_memory(
                    npc, f"{player.get('name', 'Velinimetim')}'e borcumu ödedim",
                    tur="soz_tutma", hafta=state["turn"])
                try:
                    from simulation import _push_event
                    _push_event(state, state["turn"], "vefa",
                                f"{npc['name']} amacına ulaştı ve eski iyiliğini "
                                f"unutmadı: sana {pay} altın gönderdi.",
                                scope="kişisel")
                except Exception:
                    pass

    # S2: anılar haftalık sönümlenir — travmalar asla
    try:
        from npc_mind import decay_memories
        decay_memories(npc)
    except Exception:
        pass

    recompute_mood(npc)


# ═══════════════════════════════════════════════════════════════════════════
# DIALOGUE HELPERS
# ═══════════════════════════════════════════════════════════════════════════

def latest_event_line(npc):
    ensure_profile(npc)
    if not npc["recent_events"]:
        return ""
    e  = npc["recent_events"][-1]
    et = e["type"]
    lines = {
        "child_born":      "Geçenlerde bir çocuğum oldu, gözümün bebeği.",
        "child_lost":      "Çocuğumu kaybettim, içim kor.",
        "spouse_lost":     "Eşim öldü, ben de yarım kaldım.",
        "spouse_married":  "Yeni evlendim, hayatım baştan başladı.",
        "lost_money":      "Cebim yandı bu hafta, deme gitsin.",
        "earned_money":    "Bu hafta ekstra kazandım, biraz nefes aldım.",
        "friend_died":     "Bir dostumu daha toprağa verdik.",
        "moved_house":     "Taşındım, eşyalar hâlâ yerli yerinde değil.",
        "fell_ill":        "Hastalandım, ayağa kalkmam zor oldu.",
        "recovered":       "İyileştim çok şükür, ölümü gördüm.",
        "promoted":        "Bir yükseliş aldım, kıymetimi anladılar.",
        "demoted":         "İşimde geri düştüm, içim acı.",
        "robbed":          "Soyuldum geçen hafta, hâlâ aklımda.",
        "good_harvest":    "Bu yıl tarlam güldü, neşeliyim.",
        "bad_harvest":     "Bu yıl tarlam yandı, kara kara düşünüyorum.",
        "festival":        "Köyde şölen var, mutlu insanlar görmek iyi geliyor.",
        "argument":        "Komşuyla kapıştık, ağzımda hâlâ acı.",
        "rumor_heard":     "Garip söylentiler dolaşıyor, duydun mu?",
        "skill_improved":  "Son zamanlarda işimde çok gelişim kaydettim.",
        "debt_paid":       "Borcumu kapattım nihayet; derin nefes aldım.",
        "new_rival":       "Biriyle aramız açıldı, dikkatli olmam lazım.",
        "secret_revealed": "Söylememem gereken bir şey ortaya çıktı...",
    }
    return lines.get(et, e.get("text", ""))


def goal_line(npc):
    ensure_profile(npc)
    pool = GOAL_TALK.get(npc["goal"], [])
    if not pool:
        return ""
    rng = random.Random(npc["id"][:6] + npc["goal"])
    return rng.choice(pool)


def mood_greeting(npc):
    ensure_profile(npc)
    pool = MOOD_GREETING.get(npc["current_mood"], [])
    if not pool:
        return ""
    return random.choice(pool)


def personal_memory_line(npc, player_name):
    ensure_profile(npc)
    mem = npc["personal_memory"]
    if not mem:
        return ""
    return f"({mem[-1]})"


def secret_hint(npc, player_reputation=0):
    """Return a vague hint about the NPC's secret if player has high enough rep."""
    ensure_profile(npc)
    secrets = npc.get("secrets", [])
    if not secrets:
        return ""
    if player_reputation < 40:
        return ""
    return f"(Fısıltı: {secrets[0][:60]}...)" if len(secrets[0]) > 60 else f"(Fısıltı: {secrets[0]})"
