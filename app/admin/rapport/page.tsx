"use client";
import { useState } from "react";
import { genererRapportConsultations } from "@/lib/pdf";

interface RapportData {
  total: number;
  ageMoyen: number;
  parSexe: { sexe: string; count: string }[];
  diagnostics: { diagnostic: string; count: string }[];
  parProfession: { profession: string; count: string }[];
  parResidence: { residence: string; count: string }[];
  dateDebut?: string | null;
  dateFin?: string | null;
}

export default function RapportPage() {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [dateDebut, setDateDebut] = useState(firstOfMonth);
  const [dateFin, setDateFin] = useState(today);
  const [rapport, setRapport] = useState<RapportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [etablissement, setEtablissement] = useState("CMA de Boromo");
  const [error, setError] = useState("");

  const fetchRapport = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (dateDebut) params.set("date_debut", dateDebut);
      if (dateFin) params.set("date_fin", dateFin);

      const [rapportRes, settingsRes] = await Promise.all([
        fetch(`/api/admin/rapport?${params}`),
        fetch("/api/settings"),
      ]);
      const data = await rapportRes.json();
      const settings = await settingsRes.json();
      if (settings.etablissement_nom) setEtablissement(settings.etablissement_nom);
      if (!rapportRes.ok) { setError(data.error || "Erreur"); return; }
      setRapport(data);
    } finally {
      setLoading(false);
    }
  };

  const handlePDF = () => {
    if (!rapport) return;
    genererRapportConsultations({
      etablissement,
      ...rapport,
    });
  };

  const totalSexe = rapport?.parSexe.reduce((a, s) => a + Number(s.count), 0) ?? 0;
  const masculin = rapport?.parSexe.find(s => s.sexe === "M");
  const feminin  = rapport?.parSexe.find(s => s.sexe === "F");

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Rapport des consultations</h1>
        <p className="text-gray-500 text-sm mt-1">Statistiques épidémiologiques des consultations</p>
      </div>

      {/* Filtres */}
      <div className="card mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
          <input type="date" value={dateDebut} onChange={e => setDateDebut(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
          <input type="date" value={dateFin} onChange={e => setDateFin(e.target.value)} className="input-field" />
        </div>
        <button onClick={fetchRapport} disabled={loading} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          {loading ? "Chargement..." : "Générer le rapport"}
        </button>
        {rapport && (
          <button onClick={handlePDF} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Télécharger PDF
          </button>
        )}
      </div>

      {error && <div className="mb-4 px-4 py-3 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">{error}</div>}

      {rapport && (
        <div className="space-y-6">
          {/* Indicateurs clés */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-primary-700">{rapport.total}</p>
              <p className="text-sm text-gray-500 mt-1">Consultations</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-teal-600">{rapport.ageMoyen > 0 ? `${rapport.ageMoyen}` : "—"}</p>
              <p className="text-sm text-gray-500 mt-1">Âge moyen (ans)</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-blue-600">{masculin?.count ?? 0}</p>
              <p className="text-sm text-gray-500 mt-1">Hommes {totalSexe > 0 ? `(${Math.round(Number(masculin?.count ?? 0) / totalSexe * 100)}%)` : ""}</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-pink-600">{feminin?.count ?? 0}</p>
              <p className="text-sm text-gray-500 mt-1">Femmes {totalSexe > 0 ? `(${Math.round(Number(feminin?.count ?? 0) / totalSexe * 100)}%)` : ""}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Principaux diagnostics */}
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
                Principaux diagnostics
              </h2>
              {rapport.diagnostics.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun diagnostic enregistré</p>
              ) : (
                <div className="space-y-2">
                  {rapport.diagnostics.map((d, i) => (
                    <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                      <span className="text-gray-700 flex-1 mr-2">{d.diagnostic}</span>
                      <span className="font-semibold text-teal-700 whitespace-nowrap">{d.count} cas</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Distribution par sexe */}
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-500 inline-block"></span>
                Distribution par sexe
              </h2>
              {rapport.parSexe.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucune donnée</p>
              ) : (
                <div className="space-y-3">
                  {rapport.parSexe.map((s, i) => {
                    const pct = totalSexe > 0 ? Math.round(Number(s.count) / totalSexe * 100) : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{s.sexe === "M" ? "Masculin" : "Féminin"}</span>
                          <span className="font-semibold">{s.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div className={`h-2 rounded-full ${s.sexe === "M" ? "bg-blue-500" : "bg-pink-500"}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Distribution par profession */}
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                Distribution par profession
              </h2>
              {rapport.parProfession.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucune profession enregistrée</p>
              ) : (
                <div className="space-y-2">
                  {rapport.parProfession.map((p, i) => {
                    const total = rapport.parProfession.reduce((a, x) => a + Number(x.count), 0);
                    const pct = Math.round(Number(p.count) / total * 100);
                    return (
                      <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-700 flex-1 mr-2">{p.profession}</span>
                        <span className="font-semibold text-green-700 whitespace-nowrap">{p.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Distribution par provenance */}
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                Distribution par provenance
              </h2>
              {rapport.parResidence.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucune résidence enregistrée</p>
              ) : (
                <div className="space-y-2">
                  {rapport.parResidence.map((r, i) => {
                    const total = rapport.parResidence.reduce((a, x) => a + Number(x.count), 0);
                    const pct = Math.round(Number(r.count) / total * 100);
                    return (
                      <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-gray-50 last:border-0">
                        <span className="text-gray-700 flex-1 mr-2">{r.residence}</span>
                        <span className="font-semibold text-orange-700 whitespace-nowrap">{r.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!rapport && !loading && (
        <div className="card text-center py-12 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          <p>Sélectionnez une période et cliquez sur <strong>Générer le rapport</strong></p>
        </div>
      )}
    </div>
  );
}
