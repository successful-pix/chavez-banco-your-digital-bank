import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/toast";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Chavez Banco" },
      { name: "description", content: "Defina uma nova senha para sua conta Chavez Banco." },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const toast = useToast();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return toast.push("error", t("auth.password.min"));
    if (pw !== pw2) return toast.push("error", t("auth.password.mismatch"));
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setLoading(false);
    if (error) return toast.push("error", error.message);
    toast.push("success", "Senha atualizada!");
    nav({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl h-16 px-4 flex items-center"><Link to="/"><Logo /></Link></div>
      </header>
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border bg-card shadow-card p-6">
          <h1 className="text-xl font-bold text-foreground">{t("auth.reset.title")}</h1>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <input type="password" required placeholder={t("auth.reset.new")} value={pw} onChange={(e) => setPw(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            <input type="password" required placeholder={t("auth.password.confirm")} value={pw2} onChange={(e) => setPw2(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
            <button disabled={loading} className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60">
              {loading ? t("common.loading") : t("auth.reset.button")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
