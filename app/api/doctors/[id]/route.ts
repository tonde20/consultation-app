import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbRun } from '@/lib/db';
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
  await dbRun('UPDATE doctors SET actif = 0 WHERE id = $1', [params.id]);
  return NextResponse.json({ success: true });
}