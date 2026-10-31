import type { Metadata, Viewport } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "GMAT Quant — zéro lacune",
  description: "Remise à niveau GMAT Focus Quant avant le 4 janvier 2027.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Applique le thème avant le premier rendu (évite le flash blanc en mode sombre).
const themeScript = `try{var t=localStorage.getItem("gmat-quant:theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <Nav />
        <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
