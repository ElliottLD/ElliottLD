import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/env";
import { DemoAccess } from "./demo-access";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

const ERRORS: Record<string, string> = {
  lien: "Ce lien de connexion est invalide ou a expiré. Demandez-en un nouveau.",
  demo: "La démo est momentanément indisponible. Réessayez dans un instant.",
};

export default async function LoginPage({ searchParams }: PageProps<"/connexion">) {
  const params = await searchParams;
  const suite = typeof params.suite === "string" ? params.suite : undefined;
  const error = typeof params.erreur === "string" ? ERRORS[params.erreur] : undefined;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-marine-900 px-4 py-12">
      <Link href="/" className="mb-8">
        <Logo inverted />
      </Link>
      <Card className="w-full max-w-sm p-8">
        <h1 className="text-xl font-semibold text-marine-900">Espace commerçant</h1>
        <p className="mb-6 mt-1 text-sm text-muted">Connectez-vous pour retrouver votre tableau de bord.</p>
        {error ? (
          <p className="mb-4 rounded-lg bg-corail-100 px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {isSupabaseConfigured() ? (
          <>
            <LoginForm suite={suite} />
            <DemoAccess />
          </>
        ) : (
          <p className="rounded-lg bg-marine-50 px-3 py-3 text-sm text-marine-800" role="status">
            La connexion n&apos;est pas encore ouverte : la base de données n&apos;est pas branchée sur ce déploiement.
          </p>
        )}
      </Card>
    </main>
  );
}
