import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Best-effort in-process guard against duplicate sends (re-renders / reconnects).
// The authoritative dedupe is the message id: a message already flagged
// read_by_admin=false + notified marker in this set is never re-sent.
const notified = new Set<string>();

/**
 * Customer -> support team email notification for a freshly inserted support message.
 * Verifies (via RLS-scoped client) that the message belongs to the caller,
 * so nobody can trigger notifications for another customer's conversation.
 */
export const notifySupportTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ messageId: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    if (notified.has(data.messageId)) return { skipped: "duplicate" as const };

    const { data: msg } = await context.supabase
      .from("support_messages")
      .select("id, user_id, body, from_admin, created_at")
      .eq("id", data.messageId)
      .maybeSingle();

    if (!msg || msg.user_id !== context.userId || msg.from_admin) {
      return { skipped: "not-eligible" as const };
    }
    notified.add(data.messageId);

    const { data: p } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();

    const inbox = process.env["SUPPORT_NOTIFY_EMAIL"] || "support@chavezbanco.online";
    const { emails } = await import("@/lib/email.server");
    const when = new Date(msg.created_at as string).toLocaleString("pt-BR");

    try {
      await emails.supportNewMessageToTeam(
        inbox,
        p?.full_name ?? "",
        p?.email ?? "",
        String(msg.body ?? ""),
        when,
        context.userId,
      );
    } catch (e) {
      notified.delete(data.messageId);
      console.error("[email] support team notify", e);
      return { ok: false as const };
    }
    return { ok: true as const };
  });
