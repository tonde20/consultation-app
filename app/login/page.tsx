"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "medecin">("medecin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [etablissement, setEtablissement] = useState("CMA de Boromo");

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(s => {
      if (s.etablissement_nom) setEtablissement(s.etablissement_nom);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erreur de connexion"); return; }
      if (role === "admin") router.push("/admin");
      else router.push("/medecin");
    } catch { setError("Erreur réseau"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-teal-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.5 12.5l8-8m0 0l8 8m-8-8v15" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-3-3v6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-primary-800">{etablissement}</h1>
          <p className="text-gray-500 mt-1">Système de gestion médicale</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-6">Connexion</h2>

          <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
            {(["medecin", "admin"] as const).map(r => (
              <button
                key={r}
                onClick={() => { setRole(r); setIdentifier(""); setPassword(""); setError(""); }}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${role === r ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                {r === "medecin" ? "Médecin" : "Admin"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className="input-field"
                placeholder={role === "medecin" ? "medecin1" : "admin"}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
            <p>Médecin: medecin1 / medecin1123</p>
            <p>Admin: admin / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
