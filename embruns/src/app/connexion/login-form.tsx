"use client";

import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { sendMagicLink, type MagicLinkState } from "./actions";

export function LoginForm({ suite }: { suite?: string }) {
  const [state, action, pending] = useActionState<MagicLinkState, FormData>(sendMagicLink, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="text-center" role="status">
        <MailCheck className="mx-auto size-10 text-success" aria-hidden="true" />
        <h2 className="mt-4 text-lg font-semibold text-marine-900">Vérifiez votre boîte mail</h2>
        <p className="mt-2 text-muted">
          Un lien de connexion a été envoyé à <strong className="text-ink">{state.email}</strong>. Il est valable une heure.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {suite ? <input type="hidden" name="suite" value={suite} /> : null}
      <div className="space-y-1.5">
        <Label htmlFor="email">Adresse email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="vous@boulangerie.fr" />
      </div>
      {state.status === "error" ? (
        <p className="text-sm text-danger" role="alert">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Envoi…" : "Recevoir un lien de connexion"}
      </Button>
      <p className="text-center text-xs text-muted">Pas de mot de passe : un lien à usage unique arrive par email.</p>
    </form>
  );
}
