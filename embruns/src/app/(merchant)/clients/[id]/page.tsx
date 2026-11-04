import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Gift, Mail, MailX, Phone } from "lucide-react";
import { SegmentBadge } from "@/components/segment-badge";
import { Card } from "@/components/ui/card";
import { getCustomerDetail } from "@/lib/customers";
import { formatDate, formatDateTime, formatDaysAgo, formatEuros, formatEurosCents, formatInt } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant";
import { SEGMENTS } from "@/lib/segments";

export const metadata: Metadata = { title: "Fiche client" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CustomerPage({ params }: PageProps<"/clients/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const merchant = await requireMerchant();
  const detail = await getCustomerDetail(merchant.id, id);
  if (!detail) notFound();
  const { customer, segment, card, visits, visitsTotal, totalSpend, avgBasket, sends } = detail;
  const stamps = card?.current_stamps ?? 0;

  return (
    <>
      <Link href="/clients" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-marine-900">
        <ArrowLeft className="size-4" aria-hidden="true" /> Tous les clients
      </Link>

      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-marine-900">{customer.first_name ?? "Client anonyme"}</h1>
            {segment ? <SegmentBadge segment={segment.segment} /> : null}
          </div>
          <p className="mt-1 text-muted">Client depuis le {formatDate(customer.created_at)}</p>
        </div>
      </header>

      {segment ? (
        <p className="mb-6 rounded-xl bg-white px-4 py-3 text-sm text-muted ring-1 ring-line">
          <strong className="font-medium text-ink">{SEGMENTS[segment.segment].singular}</strong> : {SEGMENTS[segment.segment].rule.toLowerCase()}.
          {segment.median_interval_days ? ` Rythme habituel : une visite tous les ${Math.round(Number(segment.median_interval_days))} jours.` : ""}
        </p>
      ) : null}

      <section aria-label="Chiffres clés" className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="Visites" value={formatInt(visitsTotal)} hint={segment ? `${formatInt(segment.visits_90d)} sur 90 jours` : undefined} />
        <Stat label="Dépense totale" value={formatEuros(totalSpend)} hint={segment ? `${formatEuros(Number(segment.spend_90d))} sur 90 jours` : undefined} />
        <Stat label="Panier moyen" value={avgBasket === null ? "—" : formatEurosCents(avgBasket)} />
        <Stat
          label="Dernière visite"
          value={formatDaysAgo(segment?.days_since_last_visit === null || !segment ? null : Number(segment.days_since_last_visit))}
          hint={visits[0] ? formatDate(visits[0].visited_at) : undefined}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <h2 className="mb-4 font-semibold text-marine-900">Carte de fidélité</h2>
            <div className="grid grid-cols-5 gap-2" role="img" aria-label={`${stamps} tampons sur ${merchant.stamps_required}`}>
              {Array.from({ length: merchant.stamps_required }, (_, i) => (
                <span
                  key={i}
                  className={
                    i < stamps
                      ? "flex aspect-square items-center justify-center rounded-full bg-marine-800 text-white"
                      : "aspect-square rounded-full border-2 border-dashed border-marine-100"
                  }
                >
                  {i < stamps ? <Check className="size-4" aria-hidden="true" /> : null}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">
              {stamps} / {merchant.stamps_required} tampons
              {merchant.stamps_required - stamps === 1 ? " · plus qu'un avant la récompense !" : ""}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-ink">
              <Gift className="size-4 text-corail-500" aria-hidden="true" />
              {formatInt(card?.rewards_earned ?? 0)} récompense{(card?.rewards_earned ?? 0) > 1 ? "s" : ""} obtenue
              {(card?.rewards_earned ?? 0) > 1 ? "s" : ""} ({merchant.reward_label.toLowerCase()})
            </p>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold text-marine-900">Contact</h2>
            <ul className="space-y-2 text-sm">
              {customer.email ? (
                <li className="flex items-center gap-2 break-all">
                  <Mail className="size-4 shrink-0 text-muted" aria-hidden="true" /> {customer.email}
                </li>
              ) : null}
              {customer.phone ? (
                <li className="flex items-center gap-2">
                  <Phone className="size-4 shrink-0 text-muted" aria-hidden="true" /> {customer.phone}
                </li>
              ) : null}
              {customer.birthday ? <li className="text-muted">Anniversaire : {formatDate(customer.birthday)}</li> : null}
            </ul>
            <p className="mt-4 border-t border-line pt-4 text-sm">
              {customer.unsubscribed_at ? (
                <span className="flex items-center gap-2 text-muted">
                  <MailX className="size-4" aria-hidden="true" /> Désinscrit le {formatDate(customer.unsubscribed_at)} : ne reçoit plus de
                  campagnes.
                </span>
              ) : customer.marketing_consent && customer.marketing_consent_at ? (
                <span className="flex items-center gap-2 text-success">
                  <Check className="size-4" aria-hidden="true" /> Accepte les emails, depuis le {formatDate(customer.marketing_consent_at)}
                </span>
              ) : (
                <span className="text-muted">N&apos;a pas accepté les emails : carte de fidélité uniquement.</span>
              )}
            </p>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <h2 className="mb-3 font-semibold text-marine-900">Dernières visites</h2>
            {visits.length === 0 ? (
              <p className="text-sm text-muted">Aucune visite enregistrée.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-muted">
                    <th scope="col" className="py-2 font-normal">Date</th>
                    <th scope="col" className="py-2 text-right font-normal">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2">{formatDateTime(v.visited_at)}</td>
                      <td className="py-2 text-right tabular-nums">{v.amount === null ? "—" : formatEurosCents(Number(v.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {visitsTotal > visits.length ? (
              <p className="mt-3 text-xs text-muted">Les {visits.length} plus récentes sur {formatInt(visitsTotal)}.</p>
            ) : null}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-marine-900">Campagnes reçues</h2>
            {sends.length === 0 ? (
              <p className="text-sm text-muted">Aucune campagne reçue.</p>
            ) : (
              <ul className="divide-y divide-line/60 text-sm">
                {sends.map((s) => (
                  <li key={s.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="font-medium text-ink">{s.campaign}</span>
                      {s.sentAt ? <span className="ml-2 text-muted">{formatDate(s.sentAt)}</span> : null}
                    </span>
                    <span className="flex gap-3 text-xs">
                      <span className={s.openedAt ? "text-ink" : "text-muted"}>{s.openedAt ? "Ouvert" : "Non ouvert"}</span>
                      <span className={s.returned ? "font-medium text-success" : "text-muted"}>
                        {s.returned ? "Revenu sous 14 j" : "Pas revenu sous 14 j"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-marine-900 tabular-nums sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
}
