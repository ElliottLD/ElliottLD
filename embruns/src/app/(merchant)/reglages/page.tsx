import type { Metadata } from "next";
import { FileSpreadsheet, QrCode, Store } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { requireMerchant } from "@/lib/merchant";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm, type MerchantSettings } from "./settings-form";

export const metadata: Metadata = { title: "Réglages" };

export default async function ReglagesPage() {
  const merchant = await requireMerchant();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("merchants")
    .select("name, business_type, brand_color, google_review_url, brand_tone, stamps_required, reward_label")
    .eq("id", merchant.id)
    .single();
  if (error) throw error;

  return (
    <>
      <PageHeader title="Réglages" description="Commerce, fidélité, ton de la marque et connexions." />
      <SettingsForm merchant={data as MerchantSettings} />

      <section aria-label="Connexions et comptoir" className="mt-10">
        <h2 className="mb-4 font-semibold text-marine-900">Connexions et comptoir</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Upcoming icon={<Store className="size-5" aria-hidden="true" />} title="Caisse SumUp" text="Synchronisation horaire des ventes." step="étape 6" />
          <Upcoming icon={<FileSpreadsheet className="size-5" aria-hidden="true" />} title="Import CSV" text="Pour toutes les autres caisses (Zettle, export générique…)." step="étape 6" />
          <Upcoming icon={<QrCode className="size-5" aria-hidden="true" />} title="QR code du comptoir" text="À imprimer : vos clients s'inscrivent en 20 secondes." step="étape 2" />
        </div>
      </section>
    </>
  );
}

function Upcoming({ icon, title, text, step }: { icon: React.ReactNode; title: string; text: string; step: string }) {
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2 text-marine-800">
        {icon}
        <p className="font-medium">{title}</p>
      </div>
      <p className="text-sm text-muted">{text}</p>
      <p className="mt-2 text-xs text-muted">Arrive à l&apos;{step}</p>
    </Card>
  );
}
