import { useEffect, useRef, useState } from "react";
import { BellRing, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/toast";
import { fireAlert, ensureNotificationPermission, primeAlertAudio, playLoudRing } from "@/lib/alerts";
import { formatBRL } from "@/lib/currency";

/**
 * Global listener: loud ringing alert + phone-screen notification for
 * support replies, and credit/debit alerts. Purely additive — no backend change.
 */
export function AlertListener() {
  const toast = useToast();
  const [askPermission, setAskPermission] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    primeAlertAudio();
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      setAskPermission(true);
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let channels: ReturnType<typeof supabase.channel>[] = [];
    let cancelled = false;

    (async () => {
      const { data: s } = await supabase.auth.getUser();
      const uid = s.user?.id;
      if (!uid || cancelled) return;

      const support = supabase
        .channel(`alerts-support-${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${uid}` },
          (payload) => {
            const row = payload.new as { id: string; from_admin: boolean; body: string | null };
            if (!row?.from_admin) return;
            const body = (row.body ?? "Nova resposta do suporte").slice(0, 140);
            fireAlert({ id: `support-${row.id}`, body: `Suporte: ${body}`, url: "/support" }).then((fired) => {
              if (fired) toast.push("info", "Nova resposta do suporte");
            });
          },
        )
        .subscribe();

      const notif = supabase
        .channel(`alerts-notifications-${uid}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
          (payload) => {
            const row = payload.new as { id: string; title: string; body: string | null };
            fireAlert({
              id: `notif-${row.id}`,
              body: row.body ? `${row.title} — ${row.body}` : row.title,
              url: "/notifications",
            }).then((fired) => {
              if (fired) toast.push("info", row.title);
            });
          },
        )
        .subscribe();

      const tx = supabase
        .channel(`alerts-tx-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${uid}` },
          (payload) => {
            const row = payload.new as
              | { id: string; direction: string; amount: number; status: string; description: string | null }
              | undefined;
            if (!row || row.status !== "completed") return;
            const credited = row.direction === "in";
            const body = `${credited ? "Crédito" : "Débito"} de ${formatBRL(Number(row.amount))}${
              row.description ? ` — ${row.description}` : ""
            }`;
            fireAlert({ id: `tx-${row.id}-${row.status}`, body, url: `/receipt/${row.id}` }).then((fired) => {
              if (fired) toast.push(credited ? "success" : "info", body);
            });
          },
        )
        .subscribe();

      channels = [support, notif, tx];
    })();

    return () => {
      cancelled = true;
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [toast]);

  if (!askPermission) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[900] rounded-2xl border bg-card shadow-elevated p-4 animate-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground">
          <BellRing className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">Ativar alertas Chavez Banco</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Receba aviso sonoro e na tela do celular para respostas do suporte e alertas de crédito/débito.
          </p>
          <button
            onClick={async () => {
              const ok = await ensureNotificationPermission();
              setAskPermission(false);
              if (ok) {
                playLoudRing(1);
                toast.push("success", "Alertas ativados!");
              } else {
                toast.push("error", "Permissão de notificação recusada");
              }
            }}
            className="mt-3 w-full rounded-xl bg-gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-elevated"
          >
            Ativar alertas
          </button>
        </div>
        <button onClick={() => setAskPermission(false)} className="rounded-lg p-1 hover:bg-accent" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
