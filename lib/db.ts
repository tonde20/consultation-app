import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);

export { sql };

// Helpers pour simplifier les appels
export async function dbGet(query: string, params: any[] = []) {
  const result = await sql.query(query, params);
  return result[0] || null;
}

export async function dbAll(query: string, params: any[] = []) {
  return await sql.query(query, params);
}

export async function dbRun(query: string, params: any[] = []) {
  return await sql.query(query, params);
}

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nom TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS doctors (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      telephone TEXT NOT NULL,
      specialite TEXT DEFAULT 'Médecin généraliste',
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      actif INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS patients (
      id SERIAL PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      nom TEXT NOT NULL,
      prenom TEXT NOT NULL,
      date_naissance TEXT,
      sexe TEXT DEFAULT 'M',
      telephone TEXT,
      adresse TEXT,
      password TEXT NOT NULL,
      decede INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS consultations (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      doctor_id INTEGER NOT NULL REFERENCES doctors(id),
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      motif TEXT,
      diagnostic TEXT,
      notes TEXT,
      tension TEXT,
      temperature TEXT,
      poids TEXT,
      taille TEXT,
      valide_jusqu TEXT,
      montant INTEGER DEFAULT 1250,
      type_prise_en_charge TEXT DEFAULT 'ambulatoire',
      service_hospitalisation TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id SERIAL PRIMARY KEY,
      consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
      medicament TEXT NOT NULL,
      posologie TEXT,
      duree TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS examens (
      id SERIAL PRIMARY KEY,
      consultation_id INTEGER NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
      type_examen TEXT NOT NULL,
      description TEXT,
      resultat TEXT
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS rendez_vous (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      doctor_id INTEGER NOT NULL REFERENCES doctors(id),
      date_heure TEXT NOT NULL,
      motif TEXT,
      statut TEXT DEFAULT 'en_attente',
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS certificats (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      doctor_id INTEGER NOT NULL REFERENCES doctors(id),
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      type TEXT NOT NULL DEFAULT 'Medical',
      contenu TEXT,
      montant INTEGER DEFAULT 2000
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS paiements (
      id SERIAL PRIMARY KEY,
      patient_id INTEGER REFERENCES patients(id),
      type TEXT NOT NULL,
      reference_id INTEGER,
      montant INTEGER NOT NULL,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    )
  `;

  await seedData();
}

async function seedData() {
  const setting = await dbGet('SELECT value FROM settings WHERE key = $1', ['etablissement_nom']);
  if (setting) return;

  await sql`INSERT INTO settings (key, value) VALUES ('etablissement_nom', 'CMA de Boromo') ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO settings (key, value) VALUES ('consultation_frais', '1250') ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO settings (key, value) VALUES ('certificat_frais', '2000') ON CONFLICT DO NOTHING`;
  await sql`INSERT INTO settings (key, value) VALUES ('consultation_validite_jours', '10') ON CONFLICT DO NOTHING`;

  const adminPwd = bcrypt.hashSync('admin123', 10);
  await sql`INSERT INTO admins (username, password, nom) VALUES ('admin', ${adminPwd}, 'Administrateur') ON CONFLICT DO NOTHING`;

  const prenoms = ['Moussa','Fatimata','Ibrahim','Aminata','Boureima','Rasmata','Oumarou','Salimata','Adama','Mariam','Seydou','Halimatou'];
  const noms = ['OUEDRAOGO','SAWADOGO','COULIBALY','TRAORE','ZONGO','KABORE','SOME','DIALLO','SANKARA','BARRY','COMPAORÉ','GUIRA'];

  for (let i = 1; i <= 12; i++) {
    const username = `medecin${i}`;
    const pwd = bcrypt.hashSync(`medecin${i}123`, 10);
    const phone = `0${74000000 + (i - 1)}`;
    await sql`
      INSERT INTO doctors (nom, prenom, telephone, specialite, username, password)
      VALUES (${noms[i-1]}, ${prenoms[i-1]}, ${phone}, 'Médecin généraliste', ${username}, ${pwd})
      ON CONFLICT DO NOTHING
    `;
  }

  const patientPwd = bcrypt.hashSync('patient123', 10);
  await sql`
    INSERT INTO patients (code, nom, prenom, date_naissance, sexe, telephone, adresse, password)
    VALUES ('PAT-000001', 'KABORÉ', 'Alassane', '1985-03-15', 'M', '70123456', 'Boromo centre', ${patientPwd})
    ON CONFLICT DO NOTHING
  `;
}

export async function generatePatientCode(): Promise<string> {
  const last = await dbGet('SELECT code FROM patients ORDER BY id DESC LIMIT 1');
  if (!last) return 'PAT-000001';
  const num = parseInt(last.code.split('-')[1]) + 1;
  return `PAT-${String(num).padStart(6, '0')}`;
}