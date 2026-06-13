// Takvim — calendar_tr.py'nin birebir TS portu. 1 tur = 1 ay, 12 ay = 1 yıl.
export const WEEKS_PER_MONTH = 1;
export const MONTHS_PER_YEAR = 12;
export const WEEKS_PER_YEAR = WEEKS_PER_MONTH * MONTHS_PER_YEAR;
export const BASE_YEAR = 1247;

export const MONTHS_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

const SEASON_OF_MONTH: Record<number, string> = {
  1: "Kış", 2: "Kış",
  3: "İlkbahar", 4: "İlkbahar", 5: "İlkbahar",
  6: "Yaz", 7: "Yaz", 8: "Yaz",
  9: "Sonbahar", 10: "Sonbahar", 11: "Sonbahar",
  12: "Kış",
};

export const SEASON_EFFECTS: Record<string, { production_mult: number; hunger_mult: number; flavor: string }> = {
  "İlkbahar": { production_mult: 1.15, hunger_mult: 0.9, flavor: "Çiçekler açıyor, tarlalar uyanıyor." },
  "Yaz":      { production_mult: 1.25, hunger_mult: 1.0, flavor: "Sıcak uzun günler, hasat zamanı yaklaşıyor." },
  "Sonbahar": { production_mult: 1.10, hunger_mult: 1.0, flavor: "Yapraklar düşüyor, halk kışa hazırlık yapıyor." },
  "Kış":      { production_mult: 0.55, hunger_mult: 1.3, flavor: "Soğuk acımasız, sandıklar incelir." },
};

export interface CalendarInfo {
  turn: number; week_in_month: number; month_no: number; month_name: string;
  year: number; year_in_game: number; season: string; season_flavor: string;
}

export function currentCalendar(turn: number): CalendarInfo {
  const year_idx = Math.floor(turn / WEEKS_PER_YEAR);
  const rem = turn % WEEKS_PER_YEAR;
  const month_idx = Math.floor(rem / WEEKS_PER_MONTH);
  const week_in_month = (rem % WEEKS_PER_MONTH) + 1;
  const month_no = month_idx + 1;
  const season = SEASON_OF_MONTH[month_no];
  return {
    turn, week_in_month, month_no, month_name: MONTHS_TR[month_idx],
    year: BASE_YEAR + year_idx, year_in_game: year_idx,
    season, season_flavor: SEASON_EFFECTS[season].flavor,
  };
}

export function playerAge(baseAge: number, turn: number): number {
  return baseAge + Math.floor(turn / WEEKS_PER_YEAR);
}
