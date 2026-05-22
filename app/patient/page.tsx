"use client";
import { useState, useEffect } from "react";

function formatAge(dateNaissance: string): string {
  const diffMs = Date.now() - new Date(dateNaissance).getTime();
  const years = Math.floor(diffMs / (365.25 * 24 * 3600 * 1000));
  if (years >= 5) return `${years} ans`;
  const months = Math.floor(diffMs / (30.44 * 24 * 3600 * 1000));
  if (months >= 1) return `${months} mois`;
  return `${Math.floor(diffMs / (24 * 3600 * 1000))} j`;
}

export default function PatientDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) return;
      const { user } = await meRes.json();
      setUserInfo(user);
      const patRes = await fetch(`/api/patients/${user.code}`);
      if (patRes.ok) setData(await patRes.json());
      setLoading(false);
    };
    fetchAll();
  }, []);

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>;
  if (!data) return <div className="p-8 text-red-500">Erreur de chargement</div>;

  const { patient, consultations } = data;
  const lastConsult = consultations[0];
  const age = patient.date_naissance ? formatAge(patient.date_naissance) : null;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Mon dossier médical</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenue, {patient.prenom} {patient.nom}</p>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-700 font-bold text-xl">
            {patient.prenom.charAt(0)}{patient.nom.charAt(0)}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{patient.prenom} {patient.nom}</h2>
            <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
              <span className="font-mono text-primary-700 font-medium">{patient.code}</span>
              {age && <span>{age}</span>}
              <span>{patient.sexe === "M" ? "Masculin" : "Féminin"}</span>
              {patient.telephone && <span>{patient.telephone}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card bg-primary-50 border-primary-100">
          <p className="text-sm text-primary-600">Consultations</p>
          <p className="text-3xl font-bold text-primary-700 mt-1">{consultations.length}</p>
          <p className="text-xs text-primary-500 mt-1">au total</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Dernière consultation</p>
          <p className="text-base font-bold text-gray-700 mt-1">
            {lastConsult ? new Date(lastConsult.date).toLocaleDateString("fr-FR") : "—"}
          </p>
          {lastConsult && <p className="text-xs text-gray-400 mt-1">Dr. {lastConsult.doctor_prenom} {lastConsult.doctor_nom}</p>}
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Prescriptions actives</p>
          <p className="text-3xl font-bold text-teal-600 mt-1">
            {consultations.filter((c: any) => c.prescriptions?.length > 0 && new Date(c.valide_jusqu) >= new Date()).length}
          </p>
          <p className="text-xs text-gray-400 mt-1">en cours</p>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">Historique récent</h2>
        {consultations.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Aucune consultation enregistrée</p>
        ) : (
          <div className="space-y-3">
            {consultations.slice(0, 5).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium">{new Date(c.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  <p className="text-xs text-gray-500">Dr. {c.doctor_prenom} {c.doctor_nom}</p>
                  {c.motif && <p className="text-xs text-gray-400">{c.motif}</p>}
                </div>
                <div className="flex gap-2">
                  {c.prescriptions?.length > 0 && <span className="badge-green">{c.prescriptions.length} prescription(s)</span>}
                  {c.examens?.length > 0 && <span className="badge-blue">{c.examens.length} examen(s)</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
