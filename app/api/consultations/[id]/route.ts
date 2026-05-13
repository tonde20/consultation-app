import { NextRequest, NextResponse } from 'next/server';
import { initDb, dbGet, dbRun } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session || session.role !== 'medecin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const consultId = parseInt(params.id);
  if (!consultId) return NextResponse.json({ error: 'ID invalide' }, { status: 400 });

  await initDb();

  const { date_sortie, resultat_examen_id, resultat } = await req.json();

  // Mise à jour d'un résultat d'examen
  if (resultat_examen_id !== undefined) {
    await dbRun('UPDATE examens SET resultat = $1 WHERE id = $2', [resultat || null, resultat_examen_id]);
    return NextResponse.json({ success: true });
  }

  // Enregistrement de la sortie d'hospitalisation
  if (!date_sortie) return NextResponse.json({ error: 'Date de sortie requise' }, { status: 400 });

  const consult = await dbGet(
    'SELECT patient_id, date, type_prise_en_charge, date_sortie FROM consultations WHERE id = $1',
    [consultId]
  ) as { patient_id: number; date: string; type_prise_en_charge: string; date_sortie: string | null } | null;

  if (!consult) return NextResponse.json({ error: 'Consultation non trouvée' }, { status: 404 });
  if (consult.type_prise_en_charge !== 'hospitalisation') {
    return NextResponse.json({ error: "Cette consultation n'est pas une hospitalisation" }, { status: 400 });
  }
  if (consult.date_sortie) {
    return NextResponse.json({ error: 'La sortie a déjà été enregistrée' }, { status: 409 });
  }

  const dateEntree = new Date(consult.date.split('T')[0]);
  const dateSortieObj = new Date(date_sortie);
  const diffMs = dateSortieObj.getTime() - dateEntree.getTime();
  const jours = Math.max(1, Math.ceil(diffMs / 86400000));
  const frais_hospitalisation = jours * 1000 + 500;

  await dbRun(
    'UPDATE consultations SET date_sortie = $1, frais_hospitalisation = $2 WHERE id = $3',
    [date_sortie, frais_hospitalisation, consultId]
  );

  await dbRun(
    'INSERT INTO paiements (patient_id, type, reference_id, montant, notes) VALUES ($1, $2, $3, $4, $5)',
    [consult.patient_id, 'hospitalisation', consultId, frais_hospitalisation, `${jours} jour(s) + forfait soins`]
  );

  return NextResponse.json({ success: true, frais_hospitalisation, jours, genererCertificat: true });
}

// Mise à jour d'un résultat d'examen depuis le dossier
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = getSession();
  if (!session || session.role !== 'medecin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }
  await initDb();
  const { examen_id, resultat } = await req.json();
  if (!examen_id) return NextResponse.json({ error: 'ID examen requis' }, { status: 400 });
  await dbRun('UPDATE examens SET resultat = $1 WHERE id = $2', [resultat || null, examen_id]);
  return NextResponse.json({ success: true });
}
