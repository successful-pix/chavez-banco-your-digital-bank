import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

const MODEL_URL = "/models";

export function SmileVerify({ onVerified }: { onVerified: () => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "detecting" | "success" | "error">("idle");
  const [err, setErr] = useState("");

  useEffect(() => () => stopCamera(), []);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    setErr("");
    setStatus("loading");
    try {
      const faceapi = await import("face-api.js");
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("detecting");
      const started = Date.now();
      const loop = async () => {
        if (!videoRef.current || status === "success") return;
        const opts = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        const det = await faceapi.detectSingleFace(videoRef.current, opts).withFaceExpressions();
        if (det && det.expressions.happy > 0.75) {
          setStatus("success");
          stopCamera();
          setTimeout(onVerified, 500);
          return;
        }
        if (Date.now() - started > 20000) {
          setStatus("error");
          setErr(t("auth.face.no_smile"));
          stopCamera();
          return;
        }
        requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      console.error(e);
      setStatus("error");
      setErr(t("auth.error.generic"));
      stopCamera();
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <h3 className="font-bold text-foreground">{t("auth.face.title")}</h3>
      <p className="text-sm text-muted-foreground mt-1">{t("auth.face.instruction")}</p>

      <div className="mt-4 aspect-square w-full max-w-xs mx-auto overflow-hidden rounded-2xl bg-black relative">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        {status === "success" && (
          <div className="absolute inset-0 flex items-center justify-center bg-success/80 text-white font-semibold">
            ✓ {t("auth.face.success")}
          </div>
        )}
        {status === "idle" && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
            📷
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-sm">
        {status === "loading" && <span className="text-muted-foreground">{t("auth.face.loading")}</span>}
        {status === "detecting" && <span className="text-primary font-medium">{t("auth.face.detecting")}</span>}
        {status === "error" && <span className="text-destructive">{err}</span>}
      </div>

      {(status === "idle" || status === "error") && (
        <button
          type="button"
          onClick={start}
          className="mt-3 w-full rounded-xl bg-gradient-primary text-primary-foreground font-semibold py-2.5 shadow-elevated hover:opacity-95"
        >
          {status === "error" ? t("auth.face.retry") : t("auth.face.start")}
        </button>
      )}
    </div>
  );
}
