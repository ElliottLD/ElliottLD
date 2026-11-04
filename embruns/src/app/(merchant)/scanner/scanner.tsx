"use client";

import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Camera, Gift, Search, Stamp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { findCustomers, stampCustomer, type FoundCustomer, type StampResult } from "./actions";

type Detector = { detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/** Page Scanner, pensée pour le téléphone du commerçant au comptoir. */
export function Scanner({ stampsRequired, rewardLabel }: { stampsRequired: number; rewardLabel: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundCustomer[] | null>(null);
  const [selected, setSelected] = useState<FoundCustomer | null>(null);
  const [amount, setAmount] = useState("");
  const [result, setResult] = useState<StampResult | null>(null);
  const [searching, startSearch] = useTransition();
  const [stamping, startStamp] = useTransition();
  const [cameraOn, setCameraOn] = useState(false);
  // Lecture caméra possible seulement si le navigateur connaît BarcodeDetector (faux côté serveur).
  const cameraSupported = useSyncExternalStore(
    () => () => {},
    () => "BarcodeDetector" in window && !!navigator.mediaDevices,
    () => false,
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  const search = (q: string) => {
    setResult(null);
    setSelected(null);
    startSearch(async () => {
      const found = await findCustomers(q);
      setResults(found);
      if (found.length === 1) setSelected(found[0]);
    });
  };

  // Lecture du QR de la carte avec l'API BarcodeDetector (Chrome Android, notamment).
  useEffect(() => {
    if (!cameraOn) return;
    let stream: MediaStream | null = null;
    let stopped = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
        const detector = new Ctor({ formats: ["qr_code"] });
        while (!stopped && videoRef.current) {
          const codes = await detector.detect(videoRef.current).catch(() => []);
          if (codes[0]?.rawValue) {
            setCameraOn(false);
            setQuery(codes[0].rawValue);
            search(codes[0].rawValue);
            break;
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setCameraOn(false);
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn]);

  const stamp = () => {
    if (!selected) return;
    startStamp(async () => {
      const r = await stampCustomer(selected.id, amount);
      setResult(r);
      if (r.status === "ok") {
        setSelected({ ...selected, stamps: r.stamps });
        setAmount("");
      }
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      {cameraSupported ? (
        cameraOn ? (
          <Card className="relative overflow-hidden p-0">
            <video ref={videoRef} className="aspect-square w-full bg-ink object-cover" muted playsInline />
            <button
              type="button"
              onClick={() => setCameraOn(false)}
              className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-ink"
              aria-label="Fermer la caméra"
            >
              <X className="size-5" />
            </button>
          </Card>
        ) : (
          <Button type="button" className="w-full py-4 text-base" onClick={() => setCameraOn(true)}>
            <Camera className="size-5" aria-hidden="true" /> Scanner la carte du client
          </Button>
        )
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
        className="space-y-1.5"
      >
        <Label htmlFor="scanner-q">{cameraSupported ? "Ou saisir" : "Saisir"} un téléphone, un email ou un prénom</Label>
        <div className="flex gap-2">
          <Input
            id="scanner-q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            inputMode="search"
            autoComplete="off"
            placeholder="06 12 34 56 78"
          />
          <Button type="submit" disabled={searching || query.trim().length < 2} aria-label="Rechercher">
            <Search className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </form>

      {results && !selected ? (
        results.length === 0 ? (
          <p className="text-center text-sm text-muted" role="status">
            Aucun client trouvé.
          </p>
        ) : (
          <ul className="divide-y divide-line/60 rounded-2xl bg-white ring-1 ring-line">
            {results.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setSelected(c)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-marine-50">
                  <span>
                    <span className="block font-medium text-ink">{c.firstName ?? "Client"}</span>
                    <span className="text-xs text-muted">{c.contact}</span>
                  </span>
                  <span className="text-sm tabular-nums text-muted">
                    {c.stamps} / {stampsRequired}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}

      {selected ? (
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold text-marine-900">{selected.firstName ?? "Client"}</p>
              <p className="text-xs text-muted">{selected.contact}</p>
            </div>
            <button type="button" onClick={() => { setSelected(null); setResult(null); }} className="text-sm text-muted hover:text-ink">
              Changer
            </button>
          </div>
          <div className="my-4 grid grid-cols-5 gap-2" role="img" aria-label={`${selected.stamps} tampons sur ${stampsRequired}`}>
            {Array.from({ length: stampsRequired }, (_, i) => (
              <span
                key={i}
                className={i < selected.stamps ? "aspect-square rounded-full bg-marine-800" : "aspect-square rounded-full border-2 border-dashed border-marine-100"}
              />
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Montant du ticket (facultatif)</Label>
            <Input id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="7,20" />
            <p className="text-xs text-muted">Sert à retrouver la vente de caisse correspondante (± 5 minutes).</p>
          </div>
          <Button type="button" variant="accent" className="mt-4 w-full py-4 text-base" disabled={stamping} onClick={stamp}>
            <Stamp className="size-5" aria-hidden="true" /> {stamping ? "Ajout…" : "Ajouter un tampon"}
          </Button>

          {result ? (
            <div className="mt-4 rounded-xl px-4 py-3 text-sm" role="status">
              {result.status === "ok" && result.reward ? (
                <p className="flex items-center gap-2 font-medium text-success">
                  <Gift className="size-5" aria-hidden="true" /> Carte complète : offrez {rewardLabel.toLowerCase()} ! La carte repart à zéro.
                </p>
              ) : result.status === "ok" ? (
                <p className="text-success">
                  Tampon ajouté : {result.stamps} / {result.stampsRequired}.
                  {result.matchedSale ? " Visite rattachée à la vente de caisse." : ""}
                </p>
              ) : result.status === "too_soon" ? (
                <p className="text-danger">
                  Déjà un tampon il y a moins de 2 heures. Prochain possible à{" "}
                  {new Date(result.nextAllowedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.
                </p>
              ) : (
                <p className="text-danger">{result.message}</p>
              )}
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
