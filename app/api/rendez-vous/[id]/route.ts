import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbRun } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session || session.role === 'patient') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const { statut, notes } = await req.json();
  await initDb();
  await dbRun('UPDATE rendez_vous SET statut = $1, notes = $2 WHERE id = $3', [statut, notes || null, params.id]);
  return NextResponse.json({ success: true });
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  await initDb();
  await dbRun('DELETE FROM rendez_vous WHERE id = $1', [params.id]);
  return NextResponse.json({ success: true });
}