import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { SlotHeatmap } from "@/components/charts/slot-heatmap";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { TopProductsTable } from "@/components/top-products";
import { Card } from "@/components/ui/card";
import { getKpiSummary, getSalesByDay, getSalesBySlot, getTopProducts } from "@/lib/analytics";
import { toDailyPoints, toWeeklyPoints } from "@/lib/chart-data";
import { formatDay } from "@/lib/format";
import { kpiTiles } from "@/lib/kpi-view";
import { requireMerchant } from "@/lib/merchant";
import { PERIODS, localToday, parsePeriod, periodRange, type PeriodKey } from "@/lib/periods";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analyses" };

export default async function AnalysesPage({ searchParams }: PageProps<"/analyses">) {
  const params = await searchParams;
  const period = parsePeriod(params.periode);
  const merchant = await requireMerchant();
  const range = periodRange(period, localToday(merchant.timezone));

  const [kpi, days, slots, products] = await Promise.all([
    getKpiSummary(merchant.id, range.start, range.end),
    getSalesByDay(merchant.id, range.start, range.end),
    getSalesBySlot(merchant.id, range.start, range.end),
    getTopProducts(merchant.id, range.start, range.end, 10),
  ]);
  const hasData = kpi.current.tickets > 0;
  const weekly = period === "12m";
  const comparison = `vs ${PERIODS[period].short} préc.`;

  return (
    <>
      <PageHeader
        title="Analyses"
        description={`Du ${formatDay(range.start)} au ${formatDay(range.end)}, comparé à la période précédente de même durée.`}
        actions={<PeriodTabs current={period} />}
      />

      {!hasData ? (
        <EmptyState icon={<BarChart3 className="size-6" aria-hidden="true" />} title="Aucune vente sur cette période">
          Importez vos ventes (fichier CSV ou SumUp) pour voir le chiffre d&apos;affaires par jour, la carte de chaleur des
          créneaux et vos produits phares.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <section aria-label="Indicateurs de la période" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {kpiTiles(kpi.current, kpi.previous)
              .filter((t) => t.key !== "new")
              .map((t) => (
                <KpiCard key={t.key} label={t.label} value={t.value} delta={t.delta} comparison={comparison} />
              ))}
          </section>

          <Card>
            <h2 className="font-semibold text-marine-900">Chiffre d&apos;affaires {weekly ? "par semaine" : "par jour"}</h2>
            <p className="mb-4 text-sm text-muted">Survolez une barre pour le détail.</p>
            <RevenueChart data={weekly ? toWeeklyPoints(days) : toDailyPoints(days)} granularity={weekly ? "week" : "day"} />
          </Card>

          <Card>
            <h2 className="font-semibold text-marine-900">Chiffre d&apos;affaires par créneau</h2>
            <p className="mb-4 text-sm text-muted">Cumul de la période, par jour de la semaine et par heure.</p>
            <SlotHeatmap cells={slots} />
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-semibold text-marine-900">Top 10 en chiffre d&apos;affaires</h2>
              <TopProductsTable rows={products} by="revenue" />
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold text-marine-900">Top 10 en quantité</h2>
              <TopProductsTable rows={products} by="quantity" />
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

function PeriodTabs({ current }: { current: PeriodKey }) {
  return (
    <nav aria-label="Période" className="inline-flex rounded-lg bg-white p-1 ring-1 ring-line">
      {(Object.keys(PERIODS) as PeriodKey[]).map((key) => (
        <Link
          key={key}
          href={`/analyses?periode=${key}`}
          aria-current={key === current ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium",
            key === current ? "bg-marine-900 text-white" : "text-marine-800 hover:bg-marine-50",
          )}
        >
          {PERIODS[key].short}
        </Link>
      ))}
    </nav>
  );
}
