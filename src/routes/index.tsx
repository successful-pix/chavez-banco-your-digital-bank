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
      { property: "og:title", content: "Chavez Banco — Banco digital premium do Brasil" },
      {
        property: "og:description",
        content: "Abra sua conta Chavez Banco e tenha PIX, TED, cartões e segurança bancária. 100% digital.",
      },
    ],
  }),
  component: Landing,
});

function WomanWithPhone() {
  const { t } = useI18n();
  return (
    <div className="landing-photo-wrap relative mx-auto w-full max-w-[620px]">
      <div className="landing-photo-halo" />
      <div className="landing-photo-frame relative overflow-hidden rounded-[2rem]">
        <img
          src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1400&q=85"
          alt={t("landing.photo.alt")}
          className="landing-photo h-[390px] w-full object-cover object-center sm:h-[500px] lg:h-[570px]"
          fetchPriority="high"
        />
        <div className="landing-photo-shade" />
      </div>
      <div className="landing-photo-badge landing-photo-badge-top absolute right-3 top-8 z-20 flex max-w-[220px] items-center gap-3 rounded-2xl border border-white/50 bg-white/95 p-4 shadow-xl backdrop-blur sm:-right-3 sm:top-14">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-50 text-xl text-blue-700">✓</span>
        <span><strong className="block text-sm text-slate-900">{t("landing.art.app.title")}</strong><span className="mt-1 block text-xs text-slate-600">{t("landing.art.app.desc")}</span></span>
      </div>
      <div className="landing-photo-badge absolute bottom-5 left-3 z-20 flex max-w-[230px] items-center gap-3 rounded-2xl border border-white/50 bg-white/95 p-4 shadow-xl backdrop-blur sm:-left-4 sm:bottom-10">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-50 text-xl text-emerald-700">↗</span>
        <span><strong className="block text-sm text-slate-900">{t("landing.art.pix.title")}</strong><span className="mt-1 block text-xs text-slate-600">{t("landing.art.pix.desc")}</span></span>
      </div>
    </div>
  );
}

function Landing() {
  const { t } = useI18n();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSignedIn(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <div className="landing-page min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo />
          <nav className="flex items-center gap-2 sm:gap-4" aria-label="Main navigation">
            <LanguageSwitcher />
            {signedIn ? (
              <Link to="/dashboard" className="landing-primary-button rounded-full px-5 py-2.5 text-sm font-bold">
                {t("nav.home")}
              </Link>
            ) : (
              <>
                <Link to="/auth" search={{ mode: "signin" }} className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-foreground/80 transition hover:text-primary sm:inline-flex">
                  {t("nav.signin")}
                </Link>
                <Link to="/auth" search={{ mode: "signup" }} className="landing-primary-button rounded-full px-5 py-2.5 text-sm font-bold">
                  {t("nav.signup")}
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="landing-hero relative">
          <div className="landing-hero-pattern" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-5 px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 md:grid-cols-[1.02fr_.98fr] md:gap-2 md:px-8 md:pb-20 md:pt-14 lg:gap-8 lg:pt-16">
            <div className="relative z-20 max-w-2xl md:py-8">
              <div className="landing-eyebrow inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wide">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>{t("landing.eyebrow")}</span>
              </div>
              <h1 className="mt-6 max-w-2xl text-[2.65rem] font-black leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-[4.4rem]">
                {t("landing.hero.title")}
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {t("landing.hero.subtitle")}
              </p>
              <div className="mt-8 flex flex-col gap-3 min-[420px]:flex-row">
                <Link to="/auth" search={{ mode: "signup" }} className="landing-primary-button inline-flex min-h-14 items-center justify-center gap-3 rounded-full px-7 text-sm font-extrabold shadow-lg transition hover:-translate-y-0.5">
                  {t("landing.cta.primary")}
                  <span aria-hidden="true" className="text-lg">↗</span>
                </Link>
                <Link to="/auth" search={{ mode: "signin" }} className="inline-flex min-h-14 items-center justify-center rounded-full border border-border bg-background/75 px-7 text-sm font-bold transition hover:border-primary/40 hover:bg-accent">
                  {t("landing.cta.secondary")}
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-medium text-muted-foreground sm:text-sm">
                <span className="inline-flex items-center gap-2"><span className="landing-check">✓</span> {t("landing.benefit.account")}</span>
                <span className="inline-flex items-center gap-2"><span className="landing-check">✓</span> {t("landing.benefit.pix")}</span>
                <span className="inline-flex items-center gap-2"><span className="landing-check">✓</span> {t("landing.benefit.control")}</span>
              </div>
            </div>
            <div className="relative z-10 -mx-3 mt-1 sm:mx-0 md:mt-0">
              <WomanWithPhone />
            </div>
          </div>
        </section>

        <section className="relative border-t border-border/60 bg-background py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-primary">{t("landing.section.eyebrow")}</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t("landing.section.title")}</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{t("landing.section.subtitle")}</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
              {[
                { icon: "↗", title: t("landing.feature.everyday.title"), description: t("landing.feature.everyday.desc") },
                { icon: "◷", title: t("landing.feature.all.title"), description: t("landing.feature.all.desc") },
                { icon: "⌑", title: t("landing.feature.safe.title"), description: t("landing.feature.safe.desc") },
              ].map((feature) => (
                <article key={feature.title} className="landing-feature rounded-3xl border border-border/70 bg-card p-6 sm:p-7">
                  <div className="landing-feature-icon grid h-12 w-12 place-items-center rounded-2xl text-xl font-black">{feature.icon}</div>
                  <h3 className="mt-5 text-lg font-extrabold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
                </article>
              ))}
            </div>
            <div className="landing-bottom-cta mt-10 flex flex-col items-start justify-between gap-5 rounded-[2rem] p-7 sm:flex-row sm:items-center sm:p-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-white/65">{t("landing.bottom.eyebrow")}</p>
                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">{t("landing.bottom.title")}</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">{t("landing.bottom.subtitle")}</p>
              </div>
              <Link to="/auth" search={{ mode: "signup" }} className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-white px-6 text-sm font-extrabold text-[#0B4DBB] transition hover:bg-blue-50">
                {t("landing.cta.primary")} <span className="ml-2" aria-hidden="true">↗</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 bg-background py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <Logo />
          <p>© {new Date().getFullYear()} Chavez Banco. {t("app.tagline")}.</p>
          <div className="flex items-center gap-4">
            <Link to="/auth" search={{ mode: "signin" }} className="transition hover:text-primary">{t("nav.signin")}</Link>
            <Link to="/auth" search={{ mode: "signup" }} className="transition hover:text-primary">{t("nav.signup")}</Link>
          </div>
        </div>
      </footer>

      <style>{`
        .landing-page { --landing-blue: #0B4DBB; }
        .landing-primary-button { color: #fff; background: linear-gradient(135deg, #1765D8 0%, #0B4DBB 55%, #083A91 100%); box-shadow: 0 9px 24px rgba(11,77,187,.2); transition: transform .2s ease, box-shadow .2s ease, opacity .2s ease; }
        .landing-primary-button:hover { box-shadow: 0 13px 30px rgba(11,77,187,.27); }
        .landing-hero { background: radial-gradient(ellipse at 77% 38%, rgba(74,139,255,.12), transparent 39%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--background)) 84%, rgba(11,77,187,.025) 100%); }
        .landing-hero-pattern { position:absolute; inset:0; pointer-events:none; opacity:.23; background-image: radial-gradient(rgba(11,77,187,.17) .7px, transparent .7px); background-size:18px 18px; mask-image:linear-gradient(90deg, transparent, #000 70%); }
        .landing-eyebrow { color:#0B4DBB; background:rgba(11,77,187,.07); border:1px solid rgba(11,77,187,.12); }
        .landing-check { display:inline-grid; place-items:center; width:19px; height:19px; border-radius:50%; background:rgba(22,163,109,.12); color:#16865D; font-size:12px; font-weight:900; }
        .landing-photo-wrap { isolation:isolate; padding:8px; }\n        .landing-photo-halo { position:absolute; inset:8% -3% 4% 8%; border-radius:2rem; background:linear-gradient(135deg,rgba(11,77,187,.16),rgba(96,165,250,.08)); filter:blur(20px); }\n        .landing-photo-frame { box-shadow:0 28px 70px rgba(7,30,70,.2); }\n        .landing-photo-shade { position:absolute; inset:45% 0 0; background:linear-gradient(180deg,transparent,rgba(7,24,49,.3)); pointer-events:none; }\n        .landing-photo-badge { animation:landing-float 5s ease-in-out infinite; }\n        @media (max-width:639px) { .landing-photo-wrap { padding:4px; } .landing-photo-badge { max-width:190px; padding:10px; } }
        .landing-art-glow { position:absolute; z-index:0; inset:12% 8% 6%; border-radius:50%; background:rgba(71,135,255,.12); filter:blur(42px); animation:landing-glow 5s ease-in-out infinite; }
        .landing-orb { position:absolute; z-index:0; border-radius:50%; pointer-events:none; }
        .landing-orb-one { width:22px; height:22px; top:14%; right:17%; background:linear-gradient(135deg,#F9D38B,#EAA63A); box-shadow:0 0 32px rgba(244,188,88,.45); animation:landing-drift 5s ease-in-out infinite; }
        .landing-orb-two { width:12px; height:12px; top:46%; left:8%; background:#7FAAFF; animation:landing-drift 6s ease-in-out infinite reverse; }
        .landing-phone { transform-box:fill-box; transform-origin:center; animation:landing-phone-tilt 5s ease-in-out infinite; }
        .landing-float { animation:landing-float 5s ease-in-out infinite; }
        .landing-float-two { animation-delay:-2.2s; }
        .landing-sparkle { transform-box:fill-box; transform-origin:center; animation:landing-sparkle 3s ease-in-out infinite; }
        .landing-sparkle-delay { animation-delay:-1.3s; }
        .landing-feature { transition:transform .22s ease, border-color .22s ease, box-shadow .22s ease; }
        .landing-feature:hover { transform:translateY(-4px); border-color:rgba(11,77,187,.3); box-shadow:0 16px 40px rgba(11,45,100,.07); }
        .landing-feature-icon { color:#0B4DBB; background:rgba(11,77,187,.08); }
        .landing-bottom-cta { background:radial-gradient(ellipse at 90% 0%,rgba(76,144,255,.42),transparent 38%),linear-gradient(125deg,#08285F,#0B4DBB 65%,#1765D8); box-shadow:0 18px 50px rgba(11,77,187,.16); }
        @keyframes landing-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-9px); } }
        @keyframes landing-drift { 0%,100% { transform:translate(0,0); } 50% { transform:translate(7px,-12px); } }
        @keyframes landing-phone-tilt { 0%,100% { transform:rotate(-8deg) translateY(0); } 50% { transform:rotate(-5deg) translateY(-5px); } }
        @keyframes landing-glow { 0%,100% { opacity:.55; transform:scale(.96); } 50% { opacity:1; transform:scale(1.05); } }
        @keyframes landing-sparkle { 0%,100% { opacity:.6; transform:scale(.85) rotate(0); } 50% { opacity:1; transform:scale(1.12) rotate(14deg); } }
        @media (prefers-reduced-motion:reduce) { .landing-photo-badge { animation:none !important; } .landing-feature,.landing-primary-button { transition:none !important; } }
      `}</style>
    </div>
  );
}
