import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { formatBRL } from "@/lib/currency";
import { useToast } from "@/components/toast";
import { notifyTransfer } from "@/lib/user.functions";

const searchSchema = z.object({
  type: z.enum(["pix", "ted", "doc", "internal"]).optional().default("pix"),
});

export const Route = createFileRoute("/_authenticated/transfer")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Transferir — Chavez Banco" },
      { name: "description", content: "Envie PIX, TED, DOC ou faça transferências internas Chavez Banco." },
    ],
  }),
  component: TransferPage,
});

type TxType = "pix" | "ted" | "doc" | "internal";

function TransferPage() {
  const { type: initialType } = Route.useSearch();
  const { t } = useI18n();
  const nav = useNavigate();
  const toast = useToast();
  const doTransferEmail = useServerFn(notifyTransfer);

  const [type, setType] = useState<TxType>(initialType);
  const [balance, setBalance] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>("pending");
  const [form, setForm] = useState({
    recipient_name: "",
    bank: "",
    agencia: "",
    account_number: "",
    pix_key: "",
    amount: "",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getUser();
      if (!s.user) return;
      const { data: p } = await supabase.from("profiles").select("balance, blocked, kyc_status").eq("id", s.user.id).maybeSingle();
      if (p) {
        setBalance(Number(p.balance));
        setBlocked(!!(p as any).blocked);
        setKycStatus((p as any).kyc_status ?? "pending");
      }
    })();
  }, []);

  function up<K extends keyof typeof form>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (blocked) return toast.push("error", "Sua conta está bloqueada. Contate o suporte.");
    if (kycStatus !== "approved") return toast.push("error", "Conclua sua verificação KYC antes de transferir.");
    const amount = Number(form.amount.replace(",", "."));
    if (!isFinite(amount) || amount <= 0) return toast.push("error", "Valor inválido");
    if (amount > balance) return toast.push("error", t("transfer.insufficient"));

    setSaving(true);
    const { data: s } = await supabase.auth.getUser();
    if (!s.user) { setSaving(false); return; }

    const { data: tx, error } = await supabase
      .from("transactions")
      .insert({
        user_id: s.user.id,
        type,
        direction: "out",
        amount,
        description: form.description || null,
        recipient_name: form.recipient_name || null,
        recipient_bank: form.bank || null,
        recipient_agencia: form.agencia || null,
        recipient_account: form.account_number || null,
        pix_key: type === "pix" ? form.pix_key || null : null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !tx) {
      setSaving(false);
      toast.push("error", error?.message || t("auth.error.generic"));
      return;
    }

    await supabase.from("notifications").insert({
      user_id: s.user.id,
      title: "Transferência pendente de aprovação",
      body: `${form.recipient_name || form.pix_key} — ${formatBRL(amount)}`,
    });

    setSaving(false);
    toast.push("success", "Transferência enviada para aprovação");
    doTransferEmail({ data: { amount, kind: type, recipient: form.recipient_name || form.pix_key || undefined } }).catch(() => {});
    nav({ to: "/receipt/$id", params: { id: tx.id } });
  }


  const types: TxType[] = ["pix", "ted", "doc", "internal"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">{t("transfer.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.balance")}: <span className="font-semibold text-foreground">{formatBRL(balance)}</span>
        </p>
      </div>

      {/* Type selector */}
      <div className="grid grid-cols-4 gap-2">
        {types.map((tp) => (
          <button
            key={tp}
            onClick={() => setType(tp)}
            className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
              type === tp
                ? "bg-gradient-primary text-primary-foreground border-transparent shadow-elevated"
                : "bg-card text-foreground hover:border-primary/30"
            }`}
          >
            {t(`transfer.type.${tp}`)}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="rounded-2xl border bg-card shadow-card p-5 space-y-3">
        <Field label={t("transfer.recipient.name")} required value={form.recipient_name} onChange={(v) => up("recipient_name", v)} />
        {type === "pix" ? (
          <Field label={t("transfer.pixkey")} required value={form.pix_key} onChange={(v) => up("pix_key", v)} />
        ) : (
          <>
            <Field label={t("transfer.bank")} required value={form.bank} onChange={(v) => up("bank", v)} />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("transfer.agencia")} required value={form.agencia} onChange={(v) => up("agencia", v)} />
              <Field label={t("transfer.account")} required value={form.account_number} onChange={(v) => up("account_number", v)} />
            </div>
          </>
        )}
        <Field label={t("transfer.amount")} required inputMode="decimal" value={form.amount} onChange={(v) => up("amount", v)} placeholder="0,00" />
        <Field label={t("transfer.description")} value={form.description} onChange={(v) => up("description", v)} />

        <button
          disabled={saving}
          className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
        >
          {saving ? t("transfer.saving") : t("transfer.submit")}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground/80">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
