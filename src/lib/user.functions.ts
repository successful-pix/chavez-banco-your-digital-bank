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

export const sendVerificationCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const p = await getProfile(context.supabase, context.userId);
    if (!p?.email) return { ok: false, error: "no email" };
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .update({ verification_code: code, verification_expires_at: expires })
      .eq("id", context.userId);
    const { emails } = await import("@/lib/email.server");

const emailResult = await emails.verificationCode(
  p.email,
  p.full_name ?? "",
  code
);
console.log("VERIFICATION EMAIL RESULT:", emailResult);

return { ok: true, emailResult };
  });
  
export const verifyCode = createServerFn({ method: "POST" })

  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ code: z.string().min(4).max(10) }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("profiles")
      .select("verification_code, verification_expires_at, email_verified")
      .eq("id", context.userId)
      .maybeSingle();
    if (!row) return { ok: false, error: "not found" };
    if (row.email_verified) return { ok: true };
    if (!row.verification_code || row.verification_code !== data.code.trim()) {
      return { ok: false, error: "invalid" };
    }
    if (row.verification_expires_at && new Date(row.verification_expires_at) < new Date()) {
      return { ok: false, error: "expired" };
    }
    await supabaseAdmin
      .from("profiles")
      .update({ email_verified: true, verification_code: null, verification_expires_at: null })
      .eq("id", context.userId);
    return { ok: true };
  });

