import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { SmileVerify } from "@/components/smile-verify";
import { useToast } from "@/components/toast";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar — Chavez Banco" },
      { name: "description", content: "Acesse ou crie sua conta Chavez Banco." },
      { property: "og:title", content: "Entrar — Chavez Banco" },
      { property: "og:description", content: "Acesse ou crie sua conta Chavez Banco." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/"><Logo /></Link>
          <LanguageSwitcher />
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-10">
        <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
          <div className="grid grid-cols-2 border-b">
            <TabBtn active={mode === "signin"} onClick={() => nav({ to: "/auth", search: { mode: "signin" } })}>
              Entrar
            </TabBtn>
            <TabBtn active={mode === "signup"} onClick={() => nav({ to: "/auth", search: { mode: "signup" } })}>
              Criar conta
            </TabBtn>
          </div>
          <div className="p-6">
            {mode === "signup" ? <SignUp /> : <SignIn />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`py-3 text-sm font-semibold transition ${
        active ? "bg-gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
      }`}
    >
      {children}
    </button>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, className, ...rest } = props;
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground/80">{label}</span>
      <input
        {...rest}
        className={`mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${className ?? ""}`}
      />
    </label>
  );
}

function SignIn() {
  const { t } = useI18n();
  const nav = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) {
      toast.push("error", error.message);
      return;
    }
    toast.push("success", "Bem-vindo!");
    nav({ to: "/dashboard" });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label={t("auth.email")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <Input label={t("auth.password")} type="password" required value={pw} onChange={(e) => setPw(e.target.value)} />
      <button
        disabled={loading}
        className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
      >
        {loading ? t("common.loading") : t("auth.signin.button")}
      </button>
      <div className="text-center">
        <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
          {t("auth.forgot")}
        </Link>
      </div>
    </form>
  );
}

function SignUp() {
  const { t } = useI18n();
  const nav = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState<"form" | "face" | "done">("form");
  const [data, setData] = useState({
    full_name: "",
    date_of_birth: "",
    phone: "",
    email: "",
    password: "",
    confirm: "",
    cpf: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  function up(k: keyof typeof data, v: string) {
    setData((p) => ({ ...p, [k]: v }));
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (data.password.length < 8) return toast.push("error", t("auth.password.min"));
    if (data.password !== data.confirm) return toast.push("error", t("auth.password.mismatch"));
    setStep("face");
  }

  async function completeSignup() {
    setLoading(true);
    const redirect = typeof window !== "undefined" ? window.location.origin : undefined;
    const { data: signUp, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirect,
        data: {
          full_name: data.full_name,
          phone: data.phone,
          cpf: data.cpf,
          date_of_birth: data.date_of_birth,
        },
      },
    });
    if (error) {
      setLoading(false);
      toast.push("error", error.message);
      setStep("form");
      return;
    }

    // Upload avatar if provided and session is available
    if (photo && signUp.user) {
      try {
        const path = `${signUp.user.id}/avatar-${Date.now()}-${photo.name}`;
        const { error: upErr } = await supabase.storage.from("avatars").upload(path, photo, { upsert: true });
        if (!upErr) {
          await supabase.from("profiles").update({ avatar_url: path }).eq("id", signUp.user.id);
        }
      } catch (e) {
        console.warn("avatar upload failed", e);
      }
    }

    setLoading(false);
    if (signUp.session) {
      toast.push("success", "Conta criada!");
      nav({ to: "/dashboard" });
    } else {
      setStep("done");
    }
  }

  if (step === "done") {
    return (
      <div className="text-center py-6">
        <div className="mx-auto h-14 w-14 rounded-full bg-success/15 grid place-items-center text-success text-2xl">✓</div>
        <h3 className="mt-4 font-bold text-foreground">Quase lá!</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t("auth.check.email")}</p>
        <Link to="/auth" search={{ mode: "signin" }} className="mt-4 inline-block text-sm font-semibold text-primary">
          {t("auth.signin.button")}
        </Link>
      </div>
    );
  }

  if (step === "face") {
    return (
      <div className="space-y-4">
        <SmileVerify onVerified={completeSignup} />
        {loading && <p className="text-center text-sm text-muted-foreground">{t("common.loading")}</p>}
        <button
          type="button"
          onClick={() => setStep("form")}
          className="w-full text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          ← {t("common.cancel")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submitForm} className="space-y-3">
      <Input label={t("auth.fullname")} required value={data.full_name} onChange={(e) => up("full_name", e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label={t("auth.dob")} type="date" required value={data.date_of_birth} onChange={(e) => up("date_of_birth", e.target.value)} />
        <Input label={t("auth.phone")} placeholder="+55 11 90000-0000" required value={data.phone} onChange={(e) => up("phone", e.target.value)} />
      </div>
      <Input label={t("auth.cpf")} required value={data.cpf} onChange={(e) => up("cpf", e.target.value)} />
      <Input label={t("auth.email")} type="email" required value={data.email} onChange={(e) => up("email", e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Input label={t("auth.password")} type="password" required value={data.password} onChange={(e) => up("password", e.target.value)} />
        <Input label={t("auth.password.confirm")} type="password" required value={data.confirm} onChange={(e) => up("confirm", e.target.value)} />
      </div>
      <label className="block">
        <span className="text-xs font-semibold text-foreground/80">{t("auth.photo")}</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
          className="mt-1 w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-primary file:font-semibold"
        />
      </label>
      <button className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated">
        Continuar
      </button>
    </form>
  );
}
