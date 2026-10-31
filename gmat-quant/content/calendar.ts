/** Calendrier intégré (section 6 de la spec). Lundi → samedi, dimanche libre. */
export interface CalendarWeek {
  week: number;
  start: string; // lundi, AAAA-MM-JJ
  end: string; // dimanche
  label: string;
  items: string[]; // chapitres / étapes : "POS" (positionnement), "A1"…, "CHK-A" (check-up bloc A), "RATTRAPAGE"
  hours: number;
}

export const CALENDAR: CalendarWeek[] = [
  { week: 1, start: "2026-11-09", end: "2026-11-15", label: "9 – 15 nov.", items: ["POS", "A1", "A2", "A3", "A4"], hours: 10 },
  { week: 2, start: "2026-11-16", end: "2026-11-22", label: "16 – 22 nov.", items: ["A5", "CHK-A", "B1", "B2"], hours: 10 },
  { week: 3, start: "2026-11-23", end: "2026-11-29", label: "23 – 29 nov.", items: ["B3", "B4", "CHK-B", "C1"], hours: 11 },
  { week: 4, start: "2026-11-30", end: "2026-12-06", label: "30 nov. – 6 déc.", items: ["C2", "C3", "C4", "CHK-C", "POS"], hours: 13 },
  { week: 5, start: "2026-12-07", end: "2026-12-13", label: "7 – 13 déc.", items: ["D1", "D2", "D3", "D4"], hours: 13 },
  { week: 6, start: "2026-12-14", end: "2026-12-20", label: "14 – 20 déc.", items: ["D5", "D6", "CHK-D", "E1", "E2"], hours: 13 },
  { week: 7, start: "2026-12-21", end: "2026-12-27", label: "21 – 27 déc.", items: ["E3", "CHK-E", "F1", "CHK-F", "RATTRAPAGE", "POS"], hours: 13 },
];

export const PREP_START = "2027-01-04";
export const REVISION_START = "2026-11-09";

export function itemLabel(item: string): string {
  if (item === "POS") return "Test de positionnement";
  if (item === "RATTRAPAGE") return "Notions en orange ou rouge";
  if (item.startsWith("CHK-")) return `Check-up bloc ${item.slice(4)}`;
  return item;
}

export function weekFor(day: string): CalendarWeek | undefined {
  return CALENDAR.find((w) => day >= w.start && day <= w.end);
}
