"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MedecinLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword]     = useState("");
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const [showPwd, setShowPwd]       = useState(false);
  const [etablissement, setEtablissement] = useState("HOPITAL DE DISTRICT DE BOROMO");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(s => {
      if (s.etablissement_nom) setEtablissement(s.etablissement_nom);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "medecin", identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Identifiants incorrects"); setLoading(false); return; }
      router.push("/medecin");
    } catch { setError("Erreur réseau"); setLoading(false); }
  };

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ══ Panneau gauche ══ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col">
        {/* Fond atmosphérique */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(155deg,#021a0e 0%,#052e17 30%,#064e2a 60%,#0a5c38 100%)" }}/>

        {/* Décoration SVG */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <svg className="w-full h-full" viewBox="0 0 720 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="med-dots" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="rgba(255,255,255,0.05)"/>
              </pattern>
              <radialGradient id="med-glow" cx="60%" cy="45%" r="50%">
                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.2"/>
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <rect width="720" height="900" fill="url(#med-dots)"/>
            <rect width="720" height="900" fill="url(#med-glow)"/>

            {/* Stéthoscope élégant — grand & centré */}
            <g transform="translate(360,450) scale(1.3)" opacity="0.22">
              {/* Arc écouteur */}
              <path d="M-105,-140 Q0,-200 105,-140" fill="none" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              {/* Bras gauche */}
              <path d="M-105,-140 L-112,-80 Q-118,10 -52,55 Q0,88 0,120" fill="none" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              {/* Bras droit */}
              <path d="M105,-140 L112,-80 Q118,10 52,55 Q0,88 0,120" fill="none" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              {/* Tube */}
              <path d="M0,120 Q-22,185 -2,250 Q15,300 52,315 Q80,328 85,305"
                fill="none" stroke="white" strokeWidth="14" strokeLinecap="round"/>
              {/* Oreillettes */}
              <circle cx="-112" cy="-153" r="20" fill="none" stroke="white" strokeWidth="12"/>
              <circle cx="112"  cy="-153" r="20" fill="none" stroke="white" strokeWidth="12"/>
              {/* Membrane */}
              <circle cx="82"  cy="290" r="55" fill="none" stroke="white" strokeWidth="10"/>
              <circle cx="82"  cy="290" r="38" fill="none" stroke="white" strokeWidth="4" opacity="0.5"/>
              <circle cx="82"  cy="290" r="18" fill="white" opacity="0.12"/>
            </g>

            {/* Croix médicale accent */}
            <g fill="rgba(74,222,128,0.2)">
              <rect x="58"  y="100" width="16" height="52" rx="4"/>
              <rect x="40"  y="118" width="52" height="16" rx="4"/>
            </g>
            <g fill="rgba(74,222,128,0.12)">
              <rect x="618" y="740" width="12" height="36" rx="3"/>
              <rect x="606" y="752" width="36" height="12" rx="3"/>
            </g>

            {/* Ligne ECG */}
            <polyline points="0,820 80,820 120,760 160,880 200,790 230,820 720,820"
              fill="none" stroke="rgba(74,222,128,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>

            {/* Cercles décoratifs */}
            <circle cx="640" cy="140" r="70"  fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            <circle cx="640" cy="140" r="110" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            <circle cx="80"  cy="760" r="50"  fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          </svg>
        </div>

        {/* Contenu panneau gauche */}
        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* En-tête */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(74,222,128,0.15)", border: "1px solid rgba(74,222,128,0.25)" }}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="rgba(74,222,128,0.9)">
                <rect x="8" y="2" width="4" height="16" rx="1"/>
                <rect x="2" y="8" width="16" height="4" rx="1"/>
              </svg>
            </div>
            <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Espace médecin</span>
          </div>

          {/* Bloc principal */}
          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <div className="mb-8">
              <h2 className="text-4xl font-black text-white tracking-tight leading-tight mb-3">
                Bienvenue,<br/>
                <span style={{ color: "#4ade80" }}>Docteur.</span>
              </h2>
              <p className="text-white/45 text-sm leading-relaxed">
                Accédez à vos dossiers patients, saisissez vos consultations et gérez vos documents médicaux officiels.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: "📋", text: "Dossiers médicaux complets" },
                { icon: "💊", text: "Prescriptions & examens en PDF" },
                { icon: "📄", text: "Certificats officiels horodatés" },
                { icon: "📅", text: "Gestion des rendez-vous" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.18)" }}>
                    {icon}
                  </div>
                  <span className="text-white/55 text-sm">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pied */}
          <p className="text-white/20 text-xs">{etablissement}</p>
        </div>
      </div>

      {/* ══ Panneau droit — Formulaire ══ */}
      <div className="flex-1 flex flex-col bg-white overflow-y-auto">
        {/* Barre accent top */}
        <div className="h-1 flex-shrink-0" style={{ background: "linear-gradient(90deg,#16a34a,#0d9488,#22d3ee)" }}/>

        <div className="flex-1 flex flex-col items-center justify-center px-8 py-10">
          <div className="w-full max-w-sm">

            {/* Retour */}
            <Link href="/" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-xs mb-10 transition-colors group">
              <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
              </svg>
              Retour à l'accueil
            </Link>

            {/* En-tête formulaire */}
            <div className="mb-8">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 shadow-lg"
                style={{ background: "linear-gradient(135deg,#16a34a,#0d9488)" }}>
                <svg className="w-5.5 h-5.5 text-white" style={{ width: 22, height: 22 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Connexion Médecin</h1>
              <p className="text-gray-400 text-xs mt-1 font-medium tracking-wide uppercase">{etablissement}</p>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Identifiant
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                  </div>
                  <input
                    type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm bg-gray-50 focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                    placeholder="Votre identifiant" required autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </div>
                  <input
                    type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm bg-gray-50 focus:bg-white focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                    placeholder="••••••••" required
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                    {showPwd
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                      : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    }
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2.5 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-xl text-white text-sm font-bold tracking-wide transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ background: loading ? "#86efac" : "linear-gradient(135deg,#16a34a,#0d9488)" }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Connexion en cours…
                  </span>
                ) : "Se connecter"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-gray-300">
              Accès réservé au personnel médical autorisé
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
