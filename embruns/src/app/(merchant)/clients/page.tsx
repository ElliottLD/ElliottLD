import type { Metadata } from "next";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <>
      <PageHeader title="Clients" description="Qui revient, qui décroche." />
      <EmptyState icon={<Users className="size-6" aria-hidden="true" />} title="Aucun client inscrit">
        {"Imprimez le QR code du comptoir depuis les Réglages : chaque client qui s'inscrit apparaîtra ici avec ses visites, sa dépense et ses tampons."}
      </EmptyState>
    </>
  );
}
