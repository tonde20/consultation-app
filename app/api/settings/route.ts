import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbAll, dbRun } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  await initDb();
  const rows = await dbAll('SELECT key, value FROM settings') as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  rows.forEach(r => { settings[r.key] = r.value; });
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  // Lecture session via next/headers
  let session = getSession();

  // Secours : lecture directe depuis le cookie de la requête
  if (!session) {
    const cookie = req.cookies.get('session');
    if (cookie) {
      try {
        session = JSON.parse(Buffer.from(cookie.value, 'base64').toString('utf-8'));
      } catch {}
    }
  }

  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé — veuillez vous reconnecter' }, { status: 403 });
  }

  try {
    const data = await req.json();
    await initDb();
    for (const [key, value] of Object.entries(data)) {
      // EXCLUDED.value est plus fiable que $2 répété en PostgreSQL
      await dbRun(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, String(value)]
      );
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erreur base de données' }, { status: 500 });
  }
}
