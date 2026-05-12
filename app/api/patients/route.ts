import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbAll, dbGet, dbRun, generatePatientCode } from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  const session = getSession();
  if (!session || session.role === 'patient') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  await initDb();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';

  let patients;
  if (search) {
    patients = await dbAll(
      `SELECT id, code, nom, prenom, date_naissance, sexe, telephone, adresse, profession, residence, decede, created_at
       FROM patients WHERE nom ILIKE $1 OR prenom ILIKE $1 OR code ILIKE $1
       ORDER BY decede ASC, nom ASC LIMIT 50`,
      [`%${search}%`]
    );
  } else {
    patients = await dbAll(
      `SELECT id, code, nom, prenom, date_naissance, sexe, telephone, adresse, profession, residence, decede, created_at
       FROM patients ORDER BY decede ASC, nom ASC LIMIT 100`
    );
  }
  return NextResponse.json(patients);
}

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session || session.role === 'patient') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { nom, prenom, date_naissance, sexe, telephone, adresse, profession, residence, password } = await req.json();
  if (!nom || !prenom) {
    return NextResponse.json({ error: 'Nom et prénom requis' }, { status: 400 });
  }
  await initDb();
  const code = await generatePatientCode();
  const hashedPwd = bcrypt.hashSync(password || code, 10);
  try {
    const result = await dbGet(
      `INSERT INTO patients (code, nom, prenom, date_naissance, sexe, telephone, adresse, profession, residence, password)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [code, nom, prenom, date_naissance || null, sexe || 'M', telephone || null, adresse || null, profession || null, residence || null, hashedPwd]
    );
    return NextResponse.json({ id: result.id, code, success: true });
  } catch (e: any) {
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
  }
}