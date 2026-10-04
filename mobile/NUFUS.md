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
