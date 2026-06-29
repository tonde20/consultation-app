import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbRun } from '@/lib/db';
import { getSession, createSessionCookie } from '@/lib/auth';

export async function PUT(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { nom } = await req.json();
  if (!nom || !nom.trim()) {
    return NextResponse.json({ error: 'Le nom est requis' }, { status: 400 });
  }

  await initDb();
  await dbRun('UPDATE admins SET nom = $1 WHERE id = $2', [nom.trim(), session.id]);

  // Mettre à jour le cookie de session pour refléter le nouveau nom immédiatement
  const updatedSession = { ...session, nom: nom.trim() };
  const response = NextResponse.json({ success: true, nom: nom.trim() });
  response.cookies.set('session', createSessionCookie(updatedSession), {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24,
    sameSite: 'lax',
  });
  return response;
}
