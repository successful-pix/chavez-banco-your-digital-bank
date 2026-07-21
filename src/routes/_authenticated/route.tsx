import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { Home, Send, CreditCard, User, Bell, MessageSquare, ShieldCheck, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { mode: "signin" } });
  },
  component: Shell,
});

function Shell() {
  const { t } = useI18n();
  const loc = useLocation();
  const [fullName, setFullName] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getUser();
      if (!s.user) return;
      const [{ data: p }, { data: r }, { count }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", s.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", s.user.id).eq("role", "admin").maybeSingle(),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", s.user.id).eq("read", false),
      ]);
      setFullName(p?.full_name || s.user.email || "");
      setIsAdmin(!!r);
      setUnread(count ?? 0);
    })();
  }, [loc.pathname]);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const nav = [
    { to: "/dashboard", label: t("nav.home"), icon: Home },
    { to: "/transfer", label: t("nav.transfer"), icon: Send },
    { to: "/cards", label: t("nav.cards"), icon: CreditCard },
    { to: "/profile", label: t("nav.profile"), icon: User },
  ];
  const secondary = [
    { to: "/kyc", label: "KYC", icon: ShieldCheck },
    { to: "/support", label: t("nav.support"), icon: MessageSquare },
  ];


  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/dashboard"><Logo /></Link>
          <div className="hidden md:flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = loc.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </div>
            {secondary.map(({ to, label, icon: Icon }) => {
              const active = loc.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                to="/admin"
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  loc.pathname.startsWith("/admin") ? "bg-accent text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Shield className="h-4 w-4" />
                Admin
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className="relative rounded-xl border border-border p-2 hover:bg-accent"
              title="Notificações"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground grid place-items-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <LanguageSwitcher />
            <button
              onClick={signOut}
              title={t("nav.signout")}
              className="hidden sm:inline-flex rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
            >
              {t("nav.signout")}
            </button>
            <div className="hidden sm:block max-w-[160px] truncate text-sm font-semibold text-foreground">
              {fullName}
            </div>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6"><Outlet /></main>

      {/* Bottom nav on mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto max-w-6xl grid grid-cols-4">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = loc.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-col items-center justify-center py-2.5 text-[11px] font-semibold ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
