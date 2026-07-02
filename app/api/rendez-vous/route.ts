import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbAll, dbGet, dbRun } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  await initDb();
  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get('doctor_id');

  let query = `
    SELECT rv.*, p.nom as patient_nom, p.prenom as patient_prenom, p.code as patient_code,
           d.nom as doctor_nom, d.prenom as doctor_prenom
    FROM rendez_vous rv
    JOIN patients p ON rv.patient_id = p.id
    JOIN doctors d ON rv.doctor_id = d.id
  `;
  const params: any[] = [];

  if (session.role === 'medecin') {
    query += ' WHERE rv.doctor_id = $1';
    params.push(session.id);
  } else if (session.role === 'patient') {
    query += ' WHERE rv.patient_id = (SELECT id FROM patients WHERE code = $1)';
    params.push(session.code);
  } else if (doctorId) {
    query += ' WHERE rv.doctor_id = $1';
    params.push(doctorId);
  }

  query += ' ORDER BY rv.date_heure DESC LIMIT 100';
  const rdvs = await dbAll(query, params);
  return NextResponse.json(rdvs);
}

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { patient_id, doctor_id, date_heure, motif } = await req.json();
  if (!doctor_id || !date_heure) {
    return NextResponse.json({ error: 'Médecin et date requis' }, { status: 400 });
  }

  await initDb();
  let actualPatientId = patient_id;
  if (session.role === 'patient') {
    const pat = await dbGet('SELECT id FROM patients WHERE code = $1', [session.code]);
    actualPatientId = pat?.id;
  }
  if (!actualPatientId) return NextResponse.json({ error: 'Patient requis' }, { status: 400 });

  const result = await dbGet(
    'INSERT INTO rendez_vous (patient_id, doctor_id, date_heure, motif, statut) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [actualPatientId, doctor_id, date_heure, motif || null, 'en_attente']
  );

  // Notification automatique au médecin
  const patient = await dbGet('SELECT nom, prenom FROM patients WHERE id = $1', [actualPatientId]);
  const dateStr = new Date(date_heure).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const msg = `Nouveau rendez-vous : ${patient?.prenom} ${patient?.nom} — ${dateStr}${motif ? ` (${motif})` : ''}`;
  await dbRun(
    'INSERT INTO notifications (doctor_id, type, message, rdv_id) VALUES ($1, $2, $3, $4)',
    [doctor_id, 'rdv', msg, result.id]
  );

  return NextResponse.json({ id: result.id, success: true });
}