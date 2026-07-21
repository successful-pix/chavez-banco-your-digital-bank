import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chavez Banco — Banco digital premium do Brasil" },
      {
        name: "description",
        content:
          "Abra sua conta Chavez Banco e tenha PIX, TED, cartões e segurança bancária. 100% digital.",
      },
      { property: "og:title", content: "Chavez Banco" },
      { property: "og:description", content: "Banco digital premium do Brasil." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            {signedIn ? (
              <Link
                to="/dashboard"
                className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow"
              >
                {t("nav.home")}
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ mode: "signin" }}
                  className="hidden sm:inline-flex text-sm font-semibold text-foreground hover:text-primary"
                >
                  {t("nav.signin")}
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow"
                >
                  {t("nav.signup")}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-primary opacity-[0.06]" />
        <div className="mx-auto max-w-6xl px-4 pt-14 pb-20 sm:pt-20 sm:pb-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary ring-1 ring-primary/10">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Brasil • BRL
            </div>
            <h1 className="mt-4 text-4xl sm:text-5xl font-black leading-[1.05] tracking-tight text-foreground">
              {t("landing.hero.title")}
            </h1>
            <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-lg">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="rounded-xl bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-elevated hover:opacity-95"
              >
                {t("landing.cta.primary")}
              </Link>
              <Link
                to="/auth"
                search={{ mode: "signin" }}
                className="rounded-xl border border-primary/20 bg-card px-6 py-3 text-sm font-semibold text-primary hover:bg-accent"
              >
                {t("landing.cta.secondary")}
              </Link>
            </div>
          </div>

          {/* Card mockup */}
          <div className="relative mx-auto w-full max-w-md">
            <div className="relative aspect-[1.6/1] rounded-3xl bg-gradient-primary p-6 shadow-elevated overflow-hidden">
              <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute right-6 top-6 h-8 w-12 rounded-md bg-gradient-gold" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center text-white font-black">C</div>
                <div className="text-white/90 text-sm font-bold tracking-wide">CHAVEZ BANCO</div>
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="text-white/70 text-xs uppercase tracking-widest">
                  {t("dashboard.balance")}
                </div>
                <div className="mt-1 text-white text-2xl font-black tracking-tight">
                  •••• •••• •••• 4127
                </div>
                <div className="mt-4 flex items-center justify-between text-white/85 text-xs">
                  <span>NOME DO TITULAR</span>
                  <span className="font-bold">VISA</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-gradient-gold blur-2xl opacity-70" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-24 grid sm:grid-cols-3 gap-4">
        {[
          ["landing.feature.pix.title", "landing.feature.pix.desc", "⚡"],
          ["landing.feature.cards.title", "landing.feature.cards.desc", "💳"],
          ["landing.feature.security.title", "landing.feature.security.desc", "🔒"],
        ].map(([tk, dk, icon]) => (
          <div key={tk} className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="h-10 w-10 rounded-xl bg-accent grid place-items-center text-lg">{icon}</div>
            <h3 className="mt-4 font-bold text-foreground">{t(tk)}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t(dk)}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <Logo />
          <p>© {new Date().getFullYear()} Chavez Banco. {t("app.tagline")}.</p>
        </div>
      </footer>
    </div>
  );
}
