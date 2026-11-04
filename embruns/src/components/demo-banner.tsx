"use client";

import { useActionState } from "react";
import { RotateCcw } from "lucide-react";
import { resetDemo, type ResetDemoState } from "@/app/(merchant)/demo-actions";

/** Bandeau du mode démo, avec la réinitialisation des données. */
export function DemoBanner() {
  const [state, action, pending] = useActionState<ResetDemoState>(resetDemo, { status: "idle" });
  return (
    <div className="mb-6 flex flex-col gap-2 rounded-xl bg-corail-100 px-4 py-3 text-sm text-ink sm:flex-row sm:items-center sm:justify-between">
      <p>
        <strong className="font-semibold">Mode démo</strong> · boulangerie fictive, données générées et datées
        d&apos;aujourd&apos;hui. Aucun email n&apos;est envoyé.
      </p>
      <form action={action} className="flex items-center gap-3">
        {state.status === "error" ? (
          <span className="text-danger" role="alert">
            {state.message}
          </span>
        ) : null}
        {pending ? (
          <span className="text-muted" role="status">
            Régénération, une vingtaine de secondes…
          </span>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 font-medium text-marine-900 ring-1 ring-inset ring-line hover:bg-marine-50 disabled:opacity-50"
        >
          <RotateCcw className={pending ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
          Réinitialiser la démo
        </button>
      </form>
    </div>
  );
}
