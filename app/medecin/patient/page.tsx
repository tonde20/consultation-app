"use client";
import { useState, useEffect, useRef } from "react";
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
  profession?: string;
  residence?: string;
  decede: number;
}

export default function PatientListPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState<PatientResult[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPatients = (q: string) => {
    setLoading(true);
    fetch(`/api/patients?search=${encodeURIComponent(q)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setPatients(d))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPatients(""); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPatients(search), 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Liste des patients</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? "Recherche..." : `${patients.length} patient(s)`}
          </p>
        </div>
      </div>

      <div className="max-w-xl mb-6">
        <div className="relative">
          <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, prénom ou code..."
            className="input-field pl-10 text-lg"
            autoFocus
          />
        </div>
      </div>

      <div className="card divide-y divide-gray-100">
        {loading && patients.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Chargement...</div>
        ) : patients.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Aucun patient trouvé</div>
        ) : (
          patients.map(p => (
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
                    <span className="text-xs text-gray-400">{formatAge(p.date_naissance)}</span>
                  )}
                  <span className="text-xs text-gray-400">{p.sexe === "M" ? "Masculin" : "Féminin"}</span>
                  {p.telephone && <span className="text-xs text-gray-400">📱 {p.telephone}</span>}
                </div>
              </div>
              <svg className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
