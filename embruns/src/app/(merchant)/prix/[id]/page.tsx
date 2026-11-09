import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Sparkles } from "lucide-react";
import { PriceHistory } from "@/components/charts/price-history";
import { Card } from "@/components/ui/card";
import { formatDate, formatDay, formatEuros, formatEurosCents } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant";
import { CONFIDENCE_LABEL, CONSTRAINT_LABEL, HIGH_INDEX_WARNING, formatIndex } from "@/lib/pricing/labels";
import { HISTORY_WEEKS, loadCompetitorPrices, loadPriceChanges, loadPricingWithRecommendations } from "@/lib/pricing/server";
import { cn } from "@/lib/utils";
import { CompetitorForm, RecommendationActions } from "./forms";

export const metadata: Metadata = { title: "Fiche produit" };
export const maxDuration = 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const pct = (v: number | null) => (v === null ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`);

export default async function ProductPricePage({ params }: PageProps<"/prix/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const merchant = await requireMerchant();
  const rows = await loadPricingWithRecommendations(merchant.id);
  const row = rows.find((r) => r.product.id === id);
  if (!row) notFound();
  const [competitors, changes] = await Promise.all([loadCompetitorPrices(id), loadPriceChanges(id)]);

  const { product, suggestion, recommendation, elasticity } = row;
  const weekly = [...row.weekly]
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map((w) => ({
      weekStart: w.weekStart,
      label: formatDay(w.weekStart),
      quantity: Math.round(w.quantity),
      price: Math.round((w.revenue / w.quantity) * 100) / 100,
    }));
  const low = suggestion?.confidence === "low";

  return (
    <>
      <Link href="/prix" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-marine-900">
        <ArrowLeft className="size-4" aria-hidden="true" /> Tous les produits
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-marine-900">{product.name}</h1>
        <p className="mt-1 text-muted">{product.category ?? "Produit"}</p>
      </header>

      <section aria-label="Chiffres du produit" className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Prix actuel" value={formatEurosCents(product.price)} />
        <Stat label="Coût" value={formatEurosCents(product.unitCost)} />
        <Stat
          label="Marge"
          value={`${formatEurosCents(row.marginUnit)} · ${pct(row.marginPct === null ? null : Math.round(row.marginPct * 10) / 10)}`}
          alert={row.belowThreshold ? `Sous votre seuil de ${Math.round(product.minMarginPct)} %` : undefined}
        />
        <Stat
          label="Indice de prix"
          value={formatIndex(row.priceIndex)}
          warning={row.priceIndex !== null && row.priceIndex > HIGH_INDEX_WARNING ? "Plus cher que vos concurrents" : undefined}
          hint={row.priceIndex === null ? "Aucun relevé concurrent récent" : "100 = aligné"}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card className={cn(low && "bg-zinc-50")}>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-marine-900">
              <Sparkles className="size-4 text-corail-500" aria-hidden="true" /> Suggestion de prix
            </h2>
            {row.status === "insufficient_data" ? (
              <p className="text-muted">
                Données insuffisantes :{" "}
                {elasticity.status === "insufficient_data" && elasticity.reason === "single_price"
                  ? "le prix n'a pas assez varié ces dernières semaines pour mesurer la réaction de vos clients."
                  : `il faut au moins 8 semaines de ventes (${elasticity.status === "insufficient_data" ? elasticity.weeks : 0} disponibles).`}
              </p>
            ) : row.status === "incoherent" ? (
              <p className="text-muted">Pas de tendance nette : vos ventes n&apos;ont pas baissé quand le prix montait. Aucune suggestion.</p>
            ) : row.status === "cooldown" ? (
              <p className="text-muted">Le prix a été modifié récemment : Embruns attend quelques semaines de ventes au nouveau prix.</p>
            ) : row.status === "no_change" ? (
              <p className="text-muted">Votre prix actuel est déjà le bon compromis d&apos;après vos ventes.</p>
            ) : suggestion && recommendation ? (
              <>
                <div className="flex flex-wrap items-baseline gap-3">
                  <p className={cn("text-3xl font-semibold tabular-nums", low ? "text-muted" : "text-marine-900")}>
                    {formatEurosCents(suggestion.recommendedPrice)}
                  </p>
                  <p className={cn("text-sm", low ? "text-muted" : "text-success")}>
                    {suggestion.weeklyImpact >= 0 ? "+" : "−"}
                    {formatEuros(Math.abs(suggestion.weeklyImpact))} de marge par semaine (estimation)
                  </p>
                </div>
                <p className="mt-3 text-ink">{recommendation.explanation}</p>
                {low ? (
                  <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    Fiabilité faible : vos ventes varient beaucoup d&apos;une semaine à l&apos;autre. À tester avec prudence.
                  </p>
                ) : null}
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted">Réaction au prix</dt>
                    <dd className="text-ink">{suggestion.elasticity < -1 ? "Forte" : "Faible"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Fiabilité</dt>
                    <dd className="text-ink">{CONFIDENCE_LABEL[suggestion.confidence]}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Historique</dt>
                    <dd className="text-ink">{elasticity.status === "ok" ? elasticity.weeks : 0} semaines</dd>
                  </div>
                </dl>
                {suggestion.constraints.length ? (
                  <ul className="mt-3 space-y-1 text-xs text-muted">
                    {suggestion.constraints.map((c) => (
                      <li key={c}>• {CONSTRAINT_LABEL[c]}</li>
                    ))}
                  </ul>
                ) : null}
                {recommendation.status === "proposed" ? (
                  <RecommendationActions recommendationId={recommendation.id} price={formatEurosCents(suggestion.recommendedPrice)} />
                ) : (
                  <p className={cn("mt-4 text-sm font-medium", recommendation.status === "accepted" ? "text-success" : "text-muted")}>
                    {recommendation.status === "accepted" ? "Suggestion appliquée." : "Suggestion ignorée cette semaine."}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted">
                  {recommendation.explanationSource === "ai"
                    ? "Explication rédigée par l'IA à partir des chiffres calculés."
                    : "Explication générée à partir des chiffres calculés."}
                </p>
              </>
            ) : null}
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold text-marine-900">Ventes et prix sur {HISTORY_WEEKS} semaines</h2>
            {weekly.length ? <PriceHistory data={weekly} /> : <p className="text-sm text-muted">Pas encore de ventes pour ce produit.</p>}
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-1 font-semibold text-marine-900">Prix concurrents</h2>
            <p className="mb-3 text-xs text-muted">L&apos;indice utilise le dernier relevé de chaque concurrent sur 30 jours.</p>
            {competitors.length === 0 ? (
              <p className="text-sm text-muted">Aucun relevé pour l&apos;instant.</p>
            ) : (
              <ul className="divide-y divide-line/60 text-sm">
                {competitors.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <span>
                      <span className="text-ink">{c.competitor_name}</span>
                      <span className="ml-2 text-xs text-muted">{formatDate(c.observed_at)}</span>
                    </span>
                    <span className="tabular-nums">{formatEurosCents(Number(c.price))}</span>
                  </li>
                ))}
              </ul>
            )}
            <CompetitorForm productId={product.id} />
          </Card>

          {changes.length ? (
            <Card>
              <h2 className="mb-3 font-semibold text-marine-900">Prix modifiés dans Embruns</h2>
              <ul className="divide-y divide-line/60 text-sm">
                {changes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <span className="text-muted">{formatDate(c.changed_at)}</span>
                    <span className="tabular-nums">
                      {formatEurosCents(Number(c.old_price))} → {formatEurosCents(Number(c.new_price))}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint, alert, warning }: { label: string; value: string; hint?: string; alert?: string; warning?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-marine-900 tabular-nums">{value}</p>
      {alert ? (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-danger">
          <AlertTriangle className="size-3.5" aria-hidden="true" /> {alert}
        </p>
      ) : warning ? (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-700">
          <AlertTriangle className="size-3.5" aria-hidden="true" /> {warning}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </Card>
  );
}
