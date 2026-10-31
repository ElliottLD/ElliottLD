import { CHAPTERS } from "@/content/program";
import { getCourse } from "@/content";
import { Markdown } from "@/components/Markdown";
import { H1 } from "@/components/ui";
import { PrintButton } from "@/components/PrintButton";

export const metadata = { title: "Formulaire — GMAT Quant" };

export default function FormulairePage() {
  const chapters = CHAPTERS.map((c) => ({ c, course: getCourse(c.id) })).filter((x) => x.course);
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <H1>Formulaire</H1>
        <PrintButton />
      </div>
      <p className="no-print mb-6 text-sm text-zinc-500">Toutes les règles et formules clés des chapitres rédigés. Le formulaire s'enrichit à chaque chapitre livré.</p>
      <div className="space-y-6">
        {chapters.map(({ c, course }) => (
          <section key={c.id} className="break-inside-avoid">
            <h2 className="mb-2 text-lg font-semibold">
              {c.id}. {c.title}
            </h2>
            <ul className="space-y-1">
              {course!.rules.map((r, i) => (
                <li key={i} className="border-l-2 border-emerald-600/60 pl-3">
                  <Markdown>{r}</Markdown>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
