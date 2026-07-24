import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { canInstall, promptInstall } from "@/lib/pwa-register";

export function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onInstallable = () => {
      const dismissed = typeof window !== "undefined" && window.localStorage.getItem("chavez.install.dismissed") === "1";
      if (!dismissed && canInstall()) setShow(true);
    };
    const onInstalled = () => setShow(false);
    window.addEventListener("pwa:installable", onInstallable);
    window.addEventListener("pwa:installed", onInstalled);
    if (canInstall()) onInstallable();
    return () => {
      window.removeEventListener("pwa:installable", onInstallable);
      window.removeEventListener("pwa:installed", onInstalled);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-3 md:inset-x-auto md:right-4 z-40 max-w-sm md:mx-0 mx-auto rounded-2xl border bg-card shadow-elevated p-4 flex items-start gap-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="h-10 w-10 rounded-xl bg-gradient-primary text-primary-foreground grid place-items-center shrink-0">
        <Download className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-foreground">Instalar Chavez Banco</div>
        <div className="text-xs text-muted-foreground mt-0.5">Acesso rápido pela tela inicial, com experiência de app.</div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={async () => {
              const ok = await promptInstall();
              if (ok) setShow(false);
            }}
            className="rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
          >
            Instalar
          </button>
          <button
            onClick={() => {
              window.localStorage.setItem("chavez.install.dismissed", "1");
              setShow(false);
            }}
            className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
          >
            Agora não
          </button>
        </div>
      </div>
      <button
        onClick={() => {
          window.localStorage.setItem("chavez.install.dismissed", "1");
          setShow(false);
        }}
        className="shrink-0 rounded-lg p-1 hover:bg-accent"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
