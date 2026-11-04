import type { Metadata } from "next";
import { Home } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Accueil" };

export default function AccueilPage() {
  return (
    <>
      <PageHeader title="Accueil" description="Votre semaine en un coup d'œil." />
      <EmptyState icon={<Home className="size-6" aria-hidden="true" />} title="Vos chiffres de la semaine arriveront ici">
        {"Le bandeau de KPI comparés à la semaine précédente, vos 3 actions de la semaine et le fil d'insights apparaîtront dès que des ventes seront importées."}
      </EmptyState>
    </>
  );
}
