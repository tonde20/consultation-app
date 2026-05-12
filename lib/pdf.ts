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
}) {
  const { etablissement, patient, certificat } = opts;
  const doc = new jsPDF('p', 'mm', 'a4');
  const w = doc.internal.pageSize.getWidth();

  addHeader(doc, etablissement, `CERTIFICAT ${certificat.type.toUpperCase()}`,
    new Date(certificat.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }));

  let y = 36;

  // ── Tableau patient ──────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [['Champ', 'Information']],
    body: [
      ['Nom complet', `${patient.prenom} ${patient.nom}`],
      ['Code patient', patient.code],
      ...(patient.date_naissance
        ? [['Date de naissance', new Date(patient.date_naissance).toLocaleDateString('fr-FR')]]
        : []),
    ],
    styles: { fontSize: 9, cellPadding: 3, textColor: GRAY_DARK },
    headStyles: { fillColor: GREEN, textColor: WHITE, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: GREEN_LIGHT },
    columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
    theme: 'grid',
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── Contenu du certificat dans un cadre ──────────────────
  const frameX = 14;
  const frameW = w - 28;
  const contentX = frameX + 8;
  const contentW = frameW - 16;

  // Calculer la hauteur du texte avec interligne 1.5 (gestion des paragraphes séparés par \n\n)
  const fontSize = 10.5;
  const lineHeightMm = fontSize * 1.5 / 2.834;
  doc.setFontSize(fontSize);
  doc.setLineHeightFactor(1.5);
  const rawParagraphs = (certificat.contenu || '').split('\n\n');
  const paragraphLines = rawParagraphs.map(p => doc.splitTextToSize(p.trim(), contentW));
  const totalLineCount = paragraphLines.reduce((acc, pl, i) => acc + pl.length + (i < paragraphLines.length - 1 ? 1 : 0), 0);
  const textHeight = totalLineCount * lineHeightMm;
  const frameH = textHeight + 20;

  // Dessiner le cadre
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.6);
  doc.roundedRect(frameX, y, frameW, frameH, 3, 3, 'S');

  // Texte justifié dans le cadre, paragraphe par paragraphe
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

  // ── Lieu et date ─────────────────────────────────────────
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...GRAY_DARK);
  const lieu = `Fait à Boromo, le ${new Date(certificat.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  doc.text(lieu, w - 14, y, { align: 'right' });
  y += 20;

  // ── Zone signature ───────────────────────────────────────
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(w - 80, y, w - 14, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY_MID);
  doc.text(`Dr. ${certificat.doctor_prenom} ${certificat.doctor_nom}`, w - 47, y + 5, { align: 'center' });
  doc.text('Signature et cachet', w - 47, y + 10, { align: 'center' });

  addFooter(doc, etablissement);
  doc.save(`Certificat_${certificat.type}_${patient.code}_${new Date().toISOString().split('T')[0]}.pdf`);
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
