import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PinInput } from "@/components/pin-input";
import { useToast } from "@/components/toast";
import { ShieldCheck, KeyRound, RotateCcw } from "lucide-react";
import {
  getPinStatus,
  setTransferPin,
  changeTransferPin,
  resetTransferPin,
} from "@/lib/pin.functions";
import { sendVerificationCode } from "@/lib/user.functions";

export const Route = createFileRoute("/_authenticated/security")({
  head: () => ({
    meta: [
      { title: "Segurança — Chavez Banco" },
      { name: "description", content: "Gerencie seu PIN de transferência e opções de segurança." },
    ],
  }),
  component: SecurityPage,
});

type Mode = "setup" | "change" | "reset";

function SecurityPage() {
  const toast = useToast();
  const status = useServerFn(getPinStatus);
  const doSet = useServerFn(setTransferPin);
  const doChange = useServerFn(changeTransferPin);
  const doReset = useServerFn(resetTransferPin);
  const doSendOtp = useServerFn(sendVerificationCode);

  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [locked, setLocked] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("setup");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [current, setCurrent] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    const s = await status();
    setHasPin(!!s?.hasPin);
    setLocked(s?.lockedUntil ?? null);
    setMode(s?.hasPin ? "change" : "setup");
  }
  useEffect(() => {
    refresh();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin1.length !== 6 || pin2.length !== 6) return toast.push("error", "PIN deve ter 6 dígitos");
    if (pin1 !== pin2) return toast.push("error", "Os PINs não coincidem");
    setLoading(true);
    try {
      if (mode === "setup") {
        const r = await doSet({ data: { pin: pin1 } });
        if (!r?.ok) throw new Error(r?.error ?? "Falha");
        toast.push("success", "PIN de transferência configurado");
      } else if (mode === "change") {
        if (current.length !== 6) throw new Error("Informe o PIN atual");
        const r = await doChange({ data: { currentPin: current, newPin: pin1 } });
        if (!r?.ok) {
          if (r?.error === "invalid") throw new Error(`PIN atual incorreto${r.attemptsLeft != null ? ` (${r.attemptsLeft} restantes)` : ""}`);
          if (r?.error === "locked") throw new Error("Muitas tentativas. Bloqueado temporariamente.");
          throw new Error(r?.error ?? "Falha");
        }
        toast.push("success", "PIN alterado com sucesso");
      } else {
        if (!otp) throw new Error("Informe o código enviado por e-mail");
        const r = await doReset({ data: { newPin: pin1, otp } });
        if (!r?.ok) throw new Error(r?.error === "invalid_otp" ? "Código inválido" : r?.error === "expired_otp" ? "Código expirado" : "Falha");
        toast.push("success", "PIN redefinido");
      }
      setPin1("");
      setPin2("");
      setCurrent("");
      setOtp("");
      setOtpSent(false);
      await refresh();
    } catch (err: any) {
      toast.push("error", err?.message ?? "Falha");
    } finally {
      setLoading(false);
    }
  }

  async function sendOtp() {
    try {
      await doSendOtp();
      setOtpSent(true);
      toast.push("success", "Código enviado por e-mail");
    } catch {
      toast.push("error", "Falha ao enviar código");
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Segurança</h1>
        <p className="mt-1 text-sm text-muted-foreground">PIN de transferência e proteção da sua conta.</p>
      </div>

      <div className="rounded-2xl border bg-card shadow-card p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-foreground">PIN de Transferência</h2>
            <p className="text-xs text-muted-foreground">
              {hasPin === null ? "Carregando..." : hasPin ? "Configurado" : "Não configurado — obrigatório para transferências"}
            </p>
          </div>
        </div>

        {locked && new Date(locked) > new Date() && (
          <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Bloqueado até {new Date(locked).toLocaleTimeString("pt-BR")} por tentativas incorretas.
          </div>
        )}

        {hasPin && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode("change")}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${mode === "change" ? "bg-accent text-primary" : ""}`}
            >
              <KeyRound className="h-3.5 w-3.5 inline mr-1" /> Alterar PIN
            </button>
            <button
              onClick={() => setMode("reset")}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${mode === "reset" ? "bg-accent text-primary" : ""}`}
            >
              <RotateCcw className="h-3.5 w-3.5 inline mr-1" /> Esqueci meu PIN
            </button>
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-4">
          {mode === "change" && (
            <div>
              <label className="text-xs font-semibold text-foreground/80">PIN atual</label>
              <div className="mt-1"><PinInput value={current} onChange={setCurrent} /></div>
            </div>
          )}
          {mode === "reset" && (
            <div className="rounded-xl border bg-accent/40 p-3">
              <p className="text-xs text-muted-foreground">
                Enviaremos um código por e-mail para você redefinir o PIN.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="Código de 6 dígitos"
                  className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={sendOtp}
                  className="rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-accent"
                >
                  {otpSent ? "Reenviar" : "Enviar código"}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-foreground/80">
              {mode === "setup" ? "Novo PIN" : "Novo PIN"}
            </label>
            <div className="mt-1"><PinInput value={pin1} onChange={setPin1} /></div>
          </div>
          <div>
            <label className="text-xs font-semibold text-foreground/80">Confirmar PIN</label>
            <div className="mt-1"><PinInput value={pin2} onChange={setPin2} /></div>
          </div>
          <button
            disabled={loading}
            className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
          >
            {loading ? "Salvando..." : mode === "setup" ? "Criar PIN" : mode === "change" ? "Alterar PIN" : "Redefinir PIN"}
          </button>
        </form>
      </div>

      <div className="rounded-2xl border bg-card shadow-card p-5">
        <h2 className="font-bold text-foreground">Senha da conta</h2>
        <p className="mt-1 text-xs text-muted-foreground">Redefina sua senha por e-mail seguro.</p>
        <Link
          to="/forgot-password"
          className="mt-3 inline-flex rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-accent"
        >
          Alterar senha
        </Link>
      </div>
    </div>
  );
}
