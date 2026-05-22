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

  const dateStr = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const dateCapitalized = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div
      className="h-screen overflow-hidden flex flex-col relative select-none"
      style={{ background: "linear-gradient(150deg,#f0fdf9 0%,#ecfdf5 40%,#f0fdfa 70%,#f0feff 100%)" }}
    >
      {/* ─── Décorations arrière-plan ─── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        {/* Stéthoscope — gauche */}
        <svg className="absolute -left-10 top-16 opacity-[0.06]" width="320" height="420"
          fill="none" stroke="#0d9488" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="95" cy="38" r="16"/>
          <circle cx="195" cy="38" r="16"/>
          <path d="M95 54 Q95 95 145 115 Q195 95 195 54"/>
          <path d="M145 115 Q135 165 95 210 Q58 255 55 315"/>
          <circle cx="55" cy="315" r="38"/>
          <circle cx="55" cy="315" r="22"/>
        </svg>

        {/* Feuilles — droite */}
        <svg className="absolute -right-6 top-28 opacity-[0.06]" width="280" height="400"
          fill="none" stroke="#16a34a" strokeWidth="4.5" strokeLinecap="round">
          <path d="M240 395 Q195 300 215 195 Q232 100 175 28"/>
          <path d="M215 195 Q158 165 122 195 Q158 226 215 195Z" strokeWidth="3"/>
          <path d="M225 288 Q168 258 132 284 Q167 312 225 288Z" strokeWidth="3"/>
          <path d="M210 122 Q153 92 120 120 Q152 150 210 122Z" strokeWidth="3"/>
          <path d="M238 348 Q275 316 280 348 Q265 376 238 348Z" strokeWidth="3"/>
          <path d="M192 62 Q228 35 242 60 Q224 86 192 62Z" strokeWidth="3"/>
        </svg>
      </div>

      {/* ─── Header ─── */}
      <header className="relative z-10 flex items-center justify-between px-8 py-3.5 flex-shrink-0 bg-white/80 backdrop-blur-sm"
        style={{ borderBottom: "1px solid rgba(13,148,136,0.12)" }}>
        {/* Logo + libellé */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#0d9488,#059669)" }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
              <path d="M12 1.5L3.75 5.25v5.25c0 5.25 3.525 10.125 8.25 11.25 4.725-1.125 8.25-6 8.25-11.25V5.25L12 1.5z" opacity="0.9"/>
              <rect x="10.5" y="7.5" width="3" height="9" rx="1" fill="white"/>
              <rect x="7.5" y="10.5" width="9" height="3" rx="1" fill="white"/>
            </svg>
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">
            Service de consultation médecin
          </span>
        </div>

        {/* Badge date */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-100">
          <svg className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
          <span className="text-xs font-medium text-teal-700">{dateCapitalized}</span>
        </div>
      </header>

      {/* ─── Titre établissement ─── */}
      <div className="relative z-10 text-center py-4 flex-shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-gray-400 mb-1.5">
          Système de gestion médicale
        </p>
        <h1 className="font-black leading-tight text-teal-700"
          style={{ fontSize: "clamp(1.4rem,2.8vw,2.2rem)", letterSpacing: "-0.01em" }}>
          {etablissement}
        </h1>
        {/* Ligne ECG décorative */}
        <div className="flex items-center justify-center mt-3">
          <svg width="200" height="22" viewBox="0 0 200 22" fill="none">
            <polyline
              points="0,11 35,11 44,2 53,20 60,8 68,11 100,11 109,3 118,19 123,11 200,11"
              stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* ─── Corps principal ─── */}
      <div className="relative z-10 flex-1 flex gap-5 px-8 pb-5 overflow-hidden">

        {/* GAUCHE — Carte Hippocrate */}
        <div className="flex-[1.05] rounded-2xl overflow-hidden relative flex flex-col shadow-lg"
          style={{ background: "linear-gradient(135deg,#0f766e 0%,#065f46 55%,#047857 100%)" }}>

          {/* Décorations lumineuses — orbes, grille, croix médicale, ECG */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 520 360" fill="none" preserveAspectRatio="xMidYMid slice">
              <defs>
                {/* Halo central */}
                <radialGradient id="orb1" cx="75%" cy="35%" r="40%">
                  <stop offset="0%" stopColor="#5eead4" stopOpacity="0.22"/>
                  <stop offset="100%" stopColor="#5eead4" stopOpacity="0"/>
                </radialGradient>
                {/* Halo bas-droit */}
                <radialGradient id="orb2" cx="90%" cy="85%" r="35%">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity="0.16"/>
                  <stop offset="100%" stopColor="#4ade80" stopOpacity="0"/>
                </radialGradient>
                {/* Halo haut-droite */}
                <radialGradient id="orb3" cx="95%" cy="10%" r="28%">
                  <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.18"/>
                  <stop offset="100%" stopColor="#a7f3d0" stopOpacity="0"/>
                </radialGradient>
              </defs>

              {/* Halos lumineux */}
              <rect width="520" height="360" fill="url(#orb1)"/>
              <rect width="520" height="360" fill="url(#orb2)"/>
              <rect width="520" height="360" fill="url(#orb3)"/>

              {/* Grille de points */}
              {Array.from({ length: 10 }).map((_, row) =>
                Array.from({ length: 14 }).map((_, col) => (
                  <circle key={`${row}-${col}`}
                    cx={280 + col * 22} cy={20 + row * 36}
                    r="1.2" fill="rgba(255,255,255,0.07)"
                  />
                ))
              )}

              {/* Grand cercle décoratif — anneau lumineux droit */}
              <circle cx="440" cy="180" r="115" stroke="rgba(255,255,255,0.06)" strokeWidth="1"/>
              <circle cx="440" cy="180" r="85"  stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
              <circle cx="440" cy="180" r="52"  stroke="rgba(94,234,212,0.1)"   strokeWidth="1.5"/>

              {/* Arc lumineux */}
              <path d="M 370 80 A 115 115 0 0 1 520 200"
                stroke="rgba(94,234,212,0.18)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              <path d="M 385 100 A 85 85 0 0 1 500 210"
                stroke="rgba(167,243,208,0.12)" strokeWidth="1" fill="none" strokeLinecap="round"/>

              {/* Croix médicale — grande, filigrane */}
              <g opacity="0.07" transform="translate(395,140)">
                <rect x="-10" y="-42" width="20" height="84" rx="5" fill="white"/>
                <rect x="-42" y="-10" width="84" height="20" rx="5" fill="white"/>
              </g>

              {/* Petite croix médicale haut */}
              <g opacity="0.13" transform="translate(470,48)">
                <rect x="-4" y="-14" width="8" height="28" rx="2" fill="white"/>
                <rect x="-14" y="-4" width="28" height="8" rx="2" fill="white"/>
              </g>

              {/* Ligne ECG décorative droite */}
              <polyline
                points="295,285 318,285 326,262 334,308 340,275 348,285 375,285 383,268 391,302 396,285 480,285"
                stroke="rgba(94,234,212,0.25)" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" fill="none"
              />

              {/* Étincelles / points lumineux */}
              <circle cx="388" cy="95"  r="2.5" fill="rgba(167,243,208,0.5)"/>
              <circle cx="420" cy="72"  r="1.5" fill="rgba(94,234,212,0.4)"/>
              <circle cx="460" cy="110" r="2"   fill="rgba(255,255,255,0.3)"/>
              <circle cx="500" cy="88"  r="1.5" fill="rgba(167,243,208,0.35)"/>
              <circle cx="475" cy="240" r="2"   fill="rgba(94,234,212,0.3)"/>
              <circle cx="445" cy="310" r="1.5" fill="rgba(167,243,208,0.25)"/>

              {/* Trait diagonal décoratif */}
              <line x1="310" y1="10" x2="520" y2="150"
                stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
              <line x1="330" y1="10" x2="520" y2="120"
                stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            </svg>
          </div>

          {/* Contenu de la carte */}
          <div className="relative z-10 flex flex-col justify-between h-full p-7">
            <div>
              {/* Grand guillemet */}
              <div className="text-8xl font-serif leading-none text-white/15 -ml-1 mb-0 -mt-1">❝</div>

              <p className="text-[10px] font-bold uppercase tracking-[0.28em] mb-4"
                style={{ color: "rgba(153,246,228,0.85)" }}>
                Extrait du serment d'Hippocrate
              </p>

              <blockquote className="text-white/85 italic leading-[1.85]"
                style={{ fontSize: "clamp(0.78rem,1vw,0.93rem)", maxWidth: "57%" }}>
                Je ne ferai jamais usage de mes connaissances contre les lois de l'humanité.<br/>
                Je ferai tout pour soulager les souffrances.<br/>
                Je ne prolongerai pas abusivement les agonies.<br/>
                Je ne provoquerai jamais la mort délibérément.
              </blockquote>

              <div className="flex items-center gap-3 mt-5" style={{ maxWidth: "57%" }}>
                <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.2)" }}/>
                <span className="text-xs italic" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Hippocrate, ~400 av. J.-C.
                </span>
              </div>
            </div>

            {/* Badges bas de carte */}
            <div className="flex flex-wrap gap-2 pt-5">
              {/* Confidentialité */}
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.1)" }}>
                <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(153,246,228,0.85)" }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
                <span className="text-xs text-white/75">Confidentialité assurée</span>
              </div>
              {/* Données */}
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.1)" }}>
                <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(153,246,228,0.85)" }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                <span className="text-xs text-white/75">Données sécurisées</span>
              </div>
              {/* Humain */}
              <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.1)" }}>
                <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(153,246,228,0.85)" }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                </svg>
                <span className="text-xs text-white/75">Soins centrés sur l'humain</span>
              </div>
            </div>
          </div>
        </div>

        {/* DROITE — Accès connexion */}
        <div className="flex-[0.95] flex flex-col justify-center gap-4 pl-2">
          <div className="mb-1">
            <h2 className="text-lg font-black uppercase tracking-wider text-gray-800">
              Accéder à votre espace
            </h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Sélectionnez votre profil pour vous connecter
            </p>
          </div>

          {/* Carte Médecin */}
          <Link href="/login/medecin"
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block overflow-hidden">
            <div className="relative flex items-center gap-4 px-5 py-4">
              {/* Barre gauche colorée */}
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                style={{ background: "linear-gradient(180deg,#0d9488,#059669)" }}/>
              {/* Icône */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-2"
                style={{ background: "linear-gradient(135deg,#ccfbf1,#d1fae5)", border: "1px solid #99f6e4" }}>
                <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
              </div>
              {/* Texte */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-base group-hover:text-teal-700 transition-colors">
                  Médecin
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                  Dossiers patients • Consultations • Certificats médicaux
                </p>
              </div>
              {/* Flèche */}
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                style={{ background: "linear-gradient(135deg,#0d9488,#059669)" }}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </Link>

          {/* Carte Administrateur */}
          <Link href="/login/admin"
            className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 block overflow-hidden">
            <div className="relative flex items-center gap-4 px-5 py-4">
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                style={{ background: "linear-gradient(180deg,#0891b2,#0d9488)" }}/>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-2"
                style={{ background: "linear-gradient(135deg,#cffafe,#ccfbf1)", border: "1px solid #a5f3fc" }}>
                <svg className="w-6 h-6 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-base group-hover:text-cyan-700 transition-colors">
                  Administrateur
                </p>
                <p className="text-xs text-gray-400 mt-0.5 leading-snug">
                  Personnel médical • Patients • Recettes • Paramètres
                </p>
              </div>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform"
                style={{ background: "linear-gradient(135deg,#0891b2,#0d9488)" }}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </Link>

          {/* Note sécurité */}
          <div className="flex items-center gap-2.5 mt-1 px-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <span className="text-xs text-gray-400">Accès réservé au personnel médical autorisé</span>
          </div>
        </div>
      </div>

      {/* ─── Pied de page ─── */}
      <div className="relative z-10 text-center pb-3 flex-shrink-0">
        <p className="text-[10px] text-gray-300">© {new Date().getFullYear()} {etablissement}</p>
      </div>
    </div>
  );
}
