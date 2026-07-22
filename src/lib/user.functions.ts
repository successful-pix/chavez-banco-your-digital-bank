import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getProfile(supabase: any, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();
  return data as { email: string | null; full_name: string | null } | null;
}

export const notifyWelcome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await getProfile(context.supabase, context.userId);
    if (!p?.email) return { skipped: true };
    const { emails } = await import("@/lib/email.server");
    return emails.welcome(p.email, p.full_name ?? "");
  });

export const notifyLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await getProfile(context.supabase, context.userId);
    if (!p?.email) return { skipped: true };
    const { emails } = await import("@/lib/email.server");
    return emails.login(p.email, p.full_name ?? "");
  });

export const notifyTransfer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      amount: z.number().positive(),
      kind: z.string().max(30),
      recipient: z.string().max(160).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const p = await getProfile(context.supabase, context.userId);
    if (!p?.email) return { skipped: true };
    const { emails } = await import("@/lib/email.server");
    return emails.transfer(p.email, p.full_name ?? "", data.amount, data.kind, data.recipient ?? null);
  });
