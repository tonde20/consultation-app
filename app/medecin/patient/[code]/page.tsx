"use client";
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { genererOrdonnance, genererExamens, genererCertificat, genererCertificatVisite } from "@/lib/pdf";

interface Prescription { id: number; medicament: string; posologie: string; duree: string; }
interface Examen { id: number; categorie: string; type_examen: string; description: string; resultat: string; }
interface Consultation {
  id: number; date: string; motif: string; examen_physique: string; diagnostic: string; notes: string;
  tension: string; temperature: string; pouls: string; poids: string; taille: string; valide_jusqu: string; montant: number;
  doctor_nom: string; doctor_prenom: string;
  prescriptions: Prescription[]; examens: Examen[];
  type_prise_en_charge?: string; service_hospitalisation?: string;
  date_sortie?: string; frais_hospitalisation?: number;
}
interface Patient {
  id: number; code: string; nom: string; prenom: string; date_naissance: string;
  sexe: string; telephone: string; adresse: string; decede?: number;
  antecedents_medicaux?: string; antecedents_chirurgicaux?: string;
}

function calcIMC(poids: string, taille: string): string | null {
  const p = parseFloat(poids);
  const t = parseFloat(taille) / 100;
  if (!p || !t || t <= 0) return null;
  return (p / (t * t)).toFixed(1);
}

function imcLabel(imc: number): { label: string; color: string } {
  if (imc < 18.5) return { label: 'Insuffisance pondérale', color: 'text-blue-600' };
  if (imc < 25)   return { label: 'Corpulence normale', color: 'text-green-600' };
  if (imc < 30)   return { label: 'Surpoids', color: 'text-amber-600' };
  return { label: 'Obésité', color: 'text-red-600' };
}

export default function PatientDossierPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [data, setData] = useState<{ patient: Patient; consultations: Consultation[]; rendez_vous: any[]; certificats: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dossier" | "nouvelle" | "certificat" | "rdv">("dossier");
  const [selectedConsult, setSelectedConsult] = useState<Consultation | null>(null);
  const [etablissement, setEtablissement] = useState("CMA de Boromo");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [doctors, setDoctors] = useState<any[]>([]);

  const BILANS_SANGUINS = ["Numération formule sanguine (NFS)", "Créatininémie", "Glycémie", "Transaminases (ASAT/ALAT)", "Sérologie Dengue", "Goutte épaisse / Densité parasitaire", "Sérologie VIH", "Ag HBs", "Ac VHC", "Ionogramme sanguin"];
  const BILANS_IMAGERIE = ["Radiographie standard", "Échographie"];

  const [consultForm, setConsultForm] = useState({
    motif: "", examen_physique: "", diagnostic: "", notes: "", tension: "", temperature: "", pouls: "", poids: "", taille: "",
    type_prise_en_charge: "ambulatoire",
    service_hospitalisation: "",
    prescriptions: [{ medicament: "", posologie: "", duree: "" }],
  });

  const [examensCategories, setExamensCategories] = useState<Set<string>>(new Set());
  const [examensCoches, setExamensCoches] = useState<Set<string>>(new Set());
  const [autresBilanText, setAutresBilanText] = useState("");
  const [autresImagerieText, setAutresImagerieText] = useState("");
  const [autresText, setAutresText] = useState("");
  const [resultats, setResultats] = useState<Record<string, string>>({});
  const [showResultats, setShowResultats] = useState(false);

  const [sortiModal, setSortiModal] = useState<Consultation | null>(null);
  const [dateSortie, setDateSortie] = useState("");
  const [sortieLoading, setSortieLoading] = useState(false);

  const [certForm, setCertForm] = useState({
    type: "Médical",
    contenu: "",
    nb_jours: "",
    date_debut: "",
    date_fin: "",
    date_deces: "",
    heure_deces: "",
    lieu_deces: "",
    cause_deces: "sa maladie",
    cause_autres: "",
    activite_sportive: "la pratique des activités sportives",
    etablissement_frequente: "",
    classe: "",
    candidat_au: "",
    session_exam: "",
    duree_inaptitude: "",
    mois_grossesse: "",
    monsieur_prenom: "",
    monsieur_nom: "",
    mademoiselle_prenom: "",
    mademoiselle_nom: "",
    qualification: "",
    radio: "Néant",
    bw: "Néant",
    acuite_od: "",
    acuite_og: "",
    begaiement: "Néant",
    surdite: "Néant",
    apte_pour: "pour complément de dossier",
    contre_doctor_id: "",
    contre_apte_pour: "pour complément de dossier",
  });

  const [rdvForm, setRdvForm] = useState({ doctor_id: "", date_heure: "", motif: "" });
  const [signatureData, setSignatureData] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const [editingAntecedents, setEditingAntecedents] = useState(false);
  const [antForm, setAntForm] = useState({ antecedents_medicaux: "", antecedents_chirurgicaux: "" });

  const [editModal, setEditModal] = useState<Consultation | null>(null);
  const [editForm, setEditForm] = useState({
    motif: "", examen_physique: "", diagnostic: "", notes: "",
    tension: "", temperature: "", pouls: "", poids: "", taille: "",
    prescriptions: [{ medicament: "", posologie: "", duree: "" }],
    examens: [{ categorie: "autres", type_examen: "", resultat: "" }],
  });
  const [editLoading, setEditLoading] = useState(false);

  const loadData = async () => {
    const [patRes, settRes, docRes] = await Promise.all([
      fetch(`/api/patients/${code}`),
      fetch("/api/settings"),
      fetch("/api/doctors"),
    ]);
    if (patRes.ok) {
      const patData = await patRes.json();
      setData(patData);
      setAntForm({
        antecedents_medicaux: patData.patient?.antecedents_medicaux || "",
        antecedents_chirurgicaux: patData.patient?.antecedents_chirurgicaux || "",
      });
    }
    if (settRes.ok) { const s = await settRes.json(); if (s.etablissement_nom) setEtablissement(s.etablissement_nom); }
    if (docRes.ok) setDoctors(await docRes.json());
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [code]);

  const openEditModal = (c: Consultation) => {
    setEditForm({
      motif: c.motif || "",
      examen_physique: c.examen_physique || "",
      diagnostic: c.diagnostic || "",
      notes: c.notes || "",
      tension: c.tension || "",
      temperature: c.temperature || "",
      pouls: c.pouls || "",
      poids: c.poids || "",
      taille: c.taille || "",
      prescriptions: c.prescriptions.length > 0
        ? c.prescriptions.map(p => ({ medicament: p.medicament, posologie: p.posologie || "", duree: p.duree || "" }))
        : [{ medicament: "", posologie: "", duree: "" }],
      examens: c.examens.length > 0
        ? c.examens.map(e => ({ categorie: e.categorie || "autres", type_examen: e.type_examen, resultat: e.resultat || "" }))
        : [{ categorie: "autres", type_examen: "", resultat: "" }],
    });
    setEditModal(c);
  };

  const handleEditSave = async () => {
    if (!editModal) return;
    setEditLoading(true);
    const res = await fetch(`/api/consultations/${editModal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_update: true,
        ...editForm,
        prescriptions: editForm.prescriptions.filter(p => p.medicament),
        examens: editForm.examens.filter(e => e.type_examen),
      }),
    });
    setEditLoading(false);
    if (res.ok) {
      setEditModal(null);
      setSelectedConsult(null);
      await loadData();
      setMessage({ type: "success", text: "Consultation mise à jour avec succès." });
    } else {
      const d = await res.json();
      setMessage({ type: "error", text: d.error || "Erreur lors de la mise à jour" });
    }
  };

  const buildExamensPayload = () => {
    const list: { categorie: string; type_examen: string; description: string; resultat: string }[] = [];
    if (examensCategories.has("bilan_sanguin")) {
      BILANS_SANGUINS.forEach(ex => {
        if (examensCoches.has(`bilan_sanguin:${ex}`))
          list.push({ categorie: "bilan_sanguin", type_examen: ex, description: "", resultat: resultats[`bilan_sanguin:${ex}`] || "" });
      });
      if (autresBilanText.trim())
        list.push({ categorie: "bilan_sanguin", type_examen: autresBilanText.trim(), description: "Autre bilan sanguin", resultat: resultats[`bilan_sanguin:autres`] || "" });
    }
    if (examensCategories.has("imagerie")) {
      BILANS_IMAGERIE.forEach(ex => {
        if (examensCoches.has(`imagerie:${ex}`))
          list.push({ categorie: "imagerie", type_examen: ex, description: "", resultat: resultats[`imagerie:${ex}`] || "" });
      });
      if (autresImagerieText.trim())
        list.push({ categorie: "imagerie", type_examen: autresImagerieText.trim(), description: "Autre imagerie", resultat: resultats[`imagerie:autres`] || "" });
    }
    if (examensCategories.has("autres") && autresText.trim())
      list.push({ categorie: "autres", type_examen: autresText.trim(), description: "", resultat: resultats[`autres:autres`] || "" });
    return list;
  };

  const resetConsultForm = () => {
    setConsultForm({ motif: "", examen_physique: "", diagnostic: "", notes: "", tension: "", temperature: "", pouls: "", poids: "", taille: "", type_prise_en_charge: "ambulatoire", service_hospitalisation: "", prescriptions: [{ medicament: "", posologie: "", duree: "" }] });
    setExamensCategories(new Set());
    setExamensCoches(new Set());
    setAutresBilanText(""); setAutresImagerieText(""); setAutresText("");
    setResultats({}); setShowResultats(false);
  };

  const handleNewConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const examens = buildExamensPayload();
    const res = await fetch("/api/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: data.patient.id,
        ...consultForm,
        prescriptions: consultForm.prescriptions.filter(p => p.medicament),
        examens,
      }),
    });
    if (res.ok) {
      const result = await res.json();
      const msg = result.gratuite
        ? "Consultation enregistrée — Gratuite (patient dans la période de validité)"
        : "Consultation enregistrée avec succès";
      setMessage({ type: "success", text: msg });
      setActiveTab("dossier");
      const updated = await fetch(`/api/patients/${code}`);
      if (updated.ok) setData(await updated.json());
      resetConsultForm();
    } else {
      const errData = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: errData.error || "Erreur lors de l'enregistrement" });
    }
  };

  const handleSortie = async () => {
    if (!sortiModal || !dateSortie) return;
    setSortieLoading(true);
    const res = await fetch(`/api/consultations/${sortiModal.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date_sortie: dateSortie }),
    });
    if (res.ok) {
      const result = await res.json();
      setMessage({ type: "success", text: `Sortie enregistrée. Frais d'hospitalisation : ${result.frais_hospitalisation.toLocaleString()} FCFA` });
      setSortiModal(null);
      setDateSortie("");
      const updated = await fetch(`/api/patients/${code}`);
      if (updated.ok) {
        const d = await updated.json();
        setData(d);
        if (result.genererCertificat) {
          const consult = d.consultations.find((c: Consultation) => c.id === sortiModal.id);
          if (consult) {
            const { genererCertificatHospitalisation } = await import("@/lib/pdf");
            genererCertificatHospitalisation({
              etablissement,
              patient: d.patient,
              consultation: consult,
            });
          }
        }
      }
    } else {
      const err = await res.json().catch(() => ({}));
      setMessage({ type: "error", text: err.error || "Erreur lors de la sortie" });
    }
    setSortieLoading(false);
  };

  const buildCertContenu = (doctorName: string): string => {
    if (certForm.type === "Aptitude") {
      const civilite = data?.patient.sexe === 'F' ? 'Mme' : 'M.';
      const dateJour = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      const nom = data ? `${data.patient.prenom} ${data.patient.nom}` : '';
      const activite = certForm.activite_sportive || 'la pratique des activités sportives';
      return `Je soussigné(e), ${doctorName}, Docteur en médecine, certifie avoir examiné ce jour ${dateJour} ${civilite} ${nom} et le/la déclare apte à ${activite}, sans contre-indication médicale apparente à ce jour.\n\nLe présent certificat est délivré pour servir et valoir ce que de droit.`;
    }
    if (certForm.type === "Repos") {
      const civilite = data?.patient.sexe === 'F' ? 'Mme' : 'M.';
      const dateJour = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      const dateDebut = certForm.date_debut ? new Date(certForm.date_debut).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '…';
      const dateFin   = certForm.date_fin   ? new Date(certForm.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '…';
      const nom = data ? `${data.patient.prenom} ${data.patient.nom}` : '';
      return `Je soussigné(e), ${doctorName}, Docteur en médecine, certifie avoir examiné ce jour ${dateJour} ${civilite} ${nom}, présentant un état de santé nécessitant un repos médical de ${certForm.nb_jours || '…'} jour(s), à compter du ${dateDebut} jusqu'au ${dateFin} inclus. Le présent certificat est délivré à la demande de l'intéressé(e) pour servir et valoir ce que de droit.`;
    }
    if (certForm.type === "Décès") {
      const civilite = data?.patient.sexe === 'F' ? 'Mme' : 'M.';
      const nomPrenom = data ? `${data.patient.prenom} ${data.patient.nom}` : '…';
      const dateNaissance = data?.patient.date_naissance
        ? new Date(data.patient.date_naissance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        : '…';
      const dateDeces = certForm.date_deces
        ? new Date(certForm.date_deces).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        : '…';
      const heureDeces = certForm.heure_deces || '…';
      const lieuDeces = certForm.lieu_deces || '…';
      const cause = certForm.cause_deces === 'autres'
        ? `autres causes (${certForm.cause_autres || '…'})`
        : certForm.cause_deces;
      return `Je soussigné(e), ${doctorName}, certifie avoir constaté ce jour le décès de ${civilite} ${nomPrenom}, né(e) le ${dateNaissance}, survenu le ${dateDeces} à ${heureDeces}, à ${lieuDeces} des suites de ${cause}.\n\nAucun obstacle médico-légal à l'inhumation n'a été constaté.`;
    }
    if (certForm.type === "Inaptitude") {
      const dateJour = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      const dateNaissance = data?.patient.date_naissance
        ? new Date(data.patient.date_naissance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        : '…';
      const { etablissement_frequente, classe, candidat_au, session_exam, duree_inaptitude } = certForm;
      return `Je soussigné(e), ${doctorName}, Médecin au service médico-scolaire du District Sanitaire de Boromo, certifie avoir examiné : ${data?.patient.prenom} ${data?.patient.nom}, Né(e) le ${dateNaissance} à Boromo.\n\nEtablissement fréquenté : ${etablissement_frequente || '………………………………'}\nClasse : ${classe || '……………………'} — Candidat(e) au : ${candidat_au || '……………………………'}\nSession : ${session_exam || '……………………………………………………'}\n\nEt déclare que l'intéressé(e) est inapte aux épreuves sportives pour une durée de : ${duree_inaptitude || '……………………………………'}\n\nEn foi de quoi ce présent certificat est délivré pour servir et valoir ce que de droit.`;
    }
    if (certForm.type === "Grossesse") {
      const civilite = data?.patient.sexe === 'F' ? 'Mme' : 'M.';
      const dateJour = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
      const dateNaissance = data?.patient.date_naissance
        ? new Date(data.patient.date_naissance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        : '…';
      return `Je soussigné(e), ${doctorName}, certifie que ${civilite} ${data?.patient.prenom} ${data?.patient.nom}, née le ${dateNaissance}, est actuellement enceinte de ${certForm.mois_grossesse || '…'} mois environ, d'après l'examen clinique pratiqué ce ${dateJour}.\n\nEn foi de quoi ce présent certificat est délivré pour servir et valoir ce que de droit.`;
    }
    if (certForm.type === "Prénuptial") {
      return "";
    }
    if (certForm.type === "Visite") {
      return "";
    }
    return certForm.contenu;
  };

  const handleCertificat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const meRes = await fetch("/api/auth/me");
    const { user } = await meRes.json();
    const doctorName = user.nom.replace('Dr. ', '');
    const doctor_prenom = doctorName.split(' ')[0];
    const doctor_nom = doctorName.split(' ').slice(1).join(' ');
    const dateJour = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    if (certForm.type === "Visite") {
      const contreDoctor = doctors.find(d => String(d.id) === certForm.contre_doctor_id);
      const res = await fetch("/api/certificats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: data.patient.id, type: certForm.type, contenu: "Certificat de visite médicale" }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Certificat de visite créé. Génération du PDF..." });
        genererCertificatVisite({
          etablissement,
          patient: data.patient,
          visite: {
            doctor_prenom,
            doctor_nom,
            qualification: certForm.qualification,
            radio: certForm.radio,
            bw: certForm.bw,
            acuite_od: certForm.acuite_od,
            acuite_og: certForm.acuite_og,
            begaiement: certForm.begaiement,
            surdite: certForm.surdite,
            apte_pour: certForm.apte_pour,
          },
          contre: {
            doctor_prenom: contreDoctor?.prenom || "",
            doctor_nom: contreDoctor?.nom || "",
            qualification: contreDoctor?.qualification || "Médecin",
            apte_pour: certForm.contre_apte_pour,
          },
          signatureImg: signatureData || undefined,
        });
        setCertForm({ type: "Médical", contenu: "", nb_jours: "", date_debut: "", date_fin: "", date_deces: "", heure_deces: "", lieu_deces: "", cause_deces: "sa maladie", cause_autres: "", activite_sportive: "la pratique des activités sportives", etablissement_frequente: "", classe: "", candidat_au: "", session_exam: "", duree_inaptitude: "", mois_grossesse: "", monsieur_prenom: "", monsieur_nom: "", mademoiselle_prenom: "", mademoiselle_nom: "", qualification: "", radio: "Néant", bw: "Néant", acuite_od: "", acuite_og: "", begaiement: "Néant", surdite: "Néant", apte_pour: "pour complément de dossier", contre_doctor_id: "", contre_apte_pour: "pour complément de dossier" });
        setSignatureData("");
        setupCanvas();
        const updated = await fetch(`/api/patients/${code}`);
        if (updated.ok) setData(await updated.json());
      } else {
        setMessage({ type: "error", text: "Erreur" });
      }
      return;
    }

    if (certForm.type === "Prénuptial") {
      const contenu = `Je soussigné(e), Dr. ${doctorName}, certifie avoir examiné ce jour ${dateJour} :\n\nMonsieur ${certForm.monsieur_prenom} ${certForm.monsieur_nom}\nEt Mademoiselle ${certForm.mademoiselle_prenom} ${certForm.mademoiselle_nom}\n\nEn vue de mariage, après avoir pris connaissance des examens sérologies pour le dépistage du VIH, Ag HBs, HCV, de la Syphilis, de l'électrophorèse de l'hémoglobine et de groupe sanguin Rhésus, avoir fait part de mes constatations à l'intéressé(e).\n\nEn foi de quoi ce présent certificat est délivré pour servir et valoir ce que de droit.`;
      const res = await fetch("/api/certificats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: data.patient.id, type: certForm.type, contenu }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Certificat prénuptial créé. Génération du PDF..." });
        genererCertificat({
          etablissement,
          patient: data.patient,
          certificat: { type: certForm.type, contenu, date: new Date().toISOString(), doctor_prenom, doctor_nom },
          signatureImg: signatureData || undefined,
        });
        setCertForm({ type: "Médical", contenu: "", nb_jours: "", date_debut: "", date_fin: "", date_deces: "", heure_deces: "", lieu_deces: "", cause_deces: "sa maladie", cause_autres: "", activite_sportive: "la pratique des activités sportives", etablissement_frequente: "", classe: "", candidat_au: "", session_exam: "", duree_inaptitude: "", mois_grossesse: "", monsieur_prenom: "", monsieur_nom: "", mademoiselle_prenom: "", mademoiselle_nom: "", qualification: "", radio: "Néant", bw: "Néant", acuite_od: "", acuite_og: "", begaiement: "Néant", surdite: "Néant", apte_pour: "pour complément de dossier", contre_doctor_id: "", contre_apte_pour: "pour complément de dossier" });
        setSignatureData("");
        setupCanvas();
        const updated = await fetch(`/api/patients/${code}`);
        if (updated.ok) setData(await updated.json());
      } else {
        setMessage({ type: "error", text: "Erreur" });
      }
      return;
    }

    const contenu = buildCertContenu(`Dr. ${doctorName}`);

    const res = await fetch("/api/certificats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: data.patient.id, type: certForm.type, contenu }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Certificat créé. Génération du PDF..." });
      genererCertificat({
        etablissement,
        patient: data.patient,
        certificat: { type: certForm.type, contenu, date: new Date().toISOString(), doctor_prenom, doctor_nom },
        signatureImg: signatureData || undefined,
      });
      setCertForm({ type: "Médical", contenu: "", nb_jours: "", date_debut: "", date_fin: "", date_deces: "", heure_deces: "", lieu_deces: "", cause_deces: "sa maladie", cause_autres: "", activite_sportive: "la pratique des activités sportives", etablissement_frequente: "", classe: "", candidat_au: "", session_exam: "", duree_inaptitude: "", mois_grossesse: "", monsieur_prenom: "", monsieur_nom: "", mademoiselle_prenom: "", mademoiselle_nom: "", qualification: "", radio: "Néant", bw: "Néant", acuite_od: "", acuite_og: "", begaiement: "Néant", surdite: "Néant", apte_pour: "pour complément de dossier", contre_doctor_id: "", contre_apte_pour: "pour complément de dossier" });
      setSignatureData("");
      setupCanvas();
      const updated = await fetch(`/api/patients/${code}`);
      if (updated.ok) setData(await updated.json());
    } else {
      setMessage({ type: "error", text: "Erreur" });
    }
  };

  const handleSaveAntecedents = async () => {
    const res = await fetch(`/api/patients/${code}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(antForm),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Antécédents enregistrés" });
      setEditingAntecedents(false);
      const updated = await fetch(`/api/patients/${code}`);
      if (updated.ok) setData(await updated.json());
    } else {
      setMessage({ type: "error", text: "Erreur lors de la sauvegarde" });
    }
  };

  useEffect(() => {
    if (activeTab === 'certificat') {
      setTimeout(() => setupCanvas(), 100);
    }
  }, [activeTab]);

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width > 0) { canvas.width = rect.width; canvas.height = 100; }
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#f9fafb';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  };
  const getCanvasPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
  };
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const { x, y } = getCanvasPos(e.clientX, e.clientY);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); }
  };
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const { x, y } = getCanvasPos(e.clientX, e.clientY);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.lineTo(x, y); ctx.stroke(); }
  };
  const handleCanvasEnd = () => {
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) setSignatureData(canvas.toDataURL());
  };
  const handleCanvasTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    isDrawingRef.current = true;
    const { x, y } = getCanvasPos(touch.clientX, touch.clientY);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); }
  };
  const handleCanvasTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const touch = e.touches[0];
    const { x, y } = getCanvasPos(touch.clientX, touch.clientY);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) { ctx.lineTo(x, y); ctx.stroke(); }
  };
  const clearSignature = () => { setupCanvas(); setSignatureData(""); };

  const handleRdv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    const res = await fetch("/api/rendez-vous", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patient_id: data.patient.id, ...rdvForm }),
    });
    if (res.ok) {
      setMessage({ type: "success", text: "Rendez-vous programmé" });
      setActiveTab("dossier");
      const updated = await fetch(`/api/patients/${code}`);
      if (updated.ok) setData(await updated.json());
    } else {
      setMessage({ type: "error", text: "Erreur" });
    }
  };

  if (loading) return <div className="p-8 text-gray-400">Chargement du dossier...</div>;
  if (!data) return <div className="p-8"><p className="text-red-600">Patient non trouvé.</p><button onClick={() => router.push("/medecin")} className="btn-secondary mt-4">Retour</button></div>;

  const { patient, consultations, rendez_vous, certificats } = data;
  const age = patient.date_naissance ? Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000)) : null;

  // Consultation encore active (valide_jusqu >= aujourd'hui)
  const today = new Date().toISOString().split('T')[0];
  const consultationActive = consultations.find(c => c.valide_jusqu && c.valide_jusqu >= today);

  // IMC du formulaire en cours
  const imcEnCours = calcIMC(consultForm.poids, consultForm.taille);

  const tabs = [
    { key: "dossier",    label: "Dossier médical",      icon: "📋" },
    { key: "nouvelle",   label: "Nouvelle consultation", icon: "✏️" },
    { key: "certificat", label: "Certificat",            icon: "📄" },
    { key: "rdv",        label: "Rendez-vous",           icon: "📅" },
  ];

  return (
    <div className="p-6">
      {/* Modal détail consultation */}
      {selectedConsult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-primary-50 rounded-t-2xl">
              <div>
                <h3 className="font-semibold text-primary-900">Consultation du {new Date(selectedConsult.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</h3>
                <p className="text-sm text-primary-600">Dr. {selectedConsult.doctor_prenom} {selectedConsult.doctor_nom}</p>
              </div>
              <button onClick={() => setSelectedConsult(null)} className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {selectedConsult.motif && (
                <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Motif</p><p className="text-gray-700">{selectedConsult.motif}</p></div>
              )}
              {selectedConsult.examen_physique && (
                <div><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Examen physique</p><p className="text-gray-700 whitespace-pre-wrap">{selectedConsult.examen_physique}</p></div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Prise en charge</p>
                {selectedConsult.type_prise_en_charge === "hospitalisation"
                  ? <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 font-semibold text-sm px-3 py-1 rounded-lg">🏥 Hospitalisation — {selectedConsult.service_hospitalisation || "service non précisé"}</span>
                  : <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 font-semibold text-sm px-3 py-1 rounded-lg">🏠 Traitement ambulatoire</span>
                }
              </div>
              {/* Constantes vitales */}
              {(selectedConsult.tension || selectedConsult.temperature || selectedConsult.pouls || selectedConsult.poids || selectedConsult.taille) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Constantes vitales</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {selectedConsult.tension && <div className="bg-primary-50 p-3 rounded-xl text-center"><p className="text-xs text-primary-500 font-medium">Tension</p><p className="font-bold text-primary-800 mt-0.5">{selectedConsult.tension}</p></div>}
                    {selectedConsult.pouls && <div className="bg-red-50 p-3 rounded-xl text-center"><p className="text-xs text-red-500 font-medium">Pouls</p><p className="font-bold text-red-800 mt-0.5">{selectedConsult.pouls} bpm</p></div>}
                    {selectedConsult.temperature && <div className="bg-orange-50 p-3 rounded-xl text-center"><p className="text-xs text-orange-500 font-medium">Température</p><p className="font-bold text-orange-800 mt-0.5">{selectedConsult.temperature}°C</p></div>}
                    {selectedConsult.poids && <div className="bg-blue-50 p-3 rounded-xl text-center"><p className="text-xs text-blue-500 font-medium">Poids</p><p className="font-bold text-blue-800 mt-0.5">{selectedConsult.poids} kg</p></div>}
                    {selectedConsult.taille && <div className="bg-teal-50 p-3 rounded-xl text-center"><p className="text-xs text-teal-500 font-medium">Taille</p><p className="font-bold text-teal-800 mt-0.5">{selectedConsult.taille} cm</p></div>}
                  </div>
                  {/* IMC calculé */}
                  {selectedConsult.poids && selectedConsult.taille && (() => {
                    const imc = calcIMC(selectedConsult.poids, selectedConsult.taille);
                    if (!imc) return null;
                    const { label, color } = imcLabel(parseFloat(imc));
                    return (
                      <div className="mt-2 flex items-center gap-2 bg-gray-50 px-4 py-2.5 rounded-xl">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">IMC</span>
                        <span className={`font-bold text-lg ${color}`}>{imc}</span>
                        <span className={`text-sm ${color}`}>— {label}</span>
                      </div>
                    );
                  })()}
                </div>
              )}
              {selectedConsult.examens.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide mb-2">Examens prescrits ({selectedConsult.examens.length})</p>
                  <div className="space-y-1.5">
                    {selectedConsult.examens.map(ex => (
                      <div key={ex.id} className="bg-teal-50 border border-teal-100 px-3 py-2 rounded-lg text-sm">
                        <span className="font-medium text-teal-800">{ex.type_examen}</span>
                        {ex.description && <span className="text-gray-600"> — {ex.description}</span>}
                        {ex.resultat && <p className="text-xs text-teal-600 mt-0.5 font-medium">Résultat : {ex.resultat}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedConsult.diagnostic && (
                <div className="bg-primary-50 border border-primary-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-1">Diagnostic</p>
                  <p className="text-primary-900 font-semibold text-sm">{selectedConsult.diagnostic}</p>
                </div>
              )}
              {selectedConsult.prescriptions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-2">Prescriptions ({selectedConsult.prescriptions.length})</p>
                  <div className="space-y-1.5">
                    {selectedConsult.prescriptions.map(p => (
                      <div key={p.id} className="bg-primary-50 border border-primary-100 px-3 py-2 rounded-lg text-sm">
                        <span className="font-medium text-primary-800">{p.medicament}</span>
                        {p.posologie && <span className="text-gray-600"> — {p.posologie}</span>}
                        {p.duree && <span className="text-gray-400 text-xs"> ({p.duree})</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex flex-wrap gap-2 bg-gray-50 rounded-b-2xl">
              {selectedConsult.prescriptions.length > 0 && (
                <button
                  onClick={() => genererOrdonnance({ etablissement, patient, consultation: selectedConsult })}
                  className="btn-primary text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Ordonnance PDF
                </button>
              )}
              {selectedConsult.examens.length > 0 && (
                <button
                  onClick={() => genererExamens({ etablissement, patient, consultation: selectedConsult })}
                  className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Demande d'examens PDF
                </button>
              )}
              {selectedConsult.type_prise_en_charge === "hospitalisation" && !selectedConsult.date_sortie && (
                <button
                  onClick={() => { setSortiModal(selectedConsult); setDateSortie(new Date().toISOString().split('T')[0]); setSelectedConsult(null); }}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  🏥 Enregistrer la sortie
                </button>
              )}
              {selectedConsult.date_sortie && (
                <span className="text-xs text-gray-500 self-center">Sorti le {new Date(selectedConsult.date_sortie).toLocaleDateString("fr-FR")} — {(selectedConsult.frais_hospitalisation || 0).toLocaleString()} FCFA</span>
              )}
              <button
                onClick={() => { openEditModal(selectedConsult); setSelectedConsult(null); }}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Modifier
              </button>
              <button onClick={() => setSelectedConsult(null)} className="btn-secondary text-sm ml-auto">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sortie d'hospitalisation */}
      {sortiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Sortie d'hospitalisation</h3>
            <p className="text-sm text-gray-500 mb-4">Enregistrez la date de sortie pour calculer les frais et générer le certificat.</p>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 space-y-1 text-sm">
              <p className="font-semibold text-orange-800">Tarification hospitalisation</p>
              <p className="text-orange-700">• Chambre : <strong>1 000 FCFA / jour</strong></p>
              <p className="text-orange-700">• Forfait soins infirmiers : <strong>500 FCFA</strong></p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'admission</label>
              <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">{new Date(sortiModal.date).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de sortie *</label>
              <input
                type="date"
                value={dateSortie}
                min={sortiModal.date.split('T')[0]}
                onChange={e => setDateSortie(e.target.value)}
                className="input-field"
              />
              {dateSortie && (() => {
                const jours = Math.max(1, Math.ceil((new Date(dateSortie).getTime() - new Date(sortiModal.date.split('T')[0]).getTime()) / 86400000));
                const total = jours * 1000 + 500;
                return (
                  <div className="mt-3 bg-primary-50 border border-primary-200 rounded-xl p-3 text-sm">
                    <p className="text-primary-700"><span className="font-semibold">{jours} jour(s)</span> × 1 000 FCFA = {(jours * 1000).toLocaleString()} FCFA</p>
                    <p className="text-primary-700">+ Forfait soins : 500 FCFA</p>
                    <p className="font-bold text-primary-900 mt-1 text-base">Total : {total.toLocaleString()} FCFA</p>
                  </div>
                );
              })()}
            </div>
            <div className="flex gap-3">
              <button onClick={handleSortie} disabled={!dateSortie || sortieLoading} className="btn-primary flex-1">
                {sortieLoading ? "Enregistrement..." : "Valider la sortie + Générer certificat"}
              </button>
              <button onClick={() => { setSortiModal(null); setDateSortie(""); }} className="btn-secondary">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal édition consultation */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Modifier la consultation</h3>
                <p className="text-sm text-gray-500">{new Date(editModal.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</p>
              </div>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-5 flex-1">

              {/* Constantes */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Constantes vitales</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { key: "tension", label: "Tension", placeholder: "120/80" },
                    { key: "pouls", label: "Pouls (bpm)", placeholder: "72" },
                    { key: "temperature", label: "Température (°C)", placeholder: "37.0" },
                    { key: "poids", label: "Poids (kg)", placeholder: "70" },
                    { key: "taille", label: "Taille (cm)", placeholder: "170" },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                      <input
                        type="text"
                        value={(editForm as any)[f.key]}
                        onChange={e => setEditForm(ef => ({ ...ef, [f.key]: e.target.value }))}
                        className="input-field text-sm"
                        placeholder={f.placeholder}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Motif */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Motif de consultation</label>
                <input type="text" value={editForm.motif} onChange={e => setEditForm(ef => ({ ...ef, motif: e.target.value }))} className="input-field" placeholder="Fièvre, toux, douleurs abdominales..." />
              </div>

              {/* Examen physique */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Éléments retrouvés à l'examen physique</label>
                <textarea value={editForm.examen_physique} onChange={e => setEditForm(ef => ({ ...ef, examen_physique: e.target.value }))} className="input-field h-20 resize-none" placeholder="Signes retrouvés à l'examen clinique..." />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Notes / Observations</label>
                <textarea value={editForm.notes} onChange={e => setEditForm(ef => ({ ...ef, notes: e.target.value }))} className="input-field h-16 resize-none" placeholder="Observations complémentaires..." />
              </div>

              {/* Examens */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Examens complémentaires</p>
                  <button type="button" onClick={() => setEditForm(ef => ({ ...ef, examens: [...ef.examens, { categorie: "autres", type_examen: "", resultat: "" }] }))} className="text-xs text-teal-600 hover:text-teal-700 font-medium">+ Ajouter</button>
                </div>
                <div className="space-y-2">
                  {editForm.examens.map((ex, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <select
                        value={ex.categorie}
                        onChange={e => { const a = [...editForm.examens]; a[i].categorie = e.target.value; setEditForm(ef => ({ ...ef, examens: a })); }}
                        className="input-field col-span-3 text-sm"
                      >
                        <option value="bilan_sanguin">Bilan sanguin</option>
                        <option value="imagerie">Imagérie</option>
                        <option value="autres">Autre</option>
                      </select>
                      <input type="text" value={ex.type_examen} onChange={e => { const a = [...editForm.examens]; a[i].type_examen = e.target.value; setEditForm(ef => ({ ...ef, examens: a })); }} className="input-field col-span-4 text-sm" placeholder="Nom de l'examen" />
                      <input type="text" value={ex.resultat} onChange={e => { const a = [...editForm.examens]; a[i].resultat = e.target.value; setEditForm(ef => ({ ...ef, examens: a })); }} className="input-field col-span-4 text-sm" placeholder="Résultat (optionnel)" />
                      <button type="button" onClick={() => setEditForm(ef => ({ ...ef, examens: ef.examens.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600 col-span-1 text-center text-lg">×</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diagnostic */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Diagnostic</label>
                <input type="text" value={editForm.diagnostic} onChange={e => setEditForm(ef => ({ ...ef, diagnostic: e.target.value }))} className="input-field" placeholder="Paludisme simple, Pneumonie, HTA..." />
              </div>

              {/* Prescriptions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prescriptions médicamenteuses</p>
                  <button type="button" onClick={() => setEditForm(ef => ({ ...ef, prescriptions: [...ef.prescriptions, { medicament: "", posologie: "", duree: "" }] }))} className="text-xs text-primary-600 hover:text-primary-700 font-medium">+ Ajouter</button>
                </div>
                <div className="space-y-2">
                  {editForm.prescriptions.map((p, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input type="text" value={p.medicament} onChange={e => { const a = [...editForm.prescriptions]; a[i].medicament = e.target.value; setEditForm(ef => ({ ...ef, prescriptions: a })); }} className="input-field col-span-4 text-sm" placeholder="Médicament" />
                      <input type="text" value={p.posologie} onChange={e => { const a = [...editForm.prescriptions]; a[i].posologie = e.target.value; setEditForm(ef => ({ ...ef, prescriptions: a })); }} className="input-field col-span-4 text-sm" placeholder="Posologie" />
                      <input type="text" value={p.duree} onChange={e => { const a = [...editForm.prescriptions]; a[i].duree = e.target.value; setEditForm(ef => ({ ...ef, prescriptions: a })); }} className="input-field col-span-3 text-sm" placeholder="Durée" />
                      <button type="button" onClick={() => setEditForm(ef => ({ ...ef, prescriptions: ef.prescriptions.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600 col-span-1 text-center text-lg">×</button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 rounded-b-2xl">
              <button onClick={handleEditSave} disabled={editLoading} className="btn-primary flex-1">
                {editLoading ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
              <button onClick={() => setEditModal(null)} className="btn-secondary">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête patient */}
      <div className={`card mb-6 border ${patient.decede ? "bg-gradient-to-r from-red-50 to-gray-50 border-red-200" : "bg-gradient-to-r from-primary-50 to-teal-50 border-primary-100"}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-md ${patient.decede ? "bg-gray-500" : "bg-primary-600"}`}>
              {patient.prenom.charAt(0)}{patient.nom.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-bold ${patient.decede ? "text-gray-500 line-through decoration-red-400" : "text-gray-800"}`}>{patient.prenom} {patient.nom}</h1>
                {patient.decede === 1 && (
                  <span className="inline-flex items-center gap-1 bg-red-600 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow">
                    ✝ DÉCÉDÉ
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-1 text-sm text-gray-500">
                <span className="font-mono text-primary-700 font-semibold bg-primary-100 px-2 py-0.5 rounded">{patient.code}</span>
                {age && <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{age} ans</span>}
                <span className="bg-white px-2 py-0.5 rounded border border-gray-200">{patient.sexe === "M" ? "Masculin" : "Féminin"}</span>
                {patient.telephone && <span>📱 {patient.telephone}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/medecin")} className="btn-secondary text-sm">← Retour</button>
          </div>
        </div>
      </div>

      {message.text && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.type === "success" ? "✓" : "✕"} {message.text}
        </div>
      )}

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit flex-wrap">
        {tabs.map(tab => {
          const isLocked = patient.decede === 1 && tab.key !== "dossier";
          return (
            <button
              key={tab.key}
              onClick={() => !isLocked && setActiveTab(tab.key as any)}
              disabled={isLocked}
              title={isLocked ? "Action impossible : patient décédé" : undefined}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-all
                ${activeTab === tab.key ? "bg-white text-primary-700 shadow-sm" : ""}
                ${isLocked ? "opacity-40 cursor-not-allowed text-gray-400" : "text-gray-500 hover:text-gray-700"}`}
            >
              <span>{tab.icon}</span>{tab.label}
              {isLocked && <span className="text-xs">🔒</span>}
            </button>
          );
        })}
      </div>
      {patient.decede === 1 && (
        <div className="mb-4 px-4 py-2.5 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
          <span>✝</span>
          Ce patient est décédé. Seule la consultation du dossier médical reste possible.
        </div>
      )}

      {/* Onglet Dossier */}
      {activeTab === "dossier" && (
        <div className="space-y-4">
          {/* Ticket consultation active */}
          {consultationActive && (
            <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3.5">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-emerald-800 text-sm">Consultation active</p>
                <p className="text-emerald-700 text-xs mt-0.5">
                  Ce patient a une consultation en cours, valable jusqu'au{" "}
                  <span className="font-bold">{new Date(consultationActive.valide_jusqu).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>.
                  Toute nouvelle consultation avant cette date sera <span className="font-bold">gratuite</span>.
                </p>
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full whitespace-nowrap">
                Gratuit jusqu'au {new Date(consultationActive.valide_jusqu).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}
              </span>
            </div>
          )}

          {/* Antécédents */}
          <div className="card border-l-4 border-l-amber-400">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
                Antécédents médicaux et chirurgicaux
              </h2>
              {!editingAntecedents && (
                <button
                  onClick={() => {
                    setAntForm({
                      antecedents_medicaux: patient.antecedents_medicaux || "",
                      antecedents_chirurgicaux: patient.antecedents_chirurgicaux || "",
                    });
                    setEditingAntecedents(true);
                  }}
                  className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Modifier
                </button>
              )}
            </div>
            {editingAntecedents ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Antécédents médicaux</label>
                  <textarea
                    value={antForm.antecedents_medicaux}
                    onChange={e => setAntForm(f => ({ ...f, antecedents_medicaux: e.target.value }))}
                    className="input-field h-20 resize-none"
                    placeholder="Diabète, HTA, asthme, allergies..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Antécédents chirurgicaux</label>
                  <textarea
                    value={antForm.antecedents_chirurgicaux}
                    onChange={e => setAntForm(f => ({ ...f, antecedents_chirurgicaux: e.target.value }))}
                    className="input-field h-20 resize-none"
                    placeholder="Appendicectomie 2015, césarienne 2019..."
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveAntecedents} className="btn-primary text-sm px-4 py-1.5">Enregistrer</button>
                  <button onClick={() => setEditingAntecedents(false)} className="btn-secondary text-sm px-4 py-1.5">Annuler</button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Médicaux</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {patient.antecedents_medicaux || <span className="text-gray-300 italic">Aucun antécédent renseigné</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Chirurgicaux</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {patient.antecedents_chirurgicaux || <span className="text-gray-300 italic">Aucun antécédent renseigné</span>}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-700">Historique des consultations <span className="text-gray-400 font-normal">({consultations.length})</span></h2>
          </div>
          {consultations.length === 0 ? (
            <div className="card text-center py-14 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p>Aucune consultation enregistrée pour ce patient</p>
              <button onClick={() => setActiveTab("nouvelle")} className="btn-primary mt-4 text-sm">Créer la première consultation</button>
            </div>
          ) : consultations.map(c => (
            <div key={c.id} className="card hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary-300 hover:border-l-primary-500" onClick={() => setSelectedConsult(c)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-gray-800">{new Date(c.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                    <span className="badge-green text-xs">Dr. {c.doctor_prenom} {c.doctor_nom}</span>
                  </div>
                  {c.motif && <p className="text-sm text-gray-500">Motif : {c.motif}</p>}
                  {c.diagnostic && <p className="text-sm text-gray-700 font-medium">Diagnostic : {c.diagnostic}</p>}
                  {c.poids && c.taille && (() => {
                    const imc = calcIMC(c.poids, c.taille);
                    if (!imc) return null;
                    const { label, color } = imcLabel(parseFloat(imc));
                    return <p className={`text-xs mt-1 ${color}`}>IMC {imc} — {label}</p>;
                  })()}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {c.type_prise_en_charge === "hospitalisation"
                      ? <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">🏥 Hospitalisé — {c.service_hospitalisation || "service non précisé"}</span>
                      : <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">🏠 Ambulatoire</span>
                    }
                    {c.prescriptions.length > 0 && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">{c.prescriptions.length} prescription(s)</span>}
                    {c.examens.length > 0 && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">{c.examens.length} examen(s)</span>}
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-300 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          ))}

          {certificats && certificats.length > 0 && (
            <div className="mt-6">
              <h2 className="font-semibold text-gray-700 mb-3">Certificats émis <span className="text-gray-400 font-normal">({certificats.length})</span></h2>
              {certificats.map((cert: any) => (
                <div key={cert.id} className="card mb-3 border-l-4 border-l-teal-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-800">Certificat {cert.type}</span>
                        {cert.type === "Décès" && (
                          <span className="inline-flex items-center gap-0.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">✝ Décès</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {new Date(cert.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                        {" · "}Dr. {cert.doctor_prenom} {cert.doctor_nom}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded">{cert.montant?.toLocaleString()} FCFA</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rendez_vous.length > 0 && (
            <div className="mt-6">
              <h2 className="font-semibold text-gray-700 mb-3">Rendez-vous <span className="text-gray-400 font-normal">({rendez_vous.length})</span></h2>
              {rendez_vous.map((rv: any) => (
                <div key={rv.id} className="card mb-3 border-l-4 border-l-amber-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{new Date(rv.date_heure).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Dr. {rv.doctor_prenom} {rv.doctor_nom} — {rv.motif || "Sans motif précisé"}</p>
                    </div>
                    <span className={rv.statut === "confirme" ? "badge-green" : rv.statut === "annule" ? "badge-red" : "badge-yellow"}>
                      {rv.statut === "confirme" ? "Confirmé" : rv.statut === "annule" ? "Annulé" : "En attente"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet Nouvelle consultation */}
      {activeTab === "nouvelle" && (
        <form onSubmit={handleNewConsultation} className="space-y-5 max-w-3xl">
          {consultationActive && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-emerald-800">
                <span className="font-semibold">Consultation gratuite</span> — Ce patient est dans sa période de validité (valable jusqu'au{" "}
                <span className="font-bold">{new Date(consultationActive.valide_jusqu).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>).
                Aucun frais ne sera comptabilisé.
              </p>
            </div>
          )}
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
              Constantes vitales
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tension artérielle</label>
                <input type="text" value={consultForm.tension} onChange={e => setConsultForm(f => ({ ...f, tension: e.target.value }))} className="input-field" placeholder="120/80" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Pouls (bpm)</label>
                <input type="text" value={consultForm.pouls} onChange={e => setConsultForm(f => ({ ...f, pouls: e.target.value }))} className="input-field" placeholder="72" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Température (°C)</label>
                <input type="text" value={consultForm.temperature} onChange={e => setConsultForm(f => ({ ...f, temperature: e.target.value }))} className="input-field" placeholder="37.5" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Poids (kg)</label>
                <input type="text" value={consultForm.poids} onChange={e => setConsultForm(f => ({ ...f, poids: e.target.value }))} className="input-field" placeholder="65" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Taille (cm)</label>
                <input type="text" value={consultForm.taille} onChange={e => setConsultForm(f => ({ ...f, taille: e.target.value }))} className="input-field" placeholder="170" />
              </div>
            </div>
            {imcEnCours && (() => {
              const imcVal = parseFloat(imcEnCours);
              const { label, color } = imcLabel(imcVal);
              return (
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl mt-1">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">IMC calculé</span>
                  <span className={`font-bold text-xl ${color}`}>{imcEnCours}</span>
                  <span className={`text-sm font-medium ${color}`}>— {label}</span>
                </div>
              );
            })()}
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
              Consultation
            </h3>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Motif de consultation</label><input type="text" value={consultForm.motif} onChange={e => setConsultForm(f => ({ ...f, motif: e.target.value }))} className="input-field" placeholder="Fièvre, douleur abdominale..." /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Éléments retrouvés à l'examen physique</label><textarea value={consultForm.examen_physique} onChange={e => setConsultForm(f => ({ ...f, examen_physique: e.target.value }))} className="input-field h-24 resize-none" placeholder="Abdomen souple, pas de défense. Auscultation pulmonaire normale. Gorge inflammée..." /></div>
              <div><label className="block text-xs font-medium text-gray-600 mb-1.5">Notes / Observations complémentaires</label><textarea value={consultForm.notes} onChange={e => setConsultForm(f => ({ ...f, notes: e.target.value }))} className="input-field h-16 resize-none" placeholder="Observations supplémentaires..." /></div>

              {/* Prise en charge */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Mode de prise en charge *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConsultForm(f => ({ ...f, type_prise_en_charge: "ambulatoire", service_hospitalisation: "" }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${consultForm.type_prise_en_charge === "ambulatoire" ? "border-primary-500 bg-primary-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${consultForm.type_prise_en_charge === "ambulatoire" ? "bg-primary-100" : "bg-gray-100"}`}>🏠</div>
                    <div>
                      <p className={`text-sm font-semibold ${consultForm.type_prise_en_charge === "ambulatoire" ? "text-primary-700" : "text-gray-700"}`}>Ambulatoire</p>
                      <p className="text-xs text-gray-400">Traitement à domicile</p>
                    </div>
                    {consultForm.type_prise_en_charge === "ambulatoire" && <span className="ml-auto text-primary-600">✓</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultForm(f => ({ ...f, type_prise_en_charge: "hospitalisation" }))}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${consultForm.type_prise_en_charge === "hospitalisation" ? "border-orange-500 bg-orange-50" : "border-gray-200 hover:border-gray-300 bg-white"}`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${consultForm.type_prise_en_charge === "hospitalisation" ? "bg-orange-100" : "bg-gray-100"}`}>🏥</div>
                    <div>
                      <p className={`text-sm font-semibold ${consultForm.type_prise_en_charge === "hospitalisation" ? "text-orange-700" : "text-gray-700"}`}>Hospitalisation</p>
                      <p className="text-xs text-gray-400">Admission en service</p>
                    </div>
                    {consultForm.type_prise_en_charge === "hospitalisation" && <span className="ml-auto text-orange-600">✓</span>}
                  </button>
                </div>
              </div>

              {consultForm.type_prise_en_charge === "hospitalisation" && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <label className="block text-xs font-semibold text-orange-700 uppercase tracking-wide mb-2">Service d'hospitalisation *</label>
                  <select
                    value={consultForm.service_hospitalisation}
                    onChange={e => setConsultForm(f => ({ ...f, service_hospitalisation: e.target.value }))}
                    className="input-field"
                    required={consultForm.type_prise_en_charge === "hospitalisation"}
                  >
                    <option value="">-- Sélectionner le service --</option>
                    <option value="Urgences médicales">Urgences médicales</option>
                    <option value="Service de Médecine">Service de Médecine</option>
                    <option value="Urgences pédiatriques">Urgences pédiatriques</option>
                    <option value="Service de Chirurgie">Service de Chirurgie</option>
                    <option value="Maternité">Maternité</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Examens structurés 3 étapes */}
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
              Examens complémentaires
            </h3>

            {/* Étape 1 : catégories */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Étape 1 — Types d'examens demandés</p>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: "bilan_sanguin", label: "🩸 Bilan sanguin", color: "border-red-300 bg-red-50 text-red-700" },
                  { key: "imagerie",      label: "🔬 Imagérie",      color: "border-blue-300 bg-blue-50 text-blue-700" },
                  { key: "autres",        label: "📋 Autres",         color: "border-gray-300 bg-gray-50 text-gray-700" },
                ].map(cat => (
                  <label key={cat.key} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer font-medium text-sm transition-all ${examensCategories.has(cat.key) ? cat.color + " shadow-sm" : "border-gray-200 bg-white text-gray-500"}`}>
                    <input
                      type="checkbox"
                      checked={examensCategories.has(cat.key)}
                      onChange={e => {
                        const s = new Set(examensCategories);
                        e.target.checked ? s.add(cat.key) : s.delete(cat.key);
                        setExamensCategories(s);
                      }}
                      className="rounded"
                    />
                    {cat.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Étape 2 : examens par catégorie */}
            {examensCategories.size > 0 && (
              <div className="mb-4 space-y-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Étape 2 — Sélection des examens</p>

                {examensCategories.has("bilan_sanguin") && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3">🩸 Bilans sanguins</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {BILANS_SANGUINS.map(ex => (
                        <label key={ex} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={examensCoches.has(`bilan_sanguin:${ex}`)}
                            onChange={e => {
                              const s = new Set(examensCoches);
                              e.target.checked ? s.add(`bilan_sanguin:${ex}`) : s.delete(`bilan_sanguin:${ex}`);
                              setExamensCoches(s);
                            }}
                            className="rounded text-red-600"
                          />
                          <span className="text-gray-700">{ex}</span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-red-700 mb-1">Autres bilans sanguins (préciser) :</label>
                      <input type="text" value={autresBilanText} onChange={e => setAutresBilanText(e.target.value)} className="input-field text-sm" placeholder="Ex : Frottis sanguin, Lipidogramme..." />
                    </div>
                  </div>
                )}

                {examensCategories.has("imagerie") && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-3">🔬 Imagérie</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                      {BILANS_IMAGERIE.map(ex => (
                        <label key={ex} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={examensCoches.has(`imagerie:${ex}`)}
                            onChange={e => {
                              const s = new Set(examensCoches);
                              e.target.checked ? s.add(`imagerie:${ex}`) : s.delete(`imagerie:${ex}`);
                              setExamensCoches(s);
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="text-gray-700">{ex}</span>
                        </label>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-blue-700 mb-1">Autre imagerie (préciser) :</label>
                      <input type="text" value={autresImagerieText} onChange={e => setAutresImagerieText(e.target.value)} className="input-field text-sm" placeholder="Ex : Scanner, IRM..." />
                    </div>
                  </div>
                )}

                {examensCategories.has("autres") && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">📋 Autres examens</p>
                    <input type="text" value={autresText} onChange={e => setAutresText(e.target.value)} className="input-field text-sm" placeholder="Précisez l'examen demandé..." />
                  </div>
                )}
              </div>
            )}

            {/* Étape 3 : résultats (optionnel) */}
            {buildExamensPayload().length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowResultats(v => !v)}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1 mb-3"
                >
                  {showResultats ? "▲" : "▼"} Étape 3 — Renseigner les résultats (optionnel)
                </button>
                {showResultats && (
                  <div className="space-y-2 bg-teal-50 border border-teal-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">Résultats disponibles dès maintenant</p>
                    {buildExamensPayload().map(ex => (
                      <div key={`${ex.categorie}:${ex.type_examen}`} className="flex items-center gap-3">
                        <span className="text-sm text-gray-700 w-48 flex-shrink-0">{ex.type_examen}</span>
                        <input
                          type="text"
                          value={resultats[`${ex.categorie}:${ex.type_examen === (ex.categorie === 'bilan_sanguin' ? autresBilanText.trim() : ex.categorie === 'imagerie' ? autresImagerieText.trim() : autresText.trim()) ? 'autres' : ex.type_examen}`] || ""}
                          onChange={e => setResultats(r => ({ ...r, [`${ex.categorie}:${ex.type_examen}`]: e.target.value }))}
                          className="input-field text-sm flex-1"
                          placeholder="Résultat si disponible..."
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Diagnostic — après l'examen clinique et les bilans */}
          <div className="card border-l-4 border-l-teal-500">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
              Diagnostic
            </h3>
            <input
              type="text"
              value={consultForm.diagnostic}
              onChange={e => setConsultForm(f => ({ ...f, diagnostic: e.target.value }))}
              className="input-field"
              placeholder="Paludisme simple, Pneumonie, HTA, Grippe..."
            />
          </div>

          {consultForm.type_prise_en_charge === "ambulatoire" && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  Prescriptions
                </h3>
                <button type="button" onClick={() => setConsultForm(f => ({ ...f, prescriptions: [...f.prescriptions, { medicament: "", posologie: "", duree: "" }] }))} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">+ Ajouter</button>
              </div>
              <div className="space-y-2">
                {consultForm.prescriptions.map((p, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input type="text" value={p.medicament} onChange={e => { const a = [...consultForm.prescriptions]; a[i].medicament = e.target.value; setConsultForm(f => ({ ...f, prescriptions: a })); }} className="input-field col-span-4" placeholder="Médicament" />
                    <input type="text" value={p.posologie} onChange={e => { const a = [...consultForm.prescriptions]; a[i].posologie = e.target.value; setConsultForm(f => ({ ...f, prescriptions: a })); }} className="input-field col-span-4" placeholder="Posologie" />
                    <input type="text" value={p.duree} onChange={e => { const a = [...consultForm.prescriptions]; a[i].duree = e.target.value; setConsultForm(f => ({ ...f, prescriptions: a })); }} className="input-field col-span-3" placeholder="Durée" />
                    {i > 0 && <button type="button" onClick={() => setConsultForm(f => ({ ...f, prescriptions: f.prescriptions.filter((_, j) => j !== i) }))} className="text-red-400 hover:text-red-600 col-span-1 text-center text-lg">×</button>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" className="btn-primary px-8">Enregistrer la consultation</button>
            <button type="button" onClick={() => setActiveTab("dossier")} className="btn-secondary">Annuler</button>
          </div>
        </form>
      )}

      {/* Onglet Certificat */}
      {activeTab === "certificat" && (
        <form onSubmit={handleCertificat} className="max-w-xl space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Nouveau certificat médical</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type de certificat</label>
                <select value={certForm.type} onChange={e => setCertForm(f => ({ ...f, type: e.target.value }))} className="input-field">
                  <option value="Médical">Certificat médical</option>
                  <option value="Aptitude">Certificat d'aptitude</option>
                  <option value="Inaptitude">Certificat d'inaptitude</option>
                  <option value="Repos">Certificat de repos</option>
                  <option value="Grossesse">Certificat de grossesse</option>
                  <option value="Décès">Certificat de décès</option>
                  <option value="Prénuptial">Certificat prénuptial</option>
                  <option value="Visite">Certificat de visite médicale</option>
                </select>
              </div>

              {certForm.type === "Aptitude" ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Paramètres du certificat d'aptitude</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Activité concernée *</label>
                    <input
                      type="text"
                      value={certForm.activite_sportive}
                      onChange={e => setCertForm(f => ({ ...f, activite_sportive: e.target.value }))}
                      className="input-field"
                      placeholder="Ex: la pratique des activités sportives, la conduite de véhicules..."
                      required
                    />
                  </div>
                  <p className="text-xs text-green-700">Le texte du certificat sera généré automatiquement avec le nom du médecin, la date du jour et le nom du patient.</p>
                </div>
              ) : certForm.type === "Repos" ? (
                <div className="space-y-3">
                  <div className="bg-primary-50 border border-primary-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-primary-700 uppercase tracking-wide mb-3">Paramètres du repos médical</p>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="col-span-3 sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de jours *</label>
                        <input type="number" min="1" value={certForm.nb_jours} onChange={e => setCertForm(f => ({ ...f, nb_jours: e.target.value }))} className="input-field" placeholder="3" required />
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date de début *</label>
                        <input type="date" value={certForm.date_debut} onChange={e => setCertForm(f => ({ ...f, date_debut: e.target.value }))} className="input-field" required />
                      </div>
                      <div className="col-span-3 sm:col-span-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin *</label>
                        <input type="date" value={certForm.date_fin} onChange={e => setCertForm(f => ({ ...f, date_fin: e.target.value }))} className="input-field" required />
                      </div>
                    </div>
                    <p className="text-xs text-primary-600">Le texte standardisé du certificat sera généré automatiquement.</p>
                  </div>
                </div>
              ) : certForm.type === "Décès" ? (
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">Paramètres du constat de décès</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date du décès *</label>
                        <input type="date" value={certForm.date_deces} onChange={e => setCertForm(f => ({ ...f, date_deces: e.target.value }))} className="input-field" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Heure du décès *</label>
                        <input type="time" value={certForm.heure_deces} onChange={e => setCertForm(f => ({ ...f, heure_deces: e.target.value }))} className="input-field" required />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Lieu du décès *</label>
                        <input type="text" value={certForm.lieu_deces} onChange={e => setCertForm(f => ({ ...f, lieu_deces: e.target.value }))} className="input-field" placeholder="Ex. : domicile, CMA de Boromo..." required />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Cause du décès *</label>
                        <select value={certForm.cause_deces} onChange={e => setCertForm(f => ({ ...f, cause_deces: e.target.value }))} className="input-field" required>
                          <option value="sa maladie">Sa maladie</option>
                          <option value="ses blessures">Ses blessures</option>
                          <option value="mort subite">Mort subite</option>
                          <option value="autres">Autres (à préciser)</option>
                        </select>
                      </div>
                      {certForm.cause_deces === "autres" && (
                        <div className="col-span-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Préciser la cause *</label>
                          <input type="text" value={certForm.cause_autres} onChange={e => setCertForm(f => ({ ...f, cause_autres: e.target.value }))} className="input-field" placeholder="Préciser la cause du décès..." required />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-red-600">Le texte standardisé du certificat de décès sera généré automatiquement.</p>
                  </div>
                </div>
              ) : certForm.type === "Inaptitude" ? (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Paramètres du certificat d'inaptitude</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Établissement fréquenté</label>
                    <input type="text" value={certForm.etablissement_frequente} onChange={e => setCertForm(f => ({ ...f, etablissement_frequente: e.target.value }))} className="input-field" placeholder="Nom de l'établissement..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Classe</label>
                      <input type="text" value={certForm.classe} onChange={e => setCertForm(f => ({ ...f, classe: e.target.value }))} className="input-field" placeholder="Ex : 3ème, Terminale..." />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Candidat(e) au</label>
                      <input type="text" value={certForm.candidat_au} onChange={e => setCertForm(f => ({ ...f, candidat_au: e.target.value }))} className="input-field" placeholder="BEPC, BAC..." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Session d'examen</label>
                    <input type="text" value={certForm.session_exam} onChange={e => setCertForm(f => ({ ...f, session_exam: e.target.value }))} className="input-field" placeholder="Ex : Session 2026..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Durée d'inaptitude</label>
                    <input type="text" value={certForm.duree_inaptitude} onChange={e => setCertForm(f => ({ ...f, duree_inaptitude: e.target.value }))} className="input-field" placeholder="Ex : 3 semaines, 1 mois..." />
                  </div>
                </div>
              ) : certForm.type === "Grossesse" ? (
                <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-pink-700 uppercase tracking-wide">Paramètres du certificat de grossesse</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de mois de grossesse *</label>
                    <input type="number" min="1" max="9" value={certForm.mois_grossesse} onChange={e => setCertForm(f => ({ ...f, mois_grossesse: e.target.value }))} className="input-field" placeholder="Ex : 3" required />
                  </div>
                  <p className="text-xs text-pink-600">Le texte standardisé du certificat sera généré automatiquement.</p>
                </div>
              ) : certForm.type === "Prénuptial" ? (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Paramètres du certificat prénuptial</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Prénom Monsieur *</label>
                      <input type="text" value={certForm.monsieur_prenom} onChange={e => setCertForm(f => ({ ...f, monsieur_prenom: e.target.value }))} className="input-field" placeholder="Prénom..." required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nom Monsieur *</label>
                      <input type="text" value={certForm.monsieur_nom} onChange={e => setCertForm(f => ({ ...f, monsieur_nom: e.target.value }))} className="input-field" placeholder="Nom..." required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Prénom Mademoiselle *</label>
                      <input type="text" value={certForm.mademoiselle_prenom} onChange={e => setCertForm(f => ({ ...f, mademoiselle_prenom: e.target.value }))} className="input-field" placeholder="Prénom..." required />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Nom Mademoiselle *</label>
                      <input type="text" value={certForm.mademoiselle_nom} onChange={e => setCertForm(f => ({ ...f, mademoiselle_nom: e.target.value }))} className="input-field" placeholder="Nom..." required />
                    </div>
                  </div>
                </div>
              ) : certForm.type === "Visite" ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Paramètres du certificat de visite médicale</p>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Qualification du médecin *</label>
                    <input type="text" value={certForm.qualification} onChange={e => setCertForm(f => ({ ...f, qualification: e.target.value }))} className="input-field" placeholder="Ex : Médecin généraliste..." required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Radio</label>
                      <select value={certForm.radio} onChange={e => setCertForm(f => ({ ...f, radio: e.target.value }))} className="input-field">
                        <option value="Néant">Néant</option>
                        <option value="Oui">Oui</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">BW</label>
                      <select value={certForm.bw} onChange={e => setCertForm(f => ({ ...f, bw: e.target.value }))} className="input-field">
                        <option value="Néant">Néant</option>
                        <option value="Oui">Oui</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Acuité OD</label>
                      <input type="text" value={certForm.acuite_od} onChange={e => setCertForm(f => ({ ...f, acuite_od: e.target.value }))} className="input-field" placeholder="Ex : 10/10" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Acuité OG</label>
                      <input type="text" value={certForm.acuite_og} onChange={e => setCertForm(f => ({ ...f, acuite_og: e.target.value }))} className="input-field" placeholder="Ex : 10/10" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Bégaiement</label>
                      <select value={certForm.begaiement} onChange={e => setCertForm(f => ({ ...f, begaiement: e.target.value }))} className="input-field">
                        <option value="Néant">Néant</option>
                        <option value="Oui">Oui</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Surdité</label>
                      <select value={certForm.surdite} onChange={e => setCertForm(f => ({ ...f, surdite: e.target.value }))} className="input-field">
                        <option value="Néant">Néant</option>
                        <option value="Oui">Oui</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Apte pour (visite)</label>
                    <input type="text" value={certForm.apte_pour} onChange={e => setCertForm(f => ({ ...f, apte_pour: e.target.value }))} className="input-field" placeholder="pour complément de dossier..." />
                  </div>
                  <div className="border-t border-blue-200 pt-3">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Contre-visite</p>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Médecin contre-visiteur *</label>
                      <select value={certForm.contre_doctor_id} onChange={e => setCertForm(f => ({ ...f, contre_doctor_id: e.target.value }))} className="input-field" required>
                        <option value="">— Sélectionner un médecin —</option>
                        {doctors.filter(d => d.actif).map(d => (<option key={d.id} value={d.id}>Dr. {d.prenom} {d.nom}</option>))}
                      </select>
                    </div>
                    <div className="mt-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Apte pour (contre-visite)</label>
                      <input type="text" value={certForm.contre_apte_pour} onChange={e => setCertForm(f => ({ ...f, contre_apte_pour: e.target.value }))} className="input-field" placeholder="pour complément de dossier..." />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Contenu du certificat</label>
                  <textarea value={certForm.contenu} onChange={e => setCertForm(f => ({ ...f, contenu: e.target.value }))} className="input-field h-36 resize-none" placeholder="Texte du certificat médical..." required />
                </div>
              )}

              <div className="border border-gray-200 rounded-xl p-4 bg-white">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Signature du médecin (optionnelle)</p>
                  <button type="button" onClick={clearSignature} className="text-xs text-red-500 hover:text-red-700">Effacer</button>
                </div>
                <canvas
                  ref={canvasRef}
                  className="w-full border border-dashed border-gray-300 rounded-lg bg-gray-50 cursor-crosshair touch-none"
                  style={{ height: '100px' }}
                  onMouseDown={handleCanvasMouseDown}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasEnd}
                  onMouseLeave={handleCanvasEnd}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasEnd}
                />
                <p className="text-xs text-gray-400 mt-1">Signez ici avec la souris ou le doigt — apparaîtra sur le PDF</p>
                {signatureData && <p className="text-xs text-green-600 mt-1">✓ Signature enregistrée</p>}
              </div>

              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Frais de certificat : 2 000 FCFA — Le PDF sera téléchargé automatiquement.
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Créer et télécharger PDF
            </button>
            <button type="button" onClick={() => setActiveTab("dossier")} className="btn-secondary">Annuler</button>
          </div>
        </form>
      )}

      {/* Onglet Rendez-vous */}
      {activeTab === "rdv" && (
        <form onSubmit={handleRdv} className="max-w-xl space-y-4">
          <div className="card">
            <h3 className="font-semibold text-gray-700 mb-4">Programmer un rendez-vous</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Médecin *</label>
                <select value={rdvForm.doctor_id} onChange={e => setRdvForm(f => ({ ...f, doctor_id: e.target.value }))} className="input-field" required>
                  <option value="">— Sélectionner un médecin —</option>
                  {doctors.filter(d => d.actif).map(d => (<option key={d.id} value={d.id}>Dr. {d.prenom} {d.nom} — {d.specialite}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date et heure *</label>
                <input type="datetime-local" value={rdvForm.date_heure} onChange={e => setRdvForm(f => ({ ...f, date_heure: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Motif</label>
                <input type="text" value={rdvForm.motif} onChange={e => setRdvForm(f => ({ ...f, motif: e.target.value }))} className="input-field" placeholder="Suivi, contrôle..." />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary">Programmer le rendez-vous</button>
            <button type="button" onClick={() => setActiveTab("dossier")} className="btn-secondary">Annuler</button>
          </div>
        </form>
      )}
    </div>
  );
}
