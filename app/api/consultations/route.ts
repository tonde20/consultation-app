import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbGet, dbAll, dbRun } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'medecin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { patient_id, motif, diagnostic, notes, tension, temperature, poids, taille, prescriptions, examens, type_prise_en_charge, service_hospitalisation } = await req.json();
  if (!patient_id) return NextResponse.json({ error: 'Patient requis' }, { status: 400 });

  await initDb();

  // Bloquer si une consultation a déjà été enregistrée aujourd'hui pour ce patient
  const dejaAujourdHui = await dbGet(
    `SELECT id FROM consultations WHERE patient_id = $1 AND DATE(date) = CURRENT_DATE LIMIT 1`,
    [patient_id]
  );
  if (dejaAujourdHui) {
    return NextResponse.json(
      { error: 'Une consultation a déjà été enregistrée aujourd\'hui pour ce patient. Vous ne pouvez pas enregistrer la même consultation deux fois.' },
      { status: 409 }
    );
  }

  const settings = await dbGet('SELECT value FROM settings WHERE key = $1', ['consultation_validite_jours']);
  const validiteDays = parseInt(settings?.value || '10');
  const validiteDate = new Date();
  validiteDate.setDate(validiteDate.getDate() + validiteDays);
  const valide_jusqu = validiteDate.toISOString().split('T')[0];

  const fraisRow = await dbGet('SELECT value FROM settings WHERE key = $1', ['consultation_frais']);
  const fraisBase = parseInt(fraisRow?.value || '1250');

  // Vérifier si le patient a une consultation encore active (dans la période de validité)
  const consultActive = await dbGet(
    `SELECT id, valide_jusqu FROM consultations WHERE patient_id = $1 AND valide_jusqu >= CURRENT_DATE ORDER BY date DESC LIMIT 1`,
    [patient_id]
  );
  // Si une consultation est encore active, la nouvelle est gratuite
  const montant = consultActive ? 0 : fraisBase;
  const estGratuite = montant === 0;

  const typePC = type_prise_en_charge || 'ambulatoire';
  const serviceH = typePC === 'hospitalisation' ? (service_hospitalisation || null) : null;

  const consult = await dbGet(
    `INSERT INTO consultations (patient_id, doctor_id, motif, diagnostic, notes, tension, temperature, poids, taille, valide_jusqu, montant, type_prise_en_charge, service_hospitalisation)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
    [patient_id, session.id, motif || null, diagnostic || null, notes || null, tension || null, temperature || null, poids || null, taille || null, valide_jusqu, montant, typePC, serviceH]
  );

  const consultId = consult.id;

  if (prescriptions?.length) {
    for (const p of prescriptions) {
      if (p.medicament) {
        await dbRun(
          'INSERT INTO prescriptions (consultation_id, medicament, posologie, duree) VALUES ($1, $2, $3, $4)',
          [consultId, p.medicament, p.posologie || null, p.duree || null]
        );
      }
    }
  }

  if (examens?.length) {
    for (const e of examens) {
      if (e.type_examen) {
        await dbRun(
          'INSERT INTO examens (consultation_id, type_examen, description) VALUES ($1, $2, $3)',
          [consultId, e.type_examen, e.description || null]
        );
      }
    }
  }

  // N'enregistrer un paiement que si la consultation est payante
  if (!estGratuite) {
    await dbRun(
      'INSERT INTO paiements (patient_id, type, reference_id, montant) VALUES ($1, $2, $3, $4)',
      [patient_id, 'consultation', consultId, montant]
    );
  }

  return NextResponse.json({ id: consultId, success: true, gratuite: estGratuite });
}

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session || session.role === 'patient') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  await initDb();
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patient_id');

  let consultations;
  if (patientId) {
    consultations = await dbAll(
      `SELECT c.*, d.nom as doctor_nom, d.prenom as doctor_prenom
       FROM consultations c JOIN doctors d ON c.doctor_id = d.id
       WHERE c.patient_id = $1 ORDER BY c.date DESC`,
      [patientId]
    );
  } else {
    consultations = await dbAll(
      `SELECT c.*, d.nom as doctor_nom, d.prenom as doctor_prenom,
              p.nom as patient_nom, p.prenom as patient_prenom, p.code as patient_code
       FROM consultations c
       JOIN doctors d ON c.doctor_id = d.id
       JOIN patients p ON c.patient_id = p.id
       ORDER BY c.date DESC LIMIT 100`
    );
  }
  return NextResponse.json(consultations);
}
