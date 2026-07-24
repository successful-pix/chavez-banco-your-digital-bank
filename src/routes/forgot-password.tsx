import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/toast";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Chavez Banco" },
      { name: "description", content: "Recupere o acesso à sua conta Chavez Banco." },
    ],
  }),
  component: Page,
});

function Page() {
  const { t } = useI18n();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const redirect = "https://chavezbanco.online/reset-password";
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    setLoading(false);
    if (error) return toast.push("error", error.message);
    setSent(true);
    toast.push("success", t("auth.reset.sent"));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-6xl h-16 px-4 flex items-center"><Link to="/"><Logo /></Link></div>
      </header>
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border bg-card shadow-card p-6">
          <h1 className="text-xl font-bold text-foreground">{t("auth.forgot.title")}</h1>
          {sent ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("auth.reset.sent")}</p>
          ) : (
            <form onSubmit={submit} className="mt-4 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.email")}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                disabled={loading}
                className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
              >
                {loading ? t("common.loading") : t("auth.forgot.button")}
              </button>
            </form>
          )}
          <div className="mt-4 text-center">
            <Link to="/auth" search={{ mode: "signin" }} className="text-xs font-semibold text-primary hover:underline">
              ← {t("auth.signin.button")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
