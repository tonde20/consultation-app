import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbGet, dbRun } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const certId = parseInt(params.id);
  if (!certId) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

  await initDb();

  const cert = await dbGet('SELECT id, montant FROM certificats WHERE id = $1', [certId]);
  if (!cert) return NextResponse.json({ error: 'Certificat introuvable' }, { status: 404 });

  // Supprimer le paiement associé s'il existe
  await dbRun(
    "DELETE FROM paiements WHERE type = 'certificat' AND reference_id = $1",
    [certId]
  );

  // Supprimer le certificat
  await dbRun('DELETE FROM certificats WHERE id = $1', [certId]);

  return NextResponse.json({ success: true });
}
