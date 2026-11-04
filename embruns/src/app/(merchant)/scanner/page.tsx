import type { Metadata } from "next";
import { ScanLine } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Scanner" };

export default function ScannerPage() {
  return (
    <>
      <PageHeader title="Scanner" description="Ajoutez un tampon en scannant la carte du client." />
      <EmptyState icon={<ScanLine className="size-6" aria-hidden="true" />} title="Scanner à venir">
        {"Scannez le QR de la carte du client ou saisissez son numéro pour ajouter un tampon."}
      </EmptyState>
    </>
  );
}
