import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { initDb, dbAll } from "@/lib/db";
import PatientSidebarWrapper from "./PatientSidebarWrapper";

export default async function PatientLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (!session || session.role !== "patient") redirect("/login");

  await initDb();
  const settings = await dbAll("SELECT key, value FROM settings") as { key: string; value: string }[];
  const settingsMap: Record<string, string> = {};
  settings.forEach(s => { settingsMap[s.key] = s.value; });
  const etablissement = settingsMap.etablissement_nom || "CMA de Boromo";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <PatientSidebarWrapper userName={session.nom} etablissement={etablissement} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}