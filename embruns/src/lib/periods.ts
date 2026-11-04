/**
 * Périodes d'analyse : des jours calendaires complets, du plus ancien à hier
 * inclus, dans le fuseau du commerce. La période précédente de même durée est
 * calculée en SQL (kpi_summary, top_products).
 */

export const PERIODS = {
  "7j": { days: 7, label: "7 jours", short: "7 j" },
  "30j": { days: 30, label: "30 jours", short: "30 j" },
  "90j": { days: 90, label: "90 jours", short: "90 j" },
  "12m": { days: 365, label: "12 mois", short: "12 mois" },
} as const;

export type PeriodKey = keyof typeof PERIODS;

export function parsePeriod(value: unknown, fallback: PeriodKey = "30j"): PeriodKey {
  return typeof value === "string" && value in PERIODS ? (value as PeriodKey) : fallback;
}

/** Date du jour (AAAA-MM-JJ) dans un fuseau donné. */
export function localToday(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Ajoute n jours à une date AAAA-MM-JJ (sans dépendre du fuseau de la machine). */
export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Période qui se termine hier : [aujourd'hui - n jours, hier]. */
export function periodRange(key: PeriodKey, today: string) {
  const { days } = PERIODS[key];
  return { start: addDays(today, -days), end: addDays(today, -1), days };
}
