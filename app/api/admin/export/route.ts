import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbAll } from '@/lib/db';
import { getSession } from '@/lib/auth';

function calcAge(dateNaissance: string | null): number | null {
  if (!dateNaissance) return null;
  const d = new Date(dateNaissance);
  if (isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const age = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
  return age >= 0 ? age : null;
}

function calcImc(poids: string | null, taille: string | null): number | null {
  const p = parseFloat(poids || '');
  const t = parseFloat(taille || '') / 100;
  if (!p || !t || t <= 0) return null;
  return Math.round((p / (t * t)) * 10) / 10;
}

function calcDureeSejour(admission: string, sortie: string | null): number | null {
  if (!sortie) return null;
  const a = new Date(admission);
  const s = new Date(sortie);
  if (isNaN(a.getTime()) || isNaN(s.getTime())) return null;
  return Math.max(1, Math.ceil((s.getTime() - a.getTime()) / 86400000));
}

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  await initDb();

  const { searchParams } = new URL(req.url);
  const dateDebut = searchParams.get('date_debut');
  const dateFin = searchParams.get('date_fin');

  const params: string[] = [];
  const where: string[] = [];
  if (dateDebut) { params.push(dateDebut); where.push(`c.date >= $${params.length}`); }
  if (dateFin)   { params.push(dateFin + ' 23:59:59'); where.push(`c.date <= $${params.length}`); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const rows = await dbAll(
    `SELECT c.id, c.date, c.motif, c.tension, c.temperature, c.poids, c.taille,
            c.diagnostic, c.type_prise_en_charge, c.date_sortie,
            p.nom, p.prenom, p.date_naissance, p.sexe,
            d.prenom AS doctor_prenom, d.nom AS doctor_nom
     FROM consultations c
     JOIN patients p ON c.patient_id = p.id
     JOIN doctors d ON c.doctor_id = d.id
     ${whereSql}
     ORDER BY c.date DESC`,
    params
  ) as any[];

  const data = rows.map((r) => ({
    nom: r.nom || '',
    prenom: r.prenom || '',
    age: calcAge(r.date_naissance),
    sexe: r.sexe || '',
    motif: r.motif || '',
    tension: r.tension || '',
    temperature: r.temperature || '',
    poids: r.poids || '',
    taille: r.taille || '',
    imc: calcImc(r.poids, r.taille),
    diagnostic: r.diagnostic || '',
    type_traitement: r.type_prise_en_charge === 'hospitalisation' ? 'Hospitalisation' : 'Ambulatoire',
    duree_sejour: calcDureeSejour(r.date, r.date_sortie),
    medecin: `Dr. ${r.doctor_prenom} ${r.doctor_nom}`.trim(),
    date: r.date ? String(r.date).slice(0, 10) : '',
  }));

  return NextResponse.json(data);
}
