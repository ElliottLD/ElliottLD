"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { replyToReview, type ReplyState } from "./actions";

export function ReplyForm({ reviewId }: { reviewId: string }) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyToReview, { status: "idle" });
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="secondary" className="mt-4" onClick={() => setOpen(true)}>
        Répondre
      </Button>
    );
  }
  return (
    <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <label htmlFor={`reply-${reviewId}`} className="sr-only">
        Votre réponse
      </label>
      <textarea
        id={`reply-${reviewId}`}
        name="reply"
        rows={4}
        required
        maxLength={1500}
        autoFocus
        placeholder="Bonjour, merci pour votre retour…"
        className="w-full rounded-lg border border-line bg-white px-3 py-2 text-base focus:border-marine-500 focus:outline-none"
      />
      {state.status === "error" ? (
        <p className="text-sm text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enregistrement…" : "Valider la réponse"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Annuler
        </Button>
        <span className="text-xs text-muted">La réponse proposée par l&apos;IA arrivera à l&apos;étape 3.</span>
      </div>
    </form>
  );
}
