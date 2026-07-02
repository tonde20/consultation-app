import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbRun } from '@/lib/db';
import { getSession } from '@/lib/auth';

// PUT — marquer une notification comme lue
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session || session.role !== 'medecin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  await initDb();
  await dbRun(
    'UPDATE notifications SET lu = true WHERE id = $1 AND doctor_id = $2',
    [params.id, session.id]
  );

  return NextResponse.json({ success: true });
}
