import type { Metadata } from "next";
import { Mail, Trophy } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SegmentBadge } from "@/components/segment-badge";
import { Card } from "@/components/ui/card";
import { getCampaignResults } from "@/lib/campaigns";
import { formatDate, formatEuros, formatInt, formatPercent } from "@/lib/format";
import { requireMerchant } from "@/lib/merchant";

export const metadata: Metadata = { title: "Campagnes" };

const AUTOMATIONS = [
  { name: "Bienvenue", rule: "Juste après l'inscription au comptoir" },
  { name: "Vous nous manquez", rule: "Quand un client passe « à risque »" },
  { name: "Anniversaire", rule: "Le jour de l'anniversaire, si la date est connue" },
  { name: "Récompense proche", rule: "Quand il ne manque plus qu'un tampon" },
];

export default async function CampagnesPage() {
  const merchant = await requireMerchant();
  const campaigns = await getCampaignResults(merchant.id);
  const sent = campaigns.filter((c) => c.recipients > 0);
  const avgReturn = sent.length ? sent.reduce((s, c) => s + (c.returnRate ?? 0), 0) / sent.length : null;
  const best = sent.reduce<(typeof sent)[number] | null>((b, c) => (!b || (c.returnRate ?? 0) > (b.returnRate ?? 0) ? c : b), null);

  return (
    <>
      <PageHeader
        title="Campagnes"
        description="Emails envoyés à vos clients consentants, et leur effet en boutique : un client est compté comme revenu s'il passe dans les 14 jours."
      />

      {campaigns.length === 0 ? (
        <EmptyState icon={<Mail className="size-6" aria-hidden="true" />} title="Aucune campagne">
          La création de campagne vers un segment de clients arrive à l&apos;étape 4, avec l&apos;envoi par email.
        </EmptyState>
      ) : (
        <section aria-label="Campagnes passées" className="space-y-4">
          {avgReturn !== null ? (
            <p className="text-sm text-muted">
              Taux de retour moyen : <strong className="font-semibold text-ink">{formatPercent(avgReturn)}</strong> sur{" "}
              {formatInt(sent.length)} campagne{sent.length > 1 ? "s" : ""}.
            </p>
          ) : null}
          {campaigns.map((c) => (
            <Card key={c.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-marine-900">{c.name}</h2>
                    {c.segment ? <SegmentBadge segment={c.segment} /> : <span className="text-xs text-muted">Tous les clients consentants</span>}
                    {best?.id === c.id && sent.length > 1 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900">
                        <Trophy className="size-3.5" aria-hidden="true" /> Meilleur taux de retour
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {c.sentAt ? `Envoyée le ${formatDate(c.sentAt)}` : "Brouillon"} · Objet : « {c.subject} »
                  </p>
                  {c.offer ? <p className="mt-1 text-sm text-ink">Offre : {c.offer}</p> : null}
                </div>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 sm:grid-cols-4">
                <Metric label="Envois" value={formatInt(c.recipients)} />
                <Metric label="Ouvertures" value={c.recipients ? formatPercent(c.opened / c.recipients) : "—"} hint={`${formatInt(c.opened)} emails`} />
                <Metric
                  label="Retours sous 14 j"
                  value={c.returnRate === null ? "—" : formatPercent(c.returnRate)}
                  hint={`${formatInt(c.returned)} clients`}
                />
                <Metric label="CA associé" value={formatEuros(c.revenue14d)} hint="achats des destinataires sous 14 j" />
              </dl>
            </Card>
          ))}
        </section>
      )}

      <section aria-label="Automatismes" className="mt-10">
        <h2 className="mb-1 font-semibold text-marine-900">Automatismes</h2>
        <p className="mb-4 text-sm text-muted">Les emails automatiques s&apos;activeront un par un à l&apos;étape 4, avec l&apos;envoi par Resend.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {AUTOMATIONS.map((a) => (
            <Card key={a.name} className="p-4">
              <p className="font-medium text-ink">{a.name}</p>
              <p className="text-sm text-muted">{a.rule}</p>
              <p className="mt-2 text-xs text-muted">Pas encore disponible</p>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-marine-900">{value}</dd>
      {hint ? <dd className="text-xs text-muted">{hint}</dd> : null}
    </div>
  );
}
