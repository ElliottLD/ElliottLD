"use client";

import { useRef, useState } from "react";
import { exportJson, importJson, resetStore, useStore } from "@/lib/storage";
import { Card, btn, btnPrimary } from "./ui";

export function Backup() {
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function doExport() {
    const url = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `gmat-quant-progression-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(file: File) {
    if (!confirm("Remplacer la progression actuelle par celle du fichier ?")) return;
    const r = importJson(await file.text());
    setMsg(r.ok ? "Progression importée." : r.error);
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-sm">
          La progression est enregistrée uniquement dans ce navigateur : {store.attempts.length} réponses, {store.errors.length} entrées au journal.
          Exportez-la régulièrement (une fois par semaine), et pour changer d'appareil : exporter ici, importer sur l'autre appareil.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className={btnPrimary} onClick={doExport}>
            Exporter (JSON)
          </button>
          <button className={btn} onClick={() => input.current?.click()}>
            Importer un fichier…
          </button>
          <input ref={input} type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        </div>
        {msg && <p className="mt-2 text-sm">{msg}</p>}
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold text-red-700 dark:text-red-400">Zone de danger</h2>
        <button className={btn} onClick={() => confirm("Effacer toute la progression ? Exportez-la d'abord.") && resetStore()}>
          Tout effacer
        </button>
      </Card>
    </div>
  );
}
