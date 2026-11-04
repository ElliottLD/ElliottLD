"use client";

import { useState } from "react";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Accès direct au commerce de démo « Au Pain Doré », sans inscription. */
export function DemoAccess() {
  const [pending, setPending] = useState(false);
  return (
    <form action="/demo" method="post" onSubmit={() => setPending(true)} className="mt-6 border-t border-line pt-6">
      <p className="mb-3 text-center text-sm text-muted">Pas encore de compte ?</p>
      <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
        <Store className="size-4" aria-hidden="true" />
        {pending ? "Préparation de la boulangerie…" : "Explorer la démo « Au Pain Doré »"}
      </Button>
      {pending ? (
        <p className="mt-2 text-center text-xs text-muted" role="status">
          Première visite du jour : génération d&apos;un an de ventes, une vingtaine de secondes.
        </p>
      ) : null}
    </form>
  );
}
