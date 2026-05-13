import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { initDb, dbGet } from "@/lib/db";
import Link from "next/link";

export default async function HomePage() {
  const session = getSession();
  if (session) {
    if (session.role === "admin")   redirect("/admin");
    if (session.role === "medecin") redirect("/medecin");
    if (session.role === "patient") redirect("/login");
  }

  let etablissement = "CMA de Boromo";
  try {
    await initDb();
    const s = await dbGet("SELECT value FROM settings WHERE key = $1", ['etablissement_nom']);
    if (s?.value) etablissement = s.value;
  } catch {}

  return (
    <div
      className="h-screen flex flex-col overflow-hidden text-white"
      style={{ background: "linear-gradient(160deg,#0b1f14 0%,#0c1c1a 50%,#0a1720 100%)" }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="lp-grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path d="M 64 0 L 0 0 0 64" fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="1440" height="900" fill="url(#lp-grid)"/>
          <circle cx="80"   cy="160"  r="380" fill="rgba(22,163,74,0.05)"/>
          <circle cx="1400" cy="750"  r="450" fill="rgba(13,148,136,0.05)"/>
          <circle cx="780"  cy="-60"  r="260" fill="rgba(22,163,74,0.03)"/>
          <polyline points="0,780 280,780 340,680 400,880 460,740 520,780 1440,780"
            fill="none" stroke="rgba(22,163,74,0.13)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* ── Navbar ── */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5 flex-shrink-0">
        <p className="font-bold text-white/70 text-sm uppercase tracking-[0.18em]">Service de consultation médecin</p>
        <p className="text-white/25 text-xs uppercase tracking-[0.2em] hidden sm:block">Système de gestion des consultations</p>
      </nav>

      {/* ── Titre centré ── */}
      <div className="relative z-10 text-center pt-6 pb-4 flex-shrink-0">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
          <span style={{ backgroundImage: "linear-gradient(90deg,#4ade80,#2dd4bf,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {etablissement}
          </span>
        </h1>
        <p className="text-white/35 text-xs uppercase tracking-[0.28em] mt-2">Système de gestion des consultations</p>
      </div>

      {/* ── Corps : quote gauche + cartes droite ── */}
      <div className="relative z-10 flex-1 flex items-stretch px-6 md:px-14 pb-6 gap-8 overflow-hidden">

        {/* Colonne gauche — Serment d'Hippocrate */}
        <div className="flex-1 flex flex-col justify-center pt-6">
          <div
            className="relative rounded-3xl p-8 border border-white/10 h-full flex flex-col justify-center"
            style={{ background: "rgba(255,255,255,0.03)", backdropFilter: "blur(12px)" }}
          >
            {/* Badge */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <div
                className="px-5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest border border-primary-500/40"
                style={{ background: "rgba(22,101,52,0.6)", color: "#86efac", backdropFilter: "blur(8px)" }}
              >
                Extrait du serment d'Hippocrate
              </div>
            </div>

            <div className="text-center mb-4">
              <div className="w-20 h-px mx-auto" style={{ background: "linear-gradient(90deg,transparent,rgba(74,222,128,0.4),transparent)" }} />
            </div>

            <blockquote className="text-white/65 text-base leading-[2] italic text-center">
              « Je ne ferai jamais usage de mes connaissances contre les lois de l'humanité.
              Je ferai tout pour soulager les souffrances.
              Je ne prolongerai pas abusivement les agonies.
              Je ne provoquerai jamais la mort délibérément. »
            </blockquote>

            <div className="mt-6 text-center">
              <div className="w-20 h-px mx-auto" style={{ background: "linear-gradient(90deg,transparent,rgba(74,222,128,0.4),transparent)" }} />
            </div>

            <p className="mt-4 text-center text-white/20 text-xs">
              &copy; {new Date().getFullYear()} {etablissement}
            </p>
          </div>
        </div>

        {/* Colonne droite — Cartes de connexion */}
        <div className="flex-1 flex flex-col justify-center gap-5">
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-white/70">Accéder à votre espace</h2>
            <p className="text-white/30 text-xs mt-1">Sélectionnez votre profil pour vous connecter</p>
          </div>

          {/* Carte Médecin */}
          <Link
            href="/login/medecin"
            className="group relative overflow-hidden rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
              style={{ background: "linear-gradient(135deg,rgba(22,163,74,0.12),rgba(22,163,74,0.04))", boxShadow: "inset 0 0 0 1px rgba(74,222,128,0.2)" }}
            />
            <div className="relative flex items-center gap-5">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
                style={{ background: "rgba(22,163,74,0.15)", border: "1px solid rgba(74,222,128,0.2)" }}
              >
                <svg className="w-7 h-7" style={{ color: "#4ade80" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-lg">Médecin</h3>
                <p className="text-white/40 text-sm leading-snug mt-0.5">Dossiers patients, consultations, prescriptions et certificats médicaux</p>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold flex-shrink-0" style={{ color: "#4ade80" }}>
                <span className="hidden sm:inline">Connexion</span>
                <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </Link>

          {/* Carte Admin */}
          <Link
            href="/login/admin"
            className="group relative overflow-hidden rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
              style={{ background: "linear-gradient(135deg,rgba(13,148,136,0.12),rgba(13,148,136,0.04))", boxShadow: "inset 0 0 0 1px rgba(94,234,212,0.2)" }}
            />
            <div className="relative flex items-center gap-5">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(13,148,136,0.15)", border: "1px solid rgba(94,234,212,0.2)" }}
              >
                <svg className="w-7 h-7" style={{ color: "#5eead4" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-lg">Administrateur</h3>
                <p className="text-white/40 text-sm leading-snug mt-0.5">Personnel médical, patients, recettes et paramètres du système</p>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold flex-shrink-0" style={{ color: "#5eead4" }}>
                <span className="hidden sm:inline">Connexion</span>
                <svg className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
