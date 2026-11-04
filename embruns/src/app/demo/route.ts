import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEMO_EMAIL, ensureDemoMerchant, regenerateDemo } from "@/lib/demo/server";
import { localToday } from "@/lib/periods";

/**
 * « Explorer la démo » : connecte le visiteur au compte de démo partagé, sans
 * email. Le commerce de démo est régénéré au premier passage de la journée
 * pour que les données restent datées par rapport à aujourd'hui.
 */
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const redirectTo = (pathname: string, params?: Record<string, string>) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
    return NextResponse.redirect(url, { status: 303 });
  };

  try {
    const admin = createAdminClient();

    // Compte de démo (créé une fois, adresse confirmée, aucun email envoyé).
    const created = await admin.auth.admin.createUser({ email: DEMO_EMAIL, email_confirm: true });
    if (created.error && created.error.code !== "email_exists") throw created.error;

    // Lien de connexion généré côté serveur : rien n'est envoyé par email.
    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });
    if (linkError) throw linkError;

    const merchant = await ensureDemoMerchant(admin, link.user.id);
    if (merchant.demo_generated_on !== localToday(merchant.timezone)) {
      await regenerateDemo(admin, merchant.id);
    }

    const supabase = await createClient();
    const { error: otpError } = await supabase.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
    if (otpError) throw otpError;

    return redirectTo("/accueil");
  } catch (error) {
    console.error("Accès à la démo impossible", error);
    return redirectTo("/connexion", { erreur: "demo" });
  }
}
