import type { KpiDelta } from "@/components/kpi-card";
import type { KpiPeriod } from "@/lib/analytics";
import { formatChange, formatEuros, formatEurosCents, formatInt, formatPercent, formatPointsChange, relativeChange } from "@/lib/format";

/** Seuil sous lequel une variation est affichée comme stable. */
const FLAT = 0.005;

function changeDelta(current: number, previous: number): KpiDelta | null {
  const change = relativeChange(current, previous);
  if (change === null) return null;
  return { text: formatChange(change), direction: Math.abs(change) < FLAT ? "flat" : change > 0 ? "up" : "down" };
}

function pointsDelta(current: number | null, previous: number | null): KpiDelta | null {
  if (current === null || previous === null) return null;
  const diff = current - previous;
  return { text: formatPointsChange(current, previous), direction: Math.abs(diff) < FLAT ? "flat" : diff > 0 ? "up" : "down" };
}

/** Tuiles du bandeau de KPI, dans l'ordre d'affichage. */
export function kpiTiles(current: KpiPeriod, previous: KpiPeriod) {
  return [
    { key: "revenue", label: "Chiffre d'affaires", value: formatEuros(current.revenue), delta: changeDelta(current.revenue, previous.revenue) },
    { key: "tickets", label: "Tickets", value: formatInt(current.tickets), delta: changeDelta(current.tickets, previous.tickets) },
    {
      key: "basket",
      label: "Panier moyen",
      value: current.avgBasket === null ? "—" : formatEurosCents(current.avgBasket),
      delta: current.avgBasket === null || previous.avgBasket === null ? null : changeDelta(current.avgBasket, previous.avgBasket),
    },
    {
      key: "identified",
      label: "Part du CA identifiée",
      value: current.identifiedShare === null ? "—" : formatPercent(current.identifiedShare),
      delta: pointsDelta(current.identifiedShare, previous.identifiedShare),
    },
    { key: "new", label: "Nouveaux clients", value: formatInt(current.newCustomers), delta: changeDelta(current.newCustomers, previous.newCustomers) },
  ];
}
