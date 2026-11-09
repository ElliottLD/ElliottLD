import type { Metadata } from "next";
import { ArrowRight, Home } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PricingCard, PricingSuggestions } from "@/components/pricing-home";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { getKpiSummary } from "@/lib/analytics";
import { formatDay } from "@/lib/format";
import { kpiTiles } from "@/lib/kpi-view";
import { requireMerchant } from "@/lib/merchant";
import { localToday, periodRange } from "@/lib/periods";
import { loadPricingWithRecommendations } from "@/lib/pricing/server";

export const metadata: Metadata = { title: "Accueil" };
// Première visite de la semaine : rédaction des explications de prix par l'IA.
export const maxDuration = 60;

export default async function AccueilPage() {
  const merchant = await requireMerchant();
  const range = periodRange("7j", localToday(merchant.timezone));
  const [{ current, previous }, pricing] = await Promise.all([
    getKpiSummary(merchant.id, range.start, range.end),
    loadPricingWithRecommendations(merchant.id),
  ]);
  const hasData = current.tickets > 0 || previous.tickets > 0;

  return (
    <>
      <PageHeader
        title="Accueil"
        description={`Les 7 derniers jours, du ${formatDay(range.start)} au ${formatDay(range.end)}, comparés aux 7 jours précédents.`}
        actions={
          hasData ? (
            <ButtonLink href="/analyses" variant="secondary">
              Toutes les analyses
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          ) : null
        }
      />
      {hasData ? (
        <>
          <section aria-label="Indicateurs de la semaine" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
            {kpiTiles(current, previous).map((t) => (
              <KpiCard key={t.key} label={t.label} value={t.value} delta={t.delta} comparison="vs 7 j préc." />
            ))}
            {pricing.length ? <PricingCard rows={pricing} /> : null}
          </section>
          <PricingSuggestions rows={pricing} />
        </>
      ) : (
        <EmptyState icon={<Home className="size-6" aria-hidden="true" />} title="Vos chiffres de la semaine arriveront ici">
          Le bandeau de KPI comparés à la semaine précédente apparaîtra dès que des ventes seront importées (fichier CSV ou
          connexion SumUp, depuis les Réglages).
        </EmptyState>
      )}
    </>
  );
}
