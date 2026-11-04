import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl bg-white p-6 ring-1 ring-line", className)} {...props} />;
}
