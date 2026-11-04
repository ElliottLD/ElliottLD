import { SEGMENTS, type SegmentKey } from "@/lib/segments";
import { cn } from "@/lib/utils";

/** Le libellé porte l'information ; la couleur ne fait que l'accompagner. */
export function SegmentBadge({ segment, className }: { segment: SegmentKey; className?: string }) {
  const s = SEGMENTS[segment];
  return (
    <span title={s.rule} className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", s.tone, className)}>
      {s.singular}
    </span>
  );
}
