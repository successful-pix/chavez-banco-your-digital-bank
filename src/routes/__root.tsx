import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { I18nProvider } from "@/lib/i18n";
import { ToastProvider } from "@/components/toast";
import { ThemeProvider } from "@/lib/theme";
import { InstallPrompt } from "@/components/install-prompt";
import { SplashScreen } from "@/components/splash-screen";
import { initInstallPrompt, registerPwa } from "@/lib/pwa-register";

function NotFoundComponent() { return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-black text-primary">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h2><p className="mt-2 text-sm text-muted-foreground">A página que você procura não existe.</p><div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-elevated">Ir para o início</Link></div></div></div>; }
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) { console.error(error); const router = useRouter(); useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]); return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold text-foreground">Algo deu errado</h1><p className="mt-2 text-sm text-muted-foreground">Tente novamente ou volte para o início.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Tentar novamente</button><a href="/" className="rounded-xl border px-4 py-2 text-sm font-semibold">Início</a></div></div></div>; }

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [
    { charSet: "utf-8" },
    { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" },
    { title: "Chavez Banco — Banco digital premium do Brasil" },
    { name: "description", content: "Abra sua conta Chavez Banco e tenha PIX, TED, cartões e segurança bancária. 100% digital." },
    { name: "theme-color", content: "#0B4DBB" },
    { property: "og:title", content: "Chavez Banco — Banco digital premium do Brasil" },
    { property: "og:description", content: "Abra sua conta Chavez Banco e tenha PIX, TED, cartões e segurança bancária. 100% digital." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Chavez Banco — Banco digital premium do Brasil" },
    { name: "twitter:description", content: "Abra sua conta Chavez Banco e tenha PIX, TED, cartões e segurança bancária. 100% digital." },
    { property: "og:image", content: "https://www.chavezbanco.online/og-image.png" },
    { property: "og:image:width", content: "1200" }, { property: "og:image:height", content: "630" },
    { name: "twitter:image", content: "https://www.chavezbanco.online/og-image.png" },
  ], links: [
    { rel: "stylesheet", href: appCss }, { rel: "manifest", href: "/manifest.webmanifest" },
    { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" }, { rel: "icon", type: "image/png", sizes: "192x192", href: "/favicon-32.png" },
    { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }, { rel: "preconnect", href: "https://fonts.googleapis.com" },
    { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" },
  ] }), shellComponent: RootShell, component: RootComponent, notFoundComponent: NotFoundComponent, errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) { return <html lang="pt-BR"><head><HeadContent /></head><body>{children}<Scripts /></body></html>; }
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    initInstallPrompt();
    registerPwa();
    const getTarget = (event: Event) => event.target instanceof Element ? event.target : null;
    const preventContextMenu = (event: MouseEvent) => {
      const target = getTarget(event);
      if (target?.closest("[data-allow-context-menu]")) return;
      event.preventDefault();
    };
    const preventCopy = (event: ClipboardEvent) => {
      const target = getTarget(event);
      if (target?.closest("[data-allow-copy]")) return;
      event.preventDefault();
    };
    const preventCut = (event: ClipboardEvent) => {
      const target = getTarget(event);
      if (target?.closest("input, textarea, [contenteditable=\"true\"]")) return;
      event.preventDefault();
    };
    const preventGestureZoom = (event: Event) => { event.preventDefault(); };
    const preventMultiTouchZoom = (event: TouchEvent) => { if (event.touches.length > 1) event.preventDefault(); };
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("copy", preventCopy);
    document.addEventListener("cut", preventCut);
    document.addEventListener("gesturestart", preventGestureZoom, { passive: false });
    document.addEventListener("gesturechange", preventGestureZoom, { passive: false });
    document.addEventListener("gestureend", preventGestureZoom, { passive: false });
    document.addEventListener("touchmove", preventMultiTouchZoom, { passive: false });
    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("cut", preventCut);
      document.removeEventListener("gesturestart", preventGestureZoom);
      document.removeEventListener("gesturechange", preventGestureZoom);
      document.removeEventListener("gestureend", preventGestureZoom);
      document.removeEventListener("touchmove", preventMultiTouchZoom);
    };
  }, []);
  return <QueryClientProvider client={queryClient}><ThemeProvider><I18nProvider><ToastProvider><SplashScreen /><Outlet /><InstallPrompt /></ToastProvider></I18nProvider></ThemeProvider></QueryClientProvider>;
}