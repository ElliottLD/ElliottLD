import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { KpiCard } from "@/components/kpi-card";
import { PageHeader } from "@/components/page-header";
import { Stars } from "@/components/stars";
import { Card } from "@/components/ui/card";
import { formatDate, formatInt, formatPercent } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant";
import { REVIEWS_PAGE_SIZE, getRatingDistribution, getReviewSummary, listReviews, parseReviewFilter, type ReviewFilter } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { ReplyForm } from "./reply-form";

export const metadata: Metadata = { title: "Avis" };

const rating = (v: number | null) => (v === null ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }));

export default async function AvisPage({ searchParams }: PageProps<"/avis">) {
  const params = await searchParams;
  const filter = parseReviewFilter(params.filtre);
  const page = Math.max(1, Number(params.page) || 1);
  const merchant = await requireMerchant();
  const [summary, distribution, { rows, total }] = await Promise.all([
    getReviewSummary(merchant.id),
    getRatingDistribution(merchant.id),
    listReviews(merchant.id, filter, page),
  ]);

  if (summary.reviewsCount === 0) {
    return (
      <>
        <PageHeader title="Avis" description="Votre note Google et les avis à traiter." />
        <EmptyState icon={<Star className="size-6" aria-hidden="true" />} title="Aucun avis pour l'instant">
          Les avis de votre fiche et les réponses proposées par l&apos;IA apparaîtront ici.
        </EmptyState>
      </>
    );
  }

  const diff = summary.ratingAvg !== null && summary.ratingAvg90dAgo !== null ? summary.ratingAvg - summary.ratingAvg90dAgo : null;
  const maxCount = Math.max(...distribution.map((d) => d.count), 1);
  const pages = Math.max(1, Math.ceil(total / REVIEWS_PAGE_SIZE));
  const tabs: { key: ReviewFilter; label: string; count?: number }[] = [
    { key: "to_handle", label: "À traiter", count: summary.toHandle },
    { key: "replied", label: "Répondus", count: summary.reviewsCount - summary.toHandle },
    { key: "all", label: "Tous", count: summary.reviewsCount },
  ];

  return (
    <>
      <PageHeader
        title="Avis"
        description={merchant.is_demo ? "Avis simulés pour la démo ; l'API Google Business Profile arrive en V2." : "Votre note et les avis à traiter."}
      />

      <section aria-label="Synthèse des avis" className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Note moyenne"
          value={`${rating(summary.ratingAvg)} / 5`}
          delta={
            diff === null
              ? null
              : { text: `${diff >= 0 ? "+" : "−"}${Math.abs(diff).toLocaleString("fr-FR", { maximumFractionDigits: 2 })}`, direction: Math.abs(diff) < 0.01 ? "flat" : diff > 0 ? "up" : "down" }
          }
          comparison="en 90 jours"
        />
        <KpiCard label="Avis reçus" value={formatInt(summary.reviewsCount)} delta={null} comparison="" hint={`+${formatInt(summary.newReviews90d)} en 90 jours`} />
        <KpiCard label="Note des 30 derniers jours" value={`${rating(summary.ratingAvgLast30d)} / 5`} delta={null} comparison="" hint="Avis publiés ces 30 jours" />
        <KpiCard
          label="Taux de réponse"
          value={summary.responseRate === null ? "—" : formatPercent(summary.responseRate)}
          delta={null}
          comparison=""
          hint={`${formatInt(summary.toHandle)} avis à traiter`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <h2 className="mb-4 font-semibold text-marine-900">Répartition des notes</h2>
          <ul className="space-y-2">
            {distribution.map((d) => (
              <li key={d.rating} className="flex items-center gap-3 text-sm">
                <span className="w-14 shrink-0 tabular-nums text-muted">{d.rating} étoile{d.rating > 1 ? "s" : ""}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-marine-50">
                  <span className="block h-full rounded-full bg-marine-700" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right tabular-nums">{d.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted">
            {formatInt(summary.newReviews90d)} nouveaux avis sur les 90 derniers jours. Embruns demande un avis à tous les clients
            consentants, sans filtrer selon leur satisfaction.
          </p>
        </Card>

        <div className="lg:col-span-2">
          <nav aria-label="Filtrer les avis" className="mb-4 flex flex-wrap gap-2">
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/avis?filtre=${t.key}`}
                aria-current={filter === t.key ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset",
                  filter === t.key ? "bg-marine-900 text-white ring-marine-900" : "bg-white text-marine-800 ring-line hover:bg-marine-50",
                )}
              >
                {t.label}
                <span className={filter === t.key ? "text-marine-100" : "text-muted"}>{t.count}</span>
              </Link>
            ))}
          </nav>

          {rows.length === 0 ? (
            <Card>
              <p className="text-center text-muted">
                {filter === "to_handle" ? "Aucun avis à traiter. Bravo !" : "Aucun avis dans cette catégorie."}
              </p>
            </Card>
          ) : (
            <ul className="space-y-4">
              {rows.map((r) => (
                <li key={r.id}>
                  <Card className={r.status === "to_handle" && r.rating <= 3 ? "ring-corail-500/40" : undefined}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <Stars rating={r.rating} />
                        <span className="font-medium text-ink">{r.author_name ?? "Anonyme"}</span>
                      </div>
                      <span className="text-sm text-muted">{formatDate(r.published_at)}</span>
                    </div>
                    {r.body ? <p className="mt-3 text-ink">{r.body}</p> : null}
                    {r.status === "replied" && r.reply ? (
                      <div className="mt-4 rounded-xl bg-marine-50 px-4 py-3 text-sm">
                        <p className="mb-1 font-medium text-marine-900">
                          Votre réponse{r.replied_at ? ` · ${formatDate(r.replied_at)}` : ""}
                        </p>
                        <p className="text-ink">{r.reply}</p>
                      </div>
                    ) : (
                      <ReplyForm reviewId={r.id} />
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}

          {pages > 1 ? (
            <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted">
                Page {page} sur {pages}
              </span>
              <span className="flex gap-2">
                {page > 1 ? (
                  <Link href={`/avis?filtre=${filter}&page=${page - 1}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-line hover:bg-marine-50">
                    Précédente
                  </Link>
                ) : null}
                {page < pages ? (
                  <Link href={`/avis?filtre=${filter}&page=${page + 1}`} className="rounded-lg bg-white px-3 py-1.5 ring-1 ring-line hover:bg-marine-50">
                    Suivante
                  </Link>
                ) : null}
              </span>
            </nav>
          ) : null}
        </div>
      </div>
    </>
  );
}
