import { ChapterList } from "@/components/ChapterList";
import { H1 } from "@/components/ui";

export const metadata = { title: "Chapitres — GMAT Quant" };

export default function ChaptersPage() {
  return (
    <div>
      <H1>Chapitres</H1>
      <ChapterList />
    </div>
  );
}
