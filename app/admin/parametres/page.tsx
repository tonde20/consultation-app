"use client";
import { useState, useEffect } from "react";

export default function ParametresPage() {
  const [settings, setSettings] = useState({
    etablissement_nom: "CMA de Boromo",
    consultation_frais: "1250",
    certificat_frais: "2000",
    consultation_validite_jours: "10",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdMessage, setPwdMessage] = useState({ type: "", text: "" });
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => {
      setSettings(prev => ({ ...prev, ...d }));
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Paramètres enregistrés avec succès" });
    } else {
      const errData = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: errData.error || "Erreur lors de la sauvegarde" });
    }
    setSaving(false);
    setTimeout(() => setMessage({ type: "", text: "" }), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMessage({ type: "error", text: "Les mots de passe ne correspondent pas" });
      return;
    }
    setSavingPwd(true);
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setPwdMessage({ type: "success", text: "Mot de passe modifié avec succès" });
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } else {
      setPwdMessage({ type: "error", text: data.error || "Erreur" });
    }
    setSavingPwd(false);
    setTimeout(() => setPwdMessage({ type: "", text: "" }), 4000);
  };

  if (loading) return <div className="p-8 text-gray-400">Chargement...</div>;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-1">Configuration de l'établissement</p>
      </div>

      {message.text && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Informations de l'établissement</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'établissement</label>
            <input
              type="text"
              value={settings.etablissement_nom}
              onChange={e => setSettings(s => ({ ...s, etablissement_nom: e.target.value }))}
              className="input-field"
              required
            />
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-700 mb-4">Tarification (FCFA)</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frais de consultation (FCFA)</label>
              <input
                type="number"
                value={settings.consultation_frais}
                onChange={e => setSettings(s => ({ ...s, consultation_frais: e.target.value }))}
                className="input-field"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frais de certificat médical (FCFA)</label>
              <input
                type="number"
                value={settings.certificat_frais}
                onChange={e => setSettings(s => ({ ...s, certificat_frais: e.target.value }))}
                className="input-field"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Validité de la consultation (jours)</label>
              <input
                type="number"
                value={settings.consultation_validite_jours}
                onChange={e => setSettings(s => ({ ...s, consultation_validite_jours: e.target.value }))}
                className="input-field"
                min="1"
                max="365"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Le patient peut reconsulter gratuitement durant cette période.</p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary px-8">
          {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
        </button>
      </form>

      {/* Changement de mot de passe */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-gray-800 mb-1">Sécurité du compte</h2>
        <p className="text-gray-500 text-sm mb-5">Modifier le mot de passe administrateur</p>

        {pwdMessage.text && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${pwdMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {pwdMessage.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="card space-y-4">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Changer le mot de passe
          </h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel *</label>
            <input
              type="password"
              value={pwdForm.currentPassword}
              onChange={e => setPwdForm(f => ({ ...f, currentPassword: e.target.value }))}
              className="input-field"
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe *</label>
            <input
              type="password"
              value={pwdForm.newPassword}
              onChange={e => setPwdForm(f => ({ ...f, newPassword: e.target.value }))}
              className="input-field"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-400 mt-1">Minimum 6 caractères</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe *</label>
            <input
              type="password"
              value={pwdForm.confirmPassword}
              onChange={e => setPwdForm(f => ({ ...f, confirmPassword: e.target.value }))}
              className="input-field"
              required
              autoComplete="new-password"
            />
          </div>
          <button type="submit" disabled={savingPwd} className="btn-primary px-6">
            {savingPwd ? "Modification..." : "Modifier le mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
