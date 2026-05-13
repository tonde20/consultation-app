import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbGet, dbAll, dbRun } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'medecin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { patient_id, type, contenu } = await req.json();
  if (!patient_id || !type) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });

  await initDb();
  const fraisRow = await dbGet("SELECT value FROM settings WHERE key = 'certificat_frais'");
  const fraisBase = parseInt(fraisRow?.value || '2000');

  const todayStr    = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  // Règle métier : aptitude et inaptitude incompatibles le même jour
  const conflictMap: Record<string, string> = {
    'Aptitude':   'Inaptitude',
    'Inaptitude': 'Aptitude',
  };
  if (conflictMap[type]) {
    const conflit = await dbGet(
      `SELECT id FROM certificats WHERE patient_id = $1 AND type = $2 AND date >= $3 AND date < $4 LIMIT 1`,
      [patient_id, conflictMap[type], todayStr, tomorrowStr]
    );
    if (conflit) {
      return NextResponse.json({
        error: `Impossible : ce patient a déjà un certificat d'${conflictMap[type].toLowerCase()} aujourd'hui. Aptitude et inaptitude ne peuvent pas être délivrés le même jour pour un même patient.`,
      }, { status: 409 });
    }
  }

  // Même type déjà émis aujourd'hui → réimpression gratuite
  const dejaEmis = await dbGet(
    `SELECT id FROM certificats WHERE patient_id = $1 AND type = $2 AND date >= $3 AND date < $4 LIMIT 1`,
    [patient_id, type, todayStr, tomorrowStr]
  );
  const montant = dejaEmis ? 0 : fraisBase;

  const cert = await dbGet(
    'INSERT INTO certificats (patient_id, doctor_id, type, contenu, montant) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [patient_id, session.id, type, contenu || null, montant]
  );

  if (montant > 0) {
    await dbRun(
      'INSERT INTO paiements (patient_id, type, reference_id, montant) VALUES ($1, $2, $3, $4)',
      [patient_id, 'certificat', cert.id, montant]
    );
  }

  if (type === 'Décès') {
    await dbRun('UPDATE patients SET decede = 1 WHERE id = $1', [patient_id]);
  }

  return NextResponse.json({ id: cert.id, success: true });
}

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session || session.role === 'patient') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  await initDb();
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get('patient_id');

  let certs;
  if (patientId) {
    certs = await dbAll(
      `SELECT c.*, d.nom as doctor_nom, d.prenom as doctor_prenom
       FROM certificats c JOIN doctors d ON c.doctor_id = d.id
       WHERE c.patient_id = $1 ORDER BY c.date DESC`,
      [patientId]
    );
  } else {
    certs = await dbAll(
      `SELECT c.*, d.nom as doctor_nom, d.prenom as doctor_prenom,
              p.nom as patient_nom, p.prenom as patient_prenom
       FROM certificats c
       JOIN doctors d ON c.doctor_id = d.id
       JOIN patients p ON c.patient_id = p.id
       ORDER BY c.date DESC LIMIT 100`
    );
  }
  return NextResponse.json(certs);
}