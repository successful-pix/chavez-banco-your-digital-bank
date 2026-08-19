import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { SmileVerify } from "@/components/smile-verify";
import { useToast } from "@/components/toast";
import { PasswordInput } from "@/components/password-input";
import { notifyWelcome, notifyLogin, sendVerificationCode, verifyCode } from "@/lib/user.functions";
import { Fingerprint, X as XIcon } from "lucide-react";
import {
  getSavedAccounts,
  saveAccount,
  forgetAccount,
  biometricSupported,
  enrollBiometric,
  refreshBiometricTokens,
  unlockWithBiometric,
  type SavedAccount,
} from "@/lib/saved-logins";

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
  const doLoginEmail = useServerFn(notifyLogin);
  const doSendCode = useServerFn(sendVerificationCode);
  const doVerifyCode = useServerFn(verifyCode);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [picked, setPicked] = useState<SavedAccount | null>(null);
  const [rememberBio, setRememberBio] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);

  useEffect(() => {
    const list = getSavedAccounts();
    setAccounts(list);
    if (list.length) {
      setPicked(list[0]);
      setEmail(list[0].email);
    }
  }, []);

  function chooseAccount(a: SavedAccount) {
    setPicked(a);
    setEmail(a.email);
    setPw("");
  }

  function useAnotherAccount() {
    setPicked(null);
    setEmail("");
    setPw("");
  }

  async function finishSignIn(userId: string, emailUsed: string, fullName?: string) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name, email_verified")
      .eq("id", userId)
      .maybeSingle();
    if (prof && (prof as any).email_verified === false) {
      try { await doSendCode(); } catch { /* ignore */ }
      setLoading(false);
      setNeedsVerify(true);
      toast.push("success", "Enviamos um código para o seu e-mail");
      return false;
    }
    const name = (prof as any)?.full_name || fullName || emailUsed;
    saveAccount(emailUsed, name);
    const { data: sess } = await supabase.auth.getSession();
    const tokens = sess.session
      ? { access_token: sess.session.access_token, refresh_token: sess.session.refresh_token }
      : null;
    if (tokens) {
      refreshBiometricTokens(emailUsed, tokens);
      if (rememberBio && biometricSupported()) {
        try {
          const ok = await enrollBiometric(emailUsed, name, tokens);
          if (ok) toast.push("success", "Biometria ativada neste dispositivo");
        } catch {
          toast.push("error", "Não foi possível ativar a biometria");
        }
      }
    }
    return true;
  }

  async function signInWithFingerprint(a: SavedAccount) {
    setBioBusy(true);
    try {
      const tokens = await unlockWithBiometric(a.email);
      if (!tokens) {
        toast.push("error", "Biometria não reconhecida");
        return;
      }
      const { data, error } = await supabase.auth.setSession(tokens);
      if (error || !data.session) {
        toast.push("error", "Sessão expirada — entre com a senha uma vez");
        return;
      }
      saveAccount(a.email, a.name);
      refreshBiometricTokens(a.email, {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      toast.push("success", "Bem-vindo de volta!");
      doLoginEmail().catch(() => {});
      nav({ to: "/dashboard" });
    } catch {
      toast.push("error", "Falha na biometria");
    } finally {
      setBioBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data: signInRes, error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) {
      setLoading(false);
      toast.push("error", error.message);
      return;
    }
    // Check email verification on profile before allowing app access
    if (signInRes.user) {
      const ok = await finishSignIn(signInRes.user.id, email.trim().toLowerCase());
      if (!ok) return;
    }
    setLoading(false);
    toast.push("success", "Bem-vindo!");
    doLoginEmail().catch(() => {});
    nav({ to: "/dashboard" });
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 4) return toast.push("error", "Código inválido");
    setLoading(true);
    try {
      const res = await doVerifyCode({ data: { code: code.trim() } });
      if (!res?.ok) {
        setLoading(false);
        return toast.push("error", res?.error === "expired" ? "Código expirado" : "Código inválido");
      }
      toast.push("success", "Conta ativada!");
      doLoginEmail().catch(() => {});
      nav({ to: "/dashboard" });
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setResending(true);
    try { await doSendCode(); toast.push("success", "Código reenviado"); }
    catch { toast.push("error", "Falha ao reenviar"); }
    finally { setResending(false); }
  }

  if (needsVerify) {
    return (
      <form onSubmit={submitCode} className="space-y-4">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 grid place-items-center text-primary text-2xl">✉️</div>
          <h3 className="mt-3 font-bold text-foreground">Verifique seu e-mail</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu e-mail ainda não foi verificado. Enviamos um código de 6 dígitos para <b>{email}</b>.
          </p>
        </div>
        <input
          inputMode="numeric"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="w-full text-center text-2xl tracking-[0.6em] font-black rounded-xl border border-input bg-background px-3 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          disabled={loading}
          className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
        >
          {loading ? t("common.loading") : "Ativar conta"}
        </button>
        <button type="button" onClick={resend} disabled={resending} className="w-full text-xs font-semibold text-primary hover:underline">
          {resending ? "Enviando..." : "Reenviar código"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {accounts.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-semibold text-foreground/80">Contas salvas neste dispositivo</span>
          {accounts.map((a) => (
            <div
              key={a.email}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                picked?.email === a.email ? "border-primary bg-accent/60" : "border-border hover:bg-accent/40"
              }`}
            >
              <button type="button" onClick={() => chooseAccount(a)} className="flex flex-1 items-center gap-3 min-w-0 text-left">
                <span className="h-9 w-9 shrink-0 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center text-sm font-black">
                  {(a.name || a.email).charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-foreground">{a.name || a.email}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{a.email}</span>
                </span>
              </button>
              {a.biometric && (
                <button
                  type="button"
                  disabled={bioBusy}
                  onClick={() => signInWithFingerprint(a)}
                  title="Entrar com biometria"
                  className="rounded-xl border border-primary/40 bg-primary/10 p-2 text-primary disabled:opacity-60"
                >
                  <Fingerprint className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  forgetAccount(a.email);
                  const list = getSavedAccounts();
                  setAccounts(list);
                  if (picked?.email === a.email) useAnotherAccount();
                }}
                title="Remover conta salva"
                className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          {picked && (
            <button type="button" onClick={useAnotherAccount} className="text-xs font-semibold text-primary hover:underline">
              Usar outra conta
            </button>
          )}
        </div>
      )}

      {picked ? (
        <div className="rounded-xl bg-accent/50 px-3 py-2 text-xs font-semibold text-foreground/80">
          Entrando como <b>{picked.name || picked.email}</b>
        </div>
      ) : (
        <Input label={t("auth.email")} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      )}
      <PasswordInput label={t("auth.password")} required value={pw} onChange={(e) => setPw(e.target.value)} />
      {biometricSupported() && (
        <label className="flex items-center gap-2 text-xs font-semibold text-foreground/80">
          <input type="checkbox" checked={rememberBio} onChange={(e) => setRememberBio(e.target.checked)} className="h-4 w-4 accent-primary" />
          Ativar entrada por biometria neste dispositivo
        </label>
      )}
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
  const doWelcome = useServerFn(notifyWelcome);
  const doSendCode = useServerFn(sendVerificationCode);
  const doVerifyCode = useServerFn(verifyCode);
  const [step, setStep] = useState<"form" | "face" | "code">("form");
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
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);

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
    const { data: signUp, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: "https://chavezbanco.online",
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
// Auto-confirm is enabled server-side, so a session should exist. Send code.
try {
  await doSendCode();
} catch (e) {
  console.warn("send code failed", e);
}

setLoading(false);
setStep("code");
}
  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length < 4) return toast.push("error", "Código inválido");
    setLoading(true);
    try {
      const res = await doVerifyCode({ data: { code: code.trim() } });
      if (!res?.ok) {
        setLoading(false);
        return toast.push("error", res?.error === "expired" ? "Código expirado" : "Código inválido");
      }
      toast.push("success", "Conta ativada!");
      doWelcome().catch(() => {});
      nav({ to: "/dashboard" });
    } catch (err: any) {
      toast.push("error", err?.message ?? "Falha ao verificar");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      await doSendCode();
      toast.push("success", "Código reenviado");
    } catch {
      toast.push("error", "Falha ao reenviar");
    } finally {
      setResending(false);
    }
  }

  if (step === "code") {
    return (
      <form onSubmit={submitCode} className="space-y-4">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 grid place-items-center text-primary text-2xl">✉️</div>
          <h3 className="mt-3 font-bold text-foreground">Ative sua conta</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Enviamos um código de 6 dígitos para <b>{data.email}</b>.
          </p>
        </div>
        <input
          inputMode="numeric"
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          placeholder="000000"
          className="w-full text-center text-2xl tracking-[0.6em] font-black rounded-xl border border-input bg-background px-3 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          disabled={loading}
          className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
        >
          {loading ? t("common.loading") : "Ativar conta"}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={resending}
          className="w-full text-xs font-semibold text-primary hover:underline"
        >
          {resending ? "Enviando..." : "Reenviar código"}
        </button>
      </form>
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
        <PasswordInput label={t("auth.password")} required value={data.password} onChange={(e) => up("password", e.target.value)} />
        <PasswordInput label={t("auth.password.confirm")} required value={data.confirm} onChange={(e) => up("confirm", e.target.value)} />
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
