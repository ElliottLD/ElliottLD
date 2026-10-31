import type { Course, Question } from "@/lib/types";
import { CHAPTERS } from "./program";
import * as A3 from "./chapters/A3/course";
import * as A3q from "./chapters/A3/questions";

/** Chapitres dont le contenu est rédigé. Ajouter une ligne par chapitre livré. */
const CONTENT: Record<string, { course: Course; questions: Question[] }> = {
  A3: { course: A3.course, questions: A3q.questions },
};

export function getCourse(chapter: string): Course | undefined {
  return CONTENT[chapter]?.course;
}

export function getQuestions(chapter: string): Question[] {
  return CONTENT[chapter]?.questions ?? [];
}

export function hasContent(chapter: string): boolean {
  return chapter in CONTENT;
}

export const ALL_QUESTIONS: Question[] = CHAPTERS.flatMap((c) => getQuestions(c.id));

export function getQuestion(id: string): Question | undefined {
  return ALL_QUESTIONS.find((q) => q.id === id);
}
