import { cn } from "@/lib/utils";

/** Marque Embruns : une vague stylisée et le nom. */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-7 shrink-0">
        <rect width="32" height="32" rx="9" className={inverted ? "fill-ecume" : "fill-marine-900"} />
        <path
          d="M6 19c3 0 3-3 6-3s3 3 6 3 3-3 6-3 2 1.5 2 1.5"
          fill="none"
          strokeWidth="2.4"
          strokeLinecap="round"
          className={inverted ? "stroke-marine-900" : "stroke-ecume"}
        />
        <circle cx="22" cy="10" r="2.2" className="fill-corail-500" />
      </svg>
      <span className={cn("text-lg", inverted ? "text-ecume" : "text-marine-900")}>Embruns</span>
    </span>
  );
}
