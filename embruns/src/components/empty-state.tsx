import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

/** État vide : dit ce qui apparaîtra ici et, si possible, quoi faire. */
export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      {icon ? <div className="mb-4 rounded-full bg-marine-50 p-3 text-marine-700">{icon}</div> : null}
      <h2 className="text-lg font-semibold text-marine-900">{title}</h2>
      {children ? <div className="mt-2 max-w-md text-muted">{children}</div> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </Card>
  );
}
