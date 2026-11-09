import Link from "next/link";
import { AlertTriangle, ArrowRight, Sparkles, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatEuros, formatEurosCents, formatInt } from "@/lib/format";
import { summarize } from "@/lib/pricing/engine";
import type { ProductRow } from "@/lib/pricing/server";

/** Carte « Prix » du tableau de bord : marge moyenne et alertes de marge. */
export function PricingCard({ rows }: { rows: ProductRow[] }) {
  const s = summarize(rows);
  return (
    <Card className="p-4 sm:p-5">
      <p className="flex items-center gap-2 text-sm text-muted">
        <Tag className="size-4" aria-hidden="true" /> Prix
      </p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-marine-900 tabular-nums sm:text-2xl">
        {s.averageMarginPct === null ? "—" : `${s.averageMarginPct.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`}
      </p>
      <p className="text-sm text-muted">de marge moyenne</p>
      <Link href="/prix?filtre=sous-le-seuil" className="mt-2 flex items-center gap-1 text-sm">
        {s.belowThresholdCount > 0 ? (
          <span className="flex items-center gap-1 font-medium text-danger">
            <AlertTriangle className="size-4" aria-hidden="true" />
            {formatInt(s.belowThresholdCount)} produit{s.belowThresholdCount > 1 ? "s" : ""} sous le seuil
          </span>
        ) : (
          <span className="text-success">Aucune alerte de marge</span>
        )}
      </Link>
    </Card>
  );
}

/** Suggestions de prix dans le fil des recommandations : les 3 plus fortes, fiabilité moyenne ou haute. */
export function PricingSuggestions({ rows }: { rows: ProductRow[] }) {
  const top = rows
    .filter((r) => r.status === "recommendation" && r.recommendation?.status === "proposed" && r.suggestion && r.suggestion.confidence !== "low")
    .sort((a, b) => b.suggestion!.weeklyImpact - a.suggestion!.weeklyImpact)
    .slice(0, 3);
  if (top.length === 0) return null;
  return (
    <section aria-label="Suggestions de prix" className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold text-marine-900">
          <Sparkles className="size-4 text-corail-500" aria-hidden="true" /> Suggestions de prix
        </h2>
        <Link href="/prix?filtre=recommandation&tri=gain" className="inline-flex items-center gap-1 text-sm font-medium text-marine-800 hover:underline">
          Toutes <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <ul className="grid gap-4 lg:grid-cols-3">
        {top.map((r) => (
          <li key={r.product.id}>
            <Card className="flex h-full flex-col">
              <p className="font-medium text-ink">{r.product.name}</p>
              <p className="mt-1 text-sm tabular-nums text-muted">
                {formatEurosCents(r.product.price)} → <strong className="text-marine-900">{formatEurosCents(r.suggestion!.recommendedPrice)}</strong>
                <span className="ml-2 text-success">+{formatEuros(Math.max(0, r.suggestion!.weeklyImpact))} / sem.</span>
              </p>
              <p className="mt-3 flex-1 text-sm text-ink">{r.recommendation!.explanation}</p>
              <Link href={`/prix/${r.product.id}`} className="mt-4 text-sm font-medium text-marine-800 hover:underline">
                Voir et appliquer
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}
