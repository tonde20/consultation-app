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
  hospitalisations: { total: number; sorties: number };
  examensParCategorie: { categorie: string; count: string }[];
  topExamens: { categorie: string; type_examen: string; count: string }[];
  dateDebut?: string | null;
  dateFin?: string | null;
}

function BarChart({ items, colorClass }: { items: { label: string; count: number }[]; colorClass: string }) {
  const max = Math.max(...items.map(i => i.count), 1);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="text-gray-600 truncate mr-2 max-w-[65%]">{item.label}</span>
            <span className="font-semibold text-gray-800">{item.count} cas</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full ${colorClass} transition-all`} style={{ width: `${(item.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function catLabel(cat: string) {
  if (cat === "bilan_sanguin") return "🩸 Bilan sanguin";
  if (cat === "imagerie") return "🔬 Imagérie";
  return "📋 Autres";
}
function catColor(cat: string) {
  if (cat === "bilan_sanguin") return "bg-red-500";
  if (cat === "imagerie") return "bg-blue-500";
  return "bg-gray-500";
}

export default function RapportPage() {
  const today = new Date().toISOString().split("T")[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [dateDebut, setDateDebut] = useState(firstOfMonth);
  const [dateFin, setDateFin] = useState(today);
  const [rapport, setRapport] = useState<RapportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [etablissement, setEtablissement] = useState("HOPITAL DE DISTRICT DE BOROMO");
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
    genererRapportConsultations({ etablissement, ...rapport });
  };

  const totalSexe = rapport?.parSexe.reduce((a, s) => a + Number(s.count), 0) ?? 0;
  const masculin = rapport?.parSexe.find(s => s.sexe === "M");
  const feminin  = rapport?.parSexe.find(s => s.sexe === "F");

  const totalExamens = rapport?.examensParCategorie.reduce((a, e) => a + Number(e.count), 0) ?? 0;

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Rapport des consultations</h1>
        <p className="text-gray-500 text-sm mt-1">Statistiques épidémiologiques et activité médicale</p>
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
          {/* KPIs principaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center border-t-4 border-primary-500">
              <p className="text-3xl font-bold text-primary-700">{rapport.total}</p>
              <p className="text-sm text-gray-500 mt-1">Consultations</p>
              <p className="text-xs text-gray-400">(visites uniques)</p>
            </div>
            <div className="card text-center border-t-4 border-teal-500">
              <p className="text-3xl font-bold text-teal-600">{rapport.ageMoyen > 0 ? rapport.ageMoyen : "—"}</p>
              <p className="text-sm text-gray-500 mt-1">Âge moyen (ans)</p>
            </div>
            <div className="card text-center border-t-4 border-orange-500">
              <p className="text-3xl font-bold text-orange-600">{rapport.hospitalisations.total}</p>
              <p className="text-sm text-gray-500 mt-1">Hospitalisations</p>
              <p className="text-xs text-gray-400">{rapport.hospitalisations.sorties} sortie(s) enregistrée(s)</p>
            </div>
            <div className="card text-center border-t-4 border-purple-500">
              <p className="text-3xl font-bold text-purple-600">{totalExamens}</p>
              <p className="text-sm text-gray-500 mt-1">Examens demandés</p>
            </div>
          </div>

          {/* Ligne 2 — Sexe + Diagnostics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  {/* Donut simplifié en CSS */}
                  <div className="flex items-center justify-center gap-8 py-3">
                    {[
                      { label: "Hommes", count: Number(masculin?.count ?? 0), color: "bg-blue-500", text: "text-blue-700" },
                      { label: "Femmes", count: Number(feminin?.count ?? 0), color: "bg-pink-500", text: "text-pink-700" },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <div className={`text-3xl font-bold ${s.text}`}>{s.count}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${s.color}`}></div>
                          <span className="text-xs text-gray-500">{s.label} {totalSexe > 0 ? `(${Math.round(s.count / totalSexe * 100)}%)` : ""}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {rapport.parSexe.map((s, i) => {
                    const pct = totalSexe > 0 ? Math.round(Number(s.count) / totalSexe * 100) : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{s.sexe === "M" ? "Masculin" : "Féminin"}</span>
                          <span className="font-semibold">{s.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div className={`h-2.5 rounded-full ${s.sexe === "M" ? "bg-blue-500" : "bg-pink-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Principaux diagnostics */}
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-teal-500 inline-block"></span>
                Principaux diagnostics
              </h2>
              {rapport.diagnostics.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucun diagnostic enregistré</p>
              ) : (
                <BarChart
                  items={rapport.diagnostics.map(d => ({ label: d.diagnostic, count: Number(d.count) }))}
                  colorClass="bg-teal-500"
                />
              )}
            </div>
          </div>

          {/* Examens */}
          {totalExamens > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Répartition par catégorie */}
              <div className="card">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                  Examens par type
                </h2>
                <div className="space-y-3">
                  {rapport.examensParCategorie.map((e, i) => {
                    const pct = totalExamens > 0 ? Math.round(Number(e.count) / totalExamens * 100) : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{catLabel(e.categorie)}</span>
                          <span className="font-semibold">{e.count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div className={`h-2.5 rounded-full ${catColor(e.categorie)}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top examens demandés */}
              <div className="card">
                <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span>
                  Examens les plus demandés
                </h2>
                <BarChart
                  items={rapport.topExamens.slice(0, 8).map(e => ({ label: e.type_examen, count: Number(e.count) }))}
                  colorClass="bg-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Profession + Résidence */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                Distribution par profession
              </h2>
              {rapport.parProfession.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucune profession enregistrée</p>
              ) : (
                <BarChart
                  items={rapport.parProfession.map(p => ({ label: p.profession, count: Number(p.count) }))}
                  colorClass="bg-green-500"
                />
              )}
            </div>

            <div className="card">
              <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                Distribution par provenance
              </h2>
              {rapport.parResidence.length === 0 ? (
                <p className="text-gray-400 text-sm">Aucune résidence enregistrée</p>
              ) : (
                <BarChart
                  items={rapport.parResidence.map(r => ({ label: r.residence, count: Number(r.count) }))}
                  colorClass="bg-orange-500"
                />
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
