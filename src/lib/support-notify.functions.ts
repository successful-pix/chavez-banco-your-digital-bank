import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const notified = new Set<string>();

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

    const { data: p } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();

    const { data: adminEmails, error: adminEmailError } = await context.supabase.rpc("get_support_admin_emails");
    if (adminEmailError) {
      console.error("[email] admin recipient lookup", adminEmailError);
      return { ok: false as const };
    }

    const recipients = Array.from(new Set((Array.isArray(adminEmails) ? adminEmails : []).filter((email): email is string => typeof email === "string" && email.trim().length > 0).map((email) => email.trim().toLowerCase())));
    if (recipients.length === 0) return { skipped: "no-admin-recipients" as const };

    notified.add(data.messageId);
    const { emails } = await import("@/lib/email.server");
    const when = new Date(msg.created_at as string).toLocaleString("pt-BR");

    try {
      await Promise.all(recipients.map((inbox) =>
        emails.supportNewMessageToTeam(
          inbox,
          p?.full_name ?? "",
          p?.email ?? "",
          String(msg.body ?? ""),
          when,
          context.userId,
        )
      ));
    } catch (e) {
      notified.delete(data.messageId);
      console.error("[email] support team notify", e);
      return { ok: false as const };
    }
    return { ok: true as const };
  });