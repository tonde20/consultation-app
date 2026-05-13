"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
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
        body: JSON.stringify({ role: "admin", identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Identifiants incorrects"); setLoading(false); return; }
      router.push("/admin");
    } catch { setError("Erreur réseau"); setLoading(false); }
  };

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ══ Panneau gauche ══ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col">
        {/* Fond atmosphérique teal */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(155deg,#021414 0%,#052e2e 30%,#064e4a 60%,#076560 100%)" }}/>

        {/* Décoration SVG */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <svg className="w-full h-full" viewBox="0 0 720 900" preserveAspectRatio="xMidYMid slice">
            <defs>
              <pattern id="adm-dots" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="rgba(255,255,255,0.05)"/>
              </pattern>
              <radialGradient id="adm-glow" cx="55%" cy="40%" r="50%">
                <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25"/>
                <stop offset="100%" stopColor="#0d9488" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <rect width="720" height="900" fill="url(#adm-dots)"/>
            <rect width="720" height="900" fill="url(#adm-glow)"/>

            {/* Bâtiment hôpital stylisé */}
            <g transform="translate(360,430) scale(1.1)" opacity="0.24">
              {/* Corps principal */}
              <rect x="-130" y="-160" width="260" height="320" fill="none" stroke="white" strokeWidth="5" rx="3"/>
              {/* Toit */}
              <polygon points="-152,-160 152,-160 152,-210 0,-300 -152,-210"
                fill="none" stroke="white" strokeWidth="5"/>
              {/* Tour centrale */}
              <rect x="-45" y="-268" width="90" height="110" fill="none" stroke="white" strokeWidth="4"/>
              {/* Croix médicale sur la tour */}
              <rect x="-8" y="-318" width="16" height="50" rx="3" fill="white" opacity="0.7"/>
              <rect x="-25" y="-302" width="50" height="16" rx="3" fill="white" opacity="0.7"/>
              {/* Fenêtres rangée 1 */}
              <g fill="none" stroke="white" strokeWidth="3" opacity="0.7">
                <rect x="-110" y="-125" width="52" height="52" rx="5"/>
                <rect x="-26" y="-125" width="52" height="52" rx="5"/>
                <rect x="58"  y="-125" width="52" height="52" rx="5"/>
              </g>
              {/* Fenêtres rangée 2 */}
              <g fill="none" stroke="white" strokeWidth="2.5" opacity="0.5">
                <rect x="-110" y="-45" width="52" height="52" rx="5"/>
                <rect x="58"   y="-45" width="52" height="52" rx="5"/>
              </g>
              {/* Porte */}
              <rect x="-28" y="80" width="56" height="80" rx="6" fill="none" stroke="white" strokeWidth="3.5"/>
              <circle cx="20" cy="122" r="4" fill="rgba(255,255,255,0.4)"/>
            </g>

            {/* Croix accent */}
            <g fill="rgba(94,234,212,0.22)">
              <rect x="60"  y="110" width="14" height="46" rx="3"/>
              <rect x="44"  y="126" width="46" height="14" rx="3"/>
            </g>
            <g fill="rgba(94,234,212,0.14)">
              <rect x="622" y="750" width="10" height="32" rx="2"/>
              <rect x="611" y="761" width="32" height="10" rx="2"/>
            </g>

            {/* Ligne ECG */}
            <polyline points="0,820 80,820 120,758 162,882 202,792 232,820 720,820"
              fill="none" stroke="rgba(94,234,212,0.25)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>

            {/* Cercles décoratifs */}
            <circle cx="642" cy="135" r="65"  fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
            <circle cx="642" cy="135" r="105" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1"/>
            <circle cx="78"  cy="762" r="48"  fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
          </svg>
        </div>

        {/* Contenu panneau gauche */}
        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          {/* En-tête */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.25)" }}>
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="rgba(94,234,212,0.9)">
                <rect x="8" y="2" width="4" height="16" rx="1"/>
                <rect x="2" y="8" width="16" height="4" rx="1"/>
              </svg>
            </div>
            <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Administration</span>
          </div>

          {/* Bloc principal */}
          <div className="flex-1 flex flex-col justify-center max-w-sm">
            <div className="mb-8">
              <h2 className="text-4xl font-black text-white tracking-tight leading-tight mb-3">
                Tableau de<br/>
                <span style={{ color: "#5eead4" }}>bord admin.</span>
              </h2>
              <p className="text-white/45 text-sm leading-relaxed">
                Gérez le personnel médical, les patients, les finances et configurez les paramètres de l'établissement.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: "👨‍⚕️", text: "Gestion du personnel médical" },
                { icon: "🗂️", text: "Registre complet des patients" },
                { icon: "💰", text: "Suivi des recettes et finances" },
                { icon: "⚙️", text: "Paramètres du système" },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: "rgba(94,234,212,0.12)", border: "1px solid rgba(94,234,212,0.18)" }}>
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
        {/* Barre accent top teal */}
        <div className="h-1 flex-shrink-0" style={{ background: "linear-gradient(90deg,#0d9488,#0891b2,#6366f1)" }}/>

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
                style={{ background: "linear-gradient(135deg,#0d9488,#0891b2)" }}>
                <svg className="text-white" style={{ width: 22, height: 22 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm bg-gray-50 focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
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
                    className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 text-gray-800 text-sm bg-gray-50 focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
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
                style={{ background: loading ? "#99f6e4" : "linear-gradient(135deg,#0d9488,#0891b2)" }}>
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
              Accès réservé à l'administration de l'établissement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
