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

  // CTE : on déduplique par (patient, jour) — une seule ligne par patient par jour
  // Si le même patient a été enregistré deux fois le même jour par erreur, on ne compte qu'une visite.
  const cteWhere = where.replace(/\bc\./g, 'c.');
  const dedupCte = `
    WITH deduped AS (
      SELECT DISTINCT ON (c.patient_id, DATE(c.date))
        c.id, c.patient_id, c.doctor_id, c.date, c.diagnostic, c.montant
      FROM consultations c
      ${cteWhere}
      ORDER BY c.patient_id, DATE(c.date), c.id
    )
  `;

  const totalRow = await dbGet(
    `${dedupCte} SELECT COUNT(*) as total FROM deduped`,
    params
  ) as { total: string };
  const total = Number(totalRow?.total ?? 0);

  const parSexe = await dbAll(
    `${dedupCte}
     SELECT p.sexe, COUNT(*) as count
     FROM deduped d JOIN patients p ON d.patient_id = p.id
     GROUP BY p.sexe ORDER BY count DESC`,
    params
  ) as { sexe: string; count: string }[];

  const ageMoyen = await dbGet(
    `${dedupCte}
     SELECT ROUND(AVG(
       EXTRACT(YEAR FROM AGE(NOW(), TO_DATE(p.date_naissance, 'YYYY-MM-DD')))
     )::numeric, 1) as age_moyen
     FROM deduped d JOIN patients p ON d.patient_id = p.id
     WHERE p.date_naissance IS NOT NULL AND p.date_naissance != ''`,
    params
  ) as { age_moyen: string };

  const baseJoin = `${dedupCte} SELECT d.diagnostic, COUNT(*) as count FROM deduped d`;

  const diagnostics = await dbAll(
    `${dedupCte}
     SELECT d.diagnostic, COUNT(*) as count
     FROM deduped d
     WHERE d.diagnostic IS NOT NULL AND d.diagnostic != ''
     GROUP BY d.diagnostic ORDER BY count DESC LIMIT 10`,
    params
  ) as { diagnostic: string; count: string }[];

  const parProfession = await dbAll(
    `${dedupCte}
     SELECT p.profession, COUNT(*) as count
     FROM deduped d JOIN patients p ON d.patient_id = p.id
     WHERE p.profession IS NOT NULL AND p.profession != ''
     GROUP BY p.profession ORDER BY count DESC LIMIT 10`,
    params
  ) as { profession: string; count: string }[];

  const parResidence = await dbAll(
    `${dedupCte}
     SELECT p.residence, COUNT(*) as count
     FROM deduped d JOIN patients p ON d.patient_id = p.id
     WHERE p.residence IS NOT NULL AND p.residence != ''
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
