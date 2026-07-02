"use client";
import { useState, useEffect } from "react";

const STATUTS: Record<string, string> = {
  en_attente: "En attente", confirme: "Confirmé", annule: "Annulé", effectue: "Effectué"
};
const STATUT_COLORS: Record<string, string> = {
  en_attente: "bg-yellow-100 text-yellow-700",
  confirme: "bg-green-100 text-green-700",
  annule: "bg-red-100 text-red-700",
  effectue: "bg-blue-100 text-blue-700",
};

export default function AdminRendezVousPage() {
  const [rdvs, setRdvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifyModal, setNotifyModal] = useState<{ rdv: any } | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [filtre, setFiltre] = useState("tous");

  useEffect(() => {
    fetch("/api/rendez-vous")
      .then(r => r.json())
      .then(d => { setRdvs(d); setLoading(false); });
  }, []);

  const openNotify = (rdv: any) => {
    setNotifyModal({ rdv });
    setMessage(`Bonjour Dr. ${rdv.doctor_prenom} ${rdv.doctor_nom}, veuillez confirmer le rendez-vous de ${rdv.patient_prenom} ${rdv.patient_nom} prévu le ${new Date(rdv.date_heure).toLocaleString("fr-FR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" })}.`);
    setSent(false);
  };

  const sendNotification = async () => {
    if (!notifyModal || !message.trim()) return;
    setSending(true);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doctor_id: notifyModal.rdv.doctor_id, message, rdv_id: notifyModal.rdv.id }),
    });
    setSending(false);
    setSent(true);
    setTimeout(() => setNotifyModal(null), 1500);
  };

  const rdvsFiltres = filtre === "tous" ? rdvs : rdvs.filter(r => r.statut === filtre);

  const grouped = rdvsFiltres.reduce((acc: Record<string, any[]>, rdv) => {
    const date = new Date(rdv.date_heure).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(rdv);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Rendez-vous</h1>
        <p className="text-gray-500 text-sm mt-1">Tous les rendez-vous — {rdvs.length} au total</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[["tous", "Tous"], ["en_attente", "En attente"], ["confirme", "Confirmés"], ["annule", "Annulés"], ["effectue", "Effectués"]].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFiltre(val)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filtre === val ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
          >
            {label}
            {val !== "tous" && <span className="ml-1.5 text-xs opacity-70">({rdvs.filter(r => r.statut === val).length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Chargement...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card text-center py-12 text-gray-400">Aucun rendez-vous</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, list]) => (
            <div key={date}>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">{date}</h2>
              <div className="space-y-3">
                {list.map((rdv: any) => (
                  <div key={rdv.id} className="card">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-800">
                            {new Date(rdv.date_heure).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${STATUT_COLORS[rdv.statut]}`}>
                            {STATUTS[rdv.statut]}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{rdv.patient_prenom} {rdv.patient_nom}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Dr. {rdv.doctor_prenom} {rdv.doctor_nom}</p>
                        {rdv.motif && <p className="text-xs text-gray-500 mt-0.5 italic">{rdv.motif}</p>}
                      </div>
                      <button
                        onClick={() => openNotify(rdv)}
                        className="shrink-0 flex items-center gap-2 px-3 py-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-xl text-xs font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Notifier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal notification */}
      {notifyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="font-semibold text-gray-800 mb-1">Notifier le médecin</h2>
            <p className="text-xs text-gray-400 mb-4">
              Dr. {notifyModal.rdv.doctor_prenom} {notifyModal.rdv.doctor_nom}
            </p>

            {sent ? (
              <div className="py-6 text-center text-green-600 font-medium">✓ Notification envoyée</div>
            ) : (
              <>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  className="input-field w-full resize-none mb-4"
                  placeholder="Message pour le médecin..."
                />
                <div className="flex gap-3">
                  <button onClick={sendNotification} disabled={sending || !message.trim()} className="btn-primary flex-1">
                    {sending ? "Envoi..." : "Envoyer la notification"}
                  </button>
                  <button onClick={() => setNotifyModal(null)} className="btn-secondary flex-1">Annuler</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
