import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Assistant" };

export default function AssistantPage() {
  return (
    <>
      <PageHeader title="Assistant" description="Posez vos questions sur votre commerce, en français." />
      <EmptyState icon={<MessageCircle className="size-6" aria-hidden="true" />} title="L'assistant a besoin de données">
        {"Une fois vos ventes importées, demandez par exemple « Quel a été mon meilleur mois ? »."}
      </EmptyState>
    </>
  );
}
