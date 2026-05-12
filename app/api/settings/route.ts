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
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  const data = await req.json();
  await initDb();
  for (const [key, value] of Object.entries(data)) {
    await dbRun(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      [key, String(value)]
    );
  }
  return NextResponse.json({ success: true });
}