import Link from "next/link";
import { notFound } from "next/navigation";
import { CHAPTERS, getChapterInfo } from "@/content/program";
import { getCourse, hasContent } from "@/content";
import { ChapterView } from "@/components/ChapterView";
import { CourseView, SummarySheet } from "@/components/CourseView";
import { Card } from "@/components/ui";

export function generateStaticParams() {
  return CHAPTERS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const info = getChapterInfo(id);
  return { title: info ? `${info.id} · ${info.title} — GMAT Quant` : "Chapitre" };
}

export default async function ChapterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const info = getChapterInfo(id);
  if (!info) notFound();
  const course = getCourse(id);

  return (
    <div>
      <p className="no-print mb-1 text-sm text-zinc-500">
        <Link href="/chapitres" className="underline">
          Chapitres
        </Link>{" "}
        · Bloc {info.block}
      </p>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">
        {info.id}. {info.title}
      </h1>
      {course && hasContent(id) ? (
        <ChapterView chapter={id} course={<CourseView course={course} />} summary={<SummarySheet course={course} title={`${info.id}. ${info.title}`} />} />
      ) : (
        <Card>
          <p className="mb-2">
            Ce chapitre n'est pas encore rédigé : il sera livré au moins une semaine avant sa date dans le calendrier. Pour l'instant, seul le chapitre pilote{" "}
            <Link href="/chapitres/A3" className="font-semibold underline">
              A3 Pourcentages
            </Link>{" "}
            a son cours et ses exercices.
          </p>
          <p className="mb-1 text-sm font-semibold">Notions de ce chapitre :</p>
          <ul className="list-disc pl-6 text-sm">
            {info.notions.map((n) => (
              <li key={n.id}>{n.label}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
