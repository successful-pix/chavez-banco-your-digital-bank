import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { formatBRL } from "@/lib/currency";
import { useToast } from "@/components/toast";
import { notifyTransfer } from "@/lib/user.functions";
import { getPinStatus } from "@/lib/pin.functions";
import { PinModal } from "@/components/pin-modal";

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
  const { t } = useI18n();
  const { type } = Route.useSearch();
  const mode = type === "ted" || type === "doc" ? "bank" : type === "internal" ? "internal" : "pix";
  const nav = useNavigate();
  const toast = useToast();
  const doTransferEmail = useServerFn(notifyTransfer);
  const pinStatus = useServerFn(getPinStatus);

  const [balance, setBalance] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [kycStatus, setKycStatus] = useState<string>("pending");
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
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
  const [recipientLookupName, setRecipientLookupName] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<"idle" | "checking" | "found" | "not-found" | "error">("idle");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scannerTimerRef = useRef<number | null>(null);

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
      try {
        const ps = await pinStatus();
        setHasPin(!!ps?.hasPin);
      } catch {
        setHasPin(false);
      }
    })();
  }, []);

  function stopScanner() {
    if (scannerTimerRef.current !== null) {
      window.clearInterval(scannerTimerRef.current);
      scannerTimerRef.current = null;
    }
    scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
    scannerStreamRef.current = null;
  }

  function extractPixData(raw: string) {
    let pixKey = raw.trim();
    let merchantName = "";
    let amount = "";

    const readTlv = (value: string) => {
      const tags: Record<string, string> = {};
      for (let i = 0; i + 4 <= value.length;) {
        const tag = value.slice(i, i + 2);
        const length = Number(value.slice(i + 2, i + 4));
        if (!Number.isFinite(length) || i + 4 + length > value.length) break;
        tags[tag] = value.slice(i + 4, i + 4 + length);
        i += 4 + length;
      }
      return tags;
    };

    if (/^000201/.test(raw)) {
      const tags = readTlv(raw);
      merchantName = tags["59"] || "";
      amount = tags["54"] || "";
      for (const tag of Object.keys(tags)) {
        if (tag >= "26" && tag <= "51") {
          const nested = readTlv(tags[tag]);
          if (nested["00"] === "br.gov.bcb.pix" && nested["01"]) {
            pixKey = nested["01"];
            break;
          }
        }
      }
    }

    return { pixKey, merchantName, amount };
  }

  useEffect(() => {
    if (!scannerOpen) return;
    let cancelled = false;

    const startScanner = async () => {
      setScannerError(null);
      try {
        const Detector = (window as any).BarcodeDetector;
        if (!Detector) {
          setScannerError("QR scanning is not supported by this browser. Please use the latest Chrome on your phone.");
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        scannerStreamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const detector = new Detector({ formats: ["qr_code"] });
        scannerTimerRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const rawValue = codes?.[0]?.rawValue;
            if (!rawValue) return;
            const data = extractPixData(rawValue);
            setForm((previous) => ({
              ...previous,
              pix_key: data.pixKey || previous.pix_key,
              recipient_name: data.merchantName || previous.recipient_name,
              amount: data.amount || previous.amount,
            }));
            stopScanner();
            setScannerOpen(false);
            toast.push("success", "QR code scanned successfully");
          } catch {
            // Continue scanning; temporary frame detection errors are normal.
          }
        }, 300);
      } catch (error: any) {
        setScannerError(
          error?.name === "NotAllowedError"
            ? "Camera permission was denied. Please allow camera access and try again."
            : "Unable to access the camera. Please check your camera permission."
        );
      }
    };

    startScanner();
    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [scannerOpen]);

  function up<K extends keyof typeof form>(k: K, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function lookupPixRecipient(value: string) {
    const key = value.trim();
    setRecipientLookupName(null);
    if (!key) { setLookupState("idle"); return; }
    const isEmail = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(key);
    const digits = key.replace(/\\D/g, "");
    const isCpf = digits.length === 11;
    if (!isEmail && !isCpf) { setLookupState("idle"); return; }
    setLookupState("checking");
    try {
      const column = isEmail ? "email" : "cpf";
      const lookupValue = isEmail ? key.toLowerCase() : digits;
      const { data, error } = await supabase.rpc("lookup_pix_recipient", {
        lookup_type: column,
        lookup_value: lookupValue,
      });
      if (error) throw error;
      const match = Array.isArray(data) ? data[0] : data;
      if (match?.full_name) {
        setRecipientLookupName(String(match.full_name));
        setLookupState("found");
      } else {
        setLookupState("not-found");
      }
    } catch {
      setLookupState("error");
    }
  }

  function validate() {
    if (mode !== "internal") {
      toast.push("error", "PIX and bank transfers are not available until the payment provider is connected. No money has been sent.");
      return null;
    }
    if (blocked) { toast.push("error", "Sua conta está bloqueada. Contate o suporte."); return null; }
    if (kycStatus !== "approved") { toast.push("error", "Conclua sua verificação KYC antes de transferir."); return null; }
    if (!hasPin) { toast.push("error", "Configure seu PIN de transferência em Segurança."); return null; }
    const amount = Number(form.amount.replace(",", "."));
    if (!isFinite(amount) || amount <= 0) { toast.push("error", "Valor inválido"); return null; }
    if (amount > balance) { toast.push("error", t("transfer.insufficient")); return null; }
    return amount;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amount = validate();
    if (amount === null) return;
    setPinOpen(true);
  }

  async function afterPin() {
    setPinOpen(false);
    const amount = Number(form.amount.replace(",", "."));
    setSaving(true);
    const { data: s } = await supabase.auth.getUser();
    if (!s.user) { setSaving(false); return; }

    const { data: tx, error } = await supabase
      .from("transactions")
      .insert({
        user_id: s.user.id,
        type: "internal",
        direction: "out",
        amount,
        description: form.description || null,
        recipient_name: null,
        recipient_bank: "Chavez Banco",
        recipient_agencia: null,
        recipient_account: form.account_number.trim() || null,
        pix_key: null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !tx) {
      setSaving(false);
      toast.push("error", error?.message || t("auth.error.generic"));
      return;
    }

    // The database trigger atomically reserves the amount when this pending
    // outgoing transfer is inserted. Keep the displayed balance in sync.
    setBalance((current) => Math.max(0, Number((current - amount).toFixed(2))));

    await supabase.from("notifications").insert({
      user_id: s.user.id,
      title: "Transferência pendente de aprovação",
      body: `Chavez Banco account ${form.account_number.trim()} — ${formatBRL(amount)}`,
    });

    setSaving(false);
    toast.push("success", "Transferência enviada para aprovação");
    doTransferEmail({ data: { amount, kind: "internal", recipient: form.account_number.trim() } }).catch(() => {});
    nav({ to: "/receipt/$id", params: { id: tx.id } });
  }



  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">{t("transfer.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("dashboard.balance")}: <span className="font-semibold text-foreground">{formatBRL(balance)}</span>
        </p>
      </div>

      {blocked && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Sua conta foi bloqueada. Entre em contato com o Suporte para desbloqueá-la.
        </div>
      )}
      {!blocked && kycStatus !== "approved" && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <b>KYC {kycStatus === "pending" ? "em análise" : kycStatus}.</b> Tempo estimado de análise: até 24 horas. Você poderá transferir após a aprovação.
        </div>
      )}
      {!blocked && kycStatus === "approved" && hasPin === false && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm">
          <b>PIN de transferência necessário.</b> <Link to="/security" className="underline font-semibold text-primary">Configurar agora</Link> para autorizar transferências.
        </div>
      )}




      <div className="grid grid-cols-3 gap-2">
        <Link to="/transfer" search={{ type: "pix" }} className={`rounded-xl border p-3 text-center text-sm font-semibold ${mode === "pix" ? "border-primary bg-primary/10 text-primary" : "bg-card"}`}>PIX</Link>
        <Link to="/transfer" search={{ type: "ted" }} className={`rounded-xl border p-3 text-center text-sm font-semibold ${mode === "bank" ? "border-primary bg-primary/10 text-primary" : "bg-card"}`}>Bank transfer</Link>
        <Link to="/transfer" search={{ type: "internal" }} className={`rounded-xl border p-3 text-center text-sm font-semibold ${mode === "internal" ? "border-primary bg-primary/10 text-primary" : "bg-card"}`}>Chavez Banco</Link>
      </div>

      {mode !== "internal" && (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm">
          <b>Provider connection required.</b>
          <p className="mt-1 text-muted-foreground">You can prepare the recipient details here, but PIX or external bank payments cannot be sent until a payment provider is connected.</p>
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border bg-card shadow-card p-5 space-y-3">
        {mode === "pix" && (
          <>
            <label className="block">
              <span className="text-xs font-semibold text-foreground/80">PIX key type</span>
              <select value={form.pix_key.includes("@") ? "email" : "cpf"} onChange={(e) => { up("pix_key", ""); setRecipientLookupName(null); setLookupState("idle"); }} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                <option value="email">Email</option>
                <option value="cpf">CPF</option>
              </select>
            </label>
            <Field label={form.pix_key.includes("@") ? "Recipient email" : "Recipient email or CPF"} required value={form.pix_key} onChange={(v) => { up("pix_key", v); lookupPixRecipient(v); }} placeholder="Email or CPF" />
            {lookupState === "checking" && <p className="text-xs text-muted-foreground">Checking recipient…</p>}
            {lookupState === "found" && recipientLookupName && <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-sm">Recipient name: <b>{recipientLookupName}</b></div>}
            {lookupState === "not-found" && <p className="text-xs text-destructive">No matching recipient was found.</p>}
            {lookupState === "error" && <p className="text-xs text-amber-700">Recipient lookup is unavailable until secure lookup is configured.</p>}
          </>
        )}
        {mode === "bank" && (
          <>
            <label className="block">
              <span className="text-xs font-semibold text-foreground/80">Destination bank</span>
              <select required value={form.bank} onChange={(e) => up("bank", e.target.value)} className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm">
                <option value="">Select bank</option>
                {["Banco do Brasil", "Caixa Econômica Federal", "Itaú", "Bradesco", "Santander Brasil", "Nubank", "Banco Inter", "C6 Bank", "BTG Pactual", "Sicredi", "Sicoob", "Banco Safra", "Mercado Pago", "PicPay", "PagBank"].map((bank) => <option key={bank} value={bank}>{bank}</option>)}
              </select>
            </label>
            <Field label="Recipient full name" required value={form.recipient_name} onChange={(v) => up("recipient_name", v)} />
            <Field label="Branch / agency" required value={form.agencia} onChange={(v) => up("agencia", v)} />
            <Field label="Bank account number" required value={form.account_number} onChange={(v) => up("account_number", v)} />
          </>
        )}
        {mode === "internal" && (
          <>
            <Field label="Chavez Banco recipient account number" required value={form.account_number} onChange={(v) => up("account_number", v)} />
            <p className="text-xs text-muted-foreground">Enter the account number exactly as shown in the recipient's Chavez Banco account.</p>
          </>
        )}
        <Field label={t("transfer.amount")} required inputMode="decimal" value={form.amount} onChange={(v) => up("amount", v)} placeholder="0,00" />
        <Field label={t("transfer.description")} value={form.description} onChange={(v) => up("description", v)} />

        <button disabled={saving || mode !== "internal"} className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60">
          {mode !== "internal" ? "Provider setup required" : saving ? t("transfer.saving") : t("transfer.submit")}
        </button>
      </form>

      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-card p-4 shadow-elevated">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-foreground">Scan QR payment</h2>
                <p className="text-xs text-muted-foreground">Point your camera at the payment QR code.</p>
              </div>
              <button type="button" onClick={() => setScannerOpen(false)} className="rounded-lg p-2 hover:bg-accent" aria-label="Close scanner">
                <X className="h-5 w-5" />
              </button>
            </div>
            {scannerError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{scannerError}</div>
            ) : (
              <video ref={videoRef} muted playsInline className="aspect-square w-full rounded-xl bg-black object-cover" />
            )}
          </div>
        </div>
      )}

      <PinModal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onVerified={afterPin}
        description={`Autorize a transferência de ${formatBRL(Number(form.amount.replace(",", ".")) || 0)}.`}
      />
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
