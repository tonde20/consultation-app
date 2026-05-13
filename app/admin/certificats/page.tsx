"use client";
import { useState, useEffect } from "react";

interface Certificat {
  id: number;
  patient_id: number;
  patient_nom: string;
  patient_prenom: string;
  doctor_nom: string;
  doctor_prenom: string;
  type: string;
  date: string;
  montant: number;
}

export default function CertificatsAdminPage() {
  const [certificats, setCertificats] = useState<Certificat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<Certificat | null>(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchCerts = () => {
    setLoading(true);
    fetch("/api/certificats")
      .then(r => r.json())
      .then(d => { setCertificats(d); setLoading(false); });
  };

  useEffect(() => { fetchCerts(); }, []);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const res = await fetch(`/api/certificats/${confirmDelete.id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage({ type: "success", text: `Certificat ${confirmDelete.type} de ${confirmDelete.patient_prenom} ${confirmDelete.patient_nom} supprimé. Recettes et rapport mis à jour.` });
      setConfirmDelete(null);
      fetchCerts();
    } else {
      const d = await res.json();
      setMessage({ type: "error", text: d.error || "Erreur lors de la suppression" });
      setConfirmDelete(null);
    }
  };

  const filtered = certificats.filter(c => {
    const q = search.toLowerCase();
    return (
      c.patient_nom?.toLowerCase().includes(q) ||
      c.patient_prenom?.toLowerCase().includes(q) ||
      c.type?.toLowerCase().includes(q) ||
      c.doctor_nom?.toLowerCase().includes(q)
    );
  });

  const totalCertificats = filtered.length;
  const totalRecettes = filtered.reduce((s, c) => s + (c.montant || 0), 0);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des certificats</h1>
          <p className="text-gray-500 text-sm mt-1">{totalCertificats} certificat(s) — {totalRecettes.toLocaleString()} FCFA de recettes</p>
        </div>
      </div>

      {message.text && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
          <button onClick={() => setMessage({ type: "", text: "" })} className="ml-3 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* Confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-semibold text-red-700 mb-2">Confirmer la suppression</h2>
            <p className="text-gray-600 text-sm mb-1">Vous allez supprimer le certificat :</p>
            <div className="bg-gray-50 rounded-xl p-3 mb-3 text-sm space-y-1">
              <p><span className="font-semibold">Patient :</span> {confirmDelete.patient_prenom} {confirmDelete.patient_nom}</p>
              <p><span className="font-semibold">Type :</span> Certificat {confirmDelete.type}</p>
              <p><span className="font-semibold">Date :</span> {new Date(confirmDelete.date).toLocaleDateString("fr-FR")}</p>
              <p><span className="font-semibold">Montant :</span> {confirmDelete.montant > 0 ? `${confirmDelete.montant.toLocaleString()} FCFA` : "Gratuit"}</p>
            </div>
            {confirmDelete.montant > 0 && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-4">
                Ce certificat a généré un paiement de {confirmDelete.montant.toLocaleString()} FCFA qui sera également supprimé des recettes et du rapport.
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                Supprimer définitivement
              </button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-secondary">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="card mb-6">
        <input
          type="text"
          placeholder="Rechercher par patient, type, médecin..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      <div className="card">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Aucun certificat trouvé</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Date</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Patient</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Type</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Médecin</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Montant</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 text-gray-600 whitespace-nowrap">
                      {new Date(c.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-3 px-3 font-medium text-gray-800">
                      {c.patient_prenom} {c.patient_nom}
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-teal-100 text-teal-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {c.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-gray-600">Dr. {c.doctor_prenom} {c.doctor_nom}</td>
                    <td className="py-3 px-3">
                      {c.montant > 0
                        ? <span className="font-semibold text-gray-800">{c.montant.toLocaleString()} FCFA</span>
                        : <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Gratuit</span>
                      }
                    </td>
                    <td className="py-3 px-3">
                      <button
                        onClick={() => setConfirmDelete(c)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
