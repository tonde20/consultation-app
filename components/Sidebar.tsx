"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  items: NavItem[];
  role: string;
  userName: string;
  etablissement: string;
}

export default function Sidebar({ items, role, userName, etablissement }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  const roleLabel = role === "admin" ? "Administrateur" : role === "medecin" ? "Médecin" : "Patient";
  const roleAccent =
    role === "admin"   ? { bg: "bg-teal-600",    ring: "ring-teal-200",    text: "text-teal-700",    light: "bg-teal-50"    } :
    role === "medecin" ? { bg: "bg-primary-600",  ring: "ring-primary-200", text: "text-primary-700", light: "bg-primary-50" } :
                         { bg: "bg-sky-600",      ring: "ring-sky-200",     text: "text-sky-700",     light: "bg-sky-50"     };

  return (
    <aside className="w-72 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0" style={{ boxShadow: "1px 0 8px 0 rgba(0,0,0,0.04)" }}>
      {/* Logo / Établissement */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 ${roleAccent.bg} rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-sm leading-tight">{etablissement}</p>
            <p className="text-xs text-gray-400 mt-0.5">Gestion médicale</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? `${roleAccent.light} ${roleAccent.text} shadow-sm`
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <span className={`flex-shrink-0 ${isActive ? roleAccent.text : "text-gray-400"}`}>
                {item.icon}
              </span>
              {item.label}
              {isActive && (
                <span className={`ml-auto w-1.5 h-1.5 rounded-full ${roleAccent.bg}`} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${roleAccent.light} mb-2`}>
          <div className={`w-8 h-8 ${roleAccent.bg} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
            <span className="text-white text-xs font-bold">
              {userName.replace(/^Dr\.?\s*/i, "").trim().split(/\s+/).map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-700 truncate leading-tight">{userName}</p>
            <p className={`text-xs ${roleAccent.text} font-medium`}>{roleLabel}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 text-sm text-gray-400 hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
