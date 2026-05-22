"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function formatAge(dateNaissance: string): string {
  const diffMs = Date.now() - new Date(dateNaissance).getTime();
  const years = Math.floor(diffMs / (365.25 * 24 * 3600 * 1000));
  if (years >= 5) return `${years} ans`;
  const months = Math.floor(diffMs / (30.44 * 24 * 3600 * 1000));
  if (months >= 1) return `${months} mois`;
  return `${Math.floor(diffMs / (24 * 3600 * 1000))} j`;
}

interface PatientResult {
  id: number;
  code: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: string;
  telephone: string;
  decede: number;
}

interface DashboardStats {
  patientsThisMonth: number;
  consultationsThisMonth: number;
  rdv: {
    en_attente: number;
    confirme: number;
    effectue: number;
    annule: number;
  };
  month: string;
}

function formatMonthFR(yyyymm: string) {
  const months = ["janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const [year, month] = yyyymm.split("-");
  return `${months[parseInt(month) - 1]} ${year}`;
}

export default function MedecinDashboard() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    nom: "", prenom: "", date_naissance: "", sexe: "M",
    telephone: "", adresse: "", profession: "", residence: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState({ type: "", text: "", code: "" });
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/medecin")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStats(d))
      .catch(() => {});
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    if (!q) return;
    setSearching(true);
    setSearchError("");
    setResults([]);

    const directRes = await fetch(`/api/patients/${q.toUpperCase()}`);
    if (directRes.ok) {
      router.push(`/medecin/patient/${q.toUpperCase()}`);
      setSearching(false);
      return;
    }

    const listRes = await fetch(`/api/patients?search=${encodeURIComponent(q)}`);
    setSearching(false);
    if (listRes.ok) {
      const data: PatientResult[] = await listRes.json();
      if (data.length === 0) {
        setSearchError("Aucun patient trouvé. Vérifiez l'orthographe ou le code.");
      } else {
        setResults(data);
      }
    } else {
      setSearchError("Erreur lors de la recherche.");
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateMessage({ type: "", text: "", code: "" });
    const res = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPatientForm),
    });
    const data = await res.json();
    setCreateLoading(false);
    if (res.ok) {
      setCreateMessage({ type: "success", text: "Patient créé avec succès. Son code est :", code: data.code });
      setNewPatientForm({ nom: "", prenom: "", date_naissance: "", sexe: "M", telephone: "", adresse: "", profession: "", residence: "" });
    } else {
      setCreateMessage({ type: "error", text: data.error || "Erreur lors de la création", code: "" });
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Espace Médecin</h1>
          <p className="text-gray-500 text-sm mt-1">Recherchez un patient ou créez un nouveau dossier</p>
        </div>
        <button
          onClick={() => { setShowNewPatient(true); setCreateMessage({ type: "", text: "", code: "" }); }}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nouveau patient
        </button>
      </div>

      {/* ── Statistiques du mois ── */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Activité de {stats ? formatMonthFR(stats.month) : "ce mois"}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Patients consultés */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-lg">👥</div>
              <p className="text-xs font-medium text-gray-500 leading-tight">Patients<br />consultés</p>
            </div>
            <p className="text-3xl font-bold text-primary-600 leading-none">
              {stats ? stats.patientsThisMonth : <span className="text-gray-200 animate-pulse">—</span>}
            </p>
          </div>

          {/* RDV en attente */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-yellow-50 flex items-center justify-center text-lg">⏳</div>
              <p className="text-xs font-medium text-gray-500 leading-tight">RDV en<br />attente</p>
            </div>
            <p className="text-3xl font-bold text-yellow-500 leading-none">
              {stats ? stats.rdv.en_attente : <span className="text-gray-200 animate-pulse">—</span>}
            </p>
          </div>

          {/* RDV confirmés */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-lg">✅</div>
              <p className="text-xs font-medium text-gray-500 leading-tight">RDV<br />confirmés</p>
            </div>
            <p className="text-3xl font-bold text-green-500 leading-none">
              {stats ? stats.rdv.confirme : <span className="text-gray-200 animate-pulse">—</span>}
            </p>
          </div>

          {/* RDV effectués */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-lg">🏁</div>
              <p className="text-xs font-medium text-gray-500 leading-tight">RDV<br />effectués</p>
            </div>
            <p className="text-3xl font-bold text-blue-500 leading-none">
              {stats ? stats.rdv.effectue : <span className="text-gray-200 animate-pulse">—</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Modal nouveau patient */}
      {showNewPatient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-gray-800 mb-4">Nouveau patient</h2>

            {createMessage.text && (
              <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${createMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                {createMessage.text}
                {createMessage.code && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-primary-700 bg-primary-100 px-3 py-1 rounded-lg">{createMessage.code}</span>
                    <span className="text-xs text-gray-500">Notez ce code pour accéder au dossier</span>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input type="text" value={newPatientForm.nom} onChange={e => setNewPatientForm(f => ({ ...f, nom: e.target.value }))} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input type="text" value={newPatientForm.prenom} onChange={e => setNewPatientForm(f => ({ ...f, prenom: e.target.value }))} className="input-field" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                  <input type="date" value={newPatientForm.date_naissance} onChange={e => setNewPatientForm(f => ({ ...f, date_naissance: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
                  <select value={newPatientForm.sexe} onChange={e => setNewPatientForm(f => ({ ...f, sexe: e.target.value }))} className="input-field">
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="text" value={newPatientForm.telephone} onChange={e => setNewPatientForm(f => ({ ...f, telephone: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input type="text" value={newPatientForm.adresse} onChange={e => setNewPatientForm(f => ({ ...f, adresse: e.target.value }))} className="input-field" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
                  <input type="text" value={newPatientForm.profession} onChange={e => setNewPatientForm(f => ({ ...f, profession: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Résidence/Provenance</label>
                  <input type="text" value={newPatientForm.residence} onChange={e => setNewPatientForm(f => ({ ...f, residence: e.target.value }))} className="input-field" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createLoading} className="btn-primary flex-1">
                  {createLoading ? "Création..." : "Créer le patient"}
                </button>
                <button type="button" onClick={() => setShowNewPatient(false)} className="btn-secondary flex-1">Fermer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recherche */}
      <div className="max-w-xl">
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Recherche patient
          </h2>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code ou nom du patient</label>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setResults([]); setSearchError(""); }}
                placeholder="Ex: TS202605001 ou TONDE"
                className="input-field text-lg"
                autoFocus
              />
            </div>
            {searchError && <p className="text-red-600 text-sm">{searchError}</p>}
            <button type="submit" disabled={searching} className="btn-primary w-full py-3">
              {searching ? "Recherche..." : "Rechercher"}
            </button>
          </form>
        </div>

        {/* Résultats */}
        {results.length > 0 && (
          <div className="mt-4 card divide-y divide-gray-100">
            <p className="text-sm text-gray-500 pb-3">{results.length} patient(s) trouvé(s)</p>
            {results.map(p => (
              <button
                key={p.id}
                onClick={() => router.push(`/medecin/patient/${p.code}`)}
                className="w-full text-left py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{p.prenom} {p.nom}</span>
                    {p.decede === 1 && <span className="text-[10px] font-bold bg-red-600 text-white px-1.5 py-0.5 rounded uppercase">DCD</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">{p.code}</span>
                    {p.date_naissance && (
                      <span className="text-xs text-gray-400">
                        {formatAge(p.date_naissance)}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{p.sexe === "M" ? "Masculin" : "Féminin"}</span>
                    {p.telephone && <span className="text-xs text-gray-400">📱 {p.telephone}</span>}
                  </div>
                </div>
                <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-primary-50 rounded-xl border border-primary-100">
          <p className="text-sm text-primary-700 font-medium mb-1">Accès au dossier</p>
          <p className="text-xs text-primary-600">Entrez le code du patient (ex: TS202605001) pour un accès direct, ou saisissez son nom pour une recherche.</p>
        </div>
      </div>
    </div>
  );
}
