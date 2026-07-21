import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/toast";
import { Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "Suporte — Chavez Banco" },
      { name: "description", content: "Fale com o time de suporte Chavez Banco." },
    ],
  }),
  component: SupportPage,
});

type Msg = { id: string; from_admin: boolean; subject: string | null; body: string; created_at: string };

function SupportPage() {
  const toast = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function load(uid: string) {
    const { data } = await supabase
      .from("support_messages")
      .select("id, from_admin, subject, body, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    if (data) setMsgs(data as unknown as Msg[]);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getUser();
      if (!s.user) return;
      setUserId(s.user.id);
      await load(s.user.id);

      const ch = supabase
        .channel(`support-${s.user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_messages", filter: `user_id=eq.${s.user.id}` },
          () => load(s.user!.id),
        )
        .subscribe();
      return () => {
        supabase.removeChannel(ch);
      };
    })();
  }, []);

  async function send() {
    if (!text.trim() || !userId) return;
    setSending(true);
    const { error } = await supabase.from("support_messages").insert({
      user_id: userId,
      from_admin: false,
      body: text.trim(),
    });
    setSending(false);
    if (error) return toast.push("error", error.message);
    setText("");
    await load(userId);
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-9rem)]">
      <div className="mb-3">
        <h1 className="text-2xl font-black tracking-tight">Suporte Chavez</h1>
        <p className="text-sm text-muted-foreground">Respondemos em até 24h úteis.</p>
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border bg-card shadow-card p-4 space-y-3">
        {msgs.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">
            Envie sua primeira mensagem para o suporte.
          </p>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.from_admin ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                m.from_admin ? "bg-accent text-foreground" : "bg-gradient-primary text-primary-foreground"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.body}</div>
              <div className={`text-[10px] mt-1 ${m.from_admin ? "text-muted-foreground" : "text-white/70"}`}>
                {new Date(m.created_at).toLocaleString("pt-BR")}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Escreva sua mensagem..."
          className="flex-1 rounded-2xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="rounded-2xl bg-gradient-primary px-4 py-3 text-primary-foreground shadow-elevated disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
