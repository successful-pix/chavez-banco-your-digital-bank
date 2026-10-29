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
  return (
    <div className="landing-art relative mx-auto w-full max-w-[560px]" aria-label="Mulher usando o aplicativo Chavez Banco">
      <div className="landing-orb landing-orb-one" />
      <div className="landing-orb landing-orb-two" />
      <div className="landing-art-glow" />
      <svg viewBox="0 0 560 590" role="img" aria-labelledby="hero-art-title" className="relative z-10 w-full overflow-visible">
        <title id="hero-art-title">Mulher sorridente usando o celular</title>
        <defs>
          <linearGradient id="dress" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2D7BFA" />
            <stop offset="100%" stopColor="#0B3C99" />
          </linearGradient>
          <linearGradient id="skin" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C9825D" />
            <stop offset="100%" stopColor="#8D4F3B" />
          </linearGradient>
          <linearGradient id="phone" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#18356C" />
            <stop offset="100%" stopColor="#071A3F" />
          </linearGradient>
          <filter id="soft-shadow" x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="16" stdDeviation="16" floodColor="#08265C" floodOpacity=".16" />
          </filter>
        </defs>
        <ellipse cx="286" cy="522" rx="185" ry="27" fill="#0B4DBB" opacity=".09" />
        <circle cx="287" cy="264" r="205" fill="#EAF2FF" />
        <circle cx="287" cy="264" r="166" fill="#DCE9FF" opacity=".65" />
        <path d="M93 420 C120 360 163 342 217 340 L351 340 C413 351 451 388 467 473 L477 510 L88 510 Z" fill="#B8D0FF" opacity=".55" />
        {/* Hair silhouette */}
        <path d="M188 199 C172 131 211 77 278 75 C347 73 388 122 377 197 L367 290 L196 290 Z" fill="#25233A" />
        {/* Neck and shoulders */}
        <path d="M259 283 L257 336 C240 352 220 359 197 371 L219 432 L351 432 L373 369 C347 354 326 345 314 329 L311 279 Z" fill="url(#skin)" />
        {/* Clothing */}
        <path d="M257 332 L285 358 L314 329 C342 350 383 354 407 391 L449 510 L142 510 L173 397 C188 365 218 349 257 332 Z" fill="url(#dress)" />
        <path d="M257 332 L285 358 L314 329 L331 350 L285 385 L239 350 Z" fill="#FFFFFF" opacity=".94" />
        {/* Face */}
        <path d="M212 159 C216 117 247 98 284 101 C326 103 350 131 347 180 L337 231 C328 268 305 290 280 291 C251 290 229 267 219 232 Z" fill="url(#skin)" />
        {/* Ears */}
        <ellipse cx="213" cy="210" rx="13" ry="20" fill="#A96449" />
        <ellipse cx="346" cy="210" rx="13" ry="20" fill="#A96449" />
        {/* Hair framing and curls */}
        <path d="M205 202 C184 160 191 115 222 92 C245 74 287 69 319 85 C356 103 370 139 360 184 L345 164 L330 133 C292 147 252 144 224 128 L216 172 Z" fill="#25233A" />
        <path d="M206 155 C189 190 199 242 220 262 L215 207 Z M351 155 C369 188 358 238 339 257 L346 201 Z" fill="#25233A" />
        {/* Face details */}
        <path d="M235 202 Q248 193 260 202" fill="none" stroke="#4A2A28" strokeWidth="4" strokeLinecap="round" />
        <path d="M300 202 Q312 193 325 201" fill="none" stroke="#4A2A28" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="249" cy="211" rx="4" ry="5" fill="#211E2A" />
        <ellipse cx="313" cy="211" rx="4" ry="5" fill="#211E2A" />
        <path d="M278 211 L271 231 Q278 237 285 231" fill="none" stroke="#874B3C" strokeWidth="3" strokeLinecap="round" />
        <path d="M254 248 Q280 271 309 247 Q285 280 254 248 Z" fill="#7B2F39" />
        <path d="M260 249 Q281 257 303 249" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        <ellipse cx="236" cy="232" rx="13" ry="7" fill="#D98E77" opacity=".35" />
        <ellipse cx="325" cy="232" rx="13" ry="7" fill="#D98E77" opacity=".35" />
        {/* Arm behind phone */}
        <path d="M361 371 C382 368 399 381 404 403 L418 445 C424 463 412 477 396 470 L363 419 Z" fill="url(#skin)" />
        {/* Phone */}
        <g className="landing-phone" filter="url(#soft-shadow)" transform="rotate(-8 362 350)">
          <rect x="326" y="264" width="88" height="157" rx="17" fill="#101827" />
          <rect x="331" y="270" width="78" height="145" rx="12" fill="url(#phone)" />
          <rect x="355" y="275" width="30" height="4" rx="2" fill="#6F86B7" />
          <circle cx="370" cy="294" r="12" fill="#FFFFFF" opacity=".12" />
          <path d="M364 294 L369 299 L378 288" fill="none" stroke="#8DD8BC" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="370" y="319" textAnchor="middle" fill="#B8C8E8" fontSize="7" fontWeight="600" letterSpacing="1">SALDO</text>
          <rect x="344" y="326" width="52" height="7" rx="3.5" fill="#FFFFFF" opacity=".9" />
          <rect x="344" y="340" width="40" height="4" rx="2" fill="#8DA6D6" />
          <rect x="342" y="356" width="56" height="34" rx="8" fill="#FFFFFF" opacity=".1" />
          <circle cx="354" cy="368" r="5" fill="#8DD8BC" />
          <rect x="364" y="365" width="26" height="4" rx="2" fill="#FFFFFF" opacity=".9" />
          <rect x="364" y="373" width="19" height="3" rx="1.5" fill="#8DA6D6" />
          <path d="M342 400 H398" stroke="#FFFFFF" strokeOpacity=".14" strokeWidth="1" />
        </g>
        {/* Hand holding phone */}
        <path d="M345 380 C337 365 328 352 330 341 C332 333 341 335 347 344 L357 359 L355 328 C354 316 365 313 369 325 L374 349 L377 330 C379 319 390 322 390 334 L390 356 L396 345 C402 336 412 342 407 354 L397 382 C393 398 378 411 361 407 Z" fill="url(#skin)" />
        <path d="M354 359 L362 371 M374 349 L380 363 M390 356 L389 368" fill="none" stroke="#8D4F3B" strokeWidth="2.5" strokeLinecap="round" />
        {/* Floating benefit badges */}
        <g className="landing-float landing-float-one" filter="url(#soft-shadow)">
          <rect x="30" y="255" width="150" height="66" rx="18" fill="#FFFFFF" />
          <circle cx="59" cy="288" r="17" fill="#E3F8EF" />
          <path d="M51 288 L57 294 L68 281" fill="none" stroke="#16865D" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <text x="83" y="284" fill="#16315B" fontSize="12" fontWeight="700">PIX simples</text>
          <text x="83" y="301" fill="#6B7C98" fontSize="10">No seu ritmo</text>
        </g>
        <g className="landing-float landing-float-two" filter="url(#soft-shadow)">
          <rect x="365" y="170" width="164" height="65" rx="18" fill="#FFFFFF" />
          <circle cx="394" cy="202" r="17" fill="#EAF1FF" />
          <path d="M394 192 V212 M384 202 H404" stroke="#0B4DBB" strokeWidth="2.5" strokeLinecap="round" />
          <text x="419" y="198" fill="#16315B" fontSize="11" fontWeight="700">Tudo no app</text>
          <text x="419" y="214" fill="#6B7C98" fontSize="10">A qualquer hora</text>
        </g>
        <circle cx="132" cy="164" r="5" fill="#F4BC58" className="landing-sparkle" />
        <circle cx="433" cy="294" r="4" fill="#0B4DBB" className="landing-sparkle landing-sparkle-delay" />
        <path d="M438 373 l5 10 10 5 -10 5 -5 10 -5 -10 -10 -5 10 -5 Z" fill="#F4BC58" opacity=".9" className="landing-sparkle" />
      </svg>
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
            <div className="hidden sm:block"><LanguageSwitcher /></div>
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
        <div className="px-4 pb-2 sm:hidden"><LanguageSwitcher /></div>
      </header>

      <main>
        <section className="landing-hero relative">
          <div className="landing-hero-pattern" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-5 px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 md:grid-cols-[1.02fr_.98fr] md:gap-2 md:px-8 md:pb-20 md:pt-14 lg:gap-8 lg:pt-16">
            <div className="relative z-20 max-w-2xl md:py-8">
              <div className="landing-eyebrow inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-wide">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Seu dinheiro. Sua vida. Mais simples.</span>
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
                <span className="inline-flex items-center gap-2"><span className="landing-check">✓</span> Conta digital</span>
                <span className="inline-flex items-center gap-2"><span className="landing-check">✓</span> PIX pelo app</span>
                <span className="inline-flex items-center gap-2"><span className="landing-check">✓</span> Controle na sua mão</span>
              </div>
              <div className="mt-7 sm:hidden"><LanguageSwitcher /></div>
            </div>
            <div className="relative z-10 -mx-3 mt-1 sm:mx-0 md:mt-0">
              <WomanWithPhone />
            </div>
          </div>
        </section>

        <section className="relative border-t border-border/60 bg-background py-14 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-extrabold uppercase tracking-[.22em] text-primary">Feito para acompanhar você</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Seu banco, do seu jeito.</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">Mais praticidade para cuidar do seu dinheiro, com uma experiência digital pensada para o dia a dia.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-3 sm:gap-5">
              {[
                { icon: "↗", title: "PIX sem complicação", description: "Envie e receba dinheiro com praticidade, direto pelo aplicativo." },
                { icon: "◷", title: "Tudo em um só lugar", description: "Consulte suas movimentações e acompanhe sua conta com facilidade." },
                { icon: "⌑", title: "Segurança em primeiro lugar", description: "Acesse sua conta com recursos de segurança pensados para proteger você." },
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
                <p className="text-xs font-bold uppercase tracking-[.2em] text-white/65">Comece hoje</p>
                <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Mais liberdade para o seu dinheiro.</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">Abra sua conta e descubra uma forma mais simples de cuidar das suas finanças.</p>
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
        .landing-art { isolation:isolate; }
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
        @media (prefers-reduced-motion:reduce) { .landing-art-glow,.landing-orb,.landing-phone,.landing-float,.landing-sparkle { animation:none !important; } .landing-feature,.landing-primary-button { transition:none !important; } }
      `}</style>
    </div>
  );
}
