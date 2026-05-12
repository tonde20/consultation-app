import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbGet, dbRun } from '@/lib/db';
import { getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { currentPassword, newPassword } = await req.json();
  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: 'Champs requis' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' }, { status: 400 });
  }

  await initDb();
  const admin = await dbGet('SELECT * FROM admins WHERE id = $1', [session.id]);
  if (!admin || !bcrypt.compareSync(currentPassword, admin.password)) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 401 });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  await dbRun('UPDATE admins SET password = $1 WHERE id = $2', [hashed, session.id]);

  return NextResponse.json({ success: true });
}