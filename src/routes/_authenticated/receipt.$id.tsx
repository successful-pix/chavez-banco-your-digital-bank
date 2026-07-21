import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { formatBRL, formatDate, formatTime, maskAccount } from "@/lib/currency";
import { Logo } from "@/components/logo";
import { ArrowLeft, Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/receipt/$id")({
  head: () => ({
    meta: [
      { title: "Comprovante — Chavez Banco" },
      { name: "description", content: "Comprovante de transação Chavez Banco." },
    ],
  }),
  component: ReceiptPage,
});

type Tx = {
  id: string;
  type: string;
  direction: "in" | "out";
  amount: number;
  status: string;
  reference: string;
  description: string | null;
  created_at: string;
  sender_name: string | null;
  sender_account: string | null;
  sender_bank: string | null;
  recipient_name: string | null;
  recipient_account: string | null;
  recipient_bank: string | null;
  recipient_agencia: string | null;
  pix_key: string | null;
};

function ReceiptPage() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [tx, setTx] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("transactions")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setTx((data as unknown as Tx) ?? null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</div>;
  if (!tx) return <div className="py-16 text-center text-sm text-muted-foreground">{t("receipt.notfound")}</div>;

  const typeLabel = t(`tx.${tx.type}`) !== `tx.${tx.type}` ? t(`tx.${tx.type}`) : tx.type;

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <button
          onClick={() => router.history.back()}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> {t("receipt.back")}
        </button>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-primary text-primary-foreground px-3 py-2 text-xs font-semibold shadow"
        >
          <Printer className="h-3.5 w-3.5" /> {t("receipt.print")}
        </button>
      </div>

      <article className="rounded-3xl border bg-card shadow-elevated overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-primary text-primary-foreground p-6">
          <div className="flex items-center justify-between">
            <Logo className="[&_span]:text-white [&_div>div]:text-white" />
            <span className="text-[10px] font-bold uppercase tracking-widest bg-white/15 px-2 py-1 rounded-full">
              {t("receipt.status.completed")}
            </span>
          </div>
          <div className="mt-6">
            <div className="text-xs uppercase tracking-widest text-white/70">{typeLabel}</div>
            <div className="mt-1 text-3xl font-black tracking-tight">
              {tx.direction === "in" ? "+" : "−"} {formatBRL(tx.amount)}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="p-6 space-y-4 text-sm">
          <Row label={t("receipt.reference")} value={tx.reference} />
          <Row label={t("receipt.date")} value={formatDate(tx.created_at, lang)} />
          <Row label={t("receipt.time")} value={formatTime(tx.created_at, lang)} />

          {(tx.sender_name || tx.sender_account) && (
            <div className="rounded-xl bg-accent/60 p-3 space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest font-bold text-primary">{t("receipt.from")}</div>
              {tx.sender_name && <Row label={t("transfer.recipient.name")} value={tx.sender_name} inline />}
              {tx.sender_bank && <Row label={t("transfer.bank")} value={tx.sender_bank} inline />}
              {tx.sender_account && <Row label={t("transfer.account")} value={maskAccount(tx.sender_account)} inline />}
            </div>
          )}

          {(tx.recipient_name || tx.recipient_account || tx.pix_key) && (
            <div className="rounded-xl bg-accent/60 p-3 space-y-1.5">
              <div className="text-[10px] uppercase tracking-widest font-bold text-primary">{t("receipt.to")}</div>
              {tx.recipient_name && <Row label={t("transfer.recipient.name")} value={tx.recipient_name} inline />}
              {tx.recipient_bank && <Row label={t("transfer.bank")} value={tx.recipient_bank} inline />}
              {tx.recipient_agencia && <Row label={t("transfer.agencia")} value={tx.recipient_agencia} inline />}
              {tx.recipient_account && <Row label={t("transfer.account")} value={maskAccount(tx.recipient_account)} inline />}
              {tx.pix_key && <Row label={t("transfer.pixkey")} value={tx.pix_key} inline />}
            </div>
          )}

          {tx.description && <Row label={t("receipt.reason")} value={tx.description} />}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Chavez Banco S.A.</span>
          <span>SWIFT CHVZBRSPXXX</span>
        </div>
      </article>

      <div className="mt-6 text-center print:hidden">
        <Link to="/dashboard" className="text-xs font-semibold text-primary hover:underline">
          ← {t("nav.home")}
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, inline }: { label: string; value: string; inline?: boolean }) {
  return (
    <div className={inline ? "flex items-center justify-between gap-3" : "flex items-center justify-between gap-3 border-b pb-3 last:border-b-0 last:pb-0"}>
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="font-semibold text-foreground text-right break-all">{value}</span>
    </div>
  );
}
