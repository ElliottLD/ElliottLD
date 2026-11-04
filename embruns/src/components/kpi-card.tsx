import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiDelta = {
  /** Texte déjà formaté : « +12,3 % » ou « +2,4 pts ». */
  text: string;
  /** Sens de la variation. */
  direction: "up" | "down" | "flat";
};

/** Tuile de KPI : la valeur, puis sa variation vs la période précédente (icône + texte, jamais la couleur seule). */
export function KpiCard({
  label,
  value,
  delta,
  comparison,
  hint,
}: {
  label: string;
  value: string;
  delta: KpiDelta | null;
  comparison: string;
  /** Texte affiché à la place de la variation, quand il n'y a pas de comparaison. */
  hint?: string;
}) {
  const Icon = delta?.direction === "up" ? ArrowUpRight : delta?.direction === "down" ? ArrowDownRight : ArrowRight;
  return (
    <Card className="p-4 sm:p-5">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold sm:text-2xl tracking-tight text-marine-900 tabular-nums">{value}</p>
      <p className="mt-2 flex flex-wrap items-center gap-x-1 text-sm">
        {delta ? (
          <>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium tabular-nums",
                delta.direction === "up" && "text-success",
                delta.direction === "down" && "text-danger",
                delta.direction === "flat" && "text-muted",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {delta.text}
            </span>
            <span className="text-muted">{comparison}</span>
          </>
        ) : (
          <span className="text-muted">{hint ?? "Pas de comparaison possible"}</span>
        )}
      </p>
    </Card>
  );
}
