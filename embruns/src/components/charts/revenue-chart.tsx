"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDay, formatEuros, formatInt } from "@/lib/format";

export type RevenuePoint = { label: string; start: string; end?: string; revenue: number; tickets: number; days?: number; partial?: boolean };

/** Une seule série, une seule couleur ; le titre de la carte nomme la mesure. */
export function RevenueChart({ data, granularity }: { data: RevenuePoint[]; granularity: "day" | "week" }) {
  return (
    <div className="w-full">
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }} barCategoryGap={data.length > 60 ? 1 : "20%"}>
            <CartesianGrid vertical={false} stroke="var(--color-line)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--color-line)" }}
              tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={64}
              tick={{ fill: "var(--color-muted)", fontSize: 12 }}
              tickFormatter={(v: number) => formatEuros(v)}
            />
            <Tooltip
              cursor={{ fill: "var(--color-marine-50)" }}
              content={({ active, payload }) => {
                const p = active && payload?.[0] ? (payload[0].payload as RevenuePoint) : null;
                if (!p) return null;
                const title = granularity === "week" && p.end ? `Semaine du ${formatDay(p.start)} au ${formatDay(p.end)}` : formatDay(p.start);
                return (
                  <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-line">
                    <p className="font-medium text-marine-900">{title}</p>
                    <p className="tabular-nums text-ink">{p.tickets === 0 ? "Fermé ou aucune vente" : formatEuros(p.revenue)}</p>
                    {p.tickets > 0 ? <p className="tabular-nums text-muted">{formatInt(p.tickets)} tickets</p> : null}
                    {p.partial ? <p className="text-muted">Semaine incomplète sur la période</p> : null}
                  </div>
                );
              }}
            />
            <Bar dataKey="revenue" fill="var(--color-marine-700)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
              {data.map((p) => (
                <Cell key={p.start} fill={p.partial ? "var(--color-marine-300)" : "var(--color-marine-700)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {data.some((p) => p.partial) ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <span className="inline-block h-3 w-3 rounded-sm bg-marine-300" aria-hidden="true" />
          Semaine incomplète (début ou fin de période)
        </p>
      ) : null}
    </div>
  );
}
