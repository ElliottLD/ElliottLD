import { DemoBanner } from "@/components/demo-banner";
import { Logo } from "@/components/logo";
import { MobileMenu, MobileTabBar, SidebarNav } from "@/components/merchant-nav";
import { requireMerchant, requireUser } from "@/lib/merchant";

// La réinitialisation de la démo (action serveur) peut prendre ~20 s.
export const maxDuration = 60;

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const [user, merchant] = await Promise.all([requireUser(), requireMerchant()]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden flex-col bg-marine-900 px-4 py-6 lg:flex lg:sticky lg:top-0 lg:h-screen">
        <div className="px-2">
          <Logo inverted />
        </div>
        <div className="mt-6 rounded-lg bg-marine-800/60 px-3 py-2">
          <p className="text-xs text-marine-300">Commerce</p>
          <p className="truncate text-sm font-medium text-white">{merchant.name}</p>
        </div>
        <div className="mt-6 flex-1">
          <SidebarNav />
        </div>
        <SignOut email={user.email} />
      </aside>

      <header className="flex items-center justify-between bg-marine-900 px-4 py-3 lg:hidden">
        <Logo inverted />
        <MobileMenu />
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-8 lg:pb-12 lg:pt-10">
        {merchant.is_demo ? <DemoBanner /> : null}
        {children}
      </main>
      <MobileTabBar />
    </div>
  );
}

function SignOut({ email }: { email: string | null }) {
  return (
    <form action="/auth/deconnexion" method="post" className="border-t border-marine-800 px-2 pt-4">
      {email ? <p className="mb-2 truncate text-xs text-marine-300">{email}</p> : null}
      <button type="submit" className="text-sm text-marine-100 hover:text-white">
        Se déconnecter
      </button>
    </form>
  );
}
