"use client";
import { btn } from "./ui";
export function PrintButton() {
  return (
    <button className={`${btn} no-print`} onClick={() => window.print()}>
      Imprimer
    </button>
  );
}
