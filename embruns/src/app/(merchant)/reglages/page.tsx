import type { Metadata } from "next";
import { Settings } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Réglages" };

export default function ReglagesPage() {
  return (
    <>
      <PageHeader title="Réglages" description="Commerce, fidélité, connexions et ton de la marque." />
      <EmptyState icon={<Settings className="size-6" aria-hidden="true" />} title="Réglages à venir">
        {"Nom, logo et couleur du commerce, programme de fidélité, connexion SumUp, import CSV, ton de la marque et QR code à imprimer."}
      </EmptyState>
    </>
  );
}
