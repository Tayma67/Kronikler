# Yaşayan Nüfus — Tasarım Belgesi (bağlayıcı)

Hedef: Paradox tarzı bir sandbox. Dünyadaki her insan kalıcıdır, ailesi vardır, yaşar, evlenir, doğurur, ölür,
kendi kararlarını verir; oyuncu da aynı kurallara tabidir. "Mantık": her sayının görünür sebepleri vardır.

## Kesin ilkeler

1. **Dekor yok.** "X ile Y evlendi" gibi her haber gerçek bir durum değişikliğidir. Gerçek olmayan haber üretilmez.
2. **Sebep görünür.** Bir görüş/şans/karar, oyuncuya kalem kalem sebepleriyle gösterilebilmelidir.
   Gösterilen toplam ile motorun kullandığı değer birebir aynıdır.
3. **Farm yok.** Her etkileşim kanalı tur-kilitli ya da azalan getirili; görüş kazanımı ay başına tavanlı.
4. **Eski kayıt kırılmaz.** Mevcut kadro (isim, yaş, meslek, aile bağı, ilişki, anı) göçte birebir korunur.
5. **Telefon yorulmaz.** Ağır hesap yılda bir; aylık tik yalnız oyuncunun çevresine dokunur. Kayıt boyutu tavanlı.
6. **6 dil, cinsiyet uyumu**, AGENTS.md kuralları aynen geçerlidir.

## Aşamalar

| # | Aşama | İçerik |
|---|-------|--------|
| 1 | **Gerçek nüfus** | Kalıcı kişi kaydı (`s.pop`), aile bağları (eş, anne, baba, çocuk), gerçek evlilik/doğum/ölüm/reşitlik, nüfus dengesi, budama, oyuncunun eşi nüfusa bağlı, eski kayıt göçü, NPC profili gerçek aile |
| 2 | **Görüş ve sebepleri** | Görüş = kalemler toplamı (anılar + akrabalık + meslek + huy + nam); profil ekranında döküm |
| 3 | **Kendi kararları** | NPC'lerin yıllık/aylık karar motoru (iş, göç, borç, dükkân, düşmanlık, kız isteme); ekonomiye bağ |
| 4 | **Etkileşim = eylem** | Teklifler (dostluk, borç, kız isteme, iş, sır, tehdit) — kabul şansı + sebepler; sohbet metni kişinin gerçek hayatından |
| 5 | **Mahalle ve gün** | Mekânlar, vakitler, kim nerede; akşam sofrası |

Her aşama ayrı dalgalar halinde, her dalga tam doğrulama hattından geçerek gönderilir.

## Aşama 1 — veri modeli (uygulandı: `lib/nufus.ts`)

`GameState.pop?: Nufus` (opsiyonel; yoksa `migrate()` → `nufusHazirla` göçle kurar)

```
Nufus { v: 1; k: Record<id, Kisi>; n: number }   // n: yeni kimlik sayacı ("k" + n.toString(36))
Kisi {
  id            // mevcut kimlikler korunur: "<yer>_<n>" (temel kadro), "born_*" (eski doğanlar), "k*" (yeni)
  g             // "erkek" | "kadın"
  dy            // doğum yılı (dünya yılı; yaş = worldYears - dy; ölüde yaş = ol - dy)
  loc, prof     // yaşadığı yer, yetişkin mesleği (gösterimde yaşa göre çocuk/çırak)
  tr, qk, gl    // TRAITS / QUIRKS / GOALS İNDEKSLERİ (kayıt küçük kalsın)
  af | ns       // ilk ad: temel kadro r-değeri ×2³² (tamsayı, kayıpsız) ya da tohum
  sf | ss | sa  // soyad: aynı biçim ya da sabit metin (oyuncu ailesi) — babadan geçer
  ol?           // ölüm yılı (yoksa yaşıyor)
  es?           // eşin kimliği; "@" = oyuncu
  baba?, anne?, cocuk?, ey?, dost?, hasim?
  gd?, gh?, usta? // hayaline erdi · oyuncu hayaline omuz verdi · oyuncunun yetiştirdiği usta
}
Player.spouse_id / mother_id / father_id   // oyuncunun eşi ve anne-babası nüfustaki gerçek kişilerdir
```

Olay metinlerinde kişi adı `{kn}` (tam ad) / `{kf}` (ilk ad) parametresiyle kaydedilir: ad her dilde kişinin
kaydından çözülür (kadroda görülen adla birebir).

### Değişmezler (testlerle korunur — `nufusDenetle`)
- Kimlikler eşsiz; `es` simetrik (A.es=B ⇔ B.es=A), ölünün eşi dul kalır (es silinir); oyuncunun tek yaşayan eşi.
- Kişi aynı anda tek eşli; evlilik yaşı ≥ 16 (kadın) / 18 (erkek); aynı cins evlilik yok.
- Yakın akraba evlenmez: kardeş, ebeveyn-evlat, amca/dayı/hala/teyze-yeğen, ilk kuzen.
- Çocuk ile ebeveyn arasında ≥ 16 yaş; anne doğumda 16–44 yaş arası.
- `cocuk` ⇔ `baba/anne` tutarlı; ölü kişi kadroda (`rosterAt`) görünmez; 100 yaşını geçen yaşayan yok.
- Yer başına yaşayan nüfus hedefin %70–%140'ı arasında kalır (hedef = rosterSize; ölçülen 300 yılda 0.90–1.40).
- Toplam kayıt üst sınırı 2000 (ölçülen ~1300; nüfus ~220KB).

### Yıllık yaşam tiki (sıra)
1. Ölümler (yaş eğrisi `olumOlasiligi`: bebek %3, 50 altı %0.4 … 90+ %30); eş dul kalır. Oyuncunun eşi muaftır:
   onun ölümünü oyuncu akışı aynı eğrinin aylık karşılığıyla yuvarlar.
2. Evlilikler: bekâr kadın 16–45, erkek 18–60, yaş farkı −3..15; yüzde 15 bölgeden; huy uyumu; akraba yasağı;
   kadın erkeğin yerine taşınır.
3. Doğumlar: evli çiftler, annenin yaşına bağlı doğurganlık × nüfus dengesi (hedefin 1.35 katında durur); en çok 8
   çocuk, yılda bir; meslek yüzde 50 aynı cinsten ebeveynden; soyad babadan.
4. Göç: hedefin 1.2 katını aşan yerden 0.9 altındaki yerlere bekâr yetişkinler (önce aynı bölge); 0.75 altındaki
   yerlere göç ya da dışarıdan yeni gelen.
5. Bekâr oyuncu için yaşıt güvencesi (yerinde karşı cinsten yaşıt bekâr ikiden azsa biri yerleşir).
6. Budama: korunmayan ölüler — yaşayan birinin ebeveyni değilse silinir; ebeveynse 60 yıl saklanır.
   Korunan: ilişki/anı sahibi, işçi, çırak, can yoldaşı, eş, anne-baba, söz kesilen, gizli sevgili.

### Oyuncu ile bağ
- Oyuncunun anne-babası doğduğu yerde gerçek kişidir (birbirinin eşi, babanın soyadı oyuncunun soyadı);
  evlilik pazarına ve göçe girmez; nüfusta yaşlanıp ölür (tek vefat haberi, anı ve miras akışı aynı).
- Her evlilik gerçek bir kişiyle: kur/görücü → o NPC; rastgele görücü ve hikâye düğünü → yerdeki (yoksa bölgedeki)
  çağına uygun bekâr; hanedan ittifakı → uzaktan gelip ocağa yerleşen kişi. Eş oyuncunun ocağında (home_name) yaşar.
- Evli NPC'ye kur → söz kesilir; ocağını dağıtırsa eski eşiyle bağı nüfusta çözülür ve oyuncuyla evlenir;
  söz kesilen ölürse söz düşer. Evli kişi görücü adayı olamaz; anne-baba kur/flört/görücü hedefi olamaz.
- Boşanmada eş bağı çözülür (kişi yaşamaya devam eder); eş ölünce kaydı rahmetli olarak kalır.
- Oyuncu ölünce eşi dul kalır; vârisin anne/babası o kişidir, ölen ata vârisin defterinde rahmetlidir
  (ikinci kez ölmez). Vârisin kayıtsız yaşayan ebeveyni de kişi olarak kurulur.

### Göç (eski kayıt)
- Temel kadro tohumdan aynı sırayla üretilir; isimler r-değerleriyle saklanır → 6 dilde birebir aynı isim
  (42 yer × 6 dil × 6 kayıt yaşı, ~29 bin kişi karşılaştırması: fark 0).
- `applyFamilySurnames` aile kökünün soyadını verir; göçte bu kök kişinin soyad r-değeri aileye yazılır.
- `npcSocialGraph` (yıl 0 kadrosu) eş/ebeveyn/evlat bağları `es/baba/anne/cocuk`'a, dost/rakip `dost/hasim`'e aktarılır.
- `npcEvo` (ölü, meslek, hayal, usta) ve `npcBorn` (doğanlar) kişilere işlenir; sonra iki alan silinir.
- Oyuncunun NPC eşi bağlanır; adından ibaret eşi ve yaşayan anne-babası aynı adla (tohum) kişi olur.
  Vâris kayıtlarında ölmüş atanın "yaşıyor" kalmış işareti düzeltilir.
- Göç idempotent: `pop` varsa tekrar çalışmaz.

## Aşama 2 — Görüş ve sebepleri (uygulandı: `gorus()` lib/game.ts)

`relWith(s, id) = gorus(s, id).toplam` — profil ekranındaki döküm ile motorun her kararı (kur, flört, istismar,
sohbet tonu, esnaf indirimi, sadık dost yardımı, NPC'nin kapına gelmesi) AYNI fonksiyondan beslenir.
Kalemler (tamsayı; toplam −100..100'e kırpılırsa fark "Daha ötesi olmaz" kalemiyle gösterilir):

| Kalem | Değer |
|---|---|
| Aranızda geçenler | `s.relationships[id]` (eylemlerin biriktirdiği taban) |
| Anılar (türüne göre) | aynı türdeki anıların sönen yükleri toplamı — NPC'nin kendi ağzından («bana hediye vermişti») |
| Evlat bağı | anne/baba: 20 + (parent_bond − 45)/3 |
| Evlilik bağı | eş: 10 + (spouse_bond − 40)/2 |
| Hısımlık | eşinin anne/babası/kardeşi: +10 |
| Yakınlarına davranışın | eşine, anne-babasına, evlatlarına, kardeşlerine doğrudan hesabının yüzde 20'si (±20) |
| Nâmın | itibar/10 |
| Huy ↔ nâm | dindar → dindarlığın; cömert/misafirperver/sıcakkanlı → cömertliğin; mert → mertliğin; herkes → zulmün (−); kibirli → şöhretin (−) |
| Meslektaş / ekmeğini verdiğin / valiliğin | +5 / +8 / vergi ≤10 ise +6, ≥25 ise −8 |

Yapısal kalemler yeni bir kazanç kanalı açmaz (farm yok); eylem kanalları ayda bir kilitli kalır.

### Oyuncunun evlatları (uygulandı)
- Her nesil 7 yaşında, eşsiz ve evlatsız başlar; evlat ancak evlilikten (ya da gizli ilişkiden) sonra doğar.
- Evlat doğunca nüfusta kişi olur (`p.child_ids`): ocakta büyür, adı konduğu gibi her dilde aynı, soyadı oyuncunun.
  Oyuncu yaşarken (ve vâris seçilene dek) evlenmez, göçmez, ölüm zarından muaftır.
- Torun yalnız yetişkin (18+) bir evlat varken doğar.
- Vâris seçilince onun kaydı nüfustan kalkar (artık oyuncudur); öbür evlatlar vârisin kardeşleri olur
  (`p.sibling_ids`, görüşte "Kardeş bağı" +15), kendi hayatlarını yaşar: evlenir, doğurur, ölür.

## Aşama 3a — Kendi kararları: meslek pazarı ve bağlar (uygulandı)

- **Meslek kararı (yıllık):** bir mesleğin getirisi, ürettiği malların o şehirdeki arz-talep çarpanıdır (mevsimden
  bağımsız; müzisyen/asker/tüccar sabit, işsiz 0.3). İşsiz yüzde 50 ihtimalle en kazançlı işe girer; 18–45 yaş arası
  biri, en iyi iş kendi işinden 1.3 kat kazançlıysa ve mesleğinde en az 2 kişi kalıyorsa yüzde 6 × huy (hırslı/kurnaz
  1.6, dindar/sabırlı/ciddi 0.6) ihtimalle geçer. Şehir başına yılda nüfusun yüzde 5'i. Usta, oyuncunun eşi ve ailesi
  karar dışıdır. Sonuç: kıt mal üretilir, fiyat kendiliğinden dengelenir (80 yılda işsiz 61 → 1; gıda çarpanı ~1.4 → ~1.2).
  Profilde son 6 yıldaki karar sebebiyle görünür; tanıdıksa haberi gelir.
- **Dostluk/hasımlık (yıllık):** aynı yerdeki yetişkin çiftler; huy uyumuyla dostluk (en çok 3), aynı meslekte
  hırslı/kibirli/kurnaz rekabetiyle hasımlık (en çok 2). Uzaklaşan dostluk yüzde 10, sönen rekabet yüzde 8 ihtimalle
  çözülür; ölenin bağı çözülür. Görüşe "Dostlarına davranışın" (yüzde 10, ±10) ve "Hasımlarına davranışın"
  (ters işaret, ±10) kalemleri eklenir.

## Aşama 3b — NPC'nin sana yönelik kararları (uygulandı)

- **Teklifler** (`s.npcTeklif`, aynı anda tek, 3 ayda cevapsız kalırsa düşer ve kırgınlık bırakır; ayda yüzde 4 yoklama):
  - *Dünürcü:* bulunduğun yerde bekâr, karşı cinsten, yaşı ±10 ve sana bakışı ≥ 40 olan kişi. Kabul → o kişiyle evlilik;
    ret → taban −6.
  - *Borç isteme:* sana bakışı ≥ 15 olan yetişkin; tutar 15–50 akçe (enflasyonlu), vade 12–24 ay; ancak paran tutarın
    iki katıysa ve açık alacağın üçten azsa. Kabul → anı "yardım", cömertlik nâmı; ret → taban −4.
  - *Geri ödeme* (`p.alacaklar`): mert/dindar/sabırlı/cömert/ciddi yüzde 90, kurnaz/hırslı yüzde 55, diğerleri yüzde 75;
    cömert/mert yüzde 10 fazlasıyla öder. Ödenmezse bir yıl mühlet, sonra batar; borçlu ölürse alacak mezara gider.
    Alacaklar vârise geçer.
- **Kendiliğinden hamleler** (ayda yüzde 5): sana bakışı ≥ 30 olan dost çorba getirir / sofraya çağırır; ≤ −30 olan
  hasım aleyhine konuşur ya da laf sokar; ≤ −50 ve sinsi huylu (kurnaz/hırslı/kibirli) olan, o şehirdeki mülküne zarar
  verir. Her olayda görüşünün o yöndeki en ağır sebebi yazılır («bana hakaret etmişti» ya da "zulmünün nâmı").

## Aşama 4 — Etkileşim = teklif, sohbet = gerçek hayat (uygulandı)

- **Kabul şansı** (`teklifSansi`): kur, görücü, flört ve dedikodu, yüzde puanı kalemlerle hesaplanır; motor zarı aynı
  yüzdeyle atar (4000 denemede gösterilen %40 → gerçekleşen %39.4). Profilde her teklifin yanında yüzde rozeti,
  dokununca döküm (temel şans, sana bakışı, toplumdaki ağırlığın, karizmatik, güvenilir/çapkın/korkutucu/zalim nâmı,
  şöhret, çekicilik, sosyal beceri, karizma, sınır). Görücü ekranında da yüzde görünür.
- **Sohbet gerçek hayattan** (`gercekSatir`): kişi açıldığında şablon yerine kendi hayatını anlatır —
  aile (yeni doğan, evlenen evlat, yakın kayıp, eş ve evlilik yılı, evlat sayısı, dul/bekâr), iş (oyuncunun işçisi,
  işsizlikte kıt iş, meslek değişiminin sebebi, malının kıt/bol olması), dünya (kasabadaki son ölüm/düğün), hayal
  (erdi / omuz verdin / kendi ağzından; çocuk ve yabancıya açılmaz), dert (ölen dost, hasım). Uydurma yok.

## Rakip usta ve çırak gerçek kişi (uygulandı)

- Rakip doğunca aynı ad tohumuyla (`ns = seed`) çarşıda yaşayan bir usta olarak nüfusa girer (`rakip.id`); rekabet
  sürerken çarşıdan ayrılmaz; ölürse rekabet "vefat" ile kapanır (ortaklık bonusu verilmez). Görüş: rekabet −15,
  ortaklık +15.
- Çırak alınınca 11–14 yaşında gerçek bir çocuk olarak ocağa girer (`cirak.id`); çıraklıkta evlenmez, göçmez, ölmez;
  peştamal kuşanınca mesleği ustanınki olur ve "senin yetiştirdiğin usta" işaretini taşır. Görüş: ustası olman +20/+15.
- Aynı anda tek çırak: eski "çırak al" (45+ yaş, kasabadan biri) ile lonca çırağı birbirini dışlar.

## Aşama 5 — Mahalle ve gün (uygulandı: `mahalle`, `mekanaGit`, `aksamSofrasi`; ekran `app/oyun/mahalle.tsx`)

- Beş mekân: çarşı, cami, kahvehane, meydan, han. Her ay herkes mesleğine, huyuna ve yaşına göre tam bir mekândadır
  (ay boyunca sabit; dağılım ~ çarşı yüzde 36, meydan 29, cami 17, kahve 13, han 6).
- Ayda bir mekâna uğranır (`mahalle_turn`): oradaki en çok 2 (kahvede 3) tanımadığınla tanışırsın ve mekânın küçük
  getirisi: çarşı → şehrin en kıt malı + ticaret becerisi; cami → dindarlık nâmı + sağlık; kahve → sosyal beceri;
  meydan → çocukken güç, büyükken itibar; han → bölgedeki başka bir çarşının kıt malı. Kahve ve han 14 yaş üstü.
- Akşam sofrası (`sofra_turn`): ocağındaki gerçek aile (eş, evlatlar, anne-baba, kardeşler) aynı yerdeyse ayda bir;
  bir yiyecek ya da 3 akçe; doyurur, bağları birer puan ısıtır (eşle vakit/evlat/ziyaret eylemlerinin yerini tutmaz).

## Çocukluk gerçek insanlarla (uygulandı)

- **Kardeşler:** ilk nesil yeni oyunda 0–3 kardeşle doğar (yüzde 25/35/28/12); hepsi anne-babanın gerçek evladıdır,
  yaşları ebeveynlere uyar, oyuncuyla aynı yaşta kardeş yoktur, adlar birbirinden ve oyuncudan ayrıdır, soyadı ailenin.
  Anne-baban sonradan bir evlat daha doğurursa o da kardeşin olur (`sibling_ids`). Kardeşin evlenmesi, göçmesi,
  ölümü kroniğe kendi satırıyla düşer; karakter ekranının aile kartında kardeşler satırı profile açılır.
  Nüfusta doğan çocuk babasının yazılı soyadını (`sa`) da taşır.
- **Can yoldaşı gerçek bir yaşıt:** ilk oyunda mahalledeki ±2 yaş aralığındaki (aileden olmayan) bir çocuk seçilir —
  tanıdığın varsa önce o; mahallede yaşıt yoksa o yerleşimdeki uygun yaşta bir ailenin çocuğu olarak kurulur.
  Olay metinleri ve ekranlar adı kaydından okur; çocukken ölürse yoldaşlık biter ve yenisi bulunabilir.
  Eski kayıtların tohumdan yoldaşı aynen sürer (reşitlikte nüfusa girer). Hâli tek yerden: `yoldasDurumu`.
- **Ayın satırı** (`monthlyFlavor`): mevsim satırlarının yanında gerçek kişiler — annenin/babanın masalı (yetimse
  mahallenin yaşlısı), ebeveynin seni işine götürmesi (meslekle), yoldaşın ya da mahallenin bir yaşıtı (tanımadığınla
  tanışırsın), ağabey/abla/küçük kardeş; yetişkinlikte adıyla komşu, kardeş, anne-baba, küçük evlat.
  Kişili satırın anahtarı kişinin cinsine göre (`.k` = kadın), dillerde uyum doğru kalır. Son 6 ayda çıkan sahne
  (çeşitleri dahil, `.vN`) seçilmez; hepsi yakınsa en eskisi. Zindanda ve ölüyken satır yazılmaz.
- Yaşam-evresi anıları iki yıl içinde yinelenmez; yetim çocuğa "annen masal anlattı" yazılmaz; ilk ayların komşu
  iyilikleri birbirinin aynı olmaz.

## Kardeşlerle hesap (uygulandı)

- **Darda kalan kardeş:** işsiz ya da 14 yaş altı üç çocuğuyla bunalmış yetişkin kardeş (ayda yüzde 2) yardım ister —
  nerede yaşarsa yaşasın haber gönderir; aynı kardeş dört yılda bir; kesende istenenin bir buçuk katı yoksa istemez.
  Verirsen kesenden çıkar, kardeşin "zor günümde yanımdaydı" diye hatırlar, cömertlik nâmı ve şeref; vermezsen
  "darda kaldığımda kapısını yüzüme kapattı" anısı (−14, unutulmaz gibi) ve dedikodu olabilir.
- **Mirasta kardeş payı:** anne/baba vefatında sana el emeği kaldıysa hırslı, kurnaz ya da kibirli bir kardeş
  payının yarısını ister. Bekleyen başka teklif varsa sırası gelince kapıya gelir (`miras_bekle`); arada ölürse düşer.
  Verirsen söz tutmuş sayılırsın; vermezsen "mirasta hakkımı yedi" anısı (−16) ve dedikodu.
- Teklif ekranında kesen yetmiyorsa kabul düğmesi kapalıdır; ret her zaman açık.
- **İlişkiler ekranında aile paneli:** anne-baba, eş, evlatlar, kardeşler rolüyle ayrı panelde; bantlar ailenin
  dışındakileri sıralar.

## Gençlik çağı 13-17 (uygulandı: `youthAction`, ana ekranda "Gençlik uğraşları")

- Çocukluk oyunu 13'te, olgunluk uğraşları 18'de başlıyordu; aradaki beş yıl boştu. Artık ayda iki hak (çocukluk
  havuzu, mektepten ayrı) dört uğraşa gider — hepsi gerçek kişilerle:
  - **Ustanın yanında:** şehirde mesleğini yapan en kıdemli kişi ustandır (tanıdıksa önce o); meslek becerisi,
    bazen övgü (itibar), bazen azar. Ustayla yakınlık gençlikten en çok 40'a çıkar.
  - **Akranlarla:** can yoldaşın (yoksa bir yaşıt) ve diğerleriyle meydanda; sosyal beceri, karizma; bazen kavga
    (morluk, mertlik). Yakınlık en çok 60.
  - **Gönül işleri (15+):** mahallede karşı cinsten ±3 yaş, bekâr, akraba olmayan biri — ilk gönlün (`gonul`).
    Yakınlık en çok 45 (kur 18'de ve 50'de açılır: biraz emek ister); bazen dillere düşersin (çapkın nâmı).
    Aday yoksa düğme kapalıdır.
  - **Meydanda hüner:** güç ve dayanıklılık; bazen yaşıtınla koşu yarışı (kazanırsan itibar, mertlik).
- İlk gönlün sen 30'a varmadan başkasıyla evlenirse kroniğe düşer; 18'inde hâlâ bekâr ve yakınsanız "belki artık söz
  zamanıdır" satırı gelir.

## Sonuçlar: kim olduğun kime nasıl yansır (uygulandı)

İnceleme (karşılaştırmalı simülasyon: 22 yıl "herkese yardım eden" ile "önüne gelene zulmeden"):
doğrudan dokunulan kişilerde fark zaten güçlüydü; ama (1) söylentiler yalnız ekranda duruyordu, kimsenin görüşüne
girmiyordu, (2) nâma her huy hemen hemen aynı tepkiyi veriyordu, (3) vâris devrinde kasaba atayı tamamen
unutuyordu (atanın iyiliği de zulmü de sıfırlanıyordu), (4) "velinimet" tohumu kime yardım edildiğine bakmadan
25 akçeyi kesin 90 akçeye çeviriyordu (çiftlik). Düzeltmeler:

- **Söylentiler etkili** (`gorus.soylenti`): dolaştığı yerleşimde tam, aynı bölgede yarı duyulur; ±12 tavan;
  duyanın huyu tartar (zulüm söylentisini ilkeli 1,5 kat, çıkarcı yarım; cömertlik söylentisini sıcak kalpli 1,5 kat).
  Söylentinin kaynağı kendi anısıyla baktığı için ikinci kez etkilenmez. Söylentiler zamanla söner.
- **Huya göre tepki matrisi** (`namTepkisi`, dört huy grubu):
  ilkeli (dindar, mert, ciddi) · çıkarcı (kurnaz, hırslı, kibirli) · çekingen (utangaç, dertli, yalnız, sabırlı,
  unutkan) · sıcak (cömert, misafirperver, sıcakkanlı, neşeli, aceleci).
  - Cömertlik: sıcak +8'e kadar, ilkeli/çekingen +4, çıkarcı 0.
  - Zulüm: ilkeli −15'e kadar, sıcak/çekingen −10, çıkarcı −5 (güce saygı).
  - Mertlik: ilkeli +8, çekingen +4 (korunduğunu bilir), sıcak +3. Dindarlık: dindar +8, ciddi/sabırlı +4.
  - Çapkınlık (yeni kalem): dindar/ciddi −8, neşeli 0, diğerleri −3.
- **Kendiliğinden hamleler huyla şekillenir:** senden nefret eden çekingen biri korkulan birine laf sokamaz,
  yolunu değiştirir; ilkeli biri zulmü herkesin önünde yüzüne vurur (itibar −2); çıkarcı huylu, cömertliği dillere
  düşmüş birine sevmese de borç istemeye gelir (ve daha az öder) — saf görünenin kapısı çok çalınır.
  Hakarette sert karşılık veren huylar düzeltildi (olmayan "öfkeli" huyu yerine aceleci, kibirli, mert).
- **İyiliğin ve zulmün karşılığı kişiye bağlı** (tohumlar `npcId` taşır): velinimet ancak yardım ettiğin kişi
  muradına erdiyse döner; o zaman da huyu karar verir (ilkeli yüzde 85, sıcak 80, çekingen 60, çıkarcı 30 vefa) —
  vefasız "seni tanımazdan gelir"; kişi öldüyse ailesi dualarla anar (+1 itibar); hiç belini doğrultamadıysa söner.
  Sömürülen kişi ölmüşse intikam söner; dindar, sabırlı, utangaç olan yarı yarıya affeder.
- **Nesil hafızası:** vâris devrinde her kişinin ataya hesabının yarısı (önceki ataların hatırası da yarılanarak)
  `ata_hatira` olarak kalır (±40) → görüşte "Atanı hatırlayışı" kalemi; güçlü hatırlayanlar vârisi tanır.
  Atanın nâmının dörtte biri (önceki soyun yarısıyla) hanedan nâmı olur → "Hanedanının nâmı" kalemi (±10).
  Çok kişi atayı iyi ya da kötü anıyorsa vâris kroniğe bunu bilerek başlar.
- Ölçüm (aynı simülasyon, sonra): hiç dokunulmamış kişilerin görüşü yardımsever için +7→+18, zalim için −38→−52;
  vârise kasabanın bakışı +7→+43 ve −3→−40; huy grupları arasında belirgin fark; korkudan kaçanlar ve zulmü yüzüne
  vuranlar ortaya çıktı; velinimetlerin üçte biri vefasız çıkıyor.

## Usta, gençlik izi, eşin tepkisi (uygulandı)

- **Gerçek usta** (`usta_id`): 13'te çırak verildiğin usta şehirde mesleğini yapan en kıdemli kişidir; gençlikte
  "ustanın yanında" uğraşı da onu bulur. Çıraklık ve kalfalıkta ustan tezgâhını bırakmaz (göçmez, iş değiştirmez).
  Görüşü peştamal sınavına yansır (+10'a kadar kefil, −8'e kadar aleyh); sever ve geçersen peştamalını kendi kuşatır,
  küsse kaldığında aleyhine konuştuğu duyulur. Ölürse kroniğe düşer; seviyorsa son bir sırrını bırakır (beceri).
  Usta da seni "çırağı" olarak görür (+10). Karakter ekranında ustanın adı profiline açılır.
- **Gençlik izi** (`genclik`): 18'de en az 6 gençlik uğraşı yaptıysan en çok yaptığın kalıcı iz bırakır —
  Hünerli (meslek becerisi), Sözü dinlenir (sosyal, karizma), Gönül ehli (karizma), Yiğit (güç, dayanıklılık, mertlik).
  Karakter ekranında çocukluk rozetinin yanında görünür.
- **Eşin nâmına tepkisi** (yılda bir, yüzde 60): çapkınlığına dindar/ciddi eş −8 (diğerleri −5); zulmüne çıkarcı eş
  memnun (+1), çekingen eş korkar (−3), diğerleri utanır (−4); cömertliğine sıcak/ilkeli eş gurur duyar (+3),
  çıkarcı eş "ocağın akçesini dağıtıyorsun" diye yakınır (−2); dindarlığına dindar eş huzur bulur (+3).
  Bağ 8'in altına düşerse çıkarcı olmayan eş ocağı terk edebilir.

## Suç, işçiler ve aile ihmali artık kişiye dokunuyor (uygulandı)

- **Suçun kurbanı gerçek bir insan:** yankesicilikte çarşıdan biri, dükkân soygununda bir esnaf, konakta varlıklı biri,
  yol soygununda bölgeden geçen bir yolcu (aile, eş, çocuk asla). İş başarılırsa kurban çoğu zaman kimin yaptığını
  bilmez (kronik "kurbanın hâlâ bilmiyor" diye adını anar); beşte bir öğrenir (−15). Yakalanırsan seni tanır:
  "malımı çaldı" anısı (−25, unutulmaz gibi, zulüm nâmı); yakınlarına da dokunur, dedikodusu dolaşır.
- **İşçi çıkarmak:** "ekmeğimi elimden aldı" anısı (−12); kroniğe düşer.
- **Ödenemeyen ücret:** kese (o ayın geliriyle bile) ücretlere yetmezse her işçi "emeğimin karşılığını vermedi" der
  (−8, dedikodusu dolaşır); görüşü dibe vuran (≤−20) işi bırakır. Homurtu kroniği üç ayda bir.
- **Aile ihmali** (yılda bir; aynı yerde yaşıyorlarsa): eşle bir yıl, anne-babayla ya da küçük çocuklarla iki yıl hiç
  vakit geçirilmezse (akşam sofrası da sayılır) eş bağı −4, anne-baba bağı −5, çocukların bağı −5 ve kroniğe düşer.
  12 yıllık ölçümde ihmalkâr karakterin anne-baba bağı 1'e, ilgili olanınki 100'e varıyor.
