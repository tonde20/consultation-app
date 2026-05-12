import { initDb, dbGet, dbAll } from "@/lib/db";
import { getSession } from "@/lib/auth";

function StatCard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color: string }) {
  return (
    <div className="stat-card">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${color} leading-none`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export default async function AdminDashboard() {
  await initDb();
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = new Date().toISOString().slice(0, 7);

  const totalPatients = (await dbGet("SELECT COUNT(*) as c FROM patients")).c;
  const totalDoctors = (await dbGet("SELECT COUNT(*) as c FROM doctors WHERE actif = 1")).c;
  const consultationsToday = (await dbGet("SELECT COUNT(*) as c FROM consultations WHERE date::date = $1", [today])).c;
  const recettesToday = (await dbGet("SELECT COALESCE(SUM(montant), 0) as total FROM paiements WHERE date::date = $1", [today])).total;
  const rdvEnAttente = (await dbGet("SELECT COUNT(*) as c FROM rendez_vous WHERE statut = 'en_attente'")).c;
  const recetteMois = (await dbGet("SELECT COALESCE(SUM(montant), 0) as total FROM paiements WHERE TO_CHAR(date::timestamp, 'YYYY-MM') = $1", [currentMonth])).total;

  const recentConsultations = await dbAll(`
    SELECT c.date, p.nom as patient_nom, p.prenom as patient_prenom, p.code as patient_code,
           d.nom as doctor_nom, d.prenom as doctor_prenom
    FROM consultations c
    JOIN patients p ON c.patient_id = p.id
    JOIN doctors d ON c.doctor_id = d.id
    ORDER BY c.date DESC LIMIT 8
  `) as any[];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de l'activité — {new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="Consultations aujourd'hui" value={consultationsToday} color="text-primary-600" />
        <StatCard title="Recettes du jour" value={`${Number(recettesToday).toLocaleString()} FCFA`} color="text-teal-600" />
        <StatCard title="Recettes du mois" value={`${Number(recetteMois).toLocaleString()} FCFA`} color="text-primary-700" />
        <StatCard title="Total patients" value={totalPatients} subtitle="enregistrés" color="text-blue-600" />
        <StatCard title="Médecins actifs" value={totalDoctors} color="text-primary-600" />
        <StatCard title="RDV en attente" value={rdvEnAttente} color="text-yellow-600" />
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary-500 rounded-full inline-block" />
          Consultations récentes
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Patient</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Code</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Médecin</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentConsultations.map((c: any, i: number) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-primary-50/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-800">{c.patient_prenom} {c.patient_nom}</td>
                  <td className="py-3 px-4 font-mono text-xs text-primary-700 bg-primary-50/50 rounded">{c.patient_code}</td>
                  <td className="py-3 px-4 text-gray-600">Dr. {c.doctor_prenom} {c.doctor_nom}</td>
                  <td className="py-3 px-4 text-gray-400 text-xs">{new Date(c.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</td>
                </tr>
              ))}
              {recentConsultations.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-gray-400">Aucune consultation enregistrée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}