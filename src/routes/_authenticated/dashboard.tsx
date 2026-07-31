import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { formatBRL, formatDate, maskAccount } from "@/lib/currency";
import { useToast } from "@/components/toast";
import { Eye, EyeOff, Copy, Send, QrCode, CreditCard, Zap, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel — Chavez Banco" },
      { name: "description", content: "Seu painel Chavez Banco com saldo, PIX, cartões e transações." },
    ],
  }),
  component: Dashboard,
});

type Profile = {
  full_name: string;
  agencia: string;
  account_number: string;
  pix_key: string | null;
  balance: number;
  swift: string;
  account_type: string;
  country: string;
  currency: string;
  avatar_url: string | null;
  kyc_status: string;
  blocked: boolean;
};


type Tx = {
  id: string;
  type: string;
  direction: "in" | "out";
  amount: number;
  description: string | null;
  created_at: string;
  recipient_name: string | null;
  sender_name: string | null;
  status: string;
};

function Dashboard() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [hidden, setHidden] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getUser();
      if (!s.user) return;
      const [{ data: p }, { data: tx }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
        supabase.from("transactions").select("*").eq("user_id", s.user.id).order("created_at", { ascending: false }).limit(8),
      ]);
      if (p) {
        setProfile(p as unknown as Profile);
        if ((p as any).avatar_url) {
          const { data: signed } = await supabase.storage.from("avatars").createSignedUrl((p as any).avatar_url, 3600);
          setAvatarUrl(signed?.signedUrl ?? null);
        }
      }
      if (tx) setTxs(tx as unknown as Tx[]);
    })();
  }, []);

  function greet() {
    const h = new Date().getHours();
    if (h < 12) return lang === "en" ? "Good morning" : "Bom dia";
    if (h < 18) return lang === "en" ? "Good afternoon" : "Boa tarde";
    return lang === "en" ? "Good evening" : "Boa noite";
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.push("success", t("dashboard.copied"));
  }

  if (!profile) {
    return <div className="py-16 text-center text-muted-foreground text-sm">{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Greeting */}
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/20 shadow-card" />
        ) : (
          <div className="h-12 w-12 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-black text-lg shadow-card">
            {(profile.full_name || "?").charAt(0)}
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">{greet()},</p>
          <h1 className="text-xl font-black tracking-tight text-foreground">{profile.full_name || "—"}</h1>
        </div>
      </div>

      {profile.blocked && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <b>Sua conta foi bloqueada.</b> Entre em contato com o Suporte para desbloquear sua conta.
        </div>
      )}
      {!profile.blocked && profile.kyc_status === "pending" && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <b>KYC em análise.</b> Tempo estimado: até 24 horas. Após a aprovação todos os serviços serão liberados.
        </div>
      )}
      {!profile.blocked && profile.kyc_status === "rejected" && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <b>KYC rejeitado.</b> Reenvie seus documentos na página KYC.
        </div>
      )}


      {/* Balance card */}
<div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-6 shadow-elevated text-primary-foreground ring-1 ring-white/10 transition hover:shadow-2xl">
  <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/15 blur-2xl" />
  <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-black/20 blur-2xl" />
  <div className="absolute right-6 top-6 h-6 w-10 rounded bg-gradient-gold shadow-lg" />
  
  <div className="flex items-center justify-between relative z-10">
    <span className="text-xs uppercase tracking-widest text-white/80">{t("dashboard.balance")}</span>
    
    <button
      type="button"
      onClick={() => setHidden((h) => !h)}
      className="rounded-lg p-1.5 hover:bg-white/20 transition active:scale-95"
      title={hidden ? "Mostrar saldo" : "Ocultar saldo"}
    >
      {hidden ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
    </button>
  </div>

  <div className="mt-1.5 text-[28px] leading-tight font-bold tracking-tight tabular-nums transition-all relative z-10">
    {hidden ? "R$ ••••••" : formatBRL(profile.balance)}
  </div>

  <div className="mt-6 grid grid-cols-2 gap-3 text-xs relative z-10">
    <Info label={t("dashboard.agencia")} value={profile.agencia} onCopy={() => copy(profile.agencia)} />
    <Info label={t("dashboard.account")} value={maskAccount(profile.account_number)} onCopy={() => copy(profile.account_number)} />
    <Info label={t("dashboard.pix")} value={profile.pix_key ?? "—"} onCopy={() => profile.pix_key && copy(profile.pix_key)} />
    <Info label={t("dashboard.type")} value={profile.account_type} />
    <Info label={t("dashboard.swift")} value={profile.swift} />
    <Info label={t("dashboard.currency")} value={`${profile.currency} • ${profile.country}`} />
  </div>
</div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { to: "/transfer", search: { type: "pix" }, icon: Zap, label: t("dashboard.qa.pix") },
          { to: "/transfer", search: { type: "ted" }, icon: Send, label: t("dashboard.qa.transfer") },
          { to: "/transfer", search: { type: "pix" }, icon: QrCode, label: t("dashboard.qa.qr") },
          { to: "/cards", search: undefined, icon: CreditCard, label: t("dashboard.qa.cards") },
        ].map(({ to, search, icon: Icon, label }) => (
          <Link
            key={label}
            to={to as "/transfer" | "/cards"}
            search={search as never}
            className="group rounded-2xl border bg-gradient-to-br from-card to-accent/40 shadow-card p-3 flex flex-col items-center justify-center gap-1.5 hover:border-primary/50 hover:shadow-elevated hover:-translate-y-0.5 active:scale-95 transition-all"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-primary/10 grid place-items-center text-primary group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all">
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-semibold text-foreground">{label}</span>
          </Link>
        ))}
      </div>

      {/* Recent tx */}
      <div className="rounded-2xl border bg-card shadow-card">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="font-bold text-foreground">{t("dashboard.recent")}</h2>
        </div>
        {txs.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("dashboard.empty")}</p>
        ) : (
          <ul className="divide-y">
            {txs.map((tx) => (
              <li key={tx.id}>
                <Link
                  to="/receipt/$id"
                  params={{ id: tx.id }}
                  className="flex items-center justify-between gap-3 px-5 py-2.5 hover:bg-accent/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl grid place-items-center ${
                        tx.direction === "in" ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                      }`}
                    >
                      {tx.direction === "in" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                        {t(`tx.${tx.type}`) !== `tx.${tx.type}` ? t(`tx.${tx.type}`) : tx.type}
                        {tx.status && tx.status !== "completed" && (
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            tx.status === "pending" ? "bg-amber-400/20 text-amber-700 dark:text-amber-300" :
                            tx.status === "rejected" || tx.status === "failed" ? "bg-red-400/20 text-red-700 dark:text-red-300" :
                            "bg-muted text-muted-foreground"
                          }`}>{tx.status}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {tx.direction === "in" ? tx.sender_name : tx.recipient_name} • {formatDate(tx.created_at, lang)}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${tx.direction === "in" ? "text-success" : "text-foreground"}`}>
                    {tx.direction === "in" ? "+" : "−"} {formatBRL(tx.amount)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, onCopy }: { label: string; value: string; onCopy?: () => void }) {
  return (
    <div className="rounded-xl bg-white/10 px-3 py-2 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-white/70">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
      {onCopy && (
        <button onClick={onCopy} className="rounded-lg p-1 hover:bg-white/10">
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
