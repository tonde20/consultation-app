"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ProfessionSelect from "@/components/ProfessionSelect";

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
  nom: string;
}

interface PatientHospitalise {
  consultation_id: number;
  date_admission: string;
  service_hospitalisation: string;
  diagnostic: string;
  motif: string;
  code: string;
  nom: string;
  prenom: string;
  sexe: string;
}

function formatMonthFR(yyyymm: string) {
  const months = ["janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const [year, month] = yyyymm.split("-");
  return `${months[parseInt(month) - 1]} ${year}`;
}

function joursHospitalisation(dateAdmission: string): number {
  const admission = new Date(dateAdmission);
  const today = new Date();
  const diff = today.getTime() - admission.getTime();
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const SERVICE_COLORS: Record<string, string> = {
  "Urgences médicales":   "bg-red-100 text-red-700",
  "Urgences pédiatriques":"bg-orange-100 text-orange-700",
  "Service de Médecine":  "bg-blue-100 text-blue-700",
  "Service de Chirurgie": "bg-purple-100 text-purple-700",
  "Maternité":            "bg-pink-100 text-pink-700",
};

export default function MedecinDashboard() {
  const router = useRouter();
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    nom: "", prenom: "", date_naissance: "", sexe: "M",
    telephone: "", adresse: "", profession: "", residence: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createMessage, setCreateMessage] = useState({ type: "", text: "", code: "" });
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [hospitalises, setHospitalises] = useState<PatientHospitalise[]>([]);
  const [loadingHosp, setLoadingHosp] = useState(true);
  const [triRecent, setTriRecent] = useState(false); // false = plus ancien en premier

  useEffect(() => {
    fetch("/api/dashboard/medecin")
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setStats(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/hospitalises")
      .then(r => r.ok ? r.json() : { hospitalises: [] })
      .then(d => setHospitalises(d.hospitalises ?? []))
      .catch(() => setHospitalises([]))
      .finally(() => setLoadingHosp(false));
  }, []);

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

  const listeTriee = triRecent
    ? [...hospitalises].reverse()
    : hospitalises;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Espace Médecin</p>
          {stats?.nom ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {stats.nom.replace("Dr. ", "").trim().split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 leading-tight">{stats.nom}</h1>
                <p className="text-xs text-primary-600 font-medium">Médecin — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
            </div>
          ) : (
            <div className="h-10 w-56 bg-gray-100 rounded-lg animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/medecin/patient")}
            className="btn-secondary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Liste des patients
          </button>
          <button
            onClick={() => { setShowNewPatient(true); setCreateMessage({ type: "", text: "", code: "" }); }}
            className="btn-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nouveau patient
          </button>
        </div>
      </div>

      {/* ── Statistiques du mois ── */}
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Activité de {stats ? formatMonthFR(stats.month) : "ce mois"}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Patients consultés */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center text-xl">👥</div>
              <p className="text-sm font-medium text-gray-500 leading-tight">Patients<br />consultés</p>
            </div>
            <p className="text-4xl font-bold text-primary-600 leading-none">
              {stats ? stats.patientsThisMonth : <span className="text-gray-200 animate-pulse">—</span>}
            </p>
          </div>

          {/* RDV en attente */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-lg bg-yellow-50 flex items-center justify-center text-xl">⏳</div>
              <p className="text-sm font-medium text-gray-500 leading-tight">RDV en<br />attente</p>
            </div>
            <p className="text-4xl font-bold text-yellow-500 leading-none">
              {stats ? stats.rdv.en_attente : <span className="text-gray-200 animate-pulse">—</span>}
            </p>
          </div>

          {/* RDV confirmés */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-lg bg-green-50 flex items-center justify-center text-xl">✅</div>
              <p className="text-sm font-medium text-gray-500 leading-tight">RDV<br />confirmés</p>
            </div>
            <p className="text-4xl font-bold text-green-500 leading-none">
              {stats ? stats.rdv.confirme : <span className="text-gray-200 animate-pulse">—</span>}
            </p>
          </div>

          {/* RDV effectués */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center text-xl">🏁</div>
              <p className="text-sm font-medium text-gray-500 leading-tight">RDV<br />effectués</p>
            </div>
            <p className="text-4xl font-bold text-blue-500 leading-none">
              {stats ? stats.rdv.effectue : <span className="text-gray-200 animate-pulse">—</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ── Patients hospitalisés ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {/* En-tête du cadran */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-lg">🏥</div>
            <div>
              <h2 className="font-semibold text-gray-800 leading-none">Patients hospitalisés</h2>
              <p className="text-xs text-gray-400 mt-0.5">Séjours en cours — sorties non enregistrées</p>
            </div>
            {!loadingHosp && (
              <span className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                {hospitalises.length}
              </span>
            )}
          </div>

          {/* Bouton tri */}
          <button
            onClick={() => setTriRecent(v => !v)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
            </svg>
            {triRecent ? "Plus récent d'abord" : "Plus ancien d'abord"}
          </button>
        </div>

        {/* Corps */}
        {loadingHosp ? (
          <div className="flex items-center justify-center py-12 text-gray-300">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Chargement…
          </div>
        ) : hospitalises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-gray-300">
            <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">Aucun patient hospitalisé en ce moment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* En-tête colonnes */}
            <div className="grid grid-cols-12 gap-2 px-6 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50/60">
              <div className="col-span-3">Patient</div>
              <div className="col-span-3">Service</div>
              <div className="col-span-2">Admission</div>
              <div className="col-span-2">Durée</div>
              <div className="col-span-2">Motif / Diagnostic</div>
            </div>

            {listeTriee.map((p, i) => {
              const jours = joursHospitalisation(p.date_admission);
              const serviceColor = SERVICE_COLORS[p.service_hospitalisation] ?? "bg-gray-100 text-gray-600";
              const alerte = jours >= 7;

              return (
                <div
                  key={p.consultation_id}
                  onClick={() => router.push(`/medecin/patient/${p.code}`)}
                  className="grid grid-cols-12 gap-2 px-6 py-3.5 items-center hover:bg-primary-50/40 cursor-pointer transition-colors group"
                >
                  {/* Rang + Nom */}
                  <div className="col-span-3 flex items-center gap-3">
                    <span className="text-xs text-gray-300 font-mono w-5 text-right shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 truncate group-hover:text-primary-700 transition-colors">
                        {p.nom} {p.prenom}
                      </p>
                      <p className="text-xs text-gray-400 font-mono">{p.code}</p>
                    </div>
                  </div>

                  {/* Service */}
                  <div className="col-span-3">
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${serviceColor}`}>
                      {p.service_hospitalisation || "—"}
                    </span>
                  </div>

                  {/* Date d'admission */}
                  <div className="col-span-2 text-sm text-gray-600">
                    {formatDate(p.date_admission)}
                  </div>

                  {/* Durée */}
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1 text-sm font-semibold px-2 py-0.5 rounded-md ${alerte ? "text-red-600 bg-red-50" : "text-gray-700 bg-gray-100"}`}>
                      {alerte && (
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        </svg>
                      )}
                      {jours} j
                    </span>
                  </div>

                  {/* Motif / Diagnostic */}
                  <div className="col-span-2 text-xs text-gray-500 truncate">
                    {p.diagnostic || p.motif || "—"}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pied : légende alerte */}
        {!loadingHosp && hospitalises.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-50 flex items-center gap-2 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Durée surlignée en rouge après 7 jours d'hospitalisation — Cliquez sur une ligne pour ouvrir le dossier
          </div>
        )}
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
                  <ProfessionSelect value={newPatientForm.profession} onChange={v => setNewPatientForm(f => ({ ...f, profession: v }))} />
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
    </div>
  );
}
