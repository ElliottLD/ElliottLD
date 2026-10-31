"use client";

import { useSyncExternalStore } from "react";
import type { Attempt, ErrorEntry } from "./types";

/** Toute la progression, sérialisée dans localStorage sous une seule clé. */
export interface Store {
  version: 1;
  attempts: Attempt[];
  errors: ErrorEntry[];
  /** Temps de travail hors exercices (lecture du cours), agrégé par jour et par chapitre. */
  study: StudyEntry[];
}

export interface StudyEntry {
  day: string; // AAAA-MM-JJ (local)
  chapter: string;
  seconds: number;
}

const KEY = "gmat-quant:v1";
const EMPTY: Store = { version: 1, attempts: [], errors: [], study: [] };

let cacheRaw: string | null | undefined;
let cacheValue: Store = EMPTY;
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function normalize(data: unknown): Store {
  const d = (data ?? {}) as Partial<Store>;
  return {
    version: 1,
    attempts: Array.isArray(d.attempts) ? d.attempts : [],
    errors: Array.isArray(d.errors) ? d.errors : [],
    study: Array.isArray(d.study) ? d.study : [],
  };
}

export function loadStore(): Store {
  const raw = readRaw();
  if (raw === cacheRaw) return cacheValue;
  cacheRaw = raw;
  try {
    cacheValue = raw ? normalize(JSON.parse(raw)) : EMPTY;
  } catch {
    cacheValue = EMPTY;
  }
  return cacheValue;
}

function saveStore(next: Store): void {
  const raw = JSON.stringify(next);
  try {
    window.localStorage.setItem(KEY, raw);
  } catch {
    // Stockage indisponible (navigation privée, quota) : on garde l'état en mémoire pour la session.
  }
  cacheRaw = raw;
  cacheValue = next;
  listeners.forEach((l) => l());
}

export function updateStore(fn: (s: Store) => Store): void {
  saveStore(fn(loadStore()));
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Hook React : renvoie la progression (vide côté serveur, puis réelle après hydratation). */
export function useStore(): Store {
  return useSyncExternalStore(subscribe, loadStore, () => EMPTY);
}

/** true une fois monté côté client (évite d'afficher des zéros trompeurs pendant l'hydratation). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// ───── Actions ─────

export function recordAttempt(a: Attempt): void {
  updateStore((s) => ({ ...s, attempts: [...s.attempts, a] }));
}

export function addError(e: Omit<ErrorEntry, "id">): void {
  const id = `${e.questionId}@${e.date}`;
  updateStore((s) => ({ ...s, errors: [...s.errors.filter((x) => x.id !== id), { ...e, id }] }));
}

export function updateError(id: string, patch: Partial<ErrorEntry>): void {
  updateStore((s) => ({ ...s, errors: s.errors.map((e) => (e.id === id ? { ...e, ...patch } : e)) }));
}

export function deleteError(id: string): void {
  updateStore((s) => ({ ...s, errors: s.errors.filter((e) => e.id !== id) }));
}

export function localDay(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addStudyTime(chapter: string, seconds: number): void {
  const day = localDay();
  updateStore((s) => {
    const found = s.study.find((x) => x.day === day && x.chapter === chapter);
    const study = found
      ? s.study.map((x) => (x === found ? { ...x, seconds: x.seconds + seconds } : x))
      : [...s.study, { day, chapter, seconds }];
    return { ...s, study };
  });
}

// ───── Export / import ─────

export function exportJson(): string {
  return JSON.stringify({ ...loadStore(), exportedAt: new Date().toISOString() }, null, 2);
}

export function importJson(text: string): { ok: true } | { ok: false; error: string } {
  try {
    const data = JSON.parse(text);
    if (!data || typeof data !== "object" || !Array.isArray(data.attempts)) {
      return { ok: false, error: "Fichier non reconnu : il ne contient pas de progression." };
    }
    saveStore(normalize(data));
    return { ok: true };
  } catch {
    return { ok: false, error: "Fichier JSON invalide." };
  }
}

export function resetStore(): void {
  saveStore(EMPTY);
}
