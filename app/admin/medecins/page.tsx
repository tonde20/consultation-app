"use client";
import { useState, useEffect } from "react";

interface Doctor {
  id: number;
  nom: string;
  prenom: string;
  telephone: string;
  specialite: string;
  username: string;
  actif: number;
}

export default function MedecinsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doctor | null>(null);
  const [form, setForm] = useState({ nom: "", prenom: "", telephone: "", specialite: "Médecin généraliste", username: "", password: "" });
  const [message, setMessage] = useState({ type: "", text: "" });
  const [confirmDelete, setConfirmDelete] = useState<Doctor | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const fetchDoctors = () => {
    setLoading(true);
    fetch("/api/doctors").then(r => r.json()).then(d => { setDoctors(d); setLoading(false); });
  };

  useEffect(() => { fetchDoctors(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingDoc ? "PUT" : "POST";
    const url = editingDoc ? `/api/doctors/${editingDoc.id}` : "/api/doctors";
    const body = editingDoc
      ? { nom: form.nom, prenom: form.prenom, telephone: form.telephone, specialite: form.specialite, ...(form.password ? { password: form.password } : {}) }
      : form;
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
      setMessage({ type: "success", text: editingDoc ? "Médecin modifié avec succès" : "Médecin ajouté avec succès" });
      setShowForm(false);
      setEditingDoc(null);
      setForm({ nom: "", prenom: "", telephone: "", specialite: "Médecin généraliste", username: "", password: "" });
      fetchDoctors();
    } else {
      setMessage({ type: "error", text: data.error || "Erreur" });
    }
  };

  const handleToggleActif = async (doc: Doctor) => {
    await fetch(`/api/doctors/${doc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actif: doc.actif ? 0 : 1 }),
    });
    fetchDoctors();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const res = await fetch(`/api/doctors/${confirmDelete.id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage({ type: "success", text: `Dr. ${confirmDelete.prenom} ${confirmDelete.nom} supprimé définitivement.` });
      setConfirmDelete(null);
      fetchDoctors();
    } else {
      const data = await res.json();
      setMessage({ type: "error", text: data.error || "Erreur lors de la suppression" });
      setConfirmDelete(null);
    }
  };

  const startEdit = (doc: Doctor) => {
    setEditingDoc(doc);
    setForm({ nom: doc.nom, prenom: doc.prenom, telephone: doc.telephone, specialite: doc.specialite, username: doc.username, password: "" });
    setShowForm(true);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestion des médecins</h1>
          <p className="text-gray-500 text-sm mt-1">{doctors.filter(d => d.actif).length} médecin(s) actif(s)</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditingDoc(null); setForm({ nom: "", prenom: "", telephone: "", specialite: "Médecin généraliste", username: "", password: "" }); }} className="btn-primary flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Ajouter un médecin
        </button>
      </div>

      {message.text && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
            <h2 className="font-semibold text-gray-800 mb-4">{editingDoc ? "Modifier le médecin" : "Nouveau médecin"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                <input type="text" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
                <input type="text" value={form.specialite} onChange={e => setForm(f => ({ ...f, specialite: e.target.value }))} className="input-field" />
              </div>
              {!editingDoc && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur *</label>
                  <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="input-field" required />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{editingDoc ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe *"}</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="input-field pr-10"
                    required={!editingDoc}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary flex-1">Enregistrer</button>
                <button type="button" onClick={() => { setShowForm(false); setEditingDoc(null); }} className="btn-secondary flex-1">Annuler</button>
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
            <p className="text-gray-600 text-sm mb-1">Vous allez supprimer définitivement :</p>
            <p className="font-bold text-gray-800 mb-1">Dr. {confirmDelete.prenom} {confirmDelete.nom}</p>
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-4">
              Cette action supprimera aussi toutes les consultations, rendez-vous et certificats de ce médecin. Elle est irréversible.
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
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Médecin</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Téléphone</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Spécialité</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Identifiant</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Statut</th>
                  <th className="text-left py-3 px-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map(doc => (
                  <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium">Dr. {doc.prenom} {doc.nom}</td>
                    <td className="py-3 px-3 text-gray-600">{doc.telephone}</td>
                    <td className="py-3 px-3 text-gray-600">{doc.specialite}</td>
                    <td className="py-3 px-3 text-gray-500 font-mono text-xs">{doc.username}</td>
                    <td className="py-3 px-3">
                      {doc.actif ? <span className="badge-green">Actif</span> : <span className="badge-red">Inactif</span>}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(doc)} className="text-primary-600 hover:text-primary-700 text-xs font-medium">Modifier</button>
                        <button onClick={() => handleToggleActif(doc)} className={`text-xs font-medium ${doc.actif ? "text-orange-500 hover:text-orange-700" : "text-green-600 hover:text-green-700"}`}>
                          {doc.actif ? "Désactiver" : "Activer"}
                        </button>
                        <button onClick={() => setConfirmDelete(doc)} className="text-red-500 hover:text-red-700 text-xs font-medium">Supprimer</button>
                      </div>
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
