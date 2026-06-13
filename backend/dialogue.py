"""Memory-aware, role-sensitive, contextual dialogue generator — v2.

Her cevap şu katmanlardan oluşur:
  1. Temel cevap (topic handler) — genişletilmiş poollar
  2. Bağlam enjeksiyonu (_build_context) — NPC aktivite, borç, mevsim
  3. Hafıza geri dönüşü (_memory_callback) — önceki konuşmayı referanslar
  4. NPC inisiyatifi (_spontaneous_line) — NPC kendi gündemini açar
  5. Oyuncu farkındalığı (_player_aware_flavor) — meslek/itibar tepkisi
"""
import random
import hashlib
import re
from npc_profile import (
    ensure_profile, latest_event_line, goal_line, mood_greeting,
    MOOD_GREETING, GOAL_TALK, GOAL_BY_KEY,
)
from rumors import rumor_for_npc
from social_reputation import npc_reaction_flavor, lord_will_receive

REL_BANDS = [
    (-101, -50, "düşman"),
    (-50, -20, "rakip"),
    (-20, 20, "nötr"),
    (20, 50, "arkadaş"),
    (50, 101, "dost"),
]

def relation_band(score: int) -> str:
    for lo, hi, name in REL_BANDS:
        if lo <= score < hi:
            return name
    return "nötr"

SOCIAL_STATUS = {
    "kral": 5, "veliaht": 5, "lord": 4, "general": 4,
    "şövalye": 3, "asker": 3,
    "tüccar": 2, "şifacı": 2, "rahip": 2, "katip": 2, "öğretmen": 2,
    "demirci": 2, "marangoz": 2, "kunduracı": 2, "han sahibi": 2,
    "çiftçi": 1, "çoban": 1, "fırıncı": 1, "balıkçı": 1,
    "avcı": 1, "değirmenci": 1, "köylü": 1, "haydut": 0,
    "çocuk": 1,
}

def player_status(player):
    return SOCIAL_STATUS.get(player.get("profession", "köylü"), 1)

def npc_status(npc):
    return SOCIAL_STATUS.get(npc["profession"], 1)

# ─────────────────────────────────────────────
#  KATMAN 1: Genişletilmiş Statik Poollar
# ─────────────────────────────────────────────

GREETING_BY_BAND = {
    "dost": [
        "Yine yollarımız kesişti, {pname}!",
        "Seni gördüğüme sevindim dostum.",
        "İçim ferahladı seninle, otur otur.",
        "{pname}! Tam da senden bahsediyordum.",
        "Hoş geldin, sofram da sözüm de açık.",
        "Gözlerim aradı seni bugün, hayırlısı.",
        "Yüzünü görmek iyi geldi, nasılsın?",
        "{pname}, seninle konuşmak yorgunluk almak gibi.",
        "Gel buraya, çok işim var ama sana zaman var.",
        "Yine güzel bir gün seni görmek iyi yaptı.",
        "Seninle her sohbet değerlidir, hoş geldin.",
        "Tam zamanında geldin, biraz dertleşelim.",
    ],
    "arkadaş": [
        "Selam {pname}, vakit ayırdığın iyi oldu.",
        "Ah, senmişsin. Nasılsın bakalım?",
        "Yine merhaba. İşler nasıl?",
        "Geldiğin iyi oldu, kafam dağınıktı.",
        "Seni bir süredir görmemiştim, hayırlısı.",
        "Merhaba. Bugün nereye?",
        "Yolun buradan mı geçiyor, hoş geldin.",
        "Ne var ne yok, anlat bakalım.",
        "Selamün aleyküm. Bir derdin var mı?",
        "İyisin umarım, gel konuşalım.",
    ],
    "nötr": [
        "Ne istersin?",
        "Selam yabancı. Lafa tutma uzun, işim var.",
        "Bir derdin mi var?",
        "Konuş bakalım.",
        "Acelen yoksa konuşalım.",
        "Ne arıyorsun burda?",
        "Sözünü söyle, vaktim az.",
        "Evet, ne istiyorsun?",
        "Dur bakayım, ne var?",
        "Selamlar. Kısa tut.",
    ],
    "rakip": [
        "Yine sen mi? Hayrola.",
        "Acele et, vaktim sana ayrılmaz.",
        "Konuş ve git.",
        "Ne arıyorsun burada hâlâ?",
        "Sen misin gelen? Olur, ne var?",
        "Niye yine geldin anlamıyorum.",
        "Peki, ne istiyorsun bu sefer?",
        "Dur, söyle de bitirelim.",
    ],
    "düşman": [
        "Defol gözümün önünden!",
        "Seninle bir lafım olamaz.",
        "Bir adım daha at, göreceğin var.",
        "Yüzünü görmek bile öfke veriyor bana.",
        "Git buradan, hemen.",
        "Seninle kelam etmem.",
        "Çek git diyorum.",
        "Yokluğun iyilikti, gene geldin.",
    ],
}

KING_REJECT = [
    "Sen kim oluyorsun da huzuruma çıkıyorsun? Geri çekil.",
    "Bir köylüyle laflanmaz. Muhafızlar nerede?",
    "İtibarın yetersiz. Saraya yakışmıyorsun.",
    "Sana kelam edecek değilim.",
    "Bu saray sana açık değil, git.",
]

SOLDIER_THREAT = [
    "Suç defterin kabarık. Bir yanlış adımda demir vururum.",
    "Seni izliyorum. Lordumun emrindeyim, sakın kayıpta görünme.",
    "Yarım altın bile çalsan, kelle uçar duymadım deme.",
    "Lordumuz seni gözetliyor. Dikkatli ol.",
]

MERCHANT_PRICE_TALK = {
    "scarce": [
        "Mal kalmadı dostum, hepsini krallık aldı götürdü.",
        "Ne istersen pahalı bu sıralar, gelen yok giden çok.",
        "Sandığım bomboş, fırsatçı değilim ama yüksek satarım.",
        "Stok tükenmiş, bir süre bekle ya da yüksek fiyat ver.",
        "Talep var ama mal yok, piyasa böyle döner bazen.",
    ],
    "abundant": [
        "Bol bol var şimdilik, indirim yaparım sana.",
        "Sandıklar dolu, alıcı bulamıyorum bir türlü.",
        "Bu fiyatlar düşmeden alırsan bana iyilik edersin.",
        "Bolluğun tadını çıkar, her zaman böyle olmaz.",
        "Mal var, para yok — al götür uygun fiyata.",
    ],
    "normal": [
        "Fiyatlar şu sıralar oturmuş gibi.",
        "Pazarlığa açığım, gel görüşelim.",
        "Vasat gidiyor piyasa, ne alırsan makul.",
        "Standart fiyatlar geçerli, bak beğen.",
    ],
}

LORD_FORMAL = [
    "{pname}, ne meselen var? Kısa kes, lordun başka işleri de var.",
    "Sözünü tart, ben buranın efendisiyim.",
    "Vergini ödedin mi? Önce o sonra muhabbet.",
    "Yaklaş ama çabuk ol, zamanım kıymetli.",
    "Ne getirdin, ne istiyorsun? Söyle.",
]

PROFESSION_TALK = {
    "çiftçi": [
        "Bu mevsim hasat zor, yağmur ya çok ya az.",
        "Buğday yine ucuza gidiyor.",
        "Tarladan tarlaya koşturmaktan belim ağrıyor.",
        "Bir öküzüm var, ondan başka dostum yok.",
        "Bu toprak benden önce de vardı, benden sonra da olacak.",
        "Bir saban bozulsa işin durur, elimde olmadan.",
        "Hasat zamanı gelince köy değişiyor, görsen inanmazsın.",
        "Komşunun tarlası bereketli, benimki mücadele veriyor.",
        "Tohum atmak kolay, beklemek zor.",
        "Toprak ne verirse şükür, ne vermezse de devam.",
        "Sabah olur, tarlaya giderim; akşam olur, sırtım ağrır. Böyle.",
    ],
    "demirci": [
        "Demir pahalı, ocak söndüyse iş bitti.",
        "Bir kılıç dövüyorum, savaş yakındır derler.",
        "Çekiç sesinden başka müzik duymadım hayatımda.",
        "Ocak yanar, ben de yanarım yanında.",
        "İyi bir demir bulmak artık çok zor.",
        "Nal dövmek kolay iş; asıl kılıç işi sabır ister.",
        "Ellerim sertleşmiş yıllar içinde, ama iş biter.",
        "Bu dünyada iyi demir kim dövdüyse, saygı hak etmiş.",
        "Körüğü kim çekerse çeksin, ateş söndürülmez.",
        "Bir müşteri geldi bugün, istediği mümkün değil. Ama denerim.",
    ],
    "tüccar": [
        "Yollar tehlikeli ama kar var. Dikkatli olmak lazım.",
        "Doğuda kumaş ucuz, batıda altın gibi.",
        "Birkaç at daha alsam kervanım büyür.",
        "Alım satım sabır ister, acele eden zararlı çıkar.",
        "Bugün piyasayı kokladım, iyi satış var gibi.",
        "Güven olmadan ticaret olmaz, bunu iyi biliyorum.",
        "Bir kervan kaybettim geçen ay, hâlâ toparlanamadım.",
        "Vergi artınca kâr azalır, hesap böyle.",
        "Yeni bir ticaret yolu keşfedilse zengin olunur.",
        "Şehirde alıp köyde satmak, köyde alıp şehirde satmak — işin özü bu.",
        "Paranın kokusu her tarafta aynı, ama insan farklı.",
    ],
    "asker": [
        "Lordumuz ne derse o, biz emir kuluyuz.",
        "Sınırda hareketlilik var, hazır olun derler.",
        "Çadır yatıyoruz haftalardır, kemiklerim sızlıyor.",
        "Kılıç her zaman konuşmaz ama hazır olmalı.",
        "Lordun emri gelince yola çıkarız, ne diyeyim.",
        "Savaş meydanında uzun duran ölür; hızlı olan kurtarır.",
        "Bu işin bedeli ağır bazen, ama askerlik böyle.",
        "Uzun süredir cephede değilim, kafam bir yerde.",
        "Zırh bakımı bitmez, kılıç bilemek de öyle.",
        "Gece nöbetlerinde düşünürsün işte, hayatın anlamı falan.",
    ],
    "avcı": [
        "Ormanlar tekin değil, kurtlar arttı.",
        "Bir ayı izi sürüyorum, eşlik eder misin?",
        "Geyik etini iyi tütsülerim, satayım istersen.",
        "Tuzak kurmak sabır ister, ama biter.",
        "Ormanda sesler var bu sıralar, normal değil.",
        "Avlanmak bir sanattır; güç değil sabır gerekir.",
        "Geçen ay kocaman bir geyik kestim, eti yetti.",
        "Kurt izleri gördüm yakında, dikkat lazım.",
        "Ormanda yalnız olmak bazen iyi geliyor, bazen değil.",
        "Hava bozuksa av olmaz. Bugün gibi.",
    ],
    "haydut": [
        "Keseni bırak, gitmene izin vereyim. Şaka şaka.",
        "Doğru kaleyi bilirsen sığınak hazır.",
        "Yol kesmek kolay, paylaşmak zor.",
        "Bu işte güven önemli — yanlış adamla çalışırsan biter.",
        "Lordun askerleri yakında dolaşıyor, dikkatli ol.",
        "Ganimetin yarısını ortağım alıyor, haksızlık.",
        "Yollar boş olunca iş durur, beklemek var.",
        "Dağda yaşamak özgürlük mü? Bazen öyle, bazen değil.",
        "Bir defa lordun eline geçsen, işin biter.",
        "Bu hayatı seçmedim aslında. Ama başka yol kalmadı.",
    ],
    "rahip": [
        "Tanrılar bizi sınıyor, sabır gerek.",
        "Bu kül kokusu bir alâmet, dikkat et.",
        "Dua etmediğin gün heba olmuş gündür.",
        "İnsan neye inanırsa ona benzer.",
        "Kilisede dua edenlerin yüzü aydınlık, görürsün.",
        "Günahın ağırlığı omuzlarda hissedilir, itirafla hafifler.",
        "Bu ay fakire yardım ettim. Tanrı razıdır inşallah.",
        "Vaaz hazırlamak zor. İnsanlara ne söylemeliyim?",
        "Ölüm de bir kapıdır; biz onu hayat sanırız.",
        "İyi insan olmak kolay değil ama hedef bu.",
    ],
    "lord": [
        "Buranın efendisiyim, adabınla konuş.",
        "Vergiler ödenmeli, yoksa ekmek bulamayız.",
        "Halkı korumak da kollamak da bana düşer.",
        "Bu topraklar benim sorumluluğumda, hafife alma.",
        "Şikayetler çok, çözüm az — lordluk böyle.",
        "Bir askerim gelmedi bugün, disiplin bozuluyor.",
        "Köy meselelerini dinlemek zorundayım.",
        "Beylik görkemli görünür, gerçek öyle değil.",
        "Hazineye bakıyorum, durumu iyi sayılmaz.",
    ],
    "kral": [
        "Devletim dimdik durduğu sürece sözüm fermandır.",
        "İhanetin cezası ölümdür, aklında bulunsun.",
        "Bu taht kanla kazanıldı, kanla korunur.",
        "Beylerim sadık mı bilmiyorum, ama boyun eğiyorlar.",
        "Devlet yönetmek uykusuz geceleri beraberinde getirir.",
        "Bir düşman sınırda bekliyorsa, o düşman yakında ölüdür.",
    ],
    "veliaht": [
        "Tahta çıktığımda işler değişecek.",
        "Babamın yöntemleri eskidi.",
        "Bekliyorum, sıram gelecek.",
        "Sarayda beklemek insanı öğütüyor.",
        "Bir gün kararlarım ben vereceğim.",
        "Şimdilik gözlemliyorum, zamanım gelecek.",
    ],
    "şifacı": [
        "Yaranı görmem mi? Ot kalmadı pek.",
        "Hastalar arttı bu sıralar.",
        "Deva bulmak zaman ister, acele etme.",
        "Her hastalığın çaresi yoktur ama ararız.",
        "Ot toplamaya gidiyordum, iyi ki uğradın.",
        "Bu mevsimde çok hasta düşüyor, yoruldum.",
        "İyi bir şifacı sabırsız olamaz.",
    ],
    "fırıncı": [
        "Un pahalandı, ekmek nasıl ucuz olsun?",
        "Sabah erken kalkmaktan başım dönüyor.",
        "Bugün ekmek bol pişti, al bir tanesi.",
        "Fırın hiç soğumaz, ben de öyle.",
        "Hamur yoğurmak güç ister, yıllar içinde öğrendim.",
        "Bu şehirde kim ekmeksiz yaşayabilir ki?",
    ],
    "balıkçı": [
        "Deniz bugün durgun, iyi avlandım.",
        "Ağ attım sabahtan, neyse ki doldu.",
        "Dalgalar kötüydü bu sabah, beklemek zorunda kaldım.",
        "Balığı kim tazesini istemez? Sat satabilirsen.",
        "Tekne bakım ister, yoksa deniz cimri olur.",
        "Bu kışın balıkları ince, neden bilmiyorum.",
    ],
    "marangoz": [
        "Odun yarmaya gittim bugün sabah.",
        "Bir sandık siparişi var, bitirmem lazım.",
        "İyi odun bulmak artık güçleşti.",
        "Kapı tamir ettim komşunun, ekmekle ödedi. Olur.",
        "Ağacın sesi vardır, onu duymak lazım.",
        "Bir insan çalışmasının izini bırakmalı; ben ahşabımda bırakırım.",
    ],
    "çoban": [
        "Sürü bugün dağa çıktı, yoruldum.",
        "Kurt sorunu var, bir koyun kaybettim.",
        "Hayvanlar insandan dürüsttür.",
        "Dağlarda yalnız kalmak alışkanlık oldu.",
        "İyi bir çoban sürüsünü tanır, biri bile kaysa anlar.",
        "Meralarda ot azalıyor, ilkbahar bekliyoruz.",
    ],
    "değirmenci": [
        "Un öğütmek bitmez bu mevsimde.",
        "Değirmen taşı aşındı, değiştirmem lazım.",
        "Çiftçiler sıra bekliyor, zaman yok.",
        "Değirmen suya, ben de değirmene bağlıyım.",
        "Unun kalitesi buğdaya bağlı, iyi buğday getirin.",
    ],
    "katip": [
        "Lordun mektupları bitmez, elimden kâğıt düşmüyor.",
        "Yazmak güçtür ama kalıcı olduğunu bilmek değer.",
        "Bu kadar belge tutmak yorucu.",
        "Hesapları tutuyorum, rakamlar hiç yalan söylemez.",
        "Kitaplarda bilgi var, insanların çoğu okumayı bilmiyor.",
    ],
    "öğretmen": [
        "Çocuklar öğreniyor ama sabır istiyor.",
        "Bilgi vermek almaktan daha tatmin edici.",
        "Bu nesil daha meraklı görünüyor.",
        "Bir öğrenci başarılı olsa, emek değer.",
    ],
    "han sahibi": [
        "Yolcular geldi geçen ay, iyi para kazandım.",
        "Hanın damı sızıyor, tamir ettirmem lazım.",
        "Şarap bitmek üzere, bir kervan bekleyeceğim.",
        "Yabancıları ağırlamak zahmetli ama kârlı.",
        "Gece başka bir kavga çıktı, yoruldum.",
    ],
}

MOOD_LINE_POOL = {
    "mutlu": [
        "Bugün içim ferah, dünya başka.",
        "Bir şarkı söylesem mi diyorum.",
        "Hayat zor ama gün güzel.",
        "İçim ışıl ışıl bugün, neden bilmiyorum.",
        "Sevinç bulaşıcıdır derler, al sana da geçsin.",
        "Bu duygu çok sürmez ama tadını çıkarıyorum.",
    ],
    "üzgün": [
        "Pek konuşacak halde değilim.",
        "İçim daralıyor son zamanlarda.",
        "Yorgunum dostum, dinlemem lazım.",
        "Bazen her şey boşuna geliyor.",
        "Yıldızlar bile bizi unutmuş.",
        "İçimde bir kuyu var, dipsiz.",
    ],
    "öfkeli": [
        "Bugün canımı sıkma.",
        "Yanlış zamanda geldin.",
        "İçimde bir ateş var, dokunma.",
        "Konuşma açma şu konuyu, taşarım.",
        "Birisi beni çok kızdırdı bu sabah.",
        "Sinirlerim bozuk, sözlerimi ölç.",
    ],
    "korkmuş": [
        "Sessizce konuş, biri duyabilir.",
        "Etrafıma bakıyorum, sen de bak.",
        "Bu aralar huzur yok burada.",
        "Bir şeyler döndüğünü hissediyorum.",
    ],
    "umutlu": [
        "İşler düzelecek gibi, hissediyorum.",
        "Bu ay iyi bir habere gebe.",
        "Bir şeyler değişiyor, iyiye doğru.",
        "Ümidini kesme demişler, haklılar.",
    ],
    "stresli": [
        "Aklım bin yerde, kısa kes.",
        "Üstümde çok yük var şu sıra.",
        "Bir türlü dinlenemiyorum.",
        "Zihnim durmuyor, kafam şişiyor.",
    ],
    "heyecanlı": [
        "Söyleyecek çok şeyim var aslında!",
        "Aklımda bir fikir döner durur.",
        "Beni bir şeyler bekliyor, hissediyorum.",
        "Bu enerji nereden geliyor bilmiyorum ama var.",
    ],
    "huzurlu": [
        "Sakin sakin konuşalım.",
        "İyiyim, şükür.",
        "Sessizliği seviyorum.",
        "Şu an her şey yerli yerinde.",
    ],
}

REPEAT_LINES = {
    1: "",
    2: "Hmm... bunu az önce sormuş gibisin. Belki yanılıyorum.",
    3: "Yine mi aynı soru? Cevabım değişmedi.",
    4: "Sabrımı sınama. Başka derdin yok mu?",
    5: "Yeter artık! Çek git buradan.",
}

SEASON_OPENERS = {
    "kış": [
        "Bu soğukta yine dışarıdasın.",
        "Kışın bu saatte burada olmak cesaret ister.",
        "Soğuk kemik seviyor bu mevsimde.",
    ],
    "ilkbahar": [
        "İlkbahar havası canlandırıyor insanı.",
        "Toprak uyanıyor, ümit de uyanıyor.",
        "Bu mevsimde her şey yeniden başlıyor gibi.",
    ],
    "yaz": [
        "Bu sıcakta dışarı çıkmak ayrı bir cesaret.",
        "Güneş yakıyor, ama iş bekler.",
        "Yaz ortası ağır geçiyor bu sene.",
    ],
    "sonbahar": [
        "Yapraklar düşüyor, düşünceler de.",
        "Kış hazırlığı başladı mı bilmiyorum ama bitmeli.",
        "Sonbahar melankoli getiriyor bana.",
    ],
}

CRIME_REACTION = [
    "Senin namın kötü duyuluyor. Konuşurken kelimelerini seç.",
    "Yakanın peşinde olduğunu biliyorum. Dikkatli ol.",
    "Suçlu biriyle konuştuğum duyulmasın.",
    "Çevrede duyulduğun kadarıyla temiz değilsin.",
    "Geçmişin var; bana dokunmaz ama başkaları düşünür.",
]

HIGH_REP = [
    "Adın iyi anılıyor, bunu kaybetmemen lazım.",
    "Saygıyla yaklaşıyorum, hak ettin.",
    "Herkes senden iyi bahsediyor, hoş.",
]

PLAYER_PROFESSION_CALLBACKS = {
    ("demirci", "asker"):     "Sen asker olduğuna göre iyi bir kılıç işine yarar değil mi?",
    ("demirci", "şövalye"):   "Bir şövalyenin zırhı iyi demir ister, söyle ne gerekiyorsa.",
    ("tüccar", "tüccar"):     "İki tüccar bir arada — belki ortak iş çıkar aradan.",
    ("tüccar", "çiftçi"):     "Çiftçiden alıp şehirde satmak hep kârlıdır.",
    ("çiftçi", "fırıncı"):    "Fırına buğday getirdin mi? Sana indirim yaparım.",
    ("çiftçi", "çiftçi"):     "İki çiftçi bir arada. Toprak derdini senden iyi kim anlar?",
    ("avcı", "avcı"):         "Sen de avcısan; ormanın doğusunda geyik izleri var.",
    ("rahip", "asker"):       "Asker için dua edeceğim. Savaşta işine yarar.",
    ("şifacı", "asker"):      "Yaralı askerler çok gelir bana. Dikkatli ol.",
    ("han sahibi", "tüccar"): "Tüccarsan hanımı kullanabilirsin. İndirim yaparım yola çıkmadan.",
    ("demirci", "avcı"):      "Avcı için iyi bir bıçak yaparım, söyle.",
    ("fırıncı", "çiftçi"):    "Buğday getirdin mi? Un azaldı.",
}

# ─────────────────────────────────────────────
#  ÇOCUK YOLCULARI
# ─────────────────────────────────────────────

CHILD_REACTIONS = {
    "kral": [
        "Çocuk! Sarayda işin ne? Annenle babanı bul, geri dön.",
        "Sultanlar çocuklarla muhatap olmaz. Çık dışarı.",
        "Burası çocuklara göre yer değil. Git eve.",
    ],
    "lord": [
        "Burası bir çocuğa göre yer değil küçük. Git evine.",
        "Sana laf etmem yavrum, lordun başka işleri var.",
        "Kim getirdi seni buraya? Evin neresi?",
    ],
    "asker": [
        "Hey küçük, sokakta ne dolaşıyorsun? Evine git.",
        "Çocuk, kılıçlar tehlikelidir. Uzak dur.",
        "Yavrum, burası savaş meydanı değil ama yine de tehlikeli.",
    ],
    "haydut": [
        "Hee, küçük olan. Cebinde ne var bakalım?",
        "Çocuksun ama doğru zamanda yanlış yerdesin.",
        "Git buradan, burası sana göre değil.",
    ],
    "tüccar": [
        "Ne almak istiyorsun küçüğüm? Paran yetiyor mu?",
        "Çocuklara şeker veriyorum bazen, ama bugün yok.",
        "Satamazsam da bakabilirsin. Neyin gözün kaldı?",
    ],
    "şifacı": [
        "Yaranı göster yavrum, ot sürerim.",
        "Çocukları severim, gel bakayım.",
        "Hasta mısın küçük? Anlat bakayım.",
    ],
    "rahip": [
        "Tanrılar çocukları korur. Dua etmeyi unutma.",
        "Küçüksün ama ruhun büyüsün yavrum.",
        "Gel bakalım, bir dua öğreteyim sana.",
    ],
    "çiftçi": [
        "Sen kimin çocuğusun? Evine git yavrum.",
        "Koş oyna; tarlada iş biter seni bekleyemem.",
        "Ailen nerede senin?",
    ],
    "default_friendly": [
        "Ne haber küçük? Annen biliyor mu burada olduğunu?",
        "Sen kimin çocuğusun bakalım?",
        "Yavrum, koş oyna; büyüklerin işine karışma.",
        "Gel bakalım, ne istiyorsun?",
        "Ne arıyorsun burada, evine gitsen iyi olur.",
    ],
    "default_neutral": [
        "Çocuk, başka işim var. Sonra konuşuruz.",
        "Ne istiyorsun yavrum?",
        "Kısaca söyle, vaktim az.",
    ],
}

# ─────────────────────────────────────────────
#  YARDIMCI FONKSİYONLAR
# ─────────────────────────────────────────────

def _seed_rng(npc_id, topic, day, turn):
    h = hashlib.md5(f"{npc_id}|{topic}|{day}|{turn}".encode()).hexdigest()
    return random.Random(int(h[:8], 16))

def _pick(rng, pool):
    if not pool:
        return ""
    return pool[rng.randrange(len(pool))]


def _to_first_person(activity):
    """daily_log metni 3. şahıstır ('geçimini sağladı'); NPC kendi ağzından
    konuşurken 1. şahsa çevir ('geçimimi sağladım')."""
    a = activity
    # 3. şahıs iyelik+belirtme → 1. şahıs
    a = re.sub(r'ini\b', 'imi', a); a = re.sub(r'ını\b', 'ımı', a)
    a = re.sub(r'unu\b', 'umu', a); a = re.sub(r'ünü\b', 'ümü', a)
    a = re.sub(r'ıyla\b', 'ımla', a); a = re.sub(r'iyle\b', 'imle', a)
    a = re.sub(r'uyla\b', 'umla', a); a = re.sub(r'üyle\b', 'ümle', a)
    # 3. şahıs geçmiş fiil → 1. şahıs (+m)
    a = re.sub(r'(d[ıiuü]|t[ıiuü])$', lambda m: m.group(1) + 'm', a)
    return a

def emotional_stage(repeat_count: int) -> str:
    if repeat_count <= 1:
        return "merak"
    if repeat_count == 2:
        return "kafa_karışıklığı"
    if repeat_count == 3:
        return "sinirlilik"
    return "düşmanlık"

def _build_context(npc, player, state, rng, day):
    """NPC + oyuncu + dünya bağlamını tek pakette toplar."""
    ctx = {}

    log = npc.get("daily_log") or []
    ctx["recent_activity"] = log[-1]["text"] if log else None

    ctx["mood"] = npc.get("current_mood", "huzurlu")

    ctx["goal_key"] = npc.get("goal")
    ctx["goal_progress"] = npc.get("goal_progress", 0)
    ctx["goal_near"] = ctx["goal_progress"] > 75
    ctx["goal_just_started"] = ctx["goal_progress"] < 15

    ctx["in_debt"] = npc.get("debt", 0) > 50
    ctx["struggling"] = npc.get("savings", 0) < 10
    ctx["wealthy"] = npc.get("savings", 0) > 100

    ctx["player_profession"] = player.get("profession", "köylü")
    ctx["player_rep_high"] = player.get("reputation", 0) > 40
    ctx["player_rep_low"] = player.get("reputation", 0) < -20
    ctx["player_famous"] = player.get("fame", 0) > 30
    ctx["player_honorable"] = player.get("honor", 0) > 30
    ctx["player_feared"] = player.get("fear", 0) > 30
    ctx["player_name"] = player.get("name", "yabancı")

    mem = npc.get("memory") or []
    if mem:
        ctx["last_topic"] = mem[-1].get("topic")
        ctx["last_delta"] = mem[-1].get("delta", 0)
        ctx["last_day"] = mem[-1].get("day", 0)
        ctx["days_since_last"] = day - ctx["last_day"]
    else:
        ctx["last_topic"] = None
        ctx["last_delta"] = 0
        ctx["days_since_last"] = 999

    month = (day // 4) % 12
    if month in (11, 0, 1):
        ctx["season"] = "kış"
    elif month in (2, 3, 4):
        ctx["season"] = "ilkbahar"
    elif month in (5, 6, 7):
        ctx["season"] = "yaz"
    else:
        ctx["season"] = "sonbahar"

    recent_ev = npc.get("recent_events") or []
    ctx["recent_event_type"] = recent_ev[-1]["type"] if recent_ev else None

    return ctx

def _memory_callback(npc, ctx, rng, band, current_topic):
    """Önceki konuşmaya atıfta bulunan satır; ~%30 şans."""
    last = ctx.get("last_topic")
    days_ago = ctx.get("days_since_last", 999)

    if not last or days_ago > 8:
        return ""

    callbacks = {
        ("aile", "selam"): [
            "Aileyi sormuştun geçen. Hâlâ merak ediyorsun mu?",
            "Ailemden bahsetmiştim ya, aklımda kaldı.",
        ],
        ("hedef", "selam"): [
            "Hayallerimden bahsetmiştim. Hâlâ aklımda.",
            "Geçen söylediklerimi düşündüm sonra.",
        ],
        ("üzgün", "selam"): [
            "Geçen dertlerimi anlattım, teşekkürler sorduğun için.",
            "O zaman kötüydüm, biraz iyiyim şimdi.",
        ],
        ("iş", "iş"): [
            "Yine iş konuşacağız, anlıyorum — başka konu bulmak zor.",
        ],
        ("dünya", "selam"): [
            "Geçen söylentileri konuşmuştuk. Değişti mi acaba?",
        ],
    }
    pool = callbacks.get((last, current_topic), [])
    if pool and rng.random() < 0.30:
        return rng.choice(pool)

    if ctx.get("last_delta", 0) >= 2 and band in ("dost", "arkadaş") and rng.random() < 0.25:
        return rng.choice([
            "Geçen sohbetimiz iyiydi.",
            "Seninle konuşmak iyi geliyor zaten.",
        ])
    return ""

def _spontaneous_line(npc, ctx, rng, band):
    """NPC kendi gündemini açar — selam topic'inde ~%25 şans.
    Bir satır döner; boş string = inisiyatif yok.
    """
    if rng.random() > 0.25:
        return ""

    mood = ctx["mood"]
    ev = ctx.get("recent_event_type")
    goal_key = ctx.get("goal_key")

    if ev == "robbed":
        return rng.choice([
            "Dur dur, sana bir şey söyleyeyim — soyuldum bu ay!",
            "İyi geldin, başıma bir iş geldi...",
        ])
    if ev == "child_lost":
        return "Çocuğumu kaybettim. Konuşmak zor ama bilmeni istedim."
    if ev == "spouse_lost":
        return "Eşimi kaybettim geçenlerde. Henüz hazmedebilmiş değilim."
    if ev == "promoted":
        return rng.choice([
            "Haberim var! Terfi aldım bu ay.",
            "Sevinçliyim — bir yükseliş geldi beklemediğim yerden.",
        ])

    if mood == "heyecanlı":
        return rng.choice([
            "Dur dur, söylemem lazım bir şey!",
            "Aklımda dönüp duran bir şey var, anlatsam mı?",
            "Sabırsızlanıyorum, güzel bir şey var.",
        ])

    if ctx.get("goal_near") and band in ("dost", "arkadaş"):
        goal_meta = GOAL_BY_KEY.get(goal_key, {})
        label = goal_meta.get("label", "hedefime")
        return rng.choice([
            f"Az kaldı {label.lower()} için! Hissediyorum.",
            f"Yaklaştım — {label.lower()} meselesi neredeyse bitti.",
        ])

    if ctx.get("in_debt") and ctx.get("struggling") and band in ("dost", "arkadaş"):
        return rng.choice([
            "Açık söyleyeyim — bu ay çok sıkıştım.",
            "Cep bomboş, borç üstüne borç.",
        ])

    s_pool = SEASON_OPENERS.get(ctx.get("season", ""))
    if s_pool and rng.random() < 0.35:
        return rng.choice(s_pool)

    return ""

def _player_aware_flavor(npc, ctx, rng, band):
    """Oyuncunun mesleğine veya durumuna göre NPC tepkisi."""
    if band == "düşman":
        return ""

    p_prof = ctx.get("player_profession", "")
    n_prof = npc.get("profession", "")
    cb = PLAYER_PROFESSION_CALLBACKS.get((n_prof, p_prof))
    if cb and rng.random() < 0.35:
        return cb

    if ctx.get("player_famous") and band in ("dost", "arkadaş", "nötr") and rng.random() < 0.3:
        return rng.choice([
            "Adın şehirde dolaşıyor, duyuyorum.",
            "Seni duymayan kalmadı bu çevrede.",
        ])

    if ctx.get("player_honorable") and band in ("dost", "arkadaş") and rng.random() < 0.25:
        return rng.choice([
            "Onurlu adam belli olur, senden belli.",
            "Şereflice yaşayanı insan fark eder.",
        ])

    if ctx.get("player_feared") and band in ("nötr", "rakip") and rng.random() < 0.25:
        return rng.choice([
            "Sesini alçalt yeter. Anlaştık.",
            "Sakin olalım, anlaşmak mümkün.",
        ])

    return ""

def _personality_flavor(rng, npc, band):
    out = []
    if "kibirli" in npc["personality"] and band != "dost":
        out.append(_pick(rng, [
            "Tabii sen anlamazsın, sıradan biri için fazla derin.",
            "Senin gibilerle konuşmak bana yakışmıyor aslında.",
            "Anlat anlat, seni dinlerim ama anlaşılmak ayrı.",
        ]))
    if "cömert" in npc["personality"] and band in ("dost", "arkadaş"):
        out.append(_pick(rng, [
            "İstersen bir kupa bal şarabı ısmarlayayım.",
            "Açsan paylaşırım, kuralım böyle.",
            "Cebim dar ama sana bir şeyler bulabilirim.",
        ]))
    if "öfkeli" in npc["personality"] and band in ("rakip", "düşman"):
        out.append("Sabrımı zorlama.")
    if "neşeli" in npc["personality"]:
        out.append(_pick(rng, [
            "Hayat ne kadar kötü olsa da gülmek lazım.",
            "Gülümsemek bedava, al sana da.",
        ]))
    if "korkak" in npc["personality"] and band in ("rakip", "düşman"):
        out.append("Sesini alçalt, biri duyabilir.")
    if "kurnaz" in npc["personality"]:
        out.append(_pick(rng, [
            "Hakkımda her duyduğuna inanma.",
            "Önemli olan kimin söylediği değil, niye söylediği.",
            "Ben anlattığımı değil, anlatmamam gerekeni bilirim.",
        ]))
    if "merhametli" in npc["personality"] and band in ("dost", "arkadaş"):
        out.append(_pick(rng, [
            "Bir derdin olsa söyle, yardım ederim.",
            "İnsan insana yardım etmeli.",
        ]))
    return " ".join(p for p in out if p)

def _personal_event_line(npc, _recent_world):
    personal = [e for e in (npc.get("personal_events") or [])[-3:]]
    if not personal:
        return ""
    e = personal[-1]
    kind = e.get("type")
    if kind == "eş_kaybı":
        return "Eşimi yakın zamanda kaybettim, içim hâlâ yanıyor."
    if kind == "evlilik":
        return "Geçenlerde evlendim, hayatım değişti."
    if kind == "doğum":
        return "Bir çocuğum daha oldu, yorgun ama mutluyum."
    if kind == "çocuk_kaybı":
        return "Çocuğumu yitirdim. Bunu unutamayacağım."
    return ""

def _refuse_audience(npc, player):
    if npc["profession"] in ("kral", "lord", "general"):
        if not lord_will_receive(player, npc["profession"]):
            return True
    return False

def _is_child(player):
    return (player.get("age") or 0) < 13

# ─────────────────────────────────────────────
#  ANA DIALOG FONKSİYONU
# ─────────────────────────────────────────────

def _child_npc_speech(npc, topic, rng, age):
    """NPC çocuk/bebekse yaşına uygun konuşsun — bebek yetişkin gibi konuşamaz."""
    ad = (npc.get("name") or "Çocuk").split()[0]
    if age < 4:
        return _pick(rng, [
            f"({ad} sana merakla bakıyor; daha konuşmayı bilmiyor.)",
            f"(Bebek {ad} parmağını emip anlamsız sesler çıkarıyor.)",
            f"(Minik {ad} sana gülümsüyor ama bir şey demiyor.)",
            f"({ad} eteğine tutunup arkasına saklanıyor.)",
        ])
    if age < 8:
        pool = {
            "selam": ["Merhaba! Sen kimsin?", "Benimle oynar mısın?", "Annemi gördün mü?", "Aa, biri geldi!"],
            "iş": ["Ben daha çalışmıyorum ki, küçüğüm.", "Oyun oynamayı seviyorum!", "Babam çalışıyor, ben bakıyorum."],
            "aile": ["Annemle babam var benim.", "Annem en iyisi!", "Kardeşimle oynuyoruz."],
            "dünya": ["Büyükler hep bir şey konuşuyor, anlamıyorum.", "Dışarısı kocamaaan!"],
            "hakkimda": ["Sen iyisin galiba!", "Bilmem, yeni gördüm seni.", "Annem yabancılarla konuşma dedi ama..."],
            "hedef": ["Büyüyünce şövalye olucam!", "Çoook şeker yiyeceğim!", "Bilmem ki..."],
            "üzgün": ["Düştüm, dizim acıdı.", "Yok bir şeyim.", "Annemi istiyorum."],
            "veda": ["Bay bay!", "Güle güle!", "Yine gel oyna!"],
        }.get(topic, ["Bilmiyorum...", "Hımm?", "Oyun oynayalım mı?"])
        return _pick(rng, pool)
    # 8-12 yaş
    pool = {
        "selam": ["Selam. Bir şey mi lazımdı?", "Merhaba, ben buralıyım.", "Aa, selam sana!"],
        "iş": ["Babama yardım ediyorum bazen.", "Daha işe başlamadım, küçüğüm.", "Ufak tefek işler yapıyorum."],
        "aile": ["Ailem köyde, kalabalığız.", "Annemle babamı çok severim.", "Evde herkes bir telaşta hep."],
        "dünya": ["Büyükler bir şeyler konuşuyor ama pek anlamıyorum.", "Dünyayı daha öğreniyorum işte."],
        "hakkimda": ["İyi birine benziyorsun.", "Bilmiyorum, seni daha yeni tanıdım.", "Fena değilsin sanırım."],
        "hedef": ["Büyüyünce önemli biri olacağım!", "Babam gibi olmak istiyorum.", "Daha düşünmedim doğrusu."],
        "üzgün": ["Yok bir şeyim, geçer.", "Biraz canım sıkkın.", "İyiyim sayılır."],
        "veda": ["Görüşürüz!", "Hadi, bay bay!", "Güle güle, yine gel."],
    }.get(topic, ["Anlamadım pek.", "Ne demiştin?"])
    return _pick(rng, pool)


def generate_response(npc, relationship_score, topic, player, recent_world_events, day, turn, state=None):
    """4 katmanlı dialog motoru. Geriye (response_text, proactive_line) döner."""
    ensure_profile(npc)
    rng = _seed_rng(npc["id"], topic, day, turn)
    band = relation_band(relationship_score)

    # ── NPC yaş kapısı: çocuk/bebek yetişkin gibi konuşmasın ──────────────
    # (Dikkat: yaş 0 falsy'dir; `or` ile değil açık None kontrolüyle.)
    _npc_age = npc.get("age")
    _npc_age = 30 if _npc_age is None else _npc_age
    if _npc_age < 13:
        return _child_npc_speech(npc, topic, rng, _npc_age), ""
    ctx = _build_context(npc, player, state or {}, rng, day)
    parts = []
    proactive = ""
    mood = ctx["mood"]

    # ── Çocuk oyuncu özel yolu ──────────────────────────────────────────
    if _is_child(player):
        if npc.get("id") in (player.get("parent_ids") or []):
            is_mother = npc.get("gender") == "kadın"
            if topic == "selam":
                mom_lines = [
                    f"Yavrum {player['name']}, gel buraya.",
                    "Geldin demek, sofrada ekmek var.",
                    "Sıcak çorba pişiriyordum, koş gel.",
                    "Yine bir tarafın çamur olmuş, gel temizleyeyim.",
                    "Anlat bakalım, gün nasıl geçti?",
                    "Seni gördüm, içim ferahladı.",
                ]
                dad_lines = [
                    f"{player['name']}, durma boş, bir iş tutmaya bak.",
                    "Gel buraya, sana bir şey göstereyim.",
                    "Hadi yardım eder misin? Kollarım yoruldu.",
                    "Aklında ne var, anlat bakayım.",
                    "Neredeydin? Merak ettim.",
                ]
                parts = [_pick(rng, mom_lines if is_mother else dad_lines)]
                ev = latest_event_line(npc)
                if ev and rng.random() < 0.5:
                    parts.append(ev)
            elif topic == "iş":
                mom_iş = [
                    "Ev işleri bitmez yavrum. Yemek, temizlik, çamaşır...",
                    "Sabahtan beri ayaktayım. Evin dönmesi için çalışmak lazım.",
                    "Bu bahçeyi kim sulayacak, kim ekmek pişirecek? Annen işte.",
                ]
                dad_iş = [
                    "Bugün yine yorgun düştüm. Ekmek parasıdır, şikayet etmem.",
                    f"{npc['profession'].capitalize()} olmak kolay değil evladım.",
                    "Çalışmadan ekmek çıkmaz. Bunu aklına yaz.",
                ]
                parts = [_pick(rng, mom_iş if is_mother else dad_iş)]
            elif topic == "aile":
                mom_aile = [
                    f"Ailem sensin, {player['name']}. Başka ne lazım.",
                    "Seni seviyorum, bu yeter.",
                    "Ailenin kıymetini bil, büyüyünce anlarsın.",
                ]
                dad_aile = [
                    "Ailemiz küçük ama güçlü.",
                    "Aileyi korumak her şeyin önünde gelir.",
                    f"Sen varsın ya, {player['name']}, yeter.",
                ]
                parts = [_pick(rng, mom_aile if is_mother else dad_aile)]
            elif topic == "dünya":
                parts = [_pick(rng, [
                    "Köyde dedikodu eksik olmaz. Dikkatli ol kime ne söylediğine.",
                    "Şu sıralar ortalık karışık. Sen aklını başına topla.",
                    "Büyükler konuşuyor; sen dinle ama karışma.",
                ])]
            elif topic == "üzgün":
                ev_line = latest_event_line(npc)
                if ev_line and mood in ("üzgün", "stresli", "öfkeli"):
                    parts = [ev_line, "Ama sen merak etme, hallederiz."]
                else:
                    parts = [_pick(rng, [
                        "İyiyim merak etme yavrum.",
                        "Bazen yorgunluk öyle gösterir. Geçer.",
                        "Her şey yolunda, git rahat ol.",
                    ])]
            elif topic == "hedef":
                parts = [_pick(rng, [
                    f"Senin iyi yetişmeni istiyorum. Başka hedefim yok.",
                    "Ailemi mutlu görmek... işte bu bana yeter.",
                    "Seni iyi bir insan olarak büyütmek en büyük hedefim.",
                ])]
            elif topic == "veda":
                mom_veda = [
                    "Hadi git, geç olma. Akşam sofrada olsun.",
                    "Dikkatli ol yavrum, uzağa gitme.",
                    "Eyvallah, gözün açık olsun.",
                ]
                dad_veda = [
                    "Git, ama akşam eve gel.",
                    "Selametle evladım.",
                    "Dikkatli ol. Tanımadıklarınla konuşma.",
                ]
                parts = [_pick(rng, mom_veda if is_mother else dad_veda)]
            else:
                parts = [_pick(rng, [
                    "Ne dediğini tam anlamadım, anlat bakalım.",
                    "Dur bir dakika, ne istiyorsun?",
                ])]
            interactions = npc.get("interactions", {})
            repeat_count = interactions.get(topic, 0)
            if repeat_count >= 2:
                line = REPEAT_LINES.get(min(repeat_count, 5), REPEAT_LINES[5])
                if line:
                    parts.insert(0, line)
            return " ".join(p for p in parts if p), ""

        # Ebeveyn olmayan NPC → çocuğa yaşa uygun tepki
        if topic == "selam":
            child_pool = CHILD_REACTIONS.get(
                npc["profession"],
                CHILD_REACTIONS["default_friendly"] if band in ("dost", "arkadaş")
                else CHILD_REACTIONS["default_neutral"],
            )
            parts.append(_pick(rng, child_pool))
            mg = MOOD_GREETING.get(mood)
            if mg and rng.random() < 0.4:
                parts.append(_pick(rng, mg))
        elif topic == "iş":
            prof_lines = PROFESSION_TALK.get(npc["profession"], [
                f"Her gün {npc['profession']} olarak çalışıyorum.",
                "Benim işim başımdan aşkın.",
            ])
            parts.append(_pick(rng, prof_lines))
            if rng.random() < 0.35:
                parts.append(_pick(rng, [
                    "Büyüyünce sen de bir meslek seçeceksin.",
                    "Çalışmak önemlidir, aklında bulunsun.",
                    "Kolay değil ama ekmek parasıdır.",
                ]))
        elif topic == "aile":
            if npc.get("spouse_id"):
                parts.append(_pick(rng, ["Bir eşim var, şükür.", "Ailem var, birlikte yaşıyoruz."]))
            else:
                parts.append(_pick(rng, ["Henüz evlenmedim.", "Yalnız yaşıyorum şimdilik."]))
            if npc.get("children_ids"):
                n = len(npc["children_ids"])
                parts.append(f"{n} çocuğum var.")
        elif topic == "dünya":
            chose_rumor = False
            if state is not None and rng.random() < 0.7:
                r = rumor_for_npc(npc, state)
                if r:
                    parts.append(f"Duydum ki, {r['text']}")
                    chose_rumor = True
            if not chose_rumor:
                parts.append(_pick(rng, [
                    "Bu çevrede pek fazla yenilik yok.",
                    "İnsanlar çok konuşuyor, ne kadarı doğru bilinmez.",
                ]))
        elif topic == "üzgün":
            ev_line = latest_event_line(npc)
            if ev_line and mood in ("üzgün", "stresli", "öfkeli"):
                parts.append(ev_line)
            else:
                parts.append(_pick(rng, ["İyiyim sayılırım.", "Her şey yolunda.", "Bugün fena değil."]))
        elif topic == "hedef":
            goal_meta = GOAL_BY_KEY.get(npc["goal"])
            if goal_meta:
                parts.append(f"Hayalim {goal_meta['label'].lower()}.")
            else:
                parts.append("Günü kurtarmak yeterli şimdilik.")
        elif topic == "veda":
            if band in ("dost", "arkadaş"):
                parts = [_pick(rng, ["Hadi git yavrum, yine uğra.", "Eyvallah, kendine iyi bak."])]
            else:
                parts = [_pick(rng, ["Hoşçakal.", "Selametle.", "Eve git, geç olmasın."])]
        else:
            parts.append(_pick(rng, ["Ne demek istediğini anlamadım.", "Bir daha söyler misin?"]))

        interactions = npc.get("interactions", {})
        repeat_count = interactions.get(topic, 0)
        if repeat_count >= 2:
            line = REPEAT_LINES.get(min(repeat_count, 5), REPEAT_LINES[5])
            if line:
                parts.insert(0, line)
        return " ".join(p for p in parts if p), ""

    # ── Soylu reddi ─────────────────────────────────────────────────────
    if topic == "selam" and _refuse_audience(npc, player):
        if npc["profession"] == "kral":
            return _pick(rng, KING_REJECT), ""
        if npc["profession"] == "lord":
            return _pick(rng, LORD_FORMAL).format(pname=player["name"]), ""

    # ── Tekrar tespiti ──────────────────────────────────────────────────
    interactions = npc.get("interactions", {})
    repeat_count = interactions.get(topic, 0)
    pname = player["name"]

    # ── TOPIC HANDLERlar ────────────────────────────────────────────────

    if topic == "selam":
        mem_cb = _memory_callback(npc, ctx, rng, band, "selam")
        if mem_cb:
            parts.append(mem_cb)

        spont = _spontaneous_line(npc, ctx, rng, band)
        if spont:
            proactive = spont   # ayrı "öncül" baloncuğunda gösterilir; cevaba tekrar ekleme

        if npc["profession"] == "kral" and band != "düşman":
            parts.append(_pick(rng, [
                f"Yaklaş {pname}. Divanımız nezdinde ne istersin?",
                "Kelamını ölç, vakit dardır.",
                "Sözünü söyle ve git.",
                f"Huzuruma girdin {pname}. Kısa ve öz konuş.",
            ]))
        elif npc["profession"] == "lord":
            parts.append(_pick(rng, LORD_FORMAL).format(pname=pname))
        else:
            parts.append(_pick(rng, GREETING_BY_BAND[band]).format(pname=pname))

        # Ruh-hali satırı: her selamda DEĞİL (tekrar olmasın) ve düşmanca
        # band'lerde değil (pozitif satır "Defol!" ile çelişiyordu)
        mg = MOOD_GREETING.get(mood)
        if mg and band not in ("düşman", "rakip") and rng.random() < 0.45:
            parts.append(_pick(rng, mg))

        # Kişisel haber paylaşımı sadece düşmanca OLMAYAN band'lerde
        # (düşmana "geçenlerde çocuğum oldu" demek mantıksızdı)
        if band not in ("düşman", "rakip") and rng.random() < 0.4:
            ev = latest_event_line(npc)
            if ev:
                parts.append(ev)

        pf_aware = _player_aware_flavor(npc, ctx, rng, band)
        if pf_aware and band not in ("düşman", "rakip") and rng.random() < 0.3:
            parts.append(pf_aware)

    elif topic == "iş":
        if npc["profession"] == "tüccar":
            loc_supply = npc.get("_loc_supply_signal", "normal")
            parts.append(_pick(rng, MERCHANT_PRICE_TALK[loc_supply]))
        elif npc["profession"] == "asker" and player.get("crime", 0) > 30:
            parts.append(_pick(rng, SOLDIER_THREAT))
        else:
            prof_lines = PROFESSION_TALK.get(npc["profession"], [
                f"Ben {npc['profession']}'ım, işim başımdan aşkın.",
                "Her gün aynı, ekmek peşindeyiz.",
                "Bu meslek zor ama başka yol yok.",
            ])
            parts.append(_pick(rng, prof_lines))

        log = npc.get("daily_log") or []
        if log and rng.random() < 0.65:
            activity = _to_first_person(log[-1]["text"])  # 3. şahıs → 1. şahıs
            parts.append(_pick(rng, [
                f"Bu ay {activity}.",
                f"Geçen ay {activity}, yoruldum açıkçası.",
                f"Daha geçen gün {activity}.",
            ]))

        if ctx.get("in_debt") and rng.random() < 0.4:
            parts.append(_pick(rng, [
                "Bir de üstüne borcum var, sıkıştım.",
                "Kazancım borcu ödemiyor, zor.",
            ]))
        elif ctx.get("wealthy") and rng.random() < 0.3:
            parts.append(_pick(rng, [
                "Bu aralar iyiyim şükür, cebim doluca.",
                "Kazanç fena değil son zamanlarda.",
            ]))

        s_pool = SEASON_OPENERS.get(ctx.get("season", ""))
        if s_pool and rng.random() < 0.3:
            parts.append(_pick(rng, s_pool))

        pf_aware = _player_aware_flavor(npc, ctx, rng, band)
        if pf_aware:
            parts.append(pf_aware)

    elif topic == "aile":
        if npc.get("spouse_id"):
            parts.append(_pick(rng, [
                "Bir eşim var, çok şükür birlikte yaşlanıyoruz.",
                "Eşim olmasa yaşayamazdım.",
                "Eşim son zamanlarda hastaydı, daha iyi şimdi.",
                "Birlikte yürüdüğümüz yollar çok oldu, şükür.",
                "Eşim sabırlı bir insan; benim gibisine tahammül etmek kolay değil.",
            ]))
        else:
            parts.append(_pick(rng, [
                "Hâlâ yalnızım. Kısmet açılır belki.",
                "Bekarım, niye herkes sorar bunu?",
                "Evlenmek istemiyorum aslında, kimseye yük olmayayım.",
                "Bir eş bulsam hayat değişir diyorum bazen.",
                "Yalnız yaşamak alışkanlık oldu, hem kolay hem zor.",
            ]))

        if npc.get("children_ids"):
            n = len(npc["children_ids"])
            parts.append(_pick(rng, [
                f"{n} çocuğum var, onlar için yaşıyorum.",
                f"{n} tane evladım var. Bundan büyük nimet olmaz.",
                f"Çocuklarım {n} tane — her biri ayrı dert, ayrı sevinç.",
            ]))

        pe = latest_event_line(npc) or _personal_event_line(npc, recent_world_events)
        if pe:
            parts.append(pe)

        goal_key = ctx.get("goal_key", "")
        if goal_key in ("aileyi_buyutmek", "cocuk_sahibi", "evlenmek") and rng.random() < 0.5:
            gt = GOAL_TALK.get(goal_key, [])
            if gt:
                parts.append(_pick(rng, gt))

    elif topic == "dünya":
        chose_rumor = False
        if state is not None and rng.random() < 0.7:
            r = rumor_for_npc(npc, state)
            if r:
                parts.append(_pick(rng, [
                    f"Duydun mu? {r['text']}",
                    f"Bir kulağıma çalındı: {r['text']}",
                    f"Söylenti dolaşıyor: {r['text']}",
                    f"Şehirde fısıltı var: {r['text']}",
                ]))
                chose_rumor = True

        if not chose_rumor and state is not None and rng.random() < 0.65:
            try:
                from world_events import get_active_world_events
                active_evs = get_active_world_events(state)
                if active_evs:
                    ev = rng.choice(active_evs)
                    parts.append(_pick(rng, [
                        f"Haberdar oldun mu? {ev['headline']}.",
                        f"Kulağıma geldi: {ev['headline']}. Dünya değişiyor.",
                        f"Şehirde konuşulan tek şey bu: {ev['headline']}.",
                        f"Bunu duymuştun mı? {ev['headline']}.",
                    ]))
                    chose_rumor = True
            except Exception:
                pass

        if not chose_rumor and recent_world_events:
            idx = rng.randrange(min(10, len(recent_world_events)))
            ev = recent_world_events[-min(10, len(recent_world_events)) + idx]
            parts.append(_pick(rng, [
                f"Duydun mu? {ev['text']}",
                f"Söyledikleri doğruysa: {ev['text']}",
                f"Köyde duyulan en taze haber: {ev['text']}",
            ]))
        elif not chose_rumor:
            parts.append(_pick(rng, [
                "Bu civarda son zamanlarda kayda değer pek bir şey olmadı.",
                "Sessizlik bazen kötüye işarettir.",
                "Söylenti eksik olmaz ama doğrusu belirsiz.",
                "Haber yok iyi haberdir diyorlar, öyle olsun.",
            ]))

        if npc["profession"] == "tüccar" and rng.random() < 0.4:
            parts.append(_pick(rng, [
                "Bu haberler piyasayı etkiler elbette.",
                "Ticaret yollarını etkiler mi diye düşünüyorum.",
            ]))
        elif npc["profession"] in ("asker", "şövalye") and rng.random() < 0.4:
            parts.append(_pick(rng, [
                "Lordumuz ne söylüyor bilmiyorum ama hazır olmalıyız.",
                "Asker kulağı açık tutar, bu işin gereği.",
            ]))

    elif topic == "üzgün":
        ev_line = latest_event_line(npc)
        if ev_line and mood in ("üzgün", "stresli", "öfkeli"):
            parts.append(ev_line)
            if mood == "üzgün":
                parts.append(_pick(rng, [
                    "Üzüntüyle oturuyorum, geçmesini bekliyorum.",
                    "Bazen ne yapacağımı bilemiyorum.",
                    "İnsana böyle anlar da geliyor.",
                ]))
            elif mood == "stresli":
                parts.append(_pick(rng, [
                    "Stres üstüne stres, taşıyacak yerim kalmadı.",
                    "Zihin durmuyor, uyku da yok.",
                ]))
            elif mood == "öfkeli":
                parts.append(_pick(rng, [
                    "Bu öfkeyi boşaltamıyorum, içimde kaynıyor.",
                    "Bir yanlış anlayış, bir haksızlık — geçemiyor.",
                ]))
        elif mood in ("üzgün", "stresli", "öfkeli"):
            parts.append("Sorma. " + _pick(rng, MOOD_GREETING.get(mood, [""])))
            goal_meta = GOAL_BY_KEY.get(npc["goal"])
            if goal_meta and rng.random() < 0.5:
                parts.append(f"{goal_meta['label']} istiyorum ama her şey ters gidiyor.")
        elif mood == "mutlu":
            parts.append(_pick(rng, [
                "Üzgün değilim şu an, aksine içim ferah.",
                "Hayır, bugün iyi gidiyor.",
                "Üzüntüm yok, endişelenme.",
            ]))
        elif mood == "umutlu":
            parts.append(_pick(rng, [
                "Bir miktar derdim var ama ümidim sağlam.",
                "Bugün iyi hissediyorum, umarım devam eder.",
            ]))
        else:
            parts.append(_pick(rng, [
                "Üzgün değilim aslında. Belki biraz dalgın.",
                "Hayat işte, herkes biraz yorgun.",
                "Sorun olmasa hayat hayat olmaz.",
                "İyiyim sayılırım, şükür.",
            ]))

        if ctx.get("in_debt") and mood in ("üzgün", "stresli") and rng.random() < 0.4:
            parts.append("Bir de cep yanıyor, borç bitmez.")
        if ctx.get("struggling") and rng.random() < 0.3:
            parts.append("Kazancım geçime yetmiyor, bu da ayrı dert.")

    elif topic == "hedef":
        goal_meta = GOAL_BY_KEY.get(npc["goal"])
        if goal_meta:
            parts.append(f"Hayatta tek istediğim: {goal_meta['label'].lower()}.")
        gline = goal_line(npc)
        if gline:
            parts.append(gline)

        progress = ctx["goal_progress"]
        if progress < 15:
            parts.append(_pick(rng, [
                "Daha yolun çok başındayım, ama başlamak önemli.",
                "Henüz ufak adımlar. Büyük adımlar gelecek.",
            ]))
        elif progress < 40:
            parts.append(_pick(rng, [
                "Yavaş yavaş ilerliyorum.",
                "Azıcık yol aldım, devam edeceğim.",
            ]))
        elif progress < 70:
            parts.append(_pick(rng, [
                "Yolun yarısı geride.",
                "Ortasına geldim, dönüş yok.",
            ]))
        elif progress < 90:
            parts.append(_pick(rng, [
                "Çok az kaldı, hissediyorum.",
                "Neredeyse bitecek — sabretmek zor.",
            ]))
        else:
            parts.append(_pick(rng, [
                "Neredeyse elimin ucunda — bir adım kaldı.",
                "Hemen hemen oldu. Tanrılar yardım etsin.",
            ]))

        if band in ("dost", "arkadaş"):
            parts.append(_pick(rng, [
                "Belki bir gün bana yardım edersin.",
                "Eline imkân geçerse aklında olsun.",
                "Seni güvenilir biri olarak görüyorum.",
            ]))

        if ctx.get("in_debt") and npc["goal"] in ("zengin_olmak", "borc_odemek"):
            parts.append("Ama borç gölge gibi arkamda, bunu da halletmem lazım.")

    elif topic == "hakkimda":
        # NPC'nin oyuncuya bakışı — ilişki kademesine göre dürüst cevap
        if band == "düşman":
            parts.append(_pick(rng, [
                "Açık konuşayım: senden hiç hazzetmiyorum.",
                "Sana zerre güvenim yok. Yolumdan çekil yeter.",
                "Seni gördüğüme sevindiğimi söyleyemem.",
            ]))
        elif band == "rakip":
            parts.append(_pick(rng, [
                "Sana temkinli yaklaşıyorum, kusura bakma.",
                "Henüz ısınamadım sana; mesafemizi koruyalım.",
                "Niyetini tam çözemedim, o yüzden ölçülüyüm.",
            ]))
        elif band == "nötr":
            parts.append(_pick(rng, [
                "Seni daha yeni tanıyorum, fikrim oturmadı.",
                "Fena birine benzemiyorsun ama göreceğiz.",
                "Şimdilik ne iyi ne kötü — bir yabancısın.",
            ]))
        elif band == "arkadaş":
            parts.append(_pick(rng, [
                "Seni sevdim sayılır, dürüst birine benziyorsun.",
                "Yüzün bana güven veriyor, fena değilsin.",
                "Seninle konuşmak hoşuma gidiyor açıkçası.",
            ]))
        else:  # dost
            parts.append(_pick(rng, [
                "Sana gönülden güvenirim, bunu az insana söylerim.",
                "Senin gibisi nadir bulunur, kıymetini bil.",
                "Dostumsun sayılır — sırtımı sana dönerim.",
            ]))
        if ctx.get("player_feared") and band in ("nötr", "rakip", "arkadaş") and rng.random() < 0.5:
            parts.append(_pick(rng, [
                "Doğrusu senden biraz da çekiniyorum.",
                "Adın korkuyla anılıyor; fark etmemek elde değil.",
            ]))
        elif ctx.get("player_honorable") and rng.random() < 0.4:
            parts.append("Onurlu duruşun belli, bu hoşuma gidiyor.")

    elif topic == "veda":
        if band in ("düşman", "rakip"):
            parts.append(_pick(rng, [
                "Git de bir daha gözüm seni görmesin.",
                "Yolun açık olsun da uzak olsun.",
                "Defol, bir daha karşıma çıkma.",
                "Çek git, zamanımı alma.",
            ]))
        elif band in ("dost", "arkadaş"):
            parts.append(_pick(rng, [
                "Yolun açık olsun, yine bekleriz.",
                "Eyvallah dostum, kendine iyi bak.",
                "Allah'a emanet ol, beklerim seni.",
                "Görüşmek üzere, başın sağ olsun yolculuğunda.",
                "Hoşçakal, bir dahaki gelişini beklerim.",
                "İyi ki uğradın, yine gel.",
            ]))
        elif mood == "öfkeli":
            parts.append(_pick(rng, [
                "Defol, biraz nefes alayım.",
                "Git, vaktim yok.",
                "Şimdilik uzak dur.",
            ]))
        elif mood == "üzgün":
            parts.append(_pick(rng, [
                "Hadi git, ben başımı yere koyayım.",
                "Eyvallah... yalnız kalayım biraz.",
                "Git bakalım, içim karanlık şu an.",
            ]))
        elif mood in ("mutlu", "heyecanlı"):
            parts.append(_pick(rng, [
                "Güle güle dostum, gün güzeldi sayende.",
                "Eyvallah, yine uğra.",
                "Git güle güle, iyi ki geldin.",
            ]))
        else:
            parts.append(_pick(rng, [
                "Hadi eyvallah.",
                "Hoşçakal.",
                "Selametle.",
                "Yolun açık olsun.",
                "Git sağlıcakla.",
                "Görüşmek üzere.",
            ]))

    else:
        parts.append(_pick(rng, [
            "Ne demek istediğini tam anlamadım.",
            "Başka bir konudan mı söz etmek istiyorsun?",
            "Bunu daha açık anlat.",
            "Anlamadım, yeniden söyler misin?",
        ]))

    # ── Evrensel ekler ──────────────────────────────────────────────────

    if player.get("crime", 0) > 40 and band != "dost":
        parts.append(_pick(rng, CRIME_REACTION))

    soc_line = npc_reaction_flavor(player, rng)
    if soc_line and band != "düşman":
        parts.append(soc_line)

    pf = _personality_flavor(rng, npc, band)
    if pf:
        parts.append(pf)

    if repeat_count >= 2 and topic not in ("veda",):
        line = REPEAT_LINES.get(min(repeat_count, 5), REPEAT_LINES[5])
        if line:
            parts.insert(0, line)

    # ── Tutarlılık: NPC 4-6 kopuk cümle DEĞİL, konunun özü + en fazla bir
    #    flavor söylesin. Motor çok parça ekliyordu (savruk his); kısa tut.
    #    proactive (öncül) zaten ayrı baloncukta gösteriliyor, ondan ayrı. ──
    clean = [p for p in parts if p and p.strip()]
    if len(clean) > 2:
        clean = clean[:2]
    return " ".join(clean), proactive

# ─────────────────────────────────────────────
#  DIALOG TOPICLERİ & İLİŞKİ DELTASİ
# ─────────────────────────────────────────────

DIALOG_TOPICS = [
    ("selam", "Selam ver"),
    ("iş", "İşinden bahset"),
    ("aile", "Aileni sor"),
    ("dünya", "Dünyada ne oluyor?"),
    ("hakkimda", "Beni nasıl buluyorsun?"),
    ("üzgün", "Neden üzgünsün?"),
    ("hedef", "Hedefin ne?"),
    ("veda", "Hoşçakal"),
]

def relationship_delta(npc, topic, player, repeat_count):
    # Aynı hafta içinde 7'den az tekrarda ceza yok
    if repeat_count >= 9:
        return -4
    if repeat_count == 8:
        return -2
    if repeat_count == 7:
        return -1

    if topic == "selam":
        base = 1
    elif topic == "aile":
        base = 1 if "konuşkan" in npc["personality"] else 0
    elif topic == "üzgün":
        base = 2 if "merhametli" in npc["personality"] else 1
    elif topic == "hedef":
        base = 1
    elif topic == "veda":
        base = 0
    else:
        base = 0

    if player.get("crime", 0) > 50 and npc["profession"] in ("kral", "lord", "asker"):
        base -= 2
    if player.get("reputation", 0) > 40 and npc["profession"] in ("kral", "lord"):
        base += 1
    if player.get("honor", 0) >= 40 and npc["profession"] in ("kral", "lord", "şövalye", "rahip"):
        base += 1
    if player.get("fear", 0) >= 40 and npc["profession"] in ("haydut", "paralı_asker", "tüccar"):
        base += 1
    if player.get("fame", 0) >= 30:
        base += 1
    if player.get("reputation", 0) < -30 and npc["profession"] not in ("haydut", "hırsız"):
        base -= 1
    return base
