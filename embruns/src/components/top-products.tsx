import type { ProductRow } from "@/lib/analytics";
import { formatChange, formatEuros, formatInt, relativeChange } from "@/lib/format";
import { cn } from "@/lib/utils";

function Change({ current, previous, comparable }: { current: number; previous: number; comparable: boolean }) {
  if (!comparable) return <span className="text-muted">—</span>;
  const change = relativeChange(current, previous);
  if (change === null) return <span className="text-muted">nouveau</span>;
  return (
    <span className={cn("tabular-nums", change >= 0.005 ? "text-success" : change <= -0.005 ? "text-danger" : "text-muted")}>
      {formatChange(change)}
    </span>
  );
}

/** Top 10 produits, par CA ou par quantité, avec l'évolution vs la période précédente. */
export function TopProductsTable({ rows, by }: { rows: ProductRow[]; by: "revenue" | "quantity" }) {
  // Sans aucune vente sur la période précédente, aucune évolution n'a de sens.
  const comparable = rows.some((r) => r.previousRevenue > 0);
  const sorted = [...rows]
    .filter((r) => (by === "revenue" ? r.rankRevenue : r.rankQuantity) <= 10)
    .sort((a, b) => (by === "revenue" ? a.rankRevenue - b.rankRevenue : a.rankQuantity - b.rankQuantity));
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-line text-left text-muted">
          <th scope="col" className="w-8 py-2 font-normal">#</th>
          <th scope="col" className="py-2 font-normal">Produit</th>
          <th scope="col" className="py-2 pl-3 text-right font-normal">{by === "revenue" ? "CA" : "Quantité"}</th>
          <th scope="col" className="py-2 pl-3 text-right font-normal">Évolution</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r, i) => (
          <tr key={r.name} className="border-b border-line/60 last:border-0">
            <td className="py-2 text-muted tabular-nums">{i + 1}</td>
            <td className="py-2">
              <span className="text-ink">{r.name}</span>
              {r.category ? <span className="ml-2 text-xs text-muted">{r.category}</span> : null}
            </td>
            <td className="whitespace-nowrap py-2 pl-3 text-right tabular-nums">{by === "revenue" ? formatEuros(r.revenue) : formatInt(r.quantity)}</td>
            <td className="whitespace-nowrap py-2 pl-3 text-right">
              {by === "revenue" ? <Change current={r.revenue} previous={r.previousRevenue} comparable={comparable} /> : <Change current={r.quantity} previous={r.previousQuantity} comparable={comparable} />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
