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

  let etablissement = "HOPITAL DE DISTRICT DE BOROMO";
  try {
    await initDb();
    const s = await dbGet("SELECT value FROM settings WHERE key = $1", ["etablissement_nom"]);
    if (s?.value) etablissement = s.value;
  } catch {}

  const now = new Date();
  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="h-screen overflow-hidden flex flex-col text-white relative select-none"
      style={{ background: "linear-gradient(145deg,#020b10 0%,#071820 35%,#071e1b 65%,#030f0d 100%)" }}>

      {/* ── Arrière-plan décoratif ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <svg className="w-full h-full" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(255,255,255,0.04)"/>
            </pattern>
            <radialGradient id="glow1" cx="80%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="glow2" cx="20%" cy="75%" r="45%">
              <stop offset="0%" stopColor="#16a34a" stopOpacity="0.10"/>
              <stop offset="100%" stopColor="#16a34a" stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* Dot grid */}
          <rect width="1440" height="900" fill="url(#dots)"/>
          {/* Ambient glows */}
          <rect width="1440" height="900" fill="url(#glow1)"/>
          <rect width="1440" height="900" fill="url(#glow2)"/>

          {/* Grand croix médicale - filigrane */}
          <g opacity="0.03" transform="translate(680,420)">
            <rect x="-22" y="-110" width="44" height="220" rx="8" fill="white"/>
            <rect x="-110" y="-22" width="220" height="44" rx="8" fill="white"/>
          </g>

          {/* Ligne ECG en bas */}
          <polyline
            points="0,855 120,855 170,790 220,918 270,820 310,855 520,855 570,800 610,875 640,855 1440,855"
            fill="none" stroke="rgba(45,212,191,0.18)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>

          {/* Petits éléments décoratifs */}
          <circle cx="72" cy="180" r="60" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
          <circle cx="72" cy="180" r="100" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1"/>
          <circle cx="1380" cy="700" r="80" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
          <circle cx="1380" cy="700" r="130" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1"/>

          {/* Croix accent top-right */}
          <g fill="rgba(45,212,191,0.12)">
            <rect x="1350" y="80"  width="8" height="28" rx="2"/>
            <rect x="1340" y="90"  width="28" height="8"  rx="2"/>
          </g>
          {/* Croix accent bottom-left */}
          <g fill="rgba(74,222,128,0.10)">
            <rect x="55" y="790" width="6" height="22" rx="2"/>
            <rect x="47" y="798" width="22" height="6"  rx="2"/>
          </g>
        </svg>
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-3.5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          {/* Croix médicale mini */}
          <div className="w-7 h-7 relative flex-shrink-0">
            <div className="absolute inset-0 rounded-md" style={{ background: "linear-gradient(135deg,#16a34a,#0d9488)", opacity: 0.9 }}/>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="white">
                <rect x="8" y="2" width="4" height="16" rx="1"/>
                <rect x="2" y="8" width="16" height="4" rx="1"/>
              </svg>
            </div>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">Service de consultation médecin</span>
        </div>
        <span className="text-xs text-white/25 capitalize hidden md:block">{dateStr}</span>
      </header>

      {/* ── Titre établissement ── */}
      <div className="relative z-10 text-center py-5 flex-shrink-0">
        <p className="text-[10px] uppercase tracking-[0.35em] text-white/30 mb-2">Système de gestion médicale</p>
        <h1 className="font-black leading-none" style={{ fontSize: "clamp(1.6rem,3.5vw,2.6rem)" }}>
          <span style={{
            backgroundImage: "linear-gradient(90deg,#4ade80 0%,#2dd4bf 45%,#22d3ee 80%,#60a5fa 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            filter: "drop-shadow(0 0 24px rgba(45,212,191,0.3))"
          }}>
            {etablissement}
          </span>
        </h1>
        {/* Ligne décorative sous le titre */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <div className="h-px w-16" style={{ background: "linear-gradient(90deg,transparent,rgba(45,212,191,0.4))" }}/>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2dd4bf" }}/>
          <div className="h-px w-16" style={{ background: "linear-gradient(90deg,rgba(45,212,191,0.4),transparent)" }}/>
        </div>
      </div>

      {/* ── Corps principal ── */}
      <div className="relative z-10 flex-1 flex gap-5 px-8 pb-5 overflow-hidden">

        {/* Colonne gauche — Serment d'Hippocrate */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="relative rounded-2xl h-full flex flex-col justify-center px-8 py-8 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}>

            {/* Guillemet décoratif */}
            <div className="absolute top-5 left-6 text-7xl font-serif leading-none pointer-events-none"
              style={{ color: "rgba(45,212,191,0.15)", lineHeight: 1 }}>&ldquo;</div>

            {/* Accent couleur haut */}
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
              style={{ background: "linear-gradient(90deg,#16a34a,#0d9488,#0891b2)" }}/>

            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] mb-5"
                style={{ color: "#2dd4bf" }}>
                — Extrait du serment d'Hippocrate
              </p>

              <blockquote className="text-white/70 leading-[1.9] italic"
                style={{ fontSize: "clamp(0.82rem,1.1vw,0.95rem)" }}>
                Je ne ferai jamais usage de mes connaissances contre les lois de l'humanité.
                Je ferai tout pour soulager les souffrances.
                Je ne prolongerai pas abusivement les agonies.
                Je ne provoquerai jamais la mort délibérément.
              </blockquote>

              <div className="mt-6 flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: "linear-gradient(90deg,rgba(45,212,191,0.3),transparent)" }}/>
                <span className="text-xs text-white/25 italic">Hippocrate, ~400 av. J.-C.</span>
              </div>
            </div>

            {/* Copyright bas */}
            <p className="absolute bottom-4 right-6 text-[10px] text-white/15">
              &copy; {new Date().getFullYear()} {etablissement}
            </p>
          </div>
        </div>

        {/* Colonne droite — Accès */}
        <div className="flex-1 flex flex-col justify-center gap-4">
          <div className="mb-1">
            <h2 className="text-base font-bold text-white/75 tracking-wide">Accéder à votre espace</h2>
            <p className="text-xs text-white/30 mt-0.5">Sélectionnez votre profil pour vous connecter</p>
          </div>

          {/* Carte Médecin */}
          <Link href="/login/medecin" className="group block rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
            onMouseEnter={undefined}>
            <div className="relative overflow-hidden rounded-2xl">
              {/* Hover overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                style={{ background: "linear-gradient(135deg,rgba(22,163,74,0.08),rgba(13,148,136,0.06))" }}/>
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: "linear-gradient(90deg,transparent,rgba(74,222,128,0.3),transparent)", opacity: 0 }}/>
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl"
                style={{ background: "linear-gradient(180deg,#16a34a,#0d9488)" }}/>

              <div className="flex items-center gap-5 px-7 py-5">
                {/* Icône */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: "linear-gradient(135deg,rgba(22,163,74,0.25),rgba(13,148,136,0.2))", border: "1px solid rgba(74,222,128,0.2)" }}>
                  <svg className="w-6 h-6" style={{ color: "#4ade80" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                  </svg>
                </div>
                {/* Texte */}
                <div className="flex-1">
                  <p className="font-bold text-white text-base group-hover:text-green-300 transition-colors duration-200">Médecin</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-snug">Dossiers patients · Consultations · Certificats médicaux</p>
                </div>
                {/* Flèche */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:translate-x-1"
                  style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.15)" }}>
                  <svg className="w-4 h-4" style={{ color: "#4ade80" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Carte Admin */}
          <Link href="/login/admin" className="group block rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="relative overflow-hidden rounded-2xl">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                style={{ background: "linear-gradient(135deg,rgba(13,148,136,0.08),rgba(8,145,178,0.06))" }}/>
              {/* Left accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-2xl"
                style={{ background: "linear-gradient(180deg,#0d9488,#0891b2)" }}/>

              <div className="flex items-center gap-5 px-7 py-5">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: "linear-gradient(135deg,rgba(13,148,136,0.25),rgba(8,145,178,0.2))", border: "1px solid rgba(94,234,212,0.2)" }}>
                  <svg className="w-6 h-6" style={{ color: "#5eead4" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-base group-hover:text-teal-300 transition-colors duration-200">Administrateur</p>
                  <p className="text-xs text-white/40 mt-0.5 leading-snug">Personnel médical · Patients · Recettes · Paramètres</p>
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:translate-x-1"
                  style={{ background: "rgba(94,234,212,0.1)", border: "1px solid rgba(94,234,212,0.15)" }}>
                  <svg className="w-4 h-4" style={{ color: "#5eead4" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                  </svg>
                </div>
              </div>
            </div>
          </Link>

          {/* Note bas de page */}
          <p className="text-[10px] text-white/18 text-center mt-1">
            Accès réservé au personnel médical autorisé
          </p>
        </div>
      </div>
    </div>
  );
}
