import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, X, ArrowDownLeft, ArrowUpRight, MessageSquare, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import {
  fireAlert,
  ensureNotificationPermission,
  primeAlertAudio,
  playAlertSound,
  clearAlertCache,
  notificationPromptDismissed,
  dismissNotificationPrompt,
} from "@/lib/alerts";
import { formatBRL } from "@/lib/currency";

type AlertKind = "credit" | "debit" | "support" | "info";

type InAppAlert = {
  id: string;
  kind: AlertKind;
  title: string;
  message: string;
  amount?: number;
  cta: string;
  url: string;
};

const log = (channel: string, status: string) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(`Chavez Realtime ${channel}: ${status}`);
  }
};

export function AlertListener() {
  const [askPermission, setAskPermission] = useState(false);
  const [alerts, setAlerts] = useState<InAppAlert[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  const push = useCallback((a: InAppAlert) => {
    setAlerts((prev) => (prev.some((p) => p.id === a.id) ? prev : [a, ...prev].slice(0, 3)));
    window.setTimeout(() => {
      setAlerts((prev) => prev.filter((p) => p.id !== a.id));
    }, 9000);
  }, []);

  // Prime audio once; ask for permission only after user interaction.
  useEffect(() => {
    primeAlertAudio();
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default" &&
      !notificationPromptDismissed()
    ) {
      const show = () => setAskPermission(true);
      window.addEventListener("pointerdown", show, { once: true });
      window.addEventListener("keydown", show, { once: true });
      return () => {
        window.removeEventListener("pointerdown", show);
        window.removeEventListener("keydown", show);
      };
    }
  }, []);

  // Track the authenticated user; re-subscribe on login, tear down on logout.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUid(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      const next = session?.user?.id ?? null;
      setUid((prev) => {
        if (prev !== next) {
          clearAlertCache();
          setAlerts([]);
        }
        return next;
      });
      if (event === "SIGNED_OUT") {
        clearAlertCache();
        setAlerts([]);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!uid) return;

    const notifChannel = supabase
      .channel(`chavez-notifications-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as { id: string; title: string; body: string | null };
          if (!row?.id) return;
          const alert: InAppAlert = {
            id: `notif-${row.id}`,
            kind: "info",
            title: row.title,
            message: row.body ?? "Você tem uma nova notificação.",
            cta: "Ver detalhes",
            url: "/notifications",
          };
          fireAlert({ id: alert.id, body: `${alert.title} — ${alert.message}`, url: alert.url }).then(
            (fired) => {
              if (fired) push(alert);
            },
          );
        },
      )
      .subscribe((status) => log("notifications", status));

    const supportChannel = supabase
      .channel(`chavez-support-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = payload.new as { id: string; from_admin: boolean; body: string | null };
          if (!row?.from_admin) return;
          const alert: InAppAlert = {
            id: `support-${row.id}`,
            kind: "support",
            title: "Nova mensagem do suporte",
            message: (row.body ?? "Você recebeu uma nova resposta.").slice(0, 140),
            cta: "Ver mensagem",
            url: "/support",
          };
          fireAlert({ id: alert.id, body: `${alert.title} — ${alert.message}`, url: alert.url }).then(
            (fired) => {
              if (fired) push(alert);
            },
          );
        },
      )
      .subscribe((status) => log("support", status));

    const handleTx = (payload: { new: unknown }) => {
      const row = payload.new as {
        id: string;
        user_id: string;
        direction: string;
        amount: number | string;
        status: string;
        description: string | null;
      } | null;
      if (!row?.id || row.user_id !== uid) return;
      if (row.status !== "completed") return;

      const amount = Number(row.amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) return;

      const isCredit = row.direction === "in" || row.direction === "credit";
      const money = formatBRL(amount);
      const desc = row.description?.trim();

      const alert: InAppAlert = {
        id: `tx-${row.id}-completed`,
        kind: isCredit ? "credit" : "debit",
        title: isCredit ? "Crédito recebido" : "Débito realizado",
        message: isCredit
          ? `Você recebeu ${money}${desc ? ` • ${desc}` : ""}`
          : `Foi debitado ${money}${desc ? ` • ${desc}` : ""}`,
        amount,
        cta: "Ver detalhes",
        url: `/receipt/${row.id}`,
      };

      fireAlert({ id: alert.id, body: `${alert.title} — ${alert.message}`, url: alert.url }).then(
        (fired) => {
          if (fired) push(alert);
        },
      );
    };

    const txChannel = supabase
      .channel(`chavez-transactions-${uid}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${uid}` },
        handleTx,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions", filter: `user_id=eq.${uid}` },
        handleTx,
      )
      .subscribe((status) => log("transactions", status));

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(supportChannel);
      supabase.removeChannel(txChannel);
    };
  }, [uid, push]);

  function open(url: string, id: string) {
    setAlerts((prev) => prev.filter((p) => p.id !== id));
    window.location.href = url;
  }

  return (
    <>
      {/* In-app banking notifications */}
      <div className="fixed top-3 left-3 right-3 md:left-auto md:right-4 md:max-w-sm z-[1000] flex flex-col gap-2 pointer-events-none">
        {alerts.map((a) => (
          <div
            key={a.id}
            role="button"
            tabIndex={0}
            onClick={() => open(a.url, a.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") open(a.url, a.id);
            }}
            className="pointer-events-auto cursor-pointer overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-muted/40 px-4 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <BellRing className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="scale-90 origin-left">
                  <Logo />
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar"
                onClick={(e) => {
                  e.stopPropagation();
                  setAlerts((prev) => prev.filter((p) => p.id !== a.id));
                }}
                className="grid h-7 w-7 place-items-center rounded-full hover:bg-accent shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-start gap-3 p-4">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                  a.kind === "credit"
                    ? "bg-success/15 text-success"
                    : a.kind === "debit"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/10 text-primary"
                }`}
              >
                {a.kind === "credit" ? (
                  <ArrowDownLeft className="h-5 w-5" />
                ) : a.kind === "debit" ? (
                  <ArrowUpRight className="h-5 w-5" />
                ) : a.kind === "support" ? (
                  <MessageSquare className="h-5 w-5" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-foreground">{a.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{a.message}</div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Agora
                  </span>
                  <span className="text-[11px] font-bold text-primary">{a.cta} →</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Permission prompt */}
      {askPermission && (
        <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[900] rounded-2xl border bg-card shadow-elevated p-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-foreground">Ativar notificações</div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Receba alertas de créditos, débitos e mensagens do suporte diretamente no Chavez Banco.
              </p>
              <button
                type="button"
                onClick={async () => {
                  const ok = await ensureNotificationPermission();
                  setAskPermission(false);
                  dismissNotificationPrompt();
                  if (ok) playAlertSound();
                }}
                className="mt-3 w-full rounded-xl bg-gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-elevated"
              >
                Ativar notificações
              </button>
            </div>
            <button
              type="button"
              aria-label="Fechar"
              onClick={() => {
                setAskPermission(false);
                dismissNotificationPrompt();
              }}
              className="rounded-lg p-1 hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
