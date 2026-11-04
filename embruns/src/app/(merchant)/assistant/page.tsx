import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Assistant" };

const EXAMPLES = [
  "Quel a été mon meilleur mois ?",
  "Qui sont mes 10 meilleurs clients ?",
  "Combien m'a rapporté la campagne de Noël ?",
  "Quel est mon créneau le plus calme ?",
  "Combien de clients sont à risque ce mois-ci ?",
];

export default function AssistantPage() {
  return (
    <>
      <PageHeader title="Assistant" description="Posez vos questions sur votre commerce, en français." />
      <Card className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-marine-50 p-3 text-marine-700">
            <MessageCircle className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-semibold text-marine-900">L&apos;assistant arrive à l&apos;étape 7</h2>
            <p className="text-sm text-muted">
              Il répondra uniquement à partir de vos chiffres, calculés par Embruns : jamais de chiffre inventé.
            </p>
          </div>
        </div>
        <p className="mb-3 mt-6 text-sm font-medium text-ink">Exemples de questions :</p>
        <ul className="flex flex-wrap gap-2">
          {EXAMPLES.map((q) => (
            <li key={q} className="rounded-full bg-marine-50 px-3.5 py-1.5 text-sm text-marine-800">
              {q}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
