import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Tag } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { formatEuros, formatEurosCents, formatInt } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant";
import { summarize } from "@/lib/pricing/engine";
import { CONFIDENCE_LABEL, HIGH_INDEX_WARNING, formatIndex } from "@/lib/pricing/labels";
import { loadPricingWithRecommendations, type ProductRow } from "@/lib/pricing/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Prix" };
// Première visite de la semaine : rédaction des explications par l'IA.
export const maxDuration = 60;

const FILTERS = { tous: "Tous", "sous-le-seuil": "Sous le seuil", recommandation: "Recommandation disponible" } as const;
type Filter = keyof typeof FILTERS;
const SORTS = { nom: "Nom", marge: "Marge", indice: "Indice", gain: "Gain potentiel" } as const;
type Sort = keyof typeof SORTS;

const pct = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);
const hasReco = (r: ProductRow) => r.status === "recommendation" && r.recommendation?.status === "proposed";

function sortRows(rows: ProductRow[], sort: Sort) {
  const by: Record<Sort, (a: ProductRow, b: ProductRow) => number> = {
    nom: (a, b) => a.product.name.localeCompare(b.product.name, "fr"),
    marge: (a, b) => (a.marginPct ?? -Infinity) - (b.marginPct ?? -Infinity),
    indice: (a, b) => (b.priceIndex ?? -Infinity) - (a.priceIndex ?? -Infinity),
    gain: (a, b) => (hasReco(b) ? b.suggestion!.weeklyImpact : -Infinity) - (hasReco(a) ? a.suggestion!.weeklyImpact : -Infinity),
  };
  return [...rows].sort(by[sort]);
}

export default async function PrixPage({ searchParams }: PageProps<"/prix">) {
  const params = await searchParams;
  const filter: Filter = typeof params.filtre === "string" && params.filtre in FILTERS ? (params.filtre as Filter) : "tous";
  const sort: Sort = typeof params.tri === "string" && params.tri in SORTS ? (params.tri as Sort) : "nom";
  const merchant = await requireMerchant();
  const rows = await loadPricingWithRecommendations(merchant.id);

  if (rows.length === 0) {
    return (
      <>
        <PageHeader title="Prix" description="Marges, prix concurrents et suggestions de prix fondées sur vos ventes." />
        <EmptyState icon={<Tag className="size-6" aria-hidden="true" />} title="Aucun produit suivi">
          Les produits apparaîtront ici avec leurs prix et leurs coûts, dès que vos ventes seront importées.
        </EmptyState>
      </>
    );
  }

  const summary = summarize(rows);
  // Gain potentiel : seulement les suggestions encore à traiter (ni appliquées, ni ignorées).
  const potentialGain = rows.filter(hasReco).reduce((s, r) => s + r.suggestion!.weeklyImpact, 0);
  const visible = sortRows(
    rows.filter((r) => (filter === "sous-le-seuil" ? r.belowThreshold : filter === "recommandation" ? hasReco(r) : true)),
    sort,
  );
  const link = (f: Filter, t: Sort) => `/prix?${new URLSearchParams({ ...(f !== "tous" ? { filtre: f } : {}), ...(t !== "nom" ? { tri: t } : {}) })}`;

  return (
    <>
      <PageHeader
        title="Prix"
        description="Marges, position face aux concurrents et suggestions fondées sur vos 16 dernières semaines de ventes. Vous validez toujours vous-même."
      />

      <section aria-label="Indicateurs de prix" className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard label="Marge moyenne" value={pct(summary.averageMarginPct === null ? null : Math.round(summary.averageMarginPct * 10) / 10)} delta={null} comparison="" hint="Pondérée par le CA des 30 derniers jours" />
        <KpiCard label="Indice de prix global" value={formatIndex(summary.globalPriceIndex)} delta={null} comparison="" hint="100 = aligné sur vos concurrents" />
        <KpiCard label="Sous le seuil de marge" value={formatInt(summary.belowThresholdCount)} delta={null} comparison="" hint={`produit${summary.belowThresholdCount > 1 ? "s" : ""} en alerte`} />
        <KpiCard label="Gain potentiel" value={`${formatEuros(potentialGain)} / sem.`} delta={null} comparison="" hint="Si toutes les suggestions sont appliquées" />
      </section>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filtrer les produits" className="flex flex-wrap gap-2">
          {(Object.keys(FILTERS) as Filter[]).map((f) => (
            <Link
              key={f}
              href={link(f, sort)}
              aria-current={filter === f ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset",
                filter === f ? "bg-marine-900 text-white ring-marine-900" : "bg-white text-marine-800 ring-line hover:bg-marine-50",
              )}
            >
              {FILTERS[f]}
            </Link>
          ))}
        </nav>
        <nav aria-label="Trier" className="flex items-center gap-1 text-sm">
          <span className="text-muted">Trier par</span>
          {(Object.keys(SORTS) as Sort[]).map((t) => (
            <Link
              key={t}
              href={link(filter, t)}
              aria-current={sort === t ? "page" : undefined}
              className={cn("rounded-md px-2 py-1", sort === t ? "bg-marine-100 font-medium text-marine-900" : "text-marine-800 hover:bg-marine-50")}
            >
              {SORTS[t]}
            </Link>
          ))}
        </nav>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th scope="col" className="px-4 py-3 font-normal sm:px-6">Produit</th>
              <th scope="col" className="px-2 py-3 text-right font-normal">Prix</th>
              <th scope="col" className="px-2 py-3 text-right font-normal">Coût</th>
              <th scope="col" className="px-2 py-3 text-right font-normal">Marge</th>
              <th scope="col" className="px-2 py-3 text-right font-normal">Indice</th>
              <th scope="col" className="px-2 py-3 text-right font-normal">Prix conseillé</th>
              <th scope="col" className="px-2 py-3 font-normal">Confiance</th>
              <th scope="col" className="px-4 py-3 text-right font-normal sm:px-6">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const low = r.suggestion?.confidence === "low";
              return (
                <tr key={r.product.id} className="border-b border-line/60 last:border-0 hover:bg-marine-50/60">
                  <td className="px-4 py-3 sm:px-6">
                    <Link href={`/prix/${r.product.id}`} className="font-medium text-marine-900 hover:underline">
                      {r.product.name}
                    </Link>
                    {r.product.category ? <span className="ml-2 text-xs text-muted">{r.product.category}</span> : null}
                  </td>
                  <td className="px-2 py-3 text-right tabular-nums">{formatEurosCents(r.product.price)}</td>
                  <td className="px-2 py-3 text-right tabular-nums text-muted">{formatEurosCents(r.product.unitCost)}</td>
                  <td className={cn("px-2 py-3 text-right tabular-nums", r.belowThreshold && "font-medium text-danger")}>
                    {r.belowThreshold ? <AlertTriangle className="mr-1 inline size-3.5" aria-label="Sous le seuil de marge" /> : null}
                    {pct(r.marginPct === null ? null : Math.round(r.marginPct * 10) / 10)}
                  </td>
                  <td className={cn("px-2 py-3 text-right tabular-nums", r.priceIndex !== null && r.priceIndex > HIGH_INDEX_WARNING && "font-medium text-amber-700")}>
                    {formatIndex(r.priceIndex)}
                  </td>
                  <td className={cn("px-2 py-3 text-right tabular-nums", low && "text-muted")}>
                    {r.status === "insufficient_data" ? (
                      <span className="text-xs text-muted">Données insuffisantes</span>
                    ) : r.status === "incoherent" ? (
                      <span className="text-xs text-muted">Pas de tendance nette</span>
                    ) : r.status === "cooldown" ? (
                      <span className="text-xs text-muted">Prix modifié récemment</span>
                    ) : r.status === "no_change" ? (
                      <span className="text-xs text-muted">Prix actuel conseillé</span>
                    ) : r.recommendation?.status === "accepted" ? (
                      <span className="text-xs text-success">Appliqué</span>
                    ) : r.recommendation?.status === "ignored" ? (
                      <span className="text-xs text-muted">Ignorée</span>
                    ) : (
                      <span>
                        {formatEurosCents(r.suggestion!.recommendedPrice)}
                        <span className={cn("block text-xs", low ? "text-muted" : "text-success")}>
                          {r.suggestion!.weeklyImpact >= 0 ? "+" : "−"}
                          {formatEuros(Math.abs(r.suggestion!.weeklyImpact))} / sem.
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-3">
                    {r.suggestion && r.status === "recommendation" ? (
                      <span className={cn("text-xs", low ? "text-muted" : "text-ink")}>{CONFIDENCE_LABEL[r.suggestion.confidence]}</span>
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right sm:px-6">
                    <Link href={`/prix/${r.product.id}`} className="text-sm font-medium text-marine-800 hover:underline">
                      Voir
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visible.length === 0 ? <p className="px-6 py-10 text-center text-muted">Aucun produit dans ce filtre.</p> : null}
      </Card>
      <p className="mt-3 text-xs text-muted">
        Indice de prix : votre prix comparé à la moyenne des derniers relevés concurrents des 30 derniers jours (100 = aligné). Les
        suggestions en gris ont une fiabilité faible : vos ventes varient trop pour conclure avec certitude.
      </p>
    </>
  );
}
