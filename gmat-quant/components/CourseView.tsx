import { Markdown } from "./Markdown";
import { Card } from "./ui";
import { LEVEL_LABEL, type Course } from "@/lib/types";

export function CourseView({ course }: { course: Course }) {
  return (
    <article className="space-y-8">
      <Section n={1} title="Pourquoi c'est au GMAT">
        <Markdown>{course.why}</Markdown>
      </Section>
      <Section n={2} title="Rappels de base">
        <Markdown>{course.basics}</Markdown>
      </Section>
      <Section n={3} title="Règles et formules clés">
        <div className="grid gap-3">
          {course.rules.map((r, i) => (
            <div key={i} className="rounded-md border-2 border-emerald-600/60 bg-emerald-50/50 px-4 py-2 dark:bg-emerald-950/20">
              <Markdown>{r}</Markdown>
            </div>
          ))}
        </div>
      </Section>
      <Section n={4} title="Méthodes rapides (sans calculatrice)">
        <Markdown>{course.methods}</Markdown>
      </Section>
      <Section n={5} title="Pièges classiques du GMAT">
        <Markdown>{course.traps}</Markdown>
      </Section>
      <Section n={6} title="Exemples résolus pas à pas">
        <div className="space-y-4">
          {course.examples.map((ex, i) => (
            <Card key={i}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Exemple {i + 1} · {LEVEL_LABEL[ex.level]}
              </p>
              <Markdown>{ex.prompt}</Markdown>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold">Voir la résolution</summary>
                <div className="mt-2">
                  <Markdown>{ex.steps}</Markdown>
                </div>
              </details>
            </Card>
          ))}
        </div>
      </Section>
    </article>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold">
        <span className="mr-2 text-zinc-400">{n}.</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function SummarySheet({ course, title }: { course: Course; title: string }) {
  return (
    <article className="text-[15px]">
      <h2 className="mb-3 text-xl font-semibold">Fiche récap — {title}</h2>
      <Markdown>{course.summary}</Markdown>
    </article>
  );
}
