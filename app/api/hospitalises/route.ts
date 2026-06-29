import { NextResponse } from 'next/server';
import { initDb, dbAll } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = getSession();
  if (!session || session.role !== 'medecin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  await initDb();

  const rows = await dbAll(
    `SELECT c.id AS consultation_id,
            c.date AS date_admission,
            c.service_hospitalisation,
            c.diagnostic,
            c.motif,
            p.code,
            p.nom,
            p.prenom,
            p.sexe
     FROM consultations c
     JOIN patients p ON p.id = c.patient_id
     WHERE c.type_prise_en_charge = 'hospitalisation'
       AND (c.date_sortie IS NULL OR c.date_sortie = '')
       AND p.decede = 0
     ORDER BY c.date ASC`,
    []
  ) as any[];

  return NextResponse.json({ hospitalises: rows });
}
