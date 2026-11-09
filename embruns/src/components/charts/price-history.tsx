"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDay, formatEurosCents, formatInt } from "@/lib/format";

export type WeekPoint = { weekStart: string; label: string; quantity: number; price: number };

const axis = { tickLine: false, tick: { fill: "var(--color-muted)", fontSize: 12 } } as const;

function Tip({ active, payload }: { active?: boolean; payload?: { payload: WeekPoint }[] }) {
  const p = active && payload?.[0] ? payload[0].payload : null;
  if (!p) return null;
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-lg ring-1 ring-line">
      <p className="font-medium text-marine-900">Semaine du {formatDay(p.weekStart)}</p>
      <p className="tabular-nums">{formatInt(p.quantity)} vendus</p>
      <p className="tabular-nums text-muted">Prix moyen {formatEurosCents(p.price)}</p>
    </div>
  );
}

/**
 * Ventes hebdomadaires et prix pratiqué : deux graphiques alignés plutôt
 * qu'un seul à deux axes (deux unités différentes).
 */
export function PriceHistory({ data }: { data: WeekPoint[] }) {
  const prices = data.map((d) => d.price);
  // Graduations : uniquement les niveaux de prix réellement pratiqués.
  const levels = [...new Set(prices)].sort((a, b) => a - b);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = Math.max(0.05, (max - min) * 0.5);
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-1 text-xs font-medium text-muted">Quantités vendues par semaine</p>
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} syncId="price-history">
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="label" {...axis} axisLine={{ stroke: "var(--color-line)" }} minTickGap={16} />
              <YAxis {...axis} axisLine={false} width={48} tickFormatter={(v: number) => formatInt(v)} />
              <Tooltip cursor={{ fill: "var(--color-marine-50)" }} content={<Tip />} />
              <Bar dataKey="quantity" fill="var(--color-marine-700)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-medium text-muted">Prix moyen pratiqué</p>
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 8 }} syncId="price-history">
              <CartesianGrid vertical={false} stroke="var(--color-line)" />
              <XAxis dataKey="label" {...axis} axisLine={{ stroke: "var(--color-line)" }} minTickGap={16} />
              <YAxis {...axis} axisLine={false} width={48} domain={[Math.max(0, min - pad), max + pad]} ticks={levels.length <= 6 ? levels : undefined} tickFormatter={(v: number) => formatEurosCents(v)} />
              <Tooltip content={<Tip />} />
              <Line type="stepAfter" dataKey="price" stroke="var(--color-corail-600)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
