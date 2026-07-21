import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };
type Ctx = { push: (kind: Toast["kind"], message: string) => void };

const ToastCtx = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((kind: Toast["kind"], message: string) => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, kind, message }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed z-[1000] bottom-4 right-4 flex flex-col gap-2 max-w-[92vw]">
        {items.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-elevated text-sm font-medium text-white animate-in slide-in-from-bottom-2 ${
              t.kind === "success"
                ? "bg-success"
                : t.kind === "error"
                ? "bg-destructive"
                : "bg-primary"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) throw new Error("useToast requires ToastProvider");
  return c;
}

// Convenience hook to auto-clear a local message after N ms
export function useAutoClear(setter: (v: string) => void, ms = 4000) {
  useEffect(() => {
    const id = setTimeout(() => setter(""), ms);
    return () => clearTimeout(id);
  }, [setter, ms]);
}
