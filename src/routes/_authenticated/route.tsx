import { createFileRoute, Outlet, redirect, Link, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n";
import { Home, Send, CreditCard, User, Bell, MessageSquare, ShieldCheck, Shield, Menu, X, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unread, setUnread] = useState(0);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getUser();
      if (!s.user) return;
      const [{ data: p }, { data: r }, { count }] = await Promise.all([
        supabase.from("profiles").select("full_name, avatar_url").eq("id", s.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", s.user.id).eq("role", "admin").maybeSingle(),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", s.user.id).eq("read", false),
      ]);
      setFullName(p?.full_name || s.user.email || "");
      setIsAdmin(!!r);
      setUnread(count ?? 0);
      if (p?.avatar_url) {
        const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(p.avatar_url, 3600);
        setAvatarUrl(signed?.signedUrl ?? null);
      }
    })();
  }, [loc.pathname]);

  useEffect(() => {
    setDrawer(false);
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
    { to: "/notifications", label: "Notificações", icon: Bell },
  ];

  const allItems = [...nav, ...secondary, ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : [])];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setDrawer(true)}
              className="md:hidden rounded-xl border border-border p-2 hover:bg-accent shrink-0"
              aria-label="Abrir menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <Link to="/dashboard" className="shrink-0"><Logo /></Link>
          </div>

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
            {secondary.slice(0, 2).map(({ to, label, icon: Icon }) => {
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

          <div className="flex items-center gap-2 shrink-0">
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
            <ThemeToggle />
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <button
              onClick={signOut}
              title={t("nav.signout")}
              className="hidden md:inline-flex rounded-xl border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent"
            >
              {t("nav.signout")}
            </button>
            <div className="hidden lg:block max-w-[160px] truncate text-sm font-semibold text-foreground">
              {fullName}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawer && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 animate-in fade-in duration-200" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-[82%] max-w-xs bg-background shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between border-b p-4">
              <Logo />
              <button onClick={() => setDrawer(false)} className="rounded-xl border p-2 hover:bg-accent">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-3 border-b p-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-primary/20" />
              ) : (
                <div className="h-11 w-11 rounded-full bg-gradient-primary text-primary-foreground grid place-items-center font-black">
                  {(fullName || "?").charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-bold truncate">{fullName}</div>
                <div className="text-[11px] text-muted-foreground">Chavez Banco</div>
              </div>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {allItems.map(({ to, label, icon: Icon }) => {
                const active = loc.pathname.startsWith(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setDrawer(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                      active ? "bg-accent text-primary" : "text-foreground hover:bg-accent/60"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t p-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
              <button
                onClick={signOut}
                className="inline-flex items-center gap-1.5 rounded-xl bg-destructive/10 text-destructive px-3 py-2 text-xs font-bold hover:bg-destructive/20"
              >
                <LogOut className="h-4 w-4" />
                {t("nav.signout")}
              </button>
            </div>
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 md:pb-8"><Outlet /></main>

      {/* Bottom nav on mobile — primary shortcuts; full menu via hamburger */}
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
