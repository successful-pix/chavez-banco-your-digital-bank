import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, ZoomIn, ZoomOut, ImageOff, Loader2 } from "lucide-react";

const BUCKET = "support";

/**
 * Resolves a stored attachment reference into a usable image URL.
 * - Legacy rows store a full (possibly expired) signed URL -> re-sign from its path.
 * - New rows store the raw storage path -> sign on demand.
 */
export function storagePathFromRef(ref: string): string | null {
  if (!ref) return null;
  if (!/^https?:\/\//i.test(ref)) return ref.replace(/^\/+/, "");
  try {
    const url = new URL(ref);
    const marker = `/${BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

async function signRef(ref: string): Promise<string> {
  const path = storagePathFromRef(ref);
  if (!path) {
    // Not a support-bucket reference (external URL) — use as-is.
    if (/^https?:\/\//i.test(ref)) return ref;
    throw new Error("Caminho do anexo inválido");
  }
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Falha ao assinar URL");
  return data.signedUrl;
}

export function ReceiptAttachment({ imageRef, className }: { imageRef: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  const resolve = useCallback(async () => {
    setFailed(false);
    try {
      setUrl(await signRef(imageRef));
    } catch {
      setUrl(null);
      setFailed(true);
    }
  }, [imageRef]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const u = await signRef(imageRef);
        if (alive) setUrl(u);
      } catch {
        if (alive) setFailed(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [imageRef]);

  if (failed) {
    return (
      <button
        onClick={resolve}
        className={`mb-2 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-[11px] font-semibold opacity-80 ${className ?? ""}`}
      >
        <ImageOff className="h-3.5 w-3.5" /> Não foi possível carregar o comprovante — tentar novamente
      </button>
    );
  }

  if (!url) {
    return (
      <div className={`mb-2 flex h-24 items-center justify-center rounded-lg bg-black/10 ${className ?? ""}`}>
        <Loader2 className="h-4 w-4 animate-spin opacity-70" />
      </div>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`block ${className ?? ""}`} title="Abrir comprovante">
        <img
          src={url}
          alt="Comprovante anexado"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="mb-2 max-h-56 w-auto rounded-lg object-contain cursor-zoom-in"
        />
      </button>
      {open && <ReceiptLightbox src={url} onClose={() => setOpen(false)} onError={() => setFailed(true)} />}
    </>
  );
}

function ReceiptLightbox({ src, onClose, onError }: { src: string; onClose: () => void; onError: () => void }) {
  const [zoom, setZoom] = useState(1);
  const [broken, setBroken] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomRef = useRef(1);
  zoomRef.current = zoom;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const next = Math.min(5, Math.max(1, zoomRef.current * Math.exp(-dy * 0.0015)));
      setZoom(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 animate-in fade-in duration-200">
      <div className="flex items-center justify-end gap-2 p-3">
        <button
          onClick={() => setZoom((z) => Math.max(1, z / 1.4))}
          className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 transition"
          aria-label="Diminuir zoom"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(5, z * 1.4))}
          className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 transition"
          aria-label="Aumentar zoom"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 transition"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        ref={containerRef}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="flex-1 overflow-auto p-4 flex items-center justify-center"
        style={{ touchAction: "pan-x pan-y pinch-zoom", WebkitOverflowScrolling: "touch" }}
      >
        {broken ? (
          <div className="flex flex-col items-center gap-2 text-white/80">
            <ImageOff className="h-8 w-8" />
            <p className="text-sm font-semibold">Não foi possível carregar o comprovante</p>
          </div>
        ) : (
          <img
            src={src}
            alt="Comprovante em tamanho original"
            onError={() => {
              setBroken(true);
              onError();
            }}
            className="max-h-full max-w-full object-contain select-none"
            style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 120ms ease-out" }}
          />
        )}
      </div>
    </div>
  );
}
