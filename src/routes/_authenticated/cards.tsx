import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { maskAccount } from "@/lib/currency";
import { CreditCard as CardIcon, Snowflake, Eye, EyeOff, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cards")({
  head: () => ({
    meta: [
      { title: "Meus Cartões — Chavez Banco" },
      { name: "description", content: "Gerencie seus cartões de débito e virtuais Chavez Banco." },
    ],
  }),
  component: CardsPage,
});

type Profile = { full_name: string; account_number: string };

function CardsPage() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showNum, setShowNum] = useState(false);
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getUser();
      if (!s.user) return;
      const { data: p } = await supabase.from("profiles").select("full_name,account_number").eq("id", s.user.id).maybeSingle();
      setProfile(p as unknown as Profile);
    })();
  }, []);

  const number = profile ? `4127 8901 ${profile.account_number.slice(0, 4)} ${profile.account_number.slice(-4).padStart(4, "0")}` : "•••• •••• •••• ••••";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight text-foreground">{t("nav.cards")}</h1>

      {/* Physical/debit card */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-primary p-6 shadow-elevated text-primary-foreground transition ${frozen ? "opacity-70" : ""}`}>
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-6 top-6 h-8 w-12 rounded-md bg-gradient-gold" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest">Débito</span>
          <span className="text-xs font-bold uppercase tracking-widest">CHAVEZ BANCO</span>
        </div>
        <div className="mt-10 text-xl sm:text-2xl font-black tracking-[0.2em]">
          {showNum ? number : "•••• •••• •••• " + number.slice(-4)}
        </div>
        <div className="mt-6 flex items-end justify-between text-xs">
          <div>
            <div className="text-white/70 uppercase tracking-widest text-[10px]">Titular</div>
            <div className="font-bold uppercase">{profile?.full_name || "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-white/70 uppercase tracking-widest text-[10px]">Validade</div>
            <div className="font-bold">12/29</div>
          </div>
          <span className="font-black tracking-wider">VISA</span>
        </div>
        {frozen && (
          <div className="absolute inset-0 grid place-items-center bg-primary-dark/60">
            <div className="rounded-full bg-white/95 text-primary px-4 py-2 text-sm font-bold flex items-center gap-2">
              <Snowflake className="h-4 w-4" /> Congelado
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ActionBtn icon={showNum ? EyeOff : Eye} label={showNum ? t("dashboard.hide") : t("dashboard.show")} onClick={() => setShowNum((s) => !s)} />
        <ActionBtn icon={Snowflake} label={frozen ? "Desbloq." : "Congelar"} onClick={() => setFrozen((f) => !f)} />
        <ActionBtn icon={Plus} label="Virtual" />
      </div>

      <div className="rounded-2xl border bg-card shadow-card p-5">
        <h2 className="font-bold text-foreground flex items-center gap-2"><CardIcon className="h-4 w-4 text-primary" /> Detalhes</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Detail k="Bandeira" v="VISA" />
          <Detail k="Tipo" v="Débito" />
          <Detail k="Conta vinculada" v={profile ? maskAccount(profile.account_number) : "—"} />
          <Detail k="Status" v={frozen ? "Bloqueado" : "Ativo"} />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Precisa de ajuda? <Link to="/dashboard" className="text-primary font-semibold">Fale com o suporte</Link>
      </p>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick }: { icon: React.ComponentType<{ className?: string }>; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border bg-card shadow-card p-3 flex flex-col items-center justify-center gap-1.5 hover:border-primary/30 transition"
    >
      <div className="h-9 w-9 rounded-xl bg-accent grid place-items-center text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-accent/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{k}</div>
      <div className="font-semibold text-foreground">{v}</div>
    </div>
  );
}
