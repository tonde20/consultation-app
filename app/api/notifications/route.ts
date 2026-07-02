import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbAll, dbGet, dbRun } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET — notifications non lues du médecin connecté
export async function GET() {
  const session = getSession();
  if (!session || session.role !== 'medecin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  await initDb();
  const notifications = await dbAll(`
    SELECT n.*, rv.date_heure, p.nom as patient_nom, p.prenom as patient_prenom
    FROM notifications n
    LEFT JOIN rendez_vous rv ON n.rdv_id = rv.id
    LEFT JOIN patients p ON rv.patient_id = p.id
    WHERE n.doctor_id = $1 AND n.lu = false
    ORDER BY n.created_at DESC
    LIMIT 20
  `, [session.id]);

  return NextResponse.json(notifications);
}

// POST — admin envoie une notification à un médecin
export async function POST(req: NextRequest) {
  const session = getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const { doctor_id, message, rdv_id } = await req.json();
  if (!doctor_id || !message) {
    return NextResponse.json({ error: 'Médecin et message requis' }, { status: 400 });
  }

  await initDb();

  // Une notification liée à un rendez-vous n'est autorisée que si celui-ci est
  // encore « en attente » (inutile de notifier un RDV confirmé/annulé/effectué).
  if (rdv_id) {
    const rdv = await dbGet('SELECT statut FROM rendez_vous WHERE id = $1', [rdv_id]);
    if (!rdv) {
      return NextResponse.json({ error: 'Rendez-vous introuvable' }, { status: 404 });
    }
    if (rdv.statut !== 'en_attente') {
      return NextResponse.json(
        { error: 'Ce rendez-vous n\'est plus en attente : notification inutile.' },
        { status: 409 }
      );
    }
  }

  const result = await dbGet(`
    INSERT INTO notifications (doctor_id, type, message, rdv_id)
    VALUES ($1, 'admin_message', $2, $3)
    RETURNING id
  `, [doctor_id, message, rdv_id || null]);

  return NextResponse.json({ id: result.id, success: true });
}
