import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-medium text-corail-500">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-marine-900">Page introuvable</h1>
      <p className="mt-2 text-muted">Cette page n&apos;existe pas ou a été déplacée.</p>
      <ButtonLink href="/" className="mt-6">
        Retour à l&apos;accueil
      </ButtonLink>
    </main>
  );
}
