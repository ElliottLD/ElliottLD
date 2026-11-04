import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { getCurrentMerchant } from "@/lib/merchant";
import { MerchantForm } from "./merchant-form";

export const metadata: Metadata = { title: "Votre commerce" };

export default async function NewMerchantPage() {
  if (await getCurrentMerchant()) redirect("/accueil");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Logo className="mb-8" />
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-semibold text-marine-900">Bienvenue sur Embruns</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Présentez-nous votre commerce. Vous pourrez tout modifier dans les Réglages.</p>
        <MerchantForm />
      </Card>
    </main>
  );
}
