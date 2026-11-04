import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Connexion" };

const ERRORS: Record<string, string> = {
  lien: "Ce lien de connexion est invalide ou a expiré. Demandez-en un nouveau.",
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
        <LoginForm suite={suite} />
      </Card>
    </main>
  );
}
