// Offline oyun çekirdeği (sürüm 3) — hayat döngüsü + NPC/ilişki/envanter/pazar.
import type { EvtParam } from "./i18n";
import { currentCalendar, playerAge, CalendarInfo } from "./calendar";
import { ITEMS, marketGoods, locSeed, generateNPCs, NPC, generateDynasties, cityInfo, RivalHouse, houseNameIdx, localFirstName, localSurname, SPECIALTIES, Item, WClass, applyFamilySurnames, npcAgeProfession } from "./world";
import { Lang } from "./locale-data";
import { converse, ConvResult, spontaneousLine, callbackLine, perceptionGreeting } from "./dialogue";
import { Memory, addMemory, decayMemories, effectiveRel, behaviorTier, MEMORY_TYPES, RUMOR_VARIANTS } from "./npc-mind";
import { arcById, ArcChoice, availableArcs } from "./arcs";

export interface Stats { strength: number; intelligence: number; charisma: number; stamina: number; }
export interface Skills { combat: number; trade: number; crafting: number; social: number; }
export interface Injury { label: string; stat: keyof Stats; delta: number; weeks_left: number; permanent: boolean; }
export interface Player {
  name: string; surname: string; gender: "erkek" | "kadın"; base_age: number; age: number;
  money: number; profession: string; health: number; hunger: number;
  reputation: number; honor: number; fear: number; fame: number;
  stats: Stats; stat_points: number; dead: boolean; location_name: string; home_name: string;
  married: boolean; spouse_name: string | null; children: string[];
  spouse_is_player?: boolean; // çok oyuncu: eş başka bir GERÇEK oyuncu → yerel sim onu öldüremez (desync önlenir)
  widowed?: boolean; // eşi vefat etmiş (dul); married=false olur ama anı/eulogy için iz kalır
  mother?: string; father?: string; mother_dead?: boolean; father_dead?: boolean; // ebeveynler de fanidir; oyuncu yaşlandıkça birer kez vefat eder
  parent_bond?: number; // anne-babayla bağ 0-100 (ziyaret besler; vefat acısı ve küçük miras bağa oranlı; eski kayıtta yoksa 45 sayılır)
  parent_visit_turn?: number; // bu ay ebeveyn ziyareti yapıldı mı (turda tek — bağ farmı önlenir)
  mother_seed?: number; father_seed?: number; spouse_seed?: number; // kültürel isim için tohum (dile göre çözülür)
  spouse_mizac?: string; // kur yaptığın NPC'nin karakterinden gelen eş mizacı (tanıdığın kişi evlenince başkalaşmaz)
  married_turn?: number; // evliliğin kurulduğu tur (yıldönümü anları; eski kayıtta yoksa yıldönümü sessizce atlanır)
  spouse_bond?: number; // eşle bağ 0-100 (yaşayan evlilik: anlar besler, ihmal/flört törpüler; dulluk acısı ve yıldönümü sıcaklığı buna oranlı)
  spouse_time_turn?: number; // bu ay eşle vakit geçirildi mi (turda tek — bağ farmı önlenir)
  inventory: Record<string, number>; properties: Property[]; generation: number;
  faction: string | null; faction_standing: Record<string, number>;
  skills: Skills; skill_xp: Skills; perks: string[];
  stat_xp?: Stats; // özellik tecrübesi (kullanımla birikir; stat_points'e EK — Vercel add_stat_xp)
  injuries: Injury[]; career_xp: number;
  nam: Nam; child_invests: Record<string, string[]>;
  child_edu?: Record<string, { track: string; weeks: number }>; // süregelen evlat eğitimi (haftalık biriken)
  child_bond?: Record<string, number>; // evlat başına bağ 0-100 (ilgiyle beslenir; ilk dokunuşta 50)
  child_time_turn?: number; // bu ay evlatla ilgilenildi mi (turda tek — bağ farmı önlenir)
  equipped: { silah: string | null; zirh: string | null } & Partial<Record<EquipSlot, string | null>>;
  equipped_q?: Partial<Record<EquipSlot, QualityTier>>; // kuşanılı teçhizatın kalite kademesi
  crowned?: boolean; will_pref?: string;
  fates?: string[]; // tetiklenen kader anları (yaş dönümleri)
  claimed?: string[]; // ödülü alınan başarımlar
  fq_claimed?: string[]; // tamamlanan aile/yaşam görevleri (family_quests portu)
  professions_tried?: string[]; // denenen meslekler — koleksiyon başarımları için ömürlük iz (vârise geçmez: her hayat kendi yolunu yürür)
  capstones?: string[]; // zirvesine varılan meslekler — capstone sahnesi meslek başına bir kez düşer
  cities_visited?: string[]; // ayak basılan yerleşimler — koleksiyon başarımları için ömürlük iz
  inv_q?: Record<string, Partial<Record<QualityTier, number>>>; // eşya kalite kırılımı (quality.py portu; sıradan izlenmez)
  last_study_turn?: number; lesson_count?: number; // mektep: sınav sayacı (eski gate; enerji sistemine taşındı)
  study_energy?: number; // aylık çalışma gücü — ders + kulüp meşki bundan harcanır
  play_energy?: number; // çocukluk günleri hakkı — mektepten AYRI havuz (ders çalışmak oyunu yemez)
  club?: string; teacherBond?: number; // mektep kulübü (haftalık pasif XP) + hoca bağı
  club_standing?: number; last_club_turn?: number; club_grad?: string; // kulüp itibarı + aylık meşk kapısı + mezun olunan kulüp
  horse?: boolean; horse_name?: string; // bir atın var mı + adı (hızlı/güvenli "at ile" yolculuğu açar; yolda kaybedilebilir)
  child_acts?: Partial<Record<"oyun" | "yardim" | "yaramazlik" | "kesif", number>>; childhood?: string; // çocukluk eğilim sayacı + reşitlikte belirlenen çocukluk karakteri
  child_friend?: { id: string; seed: number; gender: "erkek" | "kadın"; bond: number; feud?: number }; // oyun yoldaşı: oyunla büyüyen bağ; bağ güçlüyse ömürlük dost, dargınlık (feud) büyürse rakip olur
  child_dream?: string; // çocukluk hayali (meslek domeni: combat/trade/crafting/social); reşitlikte meslek uyarsa ödül
  hotGoods?: number; // satılmamış sıcak mal değeri (büyük soygunlardan; eritilmesi riskli)
  gamble_turn?: number; // zar meclisi ayda bir el — kasa avantajlı kumar gelir farm'ı olamaz
  plot_wins?: number; // tamamlanan komplolar — Gölge Ustası başarımı ve entrika ustalığı izi
  retinue?: number; // maiyet: ulufeli muhafız (0-3) — savaş gücü + yol caydırıcılığı; ulufe ödenmezse dağılır
  listen_turn?: number; // kulak tutma ayda bir — istihbarat spam'i ve bedava keşif olmaz
  last_crime_turn?: number; // son suç denemesi turu (ay başına tek deneme; risksiz spam önlenir)
  crime_wins?: number; // başarıyla tamamlanan suç sayısı — yeraltı namı; ağır işler bununla açılır (merdiven)
  governorships?: string[]; // valisi olunan şehirler
  legacy?: Record<string, boolean>; // kalıcı görkem eserleri (vakıf/anıt/imaret) — bir kez kurulur
  govLeg?: Record<string, number>; // valilik meşruiyeti (şehir → 0-100); düşerse isyan/azil
  govTax?: Record<string, number>; // valilikte vergi oranı (şehir → %; default 15)
  govHappy?: Record<string, number>; // valilikte halk memnuniyeti (0-100)
  govTreasury?: Record<string, number>; // şehir hazinesi (vergiyle dolar, projeye harcanır)
  govEdict?: Record<string, number>; // şehir → son ferman çıkarılan tur (ferman bekleme süresi)
  govWorks?: Record<string, string[]>; // şehir → kurulan bayındırlık eserleri (kalıcı; memnuniyet/gelir taban yükseltir)
  crownAuthority?: number; // hükümdar otoritesi (0-100); düşerse saray olayları/isyan, çok düşerse taht tehlikede
  crownDecree?: number; // son şâhâne ferman (dîvân) turu — bekleme süresi
  appointedGov?: Record<string, { seed: number; gender: "erkek" | "kadın"; loyalty: number }>; // hükümdarın atadığı valiler (şehir → vekil + sadakat) → haraç geliri
  crownConquests?: string[]; // sefere çıkıp ilhak edilen beylikler (haraç + güç + şöhret)
  campaignsWon?: number; // kazanılan sefer sayısı (şöhret/miras)
  prof_action_turn?: number; // son meslek imza eylemi turu (bekleme süresi)
  work_turn?: number; // bu ay çalışıldı mı (tur başına tek maaşlı iş — para/kariyer farmı önlenir)
  exploit_turn?: number; // bu ay NPC istismarı yapıldı mı (tur başına tek — çapraz-NPC para farmı önlenir)
  faction_task_turn?: number; // bu ay ocak görevi yapıldı mı (tur başına tek — itibar/para farmı önlenir)
  faction_power_turn?: number; // bu ay ocak nüfuzu kullanıldı mı (tur başına tek)
  war_support_turn?: number; // bu ay cepheye destek verildi mi (tur başına tek)
  favor_turn?: number; // bu ay pîşkeş/iltifat yapıldı mı (tur başına tek)
  craft_turn?: number; // bu ay zanaat işlendi mi (tur başına tek — beceri/kalite-satış farmı önlenir)
  battle_turn?: number; // bu ay taktik savaşa/düelloya girildi mi (tur başına tek — para/beceri/itibar farmı önlenir; work/war ile aynı desen)
  battle_award_turn?: number; // bu ay dövüş sonucu uygulandı mı (giriş kilidi battle_turn'e taşındı; ödülün tek-seferliği bu alanla korunur)
  enc_won?: Record<string, true>; // yenilen efsane karşılaşmaların izi (başarımlar okur; opsiyonel — eski kayıt kırılmaz)
  bloodline_end?: string; // Kan Defteri'nin kapanış biçimi: kiyim/dunurluk/bedel (başarım okur; opsiyonel)
  festival_turn?: number; // bu ayın şenlik sahnesi çözüldü mü (şenlikler sabit aylarda yılda bir döner — ödülleri farmlanamaz)
  apprentice?: { id: string; name: string; months: number; skill: keyof Skills }; // usta çağında yanına alınan çırak (tek seferde bir; hikmet aktarımı)
  apprentice_turn?: number; // bu ay çırakla çalışıldı mı (ayda bir ders — ilişki/beceri farmı önlenir)
  intimidate_turn?: number; // bu ay gözdağı verildi mi (tur başına tek — korku spam'i önlenir)
  feast_turn?: number; // bu ay ziyafet verildi mi (tur başına tek — para→şöhret/itibar çeviricisi farmlanamaz)
  alms_turn?: number; // bu ay sadaka dağıtıldı mı (tur başına tek — şeref farmı önlenir)
  trade_xp_turn?: number; // bu ay pazar işleminden ticaret tecrübesi alındı mı (tur başına tek — al-sat XP farmı önlenir)
  yr_money?: number; // geçen yaş gününde kese ne kadardı (yıl dönümü özeti farkı için)
  temperament?: string; // yaratılışta seçilen mizaç (yigit/kurnaz/merhametli/hirsli) — ömürlük küçük etkiler
  crown_action_turn?: number; // bu ay taht eylemi (iddiacıyı bastır/uzlaş) yapıldı mı — tur başına tek
  jail?: { left: number; kind: string } | null; // zindan: kalan ay + sebep (ağır suç bedeli — zaman kaybı gerçek risk)
  jail_freed?: number; races_won?: number; divan_resolved?: number; // başarım sayaçları (history budanır; sayaç kalıcı — opsiyonel, eski kayıt dokunmadan)
  estate?: number; // aile konağı kademesi (0-6) — nesillere kalan görkem merdiveni (avlu→saray yavrusu)
  vakif_fon?: number; // vakıf fonuna ömür boyu akıtılan toplam (SINIRSIZ) — servetin anlama dönüşen tek sayacı
  vakif_turn?: number; // bu ay vakfa bağış yapıldı mı (tur başına tek — itibar damlası farmlanamaz)
  exam_wins?: number; // geçilen sınav sayısı — ilk 3'ü serbest puan verir, sonrası tecrübeye döner (okul musluğu inceltildi)
  last_travel_turn?: number; // bu ay yol olayı tetiklendi mi (tur başına tek — git-gel beceri/eşya farmı önlenir)
  gov_action_turn?: number; // bu ay valilik tedbiri (meşruiyet/hazine) yapıldı mı (tur başına tek)
  opp_turn?: number; // bu ay fırsat çözüldü mü (tur başına tek — çoklu fırsat gelir farmı önlenir)
  courtRank?: number; // saray/divan rütbesi (0..4 = Kâtip..Sadrazam; tanımsız = sarayda değil)
  courtXp?: number; // saray hizmet puanı (terfi eşiği)
  courtFavor?: number; // hükümdar nezdinde itibar (0-100); düşerse azil
  court_action_turn?: number; // son divan hizmeti turu (bekleme süresi)
  harvestAccum?: number; wageAccum?: number; // pasif gelir/ücret yıllık birikimi (kronik yılda bir özetlenir; aylık spam önlenir)
  grandchildren?: string[]; // torunlar (oyuncu yaşlanınca yetişkin evlattan doğar; torun anları)
  death_cause?: string; // ölüm nedeni kodu (die() içinde olay anahtarından türetilir; mersiyeye ve hanedan kütüğüne işlenir)
  chronic?: { k: string; since: number }; // kronik hastalık (aylık sızıntı + alevlenme); hekim tedavisiyle geçebilir, vârise geçmez
  healer_turn?: number; // bu ay hekime görünüldü mü (tur başına tek — şifa farm'ı yok)
  propose_turn?: number; // bu ay bir haneye teklif götürüldü mü (diplomasi tek girişim)
  bargain_buy_turn?: number; bargain_sell_turn?: number; // pazarlık ayda birer kez (sınırsız arbitraj + XP farm'ı kapalı)
  dilemma_turn?: number; // ikilem sonucu turda bir kez uygulanır (çift tık / yarış koruması)
  prestige_turn?: number; // ayda tek hayrat işi (hekim/imaret spam'ı kapalı)
  gov_run_turn?: number; // ayda tek valilik adaylığı
  fac_rank_seen?: Record<string, number>; // lonca başına görülen en yüksek rütbe — tören yalnız onu aşınca (standing düşüp çıksa da tekrarlanmaz)
  child_meta?: { n: string; born: number; ms?: number }[]; // evlat kilometre taşları: doğum turu + son anılan eşik (ilk adım/mektep/çıraklık/yetişkinlik)
  factionBans?: Record<string, number>; // fraksiyon id → geri dönüş yasağının bittiği tur (FACTION_MEMBERSHIP)
  factionLeaves?: Record<string, number>; // fraksiyondan kaç kez ayrıldın (yasak süresi tırmanır)
  priceMem?: Record<string, number>; // fiyat hafızası: "loc|good" → geçen ay kaydedilen alış fiyatı (pazar 'geçen fiyat' göstergesi)
  debt?: number; loan_turn?: number; // tefeci borcu (aylık faiz işler) + ilk ödünç alınan tur
  deposit?: number; // sarraf emaneti (hırsızlık/yağma/haciz olaylarından korunur; yıllık küçük mudârabe getirisi)
  last_zekat?: number; // son zekât verilen tur (yılda bir kapısı); serveti saygınlığa çevirir
}
// Çocuğa yatırım — vâris olursa başlangıç avantajı verir.
export interface Investment { id: string; label: string; icon: string; cost: number; desc: string; }
export const INVESTMENTS: Investment[] = [
  { id: "egitim", label: "Eğitim",        icon: "graduate-cap",   cost: 50, desc: "Vâris olursa +2 zekâ, +1 özellik puanı." },
  { id: "savas",  label: "Savaş Eğitimi", icon: "crossed-swords", cost: 50, desc: "Vâris olursa +2 güç, savaş becerisi." },
  { id: "zanaat", label: "Zanaat",        icon: "anvil",          cost: 40, desc: "Vâris olursa zanaat becerisi + akçe." },
  { id: "sosyal", label: "Sosyal Terbiye",icon: "lyre",           cost: 40, desc: "Vâris olursa +2 karizma, sosyal beceri." },
  { id: "saglik", label: "Sağlık Bakımı", icon: "healing",        cost: 30, desc: "Vâris olursa dinç başlar (+itibar)." },
];
// Süregelen eğitim yolu — tek-seferlik yatırımdan farklı olarak HER AY emek+akçe ister ve birikir;
// vâris olunca biriken aylara göre ölçekli bonus verir (Vercel legacy_system EDUCATION_TRACKS portu).
export interface EduTrack { id: string; label: string; icon: string; weekly: number; stat?: keyof Stats; skill?: keyof Skills; }
export const EDU_TRACKS: EduTrack[] = [
  { id: "ilim",    label: "İlim Yolu",    icon: "graduate-cap",   weekly: 3, stat: "intelligence" },
  { id: "savas",   label: "Savaş Yolu",   icon: "crossed-swords", weekly: 3, stat: "strength", skill: "combat" },
  { id: "zanaat",  label: "Zanaat Yolu",  icon: "anvil",          weekly: 2, skill: "crafting" },
  { id: "ticaret", label: "Ticaret Yolu", icon: "coins",          weekly: 2, stat: "charisma", skill: "trade" },
  { id: "kelam",   label: "Kelam Yolu",   icon: "speaker",        weekly: 2, skill: "social" },
];
// Biriken ay sayısı → bonus kademesi: <10 ay etkisiz, ~6 ayda +1 (max +3). Vercel apply_child_bonus hizası.
export function eduLevel(weeks: number): number { return weeks < 10 ? 0 : Math.max(1, Math.min(3, Math.floor(weeks / 26))); }
// Vasiyet stilleri — miras oranı ve yeni nesle etki.
export interface WillStyle { id: string; label: string; desc: string; frac: number; repBonus: number; }
export const WILL_STYLES: WillStyle[] = [
  { id: "esit",  label: "Eşit Pay",   desc: "Mirasın yarısı vârise; huzurlu geçiş.", frac: 0.5, repBonus: 0 },
  { id: "tek",   label: "Tek Vâris",  desc: "Servetin çoğu vârise; ama dedikodu artar.", frac: 0.75, repBonus: -4 },
  { id: "hayir", label: "Hayır İşleri",desc: "Servetin bir kısmı yoksullara; yeni nesle saygınlık.", frac: 0.4, repBonus: 14 },
];
// Nam profili — 5 boyut (söylentilerle halkın gözündeki kişiliğin).
export interface Nam { comert: number; zalim: number; capkin: number; dindar: number; mert: number; }
export const NAM_META: { key: keyof Nam; label: string; icon: string }[] = [
  { key: "comert", label: "Cömert", icon: "coins" },
  { key: "zalim",  label: "Zalim",  icon: "skull" },
  { key: "capkin", label: "Çapkın", icon: "ring" },
  { key: "dindar", label: "Dindar", icon: "prayer-beads" },
  { key: "mert",   label: "Mert",   icon: "shield" },
];
function bumpNam(p: Player, key: keyof Nam, amt: number) { if (p.nam) p.nam[key] = Math.max(0, Math.min(100, p.nam[key] + amt)); }
// Yaralanmalar bir özelliği geçici/kalıcı düşürür. Etkili (effective) değer.
export function effStat(p: Player, key: keyof Stats): number {
  const pen = (p.injuries || []).filter((i) => i.stat === key).reduce((a, i) => a + i.delta, 0);
  let base = p.stats[key];
  if (key === "charisma" && p.equipped?.kiyafet) base += attireScore(p).charisma; // kıyafet karizmaya katkı
  return Math.max(0, base - pen);
}
// Mülk: konuma bağlı (loc) + kondisyon (cond 0..100) + kademe (level 1..3). Gelir refah×kondisyon×kademe.
export interface Property { type: string; loc: string; cond: number; level?: number; workers?: string[]; ledger?: { y: number; net: number }[]; }
export const PROP_MAX_LEVEL = 3;
export function propUpgradeCost(pr: Property): number { return Math.round((PROPERTY_TYPES[pr.type]?.cost || 100) * (pr.level || 1) * 0.8); }
export function upgradeProperty(prev: GameState, index: number): GameState {
  const s = clone(prev); const p = s.player; const pr = p.properties[index];
  if (p.dead || !pr || (pr.level || 1) >= PROP_MAX_LEVEL) return s;
  const cost = propUpgradeCost(pr); if (p.money < cost) return s;
  p.money -= cost; pr.level = (pr.level || 1) + 1;
  { const uv = chance(0.5); push(s, "mülk", uv ? `İskele kuruldu, duvar yükseldi; ${pr.loc}'daki ${(PROPERTY_TYPES[pr.type]?.name || "mülk").toLowerCase()} artık ${pr.level}. kademede — komşular "maşallah" dedi (−${cost} akçe).` : `${PROPERTY_TYPES[pr.type]?.name || "Mülk"} (${pr.loc}) büyütüldü — kademe ${pr.level} (−${cost} akçe).`, "kişisel", true, { k: uv ? "evj.propUp2" : "evj.propUp", p: [{ pt2: pr.type }, { pl: pr.loc }, pr.level || 1, cost] }); }
  return s;
}
// Gerçekçi fiyatlar: bir mülk yıllarca geri ödenen ciddi bir yatırımdır (en ucuzu ~2.000 akçe).
// Nominal "cost" enflasyonla çarpılarak güncel alış bedeli bulunur (propBuyCost).
export const PROPERTY_TYPES: Record<string, { name: string; icon: string; cost: number; income: number; slots: number }> = {
  tarla:    { name: "Tarla",    icon: "wheat", cost: 2000,  income: 30,  slots: 3 },
  ev:       { name: "Ev",       icon: "house", cost: 2500,  income: 36,  slots: 1 },
  bag:      { name: "Bağ",      icon: "leaf",  cost: 4000,  income: 55,  slots: 2 },
  dukkan:   { name: "Dükkân",   icon: "coins", cost: 6500,  income: 90,  slots: 2 },
  han:      { name: "Han",      icon: "castle", cost: 11000, income: 150, slots: 3 },
  degirmen: { name: "Değirmen", icon: "anvil", cost: 18000, income: 210, slots: 4 },
};
// Güncel alış bedeli = nominal × enflasyon (geç-oyunda mülk pahalanır → nakit erir, değer korunur).
export function propBuyCost(s: GameState, type: string): number { return Math.round((PROPERTY_TYPES[type]?.cost || 0) * inflationFactor(s)); }
// Bir konumdaki (bölge) sahip olunan mülk sayısı — kademeli yerleşim kurma şartı.
export function propsInLoc(s: GameState, loc: string): number { return s.player.properties.filter((pr) => pr.loc === loc).length; }
// Aylık yaşam gideri (gerçek hayat filtresi): hane masrafı + mülk/yerleşim bakımı + servete göre
// artan maiyet/ziyafet/sadaka/vergi yükü. Zengin oldukça gider de büyür → para hep önemli kalır.
// Bu enflasyon DEĞİL; soylunun kendi yaşam masrafıdır (oyuncu-bazlı, dünya enflasyonundan ayrı).
export function lifestyleUpkeep(s: GameState): number {
  const p = s.player; const inf = inflationFactor(s);
  let u = (4 + Math.floor(p.age / 10)) * inf;                    // hane geçim gideri (yaş + enflasyonla artar)
  u += p.properties.length * 3 * inf;                            // mülk bakımı & tapu vergisi
  u += (s.settlements?.length || 0) * 8 * inf;                   // yerleşim idare gideri
  // Servete göre kademeli yaşam yükü (maiyet, ziyafet, sadaka beklentisi, divan vergisi) — zengini ısırır.
  // Emanet de servet sayılır → sarrafa yatırarak yaşam yükünden kaçılmaz.
  // Mülk nominali de yarı ağırlıkla sayılır → nakdi tapuya çevirerek de kaçılmaz (denge simi: 361 tarla sıfır vergi ödüyordu).
  const propNominal = p.properties.reduce((a, pr) => a + (PROPERTY_TYPES[pr.type]?.cost || 0), 0);
  const w = p.money + (p.deposit || 0) + 0.5 * propNominal; const b1 = 5000 * inf, b2 = 20000 * inf, b3 = 100000 * inf;
  let annual = 0;
  if (w > b1) annual += (Math.min(w, b2) - b1) * 0.03;
  if (w > b2) annual += (Math.min(w, b3) - b2) * 0.06;
  if (w > b3) annual += (w - b3) * 0.10;
  u += annual / 12;
  return Math.max(0, Math.round(u));
}
// ── Tefeci (sarraf) borç sistemi — gerçek ekonomi: nakit sıkışınca ödünç al, ama faiz acımasız işler ──
// Aylık ~%2.5 (yıllık ~%34, dönem-gerçekçi tefecilik). Tüccar loncası/Tefeci pâyesi şartları yumuşatır.
export const LOAN_MONTHLY_RATE = 0.025;
export function loanRate(s: GameState): number {
  let r = LOAN_MONTHLY_RATE;
  if (s.player.faction === "tuccar") r -= 0.006;       // tüccar loncası → tefeciyle araları iyi
  if (hasPerk(s.player, "tefeci")) r -= 0.005;          // tefecilik ağını bilirsin
  return Math.max(0.012, Math.round(r * 1000) / 1000);
}
// Kredi tavanı: itibar + mülk teminatı (enflasyonla ölçekli). İtibarın dipteyse tefeci güvenmez, az verir.
export function creditLimit(s: GameState): number {
  const p = s.player;
  const propVal = p.properties.reduce((a, pr) => a + (PROPERTY_TYPES[pr.type]?.cost || 0), 0);
  const repFactor = Math.max(0.05, (p.reputation + 100) / 200); // -100..100 → 0.05..1
  const base = (1000 + propVal * 0.4) * repFactor;
  return Math.round(base * inflationFactor(s));
}
// O an alınabilecek azami ödünç (tavan − mevcut borç).
export function loanCapacity(s: GameState): number { return Math.max(0, creditLimit(s) - Math.round(s.player.debt || 0)); }
export function borrow(prev: GameState, amount: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 16) return s;                   // borç ehliyeti reşit yaşta
  const amt = Math.min(Math.max(0, Math.round(amount)), loanCapacity(s));
  if (amt <= 0) return s;
  p.money += amt; p.debt = Math.round((p.debt || 0) + amt);
  if (!p.loan_turn) p.loan_turn = s.turn;
  push(s, "ticaret", `Sarraftan ${amt} akçe ödünç aldın; borcun ${p.debt} akçe oldu (aylık faiz işler).`, "kişisel", false, { k: "evj.borrow", p: [amt, p.debt] });
  return s;
}
export function repay(prev: GameState, amount: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  const amt = Math.min(Math.max(0, Math.round(amount)), Math.min(p.money, p.debt || 0));
  if (amt <= 0) return s;
  p.money -= amt; p.debt = Math.round((p.debt || 0) - amt);
  if (p.debt <= 0) {
    // İtibar yalnız gerçekten taşınmış (önceki turdan kalan, faizi işlemiş) borcun kapanmasında —
    // aynı turda al-öde döngüsüyle bedava itibar pompalanamaz.
    const carried = p.loan_turn !== undefined && s.turn - p.loan_turn >= 3 && amt >= 100; // itibar yalnız gerçek faiz bedeli ödenmişse: ≥100 akçe borç ≥3 ay taşınıp kapanınca (1 akçelik borçla bedava itibar pompalanamaz)
    p.debt = 0; p.loan_turn = undefined;
    if (carried) p.reputation = Math.min(100, p.reputation + 2);
    push(s, "ticaret", `Borcunu tümüyle kapattın; sarraf defterini sildi, sözün yeniden geçer oldu (+itibar).`, "kişisel", true, { k: "evj.repayFull" });
  } else {
    push(s, "ticaret", `Borcuna ${amt} akçe ödedin; kalan borç ${p.debt} akçe.`, "kişisel", false, { k: "evj.repay", p: [amt, p.debt] });
  }
  return s;
}
// ── Sarraf emaneti (safekeeping) — borcun karşıt kutbu: âtıl serveti sarrafa yatır.
// Emanet hırsızlık/yağma/haciz olaylarından korunur; yıllık küçük mudârabe getirisi (~%2) işler.
// Yaşam gideri ve mirasta yine servet sayılır (emanetle vergi/upkeep'ten kaçılmaz).
export const DEPOSIT_ANNUAL_YIELD = 0.02;
export function depositCoin(prev: GameState, amount: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  const amt = Math.min(Math.max(0, Math.round(amount)), p.money);
  if (amt <= 0) return s;
  p.money -= amt; p.deposit = Math.round((p.deposit || 0) + amt);
  push(s, "ticaret", `Sarrafa ${amt} akçe emanet bıraktın; kesen yağmadan, hırsızdan emin (emanet ${p.deposit} akçe).`, "kişisel", false, { k: "evj.deposit", p: [amt, p.deposit] });
  return s;
}
export function withdrawCoin(prev: GameState, amount: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  const amt = Math.min(Math.max(0, Math.round(amount)), p.deposit || 0);
  if (amt <= 0) return s;
  p.deposit = Math.round((p.deposit || 0) - amt); p.money += amt;
  push(s, "ticaret", `Sarraftan ${amt} akçe emanetini geri aldın (emanet ${p.deposit} akçe).`, "kişisel", false, { k: "evj.withdraw", p: [amt, p.deposit || 0] });
  return s;
}
// ── Zekât — serveti saygınlığa çevirir (gönüllü, yılda bir). Nisabı aşan servetin %2.5'i yoksula.
// Para sırf gider değil: dindar/cömert nam + itibar + şöhrete dönüşür (zengine anlamlı, dönem-gerçekçi bir musluk).
export function zekatNisab(s: GameState): number { return Math.round(800 * inflationFactor(s)); }
export function zekatDue(s: GameState): number {
  const p = s.player; const wealth = p.money + (p.deposit || 0);
  return wealth > zekatNisab(s) ? Math.round((wealth - zekatNisab(s)) * 0.025) : 0;
}
export function zekatAvailable(s: GameState): boolean {
  const p = s.player; const z = zekatDue(s);
  return !p.dead && p.age >= 13 && z > 0 && p.money >= z && (p.last_zekat == null || s.turn - p.last_zekat >= 12);
}
export function giveZekat(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (!zekatAvailable(s)) return s;
  const z = zekatDue(s); p.money -= z; p.last_zekat = s.turn;
  bumpNam(p, "dindar", 5); bumpNam(p, "comert", 5);
  p.reputation = Math.min(100, p.reputation + 3); p.fame = Math.min(100, p.fame + 1);
  { const zv2 = chance(0.5); push(s, "bagis", zv2 ? `Kesenin hakkı ayrıldı: ${z} akçe yoksulun avucuna aktı; dualar kapına birikti.` : `Malının zekâtını verdin (${z} akçe yoksula); gönlün ferahladı, eli açık diye anıldın.`, "kişisel", true, { k: zv2 ? "evj.zekat2" : "evj.zekat", p: [z] }); }
  return s;
}
// Eş mizacı (tohumdan, deterministik): evli hayat anlarının sıklığını/etkisini renklendirir, eşi birey yapar.
export const SPOUSE_MIZAC = ["sefkatli", "caliskan", "dikbasli", "dindar"] as const;
export function spouseMizac(seed: number): string { return SPOUSE_MIZAC[(seed >>> 0) % SPOUSE_MIZAC.length]; }
// Tanıdığın bir NPC ile evlenince eş mizacı onun karakterinden gelir (kişi evlenince başkalaşmaz).
const TRAIT_TO_MIZAC: Record<string, string> = {
  "sıcakkanlı": "sefkatli", "cömert": "sefkatli", "neşeli": "sefkatli", "utangaç": "sefkatli",
  "hırslı": "caliskan", "ciddi": "caliskan", "kurnaz": "caliskan",
  "kibirli": "dikbasli", "dertli": "dikbasli", "yalnız": "dikbasli",
  "dindar": "dindar", "mert": "dindar",
};
export function mizacFromTrait(trait: string, seed: number): string { return TRAIT_TO_MIZAC[trait] || spouseMizac(seed); }
// Evlat tabiatı (isim+nesil tohumundan, deterministik): her çocuğun kendine özgü doğası;
// vâris seçimini anlamlı kılar (vâris olunca küçük bir başlangıç eğilimi verir).
export const CHILD_NATURE = ["cesur", "zeki", "hunerli", "sevecen", "hirsli"] as const;
export function childNature(name: string, generation: number): string {
  let h = (generation * 0x9e3779b1) >>> 0;
  for (let i = 0; i < name.length; i++) h = ((h * 31) + name.charCodeAt(i)) >>> 0;
  return CHILD_NATURE[h % CHILD_NATURE.length];
}
// ── Mülk-işçi (NPC istihdamı) ekonomisi — Vercel property_system.py portu ──
// Bir mülkün işçi alabileceği yer sayısı: tip slotu + her kademe için +1.
export function propWorkerSlots(pr: Property): number { return (PROPERTY_TYPES[pr.type]?.slots || 0) + ((pr.level || 1) - 1); }
// Yaşayan dünya kadrosu: deterministik temel (isim dile göre çözülür) + kalıcı evrim katmanı (ölüm/yaş/doğum).
// Kadro büyüklüğü yerleşim tipine göre: şehir kalabalık, köy tenha (canlı dünya hissi).
export function rosterSize(loc: string): number { const k = placeKind(loc); return k === "şehir" ? 30 : k === "kale" ? 20 : 15; } // test geri bildirimi: 10 kişilik kasaba boş hissettiriyordu; taban deterministik olduğundan büyütme eski kayıtlara yeni yüzler ekler, kimseyi silmez
// Dünya saati: nesiller boyu biriken yıl (NPC'ler bununla yaşlanır).
export function worldYears(s: GameState): number { return (s.world?.npcYears || 0) + Math.floor(s.turn / 12); }
// Deterministik temel kadro önbelleği: generateNPCs(loc,lang) saf ve değişmez → sonsuza dek memo'lanır.
// (42 yerleşimli dünyada yaşayan-dünya tikinin her yıl tüm lokasyonları taramasını ucuzlatır.)
const _rosterBaseCache: Record<string, NPC[]> = {};
function rosterBase(loc: string, lang: Lang): NPC[] {
  const key = loc + "|" + lang;
  let b = _rosterBaseCache[key];
  if (!b) { b = generateNPCs(locSeed(loc), rosterSize(loc), lang, loc); applyFamilySurnames(loc, b); _rosterBaseCache[key] = b; }
  return b;
}
export function rosterAt(s: GameState, loc: string, lang: Lang = "tr"): NPC[] {
  const wy = worldYears(s); const evo = s.world?.npcEvo;
  // Yaşa göre normalize: meslek (çocuk/çırak) + 14 altı hedef gütmez (2 yaşında tüccar/borç olmaz).
  const norm = (n: NPC, age: number): NPC => ({ ...n, age, profession: npcAgeProfession(evo?.[n.id]?.prof || n.profession, age), goal: age < 14 || evo?.[n.id]?.goalDone ? "" : n.goal });
  const base = rosterBase(loc, lang)
    .map((n) => norm({ ...n, alive: evo?.[n.id]?.dead ? false : true } as NPC, Math.min(95, n.age + wy)))
    .filter((n) => n.alive !== false);
  const born = (s.world?.npcBorn || []).filter((n) => n.loc === loc && n.alive !== false)
    .map((n) => norm({ ...n, name: n.nameSeed != null ? `${localFirstName(n.nameSeed, n.gender, lang)} ${localSurname(n.nameSeed * 2 + 1, lang)}` : n.name } as NPC, Math.min(95, n.age + Math.max(0, wy - (n.bornY ?? wy)))));
  return born.length ? [...base, ...born] : base;
}
// Bir mülkün şehrinin işçi havuzu (yaşayan kadrodan).
export function townNpcsOf(s: GameState, loc: string, lang: Lang = "tr"): NPC[] { return rosterAt(s, loc, lang); }
// Yaşayan dünya tiki (Vercel simulation _age_and_die / _marry_and_birth): yılda bir yaşa-bağlı ölüm + dengeli doğum (nüfus stabil) + evlilik haberi.
function npcBaby(s: GameState, loc: string): NPC {
  const n = generateNPCs((locSeed(loc) ^ s.turn ^ Math.floor(Math.random() * 1e6)) >>> 0, 1, "tr", "born")[0];
  n.id = `born_${loc}_${s.turn}_${Math.floor(Math.random() * 1e6)}`; n.loc = loc; n.alive = true; n.age = 0; n.bornY = worldYears(s);
  // profession/goal saklı kalır (yetişkin değeri); gösterimde rosterAt yaşa göre çocuk/çırak'a indirger.
  n.nameSeed = (Math.floor(Math.random() * 1e9)) >>> 0; // isim dile göre çözülsün
  return n;
}
// Diyara yerleşen bekâr yetişkin: oyuncunun çağında kimse kalmadıysa kasabaya taze kan (yılda en çok bir; farm yok — oyuncu eylemi değil).
function npcNewcomer(s: GameState, loc: string, gender: "erkek" | "kadın", age: number): NPC {
  const n = npcBaby(s, loc);
  n.gender = gender; n.age = Math.max(18, Math.min(50, age));
  return n;
}
function npcLifeTick(s: GameState) {
  if (s.turn === 0 || s.turn % 12 !== 0) return; // yılda bir
  if (!s.world.npcEvo) s.world.npcEvo = {};
  if (!s.world.npcBorn) s.world.npcBorn = [];
  let knownGone: string | null = null;
  for (const loc of LOCATIONS) {
    for (const n of rosterAt(s, loc)) {
      const dc = n.age < 55 ? 0 : n.age < 70 ? 0.02 : n.age < 82 ? 0.07 : 0.18; // yaşa göre ölüm şansı
      if (dc <= 0 || Math.random() >= dc) continue;
      if (n.id.startsWith("born_")) { const b = s.world.npcBorn.find((x) => x.id === n.id); if (b) b.alive = false; }
      else s.world.npcEvo[n.id] = { dead: true };
      s.world.npcBorn.push(npcBaby(s, loc)); // her ölüm bir doğumla dengelenir → nüfus stabil
      // Ölen NPC oyuncunun işçisiyse mülkten çıkar (slot boşalsın) + haber ver.
      for (const pr of s.player.properties) { if (pr.workers?.includes(n.id)) { pr.workers = pr.workers.filter((id) => id !== n.id); push(s, "mülk", `İşçin ${n.name} vefat etti; mülkünde bir yer boşaldı.`, "kişisel", false, { k: "npclife.workerDied", p: [n.name, { pt2: pr.type }] }); } }
      if (!knownGone && s.npc_state?.[n.id]) knownGone = n.name;
    }
  }
  // Bekâr yaşıt garantisi: bekâr oyuncunun (18-50) kasabasında çağına yakın bekâr kalmadıysa yılda bir yeni biri yerleşir (test geri bildirimi: "yaşıtım bekâr yok").
  const pp = s.player;
  if (!pp.dead && !pp.married && pp.age >= 18 && pp.age <= 50) {
    const eligible = rosterAt(s, pp.location_name).filter((n) => n.gender !== pp.gender && n.age >= 18 && n.age < 60 && Math.abs(n.age - pp.age) <= 12);
    if (eligible.length < 2) {
      const g2: "erkek" | "kadın" = pp.gender === "erkek" ? "kadın" : "erkek";
      const nc = npcNewcomer(s, pp.location_name, g2, pp.age - 2 + Math.floor(Math.random() * 6));
      s.world.npcBorn.push(nc);
      push(s, "dunya_olayi", `${pp.location_name}'e yeni biri yerleşti; çarşıda tanımadık bir yüz var.`, "kişisel", false, { k: "npclife.newcomer", p: [{ pl: pp.location_name }] });
    }
  }
  if (knownGone) push(s, "dunya_olayi", `${knownGone} bu dünyadan göçtü; tanıdık bir yüz eksildi.`, "kişisel", true, { k: "npclife.deathKnown", p: [knownGone] });
  else if (Math.random() < 0.5) { // evlilik haberi (nüfus etkisi yok)
    const loc = rnd(LOCATIONS); const r = rosterAt(s, loc);
    const m = r.find((n) => n.gender === "erkek" && n.age >= 18 && n.age < 55);
    const f = r.find((n) => n.gender === "kadın" && n.age >= 18 && n.age < 55);
    if (m && f) push(s, "dunya_olayi", `${loc}'de ${m.name} ile ${f.name} dünyaevi kurdu.`, "makro", false, { k: "npclife.marry", p: [m.name, f.name] });
  }
  // Omuz verilen hayaller boşa gitmez: yılda bir, yardım görmüş NPC'lerden biri muradına erebilir (dünya dokunuşunla değişir).
  for (const id of Object.keys(s.world.npcEvo)) {
    const e = s.world.npcEvo[id];
    if (!e.goalHelped || e.goalDone || e.dead || Math.random() >= 0.35) continue;
    e.goalDone = true;
    s.relationships[id] = Math.min(100, (s.relationships[id] || 0) + 10);
    s.player.reputation = Math.min(100, s.player.reputation + 2);
    push(s, "dunya_olayi", `${e.gname || "Bir dost"} yıllardır kovaladığı hayaline kavuştu — senin desteğinle. Adın hayır duayla anılıyor.`, "kişisel", true, { k: "npclife.goalDone", p: [e.gname || "?", { goalk: e.goalk || "" }] });
    break; // yılda en çok bir murat haberi (olay seli olmasın)
  }
  // NPC'ler kendi hayalini kendisi de kovalar: yılda ~%45 şansla diyardan BİR yetişkin, kimse yardım etmeden muradına erer.
  // Dünya oyuncusuz da yaşar: dükkân açan/kervana atılan tüccarlığa geçer (şehir kadrosu → arz → fiyat kayar),
  // ustabaşı olan usta izi bırakır (miras ziyareti havuzuna girer). Oyuncuya ödül yok — farm değil, dünya nabzı.
  if (Math.random() < 0.45) {
    const gloc = rnd(LOCATIONS);
    const cands = rosterAt(s, gloc).filter((n) => n.age >= 18 && !!n.goal);
    if (cands.length) {
      const n = rnd(cands);
      const e = (s.world.npcEvo[n.id] = s.world.npcEvo[n.id] || {});
      e.goalDone = true; e.gname = n.name; e.goalk = n.goal;
      if (n.goal === "bir dükkân açmanın hayalini kuruyor" || n.goal === "kervan ticaretine atılmak istiyor") e.prof = "tüccar";
      else if (n.goal === "ustabaşı olmak istiyor") e.usta = true;
      const known = s.relationships[n.id] !== undefined || gloc === s.player.location_name;
      push(s, "dunya_olayi", `${gloc}'te ${n.name} yıllardır kovaladığı hayaline kendi emeğiyle kavuştu: ${n.goal}.`, known ? "kişisel" : "makro", false, { k: "npclife.goalSelf", p: [n.name, { goalk: n.goal }, { pl: gloc }] });
    }
  }
  // Her yıl ölü doğanları ele (yaşayanlar asla silinmez). Böylece npcBorn ≈ yaşayan sayısı (~600) kalır:
  // nüfus korunur (eski 260 sınırı yaşayanı siliyordu) + dizi şişmez (rosterAt ucuz kalır).
  s.world.npcBorn = s.world.npcBorn.filter((n) => n.alive !== false);
  // Nüfus tavanı: yeni gelen/bekâr garantisi akışları canlı sayıyı sınırsız büyütüyordu (40 yılda ~450, on neselde binler).
  // Tavan aşılınca yalnız iz bırakmamış doğanlar (tanışılmamış, ilişkisiz, işçi değil, can yoldaşı değil) en yaşlıdan elenir.
  if (s.world.npcBorn.length > 300) {
    const touched = new Set<string>();
    for (const id of Object.keys(s.npc_state || {})) touched.add(id);
    for (const id of Object.keys(s.relationships || {})) touched.add(id);
    for (const pr of s.player.properties || []) for (const w of pr.workers || []) touched.add(w);
    if (s.player.child_friend) touched.add(s.player.child_friend.id);
    const removable = s.world.npcBorn.filter((n) => !touched.has(n.id)).sort((a, b) => (b.age || 0) - (a.age || 0));
    const drop = new Set(removable.slice(0, s.world.npcBorn.length - 300).map((n) => n.id));
    if (drop.size) s.world.npcBorn = s.world.npcBorn.filter((n) => !drop.has(n.id));
  }
}
// Mesleğe göre üretkenlik uyumu (çiftçi tarlada, demirci değirmende daha verimli).
const PROP_PROF_FIT: Record<string, string[]> = {
  tarla: ["çiftçi", "çoban"],
  ev: ["şifacı", "müzisyen"],
  dukkan: ["tüccar", "fırıncı", "balıkçı"],
  degirmen: ["demirci", "çiftçi"],
};
// İşçi üretkenliği (Vercel _worker_productivity portu): yaş eğrisi + meslek uyumu + mizaç. 0.6–1.6.
export function workerProductivity(npc: NPC, propType: string): number {
  let p = 1.0;
  if (npc.age < 18) p -= 0.3; else if (npc.age <= 45) p += 0.2; else if (npc.age > 55) p -= 0.25;
  if ((PROP_PROF_FIT[propType] || []).includes(npc.profession)) p += 0.3;
  if (npc.trait === "hırslı") p += 0.1; else if (npc.trait === "yalnız" || npc.trait === "dertli") p -= 0.05;
  return Math.max(0.6, Math.min(1.6, p));
}
const WORKER_GROSS = 0.45, WORKER_WAGE = 0.24;
// Bir mülkün işçilerinden gelen brüt katkı ve toplam ücret (tik + UI ortak).
export function propWorkerStats(s: GameState, pr: Property, base: number, condProspLevel: number, lang: Lang = "tr"): { gross: number; wage: number; count: number } {
  const ids = pr.workers || [];
  if (!ids.length) return { gross: 0, wage: 0, count: 0 };
  const npcs = townNpcsOf(s, pr.loc, lang);
  let gross = 0, wage = 0;
  for (const id of ids) {
    const npc = npcs.find((x) => x.id === id); if (!npc) continue;
    const prod = workerProductivity(npc, pr.type);
    gross += base * WORKER_GROSS * prod * condProspLevel;
    wage += base * WORKER_WAGE * prod;
  }
  return { gross, wage, count: ids.length };
}
// Üretim zinciri (Vercel production_chains.py): işçili mülk gerçek hammadde üretir → zanaat/ticaret beslenir.
export const PROP_YIELD: Record<string, string> = { tarla: "bugday", degirmen: "un" };
export function propYield(s: GameState, pr: Property, lang: Lang = "tr"): { good: string; qty: number } | null {
  const good = PROP_YIELD[pr.type]; const ids = pr.workers || [];
  if (!good || !ids.length) return null;
  const npcs = townNpcsOf(s, pr.loc, lang);
  let units = 0;
  for (const id of ids) { const npc = npcs.find((x) => x.id === id); if (npc) units += workerProductivity(npc, pr.type) * (1 + ((pr.level || 1) - 1) * 0.3); }
  const qty = Math.floor(units); // ~işçi başına ayda ~1 birim (üretkenlikle ölçekli)
  return qty > 0 ? { good, qty } : null;
}
// İşçi işe al (mülkün bulunduğu şehrin NPC'lerinden, boş slot varsa).
export function hireWorker(prev: GameState, index: number, npcId: string): GameState {
  const s = clone(prev); if (s.player.dead) return s; const pr = s.player.properties[index];
  if (!pr) return s;
  pr.workers = pr.workers || [];
  if (pr.workers.includes(npcId) || pr.workers.length >= propWorkerSlots(pr)) return s;
  const npc = townNpcsOf(s, pr.loc).find((x) => x.id === npcId);
  if (!npc || npc.age < 14) return s; // çocuk işçi olmaz (çırak yaşı altı işe alınamaz)
  pr.workers.push(npcId);
  push(s, "mülk", `${npc?.name || "Bir işçi"}, ${PROPERTY_TYPES[pr.type]?.name || "mülkünde"} (${pr.loc}) işe alındı.`, "kişisel", true, { k: "evj.workerHired", p: [npc?.name || "Bir işçi", { pt2: pr.type }, { pl: pr.loc }] });
  return s;
}
// İşçi çıkar.
export function fireWorker(prev: GameState, index: number, npcId: string): GameState {
  const s = clone(prev); if (s.player.dead) return s; const pr = s.player.properties[index];
  if (!pr || !pr.workers) return s;
  pr.workers = pr.workers.filter((id) => id !== npcId);
  return s;
}
// ── Örgütler / Loncalar — 1247 Anadolu'sunun güç odakları ──
export interface Faction {
  id: string; name: string; icon: string; blurb: string;
  stat: keyof Stats;            // örgüte uygun temel özellik
  joinRep: number;              // katılmak için gereken örgüt itibarı (görevle kazanılır)
  perk: string;                 // üyelik avantajı açıklaması
  task: { label: string; reward: number; standing: number; desc: string };
  taskAlts?: string[]; // ek görev metni varyantları (yalnız anlatı — ödül formülü task'tan; tekrar hissini kırar, denge değişmez)
}
export const FACTIONS: Faction[] = [
  { id: "tuccar", name: "Tüccarlar Loncası", icon: "pazar", blurb: "İpek yolunun akçesi onların avucunda döner.", stat: "charisma", joinRep: 30, perk: "Pazarda alış fiyatları senin için biraz düşer.", task: { label: "Kervan hesabı tut", reward: 28, standing: 10, desc: "Loncanın defterlerini denkleştir." }, taskAlts: ["Kervana refakat et", "Pazar kavgasını yatıştır", "Gece ambar sayımına gir", "Kalp akçeyi ayıkla", "Uzak iskeleyle pazarlığa otur", "Bozuk tartıları mühürlet"] },
  { id: "demirci", name: "Demirciler Loncası", icon: "anvil", blurb: "Köz ve örs; her kılıcın ve sabanın atası.", stat: "strength", joinRep: 30, perk: "İşten kazancın artar (zanaat eli).", task: { label: "Ocakta körük çek", reward: 24, standing: 10, desc: "Usta için ağır bir sipariş bitir." }, taskAlts: ["Nal siparişini yetiştir", "Çırakları çalıştır", "Köprü zincirini döv", "Su dolabının milini döv", "Caminin şamdanlarını onar", "Zindan kapısına yeni kilit döv"] },
  { id: "asker", name: "Asker Ocağı", icon: "karakter", blurb: "Sınır boylarının kalkanı; sancağın gölgesi.", stat: "strength", joinRep: 40, perk: "Suç ve tehlikede sağlık kaybın azalır.", task: { label: "Devriyeye çık", reward: 32, standing: 12, desc: "Gece nöbetinde yolları kolla." }, taskAlts: ["Sur nöbetine dur", "Yol kesen çeteyi dağıt", "Panayır asayişini tut", "Kaçakçı geçidini kapat", "Elçi kafilesine kalkan ol", "Yerinden oynayan sınır taşlarını dik"] },
  { id: "sifaci", name: "Şifacılar Meclisi", icon: "healing", blurb: "Ot, dua ve sabır; canın sessiz bekçileri.", stat: "intelligence", joinRep: 30, perk: "Her ay az da olsa sağlık tazelenir.", task: { label: "Hastalara bak", reward: 18, standing: 10, desc: "Köyün dermansızlarına şifa dağıt." }, taskAlts: ["Dağdan ot getir", "Loğusa evine koş", "Salgın çadırında nöbet tut", "Kırık çıkık sar", "Kervansaray hamamını ilaçla", "Mahpuslara hekimlik et"] },
  { id: "golge", name: "Gölge Kardeşliği", icon: "hood", blurb: "Adı anılmaz, yüzü görülmez; ama her kapıda bir kulağı vardır.", stat: "charisma", joinRep: 25, perk: "Gölge işlerinde yakalanma riskin azalır.", task: { label: "Haber taşı", reward: 22, standing: 12, desc: "Kardeşlik için sessizce bir sır ulaştır." }, taskAlts: ["Bir mührü sahtele", "Kulağı delik ol", "Defterden bir borç sildir", "Yanlış bir söylenti yay", "Bir tanığı sessizce şehirden çıkar", "Sarayda bir kulak bırak"] },
];
export function factionById(id: string | null): Faction | undefined { return FACTIONS.find((f) => f.id === id); }
// Fraksiyon arketipleri — AI'ın MANTIKLI davranması için (şifacı savaş açmaz, müttefikler birbirine saldırmaz).
//  aggression: savaşa/darbeye iştah (0 barışçıl … 1 savaşçı) · enemies/allies: doğal husumet/dostluk · acts: karaktere uygun AI eylemleri.
export interface FactionTrait { aggression: number; enemies: string[]; allies: string[]; acts: string[]; }
export const FACTION_TRAITS: Record<string, FactionTrait> = {
  asker:   { aggression: 0.90, enemies: ["golge"],            allies: ["demirci"],        acts: ["nufuz", "darbe", "bagis"] },
  golge:   { aggression: 0.70, enemies: ["asker", "tuccar"],  allies: [],                 acts: ["sabotaj", "suikast", "nufuz"] },
  tuccar:  { aggression: 0.35, enemies: ["golge"],            allies: ["demirci"],        acts: ["bagis", "nufuz"] },
  demirci: { aggression: 0.40, enemies: [],                   allies: ["asker", "tuccar"], acts: ["nufuz", "bagis"] },
  sifaci:  { aggression: 0.05, enemies: [],                   allies: [],                 acts: ["bagis", "uye"] }, // barışçıl: asla savaş/darbe/suikast
};
export function factionTrait(id: string): FactionTrait { return FACTION_TRAITS[id] || { aggression: 0.3, enemies: [], allies: [], acts: ["bagis"] }; }
// İki fraksiyon arasındaki doğal duruş: -1 düşman, +1 dost, 0 nötr (UI + AI için).
export function factionStance(a: string, b: string): number {
  if (a === b) return 1;
  const ta = factionTrait(a);
  if (ta.allies.includes(b)) return 1;
  if (ta.enemies.includes(b)) return -1;
  if (factionTrait(b).enemies.includes(a)) return -1;
  return 0;
}
// İki lonca arası ateşkes (savaştan sonra hemen tekrar savaşmasınlar).
function warPairKey(a: string, b: string): string { return [a, b].sort().join("|"); }
function onWarCooldown(s: GameState, a: string, b: string): boolean { return (s.warCooldowns?.[warPairKey(a, b)] ?? 0) > s.turn; }
function setWarCooldown(s: GameState, a: string, b: string, turns: number) { if (!s.warCooldowns) s.warCooldowns = {}; s.warCooldowns[warPairKey(a, b)] = s.turn + turns; }
// Loncaya katılım eşiği (karizmatik hüneri %20 indirir). UI ile çekirdek tutarlı olsun diye.
export function joinThreshold(p: Player, f: Faction): number { return p.perks.includes("karizmatik") ? Math.round(f.joinRep * 0.8) : f.joinRep; }

export interface GameEvent { day: number; type: string; text: string; scope: "kişisel" | "makro"; landmark?: boolean; k?: string; p?: EvtParam[]; }
export interface DynastyRecord { generation: number; name: string; profession: string; diedAge: number; fame: number; reputation: number; faction: string | null; note: string; noteK?: string; causeK?: string; } // noteK: kitabe kimliği (6 dile çevrilir); note eski kayıtlar için TR yedek; causeK: ölüm nedeni kodu
export interface NpcState { mood: number; memories: string[]; anilar?: Memory[]; int_turn?: number; } // int_turn: bu kişiyle bu ay anlamlı bir etkileşim (sohbet/flört/hediye/hakaret/dedikodu) yapıldı mı — tur başına tek, ilişki/beceri farmı önlenir
// İlişkinin etkin değeri: kalıcı taban + yapısal anıların toplam yükü (Vercel effective_rel).
export function relWith(s: GameState, id: string): number {
  return effectiveRel(s.relationships[id] || 0, s.npc_state?.[id]?.anilar);
}
// Bir NPC'ye yapısal anı ekle (kişiselleştirilmiş hatırlama + dedikodu + nam kaynağı).
function remember(s: GameState, npc: { id: string; name: string }, tur: string, opts?: { yuk?: number; taniklar?: string[] }) {
  const ns = npcStateOf(s, npc.id);
  if (!ns.anilar) ns.anilar = [];
  addMemory(ns.anilar, tur, s.turn, { ...opts, kaynak: npc.name });
}
// ── Sonuç tohumları (Vercel story_director sow_seed): bugün ektiğin yıllar sonra biçilir ──
export interface Seed { id: string; kaynak: string; ekim: number; hmin: number; hmax: number; agirlik: "kucuk" | "orta" | "buyuk"; nesil: boolean; etki?: { money?: number; reputation?: number; health?: number }; npcName?: string; }
function sowSeed(s: GameState, opts: Omit<Seed, "id" | "ekim">) {
  if (!s.seeds) s.seeds = [];
  s.seeds.push({ ...opts, id: opts.kaynak + "_" + Math.random().toString(36).slice(2, 8), ekim: s.turn });
  if (s.seeds.length > 30) s.seeds = s.seeds.slice(-30);
}
function seedKosulOk(s: GameState, t: Seed): boolean {
  return true; // (ileride itibar/para koşulu eklenebilir)
}
function germinateSeed(s: GameState, t: Seed) {
  s.seeds = (s.seeds || []).filter((x) => x.id !== t.id);
  const p = s.player;
  if (t.etki?.money) p.money = Math.max(0, p.money + t.etki.money);
  if (t.etki?.reputation) p.reputation = Math.max(-100, Math.min(100, p.reputation + t.etki.reputation));
  if (t.etki?.health) p.health = Math.max(1, Math.min(100, p.health + t.etki.health));
  push(s, "tohum", `Geçmiş kapını çaldı.`, "kişisel", true, { k: "seed." + t.kaynak, p: [t.npcName || "", p.name] });
}
function seedTick(s: GameState) {
  const seeds = s.seeds; if (!seeds || !seeds.length) return;
  const turn = s.turn; const ready: [Seed, boolean][] = [];
  for (const t of seeds) {
    const yas = turn - t.ekim;
    if (yas >= t.hmax) ready.push([t, true]); // vadesi doldu — zorla biçilir
    // Büyük tohumlar doruğu bekler (directorTick'te biçilir); küçük/orta tohumlar kendiliğinden filizlenir.
    else if (yas >= t.hmin && seedKosulOk(s, t) && t.agirlik !== "buyuk" && Math.random() < 0.05) ready.push([t, false]);
  }
  if (!ready.length) return;
  ready.sort((a, b) => (a[1] === b[1] ? a[0].ekim - b[0].ekim : (a[1] ? -1 : 1)));
  germinateSeed(s, ready[0][0]);
}
// (Nesil devri tohum aktarımı continueAsHeir içinde: sadece nesil aşabilenler kalır.)

// ── Çağ olayları (Vercel legacy_system epoch_tick): her ~60-90 turda kalıcı dünya kırılması ──
function epochTick(s: GameState) {
  if (s.player.dead) return;
  if (s.epochNext == null) { s.epochNext = s.turn + 60 + Math.floor(Math.random() * 36); return; }
  if (s.turn < s.epochNext) return;
  s.epochNext = s.turn + 60 + Math.floor(Math.random() * 36);
  const k = rnd(["savas", "salgin", "taht", "altincag"]);
  if (k === "savas") {
    s.econ = Math.max(0.7, (s.econ || 1) - 0.2); s.player.fear = Math.min(100, s.player.fear + 2);
    if (s.realm) for (const sn of s.realm) sn.tension = Math.min(120, sn.tension + 15); // savaş sancakları kızıştırır
    push(s, "cag", `Çağın gölgesi: diyarı büyük bir savaş sardı; yollar tehlikeli, pazar daraldı.`, "makro", true, { k: "epoch.savas" });
  } else if (k === "salgin") {
    s.econ = Math.max(0.7, (s.econ || 1) - 0.15);
    if (Math.random() < 0.3) s.player.health = Math.max(1, s.player.health - 10);
    push(s, "cag", `Çağın gölgesi: bir salgın diyarı kırıp geçiyor; herkes kapısını sıkı tuttu.`, "makro", true, { k: "epoch.salgin" });
  } else if (k === "taht") {
    if (s.realm && s.realm.length) { const sn = rnd(s.realm); sn.tension = Math.min(120, sn.tension + 25); }
    push(s, "cag", `Çağın gölgesi: tahtta el değişti; yeni efendiler, yeni dengeler.`, "makro", true, { k: "epoch.taht" });
  } else {
    s.econ = Math.min(1.5, (s.econ || 1) + 0.25);
    push(s, "cag", `Çağın aydınlığı: bir altın çağ başladı; bolluk ve bereket diyara yayıldı.`, "makro", true, { k: "epoch.altincag" });
  }
}

// ── Hikâye Yönetmeni (Vercel story_director): doruk üretimi + nefes kuralı ──
// Gerilim 80+ → tek büyük dramatik an (olgun büyük tohum varsa onu doruğa saklamıştı);
// sonra gerilim düşer ve birkaç tur "nefes" (sakin dönem) garanti edilir.
function directorTick(s: GameState) {
  const st = s.story; if (!st || s.player.dead) return;
  if ((st.breath || 0) > 0) {
    st.breath = (st.breath || 0) - 1;
    st.tension = Math.max(0, st.tension - 2);
    if (st.breath === 0) push(s, "huzur", `Fırtına dindi; bir süre sular durulur.`, "kişisel", false, { k: "dir.breathEnd" });
    return;
  }
  if (st.tension < 80) return;
  // 1) Olgunlaşmış büyük tohum varsa doruğa o saklanmıştı — şimdi biçilir.
  const big = (s.seeds || []).filter((t) => t.agirlik === "buyuk" && s.turn - t.ekim >= t.hmin).sort((a, b) => a.ekim - b.ekim)[0];
  if (big) {
    germinateSeed(s, big);
  } else if (st.nemesis && Math.random() < 0.6) {
    push(s, "doruk", `Husumet doruğa çıktı: ${st.nemesis.name} gölgeden çıkıp üstüne geldi.`, "kişisel", true, { k: "dir.climaxNemesis", p: [st.nemesis.name] });
    s.player.fear = Math.min(100, s.player.fear + 4);
    st.nemesis.power += 3;
  } else if (Math.random() < 0.5) {
    s.player.reputation = Math.min(100, s.player.reputation + 5); s.player.fame = Math.min(100, s.player.fame + 4);
    push(s, "doruk", `Yıllardır biriken gerilim doruğa vardı — ve bu kez talih senden yana döndü.`, "kişisel", true, { k: "dir.climaxWin" });
  } else {
    push(s, "doruk", `Hayatın bir dönüm noktasına geldi; eski dengeler sarsıldı.`, "kişisel", true, { k: "dir.climaxTurn" });
  }
  st.tension = 30; st.breath = 4; st.lull = 0;
}

// Skandal bir eyleme yakındaki bir NPC tanık olur → skandal anı (dedikodu kaynağı).
function witnessScandal(s: GameState, tur: string, chance: number) {
  if (Math.random() >= chance) return;
  const npcs = npcsOf(s); if (!npcs.length) return;
  remember(s, npcs[Math.floor(Math.random() * npcs.length)], tur);
}
// Dedikodu turu: işlenmemiş skandal anılar oyuncu söylentisine dönüşür (Vercel gossip_tick).
function gossipTick(s: GameState) {
  const turn = s.turn;
  let rumors = s.player_rumors || [];
  for (const r of rumors) r.siddet = Math.round((r.siddet - 0.15) * 100) / 100;
  rumors = rumors.filter((r) => r.siddet > 0).slice(-12);
  if (s.npc_state) for (const id in s.npc_state) {
    const anilar = s.npc_state[id].anilar; if (!anilar) continue;
    for (const m of anilar) {
      if (m.yayildi || (turn - m.hafta) > 4) { m.yayildi = true; continue; }
      const skandal = MEMORY_TYPES[m.tur]?.skandal || 0;
      if (skandal <= 0 || !RUMOR_VARIANTS[m.tur]) { m.yayildi = true; continue; }
      m.yayildi = true;
      const tanik = 1 + (m.taniklar?.length || 0);
      const sans = Math.min(0.9, tanik * skandal * 0.55);     // yoğunluk ~orta varsayılır (offline)
      if (Math.random() >= sans) continue;
      const vc = RUMOR_VARIANTS[m.tur];
      rumors.push({
        id: Math.random().toString(36).slice(2, 12), hafta: turn, tur: m.tur, vi: Math.floor(Math.random() * vc),
        nam: MEMORY_TYPES[m.tur]?.nam || null, yon: m.yuk > 0 ? 1 : -1,
        siddet: Math.min(3, Math.max(1, Math.round(Math.abs(m.yuk) / 12))), kaynak: m.kaynak || "",
      });
    }
  }
  s.player_rumors = rumors.slice(-12);
}
// ── Eyleme dönük duyumlar (Vercel rumors.py actionable_rumors portu) ──
// Piyasa ipucu: deterministik fiyat modelinden GERÇEK arbitraj (ucuz şehir → pahalı şehir); takip eden kazanır.
// Fraksiyon istihbaratı: süren bir savaşın önceden duyulması.
export interface Tip { id: string; kind: "market" | "intel"; hafta: number; good?: string; cheap?: string; expensive?: string; fac?: string; vsFac?: string; }
function makeMarketTip(turn: number): Tip | null {
  const goods = Object.keys(ITEMS);
  const gid = goods[Math.floor(Math.random() * goods.length)];
  let cheap = "", exp = ""; let lowBuy = Infinity, highSell = -Infinity;
  for (const loc of LOCATIONS) {
    const g = marketGoods(locSeed(loc)).find((x) => x.id === gid); if (!g) continue;
    if (g.buy < lowBuy) { lowBuy = g.buy; cheap = loc; }
    if (g.sell > highSell) { highSell = g.sell; exp = loc; }
  }
  if (!cheap || !exp || cheap === exp || highSell < lowBuy * 1.15) return null; // anlamlı marj yoksa ipucu üretme
  return { id: Math.random().toString(36).slice(2, 10), kind: "market", hafta: turn, good: gid, cheap, expensive: exp };
}
function tipsTick(s: GameState) {
  let tips = (s.tips || []).filter((tp) => s.turn - tp.hafta <= 6); // ~6 ay sonra bayatlar
  if (Math.random() < 0.22 && tips.length < 4) {
    const war = (s.wars || [])[0];
    if (war && Math.random() < 0.5) {
      if (!tips.some((tp) => tp.kind === "intel" && tp.fac === war.a && tp.vsFac === war.b))
        tips.push({ id: Math.random().toString(36).slice(2, 10), kind: "intel", hafta: s.turn, fac: war.a, vsFac: war.b });
    } else {
      const mt = makeMarketTip(s.turn);
      if (mt && !tips.some((tp) => tp.kind === "market" && tp.good === mt.good && tp.cheap === mt.cheap)) tips.push(mt);
    }
  }
  s.tips = tips.slice(-4);
}
// Söylenti eylemi: yüzleş / yay / sustur (Vercel rumor_action). Döndürür yeni state.
export function rumorAction(prev: GameState, rumorId: string, eylem: "yuzles" | "yay" | "sustur"): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  const rumors = s.player_rumors || [];
  const r = rumors.find((x) => x.id === rumorId);
  if (!r) return s;
  const social = p.skills?.social || 0;
  if (eylem === "yuzles") {
    const sans = Math.max(0.15, Math.min(0.85, 0.40 + social * 0.05 + socialPresence(p) * 0.03 - r.siddet * 0.08));
    if (Math.random() < sans) {
      s.player_rumors = rumors.filter((x) => x.id !== rumorId);
      p.reputation = Math.min(100, p.reputation + 2); bumpNam(p, "mert", 3);
      push(s, "söylenti", `"${r.kaynak}" yüzüne karşı sözünü yutmak zorunda kaldı; söylenti söndü.`, "kişisel", false, { k: "rum.confront.win" });
    } else {
      r.siddet = Math.min(4, r.siddet + 1);
      push(s, "söylenti", `Yüzleşme ters tepti — söylenti alevlendi.`, "kişisel", false, { k: "rum.confront.lose" });
    }
    return s;
  }
  if (eylem === "yay") {
    if (r.yon <= 0) return s; // kendi aleyhine lafı yaymak akıl kârı değil
    if (r.yayildi) return s; // aynı söylenti bir kez yayılır — tıkla-itibar farm'ı kapalı
    r.yayildi = true;
    r.siddet = Math.min(4, r.siddet + 1); p.reputation = Math.min(100, p.reputation + 1);
    push(s, "söylenti", `Sözü sen de salladın; namın büyüyor.`, "kişisel", false, { k: "rum.spread.win" });
    return s;
  }
  // sustur
  const cost = 15 * Math.round(r.siddet);
  if (p.money < cost) return s;
  p.money -= cost;
  if (Math.random() < 0.70) {
    s.player_rumors = rumors.filter((x) => x.id !== rumorId);
    push(s, "söylenti", `${cost} akçe doğru ellere dağıldı; konuşan diller unutkanlaştı.`, "kişisel", false, { k: "rum.silence.win", p: [cost] });
  } else {
    bumpNam(p, "zalim", 3);
    rumors.push({ id: Math.random().toString(36).slice(2, 12), hafta: s.turn, tur: "dolandiricilik", vi: 0, nam: "zalim", yon: -1, siddet: 2, kaynak: r.kaynak });
    s.player_rumors = rumors.slice(-12);
    push(s, "söylenti", `Para el değiştirdi ama biri boşboğazlık etti: "Rüşvet dağıtıyor!" İş büyüdü.`, "kişisel", true, { k: "rum.bribe" });
  }
  return s;
}
export interface StoryProgress { active: { id: string; stage: string } | null; completed: string[]; tension: number; nemesis?: { name: string; power: number } | null; flags?: Record<string, boolean>; lull?: number; breath?: number; }
export interface GameState {
  turn: number; seed: number; player: Player; history: GameEvent[];
  newsSeenTurn?: number; // haberler ekranının son görüldüğü tur (menü rozeti için; opsiyonel — eski kayıtlar dokunulmadan çalışır)
  relationships: Record<string, number>; world: { ready: boolean; npcEvo?: Record<string, { dead?: boolean; age?: number; married?: boolean; goalHelped?: boolean; goalDone?: boolean; gname?: string; goalk?: string; usta?: boolean; prof?: string }>; npcBorn?: NPC[]; npcYears?: number; inflation?: number; marketLeverUntil?: number; mkt?: Record<string, number> };
  dynasty: DynastyRecord[];
  npc_state: Record<string, NpcState>;
  story: StoryProgress;
  wars: FactionWar[];
  warCooldowns?: Record<string, number>; // iki lonca arası ateşkes: pair → bu tura kadar yeni savaş yok
  realm?: SancakHold[]; // 4 sancağın fraksiyon hakimiyeti (emergent şehir-kontrolü)
  mpRealm?: boolean; // çok oyuncu: beylik hakimiyeti SUNUCUDA → yerel ocak-beylik savaşı bastırılır (paralel gerçeklik olmaz)
  rivals?: RivalHouse[]; // rakip hanedanların yaşayan gücü (zamanla değişir + hamle yapar)
  pretender?: { houseId: string; strength: number } | null; // taht iddiacısı: taçtayken beliren rakip hanedan — bastır ya da uzlaş, yoksa iç savaş
  caravan: { invested: number; dest: string; route?: string[]; step?: number; lost?: number; returnTurn?: number; good?: string; spread?: number } | null;
  econ: number; // piyasa çarpanı (kıtlık>1, bolluk<1)
  settlements?: Settlement[]; // hanedanın kurduğu yerleşimler
  marketEvent?: { goods: string[]; mult: number; until: number; key: string } | null; // geçici piyasa olayı
  player_rumors?: Rumor[]; // oyuncu hakkında dolaşan söylentiler (npc_mind dedikodu ağı)
  seeds?: Seed[]; // sonuç tohumları (geçmişin geleceğe etkisi)
  dynastyOffers?: DynastyOffer[]; // dost hanelerden ittifak/evlilik teklifleri
  allied_houses?: string[]; // ittifak kurulan hanelerin id'leri
  feud?: { houseId: string; nameIdx: number; stage: number; heat: number; act_turn?: number } | null; // kan davası: tek aktif dava; ısı büyür, aşama tırmanır, NESLE GEÇER (continueAsHeir)
  bloodline?: { houseId: string; nameIdx: number; gen: number; scene: string | null; path: string[]; opened: number; act_turn?: number } | null; // KAN DEFTERİ: dava kana bulanınca açılan nesiller aşan destan — VÂRİSE GEÇER (gen+1, devir sahnesi)
  succession?: { favored: string | null; rift: number } | null; // VERASET: gözde vâris ilanı — kardeş kırgınlığı birikir; ölümde meşruiyet etkisi (vârise taşınmaz)
  crownCampaign?: { beylikId: string; month: number; edge: number } | null; // SEFER 2.0: üç aylık yürüyüş — ay ay ilerler, hüküm ayında zar atılır (vârise geçmez)
  plot?: { kind: "leke" | "sabotaj" | "nifak"; houseId: string; nameIdx: number; stage: number; heat: number; helpers: number; started: number } | null; // entrika: tek aktif komplo; fısıltı birikir, açığa çıkabilir; ölümle düşer (vârise GEÇMEZ)
  enemyPlot?: { houseId: string; nameIdx: number; kind: "leke" | "sabotaj"; stage: number; known: boolean } | null; // karşı entrika: bir hane oyuncu aleyhine örer; kulak tutarak keşfedilir, kesilmezse patlar
  enemyPlotCool?: number; // patlama/bozulma sonrası soğuma: bu turdan önce yeni düşman komplosu doğmaz
  court?: { vezir?: string | null; hazinedar?: string | null; casusbasi?: string | null } | null; // saray heyeti: yalnız taçta yaşar, ulufe ister, taç düşünce dağılır (vârise GEÇMEZ)
  epochNext?: number; // bir sonraki çağ olayının turu (legacy_system epoch_tick)
  pendingScene?: { kind: string; ctx: Record<string, string> } | null; // oyuncu seçimi bekleyen interaktif sahne (suç kesintisi vb.)
  micro?: { id: string } | null; // ay-içi mikro an: atlanabilir tek satırlık seçim (ertesi ay kendiliğinden kaybolur)
  saga?: { act: number; ch: number; scene?: string | null; path: Record<string, number>; lastTurn?: number; declined?: number } | null; // Kül Yemini destanı: nesiller aşan ana yay (continueAsHeir ile vârise geçer; sahne panoda bekler)
  divan?: { id: string } | null; // taç sahibinin divanına düşen arzuhal (ertesi ay kendiliğinden düşer; ferman bekler)
  schema?: number; // kayıt şeması sürümü — migrate() her yüklemede damgalar; gelecek göçler bununla dallanır
  tips?: Tip[]; // eyleme dönük duyumlar (piyasa ipucu / fraksiyon istihbaratı)
  locEvents?: LocEvent[]; // lokasyon-bazlı tipli dünya olayları (kuraklık/panayır/veba...)
  recent_dilemmas?: string[]; // son görülen ikilem id'leri (ring 6) — dar havuzlarda aynı sahnenin üst üste gelmesi önlenir
}
// Dost bir hanedanın oyuncuya teklifi (ittifak veya evlilik).
export interface DynastyOffer { id: string; houseId: string; nameIdx: number; type: "ittifak" | "evlilik"; }
// Oyuncu hakkında söylenti — tanıklı skandal anıdan doğar, zamanla söner.
export interface Rumor { id: string; hafta: number; tur: string; vi: number; nam: string | null; yon: number; siddet: number; kaynak: string; yayildi?: boolean; }
// Hanedanın kurduğu yerleşim — mezra olarak başlar, yıllarca gelişir, vergi getirir.
export interface Settlement { name: string; founded: number; dev: number; tier?: string; loc?: string; }
// Piyasa çarpanına göre fiyat.
export function marketPrice(base: number, econ: number): number { return Math.max(1, Math.round(base * (econ || 1))); }
// ── Enflasyon (gerçek hayattaki gibi: dünya tabanlı, oyuncudan bağımsız) ──
// Para yıllar geçtikçe yavaşça değer kaybeder (sikke tağşişi); savaş/kıtlık hızlandırır.
// Hisse: biriken nakit erir, üretken mülk değerini korur → para hep önemli kalır.
export function inflationFactor(s: GameState): number { return s.world?.inflation || 1; }
// Mevsimsel fiyat çarpanları (Vercel SEASON_PRICE_MULT portu; mobil eşya kimlikleriyle).
const SEASON_MULT: Record<string, Record<string, number>> = {
  "Kış":      { kereste: 1.25, bugday: 1.15, et: 1.10, ekmek: 1.10, corba: 1.10 },
  "İlkbahar": { yun: 0.9, deri: 0.95 },
  "Yaz":      { kereste: 0.9, et: 0.95, balik: 0.9 },
  "Sonbahar": { bugday: 0.85, sarap: 1.10, kereste: 1.05, un: 0.9 },
};
// Geçici piyasa olayları havuzu (Vercel market_events.py portu, sadeleştirilmiş).
export const MARKET_EVENTS: { key: string; goods: string[]; mult: number; months: number; text: string }[] = [
  { key: "kithasat", goods: ["bugday", "un", "ekmek"], mult: 1.5, months: 4, text: "Kötü hasat: tahıl fiyatları fırladı." },
  { key: "bolluk",   goods: ["bugday", "un", "ekmek"], mult: 0.7, months: 4, text: "Bereketli hasat: tahıl ucuzladı." },
  { key: "savas",    goods: ["demir", "bicak", "kilic", "kalkan"], mult: 1.45, months: 5, text: "Savaş söylentisi: silah ve demir pahalandı." },
  { key: "kervanb",  goods: ["sarap", "bal", "iksir", "sifa"], mult: 1.4, months: 3, text: "Kervan baskını: lüks mallar kıtlaştı." },
  { key: "kuraklik", goods: ["bugday", "et", "balik"], mult: 1.35, months: 5, text: "Kuraklık: yiyecek fiyatları yükseldi." },
  // ── Vercel market_events.py'den ek olaylar (mevcut mallarla) ──
  { key: "loncagrev", goods: ["bicak", "kilic", "celik_kilic", "demir"], mult: 1.4, months: 3, text: "Demirciler lonca grevinde: âlet ve silah kıtlaştı." },
  { key: "panayir",  goods: ["sarap", "bal", "peynir", "et"], mult: 1.3, months: 2, text: "Şehirde panayır: şenlik malları kapışılıyor." },
  { key: "ipekkerv", goods: ["iksir", "sifa", "sarap"], mult: 0.72, months: 3, text: "Doğudan ipek kervanı geldi: lüks mallar ucuzladı." },
  { key: "yolkapan", goods: ["bugday", "un", "demir", "kereste", "deri"], mult: 1.25, months: 3, text: "Geçitler kapandı: her şeyin nakli pahalandı." },
  { key: "bagbozumu",goods: ["sarap", "bal"], mult: 0.7, months: 3, text: "Bağ bozumu: şarap ve bal bollaştı." },
  { key: "deritalep",goods: ["deri", "deri_zirh", "yay"], mult: 1.35, months: 4, text: "Tabakhaneler deriye talip: deri ürünleri pahalandı." },
  { key: "koyunveba",goods: ["yun", "et", "peynir"], mult: 1.4, months: 5, text: "Koyun vebası: yün ve et fiyatları yükseldi." },
  { key: "ormanyang",goods: ["kereste", "kalkan", "yay"], mult: 1.45, months: 5, text: "Orman yangını: kereste ve odun işi pahalandı." },
  { key: "sogukdalg",goods: ["kereste", "et", "corba"], mult: 1.3, months: 4, text: "Sert kış: yakacak ve sıcak yemek arandı." },
  { key: "madendam", goods: ["demir", "bicak", "kilic", "zincir_zirh"], mult: 0.7, months: 4, text: "Yeni maden damarı: demir ve demir işi ucuzladı." },
  { key: "balbolluk", goods: ["bal", "sifa"], mult: 0.75, months: 3, text: "Yaylada arılar coştu: bal bollaştı, macunlar ucuzladı." },
  { key: "tuzyolu", goods: ["et", "balik", "peynir"], mult: 1.3, months: 3, text: "Tuz yolu kesildi: salamura ve kışlık pahalandı." },
  { key: "dugunmev", goods: ["akik_yuzuk", "kehribar_tespih", "gumus_gerdanlik", "altin_bilezik", "ipek_kaftan"], mult: 1.35, months: 3, text: "Düğün mevsimi: takı ve kaftan kapışılıyor." },
  { key: "balikakin", goods: ["balik", "corba"], mult: 0.7, months: 2, text: "Nehirde balık akını: tezgâhlar dolu, fiyat dibe indi." },
  { key: "gocmenakini", goods: ["ekmek", "un", "corba"], mult: 1.3, months: 3, text: "Yerinden edilmiş bir kafile şehre indi: ekmek ve sıcak aş arandı." },
  { key: "kirkimzamani", goods: ["yun"], mult: 0.72, months: 3, text: "Kırkım bereketli geçti: yün çuval çuval, fiyat düştü." },
];
// Bir malın anlık fiyat çarpanı: mevsim × aktif piyasa olayı × ARZ-TALEP (NPC meslekleri) × oyuncu baskısı.
export function goodPriceMult(s: GameState, goodId: string): number {
  let m = (SEASON_MULT[currentCalendar(s.turn).season] || {})[goodId] || 1;
  const ev = s.marketEvent;
  if (ev && ev.until > s.turn && ev.goods.includes(goodId)) m *= ev.mult;
  m *= locPriceMult(s, s.player.location_name, goodId); // bulunduğun şehirdeki olaylar (kuraklık/panayır...) fiyata yansır
  m *= supplyDemandMult(s, s.player.location_name, goodId); // şehrin NPC meslekleri → gerçek yerel arz
  m *= tradePressureMult(s, s.player.location_name, goodId); // oyuncunun alış-satış baskısı (kıtlaştırma/doldurma)
  return m;
}
// Pazarda gösterilen anlık alış fiyatı (pazar.tsx ile birebir aynı formül). Bulunduğun şehir için geçerli.
export function effectiveBuyPrice(s: GameState, baseBuy: number, goodId: string): number {
  return Math.max(1, Math.round(marketPrice(baseBuy, s.econ || 1) * goodPriceMult(s, goodId)));
}
// Fiyat hafızası anlık-görüntüsü: bulunduğun şehrin güncel alış fiyatlarını "loc|good" anahtarıyla kaydet.
// advance'te tur ilerlemeden ÖNCE çağrılır → ayrılan ayın fiyatı saklanır; sonraki ay pazarda "geçen X" olarak görünür.
function snapshotPrices(s: GameState) {
  const loc = s.player.location_name;
  if (!s.player.priceMem) s.player.priceMem = {};
  for (const g of marketGoods(locSeed(loc))) s.player.priceMem[loc + "|" + g.id] = effectiveBuyPrice(s, g.buy, g.id);
}

// ── ARZ–TALEP: şehrin NPC meslekleri gerçek yerel arzı belirler (yaşayan dünyayla değişir) ──
// Hangi meslek hangi malı üretir (ağırlıklı): çiftçi buğday yetiştirir, demirci demir/silah döver...
const GOOD_PRODUCERS: Record<string, [string, number][]> = {
  bugday: [["çiftçi", 1]], un: [["çiftçi", 0.5], ["fırıncı", 0.5]], ekmek: [["fırıncı", 1]], corba: [["fırıncı", 0.6], ["çiftçi", 0.4]],
  peynir: [["çoban", 1]], et: [["avcı", 0.6], ["çoban", 0.5]], balik: [["balıkçı", 1]], yun: [["çoban", 1]],
  bal: [["çiftçi", 0.5]], sarap: [["çiftçi", 0.5]], sifa: [["şifacı", 1]], iksir: [["şifacı", 0.7]],
  demir: [["demirci", 1]], kereste: [["avcı", 0.6], ["çiftçi", 0.4]], deri: [["avcı", 0.7]],
  bicak: [["demirci", 1]], kilic: [["demirci", 1]], celik_kilic: [["demirci", 1]], savas_balta: [["demirci", 1]], kalkan: [["demirci", 1]], zincir_zirh: [["demirci", 1]],
  yay: [["avcı", 0.6], ["demirci", 0.4]], deri_zirh: [["avcı", 0.5], ["demirci", 0.3]],
};
// Malın talep yoğunluğu (nüfusa oranlı): yiyecek herkesçe tüketilir; silah/zırh azdır; hammadde zanaatkârlarca aranır.
const DEMAND_COEF: Record<string, number> = {
  ekmek: 0.16, corba: 0.12, peynir: 0.10, et: 0.12, balik: 0.10, bugday: 0.14, un: 0.10,
  bal: 0.06, sarap: 0.07, sifa: 0.06, iksir: 0.04, yun: 0.07, demir: 0.09, kereste: 0.08, deri: 0.07,
  bicak: 0.05, kilic: 0.04, celik_kilic: 0.03, savas_balta: 0.03, kalkan: 0.03, zincir_zirh: 0.03, yay: 0.04, deri_zirh: 0.03,
};
function workerAgeProd(age: number): number { return age < 16 ? 0.3 : age <= 50 ? 1 : age <= 65 ? 0.7 : 0.4; }
// Çok-girişli memo (42 yerleşimli dünyada kervan arbitrajı tüm lokasyonları taradığından tek-giriş thrash ediyordu).
let _profCache: Record<string, Record<string, number>> = {};
// Şehrin yaşayan kadrosundaki meslek dağılımı (yaşa göre üretkenlik ağırlıklı). Yılda bir değişir → memo.
function cityProfCounts(s: GameState, loc: string): Record<string, number> {
  const key = loc + "@" + worldYears(s) + "#" + s.seed;
  let counts = _profCache[key];
  if (counts) return counts;
  if (Object.keys(_profCache).length > 600) _profCache = {}; // sınır: ara sıra tümden temizle (tembelce yeniden dolar)
  counts = {};
  for (const n of rosterAt(s, loc)) counts[n.profession] = (counts[n.profession] || 0) + workerAgeProd(n.age);
  _profCache[key] = counts;
  return counts;
}
// Oyuncunun bir şehirdeki işçili mülklerinin o malı aylık üretimi (üretim zinciri → şehir arzı).
// Çiftliğin buğdayı sadece oyuncu envanterine değil, o şehrin pazarına da akar → yerel fiyatı düşürür.
function playerPropSupply(s: GameState, loc: string, good: string): number {
  let extra = 0;
  for (const pr of s.player.properties || []) {
    if (pr.loc !== loc || !(pr.workers?.length)) continue;
    const y = propYield(s, pr);
    if (y && y.good === good) extra += y.qty;
  }
  return extra;
}
// Bir malın yerel arzı: üreten mesleklerin ağırlıklı sayısı × mevsim + oyuncu mülklerinin üretimi.
export function cityGoodSupply(s: GameState, loc: string, good: string): number {
  const prod = GOOD_PRODUCERS[good]; if (!prod) return 0;
  const counts = cityProfCounts(s, loc);
  let sup = 0; for (const [prof, w] of prod) sup += (counts[prof] || 0) * w;
  if (prod.some(([p]) => p === "çiftçi" || p === "çoban" || p === "balıkçı"))
    sup *= ({ "İlkbahar": 1.0, "Yaz": 1.1, "Sonbahar": 1.5, "Kış": 0.5 }[currentCalendar(s.turn).season] ?? 1); // mevsim üretimi etkiler
  sup += playerPropSupply(s, loc, good); // oyuncunun çiftlik/değirmen üretimi yerel arzı şişirir
  return sup;
}
// Şehrin GERÇEK geçim uzmanlığı: yaşayan kadronun en çok ürettiği mal grubu (SPECIALTIES indeksi).
// Statik tohum yerine canlı dünyaya bağlı: demirciler ölüp çiftçiler çoğaldıkça uzmanlık kayar.
export function citySpecialtyIdx(s: GameState, loc: string): number {
  let best = 0, bestSup = -1;
  for (let i = 0; i < SPECIALTIES.length; i++) {
    let sup = 0; for (const g of SPECIALTIES[i].goods) sup += cityGoodSupply(s, loc, g);
    if (sup > bestSup) { bestSup = sup; best = i; }
  }
  return best;
}
// Bir malın o şehirdeki anlık pazar durumu (UI rozeti): bol (ucuz) / kıt (pahalı) / dengeli / izlenmiyor.
export function goodMarketTag(s: GameState, loc: string, good: string): "bol" | "kit" | "denge" | null {
  if (!GOOD_PRODUCERS[good]) return null; // arz-talebi modellenmeyen mal (rozet yok)
  const sd = supplyDemandMult(s, loc, good);
  if (sd <= 0.85) return "bol";   // arz bol → ucuz
  if (sd >= 1.18) return "kit";   // arz kıt → pahalı
  return "denge";
}
// Bir malın yerel fiyat yönü (trend oku): oyuncu baskısı + aktif piyasa/şehir olayları. +1 yükseliyor, -1 düşüyor.
export function goodTrend(s: GameState, loc: string, good: string): -1 | 0 | 1 {
  let dir = s.world?.mkt?.[loc + "|" + good] || 0; // oyuncunun alış(+)/satış(−) baskısı
  const me = s.marketEvent;
  if (me && me.until > s.turn && me.goods.includes(good)) dir += (me.mult - 1); // diyar piyasa olayı
  dir += (locPriceMult(s, loc, good) - 1); // şehir olayları (kuraklık/panayır/veba...)
  if (dir > 0.06) return 1;
  if (dir < -0.06) return -1;
  return 0;
}
// Bir malın yerel talebi (nüfusa oranlı). Savaşta silah/zırh talebi artar.
export function cityGoodDemand(s: GameState, loc: string, good: string): number {
  let d = (DEMAND_COEF[good] || 0.06) * rosterSize(loc);
  if ((s.wars?.length || 0) > 0 && (ITEMS[good]?.kind === "silah" || ITEMS[good]?.kind === "zirh")) d *= 1.6;
  return d;
}
// Arz/talep fiyat çarpanı: arz bolsa ucuz, kıt/yoksa pahalı (~0.65–1.6). +0.3: dışarıdan az da olsa mal sızar.
export function supplyDemandMult(s: GameState, loc: string, good: string): number {
  const dem = cityGoodDemand(s, loc, good); if (dem <= 0) return 1;
  const ratio = (cityGoodSupply(s, loc, good) + 0.3) / dem;
  return Math.max(0.65, Math.min(1.6, 1 / (0.55 + 0.45 * ratio)));
}
// Oyuncunun alış-satış baskısı (kıtlaştırma/doldurma) — kalıcı, zamanla söner. Alış fiyatı yukarı, satış aşağı iter.
export function tradePressureMult(s: GameState, loc: string, good: string): number {
  return 1 + Math.max(-0.4, Math.min(0.6, s.world?.mkt?.[loc + "|" + good] || 0));
}
function addTradePressure(s: GameState, loc: string, good: string, delta: number) {
  if (!s.world) return; s.world.mkt = s.world.mkt || {};
  const key = loc + "|" + good;
  s.world.mkt[key] = Math.max(-0.5, Math.min(0.8, (s.world.mkt[key] || 0) + delta));
}
// ── Tipli lokasyon-bazlı dünya olayları (Vercel world_events.py portu) ──
// Her olay BİR şehri vurur: refah/güvenlik + fiyat etkisi + (oradaysan) seni etkiler. Haftalık söner.
export interface LocEvent { id: string; loc: string; type: string; hafta: number; until: number; }
export interface LocEventType { id: string; icon: string; prosp: number; sec: number; goods: string[]; priceMult: number; months: [number, number] }
export const LOC_EVENT_TYPES: Record<string, LocEventType> = {
  kuraklik: { id: "kuraklik", icon: "sun", prosp: -12, sec: 0,   goods: ["bugday", "un", "ekmek", "et", "balik"], priceMult: 1.4, months: [4, 7] },
  bereket:  { id: "bereket",  icon: "wheat", prosp: 10,  sec: 0,   goods: ["bugday", "un", "ekmek"],               priceMult: 0.7, months: [3, 5] },
  eskiya:   { id: "eskiya",   icon: "crossed-swords", prosp: -6,  sec: -22, goods: [],                                       priceMult: 1.0, months: [3, 6] },
  panayir:  { id: "panayir",  icon: "party", prosp: 8,   sec: 0,   goods: ["sarap", "bal", "peynir", "et"],         priceMult: 1.3, months: [2, 3] },
  yangin:   { id: "yangin",   icon: "flame", prosp: -14, sec: -5,  goods: ["kereste"],                              priceMult: 1.4, months: [3, 5] },
  veba:     { id: "veba",     icon: "skull", prosp: -16, sec: 0,   goods: ["sifa", "iksir"],                        priceMult: 1.6, months: [4, 7] },
  ticaret:  { id: "ticaret",  icon: "camel", prosp: 12,  sec: 0,   goods: ["sarap", "bal", "iksir", "sifa"],        priceMult: 0.75, months: [3, 5] },
  isyan:    { id: "isyan",    icon: "crossed-swords", prosp: -10, sec: -18, goods: [],                                       priceMult: 1.0,  months: [3, 5] },
  dugun:    { id: "dugun",    icon: "party", prosp: 9,   sec: 6,   goods: ["sarap", "bal", "peynir", "et"],         priceMult: 1.25, months: [1, 2] },
  goc:      { id: "goc",      icon: "walk",  prosp: -5,  sec: -8,  goods: ["ekmek", "un", "bugday"],                priceMult: 1.25, months: [2, 4] },
  maden:    { id: "maden",    icon: "anvil", prosp: 14,  sec: 0,   goods: ["demir"],                                priceMult: 0.6,  months: [4, 6] },
};
const LOC_EVENT_LABEL: Record<string, string> = { kuraklik: "Kuraklık baş gösterdi", bereket: "Bereketli hasat", eskiya: "Eşkıya türedi", panayir: "Panayır kuruldu", yangin: "Yangın çıktı", veba: "Veba salgını", ticaret: "Ticaret patlaması", isyan: "Ayaklanma çıktı", dugun: "Bey düğünü şenliği", goc: "Göç dalgası vurdu", maden: "Yeni maden damarı" };
// Bir şehirde aktif olayların toplam refah/güvenlik etkisi (mülk geliri, seyahat için).
export function cityFx(s: GameState, loc: string): { prosp: number; sec: number } {
  let prosp = 0, sec = 0;
  for (const e of s.locEvents || []) {
    if (e.loc !== loc || e.until <= s.turn) continue;
    const t = LOC_EVENT_TYPES[e.type]; if (t) { prosp += t.prosp; sec += t.sec; }
  }
  return { prosp, sec };
}
// Bir şehirdeki aktif olayların bir mala uyguladığı fiyat çarpanı.
function locPriceMult(s: GameState, loc: string, goodId: string): number {
  let m = 1;
  for (const e of s.locEvents || []) {
    if (e.loc !== loc || e.until <= s.turn) continue;
    const t = LOC_EVENT_TYPES[e.type]; if (t && t.goods.includes(goodId)) m *= t.priceMult;
  }
  return m;
}
// Bir şehirdeki aktif olay tiplerini döndür (UI için).
export function locEventsAt(s: GameState, loc: string): string[] {
  return (s.locEvents || []).filter((e) => e.loc === loc && e.until > s.turn).map((e) => e.type);
}
// Haftalık: eski olaylar söner, ara sıra yeni olay doğar (oyuncunun yeri + mülk şehirleri biraz daha olası).
function locEventTick(s: GameState) {
  let evs = (s.locEvents || []).filter((e) => e.until > s.turn);
  if (evs.length < 3 && Math.random() < 0.12) {
    const types = Object.keys(LOC_EVENT_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    const pool = [s.player.location_name, ...(s.player.properties || []).map((p) => p.loc), rnd(LOCATIONS)].filter(Boolean);
    const loc = pool[Math.floor(Math.random() * pool.length)];
    if (loc && !evs.some((e) => e.loc === loc)) { // bir şehirde aynı anda tek olay
      const t = LOC_EVENT_TYPES[type];
      const dur = t.months[0] + Math.floor(Math.random() * (t.months[1] - t.months[0] + 1));
      evs.push({ id: Math.random().toString(36).slice(2, 10), loc, type, hafta: s.turn, until: s.turn + dur });
      push(s, "dunya_olayi", `${loc}: ${LOC_EVENT_LABEL[type]} (${LOC_EVENT_TYPES[type].icon})`, "makro", true, { k: "lev." + type, p: [{ pl: loc }] });
    }
  }
  s.locEvents = evs.slice(-4);
}
// Oyuncu olaylı bir şehirdeyse doğrudan hisseder (veba→sağlık, panayır→kazanç, kuraklık→açlık, eşkıya→korku).
function locEventPersonal(s: GameState) {
  for (const e of s.locEvents || []) {
    if (e.loc !== s.player.location_name || e.until <= s.turn) continue;
    if (e.type === "veba" && chance(0.15)) { const h = 6 + Math.floor(Math.random() * 8); s.player.health = Math.max(1, s.player.health - h); push(s, "saglik", `${e.loc}'deki veba sana da bulaştı; halsiz düştün (−${h} sağlık).`, "kişisel", false, { k: "lev.veba.hit", p: [h] }); }
    else if (e.type === "panayir" && s.player.horse && chance(0.20)) {
      const hn = s.player.horse_name || "";
      if (Math.random() < Math.min(0.85, 0.4 + effStat(s.player, "stamina") * 0.05)) { const prize = 20 + Math.floor(Math.random() * 21); s.player.money += prize; s.player.races_won = (s.player.races_won || 0) + 1; s.player.fame = Math.min(100, s.player.fame + 3); bumpNam(s.player, "mert", 1); push(s, "gunluk", `${e.loc} panayırında at yarışına girdin; ${hn} tozu dumana kattı, kese ve alkış senin (+${prize} akçe).`, "kişisel", true, { k: "horse.race.win", p: [{ pl: e.loc }, hn, prize] }); }
      else { s.player.health = Math.max(1, s.player.health - 2); push(s, "gunluk", `${e.loc} panayırındaki yarışta ${hn} son düzlükte kaldı; toz yuttun ama meydan seni tanıdı.`, "kişisel", false, { k: "horse.race.lose", p: [{ pl: e.loc }, hn] }); }
    }
    else if (e.type === "panayir" && chance(0.30)) { const g = 5 + Math.floor(Math.random() * 10); s.player.money += g; s.player.reputation = Math.min(100, s.player.reputation + 1); push(s, "gunluk", `${e.loc} panayırında eğlendin, biraz da kazandın (+${g} akçe).`, "kişisel", false, { k: "lev.panayir.gain", p: [g] }); }
    else if (e.type === "dugun" && chance(0.25)) { const g = 4 + Math.floor(Math.random() * 8); s.player.money += g; s.player.reputation = Math.min(100, s.player.reputation + 1); push(s, "gunluk", `${e.loc}'deki düğün sofrasına oturdun; kesene de neşene de düştü (+${g} akçe).`, "kişisel", false, { k: "lev.dugun.gain", p: [g] }); }
    else if (e.type === "kuraklik" && chance(0.25)) { s.player.hunger = Math.max(0, s.player.hunger - 6); push(s, "gunluk", `${e.loc}'de kuraklık; karın doyurmak zorlaştı.`, "kişisel", false, { k: "lev.kuraklik.hit" }); }
    else if (e.type === "yangin" && chance(0.10)) { s.player.fear = Math.min(100, s.player.fear + 3); push(s, "gunluk", `${e.loc}'deki yangın korku saldı.`, "kişisel", false, { k: "lev.yangin.hit" }); }
  }
}
export function econLabel(econ: number): string {
  if (econ >= 1.18) return "Kıtlık — fiyatlar yüksek";
  if (econ >= 1.06) return "Pahalılık";
  if (econ <= 0.85) return "Bolluk — fiyatlar düşük";
  if (econ <= 0.94) return "Ucuzluk";
  return "Piyasa dengeli";
}
export function econKey(econ: number): string {
  if (econ >= 1.18) return "scarcity";
  if (econ >= 1.06) return "pricey";
  if (econ <= 0.85) return "abundance";
  if (econ <= 0.94) return "cheap";
  return "balanced";
}
// Ocak savaşı — iki lonca arasında, birkaç ay süren çatışma.
export interface FactionWar { a: string; b: string; turnsLeft: number; aScore: number; bScore: number; prize?: string; }
// Sancak hakimiyeti (Vercel faction_system şehir-kontrolü ruhu): her sancağın bir hâkim
// fraksiyonu, yükselen bir rakibi ve gerilimi vardır; gerilim dorukta savaş patlar.
export interface SancakHold { id: string; holder: string; contender: string | null; tension: number; }
// NPC ruh hali/hafıza kaydını getir veya başlat (saf değil — clone'lanmış state'te çağrılır).
export function npcStateOf(s: GameState, id: string): NpcState {
  if (!s.npc_state) s.npc_state = {};
  if (!s.npc_state[id]) s.npc_state[id] = { mood: 0, memories: [] };
  return s.npc_state[id];
}

// Yerleşimler — şehir/köy/kale, beyliklere (region) bağlı. Seyahat ve atmosfer.
export interface Place { name: string; kind: "şehir" | "köy" | "kale"; region: string; }
// Beylikler — 5 sancak; her birinin merkezi (şehir/kale) ve rengi.
export const BEYLIKS: { id: string; name: string; tone: string }[] = [
  { id: "demirhan",   name: "Demirhan Beyliği",   tone: "#E0922E" },
  { id: "yenisehir",  name: "Yenişehir Sancağı",  tone: "#6FA0C0" },
  { id: "gumushisar", name: "Gümüşhisar Beyliği", tone: "#9C7BC4" },
  { id: "aksehir",    name: "Akşehir Sancağı",    tone: "#7FA66A" },
  { id: "karahisar",  name: "Karahisar Beyliği",  tone: "#C56B5C" },
];
// ── Dünya üretimi (Vercel world_gen.py ölçeği): 5 beylik · 8 şehir · 12 kale · 22 köy = 42 yerleşim ──
// Mevcut 12 yerleşim KORUNUR (kayıt/çeviri/harita sürekliliği); üstüne deterministik olarak yenileri eklenir.
const BASE_PLACES: Place[] = [
  { name: "Üzümlü", kind: "köy", region: "demirhan" }, { name: "Akpınar", kind: "köy", region: "demirhan" }, { name: "Demirhan", kind: "kale", region: "demirhan" },
  { name: "Yenişehir", kind: "şehir", region: "yenisehir" }, { name: "Karaağaç", kind: "köy", region: "yenisehir" }, { name: "Söğütlü", kind: "köy", region: "yenisehir" },
  { name: "Bozkır", kind: "kale", region: "gumushisar" }, { name: "Gümüşhisar", kind: "şehir", region: "gumushisar" }, { name: "Çakıllı", kind: "köy", region: "gumushisar" },
  { name: "Kavaklı", kind: "köy", region: "aksehir" }, { name: "Sarıkaya", kind: "kale", region: "aksehir" }, { name: "Akşehir", kind: "şehir", region: "aksehir" },
];
// Yeni yerleşim ad havuzları (Anadolu toponimleri) — tür bazlı, mevcut adlarla çakışmaz.
const NEW_CITY = ["Develi", "Konuralp", "Alaşehir", "Beyşehir", "Eğirdir", "Honaz", "Ilgın"];
const NEW_CASTLE = ["Akkale", "Karakale", "Şahinkaya", "Kızılhisar", "Gökçekale", "Boğazkale", "Aslanhisar", "Demirkapı", "Yarhisar", "Uçhisar", "Kovalı", "Taşköprü"];
const NEW_VILLAGE = ["Çamlıca", "Gökçeören", "Yeşilköy", "Taşpınar", "Karadere", "Akören", "Yaylabaşı", "Çukurca", "Gümüşköy", "Derbent", "Sazak", "Kuyucak", "Ballıca", "Çiğdemli", "Ovacık", "Pınarbaşı", "Gölcük", "Çayırlı"];
// Her beyliğe eklenecek (şehir, kale, köy) sayısı — toplamlar hedefe (8/12/22) tamamlanır.
const EXTRA_DIST: Record<string, [number, number, number]> = {
  demirhan:   [2, 2, 3], // mevcut 0ş/1k/2v → 2ş/3k/5v
  yenisehir:  [1, 2, 3], // 1/0/2 → 2/2/5
  gumushisar: [0, 2, 3], // 1/1/1 → 1/3/4
  aksehir:    [0, 1, 3], // 1/1/1 → 1/2/4
  karahisar:  [2, 2, 4], // 0/0/0 → 2/2/4
};
function buildPlaces(): Place[] {
  const out: Place[] = [...BASE_PLACES];
  let ci = 0, ki = 0, vi = 0;
  for (const b of BEYLIKS) {
    const d = EXTRA_DIST[b.id]; if (!d) continue;
    for (let i = 0; i < d[0]; i++) out.push({ name: NEW_CITY[ci++], kind: "şehir", region: b.id });
    for (let i = 0; i < d[1]; i++) out.push({ name: NEW_CASTLE[ki++], kind: "kale", region: b.id });
    for (let i = 0; i < d[2]; i++) out.push({ name: NEW_VILLAGE[vi++], kind: "köy", region: b.id });
  }
  return out;
}
export const PLACES: Place[] = buildPlaces();
export const LOCATIONS = PLACES.map((p) => p.name);
// O(1) ada-göre yer tablosu: regionOf/placeKind sıcak yolda milyonlarca kez çağrılıyor (PLACES.find O(n)'di → 42 yerle ağırlaştı).
const _placeByName: Record<string, Place> = (() => { const m: Record<string, Place> = {}; for (const p of PLACES) m[p.name] = p; return m; })();
export function regionOf(name: string): string { return _placeByName[name]?.region || "demirhan"; }
export function beylikOf(name: string): { id: string; name: string; tone: string } { const r = regionOf(name); return BEYLIKS.find((b) => b.id === r) || BEYLIKS[0]; }
export function beylikName(id: string): string { return BEYLIKS.find((b) => b.id === id)?.name || id; }
export function sameBeylik(a: string, b: string): boolean { return regionOf(a) === regionOf(b); }
export function placeKind(name: string): string { return _placeByName[name]?.kind || "köy"; }

// Meslekler — kariyer merdivenli (15 meslek). Unvanlar deneyimle yükselir.
export interface Profession { id: string; name: string; stat: keyof Stats; base: number; tiers: string[]; }
export const PROFESSIONS: Profession[] = [
  { id: "çiftçi",    name: "Çiftçi",    stat: "stamina",      base: 4, tiers: ["Irgat", "Çiftçi", "Toprak Sahibi"] },
  { id: "demirci",   name: "Demirci",   stat: "strength",     base: 5, tiers: ["Demirci Çırağı", "Demirci", "Usta Demirci"] },
  { id: "tüccar",    name: "Tüccar",    stat: "charisma",     base: 5, tiers: ["Seyyar Satıcı", "Tüccar", "Tüccar Başı"] },
  { id: "balıkçı",   name: "Balıkçı",   stat: "stamina",      base: 4, tiers: ["Ağcı", "Balıkçı", "Reis"] },
  { id: "avcı",      name: "Avcı",      stat: "strength",     base: 4, tiers: ["İzci", "Avcı", "Usta Avcı"] },
  { id: "marangoz",  name: "Marangoz",  stat: "intelligence", base: 5, tiers: ["Çırak", "Marangoz", "Usta Marangoz"] },
  { id: "çoban",     name: "Çoban",     stat: "stamina",      base: 3, tiers: ["Sürü Yamağı", "Çoban", "Sürü Sahibi"] },
  { id: "fırıncı",   name: "Fırıncı",   stat: "intelligence", base: 4, tiers: ["Hamurkâr", "Fırıncı", "Ekmekçi Başı"] },
  { id: "asker",     name: "Asker",     stat: "strength",     base: 5, tiers: ["Acemi", "Asker", "Onbaşı", "Sipahi"] },
  { id: "müzisyen",  name: "Müzisyen",  stat: "charisma",     base: 4, tiers: ["Çırak Ozan", "Müzisyen", "Saz Üstadı"] },
  { id: "şifacı",    name: "Şifacı",    stat: "intelligence", base: 5, tiers: ["Otacı", "Şifacı", "Hekim"] },
  { id: "katip",     name: "Kâtip",     stat: "intelligence", base: 5, tiers: ["Çömez", "Kâtip", "Divan Kâtibi"] },
  { id: "kuyumcu",   name: "Kuyumcu",   stat: "intelligence", base: 6, tiers: ["Çırak", "Kuyumcu", "Usta Kuyumcu"] },
  { id: "dokumacı",  name: "Dokumacı",  stat: "intelligence", base: 4, tiers: ["Çırak", "Dokumacı", "Usta Dokumacı"] },
  { id: "hancı",     name: "Hancı",     stat: "charisma",     base: 5, tiers: ["Hizmetkâr", "Hancı", "Han Sahibi"] },
];
export function professionById(id: string): Profession | undefined { return PROFESSIONS.find((p) => p.id === id); }
// Unvan kademesi: kariyer deneyimine göre (her 30 ay bir kademe).
export function careerTier(prof: Profession, careerXp: number): number {
  return Math.min(prof.tiers.length - 1, Math.floor(careerXp / 30));
}
export function careerTitle(profId: string, careerXp: number): string {
  const pr = professionById(profId); if (!pr) return profId;
  return pr.tiers[careerTier(pr, careerXp)];
}
const PROFS = PROFESSIONS.map((p) => p.id);
const PROF_STAT: Record<string, keyof Stats> = Object.fromEntries(PROFESSIONS.map((p) => [p.id, p.stat])) as Record<string, keyof Stats>;
// Mesleğin geliştirdiği beceri — çalışmak, mesleğin kimliğini pekiştirir (varsayılan zanaat).
const PROF_SKILL: Record<string, "combat" | "trade" | "crafting" | "social"> = {
  tüccar: "trade", hancı: "trade", kuyumcu: "trade", katip: "trade",
  asker: "combat", avcı: "combat",
  müzisyen: "social",
  // çiftçi, demirci, balıkçı, marangoz, çoban, fırıncı, şifacı, dokumacı → crafting (varsayılan)
};
const SPOUSE_K = ["Ayşe","Fatma","Zeynep","Emine","Hatice","Elif","Nur","Reyhan"];
const SPOUSE_E = ["Mehmet","Ahmet","Mustafa","Hasan","Hüseyin","İbrahim","Osman","Yusuf"];
const CHILD = ["Ali","Veli","Can","Ece","Mert","Naz","Kerem","Defne","Arda","Mira"];
const CHILD_F = new Set(["Ece", "Naz", "Defne", "Mira"]); // kız adları — vâris cinsiyeti adından türetilir (portre/metin tutarlılığı)

const rnd = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const chance = (p: number) => Math.random() < p;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

// NPC'ler KONUMA bağlı: her şehrin kendi insanları (konum tohumlu + konum-önekli kimlik).
export function npcsOf(s: GameState, lang: Lang = "tr"): NPC[] { return rosterAt(s, s.player.location_name, lang); }

export function newGame(first: string, surname: string, gender: "erkek" | "kadın"): GameState {
  const birthplace = rnd(LOCATIONS);
  const seed = Math.floor(Math.random() * 1e9);
  // Doğuş kaderi: aynı toplam bütçeyle (5 puan) statlar seed'e göre dağılır — iki hayat aynı başlamaz (güçlenme değil, çeşitlilik).
  const fateKeys: (keyof Stats)[] = ["strength", "intelligence", "charisma", "stamina"];
  const gift = fateKeys[seed % 4];
  const birthStats: Stats = { strength: 1, intelligence: 1, charisma: 1, stamina: 1 };
  birthStats[gift] += 1;
  return {
    turn: 0, seed, world: { ready: true, inflation: 1 },
    relationships: {}, dynasty: [], npc_state: {}, story: { active: null, completed: [], tension: 0 }, wars: [], caravan: null, econ: 1,
    player: {
      name: surname ? `${first} ${surname}` : first, surname, gender, base_age: 7, age: 7,
      money: 10 + (seed % 6), profession: "işsiz", health: 100, hunger: 100,
      reputation: 0, honor: 0, fear: 0, fame: 0,
      stats: birthStats,
      stat_points: 0, dead: false, location_name: birthplace, home_name: birthplace,
      married: false, spouse_name: null, children: [], mother: rnd(SPOUSE_K), father: rnd(SPOUSE_E), mother_seed: Math.floor(Math.random() * 1e9), father_seed: Math.floor(Math.random() * 1e9), inventory: { ekmek: 2 },
      properties: [], generation: 1,
      faction: null, faction_standing: {},
      skills: { combat: 0, trade: 0, crafting: 0, social: 0 },
      skill_xp: { combat: 0, trade: 0, crafting: 0, social: 0 }, perks: [], injuries: [], career_xp: 0,
      nam: { comert: 0, zalim: 0, capkin: 0, dindar: 0, mert: 0 }, child_invests: {}, equipped: { silah: null, zirh: null },
      crowned: false, will_pref: "esit", fates: [], claimed: [],
    },
    settlements: [],
    history: [{ day: 0, type: "doğum", text: `Bu diyara bir can daha geldi; doğuştan bir yanı kuvvetli.`, scope: "kişisel", landmark: false, k: "evj.birthFate", p: [{ statk: gift }] }],
  };
}

// Doğuştan mizaç — açılışta seçilir; kimlik eksenini ta başından tohumlar.
export const TEMPERAMENTS = ["yigit", "kurnaz", "merhametli", "hirsli"] as const;
export function applyTemperament(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player;
  p.temperament = id; // mizaç ömür boyu iz bırakır (çocukluk şekillenmesi gibi) — tek seferlik delta değil
  if (id === "yigit") { p.stats.strength += 1; p.skill_xp.combat += 60; bumpNam(p, "mert", 10); }
  else if (id === "kurnaz") { p.stats.charisma += 1; p.skill_xp.social += 60; bumpNam(p, "capkin", 6); }
  else if (id === "merhametli") { p.honor = clampStat(p.honor + 8); bumpNam(p, "comert", 12); }
  else if (id === "hirsli") { p.stats.intelligence += 1; p.reputation = Math.min(100, p.reputation + 5); }
  p.skills.combat = skillLevel(p.skill_xp.combat);
  p.skills.social = skillLevel(p.skill_xp.social);
  return s;
}

// loc: dilden bağımsız çeviri anahtarı + parametreler (sayı/id). Gösterimde çözülür; yoksa text (TR) yedeği.
function push(s: GameState, type: string, text: string, scope: "kişisel" | "makro" = "kişisel", landmark = false, loc?: { k: string; p?: EvtParam[] }) {
  s.history.push({ day: s.turn, type, text, scope, landmark, k: loc?.k, p: loc?.p });
}
function clone(s: GameState): GameState {
  // structuredClone (Hermes destekli) JSON round-trip'ten belirgin hızlı — geç nesillerde dokunma gecikmesini azaltır.
  return typeof structuredClone === "function" ? structuredClone(s) : JSON.parse(JSON.stringify(s));
}
// Ölüm nedeni: olay anahtarı → neden kodu (mersiye "nasıl öldü"yü de anlatsın; eski kayıtta alan yoksa satır sessizce atlanır).
const DEATH_CAUSE: Record<string, string> = {
  "evj.dieOld": "ecel", "evj.dieAge": "ecel", "evj.dieIll": "hastalik", "evj.dieStarve": "aclik",
  "evj.feud.die": "kan_davasi", "evj.dieWar": "savas", "evj.dieRoad": "yol", "evj.diePath": "haydut",
  "evj.dieCrime": "suc", "evj.dieEnc": "vahsi", "evj.dieNemesis": "hesaplasma", "evj.dieEvent": "felaket", "evj.dieArc": "macera",
};
function die(s: GameState, text: string, loc?: { k: string; p?: EvtParam[] }) {
  s.player.dead = true;
  if (loc && DEATH_CAUSE[loc.k]) s.player.death_cause = DEATH_CAUSE[loc.k];
  push(s, "ölüm", text, "kişisel", true, loc);
}

function monthlyFlavor(s: GameState, cal: CalendarInfo): { k: string; text: string } {
  const child = s.player.age < 13; const pool: { k: string; text: string }[] = [];
  if (cal.season === "Kış") pool.push({ k: "flav.kis1", text: "Soğuk sert geçti; ocağın başında ısındın." }, { k: "flav.kis2", text: "Kar yolları kapadı, evde kaldın." }, { k: "flav.kis3", text: "Uzun kış gecesinde bir hikâye dinledin; soba çıtırdadı." });
  if (cal.season === "İlkbahar") pool.push({ k: "flav.ilk1", text: "Tarlalar yeşerdi, içine umut düştü." }, { k: "flav.ilk2", text: "Kuşlar döndü; köy canlandı." }, { k: "flav.ilk3", text: "İlk yağmur toprağı uyandırdı; ıslak yollarda yürüdün." });
  if (cal.season === "Yaz") pool.push({ k: "flav.yaz1", text: "Sıcak günlerde gölgede dinlendin." }, { k: "flav.yaz2", text: "Hasada yardım ettin." }, { k: "flav.yaz3", text: "Çeşme başında serinleyip komşularla hâl hatır sordun." });
  if (cal.season === "Sonbahar") pool.push({ k: "flav.son1", text: "Yapraklar döküldü; kışa hazırlık başladı." }, { k: "flav.son2", text: "Pazarda son ürünler satıldı." }, { k: "flav.son3", text: "Bağ bozumu telaşı; sepetler üzümle doldu." });
  pool.push(child ? { k: "flav.cPlay", text: "Sokakta oyun oynadın." } : { k: "flav.aWork", text: "Gününü işinle geçirdin." }, child ? { k: "flav.cTale", text: "Annen masal anlattı." } : { k: "flav.aMarket", text: "Çarşıda dolaştın." });
  if (child) pool.push({ k: "flav.cFriend", text: "Bir arkadaşınla dere boyunda taş attınız." });
  else pool.push({ k: "flav.aChat", text: "Komşunla kapı önünde uzun uzun sohbet ettin." }, { k: "flav.aRest", text: "Bir gününü dinlenip dua ederek geçirdin." }, { k: "flav.aCoin", text: "Kesendeki akçeleri sayıp yarını düşündün." });
  return rnd(pool);
}

function rollLifeEvents(s: GameState, cal: CalendarInfo) {
  const p = s.player;
  if (p.age === 13 && p.profession === "işsiz") {
    // Çocukluk hayali meslek seçimini etkiler: %45 ihtimalle hayalinin yoluna düşersin.
    if (p.child_dream && chance(0.45)) { const cands = PROFS.filter((id) => (PROF_SKILL[id] || "crafting") === p.child_dream); p.profession = cands.length ? rnd(cands) : rnd(PROFS); }
    else p.profession = rnd(PROFS);
    p.stat_points += 3; push(s, "meslek_edinme", `Reşit oldun. ${cap(p.profession)} olarak hayata atıldın — dünya sana açıldı.`, "kişisel", true, { k: "evj.profGain", p: [{ pr: p.profession }] }); shapeChildhood(s);
  }
  // ── Kader anları: hayatın belirli dönümlerinde kimliğe ayna tutan sahneler ──
  if (!p.fates) p.fates = [];
  // Atanın çırağı vârisi bulur: geçmiş nesilde yetiştirilen usta (npcEvo.usta) yeni kuşağın kapısını çalar — hanedan mirasının yankısı.
  // Hayatta bir kez (fates), oyuncu tetiklemesiz ve düşük olasılıklı — farm değil, sürpriz vefa anı.
  if (p.generation > 1 && !p.fates.includes("usta_ziyaret") && chance(0.02)) {
    const evo = s.world?.npcEvo || {};
    const ustaId = Object.keys(evo).find((id) => evo[id]?.usta && !evo[id]?.dead);
    if (ustaId) {
      const who = rosterAt(s, p.location_name).find((n) => n.id === ustaId);
      if (who) {
        p.fates.push("usta_ziyaret");
        const gift = Math.round(25 * inflationFactor(s));
        p.money += gift;
        s.relationships[ustaId] = Math.max(-100, Math.min(100, (s.relationships[ustaId] || 0) + 20));
        push(s, "çıraklık", `${who.name} kapını çaldı: atanın yetiştirdiği usta, "Ustamın ocağına borçluyum" deyip hediyesini bıraktı (+${gift} akçe).`, "kişisel", true, { k: "evj.apr.legacy", p: [who.name, gift] });
      }
    }
  }
  const fate = (id: string) => { if (!p.fates!.includes(id)) { p.fates!.push(id); return true; } return false; };
  const whoAmIId = (): string => {
    const nm = p.nam || ({} as Nam);
    if (p.crowned) return "crowned";
    if (p.fear >= 50 || (nm.zalim || 0) >= 50) return "fear";
    if (p.honor >= 50 || (nm.mert || 0) >= 50) return "honor";
    if ((nm.comert || 0) >= 50) return "comert";
    if ((nm.dindar || 0) >= 50) return "dindar";
    if (p.fame >= 50) return "fame";
    if (p.reputation >= 40) return "rep";
    return "plain";
  };
  const WHOAMI_TR: Record<string, string> = { crowned: "bir hükümdar", fear: "korkulan biri", honor: "şerefli biri", comert: "eli açık biri", dindar: "dindar biri", fame: "tanınan biri", rep: "saygın biri", plain: "sıradan biri" };
  if (p.age >= 40 && fate("40")) { const w = whoAmIId(); push(s, "kader", `Kırkına vardın. Aynaya baktığında ${WHOAMI_TR[w]} görüyorsun. Ömrün yarılandı; bundan sonrası bir miras meselesi.`, "kişisel", true, { k: "evj.fate40", p: [{ wai: w }] }); }
  if (p.age >= 60 && fate("60")) { const w = whoAmIId(); push(s, "kader", `Altmışını devirdin. Saçlar ağardı, geçmişin gölgesi uzadı. Ömrün akşamında ${WHOAMI_TR[w]} olarak anılıyorsun — geriye ne bırakacaksın?`, "kişisel", true, { k: "evj.fate60", p: [{ wai: w }] }); }
  if (p.age >= 70 && fate("70")) { const w = whoAmIId(); p.reputation = Math.min(100, p.reputation + 6); push(s, "kader", `Yetmişine vardın — az kimseye nasip olan bir ömür. Torunlar dizinin dibinde, diyar seni ${WHOAMI_TR[w]} olarak biliyor; yaşın sana hürmet getiriyor.`, "kişisel", true, { k: "evj.fate70", p: [{ wai: w }] }); }
  if (p.age >= 80 && fate("80")) { const w = whoAmIId(); p.fame = Math.min(100, p.fame + 8); push(s, "kader", `Sekseni devirdin. Çağın canlı tanığısın; senin gördüklerini gören kalmadı. Adın ${WHOAMI_TR[w]} olmanın ötesinde, bir efsane gibi anılıyor.`, "kişisel", true, { k: "evj.fate80", p: [{ wai: w }] }); }
  if (p.age < 13 && chance(0.10)) { p.stat_points += 1; push(s, "cocukluk", "Yeni bir şeyler öğrendin (özellik puanı kazandın).", "kişisel", false, { k: "ev.cocukluk" }); } // %25→%10: mektep grinderi 18'inden önce dört statı da maxlayamasın (ihtiyaç ~34 puan, eski musluk 100+ veriyordu)
  // ── Çocukluk dönüm anıları: 8/10/12 yaşında bir kez tetiklenen, ize bırakan anlar (bazıları yoldaşı anar) ──
  if (p.age >= 8 && p.age < 13 && fate("child8")) {
    addStatXp(s, "intelligence", 8); p.health = Math.min(100, p.health + 4);
    const cf = p.child_friend;
    if (cf) push(s, "cocukluk", "Yoldaşınla ilk kez şehrin surlarına tırmandınız; diyar gözünüzde büyüdü.", "kişisel", true, { k: "evj.child8f", p: [{ fn: [cf.seed, cf.gender] }] });
    else push(s, "cocukluk", "İlk kez şehrin surlarına tırmandın; diyar gözünde büyüdü.", "kişisel", true, { k: "evj.child8" });
  }
  if (p.age >= 10 && p.age < 13 && fate("child10")) {
    gainSkill(s, "social", 12); gainSkill(s, "crafting", 8);
    push(s, "cocukluk", "Çarşıda bir usta elinin marifetini izledin; parmakların kaşındı, aklın açıldı.", "kişisel", true, { k: "evj.child10" });
  }
  // Çocukluk hayali: 9 yaşında içinde bir tutku filizlenir — baskın eğilim hangi yola çekiyorsa o (yoksa rastgele).
  if (p.age >= 9 && p.age < 13 && !p.child_dream && fate("dream")) {
    const c = p.child_acts || {};
    const domByAct: Record<string, string> = { oyun: "combat", yardim: "crafting", kesif: "trade", yaramazlik: "social" };
    const top = (Object.entries(c) as [string, number][]).sort((a, b) => b[1] - a[1])[0];
    const dom = top && top[1] > 0 ? domByAct[top[0]] : rnd(["combat", "trade", "crafting", "social"]);
    p.child_dream = dom;
    push(s, "cocukluk", "İçinde bir hayal filizlendi: büyüyünce ne olacağına dair bir tutku.", "kişisel", true, { k: "evj.dreamForm", p: [{ dreamk: dom }] });
  }
  if (p.age >= 12 && p.age < 13 && fate("child12")) {
    p.stat_points += 1;
    push(s, "cocukluk", "Çocukluğun eşiğinde durdun; yarın büyüyeceksin, bugün son bir kez doyasıya oynadın (özellik puanı).", "kişisel", true, { k: "evj.child12" });
  }
  if (p.dead) return;
  // Görücü usulü evlilik — yalnızca FALLBACK: oyuncu birini kur yapıyorsa (ilişki ≥50) araya girmez, geç başlar, seyrektir.
  const courting = Object.values(s.relationships || {}).some((v) => (v as number) >= 50) || s.story?.active?.id === "gec_sevda"; // aktif sevda yayı da bir kur — görücü araya girmesin
  if (!p.married && !courting && p.age >= 24 && p.age < 55 && chance(0.035 + p.fame / 2000)) { const name = p.gender === "erkek" ? rnd(SPOUSE_K) : rnd(SPOUSE_E); p.married = true; p.married_turn = s.turn; p.spouse_bond = 35; p.spouse_name = name; p.spouse_seed = Math.floor(Math.random() * 1e9); p.widowed = false; p.reputation = Math.min(100, p.reputation + 5); push(s, "evlilik", `Ailelerin görüşmesiyle ${name} ile evlendin — yeni bir ocak kuruldu.`, "kişisel", true, { k: "evj.marry", p: [{ fn: [p.spouse_seed, p.gender === "erkek" ? "kadın" : "erkek"] }] }); }
  if (p.married && p.age >= 18 && p.age < 50 && p.children.length < 5 && chance(0.07)) { const c = rnd(CHILD); p.children.push(c); (p.child_meta = p.child_meta || []).push({ n: c, born: s.turn }); push(s, "doğum", `Bir evladın dünyaya geldi: ${c}.`, "kişisel", true, { k: "evj.childBorn", p: [c] }); }
  // Evlilik yıldönümü: her 12 ayda bir ocak tazelenir — otomatik, küçük, farm'sız (eski kayıtta married_turn yoksa sessizce atlanır).
  if (p.married && p.married_turn !== undefined && s.turn > p.married_turn && (s.turn - p.married_turn) % 12 === 0) {
    const years = Math.floor((s.turn - p.married_turn) / 12);
    p.spouse_bond = Math.min(100, (p.spouse_bond ?? 40) + 3);
    p.health = Math.min(100, p.health + 1 + Math.round((p.spouse_bond || 0) / 50));
    const sp: EvtParam = p.spouse_seed != null ? { fn: [p.spouse_seed, p.gender === "erkek" ? "kadın" : "erkek"] } : (p.spouse_name || "");
    push(s, "evlilik", `${p.spouse_name || "Eşin"} ile ${years}. yılınız: ocağınızın ateşi hâlâ sıcak.`, "kişisel", false, { k: "evj.anniv", p: [sp, years] });
  }
  // ── Evlat kilometre taşları: doğumu kayıtlı evlatlar büyürken birer kez anılır — soy sadece isim listesi değil, büyüyen hayatlar ──
  if (!p.dead && p.child_meta?.length) {
    const MS_AGES = [1, 7, 13, 18]; // ilk adım · mektep · çıraklık · yetişkinlik
    for (const cm of p.child_meta) {
      const next = cm.ms || 0;
      if (next >= MS_AGES.length || Math.floor((s.turn - cm.born) / 12) < MS_AGES[next]) continue;
      cm.ms = next + 1;
      if (next === 0) { p.health = Math.min(100, p.health + 2); push(s, "doğum", `${cm.n} ilk adımlarını attı; evin içi cıvıltıyla doldu.`, "kişisel", false, { k: "evj.kidStep", p: [cm.n] }); }
      else if (next === 1) push(s, "cocukluk", `${cm.n} mektebe başladı; heybesinde ekmek, gözlerinde merak.`, "kişisel", false, { k: "evj.kidSchool", p: [cm.n] });
      else if (next === 2) { const tip = Math.round(10 * inflationFactor(s)); p.money += tip; push(s, "cocukluk", `${cm.n} bir ustanın yanına çırak girdi; ilk kazancını eve getirdi (+${tip} akçe).`, "kişisel", false, { k: "evj.kidApprentice", p: [cm.n, tip] }); }
      else { p.reputation = Math.min(100, p.reputation + 2); push(s, "doğum", `${cm.n} yetişkin oldu; artık kendi yolunu yürüyor. Soyun dallanıyor.`, "kişisel", true, { k: "evj.kidGrown", p: [cm.n] }); }
      break; // ayda en fazla bir kilometre taşı (olay seli olmasın)
    }
  }
  // ── Torun anları: oyuncu yaşlanınca (52+) ve yetişkin evladı varken torun doğar; torunla anlar gönül ferahlatır (additive) ──
  if (p.age >= 52 && p.children.length >= 1 && (p.grandchildren?.length || 0) < 8 && chance(0.06)) {
    const gc = rnd(CHILD); if (!p.grandchildren) p.grandchildren = []; p.grandchildren.push(gc);
    p.reputation = Math.min(100, p.reputation + 2);
    push(s, "doğum", `Bir torunun dünyaya geldi: ${gc}. Soyun sürüyor.`, "kişisel", true, { k: "evj.grandchildBorn", p: [gc] });
  }
  if (p.age >= 54 && (p.grandchildren?.length || 0) > 0 && chance(0.05)) {
    const gc = rnd(p.grandchildren!); const r = Math.random();
    if (r < 0.34) { p.health = Math.min(100, p.health + 3); push(s, "ihtiyarlik", `Torunun ${gc} ile vakit geçirdin; kahkahası ömrüne ömür kattı.`, "kişisel", false, { k: "evj.gcJoy", p: [gc] }); }
    else if (r < 0.67) { bumpNam(p, "mert", 2); p.honor = Math.min(100, p.honor + 2); push(s, "ihtiyarlik", `Torunun ${gc}'e bir hayat dersi verdin; gözünde bilge biri oldun.`, "kişisel", false, { k: "evj.gcWisdom", p: [gc] }); }
    else { p.reputation = Math.min(100, p.reputation + 2); push(s, "ihtiyarlik", `Torunun ${gc} için bir armağan yaptırdın; ailen mutlu oldu.`, "kişisel", false, { k: "evj.gcGift", p: [gc] }); }
  }
  // ── Ömürlük çocukluk dostu: reşitlikte yanında kalan yoldaş, hayat boyu ara sıra ortaya çıkar (sadakat) ──
  if (!p.dead && p.age >= 16 && p.child_friend && (s.relationships[p.child_friend.id] || 0) > 0 && chance(0.025)) {
    const cf = p.child_friend;
    const alive = !s.world.npcBorn || (s.world.npcBorn.find((n) => n.id === cf.id)?.alive !== false);
    if (alive) {
      const r = Math.random();
      if (r < 0.4) { p.health = Math.min(100, p.health + 4); s.relationships[cf.id] = Math.min(100, (s.relationships[cf.id] || 0) + 2); push(s, "gunluk", "Çocukluk dostun çıkageldi; eski günleri yâd ettiniz, içine bir ferahlık doldu.", "kişisel", false, { k: "evj.oldFriendVisit", p: [{ fn: [cf.seed, cf.gender] }] }); }
      else if ((p.money < 30 || (p.debt || 0) > 0) && r < 0.7) { const help = 20 + Math.floor(Math.random() * 30); p.money += help; push(s, "gunluk", "Çocukluk dostun darda olduğunu duydu; sessizce kesene biraz akçe bıraktı.", "kişisel", false, { k: "evj.oldFriendHelp", p: [{ fn: [cf.seed, cf.gender] }, help] }); }
      else { p.reputation = Math.min(100, p.reputation + 2); push(s, "gunluk", "Çocukluk dostun seni mecliste övdü; sözü itibarına itibar kattı.", "kişisel", false, { k: "evj.oldFriendVouch", p: [{ fn: [cf.seed, cf.gender] }] }); }
    }
  }
  // ── NPC'nin başlattığı anlar: dünya sana da gelir — dost sofraya çağırır, husumet dile düşer (oyuncu tetiklemez, farm edilemez) ──
  if (!p.dead && p.age >= 13 && chance(0.05)) {
    const ids = Object.keys(s.relationships || {}).filter((id) => Math.abs(s.relationships[id] || 0) >= 30);
    const id = ids.length ? rnd(ids) : null;
    const who = id ? rosterAt(s, p.location_name).find((n) => n.id === id) : null; // yalnız aynı yerleşimdekiler kapına gelir
    if (id && who) {
      const rel = s.relationships[id] || 0; const wns = npcStateOf(s, id);
      if (rel >= 30) {
        wns.mood = Math.min(100, wns.mood + 4);
        if (p.health < 50) { p.health = Math.min(100, p.health + 4); push(s, "sohbet", `${who.name} hâlini sormaya geldi, bir tas sıcak çorba bıraktı; için ısındı.`, "kişisel", false, { k: "npci.soup", p: [who.name] }); }
        else { s.relationships[id] = Math.min(100, rel + 2); p.health = Math.min(100, p.health + 2); push(s, "sohbet", `${who.name} seni sofrasına çağırdı; gülüşüp dertleştiniz.`, "kişisel", false, { k: "npci.meal", p: [who.name] }); }
      } else if (Math.random() < 0.5) {
        p.reputation = Math.max(-100, p.reputation - 1);
        push(s, "sohbet", `${who.name} çarşıda aleyhinde konuşmuş; lafı kulağına geldi.`, "kişisel", false, { k: "npci.badmouth", p: [who.name] });
      } else {
        s.relationships[id] = Math.max(-100, rel - 3); wns.mood = Math.max(-100, wns.mood - 5);
        push(s, "sohbet", `${who.name} yolda önünü kesip laf soktu; dişini sıkıp geçtin.`, "kişisel", false, { k: "npci.taunt", p: [who.name] });
      }
    }
  }
  // ── Ocak imzaları: mensubu olduğun ocak kendini ara sıra hatırlatır — her ocağın kendine has dokusu (otomatik, farm edilemez) ──
  if (!p.dead && p.faction && chance(0.04)) {
    if (p.faction === "tuccar") { gainSkill(s, "trade", 3); push(s, "gunluk", "Loncadan bir tüyo geldi: hangi malın nerede para ettiği kulağına fısıldandı.", "kişisel", false, { k: "fsig.tuccar" }); }
    else if (p.faction === "demirci") { gainSkill(s, "crafting", 3); push(s, "gunluk", "Ustalar seni ocağa çağırdı; körük başında geçen akşam eline hüner kattı.", "kişisel", false, { k: "fsig.demirci" }); }
    else if (p.faction === "asker") { gainSkill(s, "combat", 3); push(s, "gunluk", "Ocak talime çağırdı; kılıcınla ter döktün, bileğin sertleşti.", "kişisel", false, { k: "fsig.asker" }); }
    else if (p.faction === "sifaci") { p.health = Math.min(100, p.health + 3); p.reputation = Math.min(100, p.reputation + 1); push(s, "gunluk", "Meclis şifalı merhemden pay gönderdi; bedenin dinçleşti.", "kişisel", false, { k: "fsig.sifaci" }); }
    else if (p.faction === "golge") { gainSkill(s, "social", 3); p.fear = Math.min(100, p.fear + 1); push(s, "gunluk", "Kardeşlikten kulağına bir sır fısıldandı; kimin nerede gezdiğini artık biliyorsun.", "kişisel", false, { k: "fsig.golge" }); }
  }
  // ── Dulluk: eş de fanidir; birlikte yaşlandıkça vefat ihtimali artar. Dul kalınca yas + (genç dulsa yeniden evlilik mümkün) ──
  if (!p.dead && p.married && p.spouse_seed != null && p.age >= 45 && !p.spouse_is_player) {
    // NOT: eş gerçek bir oyuncuysa (spouse_is_player) yerel sim onu öldürmez — ölümü kendi oynanışından/sunucudan gelir.
    const dc = p.age < 55 ? 0.008 : p.age < 65 ? 0.02 : p.age < 75 ? 0.04 : 0.07;
    if (chance(dc)) {
      const sg: "erkek" | "kadın" = p.gender === "erkek" ? "kadın" : "erkek";
      p.married = false; p.widowed = true; p.spouse_mizac = undefined; p.health = Math.max(1, p.health - (4 + Math.round((p.spouse_bond ?? 40) / 12))); p.spouse_bond = undefined; bumpNam(p, "dindar", 2); // acı, bağın derinliğine oranlı
      push(s, "evlilik", `Ömür arkadaşın ${p.spouse_name} vefat etti; ocağın yarısı söndü. Diyar yasını paylaştı.`, "kişisel", true, { k: "evj.spouseDied", p: [{ fn: [p.spouse_seed, sg] }] });
    }
  }
  // ── Anne-baba da fanidir: çocukluğunun direkleri, sen olgunlaştıkça (onlar daha yaşlı) birer kez göçer. ──
  if (!p.dead && p.age >= 28) {
    const pdc = p.age < 40 ? 0.012 : p.age < 55 ? 0.03 : 0.06;
    if (!p.mother_dead && p.mother && chance(pdc)) {
      p.mother_dead = true; p.health = Math.max(1, p.health - (3 + Math.round((p.parent_bond ?? 45) / 20))); bumpNam(p, "dindar", 2); p.reputation = Math.min(100, p.reputation + 1); // acı, bağın derinliğine oranlı
      push(s, "kader", `Annen ${p.mother} Hakk'ın rahmetine kavuştu; çocukluğunun bir direği daha gitti.`, "kişisel", true, { k: "evj.motherDied", p: [{ fn: [p.mother_seed ?? 0, "kadın"] }] });
      if ((p.parent_bond ?? 45) >= 60) { const mir = Math.round(20 * inflationFactor(s)); p.money += mir; push(s, "kader", `Annenin çeyiz sandığından sana kalan çıktı (+${mir} akçe); yakın olana el emeği kalır.`, "kişisel", false, { k: "evj.parentLegacy", p: [mir] }); }
    }
    if (!p.father_dead && p.father && chance(pdc)) {
      p.father_dead = true; p.health = Math.max(1, p.health - (3 + Math.round((p.parent_bond ?? 45) / 20))); bumpNam(p, "dindar", 2); p.reputation = Math.min(100, p.reputation + 1); // acı, bağın derinliğine oranlı
      push(s, "kader", `Baban ${p.father} Hakk'ın rahmetine kavuştu; çocukluğunun bir direği daha gitti.`, "kişisel", true, { k: "evj.fatherDied", p: [{ fn: [p.father_seed ?? 0, "erkek"] }] });
      if ((p.parent_bond ?? 45) >= 60) { const mir = Math.round(20 * inflationFactor(s)); p.money += mir; push(s, "kader", `Babanın kesesinden sana ayırdığı çıktı (+${mir} akçe); yakın olana el emeği kalır.`, "kişisel", false, { k: "evj.parentLegacy", p: [mir] }); }
    }
  }
  // ── Evli hayat anları: eşinle ocak tüten yıllar; ara sıra sıcak ya da sınanan anlar (sadık-dost'a paralel) ──
  if (!p.dead && p.married && p.spouse_seed != null && p.age >= 16 && chance(0.03)) {
    const sg: "erkek" | "kadın" = p.gender === "erkek" ? "kadın" : "erkek";
    const sn: EvtParam = { fn: [p.spouse_seed, sg] };
    const miz = p.spouse_mizac || spouseMizac(p.spouse_seed); // eş mizacı anların rengini belirler (kur yapılan NPC'nin karakteri öncelikli)
    if (p.spouse_bond === undefined) p.spouse_bond = 40; // eski kayıt göçü: bağ orta noktadan başlar
    const bond = (d: number) => { p.spouse_bond = Math.max(0, Math.min(100, (p.spouse_bond || 0) + d)); };
    if (p.health < 45) { p.health = Math.min(100, p.health + (miz === "sefkatli" ? 9 : 6)); bond(2); push(s, "evlilik", `Hastalığında ${p.spouse_name} başucundan ayrılmadı; biraz toparlandın.`, "kişisel", false, { k: "evj.spouseCare", p: [sn] }); }
    else if (p.money < 20 || (p.debt || 0) > 0) { const help = Math.round((15 + Math.floor(Math.random() * 20)) * (miz === "caliskan" ? 1.6 : 1)); p.money += help; bond(2); push(s, "evlilik", `Sıkışınca ${p.spouse_name} çeyizinden bir şey bozdurdu; eve biraz akçe girdi.`, "kişisel", false, { k: "evj.spouseHelp", p: [sn, help] }); }
    else { let r = Math.random();
      if (miz === "sefkatli") r *= 0.7;              // şefkatli → daha çok huzurlu akşam
      else if (miz === "dikbasli") r = 0.4 + r * 0.4; // dik başlı → daha çok atışma (sonra barışma)
      if (r < 0.4) { p.health = Math.min(100, p.health + (miz === "sefkatli" ? 5 : 3)); p.reputation = Math.min(100, p.reputation + 1); bumpNam(p, "comert", 1); if (miz === "dindar") bumpNam(p, "dindar", 1); bond(2); push(s, "evlilik", `${p.spouse_name} ile sessiz, huzurlu bir akşam geçirdiniz; "iyi ki varsın" dedin.`, "kişisel", false, { k: "evj.spouseCalm", p: [sn] }); }
      else if (r < 0.7) { if (miz === "dikbasli") { bumpNam(p, "mert", 1); addStatXp(s, "strength", 3); } bond(miz === "dikbasli" ? -1 : 1); push(s, "evlilik", `${p.spouse_name} ile küçük bir atışma yaşandı ama akşama kalmadan barıştınız; ocak yeniden ısındı.`, "kişisel", false, { k: "evj.spouseQuarrel", p: [sn] }); }
      else if (p.age >= 50) { p.reputation = Math.min(100, p.reputation + 2); bumpNam(p, "mert", 1); bond(2); push(s, "evlilik", `${p.spouse_name} ile saçlarınız birlikte ağardı; bir ömrü paylaşmanın huzuru yüzüne vurdu.`, "kişisel", false, { k: "evj.spouseAge", p: [sn] }); }
      else { p.health = Math.min(100, p.health + 2); bond(2); push(s, "evlilik", `${p.spouse_name} ile geleceğe dair konuştunuz; küçük hayaller kurmak iyi geldi.`, "kişisel", false, { k: "evj.spouseCalm", p: [sn] }); }
    }
  }
  // ── Sadık dostun karşılığı: borç boğarken yıllarca kurulan bağ el uzatır — iyi niyet tükenir (ilişki düşer), farmlanamaz ──
  if (!p.dead && (p.debt || 0) > 40 && chance(0.12)) {
    const loyal = rosterAt(s, p.location_name).find((n) => (s.relationships[n.id] || 0) >= 50);
    if (loyal) {
      const pay = Math.min(p.debt || 0, Math.round(50 * inflationFactor(s)));
      p.debt = Math.round((p.debt || 0) - pay);
      s.relationships[loyal.id] = Math.max(-100, (s.relationships[loyal.id] || 0) - 15); // iyi niyet tükendi: dostluk yeniden kazanılmalı
      push(s, "sohbet", `${loyal.name} borcunun bir kısmını sessizce kapattı (${pay} akçe); minnet borcun büyüdü.`, "kişisel", true, { k: "evj.friendDebt", p: [loyal.name, pay] });
    }
  }
  // ── Yaşam-evresi anıları: her döneme doku katan küçük anlar (ara sıra; bazıları aileyi isimle anar) ──
  if (!p.dead && chance(0.14)) {
    const child = p.children.length ? rnd(p.children) : null;
    const mem: { text: string; k: string; p?: (string | number)[]; fn?: () => void }[] = [];
    if (p.age < 13) {
      mem.push(
        { text: "Annen bir masal anlattı; kahramanı sendin.", k: "mem.tale" },
        { text: "Bir sokak köpeğiyle dost oldun, peşinden ayrılmadı.", k: "mem.dog" },
        { text: "Bir büyüğün elini izleyip zanaatı merak ettin.", k: "mem.craft", fn: () => { p.skill_xp.crafting += 8; p.skills.crafting = skillLevel(p.skill_xp.crafting); } },
      );
    } else if (p.age < 25) {
      mem.push(
        { text: "İlk kez birine gönül kaptırdın; dilin tutuldu.", k: "mem.love", fn: () => bumpNam(p, "capkin", 2) },
        { text: "Bir ihtiyardan iki çift söz dinledin, aklına kazıdın.", k: "mem.elder", fn: () => { p.skill_xp.social += 8; p.skills.social = skillLevel(p.skill_xp.social); } },
        { text: "Geç saatlere dek bir dostunla dertleştin.", k: "mem.friend" },
      );
    } else if (p.age < 46) {
      mem.push(
        { text: "Aynada ilk ak telini gördün; zaman akıp gidiyor.", k: "mem.graying" },
        p.married && p.spouse_name ? { text: `${p.spouse_name} ile sessiz bir akşam geçirdin; 'iyi ki varsın' dedin.`, k: "mem.spouseEve", p: [p.spouse_name] } : { text: "Yalnız bir akşam, geçmişini düşündün.", k: "mem.aloneEve" },
        child ? { text: `${child} masum bir soru sordu; cevabını ararken sen de düşündün.`, k: "mem.childAsk", p: [child] } : { text: "Bir komşuyla eski günleri yâd ettin.", k: "mem.neighbor" },
        { text: "Elinin bir alışkanlığında ilk ustanı yakaladın; usta çoktan gitti, huyu sende kalmış.", k: "mem.masterHabit" },
      );
    } else if (p.age < 70) {
      mem.push(
        { text: "Dizlerin sızlıyor ama hatıraların zengin.", k: "mem.aches" },
        child ? { text: `${child}'a gençlik hikâyelerini anlattın; gözleri parladı.`, k: "mem.childStory", p: [child], fn: () => bumpNam(p, "dindar", 1) } : { text: "Gençlere akıl verdin; dinlediler mi, bilinmez.", k: "mem.adviseYouth", fn: () => bumpNam(p, "dindar", 1) },
        { text: "Bir mezar taşı okudun; kendi faniliğini düşündün.", k: "mem.grave" },
        { text: "Eski defterleri karıştırırken gençliğinin el yazısına rastladın; harfler bile daha aceleciymiş o zamanlar.", k: "mem.oldHand" },
        { text: "Çıraklık ettiğin dükkânın önünden geçtin; içerideki yeni çırak sana ustaymışsın gibi baktı.", k: "mem.oldShop" },
        { text: "Kuyu başında sıra bekleyen gençlerin şakalaşmasını dinledin; kovanın ipini hâlâ hepsinden iyi atıyorsun.", k: "mem.wellRope" },
        { text: "Sandıktan babadan kalma bir alet çıktı; sapındaki çentikler senin çentiklerinle aynı yerde.", k: "mem.fatherTool" },
        { text: "Pazarda birine senin adınla seslendiler; dönüp baktın — kundakta bir bebekmiş. Adın büyümeye başladı bile.", k: "mem.namesake", fn: () => { p.fame = Math.min(100, p.fame + 1); } },
        { text: "Harman yerinde gençlerin taş kaldırmasını seyrettin; biri taşı tam gençliğindeki gibi omuzluyor.", k: "mem.harvestRace" },
        { text: "Mahalle çeşmesinin taşında çocukken kazıdığın harf duruyor; yıllar silmemiş.", k: "mem.carvedInit" },
      );
    } else {
      // 70+: ömrün son faslının kendi dokusu — şafak yalnızlığı, giden dostlar, nasırlı eller, destanlaşan ad
      mem.push(
        { text: "Şafaktan önce uyandın; bütün kasaba uyurken dünya bir süre yalnız sana aitti.", k: "mem.dawn", fn: () => { p.health = Math.min(100, p.health + 1); } },
        { text: "Çarşıda eski bir dostun tezgâhının yerinde başkasını gördün; içinden bir dua geçirdin.", k: "mem.oldFriendGone", fn: () => bumpNam(p, "dindar", 1) },
        { text: "Ellerine baktın: her nasır bir hikâye. Gençlerin haftada yapamadığını sen bir günde yapardın.", k: "mem.craftHands", fn: () => { p.honor = Math.min(100, p.honor + 1); } },
        { text: "Bir yolcu, gençliğindeki bir kavganı hikâye diye anlattı; adları değiştirmişler ama sen kendini tanıdın.", k: "mem.nameEcho", fn: () => { p.fame = Math.min(100, p.fame + 1); } },
        { text: "Sokakta bir çocuğa senin adını seslendiler; adın senden önce yürümeye başladı bile.", k: "mem.grandName", fn: () => { p.reputation = Math.min(100, p.reputation + 1); } },
        { text: "Gençken diktiğin ağacın gölgesinde soluklandın; ağaç da sen de sözünüzü tutmuşsunuz.", k: "mem.orchardShade", fn: () => { p.health = Math.min(100, p.health + 1); } },
        { text: "Bir sofrada anandan kalma bir tadı yakaladın; gözlerini kapatınca bir anlığına o mutfağa döndün.", k: "mem.motherTaste", fn: () => { p.hunger = Math.min(100, p.hunger + 2); } },
        { text: "Kış güneşinde duvar dibine oturdun; sıcaklık iliklerine işledi, kimseyle konuşmadan bir öğle geçti.", k: "mem.winterSun" },
        { text: "Çocukken ezberlediğin duayı bir cenazede yine dudakların hatırladı; kelimeler seni, sen kelimeleri hiç bırakmamışsınız.", k: "mem.oldPrayer", fn: () => bumpNam(p, "dindar", 1) },
        { text: "Rüzgâr, gençliğinde yürüdüğün kervan yolunun toz kokusunu getirdi; dizlerin sızlasa da içinden yine düşmek geçti o yola.", k: "mem.oldRoad" },
        { text: "Çarşıda biri arkandan eski lakabınla seslendi; dönüp baktın, tanıyamadın — ama lakap tam yerine oturdu, gülümsedin.", k: "mem.oldNickname" },
        { text: "Sandığın dibinden gençliğinde yazılmış bir mektup çıktı; kâğıt sararmış ama satırlar dünkü gibi. Kimseye göstermeden yerine koydun.", k: "mem.oldLetter" },
        { text: "Çocukluğunun sokağından geçtin; o koca kapı meğer ne alçakmış. Kapı küçülmemiş, sen büyümüşsün.", k: "mem.lowDoor" },
        { text: "Gençliğinde bileğini bükemediğin rakibinle çeşme başında karşılaştın; iki ihtiyar, bir taş sekide gülüşüp helalleştiniz.", k: "mem.oldRival", fn: () => { p.honor = Math.min(100, p.honor + 1); } },
        { text: "Mahalle çocuklarına yıldızların adlarını gösterdin; sen de onları bir ihtiyardan öğrenmiştin — yıldızlar hiç yaşlanmamış.", k: "mem.sameStars" },
        { text: "Avluda bir bebek ilk adımını senin dizine tutunarak attı; iki adım o yürüdü, üç adım senin yüreğin.", k: "mem.firstStep" },
        { text: "Tesbihin ipini yenilerken taşları saydın: kırk taş, kırk yılın duası. İpi bağlarken elin hiç titremedi.", k: "mem.beadString" },
        { text: "Anadan kalma yorganın söküğünü kendi elinle diktin; iğne yavaştı ama ilmek sağlam. Yorgan bir ömür daha ısıtır.", k: "mem.quiltStitch", fn: () => { p.health = Math.min(100, p.health + 1); } },
        { text: "Kahvede her gün oturduğun sekide bu sabah bir genç vardı; kalkıp yer verdi. Seki senden çok alışkanlığınındı.", k: "mem.emptyChair" },
      );
    }
    const m = rnd(mem); m.fn?.();
    push(s, p.age < 13 ? "cocukluk" : "gunluk", m.text, "kişisel", false, { k: m.k, p: m.p });
  }
  if (chance(0.05)) { const g = 5 + Math.floor(Math.random() * 20); p.money += g; const fv = chance(0.5); push(s, "gunluk", fv ? `Heybenin dibinde unutulmuş ${g} akçe çıktı; ne zaman düştüğünü kimse bilmiyor.` : `Yolda ${g} akçe buldun.`, "kişisel", false, { k: fv ? "evj.foundCoin2" : "evj.foundCoin", p: [g] }); }
  if (chance(0.04)) {
    p.health = Math.max(0, p.health - 12); { const sv = chance(0.5); push(s, "hastalik", sv ? "Soğuk kemiğe işledi; birkaç gün yorgan, sıcak çorba ve komşu duasıyla geçti." : "Hastalandın, birkaç gün yatakta kaldın.", "kişisel", false, { k: sv ? "evj.sick2" : "evj.sick" }); }
    // Düşkün bünyede hastalık yerleşebilir: kronik öksürük — hekim tedavisi ister, kendiliğinden geçmez.
    if (!p.chronic && p.age >= 35 && p.health < 45 && chance(0.25)) { p.chronic = { k: "oksuruk", since: s.turn }; push(s, "hastalik", "Öksürük yakanı bırakmadı; göğsüne yerleşti. Hekim yüzü görmeden geçmeyecek.", "kişisel", true, { k: "evj.chronicStart" }); }
  }
  // Kronik hastalık: sessiz aylık sızıntı + arada alevlenme (ölüm nedeni değil, ecele zemin — hekim döngüsüne itki).
  // At bakımı: nal düşer, nalbant ister — at sahipliğinin küçük ama gerçek bir bedeli var.
  if (p.horse && !p.dead && chance(0.012)) {
    const shoeCost = Math.round(8 * inflationFactor(s));
    if (p.money >= shoeCost) { p.money -= shoeCost; push(s, "yolculuk", `${p.horse_name || "Atın"} nalını düşürdü; nalbant ${shoeCost} akçeye dört nalı tazeledi.`, "kişisel", false, { k: "horse.shoe", p: [p.horse_name || "", shoeCost] }); }
    else push(s, "yolculuk", `${p.horse_name || "Atın"} nalını düşürdü; kese boştu, nalbant hatırına nalladı — 'hayrına olsun' dedi.`, "kişisel", false, { k: "horse.shoe.poor", p: [p.horse_name || ""] });
  }
  if (p.chronic && !p.dead) {
    if (p.chronic.k === "eklem") {
      if (chance(0.5)) p.health = Math.max(1, p.health - 1); // yarı sızıntı — ama alevlenme daha sık
      if (chance(0.12)) { const w = 3 + Math.floor(Math.random() * 3); p.health = Math.max(1, p.health - w); push(s, "hastalik", `Eklemler tutuldu; birkaç gün merdiven düşman oldu (−${w} sağlık).`, "kişisel", false, { k: "evj.eklemFlare", p: [w] }); }
    } else {
      p.health = Math.max(1, p.health - 1);
      if (chance(0.08)) { const w = 4 + Math.floor(Math.random() * 3); p.health = Math.max(1, p.health - w); push(s, "hastalik", `Eski öksürük alevlendi; birkaç gün nefessiz kaldın (−${w} sağlık).`, "kişisel", false, { k: "evj.chronicFlare", p: [w] }); }
    }
  }
  // ── Nemesis dünyada yaşıyor: musallat olur; yoksa derin bir husumet amansız hasma dönüşebilir ──
  if (!p.dead && p.age >= 14 && s.story) {
    if (s.story.nemesis && chance(0.10)) {
      const n = s.story.nemesis;
      const nemIdx = Math.floor(Math.random() * 4);
      let txt: string; let nemP: EvtParam[];
      if (nemIdx === 0) { p.reputation = Math.max(-100, p.reputation - 4); txt = `${n.name} arkandan kuyunu kazıyor; itibarın sarsıldı.`; nemP = [n.name]; }
      else if (nemIdx === 1) { const loss = Math.min(p.money, 8); p.money -= loss; txt = `${n.name}'ın adamları malına dokundu (−${loss} akçe).`; nemP = [n.name, loss]; }
      else if (nemIdx === 2) { p.health = Math.max(1, p.health - 5); txt = `${n.name} pusu kurdu; sıyrıklarla kurtuldun.`; nemP = [n.name]; }
      else { txt = `${n.name} bir tehdit daha yolladı; hesap görülmeyi bekliyor.`; nemP = [n.name]; }
      s.story.tension = Math.min(100, s.story.tension + 3);
      push(s, "nemesis", txt, "kişisel", false, { k: "evj.nem" + nemIdx, p: nemP });
    } else if (!s.story.nemesis && chance(0.03)) {
      const rivals = Object.entries(s.relationships || {}).filter(([, v]) => (v as number) <= -55);
      if (rivals.length) {
        const rid = rnd(rivals)[0];
        const npc = npcsOf(s).find((x) => x.id === rid);
        if (npc) { s.story.nemesis = { name: npc.name, power: 14 + Math.floor(Math.random() * 10) }; push(s, "nemesis", `${npc.name} ile husumetiniz kan davasına döndü; artık amansız bir hasımsın.`, "kişisel", true, { k: "evj.nemFeud", p: [npc.name] }); }
      }
    }
  }
  // Yaşlanma + ölümlülük — geniş dağılım: bazıları genç hastalık/kazaya, sağlıklı & bakımlı olanlar 70-80'e ulaşabilir.
  // Sağlık aşınması daha yumuşak (ayda değil seyrek) → servetle hekim tutan uzun yaşar (gerçek hayat filtresi).
  if (p.age >= 52 && chance(0.5)) p.health = Math.max(0, p.health - Math.floor((p.age - 48) / 7));
  // Eklem ağrısı: yaşla gelir (hastalıktan değil) — sağlıklı oyuncu da yakalanabilir; hekim kürü inatçıdır.
  if (!p.dead && !p.chronic && p.age >= 48 && chance(0.003)) { p.chronic = { k: "eklem", since: s.turn }; push(s, "hastalik", "Dizlerindeki sızı bir gecede yerleşti; sabahları ilk adım eskisinden zor. Hekim görmeden yakanı bırakmayacak.", "kişisel", true, { k: "evj.eklemStart" }); }
  const accident = (p.age >= 25 ? (p.age < 40 ? 0.0003 : p.age < 55 ? 0.0006 : 0.0009) : 0) + (p.health < 25 ? 0.012 : 0); // kaza terimi yaş basamaklı: 40 öncesi ecel nadir, yaş ilerledikçe ağırlaşır
  const frail = p.health < 40 ? 0.008 : 0;
  const aging = p.age >= 62 ? (p.age - 62) * 0.0045 + frail : frail;
  if (chance(accident + aging)) {
    const old = p.age >= 60;
    die(s, old ? `${p.name}, ${p.age} yaşında huzur içinde göçtü.` : `${p.name}, ${p.age} yaşında ${p.health < 25 ? "amansız bir hastalığa" : "ecel"} yenik düştü.`, old ? { k: "evj.dieOld", p: [p.name, p.age] } : (p.health < 25 ? { k: "evj.dieIll", p: [p.name, p.age] } : { k: "evj.dieAge", p: [p.name, p.age] }));
  }
}

// Yeni tamamlanan başarımları ödüllendir (tek seferlik): +1 özellik puanı + şöhret.
function claimAchievements(s: GameState) {
  const p = s.player; if (!p.claimed) p.claimed = [];
  for (const { a, done } of achievementsOf(s)) {
    if (done && !p.claimed.includes(a.id)) {
      p.claimed.push(a.id);
      p.stat_points += 1;
      p.fame = Math.min(100, p.fame + 2);
      push(s, "basarim", `Başarım açıldı: ${a.name} (+1 özellik puanı).`, "kişisel", false, { k: "ev.ach", p: [a.name] });
    }
  }
}

export function advance(prev: GameState, n = 1): GameState {
  // Bekleyen yakalanma sahnesinden (donanım-geri vb.) ay ilerleterek kaçılamaz:
  // sahne çözülmeden zaman akmaz — kaçmayı denemiş sayılırsın ("kaç" zorlanır).
  if (prev.pendingScene?.kind === "crime") prev = resolveCrimeScene(prev, "kac");
  if (prev.pendingScene?.kind === "trial") prev = resolveTrial(prev, "boyun"); // duruşmadan kaçılmaz: gelmeyen gıyabında hüküm giyer
  const s = clone(prev);
  for (let i = 0; i < n; i++) {
    if (s.player.dead) break;
    snapshotPrices(s); // ayrılan ayın pazar fiyatlarını hafızaya al (R3.3 'geçen fiyat')
    s.turn += 1; const cal = currentCalendar(s.turn);
    s.player.age = playerAge(s.player.base_age, s.turn);
    // Yıl dönümü: yaş günün geldi — yılın kısa muhasebesi kroniğe (landmark) düşer; hayat "yaşanmış" hissettirir.
    if (s.turn % 12 === 0 && !s.player.dead) {
      const pl = s.player;
      if (pl.yr_money === undefined) pl.yr_money = pl.money;
      else {
        const d = pl.money - pl.yr_money;
        const vr = Math.random(); const v2 = vr < 0.34 ? "3" : vr < 0.67 ? "2" : ""; // üç ağız: aynı muhasebe, başka cümleler
        const key = (d > 20 ? "evj.yearUp" : d < -20 ? "evj.yearDown" : "evj.yearFlat") + v2;
        push(s, "yıl_dönümü", `${pl.age} yaşına bastın. Bu yıl kesen ${d >= 0 ? "+" : "−"}${Math.abs(d)} akçe değişti.`, "kişisel", true, { k: key, p: [pl.age, Math.abs(d)] });
        pl.yr_money = pl.money;
      }
    }
    // NPC anıları haftalık söner (travmalar kalıcı); anlamsız geçici girdiler budanır (perf + temizlik).
    if (s.npc_state) for (const id in s.npc_state) {
      const ns = s.npc_state[id];
      if (ns.anilar && ns.anilar.length) ns.anilar = decayMemories(ns.anilar);
      if ((!ns.anilar || !ns.anilar.length) && Math.abs(s.relationships[id] || 0) < 5 && Math.abs(ns.mood) < 5 && (!ns.memories || !ns.memories.length)) delete s.npc_state[id];
    }
    gossipTick(s); // tanıklı skandallar → oyuncu söylentileri (haftalık)
    seedTick(s);   // geçmişin tohumları filizlenir (haftalık en çok 1)
    // Süregelen evlat eğitimi: haftalık masraf düşer, birikim vâris olunca bonusa döner (Vercel child_investment_tick).
    if (s.player.child_edu) {
      for (const cn in s.player.child_edu) {
        if (!s.player.children.includes(cn)) { delete s.player.child_edu[cn]; continue; } // ölen/ayrılan çocuğu temizle
        const tr = EDU_TRACKS.find((x) => x.id === s.player.child_edu![cn].track);
        if (!tr || s.player.money < tr.weekly) continue; // parasızken eğitim duraklar (birikim de durur)
        s.player.money -= tr.weekly;
        s.player.child_edu![cn].weeks += 1;
      }
    }
    // Çalışma gücü: her ay yenilenir (ders + kulüp meşki bundan harcanır).
    s.player.study_energy = maxStudyEnergy(s.player.age);
    s.player.play_energy = maxPlayEnergy(s.player.age); // çocukluk hakları da tazelenir
    // Mektep kulübü: okul çağında (7-17) her ay sessiz pasif beceri kazanımı (Vercel öğrenci topluluğu).
    if (s.player.club && s.player.age >= 7 && s.player.age < 18) { const cl = CLUBS.find((c) => c.id === s.player.club); if (cl) gainSkill(s, cl.skill, 2); }
    // Mezuniyet: 18'inde kulüpten ayrılırken, yılların kulüp itibarı kalıcı bir hüner bırakır.
    else if (s.player.club && s.player.age >= 18) {
      const p2 = s.player; const cl = CLUBS.find((c) => c.id === p2.club);
      if (cl) { gainSkill(s, cl.skill, 60 + (p2.club_standing || 0) * 6); p2.club_grad = p2.club;
        push(s, "mektep", `${CLUB_TR[p2.club!] || "Kulüp"} kulübünden mezun oldun; yılların emeği kalıcı bir hüner bıraktı.`, "kişisel", true, { k: "club.grad." + p2.club }); }
      p2.club = undefined;
    }
    const child = s.player.age < 13;
    // Çocuğu ailesi besler: açlık daha yavaş düşer ve dipte aile karnını doyurur.
    const seasonMult = ({ "İlkbahar": 1.0, "Yaz": 1.1, "Sonbahar": 0.9, "Kış": 1.3 } as Record<string, number>)[cal.season] ?? 1; // 4 mevsim eğrisi (Vercel season_hunger_mult)
    const stamReduce = child ? 0 : Math.min(0.3, effStat(s.player, "stamina") * 0.03); // dayanıklılık açlığı yavaşlatır (Vercel stamina_hunger_reduction)
    const tutumluReduce = !child && hasPerk(s.player, "tutumlu") ? 0.15 : 0; // tutumlu: kıt kanaat geçinir — açlık daha yavaş düşer
    const drop = Math.max(child ? 2 : 3, Math.round((child ? 4 : 8) * seasonMult * (1 - Math.min(0.45, stamReduce + tutumluReduce))));
    s.player.hunger = Math.max(0, s.player.hunger - drop);
    if (child && s.player.hunger < 30) s.player.hunger = Math.min(100, s.player.hunger + 20); // anne-baba sofrası
    if (s.player.hunger < 20 && !child) s.player.health = Math.max(0, s.player.health - 6);
    else if (s.player.health < 100) s.player.health = Math.min(100, s.player.health + 2);
    if (s.player.faction === "sifaci" && s.player.health < 100) s.player.health = Math.min(100, s.player.health + 2);
    if (s.player.health <= 0 && !child) { die(s, `${s.player.name} açlık ve hastalığa yenik düştü.`, { k: "evj.dieStarve", p: [s.player.name] }); break; }
    // Yaralar zamanla iyileşir (kalıcı olanlar kalır)
    if (s.player.injuries?.length) {
      for (const inj of s.player.injuries) if (!inj.permanent) inj.weeks_left -= 1;
      const healed = s.player.injuries.filter((inj) => !inj.permanent && inj.weeks_left <= 0);
      if (healed.length && i === n - 1) push(s, "iyilesme", `Yaraların iyileşti: ${healed.map((h) => h.label).join(", ")}.`, "kişisel", false, { k: "evj.heal", p: [{ wds: healed.map((h) => Math.max(0, INJURY_POOL.findIndex((w) => w.label === h.label))) }] });
      s.player.injuries = s.player.injuries.filter((inj) => inj.permanent || inj.weeks_left > 0);
    }
    // Mülk pasif geliri — KONUMA (şehir refahı) + KONDİSYONA göre; düşük güvenlikte yağma + aşınma
    let pmult = 1;
    if (hasPerk(s.player, "tuccar_prensi")) pmult += 0.3;
    if (hasPerk(s.player, "tamirci")) pmult += 0.15;
    let inc = 0;
    let wages = 0; // işçi ücretleri (ekonomiden çıkan; pmult'tan bağımsız)
    const produced: Record<string, number> = {}; // işçilerin ürettiği gerçek hammadde (üretim zinciri)
    const cityCache: Record<string, { prosperity: number; security: number }> = {};
    const cityOf = (loc: string) => cityCache[loc] || (cityCache[loc] = cityInfo(loc, placeKind(loc)));
    let burnPr: Property | null = null; // katastrofik kayıp adayı: turda EN FAZLA bir mülk yanar
    for (const pr of s.player.properties) {
      const base = PROPERTY_TYPES[pr.type]?.income || 0;
      const ci = cityOf(pr.loc || s.player.location_name);
      const fx = cityFx(s, pr.loc || s.player.location_name); // aktif dünya olayları (kuraklık/yangın/panayır...)
      const effProsp = Math.max(5, ci.prosperity + fx.prosp);
      const effSec = Math.max(0, ci.security + fx.sec);
      const condProspLevel = (0.75 + effProsp / 200) * (pr.cond / 100) * (1 + ((pr.level || 1) - 1) * 0.5);
      // Tipe özgü davranış (Vercel property_system per-tip tick ruhu): tarla mevsimlik, dükkân refaha duyarlı.
      const typeMult = pr.type === "tarla" ? ({ "İlkbahar": 1.0, "Yaz": 1.15, "Sonbahar": 1.7, "Kış": 0.25 }[cal.season] ?? 1)
        : pr.type === "dukkan" ? (1 + effProsp / 300)
        : pr.type === "han" ? (0.6 + (effProsp + effSec) / 250)  // han: yolcu trafiği refah+güvenlikle artar
        : pr.type === "ev" ? 0.7 : 1;
      inc += base * condProspLevel * typeMult;
      if (pr.type === "ev" && (pr.level || 1) >= 2 && chance(0.04)) s.player.reputation = Math.min(100, s.player.reputation + 1); // köklü ev → itibar damlası
      // İşçi ekonomisi: çalışan NPC'ler üretimi artırır ama ücret ister.
      const w = propWorkerStats(s, pr, base, condProspLevel);
      inc += w.gross; wages += w.wage;
      // Mülk defteri: yıllık net (gelir − ücret) geçmişi (Vercel property ledger; şeffaflık).
      if (i === n - 1 && s.turn > 0 && s.turn % 12 === 0) { pr.ledger = pr.ledger || []; pr.ledger.push({ y: Math.floor(s.turn / 12), net: Math.round((base * condProspLevel * typeMult + w.gross - w.wage) * pmult) }); if (pr.ledger.length > 6) pr.ledger = pr.ledger.slice(-6); }
      const y = propYield(s, pr); if (y) { const sm = pr.type === "tarla" ? ({ "İlkbahar": 0.6, "Yaz": 1.0, "Sonbahar": 1.8, "Kış": 0.2 }[cal.season] ?? 1) : 1; const q = Math.round(y.qty * sm); if (q > 0) produced[y.good] = (produced[y.good] || 0) + q; } // işçi emeği → gerçek hammadde (tarla mevsimlik)
      if (pr.cond > 40 && chance(0.2)) pr.cond -= 1;                                   // zamanla aşınma
      if (effSec < 30 && chance(0.02 + (effSec < 10 ? 0.03 : 0))) {                    // düşük güvenlikte (eşkıya/yangın olayı kötüleştirir) yağma
        pr.cond = Math.max(20, pr.cond - 15);
        if (i === n - 1) push(s, "mülk_yagma", `${PROPERTY_TYPES[pr.type]?.name || "Mülkün"} (${pr.loc}) yağmaya uğradı; onarım gerek.`, "kişisel", false, { k: "evj.propRaid", p: [{ pt2: pr.type }, { pl: pr.loc }] });
      }
      // Katastrofik kayıp: mahallede AKTİF yangın olayı varken çok düşük olasılıkla mülk tümüyle kül olur.
      // Diyardaki tek geri-alınamaz mülki kayıp: oyuncu düşük güvenlikli şehirde mülk tutmanın gerçek riskini hisseder.
      if (!burnPr && i === n - 1 && locEventsAt(s, pr.loc || s.player.location_name).includes("yangin") && chance(0.012)) burnPr = pr;
    }
    if (burnPr) {
      const bi = s.player.properties.indexOf(burnPr);
      if (bi >= 0) {
        s.player.properties.splice(bi, 1);
        push(s, "mülk_yangın", `${PROPERTY_TYPES[burnPr.type]?.name || "Mülkün"} (${burnPr.loc}) yangında kül oldu; geriye taş üstünde taş kalmadı.`, "kişisel", true, { k: "evj.propBurned", p: [{ pt2: burnPr.type }, { pl: burnPr.loc }] });
      }
    }
    inc = Math.round(inc * pmult);
    // Kurulan yerleşimler yavaşça gelişir ve vergi getirir
    if (s.settlements?.length) {
      for (const st of s.settlements) if (st.dev < 100) st.dev = Math.min(100, st.dev + 1);
      inc += settlementIncome(s);
    }
    if (s.player.crowned) inc += 15 + crownTribute(s); // hükümdar hazinesi + ilhak/atanan vali haracı
    inc += governorIncome(s); // valilik vergi payı
    inc += courtSalary(s.player); // saray/divan maaşı (rütbeye göre)
    if (s.court && s.court.hazinedar) inc = Math.round(inc * 1.08); // hazinedar defterleri sıkı tutar, sızıntıyı keser
    // Enflasyon nominal gelirleri de yükseltir (gerçek ekonomi): üretken servet değerini korur, biriken nakit erir.
    const inf = inflationFactor(s);
    inc = Math.round(inc * inf);
    wages = wages * inf;
    const wageCost = Math.round(wages);
    if (wageCost > 0) s.player.money = Math.max(0, s.player.money - wageCost); // işçi maaşları (her hâlükârda ödenir; para negatife düşmez)
    if (inc > 0) s.player.money += inc;
    // Pasif gelir/ücret kroniği: aylık spam yerine yılda bir konsolide özet (gelir her ay parana eklenir).
    s.player.harvestAccum = (s.player.harvestAccum || 0) + inc;
    s.player.wageAccum = (s.player.wageAccum || 0) + wageCost;
    if (s.turn > 0 && s.turn % 12 === 0) {
      const ya = Math.round(s.player.harvestAccum || 0), yw = Math.round(s.player.wageAccum || 0);
      if (ya > 0) push(s, "mülk_hasat", yw > 0 ? `Bu yıl mülk ve yerleşimlerinden ${ya} akçe gelir geldi (${yw} akçe işçi ücreti ödendi).` : `Bu yıl mülk ve yerleşimlerinden ${ya} akçe gelir geldi.`, "kişisel", false, yw > 0 ? { k: "evj.propHarvestYW", p: [ya, yw] } : { k: "evj.propHarvestY", p: [ya] });
      s.player.harvestAccum = 0; s.player.wageAccum = 0;
    }
    // Üretim zinciri: işçilerin ürettiği hammadde envantere girer (tarla→buğday, değirmen→un) → zanaata/ticarete besler
    { const goods = Object.keys(produced).filter((g) => produced[g] > 0);
      if (goods.length) {
        for (const g of goods) s.player.inventory[g] = (s.player.inventory[g] || 0) + produced[g];
        if (i === n - 1) { const g0 = goods[0]; push(s, "mülk_hasat", `Mülklerinde işçilerin ${produced[g0]} ${ITEMS[g0]?.name || g0} üretti.`, "kişisel", false, { k: "evj.propProduce", p: [produced[g0], { i: g0 }] }); }
      } }
    // Aylık geçim gideri (yaş + servetle hafifçe artar) — para birikimini dengeler
    if (s.player.age >= 13 && s.player.money > 0) {
      const upkeep = Math.min(s.player.money, lifestyleUpkeep(s));
      s.player.money -= upkeep;
    }
    // Sarraf emaneti: yılda bir küçük mudârabe getirisi (sarraf işletir, kârdan pay).
    if ((s.player.deposit || 0) > 0 && s.turn > 0 && s.turn % 12 === 0) {
      const gain = Math.round((s.player.deposit || 0) * DEPOSIT_ANNUAL_YIELD);
      if (gain > 0) { s.player.deposit = (s.player.deposit || 0) + gain; if (i === n - 1) push(s, "ticaret", `Sarraf emanetini işletti; mudârabe payın ${gain} akçe (emanet ${s.player.deposit} akçe).`, "kişisel", false, { k: "evj.depositYield", p: [gain, s.player.deposit || 0] }); }
    }
    // Tefeci faizi: borç her ay büyür. Teminat eşiğini aşarsa sarraf alacağına karşılık mülke/nakde el koyar.
    if ((s.player.debt || 0) > 0) {
      s.player.debt = Math.round((s.player.debt || 0) * (1 + loanRate(s)));
      const ceiling = Math.round(creditLimit(s) * 1.6) + 500; // borç bunu aşınca tefeci harekete geçer
      if ((s.player.debt || 0) > ceiling) {
        const props = s.player.properties;
        if (props.length) { // önce en ucuz mülke el koy (teminat satışı)
          let idx = 0, lo = Infinity;
          props.forEach((pr, k) => { const v = PROPERTY_TYPES[pr.type]?.cost || 0; if (v < lo) { lo = v; idx = k; } });
          const seized = props[idx];
          const credit = Math.round((PROPERTY_TYPES[seized.type]?.cost || 0) * inflationFactor(s) * 0.6);
          props.splice(idx, 1);
          s.player.debt = Math.max(0, (s.player.debt || 0) - credit);
          s.player.reputation = Math.max(-100, s.player.reputation - 6);
          push(s, "mülk", `Borcunu ödeyemedin: sarraf ${PROPERTY_TYPES[seized.type]?.name || "mülküne"} (${seized.loc}) el koydu; itibarın sarsıldı. Kalan borç ${s.player.debt} akçe.`, "kişisel", true, { k: "evj.seizeProp", p: [{ pt2: seized.type }, { pl: seized.loc }, s.player.debt] });
        } else { // mülk yok: nakit + emanetten zorla alır + itibar (emanet hacizden muaf değil)
          const want = Math.round((s.player.debt || 0) * 0.3);
          let grab = Math.min(s.player.money, want);
          s.player.money = Math.max(0, s.player.money - grab);
          const rem = want - grab;
          if (rem > 0 && (s.player.deposit || 0) > 0) { const d = Math.min(s.player.deposit || 0, rem); s.player.deposit = (s.player.deposit || 0) - d; grab += d; }
          s.player.debt = Math.max(0, (s.player.debt || 0) - grab);
          s.player.reputation = Math.max(-100, s.player.reputation - 5);
          push(s, "ticaret", `Tefecinin adamları kapına dayandı; ${grab} akçene zorla el koydular, itibarın zedelendi.`, "kişisel", true, { k: "evj.seizeCash", p: [grab] });
        }
        if ((s.player.debt || 0) <= 0) { s.player.debt = 0; s.player.loan_turn = undefined; }
      }
    }
    if (inJail(s.player)) { // zindan ayı: tayın açlığı 35'te tutar, rutubet -1 sağlık; süre dolunca kapı açılır
      const jp = s.player;
      jp.hunger = Math.max(jp.hunger, 35); jp.health = Math.max(1, jp.health - 1);
      jp.jail!.left -= 1;
      if (jp.jail!.left <= 0) { jp.jail = null; jp.jail_freed = (jp.jail_freed || 0) + 1; jp.reputation = Math.max(-100, jp.reputation - 1); push(s, "suç", `Cezan doldu; zindan kapısı gün ışığına açıldı. Diyar seni unutmamış ama gözler bir süre üstünde.`, "kişisel", true, { k: "jail.released" }); }
      else { const JAIL_M_TR = ["Zindanda bir ay daha geçti; duvara bir çentik daha.", "Mazgaldan bir güvercin süzüldü; kırıntını paylaştın, gün biraz kısaldı.", "Yan hücrenin ihtiyarı duvara vura vura eski bir türkü tıklattı; sen de tempo tuttun."]; const jmi = Math.floor(Math.random() * JAIL_M_TR.length); push(s, "suç", JAIL_M_TR[jmi], "kişisel", false, { k: jmi === 0 ? "jail.month" : "jail.month" + jmi, p: [jp.jail!.left] }); }
    }
    { const mf = monthlyFlavor(s, cal); push(s, s.player.age < 13 ? "cocukluk" : "gunluk", mf.text, "kişisel", false, { k: mf.k }); }
    if (i === n - 1) { s.micro = null; if (!s.player.dead && s.player.age >= 6 && chance(0.12)) { const mp = s.player.age >= 13 ? MICRO_IDS : MICRO_KID_IDS; s.micro = { id: mp[Math.floor(Math.random() * mp.length)] }; } } // mikro an: yok sayılırsa ertesi ay kaybolur (çocuğa çocuk anı)
    crownCampaignTick(s); // Sefer 2.0: ordu her ay yol alır (yürüyüş → kuşatma → hüküm)
    if (i === n - 1) sagaTick(s); // Kül Yemini: destan sahnesi kapıları (düşen sahne panoda bekler, silinmez)
    if (i === n - 1) bloodlineTick(s); // Kan Defteri: nesil destanının sahne kapıları
    if (i === n - 1) successionTick(s); // Veraset: gözde ilanının kardeş sofrasındaki yankısı
    if (i === n - 1) { s.divan = null; if (!s.player.dead && s.player.crowned && chance(0.10)) s.divan = { id: DIVAN_IDS[Math.floor(Math.random() * DIVAN_IDS.length)] }; } // divan arzuhali: yalnız taç sahibine, yok sayılırsa düşer
    rollLifeEvents(s, cal);
    tickFactions(s, i === n - 1);
    tickDynasties(s, i === n - 1);
    tickWars(s, i === n - 1);
    tickCaravan(s);
    tickEconomy(s, i === n - 1);
    if (i === n - 1 && !s.player.dead && chance(0.16)) worldNews(s);  // diyarın diline düşenler
    if (i === n - 1) tipsTick(s); // eyleme dönük duyumlar (piyasa ipucu / fraksiyon istihbaratı)
    if (i === n - 1) { locEventTick(s); locEventPersonal(s); } // tipli lokasyon olayları (kuraklık/panayır/veba) + oradaysan hisset
    if (i === n - 1) factionAITick(s); // fraksiyonlar dünyada görünür eylemler yapar (bağış/sabotaj/nüfuz/suikast)
    if (i === n - 1) npcLifeTick(s); // yaşayan dünya: NPC ölüm/yeni nesil + evlilik/doğum (yılda bir)
    if (i === n - 1) claimAchievements(s); // ay sonunda yeni başarımları ödüllendir
    if (i === n - 1) claimFamilyQuests(s); // ay sonunda tamamlanan aile/yaşam görevlerini ödüllendir
    const inBreath = (s.story?.breath || 0) > 0; // doruk sonrası sakin dönem
    if (s.story && !inBreath) s.story.tension = Math.min(100, s.story.tension + 1); // gerilim zamanla birikir (nefeste durur)
    // Durgunluk dedektörü (Vercel story_director "Nefes Kuralı" portu): sessiz aylar birikince
    // dünya kendini hatırlatır — gerilim ve proaktif hikâye şansı tırmanır.
    if (s.story && i === n - 1) {
      const hadLandmark = s.history.some((e) => e.day === s.turn && e.landmark);
      s.story.lull = hadLandmark ? 0 : (s.story.lull || 0) + 1;
      if (!inBreath && (s.story.lull || 0) >= 5) s.story.tension = Math.min(100, s.story.tension + 2); // uzayan sessizlik gerilimi körükler
      directorTick(s); // doruk üretimi + nefes kuralı (gerilim 80+ → tek büyük an)
      epochTick(s);    // çağ olayları (her ~60-90 turda kalıcı dünya kırılması)
      governorTick(s); // valilik meşruiyeti + isyan/azil (yalnız vali ise)
      crownTick(s);    // hükümdarlık: otorite + atanan vali sadakati + saray olayları + isyan (yalnız tahttaysan)
      courtTick(s);    // saray/divan kariyeri: hükümdar itibarı + entrika + azil (yalnız sarayda hizmetteyken)
    }
    // Proaktif hikâye: dünya ara sıra kendiliğinden bir yay açar (gerilim + durgunluk arttıkça daha olası; nefes/dorukta bastırılır).
    if (s.story && !s.story.active && (s.story.breath || 0) === 0 && i === n - 1 && !s.player.dead && s.player.age >= 14) {
      const avail = availableArcs(s.player, s.story.completed, s.story.tension, null);
      const lullBoost = Math.max(0, (s.story.lull || 0) - 4) * 0.04;
      if (avail.length && chance(0.09 + s.story.tension / 500 + lullBoost)) {
        const a = rnd(avail);
        s.story.active = { id: a.id, stage: a.start };
        s.story.tension = Math.max(0, s.story.tension - 4); s.story.lull = 0;
        push(s, "hikaye_basladi", `Bir hikâye kapını çaldı: "${a.title}". (Hikâyelerim'den sürdür.)`, "kişisel", true, { k: "evj.arcKnock", p: [a.title] });
      } else if ((s.story.lull || 0) >= 4 && chance(0.35)) { sparkCard(s); } // durgunlukta kıvılcım kartı (Vercel _draw_spark)
    }
    // İlk aylarda yeni oyuncuya garantili olumlu an (tempo: önce kazandır)
    if (s.turn <= 3 && !s.player.dead && i === n - 1) {
      const g = 6 + Math.floor(Math.random() * 8); s.player.money += g;
      const NBR = ["Komşun sıcak bir çorba ikram etti.", "Pazarda biri eline birkaç akçe sıkıştırdı.", "Anlatılan bir masal yüreğini ısıttı.", "Fırıncı, günün son sıcak somununu eline tutuşturdu.", "İhtiyar bir komşu, kapının önünü süpürürken sana da dua etti.", "Bir kervancı yükünü indirirken yardımına karşılık avucuna bir şey bıraktı.", "Mahalle çocukları topladıkları cevizden bir avuç payına düşürdü.", "Hamamcı seni sırasız aldı: 'Bugün yorgunsun, belli.'", "Bostancı küfesinin dibindeki en olgun kavunu ayırmış: 'Bu senin, pazara değmez.'"];
      const ni = Math.floor(Math.random() * NBR.length);
      push(s, "gunluk", NBR[ni] + ` (+${g} akçe)`, "kişisel", false, { k: "evj.nbrGift", p: [{ sfx: "nbr." + ni }, g] });
    }
    // Cliffhanger: ayın sonunda ara sıra bir sonraki ayı tease et
    if (!s.player.dead && i === n - 1 && s.player.age >= 13 && chance(0.3)) {
      const FIS = [
        "Çarşıda bir fısıltı: önümüzdeki ay bir şeyler olacak gibi…",
        "Yolcular tuhaf haberler getiriyor; ay dönmeden öğrenirsin.",
        "İçine bir his düştü — bu ay bitmeden kapın çalınabilir.",
        "Ufukta toz bulutu; haberi yakında gelir.",
        "Kahvede yanındaki masada bir cümle yarım kaldı: adın geçti, gerisini duyamadın.",
        "Rüzgâr uzaktan bir davul sesi getirdi; kimse nereden geldiğini kestiremedi.",
        "Gece bekçisi feneriyle iki kez kapının önünden geçti; sanki bir şey söyleyecekti, vazgeçti.",
        "Pazarda bir falcı avucuna bakmadan yüzüne baktı: 'Senin ayın dolu' deyip yürüdü.",
        "Pencere pervazına bir güvercin kondu, ayağında iplik izi; kuş uçtu, iz aklında kaldı.",
        "Kapının altından mühürsüz bir kâğıt süzüldü: tek satır, yarısı silik — 'hazır ol' okunuyor gibi.",
        "Hamamda ihtiyar bir ses: 'Bu ayın suyu başka akıyor' — kimse dönüp bakmadı, sen baktın.",
        "Sokak köpekleri gece aynı yöne havladı; bekçi 'bir şey geçti' dedi, ne olduğunu söyleyemedi.",
        "Değirmenin taşı gece kendi kendine döndü derler; un yok, buğday yok — yalnız ses.",
        "Çarşı kapısındaki dilenci bugün sadaka almadı; 'bugün sıra bende' deyip avucundakini dağıttı, kimse anlamadı.",
      ];
      const fi = Math.floor(Math.random() * FIS.length);
      push(s, "fisilti", FIS[fi], "kişisel", false, { k: "fis." + fi });
    }
  }
  // Kronik budaması dönüm noktalarını (landmark) korur: roman/tarih, çocukluk bölümlerini kaybetmesin.
  // Landmark'lar zaten seyrek (ömürde onlarca) — kayıt boyutu güvenliği bozulmaz; sıradan girdiler en yeni 250'ye kırpılır.
  if (s.history.length > 250) {
    const marks = s.history.filter((e) => e.landmark);
    const rest = s.history.filter((e) => !e.landmark).slice(-(250 - Math.min(marks.length, 80)));
    s.history = [...marks.slice(-80), ...rest].sort((a, b) => a.day - b.day);
  }
  return s;
}

// Ocak savaşlarını ilerlet: yeni savaş çıkar, sürenleri yürüt, biteni çöz.
// Sancak hakimiyetinin başlangıç hâli: her sancağa deterministik bir hâkim fraksiyon.
export function defaultRealm(): SancakHold[] {
  const ids = FACTIONS.map((f) => f.id);
  return BEYLIKS.map((b, i) => ({ id: b.id, holder: ids[i % ids.length], contender: null, tension: 0 }));
}
// Sancak hakimiyetini başlat (yoksa).
export function ensureRealm(s: GameState): SancakHold[] {
  if (!s.realm) s.realm = defaultRealm();
  return s.realm;
}
// Fraksiyon şehir-kontrolü tikİ (Vercel faction_system gain/lose_influence + _should_attack portu):
// her sancakta gerilim birikir, rakip fraksiyon yükselir, gerilim dorukta ödüllü savaş patlar.
function tickFactions(s: GameState, announce: boolean) {
  // Çok oyuncuda beylik hakimiyeti sunucunun otoritesindedir — yerel ocak-beylik
  // savaşı çalışmaz (yoksa aynı beylik hem "NPC savaşıyor" hem "oyuncu bey" görünür).
  if (s.mpRealm) return;
  const realm = ensureRealm(s);
  const ids = FACTIONS.map((f) => f.id);
  for (const sn of realm) {
    // Bu sancak için zaten bir savaş varsa karışma.
    if (s.wars.some((w) => w.prize === sn.id)) continue;
    sn.tension = Math.min(120, sn.tension + Math.floor(Math.random() * 5)); // 0-4 sürtüşme
    // Rakip fraksiyon yoksa ve gerilim arttıysa, KARAKTERE UYGUN bir aday göz diker.
    // Müttefikler saldırmaz; iştahsız (şifacı gibi barışçıl) fraksiyonlar göz dikmez; düşmanlık iştahı katlar.
    if (!sn.contender && sn.tension > 40) {
      const holderAllies = factionTrait(sn.holder).allies;
      const weighted = ids
        .filter((id) => id !== sn.holder && !holderAllies.includes(id))
        .filter((id) => !onWarCooldown(s, sn.holder, id)) // yeni ateşkesteki loncalar göz dikmez
        .map((id) => { let w = factionTrait(id).aggression; if (factionStance(id, sn.holder) < 0) w *= 2.2; return { id, w }; })
        .filter((x) => x.w > 0.12); // barışçıl fraksiyonlar (şifacı) hak iddia etmez
      const total = weighted.reduce((a, x) => a + x.w, 0);
      if (total > 0 && Math.random() < 0.30 * Math.min(1, total)) {
        let r = Math.random() * total; let pick = weighted[0].id;
        for (const x of weighted) { r -= x.w; if (r <= 0) { pick = x.id; break; } }
        sn.contender = pick;
        if (announce) push(s, "ocak_savasi", `${factionById(sn.contender)?.name}, ${beylikName(sn.id)} üzerinde hak iddia ediyor.`, "makro", true, { k: "evj.warClaim", p: [{ fc: sn.contender! }, { bl: sn.id }] });
      }
    }
    // Gerilim dorukta + rakip var → savaş patlar (ateşkes yoksa).
    if (sn.tension >= 100 && sn.contender && onWarCooldown(s, sn.holder, sn.contender)) {
      sn.contender = null; sn.tension = 70; // ateşkes sürüyor: savaş ertelenir
    } else if (sn.tension >= 100 && sn.contender) {
      s.wars.push({ a: sn.holder, b: sn.contender, turnsLeft: 4 + Math.floor(Math.random() * 4), aScore: 0, bScore: 0, prize: sn.id });
      sn.tension = 55;
      if (announce) push(s, "ocak_savasi", `${factionById(sn.holder)?.name} ile ${factionById(sn.contender)?.name}, ${beylikName(sn.id)} için savaşa tutuştu!`, "makro", true, { k: "evj.warStart", p: [{ fc: sn.holder }, { fc: sn.contender! }, { bl: sn.id }] });
    } else if (!sn.contender) {
      sn.tension = Math.max(0, sn.tension - 2); // rakip yoksa gerilim yavaşça söner
    }
  }
  // Koalisyon (Vercel _check_coalition_trigger): bir lonca aşırı baskınsa (3+ sancak) zayıflar birleşip bir sancağına yüklenir.
  const counts: Record<string, number> = {};
  for (const sn of realm) counts[sn.holder] = (counts[sn.holder] || 0) + 1;
  const dominant = ids.find((id) => (counts[id] || 0) >= 3);
  if (dominant && Math.random() < 0.12) {
    const target = realm.find((sn) => sn.holder === dominant && !sn.contender && !s.wars.some((w) => w.prize === sn.id));
    const challenger = ids
      .filter((id) => id !== dominant && !factionTrait(dominant).allies.includes(id) && factionTrait(id).aggression > 0.12 && !onWarCooldown(s, dominant, id))
      .sort((a, b) => factionTrait(b).aggression - factionTrait(a).aggression)[0];
    if (target && challenger) {
      target.contender = challenger; target.tension = Math.max(target.tension, 92);
      if (announce) push(s, "ocak_savasi", `${factionById(dominant)?.name} fazla güçlendi; zayıf loncalar ${factionById(challenger)?.name} öncülüğünde koalisyon kurdu.`, "makro", true, { k: "fai.coalition", p: [{ fc: dominant }, { fc: challenger }] });
    }
  }
}
// Rakip hanedanların yaşayan durumu (yoksa tohumdan başlat).
export function ensureRivals(s: GameState): RivalHouse[] {
  if (!s.rivals) s.rivals = generateDynasties(s.seed);
  // Eski kayıt göçü: nameIdx yoksa TR addan türet (kültürel yerelleştirme için).
  for (const h of s.rivals) if (h.nameIdx == null) h.nameIdx = houseNameIdx(h.name);
  return s.rivals;
}
// Rakip hanedan tikİ (Vercel dynasties.py portu): güç mizaca göre sürüklenir + ara sıra hamle yaparlar.
function tickDynasties(s: GameState, announce: boolean) {
  const rivals = ensureRivals(s);
  const p = s.player;
  for (const h of rivals) {
    const drift = (h.trait === "ihtiraslı" ? 1 : 0) + Math.floor(Math.random() * 4) - 1;
    h.power = Math.max(20, Math.min(100, h.power + drift));
    // Oyuncuya tutum: yaşayan değer — oyuncunun nam/itibarına göre hedefe doğru sürüklenir (Vercel oyuncuya_tutum).
    const target = houseAttitude(p, h);
    h.tutum = Math.round(Math.max(-100, Math.min(100, (h.tutum ?? target) * 0.85 + target * 0.15)));
  }
  // ── Kan davası tiki: tutuşma, ısı, tırmanma, aylık zarar. Dava sulh ya da meydan savaşıyla biter; bitmezse NESLE GEÇER. ──
  if (announce) tickFeud(s, rivals);
  if (announce) tickPlot(s, rivals);
  if (announce) tickRetinue(s);
  if (announce) tickEnemyPlot(s, rivals);
  if (announce) tickCourt(s);
  // Düşman hane sabotajı: tutumu çok düşük bir hane oyuncunun mülküne el uzatır (gerçek zarar).
  if (announce && p.properties.length) {
    const foes = rivals.filter((h) => (h.tutum ?? 0) <= -25 && h.id !== s.feud?.houseId); // dava hanesi ayrı işlenir (tickFeud) — çifte sabotaj olmasın
    if (foes.length && Math.random() < 0.12) {
      const h = foes[Math.floor(Math.random() * foes.length)];
      const pr = p.properties[Math.floor(Math.random() * p.properties.length)];
      pr.cond = Math.max(15, pr.cond - 22);
      h.tutum = Math.max(-100, (h.tutum ?? 0) - 3);
      push(s, "hanedan_haber", `${h.name} adamları ${PROPERTY_TYPES[pr.type]?.name || "mülküne"} (${pr.loc}) zarar verdi; hesap büyüyor.`, "makro", true, { k: "evj.houseSabotage", p: [{ hn: h.nameIdx }, { pt2: pr.type }, { pl: pr.loc }] });
    }
  }
  // İttifak kopuşu: müttefik hanenin tutumu dibe vurursa el sıkışma bozulur (ittifak sonsuz bayrak değil, yaşayan bağ).
  if (announce && (s.allied_houses || []).length) {
    for (const hid of [...s.allied_houses!]) {
      const ah = rivals.find((x) => x.id === hid);
      if (ah && (ah.tutum ?? 0) <= -30) {
        s.allied_houses = s.allied_houses!.filter((x) => x !== hid);
        push(s, "hanedan_haber", `${ah.name} ile ittifak bozuldu; soğuyan dostluk sonunda koptu.`, "makro", true, { k: "evj.houseAllyBroken", p: [{ hn: ah.nameIdx }] });
      }
    }
  }
  // Dost hane teklifi: tutumu yüksek bir hane ittifak ya da evlilik önerir (oyuncu kabul/ret eder).
  if (announce) {
    const offers = s.dynastyOffers || [];
    const allied = s.allied_houses || [];
    const friends = rivals.filter((h) => (h.tutum ?? 0) >= 35 && !offers.some((o) => o.houseId === h.id) && !allied.includes(h.id));
    if (friends.length && Math.random() < 0.08) {
      const h = friends[Math.floor(Math.random() * friends.length)];
      const canMarry = !p.married && p.age >= 16 && p.age < 55;
      const type: "ittifak" | "evlilik" = canMarry && Math.random() < 0.45 ? "evlilik" : "ittifak";
      (s.dynastyOffers = offers).push({ id: "off_" + Math.random().toString(36).slice(2, 8), houseId: h.id, nameIdx: h.nameIdx, type });
      push(s, "hanedan_haber", type === "evlilik" ? `${h.name} hanedanı sana evlilik ittifakı teklif etti.` : `${h.name} hanedanı sana ittifak teklif etti.`, "makro", true, { k: type === "evlilik" ? "evj.houseMarryOffer" : "evj.houseAllyOffer", p: [{ hn: h.nameIdx }] });
    }
  }
  // Oyuncuyla doğrudan rakip hanedan ANI (olgun yaşta, otomatik çözümlü): husumette meydan okuma, dostlukta saygı, arada söz çekişmesi.
  if (announce && p.age >= 25 && rivals.length && Math.random() < 0.07) {
    const h = rivals[Math.floor(Math.random() * rivals.length)];
    const tu = h.tutum ?? 0;
    if (tu <= -20) {
      if (p.fame >= 55 || effStat(p, "charisma") >= 7 || p.fear >= 40) { // namın onları sindirir
        p.reputation = Math.min(100, p.reputation + 3); bumpNam(p, "mert", 2); h.tutum = Math.max(-100, tu - 2);
        push(s, "hanedan_haber", `${h.name} hanedanı sana meydan okumaya kalktı; namın karşısında geri adım attılar.`, "makro", true, { k: "evj.houseTauntCowed", p: [{ hn: h.nameIdx }] });
      } else {
        p.fear = Math.min(100, p.fear + 4); p.reputation = Math.max(-100, p.reputation - 2);
        push(s, "hanedan_haber", `${h.name} hanedanı seni açıkça aşağıladı; diyarda itibarın çizik aldı.`, "makro", true, { k: "evj.houseTaunt", p: [{ hn: h.nameIdx }] });
      }
    } else if (tu >= 25) {
      p.reputation = Math.min(100, p.reputation + 3);
      push(s, "hanedan_haber", `${h.name} hanedanı bir mecliste sana hürmet gösterdi; saygınlığın arttı.`, "makro", false, { k: "evj.houseHonor", p: [{ hn: h.nameIdx }] });
    } else {
      gainSkill(s, "social", 6);
      push(s, "hanedan_haber", `${h.name} hanedanıyla bir mecliste söz dalaşına girdin; diller bilendi, bağlar gerildi.`, "makro", false, { k: "evj.houseFriction", p: [{ hn: h.nameIdx }] });
    }
  }
  if (!announce || rivals.length < 2 || Math.random() >= 0.14) return;
  const h = rivals[Math.floor(Math.random() * rivals.length)];
  const other = rivals[(rivals.indexOf(h) + 1 + Math.floor(Math.random() * (rivals.length - 1))) % rivals.length];
  const roll = Math.random();
  if (h.trait === "ihtiraslı" || roll < 0.4) {
    h.power = Math.min(100, h.power + 4);
    push(s, "hanedan_haber", `${h.name} yeni bir kale ele geçirdi; gücü artıyor.`, "makro", true, { k: "evj.houseCastle", p: [{ hn: h.nameIdx }] });
  } else if (h.trait === "kindar" || roll < 0.7) {
    push(s, "hanedan_haber", `${h.name} ile ${other.name} arasında husumet alevlendi.`, "makro", true, { k: "evj.houseFeud", p: [{ hn: h.nameIdx }, { hn: other.nameIdx }] });
  } else {
    push(s, "hanedan_haber", `${h.name} ile ${other.name} bir ittifak kurdu; diyarda dengeler değişiyor.`, "makro", true, { k: "evj.houseAlly", p: [{ hn: h.nameIdx }, { hn: other.nameIdx }] });
  }
}
// ── Kan davası: nesiller boyu sürebilen tırmanmalı husumet. Aşamalar: 1 husumet → 2 sabotaj → 3 açık çatışma. ──
const FEUD_STAGE2_HEAT = 25; const FEUD_STAGE3_HEAT = 55;
// ── GÖLGE OYUNLARI: rakip haneye komplo — aylarca örülür, fısıltısı birikir, açığa çıkabilir. ──
// Tasarım: tek aktif komplo; başlatmak ve el tutmak akçe ister; zekâ/eller/Gölge üyeliği hızlandırır.
// Fısıltı 40'ı aşınca her ay artan ifşa riski: yakalanan itibar+şeref kaybeder, hane diş biler, kan
// davası tutuşabilir; taçlıysa meşruiyet erir (D160 ilkesi). Ganimet yalnız sabotajda ve kısmen sıcak maldır.
export const PLOT_COST = 60;
export const PLOT_HELPER_COST = 40;
export function plotCost(s: GameState): number { return Math.round(PLOT_COST * inflationFactor(s) * (s.player.faction === "golge" ? 0.5 : 1)); }
export function plotHelperCost(s: GameState): number { return Math.round(PLOT_HELPER_COST * inflationFactor(s) * (s.player.faction === "golge" ? 0.5 : 1)); }
export function startPlot(prev: GameState, houseId: string, kind: "leke" | "sabotaj" | "nifak"): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 16 || inJail(p) || s.plot) return s;
  const h = ensureRivals(s).find((x) => x.id === houseId); if (!h) return s;
  if ((s.allied_houses || []).includes(houseId)) return s; // müttefike komplo kurulmaz — önce ittifak bozulur
  const cost = plotCost(s);
  if (p.money < cost) return s;
  p.money -= cost;
  s.plot = { kind, houseId, nameIdx: h.nameIdx, stage: 0, heat: 0, helpers: 0, started: s.turn };
  push(s, "entrika", `${h.name} aleyhine iplikler örülmeye başladı; bu iş sabır ve sessizlik ister.`, "kişisel", true, { k: "evj.plotStart", p: [{ hn: h.nameIdx }] });
  return s;
}
export function hirePlotHelper(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  const pl = s.plot; if (!pl || p.dead || inJail(p) || pl.helpers >= 2) return s;
  const cost = plotHelperCost(s);
  if (p.money < cost) return s;
  p.money -= cost; pl.helpers += 1;
  push(s, "entrika", `Kesenin ağzı açıldı, işe bir el daha koşuldu; iş hızlanır ama fısıltı da çoğalır.`, "kişisel", false, { k: "evj.plotHelper" });
  return s;
}
function tickPlot(s: GameState, rivals: RivalHouse[]) {
  const pl = s.plot; const p = s.player;
  if (!pl || p.dead) return;
  const h = rivals.find((x) => x.id === pl.houseId);
  if (!h) { s.plot = null; return; }
  // İlerleme: zekâ, eller ve Gölge ağı
  const prog = 0.30 + effStat(p, "intelligence") * 0.015 + pl.helpers * 0.12 + (p.faction === "golge" ? 0.08 : 0);
  if (Math.random() < prog) pl.stage += 1;
  // Fısıltı: iş büyüdükçe ve eller çoğaldıkça artar; Gölge iz siler
  pl.heat += 3 + (pl.kind === "sabotaj" ? 3 : pl.kind === "nifak" ? 2 : 1) + pl.helpers - (p.faction === "golge" ? 1 : 0) - (s.court && s.court.casusbasi ? 1 : 0);
  // İfşa: fısıltı 40'ı aşınca her ay artan risk
  if (pl.heat > 40 && Math.random() * 100 < pl.heat - 40) {
    s.plot = null;
    p.reputation = Math.max(-100, p.reputation - 10); p.honor = Math.max(0, p.honor - 6);
    h.tutum = Math.max(-100, (h.tutum ?? 0) - 30);
    if (p.crowned) p.crownAuthority = clamp100(crownAuthorityOf(p) - 10); // taçlı entrikacının bedeli meşruiyet
    if (!s.feud) s.feud = { houseId: h.id, nameIdx: h.nameIdx, stage: 1, heat: 20 }; // ifşa kan davası tutuşturabilir
    push(s, "entrika", `Komplon açığa çıktı! ${h.name} gerçeği çarşıya döktü; adın entrikacıya çıktı, hane sana diş biliyor.`, "makro", true, { k: "evj.plotExposed", p: [{ hn: h.nameIdx }] });
    return;
  }
  if (pl.stage >= 3) { // komplo tamam
    s.plot = null;
    p.plot_wins = (p.plot_wins || 0) + 1;
    bumpNam(p, "zalim", 1); p.fear = Math.min(100, p.fear + 2);
    if (pl.kind === "leke") {
      h.power = Math.max(20, h.power - 10);
      push(s, "entrika", `Ektiğin söylentiler kök saldı: ${h.name} çarşıda lekelendi, gücü sarsıldı. Kimse senin parmağını görmedi.`, "makro", true, { k: "evj.plotDone.leke", p: [{ hn: h.nameIdx }] });
    } else if (pl.kind === "sabotaj") {
      h.power = Math.max(20, h.power - 8);
      const loot = Math.round((50 + Math.floor(Math.random() * 40)) * inflationFactor(s));
      const hot = Math.round(loot * 0.4); const cash = loot - hot;
      p.money += cash; p.hotGoods = (p.hotGoods || 0) + hot;
      push(s, "entrika", `${h.name} kervanı gece pusuya düştü; mallar el değiştirdi (+${cash} akçe, ${hot} akçelik sıcak mal). Hane kayıplarını sayıyor.`, "makro", true, { k: "evj.plotDone.sabotaj", p: [{ hn: h.nameIdx }, cash, hot] });
    } else {
      h.power = Math.max(20, h.power - 6); h.pride = Math.max(0, (h.pride || 50) - 10);
      push(s, "entrika", `Nifak tohumların yeşerdi: ${h.name} dostlarıyla bozuştu, kapısı yalnızlaştı. Perde arkasındaki eli kimse bilmiyor.`, "makro", true, { k: "evj.plotDone.nifak", p: [{ hn: h.nameIdx }] });
    }
  }
}
function tickFeud(s: GameState, rivals: RivalHouse[]) {
  const p = s.player;
  if (p.dead) return;
  if (!s.feud) {
    // Tutuşma: derin husumetli bir hane (tutum ≤ -45) davayı başlatabilir.
    const bitter = rivals.filter((h) => (h.tutum ?? 0) <= -45);
    if (bitter.length && Math.random() < 0.08) {
      const h = bitter[Math.floor(Math.random() * bitter.length)];
      s.feud = { houseId: h.id, nameIdx: h.nameIdx, stage: 1, heat: 0 };
      push(s, "kan_davası", `${h.name} ile aranızda kan davası başladı; iki ocak arasına ateş düştü.`, "makro", true, { k: "evj.feud.start", p: [{ hn: h.nameIdx }] });
    }
    return;
  }
  const f = s.feud;
  const h = rivals.find((x) => x.id === f.houseId);
  if (!h) { s.feud = null; return; } // hane kayıtlardan düşmüşse dava söner
  h.tutum = Math.min(h.tutum ?? -45, -45); // dava sürerken husumet tabanı: tutum kendiliğinden yumuşamaz
  f.heat = Math.min(100, f.heat + 1 + (h.trait === "kindar" ? 1 : 0));
  if (f.stage < 2 && f.heat >= FEUD_STAGE2_HEAT) { f.stage = 2; push(s, "kan_davası", `${h.name} ile dava büyüdü: artık laf değil, mal mülk hedefte.`, "makro", true, { k: "evj.feud.stage2", p: [{ hn: h.nameIdx }] }); }
  else if (f.stage < 3 && f.heat >= FEUD_STAGE3_HEAT) {
    f.stage = 3; push(s, "kan_davası", `${h.name} ile dava kana bulandı: adamları silahlandı, yollar güvensiz.`, "makro", true, { k: "evj.feud.stage3", p: [{ hn: h.nameIdx }] });
    if (!s.bloodline) { // KAN DEFTERİ açılır: bu dava artık bir ömrün değil, bir soyun meselesi
      s.bloodline = { houseId: f.houseId, nameIdx: f.nameIdx, gen: 1, scene: "bl_yemin", path: [], opened: s.turn };
      push(s, "kan_defteri", `Kan defteri açıldı: ${h.name} ile hesap soy defterine yazıldı.`, "makro", true, { k: "bl.opened", p: [{ hn: f.nameIdx }] });
    }
  }
  // Aylık zarar: aşamaya göre sertleşir (olasılıklı — her ay değil).
  if (f.stage === 1 && Math.random() < 0.14) {
    p.reputation = Math.max(-100, p.reputation - 2);
    push(s, "kan_davası", `${h.name} çarşıda adını çamura buladı; dava sinsice işliyor.`, "makro", false, { k: "evj.feud.taunt", p: [{ hn: h.nameIdx }] });
  } else if (f.stage === 2 && p.properties.length && Math.random() < 0.14) {
    const pr = p.properties[Math.floor(Math.random() * p.properties.length)];
    pr.cond = Math.max(15, pr.cond - 25);
    push(s, "kan_davası", `${h.name} adamları gece ${PROPERTY_TYPES[pr.type]?.name || "mülküne"} (${pr.loc}) dadandı; dava mala sıçradı.`, "makro", true, { k: "evj.feud.sabotage", p: [{ hn: h.nameIdx }, { pt2: pr.type }, { pl: pr.loc }] });
  } else if (f.stage === 3 && Math.random() < 0.09) {
    const guard = rosterAt(s, p.location_name).find((n) => (s.relationships[n.id] || 0) >= 50);
    if (guard && Math.random() < 0.4) {
      // Sadık dost pusudan haber uçurur — kendini riske attığı için bağ hafif yıpranır (dostluk bedava kalkan değil).
      s.relationships[guard.id] = Math.max(-100, (s.relationships[guard.id] || 0) - 5);
      push(s, "kan_davası", `${h.name} pususunu ${guard.name} önceden haber verdi; kıl payı kurtuldun.`, "kişisel", true, { k: "evj.feud.friendWarn", p: [guard.name, { hn: h.nameIdx }] });
    } else {
      const hurt = 6 + Math.floor(Math.random() * 6);
      p.health = Math.max(1, p.health - hurt); p.fear = Math.min(100, p.fear + 2); // pusu öldürmez ama iz bırakır — ölüm ancak meydan savaşında
      push(s, "kan_davası", `${h.name} pusu kurdu; canını zor kurtardın (sağlık -${hurt}).`, "kişisel", true, { k: "evj.feud.ambush", p: [{ hn: h.nameIdx }, hurt] });
    }
  }
  // Aksakallı sulhü: ateş tavana dayanıp iki taraf da yorulunca büyükler araya girebilir — dava kendiliğinden kapanır.
  // (İlgilenmeyen oyuncu için ömür boyu kan kaybı olmasın; ölçüldü — davasız medyan ömür 66, sonsuz davada 59'a düşüyordu.)
  if (s.feud && f.heat >= 90 && Math.random() < 0.06) {
    s.feud = null;
    h.tutum = -25;
    push(s, "kan_davası", `Aksakallılar araya girdi: ${h.name} ile dava yorgunluktan söndü; kor küllendi ama unutulmadı.`, "makro", true, { k: "evj.feud.elders", p: [{ hn: h.nameIdx }] });
  }
}
// Sulh bedeli: hanenin gururu + çağın parası.
export function feudPeaceCost(s: GameState): number {
  const h = s.feud ? ensureRivals(s).find((x) => x.id === s.feud!.houseId) : null;
  return Math.round((60 + (h?.pride || 40)) * inflationFactor(s));
}
// Sulh iste: bedel öde, karizma/itibar şansıyla dava kapansın. Ayda bir girişim.
export function feudSuePeace(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  const f = s.feud; if (!f || p.dead) return s;
  if (f.act_turn === s.turn) return s; // ayda tek dava hamlesi
  const cost = feudPeaceCost(s);
  if (p.money < cost) return s;
  f.act_turn = s.turn;
  p.money -= cost;
  const h = ensureRivals(s).find((x) => x.id === f.houseId);
  const chance = Math.max(0.15, Math.min(0.85, 0.35 + effStat(p, "charisma") * 0.03 + p.reputation * 0.002 - f.heat * 0.003));
  if (Math.random() < chance) {
    s.feud = null;
    if (h) h.tutum = -10; // sulh: husumet küle döner ama kor hâlâ sıcak
    p.honor = Math.min(100, p.honor + 4);
    push(s, "kan_davası", `${h?.name || "Hasım hane"} ile sulh oldu: kan parası ödendi (${cost} akçe), dava kapandı.`, "makro", true, { k: "evj.feud.peace", p: [h ? { hn: h.nameIdx } : "", cost] });
  } else {
    f.heat = Math.min(100, f.heat + 5); // reddedilen sulh gururlarını okşadı, ateşi harladı
    push(s, "kan_davası", `${h?.name || "Hasım hane"} sulh akçeni yüzüne fırlattı (${cost} akçe gitti); dava harlandı.`, "makro", true, { k: "evj.feud.peaceFail", p: [h ? { hn: h.nameIdx } : "", cost] });
  }
  return s;
}
// Karşılık ver: aşama 1-2'de misilleme (ısıyı yükseltir ama güçlerini kırar), aşama 3'te MEYDAN SAVAŞI (davayı bitirebilir).
export function feudStrike(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  const f = s.feud; if (!f || p.dead || p.age < 16) return s;
  if (f.act_turn === s.turn) return s; // ayda tek dava hamlesi
  f.act_turn = s.turn;
  const h = ensureRivals(s).find((x) => x.id === f.houseId);
  if (!h) { s.feud = null; return s; }
  if (f.stage < 3) {
    h.power = Math.max(20, h.power - 3);
    f.heat = Math.min(100, f.heat + 6);
    p.fear = Math.min(100, p.fear + 3); p.reputation = Math.max(-100, p.reputation - 2); // misilleme korku salar ama el âlem hoş görmez
    bumpNam(p, "zalim", 2);
    push(s, "kan_davası", `${h.name}'na misilleme yaptın: adamları geri çekildi ama ateş büyüdü.`, "makro", true, { k: "evj.feud.strike", p: [{ hn: h.nameIdx }] });
    return s;
  }
  // Meydan savaşı: gücün + müttefiklerin hanenin gücüne karşı. Kazanan davayı bitirir.
  const allyBoost = (s.allied_houses?.length || 0) > 0 ? 0.1 : 0; // arkanı kollayan hane varsa terazi senden yana
  const chance = Math.max(0.15, Math.min(0.85, 0.25 + (combatPower(p) * 2 - h.power) * 0.008 + allyBoost));
  if (Math.random() < chance) {
    const loot = Math.round(100 * inflationFactor(s)); // savaş tazminatı çağın parasıyla
    s.feud = null;
    h.power = Math.max(20, h.power - 20); h.tutum = -20;
    p.money += loot; p.fame = Math.min(100, p.fame + 8); p.fear = Math.min(100, p.fear + 8); p.honor = Math.min(100, p.honor + 4);
    bumpNam(p, "mert", 6);
    push(s, "kan_davası", `Meydan savaşında ${h.name}'nı dize getirdin: dava bitti, tazminat kesildi (+${loot} akçe).`, "kişisel", true, { k: "evj.feud.win", p: [{ hn: h.nameIdx }, loot] });
  } else {
    const hurt = 18 + Math.floor(Math.random() * 8);
    p.health = Math.max(0, p.health - hurt);
    if (p.health <= 0) { die(s, `${p.name}, ${h.name} ile meydan savaşında can verdi; dava vârise kaldı.`, { k: "evj.feud.die", p: [p.name, { hn: h.nameIdx }] }); return s; }
    maybeInjure(s, true);
    push(s, "kan_davası", `Meydan savaşında ${h.name}'na yenildin; yaralarını sardın, dava sürüyor.`, "kişisel", true, { k: "evj.feud.lose", p: [{ hn: h.nameIdx }, hurt] });
  }
  return s;
}

// Dost hane teklifini kabul et (ittifak veya evlilik).
export function acceptDynastyOffer(prev: GameState, offerId: string): GameState {
  const s = clone(prev); const p = s.player;
  const offer = (s.dynastyOffers || []).find((o) => o.id === offerId);
  if (!offer) return s;
  s.dynastyOffers = (s.dynastyOffers || []).filter((o) => o.id !== offerId);
  const h = ensureRivals(s).find((x) => x.id === offer.houseId);
  if (h) h.tutum = Math.min(100, (h.tutum ?? 0) + (offer.type === "evlilik" ? 40 : 30));
  if (!s.allied_houses) s.allied_houses = [];
  if (!s.allied_houses.includes(offer.houseId)) s.allied_houses.push(offer.houseId);
  if (offer.type === "evlilik" && !p.married) {
    const name = p.gender === "erkek" ? rnd(SPOUSE_K) : rnd(SPOUSE_E);
    p.married = true; p.married_turn = s.turn; p.spouse_bond = 40; p.spouse_name = name; p.spouse_seed = Math.floor(Math.random() * 1e9);
    p.reputation = Math.min(100, p.reputation + 8); p.fame = Math.min(100, p.fame + 6);
    push(s, "evlilik", `${h?.name || "Köklü bir hanedan"} ile evlilik ittifakı kurdun; iki ocak birleşti.`, "kişisel", true, { k: "evj.houseMarryAccept", p: [h ? { hn: h.nameIdx } : "", { fn: [p.spouse_seed, p.gender === "erkek" ? "kadın" : "erkek"] }] });
  } else {
    p.reputation = Math.min(100, p.reputation + 5);
    push(s, "hanedan_haber", `${h?.name || "Bir hanedan"} ile ittifak kurdun; artık arkanı kollayan bir gücün var.`, "makro", true, { k: "evj.houseAllyAccept", p: [h ? { hn: h.nameIdx } : ""] });
  }
  return s;
}
// Elçi gönder: soğuyan haneye hediyelerle yumuşama — ittifakın ön adımı (ayda tek diplomasi hakkını kullanır; farm yok).
export const ENVOY_COST = 40;
export function sendEnvoy(prev: GameState, houseId: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 16) return s;
  if (p.propose_turn === s.turn) return s; // teklif ve elçi aynı aylık hakkı paylaşır
  const h = ensureRivals(s).find((x) => x.id === houseId); if (!h) return s;
  if ((s.allied_houses || []).includes(houseId)) return s;
  const cost = Math.round(ENVOY_COST * inflationFactor(s));
  if (p.money < cost) { push(s, "hanedan_haber", `Elçi donatacak akçen yok.`, "kişisel", false, { k: "evj.envoyNoFee" }); return s; }
  p.propose_turn = s.turn; p.money -= cost;
  h.tutum = Math.min(100, (h.tutum ?? 0) + 8 + Math.floor(Math.random() * 7)); // 8-14: iki-üç elçilik soğuk haneyi teklife hazır eder
  { const ev2 = chance(0.5); push(s, "hanedan_haber", ev2 ? `Elçin ${h.name} konağında üç gün ağırlandı; dönerken heybesinde karşı hediye vardı — buz tam kırılmadı ama çatladı.` : `${h.name} kapısına hediyelerle elçi gönderdin; soğuk selam ılıdı.`, "makro", false, { k: ev2 ? "evj.envoySent2" : "evj.envoySent", p: [{ hn: h.nameIdx }] }); }
  return s;
}
// Haraç talebi: kılıç çekmeden beylik sindirmek — başarısı seferden düşük, bedeli otorite (taht eylemi hakkını kullanır).
export function demandTribute(prev: GameState, beylikId: string): { state: GameState; success: boolean } {
  const s = clone(prev); const p = s.player;
  if (!p.crowned || p.dead) return { state: s, success: false };
  if (p.crown_action_turn === s.turn) return { state: s, success: false }; // ayda tek taht eylemi (iddia bastırmayla ortak)
  if (!campaignTargets(s).some((t) => t.id === beylikId)) return { state: s, success: false };
  p.crown_action_turn = s.turn;
  const odds = Math.max(0.1, Math.min(0.8, campaignOdds(s) - 0.1)); // kılıçsız korkutmak kılıçtan zordur
  if (Math.random() < odds) {
    const trib = Math.round(150 * inflationFactor(s));
    p.money += trib; p.crownAuthority = clamp100(crownAuthorityOf(p) + 4); p.fear = clamp100(p.fear + 3);
    push(s, "taht", `Elçin boş dönmedi: haraç geldi; adın sınırda ağır anılıyor.`, "kişisel", true, { k: "crown.tributeWin", p: [{ bl: beylikId }, trib] });
    return { state: s, success: true };
  }
  p.crownAuthority = clamp100(crownAuthorityOf(p) - 5); p.reputation = Math.max(-100, p.reputation - 2);
  push(s, "taht", `Haraç talebin geri çevrildi; sınır kahvelerinde gülüşmeler dolaşıyor.`, "kişisel", false, { k: "crown.tributeLose", p: [{ bl: beylikId }] });
  return { state: s, success: false };
}
// Oyuncudan haneye teklif: hanedan ekranını pasiften aktife çevirir. Tur başına tek girişim (diplomasi farm'ı yok).
// Şans tutum + saygınlıkla ölçeklenir; ret tutumu düşürür — teklif spam'ı kendi kendini cezalandırır.
export function proposeToHouse(prev: GameState, houseId: string, type: "ittifak" | "evlilik"): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 16) return s;
  if (p.propose_turn === s.turn) return s; // ayda tek teklif
  if (type === "evlilik" && p.married) return s;
  const h = ensureRivals(s).find((x) => x.id === houseId);
  if (!h) return s;
  if ((s.allied_houses || []).includes(houseId)) return s; // zaten müttefik
  p.propose_turn = s.turn;
  const tutum = h.tutum ?? 0;
  const sans = Math.max(0.05, Math.min(0.9, 0.25 + tutum / 100 + esteem(s) / 60 + (type === "evlilik" ? p.fame / 300 : 0)));
  if (Math.random() < sans) {
    h.tutum = Math.min(100, tutum + (type === "evlilik" ? 40 : 30));
    if (!s.allied_houses) s.allied_houses = [];
    s.allied_houses.push(houseId);
    if (type === "evlilik" && !p.married) {
      const name = p.gender === "erkek" ? rnd(SPOUSE_K) : rnd(SPOUSE_E);
      p.married = true; p.married_turn = s.turn; p.spouse_bond = 40; p.spouse_name = name; p.spouse_seed = Math.floor(Math.random() * 1e9);
      p.reputation = Math.min(100, p.reputation + 8); p.fame = Math.min(100, p.fame + 6);
      push(s, "evlilik", `Dünürcüler ${h.name} kapısından güler yüzle döndü: iki ocak birleşti.`, "kişisel", true, { k: "evj.houseMarryAccept", p: [{ hn: h.nameIdx }, { fn: [p.spouse_seed, p.gender === "erkek" ? "kadın" : "erkek"] }] });
    } else {
      p.reputation = Math.min(100, p.reputation + 5);
      push(s, "hanedan_haber", `${h.name} teklifini kabul etti; iki hane el sıkıştı.`, "makro", true, { k: "evj.houseAllyAccept", p: [{ hn: h.nameIdx }] });
    }
  } else {
    h.tutum = Math.max(-100, tutum - 8);
    p.reputation = Math.max(-100, p.reputation - 2);
    push(s, "hanedan_haber", `${h.name} teklifini geri çevirdi; kapıda soğuk bir rüzgâr esti.`, "kişisel", false, { k: "evj.houseProposeRefused", p: [{ hn: h.nameIdx }] });
  }
  return s;
}

// Hane teklifini geri çevir (tutum biraz düşer).
export function declineDynastyOffer(prev: GameState, offerId: string): GameState {
  const s = clone(prev);
  const offer = (s.dynastyOffers || []).find((o) => o.id === offerId);
  if (!offer) return s;
  s.dynastyOffers = (s.dynastyOffers || []).filter((o) => o.id !== offerId);
  const h = ensureRivals(s).find((x) => x.id === offer.houseId);
  if (h) h.tutum = Math.max(-100, (h.tutum ?? 0) - 8);
  return s;
}
function tickWars(s: GameState, announce: boolean) {
  // Çok oyuncuda ocak savaşları SUNUCUDA yürür → yerel jenerik savaş + cephe ödülleri bastırılır
  // (tickFactions ile tutarlı; "paralel gerçeklik" cephesi açılmasın).
  if (s.mpRealm) { s.wars = []; return; }
  if (!s.wars) s.wars = [];
  // Yeni jenerik savaş (ödülsüz arka plan; en fazla bağımsız 1 tane, %6 şans) — KARAKTERE UYGUN
  if (s.wars.filter((w) => !w.prize).length === 0 && Math.random() < 0.06) {
    const ids = FACTIONS.map((f) => f.id);
    // saldırgan başlatıcı (agresyona göre ağırlıklı; barışçıl şifacı savaş başlatmaz)
    const aw = ids.map((id) => ({ id, w: factionTrait(id).aggression })).filter((x) => x.w > 0.12);
    const at = aw.reduce((acc, x) => acc + x.w, 0);
    let r = Math.random() * at; let a = aw[0].id;
    for (const x of aw) { r -= x.w; if (r <= 0) { a = x.id; break; } }
    // hedef: müttefik değil; mümkünse doğal düşman
    const targets = ids.filter((id) => id !== a && factionStance(a, id) <= 0);
    const enemies = targets.filter((id) => factionStance(a, id) < 0);
    const pool = enemies.length ? enemies : targets;
    if (pool.length) {
      const b = pool[Math.floor(Math.random() * pool.length)];
      if (!onWarCooldown(s, a, b)) {
        s.wars.push({ a, b, turnsLeft: 4 + Math.floor(Math.random() * 4), aScore: 0, bScore: 0 });
        if (announce) push(s, "ocak_savasi", `${factionById(a)?.name} ile ${factionById(b)?.name} arasında savaş çıktı!`, "makro", true, { k: "evj.warGeneric", p: [{ fc: a }, { fc: b }] });
      }
    }
  }
  for (const w of s.wars) {
    w.turnsLeft -= 1;
    // doğal gidişat + müttefik takviyesi (dostu çok olan tarafa fazladan ağırlık)
    const aRein = factionTrait(w.a).allies.length * 0.5;
    const bRein = factionTrait(w.b).allies.length * 0.5;
    w.aScore += Math.floor(Math.random() * 3) + (Math.random() < aRein ? 1 : 0);
    w.bScore += Math.floor(Math.random() * 3) + (Math.random() < bRein ? 1 : 0);
  }
  const ended = s.wars.filter((w) => w.turnsLeft <= 0);
  for (const w of ended) {
    const winner = w.aScore >= w.bScore ? w.a : w.b;
    const wf = factionById(winner);
    // Ödüllü savaşsa kazanan sancağı ele geçirir (emergent şehir-kontrolü).
    if (w.prize) {
      const sn = (s.realm || []).find((r) => r.id === w.prize);
      if (sn) {
        const flipped = sn.holder !== winner;
        sn.holder = winner; sn.contender = null; sn.tension = 20;
        if (announce) push(s, "ocak_savasi", flipped ? `${wf?.name}, ${beylikName(w.prize)}'ni ele geçirdi!` : `${wf?.name}, ${beylikName(w.prize)} üzerindeki hakimiyetini korudu.`, "makro", true, flipped ? { k: "evj.prizeWin", p: [{ fc: winner }, { bl: w.prize }] } : { k: "evj.prizeHold", p: [{ fc: winner }, { bl: w.prize }] });
      }
    } else if (announce) {
      push(s, "ocak_savasi", `Savaş sona erdi: ${wf?.name} üstün geldi.`, "makro", true, { k: "evj.warEnd", p: [{ fc: winner }] });
    }
    // Oyuncu kazanan tarafın üyesiyse itibar
    if (s.player.faction === winner) { s.player.faction_standing[winner] = (s.player.faction_standing[winner] || 0) + 8; s.player.fame = Math.min(100, s.player.fame + 4); }
    setWarCooldown(s, w.a, w.b, 12); // savaş sonrası ~1 yıl ateşkes (sürekli savaş döngüsünü kırar)
  }
  s.wars = s.wars.filter((w) => w.turnsLeft > 0);
}

// Dünya olayları / söylentiler (Vercel world_events.py + rumors.py portu, anlatısal) — makro akış.
const WORLD_NEWS: string[] = [
  "%b'nde voyvoda değişti; halk yeni efendisini tartıyor.",
  "%b ile %b2 arasında sınır anlaşmazlığı büyüyor.",
  "Uzak diyarlardan gelen bir kervan ipek ve baharat getirdi; çarşı canlandı.",
  "%b'nde kuraklık söylentileri dolaşıyor, fiyatlar ürkek.",
  "Bir derviş diyarı dolaşıp kıyamet vaaz ediyor; kimi inanıyor, kimi gülüyor.",
  "%b beyi büyük bir av tertip etti; ileri gelenler davetli.",
  "Sınır boylarında akıncı hareketliliği arttı.",
  "%b pazarında bir vurguncu yakalanıp teşhir edildi.",
  "Güneydeki köylerde hastalık söylentileri tedirginlik yaratıyor.",
  "%b'nde yeni bir han açıldı; yollar daha kalabalık.",
  "Gökte görülen kuyruklu yıldız kötüye yoruluyor.",
  "Bir ozan, %b beyini öven kasidesiyle dilden dile dolaşıyor.",
  "%b'nde ağır vergiler halkı homurdandırıyor.",
  "İki tüccar loncası %b çarşısında rekabete tutuştu.",
  "Yağmurların gecikmesi %b çiftçisini endişelendiriyor.",
  "%b'nden gelen tahıl kervanı yolda soyuldu; pazar tedirgin.",
  "%b'nde genç bir kadı rüşvet çarkını dağıttı; adı dilden dile dolaşıyor.",
  "Gezgin bir hekim %b'nde salgını erken bastırdı; ahali şükran duasında.",
  "Taş ustaları %b'nde yeni bir kervansaraya temel attı; yollar şenlenecek.",
  "%b ile %b2 dünürlükle barıştı; sınır kahveleri bayram yerinde.",
  "%b pazarında bir cambaz ip gerdi; üç gün üç gece kalabalık dağılmadı.",
  "%b'nde eski hamam yeniden açıldı; kubbe yine buhar tutuyor, çarşı keselenmiş geziyor.",
  "%b ile %b2 ortak kervan çıkarıyor; yol vergisi ikiye bölündü, tüccarların yüzü güldü.",
  "%b'nde bir çoban yıldırım düşen çınarın altından sağ çıktı; ahali ermiş diye fısıldaşıyor.",
  "%b'nde genç bir hattat çarşı kapısına öyle bir yazı yazdı ki gelen geçen durup bakıyor; kadı bile hayrına bir kese bıraktı.",
  "%b ile %b2 arasındaki geçitte kar erken eridi; kervanlar bu yıl bir ay erken yola koyuldu.",
  "%b'nde bir kuyumcu çırağı ustasının kayıp yüzüğünü leylek yuvasında buldu; çarşı günlerdir bunu konuşuyor.",
  "%b beyinin kızı çeyizini yetim kızlara dağıttı derler; adı türkü olup %b2 pazarına kadar ulaştı.",
  "%b'nde bir gece göğü kızıl aydınlandı; kimi yangın dedi, kimi kuyruklu yıldız — müneccimler hâlâ tartışıyor.",
  "%b kadısı rüşvet alan mübaşiri meydan taşında teşhir etti; %b2 esnafı bile 'adalet oradaymış' diye söylendi.",
  "%b'nde bu yıl bal öyle bol ki küpler yetmedi; fıçıcılar geceyi gündüze kattı.",
  "%b ile %b2 arasında güvercin postası kuruldu derler; mektup üç günde değil üç saatte uçuyormuş.",
  "Gökte kuyruklu bir yıldız belirdi; %b müneccimleri hayır, %b2 hocaları şer diyor — halk ikisini de dinliyor.",
  "%b ile %b2, sınır ırmağına ortak köprü kuruyor; iki beyin ustaları aynı iskelede çalışıyor.",
  "%b meydanındaki üç yüz yıllık çınar gece devrildi; kütüğünden yüz yıllık nal, ok ucu ve bir nişan yüzüğü çıktı.",
  "%b yaylasında çobanlar bir gece gökte iki ay gördüklerine yemin ediyor; %b2 müneccimi buna göl aynası dedi, çobanlar inanmadı.",
  "%b bedesteninde bir dokumacı, bakan gözle deseni değişen bir halı dokudu derler; %b2 beyi görücü gönderdi, halı satılık değilmiş.",
  "%b yolundaki menzil taşları bir gecede yenilendi; taşçıyı gören yok, %b2 kervancıları yollar kısaldı diye söyleniyor.",
  "%b köprüsünün ortasında bir bebek doğdu; iki beylik de 'bizim toprakta doğdu' diye tatlı bir çekişmede — %b2 beyi beşik yolladı bile.",
  "%b ile %b2 kâtipleri ortak bir kervan sözlüğü yazıyor: kırk dilin pazarlık sözü tek deftere iniyor.",
  "%b kalesinin burcuna bir çift şahin yuva yaptı; bekçiler kuşları saymadan nöbet devri yapmıyor.",
  "%b külhanında közlenen kestanenin kokusu %b2 pazarında anılıyor; külhancı 'tarif mezara gelir benimle' diyor.",
];
function worldNews(s: GameState) {
  const i1 = Math.floor(Math.random() * BEYLIKS.length);
  let i2 = Math.floor(Math.random() * BEYLIKS.length); if (i2 === i1) i2 = (i1 + 1) % BEYLIKS.length;
  const b1 = BEYLIKS[i1], b2 = BEYLIKS[i2];
  const ni = Math.floor(Math.random() * WORLD_NEWS.length);
  const line = WORLD_NEWS[ni].replace("%b2", b2.name).replace("%b", b1.name);
  push(s, "dunya", line, "makro", false, { k: "wnews." + ni, p: [{ bl: b1.id }, { bl: b2.id }] });
}

// Ekonomi: piyasa zamanla dengeye döner; ara sıra kıtlık/bolluk şoku.
function tickEconomy(s: GameState, announce: boolean) {
  if (s.econ === undefined) s.econ = 1;
  // Oyuncunun alış-satış baskısı zamanla normale döner (piyasa kendini toparlar).
  if (s.world?.mkt) { for (const k in s.world.mkt) { s.world.mkt[k] *= 0.82; if (Math.abs(s.world.mkt[k]) < 0.02) delete s.world.mkt[k]; } }
  // dengeye dön
  s.econ += (1 - s.econ) * 0.25;
  if (Math.random() < 0.08) {
    if (Math.random() < 0.5) { s.econ = Math.min(1.5, s.econ + 0.22); if (announce) push(s, "piyasa", "Kıtlık baş gösterdi; pazarda fiyatlar fırladı.", "makro", false, { k: "evj.scarcity" }); }
    else { s.econ = Math.max(0.7, s.econ - 0.18); if (announce) push(s, "piyasa", "Bereketli hasat; pazarda fiyatlar düştü.", "makro", false, { k: "evj.abundance" }); }
  }
  s.econ = Math.round(s.econ * 100) / 100;
  // Gerçek enflasyon–deflasyon döngüsü (dünya tabanlı, oyuncudan bağımsız): sikkenin değeri iki yönlü oynar.
  // Savaş + kıtlık → enflasyon (yukarı). Uzun barış + bolluk → deflasyon (aşağı, nakit değer kazanır).
  // Nadiren gümüş/sikke kıtlığı belirgin deflasyon getirir. Hafif tağşiş tabanı uzun vadede yukarı eğilimli.
  if (s.turn > 0 && s.turn % 12 === 0 && s.world) {
    let inf = s.world.inflation || 1;
    let drift = 0.002 + Math.random() * 0.004;               // hafif tağşiş tabanı (~%0.2–0.6)
    const wars = (s.wars?.length || 0);
    if (wars > 0) drift += 0.006 * Math.min(3, wars);        // savaş finansmanı → enflasyon
    else drift -= 0.005;                                      // barış yılı → fiyatlar gevşer (deflasyon baskısı)
    if (s.econ < 0.85) drift -= 0.005;                        // bolluk/bereket → deflasyon
    else if (s.econ > 1.2) drift += 0.004;                    // kıtlık → enflasyon
    if (Math.random() < 0.025) drift -= 0.018;               // nadir gümüş/sikke kıtlığı → belirgin deflasyon
    inf = Math.max(0.8, Math.min(2.5, inf * (1 + drift)));
    s.world.inflation = Math.round(inf * 1000) / 1000;
    if (announce && Math.random() < 0.3) {
      if (s.world.inflation > 1.15) push(s, "piyasa", `Diyarda hayat pahalılığı arttı; sikke eski değerinde değil (enflasyon %${Math.round((s.world.inflation - 1) * 100)}).`, "makro", false, { k: "evj.inflation", p: [Math.round((s.world.inflation - 1) * 100)] });
      else if (s.world.inflation < 0.92) push(s, "piyasa", `Fiyatlar geneline düştü; sikke değer kazandı (deflasyon %${Math.round((1 - s.world.inflation) * 100)}).`, "makro", false, { k: "evj.deflation", p: [Math.round((1 - s.world.inflation) * 100)] });
    }
  }
  // Geçici piyasa olayı: süresi dolanı kapat, ara sıra yenisini başlat
  if (s.marketEvent && s.marketEvent.until <= s.turn) s.marketEvent = null;
  if (!s.marketEvent && Math.random() < 0.07) {
    const ev = MARKET_EVENTS[Math.floor(Math.random() * MARKET_EVENTS.length)];
    s.marketEvent = { goods: ev.goods, mult: ev.mult, until: s.turn + ev.months, key: ev.key };
    if (announce) push(s, "piyasa", ev.text, "makro", false, { k: "mev." + ev.key });
    // Hasat olayı mülke uğrar: bağ bozumu bağ sahibine, bereketli kırkım tarla sahibine tek seferlik pay bırakır.
    if (announce && !s.player.dead) {
      const harvestProp: Record<string, string> = { bagbozumu: "bag", kirkimzamani: "tarla", bolluk: "tarla" };
      const pt = harvestProp[ev.key];
      if (pt) {
        const owned = s.player.properties.filter((pr) => pr.type === pt).length;
        if (owned > 0) {
          const pay = Math.round(owned * 18 * inflationFactor(s));
          s.player.money += pay;
          push(s, "piyasa", `Hasat olayı senin ${owned} mülküne de uğradı; pay keseye düştü (+${pay} akçe).`, "kişisel", false, { k: "evj.harvestShare", p: [owned, pay] });
        }
      }
    }
  }
}

// Kervan saldırı şansı (Vercel caravan._attack_chance portu): taban %12,
// itibar/savaş/ticaret becerisi/korku ile değişir, %3–40 arası kıstırılır.
function caravanAttackChance(s: GameState): number {
  const p = s.player;
  let c = 0.12;
  if (p.reputation > 60) c -= 0.04;
  if (p.reputation > 80) c -= 0.03;
  if (p.skills.trade >= 4) c -= 0.03;
  if (p.skills.trade >= 8) c -= 0.03;
  if (p.fear > 50) c -= 0.03;            // korkulan biri daha az gözü kara saldırı çeker
  c -= (p.retinue || 0) * 0.02;          // maiyet kılıçları kervanla yürür — eşkıya iştahı kırılır
  if (s.wars.some((w) => w.turnsLeft > 0)) c += 0.08; // diyar savaştaysa yollar tehlikeli
  return Math.max(0.03, Math.min(0.4, c));
}
// Saldırı kaybı oranı (Vercel caravan._attack_outcome portu): savunma = güç×0.4 + dövüş×0.6.
function caravanLossPct(s: GameState): number {
  const p = s.player;
  const def = p.stats.strength * 0.4 + p.skills.combat * 0.6 + (p.retinue || 0) * 1.5; // maiyet yağmada omuz verir
  if (def >= 12) return 0.10 + Math.random() * 0.20;  // direndin, az kaybettin
  if (def >= 6) return 0.30 + Math.random() * 0.30;   // yarısı gitti
  return 0.55 + Math.random() * 0.35;                  // güçsüz kaldın, çoğu gitti
}
// Kervanı her ay bir konak ilerlet; yolda saldırı riski, varışta kâr (Vercel process_caravan_tick portu).
function tickCaravan(s: GameState) {
  const c = s.caravan; if (!c) return;
  const p = s.player;
  // Eski kayıt göçü: çok-adımlı rota yoksa basit iki-konaklı rota kur.
  if (!c.route) { c.route = [p.location_name, c.dest]; c.step = 0; c.lost = 0; }
  const route = c.route; const last = route.length - 1;
  c.step = Math.min((c.step ?? 0) + 1, last);
  // Konaklarda saldırı kontrolü — varış menzili de tekin değildir (son ayakta yarı ihtimalle pusu; "son ayak hep güvenli" garantisi kaldırıldı).
  if (Math.random() < caravanAttackChance(s) * (c.step < last ? 1 : 0.5)) {
    const lost = Math.round(c.invested * caravanLossPct(s));
    c.invested -= lost; c.lost = (c.lost ?? 0) + lost;
    { const rv2 = chance(0.5); push(s, "kervan", rv2 ? `Gece konağında oklar uçtu; ${route[c.step]} yakınında yükün bir kısmı eşkıyaya kaldı (${lost} akçe). Sürücüler sağ — mal gider, can kalır.` : `Kervan ${route[c.step]} yakınında eşkıyaya uğradı! ${lost} akçelik mal yağmalandı.`, "kişisel", true, { k: rv2 ? "evj.carRaid2" : "evj.carRaid", p: [{ pl: route[c.step] }, lost] }); }
    if (c.invested <= 0) {
      push(s, "kervan", "Kervan tümüyle yağmalandı; elde bir şey kalmadı.", "kişisel", true, { k: "evj.carLost" });
      s.caravan = null;
      return;
    }
  }
  if (c.step < last) {
    // Konak molası: yağmasız ayda ara sıra yolun sesi duyulur (salt anlatı — kâr/risk değişmez).
    if (Math.random() < 0.3) {
      const CAR_STOP_TR = [
        `Kervan ${route[c.step]} konağında geceledi; develer çöktü, ateş yandı — yol yarın yine yol.`,
        `${route[c.step]} konağında yükler elden geçti; bir urgan tazelendi, bir nal çakıldı.`,
        `${route[c.step]} hanında kervancılar haber tokuşturdu; senin yükün de dilden dile bir selam taşıdı.`,
      ];
      const vi = Math.floor(Math.random() * 3);
      push(s, "kervan", CAR_STOP_TR[vi], "kişisel", false, { k: "evj.carStop" + (vi ? String(vi + 1) : ""), p: [{ pl: route[c.step] }] });
    }
    return; // hâlâ yolda
  }
  // Varış: hayatta kalan sermaye üzerinden kâr çöz — fiyat farkı (arbitraj) kârı belirler.
  // spread = malın hedefteki/çıkıştaki fiyat endeksi (1 = fark yok, >1 kârlı, <1 zarar). Eski kayıt: spread yoksa 1.
  const spread = c.spread ?? (c.good ? cityGoodPriceIndex(s, c.dest, c.good) / Math.max(0.5, cityGoodPriceIndex(s, route[0], c.good)) : 1.2);
  // PAZAR DOYGUNLUĞU: büyük yük hedef pazarı doyurur — fiyat farkı sermaye büyüdükçe erir.
  // Küçük kervan (300-2000) tam arbitrajı yer; 20k+ yük farkın ancak kırıntısını görür. Böylece kervan
  // "bileşik faizli hazine" olmaktan çıkar, işçilikle rekabet eden ölçekli bir ticaret kalır.
  const satCap = 2500 * inflationFactor(s);
  const effSpread = 1 + (spread - 1) * (satCap / (satCap + c.invested));
  // Taban ~0.92: fiyat farkı yoksa kervan masrafına çalışır (arbitraj yok = kâr yok). Ticaret becerisi
  // yalnız arbitraj dilimini büyütür — doymuş pazarda usta tüccar bile ancak başabaş çıkar.
  const mult = Math.max(0.4, 0.92 + 0.5 * (effSpread - 1) * (1 + p.skills.trade * 0.05) + (Math.random() * 0.2 - 0.05));
  const ret = Math.round(c.invested * mult);
  p.money += ret; gainSkill(s, "trade", 10);
  if (c.good) addTradePressure(s, c.dest, c.good, -Math.min(0.20, c.invested / 20000)); // getirdiğin mal hedefte arzı bollaştırır (kalıcı iz, sönümlü)
  const paid = c.invested + (c.lost ?? 0); const net = ret - paid; // gerçek kâr/zarar (yağma dahil)
  if (net > 200) p.reputation = Math.min(100, p.reputation + 2); // büyük kâr nam getirir
  const carried = c.good ? { i: c.good } : { i: "bugday" };
  push(s, "kervan", `${c.dest} kervanın vardı: ${paid} akçe yatırmıştın, ${ret} akçe döndü (net ${net >= 0 ? "+" : ""}${net}).`, "kişisel", true, { k: "evj.carArrive2", p: [{ pl: c.dest }, paid, ret, (net >= 0 ? "+" : "") + net, carried] });
  s.caravan = null;
}
// Bir malın bir şehirdeki yapısal fiyat endeksi (arz-talep; ~0.65 bol/ucuz .. 1.6 kıt/pahalı). Oyuncu baskısı hariç.
function cityGoodPriceIndex(s: GameState, loc: string, good: string): number {
  return supplyDemandMult(s, loc, good);
}
// En kârlı kervan rotası: bir malı ucuz olduğu (bol) şehirden alıp pahalı olduğu (kıt) şehirde satmak.
// Şehirler-arası gerçek fiyat farkını tarar; çıkışta bol + hedefte kıt olan malı/şehri seçer.
function bestCaravanRoute(s: GameState, origin: string): { dest: string; good: string; spread: number } | null {
  const goods = Object.keys(GOOD_PRODUCERS);
  const oIdx: Record<string, number> = {};
  for (const g of goods) oIdx[g] = Math.max(0.5, cityGoodPriceIndex(s, origin, g)); // çıkış fiyatı (ucuza al)
  let best: { dest: string; good: string; spread: number } | null = null;
  for (const dest of LOCATIONS) {
    if (dest === origin) continue;
    for (const g of goods) {
      const spread = cityGoodPriceIndex(s, dest, g) / oIdx[g]; // hedefte pahalı / çıkışta ucuz
      if (!best || spread > best.spread) best = { dest, good: g, spread };
    }
  }
  return best;
}
// Kervan gönder: en kârlı şehirler-arası rotayı bul, çok konaklı yol kur, her ay bir konak ilerlesin.
export function launchCaravan(prev: GameState, amount: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || inJail(p) || s.caravan || amount <= 0 || p.money < amount) return s; // hücreden kervan donatılmaz
  const origin = p.location_name;
  const others = LOCATIONS.filter((l) => l !== origin);
  if (others.length === 0) return s;
  // Arbitraj: en iyi fiyat farkını veren mal+hedef. Bulunamazsa rastgele hedef (emniyet).
  const arb = bestCaravanRoute(s, origin);
  const dest = arb ? arb.dest : others[Math.floor(Math.random() * others.length)];
  // 1-2 ara konak (origin ve hedef hariç).
  const pool = others.filter((l) => l !== dest);
  const nwp = Math.min(pool.length, 1 + (Math.random() < 0.5 ? 1 : 0));
  const waypoints: string[] = [];
  for (let i = 0; i < nwp; i++) waypoints.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  const route = [origin, ...waypoints, dest];
  p.money -= amount;
  s.caravan = { invested: amount, dest, route, step: 0, lost: 0, good: arb?.good, spread: arb?.spread };
  const carried = arb ? { i: arb.good } : { i: "bugday" };
  push(s, "kervan", `${amount} akçelik kervan yola çıktı: ${route.join(" → ")}. ${route.length - 1} konak sürecek.`, "kişisel", false, { k: "evj.carLaunch", p: [amount, { route }, route.length - 1, carried] });
  if ((p.retinue || 0) > 0) push(s, "maiyet", `Maiyetinden ${p.retinue} kılıç kervanla yola düştü; eşkıya iki kez düşünecek.`, "kişisel", false, { k: "evj.carGuarded", p: [p.retinue || 0] });
  return s;
}

// Oyuncunun loncasının dahil olduğu aktif savaş (varsa).
export function playerWar(s: GameState): FactionWar | null {
  if (!s.player.faction) return null;
  return s.wars.find((w) => w.a === s.player.faction || w.b === s.player.faction) || null;
}
// Cepheye git: loncan için savaş — risk/ödül, savaş skoruna katkı.
export function supportWar(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  const w = playerWar(s); if (!w || p.dead || p.age < 13 || inJail(p)) return s; // hücreden cepheye gidilmez
  // Tur başına tek cephe çıkışı — yoksa aynı turda üst üste ganimet/itibar farm'lanır.
  if (p.war_support_turn === s.turn) { push(s, "ocak_savasi", `Bu ay cephede yeterince savaştın; biraz soluklan.`, "kişisel", false, { k: "evj.frontWait" }); return s; }
  p.war_support_turn = s.turn;
  const mine = w.a === p.faction ? "a" : "b";
  const pw = combatPower(p);
  const win = Math.random() < Math.max(0.2, Math.min(0.9, 0.4 + pw * 0.02));
  gainSkill(s, "combat", 8);
  addStatXp(s, "strength", 3); // cephe tecrübesi gücü geliştirir
  if (win) {
    if (mine === "a") w.aScore += 3; else w.bScore += 3;
    const loot = 20 + Math.floor(Math.random() * 25);
    p.money += loot; p.fame = Math.min(100, p.fame + 4); p.faction_standing[p.faction!] = (p.faction_standing[p.faction!] || 0) + 6;
    bumpNam(p, "mert", 4);
    p.health = Math.max(1, p.health - (8 - Math.min(6, Math.round(armorDefense(p) / 2))));
    push(s, "ocak_savasi", `Cephede loncan için savaştın ve üstün geldin (+${loot} akçe, itibar).`, "kişisel", true, { k: "evj.frontWin", p: [loot] });
  } else {
    const hurt = 14 + Math.floor(Math.random() * 12) - armorDefense(p);
    p.health = Math.max(0, p.health - Math.max(4, hurt));
    push(s, "ocak_savasi", `Cephede ağır bir gün; yaralandın.`, "kişisel", false, { k: "evj.frontLose" });
    if (p.health <= 0) die(s, `${p.name}, ocak savaşında şehit düştü.`, { k: "evj.dieWar", p: [p.name] });
  }
  return s;
}

const TITLE_MULT = [1, 1.4, 1.9, 2.4];
// Çalışma stilleri (Vercel work_rework.py portu): risk/ödül dengesi.
export type WorkStyle = "garantici" | "normal" | "hirsli" | "kaytarici";
export const WORK_STYLES: { id: WorkStyle; mult: number; fail: number }[] = [
  { id: "garantici", mult: 0.8, fail: 0.0 },
  { id: "normal",    mult: 1.0, fail: 0.0 },
  { id: "hirsli",    mult: 1.4, fail: 0.15 },
  { id: "kaytarici", mult: 0.4, fail: 0.20 },
];
export function canWork(s: GameState): boolean {
  if (inJail(s.player)) return false; // zindanda tezgâh yok
  const p = s.player;
  return !p.dead && p.age >= 13 && p.profession !== "işsiz" && p.work_turn !== s.turn;
}
export function work(prev: GameState, style: WorkStyle = "normal"): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || p.profession === "işsiz") return s;
  if (p.work_turn === s.turn) return s; // bu ay zaten çalıştın → tur başına tek maaşlı iş (farm önlenir)
  p.work_turn = s.turn;
  const ws = WORK_STYLES.find((w) => w.id === style) || WORK_STYLES[1];
  const pr = professionById(p.profession);
  const stat = effStat(p, PROF_STAT[p.profession] || "stamina");
  let mult = 1;
  if (p.faction === "demirci") mult += 0.2;
  if (hasPerk(p, "tefeci")) mult += 0.2;
  if (hasPerk(p, "becerikli")) mult += 0.15;
  if (hasPerk(p, "usta_eli")) mult += 0.2;
  if (hasPerk(p, "basyapit")) mult += 0.25;
  const tierBefore = pr ? careerTier(pr, p.career_xp) : 0;
  const titleMult = TITLE_MULT[tierBefore] || 1;
  const base = pr ? pr.base : 4;
  let earn = Math.round((base + stat * 2 + Math.floor(Math.random() * 6)) * mult * titleMult * ws.mult * inflationFactor(s));
  p.career_xp += 1;
  gainSkill(s, PROF_SKILL[p.profession] || "crafting", 8);
  addStatXp(s, PROF_STAT[p.profession] || "stamina", 4); // meslek özelliğin işle gelişir
  p.hunger = Math.max(0, p.hunger - (style === "kaytarici" ? 3 : 6));
  // Risk: hırslı bedenini yorar, kaytarıcı yakalanabilir
  const failed = ws.fail > 0 && Math.random() < ws.fail;
  if (failed) {
    earn = Math.round(earn * 0.3);
    if (style === "hirsli") { const hurt = 4 + Math.floor(Math.random() * 6); p.health = Math.max(0, p.health - hurt); p.money += earn; push(s, "çalışma", `Hırslı çalışırken sakatlandın (−${hurt} sağlık); kazanç düştü (${earn} akçe).`, "kişisel", false, { k: "evj.workHurt", p: [hurt, earn] }); }
    else { p.reputation = Math.max(-100, p.reputation - 2); p.money += earn; push(s, "çalışma", `Kaytarırken yakalandın; itibarın sarsıldı, az kazandın (${earn} akçe).`, "kişisel", false, { k: "evj.workSlack", p: [earn] }); }
  } else {
    p.money += earn;
    if (style === "kaytarici") p.health = Math.min(100, p.health + 2);
    { const wv2 = chance(0.5); push(s, "çalışma", wv2 ? `${careerTitle(p.profession, p.career_xp - 1)} olarak ter döktün; ay sonunda avucunda ${earn} akçe vardı.` : `${careerTitle(p.profession, p.career_xp - 1)} olarak çalıştın, ${earn} akçe kazandın.`, "kişisel", false, { k: wv2 ? "evj.work2" : "evj.work", p: [{ c: [p.profession, p.career_xp - 1] }, earn] }); }
  }
  if (pr) {
    const after = careerTier(pr, p.career_xp);
    if (after > tierBefore) {
      push(s, "terfi", `Yükseldin: artık ${pr.tiers[after]}!`, "kişisel", true, { k: "evj.promote", p: [{ c: [p.profession, p.career_xp] }] });
      // Zirveye İLK varış: mesleğin taçlanma anı — meslek başına ömürde bir kez (farm yok: kariyer sıfırlanıp yeniden tırmanılsa da tekrar düşmez).
      if (after === pr.tiers.length - 1 && !(p.capstones || []).includes(p.profession)) {
        (p.capstones = p.capstones || []).push(p.profession);
        p.fame = Math.min(100, p.fame + 6); p.honor = Math.min(100, p.honor + 4);
        const odul = Math.round(60 * inflationFactor(s)); p.money += odul;
        push(s, "terfi", `Mesleğinin zirvesine vardın: ${pr.tiers[after]} olarak adın diyarda anılıyor; lonca şerefine bir kese açtı (+${odul} akçe).`, "kişisel", true, { k: "evj.capstone", p: [{ c: [p.profession, p.career_xp] }, odul] });
      }
    }
  }
  if (!failed && chance(0.3)) rollWorkEvent(s);                 // %30 meslek mini-olayı
  return s;
}

// ── Meslek mini-olayları (Vercel work_rework.py portu) — stat testli, otomatik çözümlü ──
interface WorkEvent { text: string; stat: keyof Stats; win: string; lose: string; wMoney?: number; wHealth?: number; wRep?: number; lHealth?: number; lRep?: number; skill?: SkillKey; }
const WORK_EVENTS: Record<string, WorkEvent[]> = {
  demirci:  [{ text: "Çetin bir sipariş", stat: "strength", win: "Zorlu siparişi ustaca bitirdin", lose: "Örste elin ezildi", wMoney: 18, lHealth: 5, skill: "crafting" }, { text: "Kervan nalları", stat: "stamina", win: "Şafağa dek çekiç salladın, kervanı yola verdin", lose: "Körük patladı, ocak söndü", wMoney: 16, lHealth: 4, skill: "crafting" }, { text: "Bey konağından sipariş", stat: "intelligence", win: "Kılıç su gibi dengeli çıktı, adın konakta anıldı", lose: "Çelik suyu tutmadı", wMoney: 22, wRep: 2, lRep: 1, skill: "crafting" }, { text: "Kırık saban demiri", stat: "intelligence", win: "Demiri dövmeden lehimledin; çiftçi hayretle baktı", lose: "Demir ikinci kez çatladı", wMoney: 14, wRep: 2, lRep: 1, skill: "crafting" }, { text: "Kilidi tutulan kapı", stat: "intelligence", win: "Paslı kilidi kırmadan açtın; kervansaray bekçisi hayretle baktı", lose: "Kilit direndi, maşa elinden fırladı", wMoney: 18, wRep: 2, lHealth: 2, skill: "crafting" }],
  tüccar:   [{ text: "Kurnaz bir müşteri", stat: "charisma", win: "Müşteriyi ikna ettin, kârlı sattın", lose: "Müşteri seni dolandırdı", wMoney: 25, lRep: 2, skill: "trade" }, { text: "Kıtlık söylentisi", stat: "intelligence", win: "Malı ucuzken kapattın, pahalıya sattın", lose: "Söylenti boş çıktı, mal elinde kaldı", wMoney: 30, lRep: 1, skill: "trade" }, { text: "Yabancı bir kervan", stat: "charisma", win: "Kervanbaşıyla dostluk kurdun, ilk seçim senin oldu", lose: "Pazarlık kızıştı, eli boş döndün", wMoney: 20, wRep: 2, lRep: 1, skill: "trade" }, { text: "Islanan mal balyası", stat: "charisma", win: "Islak kumaşı 'nadide soluk boya' diye sattın", lose: "Balyayı zararına elden çıkardın", wMoney: 22, lRep: 1, skill: "trade" }, { text: "Tartıda hile iddiası", stat: "charisma", win: "Kadı önünde teraziyi kendin denetlettin; adın dürüstlüğe çıktı", lose: "Şüphe dağılmadı, o gün tezgâh boş kaldı", wMoney: 20, wRep: 3, lRep: 2, skill: "trade" }],
  çiftçi:   [{ text: "Hava kapanıyor", stat: "stamina", win: "Hasadı vaktinde topladın", lose: "Yağmur ürünü vurdu", wMoney: 15, lHealth: 3 }, { text: "Komşunun öküzü", stat: "charisma", win: "Öküzü ödünç aldın, tarlayı erken sürdün", lose: "Komşuyla ağız dalaşına tutuştun", wMoney: 14, wRep: 1, lRep: 2 }, { text: "Ambarda fareler", stat: "intelligence", win: "Zahireyi vaktinde kurtardın", lose: "Kışlık zahire delik deşik oldu", wMoney: 12, lHealth: 2 }, { text: "Kaçak keçi sürüsü", stat: "charisma", win: "Keçileri tarladan tatlılıkla çıkardın; sahibi bir tulum peynir bıraktı", lose: "Keçiler fideleri yedi bitirdi", wMoney: 12, lHealth: 2 }, { text: "Kanal nöbeti", stat: "stamina", win: "Sıra sana gelmeden bendi onardın; tarlan suyu ilk aldı", lose: "Bel çamura saplandı, gün boşa geçti", wMoney: 14, wRep: 2, lHealth: 3 }],
  avcı:     [{ text: "İz süren bir av", stat: "strength", win: "Büyük bir av düşürdün", lose: "Av elinden kaçtı, yoruldun", wMoney: 20, lHealth: 4, skill: "combat" }, { text: "Kar üstünde izler", stat: "intelligence", win: "Tuzağı ustaca kurdun, post dolu döndün", lose: "Tuzağın boş kaldı, ayazda donup kaldın", wMoney: 22, lHealth: 3, skill: "combat" }, { text: "Yaralı bir geyik", stat: "stamina", win: "Gün boyu iz sürüp avı düşürdün", lose: "Sarp yamaçta ayağın burkuldu", wMoney: 18, lHealth: 5 }, { text: "Bal arayan ayı", stat: "intelligence", win: "Ayıyı gürültüyle ürküttün, kovanlar kurtuldu; köylü balla ödedi", lose: "Ayı seni ağaca çıkardı; gün ziyan oldu", wMoney: 20, wRep: 2, lHealth: 3 }, { text: "Boş kalan tuzak hattı", stat: "intelligence", win: "İzleri okuyup hattı dere ağzına taşıdın; akşama iki tilki postu", lose: "Tuzaklar yine boş; ayazda dişlerin takırdadı", wMoney: 18, lHealth: 3, skill: "combat" }],
  asker:    [{ text: "Ani bir devriye", stat: "strength", win: "Devriyede yararlık gösterdin", lose: "Çatışmada sıyrık aldın", wMoney: 16, wRep: 2, lHealth: 6, skill: "combat" }, { text: "Gece nöbeti", stat: "stamina", win: "Hırsızları fark edip bastırdın", lose: "Nöbette uyuyakaldın", wMoney: 14, wRep: 3, lRep: 3, skill: "combat" }, { text: "Talim meydanı", stat: "strength", win: "Er meydanında herkesi yere serdin", lose: "Talimde omzun zedelendi", wMoney: 12, wRep: 2, lHealth: 5, skill: "combat" }, { text: "Kaçan mahkûm", stat: "intelligence", win: "İzi değirmende buldun; mahkûm kaçamadan yakalandı", lose: "İz soğudu, azar yedin", wMoney: 15, wRep: 3, lRep: 2, skill: "combat" }, { text: "Kaçakçı söylentisi", stat: "intelligence", win: "Pusuyu geçitte kurdun; kaçakçılar mallarıyla yakalandı", lose: "İhbar asılsız çıktı, gece boşa nöbetle geçti", wMoney: 18, wRep: 2, lHealth: 2, skill: "combat" }],
  şifacı:   [{ text: "Ağır bir hasta", stat: "intelligence", win: "Hastayı iyileştirdin, dualar aldın", lose: "Hastayı kurtaramadın", wMoney: 22, wRep: 3, lRep: 3 }, { text: "Dağdan ot toplama", stat: "stamina", win: "Nadide kökler buldun, ilaçların güçlendi", lose: "Yanlış otu kaynattın, kendin hastalandın", wMoney: 18, lHealth: 4 }, { text: "Salgın korkusu", stat: "charisma", win: "Halkı yatıştırıp tedbir aldırdın", lose: "Halk paniğe kapıldı, seni suçladılar", wMoney: 16, wRep: 4, lRep: 3 }, { text: "İki hasta, tek ilaç", stat: "intelligence", win: "İlacı bölüştürüp ikisini de ayağa kaldırdın", lose: "Karar gece boyu uykunu kaçırdı", wMoney: 18, wRep: 4, lHealth: 2 }, { text: "Kırık kolla gelen çırak", stat: "intelligence", win: "Kemiği ilk denemede oturttun; ustası bir kese bal bıraktı", lose: "Çırak acıdan bayıldı, elin titredi", wMoney: 18, wRep: 2, lRep: 1 }],
  müzisyen: [{ text: "Bir düğün daveti", stat: "charisma", win: "Sazınla meclisi coşturdun", lose: "Telin koptu, mahcup oldun", wMoney: 18, wRep: 2, lRep: 1, skill: "social" }, { text: "Bey meclisine davet", stat: "intelligence", win: "Eski bir destanı ustaca okudun, keseler açıldı", lose: "Nağmeyi şaşırdın, meclis soğudu", wMoney: 26, wRep: 2, lRep: 2, skill: "social" }, { text: "Pazar meydanı", stat: "stamina", win: "Gün boyu çaldın, kesen doldu", lose: "Sesin kısıldı", wMoney: 14, lHealth: 2 }, { text: "Ağıt isteği", stat: "charisma", win: "Ağıdın yürekleri dağladı; hane seni duayla uğurladı", lose: "Sesin titredi, ağıt yarım kaldı", wMoney: 16, wRep: 3, lRep: 2, skill: "social" }, { text: "Sağır dedenin türküsü", stat: "charisma", win: "İhtiyarın gençlik türküsünü bulup çaldın; gözleri doldu, kese açıldı", lose: "Nağmeyi tutturamadın; ihtiyar dalgın dalgın baktı", wMoney: 16, wRep: 2, lRep: 1, skill: "social" }],
  hancı:    [{ text: "Kalabalık bir gece", stat: "charisma", win: "Hanı tıka basa doldurdun", lose: "Sarhoş kavgası çıktı", wMoney: 20, lRep: 2 }, { text: "Soylu bir konuk", stat: "charisma", win: "Ağırlamandan memnun kaldı, adını her yerde övdü", lose: "Şarap ekşi çıktı, konuk küstü", wMoney: 24, wRep: 3, lRep: 3 }, { text: "Kiler sayımı", stat: "intelligence", win: "Hileyi yakaladın, kileri düzene soktun", lose: "Aşçı seni atlatmış, kiler yarı boş", wMoney: 16, lRep: 1 }, { text: "Karda kalan kervan", stat: "stamina", win: "Gece yarısı kervana kapı açtın; hanın adı yollarda destan oldu", lose: "Odunluk boş çıktı, konuklar üşüdü", wMoney: 26, wRep: 2, lRep: 2 }, { text: "İki kavgalı kervancı", stat: "charisma", win: "Sofraları ayırıp arayı buldun; ikisi de bahşişi katladı", lose: "Kavga avluya taştı; testiler kırıldı", wMoney: 18, lRep: 2 }],
  kuyumcu:  [{ text: "Nazik bir takı işi", stat: "intelligence", win: "İnce işçiliğin takdir topladı", lose: "Taşı çatlattın", wMoney: 28, lHealth: 0, skill: "crafting" }, { text: "Gümüş kakma", stat: "stamina", win: "Gece boyu işledin, bilezik göz kamaştırdı", lose: "Gözlerin karardı, işi bozdun", wMoney: 24, lHealth: 3, skill: "crafting" }, { text: "Sahte taş şüphesi", stat: "intelligence", win: "Sahteyi tek bakışta ayırdın, itibarın arttı", lose: "Sahte taşı gerçek diye aldın", wMoney: 18, wRep: 3, lRep: 2 }, { text: "Nişan yüzüğü acelesi", stat: "charisma", win: "Yüzüğü düğün sabahına yetiştirdin; iki aile kapına dua bıraktı", lose: "Ölçü dar geldi, yüzük geri döndü", wMoney: 22, wRep: 2, lRep: 1, skill: "crafting" }, { text: "Eski bir mühür tamiri", stat: "intelligence", win: "Silinen nakşı aslına sadık işledin; sahibi iki kat ödedi", lose: "İnce uç kaydı, nakış bozuldu", wMoney: 24, wRep: 2, lRep: 1, skill: "crafting" }],
  balıkçı:  [{ text: "Fırtınalı bir deniz", stat: "stamina", win: "Ağları dolu çektin", lose: "Dalga teknene vurdu", wMoney: 16, lHealth: 4, skill: "trade" }, { text: "Ağ örme günü", stat: "intelligence", win: "Ağları sağlam ördün, ertesi gün bereket yağdı", lose: "İplik çürük çıktı", wMoney: 14, lHealth: 1, skill: "trade" }, { text: "Uzak koylara sefer", stat: "stamina", win: "Kimsenin bilmediği koyda balık sürüsü buldun", lose: "Akıntı seni açığa sürükledi", wMoney: 24, lHealth: 5 }, { text: "Yunus sürüsü", stat: "intelligence", win: "Yunusların önüne kattığı sürüyü ağına yönlendirdin", lose: "Ağ yarıldı; günü yamayla geçirdin", wMoney: 22, lHealth: 1, skill: "trade" }, { text: "Gece feneriyle avlanma", stat: "stamina", win: "Fener ışığına gelen sürüyü ağla kuşattın; kıyı sepet sepet balık", lose: "Rüzgâr feneri söndürdü; karanlıkta ağ dolaştı", wMoney: 18, lHealth: 2, skill: "trade" }],
  marangoz: [{ text: "İnce bir doğrama işi", stat: "intelligence", win: "Kusursuz bir dolap çıkardın", lose: "Tahta çatladı", wMoney: 18, lHealth: 2, skill: "crafting" }, { text: "Cami kapısı siparişi", stat: "intelligence", win: "Oyman görenleri hayran bıraktı", lose: "Keski kaydı, elini kesti", wMoney: 24, wRep: 2, lHealth: 4, skill: "crafting" }, { text: "Kereste pazarlığı", stat: "charisma", win: "Kerestecilerle iyi anlaştın, malı ucuza kapattın", lose: "Çürük kereste yutturdular", wMoney: 16, lRep: 1, skill: "trade" }, { text: "Gıcırdayan köprü", stat: "intelligence", win: "Çürüyen kirişi herkesten önce fark edip değiştirdin; muhtar teşekküre geldi", lose: "Kiriş sökülürken elini sıkıştırdın", wMoney: 20, wRep: 3, lHealth: 3, skill: "crafting" }, { text: "Yağmur yiyen çatı", stat: "stamina", win: "Fırtınadan önce kirişleri değiştirdin; ev kuru kaldı, ev sahibi keseyi açtı", lose: "Kalas kaydı, dizini vurdun", wMoney: 18, wRep: 2, lHealth: 3, skill: "crafting" }],
  çoban:    [{ text: "Sürüde huzursuzluk", stat: "stamina", win: "Sürüyü kurttan kolladın", lose: "Birkaç koyun telef oldu", wMoney: 14, wRep: 1, lHealth: 3 }, { text: "Kırkım zamanı", stat: "stamina", win: "Yapağı bereketli çıktı", lose: "Makasla elini kestin", wMoney: 18, lHealth: 3 }, { text: "Kayıp kuzu", stat: "intelligence", win: "Kuzuyu uçurum kenarından çekip çıkardın", lose: "Kuzu bulunamadı, sahibi sana kızgın", wMoney: 10, wRep: 3, lRep: 2 }, { text: "Sisli yayla sabahı", stat: "intelligence", win: "Çan seslerinden sürüyü siste eksiksiz topladın", lose: "Siste iki koyun komşu sürüye karıştı", wMoney: 14, wRep: 2, lRep: 1 }, { text: "Yeni doğan ikiz kuzular", stat: "intelligence", win: "Anasının reddettiği kuzuyu başka koyuna emzirttin; ikisi de yaşadı", lose: "Cılız kuzu sabahı göremedi", wMoney: 12, wRep: 3, lRep: 1 }],
  fırıncı:  [{ text: "Şafak vakti fırın", stat: "stamina", win: "Ekmekler altın gibi çıktı", lose: "Hamur ekşidi", wMoney: 15, lRep: 1, skill: "crafting" }, { text: "Bayram siparişi", stat: "stamina", win: "Tepsiler fırından çıkmadan tükendi", lose: "Fırının harı kaçtı, hamur çiğ kaldı", wMoney: 20, lRep: 1 }, { text: "Yeni bir tarif", stat: "intelligence", win: "Ballı çörek kapış kapış gitti", lose: "Deneme ziyan oldu, un boşa gitti", wMoney: 16, lHealth: 1, skill: "crafting" }, { text: "İmarethane günü", stat: "stamina", win: "Yetimler için yüz somun çıkardın; dua bereketi keseyi buldu", lose: "Fırın taşı çatladı, gün onarımla geçti", wMoney: 14, wRep: 4, lHealth: 2 }, { text: "Küflenen un çuvalları", stat: "intelligence", win: "Küfü vaktinde ayıkladın; sağlam unla günü kurtardın", lose: "Bir çuval ziyan oldu, hesap açık verdi", wMoney: 14, lRep: 1, skill: "crafting" }],
  katip:    [{ text: "Çetrefil bir ferman", stat: "intelligence", win: "Belgeyi kusursuz yazdın", lose: "Mürekkep dağıldı", wMoney: 20, wRep: 2, lRep: 1, skill: "social" }, { text: "Gizli bir mektup", stat: "charisma", win: "Ağzı sıkı çıktın, büyüklerin güvenini kazandın", lose: "Dedikodu sana mal edildi", wMoney: 16, wRep: 3, lRep: 3, skill: "social" }, { text: "Hesap defterleri", stat: "stamina", win: "Geceyi mum ışığında bitirdin, defterler kusursuz", lose: "Gözlerin yoruldu, satırlar birbirine karıştı", wMoney: 22, lHealth: 3 }, { text: "Okuma yazma bilmeyen nine", stat: "charisma", win: "Ninenin gurbetteki oğluna mektubunu yazdın; dua ve bir kese ceviz bıraktı", lose: "Sözcükler nineyi ağlattı, mektup yarım kaldı", wMoney: 12, wRep: 3, lRep: 1, skill: "social" }, { text: "Yanan arşivden kalanlar", stat: "intelligence", win: "İslenen sayfaları kurutup yeniden çekimledin; kadı memnun kaldı", lose: "Mürekkep isle karıştı, satırlar okunmaz oldu", wMoney: 20, wRep: 2, lRep: 1, skill: "social" }],
  dokumacı: [{ text: "Nazik bir sipariş", stat: "intelligence", win: "Kumaşın göz kamaştırdı", lose: "İplik koptu", wMoney: 17, lHealth: 1, skill: "crafting" }, { text: "Boyahane günü", stat: "stamina", win: "Renkler tam kıvamında tuttu", lose: "Kaynar boya elini yaktı", wMoney: 16, lHealth: 3, skill: "crafting" }, { text: "Saray kumaşı söylentisi", stat: "charisma", win: "Kumaşını saray kethüdasına beğendirdin", lose: "Kethüda burun kıvırdı", wMoney: 26, wRep: 2, lRep: 1 }, { text: "Gelin çeyizi siparişi", stat: "intelligence", win: "Çeyiz kumaşına gizli bir desen dokudun; gelin evi bahşişi katladı", lose: "Desen tersten çıktı, kumaş söküldü", wMoney: 20, wRep: 2, lHealth: 2, skill: "crafting" }, { text: "Yarıda kalan usta işi", stat: "intelligence", win: "Vefat eden ustanın tezgâhındaki deseni çözüp kumaşı tamamladın; ailesi dua etti", lose: "Desen düğümü çözülmedi; tezgâh bekliyor", wMoney: 22, wRep: 3, lRep: 1, skill: "crafting" }],
  _:        [{ text: "Sıradan bir gün", stat: "stamina", win: "İşini sağlam yaptın, fazladan kazandın", lose: "Yorgun bir gündü", wMoney: 10, lHealth: 2 }, { text: "Beklenmedik bir yardım", stat: "charisma", win: "El verdin, karşılığını gördün", lose: "Emeğin görmezden gelindi", wMoney: 8, wRep: 2, lRep: 1 }, { text: "Pazar yerinde hamallık", stat: "strength", win: "Denkler taşındı, ter döküldü; kese biraz dolgunlaştı", lose: "Yük ağır, kazanç hafif kaldı", wMoney: 9, lHealth: 3 }, { text: "Bir konağın bahçe işi", stat: "stamina", win: "Bahçe akşama pırıl pırıl; kâhya memnun, ücret peşin", lose: "Gün bitti, iş bitmedi; ücretin yarısı kaldı", wMoney: 11, lHealth: 2 }],
};
function rollWorkEvent(s: GameState) {
  const p = s.player;
  const profKey = WORK_EVENTS[p.profession] ? p.profession : "_";
  const pool = WORK_EVENTS[profKey];
  const vi = Math.floor(Math.random() * pool.length);
  const ev = pool[vi];
  const wevKey = vi > 0 ? profKey + "." + vi : profKey; // varyant 0 eski anahtarları kullanır — eski kayıt olayları çözülmeye devam eder
  const ok = Math.random() < 0.4 + effStat(p, ev.stat) * 0.06;
  if (ok) {
    if (ev.wMoney) p.money += ev.wMoney;
    if (ev.wHealth) p.health = Math.min(100, p.health + ev.wHealth);
    if (ev.wRep) p.reputation = Math.min(100, p.reputation + ev.wRep);
    if (ev.skill) gainSkill(s, ev.skill, 4);
    push(s, "çalışma", `${ev.text}: ${ev.win}${ev.wMoney ? ` (+${ev.wMoney} akçe)` : ""}.`, "kişisel", false, { k: "evj.workWin", p: [{ wevt: wevKey }, { wevw: wevKey }, ev.wMoney || 0] });
  } else {
    if (ev.lHealth) p.health = Math.max(0, p.health - ev.lHealth);
    if (ev.lRep) p.reputation = Math.max(-100, p.reputation - ev.lRep);
    push(s, "çalışma", `${ev.text}: ${ev.lose}.`, "kişisel", false, { k: "evj.workLose", p: [{ wevt: wevKey }, { wevl: wevKey }] });
  }
}

// ── Meslek imza eylemi (work() dışında, mesleğe özgü, bekleme süreli, stat-testli) ──
// Her meslek kendini gösteren büyük bir iş yapar: hasat şenliği, şaheser sipariş, salgınla mücadele, sınır akını…
export const PROF_ACTION_COOLDOWN = 3; // ay
export interface ProfAction { stat: keyof Stats; reward: number; fame: number; rep: number; honor: number; riskHealth: number; skill: SkillKey; nam?: keyof Nam; namAmt?: number; }
export const PROF_ACTIONS: Record<string, ProfAction> = {
  çiftçi:   { stat: "stamina",      reward: 40, fame: 1, rep: 3, honor: 0, riskHealth: 0, skill: "crafting" },
  demirci:  { stat: "strength",     reward: 60, fame: 4, rep: 1, honor: 0, riskHealth: 4, skill: "crafting" },
  tüccar:   { stat: "charisma",     reward: 80, fame: 2, rep: 2, honor: 0, riskHealth: 0, skill: "trade" },
  balıkçı:  { stat: "stamina",      reward: 45, fame: 1, rep: 1, honor: 0, riskHealth: 5, skill: "trade" },
  avcı:     { stat: "strength",     reward: 50, fame: 2, rep: 1, honor: 0, riskHealth: 5, skill: "combat" },
  marangoz: { stat: "intelligence", reward: 50, fame: 2, rep: 2, honor: 0, riskHealth: 0, skill: "crafting" },
  çoban:    { stat: "stamina",      reward: 38, fame: 1, rep: 1, honor: 0, riskHealth: 0, skill: "trade" },
  fırıncı:  { stat: "intelligence", reward: 36, fame: 1, rep: 2, honor: 0, riskHealth: 0, skill: "crafting" },
  asker:    { stat: "strength",     reward: 55, fame: 4, rep: 1, honor: 4, riskHealth: 7, skill: "combat", nam: "mert", namAmt: 3 },
  müzisyen: { stat: "charisma",     reward: 60, fame: 5, rep: 2, honor: 0, riskHealth: 0, skill: "social" },
  şifacı:   { stat: "intelligence", reward: 50, fame: 3, rep: 5, honor: 4, riskHealth: 6, skill: "social", nam: "dindar", namAmt: 3 },
  katip:    { stat: "intelligence", reward: 45, fame: 2, rep: 3, honor: 0, riskHealth: 0, skill: "social" },
  kuyumcu:  { stat: "intelligence", reward: 75, fame: 4, rep: 1, honor: 0, riskHealth: 0, skill: "crafting" },
  dokumacı: { stat: "intelligence", reward: 48, fame: 2, rep: 2, honor: 0, riskHealth: 0, skill: "crafting" },
  hancı:    { stat: "charisma",     reward: 50, fame: 2, rep: 2, honor: 0, riskHealth: 0, skill: "trade" },
};
export function hasProfAction(p: Player): boolean { return p.profession in PROF_ACTIONS; }
function profCooldownOf(p: Player): number { return p.temperament === "hirsli" ? PROF_ACTION_COOLDOWN - 1 : PROF_ACTION_COOLDOWN; } // hırslı mizaç: işine dört elle sarılır
export function profActionReady(p: Player, turn: number): boolean { const l = p.prof_action_turn; return l == null || turn - l >= profCooldownOf(p); }
export function profActionCooldownLeft(p: Player, turn: number): number { const l = p.prof_action_turn; return l == null ? 0 : Math.max(0, profCooldownOf(p) - (turn - l)); }
export function canProfAction(s: GameState): boolean {
  const p = s.player;
  return !p.dead && !inJail(p) && p.age >= 13 && hasProfAction(p) && profActionReady(p, s.turn) && p.hunger >= 18;
}
export function professionAction(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (!canProfAction(s)) return s;
  const a = PROF_ACTIONS[p.profession]; const pr = professionById(p.profession);
  const tier = pr ? careerTier(pr, p.career_xp) : 0; const titleMult = TITLE_MULT[tier] || 1;
  p.prof_action_turn = s.turn; p.hunger = Math.max(0, p.hunger - 8);
  const ok = Math.random() < 0.45 + effStat(p, a.stat) * 0.05;
  if (ok) {
    let reward = Math.round((a.reward + effStat(p, a.stat) * 3 + Math.floor(Math.random() * 12)) * titleMult * inflationFactor(s));
    // Ustalık eseri (büyük başarı): beceri/özellik ve kariyer kademesi yükseldikçe ihtimal artar (%5 → %30).
    // Her meslek için geçerli — efor ve ustalık ödüllendirilir: daha büyük kazanç, fazladan şöhret ve hızlı kariyer.
    const crit = Math.random() < Math.min(0.30, 0.05 + effStat(p, a.stat) * 0.02 + tier * 0.04);
    if (a.fame) p.fame = Math.min(100, p.fame + a.fame);
    if (a.rep) p.reputation = Math.min(100, p.reputation + a.rep);
    if (a.honor) p.honor = Math.min(100, p.honor + a.honor);
    if (a.nam && a.namAmt) bumpNam(p, a.nam, a.namAmt);
    gainSkill(s, a.skill, 10); addStatXp(s, a.stat, 5); p.career_xp += 1;
    if (crit) {
      reward = Math.round(reward * 1.8); p.fame = Math.min(100, p.fame + 3); p.career_xp += 1;
      p.money += reward;
      { const cv = chance(0.5); push(s, "çalışma", cv ? `Elinden çıkan iş dilden dile gezdi; ustalar bile "kim yaptı" diye sordu (+${reward} akçe).` : `Mesleğinde bir ustalık eseri ortaya koydun; nâmın diyara yayıldı (+${reward} akçe).`, "kişisel", true, { k: cv ? "prof.actCrit2" : "prof.actCrit", p: [reward] }); }
    } else {
      p.money += reward;
      push(s, "çalışma", `Mesleğinde göz dolduran bir iş başardın (+${reward} akçe).`, "kişisel", true, { k: "prof.act." + p.profession + ".win", p: [reward] });
    }
  } else {
    const small = Math.round(a.reward * 0.25 * inflationFactor(s)); p.money += small;
    if (a.riskHealth) p.health = Math.max(1, p.health - a.riskHealth);
    p.reputation = Math.max(-100, p.reputation - 1);
    push(s, "çalışma", `Girişimin umduğun gibi gitmedi (+${small} akçe).`, "kişisel", false, { k: "prof.actLose", p: [small] });
  }
  return s;
}

export function eat(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.hunger >= 100) return s; // ölüye sofra kurulmaz; tokken akçe boşa gitmez
  // önce envanterdeki yiyecek, yoksa 2 akçeye sokak yemeği
  const bonus = hasPerk(p, "tutumlu") ? 10 : 0;
  const foodId = Object.keys(p.inventory).find((id) => p.inventory[id] > 0 && ITEMS[id]?.feed);
  if (foodId) { const it = ITEMS[foodId]; p.inventory[foodId] -= 1; if (p.inventory[foodId] <= 0) delete p.inventory[foodId]; p.hunger = Math.min(100, p.hunger + (it.feed || 20) + bonus); push(s, "gunluk", `${it.name} yedin.`, "kişisel", false, { k: "evj.eat", p: [{ i: foodId }] }); return s; }
  if (p.money < 2) { push(s, "gunluk", "Yemek alacak akçen yok.", "kişisel", false, { k: "evj.noFood" }); return s; }
  p.money -= 2; p.hunger = Math.min(100, p.hunger + 25 + bonus); push(s, "gunluk", "Sokaktan karnını doyurdun (2 akçe).", "kişisel", false, { k: "evj.eatStreet" });
  return s;
}

export function useItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const it = ITEMS[id];
  if (p.dead || !it || !(p.inventory[id] > 0)) return s;
  // Etkisi zaten dolu olan eşyayı harcama (tokken ekmek / tam canken iksir → boşa gitmesin).
  const wouldHelp = (!!it.feed && p.hunger < 100) || (!!it.heal && p.health < 100);
  if (!wouldHelp) return s;
  if (QUALITY_GOODS.has(id)) takeQualityUnit(p, id); // kalite kademesini de düş — öksüz inv_q sızıntısı/exploit önlenir
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  if (it.feed) p.hunger = Math.min(100, p.hunger + it.feed);
  if (it.heal) p.health = Math.min(100, p.health + it.heal);
  push(s, "kullanım", `${it.name} kullandın.`, "kişisel", false, { k: "evj.useItem", p: [{ i: id }] });
  return s;
}

// Bir malın oyuncuya GERÇEK alış fiyatı (tüccar/pazarlıkçı indirimi dahil) — UI ile tek kaynak.
// Bulunduğun yerdeki esnafla (tüccar/fırıncı/terzi/demirci) en iyi ilişkinin fiyat çarpanı:
// dost esnaf indirim yapar (0.90-0.95), düşman esnaf zam (1.08-1.20) — npc-mind behaviorTier tablosu nihayet ekonomiye bağlı.
const ESNAF = new Set(["tüccar", "fırıncı", "terzi", "demirci"]);
export function merchantPriceMult(s: GameState): number {
  const roster = rosterAt(s, s.player.location_name);
  let best = -Infinity;
  for (const n of roster) if (ESNAF.has(n.profession)) { const r = relWith(s, n.id); if (r > best) best = r; }
  if (best === -Infinity) return 1;
  return behaviorTier(best).al_carpan;
}
export function buyPrice(s: GameState, id: string): number {
  const p = s.player;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return 0;
  let disc = p.faction === "tuccar" ? 0.85 : 1;
  if (hasPerk(p, "pazarlikci")) disc -= 0.10;
  return Math.max(1, Math.round(marketPrice(g.buy, s.econ) * disc * goodPriceMult(s, id) * merchantPriceMult(s)));
}
export function buyItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  const price = buyPrice(s, id);
  if (p.money < price) return s;
  p.money -= price; p.inventory[id] = (p.inventory[id] || 0) + 1;
  addTradePressure(s, p.location_name, id, 0.05); // alım yerel arzı azaltır → fiyat tırmanır
  if (p.trade_xp_turn !== s.turn) { p.trade_xp_turn = s.turn; gainSkill(s, "trade", 5); } // al-sat XP: tur başına tek (buğday al-sat döngüsüyle beceri farmı kapatıldı);
  push(s, "ticaret", `${g.name} aldın (${price} akçe).`, "kişisel", false, { k: "evj.buy", p: [{ i: id }, price] });
  return s;
}
// Pazarlık taban fiyatı (lonca/perk indirimi dâhil) — müzakere ekranı için.
export function bargainBase(s: GameState, id: string): number {
  const p = s.player;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return 0;
  let disc = p.faction === "tuccar" ? 0.85 : 1;
  if (hasPerk(p, "pazarlikci")) disc -= 0.10;
  return Math.max(1, Math.round(marketPrice(g.buy, s.econ) * disc * goodPriceMult(s, id)));
}
// Pazarlıkta satıcı kişiliği (Vercel bargain.py): şehre göre deterministik mizaç; pazarlık havasını belirler.
export const SELLER_PERSONAS: { id: string; mult: number }[] = [
  { id: "comert", mult: 1.18 }, { id: "durust", mult: 1.0 }, { id: "tuccar", mult: 0.9 }, { id: "inatci", mult: 0.78 }, { id: "cimri", mult: 0.68 },
];
export function sellerPersona(loc: string): { id: string; mult: number } { return SELLER_PERSONAS[locSeed(loc + "satici") % SELLER_PERSONAS.length]; }
export function sellerPersonaOf(s: GameState): { id: string; mult: number } { return sellerPersona(s.player.location_name); }
// Pazarlık başarı olasılığı (karizma + ticaret becerisi × satıcı mizacı).
export function bargainChance(s: GameState): number {
  const p = s.player;
  const favor = 1 + factionLocalFavor(s) * 0.08; // loncanın hâkim olduğu sancakta pazarlık kolay, düşmanın elinde zor
  return Math.max(0.1, Math.min(0.95, (0.42 + (p.temperament === "kurnaz" ? 0.03 : 0) + effStat(p, "charisma") * 0.035 + p.skills.trade * 0.025 + bargainBonus(s)) * sellerPersona(p.location_name).mult * favor));
}
// Müzakere sonunda anlaşılan fiyattan alım.
export function negotiatedBuy(prev: GameState, id: string, price: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  const bb = bargainBase(s, id); price = Math.max(Math.round(bb * 0.6), Math.min(bb, Math.round(price || 0))); // fiyat pazarlık aralığına sınırlanır (UI dışı keyfi/sıfır fiyat exploit'i önlenir)
  if (p.money < price) return s;
  if (p.bargain_buy_turn === s.turn) return s; // pazarlıkla alım ayda bir — tezgahta sabah pazarlığı olur, bütün gün olmaz (farm kapısı)
  p.bargain_buy_turn = s.turn;
  p.money -= price; p.inventory[id] = (p.inventory[id] || 0) + 1;
  addTradePressure(s, p.location_name, id, 0.05);
  if (p.trade_xp_turn !== s.turn) { p.trade_xp_turn = s.turn; gainSkill(s, "trade", 6); }
  push(s, "ticaret", `Pazarlıkla ${g.name} aldın (${price} akçe).`, "kişisel", false, { k: "evj.buyHaggle", p: [{ i: id }, price] });
  return s;
}
export function sellItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  if (!(p.inventory[id] > 0)) return s;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  // Kalite kademeli malda en iyi birimi sat; fiyata kalite çarpanı uygula.
  const tier = QUALITY_GOODS.has(id) ? takeQualityUnit(p, id) : "siradan";
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  let sell = Math.max(1, Math.round(marketPrice(g.sell, s.econ) * goodPriceMult(s, id) * QUALITY_MULT[tier])); // 0 akçeye satış/envanter sızıntısı önlenir (diğer fiyat fonksiyonlarıyla tutarlı)
  if (hasPerk(p, "dilbaz")) sell = Math.round(sell * 1.25);
  p.money += sell; addTradePressure(s, p.location_name, id, -0.045); // satış yerel arzı artırır → fiyat düşer
  if (p.trade_xp_turn !== s.turn) { p.trade_xp_turn = s.turn; gainSkill(s, "trade", 5); } // al-sat XP: tur başına tek (buğday al-sat döngüsüyle beceri farmı kapatıldı);
  const qNote = tier !== "siradan" ? ` (${QUALITY_LABEL[tier]})` : "";
  if (tier !== "siradan") push(s, "ticaret", `${g.name}${qNote} sattın (+${sell} akçe).`, "kişisel", false, { k: "evj.sellQ", p: [{ i: id }, { q: tier }, sell] });
  else push(s, "ticaret", `${g.name} sattın (+${sell} akçe).`, "kişisel", false, { k: "evj.sell", p: [{ i: id }, sell] });
  return s;
}
// Pazarlıkta satış için taban fiyat (satıcı yükseltmeye direnir; tavan bunun üstünde).
export function bargainSellBase(s: GameState, id: string): number {
  const p = s.player;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return 0;
  return Math.max(1, Math.round(marketPrice(g.sell, s.econ) * goodPriceMult(s, id)));
}
// Müzakereyle satış: anlaşılan fiyattan bir birim satar (kalite çarpanı korunur).
export function negotiatedSell(prev: GameState, id: string, price: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  if (!(p.inventory[id] > 0)) return s;
  const g = marketGoods(locSeed(p.location_name)).find((x) => x.id === id); if (!g) return s;
  const sb = bargainSellBase(s, id); price = Math.max(sb, Math.min(Math.round(sb * 1.4), Math.round(price || 0))); // fiyat pazarlık aralığına sınırlanır (keyfi yüksek satış exploit'i önlenir)
  if (p.bargain_sell_turn === s.turn) return s; // pazarlıkla satış ayda bir (alımla simetrik farm kapısı)
  p.bargain_sell_turn = s.turn;
  const tier = QUALITY_GOODS.has(id) ? takeQualityUnit(p, id) : "siradan";
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  let earn = Math.max(1, Math.round(price * QUALITY_MULT[tier]));
  if (hasPerk(p, "dilbaz")) earn = Math.round(earn * 1.25);
  p.money += earn; addTradePressure(s, p.location_name, id, -0.045);
  if (p.trade_xp_turn !== s.turn) { p.trade_xp_turn = s.turn; gainSkill(s, "trade", 6); }
  push(s, "ticaret", `Pazarlıkla ${g.name} sattın (+${earn} akçe).`, "kişisel", false, { k: "evj.sellHaggle", p: [{ i: id }, earn] });
  return s;
}

// İlişki: niyetli sohbet (bağlamlı), hediye ver.
export function talkWith(prev: GameState, npc: NPC, intent: string, lang: string = "tr"): { state: GameState; line: string } {
  const s = clone(prev); const p = s.player;
  if (p.dead) return { state: s, line: "" };
  const ns = npcStateOf(s, npc.id);
  if (ns.int_turn === s.turn) return { state: s, line: "" }; // bu ay bu kişiyle görüşüldü — aynı turda tekrar konuşup ilişki/sosyal beceri farmlanamaz
  ns.int_turn = s.turn;
  const rel = s.relationships[npc.id] || 0;
  // NPC, sohbette etkin ilişkiye (taban + anılar) göre davranır — hatırladıkları konuşmasına yansır.
  const r: ConvResult = converse(npc, ns.mood, effectiveRel(rel, ns.anilar), socialPresence(p), intent, lang as any);
  let relDelta = r.relDelta;
  if (relDelta > 0) {
    relDelta *= talkWarmthMod(s);                                  // sıcak/korkulan tanınmanın etkisi
    if (intent === "iltifat") relDelta *= 1 + allureBonus(s);      // çapkınlık iltifatı güçlendirir
    if (hasPerk(p, "dil_dokme")) relDelta *= 1.5;
    relDelta = Math.round(relDelta);
  }
  s.relationships[npc.id] = Math.max(-100, Math.min(100, rel + relDelta));
  ns.mood = Math.max(-100, Math.min(100, ns.mood + r.moodDelta));
  ns.memories.push(r.memory);
  if (ns.memories.length > 8) ns.memories = ns.memories.slice(-8);
  // Diyalog katmanları (Vercel): NPC bazen kendi gündemini açar (spontane) + geçmişi hatırlar (callback).
  let line = r.line;
  // Algı selamı: halk seni nasıl görüyorsa NPC de öyle karşılar (yalnız hoşbeşte, tanınıyorsan) — sınıf yolculuğu sohbette hissedilsin.
  if (intent === "hosbes") {
    const pp = publicPerception(s);
    if (pp.key !== "unknown" && pp.key !== "neutral" && Math.random() < 0.35) {
      const g = perceptionGreeting(lang as any, pp.key);
      if (g) line = g + " " + line;
    }
  }
  if (intent === "hosbes" && Math.random() < 0.3) { const sp = spontaneousLine(npc, ns.mood, lang as any); if (sp) line = sp + " " + line; }
  const lastAni = ns.anilar && ns.anilar.length ? ns.anilar[ns.anilar.length - 1] : null;
  if (lastAni && Math.random() < 0.3) { const cb = callbackLine(npc, lastAni.tur, lang as any); if (cb) line = line + " " + cb; }
  // Yapısal anı: sohbet sonucuna göre türlenir (decay'li, ilişkiye etkin).
  const memTur = relDelta >= 8 ? "icten_sohbet" : relDelta > 0 ? "guzel_sohbet" : relDelta <= -3 ? "alay" : relDelta < 0 ? "rahatsizlik" : "guzel_sohbet";
  remember(s, npc, memTur);
  gainSkill(s, "social", 5);
  push(s, "sohbet", `${npc.name}: ${line}`);
  return { state: s, line };
}
// Eski API ile uyumluluk (basit sohbet = hoşbeş).
export function giftTo(prev: GameState, npc: NPC, itemId: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!(p.inventory[itemId] > 0)) return s;
  const ns = npcStateOf(s, npc.id);
  if (ns.int_turn === s.turn) return s; ns.int_turn = s.turn; // tur başına tek etkileşim — ucuz eşya yığınıyla ilişki farmlanamaz (mal da tüketilmez)
  if (QUALITY_GOODS.has(itemId)) takeQualityUnit(p, itemId); // hediye verilen kaliteli mal inv_q'da öksüz kalmasın
  p.inventory[itemId] -= 1; if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
  const generous = npc.trait === "cömert" ? 4 : 0;
  const jewel = ITEMS[itemId]?.kind === "taki" ? 8 : 0; // takı göz alır: hediyenin gönüldeki yeri başka
  s.relationships[npc.id] = Math.min(100, (s.relationships[npc.id] || 0) + 12 + generous + jewel);
  ns.mood = Math.max(-100, Math.min(100, ns.mood + 14 + (jewel ? 6 : 0)));
  ns.memories.push(`${ITEMS[itemId]?.name || "Bir hediye"} hediye ettin.`);
  if (ns.memories.length > 8) ns.memories = ns.memories.slice(-8);
  remember(s, npc, (ITEMS[itemId]?.buy || 0) >= 25 ? "comert_hediye" : "hediye");
  if (jewel) push(s, "sohbet", `${npc.name}'a ${ITEMS[itemId]?.name || "bir takı"} taktın; gözleri parladı, eli uzun süre üstünde gezindi.`, "kişisel", false, { k: "evj.giftJewel", p: [npc.name, { i: itemId }] });
  else { const gv = chance(0.5); push(s, "sohbet", gv ? `${npc.name} hediyeni evirip çevirdi, sonra bağrına bastı: "Bunu hak edecek ne yaptım?"` : `${npc.name}'a ${ITEMS[itemId]?.name || "bir hediye"} verdin. Çok sevindi.`, "kişisel", false, { k: gv ? "evj.gift2" : "evj.gift", p: [npc.name, { i: itemId }] }); }
  return s;
}

// ── NPC'nin amacına yardım/sömürü (Vercel npc_mind goal_action portu) ──
// Her NPC'nin bir hayat hedefi var (npc.goal); ona yardım büyük yakınlık + cömert nam,
// istismar ise akçe + zalim nam getirir ama ilişkiyi yakar.
export const GOAL_HELP_COST = 25;
// ── Çıraklık: usta çağındaki oyuncu bir genci yanına alır, aylar içinde yetiştirir (hikmet aktarımı). ──
// Geç oyun doku: şöhret/şeref getirisi 24 aylık emeğin ucunda; tek seferde tek çırak, ayda bir ders — farm imkânsız.
export const APPRENTICE_MONTHS = 24; // yetişme süresi (2 yıl)
export function bestSkillOf(p: Player): keyof Skills {
  const keys: (keyof Skills)[] = ["combat", "trade", "crafting", "social"];
  return keys.reduce((a, b) => (p.skills[b] > p.skills[a] ? b : a), keys[0]);
}
export function canTakeApprentice(s: GameState, npc: NPC): boolean {
  const p = s.player;
  // Mevcut çırak varken de yeni çırak alınabilir (eskisi bırakılır) — şehir değiştiren oyuncu içerikten kalıcı mahrum kalmasın.
  return !p.dead && p.age >= 45 && p.apprentice?.id !== npc.id && p.apprentice_turn !== s.turn && p.skills[bestSkillOf(p)] >= 6 && npc.alive !== false && npc.age >= 12 && npc.age <= 22;
}
export function takeApprentice(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player;
  if (!canTakeApprentice(s, npc)) return s;
  p.apprentice_turn = s.turn; // ayda tek çıraklık eylemi (al/değiştir/ders aynı ailede) — ilişki farmı önlenir
  if (p.apprentice) {
    // Eski çırak bırakılır: yarım kalan emek gider, gönül kırılır (değiştirmenin bedeli).
    s.relationships[p.apprentice.id] = Math.max(-100, Math.min(100, (s.relationships[p.apprentice.id] || 0) - 10));
    push(s, "çıraklık", `Çırağın ${p.apprentice.name}'i yol yarısında bıraktın; gönlü kırıldı.`, "kişisel", false, { k: "evj.apr.released", p: [p.apprentice.name] });
  }
  p.apprentice = { id: npc.id, name: npc.name, months: 0, skill: bestSkillOf(p) };
  s.relationships[npc.id] = Math.max(-100, Math.min(100, (s.relationships[npc.id] || 0) + 10));
  push(s, "çıraklık", `${npc.name}'i yanına çırak aldın; hünerini bir gence aktaracaksın.`, "kişisel", true, { k: "evj.apr.taken", p: [npc.name] });
  return s;
}
export function mentorApprentice(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  const a = p.apprentice; if (p.dead || !a) return s;
  if (p.apprentice_turn === s.turn) return s; // ayda bir ders
  if (s.world?.npcEvo?.[a.id]?.dead) {
    // Çırak dünya akışında ölmüş olabilir — yarım kalan çıraklık kapanır.
    p.apprentice = undefined;
    push(s, "çıraklık", `Çırağın ${a.name} bu dünyadan göçtü; yarım kalan hüner yüreğinde sızı bıraktı.`, "kişisel", true, { k: "evj.apr.lost", p: [a.name] });
    return s;
  }
  p.apprentice_turn = s.turn;
  a.months += 1;
  gainSkill(s, "social", 5); // öğretmek de bir sanattır
  s.relationships[a.id] = Math.max(-100, Math.min(100, (s.relationships[a.id] || 0) + 3));
  if (a.months >= APPRENTICE_MONTHS) {
    p.apprentice = undefined;
    p.fame = Math.min(100, p.fame + 5); p.honor = Math.min(100, p.honor + 5);
    s.relationships[a.id] = Math.max(-100, Math.min(100, (s.relationships[a.id] || 0) + 25));
    if (s.world) { s.world.npcEvo = s.world.npcEvo || {}; const evo = (s.world.npcEvo[a.id] = s.world.npcEvo[a.id] || {}); evo.usta = true; } // kalıcı iz: senin elinden çıkma usta
    push(s, "çıraklık", `${a.name} yetişti: senin elinden çıkma bir usta artık. Adın onunla da anılacak.`, "kişisel", true, { k: "evj.apr.done", p: [a.name] });
  } else {
    push(s, "çıraklık", `${a.name} ile tezgâh başında bir ay geçti (${a.months}/${APPRENTICE_MONTHS}).`, "kişisel", false, { k: "evj.apr.step", p: [a.name, a.months, APPRENTICE_MONTHS] });
  }
  return s;
}

export function helpNpcGoal(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || p.money < GOAL_HELP_COST || !npc.goal) return s; // hedefi kalmayana (muradına ermiş/çocuk) yardım anlamsız
  const ns = npcStateOf(s, npc.id);
  if (ns.int_turn === s.turn) return s; ns.int_turn = s.turn; // tur başına tek etkileşim (sohbet/hediye ailesiyle tutarlı)
  p.money -= GOAL_HELP_COST;
  const rel = s.relationships[npc.id] || 0;
  // Azalan getiri: zaten yakın birine yardım daha az yakınlık/itibar getirir (farm engeli).
  const fresh = rel < 70;
  const mrh = p.temperament === "merhametli" ? 1.25 : 1; // merhametli: içten yardım daha derin bağ kurar
  s.relationships[npc.id] = Math.min(100, rel + Math.round((fresh ? 18 : 6) * mrh));
  ns.mood = Math.max(-100, Math.min(100, ns.mood + (fresh ? 18 : 8)));
  if (fresh) { p.reputation = Math.min(100, p.reputation + 3); bumpNam(p, "comert", 4); }
  gainSkill(s, "social", 6);
  ns.memories.push(`Amacına omuz verdin: ${npc.goal}.`);
  if (ns.memories.length > 8) ns.memories = ns.memories.slice(-8);
  remember(s, npc, "yardim"); // kalıcıya yakın +20 anı (Vercel: "sana borçlu")
  // Hayal tohumu: omuz verilen hedef yıllar içinde gerçekleşebilir (npcLifeTick çözer) — dünya senin dokunuşunla değişir.
  if (!s.world.npcEvo) s.world.npcEvo = {};
  s.world.npcEvo[npc.id] = { ...(s.world.npcEvo[npc.id] || {}), goalHelped: true, gname: npc.name, goalk: npc.goal };
  // Velinimet tohumu: bu iyilik yıllar sonra keseyle ve itibarla döner (nesil aşabilir). Yalnız taze yardımda (azalan getiri; aynı NPC'ye spam ile tohum farmı önlenir).
  if (fresh) sowSeed(s, { kaynak: "velinimet", hmin: 24, hmax: 96, agirlik: "buyuk", nesil: true, etki: { money: 90, reputation: 6 }, npcName: npc.name });
  push(s, "sohbet", `${npc.name}'in "${npc.goal}" derdine ${GOAL_HELP_COST} akçeyle omuz verdin; sana minnettar kaldı.`, "kişisel", true, { k: "evj.helpGoal", p: [npc.name, { goalk: npc.goal }, GOAL_HELP_COST] });
  return s;
}
export function exploitNpcGoal(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || !npc.goal) return s; // hedefi kalmayanın umudu da istismar edilemez
  // Tur başına tek istismar — yoksa farklı NPC'ler üstünden aynı turda sınırsız para farm'lanır.
  if (p.exploit_turn === s.turn) { push(s, "sohbet", `Bu ay birini daha kandırmaya kalkışmak nam yapar; biraz beklemelisin.`, "kişisel", false, { k: "evj.exploitWait" }); return s; }
  const rel = s.relationships[npc.id] || 0;
  // Sana güvenmeyen kanmaz — bu, istismarın tekrar tekrar farm'lanmasını engeller.
  if (rel <= -25) { push(s, "sohbet", `${npc.name} sana zaten güvenmiyor; oyununa gelmez.`, "kişisel", false, { k: "evj.distrust", p: [npc.name] }); return s; }
  p.exploit_turn = s.turn;
  // Kazanç güvene bağlı: ne kadar çok güveniyorsa o kadar koparırsın (ve o güveni yakarsın).
  const gain = Math.round(8 + Math.max(0, rel) * 0.4 + Math.random() * 10);
  p.money += gain;
  const ns = npcStateOf(s, npc.id);
  s.relationships[npc.id] = Math.max(-100, rel - 22);
  ns.mood = Math.max(-100, ns.mood - 25);
  p.reputation = Math.max(-100, p.reputation - 4); p.fear = Math.min(100, p.fear + 3);
  bumpNam(p, "zalim", 5);
  ns.memories.push(`Amacını istismar edip seni kullandı.`);
  if (ns.memories.length > 8) ns.memories = ns.memories.slice(-8);
  remember(s, npc, "somuru"); // skandal anı → ileride dedikoduya dönüşür
  // İstismar tohumu: kullandığın kişi güçlenince geri döner (nesil aşabilir).
  sowSeed(s, { kaynak: "somuru_intikam", hmin: 36, hmax: 144, agirlik: "orta", nesil: true, etki: { reputation: -5, money: -25 }, npcName: npc.name });
  push(s, "sohbet", `${npc.name}'in "${npc.goal}" umudunu istismar edip ${gain} akçe kopardın; sana diş biledi.`, "kişisel", true, { k: "evj.exploitGoal", p: [npc.name, { goalk: npc.goal }, gain] });
  return s;
}

// Dünür gönderebilir misin? (Bekâr, 18+, karşı cinsten yetişkin, yakınlık yeterli.)
export function canCourt(p: Player, npc: NPC, rel: number): boolean {
  return !p.dead && !p.married && p.age >= 18 && npc.age >= 18 && npc.gender !== p.gender && rel >= 50;
}
// Evlenme teklifi: yakınlık + karizmaya göre kabul/ret.
export function proposeMarriage(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player; const rel = s.relationships[npc.id] || 0;
  if (!canCourt(p, npc, rel)) return s;
  const karizmaBonus = hasPerk(p, "karizmatik") ? 0.2 : 0;
  const ok = Math.random() < Math.min(0.97, 0.25 + (rel - 50) * 0.012 + socialPresence(p) * 0.03 + karizmaBonus + courtBonus(s));
  if (ok) {
    p.married = true; p.married_turn = s.turn; p.spouse_bond = Math.max(30, Math.min(80, Math.round(s.relationships[npc.id] || 40))); p.spouse_name = npc.name; p.spouse_seed = locSeed(npc.id); p.spouse_mizac = mizacFromTrait(npc.trait, locSeed(npc.id)); p.widowed = false; p.reputation = Math.min(100, p.reputation + 5);
    bumpNam(p, "capkin", 5);
    push(s, "evlilik", `${npc.name} ile evlendin — yeni bir ocak kuruldu.`, "kişisel", true, { k: "evj.marryNpc", p: [{ fn: [p.spouse_seed!, p.gender === "erkek" ? "kadın" : "erkek"] }] });
  } else {
    s.relationships[npc.id] = Math.max(0, rel - 8);
    push(s, "sohbet", `${npc.name} teklifini şimdilik geri çevirdi. Vakit ister.`, "kişisel", false, { k: "evj.proposeNo", p: [npc.name] });
  }
  return s;
}

// ── Görücü usulü / çöpçatan: yakınlık şartı olmadan, ücret + karizmayla talip ol ──
// NPC serveti (deterministik, mesleğe bağlı): 0 yoksul, 1 orta, 2 varlıklı.
export function npcWealthTier(npc: NPC): number {
  const rich = ["tüccar", "kuyumcu", "hancı", "katip", "şifacı"];
  const poor = ["çoban", "balıkçı", "işsiz", "çırak", "çocuk"];
  if (rich.includes(npc.profession)) return 2;
  if (poor.includes(npc.profession)) return 0;
  return 1;
}
export const MATCHMAKER_FEE = 60;
export function canArrange(s: GameState): boolean {
  const p = s.player; return !p.dead && !p.married && p.age >= 18 && p.money >= MATCHMAKER_FEE;
}
// Görücü usulü evlenilebilecek adaylar: karşı cinsiyet, 18–59, bulunduğun diyardan.
export function arrangedSuitors(s: GameState, lang: Lang = "tr"): NPC[] {
  const p = s.player; if (p.married || p.age < 18) return [];
  return npcsOf(s, lang).filter((n) => n.gender !== p.gender && n.age >= 18 && n.age < 60);
}
// Görücü usulü talip ol: ücret peşin; kabul karizma + şöhrete bağlı (yakınlık şartı YOK).
export function proposeArranged(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.married || p.age < 18 || npc.gender === p.gender || npc.age < 18) return s;
  if (p.propose_turn === s.turn) return s; // ayda tek dünür girişimi (hane teklifiyle ortak hak — retry kumarı kapalı)
  p.propose_turn = s.turn;
  if (p.money < MATCHMAKER_FEE) { push(s, "sohbet", `Çöpçatana verecek akçen yok.`, "kişisel", false, { k: "evj.matchNoFee" }); return s; }
  p.money -= MATCHMAKER_FEE;
  const ok = Math.random() < Math.min(0.92, 0.42 + socialPresence(p) * 0.04 + p.fame / 320 + (hasPerk(p, "karizmatik") ? 0.15 : 0));
  if (ok) {
    p.married = true; p.married_turn = s.turn; p.spouse_bond = Math.max(30, Math.min(80, Math.round(s.relationships[npc.id] || 40))); p.spouse_name = npc.name; p.spouse_seed = locSeed(npc.id); p.spouse_mizac = mizacFromTrait(npc.trait, locSeed(npc.id)); p.widowed = false; p.reputation = Math.min(100, p.reputation + 5);
    push(s, "evlilik", `${npc.name} ile görücü usulü evlendin — iki aile görüştü, yeni bir ocak kuruldu.`, "kişisel", true, { k: "evj.marryNpc", p: [{ fn: [p.spouse_seed!, p.gender === "erkek" ? "kadın" : "erkek"] }] });
  } else {
    push(s, "sohbet", `${npc.name}'in ailesi teklifi şimdilik geri çevirdi; çöpçatan başka kapı çalacak.`, "kişisel", false, { k: "evj.proposeNo", p: [npc.name] });
  }
  return s;
}

// ── Ek NPC etkileşim eylemleri (Vercel npc_interactions.py portu): hakaret / flört / dedikodu / para ──
export function insultNpc(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player; if (p.dead || p.age < 13) return s;
  const ns = npcStateOf(s, npc.id); const rel = s.relationships[npc.id] || 0;
  if (ns.int_turn === s.turn) return s; ns.int_turn = s.turn; // tur başına tek etkileşim
  let drop = 8 + Math.floor(Math.random() * 8);
  if (npc.trait === "öfkeli") { drop += 5; p.fear = Math.min(100, p.fear + 2); } // öfkeli sert karşılık verir
  s.relationships[npc.id] = Math.max(-100, rel - drop);
  ns.mood = Math.max(-100, ns.mood - 20);
  p.honor = Math.max(0, p.honor - 2);
  remember(s, npc, "hakaret");
  witnessScandal(s, "hakaret", 0.4); // tanık varsa dedikodu kaynağı
  push(s, "sohbet", `${npc.name}'a ağzına geleni söyledin; aranıza duvar girdi (−${drop} ilişki).`, "kişisel", false, { k: "npca.insult", p: [npc.name, drop] });
  return s;
}
export function canFlirt(p: Player, npc: NPC, rel: number): boolean {
  // Hem oyuncu hem NPC reşit (18+) olmalı — evlilik/kur kapısıyla tutarlı; çocuklarla gönül işi olmaz.
  return !p.dead && !p.married && p.age >= 18 && npc.age >= 18 && npc.gender !== p.gender && rel >= 15;
}
export function flirtWith(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player; const rel = s.relationships[npc.id] || 0;
  if (!canFlirt(p, npc, rel)) return s;
  const ns = npcStateOf(s, npc.id);
  if (ns.int_turn === s.turn) return s; ns.int_turn = s.turn; // tur başına tek etkileşim — flört spam'iyle ilişki +100'e çıkarılamaz
  const ok = Math.random() < Math.min(0.9, 0.35 + (rel - 15) * 0.01 + socialPresence(p) * 0.04 + allureBonus(s));
  if (ok) {
    const up = 6 + Math.floor(Math.random() * 8);
    s.relationships[npc.id] = Math.min(100, rel + up); ns.mood = Math.max(-100, Math.min(100, ns.mood + 12));
    bumpNam(p, "capkin", 3); remember(s, npc, "guzel_sohbet");
    if (p.married) p.spouse_bond = Math.max(0, (p.spouse_bond ?? 40) - 4); // gönül eğlencesi ocağı soğutur
    push(s, "sohbet", `${npc.name} ile gönül eğlendirdin; arana kıvılcım düştü (+${up} ilişki).`, "kişisel", false, { k: "npca.flirtWin", p: [npc.name, up] });
  } else {
    s.relationships[npc.id] = Math.max(-100, rel - 5); ns.mood = Math.max(-100, ns.mood - 6);
    push(s, "sohbet", `${npc.name} yüz vermedi; mahcup oldun.`, "kişisel", false, { k: "npca.flirtLose", p: [npc.name] });
  }
  return s;
}
export function gossipAbout(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player; if (p.dead || p.age < 13) return s;
  const ns = npcStateOf(s, npc.id); const rel = s.relationships[npc.id] || 0;
  if (ns.int_turn === s.turn) return s; ns.int_turn = s.turn; // tur başına tek etkileşim
  const ok = Math.random() < Math.min(0.85, 0.4 + (p.skills?.social || 0) * 0.05 + p.stats.charisma * 0.02);
  if (ok) {
    s.relationships[npc.id] = Math.max(-100, rel - 4); ns.mood = Math.max(-100, ns.mood - 4); bumpNam(p, "zalim", 2);
    push(s, "sohbet", `${npc.name} hakkında diller döktürdün; namı sarsıldı.`, "kişisel", false, { k: "npca.gossipWin", p: [npc.name] });
  } else {
    s.relationships[npc.id] = Math.max(-100, rel - 12); ns.mood = Math.max(-100, ns.mood - 14); remember(s, npc, "hakaret");
    push(s, "sohbet", `Dedikodun ${npc.name}'in kulağına gitti; sana diş biledi (−12 ilişki).`, "kişisel", false, { k: "npca.gossipLose", p: [npc.name] });
  }
  return s;
}
export const GIVE_MONEY_AMT = 10;
export function giveMoneyTo(prev: GameState, npc: NPC): GameState {
  const s = clone(prev); const p = s.player; if (p.dead || p.money < GIVE_MONEY_AMT) return s;
  const ns = npcStateOf(s, npc.id); const rel = s.relationships[npc.id] || 0;
  if (ns.int_turn === s.turn) return s; ns.int_turn = s.turn; // tur başına tek etkileşim — sadaka spam'iyle ilişki farm'lanamaz
  p.money -= GIVE_MONEY_AMT;
  const up = rel < 70 ? 9 : 3; // azalan getiri
  s.relationships[npc.id] = Math.min(100, rel + up); ns.mood = Math.max(-100, Math.min(100, ns.mood + 10));
  p.reputation = Math.min(100, p.reputation + 1); bumpNam(p, "comert", 3); remember(s, npc, "hediye");
  push(s, "sohbet", `${npc.name}'in avucuna ${GIVE_MONEY_AMT} akçe sıkıştırdın; duası seninle.`, "kişisel", false, { k: "npca.money", p: [npc.name, GIVE_MONEY_AMT] });
  return s;
}

// Seyahat: başka bir yerleşime git (pazar/atmosfer değişir, biraz tokluk gider).
// Yerleşim ziyaret izi: koleksiyon başarımları için — varışta bir kez kaydedilir.
function markVisit(p: Player, dest: string) {
  if (!p.cities_visited) p.cities_visited = [];
  if (!p.cities_visited.includes(dest)) p.cities_visited.push(dest);
}
export function travelTo(prev: GameState, dest: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || dest === p.location_name) return s;
  markVisit(p, p.location_name); // kalkış noktası da sayılır (doğduğun yerleşim kaybolmasın)
  p.location_name = dest; markVisit(p, dest); p.hunger = Math.max(0, p.hunger - 5);
  { const tv2 = chance(0.5); push(s, "yolculuk", tv2 ? `Yol seni ${dest} kapısına bıraktı; heybende iki beyliğin tozu var.` : `${dest} yerleşimine gittin.`, "kişisel", false, { k: tv2 ? "evj.travel2" : "evj.travel", p: [{ pl: dest }] }); }
  return s;
}

// Çok rotalı seyahat: ana yol (güvenli), patika (hızlı/riskli), kervan (rahat, ücretli), at (kendi atın: hızlı + güvenli + bedava).
export type TravelRoute = "anayol" | "patika" | "kervan" | "at";
export const TRAVEL_ROUTES: { id: TravelRoute; label: string; desc: string }[] = [
  { id: "anayol", label: "Ana Yol", desc: "Güvenli ama yorucu." },
  { id: "patika", label: "Patika", desc: "Kestirme — ama haydut riski var." },
  { id: "kervan", label: "Kervanla", desc: "Rahat ve güvenli (8 akçe)." },
  { id: "at", label: "Atınla", desc: "Hızlı, güvenli ve bedava — atın varsa." },
];
// At satın alma — bir kez; hızlı/güvenli "at ile" yolculuğunu açar.
export const HORSE_COST = 200;
export const HORSE_NAMES = ["Doru", "Yağız", "Kır", "Al", "Boz", "Demir", "Rüzgâr", "Yıldız", "Şahin", "Karayel", "Poyraz", "Kınalı", "Ceylan", "Tayfun"];
export function buyHorse(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || p.horse || p.money < HORSE_COST) return s; // çocuğa at satılmaz
  p.money -= HORSE_COST; p.horse = true; p.horse_name = rnd(HORSE_NAMES); p.reputation = Math.min(100, p.reputation + 2);
  { const hv = chance(0.5); push(s, "yolculuk", hv ? `${p.horse_name} ilk gece tavlada huysuzlandı, sabaha avucundan yem yedi; yol arkadaşlığı böyle başlar.` : `${p.horse_name} adında sağlam bir at aldın; artık yollar daha kısa ve emniyetli.`, "kişisel", true, { k: hv ? "horse.named2" : "horse.named", p: [p.horse_name] }); }
  return s;
}
// ── Yol olayları (Vercel travel_rework.py portu) — otomatik stat-testli, mevcut akışa additif ──
// Rotaya göre yolda bir olay tetiklenebilir; sonuç oyuncunun istatistiğiyle çözülür ve günlüğe düşer.
function rollTravelEvent(s: GameState, route: TravelRoute) {
  const p = s.player;
  if (p.dead || p.age < 13) return;
  // Tur başına tek yol olayı — yoksa A→B→A gidip gelerek beceri/eşya/akçe farm'lanır (work ile aynı kural).
  if (p.last_travel_turn === s.turn) return;
  p.last_travel_turn = s.turn;
  const insec = Math.max(0, -cityFx(s, p.location_name).sec); // eşkıya/yangın olayı varış şehrini tehlikeli yapar
  const chance = (route === "patika" ? 0.42 : route === "kervan" ? 0.5 : 0.34) + insec * 0.012;
  if (Math.random() >= chance) return;
  const test = (stat: keyof Stats, per = 0.05, base = 0.4) => Math.random() < Math.min(0.9, base + effStat(p, stat) * per);
  // Kervan rotası güvenli/sosyal olaylara yönelir; diğerleri tüm havuzu çeker. At sahibine özel olay eklenir.
  const pool = route === "kervan" ? ["han", "yolcu", "tuccar", "kutsal", "kayipcocuk", "atnali", "dervis", "eskici", "menzilci"] : ["han", "yolcu", "tuccar", "firtina", "gecit", "kervanf", "kutsal", "izler", "coban", "harabe", "kopru", "devrikyuk", "kayipcocuk", "arikovani", "atnali", "dervis", "siginak", "eskici", "sislivadi", "sazlik", "menzilci", "gecates", "ahlat"];
  if (p.horse) pool.push("atli"); // atlıya yol başka görünür
  const ev = pool[Math.floor(Math.random() * pool.length)];
  if (ev === "han") {
    const cost = Math.min(p.money, 4 + Math.floor(Math.random() * 4));
    if (cost > 0) { p.money -= cost; p.health = Math.min(100, p.health + 8); p.hunger = Math.min(100, p.hunger + 12); push(s, "yolculuk", `Yol üstü bir handa mola verdin (−${cost} akçe); dinlenip karnını doyurdun.`, "kişisel", false, { k: "evj.trHan", p: [cost] }); }
  } else if (ev === "tuccar") {
    // Gezgin satıcı: ucuza yararlı bir mal.
    const goods = ["sifa", "ekmek", "et", "bal"]; const g = goods[Math.floor(Math.random() * goods.length)];
    if (test("charisma", 0.06, 0.45)) { p.inventory[g] = (p.inventory[g] || 0) + 1; push(s, "yolculuk", `Gezgin bir satıcıyla karşılaştın; pazarlıkla ucuza bir ${ITEMS[g]?.name || g} kaptın.`, "kişisel", true, { k: "evj.trMerchWin", p: [{ i: g }] }); }
    else push(s, "yolculuk", "Gezgin bir satıcı malını fazla pahalı istedi; eli boş yürüdün.", "kişisel", false, { k: "evj.trMerchLose" });
  } else if (ev === "yolcu") {
    // Yol arkadaşı (derviş/kaçak/tüccar/asker) — sohbetten beceri/irfan.
    const kinds = ["derviş", "kaçak tüccar", "yaşlı asker", "seyyah"]; const whoIdx = Math.floor(Math.random() * kinds.length); const who = kinds[whoIdx];
    if (test("charisma", 0.05, 0.5)) { gainSkill(s, "social", 12); push(s, "yolculuk", `Yolda bir ${who} ile dertleştin; sohbetinden hisse kaptın (sosyal beceri arttı).`, "kişisel", true, { k: "evj.trCompWin", p: [{ wc: whoIdx }] }); }
    else push(s, "yolculuk", `Yolda bir ${who} ile yürüdün; lafı pek tutmadı.`, "kişisel", false, { k: "evj.trCompLose", p: [{ wc: whoIdx }] });
  } else if (ev === "firtina") {
    if (test("stamina", 0.06, 0.45)) push(s, "yolculuk", "Yolda fırtınaya yakalandın ama sağlam bir kayalığa sığınıp atlattın.", "kişisel", false, { k: "evj.trStormWin" });
    else { const hurt = 5 + Math.floor(Math.random() * 8); p.health = Math.max(1, p.health - hurt); p.hunger = Math.max(0, p.hunger - 8); push(s, "yolculuk", `Yolda fırtına seni hırpaladı (−${hurt} sağlık).`, "kişisel", true, { k: "evj.trStormLose", p: [hurt] }); }
  } else if (ev === "gecit") {
    if (test("strength", 0.06, 0.42)) { gainSkill(s, "combat", 6); push(s, "yolculuk", "Sarp bir geçidi güçle aşıp kestirme yaptın.", "kişisel", false, { k: "evj.trPassWin" }); }
    else { const hurt = 4 + Math.floor(Math.random() * 7); p.health = Math.max(1, p.health - hurt); push(s, "yolculuk", `Sarp geçitte ayağın kaydı, biraz hırpalandın (−${hurt} sağlık).`, "kişisel", false, { k: "evj.trPassLose", p: [hurt] }); }
  } else if (ev === "kervanf") {
    // Kervan fırsatı: ticaret testiyle küçük kâr.
    if (test("intelligence", 0.05, 0.4)) { const gain = 10 + Math.floor(Math.random() * 25); p.money += gain; gainSkill(s, "trade", 6); push(s, "yolculuk", `Yolda bir kervana ufak bir ticaret yaptın (+${gain} akçe).`, "kişisel", true, { k: "evj.trCarWin", p: [gain] }); }
    else push(s, "yolculuk", "Yolda bir kervan gördün ama denk bir alışveriş çıkmadı.", "kişisel", false, { k: "evj.trCarLose" });
  }
  else if (ev === "kutsal") {
    // Yol üstü türbe: sakin bir an — test yok, küçük gönül ferahlığı.
    p.honor = Math.min(100, p.honor + 2); p.health = Math.min(100, p.health + 3); bumpNam(p, "dindar", 1);
    push(s, "yolculuk", "Yol üstünde bir türbeye uğrayıp dua ettin; içine bir ferahlık indi.", "kişisel", false, { k: "evj.trShrine" });
  } else if (ev === "izler") {
    if (test("stamina", 0.06, 0.45)) { gainSkill(s, "combat", 6); push(s, "yolculuk", "Patikada kurt izleri gördün; izleri okuyup sürüden önce davrandın.", "kişisel", false, { k: "evj.trTracksWin" }); }
    else { const hurt = 3 + Math.floor(Math.random() * 4); p.health = Math.max(1, p.health - hurt); push(s, "yolculuk", `Kurtlar karanlıkta yolunu kesti; kaçarken hırpalandın (−${hurt} sağlık).`, "kişisel", false, { k: "evj.trTracksLose", p: [hurt] }); }
  } else if (ev === "coban") {
    if (test("stamina", 0.05, 0.5)) { const pay = Math.round((6 + Math.floor(Math.random() * 8)) * inflationFactor(s)); p.money += pay; bumpNam(p, "comert", 2); push(s, "yolculuk", `Sürüsü dağılmış bir çobana yardım ettin; duasını ve birkaç akçesini aldın (+${pay}).`, "kişisel", false, { k: "evj.trShepherd", p: [pay] }); }
    else push(s, "yolculuk", "Dağılan bir sürüyü toparlamaya çalıştın ama koyunlar seni dinlemedi; çoban gülümseyip teşekkür etti.", "kişisel", false, { k: "evj.trShepherdLose" });
  } else if (ev === "eskici") {
    // Eskicinin kırık tekeri: omuz ver — dua, birkaç akçe ve cömert nam.
    if (test("strength", 0.05, 0.5)) { const pay = Math.round((4 + Math.floor(Math.random() * 6)) * inflationFactor(s)); p.money += pay; bumpNam(p, "comert", 1); push(s, "yolculuk", `Eskicinin kırılan tekerini omuzlayıp taktın; dua ve birkaç akçe aldın (+${pay}).`, "kişisel", false, { k: "evj.trTinkerWin", p: [pay] }); }
    else { p.hunger = Math.max(0, p.hunger - 4); push(s, "yolculuk", "Eskicinin tekeriyle boğuştun ama çivi tutmadı; ikiniz de yorgun, araba yerinde.", "kişisel", false, { k: "evj.trTinkerLose" }); }
  } else if (ev === "sislivadi") {
    // Sisli vadi: yönü okuyan kestirmeyi bulur; şaşıran saatlerce dolanır.
    if (test("intelligence", 0.06, 0.42)) { addStatXp(s, "intelligence", 2); push(s, "yolculuk", "Vadiyi sis bastı; yosunun yönünden kuzeyi bulup kestirmeden çıktın.", "kişisel", false, { k: "evj.trFogWin" }); }
    else { p.hunger = Math.max(0, p.hunger - 6); push(s, "yolculuk", "Sisin içinde aynı kayayı üç kez gördün; vadiden çıktığında gün bitmişti.", "kişisel", false, { k: "evj.trFogLose" }); }
  } else if (ev === "sazlik") {
    // Sazlığa saplanan yük atı: omuz veren dua ve akçe alır; beceremeyen çamurla döner.
    if (test("strength", 0.05, 0.48)) { const pay = Math.round((5 + Math.floor(Math.random() * 7)) * inflationFactor(s)); p.money += pay; bumpNam(p, "comert", 1); push(s, "yolculuk", `Sazlığa saplanan yük atını sürücüsüyle birlikte çekip çıkardın; dua ve birkaç akçe aldın (+${pay}).`, "kişisel", false, { k: "evj.trReedWin", p: [pay] }); }
    else { p.hunger = Math.max(0, p.hunger - 5); push(s, "yolculuk", "Atı çamurdan çekeyim derken kendin dizine kadar battın; hayvan kendi kendine çıktı, sen çamurla döndün.", "kişisel", false, { k: "evj.trReedLose" }); }
  } else if (ev === "menzilci") {
    // Attan düşen menzil ulağı: mektubu yetiştiren posta ücretini ve itibarı alır.
    if (test("stamina", 0.05, 0.45)) { const pay = Math.round((7 + Math.floor(Math.random() * 9)) * inflationFactor(s)); p.money += pay; p.reputation = Math.min(100, p.reputation + 1); push(s, "yolculuk", `Attan düşen menzil ulağının mektubunu bir sonraki hana sen yetiştirdin; posta ücreti sana kaldı (+${pay}).`, "kişisel", false, { k: "evj.trCourierWin", p: [pay] }); }
    else push(s, "yolculuk", "Ulağın mektubunu yetiştireyim derken yolu uzattın; han kapanmıştı, mektup sabahı bekledi.", "kişisel", false, { k: "evj.trCourierLose" });
  } else if (ev === "gecates") {
    // Gece çoban ateşi: sofraya oturan türkü ve dinçlikle kalkar; yolu şaşıran soğukta konaklar.
    if (test("charisma", 0.05, 0.5)) { gainSkill(s, "social", 6); p.hunger = Math.min(100, p.hunger + 4); push(s, "yolculuk", "Gece bir çoban ateşine misafir oldun; ekmek bölündü, türkü döndü. Sabah yola dinç ve dost sesiyle çıktın.", "kişisel", false, { k: "evj.trFireWin" }); }
    else { p.hunger = Math.max(0, p.hunger - 3); push(s, "yolculuk", "Gecenin ateşi uzaktan göründü ama yolunu şaşırttı; soğukta konakladın, azığın azaldı.", "kişisel", false, { k: "evj.trFireLose" }); }
  } else if (ev === "ahlat") {
    // Yol kenarı yaban armudu: olgununu seçen doyar; hama saldıran ekşir.
    if (test("intelligence", 0.05, 0.5)) { p.hunger = Math.min(100, p.hunger + 6); p.health = Math.min(100, p.health + 1); push(s, "yolculuk", "Yol kenarındaki yaban armudunun olgunlarını seçtin; karnın doydu, heybene de kaldı.", "kişisel", false, { k: "evj.trPearWin" }); }
    else { p.health = Math.max(1, p.health - 2); push(s, "yolculuk", "Ham ahlat mideni bozdu; yolun kalanı ekşi bir yüzle geçti (−2 sağlık).", "kişisel", false, { k: "evj.trPearLose" }); }
  } else if (ev === "harabe") {
    if (test("intelligence", 0.05, 0.38)) { const loot = Math.round((10 + Math.floor(Math.random() * 18)) * inflationFactor(s)); p.money += loot; push(s, "yolculuk", `Eski bir kervansaray harabesini kolaçan ettin; taşların arasından unutulmuş bir kese çıktı (+${loot} akçe).`, "kişisel", true, { k: "evj.trRuinWin", p: [loot] }); }
    else push(s, "yolculuk", "Eski bir harabeyi kolaçan ettin; örümcek ağından başka bir şey çıkmadı.", "kişisel", false, { k: "evj.trRuinLose" });
  } else if (ev === "kopru") {
    if (test("intelligence", 0.05, 0.42)) { gainSkill(s, "crafting", 6); p.reputation = Math.min(100, p.reputation + 1); push(s, "yolculuk", "Selin yıktığı köprüde gevşeyen tahtayı yerine oturttun; arkandan gelen kervan da geçti, dualar aldın.", "kişisel", false, { k: "evj.trBridgeWin" }); }
    else { const hurt = 3 + Math.floor(Math.random() * 5); p.health = Math.max(1, p.health - hurt); p.hunger = Math.max(0, p.hunger - 4); push(s, "yolculuk", `Yıkık köprüde dere geçidi aramak zorunda kaldın; sırılsıklam ve yorgun vardın (−${hurt} sağlık).`, "kişisel", false, { k: "evj.trBridgeLose", p: [hurt] }); }
  } else if (ev === "devrikyuk") {
    if (test("strength", 0.06, 0.42)) { const pay = Math.round((7 + Math.floor(Math.random() * 8)) * inflationFactor(s)); p.money += pay; bumpNam(p, "comert", 1); push(s, "yolculuk", `Devrilen yük arabasını omuz verip kaldırdın; arabacı avucuna birkaç akçe sıkıştırdı (+${pay}).`, "kişisel", false, { k: "evj.trCartWin", p: [pay] }); }
    else push(s, "yolculuk", "Devrilen arabaya omuz verdin ama yük yerinden oynamadı; arabacı yine de duacı kaldı.", "kişisel", false, { k: "evj.trCartLose" });
  } else if (ev === "arikovani") {
    if (test("intelligence", 0.05, 0.45)) { p.hunger = Math.min(100, p.hunger + 5); bumpNam(p, "comert", 1); push(s, "yolculuk", "Devrilen kovanların başında çaresiz kalan arıcıya dumanla yardım ettin; arılar duruldu, yola bir çanak balla devam ettin.", "kişisel", false, { k: "evj.trHiveWin" }); }
    else { const hurt = 2 + Math.floor(Math.random() * 3); p.health = Math.max(1, p.health - hurt); push(s, "yolculuk", `Kovanlara yaklaşınca arılar öfkeyle kalktı; iki sokmayla kaçtın (−${hurt} sağlık). Arıcı özürler diledi.`, "kişisel", false, { k: "evj.trHiveLose", p: [hurt] }); }
  } else if (ev === "atnali") {
    if (test("intelligence", 0.05, 0.42)) { const pay = Math.round((6 + Math.floor(Math.random() * 7)) * inflationFactor(s)); p.money += pay; p.reputation = Math.min(100, p.reputation + 1); push(s, "yolculuk", `Yol kenarında topal atıyla kalakalmış süvarinin nalını çakıp düzelttin; avucuna akçe sıkıştırıp yola koyuldu (+${pay}).`, "kişisel", false, { k: "evj.trShoeWin", p: [pay] }); }
    else { p.hunger = Math.max(0, p.hunger - 3); push(s, "yolculuk", "Huysuz at nal tutturmadı; süvariyle yarım saat uğraşıp terledin, at yine topal, sen yine yolda.", "kişisel", false, { k: "evj.trShoeLose" }); }
  } else if (ev === "dervis") {
    if (test("charisma", 0.05, 0.45)) { p.health = Math.min(100, p.health + 3); bumpNam(p, "dindar", 1); push(s, "yolculuk", "Yolda bir gezgin dervişe yoldaş oldun; anlattığı kıssa içindeki düğümü çözdü, ayrılırken duasını aldın.", "kişisel", false, { k: "evj.trDervisWin" }); }
    else push(s, "yolculuk", "Gezgin derviş suskun çıktı; fersah boyu yalnız ayak sesleriniz konuştu. Yine de kötü yoldaş değildi.", "kişisel", false, { k: "evj.trDervisLose" });
  } else if (ev === "kayipcocuk") {
    if (test("charisma", 0.05, 0.5)) { p.reputation = Math.min(100, p.reputation + 2); bumpNam(p, "mert", 1); push(s, "yolculuk", "Yol kenarında ağlayan, yolunu şaşırmış bir çocuk buldun; elinden tutup köyüne ulaştırdın. Anası kapıda dua etti.", "kişisel", false, { k: "evj.trChildWin" }); }
    else push(s, "yolculuk", "Yolunu şaşırmış bir çocuğa yaklaştın ama ürküp kaçtı; neyse ki az ileride köylüler buldu.", "kişisel", false, { k: "evj.trChildLose" });
  } else if (ev === "siginak") {
    if (test("intelligence", 0.05, 0.45)) { p.hunger = Math.min(100, p.hunger + 6); push(s, "yolculuk", "Gök bir anda karardı; kaya kovuğunu ilk sen gördün, bir yolcuyla kuru kaldınız. Azığından çörek ikram etti.", "kişisel", false, { k: "evj.trShelterWin" }); }
    else { p.health = Math.max(1, p.health - 2); push(s, "yolculuk", "Sağanak açıkta yakaladı; sırılsıklam vardın, akşama kadar titredin (−2 sağlık).", "kişisel", false, { k: "evj.trShelterLose" }); }
  } else if (ev === "atli") {
    if (test("stamina", 0.05, 0.5)) { p.fame = Math.min(100, p.fame + 2); bumpNam(p, "mert", 1); push(s, "yolculuk", `Yolda bir atlıyla yarıştınız; ${p.horse_name || "atın"} rüzgâr gibi uçtu, adın yol boyu anlatıldı.`, "kişisel", false, { k: "evj.trRaceWin", p: [p.horse_name || ""] }); }
    else push(s, "yolculuk", "Yolda bir atlıyla yarıştınız; tozunu yuttun ama iyi koşturdun.", "kişisel", false, { k: "evj.trRaceLose" });
  }
  if (p.health <= 0) die(s, `${p.name}, yolda can verdi.`, { k: "evj.dieRoad", p: [p.name] });
}

export function travelBy(prev: GameState, dest: string, route: TravelRoute): GameState {
  const s = clone(prev); const p = s.player;
  if (inJail(p)) return s; // zindandan kervan kalkmaz
  if (p.dead || dest === p.location_name) return s;
  markVisit(p, p.location_name); // kalkış noktası da sayılır (doğduğun yerleşim kaybolmasın)
  if (route === "at" && !p.horse) route = "anayol"; // at yoksa ana yola düş
  if (route === "kervan") {
    if (p.money < 8) { push(s, "yolculuk", "Kervana verecek akçen yok.", "kişisel", false, { k: "evj.noCar" }); return s; }
    p.money -= 8; p.hunger = Math.max(0, p.hunger - 3); p.location_name = dest; markVisit(p, dest);
    push(s, "yolculuk", `Kervana katılıp ${dest}'e rahatça vardın.`, "kişisel", false, { k: "evj.carJoin", p: [{ pl: dest }] });
  } else if (route === "patika") {
    p.hunger = Math.max(0, p.hunger - 7); p.location_name = dest; markVisit(p, dest);
    const ambush = Math.random() < retinueGuardMult(p) * Math.max(0.08, 0.3 - combatPower(p) * 0.012);
    if (ambush) {
      const hurt = 8 + Math.floor(Math.random() * 10) - armorDefense(p);
      const loss = Math.min(p.money, 5 + Math.floor(Math.random() * 15));
      p.health = Math.max(0, p.health - Math.max(3, hurt)); p.money -= loss;
      push(s, "yolculuk", `Patikada haydut bastı! ${dest}'e zor ulaştın (−sağlık, −${loss} akçe).`, "kişisel", true, { k: "evj.pathAmbush", p: [{ pl: dest }, loss] });
      if (p.health <= 0) die(s, `${p.name}, patikada haydutlara yenik düştü.`, { k: "evj.diePath", p: [p.name] });
    } else {
      push(s, "yolculuk", `Patikadan kestirerek ${dest}'e vardın.`, "kişisel", false, { k: "evj.pathOk", p: [{ pl: dest }] });
    }
  } else if (route === "at") {
    p.hunger = Math.max(0, p.hunger - 4); p.location_name = dest; markVisit(p, dest);
    // At hızlı: pusu nadir, baskına uğrasan da dörtnala sıyrılırsın.
    const ambush = Math.random() < Math.max(0.03, 0.12 - combatPower(p) * 0.01);
    if (ambush && Math.random() < retinueGuardMult(p) * 0.18) { // nadiren atını kaybedersin — yoldaşını yitirmek gibi
      const hn = p.horse_name || ""; p.horse = false; p.horse_name = undefined;
      p.health = Math.max(1, p.health - (5 + Math.floor(Math.random() * 6)));
      push(s, "yolculuk", `Haydutlar atın ${hn}'ı elinden aldı; ${dest}'e yaya, gönlün buruk vardın.`, "kişisel", true, { k: "horse.lost", p: [hn, { pl: dest }] });
    } else if (ambush) {
      const loss = Math.min(p.money, 4 + Math.floor(Math.random() * 8));
      p.money -= loss; p.health = Math.max(1, p.health - (4 + Math.floor(Math.random() * 5)));
      push(s, "yolculuk", `Atınla giderken haydutlar çıktı ama dörtnala sıyrıldın (−${loss} akçe).`, "kişisel", false, { k: "evj.rideAmbush", p: [{ pl: dest }, loss] });
    } else {
      push(s, "yolculuk", `Atına atlayıp ${dest} yerleşimine çabucak vardın.`, "kişisel", false, { k: "evj.rideOk", p: [{ pl: dest }] });
    }
  } else {
    p.hunger = Math.max(0, p.hunger - 5); p.location_name = dest; markVisit(p, dest);
    { const tv2 = chance(0.5); push(s, "yolculuk", tv2 ? `Ana yol seni ${dest} kapısına bıraktı; heybende iki beyliğin tozu var.` : `Ana yoldan ${dest} yerleşimine gittin.`, "kişisel", false, { k: tv2 ? "evj.travel2" : "evj.travel", p: [{ pl: dest }] }); }
  }
  if (!p.dead) rollTravelEvent(s, route); // yol olayları (han/yolcu/tüccar/fırtına/geçit/kervan) — artık etkin
  return s;
}

export const ALL_PROFS = PROFS;
// Meslek değiştir (13+). Yeni bir zanaata geçersin.
export function changeProfession(prev: GameState, prof: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || prof === p.profession || !PROFS.includes(prof)) return s;
  if (!p.professions_tried) p.professions_tried = [];
  // Ayrıldığın meslek de sayılır (doğumda doğrudan atanan ilk meslek kaybolmasın — markVisit'teki kalkış kaydının analoğu).
  if (p.profession !== "işsiz" && !p.professions_tried.includes(p.profession)) p.professions_tried.push(p.profession);
  p.profession = prof; p.career_xp = 0;
  if (!p.professions_tried.includes(prof)) p.professions_tried.push(prof);
  { const pv2 = chance(0.5); push(s, "meslek_değişimi", pv2 ? `Eski önlük çiviye asıldı; ${(professionById(prof)?.name || cap(prof)).toLowerCase()} tezgâhında ilk gün. Herkes bir zamanlar çıraktı.` : `${professionById(prof)?.name || cap(prof)} mesleğine geçtin — yeniden en alttan.`, "kişisel", true, { k: pv2 ? "evj.profSwitch2" : "evj.profSwitch", p: [{ pr: prof }] }); }
  return s;
}

// Özellik puanı harca.
// Özellik tavanı yaşa bağlı: çocuk bedeni/aklı 8'de durur, 10 "olağanüstü" yetişkinliğe kalır
// (denge: tam-gaz çocukluk 13 yaşında 4 statı da maksluyordu; puanlar kaybolmaz, 13'ten sonra harcanır).
export function statCapOf(p: Player): number { return p.age < 13 ? 8 : 10; }
export function allocateStat(prev: GameState, key: keyof Stats): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.stat_points <= 0 || p.stats[key] >= statCapOf(p)) return s; // yaş tavanı (addStatXp ile aynı sınır)
  p.stat_points -= 1; p.stats[key] += 1;
  return s;
}
// ── Stat-XP (Vercel skills.add_stat_xp portu): özellikler kullanımla yavaşça büyür (stat_points'e EK) ──
const STAT_LABEL: Record<keyof Stats, string> = { strength: "Güç", intelligence: "Zekâ", charisma: "Karizma", stamina: "Dayanıklılık" };
export function statXpForNext(level: number): number { return 25 + level * 15; } // bir üst seviye için gereken tecrübe
// Özellik niteliği: 1–10 ölçeğinde değerin kıyas etiketini verir (oyuncu 21 zeka iyi mi kötü mü görsün diye).
// Tavan 10'dur (addStatXp 10'da durur); 5–6 ortalama, 10 olağanüstü.
export function statTierKey(v: number): string {
  if (v <= 2) return "st.tier.veryweak";
  if (v <= 4) return "st.tier.weak";
  if (v <= 6) return "st.tier.average";
  if (v <= 8) return "st.tier.good";
  if (v <= 9) return "st.tier.veryGood";
  return "st.tier.exceptional";
}
export function statXpOf(p: Player, key: keyof Stats): number { return p.stat_xp?.[key] ?? 0; }
const STAT_OVERFLOW_SKILL: Record<keyof Stats, SkillKey> = { strength: "combat", intelligence: "trade", charisma: "social", stamina: "crafting" };
function addStatXp(s: GameState, key: keyof Stats, amt: number) {
  const p = s.player;
  const cap = statCapOf(p); // çocukta 8, yetişkinde 10
  if (p.stats[key] >= cap) { gainSkill(s, STAT_OVERFLOW_SKILL[key], Math.max(1, Math.round(amt / 2))); return; } // tavan sonrası emek boşa gitmez: ilgili beceriye yarı oranda ustalık akar
  if (!p.stat_xp) p.stat_xp = { strength: 0, intelligence: 0, charisma: 0, stamina: 0 };
  p.stat_xp[key] += amt;
  while (p.stats[key] < cap && p.stat_xp[key] >= statXpForNext(p.stats[key])) {
    p.stat_xp[key] -= statXpForNext(p.stats[key]);
    p.stats[key] += 1;
    push(s, "beceri", `${STAT_LABEL[key]} özelliğin tecrübeyle gelişti (${p.stats[key]}).`, "kişisel", false, { k: "statxp.up", p: [{ statk: key }, p.stats[key]] });
  }
  if (p.stats[key] >= 10) p.stat_xp[key] = 0; // yalnız gerçek tavanda sıfırla — çocuk tavanındaki birikim 13'te serpilmeye dönüşür
}

// ── Mektep: 4 ders, her biri farklı yön geliştirir ──
export interface Subject { id: string; name: string; icon: string; desc: string; }
export const SUBJECTS: Subject[] = [
  { id: "din",      name: "Din", icon: "prayer-beads", desc: "Dindarlık ve gönül huzuru." },
  { id: "matematik",name: "Matematik", icon: "scales", desc: "Zekâ ve ticaret aklı." },
  { id: "edebiyat", name: "Edebiyat", icon: "book", desc: "Karizma ve hitabet." },
  { id: "beden",    name: "Beden", icon: "fist", desc: "Güç ve savaş kabiliyeti." },
];
export interface StudyResult { state: GameState; key: string; chips: { label: string; col: string; k?: string; p?: (string | number)[] }[]; blocked?: boolean; }
// ── Çalışma gücü (enerji sistemi) — her ay yenilenir; ders/kulüp meşki harcar ──
export const STUDY_COST = 2; // ders / kulüp meşki başına enerji
export function maxStudyEnergy(age: number): number { return age >= 7 && age < 18 ? 4 : 2; } // okul çağı 2 iş, yetişkin 1 iş/ay
export function studyEnergy(s: GameState): number { return s.player.study_energy ?? maxStudyEnergy(s.player.age); }
// Bu ay artık çalışılamıyor mu? (enerji ders maliyetinin altında).
export function studiedThisTurn(s: GameState): boolean { return studyEnergy(s) < STUDY_COST; }
// Çocukluk günleri (oyun/yardım/yaramazlık/keşif) mektepten ayrı hak kullanır — ders çalışan çocuk oynamaktan olmaz (test geri bildirimi).
export const PLAY_COST = 2;
export function maxPlayEnergy(age: number): number { return age < 13 ? 4 : 0; } // ayda 2 çocukluk hakkı
export function playEnergy(s: GameState): number { return s.player.play_energy ?? maxPlayEnergy(s.player.age); }
// Sınava kaç ders kaldı (4 derste bir sınav).
export function lessonsToExam(p: Player): number { return 4 - ((p.lesson_count || 0) % 4); }
const EXAM_STAT: Record<string, keyof Stats> = { din: "intelligence", matematik: "intelligence", edebiyat: "charisma", beden: "strength" };
// Ders-içi olaylar (Vercel school.py ders olayları): mektep günlerine doku katar; stat testli.
interface SchoolEvent { id: string; stat: keyof Stats; }
const SCHOOL_EVENTS: SchoolEvent[] = [
  { id: "kopya", stat: "intelligence" }, { id: "kavga", stat: "strength" }, { id: "siir", stat: "charisma" },
  { id: "soru", stat: "intelligence" }, { id: "yaramazlik", stat: "charisma" }, { id: "yardim", stat: "intelligence" },
  { id: "hattat", stat: "intelligence" }, { id: "ezber", stat: "intelligence" }, { id: "bahce", stat: "stamina" },
  { id: "harita", stat: "intelligence" }, { id: "misafir", stat: "charisma" },
];
const SCHOOL_EV_TR: Record<string, string> = {
  "kopya.win":"Sınavda kopya teklif edildi; reddedip kendi emeğine güvendin.", "kopya.lose":"Kopyaya kalkıştın ve yakalandın; yüzün kızardı.",
  "kavga.win":"Avluda zayıf bir arkadaşını korudun; biraz hırpalandın ama dimdik durdun.", "kavga.lose":"Bir kavgaya karıştın ve dayak yedin.",
  "siir.win":"Mecliste bir beyit okudun; alkış topladın.", "siir.lose":"Söz alırken dilin dolaştı; biraz utandın.",
  "soru.win":"Hocanın çetin sorusunu bildin; takdir kazandın (özellik puanı).", "soru.lose":"Hocanın sorusunda bocaladın.",
  "yaramazlik.win":"Sınıfta küçük bir muziplik yaptın; herkes güldü.", "yaramazlik.lose":"Muzipliğin ters tepti; hoca kızdı.",
  "yardim.win":"Geri kalan bir arkadaşına ders çalıştırdın; ikiniz de kazandınız.", "yardim.lose":"Yardım etmeye çalıştın ama anlatamadın.",
  "hattat.win":"Hokka ve kamışla bir sayfa yazdın; hoca sayfayı herkese gösterdi.", "hattat.lose":"Mürekkep devrildi; sayfa da önlüğün de lekelendi.",
  "ezber.win":"Uzun kasideyi su gibi okudun; meclis parmak ısırdı.", "ezber.lose":"Ezberin ortasında düğümlendin; kaldığın yeri hoca fısıldadı.",
  "harita.win":"Hocanın duvar haritasında ters çizilmiş nehri sen fark ettin; hoca göz dediğin böyle olur diye övdü.", "harita.lose":"Haritada kendi köyünü bulamadın; arka sıralar kıkırdadı.",
  "misafir.win":"Mektebe uğrayan gezgin âlime cesaretle bir soru sordun; âlim adını defterine yazdı.", "misafir.lose":"Âlimin karşısında sesin kısıldı; sorun içinde kaldı.",
  "bahce.win":"Mektep bahçesinde fidan diktin, kuyudan su çektin; akşama hem yorgun hem toktun.", "bahce.lose":"Öğle güneşinde fazla kaldın; başın döndü.",
};
// Mektep kulüpleri (Vercel school.py öğrenci topluluğu): okul çağında (7-17) haftalık pasif beceri XP'si.
export interface SchoolClub { id: string; skill: SkillKey; }
export const CLUBS: SchoolClub[] = [{ id: "koro", skill: "social" }, { id: "gures", skill: "combat" }, { id: "cirak", skill: "crafting" }];
const CLUB_TR: Record<string, string> = { koro: "Koro", gures: "Güreş", cirak: "Çıraklık" };
export function joinClub(prev: GameState, id: string | null): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead) return s;
  if (!id) { p.club = undefined; return s; }       // ayrılmak her yaşta serbest
  if (p.age < 7 || p.age >= 18) return s;            // kulübe yalnız okul çağında (7-17) katılınır (yetişkin katılıp bedava mezuniyet XP'si farmlayamaz)
  if (!CLUBS.find((c) => c.id === id)) return s;
  if (p.club !== id) p.club_standing = 0; // başka kulübe geçince itibar sıfırdan
  p.club = id;
  push(s, "mektep", `${CLUB_TR[id]} kulübüne katıldın; her ay sessizce gelişeceksin.`, "kişisel", false, { k: "club.join." + id });
  return s;
}
// Bir ders çalış — ayda 1 ders sınırı + 4 derste bir sınav (school.py portu).
export function studySubject(prev: GameState, id: string): StudyResult {
  const s = clone(prev); const p = s.player;
  if (p.dead) return { state: s, key: "", chips: [] };
  if (p.age < 7 || p.age >= 18) return { state: s, key: "", chips: [], blocked: true }; // mektep yalnız okul çağında (7-17) — yetişkin bedava puan/sınav farmlayamaz (joinClub/clubPractice ile aynı kapı)
  if (studyEnergy(s) < STUDY_COST) return { state: s, key: "", chips: [], blocked: true }; // çalışma gücü yetmiyor
  p.study_energy = studyEnergy(s) - STUDY_COST;
  p.lesson_count = (p.lesson_count || 0) + 1;
  p.hunger = Math.max(0, p.hunger - 5);
  addStatXp(s, EXAM_STAT[id] || "intelligence", 5); // dersin özelliği tecrübeyle gelişir
  const lucky = chance(hasPerk(p, "mucit") ? 0.75 : 0.5);
  const statBonus = chance(hasPerk(p, "mucit") ? 0.35 : 0.12); // mucit şansı ~3 katlar ama GARANTİLEMEZ (garanti = yılda 24 puan, ekonomi kırılıyordu)
  const chips: { label: string; col: string; k?: string; p?: (string | number)[] }[] = [];
  let key = "";
  const seasoned = (p.exam_wins || 0) >= 3; // yerleşik öğrenci: bundan sonra okul puan değil ustalık (statXp) verir — tavan ezilmez, okul değerli kalır
  p.teacherBond = (p.teacherBond || 0) + 1; // hoca bağı çalıştıkça güçlenir
  if (p.teacherBond % 12 === 0) {
    if (!seasoned) { p.stat_points += 1; chips.push({ label: "Hoca takdiri · Puan +1", col: "#E0BC5A", k: "chip.bond" }); push(s, "mektep", "Hocan emeğini gördü ve seni takdir etti (özellik puanı).", "kişisel", true, { k: "club.bond" }); }
    else { addStatXp(s, "intelligence", 10); chips.push({ label: "Hoca takdiri · Ustalık", col: "#E0BC5A", k: "chip.ustalik" }); }
  }
  if (id === "din") {
    bumpNam(p, "dindar", 4); chips.push({ label: "Dindar +4", col: "#9C7BC4", k: "chip.dindar", p: ["+4"] });
    if (lucky) { p.honor = Math.min(100, p.honor + 2); chips.push({ label: "Şeref +2", col: "#7FA66A", k: "chip.honor", p: ["+2"] }); key = "ev.study.din.l"; push(s, "mektep", "Dini ilimler okudun; gönlün huzur buldu.", "kişisel", false, { k: key }); }
    else { const dv = chance(0.5); key = dv ? "ev.study.din.p2" : "ev.study.din.p"; push(s, "mektep", dv ? "Hoca kıssayı yarıda kesti: \"Gerisini siz düşünün.\" Yol boyu düşündün." : "Mektepte dua ve hikmet dinledin.", "kişisel", false, { k: key }); }
  } else if (id === "matematik") {
    if (p.trade_xp_turn !== s.turn) { p.trade_xp_turn = s.turn; gainSkill(s, "trade", 5); } // al-sat XP: tur başına tek (buğday al-sat döngüsüyle beceri farmı kapatıldı); chips.push({ label: "Ticaret +5", col: "#C9A84C", k: "chip.trade", p: ["+5"] });
    if (statBonus && !seasoned) { p.stat_points += 1; chips.push({ label: "Özellik Puanı +1", col: "#E0BC5A", k: "chip.statpt" }); key = "ev.study.matematik.l"; push(s, "mektep", "Hesap çalıştın; bir özellik puanı kazandın.", "kişisel", false, { k: key }); }
    else { addStatXp(s, "intelligence", 6); const dv = chance(0.5); key = dv ? "ev.study.matematik.p2" : "ev.study.matematik.p"; push(s, "mektep", dv ? "Çarpım yanlış çıktı, hoca değneği rahleye vurdu; ikinci hesapta rakamlar hizaya geldi." : "Rakamlarla boğuştun.", "kişisel", false, { k: key }); }
  } else if (id === "edebiyat") {
    gainSkill(s, "social", 5); chips.push({ label: "Sosyal +5", col: "#C9A84C", k: "chip.social", p: ["+5"] });
    if (statBonus && !seasoned) { p.stat_points += 1; chips.push({ label: "Özellik Puanı +1", col: "#E0BC5A", k: "chip.statpt" }); key = "ev.study.edebiyat.l"; push(s, "mektep", "Edebiyat çalıştın; bir özellik puanı kazandın.", "kişisel", false, { k: key }); }
    else { addStatXp(s, "charisma", 6); const dv = chance(0.5); key = dv ? "ev.study.edebiyat.p2" : "ev.study.edebiyat.p"; push(s, "mektep", dv ? "Bir beyit diline takıldı; eve dönene dek mırıldandın." : "Beyitler ezberledin.", "kişisel", false, { k: key }); }
  } else {
    gainSkill(s, "combat", 5); chips.push({ label: "Savaş +5", col: "#C9A84C", k: "chip.combat", p: ["+5"] });
    if (statBonus && !seasoned) { p.stat_points += 1; chips.push({ label: "Özellik Puanı +1", col: "#E0BC5A", k: "chip.statpt" }); key = "ev.study.beden.l"; push(s, "mektep", "Beden çalıştın; bir özellik puanı kazandın.", "kişisel", false, { k: key }); }
    else { addStatXp(s, "strength", 6); const dv = chance(0.5); key = dv ? "ev.study.beden.p2" : "ev.study.beden.p"; push(s, "mektep", dv ? "Avluda koşu vardı; sonuncu gelmedin — bu da bir başlangıç." : "Ter döktün, güçlendin.", "kişisel", false, { k: key }); }
  }
  // ── Ders-içi olay (Vercel school.py ders olayları): %40, stat testli; "cesur" sonuç anlatılır ──
  if (chance(0.4)) {
    const ev = rnd(SCHOOL_EVENTS);
    const pass = Math.random() < Math.min(0.9, 0.4 + effStat(p, ev.stat) * 0.06);
    const w = pass ? "win" : "lose";
    if (ev.id === "kopya") { if (pass) { p.honor = Math.min(100, p.honor + 4); chips.push({ label: "Şeref +4", col: "#7FA66A", k: "chip.honor", p: ["+4"] }); } else { p.honor = Math.max(0, p.honor - 3); p.reputation = Math.max(-100, p.reputation - 2); chips.push({ label: "Şeref −3", col: "#C0556B", k: "chip.honor", p: ["−3"] }); } }
    else if (ev.id === "kavga") { if (pass) { p.honor = Math.min(100, p.honor + 5); p.reputation = Math.min(100, p.reputation + 2); p.health = Math.max(1, p.health - 3); chips.push({ label: "Şeref +5", col: "#7FA66A", k: "chip.honor", p: ["+5"] }); } else { p.health = Math.max(1, p.health - 5); chips.push({ label: "Sağlık −5", col: "#C0556B", k: "chip.health", p: ["−5"] }); } }
    else if (ev.id === "siir") { if (pass) { gainSkill(s, "social", 8); p.fame = Math.min(100, p.fame + 1); chips.push({ label: "Sosyal +8", col: "#C9A84C", k: "chip.social", p: ["+8"] }); } else { p.honor = Math.max(0, p.honor - 1); } }
    else if (ev.id === "soru") { if (pass) { if (!seasoned) { p.stat_points += 1; chips.push({ label: "Özellik Puanı +1", col: "#E0BC5A", k: "chip.statpt" }); } else { addStatXp(s, EXAM_STAT[id] || "intelligence", 10); chips.push({ label: "Ustalık", col: "#E0BC5A", k: "chip.ustalik" }); } } }
    else if (ev.id === "yaramazlik") { if (pass) { bumpNam(p, "capkin", 2); } else { p.honor = Math.max(0, p.honor - 2); chips.push({ label: "Şeref −2", col: "#C0556B", k: "chip.honor", p: ["−2"] }); } }
    else if (ev.id === "yardim") { if (pass) { p.honor = Math.min(100, p.honor + 3); gainSkill(s, "social", 6); chips.push({ label: "Sosyal +6", col: "#C9A84C", k: "chip.social", p: ["+6"] }); } }
    else if (ev.id === "hattat") { if (pass) { gainSkill(s, "crafting", 8); chips.push({ label: "Zanaat +8", col: "#C9A84C", k: "chip.craft", p: ["+8"] }); } else { p.honor = Math.max(0, p.honor - 1); } }
    else if (ev.id === "ezber") { if (pass) { addStatXp(s, "intelligence", 8); p.fame = Math.min(100, p.fame + 1); chips.push({ label: "Ustalık", col: "#E0BC5A", k: "chip.ustalik" }); } }
    else if (ev.id === "harita") { if (pass) { addStatXp(s, "intelligence", 8); chips.push({ label: "Ustalık", col: "#E0BC5A", k: "chip.ustalik" }); } else { p.honor = Math.max(0, p.honor - 1); } }
    else if (ev.id === "misafir") { if (pass) { gainSkill(s, "social", 8); p.fame = Math.min(100, p.fame + 1); chips.push({ label: "Sosyal +8", col: "#C9A84C", k: "chip.social", p: ["+8"] }); } else { p.honor = Math.max(0, p.honor - 1); } }
    else { if (pass) { addStatXp(s, "stamina", 6); p.hunger = Math.min(100, p.hunger + 2); chips.push({ label: "Ustalık", col: "#C9A84C", k: "chip.ustalik" }); } else { p.health = Math.max(1, p.health - 2); chips.push({ label: "Sağlık −2", col: "#C0556B", k: "chip.health", p: ["−2"] }); } }
    push(s, "mektep", `Mektep: ${SCHOOL_EV_TR[ev.id + "." + w]}`, "kişisel", false, { k: "sch." + ev.id + "." + w });
  }
  // ── Sınav: her 4 derste bir (ilgili statla test) ──
  if (p.lesson_count % 4 === 0) {
    const passed = Math.random() < Math.min(0.9, 0.35 + effStat(p, EXAM_STAT[id] || "intelligence") * 0.12);
    if (passed) {
      p.exam_wins = (p.exam_wins || 0) + 1;
      if (p.exam_wins <= 3) { p.stat_points += 1; chips.push({ label: "Sınav geçildi · Puan +1", col: "#E0BC5A", k: "chip.exam" }); push(s, "mektep", "Sınava girdin ve geçtin — bir özellik puanı kazandın.", "kişisel", true, { k: "evj.examPass" }); }
      else { addStatXp(s, EXAM_STAT[id] || "intelligence", 15); chips.push({ label: "Sınav geçildi · Tecrübe", col: "#E0BC5A", k: "chip.examXp" }); push(s, "mektep", "Sınavı yine geçtin; artık puandan çok ustalık birikiyor.", "kişisel", false, { k: "evj.examPassXp" }); }
    }
    else { chips.push({ label: "Sınavda zorlandın", col: "#C0556B", k: "chip.examFail" }); push(s, "mektep", "Sınava girdin ama zorlandın; daha çok çalışmalısın.", "kişisel", false, { k: "evj.examFail" }); }
  }
  return { state: s, key, chips };
}

// Kulüpte meşk et — ayda 1, kulüp çağında (7-17). Aktif çalışma: derse ek, kulübe özgü sonuç + kulüp itibarı.
export function clubPractice(prev: GameState): StudyResult {
  const s = clone(prev); const p = s.player;
  if (p.dead || !p.club) return { state: s, key: "", chips: [] };
  if (p.age < 7 || p.age >= 18) return { state: s, key: "", chips: [], blocked: true };
  if (studyEnergy(s) < STUDY_COST) return { state: s, key: "", chips: [], blocked: true }; // çalışma gücü yetmiyor
  p.study_energy = studyEnergy(s) - STUDY_COST;
  p.hunger = Math.max(0, p.hunger - 4);
  const chips: { label: string; col: string; k?: string; p?: (string | number)[] }[] = [];
  let gain = 1; let key = "";
  if (p.club === "gures") {
    const win = Math.random() < Math.min(0.9, 0.4 + effStat(p, "strength") * 0.05);
    if (win) { gainSkill(s, "combat", 10); addStatXp(s, "strength", 4); p.fame = Math.min(100, p.fame + 2); gain = 2;
      chips.push({ label: "Dövüş +10", col: "#C9A84C", k: "chip.fight", p: ["+10"] }, { label: "Şöhret +2", col: "#7B4FAF", k: "chip.fame", p: ["+2"] }); key = "club.gures.win";
      push(s, "mektep", "Güreş minderinde rakibini yendin; adın delikanlılar arasında anıldı.", "kişisel", true, { k: "club.gures.win" }); }
    else { gainSkill(s, "combat", 4); p.health = Math.max(1, p.health - 3);
      chips.push({ label: "Dövüş +4", col: "#C9A84C", k: "chip.fight", p: ["+4"] }, { label: "Sağlık −3", col: "#C0556B", k: "chip.health", p: ["−3"] }); key = "club.gures.lose";
      push(s, "mektep", "Güreşte sırtın yere geldi; ama mindere her düşüş bir ders.", "kişisel", false, { k: "club.gures.lose" }); }
  } else if (p.club === "cirak") {
    gainSkill(s, "crafting", 10); addStatXp(s, "intelligence", 2);
    const pay = 5 + Math.floor(Math.random() * 12); p.money += pay;
    chips.push({ label: "Zanaat +10", col: "#C9A84C", k: "chip.craft", p: ["+10"] }, { label: `+${pay} akçe`, col: "#E0BC5A", k: "chip.coin", p: [pay] }); key = "club.cirak.win";
    push(s, "mektep", "Ustanın yanında bir işi bitirdin; emeğinin karşılığını cebine koydun.", "kişisel", true, { k: "club.cirak.win", p: [pay] });
  } else { // koro
    const win = Math.random() < Math.min(0.9, 0.4 + effStat(p, "charisma") * 0.05);
    if (win) { gainSkill(s, "social", 10); addStatXp(s, "charisma", 4); p.reputation = Math.min(100, p.reputation + 1); gain = 2;
      chips.push({ label: "Sosyal +10", col: "#C9A84C", k: "chip.social", p: ["+10"] }, { label: "İtibar +1", col: "#7FA66A", k: "chip.rep", p: ["+1"] }); key = "club.koro.win";
      push(s, "mektep", "Koroda sesin meclisi büyüledi; el üstünde tutuldun.", "kişisel", true, { k: "club.koro.win" }); }
    else { gainSkill(s, "social", 4);
      chips.push({ label: "Sosyal +4", col: "#C9A84C", k: "chip.social", p: ["+4"] }); key = "club.koro.lose";
      push(s, "mektep", "Koroda biraz tutuldun ama gayretten geri durmadın.", "kişisel", false, { k: "club.koro.lose" }); }
  }
  p.club_standing = (p.club_standing || 0) + gain;
  if (p.club_standing % 12 === 0) { p.stat_points += 1; chips.push({ label: "Kulüp ustalığı · Puan +1", col: "#E0BC5A", k: "chip.club" }); push(s, "mektep", "Kulüpte göze girdin; ustalığın bir özellik puanıyla taçlandı.", "kişisel", true, { k: "club.milestone" }); }
  return { state: s, key, chips };
}

// Çocukluk uğraşları (7-12): okul çağı öncesi/yanı sıra çocuğa hareket alanı. Çalışma gücünden harcar.
export type ChildAct = "oyun" | "yardim" | "yaramazlik" | "kesif";
export function childAction(prev: GameState, kind: ChildAct): StudyResult {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age >= 13 || inJail(p)) return { state: s, key: "", chips: [] };
  if (playEnergy(s) < PLAY_COST) return { state: s, key: "", chips: [], blocked: true };
  p.play_energy = playEnergy(s) - PLAY_COST;
  p.child_acts = p.child_acts || {}; p.child_acts[kind] = (p.child_acts[kind] || 0) + 1; // çocukluk eğilimi birikir
  const chips: { label: string; col: string; k?: string; p?: (string | number)[] }[] = []; let key = "";
  if (kind === "oyun") {
    p.health = Math.min(100, p.health + 5); addStatXp(s, "stamina", 4); gainSkill(s, "social", 4);
    chips.push({ label: "Sağlık +5", col: "#7FA66A" }, { label: "Dayanıklılık ↑", col: "#C9A84C" });
    if (!p.child_friend) { // ilk oyunda bir can yoldaşı belirir
      const seed = (Math.floor(Math.random() * 1e9)) >>> 0;
      const gender: "erkek" | "kadın" = Math.random() < 0.5 ? "erkek" : "kadın";
      p.child_friend = { id: `cf_${s.turn}_${seed % 100000}`, seed, gender, bond: 14 };
      chips.push({ label: "Yeni yoldaş", col: "#C0556B" }); key = "child.friend.new";
      push(s, "cocukluk", "Oyun sırasında bir can yoldaşı edindin; günler artık daha şen.", "kişisel", true, { k: "child.friend.new", p: [{ fn: [seed, gender] }] });
    } else { // her oyun bağı güçlendirir
      const before = p.child_friend.bond;
      p.child_friend.bond = Math.min(100, before + 8 + Math.floor(Math.random() * 5));
      chips.push({ label: "Bağ ↑", col: "#C0556B" });
      const cf = p.child_friend;
      if (before < 50 && cf.bond >= 50) { key = "child.friend.close"; push(s, "cocukluk", "Yoldaşınla aranızdaki bağ pekişti; sırdaş oldunuz.", "kişisel", true, { k: "child.friend.close", p: [{ fn: [cf.seed, cf.gender] }] }); }
      else if (Math.random() < 0.35) { // küçük ortak macera (oyunu çeşitlendirir)
        const adv = Math.floor(Math.random() * 6);
        if (adv === 0) { addStatXp(s, "intelligence", 4); chips.push({ label: "Zekâ ↑", col: "#6FA0C0" }); key = "child.adv.nest"; push(s, "cocukluk", "Yoldaşınla bir kuş yuvası buldunuz; saatlerce izleyip merak ettiniz.", "kişisel", false, { k: "child.adv.nest", p: [{ fn: [cf.seed, cf.gender] }] }); }
        else if (adv === 1) { addStatXp(s, "stamina", 4); p.health = Math.min(100, p.health + 3); chips.push({ label: "Dayanıklılık ↑", col: "#C9A84C" }); key = "child.adv.hide"; push(s, "cocukluk", "Saklambaçta sokağın bütün köşelerini avucunuzun içi gibi öğrendiniz.", "kişisel", false, { k: "child.adv.hide" }); }
        else if (adv === 2) { const coin = 2 + Math.floor(Math.random() * 6); p.money += coin; chips.push({ label: `+${coin} akçe`, col: "#E0BC5A" }); key = "child.adv.find"; push(s, "cocukluk", "Yıkık bir duvarın dibinde eski bir akçe buldunuz; paylaştınız.", "kişisel", false, { k: "child.adv.find", p: [coin] }); }
        else if (adv === 3) { cf.bond = Math.min(100, cf.bond + 5); bumpNam(p, "mert", 2); chips.push({ label: "Bağ ↑↑", col: "#C0556B" }); key = "child.adv.bully"; push(s, "cocukluk", "Bir kabadayı yolunuzu kesti; yoldaşınla sırt sırta verip göğüs gerdiniz, bağınız perçinlendi.", "kişisel", true, { k: "child.adv.bully", p: [{ fn: [cf.seed, cf.gender] }] }); }
        else if (adv === 4) { addStatXp(s, "stamina", 3); gainSkill(s, "social", 3); chips.push({ label: "Dayanıklılık ↑", col: "#C9A84C" }); key = "child.adv.stone"; push(s, "cocukluk", "Dere kenarında taş sektirme yarışına tutuştunuz; senin taşın beş kere sekti, zafer nârası attınız.", "kişisel", false, { k: "child.adv.stone", p: [{ fn: [cf.seed, cf.gender] }] }); }
        else { addStatXp(s, "intelligence", 4); chips.push({ label: "Zekâ ↑", col: "#6FA0C0" }); key = "child.adv.fountain"; push(s, "cocukluk", "Eski çeşmenin taşındaki silik yazıyı sökmeye çalıştınız; yarısını okudun, gerisini masal edip anlattın.", "kişisel", false, { k: "child.adv.fountain" }); }
      }
      else { key = "child.oyun"; push(s, "cocukluk", "Yoldaşınla sokakta oyun oynadınız; soluk soluğa ama mutlu.", "kişisel", false, { k: "child.oyun" }); }
    }
  } else if (kind === "yardim") {
    const earn = 3 + Math.floor(Math.random() * 6); p.money += earn; p.reputation = Math.min(100, p.reputation + 1); gainSkill(s, "crafting", 4);
    chips.push({ label: `+${earn} akçe`, col: "#E0BC5A" }, { label: "İtibar +1", col: "#7FA66A", k: "chip.rep", p: ["+1"] }); key = "child.yardim";
    push(s, "cocukluk", "Ev işlerinde aileye el verdin; eline biraz harçlık geçti.", "kişisel", false, { k: "child.yardim", p: [earn] });
  } else if (kind === "yaramazlik") {
    // Yoldaşın varsa bazen yaramazlık onu da sırtından vurur → dargınlık birikir (rakipliğe giden yol).
    if (p.child_friend && Math.random() < 0.25) {
      p.child_friend.bond = Math.max(0, p.child_friend.bond - 10); p.child_friend.feud = (p.child_friend.feud || 0) + 1;
      chips.push({ label: "Dargınlık", col: "#C0556B" }); key = "child.feud";
      push(s, "cocukluk", "Yaramazlığın yoldaşına patladı; aranıza bir soğukluk girdi.", "kişisel", false, { k: "child.feud", p: [{ fn: [p.child_friend.seed, p.child_friend.gender] }] });
    } else if (Math.random() < 0.5) { bumpNam(p, "capkin", 2); gainSkill(s, "social", 5); p.health = Math.min(100, p.health + 2);
      chips.push({ label: "Sosyal +5", col: "#C9A84C", k: "chip.social", p: ["+5"] }); key = "child.yaramazlik.win";
      push(s, "cocukluk", "Bir yaramazlık çevirdin ve yakayı sıyırdın; akranların kıkırdadı.", "kişisel", false, { k: "child.yaramazlik.win" }); }
    else { p.reputation = Math.max(-100, p.reputation - 2); p.honor = Math.max(0, p.honor - 1);
      chips.push({ label: "İtibar −2", col: "#C0556B" }); key = "child.yaramazlik.lose";
      push(s, "cocukluk", "Yaramazlığın elinde patladı; yakalanıp azar işittin.", "kişisel", false, { k: "child.yaramazlik.lose" }); }
  } else { // kesif
    const r = Math.random();
    if (r < 0.4) { const coin = 2 + Math.floor(Math.random() * 8); p.money += coin; chips.push({ label: `+${coin} akçe`, col: "#E0BC5A" }); key = "child.kesif.coin"; push(s, "cocukluk", "Çarşıyı arşınlarken yerde birkaç akçe buldun.", "kişisel", false, { k: "child.kesif.coin", p: [coin] }); }
    else if (r < 0.65) { const g = rnd(["ekmek", "bal", "sifa", "balik"]); p.inventory[g] = (p.inventory[g] || 0) + 1; chips.push({ label: `+${ITEMS[g]?.name || g}`, col: "#7FA66A" }); key = "child.kesif.item"; push(s, "cocukluk", "Keşfe çıktın; iyi kalpli biri eline bir şey tutuşturdu.", "kişisel", false, { k: "child.kesif.item", p: [{ i: g }] }); }
    else { addStatXp(s, "intelligence", 4); chips.push({ label: "Zekâ ↑", col: "#6FA0C0" }); key = "child.kesif.none"; push(s, "cocukluk", "Diyarı merakla gezdin; gördüklerin aklına kazındı.", "kişisel", false, { k: "child.kesif.none" }); }
  }
  return { state: s, key, chips };
}

// Çocukluk karakteri etiketleri (reşitlikte belirlenir; karakter ekranında gösterilir).
export const CHILDHOOD_LABEL: Record<string, string> = { hasari: "Haşarı", uslu: "Uslu", canli: "Canlı", merakli: "Meraklı" };
// Reşit olurken çocukluk eğilimini değerlendir: baskın uğraş kalıcı bir başlangıç izi bırakır.
function shapeChildhood(s: GameState) {
  const p = s.player; const c = p.child_acts || {};
  // Oyun yoldaşı: bağ güçlüyse seninle birlikte büyür ve ömürlük gerçek bir dosta dönüşür (ilişki grafiğine girer).
  const cf = p.child_friend;
  const bornFriend = () => { // yoldaşı gerçek bir doğmuş NPC olarak ilişki grafiğine al (dost ya da rakip)
    if (!s.world.npcBorn) s.world.npcBorn = [];
    if (!s.world.npcBorn.some((n) => n.id === cf!.id)) {
      const tmpl = generateNPCs((cf!.seed ^ 0x5bd1e995) >>> 0, 1, "tr", "cf")[0];
      s.world.npcBorn.push({ ...tmpl, id: cf!.id, gender: cf!.gender, nameSeed: cf!.seed, loc: p.location_name, alive: true, age: p.age, bornY: worldYears(s) });
    }
  };
  if (cf && (cf.feud || 0) >= 2 && cf.bond < 50) { // dargınlık büyüdü → çocukluk rakibi (nemesis'e giden yol)
    bornFriend();
    s.relationships[cf.id] = Math.min(s.relationships[cf.id] ?? 0, -60); // nemesis eşiğinin (−55) altına in — "nemesis'e giden yol" gerçekten işlesin
    push(s, "cocukluk", "Çocukluk yoldaşınla aranıza kan girdi; o artık bir rakip — yolunuz hep kesişecek.", "kişisel", true, { k: "child.friend.rival", p: [{ fn: [cf.seed, cf.gender] }] });
  } else if (cf && cf.bond >= 40) {
    bornFriend();
    s.relationships[cf.id] = Math.max(s.relationships[cf.id] || 0, Math.min(80, cf.bond));
    push(s, "cocukluk", "Çocukluk yoldaşın seninle birlikte büyüdü; artık ömürlük bir dostun var.", "kişisel", true, { k: "child.friend.grown", p: [{ fn: [cf.seed, cf.gender] }] });
  } else if (cf) {
    push(s, "cocukluk", "Çocukluk yoldaşınla yollarınız ayrıldı; çocukluk işte, gelip geçti.", "kişisel", false, { k: "child.friend.lost", p: [{ fn: [cf.seed, cf.gender] }] });
  }
  // Çocukluk hayali: edindiğin meslek hayalinin domeniyle örtüşürse hayal gerçek olur (ödül); yoksa başka bahara kalır.
  if (p.child_dream) {
    const got = (PROF_SKILL[p.profession] || "crafting") === p.child_dream;
    if (got) { p.stat_points += 1; p.reputation = Math.min(100, p.reputation + 4); push(s, "cocukluk", "Çocukluk hayalin gerçek oldu — hayalini kurduğun yola düştün (özellik puanı + itibar).", "kişisel", true, { k: "evj.dreamWin", p: [{ dreamk: p.child_dream }] }); }
    else push(s, "cocukluk", "Çocukluk hayalin başka bahara kaldı; hayat seni başka bir yola çağırdı.", "kişisel", false, { k: "evj.dreamMiss", p: [{ dreamk: p.child_dream }] });
  }
  const total = (c.oyun || 0) + (c.yardim || 0) + (c.yaramazlik || 0) + (c.kesif || 0);
  if (total < 4) return; // yeterince çocukluk geçirmedi → nötr başlar
  const entries: [string, number][] = [["yaramazlik", c.yaramazlik || 0], ["yardim", c.yardim || 0], ["oyun", c.oyun || 0], ["kesif", c.kesif || 0]];
  entries.sort((a, b) => b[1] - a[1]);
  const dom = entries[0][0];
  if (dom === "yaramazlik") { p.childhood = "hasari"; p.fear = Math.min(100, p.fear + 6); p.honor = Math.max(0, p.honor - 3); bumpNam(p, "capkin", 8); gainSkill(s, "social", 40);
    push(s, "cocukluk", "Haşarı bir çocuk olarak büyüdün; sokağın diline çabuk düştün, kimse sana laf geçiremedi.", "kişisel", true, { k: "child.grow.hasari" }); }
  else if (dom === "yardim") { p.childhood = "uslu"; p.reputation = Math.min(100, p.reputation + 6); p.honor = Math.min(100, p.honor + 4); bumpNam(p, "comert", 6); bumpNam(p, "mert", 4);
    push(s, "cocukluk", "Uslu, eli işe yatkın bir çocuk olarak büyüdün; mahalle seni hayırla anar.", "kişisel", true, { k: "child.grow.uslu" }); }
  else if (dom === "oyun") { p.childhood = "canli"; if (p.stats.stamina < 10) p.stats.stamina += 1; p.health = Math.min(100, p.health + 6); gainSkill(s, "social", 30);
    push(s, "cocukluk", "Canlı, çevik bir çocuk olarak büyüdün; bedenin sağlam, dilin tatlı.", "kişisel", true, { k: "child.grow.canli" }); }
  else { p.childhood = "merakli"; if (p.stats.intelligence < 10) p.stats.intelligence += 1; gainSkill(s, "trade", 25); gainSkill(s, "crafting", 25);
    push(s, "cocukluk", "Meraklı, gözü açık bir çocuk olarak büyüdün; her şeyi sorar, çabuk kaparsın.", "kişisel", true, { k: "child.grow.merakli" }); }
}

// İhtiyarlık uğraşları (55+): hayatın akşamına anlam — nasihat, hayır, dinlenme, anı. Çalışma gücünden harcar.
export type ElderAct = "nasihat" | "hayir" | "dinlen" | "ani" | "tekke";
// ── Olgunluk uğraşları (18-54): "ölü bölge" doldu — atıl duran aylık çalışma gücü artık işliyor.
// Yetişkinde enerji 2 = ayda TEK uğraş (yapısal farm engeli). Karizma/dayanıklılığın yetişkinlikte
// hiç büyüyememe deliği de burada kapanır: dört uğraş dört statı besler.
export type AdultAct = "talim" | "meclis" | "tefekkur" | "yuruyus" | "ibadet";
export const ADULT_TRAINER_COST = 10;
export function adultAction(prev: GameState, kind: AdultAct): StudyResult {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 18 || p.age >= 55 || inJail(p)) return { state: s, key: "", chips: [] }; // hücrede talim/meclis yok — ceza bedava çalışma süresine dönmesin
  if (studyEnergy(s) < STUDY_COST) return { state: s, key: "", chips: [], blocked: true };
  const chips: { label: string; col: string; k?: string; p?: (string | number)[] }[] = []; let key = "";
  // Uğraşlar saf XP tıkı değil: her birinde düşük olasılıklı risk/parlak an — orta oyunun ayına gerilim katar.
  // Ödüller XP/ilişki cinsinden ve tavanlı (para musluğu YOK); riskler küçük ve effStat ile yumuşar. Enerji kapısı (turda 1) farm'ı zaten keser.
  if (kind === "talim") {
    if (p.money < ADULT_TRAINER_COST) { chips.push({ label: "Akçe yok", col: "#C0556B" }); return { state: s, key: "evj.noCoin", chips, blocked: true };
    }
    p.study_energy = studyEnergy(s) - STUDY_COST;
    p.money -= ADULT_TRAINER_COST; p.hunger = Math.max(0, p.hunger - 6);
    addStatXp(s, "strength", 5); gainSkill(s, "combat", 4);
    key = "adult.talim";
    const r = Math.random();
    if (r < Math.max(0.03, 0.10 - effStat(p, "stamina") * 0.008)) { // acemilik sakatlar; dayanıklılık korur
      const hurt = 3 + Math.floor(Math.random() * 4); p.health = Math.max(1, p.health - hurt);
      chips.push({ label: `Sakatlık -${hurt}`, col: "#C0556B", k: "chip.talimHurt", p: [hurt] });
      push(s, "olgunluk", `Talimde ters düştün; bir yerini incittin (sağlık -${hurt}).`, "kişisel", false, { k: "adult.talimHurt", p: [hurt] });
    } else if (r > 0.88) { // parlak gün: hoca övdü
      addStatXp(s, "strength", 4); gainSkill(s, "combat", 4); bumpNam(p, "mert", 1);
      push(s, "olgunluk", "Talimde herkesi geride bıraktın; hoca adını övdü.", "kişisel", false, { k: "adult.talimShine" });
    } else push(s, "olgunluk", "Talim meydanında ter döktün; kollar hatırlar.", "kişisel", false, { k: "adult.talim" });
  } else if (kind === "meclis") {
    p.study_energy = studyEnergy(s) - STUDY_COST;
    p.hunger = Math.max(0, p.hunger - 4);
    addStatXp(s, "charisma", 5); gainSkill(s, "social", 4); p.reputation = Math.min(100, p.reputation + 1);
    key = "adult.meclis";
    const r = Math.random();
    if (r < Math.max(0.03, 0.09 - effStat(p, "charisma") * 0.007)) { // yanlış söz: dedikodu tohumu
      p.reputation = Math.max(-100, p.reputation - 3); witnessScandal(s, "tatsiz_konu", 0.2);
      push(s, "olgunluk", "Mecliste ağzından yanlış bir laf kaçtı; kulaktan kulağa yayıldı.", "kişisel", false, { k: "adult.meclisSlip" });
    } else if (r > 0.88) { // sözün mecliste karşılık buldu: yeni bir tanışlık
      const who = rosterAt(s, p.location_name).find((n) => (s.relationships[n.id] || 0) < 30);
      if (who) { s.relationships[who.id] = Math.min(100, (s.relationships[who.id] || 0) + 8); push(s, "olgunluk", `Mecliste sözün dikkat çekti; ${who.name} ile aranızda hukuk doğdu.`, "kişisel", false, { k: "adult.meclisAlly", p: [who.name] }); }
      else push(s, "olgunluk", "Sohbet meclisinde söz aldın; lafın dinlenir oldu.", "kişisel", false, { k: "adult.meclis" });
    } else push(s, "olgunluk", "Sohbet meclisinde söz aldın; lafın dinlenir oldu.", "kişisel", false, { k: "adult.meclis" });
  } else if (kind === "tefekkur") {
    p.study_energy = studyEnergy(s) - STUDY_COST;
    addStatXp(s, "intelligence", 5); gainSkill(s, "trade", 3);
    key = "adult.tefekkur";
    if (Math.random() > 0.86) { // hesap defterinde bir açık/fırsat gördün: ticaret sezgisi keskinleşir
      gainSkill(s, "trade", 5); addStatXp(s, "intelligence", 3);
      push(s, "olgunluk", "Hesapların arasında kimsenin görmediği bir düzen fark ettin; tüccar aklın keskinleşti.", "kişisel", false, { k: "adult.tefekkurInsight" });
    } else push(s, "olgunluk", "Kitap ve hesap başında bir akşam; zihin bilenmeden durmaz.", "kişisel", false, { k: "adult.tefekkur" });
  } else if (kind === "ibadet") {
    // Dindar hayatın aktif döngüsü: gönül toplama — küçük tavanlı ödüller, para musluğu yok (enerji kapısı farm'ı keser).
    p.study_energy = studyEnergy(s) - STUDY_COST;
    p.hunger = Math.max(0, p.hunger - 3);
    bumpNam(p, "dindar", 3); p.reputation = Math.min(100, p.reputation + 1);
    key = "adult.ibadet";
    if (Math.random() > 0.88) { // derviş sohbeti: parlak an
      bumpNam(p, "dindar", 2); gainSkill(s, "social", 3); p.health = Math.min(100, p.health + 3);
      chips.push({ label: "Dindar +5", col: "#9C7BC4" }, { label: "Sağlık +3", col: "#7FA66A" });
      push(s, "olgunluk", "Tekkede bir dervişle sohbete daldın; içindeki düğüm çözüldü.", "kişisel", false, { k: "adult.ibadetDervis" });
    } else {
      p.health = Math.min(100, p.health + 2);
      chips.push({ label: "Dindar +3", col: "#9C7BC4" }, { label: "Sağlık +2", col: "#7FA66A" });
      { const iv = chance(0.5); push(s, "olgunluk", iv ? "Avluda ezan bitti, sen bir süre daha oturdun; acele eden dünyayı kapının dışında beklettin." : "İbadetini edip gönlünü topladın; için ferahladı.", "kişisel", false, { k: iv ? "adult.ibadet2" : "adult.ibadet" }); }
    }
  } else {
    p.study_energy = studyEnergy(s) - STUDY_COST;
    addStatXp(s, "stamina", 5); p.health = Math.min(100, p.health + 2);
    key = "adult.yuruyus";
    const r = Math.random();
    if (r < 0.05) { // yolda aksilik: hava döndü, ıslandın
      p.health = Math.max(1, p.health - 2); p.hunger = Math.max(0, p.hunger - 4);
      push(s, "olgunluk", "Yürüyüşte hava birden döndü; sırılsıklam döndün, ertesi gün burnun aktı.", "kişisel", false, { k: "adult.yuruyusRain" });
    } else if (r > 0.88) { // manzara iyi geldi: iç huzur
      p.health = Math.min(100, p.health + 3); addStatXp(s, "stamina", 3);
      push(s, "olgunluk", "Tepeden diyara baktın; içine bir genişlik, adımına bir kuvvet geldi.", "kişisel", false, { k: "adult.yuruyusVista" });
    } else push(s, "olgunluk", "Şehrin dışına uzun bir yürüyüş; beden dinç, kafa berrak.", "kişisel", false, { k: "adult.yuruyus" });
  }
  return { state: s, key, chips };
}

export function elderAction(prev: GameState, kind: ElderAct): StudyResult {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 55 || inJail(p)) return { state: s, key: "", chips: [] };
  if (studyEnergy(s) < STUDY_COST) return { state: s, key: "", chips: [], blocked: true };
  p.study_energy = studyEnergy(s) - STUDY_COST;
  const chips: { label: string; col: string; k?: string; p?: (string | number)[] }[] = []; let key = "";
  if (kind === "nasihat") {
    p.reputation = Math.min(100, p.reputation + 2); p.honor = Math.min(100, p.honor + 1); gainSkill(s, "social", 6);
    chips.push({ label: "İtibar +2", col: "#7FA66A" }, { label: "Şeref +1", col: "#6FA0C0" }); key = "elder.nasihat";
    push(s, "ihtiyarlik", "Gençlere ve torunlara akıl verdin; sözün hürmetle dinlendi.", "kişisel", false, { k: "elder.nasihat" });
  } else if (kind === "hayir") {
    const cost = Math.min(p.money, 12 + Math.floor(Math.random() * 10));
    if (cost <= 0) { // verecek akçe yoksa itibar/comert kazanılmaz (bedava "−0 akçe" hayır saçmalığı önlenir)
      chips.push({ label: "Akçe yok", col: "#C0556B" }); key = "evj.noAlms";
      push(s, "ihtiyarlik", `Hayır dağıtmak istedin ama kesen boştu.`, "kişisel", false, { k: "evj.noAlms" });
    } else {
      p.money -= cost; p.reputation = Math.min(100, p.reputation + 2); p.honor = Math.min(100, p.honor + 1); bumpNam(p, "comert", 5);
      chips.push({ label: `−${cost} akçe`, col: "#C0556B" }, { label: "İtibar +2", col: "#7FA66A" }, { label: "Cömert +5", col: "#7FA66A" }); key = "elder.hayir";
      push(s, "ihtiyarlik", `Yoksula sadaka, yolcuya aş dağıttın (−${cost} akçe); hayır duası aldın.`, "kişisel", false, { k: "elder.hayir", p: [cost] });
    }
  } else if (kind === "dinlen") {
    p.health = Math.min(100, p.health + 8); p.hunger = Math.min(100, p.hunger + 5);
    chips.push({ label: "Sağlık +8", col: "#7FA66A" }); key = "elder.dinlen";
    push(s, "ihtiyarlik", "Ocağın başında dinlenip biraz toparlandın; yaşlı beden mola ister.", "kişisel", false, { k: "elder.dinlen" });
  } else if (kind === "tekke") {
    // İhtiyarın manevi döngüsü: zikir gönlü dinlendirir — dindar nam yaşlılıkta da aktif işlenir.
    p.health = Math.min(100, p.health + 4); p.honor = Math.min(100, p.honor + 1); bumpNam(p, "dindar", 4);
    chips.push({ label: "Sağlık +4", col: "#7FA66A" }, { label: "Dindar +4", col: "#9C7BC4" }); key = "elder.tekke";
    push(s, "ihtiyarlik", "Tekkeye gidip zikre katıldın; yaşlı gönül gençleşti, için nurlandı.", "kişisel", false, { k: "elder.tekke" });
  } else {
    p.fame = Math.min(100, p.fame + 2); addStatXp(s, "intelligence", 6); gainSkill(s, "social", 4);
    chips.push({ label: "Şöhret +2", col: "#7B4FAF", k: "chip.fame", p: ["+2"] }); key = "elder.ani";
    push(s, "ihtiyarlik", "Ömrünün hikâyesini anlattın; adın dilden dile dolaşacak.", "kişisel", false, { k: "elder.ani" });
  }
  return { state: s, key, chips };
}

// ── Suç/Gölge: risk/ödül ──
// Suç türleri (Vercel crime_rework.py portu): risk/ödül kademeleri + şiddet.
export type CrimeKind = "yankesicilik" | "dukkan_soyma" | "soygun" | "konak_soygunu";
export const CRIME_TYPES: Record<CrimeKind, { base: number; lootMin: number; lootMax: number; fine: number; hurt: number; fear: number; nam: number; sev: number; label: string }> = {
  yankesicilik:  { base: 0.70, lootMin: 6,  lootMax: 22,  fine: 10, hurt: 3,  fear: 2, nam: 2, sev: 1, label: "Bir yankesicilik" },
  dukkan_soyma:  { base: 0.55, lootMin: 18, lootMax: 45,  fine: 22, hurt: 6,  fear: 4, nam: 4, sev: 2, label: "Bir dükkân soygunu" },
  soygun:        { base: 0.45, lootMin: 45, lootMax: 115, fine: 30, hurt: 10, fear: 5, nam: 5, sev: 3, label: "Bir yol soygunu" },
  konak_soygunu: { base: 0.34, lootMin: 90, lootMax: 200, fine: 50, hurt: 14, fear: 7, nam: 7, sev: 4, label: "Bir konak soygunu" },
};
// ── Suç merdiveni: ağır işlere ilk günden girilmez — yeraltında ad yapmak gerekir. ──
// Yeraltı namı = başarılı suçlar + korkulan ad (fear/5); Gölge Kardeşliği üyeliği eşiği yarıya indirir (kapıları kardeşlik açar).
export const CRIME_REQ: Record<CrimeKind, number> = { yankesicilik: 0, dukkan_soyma: 2, soygun: 6, konak_soygunu: 12 };
// ── Zindan ──
export function inJail(p: Player): boolean { return !!p.jail && p.jail.left > 0; }
export function jailBribeCost(s: GameState): number { return Math.round(80 * (s.player.jail?.left || 1) * inflationFactor(s)); }
export function bribeJailer(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (!inJail(p)) return s;
  const cost = jailBribeCost(s);
  if (p.money < cost) { push(s, "suç", `Gardiyanın gönlünü edecek akçen yok.`, "kişisel", false, { k: "jail.noFee" }); return s; }
  p.money -= cost; p.jail = null; p.honor = Math.max(0, p.honor - 2); bumpNam(p, "zalim", 1);
  push(s, "suç", `Gardiyanın avucuna kese sıkıştırdın; gece yarısı kapı gıcırdadı, gölge gibi süzüldün.`, "kişisel", true, { k: "jail.bribe", p: [cost] });
  return s;
}
export function underworldStanding(p: Player): number { return (p.crime_wins || 0) + Math.floor((p.fear || 0) / 5); }
export function crimeReq(p: Player, kind: CrimeKind): number {
  const base = CRIME_REQ[kind] ?? 0;
  return p.faction === "golge" ? Math.ceil(base / 2) : base;
}
export function crimeUnlocked(p: Player, kind: CrimeKind): boolean { return underworldStanding(p) >= crimeReq(p, kind); }
// Yeraltı mertebeleri: eşikler suç merdiveninin kilitleriyle hizalı (0/2/6/12) + doruk 20 — gölge kariyerini görünür kılar.
export const UNDERWORLD_TIERS = [0, 2, 6, 12, 20];
export function underworldTier(p: Player): number {
  const st = underworldStanding(p); let tier = 0;
  for (let i = 0; i < UNDERWORLD_TIERS.length; i++) if (st >= UNDERWORLD_TIERS[i]) tier = i;
  return tier;
}
export function doCrime(prev: GameState, kind: CrimeKind): GameState {
  const s = clone(prev); const p = s.player;
  if (inJail(p)) return s;
  if (p.dead || p.age < 13) return s;
  if (s.pendingScene) return s;                       // bekleyen yakalanma sahnesini ezerek ceza atlanamaz
  if (!crimeUnlocked(p, kind)) return s;               // merdiven: yeraltı namı yetmeden ağır iş yok (ay hakkı da yanmaz)
  if (p.last_crime_turn === s.turn) return s;          // ay başına tek suç denemesi (risksiz spam ile para basma önlenir)
  p.last_crime_turn = s.turn;
  const ct = CRIME_TYPES[kind] || CRIME_TYPES.yankesicilik;
  const golgeBonus = p.faction === "golge" ? 0.12 : 0;     // Gölge Kardeşliği avantajı
  const hasariBonus = p.childhood === "hasari" ? 0.07 : 0; // haşarı çocukluk: sokak kurnazlığı işe yarar
  const success = Math.random() < ct.base + p.stats.charisma * 0.01 + golgeBonus + hasariBonus + crimeSuccessMod(s);
  gainSkill(s, "social", 4);
  if (success) {
    // Marifetli kaçış bile tümüyle risksiz değil: ağır suç + korkulan/çok tanınan ad daha çok dikkat çeker.
    // Böylece korku/zalim hem başarıyı hem yakalanma ihtimalini artırır — suç "risksiz kazanç" olmaktan çıkar (dread iki tarafı da keser).
    const golgeGizli = p.faction === "golge" ? 0.5 : 1; // Gölge Kardeşliği iz bırakmaz — sıcaklık yarıya düşer
    const heat = Math.min(0.5, (ct.sev * 0.05 + dread(s) / 100 * 0.15) * golgeGizli);
    if (Math.random() < heat) { s.pendingScene = { kind: "crime", ctx: { crime: kind } }; return s; } // ganimeti güvene almadan enselendin — kaçış sahnesine düş
    const loot = Math.round((ct.lootMin + Math.floor(Math.random() * (ct.lootMax - ct.lootMin + 1))) * inflationFactor(s)); // ganimet çağın parasıyla — geç oyunda 12 nam grindiyle açılan soygun anlamsız kalmasın (dövüş ödülüyle aynı ilke)
    // Büyük soygunlarda ganimetin bir kısmı SICAK MAL: nakde çevrilmesi (eritme) riskli.
    const hot = ct.sev >= 3 ? Math.round(loot * 0.45) : 0;
    const cash = loot - hot;
    p.money += cash; if (hot > 0) p.hotGoods = (p.hotGoods || 0) + hot;
    p.crime_wins = (p.crime_wins || 0) + 1; // yeraltı namı: tamamlanan iş merdiveni tırmandırır
    p.fear = Math.min(100, p.fear + ct.fear);
    bumpNam(p, "zalim", ct.nam);
    witnessScandal(s, kind === "yankesicilik" || kind === "dukkan_soyma" ? "hirsizlik_tanigi" : "suc_tanigi", 0.22);
    const why = dread(s) > 30 ? " Korkulan adın kurbanını dondurdu." : "";
    push(s, "suç", `${ct.label} işini başardın (+${cash} akçe).${why}`, "kişisel", false, { k: "evj.crimeWin", p: [{ cr: kind }, cash, dread(s) > 30 ? { sfx: "sfx.crimeDread" } : ""] });
    if (hot > 0) push(s, "suç", `Ganimetin ${hot} akçelik kısmı sıcak mal; eritmek için kara borsa lazım.`, "kişisel", false, { k: "crime.hotGot", p: [hot] });
    return s;
  }
  // ── Kesinti anı (Vercel interrupt sahnesi): yakalanmak üzeresin — oyuncu seçer (Saklan/Rüşvet/Kaç).
  s.pendingScene = { kind: "crime", ctx: { crime: kind } };
  return s;
}

// Sıcak malı erit (kara borsa): gölge loncası iyi oran + düşük risk; diğerleri kötü oran + yakalanma riski.
export function fenceHotGoods(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  const hot = p.hotGoods || 0; if (hot <= 0 || p.dead || inJail(p)) return s; // zindanda kara borsa da yok
  const golge = p.faction === "golge";
  p.hotGoods = 0;
  if (Math.random() < (golge ? 0.05 : 0.18)) {
    const fine = Math.round(hot * 0.4);
    p.money = Math.max(0, p.money - fine); p.fear = Math.min(100, p.fear + 3); p.reputation = Math.max(-100, p.reputation - 3);
    push(s, "suç_yakalandı", `Sıcak malı eritirken yakalandın; ${fine} akçe ceza ve leke.`, "kişisel", true, { k: "crime.fenceCaught", p: [fine] });
  } else {
    const got = Math.round(hot * (golge ? 0.8 : 0.55));
    p.money += got; gainSkill(s, "trade", 4);
    push(s, "suç", `Sıcak malı kara borsada erittin (+${got} akçe).`, "kişisel", false, { k: "crime.fenceWin", p: [got] });
  }
  return s;
}
// Suç kesinti sahnesinin sonucunu uygula (Saklan/Rüşvet/Kaç). UI s.pendingScene'i görünce çağırır.
export function resolveCrimeScene(prev: GameState, choice: "saklan" | "rusvet" | "kac"): GameState {
  const s = clone(prev); const p = s.player;
  if (s.pendingScene?.kind !== "crime") return s;      // yalnız bekleyen suç sahnesi çözülür (yanlış çağrı koruması)
  const kind = (s.pendingScene?.ctx?.crime as CrimeKind) || "yankesicilik";
  s.pendingScene = null;
  const ct = CRIME_TYPES[kind] || CRIME_TYPES.yankesicilik;
  const golgeBonus = p.faction === "golge" ? 0.12 : 0;
  let escaped = false; let scratch = 0; let note: { k: string; p?: EvtParam[] };
  if (choice === "saklan") {
    // Saklan: gizlenme testi (dayanıklılık + gölge). Sessiz kaçış.
    const chance = 0.42 + p.stats.stamina * 0.03 + golgeBonus - ct.sev * 0.04;
    escaped = Math.random() < Math.max(0.08, chance);
    gainSkill(s, "social", 3);
    note = { k: escaped ? "crimesc.hideWin" : "crimesc.hideLose" };
  } else if (choice === "rusvet") {
    // Rüşvet: para ile sustur. Yeterli akçe varsa kaçarsın ama %30 rüşvet söylentisi doğar.
    const cost = Math.round(ct.fine * 1.2 * inflationFactor(s)); // rüşvet de çağın parasıyla — ganimet ölçeklenirken sabit kalsa suç ucuz riske döner
    if (p.money >= cost) {
      p.money -= cost; escaped = true;
      if (Math.random() < 0.3) { bumpNam(p, "zalim", 3); p.reputation = Math.max(-100, p.reputation - 3); note = { k: "crimesc.bribeLeak", p: [cost] }; }
      else note = { k: "crimesc.bribeWin", p: [cost] };
    } else { escaped = false; note = { k: "crimesc.bribePoor" }; }
  } else {
    // Kaç: atletik test (güç + dayanıklılık). Başarırsan sıyrıkla kurtulursun.
    const chance = 0.34 + (p.stats.strength + p.stats.stamina) * 0.025 + golgeBonus - ct.sev * 0.03;
    escaped = Math.random() < Math.max(0.06, chance);
    if (escaped) { scratch = 2 + Math.floor(Math.random() * (ct.sev * 2)); p.health = Math.max(1, p.health - scratch); }
    gainSkill(s, "combat", 4);
    note = { k: escaped ? "crimesc.runWin" : "crimesc.runLose", p: escaped ? [scratch] : undefined };
  }
  if (escaped) {
    p.fear = Math.min(100, p.fear + 1);
    push(s, "suç", `Kesintiyi atlattın.`, "kişisel", true, note);
    return s;
  }
  // Kaçamadın → yakalandın.
  crimeCaught(s, kind);
  return s;
}

// Yakalanma cezasını uygula (kesinti sahnesinden veya doğrudan). Şiddete göre ceza + tanık + tohum.
function crimeCaught(s: GameState, kind: CrimeKind, direct = false) {
  const p = s.player; const ct = CRIME_TYPES[kind] || CRIME_TYPES.yankesicilik;
  // KADI DURUŞMASI: ağır suç (sev>=3) taçsız oyuncuyu önce mahkemeye çıkarır — ceza resolveTrial keser.
  if (!direct && !p.crowned && ct.sev >= 3 && !inJail(p) && !s.pendingScene) {
    s.pendingScene = { kind: "trial", ctx: { crime: kind } };
    push(s, "suç_yakalandı", "Yakalandın! Zaptiye kolundan tuttu; kadı huzuruna çıkarılacaksın.", "kişisel", true, { k: "trial.opened", p: [{ cr: kind }] });
    return;
  }
  // Taç sahibi kadıya değil tarihe hesap verir: zindan yerine meşruiyet bedeli (otorite + şeref),
  // skandal diyara yayılır — otorite eridikçe mevcut isyan/iddiacı sistemi tahtı kendiliğinden sallar.
  if (p.crowned) {
    const drop = 6 + ct.sev * 2;
    p.crownAuthority = clamp100(crownAuthorityOf(p) - drop);
    p.honor = Math.max(0, p.honor - ct.sev);
    push(s, "taht", `Hükümdarın ${ct.label.toLowerCase()} işine karıştığı kulaktan kulağa yayıldı; kadı susar, diyar konuşur (otorite −${drop}).`, "makro", true, { k: "crown.scandal", p: [{ cr: kind }, drop] });
  }
  // Ağır suç (sev>=3): kadı zindan hükmü verir — sev 3'te yazı tura, sev 4'te kesin (asker ocağı süreyi yarılar). Taçlı zindana düşmez.
  if (!p.crowned && ct.sev >= 3 && !inJail(p) && (ct.sev >= 4 || Math.random() < 0.5)) {
    const ay = Math.max(1, Math.round((ct.sev - 1) * (p.faction === "asker" ? 0.5 : 1)));
    p.jail = { left: ay, kind };
    push(s, "suç", `Kadı hükmünü verdi: ${ay} ay zindan. Demir kapı ardında ay saymak da bir mekteptir.`, "kişisel", true, { k: "jail.sentenced", p: [ay] });
  }
  const fine = Math.min(p.money, Math.round(ct.fine * inflationFactor(s))); // ceza çağın parasıyla (ganimetle birlikte ölçeklenir — risk/ödül oranı her çağda sabit)
  const hurt = Math.round(ct.hurt * (p.faction === "asker" ? 0.5 : 1));
  const extra = crimeCaughtPenalty(s);
  p.money -= fine; p.reputation = Math.max(-100, p.reputation - 6 - ct.sev * 2 - extra); p.health = Math.max(0, p.health - hurt);
  witnessScandal(s, kind === "yankesicilik" || kind === "dukkan_soyma" ? "hirsizlik_tanigi" : "suc_tanigi", 0.7);
  if (ct.sev >= 3 && Math.random() < 0.5) sowSeed(s, { kaynak: "suc_gecmisi", hmin: 24, hmax: 120, agirlik: "orta", nesil: false, etki: { money: -30, reputation: -4 } });
  push(s, "suç_yakalandı", `Yakalandın! ${fine} akçe ceza, itibarın sarsıldı.`, "kişisel", true, { k: "evj.crimeCaught", p: [fine, extra >= 4 ? { sfx: "sfx.crimeHard" } : ""] });
  if (p.health <= 0) die(s, `${p.name}, suçüstü yakalanıp can verdi.`, { k: "evj.dieCrime", p: [p.name] });
}

// ── KADI DURUŞMASI: hüküm öncesi son söz — savunma, tanık ya da boyun. ──
export function hasTrialWitness(s: GameState): boolean { return Object.values(s.relationships || {}).some((v) => (v as number) >= 55); }
export function resolveTrial(prev: GameState, choice: "savun" | "tanik" | "boyun"): GameState {
  const s = clone(prev); const p = s.player;
  if (s.pendingScene?.kind !== "trial") return s;
  const kind = (s.pendingScene.ctx?.crime as CrimeKind) || "yankesicilik";
  const ct = CRIME_TYPES[kind] || CRIME_TYPES.yankesicilik;
  s.pendingScene = null;
  if (choice === "tanik") {
    const entries = Object.entries(s.relationships || {}).filter(([, v]) => (v as number) >= 55).sort((a, b) => (b[1] as number) - (a[1] as number));
    if (!entries.length) { crimeCaught(s, kind, true); return s; } // tanık yoksa hüküm (UI düğmeyi kapatır)
    const wid = entries[0][0];
    s.relationships[wid] = Math.max(-100, (s.relationships[wid] as number) - 6); // tanıklık bir borçtur
    if (Math.random() < 0.72) {
      p.reputation = Math.max(-100, p.reputation - 2);
      push(s, "suç", "Bir dostun kadı önünde lehine tanıklık etti; beraat ettin. Bu borç unutulmaz.", "kişisel", true, { k: "trial.witWin" });
      return s;
    }
    push(s, "suç", "Tanığın sözü kadıyı kesmedi; hüküm okundu.", "kişisel", true, { k: "trial.witLose" });
    crimeCaught(s, kind, true);
    return s;
  }
  if (choice === "savun") {
    const chanceW = Math.max(0.1, 0.32 + effStat(p, "charisma") * 0.03 + effStat(p, "intelligence") * 0.015 - ct.sev * 0.03);
    gainSkill(s, "social", 4);
    if (Math.random() < chanceW) {
      const fine = Math.min(p.money, Math.round(ct.fine * 0.5 * inflationFactor(s)));
      p.money -= fine; p.reputation = Math.max(-100, p.reputation - 4);
      push(s, "suç", `Kendini öyle savundun ki kadı cezayı yarıya indirdi (${fine} akçe); zindan kapısı açılmadı.`, "kişisel", true, { k: "trial.defWin", p: [fine] });
      return s;
    }
    push(s, "suç", "Savunman kadıyı yumuşatmadı; hüküm tam okundu.", "kişisel", true, { k: "trial.defLose" });
    crimeCaught(s, kind, true);
    return s;
  }
  p.honor = Math.min(100, p.honor + 1); // hükme boyun eğmek de bir duruştur
  crimeCaught(s, kind, true);
  return s;
}

// ── SARAY HEYETİ: tacın üç direği — vezir söz, hazinedar defter, casusbaşı kulak. ──
export type CourtOffice = "vezir" | "hazinedar" | "casusbasi";
export const COURT_OFFICES: CourtOffice[] = ["vezir", "hazinedar", "casusbasi"];
export function courtAppointCost(s: GameState): number { return Math.round(50 * inflationFactor(s)); }
export function courtWage(s: GameState): number {
  const c = s.court; if (!c) return 0;
  const n = (c.vezir ? 1 : 0) + (c.hazinedar ? 1 : 0) + (c.casusbasi ? 1 : 0);
  return Math.round(8 * inflationFactor(s)) * n;
}
export function appointOfficer(prev: GameState, office: CourtOffice): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || !p.crowned || inJail(p)) return s;
  if (s.court && s.court[office]) return s; // makam dolu
  const cost = courtAppointCost(s);
  if (p.money < cost) return s;
  p.money -= cost;
  const seed = (Math.floor(Math.random() * 1e9)) >>> 0;
  const name = localFirstName(seed, Math.random() < 0.85 ? "erkek" : "kadın");
  s.court = { ...(s.court || {}), [office]: name };
  push(s, "taht", `${name}, ${office === "vezir" ? "vezirlik" : office === "hazinedar" ? "hazinedarlık" : "casusbaşılık"} makamına getirildi; ulufesi ay be ay hazineden çıkacak.`, "kişisel", true, { k: "evj.courtAppoint." + office, p: [name] });
  return s;
}
export function dismissOfficer(prev: GameState, office: CourtOffice): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || !s.court || !s.court[office]) return s;
  const name = s.court[office]!;
  s.court = { ...s.court, [office]: null };
  push(s, "taht", `${name} makamından azledildi; mühür ve defter teslim alındı.`, "kişisel", false, { k: "evj.courtDismiss", p: [name] });
  return s;
}
function tickCourt(s: GameState) {
  const p = s.player; const c = s.court;
  if (!c || p.dead) return;
  const filled = COURT_OFFICES.filter((o) => c[o]);
  if (!filled.length) { s.court = null; return; }
  if (!p.crowned) { // taç düştü: heyet dağılır
    s.court = null;
    push(s, "taht", `Taç gidince saray heyeti de dağıldı; mühürler yeni sahibini bekliyor.`, "kişisel", true, { k: "evj.courtDisband" });
    return;
  }
  const wage = courtWage(s);
  if (p.money >= wage) {
    p.money -= wage;
  } else { // ulufe yok: bir makam boşalır (önce casusbaşı, en son vezir)
    const order: CourtOffice[] = ["casusbasi", "hazinedar", "vezir"];
    const leave = order.find((o) => c[o])!;
    const name = c[leave]!;
    s.court = { ...c, [leave]: null };
    push(s, "taht", `Ulufe ödenmedi; ${name} mührü bırakıp saraydan ayrıldı.`, "kişisel", false, { k: "evj.courtLeave", p: [name] });
  }
  // Vezir: altı ayda bir otoriteyi diri tutar
  if (s.court && s.court.vezir && s.turn % 6 === 0) p.crownAuthority = clamp100(crownAuthorityOf(p) + 1);
}

// ── KARŞI ENTRİKA: diyar oyuncuya karşı da oynar — kin tutan hane iplik örer, uyanık bey keser. ──
export function listenCost(s: GameState): number { return Math.round(15 * inflationFactor(s)); }
export function cutThreadCost(s: GameState): number { return Math.round(30 * inflationFactor(s)); }
export function listenWhispers(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 16 || inJail(p)) return s;
  if (p.listen_turn === s.turn) return s; // ayda bir kulak
  const cost = listenCost(s);
  if (p.money < cost) return s;
  p.listen_turn = s.turn; p.money -= cost;
  const ep = s.enemyPlot;
  if (ep && !ep.known) {
    const found = Math.random() < 0.35 + effStat(p, "intelligence") * 0.015 + (p.retinue || 0) * 0.05;
    if (found) {
      ep.known = true;
      const h = ensureRivals(s).find((x) => x.id === ep.houseId);
      push(s, "entrika", `Kulakların iş gördü: ${h ? h.name : "bir hane"} senin aleyhine iplik örüyor! Düğüm vakitken kesilebilir.`, "kişisel", true, { k: "evj.spyFound", p: [{ hn: ep.nameIdx }] });
      return s;
    }
  }
  push(s, "entrika", `Çarşıda kulak kabarttın; bu ay dişe dokunur bir fısıltı çıkmadı.`, "kişisel", false, { k: "evj.spyQuiet" });
  return s;
}
export function cutThread(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  const ep = s.enemyPlot;
  if (!ep || !ep.known || p.dead || inJail(p)) return s;
  const cost = cutThreadCost(s);
  if (p.money < cost) return s;
  p.money -= cost;
  const h = ensureRivals(s).find((x) => x.id === ep.houseId);
  if (h) h.tutum = Math.max(-100, (h.tutum ?? 0) - 10); // eli boşa çıkan hane daha da küser
  s.enemyPlot = null; s.enemyPlotCool = s.turn + 12;
  p.fear = Math.min(100, p.fear + 2);
  push(s, "entrika", `Düğümü tam vaktinde kestin: ${h ? h.name : "hane"} adamları eli boş döndü. Diyar, kolay lokma olmadığını konuşuyor.`, "makro", true, { k: "evj.spyCut", p: [{ hn: ep.nameIdx }] });
  return s;
}
function tickEnemyPlot(s: GameState, rivals: RivalHouse[]) {
  const p = s.player;
  if (p.dead || p.age < 16) return;
  const ep = s.enemyPlot;
  if (!ep) {
    if ((s.enemyPlotCool || 0) > s.turn) return;
    // doğum: kan davalı hane önce, yoksa tutumu ≤ −30 bir hane
    const feudH = s.feud ? rivals.find((x) => x.id === s.feud!.houseId) : null;
    const angry = rivals.filter((h) => (h.tutum ?? 0) <= -30);
    const src = feudH && Math.random() < 0.10 ? feudH : (angry.length && Math.random() < 0.04 ? angry[Math.floor(Math.random() * angry.length)] : null);
    if (!src) return;
    s.enemyPlot = { houseId: src.id, nameIdx: src.nameIdx, kind: Math.random() < 0.5 ? "leke" : "sabotaj", stage: 0, known: false };
    if (s.court && s.court.casusbasi) { // casusbaşının kulağı her handa
      s.enemyPlot.known = true;
      push(s, "entrika", `Casusbaşın haber uçurdu: ${src.name} aleyhine iplik örmeye başladı!`, "kişisel", true, { k: "evj.courtSpyFound", p: [{ hn: src.nameIdx }] });
    }
    return; // sessiz doğar — keşif oyuncunun işi (casusbaşı varsa o görür)
  }
  ep.stage += 1;
  if (ep.stage < 3) return;
  // patlama
  const h = rivals.find((x) => x.id === ep.houseId);
  s.enemyPlot = null; s.enemyPlotCool = s.turn + 12;
  if (ep.kind === "leke") {
    p.reputation = Math.max(-100, p.reputation - 8); p.honor = Math.max(0, p.honor - 3);
    push(s, "entrika", `${h ? h.name : "Bir hane"} aylardır ördüğü çamuru çarşıya döktü: adın dilden dile hırpalanıyor (itibar −8).`, "makro", true, { k: "evj.enemyPlotFired.leke", p: [{ hn: ep.nameIdx }] });
  } else {
    const loss = Math.min(p.money, Math.round(40 * inflationFactor(s) + p.money * 0.05));
    p.money -= loss;
    push(s, "entrika", `${h ? h.name : "Bir hane"} el altından işini baltaladı: ambar deliği, kayıp senet, ürkütülen müşteri (−${loss} akçe).`, "makro", true, { k: "evj.enemyPlotFired.sabotaj", p: [{ hn: ep.nameIdx }, loss] });
  }
}

// ── MAİYET: ulufeli muhafız birliği — kılıç kiralanır, sadakat ulufeyle ayakta durur. ──
export function retinueGuardMult(p: Player): number { return Math.max(0.25, 1 - (p.retinue || 0) * 0.25); } // her kılıç pusu iştahını %25 kırar
export const RETINUE_MAX = 3;
export const RETINUE_HIRE = 35;
export const RETINUE_WAGE = 10;
export function retinueHireCost(s: GameState): number { return Math.round(RETINUE_HIRE * inflationFactor(s)); }
export function retinueWage(s: GameState): number { return Math.round(RETINUE_WAGE * inflationFactor(s)) * (s.player.retinue || 0); }
export function hireGuard(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 16 || inJail(p)) return s;
  if ((p.retinue || 0) >= RETINUE_MAX) return s;
  const cost = retinueHireCost(s);
  if (p.money < cost) return s;
  p.money -= cost; p.retinue = (p.retinue || 0) + 1;
  push(s, "maiyet", `Kapına bir muhafız aldın (${p.retinue}. kılıç); ulufesi ay be ay kesenden çıkacak.`, "kişisel", false, { k: "evj.guardHire", p: [p.retinue] });
  return s;
}
export function dismissGuards(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || !(p.retinue || 0)) return s;
  p.retinue = 0;
  push(s, "maiyet", `Maiyetini dağıttın; muhafızlar helalleşip kapından ayrıldı.`, "kişisel", false, { k: "evj.guardDismiss" });
  return s;
}
function tickRetinue(s: GameState) {
  const p = s.player;
  const n = p.retinue || 0; if (!n || p.dead) return;
  const wage = retinueWage(s);
  if (p.money >= wage) { p.money -= wage; return; } // ulufe sessizce işler (ayrı satır kalabalığı yapmaz)
  p.retinue = n - 1; // kese boş: her ay bir kılıç gider
  push(s, "maiyet", `Ulufe ödenmedi; bir muhafız kuşağını toplayıp ayrıldı (kalan ${p.retinue}).`, "kişisel", false, { k: "evj.guardLeave", p: [p.retinue] });
}

// Zar Meclisi (han köşesi kumarı): ayda bir el, kasa hep avantajlı — heyecan satar, servet satmaz.
// Dinen hoş görülmez (dindar nam düşer); zar meclisinde ara sıra kavga çıkar.
export function playDice(prev: GameState, bet: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 16 || inJail(p)) return s;
  if (p.gamble_turn === s.turn) return s; // ayda tek el
  const stake = Math.max(1, Math.min(Math.floor(bet), p.money));
  if (stake <= 0 || p.money < stake) return s;
  p.gamble_turn = s.turn;
  bumpNam(p, "dindar", -1); // zar meclisine dadanan, tekke kapısından uzaklaşır
  const win = Math.random() < 0.46; // kasa avantajı: uzun vadede kaybettirir (farm kapalı)
  if (win) {
    p.money += stake;
    push(s, "gunluk", `Han köşesinde zarlar senin için döndü (+${stake} akçe); kalk tam vaktidir.`, "kişisel", false, { k: "evj.diceWin", p: [stake] });
  } else {
    p.money -= stake;
    if (chance(0.08)) { p.health = Math.max(1, p.health - 3); push(s, "gunluk", `Zarlar döndü, kese gitti (−${stake} akçe); üstüne hile lafı açılınca meclis karıştı, yumruk yedin (−3 sağlık).`, "kişisel", false, { k: "evj.diceBrawl", p: [stake] }); }
    else push(s, "gunluk", `Zarlar kasadan yana döndü (−${stake} akçe); zar meclisinin altın kuralı: kazanan hep han sahibi.`, "kişisel", false, { k: "evj.diceLose", p: [stake] });
  }
  return s;
}

// ── Fırsat: kabul edilince stat'a göre çözülür ──
export interface Opportunity { id: string; key: string; title: string; desc: string; reward: number; risk: number; stat: keyof Stats; minAge?: number; } // minAge: çocuğa kervan muhafızlığı teklif edilmez (mantıksızlık koruması)
// forced: mini-oyunun belirlediği sonuç (verilmezse stat'a bağlı rastgele — geriye dönük güvenli).
export function resolveOpportunity(prev: GameState, opp: Opportunity, forced?: boolean): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || inJail(p)) return s; // hücrede fırsat görevi tamamlanmaz
  // Tur başına tek fırsat çözümü (diğer gelir eylemleriyle tutarlı; çoklu-çözüm farmı kapatılır).
  if (p.opp_turn === s.turn) return s;
  p.opp_turn = s.turn;
  const success = forced !== undefined ? forced : Math.random() < Math.min(0.9, Math.max(0.1, (1 - opp.risk) + effStat(p, opp.stat) * 0.03)); // yedek yol (forced verilmezse): olasılık 0.1–0.9 kıskaçlı + effStat — hep-kazan/hep-kaybet kapatıldı
  p.hunger = Math.max(0, p.hunger - 5);
  if (success) {
    let reward = opp.reward;
    if (hasPerk(p, "keskin_goz")) reward = Math.round(reward * 1.3);
    p.money += reward; p.reputation = Math.min(100, p.reputation + 4);
    gainSkill(s, opp.stat === "strength" ? "combat" : opp.stat === "charisma" ? "social" : "trade", 7);
    { const ov = chance(0.5); push(s, "görev_tamamlandı", ov ? `"${opp.title}" işi tamamlandı; alın teri keseye akçe oldu (+${reward}).` : `"${opp.title}" görevini başardın (+${reward} akçe).`, "kişisel", true, { k: ov ? "evj.oppWin2" : "evj.oppWin", p: [{ opp: opp.key }, reward] }); }
  }
  else { p.reputation = Math.max(-100, p.reputation - 3); const ol = chance(0.5); push(s, "görev_başarısız", ol ? `"${opp.title}" işi ters gitti; emek yandı, ders deftere yazıldı.` : `"${opp.title}" görevinde başarısız oldun.`, "kişisel", false, { k: ol ? "evj.oppLose2" : "evj.oppLose", p: [{ opp: opp.key }] }); }
  return s;
}

// Tura göre deterministik fırsat listesi.
export function opportunitiesFor(s: GameState): Opportunity[] {
  const pool: Omit<Opportunity, "id">[] = [
    { key: "pazar_duzen", minAge: 14, title: "Pazarda Düzen", desc: "Voyvoda kavgayı yatıştırmanı istiyor.", reward: 30, risk: 0.4, stat: "charisma" },
    { key: "kervan_muhafiz", minAge: 15, title: "Kervan Muhafızlığı", desc: "Tehlikeli yolda kervana eşlik et.", reward: 60, risk: 0.6, stat: "strength" },
    { key: "sifa_ot", title: "Şifalı Ot Topla", desc: "Şifacı için dağdan ot getir.", reward: 20, risk: 0.25, stat: "stamina" },
    { key: "hesap_tut", title: "Hesap Tut", desc: "Tüccarın defterini düzelt.", reward: 25, risk: 0.3, stat: "intelligence" },
    // ── Vercel opportunities.py'den ek fırsatlar ──
    { key: "kurt_avi", minAge: 15, title: "Kurt Avı", desc: "Köyü basan kurt sürüsünü avla.", reward: 55, risk: 0.55, stat: "strength" },
    { key: "alacak_tahsil", minAge: 14, title: "Alacak Tahsili", desc: "Borçlu bir esnaftan tüccarın alacağını topla.", reward: 35, risk: 0.45, stat: "charisma" },
    { key: "haber_gotur", title: "Haber Götür", desc: "Komşu sancağa acele bir mektup ulaştır.", reward: 28, risk: 0.35, stat: "stamina" },
    { key: "kopru_onarim", minAge: 13, title: "Köprü Onarımı", desc: "Sel basmış köprünün onarımına el ver.", reward: 32, risk: 0.4, stat: "strength" },
    { key: "sinir_devriye", minAge: 15, title: "Sınır Devriyesi", desc: "Sancak beyi için sınır yolunu kolla.", reward: 48, risk: 0.5, stat: "strength" },
    { key: "dugun_kahya", minAge: 14, title: "Düğün Kâhyalığı", desc: "Bir konağın düğün hazırlığını yönet.", reward: 38, risk: 0.3, stat: "charisma" },
    { key: "mahkeme_sahit", minAge: 13, title: "Mahkeme Şahitliği", desc: "Kadı huzurunda adil bir ifade ver.", reward: 26, risk: 0.35, stat: "intelligence" },
    { key: "maden_kesfi", minAge: 15, title: "Maden Keşfi", desc: "Dağ eteğinde damar olduğu söylenen yeri araştır.", reward: 70, risk: 0.65, stat: "intelligence" },
    // ── Yaşayan dünyaya bağlı fırsatlar (vefat/düğün/yetim) ──
    { key: "miras_katibi", minAge: 15, title: "Miras Kâtibi", desc: "Vefat eden bir konak sahibinin mirasını adilce paylaştır.", reward: 42, risk: 0.4, stat: "intelligence" },
    { key: "dugun_sazi", title: "Düğün Sazı", desc: "Bir düğünde saz çalıp meclisi şenlendir.", reward: 30, risk: 0.3, stat: "charisma" },
    { key: "yetime_kanat", title: "Yetime Kanat", desc: "Kimsesiz kalmış bir çocuğa kol kanat ger.", reward: 24, risk: 0.3, stat: "charisma" },
    { key: "hasat_imece", title: "Hasat İmecesi", desc: "Köyün hasadına imece ile omuz ver.", reward: 28, risk: 0.35, stat: "stamina" },
    { key: "kayip_cocuk", title: "Kayıp Çocuk", desc: "Pazarda kaybolan bir çocuğu bul.", reward: 34, risk: 0.45, stat: "intelligence" },
    { key: "esnaf_arasi", minAge: 14, title: "Esnaf Arası", desc: "Kavgaya tutuşan iki esnafı ayır.", reward: 30, risk: 0.45, stat: "strength" },
    { key: "degirmen_tamiri", minAge: 14, title: "Değirmen Tamiri", desc: "Kırılan değirmen çarkını suya inip onar.", reward: 36, risk: 0.45, stat: "strength" },
    { key: "muneccim_ciragi", minAge: 15, title: "Müneccim Çıraklığı", desc: "Müneccimin gece ölçümlerinde rakamları tut.", reward: 30, risk: 0.3, stat: "intelligence" },
    { key: "can_dokumu", minAge: 15, title: "Çanların Dili", desc: "Dökümcünün yeni çanını dinleyip çatlağını bul.", reward: 40, risk: 0.5, stat: "intelligence" },
    { key: "gece_sali", minAge: 14, title: "Gece Salı", desc: "Irmaktan gece inen kereste salına kılavuzluk et.", reward: 44, risk: 0.55, stat: "stamina" },
    { key: "harman_bekcisi", minAge: 13, title: "Harman Bekçiliği", desc: "Geceyi harman başında geçir, kuş ve hırsız sokma.", reward: 26, risk: 0.35, stat: "stamina" },
    { key: "kitabe_yazisi", minAge: 15, title: "Kitabe Yazısı", desc: "Caminin silinen kitabesini eski kayıttan yeniden yaz.", reward: 34, risk: 0.4, stat: "intelligence" },
  ];
  const seed = (s.turn * 2654435761) >>> 0;
  const eligible = pool.filter((o) => !o.minAge || s.player.age >= o.minAge); // çocuğa çocuk işi: yaşına uymayan fırsat hiç gösterilmez
  return eligible.filter((_, i) => ((seed >> i) & 1) === 1 || i === seed % eligible.length) // garanti indeksi filtrelenmiş uzunluğa göre — boş liste imkânsız
    .map((o, i) => ({ ...o, id: `opp_${s.turn}_${i}` }));
}

// Mülk satın al
export function buyProperty(prev: GameState, type: string): GameState {
  const s = clone(prev); const p = s.player; const t = PROPERTY_TYPES[type];
  const cost = propBuyCost(s, type);
  if (!t || p.dead || p.money < cost) return s;
  p.money -= cost; p.properties.push({ type, loc: p.location_name, cond: 100 });
  { const pv = chance(0.5); push(s, "mülk_alım", pv ? `Anahtar avucuna düştü; ${p.location_name}'deki ${t.name.toLowerCase()} artık senin. Eşik ilk kez senin adınla aşıldı.` : `${p.location_name}'de ${t.name} satın aldın. Adına bir tapu daha.`, "kişisel", true, { k: pv ? "evj.propBuy2" : "evj.propBuy", p: [{ pl: p.location_name }, { pt2: type }] }); }
  return s;
}
// Onarım bedeli (eksik kondisyonla orantılı).
export function repairCost(pr: Property): number { return Math.max(1, Math.round((PROPERTY_TYPES[pr.type]?.cost || 100) * 0.3 * (100 - pr.cond) / 100)); }
export function repairProperty(prev: GameState, index: number): GameState {
  const s = clone(prev); const p = s.player; const pr = p.properties[index];
  if (p.dead || !pr || pr.cond >= 100) return s;
  const cost = repairCost(pr); if (p.money < cost) return s;
  p.money -= cost; pr.cond = 100;
  { const rv = chance(0.5); push(s, "mülk", rv ? `Usta kalfasıyla gelip ${pr.loc}'daki ${(PROPERTY_TYPES[pr.type]?.name || "mülk").toLowerCase()} damını, direğini elden geçirdi (−${cost} akçe); "on yıl daha gider" dedi.` : `${PROPERTY_TYPES[pr.type]?.name || "Mülk"} (${pr.loc}) onarıldı (−${cost} akçe).`, "kişisel", false, { k: rv ? "evj.propRepair2" : "evj.propRepair", p: [{ pt2: pr.type }, { pl: pr.loc }, cost] }); }
  return s;
}

// Atayı bir cümlede özetle (hanedan defteri için).
// Kitabe kimliği döner — gösterim yerinde t("dynnote."+id) ile 6 dile çevrilir (eski kayıtlar için TR metni ayrıca saklanır).
function dynastyNote(p: Player): string {
  if (p.fame >= 60) return "destan";
  if (p.reputation >= 50) return "saygin";
  if (p.properties.length >= 3) return "mulk";
  if (p.fear >= 50) return "korkulan";
  if (p.children.length >= 3) return "kalabalik";
  if ((p.cities_visited?.length || 0) >= 8) return "gezgin";
  if ((p.stats?.intelligence || 0) >= 9) return "alim";
  return "sade";
}
const DYNNOTE_TR: Record<string, string> = { destan: "Adı destanlara karıştı.", saygin: "Diyarda saygın bir isimdi.", mulk: "Geride büyük bir mülk bıraktı.", korkulan: "Korkulan bir isimdi.", kalabalik: "Kalabalık bir soy bıraktı.", gezgin: "Yolların adamı sayıldı; her handa bir hatırası kaldı.", alim: "Aklıyla anıldı; sözü meclislerde tartıldı.", sade: "Sade bir hayat sürdü." };

// ── Mersiye: bir hayat biterken kişiye özel kapanış ──
export interface Eulogy { epithet: string; lines: string[]; close: string; }
// Lakap: kişiyi en çok tanımlayan tek vasıf.
// Ölüm lakabı — id döner (gösterimde index.tsx ep.<id> ile 6 dile + cinsiyete çevrilir; kalıcı değil).
export function deathEpithet(s: GameState): string {
  const p = s.player; const n = p.nam || ({} as Nam);
  if (p.crowned && (p.crownConquests?.length || 0) >= 4) return "cihangir"; // diyarı birleştiren: en yüksek lakap
  if (p.crowned) return "hukumdar";
  if ((p.courtRank ?? -1) >= 4) return "sadrazam";
  if ((p.courtRank ?? -1) >= 3) return "vezir";
  if (p.fame >= 80) return "destan";
  if (p.fear >= 60) return "korkulan";
  if ((n.dindar || 0) >= 55) return "haci";
  if (p.honor >= 60) return "adil";
  if ((n.comert || 0) >= 60) return "acik";
  if ((n.zalim || 0) >= 60) return "zalim";
  if ((n.mert || 0) >= 55) return "mert";
  if ((n.capkin || 0) >= 60) return "celen";
  if (p.reputation >= 45) return "saygin";
  if (p.fame < 12) return "mechul";
  return "";
}
// Hayatı dokuyan 2-4 cümle. Satırlar {k,p} olarak döner; index.tsx render anında 6 dile çevirir
// (epithet/close kalıcı DynastyRecord'da saklandığından TR bırakılır).
export interface EulLine { k: string; p?: (string | number)[]; }
export function eulogy(s: GameState): { epithet: string; lines: EulLine[]; close: string } {
  const p = s.player; const n = p.nam || ({} as Nam);
  const lines: EulLine[] = [];
  // Tanınma / kimlik
  if (p.fame >= 60) lines.push({ k: "eul.fameHigh" });
  else if (p.fame >= 30) lines.push({ k: "eul.fameMid" });
  else lines.push({ k: "eul.fameLow" });
  // Nasıl öldüğü de mirastır: düelloda düşenle yatağında göçen aynı mersiyeyi almasın.
  if (p.death_cause) lines.push({ k: "eul.cause." + p.death_cause });
  // En belirgin huy
  if (p.fear >= 50 || (n.zalim || 0) >= 50) lines.push({ k: "eul.traitFear" });
  else if (p.honor >= 50 || (n.mert || 0) >= 50) lines.push({ k: "eul.traitHonor" });
  else if ((n.comert || 0) >= 50) lines.push({ k: "eul.traitComert" });
  else if ((n.dindar || 0) >= 50) lines.push({ k: "eul.traitDindar" });
  // Taht & devlet mevkii
  if (p.crowned) lines.push({ k: "eul.crowned" });
  else if ((p.courtRank ?? -1) >= 4) lines.push({ k: "eul.courtSadrazam" });
  else if ((p.courtRank ?? -1) >= 3) lines.push({ k: "eul.courtVezir" });
  // Sefer & bayındırlık (hükümdarlık mirası)
  const conq = p.crownConquests?.length || 0;
  if (conq > 0) lines.push({ k: "eul.conquest", p: [conq] });
  const worksN = Object.values(p.govWorks || {}).reduce((a, arr) => a + arr.length, 0);
  if (worksN > 0) lines.push({ k: "eul.works", p: [worksN] });
  // Mülk & yerleşim
  if (p.properties.length) lines.push({ k: "eul.holdProp", p: [p.properties.length] });
  const settleN = s.settlements?.length || 0;
  if (settleN) lines.push({ k: "eul.holdSettle", p: [settleN] });
  // Aile
  if (p.children.length) lines.push(p.spouse_name ? { k: "eul.familySpouse", p: [p.spouse_name, p.children.length] } : { k: "eul.familyChildren", p: [p.children.length] });
  else lines.push({ k: "eul.noHeir" });
  // Torunlar
  const gcN = p.grandchildren?.length || 0;
  if (gcN > 0) lines.push({ k: "eul.grandchildren", p: [gcN] });
  // Sadık dostlar: bir ömür boyu kurulan bağlar ardından ağlar
  const loyalN = Object.values(s.relationships || {}).filter((v) => (v as number) >= 50).length;
  if (loyalN > 0) lines.push({ k: "eul.friends", p: [loyalN] });
  // Yol ve zanaat da mirastır: çok gezen handa, çok deneyen tezgâhta anılır.
  const seenN = new Set([...(p.cities_visited || []), p.location_name]).size;
  if (seenN >= 10) lines.push({ k: "eul.traveled", p: [seenN] });
  const profN = new Set([...(p.professions_tried || []), p.profession].filter((x) => x !== "işsiz")).size;
  if (profN >= 4) lines.push({ k: "eul.trades", p: [profN] });
  return { epithet: deathEpithet(s), lines, close: dynastyNote(p) };
}

// Çocuğa yatırım yap (hayattayken).
export function investInChild(prev: GameState, childName: string, investId: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || !p.children.includes(childName)) return s;
  const inv = INVESTMENTS.find((x) => x.id === investId); if (!inv) return s;
  if (!p.child_invests) p.child_invests = {};
  const list = p.child_invests[childName] || [];
  if (list.includes(investId) || p.money < inv.cost) return s;
  p.money -= inv.cost; p.child_invests[childName] = [...list, investId];
  push(s, "nesil_yatirim", `${childName} için ${inv.label.toLowerCase()} yatırımı yaptın.`, "kişisel", false, { k: "evj.genInvest", p: [childName, { invl: inv.id }] });
  return s;
}

// Çocuk için süregelen eğitim yolu belirle/kaldır — haftalık masraf advance() içinde işlenir.
// Aynı yola devam edersen birikim korunur; yön değiştirirsen sıfırdan başlar (emek boşa gitmesin diye uyarı UI'da).
export function setChildEducation(prev: GameState, childName: string, trackId: string | null): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || !p.children.includes(childName)) return s;
  if (!p.child_edu) p.child_edu = {};
  if (!trackId) { delete p.child_edu[childName]; return s; }
  const tr = EDU_TRACKS.find((x) => x.id === trackId); if (!tr) return s;
  const cur = p.child_edu[childName];
  p.child_edu[childName] = { track: trackId, weeks: cur && cur.track === trackId ? cur.weeks : 0 };
  push(s, "nesil_yatirim", `${childName} ${tr.label.toLowerCase()}'na verildi; her ay emek ve akçe ister.`, "kişisel", false, { k: "edu.set", p: [childName, { edul: trackId }] });
  return s;
}

// Nesil mirası: ölünce vâris (varsayılan ilk çocuk) ile devam et. Vasiyet stili miras oranını belirler.
// Son sözler: ölüm döşeğinde söylenen söz vârisin yoluna ışık tutar. Nesil devri anının kendisi kapı — nesil başına bir kez, farm imkânsız.
export const LAST_WORDS: { id: string; icon: string }[] = [
  { id: "adimizi_yasat", icon: "banner" },   // hanedan adı: vâris şöhretle başlar
  { id: "helalles", icon: "prayer-beads" },  // temiz sayfa: vâris itibarla başlar
  { id: "sirrini_ver", icon: "coins" },      // kazancın sırrı: vâris ticarete yatkın başlar
];
const LW_ECHO_TR: Record<string, string> = {
  adimizi_yasat: `%1'in son sözü buydu: "Adımızı yaşat." O ad şimdi senin sırtında.`,
  helalles: `%1 herkesle helalleşip göçtü; ardında dua, önünde açık kapı bıraktı.`,
  sirrini_ver: `%1 son nefesinde kazancının sırrını kulağına fısıldadı; o söz hâlâ aklında.`,
};
// Vâris seçim ekranı önizlemesi: continueAsHeir'ın başlangıç hesabının saf (state'i değiştirmeyen) aynası.
// Formüller continueAsHeir ile birebir aynı kalmalı; sapma önizlemeyi yalancı yapar.
export function heirPreview(prev: GameState, heirName: string, willId = "esit"): { points: number; money: number; rep: number } {
  const p = prev.player;
  const will = WILL_STYLES.find((w) => w.id === willId) || WILL_STYLES[0];
  const netWealth = Math.max(0, (p.money + (p.deposit || 0)) - (p.debt || 0));
  const inheritMoney = Math.floor(netWealth * will.frac) + 20;
  const gen = p.generation + 1;
  const heirLegacy: Record<string, boolean> = { ...(p.legacy || {}) }; delete heirLegacy.hekim; delete heirLegacy.hac;
  const legacyRep = (heirLegacy.imaret ? 5 : 0) + (heirLegacy.vakif ? 8 : 0) + Math.min(12, Math.floor((p.vakif_fon || 0) / 5000)) + 2 * vakifTier(p.vakif_fon || 0);
  const estateTier = p.estate || 0;
  const invests = (p.child_invests && p.child_invests[heirName]) || [];
  let points = Math.min(gen, 10); let money = inheritMoney; let rep = Math.floor(p.reputation / 2) + will.repBonus;
  if (estateTier >= 3) points += 1;
  if (estateTier >= 5) money += 80;
  for (const inv of invests) {
    if (inv === "egitim") points += 1;
    if (inv === "zanaat") money += 30;
    if (inv === "saglik") rep += 6;
  }
  const nat = childNature(heirName, p.generation);
  if (nat === "sevecen") rep += 3;
  else if (nat === "hirsli") points += 1;
  const edu = p.child_edu && p.child_edu[heirName];
  if (edu) { const lvl = eduLevel(edu.weeks); if (lvl > 0) rep += lvl; }
  const bond = p.child_bond?.[heirName];
  if (bond != null) { if (bond >= 60) rep += 2; if (bond >= 85) points += 1; } // ilgiyle büyüyen evlat: ata bağı vârisin adını ve özgüvenini besler
  const favP = prev.succession?.favored || null;
  if (favP && p.children.includes(favP)) rep += heirName === favP ? 5 : -5; // veraset meşruiyeti (continueAsHeir paritesi)
  if (prev.saga && prev.saga.act >= 3 && prev.saga.ch >= 5) rep += 2; // Mühür Nişanı: tamamlanan Kül Yemini vârisi önceler (continueAsHeir paritesi)
  return { points, money, rep: Math.max(-100, Math.min(100, rep + legacyRep)) };
}

export function continueAsHeir(prev: GameState, willId = "esit", heirName?: string, lastWordsId?: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!p.dead || p.children.length === 0) return s;
  const heir = heirName && p.children.includes(heirName) ? heirName : p.children[0];
  const will = WILL_STYLES.find((w) => w.id === willId) || WILL_STYLES[0];
  const netWealth = Math.max(0, (p.money + (p.deposit || 0)) - (p.debt || 0)); // ödenmemiş borç mirastan düşülür (borç ölümle silinmez)
  const inheritMoney = Math.floor(netWealth * will.frac) + 20; // emanet de mirasa dahil
  const props = p.properties.slice(0, Math.max(1, Math.ceil(p.properties.length * will.frac))); // vasiyet oranı mülke de işler; kalan hisseler kardeşlere ve vakfa dağılır (boş listede güvenli)
  const gen = p.generation + 1;
  const surname = p.surname;
  // Kalıcı görkem eserleri vârise geçer (oyunun kendi vaadi: "nesiller boyu sürecek") — hekim ve hac kişiseldir, kalmaz.
  const heirLegacy: Record<string, boolean> = { ...(p.legacy || {}) }; delete heirLegacy.hekim; delete heirLegacy.hac;
  const legacyRep = (heirLegacy.imaret ? 5 : 0) + (heirLegacy.vakif ? 8 : 0) + Math.min(12, Math.floor((p.vakif_fon || 0) / 5000)) + 2 * vakifTier(p.vakif_fon || 0); // atanın hayratı (+fonun büyüklüğü) vârisin adını önden yürütür
  const legacyFameFloor = heirLegacy.anit ? 15 : 0; // anıt: aile adı unutulmaz — vârisin şöhret tabanı
  const estateTier = p.estate || 0; // konak taşınmazdır: vâris aynı çatının altında doğar
  // Vârise yapılan yatırımların başlangıç avantajları
  const invests = (p.child_invests && p.child_invests[heir]) || [];
  const stats = { strength: 1, intelligence: 1, charisma: 1, stamina: 2 };
  const skills = { combat: 0, trade: 0, crafting: 0, social: 0 };
  let startPoints = Math.min(gen, 10); let startMoney = inheritMoney; let startHealth = 100; let startRep = Math.floor(p.reputation / 2) + will.repBonus; // nesil bonusu tavanlı: çok uzun hanedanda (gen>10) vâris doğuştan tüm statları maxlayamasın
  if (estateTier >= 3) startPoints += 1; // kütüphaneli konakta büyüyen çocuk: +1 özellik puanı
  if (estateTier >= 5) startMoney += 80; // saray yavrusunun kileri: vârise çeyiz akçesi
  const investNotes: string[] = [];
  for (const inv of invests) {
    if (inv === "egitim") { stats.intelligence += 2; startPoints += 1; investNotes.push("eğitimli"); }
    if (inv === "savas") { stats.strength += 2; skills.combat = 2; investNotes.push("savaş görmüş"); }
    if (inv === "zanaat") { skills.crafting = 2; startMoney += 30; investNotes.push("zanaat öğrenmiş"); }
    if (inv === "sosyal") { stats.charisma += 2; skills.social = 2; investNotes.push("terbiyeli"); }
    if (inv === "saglik") { startHealth = 100; startRep += 6; investNotes.push("dinç"); }
  }
  // Vârisin doğuştan tabiatı küçük bir başlangıç eğilimi katar (yatırımlardan bağımsız).
  const nat = childNature(heir, p.generation);
  if (nat === "cesur") stats.strength += 1;
  else if (nat === "zeki") stats.intelligence += 1;
  else if (nat === "hunerli") skills.crafting += 1;
  else if (nat === "sevecen") { stats.charisma += 1; startRep += 3; }
  else if (nat === "hirsli") startPoints += 1;
  // Süregelen eğitim yolu: biriken aylara göre ölçekli bonus (Vercel apply_child_bonus portu).
  const edu = p.child_edu && p.child_edu[heir];
  if (edu) {
    const tr = EDU_TRACKS.find((x) => x.id === edu.track);
    const lvl = eduLevel(edu.weeks);
    if (tr && lvl > 0) {
      if (tr.stat) stats[tr.stat] = Math.min(10, stats[tr.stat] + lvl);
      if (tr.skill) skills[tr.skill] = Math.min(10, skills[tr.skill] + lvl);
      startRep += lvl; // köklü eğitim saygınlık katar
      investNotes.push(`${tr.label.toLowerCase()}nda yetişmiş (${lvl}. kademe)`);
    }
  }
  // İlgiyle büyüyen evlat: ata bağı vârisin adını ve özgüvenini besler (heirPreview ile birebir aynı eşikler).
  // Not: child_bond/child_time_turn vârise taşınmaz — vârisin kendi evlatlarıyla bağı sıfırdan kurulur (bilinçli).
  const heirBond = p.child_bond?.[heir];
  if (heirBond != null) { if (heirBond >= 60) startRep += 2; if (heirBond >= 85) startPoints += 1; }
  // VERASET meşruiyeti: gözde tahta oturursa el üstünde, gözde dururken başkası oturursa gölgede başlar (heirPreview paritesi).
  const favHeir = prev.succession?.favored || null;
  if (favHeir && p.children.includes(favHeir)) startRep += heir === favHeir ? 5 : -5;
  const ancestor: DynastyRecord = {
    generation: p.generation, name: p.name, profession: p.profession,
    diedAge: p.age, fame: Math.round(p.fame), reputation: Math.round(p.reputation), faction: p.faction,
    note: DYNNOTE_TR[dynastyNote(p)], noteK: dynastyNote(p), causeK: p.death_cause,
  };
  const dynasty = [...(prev.dynasty || []), ancestor];
  const noteStr = investNotes.length ? ` ${heir}, ${investNotes.join(", ")} olarak yetişti.` : "";
  // Miras eşyası: atanın kuşandığı silah yadigâr olarak vârise geçer (kalitesiyle) — "nesiller boyu" vaadi eşyada da sürsün.
  // Bilinçli olarak YALNIZ silah: zırh/giyim bedene göredir ve eskir; kılıç ise hanenin simgesidir (tek parça = anlatı ağırlığı korunur).
  const heirloomId = p.equipped?.silah || null;
  const heirloomQ = heirloomId ? (p.equipped_q?.silah || "siradan") : null;
  const ns: GameState = {
    turn: 0, seed: Math.floor(Math.random() * 1e9), world: { ready: true, npcEvo: prev.world?.npcEvo, npcBorn: prev.world?.npcBorn, npcYears: (prev.world?.npcYears || 0) + Math.floor(prev.turn / 12), inflation: prev.world?.inflation || 1 }, relationships: {}, dynasty, npc_state: {}, saga: prev.saga ? { ...prev.saga, scene: null, declined: 0 } : null, rivals: prev.rivals ? prev.rivals.map((h) => ({ ...h, tutum: Math.round((h.tutum ?? 0) / 2) })) : undefined,
    // Kan davası NESLE GEÇER (adı üstünde): ısı yarılanır (yeni kuşakta kor küllenir ama sönmez), aylık hamle hakkı tazelenir.
    feud: prev.feud ? { houseId: prev.feud.houseId, nameIdx: prev.feud.nameIdx, stage: prev.feud.stage, heat: Math.round(prev.feud.heat / 2) } : undefined,
    bloodline: prev.bloodline ? { ...prev.bloodline, gen: prev.bloodline.gen + 1, scene: "bl_devir", act_turn: 0, opened: Math.max(0, prev.bloodline.opened - prev.turn), path: [...prev.bloodline.path] } : undefined, // KAN DEFTERİ vârise geçer: yeni kuşak, devir sahnesi
    // İttifaklar da nesle geçer (kan davası geçiyorsa el sıkışma da geçer — hanedanlar arası bağ kişisel değil hanevidir).
    allied_houses: prev.allied_houses ? [...prev.allied_houses] : undefined,
    // Hanedan hafızası vârise geçer: ataların tamamladığı yaylar bayrak olarak kalır, az da olsa anlatı momentumu verir.
    story: { active: null, completed: [], tension: Math.min(20, Object.keys(prev.story?.flags || {}).length * 3), nemesis: null, flags: { ...(prev.story?.flags || {}) }, lull: 0 }, wars: [], caravan: null, econ: 1,
    settlements: prev.settlements || [], // dynastinin kurduğu yerleşimler vârise kalır
    // Sadece nesil aşabilen tohumlar vârise geçer. Vârisin turu 0'dan başladığı için ekim'i yeniden
    // tabanla (ekim -= prev.turn): birikmiş yaş korunur, yoksa yas=turn-ekim negatif kalıp tohum hiç olgunlaşmaz.
    seeds: (prev.seeds || []).filter((t) => t.nesil).map((t) => ({ ...t, ekim: t.ekim - prev.turn })),
    player_rumors: [],
    player: {
      name: surname ? `${heir} ${surname}` : heir, surname, gender: CHILD_F.has(heir) ? "kadın" : "erkek",
      base_age: 7, age: 7, money: startMoney, profession: "işsiz", health: startHealth, hunger: 100,
      reputation: Math.max(-100, Math.min(100, startRep + legacyRep)), honor: 0, fear: 0, fame: Math.max(Math.floor(p.fame / 3), legacyFameFloor), legacy: heirLegacy, estate: estateTier, vakif_fon: p.vakif_fon,
      stats, stat_points: startPoints,
      dead: false, location_name: p.location_name, home_name: p.home_name || p.location_name, married: false, spouse_name: null, children: [],
      mother: p.gender === "erkek" ? (p.spouse_name || rnd(SPOUSE_K)) : p.name, father: p.gender === "erkek" ? p.name : (p.spouse_name || rnd(SPOUSE_E)),
      // Eş tarafı ebeveyn kültürel tohumla (dile göre çözülür); önceki oyuncu tarafı kendi adıyla kalır.
      mother_seed: p.gender === "erkek" ? p.spouse_seed : undefined, father_seed: p.gender === "erkek" ? undefined : p.spouse_seed,
      inventory: heirloomId ? { ekmek: 2, [heirloomId]: 1 } : { ekmek: 2 }, properties: props, generation: gen,
      inv_q: heirloomId && heirloomQ && heirloomQ !== "siradan" ? { [heirloomId]: { [heirloomQ]: 1 } } : undefined,
      faction: null, faction_standing: {},
      skills, skill_xp: { combat: skills.combat * 100, trade: 0, crafting: skills.crafting * 100, social: skills.social * 100 },
      perks: [], injuries: [], career_xp: 0, nam: { comert: 0, zalim: 0, capkin: 0, dindar: 0, mert: 0 }, child_invests: {}, equipped: { silah: null, zirh: null },
      crowned: p.crowned || false, will_pref: "esit", fates: [], claimed: [], governorships: [], // taht irsîdir; kader/başarım/valilik yeni baştan
    },
    history: [{ day: 0, type: "nesil_devri", text: `${gen}. nesil: ${heir}, ${will.label.toLowerCase()} vasiyetiyle mirası devraldı (${inheritMoney} akçe, ${props.length} mülk).${noteStr}`, scope: "kişisel", landmark: true, k: "evj.genHandover", p: [gen, heir, inheritMoney, props.length] }],
  };
  // Atanın son sözü vârise iz bırakır: küçük, temalı bir başlangıç avantajı + kroniğe düşen yankı.
  if (lastWordsId && LW_ECHO_TR[lastWordsId]) {
    const hp = ns.player;
    if (lastWordsId === "adimizi_yasat") hp.fame = Math.min(100, hp.fame + 6);
    else if (lastWordsId === "helalles") hp.reputation = Math.max(-100, Math.min(100, hp.reputation + 6));
    else if (lastWordsId === "sirrini_ver") { hp.skills.trade = Math.min(10, hp.skills.trade + 1); hp.skill_xp.trade = hp.skills.trade * 100; }
    ns.history.push({ day: 0, type: "nesil_devri", text: LW_ECHO_TR[lastWordsId].replace("%1", p.name), scope: "kişisel", landmark: false, k: "evj.lw." + lastWordsId, p: [p.name] });
  }
  // Devralınan kan davası kroniğe düşer: yeni kuşak yükün farkında başlar.
  if (ns.feud) ns.history.push({ day: 0, type: "kan_davası", text: `Atalardan kalan kan davası sana geçti; o hesap hâlâ açık.`, scope: "kişisel", landmark: true, k: "evj.feud.inherit", p: [{ hn: ns.feud.nameIdx }] });
  // Yadigâr kroniğe düşer: atanın silahı sandıkta vârisi bekler.
  if (heirloomId) ns.history.push({ day: 0, type: "nesil_devri", text: `${p.name}'in silahı sandıktan çıktı: bu yadigâr artık senin.`, scope: "kişisel", landmark: false, k: "evj.heirloom", p: [p.name, { i: heirloomId }] });
  // Mühür Nişanı: atası Kül Yemini'ni tamamlayan vâris bir adım önde başlar (heirPreview paritesi — orada da +2).
  if (ns.saga && ns.saga.act >= 3 && ns.saga.ch >= 5) {
    ns.player.reputation = Math.max(-100, Math.min(100, ns.player.reputation + 2));
    ns.history.push({ day: 0, type: "destan", text: "Kuşağında atalarının kül rengi mührü: Kül Yemini bu hanede tamamlandı. Kapılar sana bir karış daha açık.", scope: "kişisel", landmark: false, k: "saga.echo", p: [] });
  }
  return ns;
}

// ── Örgüt eylemleri ──
// Örgüt için bir görev üstlen: akçe + örgüt itibarı kazandırır, biraz tokluk götürür.
// Lonca rütbeleri — standing'e göre yükseliş (unvan + ödül çarpanı).
export const FACTION_RANKS = [
  { min: 0, title: "Yeni Üye", mult: 1.0 },
  { min: 30, title: "Güvenilir", mult: 1.15 },
  { min: 70, title: "Kıdemli", mult: 1.3 },
  { min: 120, title: "Lonca Büyüğü", mult: 1.5 },
];
export function factionRankIndex(standing: number): number {
  let idx = 0; for (let i = 0; i < FACTION_RANKS.length; i++) if (standing >= FACTION_RANKS[i].min) idx = i; return idx;
}
export function factionRank(standing: number) { return FACTION_RANKS[factionRankIndex(standing)]; }

// Bir fraksiyon, oyuncunun bulunduğu yerin sancağına hâkim mi? (emergent şehir-kontrolü etkisi)
export function factionHoldsHere(s: GameState, factionId: string | null): boolean {
  if (!factionId) return false;
  const region = regionOf(s.player.location_name);
  return (s.realm || defaultRealm()).some((r) => r.id === region && r.holder === factionId);
}
// Bulunduğun sancağı tutan lonca, senin loncana göre dost mu düşman mı? +1 dost/kendi, -1 düşman, 0 nötr/loncasız.
export function factionLocalFavor(s: GameState): number {
  const fid = s.player.faction; if (!fid) return 0;
  const region = regionOf(s.player.location_name);
  const sn = (s.realm || defaultRealm()).find((r) => r.id === region); if (!sn) return 0;
  if (sn.holder === fid) return 1;
  const st = factionStance(fid, sn.holder);
  return st > 0 ? 1 : st < 0 ? -1 : 0;
}
export function doFactionTask(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const f = factionById(id);
  if (inJail(p)) return s;
  if (!f || p.dead || p.age < 13) return s;
  // Bir ocağa bağlıysan yalnız KENDİ ocağına hizmet edebilirsin (rakip ocaktan para/itibar farmı yok).
  if (p.faction && p.faction !== id) { push(s, "örgüt_görev", `${f.name} senin ocağın değil; önce kendi ocağından ayrılmalısın.`, "kişisel", false, { k: "evj.factionNotYours", p: [{ fc: id }] }); return s; }
  // Tur başına tek görev — yoksa aynı turda sınırsız itibar/para farm'lanır.
  if (p.faction_task_turn === s.turn) { push(s, "örgüt_görev", `Bu ay ocak için hizmetini gördün; yenisi gelecek aya.`, "kişisel", false, { k: "evj.factionTaskWait" }); return s; }
  p.faction_task_turn = s.turn;
  const rank = factionRank(p.faction_standing[id] || 0);            // rütbe ödülü ölçekler
  const statBonus = p.stats[f.stat] * 2;
  // Loncan bu sancağa hâkimse burada daha güçlüsün: görev daha çok kazandırır.
  const dom = factionHoldsHere(s, id) ? 1.25 : 1;
  // Taban %30 kısıldı (erken oyunda işin ~3 katıydı) ama işçi maaşı gibi enflasyona bağlandı (geç oyunda değersizleşmesin).
  let reward = Math.round((f.task.reward * 0.7 + statBonus + Math.floor(Math.random() * 8)) * rank.mult * dom * inflationFactor(s));
  if (id === "tuccar" && hasPerk(p, "guvenli_kervan")) reward = Math.round(reward * 1.5);
  p.money += reward; p.hunger = Math.max(0, p.hunger - 6);
  let standing = f.task.standing * factionStandingMod(s, id) * dom;
  if (hasPerk(p, "lider")) standing = standing * 1.5;
  standing = Math.round(standing);
  const rankBefore = factionRankIndex(p.faction_standing[id] || 0);
  p.faction_standing[id] = (p.faction_standing[id] || 0) + standing;
  p.reputation = Math.min(100, p.reputation + 2);
  // Rütbe töreni: yalnız ömürde görülen EN YÜKSEK rütbe aşılınca (standing düşebilir — useFactionPower −20, leaveFaction ×0.5; damga tekrar töreni keser).
  const rankAfter = factionRankIndex(p.faction_standing[id] || 0);
  const seenRank = p.fac_rank_seen?.[id] ?? 0;
  if (rankAfter > rankBefore && rankAfter > seenRank) {
    (p.fac_rank_seen = p.fac_rank_seen || {})[id] = rankAfter;
    p.fame = Math.min(100, p.fame + 2 + rankAfter); p.honor = Math.min(100, p.honor + 2);
    push(s, "örgüt_görev", `Ocak meclisi toplandı; ${f.name} seni '${FACTION_RANKS[rankAfter].title}' ilan etti. Kadehler senin adına kalktı.`, "kişisel", true, { k: "evj.facRank" + rankAfter, p: [{ fc: id }] });
  }
  gainSkill(s, f.stat === "strength" ? "combat" : f.stat === "charisma" ? "social" : "trade", 6);
  const domNote = dom > 1 ? " Loncan bu sancağa hâkim — sözün daha çok geçti." : "";
  const alts = f.taskAlts || [];
  const tvi = Math.floor(Math.random() * (1 + alts.length));
  const tlabel = tvi === 0 ? f.task.label : alts[tvi - 1];
  const ftlKey = tvi === 0 ? id : id + "." + tvi; // varyant 0 eski anahtarı kullanır
  push(s, "örgüt_görev", `${f.name} için "${tlabel}" görevini gördün (+${reward} akçe, itibar arttı).${domNote}`, "kişisel", false, { k: "evj.factionTask", p: [{ fc: id }, { ftl: ftlKey }, reward, dom > 1 ? { sfx: "sfx.factionDom" } : ""] });
  return s;
}

// ── Fraksiyon AI (Vercel faction_system AI özü) — örgütler dünyada görünür eylemler yapar (haber + gerçek etki) ──
// Kıvılcım kartları (Vercel story_director _draw_spark): durgunlukta küçük bir an dünyayı hatırlatır.
function sparkCard(s: GameState) {
  const p = s.player;
  const card = rnd(["yabanci", "eskidost", "kese", "yolcu", "firin", "serce", "ruya", "usta", "mektup", "cesme", "yildiz"]);
  if (card === "yabanci") { p.reputation = Math.min(100, p.reputation + 1); push(s, "fisilti", "Bir yabancı yolda iki çift laf edip bir haber bıraktı.", "kişisel", false, { k: "spark.yabanci" }); }
  else if (card === "eskidost") { gainSkill(s, "social", 6); push(s, "sohbet", "Eski bir dost çıkageldi; hâl hatır sorup gönlünü ferahlattın.", "kişisel", false, { k: "spark.eskidost" }); }
  else if (card === "kese") { const g = 5 + Math.floor(Math.random() * 9); p.money += g; push(s, "gunluk", `Yolda küçük bir kese buldun (+${g} akçe).`, "kişisel", false, { k: "spark.kese", p: [g] }); }
  else if (card === "yolcu") { p.fame = Math.min(100, p.fame + 1); push(s, "fisilti", "Bir yolcunun uzak diyar masalı dilden dile yayıldı; adın da geçti.", "kişisel", false, { k: "spark.yolcu" }); }
  else if (card === "firin") { p.hunger = Math.min(100, p.hunger + 2); push(s, "gunluk", "Fırının önünden geçerken taze ekmek kokusu sardı; fırıncı sıcak bir uç uzattı: tadına doyulmaz.", "kişisel", false, { k: "spark.firin" }); }
  else if (card === "serce") { p.health = Math.min(100, p.health + 1); push(s, "gunluk", "Duvar dibinde soluklanırken bir serçe yanı başına kondu; bir süre ikiniz de sessizce dünyayı seyrettiniz.", "kişisel", false, { k: "spark.serce" }); }
  else if (card === "usta") { gainSkill(s, "crafting", 6); push(s, "gunluk", "Bir ustanın tezgâhı başında elini uzun uzun seyrettin; bakarak da öğreniliyor.", "kişisel", false, { k: "spark.usta" }); }
  else if (card === "mektup") { addStatXp(s, "intelligence", 1); p.reputation = Math.min(100, p.reputation + 1); push(s, "gunluk", "Okuması olmayan bir komşuya gelen mektubu okudun; iki satır yazı, iki kelime dua kazandırdı.", "kişisel", false, { k: "spark.mektup" }); }
  else if (card === "cesme") { p.honor = Math.min(100, p.honor + 1); push(s, "gunluk", "Çeşme başında bir ihtiyarın testisini doldurup evine kadar taşıdın; kapıda iki dua aldın — biri sana, biri soyuna.", "kişisel", false, { k: "spark.cesme" }); }
  else if (card === "yildiz") { addStatXp(s, "intelligence", 1); push(s, "gunluk", "Damda serinlerken yıldız saydın; biri kaydı, içinden bir dilek geçti. Kimseye söylemedin — söylenirse tutmazmış.", "kişisel", false, { k: "spark.yildiz" }); }
  else { push(s, "gunluk", "Gece tuhaf bir rüya gördün; sabaha içinde bir his kaldı.", "kişisel", false, { k: "spark.ruya" }); }
  if (s.story) s.story.lull = 0;
}
function factionAITick(s: GameState) {
  if (Math.random() >= 0.14) return;
  const f = FACTIONS[Math.floor(Math.random() * FACTIONS.length)];
  const act = rnd(factionTrait(f.id).acts); // eylem fraksiyonun karakterine göre (şifacı asla sabotaj/suikast/darbe yapmaz)
  // Çok oyuncuda beylik hakimiyeti sunucuda → yerel "nüfuz/darbe" beyliği oynatamaz (paralel gerçeklik olmaz).
  if (s.mpRealm && (act === "nufuz" || act === "darbe")) return;
  if (act === "bagis") {
    if (s.player.faction === f.id) { s.player.faction_standing[f.id] = (s.player.faction_standing[f.id] || 0) + 4; const g = 6 + Math.floor(Math.random() * 10); s.player.money += g; push(s, "örgüt", `${f.name} kasasını açtı; üyelerine pay dağıttı (+${g} akçe).`, "makro", false, { k: "fai.bagis.member", p: [{ fc: f.id }, g] }); }
    else push(s, "örgüt", `${f.name} yoksullara sadaka dağıttı; halkın gözünde itibar kazandı.`, "makro", false, { k: "fai.bagis", p: [{ fc: f.id }] });
  } else if (act === "sabotaj") {
    const loc = rnd(LOCATIONS);
    if (!(s.locEvents || []).some((e) => e.loc === loc)) { if (!s.locEvents) s.locEvents = []; s.locEvents.push({ id: Math.random().toString(36).slice(2, 10), loc, type: "eskiya", hafta: s.turn, until: s.turn + 3 + Math.floor(Math.random() * 3) }); s.locEvents = s.locEvents.slice(-4); }
    push(s, "örgüt", `${f.name}'in eli olduğu söylenen bir karışıklık ${loc}'i sardı.`, "makro", true, { k: "fai.sabotaj", p: [{ fc: f.id }, { pl: loc }] });
  } else if (act === "nufuz") {
    const realm = ensureRealm(s); const sn = realm[Math.floor(Math.random() * realm.length)];
    sn.tension = Math.min(120, sn.tension + 12);
    push(s, "örgüt", `${f.name}, ${beylikName(sn.id)} üzerinde nüfuzunu artırıyor.`, "makro", false, { k: "fai.nufuz", p: [{ fc: f.id }, { bl: sn.id }] });
  } else if (act === "suikast") {
    const rivals = ensureRivals(s); if (rivals.length) { const rv = rivals[Math.floor(Math.random() * rivals.length)]; rv.power = Math.max(1, Math.round(rv.power * 0.85)); }
    push(s, "örgüt", `Karanlık bir suikast şehirleri çalkaladı; parmaklar ${f.name}'i gösteriyor.`, "makro", true, { k: "fai.suikast", p: [{ fc: f.id }] });
  } else if (act === "darbe") { // darbe: SALDIRGAN fraksiyon (f) sahibi olmadığı, müttefiki olmayan yüksek-gerilimli sancağı ele geçirmeye çalışır
    const realm = ensureRealm(s);
    const hot = realm.filter((sn) => sn.tension >= 45 && sn.holder !== f.id && factionStance(f.id, sn.holder) <= 0 && !s.wars.some((w) => w.prize === sn.id));
    if (hot.length) {
      const sn = hot[Math.floor(Math.random() * hot.length)];
      if (Math.random() < 0.5) {
        const old = sn.holder; sn.holder = f.id; sn.contender = null; sn.tension = 40;
        if (f.id === s.player.faction) s.player.faction_standing[f.id] = (s.player.faction_standing[f.id] || 0) + 8;
        push(s, "ocak_savasi", `Darbe! ${f.name}, ${beylikName(sn.id)}'i ${factionById(old)?.name}'in elinden aldı.`, "makro", true, { k: "fai.darbe", p: [{ fc: f.id }, { bl: sn.id }, { fc: old }] });
      } else {
        sn.tension = Math.max(0, sn.tension - 20);
        push(s, "ocak_savasi", `${beylikName(sn.id)}'de bir darbe girişimi bastırıldı; ortalık yatıştı.`, "makro", false, { k: "fai.darbeFail", p: [{ bl: sn.id }] });
      }
    }
  } else { // üye toplama — sadece oyuncu aday durumundaysa anlamlı
    if (s.player.faction !== f.id && (s.player.faction_standing[f.id] || 0) < f.joinRep)
      push(s, "örgüt", `${f.name} saflarına yeni yiğitler arıyor; kapısı çalınmayı bekliyor.`, "makro", false, { k: "fai.uye", p: [{ fc: f.id }] });
  }
}
// Oyuncu-güç yüzeyi: örgütün gücünü kullan (Güvenilir rütbe+). İtibar harcar, gerçek fayda verir.
export const FAC_POWER_COST = 20;
export function canUseFactionPower(p: Player): boolean {
  const fid = p.faction; if (!fid) return false;
  const st = p.faction_standing[fid] || 0;
  return factionRankIndex(st) >= 1 && st >= FAC_POWER_COST;
}
export function useFactionPower(prev: GameState, kind: "himaye" | "kese"): GameState {
  const s = clone(prev); const p = s.player; const fid = p.faction;
  if (p.dead || p.age < 13 || !fid || inJail(p) || !canUseFactionPower(p)) return s; // ölü/çocuk/zindandaki oyuncu lonca gücü kullanamaz (diğer eylemlerle tutarlı)
  // Tur başına tek nüfuz kullanımı — yoksa itibar→para aynı turda boşaltılıp farm'lanır.
  if (p.faction_power_turn === s.turn) { push(s, "örgüt", `Ocağın nüfuzunu bu ay zaten kullandın; sık başvurmak yıpratır.`, "kişisel", false, { k: "evj.facPowerWait" }); return s; }
  p.faction_power_turn = s.turn;
  const f = factionById(fid);
  p.faction_standing[fid] = (p.faction_standing[fid] || 0) - FAC_POWER_COST;
  if (kind === "himaye") { // örgüt himayesi: korku düşer, itibar artar, bir söylenti bastırılır
    p.fear = Math.max(0, p.fear - 6); p.reputation = Math.min(100, p.reputation + 3);
    if (s.player_rumors?.length) s.player_rumors = s.player_rumors.slice(1);
    push(s, "örgüt", `${f?.name} seni kanadı altına aldı; düşmanların geri çekildi.`, "kişisel", true, { k: "fac.powHimaye", p: [{ fc: fid }] });
  } else { // örgüt kasası: para desteği
    const g = 25 + Math.floor(Math.random() * 25); p.money += g;
    push(s, "örgüt", `${f?.name} kasasından destek aldın (+${g} akçe).`, "kişisel", false, { k: "fac.powKese", p: [{ fc: fid }, g] });
  }
  return s;
}
// Bir örgüte katıl: yeterli örgüt itibarı (görevle kazanılır) gerekir. Tek örgüt üyeliği.
// Bir fraksiyona geri dönüş yasağı sürüyor mu (kaç tur kaldı; 0 = yasak yok).
export function factionBanLeft(p: Player, id: string, turn: number): number {
  return Math.max(0, (p.factionBans?.[id] ?? 0) - turn);
}
export function joinFaction(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const f = factionById(id);
  if (!f || p.dead || p.age < 13 || inJail(p)) return s; // ocağa kayıt zindandan yapılmaz
  if (p.faction === id) return s;
  if (factionBanLeft(p, id, s.turn) > 0) { push(s, "örgüt_katılım", `${f.name} seni henüz geri almıyor; saflarını terk edenin sözü ağır.`, "kişisel", false, { k: "evj.facBanned", p: [{ fc: f.id }] }); return s; }
  const need = hasPerk(p, "karizmatik") ? Math.round(f.joinRep * 0.8) : f.joinRep;
  if ((p.faction_standing[id] || 0) < need) return s;
  p.faction = id; p.reputation = Math.min(100, p.reputation + 6);
  push(s, "örgüt_katılım", `${f.name} saflarına katıldın. ${f.perk}`, "kişisel", true, { k: "evj.facJoin", p: [{ fc: f.id }, f.perk] });
  return s;
}

// Örgütten ayrıl.
export function leaveFaction(prev: GameState): GameState {
  const s = clone(prev); const p = s.player; const f = factionById(p.faction);
  if (!f) return s;
  const fid = f.id;
  p.faction = null; p.reputation = Math.max(-100, p.reputation - 4);
  // Geri dönüş yasağı tırmanır: ilk ayrılış 26 tur, ikinci 52, üçüncü+ kalıcıya yakın (156).
  if (!p.factionLeaves) p.factionLeaves = {};
  if (!p.factionBans) p.factionBans = {};
  p.factionLeaves[fid] = (p.factionLeaves[fid] || 0) + 1;
  const cd = p.factionLeaves[fid] >= 3 ? 156 : p.factionLeaves[fid] === 2 ? 52 : 26;
  p.factionBans[fid] = s.turn + cd;
  p.faction_standing[fid] = Math.round((p.faction_standing[fid] || 0) * 0.5); // itibar yarılanır
  push(s, "örgüt_ayrılma", `${f.name} saflarından ayrıldın; bir süre geri alınmazsın.`, "kişisel", false, { k: "evj.facLeave", p: [{ fc: f.id }] });
  return s;
}

// ── Sosyal mevki: itibar · şeref · korku · şöhret ──
// Mevki kademeleri (değere göre unvan).
export interface SocialAxis { key: "reputation" | "honor" | "fear" | "fame"; label: string; icon: string; tiers: string[]; desc: string; }
export const SOCIAL_AXES: SocialAxis[] = [
  { key: "reputation", label: "İtibar", icon: "karakter", desc: "Halkın gözündeki saygınlığın.", tiers: ["Lekeli", "Sıradan", "Hatırı Sayılır", "Saygın", "Diyarın İncisi"] },
  { key: "honor", label: "Şeref", icon: "medal", desc: "Sözünün ve adaletinin ağırlığı.", tiers: ["Onursuz", "Sıradan", "Mert", "Şerefli", "Erdemin Timsali"] },
  { key: "fear", label: "Korku", icon: "skull", desc: "Adının uyandırdığı çekince.", tiers: ["Zararsız", "Bilinen", "Çekinilen", "Korkulan", "Diyarın Kâbusu"] },
  { key: "fame", label: "Şöhret", icon: "crown", desc: "Adının ne kadar uzağa ulaştığı.", tiers: ["Meçhul", "Tanınan", "Ünlü", "Meşhur", "Destanlaşan"] },
];
export function socialTierIndex(value: number): number {
  const v = Math.max(0, value);
  if (v >= 80) return 4;
  if (v >= 55) return 3;
  if (v >= 30) return 2;
  if (v >= 10) return 1;
  return 0;
}
export function socialTier(axis: SocialAxis, value: number): string {
  return axis.tiers[socialTierIndex(value)];
}

// Ziyafet ver: akçe harcayıp şöhret + itibar kazan.
// Ebeveynlerini ziyaret et: el öpmek bağı besler — turda tek (karakter ekranından). İkisi de vefat ettiyse kapanır.
export function visitParents(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || (p.mother_dead && p.father_dead)) return s;
  if (p.parent_visit_turn === s.turn) return s; // turda tek — bağ farmı önlenir
  p.parent_visit_turn = s.turn;
  p.parent_bond = Math.min(100, (p.parent_bond ?? 45) + 5);
  p.honor = Math.min(100, p.honor + 1); bumpNam(p, "dindar", 1);
  push(s, "gunluk", `Ana-babanın elini öptün, sofralarına oturdun; duaları üstünde.`, "kişisel", false, { k: "evj.parentVisit" });
  return s;
}
// Eşinle vakit geçir: ocağı bilerek beslemek — küçük bedel, turda tek (karakter ekranından).
export function spendWithSpouse(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || !p.married) return s;
  if (p.spouse_time_turn === s.turn) return s; // turda tek — bağ farmı önlenir
  p.spouse_time_turn = s.turn;
  if (p.spouse_bond === undefined) p.spouse_bond = 40; // eski kayıt göçü
  const cost = Math.round(8 * inflationFactor(s)); // küçük bir ikram — çağın parasıyla (yoksa da gönül alınır)
  const paid = p.money >= cost;
  if (paid) p.money -= cost;
  // Eş mizacı günün rengini belirler: aynı buton, dört ayrı ocak (etkiler küçük — turda tek olduğundan farm yok)
  const miz = p.spouse_mizac || (p.spouse_seed != null ? spouseMizac(p.spouse_seed) : "sefkatli");
  let bondGain = 6;
  if (miz === "sefkatli") { bondGain = 7; p.health = Math.min(100, p.health + 1); }
  else if (miz === "caliskan" && paid) { p.money += Math.round(cost / 2); }
  else if (miz === "dikbasli") { bondGain = 5; addStatXp(s, "strength", 3); bumpNam(p, "mert", 1); }
  else if (miz === "dindar") { p.honor = Math.min(100, p.honor + 1); bumpNam(p, "dindar", 1); }
  p.spouse_bond = Math.min(100, p.spouse_bond + bondGain);
  p.health = Math.min(100, p.health + 2); p.hunger = Math.max(0, p.hunger - 3);
  const sn: EvtParam = p.spouse_seed != null ? { fn: [p.spouse_seed, p.gender === "erkek" ? "kadın" : "erkek"] } : (p.spouse_name || "");
  push(s, "evlilik", `${p.spouse_name || "Eşin"} ile baş başa bir gün geçirdiniz; bağınız pekişti.`, "kişisel", false, { k: (Math.random() < 0.5 ? "evj.spouseTime2." : "evj.spouseTime3.") + miz, p: [sn] });
  return s;
}
// Evlatlarınla ilgilen: en küçüğün yaşına göre bir sahne — soy isim listesi değil, büyüyen hayatlar (turda tek).
export function tendChild(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || !p.children.length) return s;
  if (p.child_time_turn === s.turn) return s; // turda tek — bağ farmı önlenir
  p.child_time_turn = s.turn;
  // En küçük evlat seçilir (evde en çok o var); doğumu kayıtsız eski-kayıt çocukları yetişkin sayılır
  let name = p.children[0]; let age = 18;
  if (p.child_meta?.length) {
    const cm = [...p.child_meta].filter((c) => p.children.includes(c.n)).sort((a, b) => b.born - a.born)[0];
    if (cm) { name = cm.n; age = Math.floor((s.turn - cm.born) / 12); }
  }
  if (!p.child_bond) p.child_bond = {};
  const bond = (d: number) => { p.child_bond![name] = Math.max(0, Math.min(100, (p.child_bond![name] ?? 50) + d)); };
  if (age < 7) { p.health = Math.min(100, p.health + 2); bond(4); push(s, "doğum", `Minik ${name} ile evin önünde oynadın; kahkahası günün yorgunluğunu sildi.`, "kişisel", false, { k: "evj.childTend.bebek", p: [name] }); }
  else if (age < 13) { bond(4); if (p.child_edu?.[name]) p.child_edu[name].weeks += 1; push(s, "cocukluk", `${name} ile rahlenin başına oturdunuz; harfler sökülünce gözleri parladı.`, "kişisel", false, { k: "evj.childTend.mektepli", p: [name] }); }
  else if (age < 18) { bond(4); p.reputation = Math.min(100, p.reputation + 1); push(s, "cocukluk", `${name}'e zanaatının inceliğini gösterdin; el alışkanlığı sana çekmiş.`, "kişisel", false, { k: "evj.childTend.genc", p: [name] }); }
  else { bond(3); p.reputation = Math.min(100, p.reputation + 1); push(s, "gunluk", `Yetişkin evladın ${name} ile sofra kurdunuz; kendi ocağının derdini, sevincini dinledin.`, "kişisel", false, { k: "evj.childTend.yetiskin", p: [name] }); }
  return s;
}
// ── Ay-içi mikro an: panoda beliren tek satırlık, atlanabilir seçim — "aynı üç buton" hissini kırar.
// Etkiler bilinçli olarak minicik: iki seçenek de geçerli, farm yok (an rastgele düşer, ertesi ay kaybolur).
export const MICRO_IDS = ["saganak", "sokak_kedisi", "cirak_tabla", "eski_turku", "yol_soran", "yildiz_gecesi", "nalbant_kivilcimi", "harman_yeli", "bekci_feneri", "kuyu_kovasi", "pazarci_terazisi", "kirlangic_yuvasi", "degirmen_tasi", "gurbet_mektubu", "firin_koru", "cesme_olugu", "kacan_esek", "dugun_davulu", "semerci_ciragi", "ikindi_golgesi", "kar_lapasi", "sahaf_tezgahi", "kopru_dilencisi", "hamal_dengi", "tandir_dumani", "at_nali", "camasir_ipi", "sira_kazani", "ogul_arisi", "tikali_arik"];
export const MICRO_KID_IDS = ["misket_meydani", "leylek_yuvasi", "kagit_gemi", "agac_ucurtmasi", "kuzu_sayimi"]; // 6-12 yaş bandının kendi anları
const MICRO_R_TR: Record<string, [string, string]> = {
  ogul_arisi: [
    "Duman tüttü, sepet dala kalktı; oğul vızıltıyla içeri aktı. Arıcı ilk balı senin adına ayırdı.",
    "Kol açıp kalabalığı gerilettin; ne sokan oldu ne ezilen. Arıcı işini bitirince şapkasını sana salladı.",
  ],
  tikali_arik: [
    "Dizlere kadar çamura girip yaprak ve dal yığınını söktün; su hendekte yeniden şarkısını buldu. İki komşu bir ağızdan sağ ol dedi.",
    "Suyu ikiye bölen taşı beraber koydunuz; nöbetleşe sulama sözü verildi. Kavga suya karıştı, aktı gitti.",
  ],
  camasir_ipi: [
    "Rüzgâra karşı koşup savrulanları tek tek topladın; yaşmaklar, gömlekler kollarında bir deste bulut gibiydi. Komşu kapıda gülerek karşıladı.",
    "Kapı kapı dolaşıp 'sizinki hangisi' diye sordun; çamaşırlar sahiplerini buldu, mahalle bir öğle boyu bunu konuştu.",
  ],
  sira_kazani: [
    "Kepçeye asılıp taşanı çevirdin; kazan duruldu, şıra kurtuldu. Bağcı ilk testiyi senin evine gönderdi.",
    "Çocukları kaynar kazandan uzağa çektin, taşan aktı gitti; bağcı 'şıra gider, çocuk gitmesin' diye omzuna vurdu.",
  ],
  agac_ucurtmasi: [
    "Dala tırmanıp uçurtmayı kurtardın; iple birlikte biraz da yürek indi aşağı. Komşu çocuk ipi sana bir tur verdi.",
    "Uzun sopaya çengel bağlayıp uçurtmayı dalların arasından çektin; kimse tırmanmadı, kimse düşmedi — akıl kazandı.",
  ],
  kuzu_sayimi: [
    "Kuzuları taş dizerek saydın: kırk bir. Dede güldü: 'Demek gözüm değil, hesabım eskimiş.' Sayı defterine geçti.",
    "Kuzularla beraber koştun; sayı yine tutmadı ama sürü ağıla güle oynaya girdi. Dede yorgunluğuna bir tas süt verdi.",
  ],
  hamal_dengi: [
    "Omzunu dengin altına verdin; ikiniz bir olup yükü hana taşıdınız. Hamal 'eski usul' diye güldü: 'Omuz omuza.'",
    "İpi kendi düğümünle yeniden bağladın; denk bir daha kaymadı. Hamal düğüme baktı, öğrenmek istedi.",
  ],
  tandir_dumani: [
    "Koşup hamur tahtasına geçtin; ekmekler kararmadan kurtuldu. Komşu ilk sıcak somunu senin eline tutuşturdu.",
    "Kendi hamurunu götürüp tandırın hakkını verdin; iki hane bir dumanda buluştu. Mahalle bunu konuştu.",
  ],
  at_nali: [
    "Keçeyle çevirip nalı geçici sardın; at aksamadan hana vardı. Kervancı ustalığına baş salladı.",
    "Nalbanta koşup haber verdin; soluk soluğa döndüğünüzde at hâlâ sabırla bekliyordu. Terini kervancının suyu dindirdi.",
  ],
  misket_meydani: ["Dizüstü çöküp nişan aldın; üç misket kazandın, birini en küçüğe verdin. Meydanın ustası şapkasını çıkardı.", "Duvar dibinden seyrettin; ustanın bilek hilesini gözünle çaldın. Sıra sana gelince hazır olacaksın."],
  leylek_yuvasi: ["Sevinç çığlığına sen de katıldın; leylek kanat çırptı, mahalle güldü. Bahar hep birlikte karşılanınca daha erken gelir.", "Sessizce izledin: leylek üç dal taşıdı, ikisini düşürdü, yine taşıdı. İçinden 'demek böyle yapılıyor' dedin."],
  kagit_gemi: ["Gemin iki bendi aştı, üçüncüde devrildi — ama en uzağa giden oydu. Çocuklar adını 'kaptan' koydu.", "Taş ve çamurla küçük bir bent kurdun; su birikti, gemiler yeni havuzda yarıştı. Mimarı unutulmadı."],
  kar_lapasi: ["Kar savaşının ortasına daldın; yanaklar al al, yürek çocuk. Akşam yorgunluğu tatlıydı.", "Tandırın başında elini ısıttın; dışarıda cıvıltı, içeride köz. İkisi de kışın hakkı."],
  sahaf_tezgahi: ["Sayfaları düzeltip taşla bastırdın; sahaf teşekkür yerine bir beyit okudu. İkiniz de kazandınız.", "Yüksek sesle bir beyit okudun; tezgâh önünde iki kişi durdu, biri cöngü satın aldı. Sahafın gözü güldü."],
  kopru_dilencisi: ["Taşın üstüne çömelip dinledin: bir zamanlar kervan sahibiymiş. Hikâyenin sonunda tasına birkaç akçe düştü — başkalarından.", "Hırkanı omzuna bıraktın; ihtiyar gözlerini kapatıp uzun bir dua etti. Yağmur başladığında üşüyen sen değildin."],
  nalbant_kivilcimi: ["Alnını okşayıp kulağına bir şeyler mırıldandın; at duruldu. Nalbant 'eline sağlık' dedi.", "Ustanın çekiç ritmini çözdün: el, göz ve sabır — zanaat dediğin üçünün toplamı."],
  harman_yeli: ["Örtünün ucundan tuttun; harman kurtuldu. Komşu akşam kapına bir tas bulgur bıraktı.", "Rüzgârın savurduğu başakları topladın; akşam çorbasına bir avuç bereket."],
  bekci_feneri: ["Ocaktan kor uzattın; fener yeniden yandı. O gece sokağın uykusu senin korunla aydınlandı, bekçi duasını esirgemedi.", "Fitili kesip düzelttin; alev daha gür yandı. Bekçi 'usta elin varmış' diye söylendi."],
  kuyu_kovasi: ["Çalı çırpıdan bir kanca uydurup kovayı çıkardın; ahali 'eline sağlık' dedi.", "Heybenden ipi çözüp verdin; kova yeniden suya indi, teşekkürü bol oldu."],
  pazarci_terazisi: ["Kefeyi söküp tozunu aldın; ibre duruldu, iki taraf da yatıştı.", "İki tatlı sözle gönülleri aldın; pazarcı bir avuç kuru üzüm uzattı."],
  kirlangic_yuvasi: ["Bir çıta ile yuvayı besledin; ana kuş az sonra döndü, cıvıltı şenlendi.", "Ev sahibi merdivenle yetişti; yuva kurtuldu, sen de duasını aldın."],
  degirmen_tasi: ["Omuz omuza yüklendiniz; taş gıcırdayıp yerine oturdu. Değirmenci ununu avuçlayıp heybene boşalttı.", "Söğüt dalından kaldıraçla taş kendiliğinden döner gibi oturdu; değirmenci 'akıl yaşta değil' diye güldü."],
  gurbet_mektubu: ["Mektubu ağır ağır okudun; kadın her cümlede bir güldü, bir ağladı. Duası yol boyu peşinden geldi.", "Kadın söyledi, sen yazdın; kâğıdı üç kez öpüp koynuna koydu. 'Eline kalem değmişlerden ol' dedi."],
  firin_koru: ["Köz çömleğini kendin taşıdın; çocuk seke seke önüne düştü. Kapıda anası ardından dua yağdırdı.", "Maşayı doğru kavramayı gösterdin; çocuk közü kendi taşıdı, kapıdan girerken bir kez dönüp baktı — gözlerinde bir büyümüşlük vardı."],
  cesme_olugu: ["Söğüt çubuğuyla yosunu söktün; su gürül gürül koyverdi. Testiler şıpır şıpır doldu, ardından su gibi dua döküldü.", "Yaşlıyı öne, aceleciyi sıraya aldın; tatlı dil kuyruğu durulttu. Su ince aktı ama gönüller ferahladı."],
  kacan_esek: ["Eşeği köşede sıkıştırıp yularından yakaladın; sahibi soluk soluğa yetişti, teşekkürü bol oldu.", "Havucu görünce eşek kendiliğinden durdu; pazarcılar güldü, sahibi utana utana yuları aldı."],
  dugun_davulu: ["Tokmağı kapıp ritmi tuttun; halay bozulmadı, davulcu kolunu ovuştururken sana baş salladı.", "El çırpa çırpa zurnacıya eşlik ettin; düğün evinin coşkusu sokağı aştı."],
  semerci_ciragi: ["Omuz verdin, çuvallar yeniden semere bağlandı; çırak alnının terini silip sana usta der gibi baktı.", "Yolu gösterdin: yükü ikiye bölüp iki seferde taşıdı. Akıl da bir omuzdur derler."],
  ikindi_golgesi: ["Duvarın gölgesinde ihtiyarın yanına çöktün; hurmayı bölüştünüz, o eski kervan yollarını anlattı.", "Selam verip yoluna devam ettin; ihtiyarın duası ensende bir serinlik gibi kaldı."],
  saganak: ["Sırılsıklam ama dinç döndün; yağmur insanı bilerken vücudu peklerştirir derler.", "Saçak altında bir soluk aldın; damlaların sesi içini dinlendirdi."],
  sokak_kedisi: ["Kedi karnını doyurup dizine kıvrıldı; komşular gülümseyerek baktı.", "Kedi bir süre seni süzdü, sonra kendi yoluna gitti; sabır da bir liman."],
  cirak_tabla: ["Beraber topladınız; ustası uzaktan görüp başını salladı: 'Aferin.'", "Tozlu simide akçe saydın; çırağın yüzü güldü, tadı da fena değildi."],
  eski_turku: ["Sesin nağmeye karıştı; türkü bitince meydandakiler birbirine gülümsedi.", "Nağme eski günleri getirdi geçirdi; için bir hoş oldu."],
  yol_soran: ["Adam duasını eksik etmeden yola koyuldu; iyilik iz bırakır.", "Patikaları bir bir saydın; kendi diyarını ne kadar iyi bildiğini fark ettin."],
  yildiz_gecesi: ["Dileğini kimseye söylemedin; içinde sıcak bir umut yandı.", "Sayı yüzü geçince şaşırdın kaldın; gökyüzü insanı küçültür, ferahlatır."],
};
export function resolveMicro(prev: GameState, choice: 0 | 1): GameState {
  const s = clone(prev); const p = s.player;
  const m = s.micro; if (!m || p.dead) return s;
  if (m.id === "cirak_tabla" && choice === 1 && p.money < 2) return s; // akçesiz simit alınmaz — günlüğe "akçe saydın" düşmesin (UI de kapatır)
  s.micro = null;
  const id = m.id;
  if (id === "saganak") { if (choice === 0) addStatXp(s, "stamina", 3); else p.health = Math.min(100, p.health + 1); }
  else if (id === "sokak_kedisi") { if (choice === 0) { bumpNam(p, "comert", 1); p.hunger = Math.max(0, p.hunger - 2); } else addStatXp(s, "stamina", 2); }
  else if (id === "cirak_tabla") { if (choice === 0) { p.reputation = Math.min(100, p.reputation + 1); bumpNam(p, "comert", 1); } else if (p.money >= 2) { p.money -= 2; p.hunger = Math.min(100, p.hunger + 4); } }
  else if (id === "eski_turku") { if (choice === 0) gainSkill(s, "social", 3); else p.health = Math.min(100, p.health + 1); }
  else if (id === "yol_soran") { if (choice === 0) p.reputation = Math.min(100, p.reputation + 1); else addStatXp(s, "intelligence", 2); }
  else if (id === "yildiz_gecesi") { if (choice === 0) bumpNam(p, "dindar", 1); else addStatXp(s, "intelligence", 2); }
  else if (id === "nalbant_kivilcimi") { if (choice === 0) addStatXp(s, "charisma", 2); else addStatXp(s, "intelligence", 2); }
  else if (id === "harman_yeli") { if (choice === 0) { bumpNam(p, "comert", 1); p.reputation = Math.min(100, p.reputation + 1); } else p.hunger = Math.min(100, p.hunger + 2); }
  else if (id === "bekci_feneri") { if (choice === 0) bumpNam(p, "dindar", 1); else gainSkill(s, "crafting", 2); }
  else if (id === "kuyu_kovasi") { if (choice === 0) gainSkill(s, "crafting", 2); else bumpNam(p, "comert", 1); }
  else if (id === "pazarci_terazisi") { if (choice === 0) addStatXp(s, "intelligence", 2); else gainSkill(s, "social", 2); }
  else if (id === "kirlangic_yuvasi") { if (choice === 0) bumpNam(p, "comert", 1); else p.reputation = Math.min(100, p.reputation + 1); }
  else if (id === "degirmen_tasi") { if (choice === 0) addStatXp(s, "stamina", 3); else gainSkill(s, "crafting", 2); }
  else if (id === "gurbet_mektubu") { if (choice === 0) gainSkill(s, "social", 2); else addStatXp(s, "intelligence", 2); }
  else if (id === "firin_koru") { if (choice === 0) { bumpNam(p, "comert", 1); p.reputation = Math.min(100, p.reputation + 1); } else addStatXp(s, "intelligence", 2); }
  else if (id === "cesme_olugu") { if (choice === 0) gainSkill(s, "crafting", 2); else gainSkill(s, "social", 2); }
  else if (id === "kacan_esek") { if (choice === 0) addStatXp(s, "strength", 3); else addStatXp(s, "intelligence", 2); }
  else if (id === "dugun_davulu") { if (choice === 0) { gainSkill(s, "social", 3); p.fame = Math.min(100, p.fame + 1); } else gainSkill(s, "social", 2); }
  else if (id === "semerci_ciragi") { if (choice === 0) { addStatXp(s, "strength", 3); gainSkill(s, "crafting", 2); } else { addStatXp(s, "intelligence", 3); gainSkill(s, "social", 1); } }
  else if (id === "ikindi_golgesi") { if (choice === 0) { gainSkill(s, "social", 3); addStatXp(s, "intelligence", 2); } else addStatXp(s, "stamina", 2); }
  else if (id === "kar_lapasi") { if (choice === 0) { addStatXp(s, "stamina", 2); p.health = Math.min(100, p.health + 1); } else p.hunger = Math.min(100, p.hunger + 2); }
  else if (id === "sahaf_tezgahi") { if (choice === 0) addStatXp(s, "intelligence", 2); else gainSkill(s, "social", 2); }
  else if (id === "kopru_dilencisi") { if (choice === 0) { gainSkill(s, "social", 2); bumpNam(p, "comert", 1); } else { bumpNam(p, "comert", 1); p.reputation = Math.min(100, p.reputation + 1); } }
  else if (id === "hamal_dengi") { if (choice === 0) addStatXp(s, "strength", 3); else gainSkill(s, "crafting", 2); }
  else if (id === "tandir_dumani") { if (choice === 0) { gainSkill(s, "social", 2); bumpNam(p, "comert", 1); } else { p.reputation = Math.min(100, p.reputation + 1); bumpNam(p, "comert", 1); } }
  else if (id === "at_nali") { if (choice === 0) gainSkill(s, "crafting", 2); else addStatXp(s, "stamina", 3); }
  else if (id === "camasir_ipi") { if (choice === 0) addStatXp(s, "stamina", 2); else { gainSkill(s, "social", 2); bumpNam(p, "comert", 1); } }
  else if (id === "sira_kazani") { if (choice === 0) addStatXp(s, "strength", 2); else { gainSkill(s, "social", 2); p.reputation = Math.min(100, p.reputation + 1); } }
  else if (id === "ogul_arisi") { if (choice === 0) { addStatXp(s, "stamina", 2); gainSkill(s, "crafting", 1); } else { gainSkill(s, "social", 2); p.reputation = Math.min(100, p.reputation + 1); } }
  else if (id === "tikali_arik") { if (choice === 0) { addStatXp(s, "strength", 2); addStatXp(s, "stamina", 1); } else { gainSkill(s, "social", 2); bumpNam(p, "comert", 1); } }
  else if (id === "misket_meydani") { if (choice === 0) { addStatXp(s, "intelligence", 2); gainSkill(s, "social", 1); } else addStatXp(s, "intelligence", 2); }
  else if (id === "leylek_yuvasi") { if (choice === 0) { p.health = Math.min(100, p.health + 1); gainSkill(s, "social", 1); } else addStatXp(s, "intelligence", 2); }
  else if (id === "kagit_gemi") { if (choice === 0) gainSkill(s, "social", 2); else { gainSkill(s, "crafting", 1); addStatXp(s, "intelligence", 1); } }
  else if (id === "agac_ucurtmasi") { if (choice === 0) addStatXp(s, "strength", 2); else addStatXp(s, "intelligence", 2); }
  else if (id === "kuzu_sayimi") { if (choice === 0) addStatXp(s, "intelligence", 2); else { addStatXp(s, "stamina", 2); p.health = Math.min(100, p.health + 1); } }
  const rtr = MICRO_R_TR[id];
  push(s, "gunluk", rtr ? rtr[choice] : "", "kişisel", false, { k: `micro.${id}.r${choice}` });
  return s;
}
// ── Kül Yemini: nesiller aşan ana destan — Perde 1 "Emanet" (Kösedağ sonrası Moğol gölgesi). ──
// Tasarım: sahneler yaş/tur/gezi kapılarıyla açılır ve panoda BEKLER (ana yay acele ettirmez); her sahne ömürde
// bir kez düşer, ödüller tek seferlik ve küçüktür (farm yok). Satış (ihanet) dalı perdeyi erken kapatır; kaçış
// dalı yaprağı yakar — izler path'te tutulur, gelecek perdeler bunlara göre renklenir. Destan vârise geçer.
export const SAGA1_IDS = ["emanet_muhur", "tahsildar_golgesi", "tas_kapi", "yemin_defteri", "gece_kapisi"];
export const SAGA_CHOICES: Record<string, number> = { emanet_muhur: 2, tahsildar_golgesi: 3, tas_kapi: 3, yemin_defteri: 3, gece_kapisi: 3, d2_muhur_geri: 3, d2_cagri: 3, d2_ahi_baci: 3, d2_eskiya_hani: 3, d2_hain_iz: 3, d2_yaris: 3, d3_besinci_kapi: 3, d3_davet: 3, d3_konak_hesabi: 3, d3_yemin_gecesi: 3, d3_kul_yemini: 3 };
export const SAGA2_IDS = ["d2_cagri", "d2_ahi_baci", "d2_eskiya_hani", "d2_hain_iz", "d2_yaris"];
export const SAGA3_IDS = ["d3_besinci_kapi", "d3_davet", "d3_konak_hesabi", "d3_yemin_gecesi", "d3_kul_yemini"];
export const SAGA_COST: Record<string, Record<number, number>> = { tas_kapi: { 1: 8 }, gece_kapisi: { 1: 40 }, d2_muhur_geri: { 1: 200 }, d2_ahi_baci: { 2: 15 }, d2_eskiya_hani: { 1: 30 }, d3_davet: { 1: 25 } };
const SAGA_R_TR: Record<string, string[]> = {
  emanet_muhur: [
    "Mührü avucuna kapattın; ihtiyarın gözleri son kez güldü: 'Yemin artık sende.'",
    "Geri çekildin; ihtiyar mührü göğsüne bastırıp yüzünü duvara döndü. Bir şey yarım kaldı.",
  ],
  tahsildar_golgesi: [
    "Mührü kuşağının içine, yüreğinin hizasına sakladın; tahsildarın gözü üstünden kaydı geçti.",
    "Mührü göğsünde açıkça taşıdın; çarşıda kimi başını eğdi, kimi uzun uzun baktı. Yeminin bekçisi diye anılmaya başladın.",
    "Derviş mührü şöyle bir çevirdi: 'Kösedağ'da düşenlerin nişanı. Sakla — kapısı vakti gelince kendini bulur.'",
  ],
  tas_kapi: [
    "Toprağı elinle kazıdın; oymanın altından bir oyuk çıktı — içinde küflü bir bez, bezin içinde bir yaprak: 'Emanet defteri beşe bölündü.'",
    "Usta oymaya baktı, mühre baktı: 'Bu Selçuklu sipahi nişanı. Beş kervansarayda eşi var — bu ilk kapı.' Akçesini hak etti.",
    "Kapının önünde durup işareti aklına kazıdın. Bazı kapılar sabırla açılır — vakti gelince dönersin.",
  ],
  yemin_defteri: [
    "Mührü sıktın ve yemini içtin: 'Düşenlerin emaneti sahipsiz kalmayacak.' O gece rüyanda beş taş kapı gördün.",
    "Karakuş'un adamı keseyi bıraktı, mührü aldı; giderken güldü: 'Akıllıca pazarlık.' Kese ağır — ama gece uykun hafif değil.",
    "Yaprağı katlayıp kaldırdın. Bazı yükler omuz ister; senin omzun bugün başka yüklere ayarlı. Ama mühür hâlâ kuşağında.",
  ],
  gece_kapisi: [
    "Kapı eşiğinde çelik konuştu; üçünü de geri püskürttün ama omzunda derin bir iz kaldı. Atlılar giderken öndeki seslendi: 'Bey bunu unutmaz.' Mühür ve yaprak hâlâ sende.",
    "Keseyi saydın, tatlı dille geceyi savdın; atlılar mührü görmeden döndü. Öndeki homurdandı: 'Bulamadık, bey.' Bu gecelik paçayı kurtardın.",
    "Arka pencereden harman yeline karıştın; sabaha kadar dere yatağında bekledin. Döndüğünde kapı kırıktı ama mühür koynundaydı — yaprak ocakta kül olmuştu.",
  ],
  d2_muhur_geri: [
    "Gece yarısı sandık açıldı; mühür avucuna döndü. Handan çıkarken bekçi horluyordu — kimse bilmeyecek, ama sen bileceksin.",
    "Çerçi keseyi tarttı, mührü uzattı: 'Uğursuz çıktı zaten.' Pahalı bir kefaret — ama helal.",
    "Haberi Karakuş'un adamına sattın; mühür yine beyin eline geçti. Kese doldu — yemin uzaklaştı. Derviş bir daha kapını çalmadı.",
  ],
  d2_cagri: [
    "Heybe omuzda, mühür kuşakta; ilk adım atıldı. Yol, yürüyenin ayağına gelir.",
    "Azık, ip, çakmaktaşı: kervancı gibi hazırlandın. Aceleyle çıkanın yolda aklı kalır.",
    "Derviş güldü: 'Sır mı? İkinci kapının bekçisi kadındır; töreyi bilen geçer.' Asasıyla iz çizdi, gitti.",
  ],
  d2_ahi_baci: [
    "Üç çay, üç hikâye; bacı sonunda ocaklığın taşını çekti: 'Arayan içmesini bilir.' İkinci yaprak kuşağında.",
    "Bacı çayı geri çekti: 'Acelen kapıdan büyükmüş.' Bir gün bekledin, bir özür borcuyla yaprağı yine de verdi — ama han bunu unutmaz.",
    "Hediyen ocağa kondu; bacı gülümsedi: 'Ahilik alandan çok verende durur.' Yaprağı kendi eliyle kuşağına iliştirdi.",
  ],
  d2_eskiya_hani: [
    "Avluda çelik şimşek gibi çaktı; ikisi kaçtı, üçü diz çöktü. Kuyu bileziğinin altından üçüncü yaprak çıktı — kolundaki yara da yol hatırası.",
    "Reisleri keseyi tarttı: 'Yol herkese, hak ödeyene.' Kuyuya kendisi indi, yaprağı kendisi verdi. Eşkıyanın da töresi var.",
    "Şafakta gölgeler sızdı, sen de aralarına karıştın; kuyu bileziği sessizce açıldı. Beş gölge horlarken üçüncü yaprak sahibini buldu.",
  ],
  d2_hain_iz: [
    "Adı ve suçu olduğu gibi yazdın: 'Yemin doğruyu sever.' Yazması acıttı; okunması kimini yaktı — ama kronik artık tam.",
    "Satırı boş bıraktın: 'Hesabı Divan'a kaldı.' İhtiyarın sana güldüğü o son bakış, boş satırın içinde saklı duracak.",
    "Adı ezberledin, yaprağı ayrı kata katladın. Karakuş'un kapısında bir gün bu ad, kılıçtan keskin bir anahtar olabilir.",
  ],
  d2_yaris: [
    "Keçi yolundan gece yürüdün; şafakta manastır avlusundaydın. Atlılar vardığında dördüncü yaprak çoktan kuşağındaydı — toz yutan onlar oldu.",
    "Geçitte çığ taşları ve gergin ipler onları yarım gün oyaladı; manastırda sana yetecek kadar sessizlik kaldı. Dördüncü yaprak — ve öfkeli bir bey.",
    "Atlıların öndekiyle avluda pazarlık kuruldu: yaprağın sureti onlara, aslı sana — ve beye bir söz: 'Hesap son kapıda.' Kimse kılıç çekmedi; herkes bunu hatırlayacak.",
  ],
  d3_besinci_kapi: [
    "Sipahi başını eğdi: 'Doğru cevap. Otuz yıldır bu cümleyi bekliyordum.' Serdabın taşı açıldı; son yaprak ve defterin cildi gün yüzü gördü.",
    "Sipahinin gözleri karardı ama sözünü tuttu: 'Kapı cevabı değil, geleni tanır.' Taşı açtı, yaprağı verdi — ardından duasını değil, kederini yolladı.",
    "Sipahi güldü: 'Öğrenmek de bir cevaptır.' Gece boyu Kösedağ'ı anlattı; şafakta taş açıldı, yaprağı miras değil ders diye verdi.",
  ],
  d3_davet: [
    "Mektubu katlayıp atına bindin: korkunun üstüne yürüyen, gölgesini küçültür. Konağın kapısı ardına kadar açıldı — bir tuzağa ya da bir masaya.",
    "Gençler nöbete, ihtiyarlar duaya, akçen hendeğe gitti. Karakuş'un öncüleri köyü tahkim edilmiş bulup geri döndü — bu kez.",
    "Divan mührü mühre, yaprağı yaprağa vurdu; kadı 'emanet sahibinindir' diye hükmetti. Karakuş hükümden dönmez — ama artık gözler onun üstünde.",
  ],
  d3_konak_hesabi: [
    "Yaprakları önüne serdin; babasının adını kendi gözüyle okudu. Uzun sustu. 'Demek miras değil, kefaretmiş' dedi; defterin üstünden elini çekti.",
    "Masayı devirip eldivenini attın... Karakuş gülümsedi: 'Cesursun. Meydan son kapıda olsun — kazanan defteri, kaybeden duayı alır.'",
    "'Payını al, davandan vazgeç' dedin. Kese ağırdı, sözü kısa: 'Babamın adını temizleyen pay keseden büyükmüş.' Yarısını hayra verdi, seninle kalktı.",
  ],
  d3_yemin_gecesi: [
    "Ad okundu, emanet verildi; kimi ağladı, kimi dua etti. Meydan boşalırken kuşağın hafif, adın ağırdı.",
    "'Bulanın hakkı' dedin; kimse karşı çıkmadı — yüksek sesle. Kese hanedanına kaldı; fısıltılar da köye.",
    "Defter vakfa bağlandı: geliri yetime, yolcuya, medreseye. Taşa adın değil, yeminin kazındı — taş adları eskitir, yeminleri eskitemez.",
  ],
  d3_kul_yemini: [
    "'Yemin kan istemez' dedin, elini uzattın. Karakuş dizini yere koydu, sonra omzunun hizasına kalktı. Diyar bunu yüz yıl konuşacak.",
    "'Bu diyarda sana yer yok' dedin. Atına bindi, ardına bakmadı. Sınırda bir kez döndü: 'Adil oldun' — sonra toz oldu.",
    "Meydanda çelik konuştu; yaşlı kurt yaman dövüştü ama yemin bileğinden güçlüydü. Kılıcını toprağa saplayıp 'Hesap kapandı' dedi.",
  ],
};
export function resolveSaga(prev: GameState, choice: 0 | 1 | 2): GameState {
  const s = clone(prev); const p = s.player;
  const sg = s.saga; if (!sg || !sg.scene || p.dead) return s;
  const id = sg.scene;
  const cost = SAGA_COST[id]?.[choice] || 0;
  if (cost > 0 && p.money < cost) return s; // akçesiz seçenek işlemez (UI de kapatır)
  sg.scene = null; sg.lastTurn = s.turn; sg.path = { ...sg.path, [id]: choice };
  let endKey: string | null = null;
  if (id === "emanet_muhur") {
    if (choice === 0) { sg.ch = 1; bumpNam(p, "mert", 1); p.reputation = Math.min(100, p.reputation + 1); }
    else sg.declined = (sg.declined || 0) + 1; // ret: mühür bekler; 24 ay sonra son bir kez daha sorulur
  } else if (id === "tahsildar_golgesi") {
    sg.ch = 2;
    if (choice === 0) addStatXp(s, "intelligence", 3);
    else if (choice === 1) { p.fear = Math.min(100, p.fear + 2); p.reputation = Math.min(100, p.reputation + 1); }
    else gainSkill(s, "social", 3);
  } else if (id === "tas_kapi") {
    sg.ch = 3;
    if (choice === 0) gainSkill(s, "crafting", 3);
    else if (choice === 1) { p.money -= cost; addStatXp(s, "intelligence", 4); }
    else addStatXp(s, "stamina", 2);
  } else if (id === "yemin_defteri") {
    if (choice === 0) { sg.ch = 4; bumpNam(p, "mert", 2); p.reputation = Math.min(100, p.reputation + 2); }
    else if (choice === 1) { sg.ch = 5; const kese = Math.round(120 * inflationFactor(s)); p.money += kese; bumpNam(p, "zalim", 1); p.honor = Math.max(0, p.honor - 3); endKey = "saga.act1EndSold"; } // ihanet dalı: perde erken kapanır
    else { sg.ch = 4; p.health = Math.min(100, p.health + 1); } // uzak durmak seni oyundan çıkarmaz — Karakuş yine gelir
  } else if (id === "gece_kapisi") {
    sg.ch = 5; endKey = "saga.act1End";
    if (choice === 0) { gainSkill(s, "combat", 5); p.health = Math.max(1, p.health - 6); }
    else if (choice === 1) { p.money -= cost; gainSkill(s, "social", 4); }
    else addStatXp(s, "stamina", 3);
  } else if (id === "d2_muhur_geri") { // ihanet dalının kefaret sahnesi: mühür geri gelmeden Perde 2 akmaz
    if (choice === 0) { addStatXp(s, "intelligence", 3); p.fear = Math.min(100, p.fear + 1); }
    else if (choice === 1) { p.money -= cost; p.honor = Math.min(100, p.honor + 2); }
    else { sg.declined = 9; const kese = Math.round(80 * inflationFactor(s)); p.money += kese; p.honor = Math.max(0, p.honor - 4); bumpNam(p, "zalim", 1); } // haberi satan bu ömürde destandan düşer (tek seferlik kese; sentinel tekrar ödemeyi kapatır, vâriste sıfırlanır)
  } else if (id === "d2_cagri") {
    sg.ch = 1;
    if (choice === 0) bumpNam(p, "mert", 1);
    else if (choice === 1) addStatXp(s, "intelligence", 2);
    else gainSkill(s, "social", 2);
  } else if (id === "d2_ahi_baci") {
    sg.ch = 2;
    if (choice === 0) gainSkill(s, "social", 4);
    else if (choice === 1) p.reputation = Math.max(0, p.reputation - 1);
    else { p.money -= cost; bumpNam(p, "comert", 1); }
  } else if (id === "d2_eskiya_hani") {
    sg.ch = 3;
    if (choice === 0) { gainSkill(s, "combat", 4); p.health = Math.max(1, p.health - 5); }
    else if (choice === 1) p.money -= cost;
    else { addStatXp(s, "intelligence", 3); p.fear = Math.min(100, p.fear + 1); }
  } else if (id === "d2_hain_iz") {
    sg.ch = 4;
    if (choice === 0) { bumpNam(p, "mert", 2); p.reputation = Math.min(100, p.reputation + 1); }
    else if (choice === 1) bumpNam(p, "dindar", 1);
    else addStatXp(s, "intelligence", 3);
  } else if (id === "d2_yaris") {
    sg.ch = 5; endKey = "saga.act2End";
    if (choice === 0) { addStatXp(s, "stamina", 4); p.health = Math.max(1, p.health - 3); }
    else if (choice === 1) addStatXp(s, "intelligence", 4);
    else p.honor = Math.min(100, p.honor + 1); // bölüşme: kan dökülmedi — izi path'te, Perde 3 hatırlayacak
  } else if (id === "d3_besinci_kapi") {
    sg.ch = 1;
    if (choice === 0) bumpNam(p, "mert", 2);
    else if (choice === 1) bumpNam(p, "zalim", 1);
    else addStatXp(s, "intelligence", 3);
  } else if (id === "d3_davet") {
    sg.ch = 2;
    if (choice === 0) addStatXp(s, "charisma", 3);
    else if (choice === 1) { p.money -= cost; p.reputation = Math.min(100, p.reputation + 1); }
    else p.reputation = Math.min(100, p.reputation + 2);
  } else if (id === "d3_konak_hesabi") {
    sg.ch = 3;
    if (choice === 0) p.honor = Math.min(100, p.honor + 2);
    else if (choice === 1) p.fear = Math.min(100, p.fear + 2);
    else bumpNam(p, "comert", 1);
  } else if (id === "d3_yemin_gecesi") {
    sg.ch = 4;
    if (choice === 0) { p.reputation = Math.min(100, p.reputation + 3); bumpNam(p, "comert", 1); }
    else if (choice === 1) { const pay = Math.round(150 * inflationFactor(s)); p.money += pay; p.honor = Math.max(0, p.honor - 2); bumpNam(p, "zalim", 1); } // tek seferlik hanedan payı — onur bedelli
    else { p.reputation = Math.min(100, p.reputation + 3); bumpNam(p, "dindar", 2); }
  } else if (id === "d3_kul_yemini") {
    sg.ch = 5; endKey = "saga.act3End";
    p.fates = p.fates || []; if (!p.fates.includes("kul_yemini")) p.fates.push("kul_yemini"); // kalıcı iz: destan tamam
    if (choice === 0) { bumpNam(p, "mert", 2); p.reputation = Math.min(100, p.reputation + 2); }
    else if (choice === 1) p.fear = Math.min(100, p.fear + 3);
    else { gainSkill(s, "combat", 6); p.health = Math.max(1, p.health - 8); }
  }
  const rtr = SAGA_R_TR[id];
  push(s, "destan", (rtr && rtr[choice]) || "", "kişisel", true, { k: `saga.${id}.r${choice}` });
  if (endKey === "saga.act1End") push(s, "destan", "Perde kapandı: mühür hâlâ sende ve beş taş kapının ilki bulundu. Gerisi belki senin ömrüne, belki vârisinin ömrüne yazılacak.", "kişisel", true, { k: endKey });
  else if (endKey === "saga.act1EndSold") push(s, "destan", "Perde kapandı: mühür Karakuş'un elinde, kesesi senin koynunda. Defter hâlâ beş parça — ve bu hikâye seninle işini bitirmedi.", "kişisel", true, { k: endKey });
  else if (endKey === "saga.act2End") push(s, "destan", "İkinci perde kapandı: yapraklar kuşağında çoğaldı; geriye son kapı ve Karakuş'un hesabı kaldı.", "kişisel", true, { k: endKey });
  else if (endKey === "saga.act3End") push(s, "destan", "Kül Yemini tamam: defter sahiplerini buldu, mühür artık hanedanının nişanı. Kösedağ'da düşenler bu gece rahat uyuyacak.", "kişisel", true, { k: endKey });
  return s;
}
function sagaTick(s: GameState) {
  const p = s.player;
  if (p.dead || p.age < 13 || inJail(p)) return;
  if (s.saga && s.saga.scene) return; // bekleyen sahne varken yenisi düşmez
  if (!s.saga) {
    if (chance(0.18)) {
      s.saga = { act: 1, ch: 0, scene: "emanet_muhur", path: {}, lastTurn: s.turn };
      push(s, "destan", "Köyün en yaşlısı döşeğinden seni çağırttı; avucunda kül rengi bir mühür duruyor.", "kişisel", true, { k: "saga.start" });
    }
    return;
  }
  const sg = s.saga;
  const gap = s.turn - (sg.lastTurn ?? 0);
  const seen = new Set([...(p.cities_visited || []), p.location_name]).size;
  if (sg.act === 1 && sg.ch >= 5) { // perde arası: yemin dinlenir, sonra ikinci perde çağrısı düşer
    if (gap >= 15 && chance(0.25)) {
      sg.act = 2; sg.ch = 0; sg.lastTurn = s.turn;
      if (sg.path["yemin_defteri"] === 1) {
        sg.scene = "d2_muhur_geri";
        push(s, "destan", "Haber çarşıya düştü: Karakuş'un kervanı soyulmuş, mühür yeniden ortada. Derviş kapında: 'Sattığını geri almadan hiçbir kapı açılmaz.'", "kişisel", true, { k: "saga.act2StartSold" });
      } else {
        sg.scene = "d2_cagri";
        push(s, "destan", "Derviş yeniden belirdi; asasıyla doğuyu gösterdi: 'İkinci kapı Sivas yolunda. Yemin yürüyeni sever.'", "kişisel", true, { k: "saga.act2Start" });
      }
    }
    return;
  }
  if (sg.act === 1) {
    if (sg.ch === 0) { // emanet reddedildi: 24 ay sonra son bir kez daha kapı çalar; ikinci ret bu ömürde kapatır (vâriste sayaç sıfırlanır)
      if ((sg.declined || 0) >= 2) return;
      if (gap >= 24 && chance(0.3)) {
        sg.scene = "emanet_muhur";
        push(s, "destan", "İhtiyarın torunu kapına geldi: 'Dedem son nefesinde yine seni söyledi.' Mühür yeniden önünde.", "kişisel", true, { k: "saga.reoffer" });
      }
      return;
    }
    const gate =
      sg.ch === 1 ? gap >= 9 :
      sg.ch === 2 ? gap >= 8 && (seen >= 2 || gap >= 30) : // kervansaray yol üstünde — hiç gezmeyene de geç kapı açılır
      sg.ch === 3 ? gap >= 10 :
      gap >= 12 && p.age >= 21;
    if (gate && chance(0.3)) sg.scene = SAGA1_IDS[sg.ch];
    return;
  }
  if (sg.act === 2 && sg.ch >= 5) { // perde arası: son kapının çağrısı
    if (gap >= 15 && chance(0.25)) {
      sg.act = 3; sg.ch = 0; sg.lastTurn = s.turn; sg.scene = "d3_besinci_kapi";
      push(s, "destan", "Derviş kapında son kez durdu: 'Beşinci kapı bir türbenin altında. Gel — yeminin sonu, başından uzun sürmez.'", "kişisel", true, { k: "saga.act3Start" });
    }
    return;
  }
  if (sg.act === 3) {
    if (sg.ch >= 5) { // destan tamam — yemin diyarın belleğine sızar (salt renk; ödül yok, farm yok)
      if (chance(0.008)) {
        const SAGA_ECHO_TR: Record<string, string> = {
          "saga.worldEcho0": "Bir ozan meydanda Kül Yemini'ni çalıp söylüyor: kül rengi mühür, beş taş kapı ve tutulan söz. Dinleyenler hikâyenin geçtiği haneyi fısıldaşıyor.",
          "saga.worldEcho1": "Çocuklar sokakta 'mühür kimde' oynuyor; biri ebe, dördü kapı. Yemin, oyun olup çocukların diline düşmüş.",
          "saga.worldEcho2": "Handa bir yolcu, sahiplerine kavuşan emanet defterinin hikâyesini anlatıyor; ad vermese de herkes kimden bahsettiğini biliyor.",
        };
        const k = "saga.worldEcho" + Math.floor(Math.random() * 3);
        push(s, "destan", SAGA_ECHO_TR[k], "makro", false, { k });
      }
      return;
    }
    const gate3 =
      sg.ch === 0 ? gap >= 8 :
      sg.ch === 1 ? gap >= 10 :
      sg.ch === 2 ? gap >= 9 :
      sg.ch === 3 ? gap >= 10 :
      gap >= 12;
    if (gate3 && chance(0.3)) sg.scene = SAGA3_IDS[sg.ch];
    return;
  }
  if (sg.act !== 2) return;
  if (sg.ch === 0) { // giriş: ihanet dalı önce mührü geri almalı; haberi satan bu ömürde düşmüştür (sentinel)
    if ((sg.declined || 0) >= 9) return;
    if (gap >= 8 && chance(0.3)) sg.scene = sg.path["yemin_defteri"] === 1 && sg.path["d2_muhur_geri"] === undefined ? "d2_muhur_geri" : "d2_cagri";
    return;
  }
  const gate2 =
    sg.ch === 1 ? gap >= 9 && (seen >= 3 || gap >= 30) : // ikinci kapı Sivas yolunda — gezen erken bulur
    sg.ch === 2 ? gap >= 10 :
    sg.ch === 3 ? gap >= 9 :
    gap >= 12;
  if (gate2 && chance(0.3)) sg.scene = SAGA2_IDS[sg.ch];
}
// ── KAN DEFTERİ (Kanlı Miras): kan davası kana bulanınca açılan, nesiller aşan destan. ──
// Sahneler panoda bekler (destan acele ettirmez); defter vârise geçer, her kuşak bir perde.
// Farm yok: sahneler tek seferlik, ödüller küçük; yakmak da sürdürmek de kalıcı iz bırakır.
export const BL_CHOICES: Record<string, number> = { bl_yemin: 2, bl_bedel: 2, bl_devir: 2, bl_golge: 2, bl_hukum: 3 };
export const BL_COST: Record<string, number[]> = { bl_bedel: [120, 0], bl_hukum: [300, 0, 0] };
const BL_R_TR: Record<string, string[]> = {
  bl_yemin: ["Parmağını kestin, ilk sayfaya kanla bir ad yazdın. Ocaktaki köz o gece hiç sönmedi; ev halkı sabah gözlerine bakamadı.", "İlk sayfaya kan değil niyet yazdın: 'Bu defter sulhla kapanacak.' Yemin ağır; ama şerefin o gece bir karış büyüdü."],
  bl_bedel: ["Ambar gece boşaldı; kağnılar şafaktan önce döndü. Defterin ilk sayfasındaki adın yanına bir çentik atıldı — hane bunu unutmayacak.", "Kadı davayı dinledi, tazminata hükmetti; çarşı 'kan yerine mühür' dedi. Defter sayfası temiz kaldı — ama yemin hâlâ orada duruyor."],
  bl_devir: ["Defteri kendi sandığına koydun; o ad artık senin de gecelerine misafir. Soyun yemini omzunda.", "Atadan kalan kan defterini ocağa attın; alevler eski hesapları yuttu."],
  bl_golge: ["Meydanda karşı karşıya geldiniz; kılıçlar konuşmadan gözler konuştu. Geri adım atmadın — çarşı iki soyun gölgesini bir daha ölçtü.", "Davalı hanenin gencini sofrana oturttun; ekmek bölüşüldü, defter o akşam sayfa çevirmedi. İki ihtiyar bunu duyunca ağladı derler."],
  bl_hukum: ["Üç kuşağın hesabı bir gecede görüldü: hanenin ocağı söndürüldü, adamları dağıtıldı. Defter kapandı — ama mürekkebi kan; diyar adını korkuyla anıyor.", "İki soy bir sofrada buluştu; defter dünürlükle kapandı. Üç kuşağın yemini bir düğün türküsünde eridi — diyar bunu yıllarca anlattı.", "Hane bedeli gümüşle ödedi; defterin son sayfasına 'ödendi' yazıldı. Kan dökülmedi, söz tutuldu — iki kapı da rahat uyudu."],
};
function bloodlineTick(s: GameState) {
  const b = s.bloodline; if (!b || b.scene || s.player.dead) return;
  const gap = s.turn - (b.act_turn ?? b.opened);
  if (b.gen === 1 && b.path.includes("yemin") && !b.path.some((x) => x.startsWith("bedel")) && gap >= 8 && chance(0.35)) b.scene = "bl_bedel";
  else if (b.gen === 2 && b.path.some((x) => x.startsWith("devam")) && !b.path.some((x) => x.startsWith("golge")) && gap >= 10 && chance(0.3)) b.scene = "bl_golge";
  else if (b.gen >= 3 && gap >= 10 && chance(0.3)) b.scene = "bl_hukum"; // üç kuşak doldu: hüküm vakti
}
export function resolveBloodline(prev: GameState, choice: 0 | 1 | 2): GameState {
  const s = clone(prev); const p = s.player;
  const b = s.bloodline; if (!b || !b.scene || p.dead) return s;
  const sc = b.scene;
  const cost = BL_COST[sc]?.[choice] || 0;
  if (cost > 0 && p.money < cost) return s;
  b.scene = null; b.act_turn = s.turn;
  const h = ensureRivals(s).find((x) => x.id === b.houseId);
  if (sc === "bl_yemin") {
    if (choice === 0) { b.path.push("yemin"); p.fear = Math.min(100, p.fear + 3); if (s.feud && s.feud.houseId === b.houseId) s.feud.heat = Math.min(100, s.feud.heat + 10); bumpNam(p, "mert", 2); }
    else { b.path.push("sulh"); p.honor = Math.min(100, p.honor + 3); }
  } else if (sc === "bl_bedel") {
    if (choice === 0) { p.money -= 120; const loot = 180 + Math.floor(Math.random() * 80); p.money += loot; b.path.push("bedel_kan"); bumpNam(p, "zalim", 2); p.fear = Math.min(100, p.fear + 4); if (s.feud && s.feud.houseId === b.houseId) s.feud.heat = Math.min(100, s.feud.heat + 12); if (h) h.tutum = Math.max(-100, (h.tutum ?? 0) - 15); }
    else { b.path.push("bedel_kadi"); p.reputation = Math.min(100, p.reputation + 4); p.honor = Math.min(100, p.honor + 2); if (s.feud && s.feud.houseId === b.houseId) s.feud.heat = Math.max(0, s.feud.heat - 8); }
  } else if (sc === "bl_golge") {
    if (choice === 0) { b.path.push("golge_meydan"); p.fame = Math.min(100, p.fame + 4); p.fear = Math.min(100, p.fear + 3); p.health = Math.max(1, p.health - 5); if (s.feud && s.feud.houseId === b.houseId) s.feud.heat = Math.min(100, s.feud.heat + 8); }
    else { b.path.push("golge_sofra"); p.honor = Math.min(100, p.honor + 3); if (h) h.tutum = Math.min(100, (h.tutum ?? 0) + 10); if (s.feud && s.feud.houseId === b.houseId) s.feud.heat = Math.max(0, s.feud.heat - 10); }
  } else if (sc === "bl_hukum") { // ÜÇ KUŞAĞIN HÜKMÜ — defter bu sahneyle kapanır
    const rtrH = BL_R_TR[sc];
    if (choice === 0) { // Kıyım: ocak söndürülür — güç kırılır, korku büyür, şeref yanar
      p.money -= 300;
      if (h) { h.power = Math.max(1, Math.round(h.power * 0.5)); h.tutum = -100; }
      p.fear = Math.min(100, p.fear + 8); bumpNam(p, "zalim", 4); p.honor = Math.max(0, p.honor - 6);
      p.bloodline_end = "kiyim";
    } else if (choice === 1) { // Dünürlük: iki soy bir sofrada — ittifak ve şeref
      if (h) { h.tutum = Math.min(100, (h.tutum ?? 0) + 40); if (!s.allied_houses) s.allied_houses = []; if (!s.allied_houses.includes(h.id)) s.allied_houses.push(h.id); }
      p.honor = Math.min(100, p.honor + 6); bumpNam(p, "comert", 2); p.reputation = Math.min(100, p.reputation + 4);
      p.bloodline_end = "dunurluk";
    } else { // Bedel: gümüşle kapanış — söz tutuldu
      p.money += 400;
      if (h) h.tutum = Math.min(100, (h.tutum ?? 0) + 10);
      p.honor = Math.min(100, p.honor + 2);
      p.bloodline_end = "bedel";
    }
    s.feud = null; // dava her hâlükârda kapanır
    push(s, "kan_defteri", (rtrH && rtrH[choice]) || "", "kişisel", true, { k: `bl.bl_hukum.r${choice}`, p: [{ hn: b.nameIdx }] });
    s.bloodline = null;
    return s;
  } else if (sc === "bl_devir") {
    if (choice === 0) { b.path.push("devam" + b.gen); p.fear = Math.min(100, p.fear + 2); bumpNam(p, "mert", 1); }
    else { // defteri yak: destan kapanır — şeref kalır, hane bunu duyar
      p.honor = Math.min(100, p.honor + 5);
      if (h) h.tutum = Math.min(100, (h.tutum ?? 0) + 12);
      push(s, "kan_defteri", "Atadan kalan kan defterini ocağa attın; alevler eski hesapları yuttu.", "kişisel", true, { k: "bl.bl_devir.r1" });
      s.bloodline = null;
      return s;
    }
  }
  const rtr = BL_R_TR[sc];
  push(s, "kan_defteri", rtr ? rtr[choice as 0 | 1] : "", "kişisel", true, { k: `bl.${sc}.r${choice}`, p: [{ hn: b.nameIdx }] });
  return s;
}

// ── VERASET KRİZİ: gözde vâris ilanı — sevgi bir yöne akarsa kırgınlık öbür yönde birikir. ──
export function favorChild(prev: GameState, name: string): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 35 || p.children.length < 2 || !p.children.includes(name)) return s;
  const cur = s.succession?.favored || null;
  if (cur === name) return s;
  if (!s.succession) s.succession = { favored: null, rift: 0 };
  const others = p.children.filter((c) => c !== name);
  if (!p.child_bond) p.child_bond = {};
  p.child_bond[name] = Math.min(100, (p.child_bond[name] ?? 50) + 10);
  for (const c of others) p.child_bond[c] = Math.max(0, (p.child_bond[c] ?? 50) - 6);
  s.succession.rift = Math.min(100, s.succession.rift + 10 + 4 * Math.max(0, others.length - 1) + (cur ? 12 : 0));
  if (cur) { p.honor = Math.max(0, p.honor - 2); push(s, "veraset", `Gözdeni değiştirdin: artık ${name}. Eski söz unutulmadı — sofrada gözler kaçışıyor.`, "kişisel", true, { k: "evj.succSwap", p: [name] }); }
  else push(s, "veraset", `${name} adını gözde olarak andın; ocağın geleceği ona işaret edildi. Kardeş sofrasına bir sessizlik düştü.`, "kişisel", true, { k: "evj.succName", p: [name] });
  s.succession.favored = name;
  return s;
}
function successionTick(s: GameState) {
  const su = s.succession; const p = s.player;
  if (!su || !su.favored || p.dead || p.children.length < 2 || !p.children.includes(su.favored)) return;
  const others = p.children.filter((c) => c !== su.favored);
  if (!others.length) return;
  if (su.rift >= 60 && chance(0.05)) { // büyük kriz: pay davası kadıya taşınır
    const c = others[Math.floor(Math.random() * others.length)];
    const cost = 80 + Math.floor(Math.random() * 80);
    p.money = Math.max(0, p.money - cost); su.rift = 40;
    if (!p.child_bond) p.child_bond = {}; p.child_bond[c] = Math.max(0, (p.child_bond[c] ?? 50) - 8);
    p.reputation = Math.max(-100, p.reputation - 3);
    push(s, "veraset", `${c} pay davasını kadıya taşıdı; ${cost} akçe ve bir parça itibarla kapandı. Sofra ikiye bölündü.`, "kişisel", true, { k: "evj.succCrisis", p: [c, cost] });
  } else if (su.rift >= 25 && chance(0.07)) { // sitem: küçük ama iz bırakan
    const c = others[Math.floor(Math.random() * others.length)];
    su.rift = Math.max(0, su.rift - 8);
    if (!p.child_bond) p.child_bond = {}; p.child_bond[c] = Math.max(0, (p.child_bond[c] ?? 50) - 4);
    push(s, "veraset", `${c} sitem etti: 'Ben bu ocağın evladı değil miyim?' Sözü kısa, izi uzun oldu.`, "kişisel", false, { k: "evj.succSulk", p: [c] });
  }
}

// ── Divan/Arzuhal: taç sahibinin huzuruna düşen dilekçeler — hükümdarlık soyut ferman menüsü değil, yüzü olan kararlar.
// Etki dengesi bilinçli: halkı kollamak keseden yer ama otorite/itibar getirir; keseyi kollamak nam bedeli öder (farm yok: an rastgele düşer).
export const DIVAN_IDS = ["su_kavgasi", "yetim_arazisi", "sinir_haraci", "genc_mucit", "kacak_asker", "iki_imam", "leke_surulen", "eski_silah_arkadasi", "kayip_kervan", "zindan_affi", "sel_bendi", "sahte_tanik", "kuru_kuyu", "mukerrer_bac", "yanik_koy", "hekim_ucreti", "degirmen_kavgasi", "veba_soylenti", "koprucu_borcu", "gece_bekcisi", "sinir_cevizi", "sahipsiz_sandik"];
const DIVAN_R_TR: Record<string, [string, string]> = {
  sinir_cevizi: [
    "Ağacın gövdesi kimin toprağındaysa ceviz onun, dalları kimin damına sarkıyorsa gölgesi onun dedin; iki komşu güldü, dava bitti. Hükmün atasözü gibi dilden dile gezdi.",
    "Ağaç davasını uzattıkça uzattın; sonunda ceviz mahkeme harcına gitti, iki komşu da küs kaldı. Kazanan yalnız defterdi.",
  ],
  sahipsiz_sandik: [
    "Sandığı mühürletip tellal çağırttın: 'Sahibi çıksın.' Üç hafta sonra bir dul kadın nişanını söyleyip sandığı aldı; duası tahtından kıymetliydi.",
    "Sandık gece hazineye taşındı; içindekiler deftere 'buluntu' yazıldı. Kimse sormadı ama kervansarayın hancısı seni her görüşte başka yöne baktı.",
  ],
  koprucu_borcu: [
    "Fazla alınan geçiş paralarını hazineden ödettin; köprücünün beratını yenileyip haddini bildirdin. Kervanlar rahat geçti, adın adil kaldı.",
    "Köprücünün yanında durdun, kesilen fazlalıktan pay aldın; köprüden geçen herkes başını öne eğdi ama içinden başka şey saydı.",
  ],
  gece_bekcisi: [
    "Yaşlı bekçiye kadro ve maaş bağladın; fener artık her gece yanıyor. Mahalle uykusunu sana borçlu sayıyor.",
    "Nöbeti gönüllü gençlere böldün; fener bazı geceler sönük kaldı. Bekçi hakkını helal etti mi, bilinmez.",
  ],
  degirmen_kavgasi: ["Yazıcılar gece boyu yazdı: pazartesi yukarı köy, perşembe aşağı köy. İlk hafta homurtu, ikinci hafta değirmen taşı iki köye de un öğüttü; ferman taşa çakıldı.", "Suyu yukarı köyün ağasına bıraktın; aşağı köyün değirmeni sustu. O kış un pahalandı — adın bir köyde dualı, ötekinde kara."],
  veba_soylenti: ["Heyet vardı: üç hasta buldu, otuz korkak. Hastalar ayrıldı, meydan kireçlendi, panik söndü. Tacın eli değdi, ölüm geri çekildi dediler.", "Kapılar sürgülendi, kasaba kendi kaderine kilitlendi. Salgın çıkmadı — ama açlık çıktı. Kurtulanlar tacı unutmadı; affetmeyi de öğrenmedi."],
  kayip_kervan: ["Kese kervancıya, haber kervanlara ulaştı: 'O tacın gölgesinde mal güvende.' O yıl pazara üç kervan fazla geldi; adın yol boyunca anıldı.", "Kervancı boş keseyle döndü; hikâyesi hanlarda anlatıldı. Ertesi bahar bazı kervanlar komşu beyliğin yolunu tuttu — yol boştu, hanlar suskundu."],
  sel_bendi: ["Hazineden taş, köyden emek: bent bir mevsimde yükseldi. İlk yağmurda su hendekten aktı, tarlalar kurtuldu; bendin taşına tacın nişanı kazındı.", "Ferman imeceye çıktı: her hane bir sırt taşı. Bent yavaş yükseldi, söylene söylene — ama bittiğinde 'bizim bent' dediler; taç uzaktan izledi."],
  sahte_tanik: ["Dava yeniden görüldü; yalancı şahit çapraz sorguda çözüldü. Tarla dul kadına döndü, şahit teşhir edildi; divanın adı adaletle anıldı.", "Kese kabul edildi, dava kapandı; kadının duası yarım, zenginin selamı bol. Divan zengin kapısı oldu — fısıltısı çarşıya indi."],
  kuru_kuyu: ["Usta indi, kazma vurdu; üçüncü haftada su fışkırdı. Kuyunun bileziğine tacın yılı kazındı; mahalle çeşme başında duacın oldu.", "Ferman çıkmadı; su iki tepe ötede kaldı. Kadınların omzundaki sırıklar tacın adını her gün andı — hayırla değil."],
  mukerrer_bac: ["İki kapıdan biri mühürlendi; fazla alınan akçe kervancılara kese kese geri sayıldı. O yıl yolun lafı tek baç, temiz defter oldu.", "Şikâyet defterin arasında kayboldu; baç iki kapıda da alınmaya devam etti. Hazine şişti ama kervanlar yolu uzatıp komşu geçide döndü."],
  yanik_koy: ["Kereste kağnılarla, tohum çuvallarla indi; bahara köy yeniden çatı tuttu. İlk hasadın ilk somunu saraya 'hakkın var' diye gönderildi.", "Köylü küllerini eşeledi; kimi akrabasına göçtü. Yanık direkler iki yıl yol kenarında kaldı — her geçen kervan tacın adını bir kez andı, hayırla değil."],
  hekim_ucreti: ["Hekim kapı kapı gezdi; humma o mahallede kışın kırıldı. İyileşen her hasta duasında tacı andı; çarşıda 'derdi duyan hükümdar' dendi.", "Hekim varlıklı kapılara döndü; yoksul mahalle hummayla baş başa kaldı. Bahara mezarlıkta üç taze taş vardı — biri çocuk boyundaydı."],
  zindan_affi: ["Demir kapı açıldı; ana, oğlunun koluna yaslanıp dua ede ede uzaklaştı. Kadı kaşlarını çattı ama çarşı o hafta tacın merhametini konuştu.", "Ana sessizce çekildi; duası yarım kaldı. Zindanın düzeni bozulmadı — ama o kışı oğlan çıkardı mı, kimse sormadı."],
  kacak_asker: ["Sipahi diz çöküp kılıcını sana uzattı: 'Bu can artık senindir.' Ordugâhta kimi yumuşaklık dedi, kimi adalet — ama o sipahi bir daha hiçbir seferden kaçmadı.", "Ceza meydanda verildi; saflar sıklaştı, gözler soğudu. Düzen korkuyla kuruldu — korkuyla kurulan düzenin bekçisi çok gerek."],
  iki_imam: ["Minare yükseldi, kürsü kuruldu; ilk hutbede iki imam yan yana durdu ve adını hayırla andı. Cuma çıkışı çarşı senin sözünle çalkalandı.", "İmece kuruldu, taş taş üstüne kondu — yavaş ama onların eseri. Minarenin gölgesi uzun; senin adın o gölgede kısa kaldı."],
  leke_surulen: ["Tellal üç çarşı gezdi; ertesi hafta kadın hanın mutfağında iş buldu. Yıllar sonra tezgâhından geçen her yetime bir sıcak çorba çıktı — iyilik döner.", "Kadın sessizce çıktı; kapıda duraksayıp dönmedi. Divanın defterinde bu bir hiçti; kasabanın defterinde bir sayfa daha karardı."],
  eski_silah_arkadasi: ["Önce küstü, sonra anladı. Muhafız üniforması içkiden ağır geldi; bir yıl sonra kapında en ayık, en sadık gölge oydu.", "İlk yıl eski günler gibiydi; ikinci yıl sancağın vergisi handa içildi. Hatıra sancak taşımaz — sancak omuz ister."],
  su_kavgasi: ["Kanal iki değirmeni de döndürdü; iki köy düğünde yan yana oynadı. 'Suyu taşla değil akılla bölen hükümdar' diye anıldın.", "Yukarı köy sevindi, aşağı köy sustu; ferman kesin ama gönüller yarım. Teamül sarsılmadı, adın 'sert ama belli' oldu."],
  yetim_arazisi: ["Mühür indi, tarla yetime döndü; kadı önünü ilikledi, bey dişini sıktı. Divandan çıkan söz çarşıda gece yarısına dek anlatıldı.", "Bey kesesinden 'hazineye armağan' bıraktı; yetim sessizce çıktı. Defter düzgün, vicdanlar buruk — bazı mühürler pahalıdır."],
  sinir_haraci: ["Kese köye döndü, taş toprağa oturdu; köy o kış senin adına kurban kesti. Sınırda adın taştan sağlam.", "İhtiyar duasız çıktı. O köyün gençleri ertesi yıl komşu beyliğin pazarına gitti; sınır haritada kaldı, gönüllerde kaydı."],
  genc_mucit: ["Dolap ilk kuraklıkta değerini kanıtladı; gıcırtısı köye ninni oldu. Gencin adı ustaya, senin adın 'ileri görüşlü'ye çıktı.", "Genç maketini koltuğuna alıp çıktı; iki yıl sonra aynı dolap komşu beyliğin bostanlarını suluyordu. Bazı fırsatlar bir kez kapı çalar."],
};
export function resolveDivan(prev: GameState, choice: 0 | 1): GameState {
  const s = clone(prev); const p = s.player;
  const d = s.divan; if (!d || p.dead || !p.crowned) return s;
  const id = d.id;
  if (id === "su_kavgasi" && choice === 0 && p.money < 100) return s; // kesede yoksa kanal yaptırılamaz (UI de kapatır)
  if (id === "sinir_haraci" && choice === 0 && p.money < 120) return s;
  if (id === "genc_mucit" && choice === 0 && p.money < 150) return s;
  if (id === "iki_imam" && choice === 0 && p.money < 200) return s;
  if (id === "kayip_kervan" && choice === 0 && p.money < 130) return s;
  if (id === "sel_bendi" && choice === 0 && p.money < 140) return s;
  if (id === "sahte_tanik" && choice === 0 && p.money < 110) return s;
  if (id === "kuru_kuyu" && choice === 0 && p.money < 120) return s;
  if (id === "mukerrer_bac" && choice === 0 && p.money < 100) return s;
  if (id === "yanik_koy" && choice === 0 && p.money < 160) return s;
  if (id === "hekim_ucreti" && choice === 0 && p.money < 120) return s;
  if (id === "degirmen_kavgasi" && choice === 0 && p.money < 90) return s;
  if (id === "veba_soylenti" && choice === 0 && p.money < 130) return s;
  if (id === "koprucu_borcu" && choice === 0 && p.money < 110) return s;
  if (id === "gece_bekcisi" && choice === 0 && p.money < 100) return s;
  s.divan = null;
  p.divan_resolved = (p.divan_resolved || 0) + 1; // adil hükümdar sayacı
  if (id === "su_kavgasi") {
    if (choice === 0) { p.money -= 100; p.crownAuthority = clamp100(crownAuthorityOf(p) + 6); p.reputation = Math.min(100, p.reputation + 4); bumpNam(p, "comert", 2); }
    else { p.crownAuthority = clamp100(crownAuthorityOf(p) + 2); p.fear = Math.min(100, p.fear + 2); }
  } else if (id === "yetim_arazisi") {
    if (choice === 1) sowSeed(s, { kaynak: "divan_yetim_kirgin", hmin: 60, hmax: 180, agirlik: "buyuk", nesil: true, etki: { reputation: -8 } });
    if (choice === 0) { p.honor = Math.min(100, p.honor + 5); p.reputation = Math.min(100, p.reputation + 4); p.crownAuthority = clamp100(crownAuthorityOf(p) + 4); bumpNam(p, "mert", 2); }
    else { const bag = 120; p.money += bag; p.honor = Math.max(0, p.honor - 5); bumpNam(p, "zalim", 3); }
  } else if (id === "degirmen_kavgasi") {
    if (choice === 0) { p.money -= 90; p.crownAuthority = clamp100(crownAuthorityOf(p) + 5); p.reputation = Math.min(100, p.reputation + 4); bumpNam(p, "mert", 1); }
    else { p.crownAuthority = clamp100(crownAuthorityOf(p) + 1); p.fear = Math.min(100, p.fear + 3); p.reputation = Math.max(-100, p.reputation - 3); bumpNam(p, "zalim", 2); }
  } else if (id === "veba_soylenti") {
    if (choice === 0) { p.money -= 130; p.reputation = Math.min(100, p.reputation + 5); p.fame = Math.min(100, p.fame + 2); bumpNam(p, "comert", 2); sowSeed(s, { kaynak: "divan_veba_sukran", hmin: 24, hmax: 96, agirlik: "orta", nesil: false, etki: { reputation: 6 } }); }
    else { p.crownAuthority = clamp100(crownAuthorityOf(p) + 4); p.fear = Math.min(100, p.fear + 5); p.reputation = Math.max(-100, p.reputation - 4); bumpNam(p, "zalim", 2); }
  } else if (id === "sinir_haraci") {
    if (choice === 0) { p.money -= 120; p.crownAuthority = clamp100(crownAuthorityOf(p) + 7); p.reputation = Math.min(100, p.reputation + 3); }
    else { p.reputation = Math.max(-100, p.reputation - 3); p.crownAuthority = clamp100(crownAuthorityOf(p) - 3); bumpNam(p, "zalim", 2); }
  } else if (id === "genc_mucit") {
    if (choice === 0) { p.money -= 150; p.fame = Math.min(100, p.fame + 5); p.reputation = Math.min(100, p.reputation + 3); bumpNam(p, "comert", 3); sowSeed(s, { kaynak: "divan_mucit", hmin: 36, hmax: 96, agirlik: "orta", nesil: false, etki: { money: 250, reputation: 5 } }); }
    else { p.reputation = Math.max(-100, p.reputation - 2); }
  } else if (id === "kacak_asker") {
    if (choice === 0) { p.honor = Math.min(100, p.honor + 4); p.reputation = Math.min(100, p.reputation + 3); bumpNam(p, "mert", 2); sowSeed(s, { kaynak: "divan_affedilen", hmin: 24, hmax: 96, agirlik: "orta", nesil: false, etki: { reputation: 7 } }); }
    else { p.crownAuthority = clamp100(crownAuthorityOf(p) + 4); p.fear = Math.min(100, p.fear + 4); bumpNam(p, "zalim", 2); }
  } else if (id === "iki_imam") {
    if (choice === 0) { p.money -= 200; p.reputation = Math.min(100, p.reputation + 5); bumpNam(p, "dindar", 3); bumpNam(p, "comert", 2); }
    else { p.crownAuthority = clamp100(crownAuthorityOf(p) + 2); }
  } else if (id === "leke_surulen") {
    if (choice === 0) { p.honor = Math.min(100, p.honor + 5); p.reputation = Math.min(100, p.reputation + 4); bumpNam(p, "mert", 2); sowSeed(s, { kaynak: "divan_aklanan", hmin: 24, hmax: 72, agirlik: "kucuk", nesil: false, etki: { money: 60, reputation: 4 } }); }
    else { p.honor = Math.max(0, p.honor - 3); p.reputation = Math.max(-100, p.reputation - 2); }
  } else if (id === "eski_silah_arkadasi") {
    if (choice === 0) { p.crownAuthority = clamp100(crownAuthorityOf(p) + 5); p.reputation = Math.min(100, p.reputation + 2); bumpNam(p, "mert", 2); }
    else { p.honor = Math.min(100, p.honor + 2); p.crownAuthority = clamp100(crownAuthorityOf(p) - 4); }
  } else if (id === "kayip_kervan") {
    if (choice === 0) { p.money -= 130; p.crownAuthority = clamp100(crownAuthorityOf(p) + 5); p.reputation = Math.min(100, p.reputation + 4); bumpNam(p, "comert", 2); sowSeed(s, { kaynak: "divan_kervanci", hmin: 24, hmax: 96, agirlik: "orta", nesil: false, etki: { money: 220, reputation: 4 } }); }
    else { p.reputation = Math.max(-100, p.reputation - 3); p.crownAuthority = clamp100(crownAuthorityOf(p) - 2); }
  } else if (id === "zindan_affi") {
    if (choice === 0) { p.honor = Math.min(100, p.honor + 4); p.reputation = Math.min(100, p.reputation + 3); bumpNam(p, "mert", 2); sowSeed(s, { kaynak: "divan_ana_duasi", hmin: 24, hmax: 72, agirlik: "kucuk", nesil: false, etki: { reputation: 5 } }); }
    else { p.crownAuthority = clamp100(crownAuthorityOf(p) + 4); p.fear = Math.min(100, p.fear + 2); bumpNam(p, "zalim", 1); }
  } else if (id === "sel_bendi") {
    if (choice === 0) { p.money -= 140; p.crownAuthority = clamp100(crownAuthorityOf(p) + 6); p.reputation = Math.min(100, p.reputation + 4); bumpNam(p, "comert", 2); }
    else { p.crownAuthority = clamp100(crownAuthorityOf(p) + 2); p.reputation = Math.max(-100, p.reputation - 1); }
  } else if (id === "sahte_tanik") {
    if (choice === 0) { p.money -= 110; p.honor = Math.min(100, p.honor + 5); p.reputation = Math.min(100, p.reputation + 4); p.crownAuthority = clamp100(crownAuthorityOf(p) + 4); bumpNam(p, "mert", 2); }
    else { p.money += 130; p.honor = Math.max(0, p.honor - 6); bumpNam(p, "zalim", 3); sowSeed(s, { kaynak: "divan_sahte_kirgin", hmin: 48, hmax: 150, agirlik: "buyuk", nesil: true, etki: { reputation: -8 } }); }
  } else if (id === "kuru_kuyu") {
    if (choice === 0) { p.money -= 120; p.crownAuthority = clamp100(crownAuthorityOf(p) + 5); p.reputation = Math.min(100, p.reputation + 4); bumpNam(p, "comert", 2); }
    else { p.reputation = Math.max(-100, p.reputation - 2); p.fear = Math.min(100, p.fear + 1); }
  } else if (id === "mukerrer_bac") {
    if (choice === 0) { p.money -= 100; p.honor = Math.min(100, p.honor + 4); p.reputation = Math.min(100, p.reputation + 3); p.crownAuthority = clamp100(crownAuthorityOf(p) + 3); bumpNam(p, "mert", 2); }
    else { p.money += 80; p.honor = Math.max(0, p.honor - 4); bumpNam(p, "zalim", 2); p.reputation = Math.max(-100, p.reputation - 4); }
  } else if (id === "yanik_koy") {
    if (choice === 0) { p.money -= 160; p.crownAuthority = clamp100(crownAuthorityOf(p) + 6); p.reputation = Math.min(100, p.reputation + 4); bumpNam(p, "comert", 2); sowSeed(s, { kaynak: "divan_yanik_sukran", hmin: 24, hmax: 96, agirlik: "orta", nesil: false, etki: { reputation: 6 } }); }
    else { p.reputation = Math.max(-100, p.reputation - 3); p.crownAuthority = clamp100(crownAuthorityOf(p) - 2); bumpNam(p, "zalim", 1); }
  } else if (id === "hekim_ucreti") {
    if (choice === 0) { p.money -= 120; p.crownAuthority = clamp100(crownAuthorityOf(p) + 4); p.reputation = Math.min(100, p.reputation + 4); bumpNam(p, "comert", 2); bumpNam(p, "dindar", 1); sowSeed(s, { kaynak: "divan_hekim_duasi", hmin: 24, hmax: 72, agirlik: "kucuk", nesil: false, etki: { reputation: 5 } }); }
    else { p.reputation = Math.max(-100, p.reputation - 2); p.honor = Math.max(0, p.honor - 2); }
  } else if (id === "koprucu_borcu") {
    if (choice === 0) { p.money -= 110; p.crownAuthority = clamp100(crownAuthorityOf(p) + 5); p.reputation = Math.min(100, p.reputation + 4); bumpNam(p, "mert", 2); }
    else { p.money += 90; p.honor = Math.max(0, p.honor - 4); p.reputation = Math.max(-100, p.reputation - 3); bumpNam(p, "zalim", 2); }
  } else if (id === "gece_bekcisi") {
    if (choice === 0) { p.money -= 100; p.crownAuthority = clamp100(crownAuthorityOf(p) + 4); p.reputation = Math.min(100, p.reputation + 3); bumpNam(p, "comert", 2); sowSeed(s, { kaynak: "divan_bekci_duasi", hmin: 24, hmax: 72, agirlik: "kucuk", nesil: false, etki: { reputation: 5 } }); }
    else { p.crownAuthority = clamp100(crownAuthorityOf(p) + 1); p.reputation = Math.max(-100, p.reputation - 2); }
  } else if (id === "sinir_cevizi") {
    if (choice === 0) { p.crownAuthority = clamp100(crownAuthorityOf(p) + 4); p.reputation = Math.min(100, p.reputation + 4); bumpNam(p, "mert", 2); }
    else { p.money += 60; p.honor = Math.max(0, p.honor - 3); p.reputation = Math.max(-100, p.reputation - 2); bumpNam(p, "zalim", 1); }
  } else if (id === "sahipsiz_sandik") {
    if (choice === 0) { p.crownAuthority = clamp100(crownAuthorityOf(p) + 3); p.reputation = Math.min(100, p.reputation + 3); p.honor = Math.min(100, p.honor + 3); bumpNam(p, "mert", 1); sowSeed(s, { kaynak: "divan_sandik_sahibi", hmin: 24, hmax: 96, agirlik: "orta", nesil: false, etki: { money: 150, reputation: 4 } }); }
    else { p.money += 140; p.honor = Math.max(0, p.honor - 5); bumpNam(p, "zalim", 2); sowSeed(s, { kaynak: "divan_sandik_kirgin", hmin: 48, hmax: 140, agirlik: "buyuk", nesil: true, etki: { reputation: -7 } }); }
  }
  const rtr = DIVAN_R_TR[id];
  push(s, "taht", rtr ? rtr[choice] : "", "kişisel", choice === 0, { k: `divan.${id}.r${choice}` });
  return s;
}
export function hostFeast(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  if (p.feast_turn === s.turn) return s; // ayda tek ziyafet — para→şöhret çeviricisi spam'lenemez
  const cost = 40;
  if (p.money < cost) { push(s, "sosyal", "Ziyafet verecek akçen yok.", "kişisel", false, { k: "evj.noFeast" }); return s; }
  let fame = 8, rep = 5;
  if (hasPerk(p, "sohret_avcisi")) fame += 5;
  if (hasPerk(p, "diplomat")) { fame = Math.round(fame * 1.5); rep = Math.round(rep * 1.5); }
  p.money -= cost; p.feast_turn = s.turn; p.fame = Math.min(100, p.fame + fame); p.reputation = Math.min(100, p.reputation + rep);
  gainSkill(s, "social", 5); bumpNam(p, "comert", 8);
  const why = recognition(s) > 0.5 ? " Tanınan biri olduğundan ziyafetin çok konuşuldu." : "";
  { const fv = chance(0.5); push(s, "sosyal", fv ? `Sofralar meydana kuruldu; kazanlar kaynadı, türküler gece yarısını buldu.${why}` : `Köye bir ziyafet verdin; adın dilden dile dolaştı.${why}`, "kişisel", true, { k: fv ? "evj.feast2" : "evj.feast", p: [recognition(s) > 0.5 ? { sfx: "sfx.feastWhy" } : ""] }); }
  return s;
}

// Sadaka dağıt: akçe harcayıp şeref + itibar kazan.
export function giveAlms(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  if (p.alms_turn === s.turn) return s; // ayda tek sadaka — şeref farmı önlenir
  const cost = 15;
  if (p.money < cost) { push(s, "sosyal", "Sadaka verecek akçen yok.", "kişisel", false, { k: "evj.noAlms" }); return s; }
  let honor = 7, rep = 3;
  if (p.temperament === "merhametli") honor += 3; // merhametli mizaç: hayrın gönülden gelir, adı da öyle anılır
  if (hasPerk(p, "hosgoru")) honor += 5;
  if (hasPerk(p, "diplomat")) { honor = Math.round(honor * 1.5); rep = Math.round(rep * 1.5); }
  p.money -= cost; p.alms_turn = s.turn; p.honor = Math.min(100, p.honor + honor); p.reputation = Math.min(100, p.reputation + rep);
  gainSkill(s, "social", 5);
  bumpNam(p, "comert", 6); bumpNam(p, "dindar", 5);
  { const av = chance(0.5); push(s, "sosyal", av ? "Kapı kapı dolaşmadın; çeşme başına oturdun, gelen aldı. Kimseyi eğdirmeden vermek de bir hünerdir." : "Yoksullara sadaka dağıttın; vicdanın hafifledi, şerefin yükseldi.", "kişisel", false, { k: av ? "evj.alms2" : "evj.alms" }); }
  return s;
}

// Gözdağı ver: korku kazan, itibarı biraz zedeler.
export function intimidate(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13) return s;
  if (p.intimidate_turn === s.turn) return s; // ayda tek gözdağı — korku 0→100 spam'i kapatıldı
  p.intimidate_turn = s.turn;
  const ok = Math.random() < Math.min(0.92, 0.5 + p.stats.strength * 0.04 + dread(s) / 300 + (hasPerk(p, "kan_donduran") ? 0.25 : 0)); // perk garantiyi değil olasılığı artırır
  if (ok) { let fear = hasPerk(p, "kan_donduran") ? 12 : 8; if (hasPerk(p, "diplomat")) fear = Math.round(fear * 1.5); p.fear = Math.min(100, p.fear + fear); p.reputation = Math.max(-100, p.reputation - 3); bumpNam(p, "zalim", 7); witnessScandal(s, "tehdit", 0.5); const why = dread(s) > 30 ? " Zaten korkulan adın, bir bakışın yetti." : ""; push(s, "sosyal", `Birine gözdağı verdin; adın çekinilen biri oldu.${why}`, "kişisel", false, { k: "evj.intimWin", p: [dread(s) > 30 ? { sfx: "sfx.intimWinWhy" } : ""] }); }
  else { p.reputation = Math.max(-100, p.reputation - 5); p.honor = Math.max(0, p.honor - 3); const why = esteem(s) > 25 ? " Sevilen biri olduğundan kimse seni ciddiye almadı." : ""; push(s, "sosyal", `Gözdağın ters tepti; itibarın zarar gördü.${why}`, "kişisel", false, { k: "evj.intimLose", p: [esteem(s) > 25 ? { sfx: "sfx.intimLoseWhy" } : ""] }); }
  return s;
}

// ── Savaş / Çatışma ──
export interface Encounter { id: string; title: string; desc: string; power: number; reward: number; fame: number; honor: number; danger: number; minFame?: number; } // minFame: efsane karşılaşmalar ancak ad duyulunca gelir (geç oyuna amaç)
export const ENCOUNTERS: Encounter[] = [
  { id: "haydut",  title: "Yol Haydutları",   desc: "Pusudaki haydutlar kervanına göz dikti.", power: 6,  reward: 35,  fame: 4,  honor: 3,  danger: 14 },
  { id: "ayi",     title: "Dağda Ayı",        desc: "Patikada azgın bir ayıyla burun buruna geldin.", power: 8,  reward: 30,  fame: 5,  honor: 4,  danger: 20 },
  { id: "duello",  title: "Meydan Okuma",     desc: "Bir yiğit seni teke tek dövüşe çağırdı.", power: 9,  reward: 25,  fame: 7,  honor: 6,  danger: 18 },
  { id: "turnuva", title: "Cirit Turnuvası",  desc: "Meydanda cirit oynanıyor; gözler üstünde.", power: 10, reward: 45,  fame: 11, honor: 7,  danger: 12 },
  { id: "korsan",  title: "Nehir Korsanları", desc: "Geçidi tutan korsanlar haraç istiyor.",     power: 12, reward: 60,  fame: 9,  honor: 6,  danger: 24 },
  { id: "sinir",   title: "Sınır Çatışması",  desc: "Sancak beyinin emrinde sınırı koru.",      power: 13, reward: 70,  fame: 12, honor: 10, danger: 26 },
  { id: "reis",    title: "Eşkıya Reisi",     desc: "Diyarı kasıp kavuran eşkıya reisini avla.", power: 15, reward: 95,  fame: 15, honor: 11, danger: 30 },
  { id: "akin",    title: "Akın",             desc: "Akıncılarla düşman topraklarına bir akın.", power: 16, reward: 110, fame: 17, honor: 12, danger: 33 },
  { id: "kusatma", title: "Kale Kuşatması",   desc: "Surların önünde kanlı bir kuşatma.",        power: 18, reward: 130, fame: 20, honor: 14, danger: 38 },
  // ── Efsane karşılaşmalar: adı duyulmuş cengâverin geç-oyun sınavları (elit: niyeti tam okunamaz, combat.ts power 14+ kuralı) ──
  { id: "canavar", title: "Gece Canavarı",    desc: "Köyleri boşaltan adsız bir dehşet; izini yalnız sen sürebilirsin.", power: 22, reward: 180, fame: 26, honor: 16, danger: 44, minFame: 55 },
  { id: "kara_alp", title: "Kara Alp",        desc: "Diyar diyar yenilmezliğiyle anılan zırhlı cengâver seni arıyor: 'Adın bana denk mi?'", power: 26, reward: 220, fame: 32, honor: 20, danger: 50, minFame: 70 },
  { id: "bozkir_kurdu", title: "Bozkır Kurdu", desc: "Kösedağ'dan beri hiçbir sancağa boyun eğmemiş ihtiyar akıncı beyi son bir cenk arıyor: 'Ölmeden bir denk görmek isterim.'", power: 24, reward: 200, fame: 29, honor: 18, danger: 47, minFame: 62 },
  { id: "golge_okcusu", title: "Gölge Okçusu", desc: "Kimse yüzünü görmedi; okları hep şafakta, hep tek atışta konuşur. Hana bir pusula bırakmış: adın yazılı.", power: 28, reward: 260, fame: 36, honor: 22, danger: 54, minFame: 78 },
  { id: "cansiz_bey", title: "Cansız Bey", desc: "Kara zırhın içi boş derler: mızrak işlemez, kılıç seker. Yüz yıldır her efsaneyi gömdü — şimdi geçidin ağzında seni bekliyor.", power: 30, reward: 300, fame: 40, honor: 24, danger: 58, minFame: 85 },
  { id: "yanik_yuzlu", title: "Yanık Yüzlü", desc: "Kösedağ'dan yüzü yanık çıkan ihtiyar sipahi son yeminini kuşanmış: 'Beni ancak diyarın en büyük adı gömer.' Közün başında seni bekliyor.", power: 32, reward: 340, fame: 44, honor: 26, danger: 62, minFame: 92 },
  { id: "kirk_yamali", title: "Kırk Yamalı", desc: "Kırk yamalı hırkasının her yaması yenilmiş bir meydan ustasından derler. Asasıyla gezer, kimseyi aramaz — bulunur. Şimdi senin meydanında dikiliyor.", power: 34, reward: 380, fame: 48, honor: 28, danger: 66, minFame: 96 },
];
// Oyuncunun savaş gücü: kuvvet + dayanıklılık/2 + silah + asker avantajı.
export function combatPower(p: Player): number {
  let pw = effStat(p, "strength") * 2 + effStat(p, "stamina") + p.skills.combat;
  const wid = p.equipped?.silah; const w = wid ? ITEMS[wid] : null;
  let weaponPw = Math.round((w?.power || 0) * equippedQualityMult(p, "silah"));
  if (w?.twoHanded) weaponPw = Math.round(weaponPw * 1.32); // çift elli silah daha sert vurur (kalkan feda edilir)
  pw += weaponPw || ((p.inventory["bicak"] || 0) > 0 ? 4 : 0); // kalite-ölçekli silah, yoksa elindeki bıçak
  if (p.faction === "asker") pw += 3;
  pw += (p.retinue || 0) * 3; // maiyet omuz omuza çarpışır
  if (p.childhood === "canli") pw += 2; // canlı çocukluk: ömür boyu dinç beden
  if (p.temperament === "yigit") pw += 1; // yiğit mizaç: doğuştan cenkçi damar
  if (hasPerk(p, "cevik")) pw += 3;
  if (hasPerk(p, "nisanci")) pw += 5;
  return pw;
}
// Kuşanılı zırhın toplam savunması (gövde + kalkan + miğfer + eldiven + çizme). Savaşta hasarı azaltır.
export function armorDefense(p: Player): number {
  let d = 0;
  for (const sl of DEFENSE_SLOTS) {
    const id = p.equipped?.[sl];
    if (id) d += Math.round((ITEMS[id]?.defense || 0) * equippedQualityMult(p, sl));
  }
  return d;
}
// Kuşanılı silah (varsa) ve arketipi.
export function equippedWeapon(p: Player): Item | null { const id = p.equipped?.silah; return id ? (ITEMS[id] || null) : null; }
export function weaponClass(p: Player): WClass | null { return equippedWeapon(p)?.wclass || null; }
export function hasShield(p: Player): boolean { return !!p.equipped?.kalkan; }
// Kalkanla darbe savma ihtimali (savunmacı duruşta artar). Çift elli silahta kalkan olmaz → 0.
export function shieldBlockChance(p: Player, defensive: boolean): number {
  const id = p.equipped?.kalkan; if (!id) return 0;
  const def = Math.round((ITEMS[id]?.defense || 0) * equippedQualityMult(p, "kalkan"));
  return Math.min(0.45, 0.05 + def * 0.025 + (defensive ? 0.12 : 0));
}
export function isTwoHanded(id: string | null | undefined): boolean { return !!(id && ITEMS[id]?.twoHanded); }
// "Cenk yükü" (0..1): ne kadar savaşa hazır görünüyorsun. Sosyal zarafeti bastırır
// — ipek kaftanın zırhın altında görünmez, kalkanlı adam zarif değil heybetli durur.
export function martialLoad(p: Player): number {
  let m = 0;
  if (p.equipped?.zirh) m += 0.5;
  if (p.equipped?.kalkan) m += 0.25;
  if (p.equipped?.baslik) m += 0.15;
  if (isTwoHanded(p.equipped?.silah)) m += 0.3;
  return Math.min(1, m);
}
// Kuşanılı kıyafetin sosyal katkısı (karizma + itibar/prestij). Kalite kademesiyle ölçeklenir,
// cenk yükü (zırh/kalkan/miğfer) zarafeti gizlediği için kırpılır.
export function attireScore(p: Player): { charisma: number; prestige: number } {
  const damp = 1 - 0.7 * martialLoad(p); // tam zırhta sosyal katkı %70 kırpılır (zırh kaftanı da takıyı da gizler)
  let cha = 0, pre = 0;
  for (const sl of ["kiyafet", "taki"] as EquipSlot[]) {
    const id = p.equipped?.[sl]; if (!id) continue;
    const it = ITEMS[id]; const m = equippedQualityMult(p, sl);
    cha += (it?.charisma || 0) * m; pre += (it?.prestige || 0) * m;
  }
  return { charisma: Math.round(cha * damp), prestige: Math.round(pre * damp) };
}
// Sosyal varlık: karizma (kıyafet dahil) eksi cenk yükü cezası. Silahlı/zırhlı biri divanda,
// düğünde, flörtte çekici değil tehditkâr/heybetli durur — bu yüzden ikna gücü düşer.
export function socialPresence(p: Player): number {
  return Math.max(0, effStat(p, "charisma") - Math.round(martialLoad(p) * 2));
}
// Eşya kuşan (silah/zırh) — envanterden çıkarıp slota koyar, eskisini geri verir.
export function equipItem(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const it = ITEMS[id];
  if (p.dead || !it || !(p.inventory[id] > 0)) return s;
  const slot = slotOfKind(it.kind);
  if (!slot) return s;
  // Çift elli silah ↔ kalkan birlikte taşınamaz: çakışan slotu envantere geri koy.
  const stowSlot = (sl: EquipSlot) => { const cur = p.equipped[sl]; if (cur) { p.inventory[cur] = (p.inventory[cur] || 0) + 1; const cq = p.equipped_q?.[sl]; if (cq) addQuality(p, cur, cq); p.equipped[sl] = null; if (p.equipped_q) delete p.equipped_q[sl]; return cur; } return null; };
  let bumped: string | null = null;
  if (slot === "silah" && it.twoHanded) bumped = stowSlot("kalkan");               // çift elli silah → kalkanı bırak
  else if (slot === "kalkan" && isTwoHanded(p.equipped?.silah)) bumped = stowSlot("silah"); // kalkan → çift elli silahı bırak
  // Eskisini (kalitesiyle) envantere geri koy.
  const old = p.equipped[slot];
  if (old) { p.inventory[old] = (p.inventory[old] || 0) + 1; const oq = p.equipped_q?.[slot]; if (oq) addQuality(p, old, oq); }
  // Yenisini en iyi kademeden kuşan.
  const tier = QUALITY_GOODS.has(id) ? takeQualityUnit(p, id) : "siradan";
  p.inventory[id] -= 1; if (p.inventory[id] <= 0) delete p.inventory[id];
  p.equipped[slot] = id;
  if (!p.equipped_q) p.equipped_q = {};
  p.equipped_q[slot] = tier;
  const qNote = tier !== "siradan" ? ` (${QUALITY_LABEL[tier]})` : "";
  const bumpNote = bumped ? ` ${ITEMS[bumped]?.name || ""} elden bırakıldı.` : "";
  push(s, "kusanma", `${it.name}${qNote} kuşandın.${bumpNote}`, "kişisel", false, bumped ? { k: "evj.equipBump", p: [{ i: id }, { i: bumped }] } : (tier !== "siradan" ? { k: "evj.equipQ", p: [{ i: id }, { q: tier }] } : { k: "evj.equip", p: [{ i: id }] }));
  return s;
}
export function unequipItem(prev: GameState, slot: EquipSlot): GameState {
  const s = clone(prev); const p = s.player; const old = p.equipped[slot];
  if (!old) return s;
  p.inventory[old] = (p.inventory[old] || 0) + 1;
  const oq = p.equipped_q?.[slot]; if (oq) addQuality(p, old, oq); // kaliteyi envantere geri ver
  p.equipped[slot] = null;
  if (p.equipped_q) delete p.equipped_q[slot];
  push(s, "kusanma", `${ITEMS[old]?.name || "Teçhizat"} çıkardın.`, "kişisel", false, { k: "evj.unequip", p: [{ i: old }] });
  return s;
}

// Olası yaralanma havuzu (taktik savaş sonucu).
const INJURY_POOL: { label: string; stat: keyof Stats; delta: number; weeks: number; perm: number }[] = [
  { label: "Çürük kaburga",  stat: "stamina",  delta: 1, weeks: 4, perm: 0 },
  { label: "Kılıç yarası",   stat: "strength", delta: 1, weeks: 6, perm: 0.12 },
  { label: "Burkulan bilek", stat: "strength", delta: 1, weeks: 3, perm: 0 },
  { label: "Yüz yarası",     stat: "charisma", delta: 1, weeks: 8, perm: 0.2 },
];
function maybeInjure(s: GameState, heavy: boolean) {
  const p = s.player;
  if (hasPerk(p, "yilmaz") && Math.random() < 0.5) return; // yılmaz: darbeye alışkın beden — yaralanma ihtimali yarıya iner
  if (!Math.random || Math.random() > (heavy ? 0.5 : 0.18)) return;
  const wIdx = Math.floor(Math.random() * INJURY_POOL.length);
  const t = INJURY_POOL[wIdx];
  const permanent = Math.random() < t.perm;
  p.injuries.push({ label: t.label, stat: t.stat, delta: t.delta, weeks_left: t.weeks, permanent });
  push(s, "yaralanma", `${t.label} aldın${permanent ? " — kalıcı iz bıraktı" : ""}.`, "kişisel", false, permanent ? { k: "evj.injurePerm", p: [{ wd: wIdx }] } : { k: "evj.injure", p: [{ wd: wIdx }] });
}

// Dövüş girişi: ay hakkı ekrana adım atınca yanar — kaybederken OS-geri ile kaçıp bedelsiz tekrar denenemez (risk by-pass'ı kapalı).
export function startBattleAttempt(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.battle_turn === s.turn) return s;
  p.battle_turn = s.turn;
  return s;
}
// Tur-tabanlı savaşın sonucunu uygula (savas ekranı çağırır).
export function applyBattleOutcome(prev: GameState, id: string, won: boolean, finalHp: number): GameState {
  const s = clone(prev); const p = s.player; const e = ENCOUNTERS.find((x) => x.id === id);
  if (!e) return s;
  if (p.battle_award_turn === s.turn) return s; // çekirdek kapısı (UI'dan bağımsız): sonuç ayda bir kez uygulanır
  p.battle_award_turn = s.turn;
  p.battle_turn = s.turn; // giriş kilidi kurulmamışsa (eski akış) burada da kurulur — çifte güvence
  gainSkill(s, "combat", won ? 14 : 7);
  if (won) {
    let reward = Math.round(e.reward * inflationFactor(s)); // ödül çağın parasıyla — geç oyunda dövüş anlamsız kalmasın
    if (hasPerk(p, "savas_ustasi")) reward = Math.round(reward * 1.5);
    p.money += reward; p.fame = Math.min(100, p.fame + e.fame); p.honor = Math.min(100, p.honor + e.honor);
    p.fear = Math.min(100, p.fear + Math.round(e.fame / 2));
    bumpNam(p, "mert", 6);
    if (!p.enc_won) p.enc_won = {}; p.enc_won[e.id] = true; // efsane defterine yaz
    const floor = hasPerk(p, "yilmaz") ? 5 : 1;
    p.health = Math.max(floor, Math.min(Math.round(finalHp), p.health)); // zafer canı giriş canını aşamaz (15-19 canla girip 20 ile çıkma kapalı)
    maybeInjure(s, false);
    push(s, "savaş_zafer", `${e.title}: Zafer senin! (+${reward} akçe, şöhretin arttı.)`, "kişisel", true, { k: "evj.battleWin2", p: [{ enc: e.id }, reward, { sfx: "enc." + e.id + ".w" }] });
  } else {
    p.health = Math.max(0, Math.round(finalHp));
    if (p.health <= 0) { die(s, `${p.name}, ${e.title.toLowerCase()} sırasında can verdi.`, { k: "evj.dieEnc", p: [p.name, { enc: e.id }] }); return s; }
    maybeInjure(s, true);
    push(s, "savaş_yenilgi", `${e.title}: Yenildin, yaralarını sardın.`, "kişisel", false, { k: "evj.battleLose2", p: [{ enc: e.id }, { sfx: "enc." + e.id + ".l" }] });
    // Yenilgi bir düşmanlık doğurabilir (nemesis)
    if (s.story && !s.story.nemesis && Math.random() < 0.4) {
      const name = `${NEMESIS_NAMES[Math.floor(Math.random() * NEMESIS_NAMES.length)]}`;
      s.story.nemesis = { name, power: e.power + 4 };
      push(s, "nemesis", `${name} seni yendiğiyle övünüyor; bir gün hesaplaşacaksınız.`, "kişisel", true, { k: "evj.nemTaunt", p: [name] });
    }
  }
  return s;
}
const NEMESIS_NAMES = ["Kara Yusuf", "Çolak Murat", "Deli Hasan", "Topal Bekir", "Azrail Şahin", "Kanlı Doğan"];
// Nemesis'le hesaplaşma çatışması (sentetik, ENCOUNTERS'ta değil).
export function nemesisEncounter(s: GameState): Encounter | null {
  const n = s.story?.nemesis; if (!n) return null;
  return { id: "nemesis", title: `Nemesis: ${n.name}`, desc: `${n.name} ile son hesaplaşma.`, power: n.power, reward: Math.round(90 * inflationFactor(s)), fame: 16, honor: 8, danger: 30 };
}
export function applyNemesisOutcome(prev: GameState, won: boolean, finalHp: number): GameState {
  const s = clone(prev); const p = s.player; const n = s.story?.nemesis; if (!n) return s;
  if (p.battle_award_turn === s.turn) return s; // çekirdek kapısı (UI'dan bağımsız): sonuç ayda bir kez uygulanır
  p.battle_award_turn = s.turn;
  p.battle_turn = s.turn; // nemesis hesaplaşması da tur başına tek dövüş kapısına dahil (giriş kilidi kurulmamışsa çifte güvence)
  gainSkill(s, "combat", won ? 16 : 8);
  if (won) {
    p.money += Math.round(90 * inflationFactor(s)); p.fame = Math.min(100, p.fame + 16); p.honor = Math.min(100, p.honor + 8); // ödül çağın parasıyla (nemesisEncounter göstergesiyle aynı)
    bumpNam(p, "mert", 8);
    const floor = hasPerk(p, "yilmaz") ? 5 : 1; p.health = Math.max(floor, Math.min(Math.round(finalHp), p.health)); // zafer canı giriş canını aşamaz
    s.story.nemesis = null;
    push(s, "nemesis", `${n.name}'ı alt ettin! Hesap kapandı, adın korkusuz diye anıldı.`, "kişisel", true, { k: "evj.nemWin", p: [n.name] });
  } else {
    p.health = Math.max(0, Math.round(finalHp));
    if (p.health <= 0) { die(s, `${p.name}, ${n.name} ile hesaplaşmada can verdi.`, { k: "evj.dieNemesis", p: [p.name, n.name] }); return s; }
    maybeInjure(s, true);
    push(s, "nemesis", `${n.name} yine üstün geldi; intikam bir başka bahara kaldı.`, "kişisel", false, { k: "evj.nemLose", p: [n.name] });
  }
  return s;
}

// ── Başarımlar — durumdan türetilir (kalıcı sayaç gerektirmez) ──
export interface Achievement { id: string; name: string; desc: string; icon: string; done: (s: GameState) => boolean; }
export const ACHIEVEMENTS: Achievement[] = [
  { id: "resit",    name: "Reşit Oldun",     desc: "13 yaşına ulaş ve bir meslek edin.", icon: "anvil",        done: (s) => s.player.age >= 13 && s.player.profession !== "işsiz" },
  { id: "ilkakce",  name: "İlk Kese",        desc: "100 akçe biriktir.",                icon: "coins",        done: (s) => s.player.money >= 100 },
  { id: "zengin",   name: "Diyarın Zengini", desc: "1000 akçeye ulaş.",                 icon: "gems",         done: (s) => s.player.money >= 1000 },
  { id: "mulk",     name: "Mülk Sahibi",     desc: "İlk mülkünü edin.",                 icon: "house",        done: (s) => s.player.properties.length >= 1 },
  { id: "toprak",   name: "Toprak Ağası",    desc: "5 mülkün sahibi ol.",               icon: "castle",       done: (s) => s.player.properties.length >= 5 },
  { id: "evli",     name: "Ocak Kuruldu",    desc: "Evlen.",                            icon: "ring",         done: (s) => s.player.married },
  { id: "baba",     name: "Soyun Sürüyor",   desc: "İlk evladın olsun.",                icon: "baby",         done: (s) => s.player.children.length >= 1 },
  { id: "kalabalik",name: "Kalabalık Sofra", desc: "4 evladın olsun.",                  icon: "family",       done: (s) => s.player.children.length >= 4 },
  { id: "loncali",  name: "Loncalı",         desc: "Bir loncaya katıl.",                icon: "crown",        done: (s) => !!s.player.faction },
  { id: "savasci",  name: "Savaş Görmüş",    desc: "Bir çatışmadan zaferle dön.",       icon: "trophy",       done: (s) => s.history.some((e) => e.type === "savaş_zafer") },
  { id: "sohret",   name: "Destanlaşan",     desc: "Şöhretin 80'i aşsın.",              icon: "star",         done: (s) => s.player.fame >= 80 },
  { id: "seref",    name: "Erdemin Timsali", desc: "Şerefin 80'i aşsın.",               icon: "medal",        done: (s) => s.player.honor >= 80 },
  { id: "korku",    name: "Diyarın Kâbusu",  desc: "Korku salgını 80'i aşsın.",         icon: "hood",         done: (s) => s.player.fear >= 80 },
  { id: "itibar",   name: "Diyarın İncisi",  desc: "İtibarın 80'i aşsın.",              icon: "prayer-beads", done: (s) => s.player.reputation >= 80 },
  { id: "uzunomur", name: "Uzun Ömür",       desc: "60 yaşını gör.",                    icon: "hourglass",    done: (s) => s.player.age >= 60 },
  { id: "hanedan",  name: "Hanedan Kuruldu", desc: "İkinci nesle geç.",                 icon: "banner",       done: (s) => s.player.generation >= 2 },
  { id: "kokluhan", name: "Köklü Hanedan",   desc: "Dördüncü nesle ulaş.",              icon: "scroll-open",  done: (s) => s.player.generation >= 4 },
  { id: "usta",     name: "Çok Yönlü",       desc: "Tüm özelliklerin 5+ olsun.",        icon: "shield",       done: (s) => Object.values(s.player.stats).every((v) => v >= 5) },
  // Beceri & teçhizat
  { id: "savas_sv", name: "Kılıç Ustası",    desc: "Savaş becerini 6'ya çıkar.",        icon: "crossed-swords", done: (s) => s.player.skills.combat >= 6 },
  { id: "tic_sv",   name: "Bezirgân",        desc: "Ticaret becerini 6'ya çıkar.",      icon: "scales",       done: (s) => s.player.skills.trade >= 6 },
  { id: "zan_sv",   name: "Usta Zanaatkâr",  desc: "Zanaat becerini 6'ya çıkar.",       icon: "anvil",        done: (s) => s.player.skills.crafting >= 6 },
  { id: "sos_sv",   name: "Dilbaz",          desc: "Sosyal becerini 6'ya çıkar.",       icon: "lyre",         done: (s) => s.player.skills.social >= 6 },
  { id: "hunerli",  name: "Hünerli",         desc: "En az 6 hüner edin.",               icon: "medal",        done: (s) => s.player.perks.length >= 6 },
  { id: "kusanmis", name: "Teçhizatlı",      desc: "Hem silah hem zırh kuşan.",         icon: "shield",       done: (s) => !!s.player.equipped?.silah && !!s.player.equipped?.zirh },
  { id: "celikli",  name: "Çelik Kılıç",     desc: "Çelik kılıç kuşan.",                icon: "crossed-swords", done: (s) => s.player.equipped?.silah === "celik_kilic" },
  { id: "demirkapi",name: "Demir Kapı",      desc: "Zindanda cezanı doldurup gün ışığına çık.", icon: "prisoner", done: (s) => (s.player.jail_freed || 0) >= 1 },
  { id: "meydantozu",name: "Meydanın Tozu",  desc: "Panayırda at yarışı kazan.",        icon: "party",        done: (s) => (s.player.races_won || 0) >= 1 },
  { id: "adilhukumdar",name: "Adil Hükümdar",desc: "Divanda 10 arzuhali karara bağla.", icon: "scales",       done: (s) => (s.player.divan_resolved || 0) >= 10 },
  // Kariyer & ekonomi
  { id: "kariyer",  name: "Zirvede",         desc: "Mesleğinde en üst unvana ulaş.",    icon: "crown",        done: (s) => { const pr = professionById(s.player.profession); return !!pr && careerTier(pr, s.player.career_xp) >= pr.tiers.length - 1; } },
  { id: "tüccar2",  name: "Servet Sahibi",   desc: "5000 akçeye ulaş.",                 icon: "gems",         done: (s) => s.player.money >= 5000 },
  // Hikâye & sosyal
  { id: "hikayeci", name: "Hikâye Anlatıcısı",desc: "Bir hikâye yayını tamamla.",        icon: "scroll-open",  done: (s) => s.story.completed.length >= 1 },
  { id: "destanci", name: "Kader Dokuyucusu",desc: "Üç hikâye yayını tamamla.",         icon: "book",         done: (s) => s.story.completed.length >= 3 },
  { id: "comert_a", name: "Eli Açık",        desc: "Cömert namın 60'ı aşsın.",          icon: "coins",        done: (s) => (s.player.nam?.comert || 0) >= 60 },
  { id: "zalim_a",  name: "Acımasız",        desc: "Zalim namın 60'ı aşsın.",           icon: "skull",        done: (s) => (s.player.nam?.zalim || 0) >= 60 },
  { id: "dindar_a", name: "Sofu",            desc: "Dindar namın 50'yi aşsın.",         icon: "prayer-beads", done: (s) => (s.player.nam?.dindar || 0) >= 50 },
  // Aile & gezi
  { id: "yatirim",  name: "İyi Baba/Ana",    desc: "Bir çocuğa 3 yatırım yap.",         icon: "family",       done: (s) => Object.values(s.player.child_invests || {}).some((l) => l.length >= 3) },
  { id: "gezgin",   name: "Diyar Gezgini",   desc: "Bir şehirde bulun.",                icon: "house",        done: (s) => placeKind(s.player.location_name) === "şehir" },
  { id: "ebedisoy", name: "Ebedî Hanedan",   desc: "Onuncu nesle ulaş.",                icon: "banner",       done: (s) => s.player.generation >= 10 },
  { id: "cihangir", name: "Cihangir",        desc: "Taç giyip üç sefer kazan.",         icon: "crossed-swords", done: (s) => (s.player.crownConquests?.length || 0) >= 3 },
  { id: "onsehir",  name: "Yollara Düşen",   desc: "10 farklı yerleşime ayak bas.",     icon: "compass",      done: (s) => new Set([...(s.player.cities_visited || []), s.player.location_name]).size >= 10 },
  { id: "seyyah",   name: "Seyyâh-ı Âlem",   desc: "25 farklı yerleşime ayak bas.",     icon: "map",          done: (s) => new Set([...(s.player.cities_visited || []), s.player.location_name]).size >= 25 },
  { id: "besmeslek",name: "On Parmakta Marifet", desc: "Bir ömürde 5 farklı meslek dene.", icon: "backpack",  done: (s) => new Set([...(s.player.professions_tried || []), s.player.profession].filter((x) => x !== "işsiz")).size >= 5 },
  { id: "yemintamam",name: "Yemin Tamam",      desc: "Kül Yemini destanını tamamla.",     icon: "scroll",       done: (s) => !!s.saga && s.saga.act >= 3 && s.saga.ch >= 5 },
  { id: "golgeust", name: "Gölge Ustası",    desc: "Üç komployu ifşa olmadan tamamla.", icon: "hood",         done: (s) => (s.player.plot_wins || 0) >= 3 },
  { id: "safakoku", name: "Şafak Okundu",    desc: "Gölge Okçusu'nu yen.",              icon: "bow",          done: (s) => !!(s.player.enc_won && s.player.enc_won.golge_okcusu) },
  { id: "birlesik", name: "Tek Tuğ",         desc: "Diyarı tek tâcın altında birleştir.", icon: "banner",      done: (s) => (s.player.crownConquests?.length || 0) >= 4 },
  { id: "boszirh",  name: "Zırhın İçi",      desc: "Cansız Bey'i yen.",                  icon: "shield",      done: (s) => !!(s.player.enc_won && s.player.enc_won.cansiz_bey) },
  { id: "kissahan", name: "Kıssahan",        desc: "Beş hikâye yayını tamamla.",          icon: "scroll-open", done: (s) => (s.story?.completed?.length || 0) >= 5 },
  { id: "sonkor",   name: "Son Kor",         desc: "Yanık Yüzlü'yü yen.",                 icon: "flame",       done: (s) => !!(s.player.enc_won && s.player.enc_won.yanik_yuzlu) },
  { id: "kirkbirinci", name: "Kırk Birinci Yama", desc: "Kırk Yamalı'yı yen.",              icon: "hood",        done: (s) => !!(s.player.enc_won && s.player.enc_won.kirk_yamali) },
  { id: "kandefteri",name: "Defter Kapandı",   desc: "Üç kuşak süren Kan Defteri'ni hükme bağla.", icon: "scroll",  done: (s) => !!s.player.bloodline_end },
  { id: "lonca2",   name: "Lonca Üstadı",    desc: "Bir loncada 60 itibar topla.",      icon: "crown",        done: (s) => Object.values(s.player.faction_standing || {}).some((v) => v >= 60) },
  { id: "bilge",    name: "Yaşlı Bilge",     desc: "70 yaşını gör.",                    icon: "prayer-beads", done: (s) => s.player.age >= 70 },
  { id: "imparator",name: "Mülk İmparatoru", desc: "8 mülke sahip ol.",                 icon: "castle",       done: (s) => s.player.properties.length >= 8 },
  { id: "hunerbaz", name: "Hünerbaz",        desc: "10 hüner edin.",                    icon: "medal",        done: (s) => s.player.perks.length >= 10 },
  { id: "onder",    name: "Diyar Önderi",    desc: "İtibarın 90'ı aşsın.",              icon: "crown",        done: (s) => s.player.reputation >= 90 },
  { id: "kervanci", name: "Kervancı",        desc: "Ticaret becerini 8'e çıkar.",       icon: "scales",       done: (s) => s.player.skills.trade >= 8 },
  { id: "efsane",   name: "Yaşayan Efsane",  desc: "Şöhretin 95'i aşsın.",              icon: "trophy",       done: (s) => s.player.fame >= 95 },
  // Yeni sistemlere bağlı başarımlar (kervan / işçi / sancak / valilik / aile / soy)
  { id: "kervan_s", name: "Kervan Sahibi",   desc: "Bir ticaret kervanı yola çıkar.",   icon: "scales",       done: (s) => s.caravan != null },
  { id: "isveren",  name: "İşveren",         desc: "Bir mülküne işçi al.",              icon: "house",        done: (s) => s.player.properties.some((pr) => (pr.workers || []).length > 0) },
  { id: "sancakbey",name: "Sancak Beyi",     desc: "Loncan bir sancağa hâkim olsun.",   icon: "banner",       done: (s) => !!s.player.faction && (s.realm || []).some((r) => r.holder === s.player.faction) },
  { id: "vali_a",   name: "Vali",            desc: "Bir şehre vali ol.",                icon: "crown",        done: (s) => (s.player.governorships?.length || 0) >= 1 },
  { id: "mezraci",  name: "Mezra Kurucusu",  desc: "Yeni bir yerleşim kur.",            icon: "castle",       done: (s) => (s.settlements?.length || 0) >= 1 },
  { id: "tacli_a",  name: "Taç Giydin",      desc: "Taht iddiasını kazan.",             icon: "crown",        done: (s) => !!s.player.crowned },
  { id: "vezir_a",  name: "Vezir",           desc: "Sarayda Vezir rütbesine yüksel.",   icon: "scroll",       done: (s) => (s.player.courtRank ?? -1) >= 3 },
  { id: "sadrazam_a",name: "Sadrazam",       desc: "Divanın en üst mevkiine eriş.",     icon: "scroll-open",  done: (s) => (s.player.courtRank ?? -1) >= 4 },
  { id: "fatih_a",  name: "Fâtih",           desc: "Sefere çıkıp bir diyarı tâcına kat.",icon: "crossed-swords",done: (s) => (s.player.crownConquests?.length || 0) >= 1 },
  { id: "bani_a",   name: "Bânî",            desc: "Bir şehre bayındırlık eseri yaptır.",icon: "castle",       done: (s) => Object.values(s.player.govWorks || {}).some((arr) => arr.length > 0) },
  { id: "ailereis", name: "Aile Reisi",      desc: "5 aile görevi tamamla.",            icon: "family",       done: (s) => (s.player.fq_claimed?.length || 0) >= 5 },
  { id: "demiryum", name: "Demir Yumruk",    desc: "Gücünü 10'a çıkar.",                icon: "anvil",        done: (s) => s.player.stats.strength >= 10 },
  { id: "asilsoy",  name: "Asîl Soy",        desc: "Altıncı nesle ulaş.",               icon: "scroll-open",  done: (s) => s.player.generation >= 6 },
  { id: "sevgili_a",name: "Halkın Sevgilisi",desc: "İtibar ve şöhretin 70'i aşsın.",    icon: "prayer-beads", done: (s) => s.player.reputation >= 70 && s.player.fame >= 70 },
  { id: "cenkust",  name: "Cenk Üstadı",     desc: "Savaş becerini 10'a çıkar.",        icon: "crossed-swords", done: (s) => s.player.skills.combat >= 10 },
  { id: "define",   name: "Define Sahibi",   desc: "10.000 akçeye ulaş.",               icon: "gems",         done: (s) => s.player.money >= 10000 },
  // ── Yeni sistemlere bağlı başarımlar (yaşayan dünya / fraksiyon / valilik) ──
  { id: "soylukan", name: "Soylu Kan",       desc: "Hanedanını 3. nesle taşı.",         icon: "crown",        done: (s) => s.player.generation >= 3 },
  { id: "vali",     name: "Valilik Mührü",   desc: "İki şehrin valisi ol.",             icon: "scroll",       done: (s) => (s.player.governorships || []).length >= 2 },
  { id: "loncabuyugu",name:"Lonca Büyüğü",   desc: "Bir loncada 120 itibara ulaş.",     icon: "crown",        done: (s) => Object.values(s.player.faction_standing || {}).some((v) => v >= 120) },
  { id: "sancakhakimi",name:"Sancak Hâkimi", desc: "Loncan iki sancağa hâkim olsun.",   icon: "castle",       done: (s) => !!s.player.faction && (s.realm || []).filter((sn) => sn.holder === s.player.faction).length >= 2 },
  { id: "golgeeli", name: "Gölge Eli",       desc: "Gölge Kardeşliği'ne katıl.",        icon: "skull",        done: (s) => s.player.faction === "golge" },
  { id: "cokdost",  name: "Sevilen Yüz",     desc: "8 kişiyle yakın dost ol (ilişki ≥ 40).", icon: "family",   done: (s) => Object.values(s.relationships || {}).filter((v) => v >= 40).length >= 8 },
  { id: "hayirsever",name:"Hayırsever",      desc: "Cömert namın 85'i aşsın.",          icon: "coins",        done: (s) => (s.player.nam?.comert || 0) >= 85 },
  { id: "korkulanad",name:"Korkulan Ad",     desc: "Zalim namın 85'i aşsın.",           icon: "skull",        done: (s) => (s.player.nam?.zalim || 0) >= 85 },
  // ── Ekonomi / görkem başarımları (kademeli yerleşim + bağış muslukları) ──
  { id: "kasabali",  name: "Kasaba Beyi",     desc: "Bir yerleşimini kasabaya büyüt.",   icon: "castle",       done: (s) => (s.settlements || []).some((st) => st.tier === "kasaba" || st.tier === "şehir") },
  { id: "sehirkuran",name: "Şehir Kuran",     desc: "Bir yerleşimini şehre büyüt.",      icon: "castle",       done: (s) => (s.settlements || []).some((st) => st.tier === "şehir") },
  { id: "vakifsahibi",name:"Vakıf Sahibi",    desc: "Adına bir vakıf kur.",              icon: "scroll-open",  done: (s) => !!s.player.legacy?.vakif },
  { id: "anitkuran", name: "Anıt Diktiren",   desc: "Görkemli bir anıt diktir.",         icon: "banner",       done: (s) => !!s.player.legacy?.anit },
  { id: "hanedanservet",name:"Hazine Sahibi", desc: "Servetin 100.000 akçeyi aşsın.",    icon: "gems",         done: (s) => s.player.money >= 100000 },
];
// Meta-nişan: defterin kendisine bakar — dizi kapandıktan sonra eklenir (öz-atıf literalde kurulamaz).
ACHIEVEMENTS.push({ id: "nisanavcisi", name: "Nişan Avcısı", desc: "Kırk nişanı bir defterde topla.", icon: "trophy", done: (s) => ACHIEVEMENTS.filter((a) => a.id !== "nisanavcisi" && a.done(s)).length >= 40 });

export function achievementsOf(s: GameState): { a: Achievement; done: boolean }[] {
  return ACHIEVEMENTS.map((a) => ({ a, done: a.done(s) }));
}

// ── Aile/yaşam görevleri (Vercel family_quests.py portu) — yaş-kapılı kilometre taşları ──
// Çocukluktan yetişkinliğe ailenin beklentileri; oyuncu normal oynayarak tamamlar, ödül kazanır.
export interface FamilyQuest { id: string; icon: string; title: string; desc: string; minAge: number; reward: { money?: number; fame?: number; rep?: number; statPt?: number }; done: (s: GameState) => boolean; }
export const FAMILY_QUESTS: FamilyQuest[] = [
  { id: "ilkders",    icon: "book", title: "İlk Ders",      desc: "Mektepte ilk dersine otur.",            minAge: 7,  reward: { money: 5, fame: 1 },          done: (s) => (s.player.lesson_count || 0) >= 1 },
  { id: "ilkdost",    icon: "prayer-beads", title: "İlk Dost",      desc: "Biriyle dostluk kur (ilişki ≥ 30).",    minAge: 10, reward: { money: 8, rep: 2 },           done: (s) => Object.values(s.relationships || {}).some((v) => v >= 30) },
  { id: "okuryazar",  icon: "scroll", title: "Okuryazar",    desc: "Zekânı 3'e çıkar.",                     minAge: 12, reward: { money: 10, statPt: 1 },        done: (s) => s.player.stats.intelligence >= 3 },
  { id: "ilkkazanc",  icon: "coins", title: "İlk Kazanç",    desc: "Bir meslekte ilk işini yap.",           minAge: 13, reward: { money: 12, rep: 2 },           done: (s) => s.player.career_xp >= 1 },
  { id: "pehlivan",   icon: "fist", title: "Pehlivan",      desc: "Gücünü 4'e çıkar.",                     minAge: 15, reward: { money: 10, fame: 2 },          done: (s) => s.player.stats.strength >= 4 },
  { id: "elemegi",    icon: "anvil", title: "El Emeği",      desc: "Zanaat becerini 3'e çıkar.",            minAge: 16, reward: { money: 15, statPt: 1 },        done: (s) => s.player.skills.crafting >= 3 },
  { id: "dortyol",    icon: "compass", title: "Dört Yol Gören", desc: "Dört ayrı yerleşime ayak bas.",        minAge: 16, reward: { money: 15, fame: 2 },          done: (s) => new Set([...(s.player.cities_visited || []), s.player.location_name]).size >= 4 },
  { id: "sayginevlat",icon: "medal", title: "Saygın Evlat",  desc: "İtibarını 30'a çıkar.",                 minAge: 18, reward: { money: 15, rep: 4 },           done: (s) => s.player.reputation >= 30 },
  { id: "yuvakur",    icon: "ring", title: "Yuva Kur",      desc: "Evlen, bir ocak tüttür.",               minAge: 18, reward: { money: 20, fame: 3 },          done: (s) => s.player.married },
  { id: "ilktapu",    icon: "house", title: "İlk Tapu",      desc: "Adına bir mülk edin.",                  minAge: 18, reward: { money: 0, rep: 3, statPt: 1 },  done: (s) => s.player.properties.length >= 1 },
  { id: "ocagituttur",icon: "baby", title: "Ocağı Tüttür",  desc: "Soyunu sürdürecek bir evlat sahibi ol.",minAge: 20, reward: { money: 25, fame: 4 },          done: (s) => s.player.children.length >= 1 },
  { id: "silahsor",   icon: "crossed-swords", title: "Silahşör",      desc: "Savaş becerini 6'ya çıkar.",            minAge: 20, reward: { money: 20, fame: 3 },          done: (s) => s.player.skills.combat >= 6 },
  { id: "ustasinavi", icon: "anvil",  title: "Usta Sınavı",   desc: "Zanaat becerini 6'ya çıkar.",           minAge: 22, reward: { money: 25, fame: 3 },          done: (s) => s.player.skills.crafting >= 6 },
  { id: "bezirgan",   icon: "scales", title: "Bezirgân",      desc: "Ticaret becerini 6'ya çıkar.",          minAge: 22, reward: { money: 30, rep: 3 },           done: (s) => s.player.skills.trade >= 6 },
  { id: "sohbetehli", icon: "lyre",   title: "Sohbet Ehli",   desc: "Sosyal becerini 6'ya çıkar.",           minAge: 22, reward: { money: 25, rep: 3 },           done: (s) => s.player.skills.social >= 6 },
  { id: "konaksahibi",icon: "castle", title: "Konak Sahibi",  desc: "Üç mülk edin.",                         minAge: 25, reward: { money: 0, rep: 5, statPt: 1 },  done: (s) => s.player.properties.length >= 3 },
  { id: "gonuldost",  icon: "prayer-beads", title: "Gönül Dostu", desc: "Üç can dostu edin (ilişki ≥ 50).",  minAge: 25, reward: { money: 25, rep: 4 },           done: (s) => Object.values(s.relationships || {}).filter((v) => v >= 50).length >= 3 },
  { id: "yediyol",    icon: "compass", title: "Yedi Yol Gören", desc: "Yedi ayrı yerleşime ayak bas.",       minAge: 28, reward: { money: 30, fame: 4 },          done: (s) => new Set([...(s.player.cities_visited || []), s.player.location_name]).size >= 7 },
  { id: "itibarli",   icon: "medal", title: "İtibarlı",      desc: "İtibarını 60'a çıkar.",                 minAge: 30, reward: { money: 30, fame: 5 },          done: (s) => s.player.reputation >= 60 },
  { id: "diyarinbeyi",icon: "crown", title: "Diyarın Beyi",  desc: "Tahta çık; diyar senin adınla anılsın.",minAge: 30, reward: { money: 0, fame: 10, statPt: 1 }, done: (s) => !!s.player.crowned },
  { id: "tastayazili",icon: "castle", title: "Taşa Yazılan Ad",desc: "Bir anıt diktir; adın çağları aşsın.",  minAge: 35, reward: { money: 0, fame: 10, rep: 5 },   done: (s) => !!s.player.legacy?.anit },
  { id: "soyagaci",   icon: "leaf", title: "Soyağacı",      desc: "Hanedanını sürdür (2. nesil ve ötesi).",minAge: 7,  reward: { money: 40, fame: 8 },          done: (s) => s.player.generation >= 2 },
];
export function familyQuestsOf(s: GameState): { q: FamilyQuest; done: boolean; claimed: boolean; locked: boolean }[] {
  const p = s.player; const cl = p.fq_claimed || [];
  return FAMILY_QUESTS.map((q) => ({ q, done: q.done(s), claimed: cl.includes(q.id), locked: p.age < q.minAge }));
}
// Tamamlanan aile görevlerini ödüllendir (advance içinde, ay sonunda çağrılır).
function claimFamilyQuests(s: GameState) {
  const p = s.player; if (!p.fq_claimed) p.fq_claimed = [];
  for (const q of FAMILY_QUESTS) {
    if (p.age < q.minAge || p.fq_claimed.includes(q.id) || !q.done(s)) continue;
    p.fq_claimed.push(q.id);
    if (q.reward.money) p.money += q.reward.money;
    if (q.reward.fame) p.fame = Math.min(100, p.fame + q.reward.fame);
    if (q.reward.rep) p.reputation = Math.min(100, p.reputation + q.reward.rep);
    if (q.reward.statPt) p.stat_points += q.reward.statPt;
    push(s, "aile_gorevi", `Aile görevi tamamlandı: ${q.title}.`, "kişisel", true, { k: "evj.familyQuest", p: [q.title] });
  }
}

// ── İkilem/olay sonucu uygula (tüm durum değişimi çekirdekte) ──
export interface Delta {
  money?: number; health?: number; hunger?: number;
  reputation?: number; honor?: number; fear?: number; fame?: number;
  stat_points?: number; addItem?: string; standing?: number;
  nam?: { [k in keyof Nam]?: number };
  marry?: boolean; // sonuç metni düğün anlatıyorsa mekanik de evlendirsin (yalnız bekârsa; yay/ikilem sonuçları için)
}
const clampStat = (x: number) => Math.max(0, Math.min(100, x));
// İkilem seçimi → sonuç tohumu (Vercel LIFE_EVENT_SEEDS): "<dilemmaId>:<seçimIdx>" → tohum tarifi.
// Çocukluk/gençlik seçimleri yıllar (hatta nesiller) sonra dramatik zirvede biçilir.
export const DILEMMA_SEEDS: Record<string, Omit<Seed, "id" | "ekim">> = {
  "cocuk_kese:0": { kaynak: "kese_goren", hmin: 24, hmax: 120, agirlik: "kucuk", nesil: false, etki: { money: -20, reputation: -4 } },
  "cocuk_kese:1": { kaynak: "durust_cocuk", hmin: 36, hmax: 120, agirlik: "kucuk", nesil: false, etki: { reputation: 6 } },
  "cocuk_kavga:0": { kaynak: "savundugun_cocuk", hmin: 120, hmax: 240, agirlik: "buyuk", nesil: true, etki: { money: 100, reputation: 8 } },
  "cocuk_kavga:1": { kaynak: "savunmadigin_cocuk", hmin: 120, hmax: 240, agirlik: "buyuk", nesil: true, etki: { reputation: -8 } },
  "yetiskin_yangin:1": { kaynak: "yangin_sustun", hmin: 60, hmax: 144, agirlik: "buyuk", nesil: true, etki: { reputation: -6 } },
  "yetiskin_yangin:0": { kaynak: "yangin_kahramani", hmin: 36, hmax: 120, agirlik: "orta", nesil: false, etki: { reputation: 6 } },
  "yetiskin_kumar:0": { kaynak: "kumar_borcu", hmin: 12, hmax: 60, agirlik: "kucuk", nesil: false, etki: { money: 15 } },
  // "Seçimlerin yıllar sonra döner" vaadini genişleten tohumlar (D13): meslek, sevda, servet ve kimlik seçimleri iz bırakır.
  "cocuk_cirak:0": { kaynak: "usta_mirasi", hmin: 120, hmax: 300, agirlik: "buyuk", nesil: false, etki: { money: 80, reputation: 5 } },
  "genc_ilkask:0": { kaynak: "ilk_sevda_yuz", hmin: 60, hmax: 200, agirlik: "orta", nesil: false, etki: { reputation: 5 } },
  "genc_ilkask:1": { kaynak: "ilk_sevda_ic", hmin: 90, hmax: 260, agirlik: "orta", nesil: false, etki: { health: -3 } },
  "yetiskin_ortaklik:0": { kaynak: "ortak_kader", hmin: 24, hmax: 96, agirlik: "buyuk", nesil: false, etki: { money: 120, reputation: 4 } },
  "golge_davet:0": { kaynak: "golge_borcu", hmin: 24, hmax: 120, agirlik: "buyuk", nesil: true, etki: { money: -40, reputation: -6 } },
  "yetiskin_gurbetci:0": { kaynak: "gurbetci_vefa", hmin: 36, hmax: 150, agirlik: "orta", nesil: false, etki: { money: 90, reputation: 4 } },
};

export function applyDilemma(prev: GameState, delta: Delta, resultText: string, seedKey?: string, festival?: boolean, evKey?: string): GameState {
  const s = clone(prev); const p = s.player;
  if (festival) {
    if (p.festival_turn === s.turn) return s; // aynı şenlik iki kez çözülemez (çekirdek kapısı)
    p.festival_turn = s.turn;
  } else {
    if (p.dilemma_turn === s.turn) return s; // turda tek ikilem sonucu (çift tık / yarış koruması — şenlikler kendi kapısında)
    p.dilemma_turn = s.turn;
    if (seedKey) s.recent_dilemmas = [...(s.recent_dilemmas || []), seedKey.split(":")[0]].slice(-6); // tekrar koruması: görülen ikilem bir süre havuza dönmez
  }
  if (delta.money) p.money = Math.max(0, p.money + delta.money);
  if (delta.health) p.health = clampStat(p.health + delta.health);
  if (delta.hunger) p.hunger = clampStat(p.hunger + delta.hunger);
  if (delta.reputation) p.reputation = Math.max(-100, Math.min(100, p.reputation + delta.reputation));
  if (delta.honor) p.honor = clampStat(p.honor + delta.honor);
  if (delta.fear) p.fear = clampStat(p.fear + delta.fear);
  if (delta.fame) p.fame = clampStat(p.fame + delta.fame);
  if (delta.stat_points) p.stat_points += delta.stat_points;
  if (delta.addItem) p.inventory[delta.addItem] = (p.inventory[delta.addItem] || 0) + 1;
  if (delta.nam) for (const k of Object.keys(delta.nam) as (keyof Nam)[]) bumpNam(p, k, delta.nam[k]!);
  if (delta.standing && p.faction) p.faction_standing[p.faction] = (p.faction_standing[p.faction] || 0) + delta.standing; // lonca itibarı (fraksiyon sahnesi)
  if (seedKey && DILEMMA_SEEDS[seedKey]) sowSeed(s, DILEMMA_SEEDS[seedKey]); // sessiz tohum: seçim yıllar sonra döner
  push(s, "olay", resultText, "kişisel", false, evKey ? { k: evKey } : undefined); // anahtar varsa günlük dile/dişile göre yeniden çözülür (renderEvt fallback güvenli)
  if (p.health <= 0) die(s, `${p.name} bu olaydan sağ çıkamadı.`, { k: "evj.dieEvent", p: [p.name] });
  return s;
}

// ── Beceri Ağacı — 4 dal (savaş/ticaret/zanaat/sosyal), her dalda 3/6/9'da perk seçimi ──
export type SkillKey = keyof Skills;
export const SKILL_META: { key: SkillKey; name: string; icon: string; blurb: string }[] = [
  { key: "combat",   name: "Savaş",   icon: "crossed-swords", blurb: "Kılıç, kalkan ve cesaret." },
  { key: "trade",    name: "Ticaret", icon: "scales",         blurb: "Pazarın ve kervanın dili." },
  { key: "crafting", name: "Zanaat",  icon: "anvil",          blurb: "El emeği, göz nuru." },
  { key: "social",   name: "Sosyal",  icon: "lyre",           blurb: "Söz, saygı ve nüfuz." },
];
export interface Perk { id: string; tree: SkillKey; tier: number; name: string; desc: string; }
// Her dal için 3 kademe (3/6/9), her kademede 2 seçenek.
export const PERKS: Perk[] = [
  // SAVAŞ
  { id: "cevik",      tree: "combat", tier: 3, name: "Çevik",         desc: "Savaş gücün +3." },
  { id: "kalkanli",   tree: "combat", tier: 3, name: "Kalkanlı",      desc: "Çatışmada aldığın hasar %25 azalır." },
  { id: "nisanci",    tree: "combat", tier: 6, name: "Nişancı",       desc: "Savaş gücün +5." },
  { id: "kan_donduran",tree:"combat", tier: 6, name: "Kan Donduran",  desc: "Gözdağı her zaman tutar, korku kazancın artar." },
  { id: "savas_ustasi",tree:"combat", tier: 9, name: "Savaş Ustası",  desc: "Çatışma ödülleri %50 artar." },
  { id: "yilmaz",     tree: "combat", tier: 9, name: "Yılmaz",        desc: "Zafer kazandığında sağlığın 5'in altına düşmez." },
  // TİCARET
  { id: "pazarlikci", tree: "trade",  tier: 3, name: "Pazarlıkçı",    desc: "Alışta %10 indirim." },
  { id: "dilbaz",     tree: "trade",  tier: 3, name: "Dilbaz Tâcir",  desc: "Satışta %25 fazla akçe." },
  { id: "keskin_goz", tree: "trade",  tier: 6, name: "Keskin Göz",    desc: "Fırsat ödülleri %30 artar." },
  { id: "guvenli_kervan",tree:"trade",tier: 6, name: "Güvenli Kervan",desc: "Tüccar lonca görevleri %50 fazla kazandırır." },
  { id: "tuccar_prensi",tree:"trade", tier: 9, name: "Tüccar Prensi", desc: "Mülk gelirin %30 artar." },
  { id: "tefeci",     tree: "trade",  tier: 9, name: "Tefeci",        desc: "Çalışma kazancın %20 artar." },
  // ZANAAT
  { id: "becerikli",  tree: "crafting",tier:3, name: "Becerikli",     desc: "Çalışma kazancın %15 artar." },
  { id: "tutumlu",    tree: "crafting",tier:3, name: "Tutumlu",       desc: "Yemek 10 fazla tokluk verir." },
  { id: "usta_eli",   tree: "crafting",tier:6, name: "Usta Eli",      desc: "Çalışma kazancın ek %20 artar." },
  { id: "tamirci",    tree: "crafting",tier:6, name: "Tamirci",       desc: "Mülk gelirin %15 artar." },
  { id: "basyapit",   tree: "crafting",tier:9, name: "Başyapıt",      desc: "Çalışma kazancın ek %25 artar." },
  { id: "mucit",      tree: "crafting",tier:9, name: "Mucit",         desc: "Mektepte her çalışma puan kazandırır." },
  // SOSYAL
  { id: "dil_dokme",  tree: "social", tier: 3, name: "Dil Dökme",     desc: "Sohbette ilişki kazancın %50 artar." },
  { id: "hosgoru",    tree: "social", tier: 3, name: "Hoşgörü",       desc: "Sadaka şeref kazancını artırır." },
  { id: "karizmatik", tree: "social", tier: 6, name: "Karizmatik",    desc: "Evlilik teklifin ve loncaya katılımın kolaylaşır." },
  { id: "sohret_avcisi",tree:"social",tier: 6, name: "Şöhret Avcısı", desc: "Ziyafet şöhret kazancını artırır." },
  { id: "diplomat",   tree: "social", tier: 9, name: "Diplomat",      desc: "Tüm itibar eylemleri %50 daha etkili." },
  { id: "lider",      tree: "social", tier: 9, name: "Lider",         desc: "Lonca görev itibarın %50 artar." },
];
export function perkById(id: string): Perk | undefined { return PERKS.find((p) => p.id === id); }
export function hasPerk(p: Player, id: string): boolean { return p.perks.includes(id); }

// Beceri seviyesi: her 100 xp = 1 seviye (maks 10).
export function skillLevel(xp: number): number { return Math.max(0, Math.min(10, Math.floor(xp / 100))); }
const SKILL_TIERS = [3, 6, 9];
// Bir dalda hak edilmiş ama henüz seçilmemiş perk kademesi var mı?
export function pendingPerkTier(p: Player, tree: SkillKey): number | null {
  const lvl = p.skills[tree];
  for (const t of SKILL_TIERS) {
    if (lvl >= t) {
      const chosen = p.perks.some((id) => { const pk = perkById(id); return pk && pk.tree === tree && pk.tier === t; });
      if (!chosen) return t;
    }
  }
  return null;
}
export function pendingPerkCount(p: Player): number {
  // Dal değil KADEME sayar: seviye 9 + hiç hüner seçilmemiş dalda 3 bekleyen hak vardır — rozet eksik saymasın.
  return SKILL_META.reduce((n, m) => n + SKILL_TIERS.filter((t) => p.skills[m.key] >= t && !p.perks.some((id) => { const pk = perkById(id); return pk && pk.tree === m.key && pk.tier === t; })).length, 0);
}
// XP ekle; seviye atlarsa günlüğe işle (saf — clone edilmiş state üstünde çağrılır).
function gainSkill(s: GameState, key: SkillKey, xp: number) {
  const p = s.player;
  if (p.childhood === "merakli") xp = Math.round(xp * 1.15); // meraklı çocukluk: ömür boyu daha hızlı öğrenir
  const before = p.skills[key];
  p.skill_xp[key] += xp;
  const after = skillLevel(p.skill_xp[key]);
  if (after > before) {
    p.skills[key] = after;
    const m = SKILL_META.find((x) => x.key === key)!;
    const perk = SKILL_TIERS.includes(after);
    push(s, "beceri", `${m.name} becerin ${after}. seviyeye yükseldi.${perk ? " Yeni bir hüner seçebilirsin!" : ""}`, "kişisel", false, { k: `ev.su.${key}${perk ? ".perk" : ""}`, p: [after] });
  } else {
    p.skills[key] = after;
  }
}
// Bir perk seç (kademe hak edilmişse).
export function choosePerk(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const pk = perkById(id);
  if (p.dead || !pk || hasPerk(p, id)) return s;
  if (p.skills[pk.tree] < pk.tier) return s;
  if (pendingPerkTier(p, pk.tree) !== pk.tier) return s; // bu kademe zaten doldurulmuş
  p.perks.push(id);
  push(s, "hüner", `Yeni hüner: ${pk.name} — ${pk.desc}`, "kişisel", true, { k: "evj.perk", p: [pk.name, pk.desc] });
  return s;
}

// ── Hikâye yayları ──
export function beginArc(prev: GameState, id: string): GameState {
  const s = clone(prev); const a = arcById(id);
  if (!a || s.player.dead) return s;
  if (s.story.active || s.story.completed.includes(id)) return s;
  s.story.active = { id, stage: a.start };
  push(s, "hikaye_basladi", `Yeni bir hikâye başladı: ${a.title}.`, "kişisel", true, { k: "evj.arcStart", p: [a.title] });
  return s;
}
// Aktif yayda bir seçim yap: etkiyi uygula, sahneyi ilerlet ya da bitir.
// Sonraki olaya kadar ilerle: karar isteyen bir şey (bekleyen sahne, mikro an, destan sahnesi,
// divan arzuhali) ya da bir dönüm noktası düşene dek zamanı akıt — en çok maxAy ay.
// Güvenlik: açlık/sağlık kritiğe inerse durur; oyuncu ekranı izlemeden eriyip ölmesin.
export function advanceUntilEvent(prev: GameState, maxAy = 6): GameState {
  let s = prev;
  for (let i = 0; i < maxAy; i++) {
    s = advance(s, 1);
    const p = s.player;
    if (p.dead) break;
    if (s.pendingScene || s.micro || s.saga?.scene || (p.crowned && s.divan)) break;
    if (p.hunger <= 30 || p.health <= 40) break;
    if (s.history.some((e) => e.landmark && e.day >= s.turn)) break;
  }
  return s;
}
export function advanceArc(prev: GameState, choiceIdx: number, loc?: { result?: string; endLabel?: string }): GameState {
  const s = clone(prev);
  if (s.player.dead || !s.story.active) return s; // ceset hikâye ilerletemez (kazanç mirasa sızıyordu)
  const a = arcById(s.story.active.id); if (!a) { s.story.active = null; return s; }
  const stage = a.stages[s.story.active.stage]; if (!stage) { s.story.active = null; return s; }
  const c: ArcChoice | undefined = stage.choices[choiceIdx]; if (!c) return s;
  if (c.delta) {
    const p = s.player; const d = c.delta;
    if (d.money) p.money = Math.max(0, p.money + d.money);
    if (d.health) p.health = Math.max(0, Math.min(100, p.health + d.health));
    if (d.hunger) p.hunger = Math.max(0, Math.min(100, p.hunger + d.hunger));
    if (d.reputation) p.reputation = Math.max(-100, Math.min(100, p.reputation + d.reputation));
    if (d.honor) p.honor = Math.max(0, Math.min(100, p.honor + d.honor));
    if (d.fear) p.fear = Math.max(0, Math.min(100, p.fear + d.fear));
    if (d.fame) p.fame = Math.max(0, Math.min(100, p.fame + d.fame));
    if (d.stat_points) p.stat_points += d.stat_points;
    if (d.addItem) p.inventory[d.addItem] = (p.inventory[d.addItem] || 0) + 1;
    if (d.nam) for (const k of Object.keys(d.nam) as (keyof Nam)[]) bumpNam(p, k, d.nam[k]!);
    // Düğün dalı: anlatı ile mekanik ayrışmasın — sonuç "düğün var" diyorsa oyuncu gerçekten evlenir (rastgele evlilikle aynı kurulum).
    if (d.marry && !p.married) {
      const name = p.gender === "erkek" ? rnd(SPOUSE_K) : rnd(SPOUSE_E);
      p.married = true; p.married_turn = s.turn; p.spouse_bond = 45; p.spouse_name = name; p.spouse_seed = Math.floor(Math.random() * 1e9); p.widowed = false;
    }
  }
  push(s, "hikaye", loc?.result || c.result, "kişisel");
  if (c.next === "end") {
    push(s, "hikaye_bitti", loc?.endLabel || `"${a.title}" sona erdi.`, "kişisel", true);
    s.story.completed.push(a.id);
    s.story.flags = { ...(s.story.flags || {}), [a.id]: true }; // hanedan hafızası (nesiller arası kalıcı)
    s.story.active = null;
    s.story.tension = Math.max(0, s.story.tension - 2);
  } else {
    s.story.active = { id: a.id, stage: c.next };
  }
  if (s.player.health <= 0) die(s, `${s.player.name} hikâyesinin ortasında can verdi.`, { k: "evj.dieArc", p: [s.player.name] });
  return s;
}

// ── Rakip hanedanlar: oyuncunun gücü ve hanedanlara tavrı ──
export function playerHousePower(p: Player): number {
  return Math.round(p.fame + p.generation * 10 + p.properties.length * 6 + p.reputation / 2 + p.skills.combat);
}
// Bir hanedanın oyuncuya tavrı (-100..100): nam/itibar artırır, gurur+korku düşürür.
export function houseAttitude(p: Player, house: { pride: number; trait: string }): number {
  let a = (p.reputation + p.honor / 2) - house.pride / 2 - p.fear / 3;
  if (house.trait === "kindar") a -= p.fear / 4;
  if (house.trait === "cömert") a += (p.nam?.comert || 0) / 4;
  if (house.trait === "sadık") a += p.honor / 4;
  if (house.trait === "ihtiraslı") a -= p.fame / 6;
  // Mertlik her hanede saygı görür; zalimlik her yerde iter; çapkın namı köklü/sadık haneleri ürkütür.
  a += (p.nam?.mert || 0) / 6;
  a -= (p.nam?.zalim || 0) / 6;
  if (house.trait === "sadık") a -= (p.nam?.capkin || 0) / 5;
  return Math.max(-100, Math.min(100, Math.round(a)));
}
export function attitudeLabel(a: number): string {
  if (a >= 40) return "Dost"; if (a >= 10) return "Dostane"; if (a > -10) return "Tarafsız"; if (a > -40) return "Soğuk"; return "Hasım";
}

// ── İtibar & Tanınma: gerçekçi sosyal mantık ──
// fame (şöhret) = adının ne kadar/ne uzağa ulaştığı. şeref/korku/nam = nasıl tanındığın.
// Temel ilke: bir yabancı, karakterine ancak adını DUYDUĞU ölçüde tepki verir.
export function atHome(p: Player): boolean { return !!p.home_name && p.location_name === p.home_name; }

// 0..1 — bulunduğun yerde sıradan birinin seni tanıma / adına göre davranma derecesi.
// Memleketinde herkes seni biraz tanır (yerel taban); uzakta yalnızca şöhretin taşır.
export function recognition(s: GameState): number {
  const p = s.player;
  const reach = Math.max(0, Math.min(100, p.fame)) / 100;
  const localFloor = atHome(p) ? 0.45 : 0;
  return Math.max(0, Math.min(1, reach + localFloor));
}

// İmzalı "ne kadar olumlu tanınıyorsun" — tanınma ile kapılı.
export function esteem(s: GameState): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  const usluBonus = p.childhood === "uslu" ? 4 : 0; // uslu çocukluk: ömür boyu süren iyi nam
  const elderBonus = p.age >= 55 ? Math.min(10, Math.round((p.age - 55) * 0.6)) : 0; // ihtiyara hürmet: yaş ilerledikçe saygınlık
  const haciBonus = p.legacy?.hac ? 6 : 0; // Hacı pâyesi: ömür boyu süren sosyal saygınlık
  // Görünür servet: harcanmış/taşa yazılmış zenginlik saygınlık getirir — likit nakit DEĞİL (para→saygınlık döngüsü kapalı; "zengin ama pinti" fark edilir).
  const l = p.legacy || ({} as Record<string, boolean>);
  const wealthShow = Math.min(15, (p.estate || 0) * 1.5 + (l.imaret ? 3 : 0) + (l.vakif ? 4 : 0) + (l.anit ? 5 : 0) + (p.horse ? 1 : 0) + Math.min(3, p.properties.length));
  const ch = p.reputation + p.honor * 0.8 + (n.comert || 0) * 0.5 + (n.mert || 0) * 0.5 + (n.dindar || 0) * 0.3 - (n.zalim || 0) * 0.7 - p.fear * 0.4 + attireScore(p).prestige + usluBonus + elderBonus + haciBonus + wealthShow;
  return Math.round(ch * recognition(s));
}
// "Ne kadar korkulan/çekinilen" (0..+) — tanınma ile kapılı; cömertlik/mertlik korkuyu yumuşatır.
export function dread(s: GameState): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  const menace = p.fear + (n.zalim || 0) * 0.6 - (n.comert || 0) * 0.3 - (n.mert || 0) * 0.2;
  return Math.max(0, Math.round(menace * recognition(s)));
}

// Pazarlık şansına ek: tanınan (sevilen ya da korkulan) kişinin sözü geçer; meçhul birinin pazarlık gücü zayıftır.
export function bargainBonus(s: GameState): number {
  const e = esteem(s) / 100, d = dread(s) / 100;
  return Math.max(-0.12, Math.min(0.18, e * 0.12 + d * 0.12 - (1 - recognition(s)) * 0.04));
}
// Suç başarısına ek: korku/zalim (tanınmışsa) kurbanı dondurur (+); mertlik/şeref sinsiliği zorlaştırır (−).
export function crimeSuccessMod(s: GameState): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  return dread(s) / 100 * 0.18 - ((n.mert || 0) + p.honor * 0.5) / 100 * 0.10;
}
// Yakalanınca EK itibar cezası: tanınan, şerefli ya da dindar birinin kaybedecek adı çoktur.
export function crimeCaughtPenalty(s: GameState): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  return Math.round(((p.honor + (n.mert || 0) + (n.dindar || 0)) / 100) * 8 * recognition(s));
}
// Sohbette olumlu ilişki kazancı çarpanı (~0.7..1.3): sıcak tanınana herkes açılır; korkulan/zalimden çekinilir.
export function talkWarmthMod(s: GameState): number {
  const e = esteem(s) / 100, d = dread(s) / 100;
  return Math.max(0.7, Math.min(1.3, 1 + e * 0.3 - d * 0.3));
}
// Çapkınlık: flört/iltifatla ilişki kurmada çekicilik (0..+). Kişisel olduğu için tanınmaya az bağlı.
export function allureBonus(s: GameState): number {
  return Math.min(0.2, (s.player.nam?.capkin || 0) / 100 * 0.2);
}
// Baskın nam: en yüksek eksen ≥40 ve ikinciden belirgin önde ise (Vercel dominant_nam, sayaç ölçeği).
export function playerDominantNam(p: Player): string | null {
  const n = p.nam || ({} as Nam);
  const sorted = (Object.entries(n) as [string, number][]).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return null;
  const [top, second] = [sorted[0], sorted[1] || ["", 0]];
  return top[1] >= 40 && top[1] >= (second[1] as number) * 1.3 ? top[0] : null;
}
// Evlilik teklifi şansına ek: mert/şeref/dindar (tanınmışsa) güven verir; çapkın namı saygın aileyi ürkütür; korku düşürür.
export function courtBonus(s: GameState): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  const trust = ((n.mert || 0) + p.honor * 0.6 + (n.dindar || 0) * 0.4) / 100;
  const scandal = (n.capkin || 0) / 100, menace = dread(s) / 100;
  const zalimRet = playerDominantNam(p) === "zalim" ? 0.18 : 0; // baskın zalim → iyi aileler teklifi reddeder
  return Math.max(-0.4, Math.min(0.25, recognition(s) * trust * 0.2 - scandal * 0.12 - menace * 0.15 - zalimRet));
}
// Lonca itibar kazancı çarpanı: onurlu loncalar mert/şerefe değer verir; Gölge Kardeşliği zalim/korkuya.
export function factionStandingMod(s: GameState, faction: string): number {
  const p = s.player; const n = p.nam || ({} as Nam);
  const honorable = (p.honor + (n.mert || 0)) / 100, shadow = (p.fear + (n.zalim || 0)) / 100;
  if (faction === "golge") return Math.max(0.7, Math.min(1.4, 1 + shadow * 0.4 - honorable * 0.2));
  return Math.max(0.7, Math.min(1.4, 1 + honorable * 0.3 - shadow * 0.2));
}
// Karakter ekranı için: bulunduğun yerde halkın algısı.
export function publicPerception(s: GameState): { recog: number; key: string } {
  const recog = recognition(s);
  if (recog < 0.12) return { recog, key: "unknown" };
  const e = esteem(s), d = dread(s);
  if (d > 25 && d >= e) return { recog, key: d > 55 ? "feared" : "wary" };
  if (e > 25) return { recog, key: e > 55 ? "beloved" : "esteemed" };
  if (e < -15) return { recog, key: "disliked" };
  return { recog, key: "neutral" };
}

// ── Hanedan: mühür kademesi, hanedan gücü, taht ve yerleşim ──
// Hanedanın toplam gücü (kişisel güç + irsî birikim + tahta + yerleşimler).
export function dynastyPower(s: GameState): number {
  const p = s.player;
  const courtBonus = inCourt(p) ? ((p.courtRank ?? 0) + 1) * 6 : 0;          // saray mevkii haneyi yükseltir (Kâtip +6 … Sadrazam +30)
  const conquestBonus = (p.crownConquests?.length || 0) * 10;                // ilhak edilen her diyar haneye güç katar
  const worksBonusTotal = Object.values(p.govWorks || {}).reduce((a, arr) => a + arr.length, 0) * 3; // bayındırlık eserleri
  return playerHousePower(p) + (s.settlements?.length || 0) * 8 + (p.crowned ? 40 : 0) + courtBonus + conquestBonus + worksBonusTotal + (p.estate || 0) * 5; // aile konağı: taşa yazılmış güç
}
// Mühür kademesi (0..4) — gerçekçi: köklü bir hane nesillerce inşa edilir.
export function houseSeal(power: number): { tier: number; key: string } {
  if (power >= 200) return { tier: 4, key: "pillar" };
  if (power >= 140) return { tier: 3, key: "great" };
  if (power >= 90) return { tier: 2, key: "respected" };
  if (power >= 50) return { tier: 1, key: "known" };
  return { tier: 0, key: "ordinary" };
}

// ── TAHT YOLU (gerçekçi, çekişmeli) ──
export interface ThroneReq { key: string; cur: number; need: number; ok: boolean; }
export const THRONE_COST = 5000;
// Meşruiyet + güç tabanı şartları. Bir teşkilat desteği de gerekir (ayrı kontrol edilir).
export function throneRequirements(s: GameState): ThroneReq[] {
  const p = s.player;
  return [
    { key: "age",   cur: p.age,                   need: 35 },
    { key: "power", cur: dynastyPower(s),          need: 140 },
    { key: "rep",   cur: Math.round(p.reputation), need: 70 },
    { key: "fame",  cur: Math.round(p.fame),       need: 60 },
    { key: "gold",  cur: p.money,                  need: THRONE_COST },
  ].map((r) => ({ ...r, ok: r.cur >= r.need }));
}
// Tahta iddia için arka: bir lonca DESTEĞİ ya da sarayda yüksek mevki (Vezir+) — devlet ricalinden güç tabanı.
export function throneBacking(p: Player): boolean { return !!p.faction || (p.courtRank ?? -1) >= 3; }
export function canClaimThrone(s: GameState): boolean {
  return !s.player.crowned && !s.player.dead && throneBacking(s.player) && throneRequirements(s).every((r) => r.ok);
}
// İddianın başarı şansı: hane gücü en güçlü rakibe karşı, şöhret, savaş ve lonca desteğiyle ölçülür.
export function throneOdds(s: GameState): number {
  const p = s.player;
  const rivals = generateDynasties(s.seed);
  const topRival = Math.max(100, ...rivals.map((h) => h.power));
  // Hane gücünün rakibe ÜSTÜNLÜĞÜ asıl belirleyici olsun: kişisel paye terimleri (şöhret/savaş/
  // saygınlık) beceri tavanı 10 ve sabit katkılarla 0.9 tavanını her nitelikli oyuncuda doldurup
  // tahtı garanti %90'a çeviriyordu. Yeniden kalibre: sınırda iddia gerçek bir kumar (~%68),
  // baskın hanedan hâlâ avantajlı (~%84).
  const odds = 0.30 + (dynastyPower(s) - topRival) / 260 + p.fame / 600 + p.skills.combat / 90 + (esteem(s) / 650);
  return Math.max(0.18, Math.min(0.84, odds));
}
// Tahta iddia — sefer parası her hâlükârda harcanır; başarısızlık ağır bedel.
export function claimThrone(prev: GameState): { state: GameState; success: boolean } {
  const s = clone(prev); const p = s.player;
  if (!canClaimThrone(s)) return { state: s, success: false };
  const odds = throneOdds(s);
  p.money -= THRONE_COST;
  const success = Math.random() < odds;
  if (success) {
    p.crowned = true;
    p.crownAuthority = 72; // tahta yeni çıkan hükümdarın başlangıç otoritesi
    p.fame = Math.min(100, p.fame + 25); p.reputation = Math.min(100, p.reputation + 15);
    bumpNam(p, "mert", 6);
    push(s, "taht", `Tahta çıktın! Bundan böyle ${p.surname || p.name} Hanedanı diyara hükmediyor.`, "kişisel", true, { k: "ev.throne.win" });
  } else {
    p.reputation = Math.max(-100, p.reputation - 30); p.fame = Math.max(0, p.fame - 15);
    p.fear = Math.min(100, p.fear + 10); p.health = Math.max(1, p.health - 25);
    push(s, "taht_basarisiz", "Taht iddian bastırıldı — hain ilan edildin, itibarın yerle bir oldu.", "kişisel", true, { k: "ev.throne.lose" });
  }
  return { state: s, success };
}

// ── KADEMELİ YERLEŞİM (gerçek hayat filtresi): bir bölgede mülk topla → mezra kur (berat öde)
//    → mülk ekleyip akçe dökerek geliştir → köy → kasaba → şehir doğru kademe kademe büyüt. ──
export const SETTLE_TIERS = ["mezra", "köy", "kasaba", "şehir"];
// Her kademenin şartı: o bölgede sahip olunması gereken mülk + gerekli gelişmişlik + berat bedeli (nominal; enflasyonla çarpılır) + vergi katsayısı.
export const SETTLE_TIER: Record<string, { props: number; dev: number; fee: number; tax: number }> = {
  mezra:  { props: 3,  dev: 0,   fee: 2500,  tax: 0.25 },
  "köy":  { props: 5,  dev: 40,  fee: 6000,  tax: 0.55 },
  kasaba: { props: 8,  dev: 70,  fee: 16000, tax: 1.0 },
  "şehir":{ props: 12, dev: 100, fee: 40000, tax: 1.7 },
};
export const SETTLE_MAX = 3;
// Berat bedeli güncel (enflasyonlu).
export function settleFee(s: GameState, tier: string): number { return Math.round((SETTLE_TIER[tier]?.fee || 0) * inflationFactor(s)); }
// Mezra kurmak için: bu bölgede yeterli mülk + berat parası + henüz burada yerleşim yok.
export function canFoundSettlement(s: GameState): { ok: boolean; reason: string } {
  const p = s.player; const here = p.location_name;
  if (p.dead) return { ok: false, reason: "dead" };
  if ((s.settlements?.length || 0) >= SETTLE_MAX) return { ok: false, reason: "max" };
  if ((s.settlements || []).some((st) => st.loc === here)) return { ok: false, reason: "here" };
  if (propsInLoc(s, here) < SETTLE_TIER.mezra.props) return { ok: false, reason: "prop" };
  if (p.money < settleFee(s, "mezra")) return { ok: false, reason: "gold" };
  return { ok: true, reason: "" };
}
export function foundSettlement(prev: GameState, name: string): GameState {
  const s = clone(prev); const p = s.player; const here = p.location_name;
  if (!canFoundSettlement(s).ok || !name.trim()) return s;
  p.money -= settleFee(s, "mezra");
  if (!s.settlements) s.settlements = [];
  s.settlements.push({ name: name.trim().slice(0, 24), founded: s.turn, dev: 8, tier: "mezra", loc: here });
  p.fame = Math.min(100, p.fame + 4); p.reputation = Math.min(100, p.reputation + 3);
  push(s, "yerlesim", `${name.trim()} adıyla bir mezra kurdun (${here}). Mülk ekleyip geliştirdikçe köye, kasabaya doğru büyüyecek.`, "kişisel", true, { k: "ev.settle.found", p: [name.trim(), { pl: here }] });
  return s;
}
// Bir yerleşimin bir sonraki kademesi (yoksa null = en üst).
export function nextSettleTier(st: Settlement): string | null {
  const i = SETTLE_TIERS.indexOf(st.tier || "mezra");
  return i >= 0 && i < SETTLE_TIERS.length - 1 ? SETTLE_TIERS[i + 1] : null;
}
// Kademe yükseltme uygunluğu: bölgede yeterli mülk + gelişmişlik + berat parası.
export function canUpgradeSettleTier(s: GameState, index: number): { ok: boolean; reason: string; next: string | null } {
  const st = s.settlements?.[index]; if (!st) return { ok: false, reason: "none", next: null };
  const next = nextSettleTier(st); if (!next) return { ok: false, reason: "top", next: null };
  const req = SETTLE_TIER[next];
  if (st.dev < req.dev) return { ok: false, reason: "dev", next };
  if (propsInLoc(s, st.loc || "") < req.props) return { ok: false, reason: "prop", next };
  if (s.player.money < settleFee(s, next)) return { ok: false, reason: "gold", next };
  return { ok: true, reason: "", next };
}
export function upgradeSettleTier(prev: GameState, index: number): GameState {
  const s = clone(prev); const chk = canUpgradeSettleTier(s, index);
  if (!chk.ok || !chk.next) return s;
  const st = s.settlements![index]; const p = s.player;
  p.money -= settleFee(s, chk.next);
  st.tier = chk.next; st.dev = Math.max(8, st.dev - 30); // büyüyen yerleşim yeniden gelişmeye başlar
  p.fame = Math.min(100, p.fame + 6); p.reputation = Math.min(100, p.reputation + 4);
  push(s, "yerlesim", `${st.name} artık bir ${chk.next}! Hanedanının nüfuzu büyüyor.`, "kişisel", true, { k: "ev.settle.up", p: [st.name, { stt: chk.next }] });
  return s;
}
// Yerleşim geliştirme bedeli (kademe + gelişmişlik arttıkça pahalanır) — geç-oyun servetine üretken musluk.
export function developSettlementCost(st: Settlement): number { const tm = 1 + SETTLE_TIERS.indexOf(st.tier || "mezra") * 0.6; return Math.round((120 + st.dev * 12) * tm); }
// Akçe dökerek yerleşimini hızla geliştir (vergi gelirini artırır + kademe yükseltmenin önünü açar).
export function developSettlement(prev: GameState, index: number): GameState {
  const s = clone(prev); const p = s.player; const st = s.settlements?.[index];
  if (!st || st.dev >= 100) return s;
  const cost = developSettlementCost(st); if (p.money < cost) return s;
  p.money -= cost; st.dev = Math.min(100, st.dev + 8);
  if (st.dev >= 100) p.fame = Math.min(100, p.fame + 3);
  push(s, "yerlesim", `${st.name} için akçe döktün; ${st.tier || "mezra"} hızla gelişti (gelişmişlik %${st.dev}).`, "kişisel", false, { k: "evj.settleDev", p: [st.name, st.dev] });
  return s;
}
// Bir yerleşimin yıllık vergi geliri (kademe × gelişmişlik × halk desteği).
export function settlementIncome(s: GameState): number {
  if (!s.settlements?.length) return 0;
  const repMult = 1 + Math.max(0, s.player.reputation) / 300;
  return Math.round(s.settlements.reduce((a, st) => a + st.dev * (SETTLE_TIER[st.tier || "mezra"]?.tax || 0.25), 0) * repMult);
}

// ── GÖRKEM & BAĞIŞ (geç-oyun servetine anlamlı musluklar; gerçek hayat filtresi) ──
// Soylular vakıf kurar, imaret açar, anıt diktirir, hekim tutar. Para harcanacak yer bulur,
// servet itibara/şöhrete/sağlığa/mirasa dönüşür. Bedeller enflasyonla güncellenir.
// ── AİLE KONAĞI: hanedanın taş kütüğü — kademe kademe yükselen, NESİLLERE KALAN görkem merdiveni.
// "Zengin 50'liğin parasını harcayacağı şey" sorusunun cevabı: her kademe hanedan gücü + vârise çeyiz.
export const ESTATE_TIERS = [
  { id: "avlu", cost: 5000 }, { id: "selamlik", cost: 15000 }, { id: "hamam", cost: 40000 },
  { id: "kutuphane", cost: 90000 }, { id: "bahce", cost: 200000 }, { id: "saray", cost: 450000 },
] as const;
export function estateCost(s: GameState): number {
  const t = s.player.estate || 0;
  return t >= ESTATE_TIERS.length ? 0 : Math.round(ESTATE_TIERS[t].cost * inflationFactor(s));
}
export function upgradeEstate(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  const t = p.estate || 0;
  if (p.dead || t >= ESTATE_TIERS.length) return s;
  const cost = estateCost(s); if (p.money < cost) return s;
  p.money -= cost; p.estate = t + 1;
  const id = ESTATE_TIERS[t].id;
  p.fame = Math.min(100, p.fame + 2 + t);
  push(s, "konak", `Aile konağına yeni bir bölüm eklendi; hanedanın taş kütüğü büyüyor.`, "kişisel", true, { k: "est.up." + id });
  return s;
}
// ── VAKIF FONU: vakıf kurulduysa (legacy.vakif) sınırsız beslenebilir — servet "anlam"a dönüşür.
// Toplam fon hiç budanmaz; mersiyeye, hanedan kütüğüne ve vârisin başlangıç itibarına akar.
export const VAKIF_DONATE_AMOUNTS = [1000, 5000, 25000] as const;
// ── HEKİM ZİYARETİ: akçeyle tedavi (tur başına tek). Kronik hastalığı iyileştirme şansı taşır — sağlık pasif sayı olmaktan çıkar. ──
export function healerCost(s: GameState): number { return Math.round(25 * inflationFactor(s)); }
export function visitHealer(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || p.age < 13 || inJail(p)) return s; // hekim zindana gelmez
  if (p.healer_turn === s.turn) return s; // ayda tek muayene
  const cost = healerCost(s); if (p.money < cost) return s;
  p.healer_turn = s.turn; p.money -= cost;
  p.health = Math.min(100, p.health + 12);
  if (p.chronic && chance(p.chronic.k === "eklem" ? 0.25 : 0.4)) {
    const curedKind = p.chronic.k; delete p.chronic;
    if (curedKind === "eklem") push(s, "saglik", `Hekimin yakıları işledi: eklemlerdeki sızı çekildi, adımların açıldı (−${cost} akçe).`, "kişisel", true, { k: "evj.eklemCured", p: [cost] });
    else push(s, "saglik", `Hekimin otları nihayet işledi: eski öksürük kesildi, göğsün açıldı (−${cost} akçe).`, "kişisel", true, { k: "evj.chronicCured", p: [cost] });
  } else if (p.chronic) {
    if (p.chronic.k === "eklem") push(s, "saglik", `Hekime göründün; yakı iyi geldi ama sızı derinde (−${cost} akçe).`, "kişisel", false, { k: "evj.healerEklem", p: [cost] });
    else push(s, "saglik", `Hekime göründün; nefesin açıldı ama eski öksürük yerinde (−${cost} akçe).`, "kişisel", false, { k: "evj.healerChronic", p: [cost] });
  } else {
    { const hv2 = chance(0.5); push(s, "saglik", hv2 ? `Hekim nabzını dinledi, diline baktı: "Bir şeyin yok, yorgunluk." Yine de üç günlük macun yazdı (−${cost} akçe).` : `Hekime göründün; şuruplar ve dinlenme iyi geldi (−${cost} akçe).`, "kişisel", false, { k: hv2 ? "evj.healerVisit2" : "evj.healerVisit", p: [cost] }); }
  }
  return s;
}
// Vakıf mertebeleri: fon eşikleri aşıldıkça bir kezlik nişan — 100k+ akçelik geç oyunda bile paranın
// ulaşılacak bir hedefi kalsın. Eşikler üstel büyür; farm edilemez (her eşik ömürde bir kez düşer).
export const VAKIF_TIERS = [25000, 100000, 250000, 1000000] as const;
export function vakifTier(fon: number): number { let n = 0; for (const t of VAKIF_TIERS) { if (fon >= t) n++; } return n; }
export function donateVakif(prev: GameState, amount: number): GameState {
  const s = clone(prev); const p = s.player;
  if (p.dead || !p.legacy?.vakif || amount <= 0 || p.money < amount) return s;
  if (p.vakif_turn === s.turn) return s; // ayda tek bağış — itibar damlası farmlanamaz
  p.vakif_turn = s.turn; p.money -= amount;
  const onceki = vakifTier(p.vakif_fon || 0);
  p.vakif_fon = (p.vakif_fon || 0) + amount;
  p.reputation = Math.min(100, p.reputation + 2); bumpNam(p, "comert", 3);
  push(s, "bagis", `Vakfına ${amount} akçe akıttın; kazanın altında yanan ateş büyüdü.`, "kişisel", false, { k: "est.vakifFund", p: [amount] });
  // Mertebe eşiği aşıldı: bir kezlik büyük an (landmark) — şöhret ve cömert nam mertebeyle büyür.
  const yeni = vakifTier(p.vakif_fon || 0);
  if (yeni > onceki) {
    p.fame = Math.min(100, p.fame + 3 + yeni * 2); bumpNam(p, "comert", 4 + yeni);
    const VT_TR = ["", "Vakfın mahallenin direği oldu; kapısında kazan hiç sönmüyor.", "Vakfın şehrin dört yanında anılıyor; adın hayırla yazılıyor.", "Vakfın diyarın en büyük hayratlarından sayılıyor; kervanlar bile yolunu değiştirip uğruyor.", "Vakfın çağlara kalacak bir müessese oldu; adın taşa değil gönüllere kazındı."];
    push(s, "bagis", VT_TR[yeni] || VT_TR[1], "kişisel", true, { k: "est.vakifTier" + yeni });
  }
  return s;
}
export const PRESTIGE: Record<string, { cost: number; repeat?: boolean; once?: boolean }> = {
  hekim:  { cost: 2500,  repeat: true },   // özel hekim → sağlık (ömrü uzatır)
  imaret: { cost: 9000 },                   // imaret/aşevi → itibar + halk desteği
  hac:    { cost: 7000,  once: true },      // hac → Hacı pâyesi: büyük dindar/cömert nam + ömür boyu saygınlık
  vakif:  { cost: 28000, once: true },      // vakıf → büyük itibar/şöhret + miras
  anit:   { cost: 90000, once: true },      // anıt → kalıcı şöhret + başarım
};
export function prestigeCost(s: GameState, id: string): number { return Math.round((PRESTIGE[id]?.cost || 0) * inflationFactor(s)); }
export function fundPrestige(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const def = PRESTIGE[id]; if (!def || p.dead) return s;
  const cost = prestigeCost(s, id); if (p.money < cost) return s;
  if (def.once && p.legacy?.[id]) return s;
  if (p.prestige_turn === s.turn) return s; // ayda tek hayrat işi — hekim/imaret aynı turda tavana pompalanamaz
  p.prestige_turn = s.turn;
  p.money -= cost; p.legacy = p.legacy || {};
  if (id === "hekim") { p.health = Math.min(100, p.health + 16); push(s, "saglik", `Usta bir hekim tuttun; sağlığın tazelendi (+16 sağlık).`, "kişisel", false, { k: "ev.prestige.hekim" }); }
  else if (id === "imaret") { p.reputation = Math.min(100, p.reputation + 9); p.fame = Math.min(100, p.fame + 3); p.legacy.imaret = true; push(s, "bagis", `Bir imaret açtın; yoksullar adını hayırla anıyor (+itibar).`, "kişisel", true, { k: "ev.prestige.imaret" }); }
  else if (id === "hac") { bumpNam(p, "dindar", 16); bumpNam(p, "comert", 6); p.reputation = Math.min(100, p.reputation + 8); p.fame = Math.min(100, p.fame + 4); p.legacy.hac = true; push(s, "bagis", `Hacca gidip döndün; artık Hacı diye anılıyorsun, sözün diyarda ağırlık taşıyor (büyük dindar nam + ömür boyu saygınlık).`, "kişisel", true, { k: "ev.prestige.hac" }); }
  else if (id === "vakif") { p.reputation = Math.min(100, p.reputation + 12); p.fame = Math.min(100, p.fame + 9); p.legacy.vakif = true; push(s, "bagis", `Adına bir vakıf kurdun; hayrın nesiller boyu sürecek (+itibar +şöhret).`, "kişisel", true, { k: "ev.prestige.vakif" }); }
  else if (id === "anit") { p.fame = Math.min(100, p.fame + 16); p.legacy.anit = true; push(s, "bagis", `Görkemli bir anıt diktirdin; diyar bu eseri asırlarca konuşacak (+şöhret).`, "kişisel", true, { k: "ev.prestige.anit" }); }
  return s;
}

// ── PİYASA OYNATMA ("Elon Musk" — haddinden fazla zengin oyuncu ekonominin dinamolarını oynatır) ──
// Yalnızca çok zengin oyuncu (≥50.000 akçe) büyük sermaye dökerek piyasayı kasıtlı oynatabilir;
// etki herkesi bağlar (dünya-bazlı sonuç) ve bir süre sürer. Soğuma: aktifken tekrar oynatılamaz.
export const MARKET_LEVER_MIN = 50000;
export function marketLeverCost(s: GameState): number { return Math.round(20000 * inflationFactor(s)); }
export function canManipulateMarket(s: GameState): { ok: boolean; reason: string } {
  const p = s.player;
  if (p.dead) return { ok: false, reason: "dead" };
  if (p.money < MARKET_LEVER_MIN) return { ok: false, reason: "poor" };
  if ((s.world?.marketLeverUntil || 0) > s.turn) return { ok: false, reason: "cool" };
  if (p.money < marketLeverCost(s)) return { ok: false, reason: "gold" };
  return { ok: true, reason: "" };
}
export function manipulateMarket(prev: GameState, dir: "pump" | "dump"): GameState {
  const s = clone(prev); const p = s.player;
  if (!canManipulateMarket(s).ok) return s;
  p.money -= marketLeverCost(s);
  if (dir === "pump") { s.econ = Math.min(2, (s.econ || 1) + 0.45); push(s, "piyasa", `Pazarı kasıp kavurdun — malları topladın, fiyatlar fırladı. Diyar seni konuşuyor.`, "makro", true, { k: "ev.lever.pump" }); }
  else { s.econ = Math.max(0.5, (s.econ || 1) - 0.45); push(s, "piyasa", `Ambarlarını açtın — piyasayı mala boğdun, fiyatlar düştü. Halk minnettar, tüccarlar küplere bindi.`, "makro", true, { k: "ev.lever.dump" }); }
  if (s.world) s.world.marketLeverUntil = s.turn + 6;
  p.fame = Math.min(100, p.fame + 3);
  return s;
}

// ── Şehir Yönetimi (Vercel city_governance.py portu) ──
export const GOV_TITLE: Record<string, string> = { "köy": "Muhtar", "kale": "Kale Beyi", "şehir": "Büyük Lord" };
export function govReqRep(kind: string): number { return kind === "şehir" ? 50 : kind === "kale" ? 40 : 20; }
export function isGovernor(p: Player, name: string): boolean { return (p.governorships || []).includes(name); }
export function canRunForGovernor(s: GameState, name: string): boolean {
  const p = s.player;
  return !p.dead && p.age >= 18 && !isGovernor(p, name) && !(p.appointedGov || {})[name] && p.reputation >= govReqRep(placeKind(name)); // atanmış vekil olan şehre tekrar vali olunmaz (çift gelir önlenir)
}
export function runForGovernor(prev: GameState, name: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!canRunForGovernor(s, name)) return s;
  if (p.gov_run_turn === s.turn) return s; // ayda tek valilik adaylığı — aynı turda şehir şehir vali olunamaz
  p.gov_run_turn = s.turn;
  if (!p.governorships) p.governorships = [];
  p.governorships.push(name);
  if (!p.govLeg) p.govLeg = {};
  p.govLeg[name] = 60; // başlangıç meşruiyeti
  p.reputation = Math.min(100, p.reputation + 5); p.fame = Math.min(100, p.fame + 6);
  push(s, "yonetim", `${name} valiliğine getirildin — artık ${GOV_TITLE[placeKind(name)] || "Vali"}sin.`, "kişisel", true, { k: "evj.govAppoint", p: [{ pl: name }] });
  return s;
}
// Valilik meşruiyetini para harcayarak tazele (halkı kazan, hizmet götür).
export const GOV_SHORE_COST = 30;
export function shoreUpLegitimacy(prev: GameState, name: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!p.governorships?.includes(name) || p.money < GOV_SHORE_COST) return s;
  // Tur başına tek valilik tedbiri — yoksa aynı turda meşruiyet/itibar tavana farm'lanır.
  if (p.gov_action_turn === s.turn) { push(s, "yonetim", `Bu ay valilik işlerine yeterince zaman ayırdın; gerisi gelecek aya.`, "kişisel", false, { k: "evj.govWait" }); return s; }
  p.gov_action_turn = s.turn;
  p.money -= GOV_SHORE_COST;
  if (!p.govLeg) p.govLeg = {};
  p.govLeg[name] = Math.min(100, (p.govLeg[name] ?? 60) + 14);
  // (Global itibar bumpı kaldırıldı — akçeyle itibar satın alma farmıydı; meşruiyet şehre özel + zamanla aşınır.)
  push(s, "yonetim", `${name}'de hayır işleri ve hizmet götürdün; halkın gözünde meşruiyetin arttı.`, "kişisel", false, { k: "gov.shoreDone", p: [{ pl: name }] });
  return s;
}
export function govLegOf(p: Player, name: string): number { return p.govLeg?.[name] ?? 60; }
// Şehir yönetim kolları (Vercel city_governance portu): vergi oranı, halk memnuniyeti, şehir hazinesi.
export function govTaxOf(p: Player, name: string): number { return p.govTax?.[name] ?? 15; }
export function govHappyOf(p: Player, name: string): number { return p.govHappy?.[name] ?? 60; }
export function govTreasuryOf(p: Player, name: string): number { return p.govTreasury?.[name] ?? 0; }
export const GOV_TAX_PRESETS: { id: string; rate: number }[] = [{ id: "dusuk", rate: 8 }, { id: "orta", rate: 15 }, { id: "yuksek", rate: 28 }];
// Vergi oranı belirle — yüksek vergi hazineyi/geliri büyütür ama halkı küstürür (memnuniyet → meşruiyet → azil riski).
export function setGovTax(prev: GameState, name: string, rate: number): GameState {
  const s = clone(prev); const p = s.player;
  if (!p.governorships?.includes(name)) return s;
  const r = Math.max(5, Math.min(40, Math.round(rate)));
  if (!p.govTax) p.govTax = {};
  p.govTax[name] = r;
  const lvl = r <= 10 ? "taxd" : r >= 22 ? "taxh" : "taxm";
  push(s, "yonetim", `${name}'de vergi siyasetini ayarladın (%${r}).`, "kişisel", false, { k: "gov." + lvl + "Set", p: [{ pl: name }] });
  return s;
}
// Şehir hazinesinden projeye harca: halka hizmet (+memnuniyet) veya asayiş (+meşruiyet).
export const GOV_INVEST_COST = 40;
export function investTreasury(prev: GameState, name: string, kind: "hizmet" | "asayis"): GameState {
  const s = clone(prev); const p = s.player;
  if (!p.governorships?.includes(name) || govTreasuryOf(p, name) < GOV_INVEST_COST) return s;
  // Tur başına tek valilik tedbiri — yoksa hazine aynı turda boşaltılıp memnuniyet/meşruiyet tavana farm'lanır.
  if (p.gov_action_turn === s.turn) { push(s, "yonetim", `Bu ay valilik işlerine yeterince zaman ayırdın; gerisi gelecek aya.`, "kişisel", false, { k: "evj.govWait" }); return s; }
  p.gov_action_turn = s.turn;
  if (!p.govTreasury) p.govTreasury = {}; if (!p.govHappy) p.govHappy = {}; if (!p.govLeg) p.govLeg = {};
  p.govTreasury[name] = govTreasuryOf(p, name) - GOV_INVEST_COST;
  if (kind === "hizmet") { p.govHappy[name] = Math.min(100, govHappyOf(p, name) + 10); p.govLeg[name] = Math.min(100, govLegOf(p, name) + 3); }
  else { p.govLeg[name] = Math.min(100, govLegOf(p, name) + 8); p.govHappy[name] = Math.min(100, govHappyOf(p, name) + 3); }
  push(s, "yonetim", `${name}'de şehir hazinesinden ${kind === "hizmet" ? "halka hizmet" : "asayiş"} için harcadın.`, "kişisel", false, { k: "gov.invDone." + kind, p: [{ pl: name }] });
  return s;
}
// ── Ferman (vali kararnamesi): şehre dokunan tek seferlik karar, bekleme süreli. Tradeoff'lu. ──
export const GOV_EDICT_COOLDOWN = 6; // ay
export interface GovEdict { id: string; costMoney: number; costTreasury: number; happy: number; leg: number; treasury: number; rep: number; honor: number; nam?: keyof Nam; namAmt?: number; }
export const GOV_EDICTS: GovEdict[] = [
  { id: "adalet",      costMoney: 25, costTreasury: 0,  happy: 8,   leg: 5,  treasury: 0,  rep: 2,  honor: 3 },                       // adalet fermanı: halk + meşruiyet + şeref
  { id: "vergiaffi",   costMoney: 0,  costTreasury: 30, happy: 14,  leg: 3,  treasury: 0,  rep: 1,  honor: 0, nam: "comert", namAmt: 3 }, // vergi affı: hazineden öde, halkı sevindir
  { id: "angarya",     costMoney: 0,  costTreasury: 0,  happy: -12, leg: -2, treasury: 40, rep: -1, honor: 0, nam: "zalim",  namAmt: 4 }, // angarya: hazine dolar, halk küser
  { id: "pazarserbest",costMoney: 20, costTreasury: 0,  happy: 6,   leg: 2,  treasury: 0,  rep: 2,  honor: 0, nam: "comert", namAmt: 2 }, // pazar serbestisi: esnaf sevinir
];
export function edictById(id: string): GovEdict | undefined { return GOV_EDICTS.find((e) => e.id === id); }
export function edictReady(p: Player, loc: string, turn: number): boolean { const last = p.govEdict?.[loc]; return last == null || turn - last >= GOV_EDICT_COOLDOWN; }
export function edictCooldownLeft(p: Player, loc: string, turn: number): number { const last = p.govEdict?.[loc]; return last == null ? 0 : Math.max(0, GOV_EDICT_COOLDOWN - (turn - last)); }
export function canIssueEdict(s: GameState, loc: string, id: string): boolean {
  const p = s.player; const e = edictById(id); if (!e) return false;
  return !!p.governorships?.includes(loc) && edictReady(p, loc, s.turn) && p.money >= e.costMoney && govTreasuryOf(p, loc) >= e.costTreasury;
}
export function issueEdict(prev: GameState, loc: string, id: string): GameState {
  const s = clone(prev); const p = s.player; const e = edictById(id);
  if (!e || !canIssueEdict(s, loc, id)) return s;
  p.money -= e.costMoney;
  if (!p.govTreasury) p.govTreasury = {}; if (!p.govHappy) p.govHappy = {}; if (!p.govLeg) p.govLeg = {}; if (!p.govEdict) p.govEdict = {};
  p.govTreasury[loc] = govTreasuryOf(p, loc) - e.costTreasury + e.treasury;
  p.govHappy[loc] = Math.max(0, Math.min(100, govHappyOf(p, loc) + e.happy));
  p.govLeg[loc] = Math.max(0, Math.min(100, govLegOf(p, loc) + e.leg));
  p.reputation = Math.max(-100, Math.min(100, p.reputation + e.rep));
  if (e.honor) p.honor = Math.min(100, p.honor + e.honor);
  if (e.nam && e.namAmt) bumpNam(p, e.nam, e.namAmt);
  p.govEdict[loc] = s.turn;
  push(s, "yonetim", `${loc}'de ferman çıkardın.`, "kişisel", true, { k: "gov.edict." + id, p: [{ pl: loc }] });
  return s;
}
// ── Bayındırlık eseri: şehre kalıcı yatırım (çeşme/köprü/imarethane/burç). Bir kez kurulur; memnuniyet/gelir tabanını yükseltir + şöhret. ──
export interface GovWork { id: string; costMoney: number; costTreasury: number; happy: number; leg: number; fame: number; nam?: keyof Nam; namAmt?: number; }
export const GOV_WORKS: GovWork[] = [
  { id: "cesme",      costMoney: 80,  costTreasury: 60,  happy: 12, leg: 6,  fame: 3 },
  { id: "kopru",      costMoney: 120, costTreasury: 100, happy: 6,  leg: 8,  fame: 5 },
  { id: "imarethane", costMoney: 100, costTreasury: 80,  happy: 16, leg: 5,  fame: 4, nam: "comert", namAmt: 4 },
  { id: "burc",       costMoney: 150, costTreasury: 120, happy: 4,  leg: 12, fame: 6 },
];
export function workById(id: string): GovWork | undefined { return GOV_WORKS.find((w) => w.id === id); }
export function worksOf(p: Player, loc: string): string[] { return p.govWorks?.[loc] || []; }
export function canFundWork(s: GameState, loc: string, id: string): boolean {
  const p = s.player; const w = workById(id); if (!w) return false;
  return !!p.governorships?.includes(loc) && !worksOf(p, loc).includes(id) && p.money >= w.costMoney && govTreasuryOf(p, loc) >= w.costTreasury;
}
export function fundWork(prev: GameState, loc: string, id: string): GameState {
  const s = clone(prev); const p = s.player; const w = workById(id);
  if (!w || !canFundWork(s, loc, id)) return s;
  p.money -= w.costMoney;
  if (!p.govTreasury) p.govTreasury = {}; if (!p.govHappy) p.govHappy = {}; if (!p.govLeg) p.govLeg = {}; if (!p.govWorks) p.govWorks = {};
  p.govTreasury[loc] = govTreasuryOf(p, loc) - w.costTreasury;
  p.govHappy[loc] = Math.min(100, govHappyOf(p, loc) + w.happy);
  p.govLeg[loc] = Math.min(100, govLegOf(p, loc) + w.leg);
  p.fame = Math.min(100, p.fame + w.fame);
  if (w.nam && w.namAmt) bumpNam(p, w.nam, w.namAmt);
  p.govWorks[loc] = [...worksOf(p, loc), id];
  push(s, "yonetim", `${loc}'de bir eser yaptırdın; adın hayırla anılacak.`, "kişisel", true, { k: "gov.work." + id, p: [{ pl: loc }] });
  return s;
}
// Kalıcı eser ikramiyesi: her eser halkı daha memnun tutar ve şehir gelirini bir nebze artırır.
export function worksBonus(p: Player, loc: string): number { return worksOf(p, loc).length; }

// Valilik döngüsü (her tur, yalnız vali ise): vergi → hazine, vergi → memnuniyet, memnuniyet+rep → meşruiyet; düşerse isyan/azil.
function governorTick(s: GameState) {
  const p = s.player; if (p.dead) return; const list = p.governorships; if (!list?.length) return; // öldüğün ay valilik/azil olayı çıkmasın (crownTick/courtTick ile tutarlı)
  if (!p.govLeg) p.govLeg = {}; if (!p.govHappy) p.govHappy = {}; if (!p.govTreasury) p.govTreasury = {};
  for (const loc of [...list]) {
    const tax = govTaxOf(p, loc);
    const works = worksBonus(p, loc); // bayındırlık eseri sayısı
    const prosperity = cityInfo(loc, placeKind(loc)).prosperity;
    p.govTreasury[loc] = Math.round((p.govTreasury[loc] ?? 0) + prosperity * tax / 100 * 0.4 * (1 + works * 0.06)); // hazine vergiyle dolar (eserler artırır)
    let happy = p.govHappy[loc] ?? 60;
    const happyTarget = Math.max(35, Math.min(94, 72 - (tax - 15) * 1.4 + works * 4)); // yüksek vergi → homurtu; eserler halkı hoş tutar
    happy = Math.max(0, Math.min(100, happy + (happyTarget - happy) * 0.1));
    p.govHappy[loc] = Math.round(happy);
    const target = 40 + (p.reputation - 50) * 0.4 + p.honor * 0.12 - p.fear * 0.05 + (happy - 60) * 0.25;
    let leg = p.govLeg[loc] ?? 60;
    leg = Math.max(0, Math.min(100, leg + (target - leg) * 0.12 - 1.2));
    p.govLeg[loc] = Math.round(leg);
    if (leg < 18 && Math.random() < 0.12 + (18 - leg) * 0.02) { // meşruiyet krizi → azil
      p.governorships = p.governorships!.filter((x) => x !== loc);
      delete p.govLeg[loc]; delete p.govHappy[loc]; delete p.govTreasury[loc];
      p.reputation = Math.max(-100, p.reputation - 8);
      push(s, "yonetim", `${loc}'de halk ayaklandı; valilikten azledildin.`, "kişisel", true, { k: "gov.deposed", p: [{ pl: loc }] });
    } else if (happy < 22 && Math.random() < 0.04 + (22 - happy) * 0.01) { // memnuniyet krizi → isyan (azil değil, zarar)
      p.govHappy[loc] = Math.min(100, happy + 18);
      p.govTreasury[loc] = Math.round((p.govTreasury[loc] ?? 0) * 0.5);
      p.reputation = Math.max(-100, p.reputation - 3);
      push(s, "yonetim", `${loc}'de halk homurdandı; şehir hazinesi zarar gördü.`, "kişisel", false, { k: "gov.unrest", p: [{ pl: loc }] });
    } else if (Math.random() < 0.05) { // merkezî divan talebi: hazineden vergi ister (öde → meşruiyet; ödeyemezsen güven sarsılır)
      const demand = 20 + Math.round(prosperity * 0.2);
      if ((p.govTreasury[loc] ?? 0) >= demand) {
        p.govTreasury[loc] = (p.govTreasury[loc] ?? 0) - demand;
        p.govLeg[loc] = Math.min(100, (p.govLeg[loc] ?? 60) + 5);
        push(s, "yonetim", `${loc}: Divan-ı hümâyun ${demand} akçe pay istedi; hazineden ödedin, sadakatin makbule geçti.`, "kişisel", false, { k: "gov.divanPay", p: [{ pl: loc }, demand] });
      } else {
        p.govLeg[loc] = Math.max(0, (p.govLeg[loc] ?? 60) - 6);
        p.govHappy[loc] = Math.max(0, (p.govHappy[loc] ?? 60) - 4);
        push(s, "yonetim", `${loc}: Divan-ı hümâyunun pay talebini karşılayamadın; merkezde itibarın sarsıldı.`, "kişisel", false, { k: "gov.divanFail", p: [{ pl: loc }] });
      }
    }
  }
}
// Valilik vergi payı (her tur): şehrin refahına × meşruiyet × vergi oranı (yüksek vergi çok toplar, düşük meşruiyet azaltır).
export function governorIncome(s: GameState): number {
  const list = s.player.governorships; if (!list?.length) return 0;
  return list.reduce((a, loc) => a + Math.max(1, Math.round(cityInfo(loc, placeKind(loc)).prosperity / 4 * (0.4 + govLegOf(s.player, loc) / 100 * 0.8) * (govTaxOf(s.player, loc) / 15) * (1 + worksBonus(s.player, loc) * 0.06))), 0);
}

// ── HÜKÜMDARLIK (taht sonrası oynanış): otorite + dîvân fermanları + sefer + vali atama/azil + saray olayları ──
export function crownAuthorityOf(p: Player): number { return p.crownAuthority ?? 72; }
// İddiacıyı BASTIR: sert yol — güç gösterisiyle iddiayı geriletir; başarısızlık otorite yer.
export const PRETENDER_SUPPRESS_COST = 400;
export function suppressPretender(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (!p.crowned || p.dead || !s.pretender || p.money < PRETENDER_SUPPRESS_COST) return s;
  if (p.crown_action_turn === s.turn) return s; // ayda tek taht eylemi
  p.crown_action_turn = s.turn; p.money -= PRETENDER_SUPPRESS_COST;
  const h = ensureRivals(s).find((x) => x.id === s.pretender!.houseId); if (!h) { s.pretender = null; return s; }
  if (Math.random() < Math.min(0.9, 0.45 + p.skills.combat * 0.03 + crownAuthorityOf(p) / 200 + Math.min(0.09, (s.allied_houses?.length || 0) * 0.03))) { // müttefikler iddiacıya karşı da yanında
    s.pretender!.strength = Math.max(0, s.pretender!.strength - 28); h.power = Math.max(20, h.power - 8); p.fear = clamp100(p.fear + 3);
    if (s.pretender!.strength <= 0) { s.pretender = null; p.crownAuthority = clamp100(crownAuthorityOf(p) + 8); push(s, "taht", `${h.name} sindirildi; iddia söndü.`, "kişisel", true, { k: "crown.pretCrushed", p: [{ hn: h.nameIdx }] }); }
    else push(s, "taht", `${h.name} destekçilerine gözdağı verdin; iddia geriledi.`, "kişisel", false, { k: "crown.pretSupWin", p: [{ hn: h.nameIdx }] });
  } else {
    s.pretender!.strength = Math.max(0, s.pretender!.strength - 8);
    p.crownAuthority = clamp100(crownAuthorityOf(p) - 4);
    push(s, "taht", `Baskın ters tepti; iddiacının sesi daha gür çıkıyor.`, "kişisel", false, { k: "crown.pretSupFail" });
  }
  return s;
}
// İddiacıyla UZLAŞ: pahalı ama onurlu yol — hanedanın gönlünü alır; gönül yeterince yumuşarsa iddia tümden düşer.
export const PRETENDER_RECONCILE_COST = 800;
export function reconcilePretender(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (!p.crowned || p.dead || !s.pretender || p.money < PRETENDER_RECONCILE_COST) return s;
  if (p.crown_action_turn === s.turn) return s;
  p.crown_action_turn = s.turn; p.money -= PRETENDER_RECONCILE_COST;
  const h = ensureRivals(s).find((x) => x.id === s.pretender!.houseId); if (!h) { s.pretender = null; return s; }
  h.tutum = Math.min(100, (h.tutum ?? 0) + 25);
  s.pretender!.strength = Math.max(0, s.pretender!.strength - 20);
  if (h.tutum >= 10 || s.pretender!.strength <= 0) {
    s.pretender = null; p.honor = clamp100(p.honor + 5); p.crownAuthority = clamp100(crownAuthorityOf(p) + 5);
    push(s, "taht", `${h.name} ile barış sağlandı; iddia onurlu bir anlaşmayla düştü.`, "kişisel", true, { k: "crown.pretPeace", p: [{ hn: h.nameIdx }] });
  } else {
    push(s, "taht", `${h.name} hediyeleri kabul etti; buzlar eriyor ama iddia henüz düşmedi.`, "kişisel", false, { k: "crown.pretSoften", p: [{ hn: h.nameIdx }] });
  }
  return s;
}
const clamp100 = (x: number) => Math.max(0, Math.min(100, x));

// Dîvân-ı hümâyun fermanları (şâhâne kararname): otorite/şöhret/hazine tradeoff'lu, bekleme süreli.
export const CROWN_DECREE_COOLDOWN = 8; // ay
export interface CrownDecree { id: string; gold: number; authority: number; fame: number; rep: number; honor: number; nam?: keyof Nam; namAmt?: number; }
export const CROWN_DECREES: CrownDecree[] = [
  { id: "adaletname",  gold: -200, authority: 10, fame: 4, rep: 4,  honor: 5 },                          // adaletnâme: adil hükümdar
  { id: "imar",        gold: -400, authority: 8,  fame: 8, rep: 3,  honor: 0, nam: "comert", namAmt: 5 }, // imar seferberliği: eserler
  { id: "genelaf",     gold: -100, authority: 12, fame: 2, rep: 5,  honor: 2 },                          // genel af: halk sevinir
  { id: "senlik",      gold: -250, authority: 6,  fame: 6, rep: 3,  honor: 0, nam: "comert", namAmt: 3 }, // şenlik & donanma
  { id: "medrese",     gold: -350, authority: 6,  fame: 7, rep: 3,  honor: 6, nam: "dindar", namAmt: 5 }, // medrese kur: ilim & dindar nam
  { id: "tahkimat",    gold: -500, authority: 15, fame: 6, rep: 2,  honor: 0 },                          // tahkimat: surlar güçlenir, otorite sağlamlaşır
  { id: "iane",        gold: -300, authority: 9,  fame: 3, rep: 7,  honor: 4, nam: "comert", namAmt: 5 }, // iane/aş ocağı: halkı doyur, itibar yüksek
  { id: "vergiferman", gold: 500,  authority: -10,fame: 0, rep: -4, honor: 0, nam: "zalim",  namAmt: 4 }, // ağır vergi: hazine dolar, otorite düşer
];
export function decreeById(id: string): CrownDecree | undefined { return CROWN_DECREES.find((d) => d.id === id); }
export function decreeReady(p: Player, turn: number): boolean { const l = p.crownDecree; return l == null || turn - l >= CROWN_DECREE_COOLDOWN; }
export function decreeCooldownLeft(p: Player, turn: number): number { const l = p.crownDecree; return l == null ? 0 : Math.max(0, CROWN_DECREE_COOLDOWN - (turn - l)); }
export function canIssueDecree(s: GameState, id: string): boolean {
  const p = s.player; const d = decreeById(id); if (!d) return false;
  return !!p.crowned && !p.dead && decreeReady(p, s.turn) && (d.gold >= 0 || p.money >= -d.gold);
}
export function issueDecree(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const d = decreeById(id);
  if (!d || !canIssueDecree(s, id)) return s;
  p.money += d.gold;
  p.crownAuthority = clamp100(crownAuthorityOf(p) + d.authority);
  if (d.fame) p.fame = clamp100(p.fame + d.fame);
  p.reputation = Math.max(-100, Math.min(100, p.reputation + d.rep));
  if (d.honor) p.honor = clamp100(p.honor + d.honor);
  if (d.nam && d.namAmt) bumpNam(p, d.nam, d.namAmt);
  p.crownDecree = s.turn;
  push(s, "taht", `Dîvân-ı hümâyunda bir ferman çıkardın.`, "kişisel", true, { k: "crown.decree." + id });
  return s;
}

// Sefer (hükümdar askerî seferi): rakip beyliğe sefer; başarı hane gücü + otorite + savaşla; ilhak → haraç + şöhret.
export const CAMPAIGN_COST = 800;
export function campaignTargets(s: GameState): { id: string; name: string }[] {
  const own = regionOf(s.player.home_name || s.player.location_name);
  const done = s.player.crownConquests || [];
  return BEYLIKS.filter((b) => b.id !== own && !done.includes(b.id)).map((b) => ({ id: b.id, name: b.name }));
}
export function canLaunchCampaign(s: GameState): boolean {
  if (inJail(s.player)) return false;
  if (s.crownCampaign) return false; // ordu zaten yolda — ikinci tuğ çözülmez
  return !!s.player.crowned && !s.player.dead && s.player.money >= CAMPAIGN_COST && campaignTargets(s).length > 0;
}
export function campaignOdds(s: GameState): number {
  const p = s.player;
  const odds = 0.40 + (dynastyPower(s) - 140) / 400 + crownAuthorityOf(p) / 300 + p.skills.combat / 50 + Math.min(0.12, (s.allied_houses?.length || 0) * 0.04); // müttefik haneler sancağın altına atlı yollar
  return Math.max(0.15, Math.min(0.88, odds));
}
export function launchCampaign(prev: GameState, beylikId: string): { state: GameState; success: boolean } {
  const s = clone(prev); const p = s.player;
  if (!canLaunchCampaign(s) || !campaignTargets(s).some((tg) => tg.id === beylikId)) return { state: s, success: false };
  p.money -= CAMPAIGN_COST;
  let edge = Math.min(6, (p.retinue || 0) * 2); // maiyet orduya omuz verir
  if ((s.allied_houses || []).length) {
    const ah = ensureRivals(s).find((x) => s.allied_houses!.includes(x.id));
    if (ah) { edge += 4; push(s, "taht", `${ah.name} sancağın altına atlılarını yolladı; ordun güçlendi.`, "kişisel", false, { k: "crown.allyAid", p: [{ hn: ah.nameIdx }] }); }
  }
  s.crownCampaign = { beylikId, month: 0, edge };
  push(s, "taht", `Tuğlar çözüldü, davullar vuruldu: ordu yürüyüşe geçti. Hüküm üç ay sonra okunacak.`, "kişisel", true, { k: "crown.campaignStart", p: [{ bl: beylikId }] });
  return { state: s, success: true };
}
// Sefer 2.0 ayı: yürüyüş (1), kuşatma (2), hüküm (3). Yol olayları ordu gücünü (edge) oynatır;
// hüküm ayında campaignOdds + edge/100 ile zar atılır. Taç düşerse ordu dağılır.
function crownCampaignTick(s: GameState) {
  const c = s.crownCampaign; const p = s.player;
  if (!c || p.dead) return;
  if (!p.crowned) {
    s.crownCampaign = null;
    push(s, "taht", `Taç düşünce sefer ordusu dağıldı; tuğlar geri getirildi.`, "kişisel", false, { k: "crown.cmp.dissolved" });
    return;
  }
  c.month += 1;
  if (c.month === 1) {
    if (chance(0.5)) { c.edge += 3; push(s, "taht", `Öncüler geçitleri tuttu, köyler erzak verdi; yürüyüş hızlandı.`, "kişisel", false, { k: "crown.cmp.road1" }); }
    else { c.edge -= 2; push(s, "taht", `Yağmur yolları çamura çevirdi; arabalar geride kaldı.`, "kişisel", false, { k: "crown.cmp.road2" }); }
    return;
  }
  if (c.month === 2) {
    if (chance(0.5)) { c.edge += 4; push(s, "taht", `Lağımcılar surun altına indi; gedik an meselesi.`, "kişisel", false, { k: "crown.cmp.siege1" }); }
    else { c.edge -= 3; p.health = Math.max(1, p.health - 4); push(s, "taht", `Ordugâha hastalık düştü; kuşatma gevşedi.`, "kişisel", false, { k: "crown.cmp.siege2" }); }
    return;
  }
  const beylikId = c.beylikId;
  s.crownCampaign = null;
  const odds = Math.max(0.15, Math.min(0.92, campaignOdds(s) + c.edge / 100));
  if (Math.random() < odds) {
    p.crownConquests = [...(p.crownConquests || []), beylikId];
    p.campaignsWon = (p.campaignsWon || 0) + 1;
    p.crownAuthority = clamp100(crownAuthorityOf(p) + 10);
    p.fame = clamp100(p.fame + 12);
    bumpNam(p, "mert", 5);
    const tribute = 300 + Math.floor(Math.random() * 300); p.money += tribute;
    push(s, "taht", `Sefer zaferle bitti; topraklar tâcına katıldı (+${tribute} akçe ganimet).`, "kişisel", true, { k: "crown.campaignWin", p: [{ bl: beylikId }, tribute] });
    // Diyar birleşmesi: son sancak da tâca katıldıysa bir kezlik doruk anı (hedef listesi boşaldığında tetiklenir — tekrarlanamaz).
    if (campaignTargets(s).length === 0) {
      p.fame = 100; p.crownAuthority = 100; bumpNam(p, "mert", 8);
      push(s, "taht", `Beş sancak tek tâcın altında: diyar birleşti. Adın artık çağların değil, çağlar senin adının etrafında dönecek.`, "kişisel", true, { k: "crown.unification" });
    }
  } else {
    p.crownAuthority = clamp100(crownAuthorityOf(p) - 12);
    p.reputation = Math.max(-100, p.reputation - 6);
    const hurt = 6 + Math.floor(Math.random() * 10); p.health = Math.max(1, p.health - hurt);
    push(s, "taht", `Sefer bozguna uğradı; otoriten sarsıldı, yara aldın (−${hurt} sağlık).`, "kişisel", true, { k: "crown.campaignLose", p: [{ bl: beylikId }, hurt] });
    if ((p.retinue || 0) > 0 && chance(0.35)) { // bozgunda maiyet de kan verir
      p.retinue = (p.retinue || 0) - 1;
      push(s, "taht", `Bozgunun tozu dinince yoklama yapıldı: muhafızlarından biri geri dönmedi.`, "kişisel", false, { k: "crown.cmp.guardFallen" });
    }
  }
}

// Vali atama/azil (hükümdar yetkisi): sadık vekil ata → haraç geliri; sadakat aşınır, azledebilirsin.
export const APPOINT_FEE = 150;
export function isAppointableKind(loc: string): boolean { const k = placeKind(loc); return k === "şehir" || k === "kale"; }
export function appointableCities(s: GameState): string[] {
  const p = s.player;
  return LOCATIONS.filter((loc) => isAppointableKind(loc) && !(p.governorships || []).includes(loc) && !(p.appointedGov || {})[loc]);
}
export function canAppointGovernor(s: GameState, loc: string): boolean {
  return !!s.player.crowned && !s.player.dead && s.player.money >= APPOINT_FEE && appointableCities(s).includes(loc);
}
export function appointGovernor(prev: GameState, loc: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!canAppointGovernor(s, loc)) return s;
  p.money -= APPOINT_FEE;
  const seed = (locSeed(loc) ^ s.turn ^ Math.floor(Math.random() * 1e6)) >>> 0;
  const gender: "erkek" | "kadın" = Math.random() < 0.5 ? "erkek" : "kadın";
  if (!p.appointedGov) p.appointedGov = {};
  p.appointedGov[loc] = { seed, gender, loyalty: 70 };
  p.crownAuthority = clamp100(crownAuthorityOf(p) + 3);
  push(s, "taht", `${loc}'e sadık bir vali atadın; haraç hazinene akacak.`, "kişisel", true, { k: "crown.appoint", p: [{ fn: [seed, gender] }, { pl: loc }] });
  return s;
}
export function dismissGovernor(prev: GameState, loc: string): GameState {
  const s = clone(prev); const p = s.player;
  if (!p.appointedGov || !p.appointedGov[loc]) return s;
  const g = p.appointedGov[loc]; delete p.appointedGov[loc];
  // Azil, atamanın verdiği otoriteyi (+3) tam geri alır → ata-azlet döngüsüyle otorite farm'lanamaz.
  p.crownAuthority = clamp100(crownAuthorityOf(p) - 3);
  push(s, "taht", `${loc} valisini azlettin.`, "kişisel", false, { k: "crown.dismiss", p: [{ fn: [g.seed, g.gender] }, { pl: loc }] });
  return s;
}
// Hükümdar haracı (her tur): ilhak edilen beylikler + atanan valilerin sadık geliri.
export function crownTribute(s: GameState): number {
  const p = s.player; if (!p.crowned) return 0;
  let t = (p.crownConquests?.length || 0) * 25;
  if (p.appointedGov) for (const loc of Object.keys(p.appointedGov)) { const g = p.appointedGov[loc]; t += Math.max(1, Math.round(cityInfo(loc, placeKind(loc)).prosperity / 6 * (g.loyalty / 100))); }
  return t;
}

// Hükümdarlık tiki (her tur, yalnız tahttaysan): otorite kayması + atanan vali sadakati + saray olayları + isyan riski.
const CROWN_EVENTS = ["envoy", "famine", "loyal", "plot"] as const;
function crownTick(s: GameState) {
  const p = s.player; if (!p.crowned || p.dead) return;
  let auth = crownAuthorityOf(p);
  const target = 45 + (p.reputation - 50) * 0.3 + p.honor * 0.12 + p.fame * 0.15 - p.fear * 0.05 + (p.crownConquests?.length || 0) * 3;
  auth = clamp100(auth + (target - auth) * 0.12 - 1.0); // hafif doğal aşınma → ilgilenilmezse düşer
  p.crownAuthority = Math.round(auth);
  // Atanan valilerin sadakati: zamanla aşınır; otorite yüksekse korunur; çok düşerse ayrılır (defection).
  if (p.appointedGov) for (const loc of Object.keys(p.appointedGov)) {
    const g = p.appointedGov[loc];
    g.loyalty = clamp100(g.loyalty - 1.5 + (auth > 62 ? 1.5 : 0));
    if (g.loyalty < 22 && Math.random() < 0.14) {
      delete p.appointedGov[loc]; p.crownAuthority = clamp100(crownAuthorityOf(p) - 5);
      push(s, "taht", `${loc} valisi sadakatten ayrıldı; haracı kesildi.`, "kişisel", true, { k: "crown.defect", p: [{ fn: [g.seed, g.gender] }, { pl: loc }] });
    }
  }
  // Saray olayları (otoriteye göre): düşük ihtimalle bir an.
  if (Math.random() < 0.08) {
    const ev = CROWN_EVENTS[Math.floor(Math.random() * CROWN_EVENTS.length)];
    if (ev === "envoy") { p.fame = clamp100(p.fame + 2); p.crownAuthority = clamp100(crownAuthorityOf(p) + 2); push(s, "taht", `Yabancı bir elçi sarayına geldi; hediyelerle dostluk tazelendi.`, "kişisel", false, { k: "crown.ev.envoy" }); }
    else if (ev === "famine") { p.crownAuthority = clamp100(crownAuthorityOf(p) - 5); push(s, "taht", `Diyarda kıtlık baş gösterdi; halkın hükümdara güveni sarsıldı.`, "kişisel", true, { k: "crown.ev.famine" }); }
    else if (ev === "loyal") { p.crownAuthority = clamp100(crownAuthorityOf(p) + 4); push(s, "taht", `Sadık bir tebaa divanda seni öven nutuk verdi; otoriten pekişti.`, "kişisel", false, { k: "crown.ev.loyal" }); }
    else { if (auth > 50) { p.crownAuthority = clamp100(crownAuthorityOf(p) + 2); push(s, "taht", `Bir vezir entrikası açığa çıktı; vaktinde bastırdın, otoriten arttı.`, "kişisel", true, { k: "crown.ev.plotFoil" }); } else { p.crownAuthority = clamp100(crownAuthorityOf(p) - 6); p.fear = clamp100(p.fear + 4); push(s, "taht", `Sarayda bir entrika otoriteni hırpaladı; korku saçtın.`, "kişisel", true, { k: "crown.ev.plotHit" }); } }
  }
  // ── Taht İddiacısı: taç rahat durmaz — hoşnutsuz bir hanedan hak iddia eder. Kral artık her ay karar sahibi. ──
  if (!s.pretender && Math.random() < (crownAuthorityOf(p) < 50 ? 0.12 : 0.05)) {
    const cand = ensureRivals(s).filter((h) => (h.tutum ?? 0) < 20).sort((a, b) => ((a.tutum ?? 0) - (b.tutum ?? 0)) || (b.power - a.power))[0];
    if (cand) {
      s.pretender = { houseId: cand.id, strength: 25 };
      push(s, "taht", `${cand.name} tahtında hak iddia etti; diyar ikiye bölünmeye başladı.`, "kişisel", true, { k: "crown.pretRise", p: [{ hn: cand.nameIdx }] });
    }
  } else if (s.pretender) {
    const h = ensureRivals(s).find((x) => x.id === s.pretender!.houseId);
    if (!h) { s.pretender = null; }
    else {
      s.pretender.strength = Math.min(100, s.pretender.strength + 2 + (crownAuthorityOf(p) < 50 ? 2 : 0));
      if (s.pretender.strength >= 100) {
        // İç savaş: iddia doruğa vardı — tek hamlede çözülür.
        const win = Math.random() < Math.max(0.15, Math.min(0.85, 0.5 + (crownAuthorityOf(p) - 50) / 100 + p.skills.combat / 40 - h.power / 400));
        if (win) {
          s.pretender = null; h.power = Math.max(20, h.power - 30);
          p.fame = clamp100(p.fame + 10); p.crownAuthority = clamp100(crownAuthorityOf(p) + 15);
          push(s, "taht", `${h.name} iç savaşı göze aldı ve ezildi; tahtın sarsılmaz çıktı.`, "kişisel", true, { k: "crown.pretWarWin", p: [{ hn: h.nameIdx }] });
        } else {
          s.pretender = null;
          p.crowned = false; p.crownAuthority = undefined; p.appointedGov = {};
          p.reputation = Math.max(-100, p.reputation - 20);
          push(s, "taht", `${h.name} iç savaşı kazandı; taht elinden gitti.`, "kişisel", true, { k: "crown.pretWarLose", p: [{ hn: h.nameIdx }] });
        }
      }
    }
  }
  // Otorite dibe vurursa: isyan — bastıramazsan tacını yitirirsin (nadir, çok düşük otoritede).
  if (crownAuthorityOf(p) < 12 && Math.random() < 0.05) { // tur-içi olaylardan sonraki güncel otorite
    if (p.skills.combat + p.fame / 2 > 30 && Math.random() < 0.5) {
      p.crownAuthority = 30; push(s, "taht", `Büyük bir isyan patladı; güçbela bastırdın, tahtı korudun.`, "kişisel", true, { k: "crown.rebellionHold" });
    } else {
      p.crowned = false; p.crownAuthority = undefined; p.appointedGov = {};
      p.reputation = Math.max(-100, p.reputation - 20);
      push(s, "taht", `İsyan tahtını devirdi; tacını yitirdin.`, "kişisel", true, { k: "crown.dethroned" });
    }
  }
}

// ── SARAY / DÎVÂN KARİYERİ (taht dışı hizmet yolu): rütbe basamakları, divan hizmeti, hükümdar itibarı, entrika ──
// Oyuncu kendi tahtta değilken hükümdarın divanında hizmet eder; Kâtip'ten Sadrazam'a yükselir.
export const COURT_RANKS = ["katip", "defterdar", "nisanci", "vezir", "sadrazam"] as const;
export const COURT_RANK_XP = [0, 30, 80, 155, 260];  // o rütbeye ulaşmak için gereken hizmet puanı (Sadrazam ömürlük tırmanış)
export const COURT_SALARY = [6, 12, 22, 38, 60];     // rütbeye göre aylık maaş
export const COURT_ACTION_COOLDOWN = 2;              // ay
export const COURT_FAVOR_GIFT_COST = 40;             // pîşkeş (itibar hediyesi) bedeli
export function inCourt(p: Player): boolean { return p.courtRank != null; }
export function courtRankId(p: Player): string { return COURT_RANKS[p.courtRank ?? 0]; }
export function courtSalary(p: Player): number { return inCourt(p) ? (COURT_SALARY[p.courtRank ?? 0] || 0) : 0; }
export function canEnterCourt(s: GameState): boolean {
  const p = s.player;
  return !p.dead && !p.crowned && !inCourt(p) && p.age >= 16 && p.reputation >= 20 && (effStat(p, "intelligence") >= 4 || p.profession === "katip");
}
export function enterCourt(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (!canEnterCourt(s)) return s;
  p.courtRank = 0; p.courtXp = 0; p.courtFavor = 55; // not: girişte itibar verilmez (enter→leave→enter ile bedava itibar farmı önlenir)
  push(s, "saray", `Divan kapısından içeri alındın; artık sarayda kâtip olarak hizmettesin.`, "kişisel", true, { k: "court.enter" });
  return s;
}
export function leaveCourt(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (!inCourt(p)) return s;
  p.courtRank = undefined; p.courtXp = undefined; p.courtFavor = undefined; p.court_action_turn = undefined;
  push(s, "saray", `Saray hizmetinden çekildin; divan defterinden adın silindi.`, "kişisel", false, { k: "court.leave" });
  return s;
}
export function courtActionReady(p: Player, turn: number): boolean { const l = p.court_action_turn; return l == null || turn - l >= COURT_ACTION_COOLDOWN; }
export function courtActionCooldownLeft(p: Player, turn: number): number { const l = p.court_action_turn; return l == null ? 0 : Math.max(0, COURT_ACTION_COOLDOWN - (turn - l)); }
export function canServeCourt(s: GameState): boolean { const p = s.player; return inCourt(p) && !p.dead && courtActionReady(p, s.turn) && p.hunger >= 15; }
function checkCourtPromotion(s: GameState) {
  const p = s.player;
  while ((p.courtRank ?? 0) < COURT_RANKS.length - 1 && (p.courtXp ?? 0) >= COURT_RANK_XP[(p.courtRank ?? 0) + 1] && (p.courtFavor ?? 0) >= 42) {
    p.courtRank = (p.courtRank ?? 0) + 1;
    p.fame = Math.min(100, p.fame + 4); p.reputation = Math.min(100, p.reputation + 3);
    push(s, "saray", `Divanda yükseldin: artık ${courtRankId(p)} rütbesindesin.`, "kişisel", true, { k: "court.promote", p: [{ crk: courtRankId(p) }] });
  }
}
// Divan hizmeti: dilekçe/ferman işle, hükümdara hizmet et. Zekâ+karizma testli; başarı itibar+hizmet puanı+maaş ikramiyesi.
export function serveCourt(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (!canServeCourt(s)) return s;
  p.court_action_turn = s.turn; p.hunger = Math.max(0, p.hunger - 6);
  const skill = (effStat(p, "intelligence") + effStat(p, "charisma")) / 2;
  const ok = Math.random() < 0.45 + skill * 0.05;
  const rank = p.courtRank ?? 0;
  if (ok) {
    // Üstün hizmet (büyük başarı): zekâ+karizma ve divan rütbesi yükseldikçe ihtimal artar (%5 → %30).
    // Hükümdarın bizzat iltifatı: çift ikramiye, ekstra teveccüh/hizmet puanı ve şöhret → Vezir'e daha hızlı.
    const crit = Math.random() < Math.min(0.30, 0.05 + skill * 0.025 + rank * 0.03);
    p.courtXp = (p.courtXp ?? 0) + 6 + Math.floor(Math.random() * 3);
    p.courtFavor = Math.min(100, (p.courtFavor ?? 55) + 4);
    let bonus = Math.round((8 + rank * 4) * inflationFactor(s));
    gainSkill(s, "social", 8); addStatXp(s, "intelligence", 4);
    if (crit) {
      bonus = Math.round(bonus * 2); p.money += bonus;
      p.courtXp = (p.courtXp ?? 0) + 5; p.courtFavor = Math.min(100, (p.courtFavor ?? 55) + 6); p.fame = Math.min(100, p.fame + 3);
      push(s, "saray", `Divanda öyle bir iş gördün ki hükümdar bizzat iltifat etti (+${bonus} akçe).`, "kişisel", true, { k: "court.serveCrit", p: [bonus] });
    } else {
      p.money += bonus;
      push(s, "saray", `Divan işlerini ehlince gördün; hükümdarın gözüne girdin (+${bonus} akçe).`, "kişisel", false, { k: "court.serveWin", p: [bonus] });
    }
  } else {
    p.courtXp = (p.courtXp ?? 0) + 3;
    p.courtFavor = Math.max(0, (p.courtFavor ?? 55) - 5);
    push(s, "saray", `Divan işinde bir pürüz çıktı; hükümdarın nezdinde itibarın azaldı.`, "kişisel", false, { k: "court.serveLose" });
  }
  checkCourtPromotion(s);
  return s;
}
// Pîşkeş: hediye/ikramla hükümdarın gönlünü al (itibar satın al).
export function canCurryFavor(s: GameState): boolean { return inCourt(s.player) && !s.player.dead && s.player.money >= COURT_FAVOR_GIFT_COST; }
export function curryFavor(prev: GameState): GameState {
  const s = clone(prev); const p = s.player;
  if (!canCurryFavor(s)) return s;
  // Tur başına tek pîşkeş — yoksa aynı turda akçeyle itibar toptan satın alınıp farm'lanır.
  if (p.favor_turn === s.turn) { push(s, "saray", `Hükümdara bu ay zaten pîşkeş sundun; her gün ikram yapmacık kaçar.`, "kişisel", false, { k: "evj.favorWait" }); return s; }
  p.favor_turn = s.turn;
  p.money -= COURT_FAVOR_GIFT_COST; p.courtFavor = Math.min(100, (p.courtFavor ?? 55) + 12);
  push(s, "saray", `Hükümdara pîşkeş sundun; gönlü hoş oldu, itibarın arttı.`, "kişisel", false, { k: "court.curry" });
  checkCourtPromotion(s);
  return s;
}
// Saray tiki (her tur, yalnız sarayda hizmetteyken): itibar kayması + entrika olayları + azil riski.
const COURT_EVENTS = ["sultanLutuf", "rakip", "sinav", "dedikodu"] as const;
function courtTick(s: GameState) {
  const p = s.player; if (!inCourt(p) || p.dead) return;
  let fav = p.courtFavor ?? 55;
  const target = 45 + (p.reputation - 50) * 0.25 + p.honor * 0.1 - p.fear * 0.05;
  fav = clamp100(fav + (target - fav) * 0.1 - 0.8); // hafif aşınma → ihmal edilirse düşer
  p.courtFavor = Math.round(fav);
  if (Math.random() < 0.08) { // saray entrikası / olayları
    const ev = COURT_EVENTS[Math.floor(Math.random() * COURT_EVENTS.length)];
    if (ev === "sultanLutuf") { p.courtFavor = clamp100((p.courtFavor ?? 55) + 5); const g = Math.round(10 * inflationFactor(s)); p.money += g; push(s, "saray", `Hükümdar bir lütufta bulundu; kesene ${g} akçe ve gönlüne sıcaklık düştü.`, "kişisel", false, { k: "court.ev.sultanLutuf", p: [g] }); }
    else if (ev === "rakip") { if (effStat(p, "charisma") >= 6 || fav > 55) { p.courtFavor = clamp100((p.courtFavor ?? 55) + 3); push(s, "saray", `Bir rakip saraylı kuyunu kazmak istedi; diliyle alt ettin, itibarın arttı.`, "kişisel", false, { k: "court.ev.rakipFoil" }); } else { p.courtFavor = clamp100((p.courtFavor ?? 55) - 7); push(s, "saray", `Bir rakip saraylı seni hükümdara çekiştirdi; itibarın sarsıldı.`, "kişisel", true, { k: "court.ev.rakipHit" }); } }
    else if (ev === "sinav") { if (Math.random() < 0.4 + effStat(p, "intelligence") * 0.05) { p.courtFavor = clamp100((p.courtFavor ?? 55) + 6); p.courtXp = (p.courtXp ?? 0) + 6; push(s, "saray", `Hükümdar bir mesele danıştı; isabetli görüşünle takdir topladın.`, "kişisel", false, { k: "court.ev.sinavWin" }); } else { p.courtFavor = clamp100((p.courtFavor ?? 55) - 4); push(s, "saray", `Hükümdarın danıştığı meselede şaşaladın; biraz gözden düştün.`, "kişisel", false, { k: "court.ev.sinavLose" }); } }
    else { p.courtFavor = clamp100((p.courtFavor ?? 55) - 3); push(s, "saray", `Sarayda hakkında bir dedikodu dolaştı; gölgesi itibarına düştü.`, "kişisel", false, { k: "court.ev.dedikodu" }); }
    checkCourtPromotion(s);
  }
  if ((p.courtFavor ?? 55) < 10 && Math.random() < 0.12) { // itibar dibe vurdu → azil
    const lostRank = courtRankId(p);
    p.courtRank = undefined; p.courtXp = undefined; p.courtFavor = undefined; p.court_action_turn = undefined;
    p.reputation = Math.max(-100, p.reputation - 5);
    push(s, "saray", `Hükümdarın gözünden tamamen düştün; divandan azledildin.`, "kişisel", true, { k: "court.dismissed", p: [{ crk: lostRank }] });
  }
}

// ── Zanaat / üretim zincirleri — hammaddeyi mamule çevir ──
export interface Recipe { id: string; out: string; outQty: number; inputs: Record<string, number>; minSkill: number; prof?: string; } // prof: yalnız o mesleğin ustalık tarifi
export const RECIPES: Recipe[] = [
  // ── Meslek ustalık tarifleri: zanaat kolu olmayan mesleklere kendi tezgâhı (değer öz-kullanımda; arbitraj kapalı) ──
  { id: "turfanda",    out: "turfanda",    outQty: 1, inputs: { bugday: 2 },      minSkill: 1, prof: "çiftçi" },
  { id: "tuzlu_balik", out: "tuzlu_balik", outQty: 1, inputs: { balik: 2 },       minSkill: 1, prof: "balıkçı" },
  { id: "balli_corek", out: "balli_corek", outQty: 1, inputs: { un: 1, bal: 1 },  minSkill: 1, prof: "fırıncı" },
  { id: "yun_kaftan",  out: "yun_kaftan",  outQty: 1, inputs: { yun: 3 },         minSkill: 2, prof: "çoban" },
  { id: "un",        out: "un",        outQty: 1, inputs: { bugday: 2 },  minSkill: 0 },
  { id: "ekmek",     out: "ekmek",     outQty: 2, inputs: { un: 1 },      minSkill: 0 },
  { id: "corba",     out: "corba",     outQty: 1, inputs: { balik: 1 },   minSkill: 0 },
  { id: "iksir",     out: "iksir",     outQty: 1, inputs: { sifa: 2 },    minSkill: 2 },
  { id: "bicak",     out: "bicak",     outQty: 1, inputs: { demir: 2 },   minSkill: 1 },
  { id: "kilic",     out: "kilic",     outQty: 1, inputs: { demir: 3 },   minSkill: 3 },
  { id: "celik_kilic",out:"celik_kilic",outQty: 1, inputs: { demir: 5, kereste: 1 }, minSkill: 6 },
  { id: "deri_zirh", out: "deri_zirh", outQty: 1, inputs: { deri: 2 },    minSkill: 2 },
  { id: "kalkan",    out: "kalkan",    outQty: 1, inputs: { kereste: 2, demir: 1 }, minSkill: 3 },
  // ── Vercel production_chains.py'den ek tarifler (mevcut mallarla) ──
  { id: "yay",         out: "yay",         outQty: 1, inputs: { kereste: 1, deri: 1 }, minSkill: 2 },
  { id: "savas_balta", out: "savas_balta", outQty: 1, inputs: { demir: 4, kereste: 1 }, minSkill: 5 },
  { id: "zincir_zirh", out: "zincir_zirh", outQty: 1, inputs: { demir: 4 }, minSkill: 5 },
];
export function canCraft(p: Player, r: Recipe): boolean {
  if (inJail(p)) return false; // zindanda tezgâh yok
  if (r.prof && p.profession !== r.prof) return false; // ustalık tarifi: meslek dışına kapalı
  if (p.skills.crafting < r.minSkill) return false;
  return Object.entries(r.inputs).every(([id, q]) => (p.inventory[id] || 0) >= q);
}
// ── Eşya kalitesi (Vercel quality.py portu) — dayanıklı/zanaat malları için 4 kademe ──
export type QualityTier = "kusurlu" | "siradan" | "iyi" | "usta_isi";
export const QUALITY_MULT: Record<QualityTier, number> = { kusurlu: 0.6, siradan: 1.0, iyi: 1.5, usta_isi: 2.5 };
// Savaşta kalite etkisi (satıştan daha yumuşak): kuşanılı silah gücü / zırh savunması çarpanı.
export const QUALITY_COMBAT: Record<QualityTier, number> = { kusurlu: 0.75, siradan: 1.0, iyi: 1.2, usta_isi: 1.4 };
export function equippedQualityMult(p: Player, slot: EquipSlot): number { return QUALITY_COMBAT[p.equipped_q?.[slot] || "siradan"]; }
export const QUALITY_LABEL: Record<QualityTier, string> = { kusurlu: "kusurlu", siradan: "sıradan", iyi: "iyi", usta_isi: "usta işi" };

// Kuşanılabilir tüm slotlar. silah=el, kalkan=öbür el, zirh=gövde, baslik=baş, eldiven=el, ayakkabi=ayak, kiyafet=giysi (sosyal).
export type EquipSlot = "silah" | "kalkan" | "zirh" | "baslik" | "eldiven" | "ayakkabi" | "kiyafet" | "taki";
export const EQUIP_SLOTS: EquipSlot[] = ["silah", "kalkan", "zirh", "baslik", "eldiven", "ayakkabi", "kiyafet", "taki"];
export const COMBAT_SLOTS: EquipSlot[] = ["silah", "kalkan", "zirh", "baslik", "eldiven", "ayakkabi"];
export const DEFENSE_SLOTS: EquipSlot[] = ["zirh", "kalkan", "baslik", "eldiven", "ayakkabi"];
const EQUIP_KINDS = new Set<string>(["silah", "kalkan", "zirh", "baslik", "eldiven", "ayakkabi", "kiyafet", "taki"]);
export function slotOfKind(kind: string): EquipSlot | null { return EQUIP_KINDS.has(kind) ? (kind as EquipSlot) : null; }

const QUALITY_GOODS = new Set(["bicak", "hancer", "kilic", "celik_kilic", "yatagan", "savas_balta", "gurz", "mizrak", "yay", "kalkan", "buyuk_kalkan", "deri_zirh", "pamuk_zirh", "zincir_zirh", "plaka_zirh", "demir_migfer", "tolga", "iksir"]);
const Q_ORDER: QualityTier[] = ["usta_isi", "iyi", "siradan", "kusurlu"];
// Zanaat becerisine göre üretilen kalite kademesini çek.
function rollCraftQuality(skill: number): QualityTier {
  const usta = Math.min(0.35, 0.02 + skill * 0.03);
  const iyi = Math.min(0.40, 0.10 + skill * 0.03);
  const kusurlu = Math.max(0.03, 0.20 - skill * 0.02);
  const r = Math.random();
  if (r < usta) return "usta_isi";
  if (r < usta + iyi) return "iyi";
  if (r > 1 - kusurlu) return "kusurlu";
  return "siradan";
}
function addQuality(p: Player, id: string, tier: QualityTier, n = 1) {
  if (tier === "siradan" || n <= 0) return; // sıradan izlenmez (varsayılan)
  if (!p.inv_q) p.inv_q = {};
  if (!p.inv_q[id]) p.inv_q[id] = {};
  p.inv_q[id]![tier] = (p.inv_q[id]![tier] || 0) + n;
}
// Bir maldan satılacak en iyi kademeyi belirle (izlenen kademe yoksa sıradan).
export function bestQualityTier(p: Player, id: string): QualityTier {
  const q = p.inv_q?.[id]; if (!q) return "siradan";
  for (const t of Q_ORDER) if (t !== "siradan" && (q[t] || 0) > 0) return t;
  return "siradan";
}
// Satışta bir birimi en iyi kademeden düş, kademesini döndür.
function takeQualityUnit(p: Player, id: string): QualityTier {
  const t = bestQualityTier(p, id);
  if (t !== "siradan" && p.inv_q?.[id]) {
    p.inv_q[id]![t] = (p.inv_q[id]![t] || 0) - 1;
    if ((p.inv_q[id]![t] || 0) <= 0) delete p.inv_q[id]![t];
    if (Object.keys(p.inv_q[id]!).length === 0) delete p.inv_q[id];
  }
  return t;
}

export function craft(prev: GameState, id: string): GameState {
  const s = clone(prev); const p = s.player; const r = RECIPES.find((x) => x.id === id);
  if (!r || p.dead || !canCraft(p, r)) return s;
  // Tur başına tek üretim — yoksa aynı turda sınırsız zanaat becerisi + kalite-satış kârı farm'lanır (work/suç ile aynı kural).
  if (p.craft_turn === s.turn) { push(s, "zanaat", `Bu ay tezgâh başında yeterince çalıştın; usta eli dinlenmek de ister.`, "kişisel", false, { k: "evj.craftWait" }); return s; }
  p.craft_turn = s.turn;
  for (const [iid, q] of Object.entries(r.inputs)) { p.inventory[iid] -= q; if (p.inventory[iid] <= 0) delete p.inventory[iid]; }
  p.inventory[r.out] = (p.inventory[r.out] || 0) + r.outQty;
  gainSkill(s, "crafting", 6);
  // Kalite kademeli mallar için zanaat becerisine göre kalite üret.
  let qNote = "";
  let qTier: QualityTier | "" = "";
  if (QUALITY_GOODS.has(r.out)) {
    for (let k = 0; k < r.outQty; k++) {
      const tier = rollCraftQuality(p.skills.crafting);
      addQuality(p, r.out, tier);
      if (k === 0 && tier !== "siradan") { qNote = ` — ${QUALITY_LABEL[tier]} işçilik!`; qTier = tier; }
    }
  }
  const craftLoc = qTier
    ? (r.outQty > 1 ? { k: "evj.craftNQ", p: [{ i: r.out }, r.outQty, { q: qTier }] } : { k: "evj.craftQ", p: [{ i: r.out }, { q: qTier }] })
    : (r.outQty > 1 ? { k: "evj.craftN", p: [{ i: r.out }, r.outQty] } : { k: "evj.craft", p: [{ i: r.out }] });
  push(s, "zanaat", `${ITEMS[r.out]?.name || r.out} ürettin${r.outQty > 1 ? ` (×${r.outQty})` : ""}${qNote}.`, "kişisel", false, craftLoc as { k: string; p?: EvtParam[] });
  return s;
}

// Eski kayıtları yeni alanlarla uyumlulaştır (geriye dönük güvenli yükleme).
export function migrate(s: GameState): GameState {
  const p: any = s.player || {};
  if (p.faction === undefined) p.faction = null;
  if (p.horse && !p.horse_name) p.horse_name = rnd(HORSE_NAMES); // eski kayıt: at adları sonradan geldi — adsız at cümleyi bozmasın
  if (!p.faction_standing) p.faction_standing = {};
  if (!p.inventory) p.inventory = {};
  if (!p.properties) p.properties = [];
  // Eski kayıt: properties string[] idi → {type, loc, cond} nesnesine çevir.
  if (p.properties.length && typeof p.properties[0] === "string") {
    p.properties = p.properties.map((t: any) => ({ type: t, loc: p.location_name, cond: 100 }));
  }
  if (p.generation === undefined) p.generation = 1;
  if (!p.skills) p.skills = { combat: 0, trade: 0, crafting: 0, social: 0 };
  if (!p.skill_xp) p.skill_xp = { combat: 0, trade: 0, crafting: 0, social: 0 };
  if (!p.perks) p.perks = [];
  if (!p.injuries) p.injuries = [];
  if (p.career_xp === undefined) p.career_xp = 0;
  if (!p.nam) p.nam = { comert: 0, zalim: 0, capkin: 0, dindar: 0, mert: 0 };
  if (!p.child_invests) p.child_invests = {};
  if (!p.equipped) p.equipped = { silah: null, zirh: null };
  if (!p.home_name) p.home_name = p.location_name;
  if (!p.mother) p.mother = ["Ayşe","Fatma","Zeynep","Emine","Hatice","Elif"][Math.floor(Math.random()*6)];
  if (!p.father) p.father = ["Mehmet","Ahmet","Mustafa","Hasan","Hüseyin","İbrahim"][Math.floor(Math.random()*6)];
  if (p.crowned === undefined) p.crowned = false;
  if (!p.will_pref) p.will_pref = "esit";
  if (!p.fates) p.fates = [];
  if (!p.governorships) p.governorships = [];
  // Eski kayıt: hâlihazırda tamamlanmış başarımları 'alınmış' say (retroaktif puan seli olmasın).
  if (!p.claimed) { try { p.claimed = achievementsOf(s).filter((x) => x.done).map((x) => x.a.id); } catch { p.claimed = []; } }
  if (!(s as any).settlements) (s as any).settlements = [];
  if (!s.relationships) s.relationships = {};
  if (!s.dynasty) s.dynasty = [];
  if (!s.npc_state) s.npc_state = {};
  if (!s.story) s.story = { active: null, completed: [], tension: 0 };
  if (!s.wars) s.wars = [];
  if (s.caravan === undefined) s.caravan = null;
  if (s.econ === undefined) s.econ = 1;
  s.schema = 1; // şema damgası: bu sürümün göçlerinden geçti
  return s;
}
