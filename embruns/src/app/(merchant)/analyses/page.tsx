import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Analyses" };

export default function AnalysesPage() {
  return (
    <>
      <PageHeader title="Analyses" description="Chiffre d'affaires, créneaux, produits et clients connus." />
      <EmptyState icon={<BarChart3 className="size-6" aria-hidden="true" />} title="Aucune vente à analyser pour l'instant">
        {"Importez vos ventes (fichier CSV ou SumUp) pour voir le chiffre d'affaires par jour, la carte de chaleur des créneaux et vos produits phares."}
      </EmptyState>
    </>
  );
}
