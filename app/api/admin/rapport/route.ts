import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbAll, dbGet } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  await initDb();

  const { searchParams } = new URL(req.url);
  const dateDebut = searchParams.get('date_debut');
  const dateFin = searchParams.get('date_fin');

  const whereClauses: string[] = [];
  const params: string[] = [];
  if (dateDebut) { params.push(dateDebut); whereClauses.push(`c.date >= $${params.length}`); }
  if (dateFin)   { params.push(dateFin + ' 23:59:59'); whereClauses.push(`c.date <= $${params.length}`); }
  const where = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const totalRow = await dbGet(
    `SELECT COUNT(*) as total FROM consultations c ${where}`, params
  ) as { total: string };
  const total = Number(totalRow?.total ?? 0);

  const parSexe = await dbAll(
    `SELECT p.sexe, COUNT(*) as count
     FROM consultations c JOIN patients p ON c.patient_id = p.id ${where}
     GROUP BY p.sexe ORDER BY count DESC`,
    params
  ) as { sexe: string; count: string }[];

  const ageMoyen = await dbGet(
    `SELECT ROUND(AVG(
       EXTRACT(YEAR FROM AGE(NOW(), TO_DATE(p.date_naissance, 'YYYY-MM-DD')))
     )::numeric, 1) as age_moyen
     FROM consultations c JOIN patients p ON c.patient_id = p.id
     ${where ? where + ' AND' : 'WHERE'} p.date_naissance IS NOT NULL AND p.date_naissance != ''`,
    params
  ) as { age_moyen: string };

  const baseWhere = whereClauses.length ? where + ' AND' : 'WHERE';

  const diagnostics = await dbAll(
    `SELECT diagnostic, COUNT(*) as count
     FROM consultations c ${baseWhere} diagnostic IS NOT NULL AND diagnostic != ''
     GROUP BY diagnostic ORDER BY count DESC LIMIT 10`,
    params
  ) as { diagnostic: string; count: string }[];

  const parProfession = await dbAll(
    `SELECT p.profession, COUNT(*) as count
     FROM consultations c JOIN patients p ON c.patient_id = p.id
     ${where ? where + ' AND' : 'WHERE'} p.profession IS NOT NULL AND p.profession != ''
     GROUP BY p.profession ORDER BY count DESC LIMIT 10`,
    params
  ) as { profession: string; count: string }[];

  const parResidence = await dbAll(
    `SELECT p.residence, COUNT(*) as count
     FROM consultations c JOIN patients p ON c.patient_id = p.id
     ${where ? where + ' AND' : 'WHERE'} p.residence IS NOT NULL AND p.residence != ''
     GROUP BY p.residence ORDER BY count DESC LIMIT 10`,
    params
  ) as { residence: string; count: string }[];

  return NextResponse.json({
    total,
    ageMoyen: Number(ageMoyen?.age_moyen ?? 0),
    parSexe,
    diagnostics,
    parProfession,
    parResidence,
    dateDebut,
    dateFin,
  });
}
