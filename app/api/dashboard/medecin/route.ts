import { NextResponse } from 'next/server';
import { initDb, dbGet, dbAll } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session || session.role !== 'medecin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  await initDb();
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Patients distincts consultés ce mois
  const patientsCount = await dbGet(
    `SELECT COUNT(DISTINCT patient_id) as count FROM consultations
     WHERE doctor_id = $1 AND TO_CHAR(date::timestamp, 'YYYY-MM') = $2`,
    [session.id, currentMonth]
  );

  // Consultations totales ce mois
  const consultCount = await dbGet(
    `SELECT COUNT(*) as count FROM consultations
     WHERE doctor_id = $1 AND TO_CHAR(date::timestamp, 'YYYY-MM') = $2`,
    [session.id, currentMonth]
  );

  // RDV ce mois par statut
  const rdvRows = await dbAll(
    `SELECT statut, COUNT(*) as count FROM rendez_vous
     WHERE doctor_id = $1 AND TO_CHAR(date_heure::timestamp, 'YYYY-MM') = $2
     GROUP BY statut`,
    [session.id, currentMonth]
  ) as any[];

  const rdv: Record<string, number> = { en_attente: 0, confirme: 0, effectue: 0, annule: 0 };
  for (const row of rdvRows) {
    rdv[row.statut] = parseInt(row.count);
  }

  return NextResponse.json({
    patientsThisMonth: parseInt(patientsCount?.count || '0'),
    consultationsThisMonth: parseInt(consultCount?.count || '0'),
    rdv,
    month: currentMonth,
  });
}
