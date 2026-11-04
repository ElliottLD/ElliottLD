/** Mise en forme française des nombres, montants et dates. */

const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eurCents = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const int = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const pct = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });
const pct1 = new Intl.NumberFormat("fr-FR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const formatEuros = (v: number) => eur.format(v);
export const formatEurosCents = (v: number) => eurCents.format(v);
export const formatInt = (v: number) => int.format(v);
export const formatPercent = (v: number) => pct.format(v);

/** Variation relative entre deux valeurs, ou null si la base est nulle. */
export function relativeChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return current / previous - 1;
}

/** « +12,3 % », « −4,0 % » (vrai signe moins). */
export function formatChange(change: number): string {
  const s = pct1.format(Math.abs(change));
  if (Math.abs(change) < 0.0005) return pct1.format(0);
  return `${change > 0 ? "+" : "−"}${s}`;
}

/** Variation en points (pour les parts) : « +2,4 pts ». */
export function formatPointsChange(current: number, previous: number): string {
  const pts = (current - previous) * 100;
  const s = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(pts));
  return `${pts >= 0 ? "+" : "−"}${s} pt${Math.abs(pts) >= 2 ? "s" : ""}`;
}

const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const longDayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

/** « 3 nov. » pour une date AAAA-MM-JJ. */
export const formatDay = (isoDate: string) => dayFmt.format(new Date(`${isoDate}T12:00:00Z`));
/** « mardi 3 novembre ». */
export const formatLongDay = (isoDate: string) => longDayFmt.format(new Date(`${isoDate}T12:00:00Z`));

export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

const dateFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

/** « 3 novembre 2026 » pour un horodatage. */
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
/** « 3 nov. 2026, 08:12 ». */
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

/** « aujourd'hui », « hier », « il y a 12 jours ». */
export function formatDaysAgo(days: number | null): string {
  if (days === null) return "—";
  const d = Math.floor(days);
  if (d <= 0) return "aujourd'hui";
  if (d === 1) return "hier";
  return `il y a ${d} jours`;
}
