import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ComponentProps } from "react";

const VARIANTS = {
  primary: "bg-marine-900 text-white hover:bg-marine-800",
  accent: "bg-corail-500 text-white hover:bg-corail-600",
  secondary: "bg-white text-marine-900 ring-1 ring-inset ring-line hover:bg-marine-50",
  ghost: "text-marine-800 hover:bg-marine-50",
} as const;

type Variant = keyof typeof VARIANTS;

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={cn(base, VARIANTS[variant], className)} {...props} />;
}

export function ButtonLink({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={cn(base, VARIANTS[variant], className)} {...props} />;
}
