import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyTransferPin } from "@/lib/pin.functions";
import { PinInput } from "@/components/pin-input";
import { ShieldCheck, X } from "lucide-react";

export function PinModal({
  open,
  onClose,
  onVerified,
  title = "Confirme com seu PIN de transferência",
  description = "Digite seu PIN de 6 dígitos para autorizar esta operação.",
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}) {
  const verify = useServerFn(verifyTransferPin);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pin.length !== 6) return setError("PIN deve ter 6 dígitos");
    setLoading(true);
    try {
      const res = await verify({ data: { pin } });
      if (res?.ok) {
        setPin("");
        onVerified();
      } else if (res?.error === "locked") {
        setError(`Bloqueado por tentativas incorretas. Tente novamente mais tarde.`);
      } else if (res?.error === "no_pin") {
        setError("Você ainda não configurou um PIN de transferência.");
      } else {
        setError(
          typeof res?.attemptsLeft === "number"
            ? `PIN incorreto. ${res.attemptsLeft} tentativa(s) restante(s).`
            : "PIN incorreto.",
        );
      }
    } catch (err: any) {
      setError(err?.message ?? "Falha ao verificar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 animate-in fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl border shadow-2xl p-6 animate-in slide-in-from-bottom-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-xl border p-2 hover:bg-accent"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 grid place-items-center text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="mt-3 font-bold text-foreground">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <PinInput value={pin} onChange={setPin} autoFocus disabled={loading} />
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <button
            disabled={loading || pin.length !== 6}
            className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
          >
            {loading ? "Verificando..." : "Confirmar"}
          </button>
        </form>
      </div>
    </div>
  );
}
