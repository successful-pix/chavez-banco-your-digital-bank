import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notificações — Chavez Banco" },
      { name: "description", content: "Central de notificações da sua conta Chavez Banco." },
    ],
  }),
  component: NotificationsPage,
});

type Notif = { id: string; title: string; body: string | null; read: boolean; created_at: string };

function NotificationsPage() {
  const [items, setItems] = useState<Notif[]>([]);

  async function load() {
    const { data: s } = await supabase.auth.getUser();
    if (!s.user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", s.user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setItems(data as unknown as Notif[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function markAll() {
    const { data: s } = await supabase.auth.getUser();
    if (!s.user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", s.user.id).eq("read", false);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Notificações</h1>
        <button
          onClick={markAll}
          className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-accent"
        >
          <CheckCheck className="h-4 w-4" /> Marcar todas
        </button>
      </div>

      <div className="rounded-2xl border bg-card shadow-card divide-y">
        {items.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">Sem notificações.</p>
        ) : (
          items.map((n) => (
            <div key={n.id} className="flex items-start gap-3 px-5 py-4">
              <div className={`mt-0.5 h-8 w-8 rounded-xl grid place-items-center ${n.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</div>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
