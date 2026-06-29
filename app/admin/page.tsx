import { initDb, dbGet, dbAll } from "@/lib/db";
import { getSession } from "@/lib/auth";
import PatientsChart from "./components/PatientsChart";

function StatCard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle?: string; color: string }) {
  return (
    <div className="stat-card">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${color} leading-none`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function formatMonthLabel(yyyymm: string) {
  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const [year, month] = yyyymm.split("-");
  return `${months[parseInt(month) - 1]} ${year}`;
}

export default async function AdminDashboard() {
  const session = getSession();
  await initDb();
  const today = new Date().toISOString().split("T")[0];
  const currentMonth = new Date().toISOString().slice(0, 7);

  const totalPatients = (await dbGet("SELECT COUNT(*) as c FROM patients")).c;
  const totalDoctors = (await dbGet("SELECT COUNT(*) as c FROM doctors WHERE actif = 1")).c;
  const consultationsToday = (await dbGet("SELECT COUNT(*) as c FROM consultations WHERE date::date = $1", [today])).c;
  const recettesToday = (await dbGet("SELECT COALESCE(SUM(montant), 0) as total FROM paiements WHERE date::date = $1", [today])).total;
  const rdvEnAttente = (await dbGet("SELECT COUNT(*) as c FROM rendez_vous WHERE statut = 'en_attente'")).c;
  const recetteMois = (await dbGet("SELECT COALESCE(SUM(montant), 0) as total FROM paiements WHERE TO_CHAR(date::timestamp, 'YYYY-MM') = $1", [currentMonth])).total;
  const consultationsMois = (await dbGet("SELECT COUNT(*) as c FROM consultations WHERE TO_CHAR(date::timestamp, 'YYYY-MM') = $1", [currentMonth])).c;

  const recentConsultations = await dbAll(`
    SELECT c.date, p.nom as patient_nom, p.prenom as patient_prenom, p.code as patient_code,
           d.nom as doctor_nom, d.prenom as doctor_prenom
    FROM consultations c
    JOIN patients p ON c.patient_id = p.id
    JOIN doctors d ON c.doctor_id = d.id
    ORDER BY c.date DESC LIMIT 8
  `) as any[];

  // ── Données du graphique : répartition par médecin × mois (6 derniers mois) ──
  const chartRaw = await dbAll(`
    SELECT
      d.prenom || ' ' || SUBSTRING(d.nom FROM 1 FOR 1) || '.' as doctor_name,
      TO_CHAR(c.date::timestamp, 'YYYY-MM') as month,
      COUNT(DISTINCT c.patient_id) as patient_count
    FROM consultations c
    JOIN doctors d ON c.doctor_id = d.id
    WHERE c.date::timestamp >= NOW() - INTERVAL '6 months'
    GROUP BY d.id, d.prenom, d.nom, TO_CHAR(c.date::timestamp, 'YYYY-MM')
    ORDER BY month ASC, d.nom ASC
  `) as any[];

  const allMonths = Array.from(new Set(chartRaw.map((r: any) => r.month as string))).sort();
  const allDoctors = Array.from(new Set(chartRaw.map((r: any) => r.doctor_name as string)));

  const chartData: Array<{ month: string; [key: string]: string | number }> = allMonths.map(m => {
    const entry: { month: string; [key: string]: string | number } = { month: formatMonthLabel(m) };
    for (const doc of allDoctors) {
      const row = chartRaw.find((r: any) => r.month === m && r.doctor_name === doc);
      entry[doc] = row ? parseInt(row.patient_count) : 0;
    }
    return entry;
  });

  // Stats par médecin ce mois
  const doctorStatsMois = await dbAll(`
    SELECT
      d.prenom || ' ' || d.nom as doctor_name,
      COUNT(DISTINCT c.patient_id) as patient_count,
      COUNT(c.id) as consult_count
    FROM doctors d
    LEFT JOIN consultations c ON c.doctor_id = d.id
      AND TO_CHAR(c.date::timestamp, 'YYYY-MM') = $1
    WHERE d.actif = 1
    GROUP BY d.id, d.prenom, d.nom
    ORDER BY patient_count DESC
  `, [currentMonth]) as any[];

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Tableau de bord</p>
        {session?.nom ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              {session.nom.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 leading-tight">{session.nom}</h1>
              <p className="text-xs text-teal-600 font-medium">Administrateur — {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Tableau de bord</h1>
            <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de l'activité — {new Date().toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
        )}
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="Consultations aujourd'hui" value={consultationsToday} color="text-primary-600" />
        <StatCard title="Consultations ce mois" value={consultationsMois} color="text-primary-700" />
        <StatCard title="Recettes du jour" value={`${Number(recettesToday).toLocaleString()} FCFA`} color="text-teal-600" />
        <StatCard title="Recettes du mois" value={`${Number(recetteMois).toLocaleString()} FCFA`} color="text-teal-700" />
        <StatCard title="Total patients" value={totalPatients} subtitle="enregistrés" color="text-blue-600" />
        <StatCard title="Médecins actifs" value={totalDoctors} color="text-primary-600" />
      </div>

      {/* RDV en attente bannière */}
      {rdvEnAttente > 0 && (
        <div className="mb-6 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
          <span className="text-yellow-500 text-xl">📅</span>
          <span className="text-yellow-800 text-sm font-medium">
            <strong>{rdvEnAttente}</strong> rendez-vous en attente de confirmation
          </span>
        </div>
      )}

      {/* Graphique répartition patients par médecin × mois */}
      <div className="card mb-8">
        <h2 className="font-semibold text-gray-700 mb-1 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary-500 rounded-full inline-block" />
          Répartition des patients par médecin
        </h2>
        <p className="text-xs text-gray-400 mb-6">Patients distincts consultés — mois en cours et tendance 6 mois</p>
        <PatientsChart
          currentMonthData={doctorStatsMois
            .filter((d: any) => parseInt(d.patient_count) > 0)
            .map((d: any, i: number) => ({
              name: `Dr. ${(d.doctor_name as string).split(" ")[0]} ${(d.doctor_name as string).split(" ").slice(1).join(" ").charAt(0)}.`,
              patients: parseInt(d.patient_count) || 0,
            }))}
          currentMonth={formatMonthLabel(currentMonth)}
          chartData={chartData}
          doctors={allDoctors}
        />
      </div>

      {/* Activité des médecins ce mois */}
      <div className="card mb-8">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-teal-500 rounded-full inline-block" />
          Activité des médecins — {formatMonthLabel(currentMonth)}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Médecin</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Patients</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Consultations</th>
                <th className="py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wide">Activité</th>
              </tr>
            </thead>
            <tbody>
              {doctorStatsMois.map((d: any, i: number) => {
                const maxCount = Math.max(...doctorStatsMois.map((x: any) => parseInt(x.patient_count) || 0), 1);
                const pct = Math.round((parseInt(d.patient_count) || 0) / maxCount * 100);
                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-primary-50/30 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">Dr. {d.doctor_name}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold ${parseInt(d.patient_count) > 0 ? "text-primary-600" : "text-gray-300"}`}>
                        {d.patient_count || 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500">{d.consult_count || 0}</td>
                    <td className="py-3 px-4 min-w-[120px]">
                      <div className="bg-gray-100 rounded-full h-1.5 w-full">
                        <div
                          className="bg-primary-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consultations récentes */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-blue-400 rounded-full inline-block" />
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
