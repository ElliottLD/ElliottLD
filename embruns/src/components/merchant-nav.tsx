"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, Mail, MessageCircle, ScanLine, Settings, Star, Tag, Users, type LucideIcon } from "lucide-react";
import { MERCHANT_NAV, type NavIcon } from "@/lib/routes";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, LucideIcon> = {
  home: Home,
  chart: BarChart3,
  users: Users,
  star: Star,
  tag: Tag,
  mail: Mail,
  chat: MessageCircle,
  settings: Settings,
  scan: ScanLine,
};

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Navigation latérale (ordinateur). */
export function SidebarNav() {
  const isActive = useIsActive();
  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-1">
      {MERCHANT_NAV.map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-marine-800 text-white" : "text-marine-100 hover:bg-marine-800/60 hover:text-white",
            )}
          >
            <Icon className="size-4.5" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Barre d'onglets du bas (mobile) : les écrans les plus utilisés au comptoir. */
const MOBILE_ITEMS = ["/accueil", "/scanner", "/clients", "/avis", "/reglages"];

export function MobileTabBar() {
  const isActive = useIsActive();
  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {MERCHANT_NAV.filter((item) => MOBILE_ITEMS.includes(item.href)).map(({ href, label, icon }) => {
        const Icon = ICONS[icon];
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", active ? "text-marine-900" : "text-muted")}
          >
            <Icon className={cn("size-5", active && "text-corail-500")} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Menu complet en haut de l'écran mobile. */
export function MobileMenu() {
  const isActive = useIsActive();
  return (
    <details className="group relative lg:hidden">
      <summary className="cursor-pointer list-none rounded-lg px-3 py-2 text-sm font-medium text-white ring-1 ring-marine-700">Menu</summary>
      <div className="absolute right-0 z-30 mt-2 w-56 rounded-xl bg-marine-900 p-2 shadow-xl ring-1 ring-marine-700">
        {MERCHANT_NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn("block rounded-lg px-3 py-2 text-sm", isActive(href) ? "bg-marine-800 text-white" : "text-marine-100")}
          >
            {label}
          </Link>
        ))}
      </div>
    </details>
  );
}
