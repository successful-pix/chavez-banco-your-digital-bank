import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/toast";
import { Send, Paperclip, X } from "lucide-react";
import { ReceiptAttachment } from "@/components/receipt-viewer";
import { playNotificationSound } from "@/lib/notify-sound";
import { notifySupportTeam } from "@/lib/support-notify.functions";


export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "Suporte — Chavez Banco" },
      { name: "description", content: "Fale com o time de suporte Chavez Banco." },
    ],
  }),
  component: SupportPage,
});

type Msg = {
  id: string;
  from_admin: boolean;
  subject: string | null;
  body: string;
  image_url: string | null;
  status: string | null;
  priority: string | null;
  created_at: string;
};

function SupportPage() {
  const toast = useToast();
  const notifyTeam = useServerFn(notifySupportTeam);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [unread, setUnread] = useState(0);
  const endRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  // Ids of admin messages already alerted on — prevents repeat sounds/toasts
  const alerted = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  async function load(uid: string) {
    const { data } = await supabase
      .from("support_messages")
      .select("id, from_admin, subject, body, image_url, status, priority, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    if (data) {
      const rows = data as unknown as Msg[];
      setMsgs(rows);
      const incoming = rows.filter((m) => m.from_admin);
      if (!primed.current) {
        // First load: remember existing messages without alerting.
        incoming.forEach((m) => alerted.current.add(m.id));
        primed.current = true;
      } else {
        const fresh = incoming.filter((m) => !alerted.current.has(m.id));
        if (fresh.length > 0) {
          fresh.forEach((m) => alerted.current.add(m.id));
          setUnread((u) => u + fresh.length);
          playNotificationSound();
          toast.push("info", "Nova resposta do suporte");
        }
      }
    }
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: s } = await supabase.auth.getUser();
      if (!s.user) return;
      setUserId(s.user.id);
      await load(s.user.id);

      ch = supabase
        .channel(`support-${s.user.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "support_messages", filter: `user_id=eq.${s.user.id}` },
          () => load(s.user!.id),
        )
        .subscribe();
    })();
    return () => {
      if (ch) supabase.removeChannel(ch);
    };
  }, []);

  async function send() {
    if ((!text.trim() && !file) || !userId) return;
    setSending(true);

    let imageUrl: string | null = null;
    if (file) {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${userId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("support")
          .upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (upErr) throw upErr;
        // Store the storage path (not a short-lived signed URL) so the original
        // file can always be re-signed at view time.
        imageUrl = path;
      } catch (e: any) {
        setSending(false);
        return toast.push("error", e.message ?? "Falha no upload");
      }
    }


    const { data: inserted, error } = await supabase.from("support_messages").insert({
      user_id: userId,
      from_admin: false,
      body: text.trim() || "(anexo)",
      image_url: imageUrl,
      status: "open",
    }).select("id").maybeSingle();
    setSending(false);
    if (error) return toast.push("error", error.message);
    setText("");
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    await load(userId);

    // Notify the support team by email (server-side; deduped by message id).
    if (inserted?.id) {
      const key = `chavez.support.notified.${inserted.id}`;
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, "1");
        notifyTeam({ data: { messageId: inserted.id as string } }).catch(() => {});
      }
    }
  }


  const currentStatus = msgs[msgs.length - 1]?.status ?? "open";
  const currentPriority = msgs[msgs.length - 1]?.priority ?? "normal";

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-9rem)] animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Suporte Chavez</h1>
          <p className="text-sm text-muted-foreground">Respondemos em até 24h úteis.</p>
        </div>
        {msgs.length > 0 && (
          <div className="flex gap-1.5">
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
              currentStatus === "closed" ? "bg-muted text-muted-foreground" :
              currentStatus === "pending" ? "bg-primary/10 text-primary" :
              "bg-success/15 text-success"
            }`}>{currentStatus}</span>
            {currentPriority && currentPriority !== "normal" && (
              <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                currentPriority === "urgent" ? "bg-destructive text-destructive-foreground" :
                currentPriority === "high" ? "bg-gradient-gold text-primary-foreground" :
                "bg-accent"
              }`}>{currentPriority}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border bg-card shadow-card p-4 space-y-3">
        {msgs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            Envie sua primeira mensagem para o suporte.
          </p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.from_admin ? "justify-start" : "justify-end"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                m.from_admin ? "bg-accent text-foreground" : "bg-gradient-primary text-primary-foreground"
              }`}
            >
              {m.image_url && <ReceiptAttachment imageRef={m.image_url} />}

              <div className="whitespace-pre-wrap">{m.body}</div>
              <div className={`text-[10px] mt-1 ${m.from_admin ? "text-muted-foreground" : "text-white/70"}`}>
                {new Date(m.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {file && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border bg-accent px-3 py-2 text-xs">
          <Paperclip className="h-3.5 w-3.5" />
          <span className="truncate flex-1">{file.name}</span>
          <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="mt-3 flex items-end gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl border p-3 hover:bg-accent transition"
          title="Anexar imagem"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Escreva sua mensagem..."
          className="flex-1 rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
        />
        <button
          onClick={send}
          disabled={sending || (!text.trim() && !file)}
          className="rounded-2xl bg-gradient-primary px-4 py-3 text-primary-foreground shadow-elevated disabled:opacity-60 hover:shadow-2xl transition"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
