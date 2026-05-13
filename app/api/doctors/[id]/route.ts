import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbRun, dbAll } from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const data = await req.json();
  await initDb();

  if (data.password) {
    data.password_plain = data.password;
    data.password = bcrypt.hashSync(data.password, 10);
  }

  const keys = Object.keys(data).filter(k => k !== 'id');
  const values = keys.map(k => data[k]);
  const fields = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

  await dbRun(
    `UPDATE doctors SET ${fields} WHERE id = $${keys.length + 1}`,
    [...values, params.id]
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  await initDb();
  const id = params.id;

  const consultIds = await dbAll(
    'SELECT id FROM consultations WHERE doctor_id = $1', [id]
  ) as { id: number }[];
  const cids = consultIds.map(c => c.id);

  if (cids.length > 0) {
    await dbRun(`DELETE FROM prescriptions WHERE consultation_id = ANY($1::int[])`, [cids]);
    await dbRun(`DELETE FROM examens WHERE consultation_id = ANY($1::int[])`, [cids]);
    await dbRun(`DELETE FROM paiements WHERE type = 'consultation' AND reference_id = ANY($1::int[])`, [cids]);
  }

  const certifIds = await dbAll(
    'SELECT id FROM certificats WHERE doctor_id = $1', [id]
  ) as { id: number }[];
  const certIds = certifIds.map(c => c.id);
  if (certIds.length > 0) {
    await dbRun(`DELETE FROM paiements WHERE type = 'certificat' AND reference_id = ANY($1::int[])`, [certIds]);
  }

  await dbRun('DELETE FROM certificats WHERE doctor_id = $1', [id]);
  await dbRun('DELETE FROM rendez_vous WHERE doctor_id = $1', [id]);
  await dbRun('DELETE FROM consultations WHERE doctor_id = $1', [id]);
  await dbRun('DELETE FROM doctors WHERE id = $1', [id]);

  return NextResponse.json({ success: true });
}