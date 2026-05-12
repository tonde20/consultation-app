import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbGet, dbAll, dbRun } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(_: NextRequest, { params }: { params: { code: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  if (session.role === 'patient' && session.code !== params.code) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  await initDb();
  const patient = await dbGet(
    'SELECT id, code, nom, prenom, date_naissance, sexe, telephone, adresse, profession, residence, decede, created_at FROM patients WHERE code = $1',
    [params.code]
  );
  if (!patient) return NextResponse.json({ error: 'Patient non trouvé' }, { status: 404 });

  const consultations = await dbAll(
    `SELECT c.*, d.nom as doctor_nom, d.prenom as doctor_prenom
     FROM consultations c JOIN doctors d ON c.doctor_id = d.id
     WHERE c.patient_id = $1 ORDER BY c.date DESC`,
    [patient.id]
  ) as any[];

  for (const consult of consultations) {
    consult.prescriptions = await dbAll('SELECT * FROM prescriptions WHERE consultation_id = $1', [consult.id]);
    consult.examens = await dbAll('SELECT * FROM examens WHERE consultation_id = $1', [consult.id]);
  }

  const rendez_vous = await dbAll(
    `SELECT rv.*, d.nom as doctor_nom, d.prenom as doctor_prenom
     FROM rendez_vous rv JOIN doctors d ON rv.doctor_id = d.id
     WHERE rv.patient_id = $1 ORDER BY rv.date_heure DESC`,
    [patient.id]
  );

  return NextResponse.json({ patient, consultations, rendez_vous });
}

export async function PUT(req: NextRequest, { params }: { params: { code: string } }) {
  const session = getSession();
  if (!session || session.role === 'patient') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const data = await req.json();
  await initDb();

  const allowed = ['nom', 'prenom', 'date_naissance', 'sexe', 'telephone', 'adresse', 'profession', 'residence'];
  const keys = Object.keys(data).filter(k => allowed.includes(k));
  const values = keys.map(k => data[k]);
  const fields = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

  if (!fields) return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 });

  await dbRun(
    `UPDATE patients SET ${fields} WHERE code = $${keys.length + 1}`,
    [...values, params.code]
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { code: string } }) {
  const session = getSession();
  if (!session || session.role === 'patient') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  await initDb();

  const patient = await dbGet('SELECT id FROM patients WHERE code = $1', [params.code]);
  if (!patient) return NextResponse.json({ error: 'Patient non trouvé' }, { status: 404 });

  await dbRun('DELETE FROM paiements WHERE patient_id = $1', [patient.id]);
  await dbRun('DELETE FROM certificats WHERE patient_id = $1', [patient.id]);
  await dbRun('DELETE FROM rendez_vous WHERE patient_id = $1', [patient.id]);
  await dbRun('DELETE FROM consultations WHERE patient_id = $1', [patient.id]);
  await dbRun('DELETE FROM patients WHERE id = $1', [patient.id]);

  return NextResponse.json({ success: true });
}