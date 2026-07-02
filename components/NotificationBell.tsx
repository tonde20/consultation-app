"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: number;
  type: string;
  message: string;
  rdv_id: number | null;
  created_at: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotifications(await res.json());
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAsRead = async (id: number) => {
    await fetch(`/api/notifications/${id}`, { method: "PUT" });
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClick = async (notif: Notification) => {
    await markAsRead(notif.id);
    setOpen(false);
    if (notif.rdv_id) router.push("/medecin/rendez-vous");
  };

  const count = notifications.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-700">Notifications</p>
            {count > 0 && (
              <button
                onClick={async () => {
                  await Promise.all(notifications.map(n => fetch(`/api/notifications/${n.id}`, { method: "PUT" })));
                  setNotifications([]);
                  setOpen(false);
                }}
                className="text-xs text-gray-400 hover:text-primary-600 transition-colors"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {count === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">Aucune nouvelle notification</div>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {notifications.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className="w-full text-left px-4 py-3 hover:bg-primary-50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${notif.type === 'admin_message' ? 'bg-orange-400' : 'bg-primary-500'}`} />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 leading-snug">{notif.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(notif.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
