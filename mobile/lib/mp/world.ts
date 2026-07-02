// Paylaşımlı-dünya adaptörü — sunucudaki diyar anlık görüntüsünü (RealmSnapshot)
// yerel game.ts oyununa bağlar: kamu hanesini türetir + tick'teki çapraz-etki
// olaylarını yerel duruma uygular. SP'ye DOKUNMAZ (yalnız MP ekranlarından çağrılır).
import { GameState, dynastyPower } from "../game";
import { PlayerPublic, TickEvent, toPublic } from "./protocol";

export const REALM_BASE_YEAR = 1247;
export function realmYearMonth(turn: number): { year: number; month: number } {
  return { year: REALM_BASE_YEAR + Math.floor(turn / 12), month: (turn % 12) + 1 };
}

// Yerel game.ts player'ından diyar için kamu hanesi üret.
export function mePublic(guestId: string, s: GameState, ready: boolean): PlayerPublic {
  return toPublic(guestId, s.player, dynastyPower(s), true, ready);
}

// Tick'te bu oyuncuya düşen paylaşımlı-dünya olaylarını yerel duruma uygula.
// Otoriteli sunucu sonucudur → istemci güvenle uygular. Yeni state döndürür.
export function applyTickEvents(prev: GameState, events: TickEvent[]): GameState {
  const s: GameState = JSON.parse(JSON.stringify(prev));
  const p = s.player;
  const clamp100 = (n: number) => Math.max(0, Math.min(100, n));
  for (const e of events) {
    switch (e.k) {
      case "mp.throne.won":
        p.crowned = true; p.fame = clamp100(p.fame + 20); p.reputation = Math.min(100, p.reputation + 10); break;
      case "mp.throne.taken":
      case "mp.throne.lost":
        if (p.crowned) p.crowned = false;
        if (e.k === "mp.throne.lost") { p.reputation = Math.max(-100, p.reputation - 15); p.fame = clamp100(p.fame - 8); }
        break;
      case "mp.guild.taxedByKing": {
        const fine = 30 + Math.round((p.money || 0) * 0.05);
        p.money = Math.max(0, p.money - fine); break;
      }
      case "mp.guild.closedByKing":
        p.faction = null; p.reputation = Math.max(-100, p.reputation - 4); break;
      case "mp.guild.youLead":
      case "mp.guild.unseated":
        p.fame = clamp100(p.fame + 4); break;
      case "mp.guild.duesPaid": p.money = Math.max(0, p.money - (Number(e.p?.[1]) || 0)); break; // lonca aidatı (üye öder)
      case "mp.guild.duesIncome": p.money += Number(e.p?.[0]) || 0; break;                       // lonca aidatı (başkan toplar)
      case "mp.guild.lostLead": p.fame = clamp100(p.fame - 4); break;
      case "mp.gov.appointed": {
        const loc = String(e.p?.[0] || "");
        if (loc) { if (!p.governorships) p.governorships = []; if (!p.governorships.includes(loc)) p.governorships.push(loc); }
        break;
      }
      case "mp.gov.replaced": {
        const loc = String(e.p?.[0] || "");
        if (loc && p.governorships) p.governorships = p.governorships.filter((g) => g !== loc);
        break;
      }
      case "mp.campaign.won":
        p.fame = clamp100(p.fame + 6); break;
      // ── Beylik (Mount & Blade) olayları ──
      case "mp.beylik.founded": // boş beyliğe bey oldun
        p.fame = clamp100(p.fame + 16); p.reputation = Math.min(100, p.reputation + 12); break;
      case "mp.beylik.seized": // mevcut beyi devirip ele geçirdin
        p.fame = clamp100(p.fame + 20); p.reputation = Math.min(100, p.reputation + 8); break;
      case "mp.beylik.held": // bey ünvanını savundun
        p.fame = clamp100(p.fame + 5); break;
      case "mp.beylik.campaignWon": // başka beyliği ilhak ettin
        p.fame = clamp100(p.fame + 14); p.money += 200; break;
      case "mp.beylik.deposed": // beyliğini bir meydan okuyana kaptırdın
      case "mp.beylik.lostToCampaign": // beyliğin sefere kaptırıldı
        p.reputation = Math.max(-100, p.reputation - 14); p.fame = clamp100(p.fame - 8); break;
      case "mp.beylik.campaignLost": // seferin bozguna uğradı
        p.health = clamp100(p.health - 8); p.reputation = Math.max(-100, p.reputation - 5); break;
      case "mp.beylik.taxFelt": { // (eski tek-seferlik; artık kullanılmıyor — geriye dönük güvenli)
        const beyTax = Number(e.p?.[1]) || 0;
        const fine = 20 + Math.round((p.money || 0) * (beyTax / 200));
        p.money = Math.max(0, p.money - fine); break;
      }
      case "mp.beylik.taxDue": // aylık beylik vergisi (üye öder)
        p.money = Math.max(0, p.money - (Number(e.p?.[1]) || 0)); break;
      case "mp.beylik.taxIncome": // beyin topladığı aylık vergi (gelir)
        p.money += Number(e.p?.[0]) || 0; break;
      case "mp.beylik.conquered": // beyliğin başkasınca fethedildi (moral)
        p.reputation = Math.max(-100, p.reputation - 3); break;
      case "mp.beylik.beyDied": // bağlı olduğun beyin öldü
        p.reputation = Math.max(-100, p.reputation - 2); break;
      // joined/left/claimFailed/tooWeak/taxSet → yalnız bilgilendirme (kişisel istat etkisi yok)

      // ── SOSYAL DOKU olayları ──
      case "mp.beylik.spoils": p.money += Number(e.p?.[1]) || 0; p.fame = clamp100(p.fame + 2); break; // sefer ganimetinden üye payı
      case "mp.soc.giftGot": p.money += Number(e.p?.[1]) || 0; break;       // bağış aldın
      case "mp.soc.loanGot": p.money += Number(e.p?.[1]) || 0; break;       // borç aldın
      case "mp.soc.loanGave": p.money = Math.max(0, p.money - (Number(e.p?.[1]) || 0)); break; // borç verdin
      case "mp.soc.vouched": p.fame = clamp100(p.fame + (Number(e.p?.[1]) || 0)); break; // biri seni övdü (ölçekli)
      case "mp.soc.wed": {                                                   // gerçek evlilik: eşin artık o oyuncu
        const sn = String(e.p?.[0] || "");
        p.married = true; p.spouse_name = sn; p.spouse_is_player = true; p.widowed = false;
        let h = 0; for (let i = 0; i < sn.length; i++) h = (h * 31 + sn.charCodeAt(i)) >>> 0;
        p.spouse_seed = h || 1;
        p.fame = clamp100(p.fame + 6); p.reputation = Math.min(100, p.reputation + 6);
        break;
      }
      case "mp.soc.divorced": case "mp.soc.divorcedYou": {                   // boşanma: eş kalkar
        p.married = false; p.spouse_name = null; p.spouse_seed = undefined; p.spouse_is_player = false;
        p.reputation = Math.max(-100, p.reputation - 8);
        break;
      }
      // wedSameGender / wedAlready → yalnız bilgilendirme
      case "mp.soc.allied": p.reputation = Math.min(100, p.reputation + 3); break;
      case "mp.soc.duelWon": p.fame = clamp100(p.fame + 8); break;
      case "mp.soc.duelLost": p.fame = clamp100(p.fame - 6); break;
      case "mp.soc.youBetrayed": p.reputation = Math.max(-100, p.reputation - 10); break; // ihanet ettin: yerel itibar da düşer
      case "mp.soc.sabotaged": p.money = Math.max(0, p.money - 300); p.reputation = Math.max(-100, p.reputation - 4); break;
      case "mp.soc.slandered": p.fame = clamp100(p.fame - 8); p.reputation = Math.max(-100, p.reputation - 8); break;
      case "mp.soc.assassinated": p.health = 0; p.dead = true; break;       // suikast başarılı → ölüm (vârisle sürer)
      // targetTraveling → yalnız bilgilendirme (hedef seyahatte, eylem işlemedi)
      // giftSent/vouchDone/offerSent/offerDeclined/asylum*/betrayed/spy*/sabotageCaught/
      // plotFoiled/assassinFoiled/bribe*/poached/slanderCaught → yalnız bilgilendirme
    }
  }
  return s;
}

// Diyardaki diğer oyuncular = rakip haneler (generateDynasties yerine MP'de bunlar gösterilir).
export function rivalsFromSnapshot(players: PlayerPublic[], guestId: string) {
  return players.filter((p) => p.id !== guestId).map((p) => ({
    name: p.surname || p.name, power: p.power, fame: p.fame, crowned: p.crowned, online: p.online, generation: p.generation,
  }));
}
