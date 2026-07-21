import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/toast";
import { Upload, CheckCircle2, Clock, XCircle, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/kyc")({
  head: () => ({
    meta: [
      { title: "Verificação KYC — Chavez Banco" },
      { name: "description", content: "Envie seus documentos para verificação de identidade." },
    ],
  }),
  component: KycPage,
});

type Doc = { id: string; doc_type: string; storage_path: string; status: string; notes: string | null; created_at: string };

const DOC_TYPES = [
  { id: "cpf", label: "CPF" },
  { id: "rg", label: "RG" },
  { id: "cnh", label: "CNH" },
  { id: "passport", label: "Passaporte" },
  { id: "selfie", label: "Selfie com documento" },
];

function KycPage() {
  const toast = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [profileStatus, setProfileStatus] = useState<string>("pending");
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    const { data: s } = await supabase.auth.getUser();
    if (!s.user) return;
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from("kyc_documents").select("*").eq("user_id", s.user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("kyc_status").eq("id", s.user.id).maybeSingle(),
    ]);
    if (d) setDocs(d as unknown as Doc[]);
    if (p) setProfileStatus(p.kyc_status);
  }

  useEffect(() => {
    load();
  }, []);

  async function onUpload(docType: string, file: File) {
    setUploading(docType);
    const { data: s } = await supabase.auth.getUser();
    if (!s.user) return;
    const ext = file.name.split(".").pop() || "bin";
    const path = `${s.user.id}/${docType}-${Date.now()}.${ext}`;
    const { error: uErr } = await supabase.storage.from("kyc").upload(path, file, { upsert: true });
    if (uErr) {
      setUploading(null);
      return toast.push("error", uErr.message);
    }
    const { error: iErr } = await supabase.from("kyc_documents").insert({
      user_id: s.user.id,
      doc_type: docType,
      storage_path: path,
      status: "pending",
    });
    setUploading(null);
    if (iErr) return toast.push("error", iErr.message);
    toast.push("success", "Documento enviado!");
    load();
  }

  const StatusIcon = ({ s }: { s: string }) =>
    s === "approved" ? <CheckCircle2 className="h-4 w-4 text-success" /> :
    s === "rejected" ? <XCircle className="h-4 w-4 text-destructive" /> :
    <Clock className="h-4 w-4 text-primary" />;

  const StatusLabel = ({ s }: { s: string }) => (
    <span className={`text-xs font-semibold ${
      s === "approved" ? "text-success" : s === "rejected" ? "text-destructive" : "text-primary"
    }`}>
      {s === "approved" ? "Aprovado" : s === "rejected" ? "Rejeitado" : "Em análise"}
    </span>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Verificação KYC</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Status da conta: <StatusLabel s={profileStatus} />
        </p>
      </div>

      <div className="grid gap-3">
        {DOC_TYPES.map((dt) => {
          const existing = docs.find((d) => d.doc_type === dt.id);
          return (
            <div key={dt.id} className="rounded-2xl border bg-card shadow-card p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-accent text-primary grid place-items-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{dt.label}</div>
                  {existing ? (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StatusIcon s={existing.status} />
                      <StatusLabel s={existing.status} />
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Nenhum documento enviado</div>
                  )}
                  {existing?.notes && (
                    <div className="text-xs text-muted-foreground mt-1">Nota: {existing.notes}</div>
                  )}
                </div>
              </div>
              <div>
                <input
                  ref={(el) => { fileRefs.current[dt.id] = el; }}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(dt.id, f);
                    e.target.value = "";
                  }}
                />
                <button
                  onClick={() => fileRefs.current[dt.id]?.click()}
                  disabled={uploading === dt.id}
                  className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-accent disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {uploading === dt.id ? "Enviando..." : existing ? "Reenviar" : "Enviar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
