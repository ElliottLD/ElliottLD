import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Campagnes" };

export default function CampagnesPage() {
  return (
    <>
      <PageHeader title="Campagnes" description="Emails à vos clients et automatismes." />
      <EmptyState icon={<Mail className="size-6" aria-hidden="true" />} title="Aucune campagne">
        {"Créez une campagne vers un segment de clients, ou lancez-en une depuis une recommandation de l'Accueil."}
      </EmptyState>
    </>
  );
}
