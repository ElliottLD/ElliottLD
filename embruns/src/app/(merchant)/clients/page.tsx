import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SegmentBadge } from "@/components/segment-badge";
import { Card } from "@/components/ui/card";
import { PAGE_SIZE, getSegmentSummary, listCustomers } from "@/lib/customers";
import { formatDaysAgo, formatEuros, formatInt } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant";
import { SEGMENTS, SEGMENT_ORDER, parseSegment, type SegmentKey } from "@/lib/segments";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Clients" };

function href(params: { segment?: SegmentKey | null; q?: string; page?: number }) {
  const sp = new URLSearchParams();
  if (params.segment) sp.set("segment", params.segment);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `/clients?${s}` : "/clients";
}

export default async function ClientsPage({ searchParams }: PageProps<"/clients">) {
  const params = await searchParams;
  const segment = parseSegment(params.segment);
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 60) : "";
  const page = Math.max(1, Number(params.page) || 1);
  const merchant = await requireMerchant();

  const [summary, { rows, total }] = await Promise.all([
    getSegmentSummary(merchant.id),
    listCustomers(merchant.id, { segment, search: q, page }),
  ]);
  const totalCustomers = summary.reduce((s, r) => s + r.customers, 0);
  const atRisk = summary.find((s) => s.segment === "at_risk");
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (totalCustomers === 0) {
    return (
      <>
        <PageHeader title="Clients" description="Qui revient, qui décroche." />
        <EmptyState icon={<Users className="size-6" aria-hidden="true" />} title="Aucun client inscrit">
          Imprimez le QR code du comptoir depuis les Réglages : chaque client qui s&apos;inscrit apparaîtra ici avec ses visites,
          sa dépense et ses tampons.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Clients" description={`${formatInt(totalCustomers)} clients inscrits. Qui revient, qui décroche.`} />

      {atRisk && atRisk.customers > 0 ? (
        <Link
          href={href({ segment: "at_risk" })}
          className="mb-6 flex flex-col gap-1 rounded-2xl bg-corail-100 px-5 py-4 transition-colors hover:bg-corail-100/70 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="text-ink">
            <strong className="font-semibold">{formatInt(atRisk.customers)} clients à risque</strong> : des habitués qui ne sont
            pas revenus depuis plus longtemps que d&apos;habitude.
          </span>
          <span className="text-sm text-corail-600">
            {formatEuros(atRisk.monthlySpend)} de CA mensuel en jeu · Voir la liste →
          </span>
        </Link>
      ) : null}

      <nav aria-label="Segments" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        <SegmentTab active={!segment} href={href({ q })} label="Tous" count={totalCustomers} />
        {SEGMENT_ORDER.map((key) => (
          <SegmentTab
            key={key}
            active={segment === key}
            href={href({ segment: key, q })}
            label={SEGMENTS[key].label}
            count={summary.find((s) => s.segment === key)?.customers ?? 0}
          />
        ))}
      </nav>

      <form action="/clients" className="mb-4 flex max-w-sm items-center gap-2 rounded-lg bg-white px-3 ring-1 ring-line focus-within:ring-marine-500">
        {segment ? <input type="hidden" name="segment" value={segment} /> : null}
        <Search className="size-4 text-muted" aria-hidden="true" />
        <label htmlFor="q" className="sr-only">
          Rechercher un client par prénom
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Rechercher un prénom" className="w-full bg-transparent py-2.5 text-base outline-none" />
      </form>

      {segment ? <p className="mb-4 text-sm text-muted">{SEGMENTS[segment].rule}.</p> : null}

      <Card className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-muted">Aucun client ne correspond à cette recherche.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="px-4 py-3 font-normal sm:px-6">Client</th>
                <th scope="col" className="px-2 py-3 font-normal">Segment</th>
                <th scope="col" className="hidden px-2 py-3 text-right font-normal sm:table-cell">Visites 90 j</th>
                <th scope="col" className="px-2 py-3 text-right font-normal">Dépense 90 j</th>
                <th scope="col" className="hidden px-2 py-3 font-normal md:table-cell">Dernière visite</th>
                <th scope="col" className="hidden px-4 py-3 text-right font-normal sm:px-6 md:table-cell">Tampons</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-line/60 last:border-0 hover:bg-marine-50/60">
                  <td className="px-4 py-3 sm:px-6">
                    <Link href={`/clients/${c.id}`} className="font-medium text-marine-900 hover:underline">
                      {c.firstName ?? "Client anonyme"}
                    </Link>
                    <span className="block text-xs text-muted md:hidden">{formatDaysAgo(c.daysSinceLastVisit)}</span>
                  </td>
                  <td className="px-2 py-3">
                    <SegmentBadge segment={c.segment} />
                  </td>
                  <td className="hidden px-2 py-3 text-right tabular-nums sm:table-cell">{formatInt(c.visits90d)}</td>
                  <td className="px-2 py-3 text-right tabular-nums">{formatEuros(c.spend90d)}</td>
                  <td className="hidden px-2 py-3 text-muted md:table-cell">{formatDaysAgo(c.daysSinceLastVisit)}</td>
                  <td className="hidden px-4 py-3 text-right tabular-nums sm:px-6 md:table-cell">
                    {c.stamps === null ? "—" : `${c.stamps} / ${merchant.stamps_required}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {page} sur {pages} · {formatInt(total)} clients
          </span>
          <span className="flex gap-2">
            {page > 1 ? (
              <Link href={href({ segment, q, page: page - 1 })} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 ring-1 ring-line hover:bg-marine-50">
                <ChevronLeft className="size-4" aria-hidden="true" /> Précédente
              </Link>
            ) : null}
            {page < pages ? (
              <Link href={href({ segment, q, page: page + 1 })} className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 ring-1 ring-line hover:bg-marine-50">
                Suivante <ChevronRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </span>
        </nav>
      ) : null}
    </>
  );
}

function SegmentTab({ active, href, label, count }: { active: boolean; href: string; label: string; count: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset",
        active ? "bg-marine-900 text-white ring-marine-900" : "bg-white text-marine-800 ring-line hover:bg-marine-50",
      )}
    >
      {label}
      <span className={cn("tabular-nums", active ? "text-marine-100" : "text-muted")}>{formatInt(count)}</span>
    </Link>
  );
}
