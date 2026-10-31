import { ALL_NOTIONS } from "@/content/program";
import { getQuestions } from "@/content";
import { notionReport, type NotionReport } from "./progress";
import type { Store } from "./storage";

export function allNotionReports(store: Store): (NotionReport & { id: string; label: string; chapter: string })[] {
  return ALL_NOTIONS.map((n) => ({ ...n, ...notionReport(n.id, getQuestions(n.chapter), store.attempts, store.errors) }));
}
