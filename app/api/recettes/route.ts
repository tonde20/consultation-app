import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbAll, dbGet } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const dateDebut = searchParams.get('date_debut') || '';
  const dateFin = searchParams.get('date_fin') || '';

  await initDb();

  let where = '';
  const params: string[] = [];
  if (dateDebut && dateFin) {
    where = 'WHERE date(paiements.date) BETWEEN $1 AND $2';
    params.push(dateDebut, dateFin);
  } else if (dateDebut) {
    where = 'WHERE date(paiements.date) >= $1';
    params.push(dateDebut);
  }

  const paiements = await dbAll(
    `SELECT paiements.*, p.nom as patient_nom, p.prenom as patient_prenom, p.code as patient_code
     FROM paiements LEFT JOIN patients p ON paiements.patient_id = p.id
     ${where} ORDER BY paiements.date DESC LIMIT 500`,
    params
  );

  // Pour totals et globalTotal, les $1/$2 restent les mêmes params
  const whereForTotals = where.replace('paiements.date', 'date');
  const totals = await dbAll(
    `SELECT type, SUM(montant) as total, COUNT(*) as count
     FROM paiements ${whereForTotals} GROUP BY type`,
    params
  );

  const globalTotal = await dbGet(
    `SELECT SUM(montant) as total FROM paiements ${whereForTotals}`,
    params
  );

  return NextResponse.json({ paiements, totals, globalTotal: globalTotal?.total || 0 });
}