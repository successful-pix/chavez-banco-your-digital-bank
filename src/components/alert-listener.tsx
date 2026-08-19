import { useEffect, useRef, useState } from "react";
import { BellRing, X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/toast";
import {
  fireAlert,
  ensureNotificationPermission,
  primeAlertAudio,
  playLoudRing,
} from "@/lib/alerts";
import { formatBRL } from "@/lib/currency";

type InAppAlert = {
  id: string;
  transactionId: string;
  type: "credit" | "debit";
  title: string;
  senderName: string;
  amount: number;
  body: string;
  url: string;
};

export function AlertListener() {
  const toast = useToast();

  const [askPermission, setAskPermission] = useState(false);
  const [inAppAlert, setInAppAlert] =
    useState<InAppAlert | null>(null);

  const started = useRef(false);

  /*
   * Prepare audio and notification permission.
   */
  useEffect(() => {
    primeAlertAudio();

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      setAskPermission(true);
    }
  }, []);

  /*
   * Realtime alert listener.
   */
  useEffect(() => {
    if (started.current) return;

    started.current = true;

    let channels: ReturnType<typeof supabase.channel>[] = [];
    let cancelled = false;

    (async () => {
      const { data: session } =
        await supabase.auth.getUser();

      const uid = session.user?.id;

      if (!uid || cancelled) return;

      /*
       * ---------------------------------------------------------
       * SUPPORT REPLIES
       * ---------------------------------------------------------
       */
      const support = supabase
        .channel(`alerts-support-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              from_admin: boolean;
              body: string | null;
            };

            if (!row?.from_admin) return;

            const body = (
              row.body ??
              "Nova resposta do suporte"
            ).slice(0, 140);

            fireAlert({
              id: `support-${row.id}`,
              title: "Nova mensagem do suporte",
              body: `Suporte: ${body}`,
              url: "/support",
            }).then((fired) => {
              if (fired) {
                toast.push(
                  "info",
                  "Nova resposta do suporte",
                );
              }
            });
          },
        )
        .subscribe();

      /*
       * ---------------------------------------------------------
       * GENERAL NOTIFICATIONS
       * ---------------------------------------------------------
       */
      const notif = supabase
        .channel(`alerts-notifications-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              title: string;
              body: string | null;
            };

            if (!row) return;

            fireAlert({
              id: `notif-${row.id}`,
              title: row.title,
              body: row.body
                ? `${row.title} — ${row.body}`
                : row.title,
              url: "/notifications",
            }).then((fired) => {
              if (fired) {
                toast.push(
                  "info",
                  row.title,
                );
              }
            });
          },
        )
        .subscribe();

      /*
       * ---------------------------------------------------------
       * TRANSACTIONS
       * ---------------------------------------------------------
       *
       * This uses the transaction structure from your banking app:
       *
       * from_user
       * to_user
       * from_name
       * to_name
       * amount_vnd
       * note
       * status
       * id
       */
      const tx = supabase
        .channel(`alerts-tx-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "transactions",
          },
          async (payload) => {
            const row = payload.new as {
              id: string;
              from_user: string | null;
              to_user: string | null;

              from_name: string | null;
              to_name: string | null;

              from_account: string | null;
              to_account_number: string | null;

              from_bank: string | null;

              amount_vnd: number | string;
              status: string;

              note: string | null;
              reference: string | null;
              created_at: string;
            };

            if (!row) return;

            /*
             * Only completed transactions create
             * a financial alert.
             */
            if (row.status !== "completed") {
              return;
            }

            /*
             * Only alert the currently logged-in user.
             *
             * Credit:
             *   user is the receiver.
             *
             * Debit:
             *   user is the sender.
             */
            const isCredit =
              row.to_user === uid;

            const isDebit =
              row.from_user === uid;

            if (!isCredit && !isDebit) {
              return;
            }

            const amount = Number(
              row.amount_vnd ?? 0,
            );

            if (!Number.isFinite(amount) || amount <= 0) {
              return;
            }

            /*
             * ---------------------------------------------------
             * FIND SENDER / OTHER PARTY NAME
             * ---------------------------------------------------
             *
             * IMPORTANT:
             * We intentionally do NOT display account numbers
             * as the sender name.
             */
            let senderName = "";

            if (isCredit) {
              /*
               * Incoming money:
               * sender is from_name.
               */
              senderName =
                row.from_name?.trim() || "";

              /*
               * If from_name isn't stored, look up
               * the sender's profile.
               */
              if (
                !senderName &&
                row.from_user
              ) {
                const { data: senderProfile } =
                  await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq(
                      "id",
                      row.from_user,
                    )
                    .maybeSingle();

                senderName =
                  senderProfile?.full_name?.trim() ||
                  "";
              }

              /*
               * Never fall back to an account number.
               */
              if (!senderName) {
                senderName = "Người gửi";
              }
            } else {
              /*
               * Outgoing money:
               * other party is the receiver.
               */
              senderName =
                row.to_name?.trim() || "";

              if (
                !senderName &&
                row.to_user
              ) {
                const { data: receiverProfile } =
                  await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq(
                      "id",
                      row.to_user,
                    )
                    .maybeSingle();

                senderName =
                  receiverProfile?.full_name?.trim() ||
                  "";
              }

              if (!senderName) {
                senderName = "Người nhận";
              }
            }

            /*
             * ---------------------------------------------------
             * CREATE IN-APP ALERT
             * ---------------------------------------------------
             */
            const alert: InAppAlert = {
              id: `tx-${row.id}-${row.status}`,

              transactionId: row.id,

              type: isCredit
                ? "credit"
                : "debit",

              title: isCredit
                ? "Credit Alert"
                : "Debit Alert",

              senderName,

              amount,

              body: isCredit
                ? `${senderName} đã chuyển tiền vào tài khoản của bạn`
                : `Bạn đã chuyển tiền cho ${senderName}`,

              url: `/receipt/${row.id}`,
            };

            /*
             * Show the in-app banking alert.
             */
            setInAppAlert(alert);

            /*
             * Play Chavez Banco sound.
             */
            playLoudRing(1);

            /*
             * Also show device/PWA notification.
             */
            fireAlert({
              id: alert.id,

              title: alert.title,

              body: isCredit
                ? `${senderName} • +${formatBRL(amount)}`
                : `${senderName} • -${formatBRL(amount)}`,

              url: alert.url,
            }).then(() => {
              /*
               * Keep normal toast disabled here because
               * the larger in-app alert replaces it.
               */
            });
          },
        )
        .subscribe();

      channels = [
        support,
        notif,
        tx,
      ];
    })();

    return () => {
      cancelled = true;

      channels.forEach((channel) => {
        supabase.removeChannel(channel);
      });
    };
  }, [toast]);

  /*
   * ---------------------------------------------------------
   * PERMISSION PROMPT
   * ---------------------------------------------------------
   */
  const permissionPrompt = askPermission ? (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-[900] rounded-2xl border bg-card shadow-elevated p-4 animate-in slide-in-from-bottom-2">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-primary grid place-items-center text-primary-foreground">
          <BellRing className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-foreground">
            Ativar alertas Chavez Banco
          </div>

          <p className="mt-0.5 text-xs text-muted-foreground">
            Receba avisos de crédito, débito e
            respostas do suporte.
          </p>

          <button
            type="button"
            onClick={async () => {
              const ok =
                await ensureNotificationPermission();

              setAskPermission(false);

              if (ok) {
                playLoudRing(1);

                toast.push(
                  "success",
                  "Alertas ativados!",
                );
              } else {
                toast.push(
                  "error",
                  "Permissão de notificação recusada",
                );
              }
            }}
            className="mt-3 w-full rounded-xl bg-gradient-primary py-2.5 text-xs font-bold text-primary-foreground shadow-elevated"
          >
            Ativar alertas
          </button>
        </div>

        <button
          type="button"
          onClick={() =>
            setAskPermission(false)
          }
          className="rounded-lg p-1 hover:bg-accent"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  ) : null;

  /*
   * ---------------------------------------------------------
   * IN-APP BANKING ALERT
   * ---------------------------------------------------------
   */
  const bankingAlert = inAppAlert ? (
    <div
      className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[1000] animate-in slide-in-from-top-4 fade-in duration-300"
      onClick={() => {
        window.location.href =
          inAppAlert.url;
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (
          event.key === "Enter" ||
          event.key === " "
        ) {
          window.location.href =
            inAppAlert.url;
        }
      }}
    >
      <div className="rounded-2xl border border-border bg-card shadow-2xl overflow-hidden cursor-pointer">
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/*
             * Icon
             */}
            <div
              className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${
                inAppAlert.type ===
                "credit"
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {inAppAlert.type ===
              "credit" ? (
                <ArrowDownLeft className="w-5 h-5" />
              ) : (
                <ArrowUpRight className="w-5 h-5" />
              )}
            </div>

            {/*
             * Main content
             */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-bold text-foreground">
                  {inAppAlert.title}
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setInAppAlert(null);
                  }}
                  className="w-7 h-7 rounded-full hover:bg-muted flex items-center justify-center shrink-0"
                  aria-label="Fechar alerta"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-1 text-sm font-semibold text-foreground truncate">
                {inAppAlert.senderName}
              </div>

              <div className="mt-1 text-xs text-muted-foreground">
                {inAppAlert.body}
              </div>

              <div
                className={`mt-2 text-xl font-extrabold ${
                  inAppAlert.type ===
                  "credit"
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {inAppAlert.type ===
                "credit"
                  ? "+"
                  : "-"}
                {formatBRL(
                  inAppAlert.amount,
                )}
              </div>

              <div className="mt-2 text-[11px] font-semibold text-primary">
                Toque para ver os detalhes →
              </div>
            </div>
          </div>
        </div>

        {/*
         * Bottom progress indicator
         */}
        <div className="h-1 bg-muted">
          <div className="h-full bg-primary animate-[shrink_6s_linear_forwards]" />
        </div>
      </div>
    </div>
  ) : null;

  /*
   * Automatically hide the in-app alert after 6 seconds.
   *
   * It remains clickable during those 6 seconds.
   */
  useEffect(() => {
    if (!inAppAlert) return;

    const timer = window.setTimeout(() => {
      setInAppAlert(null);
    }, 6000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [inAppAlert]);

  return (
    <>
      {permissionPrompt}
      {bankingAlert}
    </>
  );
}
