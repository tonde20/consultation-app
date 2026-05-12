import { cookies } from 'next/headers';
import { initDb, dbGet } from './db';
import bcrypt from 'bcryptjs';

export type UserRole = 'admin' | 'medecin' | 'patient';

export interface SessionUser {
  id: number;
  role: UserRole;
  nom: string;
  username?: string;
  code?: string;
}

export function getSession(): SessionUser | null {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session');
  if (!sessionCookie) return null;
  try {
    return JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

export function createSessionCookie(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

export async function loginUser(
  role: UserRole,
  identifier: string,
  password: string
): Promise<SessionUser | null> {
  await initDb();

  if (role === 'admin') {
    const admin = await dbGet('SELECT * FROM admins WHERE username = $1', [identifier]);
    if (!admin || !bcrypt.compareSync(password, admin.password)) return null;
    return { id: admin.id, role: 'admin', nom: admin.nom, username: admin.username };
  }

  if (role === 'medecin') {
    const doc = await dbGet('SELECT * FROM doctors WHERE username = $1 AND actif = 1', [identifier]);
    if (!doc || !bcrypt.compareSync(password, doc.password)) return null;
    return { id: doc.id, role: 'medecin', nom: `Dr. ${doc.prenom} ${doc.nom}`, username: doc.username };
  }

  if (role === 'patient') {
    const patient = await dbGet('SELECT * FROM patients WHERE code = $1', [identifier]);
    if (!patient || !bcrypt.compareSync(password, patient.password)) return null;
    return { id: patient.id, role: 'patient', nom: `${patient.prenom} ${patient.nom}`, code: patient.code };
  }

  return null;
}