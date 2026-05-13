import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Palette ──────────────────────────────────────────────
const GREEN       = [22, 101, 52]   as [number,number,number];  // #166534
const GREEN_LIGHT = [220, 252, 231] as [number,number,number];  // #dcfce7
const TEAL        = [13, 148, 136]  as [number,number,number];  // #0d9488
const TEAL_LIGHT  = [204, 251, 241] as [number,number,number];  // #ccfbf1
const GRAY_DARK   = [31, 41, 55]    as [number,number,number];  // #1f2937
const GRAY_MID    = [107, 114, 128] as [number,number,number];  // #6b7280
const GRAY_LIGHT  = [249, 250, 251] as [number,number,number];  // #f9fafb
const WHITE       = [255, 255, 255] as [number,number,number];
const BORDER      = [209, 213, 219] as [number,number,number];  // #d1d5db

function addHeader(doc: jsPDF, etablissement: string, titre: string, sousTitre?: string) {
  const w = doc.internal.pageSize.getWidth();

  doc.setFillColor(...GREEN);
  doc.rect(0, 0, w, 28, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(etablissement.toUpperCase(), w / 2, 11, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(titre, w / 2, 19, { align: 'center' });

  if (sousTitre) {
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_MID);
    doc.text(sousTitre, w / 2, 26, { align: 'center' });
  }

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(14, 32, w - 14, 32);
  doc.setTextColor(...GRAY_DARK);
}

function addFooter(doc: jsPDF, etablissement: string) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.3);
    doc.line(14, h - 14, w - 14, h - 14);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY_MID);
    doc.text(etablissement, 14, h - 8);
    doc.text(`Page ${i} / ${pageCount}`, w - 14, h - 8, { align: 'right' });
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      w / 2, h - 8, { align: 'center' }
    );
  }
}

type PatientInfo = {
  prenom: string; nom: string; code: string; date_naissance?: string; sexe?: string;
};
type ConsultInfo = {
  date: string; valide_jusqu: string; motif?: string; diagnostic?: string;
  tension?: string; temperature?: string; poids?: string; taille?: string;
  doctor_prenom: string; doctor_nom: string;
  prescriptions: { medicament: string; posologie?: string; duree?: string }[];
  examens: { type_examen: string; description?: string }[];
};

function addPatientDoctorHeader(doc: jsPDF, patient: PatientInfo, consultation: ConsultInfo, y: number): number {
  const w = doc.internal.pageSize.getWidth();
  const colW = (w - 28) / 2;

  doc.setFillColor(...GREEN_LIGHT);
  doc.roundedRect(14, y, colW - 2, 26, 2, 2, 'F');
  doc.setFillColor(...TEAL_LIGHT);
  doc.roundedRect(14 + colW + 2, y, colW - 2, 26, 2, 2, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GREEN);
  doc.text('PATIENT', 18, y + 6);
  doc.setTextColor(...TEAL);
  doc.text('MÉDECIN', 18 + colW + 6, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_DARK);
  doc.setFontSize(9.5);
  doc.text(`${patient.prenom} ${patient.nom}`, 18, y + 13);
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_MID);
  doc.text(`Code : ${patient.code}`, 18, y + 19);
  if (patient.date_naissance) {
    const age = Math.floor((Date.now() - new Date(patient.date_naissance).getTime()) / (365.25*24*3600*1000));
    doc.text(`Né(e) le ${new Date(patient.date_naissance).toLocaleDateString('fr-FR')} (${age} ans)`, 18, y + 24);
  }

  doc.setFontSize(9.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text(`Dr. ${consultation.doctor_prenom} ${consultation.doctor_nom}`, 18 + colW + 6, y + 13);
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_MID);
  doc.text(`Date : ${new Date(consultation.date).toLocaleDateString('fr-FR')}`, 18 + colW + 6, y + 19);
  doc.text(`Valide jusqu'au : ${new Date(consultation.valide_jusqu).toLocaleDateString('fr-FR')}`, 18 + colW + 6, y + 24);

  return y + 32;
}

// ── ORDONNANCE (prescriptions uniquement) ─────────────────
export function genererOrdonnance(opts: {
  etablissement: string;
  patient: PatientInfo;
  consultation: ConsultInfo;
}) {
  const { etablissement, patient, consultation } = opts;
  const doc = new jsPDF('p', 'mm', 'a4');

  addHeader(doc, etablissement, 'ORDONNANCE MÉDICALE',
    `Dr. ${consultation.doctor_prenom} ${consultation.doctor_nom} — ${new Date(consultation.date).toLocaleDateString('fr-FR')}`);

  let y = addPatientDoctorHeader(doc, patient, consultation, 37);

  if (consultation.prescriptions.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...GREEN);
    doc.text('Rp/', 14, y + 1);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_DARK);
    doc.text('PRESCRIPTION', 22, y + 1);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Médicament', 'Posologie', 'Durée']],
      body: consultation.prescriptions.map((p, i) => [
        String(i + 1), p.medicament, p.posologie || '—', p.duree || '—',
      ]),
      styles: { fontSize: 9, cellPadding: 3, textColor: GRAY_DARK },
      headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: GREEN_LIGHT },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 60 }, 2: { cellWidth: 65 } },
      margin: { left: 14, right: 14 },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_MID);
    doc.text('Aucune prescription pour cette consultation.', 14, y + 6);
    y += 14;
  }

  // Zone signature
  const ph = doc.internal.pageSize.getHeight();
  const sigY = Math.max(y + 10, ph - 50);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  const w = doc.internal.pageSize.getWidth();
  doc.line(w - 80, sigY, w - 14, sigY);
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_MID);
  doc.text(`Dr. ${consultation.doctor_prenom} ${consultation.doctor_nom}`, w - 47, sigY + 5, { align: 'center' });
  doc.text('Signature et cachet', w - 47, sigY + 10, { align: 'center' });

  addFooter(doc, etablissement);
  doc.save(`Ordonnance_${patient.code}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ── DEMANDE D'EXAMENS ─────────────────────────────────────
export function genererExamens(opts: {
  etablissement: string;
  patient: PatientInfo;
  consultation: ConsultInfo;
}) {
  const { etablissement, patient, consultation } = opts;
  const doc = new jsPDF('p', 'mm', 'a4');

  addHeader(doc, etablissement, "DEMANDE D'EXAMENS COMPLÉMENTAIRES",
    `Dr. ${consultation.doctor_prenom} ${consultation.doctor_nom} — ${new Date(consultation.date).toLocaleDateString('fr-FR')}`);

  let y = addPatientDoctorHeader(doc, patient, consultation, 37);

  if (consultation.examens.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEAL);
    doc.text('EXAMENS DEMANDÉS', 14, y + 1);
    y += 5;

    autoTable(doc, {
      startY: y,
      head: [['#', "Type d'examen", 'Précisions / Indications']],
      body: consultation.examens.map((e, i) => [
        String(i + 1), e.type_examen, e.description || '—',
      ]),
      styles: { fontSize: 9, cellPadding: 3, textColor: GRAY_DARK },
      headStyles: { fillColor: TEAL, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: TEAL_LIGHT },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 70 } },
      margin: { left: 14, right: 14 },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...GRAY_MID);
    doc.text('Aucun examen prescrit pour cette consultation.', 14, y + 6);
    y += 14;
  }

  const ph = doc.internal.pageSize.getHeight();
  const sigY = Math.max(y + 10, ph - 50);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  const w = doc.internal.pageSize.getWidth();
  doc.line(w - 80, sigY, w - 14, sigY);
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_MID);
  doc.text(`Dr. ${consultation.doctor_prenom} ${consultation.doctor_nom}`, w - 47, sigY + 5, { align: 'center' });
  doc.text('Signature et cachet', w - 47, sigY + 10, { align: 'center' });

  addFooter(doc, etablissement);
  doc.save(`Examens_${patient.code}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ── CERTIFICAT ────────────────────────────────────────────
export function genererCertificat(opts: {
  etablissement: string;
  patient: PatientInfo;
  certificat: {
    type: string;
    contenu: string;
    date: string;
    doctor_prenom: string;
    doctor_nom: string;
  };
  signatureImg?: string;
}) {
  const { etablissement, certificat, signatureImg } = opts;
  const doc = new jsPDF('p', 'mm', 'a4');
  const w   = doc.internal.pageSize.getWidth();
  const h   = doc.internal.pageSize.getHeight();

  // ── Bannière verte ────────────────────────────────────────
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, w, 32, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text(etablissement.toUpperCase(), w / 2, 20, { align: 'center' });

  // ── Titre centré et souligné ──────────────────────────────
  const titre = `CERTIFICAT ${certificat.type.toUpperCase()}`;
  doc.setFont('times', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...GREEN);
  const titreW = doc.getTextWidth(titre);
  const titreX = (w - titreW) / 2;
  const titreY = 50;
  doc.text(titre, titreX, titreY);
  doc.setLineWidth(0.7);
  doc.setDrawColor(...GREEN);
  doc.line(titreX, titreY + 2, titreX + titreW, titreY + 2);

  // ── Pré-calcul du corps pour dimensionner le cadre ────────
  const frameX  = 14;
  const frameW  = w - 28;
  const padH    = 13;   // padding horizontal intérieur
  const padV    = 14;   // padding vertical intérieur
  const textX   = frameX + padH;
  const textW   = frameW - padH * 2;   // ≈ 154 mm
  const fontSize = 12;
  const lineH    = 9.8; // interligne fixe (rendu ligne par ligne)

  doc.setFont('times', 'normal');
  doc.setFontSize(fontSize);

  type RL = { text: string; last: boolean } | { gap: number };
  const lines: RL[] = [];
  let totalH = 0;

  const paragraphs = (certificat.contenu || '').split('\n\n');
  for (let pi = 0; pi < paragraphs.length; pi++) {
    for (const sub of paragraphs[pi].trim().split('\n')) {
      if (!sub.trim()) { lines.push({ gap: lineH * 0.6 }); totalH += lineH * 0.6; continue; }
      const wrapped = doc.splitTextToSize(sub.trim(), textW);
      wrapped.forEach((wl: string, li: number) => {
        lines.push({ text: wl, last: li === wrapped.length - 1 });
        totalH += lineH;
      });
    }
    if (pi < paragraphs.length - 1) { lines.push({ gap: lineH * 0.55 }); totalH += lineH * 0.55; }
  }

  const frameY = 64;
  const frameH = padV + totalH + padV;

  // ── Cadre ─────────────────────────────────────────────────
  doc.setFillColor(...GREEN_LIGHT);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.8);
  doc.roundedRect(frameX, frameY, frameW, frameH, 4, 4, 'FD');

  // ── Corps du texte ────────────────────────────────────────
  let y = frameY + padV;
  doc.setFont('times', 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(...GRAY_DARK);

  for (const item of lines) {
    if ('gap' in item) { y += item.gap; continue; }
    doc.text(item.text, textX, y, { align: item.last ? 'left' : 'justify', maxWidth: textW });
    y += lineH;
  }

  // ── Zone signature — ancrée vers le bas ───────────────────
  const dateStr = new Date(certificat.date).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  let sigY = Math.max(frameY + frameH + 16, h - 65);

  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...GRAY_DARK);
  doc.text(`Fait à Boromo, le ${dateStr}`, w - 14, sigY, { align: 'right' });
  sigY += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text('Le Médecin', w - 14, sigY, { align: 'right' });
  sigY += 7;

  if (signatureImg) {
    doc.addImage(signatureImg, 'PNG', w - 14 - 66, sigY, 66, 18);
    sigY += 20;
  } else {
    sigY += 20;
  }
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.5);
  doc.line(w - 80, sigY, w - 14, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY_MID);
  doc.text(`Dr. ${certificat.doctor_prenom} ${certificat.doctor_nom}`, w - 47, sigY + 5, { align: 'center' });
  doc.text('Signature et cachet', w - 47, sigY + 10, { align: 'center' });

  // ── Pied de page ─────────────────────────────────────────
  doc.setLineWidth(0.3);
  doc.setDrawColor(...GREEN);
  doc.line(14, h - 12, w - 14, h - 12);
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY_MID);
  doc.text(etablissement, 14, h - 7);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, w - 14, h - 7, { align: 'right' });

  doc.save(`Certificat_${certificat.type}_${opts.patient.code}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ── CERTIFICAT D'HOSPITALISATION ──────────────────────────
export function genererCertificatHospitalisation(opts: {
  etablissement: string;
  patient: { prenom: string; nom: string; code: string; date_naissance?: string; sexe?: string };
  consultation: {
    id: number; date: string; date_sortie: string; diagnostic?: string; motif?: string;
    service_hospitalisation?: string; doctor_nom: string; doctor_prenom: string;
    frais_hospitalisation?: number;
  };
}) {
  const { etablissement, patient, consultation } = opts;
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();

  const dateEntree = new Date(consultation.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const dateSortie = new Date(consultation.date_sortie).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  addHeader(doc, etablissement, "CERTIFICAT D'HOSPITALISATION", dateEntree);

  let y = 36;

  autoTable(doc, {
    startY: y,
    head: [['Information', 'Détail']],
    body: [
      ['Patient', `${patient.prenom} ${patient.nom}`],
      ['Code patient', patient.code],
      ...(patient.date_naissance ? [['Date de naissance', new Date(patient.date_naissance).toLocaleDateString('fr-FR')]] : []),
      ['Date d\'admission', dateEntree],
      ['Date de sortie', dateSortie],
      ...(consultation.service_hospitalisation ? [['Service', consultation.service_hospitalisation]] : []),
      ...(consultation.diagnostic ? [['Diagnostic', consultation.diagnostic]] : []),
    ],
    styles: { fontSize: 9, cellPadding: 3, textColor: GRAY_DARK },
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: GREEN_LIGHT },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Contenu du certificat
  const civilite = patient.sexe === 'F' ? 'Mme' : 'M.';
  const ageStr = patient.date_naissance
    ? `, né(e) le ${new Date(patient.date_naissance).toLocaleDateString('fr-FR')}`
    : '';
  const serviceStr = consultation.service_hospitalisation ? ` au service de ${consultation.service_hospitalisation}` : '';
  const diagStr = consultation.diagnostic ? ` pour ${consultation.diagnostic}` : '';

  const contenu = `Je soussigné(e), Dr. ${consultation.doctor_prenom} ${consultation.doctor_nom}, certifie que ${civilite} ${patient.prenom} ${patient.nom}${ageStr}, a été hospitalisé(e) dans notre établissement${serviceStr}, du ${dateEntree} au ${dateSortie}${diagStr}.\n\nLe/la patient(e) a bénéficié de soins médicaux et infirmiers appropriés durant son séjour.\n\nLe présent certificat est établi à la demande de l'intéressé(e) pour servir et valoir ce que de droit.`;

  const frameX = 14;
  const frameW = w - 28;
  const contentX = frameX + 8;
  const contentW = frameW - 16;

  const fontSize = 10.5;
  const lineHeightMm = fontSize * 1.5 / 2.834;
  doc.setFontSize(fontSize);
  doc.setLineHeightFactor(1.5);
  const paragraphs = contenu.split('\n\n');
  const paragraphLines = paragraphs.map(p => doc.splitTextToSize(p.trim(), contentW));
  const totalLines = paragraphLines.reduce((acc, pl, i) => acc + pl.length + (i < paragraphLines.length - 1 ? 1 : 0), 0);
  const frameH = totalLines * lineHeightMm + 20;

  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.6);
  doc.roundedRect(frameX, y, frameW, frameH, 3, 3, 'S');

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_DARK);
  let textY = y + 12;
  for (let pi = 0; pi < paragraphLines.length; pi++) {
    doc.text(paragraphLines[pi], contentX, textY, { align: 'justify', maxWidth: contentW });
    textY += paragraphLines[pi].length * lineHeightMm;
    if (pi < paragraphLines.length - 1) textY += lineHeightMm;
  }
  doc.setLineHeightFactor(1.15);
  y += frameH + 16;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY_DARK);
  doc.text(`Fait à Boromo, le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, w - 14, y, { align: 'right' });
  y += 20;

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(w - 80, y, w - 14, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_MID);
  doc.text(`Dr. ${consultation.doctor_prenom} ${consultation.doctor_nom}`, w - 47, y + 5, { align: 'center' });
  doc.text('Signature et cachet', w - 47, y + 10, { align: 'center' });

  addFooter(doc, etablissement);
  doc.save(`Certificat_Hospitalisation_${patient.code}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ── RAPPORT CONSULTATIONS ─────────────────────────────────
export function genererRapportConsultations(opts: {
  etablissement: string;
  total: number;
  ageMoyen: number;
  parSexe: { sexe: string; count: string }[];
  diagnostics: { diagnostic: string; count: string }[];
  parProfession: { profession: string; count: string }[];
  parResidence: { residence: string; count: string }[];
  dateDebut?: string | null;
  dateFin?: string | null;
}) {
  const { etablissement, total, ageMoyen, parSexe, diagnostics, parProfession, parResidence, dateDebut, dateFin } = opts;
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();

  const periode = dateDebut && dateFin
    ? `Période du ${new Date(dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dateFin).toLocaleDateString('fr-FR')}`
    : `Toutes les consultations — Généré le ${new Date().toLocaleDateString('fr-FR')}`;

  addHeader(doc, etablissement, 'RAPPORT ÉPIDÉMIOLOGIQUE DES CONSULTATIONS', periode);

  let y = 36;

  // ── Indicateurs clés ────────────────────────────────────
  const masculin  = parSexe.find(s => s.sexe === 'M');
  const feminin   = parSexe.find(s => s.sexe === 'F');
  const totalSexe = parSexe.reduce((a, s) => a + Number(s.count), 0);
  const pctM = totalSexe > 0 ? Math.round(Number(masculin?.count ?? 0) / totalSexe * 100) : 0;
  const pctF = totalSexe > 0 ? Math.round(Number(feminin?.count ?? 0) / totalSexe * 100) : 0;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text('INDICATEURS CLÉS', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Nombre total de consultations', String(total)],
      ['Âge moyen des patients', ageMoyen > 0 ? `${ageMoyen} ans` : 'N/D'],
      ['Patients masculins', `${masculin?.count ?? 0} (${pctM}%)`],
      ['Patientes féminines', `${feminin?.count ?? 0} (${pctF}%)`],
    ],
    styles: { fontSize: 9.5, cellPadding: 3.5, textColor: GRAY_DARK },
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: GREEN_LIGHT },
    columnStyles: { 0: { cellWidth: 100, fontStyle: 'bold' }, 1: { halign: 'center' } },
    margin: { left: 14, right: 14 },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── Principaux diagnostics ───────────────────────────────
  if (diagnostics.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEAL);
    doc.text('PRINCIPAUX DIAGNOSTICS', 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [['#', 'Diagnostic', 'Nb de cas']],
      body: diagnostics.map((d, i) => [String(i + 1), d.diagnostic, d.count]),
      styles: { fontSize: 9, cellPadding: 3, textColor: GRAY_DARK },
      headStyles: { fillColor: TEAL, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: TEAL_LIGHT },
      columnStyles: { 0: { cellWidth: 10 }, 2: { halign: 'center', cellWidth: 22 } },
      margin: { left: 14, right: 14 },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Distribution par profession ──────────────────────────
  if (parProfession.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...GREEN);
    doc.text('DISTRIBUTION PAR PROFESSION', 14, y);
    y += 4;

    const totalProf = parProfession.reduce((a, p) => a + Number(p.count), 0);
    autoTable(doc, {
      startY: y,
      head: [['Profession', 'Nb patients', '%']],
      body: parProfession.map(p => [
        p.profession,
        p.count,
        `${Math.round(Number(p.count) / totalProf * 100)}%`,
      ]),
      styles: { fontSize: 9, cellPadding: 3, textColor: GRAY_DARK },
      headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: GREEN_LIGHT },
      columnStyles: { 1: { halign: 'center', cellWidth: 28 }, 2: { halign: 'center', cellWidth: 18 } },
      margin: { left: 14, right: 14 },
      theme: 'grid',
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── Distribution par provenance ──────────────────────────
  if (parResidence.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...TEAL);
    doc.text('DISTRIBUTION PAR PROVENANCE', 14, y);
    y += 4;

    const totalRes = parResidence.reduce((a, r) => a + Number(r.count), 0);
    autoTable(doc, {
      startY: y,
      head: [['Provenance / Résidence', 'Nb patients', '%']],
      body: parResidence.map(r => [
        r.residence,
        r.count,
        `${Math.round(Number(r.count) / totalRes * 100)}%`,
      ]),
      styles: { fontSize: 9, cellPadding: 3, textColor: GRAY_DARK },
      headStyles: { fillColor: TEAL, textColor: WHITE, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: TEAL_LIGHT },
      columnStyles: { 1: { halign: 'center', cellWidth: 28 }, 2: { halign: 'center', cellWidth: 18 } },
      margin: { left: 14, right: 14 },
      theme: 'grid',
    });
  }

  addFooter(doc, etablissement);
  doc.save(`Rapport_Consultations_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ── RAPPORT RECETTES ──────────────────────────────────────
export function genererRapportRecettes(opts: {
  etablissement: string;
  paiements: any[];
  totals: { type: string; total: number; count: number }[];
  globalTotal: number;
  dateDebut?: string;
  dateFin?: string;
}) {
  const { etablissement, paiements, totals, globalTotal, dateDebut, dateFin } = opts;
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();

  const periode = dateDebut && dateFin
    ? `Période du ${new Date(dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dateFin).toLocaleDateString('fr-FR')}`
    : `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;

  addHeader(doc, etablissement, 'RAPPORT DE RECETTES', periode);

  let y = 36;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...GREEN);
  doc.text('Résumé financier', 14, y);
  y += 4;

  const consultTotal = totals.find(t => t.type === 'consultation');
  const certifTotal  = totals.find(t => t.type === 'certificat');

  autoTable(doc, {
    startY: y,
    head: [['Catégorie', 'Transactions', 'Montant']],
    body: [
      ['Consultations', String(consultTotal?.count ?? 0), `${(consultTotal?.total ?? 0).toLocaleString()} F CFA`],
      ['Certificats',   String(certifTotal?.count ?? 0),  `${(certifTotal?.total ?? 0).toLocaleString()} F CFA`],
      ['TOTAL GÉNÉRAL', String(paiements.length),          `${globalTotal.toLocaleString()} F CFA`],
    ],
    styles: { fontSize: 9.5, cellPadding: 4 },
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: GREEN_LIGHT },
    bodyStyles: { textColor: GRAY_DARK },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fillColor = GREEN;
        data.cell.styles.textColor = WHITE;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...TEAL);
  doc.text('Détail des transactions', 14, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Patient', 'Code', 'Type', 'Montant']],
    body: paiements.map(p => [
      new Date(p.date).toLocaleDateString('fr-FR'),
      `${p.patient_prenom ?? ''} ${p.patient_nom ?? ''}`.trim() || '—',
      p.patient_code || '—',
      p.type === 'consultation' ? 'Consultation' : 'Certificat',
      `${Number(p.montant).toLocaleString()} F CFA`,
    ]),
    styles: { fontSize: 8.5, cellPadding: 2.5, textColor: GRAY_DARK },
    headStyles: { fillColor: TEAL, textColor: WHITE, fontStyle: 'bold', fontSize: 8.5 },
    alternateRowStyles: { fillColor: TEAL_LIGHT },
    columnStyles: {
      0: { cellWidth: 24 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: 14, right: 14 },
    theme: 'grid',
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        const rawRow = data.row.raw as string[];
        data.cell.styles.textColor = rawRow[3] === 'Consultation' ? GREEN : TEAL;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  addFooter(doc, etablissement);
  doc.save(`Rapport_Recettes_${new Date().toISOString().split('T')[0]}.pdf`);
}

// ── CERTIFICAT DE VISITE MÉDICALE ─────────────────────────
export function genererCertificatVisite(opts: {
  etablissement: string;
  patient: { prenom: string; nom: string; code: string; date_naissance?: string };
  visite: {
    doctor_prenom: string; doctor_nom: string; qualification: string;
    radio: string; bw: string;
    acuite_od: string; acuite_og: string;
    begaiement: string; surdite: string;
    apte_pour: string;
  };
  contre: {
    doctor_prenom: string; doctor_nom: string; qualification: string;
    apte_pour: string;
  };
  signatureImg?: string;
}) {
  const { etablissement, patient, visite, contre, signatureImg } = opts;
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const dateJour = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const dateFile = new Date().toISOString().split('T')[0];
  const dateNaissance = patient.date_naissance
    ? new Date(patient.date_naissance).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  addHeader(doc, etablissement, 'CERTIFICAT DE VISITE ET CONTRE-VISITE MÉDICALE');

  const frameX = 14, frameW = w - 28;
  const textX = frameX + 10, textW = frameW - 20;
  const lineH = 7.0;

  // ── Pré-calcul des lignes ─────────────────────────────────
  doc.setFont('times', 'normal');
  doc.setFontSize(11);

  type Seg = { t: string; last: boolean };

  const s1: Seg[] = [];
  for (const line of [
    `Nous soussigné Dr. ${visite.doctor_prenom} ${visite.doctor_nom}, ${visite.qualification || 'Médecin'},`,
    `Certifions que ${patient.prenom} ${patient.nom}, né(e) le ${dateNaissance},`,
    `Ne présente actuellement aucune infection contagieuse cliniquement et radiologiquement décelable et il(elle) est indemne de toute infection tuberculose, cancéreuse, nerveuse ou lépreuse.`,
    `Radio : ${visite.radio}     B.W : ${visite.bw}`,
    `Acuité visuelle sans correction — OD : ${visite.acuite_od || '—'}  OG : ${visite.acuite_og || '—'}  Bégaiement : ${visite.begaiement}  Surdité : ${visite.surdite}`,
    `En conséquence, estimons qu'il/elle est apte ${visite.apte_pour}`,
  ]) {
    const wr = doc.splitTextToSize(line, textW);
    wr.forEach((t: string, li: number) => s1.push({ t, last: li === wr.length - 1 }));
  }
  const s1H = s1.length * lineH;

  const s2: Seg[] = [];
  for (const line of [
    `Nous soussigné Dr. ${contre.doctor_prenom} ${contre.doctor_nom}, ${contre.qualification || 'Médecin'},`,
    `Certifions que ${patient.prenom} ${patient.nom}, né(e) le ${dateNaissance},`,
    `Est indemne de toute infection contagieuse cliniquement et radiologiquement décelable et il(elle) est indemne de toute infection tuberculose, cancéreuse, nerveuse ou lépreuse.`,
    `En conséquence, estimons qu'il/elle est apte ${contre.apte_pour}`,
  ]) {
    const wr = doc.splitTextToSize(line, textW);
    wr.forEach((t: string, li: number) => s2.push({ t, last: li === wr.length - 1 }));
  }
  const s2H = s2.length * lineH;

  // frameH calculé généreusement pour englober les deux sig zones
  const frameH = 8 + 12 + s1H + 44 + 12 + 12 + s2H + 28 + 10;
  const frameY = 38;

  // ── Cadre unique (vert) ───────────────────────────────────
  doc.setFillColor(...GREEN_LIGHT);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.9);
  doc.roundedRect(frameX, frameY, frameW, frameH, 4, 4, 'FD');

  let y = frameY + 8;

  // ── Section 1 : Visite médicale ───────────────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...GREEN);
  const t1 = 'VISITE MÉDICALE';
  doc.text(t1, w / 2, y + 7, { align: 'center' });
  const t1w = doc.getTextWidth(t1);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(w / 2 - t1w / 2, y + 9, w / 2 + t1w / 2, y + 9);
  y += 17;

  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...GRAY_DARK);
  for (const seg of s1) {
    doc.text(seg.t, textX, y, { align: seg.last ? 'left' : 'justify', maxWidth: textW });
    y += lineH;
  }

  // Signature section 1
  y += 5;
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(...GRAY_DARK);
  doc.text(`Fait à Boromo, le ${dateJour}`, w - textX, y, { align: 'right' });
  y += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...GREEN);
  doc.text('Le Médecin', w - textX, y, { align: 'right' });
  y += 5;
  if (signatureImg) {
    doc.addImage(signatureImg, 'PNG', w - textX - 60, y, 60, 15);
    y += 17;
  } else {
    y += 15;
  }
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.4);
  doc.line(w - textX - 60, y, w - textX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_MID);
  doc.text(`Dr. ${visite.doctor_prenom} ${visite.doctor_nom}`, w - textX - 30, y + 4, { align: 'center' });
  doc.text('Signature et cachet', w - textX - 30, y + 8, { align: 'center' });
  y += 12;

  // ── Séparateur interne tirets ─────────────────────────────
  y += 4;
  doc.setDrawColor(...GRAY_MID);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([5, 3], 0);
  doc.line(textX, y, w - textX, y);
  doc.setLineDashPattern([], 0);
  y += 8;

  // ── Section 2 : Contre-visite ─────────────────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...TEAL);
  const t2 = 'CONTRE-VISITE MÉDICALE';
  doc.text(t2, w / 2, y + 7, { align: 'center' });
  const t2w = doc.getTextWidth(t2);
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.4);
  doc.line(w / 2 - t2w / 2, y + 9, w / 2 + t2w / 2, y + 9);
  y += 17;

  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...GRAY_DARK);
  for (const seg of s2) {
    doc.text(seg.t, textX, y, { align: seg.last ? 'left' : 'justify', maxWidth: textW });
    y += lineH;
  }

  // Signature section 2
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...TEAL);
  doc.text('Le Médecin Contre-Visiteur', w - textX, y, { align: 'right' });
  y += 20;
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.4);
  doc.line(w - textX - 60, y, w - textX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY_MID);
  doc.text(`Dr. ${contre.doctor_prenom} ${contre.doctor_nom}`, w - textX - 30, y + 4, { align: 'center' });
  doc.text('Signature et cachet', w - textX - 30, y + 8, { align: 'center' });

  addFooter(doc, etablissement);
  doc.save(`Visite_${patient.code}_${dateFile}.pdf`);
}
