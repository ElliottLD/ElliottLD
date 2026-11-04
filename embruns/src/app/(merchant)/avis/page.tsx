import type { Metadata } from "next";
import { Star } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Avis" };

export default function AvisPage() {
  return (
    <>
      <PageHeader title="Avis" description="Votre note Google et les avis à traiter." />
      <EmptyState icon={<Star className="size-6" aria-hidden="true" />} title="Aucun avis pour l'instant">
        {"Les avis de votre fiche et les réponses proposées par l'IA apparaîtront ici."}
      </EmptyState>
    </>
  );
}
