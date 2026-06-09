import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGame } from "@/lib/GameContext";
import { api } from "@/lib/api";
import { toast } from "sonner";
import LifeEventModal from "@/components/LifeEventModal";
import PerkChoiceModal from "@/components/PerkChoiceModal";
import {
  Heart, Apple, Flame, Scroll, AlertTriangle,
  Hourglass, Loader2, Swords, Crown, ChevronRight,
  Shield, Landmark, ChevronDown,
  ChevronUp, User,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────
function reputationLabel(rep) {
  const r = Number(rep) || 0;
  if (r >= 80)  return { label: "Efsane",     color: "text-amber-400" };
  if (r >= 50)  return { label: "Saygın",     color: "text-emerald-400" };
  if (r >= 20)  return { label: "Tanınan",    color: "text-blue-400" };
  if (r >= 0)   return { label: "Tanınmayan", color: "text-stone-400" };
  if (r >= -20) return { label: "Güvenilmez", color: "text-orange-400" };
  return              { label: "Sürgün",     color: "text-red-400" };
}

const PERIODS = [
  { label: "Hafta", weeks: 1,  short: "H" },
  { label: "Ay",    weeks: 4,  short: "A" },
  { label: "Yıl",   weeks: 52, short: "Y" },
];

const EVENT_ICONS = {
  // Hayat olayları
  doğum: "👶", ölüm: "💀", evlilik: "💍", nesil_devri: "🌿", miras: "📜",
  evlilik_teklifi: "💌", çıkma_teklifi: "💘",
  // Dünya
  savaş_ilanı: "⚔️", barış: "🕊️", kıtlık: "🌵", şenlik: "🎉",
  kral_değişimi: "👑", tahta_çıkış: "👑", savaş_zaferi: "🏆",
  faction_savaş: "⚔️", isyan: "🔥", halk_isyanı: "🔥",
  istikrar_artışı: "🌟", lord_düşüşü: "⚠️", yeni_lord: "👑",
  göç: "🚶", kıtlık_etkisi: "🌾", savaş_hareketi: "🗺️",
  // Karakter eylemleri
  çalışma: "🔨", ticaret: "🪙", yolculuk: "🚶", meslek_değişimi: "🔄",
  meslek_edinme: "🎯", kariyer_terfi: "🏆",
  suç: "🗡️", suç_yakalandı: "🚨", hırsızlık: "🤫", cinayet: "🩸",
  hapis: "⛓️", yakalandı: "🚨",
  dedikodu: "🗣️", başlangıç: "🌅",
  // Mektep / çocukluk
  okul: "📚", ders: "📖", kulup: "🎵", aktivite: "🌿", sinav: "📝",
  cocuk_yatirim: "🌱", cocuk_meslek: "🎯",
  // İlişkiler / sosyal
  beceri: "⭐", ilişki: "🤝", iltifat: "🌸", hediye: "🎁",
  para_verme: "💰", hakaret: "😠", kaçırma: "⛓️",
  // Savaş
  savaş_zaferi: "🏆", savaş_kaybı: "💔", savaş_kaçış: "💨",
  // Görevler
  görev_tamamlandı: "✅", görev_başarısız: "❌",
  aile_görevi: "👨‍👩‍👦", aile_görevi_açıldı: "📜", aile_destek: "🤲",
  adaylık: "🏛️", faction_kontrol: "🛡️",
  // Kervan
  kervan: "🐫", kervan_varış: "🏁", kervan_saldırı: "⚔️",
  // Sağlık / durum
  enforcement: "⚖️", starvation_warning: "🍞", misilleme: "😤",
  hastalık: "🤒", iyileşme: "💚",
  rank_bonusu: "💰", ödül: "🎖️", kuşanma: "🛡️", kullanım: "✋",
  vergi_ödeme: "💸", vergi_ödendi: "💸", vergi_gecikme: "⚠️",
  isyan_riski: "🔥", asayis_baskisi: "🚔", asayis_gozaltisi: "⛓️",
  darbe_yaklasıyor: "⚠️", darbe_icra: "⚔️",
  darbe_basarili: "🏆", darbe_basarisiz: "💔",
  haydut_baskını: "💥",
  // Özel
  ozel_olay: "✨",
  // Uyarılar
  _alert_urgent: "🚨", _alert_high: "⚠️", _alert_normal: "💬",
  _world_alert: "🌍", _kriz_alert: "🔥",
};

const EVENT_COLORS = {
  // Hayat
  ölüm: "border-red-500", doğum: "border-emerald-500",
  evlilik: "border-pink-500", nesil_devri: "border-emerald-600",
  miras: "border-violet-500", evlilik_teklifi: "border-pink-400",
  çıkma_teklifi: "border-pink-300",
  // Dünya
  savaş_ilanı: "border-red-600", faction_savaş: "border-red-700",
  savaş_zaferi: "border-amber-500", savaş_kaybı: "border-red-600",
  savaş_kaçış: "border-orange-500", savaş_hareketi: "border-stone-500",
  kral_değişimi: "border-amber-400", tahta_çıkış: "border-amber-400",
  isyan: "border-red-700", halk_isyanı: "border-red-700",
  istikrar_artışı: "border-emerald-600", lord_düşüşü: "border-amber-600",
  yeni_lord: "border-amber-500", göç: "border-stone-500",
  kıtlık: "border-orange-600", kıtlık_etkisi: "border-orange-500",
  barış: "border-sky-500", şenlik: "border-yellow-500",
  // Eylemler
  çalışma: "border-stone-600", ticaret: "border-emerald-700",
  yolculuk: "border-stone-500", meslek_değişimi: "border-blue-600",
  meslek_edinme: "border-blue-500", kariyer_terfi: "border-amber-400",
  // Suç
  suç: "border-red-800", suç_yakalandı: "border-red-700",
  hırsızlık: "border-red-800", cinayet: "border-red-900",
  hapis: "border-red-700", yakalandı: "border-red-700",
  kaçırma: "border-purple-600",
  // Sosyal
  ilişki: "border-sky-500", iltifat: "border-pink-400",
  hediye: "border-amber-400", para_verme: "border-amber-500",
  hakaret: "border-red-500", dedikodu: "border-stone-500",
  misilleme: "border-orange-600",
  // Mektep
  ders: "border-blue-500", kulup: "border-purple-500",
  aktivite: "border-emerald-500", sinav: "border-amber-500",
  okul: "border-blue-500", cocuk_yatirim: "border-emerald-400",
  cocuk_meslek: "border-blue-400",
  // Görevler
  görev_tamamlandı: "border-blue-500", görev_başarısız: "border-red-500",
  aile_görevi: "border-amber-500", aile_görevi_açıldı: "border-amber-400",
  aile_destek: "border-amber-400", adaylık: "border-amber-500",
  faction_kontrol: "border-orange-500",
  // Kervan
  kervan: "border-amber-600", kervan_varış: "border-emerald-600",
  kervan_saldırı: "border-red-600",
  // Sağlık
  hastalık: "border-red-400", iyileşme: "border-emerald-500",
  // Darbe & vergi
  vergi_ödeme: "border-amber-700", vergi_ödendi: "border-amber-700",
  vergi_gecikme: "border-orange-600", isyan_riski: "border-red-600",
  asayis_baskisi: "border-orange-500", asayis_gozaltisi: "border-red-600",
  darbe_yaklasıyor: "border-red-500", darbe_icra: "border-red-700",
  darbe_basarili: "border-amber-500", darbe_basarisiz: "border-red-600",
  // Diğer
  rank_bonusu: "border-amber-400", ödül: "border-amber-500",
  kuşanma: "border-stone-500", kullanım: "border-stone-500",
  haydut_baskını: "border-orange-600", başlangıç: "border-orange-500",
  ozel_olay: "border-amber-400",
  enforcement: "border-amber-700", starvation_warning: "border-orange-700",
  _alert_urgent: "border-red-600", _alert_high: "border-amber-600",
  _alert_normal: "border-stone-600", _world_alert: "border-violet-600",
  _kriz_alert: "border-red-700",
};

// ══════════════════════════════════════════════════════════════════════════
// HİKAYELEŞTİRME — olay tiplerine göre kısa atmosferik açılış cümleleri
// ══════════════════════════════════════════════════════════════════════════
const FLAVOR_LINES = {
  // Mektep & Çocukluk
  ders:            ["Kalem kağıda değdi, zihin açıldı.", "Bugün bir şeyler yapıştı aklına.", "Hoca memnun ayrıldı. Sanırım.", "Bilgi sessizce birikir — farkında bile olmazsın.", "Sabah ezanıyla başlandı, akşam yorgunluğuyla bitti."],
  sinav:           ["Eller ter içindeydi. Nefes tutuldu.", "Kâğıt önünde, tüm bildikler sırada bekliyordu.", "Sınav kâğıdı geldi. Bazı sorular tanıdık, bazıları... hmm.", "Hoca yüzünü okumak imkânsızdı. İyi mi, kötü mü?"],
  kulup:           ["Kapıdan ilk kez girildi. Koku yabancıydı.", "Biri güldü — buz kırıldı.", "İlk gün böyle işte: garip ama heyecanlı."],
  aktivite:        ["Eller kirlendi, alın terledi. İyi bir terlemeydi.", "Bugün kaslar konuştu.", "Yanındakiler daha hızlıydı. Durma sebebi değil."],
  cocuk_yatirim:   ["Birikimi bir amaca yatırıldı.", "Küçük bir kumar — ama kaderine inanmak gerekiyordu."],
  cocuk_meslek:    ["İlk usta-çırak ilişkisi böyle başlar: bir \"Bak, şöyle yapılır\" ile.", "Ellere bakıldı. Belki de doğru meslek bu."],
  okul:            ["Mektep kapısından girildi. Gün başladı.", "Bugün ders, yarın imtihan. Böyle büyünür insan."],
  // Günlük Hayat
  çalışma:         ["Alın teri döküldü.", "İş ağırdı. Ama yarın daha kolay olacak — hep öyle olur.", "Ustanın gözü bir an takıldı. Onay mıydı?", "Günün sonu eller yıkandı. Yeterliydi.", "Çarşı gürültüsü içinde çalışıldı. Kese fark etti."],
  ticaret:         ["Pazarda gözler birkaç kez buluştu. Sonunda anlaşıldı.", "Tüccar kaşını kaldırdı. Sonra güldü — iyi demek.", "Mal gitti, akçe geldi. Dünya böyle döner.", "Kazanmak bazen kimin daha uzun beklediğiyle ölçülür."],
  yolculuk:        ["Yol uzundu. Düşünmeye bol vakit oldu.", "Şehir kapısından geçildi — eski mi, yeni mi?", "Ayaklar yoruldu, ama manzara değerdi.", "İçeride gürültü vardı. Dışarıda sadece yol."],
  meslek_değişimi: ["Eski kapı kapandı. Yenisi aralandı.", "\"Bu defa farklı olacak\" dendi. Belki haklı.", "Yeni elbise henüz vücuda oturmamış — ama oturacak."],
  meslek_edinme:   ["İlk kez bir meslek sahibi olundu. Kulağa güzel geliyor.", "\"Senin işin bu.\" Parmaklar incelendi. Evet, bu işe yarar."],
  kariyer_terfi:   ["Usta omzuna dokundu: \"Hazırsın.\"", "Terfi haberi gelince önce şüpheyle bakıldı. Sonra gülümsendi.", "Yeni rütbe, daha ağır omuzlar — ama daha dik duruş.", "Şehirde adın biraz daha büyüdü."],
  rank_bonusu:     ["Sadakat karşılıksız kalmaz.", "Fraksiyon payı bu hafta da cebe girdi.", "Para kazanmanın en rahat yolu: sadık kalmak."],
  // Savaş & Çatışma
  savaş_zaferi:    ["Toz dağıldı. Hâlâ ayaktasın.", "Rakip yerde. Sen ayakta. Bundan iyisi yok.", "Şehir bunu konuşacak.", "Düşman hızlı geldi — daha hızlı gitti.", "Zafer anlık, hazırlık uzun. Değdi."],
  savaş_kaybı:     ["Ah. Bugün değilmiş.", "Bu acı öğretici bir tür.", "Son hamle gözden kaçtı. Bir dahaki sefere.", "Hayatta kalmak da bir zafer sayılır.", "Bugün hüsran. Ama tarih hep yenilgilerle başlar."],
  savaş_kaçış:     ["Stratejik geri çekilme. Kaçmak değil — kesinlikle.", "Ölümle dans edildi; müzik erken bitti.", "Sağ çıkmak da bir taktiktir.", "Bu savaş kazanılmazdı. Akıl galip geldi."],
  // Suç & Ceza
  suç:             ["Gece karanlığında. Tanık yoktu. Sanırım.", "Risk alındı. Heyecan var — ve biraz pişmanlık.", "Eller titredi. Sonra titremedi. Bu, endişe verici.", "Yapıldı. Geri dönüşü yok."],
  suç_yakalandı:   ["\"Dur!\" sesi her şeyi dondurdu.", "Yakalandı. En kötüsü: beklenen bir andı.", "\"Ben mi?\" yüz ifadesi takıldı yüze. İşe yaramadı."],
  hırsızlık:       ["El hızlı hareket etti, göz kırpmadan.", "Pazar kalabalığı iyi bir perde oldu. Bu sefer.", "Küçük bir şeydi. Ama ağırlığı büyük hissettiriyor."],
  hapis:           ["Demir kapı kapandı. Sessizlik bastı.", "Düşünmeye bol vakit var artık.", "Bu da geçer. Geçmek zorunda."],
  cinayet:         ["Geri dönülmez bir çizgi geçildi.", "Kan soğuduktan sonra ellere bakıldı uzun süre."],
  yakalandı:       ["Kaçacak yer kalmadı.", "Öngörülmüş bir sondı. Ama yine de acıttı."],
  // Sosyal & İlişki
  iltifat:         ["Beklenmedik bir an.", "İltifat basitti. Ama o gün içinde bir şey ısındı.", "\"Sen farklısın\" denildi. İyi farklı."],
  hediye:          ["Küçük bir paket, büyük bir anlam.", "\"Al\" dedi sadece. Hiç açıklama yapmadı.", "Bu jest hatırlarda kalacak."],
  para_verme:      ["Akçe el değiştirdi. İlişki kaldı — daha sağlam.", "\"İşte\" denildi. Doğruydu."],
  evlilik:         ["İki hayat birleşti. Kolay değildi — değmezdi zaten.", "Yemin edildi. Şahitler vardı. Gökyüzü de.", "Bu bağ, kader mi yoksa seçim mi? Her ikisi."],
  evlilik_teklifi: ["Kalp hızlandı. Kelimeler güçlükle çıktı.", "En cesur an bu muydu? Belki evet."],
  // Hayat Döngüsü
  doğum:           ["Dünyaya yeni bir ses geldi.", "Küçük bir ağlama sesi — her şeyin başlangıcı.", "Hayat devam ediyor. Yeni bir sayfayla."],
  ölüm:            ["Bir mum söndü.", "Geride ne kaldı? Anılar. Ve boşluk.", "Ölüm herkesin kapısına gelir — bugün başka bir kapıya vurdu."],
  nesil_devri:     ["Bir çağ kapandı, yenisi açıldı.", "Miras sadece toprakta değil, kanda da taşınır."],
  miras:           ["Geçmişten gelen bir el uzandı.", "Bu miras hak mı, yük mü? Zamanla anlaşılır."],
  // Görevler & Aile
  görev_tamamlandı:["İş bitti. Tam ve eksiksiz.", "Söz verildi, tutuldu. Bu basit görünür — değil.", "Vaaat tutuldu. Nadirdir."],
  görev_başarısız: ["Her şey yolundaydı. Ta ki gitmeyene kadar.", "Bugün ders alındı. Bedavaya değil."],
  aile_görevi:     ["Aile işi, başka işlerden farklıdır. Reddedilemez.", "Kan bağı bazen zincir gibi, bazen kanat gibi hissettirir."],
  aile_destek:     ["Aile, hesap sormadan uzandı.", "\"Senden başka kimsem yok\" demek gerekmedi — zaten biliniyordu."],
  // Kervan
  kervan:          ["Kervan yola çıktı. Yük ağır, yol belirsiz, umut yerinde.", "Deve sıralarında mal yüklenirken hesaplar yapıldı."],
  kervan_varış:    ["Kervan hedefe ulaştı. Değdi.", "Mal teslim edildi, para alındı. Bir sonrakine."],
  kervan_saldırı:  ["Yolda beklenmedik misafirler. Silahlı ve aceleci.", "Haydutlar iyi seçmiş: yolun en ıssız noktasını."],
  // Fraksiyon & Yönetim
  faction_kontrol: ["Nüfuz sessizce büyür. Bugün biraz daha büyüdü.", "Fraksiyon içinde bir yer daha sağlamlaştı. Kimse fark etmedi. Henüz."],
  adaylık:         ["Ad öne sürüldü. Geri alınamaz artık.", "Aday olmak cesaret ister. Bugün gösterildi."],
  darbe_yaklasıyor:["Plan olgunlaşıyor. Sabır da bir silah.", "Geri sayım başladı. Kimse adını bilmiyor henüz."],
  darbe_basarili:  ["Sabah uyandığında güç el değiştirmişti.", "\"İmkânsız\" diyenler yanılmıştı. Kanıtlandı.", "Yıllar süren hazırlık, bir gecede meyvesini verdi."],
  darbe_basarisiz: ["Plan bir noktada çöktü. Ve her şey onunla birlikte.", "Bazı riskler büyük bedel ödetir. Bu onlardan biriydi."],
  // Vergi & Asayiş
  vergi_ödendi:    ["Para gitti. Ağrıdı. Ama asker geceleri kapıda beklemiyor — şimdilik.", "\"Devletin hakkı\" verildi. İsteksizce de olsa."],
  vergi_gecikme:   ["Vergi ödenmedi. Bu notlar birikmez diyenler yanılmış.", "Akçe yoktu. Bu özür sayılmaz, ama gerçek."],
  asayis_baskisi:  ["\"Dur!\" Duruldu. Cüzdan ağırlaştı, onur... kısmen.", "Suç kaydının bu kadar hızlı yayılacağı tahmin edilmemişti."],
  asayis_gozaltisi:["Zindanın havası bambaşka.", "Gözaltı süreci tamamlandı. Bundan ders çıkarılmadıysa, hazırlıklı ol."],
  // Sağlık
  iyileşme:        ["Bir sabah: \"Daha iyi hissediyorum.\" Küçük, ama gerçek.", "Vücut yavaş yavaş geri dönüyor.", "İyi haber: bugün dün kadar kötü değil."],
  hastalık:        ["Yataktan kalkmak güç.", "Vücut bazen bedelini ister. Bugün talep geldi.", "Hasta olmak; hayatın geri kalanının değerini hatırlatır."],
  // Dünya Olayları
  şenlik:          ["Şehir bugün güldü.", "Davullar çaldı, insanlar toplandı. Kötü günler bir gün ertelendi.", "Şenlik bitince her şey eskiye dönecek. Ama bu an gerçekti."],
  isyan:           ["Bir lord sabaha karşı bayrak kaldırdı.", "İstikrar sarsıldı. Bu tür sarsıntılar habersiz gelir."],
  halk_isyanı:     ["Halk sokaklara döküldü. Sesler birleşince duyulur.", "Öfke uzun süredir birikiyor. Bugün taştı."],
  kıtlık:          ["Ekmek fiyatı dün ikiydi, bugün üç.", "Ambar kapıları kapandı. Şehir içine çekildi."],
  haydut_baskını:  ["Şehrin dışından atlar geliyor. İyi niyet aramayın.", "Haydutlar seçti: bu köy, bu gece. Şans işte."],
  tahta_çıkış:     ["Yeni bir el taç giydi. Eski denge değişti.", "Tahta oturmak kolaydır. Oturmaya devam etmek — asıl mesele."],
  kral_değişimi:   ["Kral öldü — yaşasın kral. Belirsizlik asılı kaldı.", "Yeni dönem başlıyor. Hayırlısı."],
  savaş_ilanı:     ["Elçi dönmedi. Bu, savaş demek.", "Haberci soluk soluğa kapıya dayandı. Haber kötüydü."],
  barış:           ["Silahlar bırakıldı. Herkes kazandığını sandı. Herkes kaybetti de biraz.", "Savaş bitti. Şimdi daha zor iş: birlikte yaşamak."],
  // Stat sentetik olaylar
  enforcement:     ["Yetkililer harekete geçti.", "Bir hatırlatma geldi. Ciddiye alınmalı."],
};

function getFlavorText(event) {
  if (!event?.type) return null;
  if (event.type.startsWith("_")) return null;   // uyarılar hikayeleştirilmez
  // narrative alanı varsa FLAVOR_LINES kullanma — EventCard ayrı gösterecek
  if (event.narrative) return null;
  if (event._synthetic && !FLAVOR_LINES[event.type]) return null;
  const lines = FLAVOR_LINES[event.type];
  if (!lines || lines.length === 0) return null;
  const seed = ((event.day || 0) + (event.text?.length || 0)) % lines.length;
  return lines[seed < 0 ? 0 : seed];
}

const KARAKTER_TYPES = new Set([
  // Hayat olayları
  "doğum", "ölüm", "evlilik", "nesil_devri", "miras",
  "evlilik_teklifi", "çıkma_teklifi",
  // Günlük eylemler
  "çalışma", "ticaret", "yolculuk", "meslek_değişimi", "meslek_edinme",
  "kariyer_terfi", "rank_bonusu", "ödül",
  // Mektep / çocukluk
  "okul", "ders", "kulup", "aktivite", "sinav",
  "cocuk_yatirim", "cocuk_meslek",
  // Sosyal / ilişki
  "beceri", "ilişki", "iltifat", "hediye", "para_verme",
  "hakaret", "dedikodu", "başlangıç",
  // Suç & ceza
  "suç", "suç_yakalandı", "hırsızlık", "cinayet",
  "hapis", "yakalandı", "kaçırma", "misilleme",
  // Savaş (oyuncu perspektifli)
  "savaş_zaferi", "savaş_kaybı", "savaş_kaçış",
  // Görevler
  "görev_tamamlandı", "görev_başarısız",
  "aile_görevi", "aile_görevi_açıldı", "aile_destek",
  // Kervan
  "kervan", "kervan_varış", "kervan_saldırı",
  // Faction & yönetim
  "adaylık", "faction_kontrol",
  // Sağlık
  "iyileşme", "hastalık",
  // Darbe & güvenlik
  "asayis_baskisi", "asayis_gozaltisi",
  "darbe_yaklasıyor", "darbe_icra", "darbe_basarili", "darbe_basarisiz",
  // Vergi
  "vergi_ödeme", "vergi_ödendi", "vergi_gecikme", "isyan_riski",
  // Ekipman
  "kuşanma", "kullanım",
  // Özel & uyarılar
  "ozel_olay", "starvation_warning", "enforcement",
  "_alert_urgent", "_alert_high", "_alert_normal",
  "haydut_baskını",
]);

const DUNYA_TYPES = new Set([
  "savaş_ilanı", "barış", "kıtlık", "kıtlık_etkisi", "şenlik",
  "kral_değişimi", "tahta_çıkış", "savaş_zaferi", "savaş_hareketi",
  "faction_savaş", "ittifak", "isyan", "halk_isyanı",
  "istikrar_artışı", "lord_düşüşü", "yeni_lord", "göç",
  "vergi_artışı", "vergi_indirimi", "savunma_yatırımı",
  "isyan_bastırma", "haydut_baskını",
  "_world_alert", "_kriz_alert",
]);

// ── HERO SAHNE SİSTEMİ ───────────────────────────────────────────────────
// Görsel adları: /images/hero/{yaşGrubu}_{mevsim}.jpg
// Mevcut görseller: cocuk_ilkbahar, cocuk_yaz, cocuk_sonbahar, cocuk_kis
// Yeni yaş grubu görselleri eklendikçe availableAgeGroups'a ekle

const SEASON_KEY_MAP = {
  "İlkbahar": "ilkbahar",
  "Yaz":      "yaz",
  "Sonbahar": "sonbahar",
  "Kış":      "kis",
};

const SEASON_TOP_GRADIENT = {
  "İlkbahar": "from-emerald-950/65 via-emerald-950/20 to-transparent",
  "Yaz":      "from-amber-950/55 via-amber-950/15 to-transparent",
  "Sonbahar": "from-orange-950/70 via-orange-950/20 to-transparent",
  "Kış":      "from-slate-950/80 via-slate-950/25 to-transparent",
};

// Hangi yaş grubu görsellerinin hazır olduğunu buradan yönet
const AVAILABLE_AGE_GROUPS = ["cocuk"]; // genişledikçe: "genc", "yetiskin", "yasli"

function getHeroImage(age, season) {
  const ageGroup = age >= 50 ? "yasli"
                : age >= 18 ? "yetiskin"
                : age >= 13 ? "genc"
                : "cocuk";
  const seasonKey    = SEASON_KEY_MAP[season] || "kis";
  const resolvedAge  = AVAILABLE_AGE_GROUPS.includes(ageGroup) ? ageGroup : "cocuk";
  return `/images/hero/${resolvedAge}_${seasonKey}.jpg`;
}

function HeroScene({ player, cal, rep }) {
  const age     = player?.age || 7;
  const season  = cal?.season || "Kış";
  const heroSrc = getHeroImage(age, season);
  const topGrad = SEASON_TOP_GRADIENT[season] || SEASON_TOP_GRADIENT["Kış"];

  return (
    <div
      className="relative w-full shrink-0 overflow-hidden"
      style={{ height: "56vw", maxHeight: "320px", minHeight: "220px" }}
    >
      {/* ─ Görsel ─ */}
      <img
        src={heroSrc}
        alt={`${season} manzarası`}
        className="absolute inset-0 w-full h-full object-cover object-center select-none"
        draggable={false}
      />

      {/* ─ Üst koyu geçiş ─ */}
      <div className={`absolute inset-0 bg-gradient-to-b ${topGrad} pointer-events-none`} />

      {/* ─ Alt koyu geçiş — daha derin, stat pill satırını kaplar ─ */}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/65 to-transparent pointer-events-none" />

      {/* ─ Üst katman: isim + tarih (sol) · itibar badge (sağ) ─ */}
      <div className="absolute top-0 left-0 right-0 flex items-start justify-between px-3 pt-3">
        {/* Sol: isim + yaş */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="font-heading text-[19px] text-amber-100 leading-none tracking-wide"
              style={{ textShadow: "0 2px 14px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.7)" }}
            >
              {player?.name || "İsimsiz"}
            </h1>
            {player?.is_child && (
              <span className="text-[9px] text-amber-400 font-heading border border-amber-600/50 bg-black/55 backdrop-blur-sm px-1.5 py-0.5 tracking-widest">
                ÇOCUK
              </span>
            )}
          </div>
          <div
            className="text-[11px] text-stone-300/85 mt-1 font-heading tracking-wide"
            style={{ textShadow: "0 1px 6px rgba(0,0,0,0.95)" }}
          >
            📅 {age} yaş &nbsp;·&nbsp; {cal?.season} &nbsp;·&nbsp; {cal?.month_name} {cal?.year}
          </div>
        </div>

        {/* Sağ: itibar rozeti — mockup tarzı kutu */}
        <div className="shrink-0 ml-2 flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-stone-600/30 rounded-sm px-2.5 py-1.5">
          <div className="w-7 h-7 rounded-full bg-stone-800/80 border border-stone-600/50 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-right">
            <div className={`font-heading text-[11px] tracking-wider uppercase ${rep.color}`}
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.9)" }}>
              {rep.label}
            </div>
            <div className="text-[10px] text-stone-400/80 font-heading tabular-nums">
              {player?.reputation || 0}
            </div>
          </div>
        </div>
      </div>

      {/* ─ Alt katman: stat pills — tam satır, 4 eşit genişlik ─ */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
        <div className="flex items-stretch gap-1.5">
          <StatPill glass label="SAĞLIK"  icon={Heart}  value={player?.health || 0}      warn={(player?.health || 0) < 25}   color="text-red-400" />
          <StatPill glass label="TOKLUK"  icon={Apple}  value={player?.hunger ?? 100}     warn={(player?.hunger ?? 100) < 25} color="text-orange-400" />
          <StatPill glass label="AKÇE"    icon={Flame}  value={`${player?.money || 0}A`}                                      color="text-amber-400" />
          <StatPill glass label="TANINMA" icon={Crown}  value={player?.reputation || 0}                                        color="text-stone-300" />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// label= varsa hero-style dikey pill (büyük sayı + alt etiket), yoksa kompakt yatay pill
function StatPill({ icon: Icon, value, warn = false, color = "text-stone-300", glass = false, label = null }) {
  if (glass && label) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center gap-0.5 px-1.5 py-2 rounded-sm border backdrop-blur-sm ${
        warn
          ? "bg-red-950/65 border-red-700/55"
          : "bg-black/50 border-stone-600/30"
      }`}>
        <div className="flex items-center gap-1">
          <Icon className={`w-3 h-3 shrink-0 ${warn ? "text-red-400" : "text-amber-500"}`} />
          <span className={`text-[13px] font-heading tabular-nums leading-none ${warn ? "text-red-300" : color}`}>{value}</span>
        </div>
        <span className="text-[8px] text-stone-500 font-heading tracking-widest uppercase mt-0.5">{label}</span>
      </div>
    );
  }
  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-sm border ${
      warn
        ? "bg-red-950/60 border-red-700/60 backdrop-blur-sm"
        : glass
          ? "bg-black/45 border-stone-600/40 backdrop-blur-sm"
          : "bg-amber-950/20 border-amber-900/30"
    }`}>
      <Icon className={`w-3 h-3 shrink-0 ${warn ? "text-red-400" : glass ? "text-amber-500" : "text-amber-800"}`} />
      <span className={`text-[11px] font-heading tabular-nums ${warn ? "text-red-300" : color}`}>{value}</span>
    </div>
  );
}

// BitLife tarzı olay kartı — icon kutusu, zaman damgası, sağda ok
function EventCard({ event, pinned = false, fresh = false, timeAgo = null }) {
  const icon    = EVENT_ICONS[event?.type]  || "📜";
  const color   = EVENT_COLORS[event?.type] || "border-stone-700";
  const isAlert = event?.type?.startsWith("_alert");
  const isWorld = event?.type === "_world_alert";
  const isKriz  = event?.type === "_kriz_alert";
  const flavor   = getFlavorText(event);
  // Narrative: zengin, kişisel, bağlamsal metin (narrative_engine'den)
  const narrative = event?.narrative || null;

  const mainTextColor = fresh
    ? "text-emerald-100"
    : isAlert ? "text-amber-200"
    : isWorld ? "text-violet-200"
    : isKriz  ? "text-red-300"
    : "text-stone-200";

  const rowBg = fresh  ? "bg-emerald-950/10"
    : pinned && !fresh ? "bg-amber-950/10"
    : isAlert          ? "bg-red-950/10"
    : isWorld          ? "bg-violet-950/10"
    : isKriz           ? "bg-red-950/20"
    : "";

  const iconBoxBg = fresh  ? "bg-emerald-950/60 border-emerald-800/40"
    : isAlert              ? "bg-amber-950/60 border-amber-800/40"
    : isWorld              ? "bg-violet-950/60 border-violet-800/40"
    : isKriz               ? "bg-red-950/60 border-red-800/40"
    : "bg-stone-800/70 border-stone-700/40";

  const badgeEl = fresh ? (
    <span className="text-[9px] text-emerald-500 font-heading tracking-wider uppercase">YENİ</span>
  ) : pinned && !fresh ? (
    <span className={`text-[9px] font-heading tracking-wider uppercase ${
      isKriz || isAlert ? "text-red-400" : "text-amber-600"
    }`}>AKTİF</span>
  ) : null;

  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-stone-800/30 border-l-4 ${color} ${rowBg}`}>

      {/* İkon kutusu */}
      <div className={`w-8 h-8 shrink-0 rounded-sm flex items-center justify-center text-sm border ${iconBoxBg}`}>
        {icon}
      </div>

      {/* Ana içerik */}
      <div className="flex-1 min-w-0">
        {narrative ? (
          <p className={`text-[13px] leading-snug ${mainTextColor}`}>{narrative}</p>
        ) : (
          <>
            <p className={`text-[13px] leading-snug ${mainTextColor}`}>{event?.text || "Bilinmeyen olay"}</p>
            {flavor && (
              <p className="text-[11px] leading-snug mt-0.5 italic text-stone-500">{flavor}</p>
            )}
          </>
        )}
        {narrative && event?.text && (
          <p className="text-[10px] text-stone-700 mt-0.5 leading-snug">{event.text}</p>
        )}
        {badgeEl && <div className="mt-0.5">{badgeEl}</div>}
      </div>

      {/* Zaman damgası + ok */}
      <div className="shrink-0 flex items-center gap-0.5 text-stone-600">
        {timeAgo && (
          <span className="text-[10px] font-heading text-stone-500 tabular-nums">{timeAgo}</span>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-stone-700 shrink-0" />
      </div>
    </div>
  );
}


// ── Anlık Eylem Paneli (BitLife tarzı: eylemden hemen sonra görünür) ────
function FreshEventsPanel({ events, onDismiss }) {
  if (!events || events.length === 0) return null;
  return (
    <div className="border-b border-emerald-900/50 bg-emerald-950/15 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <div>
            <div className="font-heading text-emerald-400 text-xs tracking-wider">SON EYLEM</div>
            <div className="text-[10px] text-stone-500">{events.length} yeni olay</div>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-stone-600 hover:text-stone-400 text-lg leading-none px-1"
        >×</button>
      </div>
      <div className="divide-y divide-emerald-950/60 border-t border-emerald-900/30">
        {events.map((ev, i) => (
          <EventCard key={`fresh-${i}`} event={ev} pinned={false} fresh timeAgo={i === 0 ? "Yeni" : null} />
        ))}
      </div>
    </div>
  );
}

// Yıl özeti kartı
function YearSummaryCard({ summary, onDismiss }) {
  const [open, setOpen] = useState(false);
  const counts = {};
  for (const ev of summary.events) {
    counts[ev.type] = (counts[ev.type] || 0) + 1;
  }
  const highlights = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, n]) => `${EVENT_ICONS[type] || "📜"} ${n}x ${type.replace(/_/g, " ")}`);
  const topEvents = summary.events
    .filter(ev => ["ölüm", "evlilik", "savaş_ilanı", "savaş_zaferi", "kral_değişimi", "nesil_devri"].includes(ev.type))
    .slice(0, 4);

  return (
    <div className="border-b border-stone-800 bg-amber-950/10">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌟</span>
          <div>
            <div className="font-heading text-amber-400 text-xs tracking-wider">YIL ÖZETİ</div>
            <div className="text-[10px] text-stone-500">{summary.totalWeeks} hafta • {summary.events.length} olay</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen(o => !o)} className="text-[10px] text-stone-500 hover:text-stone-300 font-heading tracking-wider">
            {open ? "KAPAT" : "DETAY"}
          </button>
          <button onClick={onDismiss} className="text-stone-700 hover:text-stone-400 text-lg leading-none">×</button>
        </div>
      </div>
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {highlights.map((h, i) => (
          <span key={i} className="text-[10px] text-stone-400 bg-stone-900 px-2 py-0.5 rounded-sm">{h}</span>
        ))}
      </div>
      {open && topEvents.length > 0 && (
        <div className="border-t border-stone-800 divide-y divide-stone-900">
          {topEvents.map((ev, i) => <EventCard key={i} event={ev} />)}
        </div>
      )}
    </div>
  );
}

// Faction/Yönetici özet satırı — kompakt, sadece rozet gibi
const FACTION_TYPE_LABELS = {
  krallık_ordusu:    "Krallık Ordusu",
  tuccar_loncasi:    "Tüccar Loncası",
  zanaatkar_loncasi: "Zanaatkar Loncası",
  paralı_asker:      "Paralı Asker",
  ilim_cemiyeti:     "İlim Cemiyeti",
  sifaci_birligi:    "Şifacı Birliği",
  dini_tarikat:      "Dini Tarikat",
  oyuncu_kumpanya:   "Seyyah Kumpanya",
  eskiya_cetesi:     "Eşkıya Çetesi",
  gizli_cemiyet:     "Gizli Cemiyet",
};

// ─────────────────────────────────────────────────────────────────────────
// HAYATİN paneli — mockup'taki sol panel, hero'nun hemen altında
const SKILL_LABELS_TR = { combat: "Dövüş", trade: "Ticaret", crafting: "El Sanatı", social: "Sosyal" };
const GOAL_LABELS_TR = {
  "büyümek":      "Büyü, öğren ve kendi hikayeni yaz.",
  "toprak_sahibi":"Toprak ve mülk edin.",
  "zengin":       "Servet ve refah kazan.",
  "şöhret":       "Adını tarihe yazdır.",
  "güçlü":        "Güç ve nüfuz kazan.",
};

function LifePanel({ player, state }) {
  const npcs = state?.world?.npcs || [];
  const parentNpcs = (player?.parent_ids || []).map(pid => npcs.find(n => n.id === pid)).filter(Boolean);
  const mother = parentNpcs.find(n => n.gender === "kadın") || parentNpcs.find(n => n.gender === "female");
  const father = parentNpcs.find(n => n !== mother) || parentNpcs[0];

  const currentLoc = (state?.world?.locations || []).find(l => l.id === player?.location_id);

  const topSkills = Object.entries(player?.skills || {})
    .filter(([, v]) => v > 15)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([k]) => SKILL_LABELS_TR[k] || k);

  const goalText = GOAL_LABELS_TR[player?.goal] || player?.goal || "Henüz belirsiz.";

  return (
    <div className="shrink-0 border-b border-stone-800/50 bg-gradient-to-b from-stone-950/60 to-stone-950/30">
      <div className="px-3.5 pt-2.5 pb-2">
        {/* Başlık */}
        <div className="flex items-center gap-2 mb-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-900/40" />
          <span className="text-[9px] font-heading text-amber-700/70 tracking-[0.25em] uppercase">Hayatın</span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-900/40" />
        </div>

        {/* 2 sütun grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {/* AİLEN */}
          <div className="flex items-start gap-1.5 min-w-0">
            <span className="text-sm shrink-0">👨‍👩‍👦</span>
            <div className="min-w-0">
              <div className="text-[8px] text-stone-600 font-heading tracking-widest uppercase">Ailen</div>
              <div className="text-[11px] text-stone-300 leading-snug">
                {mother?.name
                  ? <><span className="text-stone-500">Anne:</span> {mother.name.split(" ")[0]}</>
                  : <span className="text-stone-600 italic">Bilinmiyor</span>}
              </div>
              {father && (
                <div className="text-[11px] text-stone-300 leading-snug">
                  <span className="text-stone-500">Baba:</span> {father.name.split(" ")[0]}
                </div>
              )}
            </div>
          </div>

          {/* YAŞADIĞIN YER */}
          <div className="flex items-start gap-1.5 min-w-0">
            <span className="text-sm shrink-0">🏠</span>
            <div className="min-w-0">
              <div className="text-[8px] text-stone-600 font-heading tracking-widest uppercase">Yaşadığın Yer</div>
              <div className="text-[11px] text-stone-300 leading-snug truncate">
                {currentLoc?.name || <span className="text-stone-600 italic">Bilinmiyor</span>}
              </div>
              {currentLoc?.type && (
                <div className="text-[9px] text-stone-600 capitalize">{currentLoc.type}</div>
              )}
            </div>
          </div>

          {/* MESLEĞİN */}
          <div className="flex items-start gap-1.5 min-w-0">
            <span className="text-sm shrink-0">⚒️</span>
            <div className="min-w-0">
              <div className="text-[8px] text-stone-600 font-heading tracking-widest uppercase">Mesleğin</div>
              <div className="text-[11px] text-stone-300 leading-snug">
                {player?.profession
                  ? <span className="capitalize">{player.profession}</span>
                  : <span className="text-stone-600 italic">Henüz bir mesleğin yok</span>}
              </div>
            </div>
          </div>

          {/* BECERİLERİN */}
          <div className="flex items-start gap-1.5 min-w-0">
            <span className="text-sm shrink-0">⭐</span>
            <div className="min-w-0">
              <div className="text-[8px] text-stone-600 font-heading tracking-widest uppercase">Becerilerin</div>
              <div className="text-[11px] text-stone-300 leading-snug">
                {topSkills.length > 0
                  ? topSkills.join(", ")
                  : <span className="text-stone-600 italic">Henüz keşfedilmedi</span>}
              </div>
            </div>
          </div>
        </div>

        {/* HAYAT HEDEFİN — amber vurgulu alt bant */}
        <div className="mt-2.5 pt-2 border-t border-stone-800/50 flex items-start gap-1.5">
          <span className="text-sm shrink-0">🎯</span>
          <div>
            <div className="text-[8px] text-amber-700/80 font-heading tracking-widest uppercase mb-0.5">Hayat Hedefin</div>
            <p className="text-[11px] text-amber-400/75 leading-snug">{goalText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusStrip({ player, world }) {
  const factionId = player?.faction_id;
  const factions  = world?.factions || [];
  const myFac     = factions.find((f) => f.id === factionId);
  const governances = world?.governances || [];
  const myGov       = governances.find((g) => g.governor_id === "PLAYER");
  const govLoc      = myGov ? (world?.locations || []).find((l) => l.id === myGov.location_id) : null;

  if (!myFac && !myGov) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-800/60 bg-stone-950/40 overflow-x-auto">
      {myFac && (() => {
        const rankTable  = myFac.rank_table || [];
        const playerRank = player?.faction_rank ?? 0;
        const rankName   = rankTable[playerRank] || "—";
        return (
          <Link to="/oyun/karakter" className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity">
            <Shield className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] text-stone-400 font-heading">{myFac.name}</span>
            <span className="text-[10px] text-amber-400 font-heading">· {rankName}</span>
          </Link>
        );
      })()}
      {myFac && myGov && <span className="text-stone-700 text-xs shrink-0">|</span>}
      {myGov && govLoc && (
        <Link to="/oyun/karakter" className="flex items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity">
          <Landmark className="w-3 h-3 text-amber-500" />
          <span className="text-[10px] text-stone-400 font-heading">{myGov.governor_title}</span>
          <span className="text-[10px] text-stone-500 font-heading">· {govLoc.name}</span>
          {myGov.governor_legitimacy < 40 && (
            <AlertTriangle className="w-3 h-3 text-red-400 ml-0.5" />
          )}
        </Link>
      )}
      <Link to="/oyun/karakter" className="ml-auto shrink-0 text-[9px] text-stone-600 hover:text-stone-400 font-heading tracking-wider">
        DETAY →
      </Link>
    </div>
  );
}

// Dünya savaş durumu özeti (Dünya tabı feed'inde gösterilecek)
function buildWorldAlertEvents(state) {
  const kingdoms = state?.world?.kingdoms || [];
  const factions = state?.world?.factions || [];
  const history  = Array.isArray(state?.history) ? state.history : [];
  const events   = [];

  const seen = new Set();
  for (const k of kingdoms.filter(k => k.at_war_with?.length > 0)) {
    for (const eid of (k.at_war_with || [])) {
      const key = [k.id, eid].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        const enemy = kingdoms.find(x => x.id === eid);
        if (enemy) events.push({ type: "_world_alert", text: `${k.name} ⚔️ ${enemy.name} savaşı sürüyor.`, _pinned: true });
      }
    }
  }
  const seenF = new Set();
  for (const f of factions.filter(f => f.at_war_with?.length > 0)) {
    for (const eid of (f.at_war_with || [])) {
      const key = [f.id, eid].sort().join("-");
      if (!seenF.has(key)) {
        seenF.add(key);
        const enemy = factions.find(x => x.id === eid);
        if (enemy) events.push({ type: "_world_alert", text: `${f.name} ⚔️ ${enemy.name} çatışması devam ediyor.`, _pinned: true });
      }
    }
  }
  const lastCrown = [...history].reverse().find(e => e.type === "kral_değişimi" || e.type === "tahta_çıkış");
  if (lastCrown) events.push({ type: "_world_alert", text: lastCrown.text, _pinned: true });

  return events;
}

// ── main ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { state, advance, lastWorldEvent, clearWorldEvent, freshEvents, clearFreshEvents } = useGame() || {};
  const navigate = useNavigate();
  const [advancing, setAdvancing]             = useState(false);

  const [selectedPeriod, setSelectedPeriod]   = useState(PERIODS[0]);
  const [advProgress, setAdvProgress]         = useState(null);
  const [yearSummary, setYearSummary]         = useState(null);
  const [showLifeEvent, setShowLifeEvent]     = useState(false);
  const [showPerkChoice, setShowPerkChoice]   = useState(false);
  const [syntheticEvents, setSyntheticEvents] = useState([]);
  const [historyStartIdx, setHistoryStartIdx] = useState(-1);
  const [historyInitialized, setHistoryInitialized] = useState(false);
  const [eventFilter, setEventFilter]         = useState("karakter");

  const player = state?.player || {};
  const cal    = state?.calendar || { season: "Bilinmiyor", month_name: "", year: 0 };
  const rep    = reputationLabel(player?.reputation || 0);

  // İlk yüklemede son 25 olay
  useEffect(() => {
    if (state && !historyInitialized) {
      const len = (state?.history || []).length;
      setHistoryStartIdx(Math.max(0, len - 25));
      setHistoryInitialized(true);
    }
  }, [state, historyInitialized]);

  const safeHistoryLen = (state?.history || []).length;
  useEffect(() => {
    if (!advancing && historyInitialized && historyStartIdx >= 0) {
      setHistoryStartIdx(prev => Math.min(prev, Math.max(0, safeHistoryLen - 1)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeHistoryLen]);

  // Aktif görevler & fırsatlar
  const activeQuests = (state?.quests || []).filter(q => ["açık", "kabul_edildi"].includes(q.status));
  const acceptedOpps = (state?.opportunities || []).filter(o => o.status === "kabul_edildi");
  const currentTurn  = state?.turn ?? 0;
  const criticalOpps = (state?.opportunities || []).filter(o =>
    o.status === "açık" && o.expires_at != null && (o.expires_at - currentTurn) <= 1
  );

  // Uyarıları feed'e gömülü olay olarak üret
  const alertEvents = [];
  if ((player?.health ?? 100) < 25)
    alertEvents.push({ type: "_alert_urgent", text: "❤️ Sağlığın kritik! Dinlen veya tedavi ol.", _pinned: true });
  if ((player?.hunger ?? 100) < 25)
    alertEvents.push({ type: "_alert_urgent", text: "🍞 Çok acıktın. Yemezsen güçten düşersin.", _pinned: true });
  if ((player?.crime  ?? 0)   > 60)
    alertEvents.push({ type: "_alert_high",   text: "⚖️ Suç puanın yüksek. Yetkililer seni izliyor.", _pinned: true });
  if (criticalOpps.length > 0)
    alertEvents.push({ type: "_alert_urgent", text: `⏳ ${criticalOpps.length} fırsat bu hafta kapanıyor — kaçırma!`, _pinned: true });
  if (acceptedOpps.length > 0)
    alertEvents.push({ type: "_alert_normal", text: `⚡ ${acceptedOpps.length} üstlenilmiş fırsat seni bekliyor.`, _pinned: true });
  if (activeQuests.some(q => q.status === "kabul_edildi"))
    alertEvents.push({ type: "_alert_normal", text: "✅ Devam eden görevin var. Bitirmeyi unutma.", _pinned: true });

  // Dünya durum olayları (Dünya tabı için)
  const worldAlertEvents = buildWorldAlertEvents(state);

  // Aktif dünya olayları (state'den, banner yerine feed'e)
  const activeWorldEventsFromState = (state?.world_events || []).filter(ev => ev.active);
  const worldEventFeedItems = activeWorldEventsFromState.map(ev => ({
    type: "_world_alert",
    text: `${ev.headline} — ${ev.location_name}`,
    _pinned: true,
  }));

  // Olay geçmişi filtreleme
  const safeHistory = Array.isArray(state?.history) ? state.history : [];
  const playerFamilyNames = new Set();
  if (player?.name) playerFamilyNames.add(player.name);
  if (player?.spouse_id) {
    const spouseNpc = (state?.world?.npcs || []).find(n => n.id === player.spouse_id);
    if (spouseNpc?.name) playerFamilyNames.add(spouseNpc.name);
  }
  if (player?.parent_ids?.length) {
    player.parent_ids.forEach(pid => {
      const p = (state?.world?.npcs || []).find(n => n.id === pid);
      if (p?.name) playerFamilyNames.add(p.name);
    });
  }

  const periodEvents = historyStartIdx >= 0
    ? safeHistory.slice(historyStartIdx)
    : safeHistory.slice(-25);

  const isFamilyRelated = (ev) => {
    if (["doğum", "ölüm", "evlilik"].includes(ev.type)) {
      if (playerFamilyNames.size === 0) return true;
      return [...playerFamilyNames].some(name => (ev.text || "").includes(name));
    }
    return true;
  };

  const allEvents = [...periodEvents].reverse();
  const historyEvents = allEvents
    .filter(ev => eventFilter === "karakter" ? KARAKTER_TYPES.has(ev.type) : DUNYA_TYPES.has(ev.type))
    .filter(isFamilyRelated)
    .slice(0, 40);

  // handleAdvance — logic unchanged
  const handleAdvance = async () => {
    const totalWeeks    = selectedPeriod.weeks;
    const histLenBefore = (state?.history || []).length;
    setAdvancing(true);
    setYearSummary(null);
    setSyntheticEvents([]);
    setAdvProgress(null);
    try {
      if (!advance) return;
      const result = await advance(totalWeeks);
      if (!result) return;
      if (result?.player?.dead) return;

      const finalHist   = Array.isArray(result?.history) ? result.history : [];
      const allNewEvents = finalHist.slice(histLenBefore);
      setHistoryStartIdx(histLenBefore);

      if (totalWeeks >= 52 && allNewEvents.length > 0) {
        setYearSummary({ totalWeeks, events: allNewEvents });
      }

      const diff     = Array.isArray(result?.advance_diff) ? result?.advance_diff : [];
      const triggers = Array.isArray(result?.triggers)     ? result?.triggers     : [];

      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const FIELD_NARRATIVES = {
        money: {
          pos: [
            (d) => `${Math.abs(d).toFixed(0)} altın cebe girdi. İyi iş.`,
            (d) => `Bu hafta kasa ${Math.abs(d).toFixed(0)} altın şişti. Emek boşa gitmedi.`,
            (d) => `Pazar bereketliydi: ${Math.abs(d).toFixed(0)} altın kazanıldı.`,
            (d) => `${Math.abs(d).toFixed(0)} altın. Az değil. Devam et.`,
            (d) => `Esnaf seninle iş yapmayı seviyor. ${Math.abs(d).toFixed(0)} altın geldi.`,
          ],
          neg: [
            (d) => `${Math.abs(d).toFixed(0)} altın gitti. Bir daha gelmeyebilir.`,
            (d) => `Kasadan ${Math.abs(d).toFixed(0)} altın çıktı. Acıtır ama bu böyledir.`,
            (d) => `Bu haftaki masraflar ${Math.abs(d).toFixed(0)} altını yedi bitirdi.`,
            (d) => `Para aktı gitti. ${Math.abs(d).toFixed(0)} altın. Böyle gider.`,
            (d) => `${Math.abs(d).toFixed(0)} altın. Veda etti. Kapıyı bile çarpmadan.`,
          ],
        },
        hunger: {
          pos: [
            () => `Mide dolu, kafan berrak. Bu hafta yeterince yenildi.`,
            () => `Sofra iyiydi. Vücut bunun farkında; enerji yerinde.`,
            () => `Karnın tokken dünya daha güzel görünür — bu hafta öyleydi.`,
            () => `Yiyecek boldu. Basit bir nimet; ama değerini bilmek şart.`,
          ],
          neg: [
            () => `Mide grıldıyor ama ses yok — henüz.`,
            () => `Açlık bu hafta arkadaşın oldu. İstemeden.`,
            () => `Yiyecek kıttı. Zor bir hafta geçti.`,
            () => `Sabah ekmek yoktu. Öğleden sonra da olmadı. Zor günler bunlar.`,
          ],
        },
        health: {
          pos: [
            () => `Vücut toparladı. Az da olsa — önemli.`,
            () => `Dinlenme işe yaradı. Daha iyi hissediyorsun.`,
            () => `Sağlık düzeldi. Biraz tuz, biraz şans, biraz irade.`,
            () => `Ayakta kalmak bu hafta daha az çaba istedi. İyi işaret.`,
          ],
          neg: [
            () => `Beden duraksadı. Bu ihmal edilmemeli.`,
            () => `Sağlık gerilemesi başladı. Dikkat et.`,
            () => `Yorgunluk üst üste bindi. Biraz yavaşla.`,
            () => `Vücut şikâyet ediyor. Küçük bir uyarı — ama uyarı.`,
          ],
        },
        reputation: {
          pos: [
            () => `İnsanlar artık seni bir adım önde görüyor.`,
            () => `Adın şehirde biraz daha duyulmaya başladı. Fark ediliyorsun.`,
            () => `İtibar yavaş kazanılır. Bu hafta bir taş daha örüldü.`,
            () => `Çevredeki algı olumluya döndü. Devam et.`,
          ],
          neg: [
            () => `Birkaç dedikoducu konuşmuş. Hasar var.`,
            () => `İtibar sarsıldı. Fısıltılar yayılıyor.`,
            () => `Çevredekiler mesafe koyuyor. Fark ettiler.`,
            () => `Bu hafta algın olumsuza döndü. Düzeltmesi zaman alır.`,
          ],
        },
        crime: {
          pos: [
            () => `Suç kaydın ağırlaşıyor. Yetkililer gözü dikmiş durumda. Dikkatli ol.`,
            () => `Yaptıkların göze çarpmaya başladı. Gölgede kal.`,
            () => `Bir kapı daha kapandı. Suç kaydı böyle birikmez diyenler yanılıyor.`,
          ],
          neg: [
            () => `Temiz davranışların bir miktar geçmişi sildi.`,
            () => `Suç kaydın hafifçe temizlendi. Devam et.`,
            () => `Birkaç iyi iş, birkaç kötü sayfayı kapattı.`,
          ],
        },
        honor: {
          pos: [
            () => `Onur duygusu bugün biraz daha doldu. Doğru yapıldı.`,
            () => `Şerefine uygun davranıldı. Fark edildi.`,
            () => `Bu tercih değer tartılmaz bir şey bıraktı geride.`,
          ],
          neg: [
            () => `Bu tercih onuru biraz sarstı. Geri alınamaz.`,
            () => `Bazı şeyler bir kez yapılınca farklı durur.`,
            () => `Vicdan bu hafta huzursuz.`,
          ],
        },
        stamina: {
          pos: [
            () => `Beden daha güçlü; dayanıklılık arttı.`,
            () => `Bu hafta çalışmak daha az yordu. Güzel.`,
            () => `Kaslar seninle konuştu: daha iyi.`,
          ],
          neg: [
            () => `Tükenme hissediliyor. Dinlenme şart.`,
            () => `Dayanıklılık biraz eridi. Dikkat et.`,
            () => `Beden aşınıyor. Bir ara dur.`,
          ],
        },
        intelligence: {
          pos: [
            () => `Zekân keskinleşiyor — fark ediliyor.`,
            () => `Düşünce netleşti. Bu hafta bir şeyler öğrenildi. Kalıcı.`,
            () => `Zihin her geçen günle biraz daha açılıyor.`,
          ],
          neg: [
            () => `Zihin biraz bulanıklaştı. Odaklanmak güçleşti.`,
            () => `Dikkat dağıldı. Topla kendini.`,
          ],
        },
        charisma: {
          pos: [
            () => `İnsanlar seninle daha kolay konuşuyor artık.`,
            () => `Kelimeler daha etkili çıkıyor. Çevre bunu hissediyor.`,
            () => `Şehirde seni dinleyenler çoğaldı.`,
          ],
          neg: [
            () => `Bu hafta sözlerin pek etki bırakmadı.`,
            () => `Karizman biraz soldu. Geçici olabilir.`,
          ],
        },
        fear: {
          pos: [
            () => `Korku yükseliyor. Çevre bunu hissediyor — ve ürküyor.`,
            () => `Tedirginlik arttı. İçeride ve dışarıda.`,
          ],
          neg: [
            () => `Korku azaldı. Adımlar biraz daha sağlam.`,
            () => `Tedirginlik geçti. Zihin daha sakin.`,
          ],
        },
      };

      const currentTurnAfter = result?.turn ?? (0 + totalWeeks);
      // Alan → anlamlı event tipi eşleştirmesi (ikon, renk, flavor için)
      const FIELD_TYPES = {
        money: (pos) => pos ? "ticaret" : "vergi_ödendi",
        hunger: (pos) => pos ? "iyileşme" : "hastalık",
        health: (pos) => pos ? "iyileşme" : "hastalık",
        reputation: (pos) => pos ? "iltifat" : "dedikodu",
        crime: (pos) => pos ? "suç" : "iyileşme",
        honor: (pos) => pos ? "görev_tamamlandı" : "görev_başarısız",
        stamina: (pos) => pos ? "aktivite" : "hastalık",
        intelligence: (pos) => pos ? "ders" : "hastalık",
        charisma: (pos) => pos ? "iltifat" : "dedikodu",
        fear: (pos) => pos ? "suç" : "iyileşme",
      };

      const newSynthetics = diff
        .filter(d => d?.field && FIELD_NARRATIVES[d.field])
        .map((d) => {
          const variants = d.positive ? FIELD_NARRATIVES[d.field].pos : FIELD_NARRATIVES[d.field].neg;
          const fn = pick(variants);
          const typeFn = FIELD_TYPES[d.field];
          return {
            type: typeFn ? typeFn(d.positive) : (d.positive ? "iyileşme" : "hastalık"),
            day: currentTurnAfter,
            text: fn(Math.abs(d.delta)),
            _synthetic: true,
          };
        });

      triggers.filter(t => t?.urgent).forEach(t => {
        newSynthetics.push({ type: "enforcement", day: currentTurnAfter, text: t.text, _synthetic: true });
      });

      if (newSynthetics.length > 0) setSyntheticEvents(newSynthetics);

      const earlyStop = result?.advance_early_stop;
      if (earlyStop) {
        setSyntheticEvents(prev => [...prev, {
          type: "starvation_warning",
          day: currentTurnAfter,
          text: `🍞 Yiyecek stoğun tükendi ve açlık kritik seviyeye düştü. ${earlyStop.week_done} hafta geçti — devam etmedi.`,
          _synthetic: true,
        }]);
        toast.error("Yiyecek stoğun tükendi, çok açsın! Zaman atlaması durduruldu.", {
          duration: 7000,
          description: `${earlyStop.week_done} / ${earlyStop.total} hafta tamamlandı.`,
        });
      } else {
        toast.success(
          totalWeeks === 1 ? "Bir hafta geçti."
          : totalWeeks <= 4 ? "Bir ay geçti."
          : "Bir yıl geçti."
        );
      }

      const ce = result?.caravan_event;
      if (ce) {
        if (ce.type === "arrived") {
          const profitStr = ce.profit != null ? ` Kâr: +${ce.profit.toFixed(1)}A` : "";
          toast.success(`🚛 Kervanın hedefe ulaştı!${profitStr}`, { duration: 5000 });
        } else if (ce.type === "attack") {
          toast.error(`⚔️ Kervanın saldırıya uğradı! Kayıp: ${ce.lost_value?.toFixed(1)}A`, { duration: 5000 });
        } else if (ce.type === "caravan_destroyed") {
          toast.error(`💀 Kervanın tamamen yağmalandı!`, { duration: 6000 });
        }
      }

      const we = result?.new_world_events?.[0];
      if (we) {
        const CAT_EMOJIS = { tehlike: "⚠️", doğa: "🌿", ekonomi: "📈", sosyal: "🎉", haber: "📰" };
        const em = CAT_EMOJIS[we.category] || "🌍";
        if (we.category === "tehlike") {
          toast.error(`${em} ${we.headline}`, { duration: 6000, description: we.location_name });
        } else {
          toast.info(`${em} ${we.headline}`, { duration: 5000, description: we.location_name });
        }
      }

      // GDD v4 Bölüm 5.4 — Kriz Olayları bildirimi
      const crisisEvents = result?.crisis_events;
      if (crisisEvents?.length > 0) {
        const KRIZ_EMOJIS = { kriz_kuraklik: "☀️", kriz_veba: "💀", kriz_yangin: "🔥" };
        crisisEvents.slice(0, 3).forEach(ev => {
          const emoji = KRIZ_EMOJIS[ev.type] || "⚠️";
          toast.error(`${emoji} ${ev.text}`, { duration: 8000, description: "Kriz Olayı — Dünya Haberleri'ne bak" });
        });
      }
    } catch {
      toast.error("Zaman ilerletilemedi.");
    } finally {
      setAdvancing(false);
      setAdvProgress(null);
      try {
        const evRes = await api.get("/life-event/pending");
        if (evRes.data.event) setShowLifeEvent(true);
      } catch {}
      try {
        const perkRes = await api.get("/perk/pending");
        if (perkRes.data.pending_perk) setShowPerkChoice(true);
      } catch {}
    }
  };

  if (!state) return null;

  // Feed'e girecek sabitlenmiş olaylar (uyarılar)
  const KRIZ_EMOJIS_FEED = { kriz_kuraklik: "☀️", kriz_veba: "💀", kriz_yangin: "🔥" };
  const crisisFeedItems = (state?.recent_crises || []).map(ev => ({
    type: "_kriz_alert",
    text: `${KRIZ_EMOJIS_FEED[ev.type] || "⚠️"} ${ev.text}`,
    _pinned: true,
    _kriz: true,
  }));
  const pinnedFeedEvents = eventFilter === "karakter"
    ? alertEvents
    : [...crisisFeedItems, ...worldAlertEvents, ...worldEventFeedItems];

  return (
    <>
      <LifeEventModal
        open={showLifeEvent}
        onClose={() => setShowLifeEvent(false)}
        onComplete={() => {
          setShowLifeEvent(false);
          if (advance) advance(0).catch(() => {});
        }}
      />
      <PerkChoiceModal
        open={showPerkChoice && !showLifeEvent}
        onClose={() => setShowPerkChoice(false)}
        onComplete={() => {
          setShowPerkChoice(false);
          if (advance) advance(0).catch(() => {});
        }}
      />

      {/* Ana wrapper — tam yükseklik, flex kolon */}
      <div className="flex flex-col max-w-2xl mx-auto overflow-hidden" style={{ height: "calc(100dvh - 80px)" }}>

        {/* ── HERO SAHNE — mevsim + yaş grubuna göre değişen görsel ── */}
        <HeroScene player={player} cal={cal} rep={rep} />

        {/* ── HAYATİN paneli — mockup sol panel ── */}
        <LifePanel player={player} state={state} />

        {/* Faction/Yönetici strip — varsa */}
        <StatusStrip player={player} world={state?.world} />

        {/* ── OLAY AKIŞI — esnek yükseklik ── */}
        <div className="flex flex-col flex-1 min-h-0 mx-2 rounded-sm border border-stone-700/50 overflow-hidden bg-amber-950/10" style={{boxShadow: 'inset 0 0 0 1px rgba(120,80,30,0.08), 0 2px 12px rgba(0,0,0,0.4)'}}>

        {/* SON OLAYLAR — amber başlık + TARİH linki */}
          <div className="shrink-0 flex items-center justify-between px-3.5 pt-3 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-0.5 h-3.5 bg-amber-700 rounded-full" />
              <span className="font-heading text-[11px] text-amber-600/90 tracking-[0.2em] uppercase">Son Olaylar</span>
            </div>
            <Link
              to="/oyun/tarih"
              className="text-[9px] text-stone-600 hover:text-amber-500 font-heading tracking-wider transition-colors flex items-center gap-0.5"
            >
              Tümünü Gör <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

        {/* Filtre sekmeleri */}
          <div className="shrink-0 flex items-center border-b border-amber-900/30 bg-stone-950/50">
            <button
              onClick={() => setEventFilter("karakter")}
              className={`flex-1 py-2 text-[11px] font-heading tracking-wider transition-colors border-b-2 ${
                eventFilter === "karakter"
                  ? "border-orange-600 text-orange-300 bg-orange-950/20"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              👤 Karakter
            </button>
            <button
              onClick={() => setEventFilter("dünya")}
              className={`flex-1 py-2 text-[11px] font-heading tracking-wider transition-colors border-b-2 ${
                eventFilter === "dünya"
                  ? "border-violet-600 text-violet-300 bg-violet-950/20"
                  : "border-transparent text-stone-500 hover:text-stone-300"
              }`}
            >
              🌍 Dünya
            </button>
          </div>

          {/* Kaydırılabilir olay listesi — tam geri kalan yükseklik */}
          <div className="flex-1 overflow-y-auto pb-20" style={{background: 'linear-gradient(180deg, rgba(35,22,10,0.18) 0%, rgba(28,18,8,0.45) 100%)'}}>

            {/* Anlık Eylem Paneli (eylemden dönerken göster) */}
            {eventFilter === "karakter" && freshEvents?.length > 0 && (
              <FreshEventsPanel events={freshEvents} onDismiss={() => clearFreshEvents && clearFreshEvents()} />
            )}

            {/* Yıl özeti */}
            {yearSummary && (
              <YearSummaryCard summary={yearSummary} onDismiss={() => setYearSummary(null)} />
            )}

            {/* Sabitlenmiş uyarılar (üstte) */}
            {pinnedFeedEvents.map((ev, i) => (
              <EventCard key={`pin-${i}`} event={ev} pinned timeAgo="Şimdi" />
            ))}

            {/* Sentetik anlatı (diff'ten) — sadece karakter sekmesinde */}
            {eventFilter === "karakter" && syntheticEvents.map((ev, i) => (
              <EventCard key={`syn-${i}`} event={ev} timeAgo={i === 0 ? "Yeni" : null} />
            ))}

            {/* Geçmiş olaylar */}
            {historyEvents.length > 0
              ? historyEvents.map((ev, i) => (
                  <EventCard
                    key={i}
                    event={ev}
                    timeAgo={i === 0 && syntheticEvents.length === 0 ? "Yeni" : null}
                  />
                ))
              : (
                <div className="px-4 py-12 text-center">
                  <div className="text-2xl mb-2 opacity-30">
                    {eventFilter === "karakter" ? "👤" : "🌍"}
                  </div>
                  <div className="text-stone-600 text-xs font-heading tracking-wider">
                    {eventFilter === "karakter"
                      ? "Bu dönemde seni etkileyen bir olay yaşanmadı."
                      : "Bu dönemde kayda değer bir dünya olayı yaşanmadı."}
                  </div>
                </div>
              )
            }
          </div>
        </div>
      </div>

      {/* ── YAPIŞIK ALT BAR — sabit, nav barın üstünde ── */}
      <div
        className="fixed left-0 right-0 z-40 bg-stone-950/80 backdrop-blur-md"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
          borderTop: '1px solid rgba(180,100,20,0.18)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.7), inset 0 1px 0 rgba(200,120,30,0.08)',
        }}
      >
        <div className="max-w-2xl mx-auto px-3 py-2">

          {/* İlerleme çubuğu — çok haftalı atlama */}
          {advancing && advProgress && (
            <div className="h-0.5 rounded-full overflow-hidden mb-2 bg-stone-800">
              <div
                className="h-full bg-gradient-to-r from-orange-700 to-amber-500 transition-all duration-300"
                style={{ width: `${(advProgress.cur / advProgress.total) * 100}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            {/* Dönem seçici */}
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setSelectedPeriod(p)}
                  disabled={advancing}
                  className={`px-2.5 py-2 text-[10px] font-heading tracking-wider rounded-sm border transition-all disabled:opacity-40 ${
                    selectedPeriod.label === p.label
                      ? "border-amber-700/80 bg-amber-950/60 text-amber-300 shadow-[0_0_8px_rgba(180,100,20,0.2)]"
                      : "border-stone-800 text-stone-500 hover:text-stone-300 hover:border-stone-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Ana ilerleme butonu — mockup tarzı, büyük ve belirgin */}
            <button
              onClick={handleAdvance}
              disabled={advancing}
              className="flex-1 py-3 font-heading text-[11px] tracking-[0.18em] flex items-center justify-center gap-2 disabled:opacity-50 rounded-sm transition-all relative overflow-hidden"
              style={{
                background: advancing
                  ? 'linear-gradient(180deg, #78350f, #451a03)'
                  : 'linear-gradient(180deg, #b45309 0%, #92400e 50%, #78350f 100%)',
                border: '1px solid rgba(180,100,20,0.5)',
                boxShadow: advancing ? 'none' : '0 0 20px rgba(180,100,20,0.25), inset 0 1px 0 rgba(251,191,36,0.12)',
                color: '#fef3c7',
              }}
            >
              {advancing
                ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                : <Hourglass className="w-4 h-4 text-amber-400 shrink-0" style={{filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.5))'}} />}
              <span>
                {advancing
                  ? advProgress
                    ? `${advProgress.cur} / ${advProgress.total} Hafta…`
                    : "Geçiyor…"
                  : `${selectedPeriod.label} İlerle`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
