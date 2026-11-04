import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

// Page publique minimale ; la vraie page de présentation arrive à l'étape 8.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col bg-marine-900 text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6 sm:px-8">
        <Logo inverted />
        <ButtonLink href="/connexion" variant="secondary">
          Espace commerçant
        </ButtonLink>
      </header>
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 pb-24 sm:px-8">
        <p className="text-sm font-medium uppercase tracking-widest text-corail-500">Commerces de quartier</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Chaque lundi, savoir ce qui a marché et quoi faire cette semaine.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-marine-100">
          Embruns transforme les ventes de caisse en clients connus, en indicateurs clairs et en actions prêtes à lancer en un clic.
        </p>
        <div className="mt-10">
          <ButtonLink href="/connexion" variant="accent">
            Se connecter
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
