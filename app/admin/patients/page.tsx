"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Patient {
  id: number;
  code: string;
  nom: string;
  prenom: string;
  date_naissance: string;
  sexe: string;
  telephone: string;
  adresse: string;
  profession?: string;
  residence?: string;
  decede?: number;
}

const emptyForm = { nom: "", prenom: "", date_naissance: "", sexe: "M", telephone: "", adresse: "", profession: "", residence: "" };

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [confirmDelete, setConfirmDelete] = useState<Patient | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  }, []);

  const fetchPatients = (q = "") => {
    setLoading(true);
    fetch(`/api/patients?search=${encodeURIComponent(q)}`).then(r => r.json()).then(d => { setPatients(d); setLoading(false); });
  };

  useEffect(() => { fetchPatients(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchPatients(search); };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) {
      setMessage({ type: "success", text: `Patient créé. Code patient : ${data.code}` });
      setShowForm(false);
      setForm(emptyForm);
      fetchPatients();
    } else {
      setMessage({ type: "error", text: data.error || "Erreur" });
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const res = await fetch(`/api/patients/${confirmDelete.code}`, { method: "DELETE" });
    if (res.ok) {
      setMessage({ type: "success", text: `Patient ${confirmDelete.prenom} ${confirmDelete.nom} supprimé.` });
      setConfirmDelete(null);
      fetchPatients(search);
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Erreur lors de la suppression" });
      setConfirmDelete(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Patients</h1>
          <p className="text-gray-500 text-sm mt-1">
            {patients.filter(p => !p.decede).length} patient(s) actif(s)
            {patients.filter(p => p.decede).length > 0 && (
              <span className="ml-2 text-red-500 font-medium">· {patients.filter(p => p.decede).length} décédé(s)</span>
            )}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nouveau patient
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
          <button onClick={() => setMessage({ type: "", text: "" })} className="ml-3 font-bold">×</button>
        </div>
      )}

      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, prénom ou code..." className="input-field max-w-sm" />
        <button type="submit" className="btn-primary">Rechercher</button>
        {search && <button type="button" onClick={() => { setSearch(""); fetchPatients(""); }} className="btn-secondary">Réinitialiser</button>}
      </form>

      {/* Modal création */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-gray-800 mb-4">Nouveau patient</h2>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input type="text" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input type="text" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} className="input-field" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                  <input type="date" value={form.date_naissance} onChange={e => setForm(f => ({ ...f, date_naissance: e.target.value }))} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sexe</label>
                  <select value={form.sexe} onChange={e => setForm(f => ({ ...f, sexe: e.target.value }))} className="input-field">
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="text" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
                <input type="text" value={form.profession} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))} className="input-field" placeholder="Ex: Agriculteur, Commerçant..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Résidence / Provenance</label>
                <input type="text" value={form.residence} onChange={e => setForm(f => ({ ...f, residence: e.target.value }))} className="input-field" placeholder="Ex: Boromo, Dédougou..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <input type="text" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} className="input-field" />
              </div>
              <p className="text-xs text-gray-400">Le code patient et le mot de passe initial seront générés automatiquement.</p>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">Créer le patient</button>
                <button type="button" onClick={() => { setShowForm(false); setForm(emptyForm); }} className="btn-secondary flex-1">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal confirmation suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-semibold text-red-700 mb-2">Confirmer la suppression</h2>
            <p className="text-gray-600 text-sm mb-1">
              Vous allez supprimer définitivement le patient :
            </p>
            <p className="font-bold text-gray-800 mb-1">{confirmDelete.prenom} {confirmDelete.nom} — <span className="font-mono text-xs">{confirmDelete.code}</span></p>
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-4">
              Cette action supprimera aussi toutes ses consultations, rendez-vous, certificats et paiements. Elle est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg text-sm transition-colors">Supprimer définitivement</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 btn-secondary">Annuler</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="text-center py-8 text-gray-400">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Code</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Nom complet</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Naissance</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Sexe</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Profession</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Résidence</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Téléphone</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} className={`border-b hover:bg-gray-50 ${p.decede ? "bg-red-50/40 border-red-100" : "border-gray-50"}`}>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">{p.code}</span>
                        <button
                          onClick={() => copyCode(p.code)}
                          title="Copier le code"
                          className={`text-xs px-1.5 py-0.5 rounded transition-colors ${copiedCode === p.code ? "bg-green-100 text-green-700" : "text-gray-400 hover:text-primary-600 hover:bg-primary-50"}`}
                        >
                          {copiedCode === p.code ? "✓" : "⎘"}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium">
                      <span className={p.decede ? "text-gray-400 line-through decoration-red-400" : ""}>{p.prenom} {p.nom}</span>
                      {p.decede === 1 && (
                        <span className="ml-2 inline-flex items-center gap-0.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          ✝ DCD
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-gray-500">{p.date_naissance ? new Date(p.date_naissance).toLocaleDateString("fr-FR") : "—"}</td>
                    <td className="py-3 px-3 text-gray-500">{p.sexe === "M" ? "Masc." : "Fém."}</td>
                    <td className="py-3 px-3 text-gray-500">{p.profession || "—"}</td>
                    <td className="py-3 px-3 text-gray-500">{p.residence || "—"}</td>
                    <td className="py-3 px-3 text-gray-500">{p.telephone || "—"}</td>
                    <td className="py-3 px-3">
                      <div className="flex gap-3">
                        <Link href={`/medecin/patient/${p.code}`} className="text-primary-600 hover:text-primary-700 text-xs font-medium">Dossier</Link>
                        <button onClick={() => setConfirmDelete(p)} className="text-red-500 hover:text-red-700 text-xs font-medium">Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-400">Aucun patient trouvé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
