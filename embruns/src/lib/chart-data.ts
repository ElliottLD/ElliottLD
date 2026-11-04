import type { DayPoint } from "@/lib/analytics";
import type { RevenuePoint } from "@/components/charts/revenue-chart";
import { formatDay as formatDayLabel } from "@/lib/format";
import { addDays } from "@/lib/periods";

/**
 * Regroupe des points journaliers (déjà calculés en SQL) en semaines du lundi
 * au dimanche, pour garder des barres lisibles sur 12 mois.
 */
export function toWeeklyPoints(days: DayPoint[]): RevenuePoint[] {
  const weeks = new Map<string, RevenuePoint>();
  for (const d of days) {
    const date = new Date(`${d.day}T12:00:00Z`);
    const monday = addDays(d.day, -((date.getUTCDay() + 6) % 7));
    const w = weeks.get(monday) ?? { label: formatDayLabel(monday), start: monday, end: addDays(monday, 6), revenue: 0, tickets: 0, days: 0 };
    w.days = (w.days ?? 0) + 1;
    w.revenue += d.revenue;
    w.tickets += d.tickets;
    weeks.set(monday, w);
  }
  // Une semaine coupée par le début ou la fin de la période est signalée comme incomplète.
  return [...weeks.values()].map(({ days: n, ...w }) => ({ ...w, partial: (n ?? 7) < 7 }));
}

export function toDailyPoints(days: DayPoint[]): RevenuePoint[] {
  return days.map((d) => ({ label: formatDayLabel(d.day), start: d.day, revenue: d.revenue, tickets: d.tickets }));
}
