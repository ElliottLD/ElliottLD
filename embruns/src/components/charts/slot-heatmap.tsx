import type { SlotCell } from "@/lib/analytics";
import { WEEKDAYS, formatEuros, formatInt } from "@/lib/format";

/**
 * Carte de chaleur jour × heure : séquentielle, une seule teinte (marine), du
 * clair au foncé, en 5 paliers avec légende. Chaque case porte sa valeur en
 * infobulle et pour les lecteurs d'écran.
 */
const STEPS = ["var(--color-marine-50)", "var(--color-marine-100)", "var(--color-marine-300)", "var(--color-marine-500)", "var(--color-marine-800)"];

export function SlotHeatmap({ cells }: { cells: SlotCell[] }) {
  const hours = [...new Set(cells.map((c) => c.hour))].sort((a, b) => a - b);
  const byKey = new Map(cells.map((c) => [`${c.isodow}-${c.hour}`, c]));
  const max = Math.max(...cells.map((c) => c.revenue), 1);
  const step = (v: number) => Math.min(STEPS.length - 1, Math.floor((v / max) * STEPS.length));

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-separate border-spacing-0.5 text-xs">
          <caption className="sr-only">Chiffre d&apos;affaires par jour de la semaine et par heure</caption>
          <thead>
            <tr>
              <th scope="col" className="w-20" />
              {hours.map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap px-0.5 pb-1 text-center font-normal text-muted tabular-nums">
                  {h} h
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {WEEKDAYS.map((day, i) => (
              <tr key={day}>
                <th scope="row" className="sticky left-0 bg-white pr-2 text-left font-normal text-muted">
                  {day}
                </th>
                {hours.map((h) => {
                  const c = byKey.get(`${i + 1}-${h}`);
                  const label = c ? `${day} ${h} h : ${formatEuros(c.revenue)}, ${formatInt(c.tickets)} tickets` : `${day} ${h} h : aucune vente`;
                  return (
                    <td key={h} className="p-0">
                      <div
                        title={label}
                        className="h-7 min-w-7 rounded-[4px] ring-marine-900 hover:ring-2"
                        style={{ background: c ? STEPS[step(c.revenue)] : "transparent", outline: c ? undefined : "1px dashed var(--color-line)" }}
                      >
                        <span className="sr-only">{label}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted" aria-hidden="true">
        <span>Moins</span>
        {STEPS.map((s) => (
          <span key={s} className="h-3 w-6 rounded-sm" style={{ background: s }} />
        ))}
        <span>Plus</span>
        <span className="ml-3 inline-block h-3 w-6 rounded-sm outline-1 outline-dashed outline-line" />
        <span>Fermé</span>
      </div>
    </div>
  );
}
