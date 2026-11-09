"use client";

import { useActionState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { addCompetitorPrice, applyRecommendation, ignoreRecommendation, type ActionState } from "../actions";

export function RecommendationActions({ recommendationId, price }: { recommendationId: string; price: string }) {
  const [applyState, apply, applying] = useActionState<ActionState, FormData>(applyRecommendation, { status: "idle" });
  const [ignoreState, ignore, ignoring] = useActionState<ActionState, FormData>(ignoreRecommendation, { status: "idle" });
  const error = applyState.status === "error" ? applyState.message : ignoreState.status === "error" ? ignoreState.message : null;
  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        <form action={apply}>
          <input type="hidden" name="recommendationId" value={recommendationId} />
          <Button type="submit" variant="accent" disabled={applying || ignoring}>
            {applying ? "Application…" : `Appliquer ${price}`}
          </Button>
        </form>
        <form action={ignore}>
          <input type="hidden" name="recommendationId" value={recommendationId} />
          <Button type="submit" variant="secondary" disabled={applying || ignoring}>
            {ignoring ? "…" : "Ignorer"}
          </Button>
        </form>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mt-2 text-xs text-muted">Appliquer met à jour le prix dans Embruns ; pensez à le changer aussi en caisse.</p>
    </div>
  );
}

export function CompetitorForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addCompetitorPrice, { status: "idle" });
  return (
    <form action={action} className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
      <input type="hidden" name="productId" value={productId} />
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="competitorName">Concurrent</Label>
        <Input id="competitorName" name="competitorName" required maxLength={80} placeholder="Boulangerie du Port" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="price">Prix</Label>
        <Input id="price" name="price" required inputMode="decimal" placeholder="1,35" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="observedAt">Relevé le</Label>
        <Input id="observedAt" name="observedAt" type="date" />
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {pending ? "Ajout…" : "Ajouter le prix"}
      </Button>
      {state.status === "error" ? (
        <p className="text-sm text-danger sm:col-span-2" role="alert">
          {state.message}
        </p>
      ) : null}
      {state.status === "done" ? (
        <p className="flex items-center gap-1 text-sm text-success sm:col-span-2" role="status">
          <Check className="size-4" aria-hidden="true" /> Prix ajouté, indice recalculé.
        </p>
      ) : null}
    </form>
  );
}
