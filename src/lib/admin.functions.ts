import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden: admin only");
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email, phone, cpf, agencia, account_number, balance, kyc_status, face_verified, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const adminListKyc = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("kyc_documents")
      .select("id, user_id, doc_type, storage_path, status, notes, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  });

export const adminSetKycStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      docId: z.string().uuid(),
      userId: z.string().uuid(),
      status: z.enum(["approved", "rejected", "pending"]),
      notes: z.string().max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("kyc_documents")
      .update({ status: data.status, notes: data.notes ?? null })
      .eq("id", data.docId);
    if (data.status === "approved") {
      await supabaseAdmin.from("profiles").update({ kyc_status: "approved" }).eq("id", data.userId);
    } else if (data.status === "rejected") {
      await supabaseAdmin.from("profiles").update({ kyc_status: "rejected" }).eq("id", data.userId);
    }
    return { ok: true };
  });

export const adminAdjustBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      amount: z.number().positive(),
      direction: z.enum(["in", "out"]),
      type: z.enum(["deposit", "withdrawal", "pix", "ted", "doc", "internal", "international_transfer"]),
      description: z.string().max(300).optional(),
      sender_name: z.string().max(150).optional(),
      sender_account: z.string().max(50).optional(),
      sender_bank: z.string().max(100).optional(),
      recipient_name: z.string().max(150).optional(),
      recipient_account: z.string().max(50).optional(),
      recipient_bank: z.string().max(100).optional(),
      recipient_agencia: z.string().max(20).optional(),
      pix_key: z.string().max(150).optional(),
      created_at: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile, error: perr } = await supabaseAdmin
      .from("profiles")
      .select("balance, full_name, account_number")
      .eq("id", data.userId)
      .maybeSingle();
    if (perr || !profile) throw new Error("User not found");

    const current = Number(profile.balance);
    const delta = data.direction === "in" ? data.amount : -data.amount;
    const next = current + delta;
    if (next < 0) throw new Error("Would result in negative balance");

    const insertPayload = {
      user_id: data.userId,
      type: data.type,
      direction: data.direction,
      amount: data.amount,
      description: data.description ?? null,
      sender_name: data.sender_name ?? null,
      sender_account: data.sender_account ?? null,
      sender_bank: data.sender_bank ?? null,
      recipient_name: data.recipient_name ?? profile.full_name,
      recipient_account: data.recipient_account ?? profile.account_number,
      recipient_bank: data.recipient_bank ?? null,
      recipient_agencia: data.recipient_agencia ?? null,
      pix_key: data.pix_key ?? null,
      status: "completed",
      ...(data.created_at ? { created_at: data.created_at } : {}),
    };

    const { data: tx, error: txErr } = await supabaseAdmin
      .from("transactions")
      .insert(insertPayload)
      .select("id")
      .single();
    if (txErr) throw txErr;


    await supabaseAdmin.from("profiles").update({ balance: next }).eq("id", data.userId);
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      title: data.direction === "in" ? "Depósito recebido" : "Débito realizado",
      body: `${data.direction === "in" ? "+" : "−"} R$ ${data.amount.toFixed(2)} — ${data.description ?? data.type}`,
    });

    return { ok: true, transactionId: tx.id, newBalance: next };
  });

export const adminReplySupport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      body: z.string().trim().min(1).max(2000),
      subject: z.string().max(200).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("support_messages").insert({
      user_id: data.userId,
      from_admin: true,
      subject: data.subject ?? null,
      body: data.body,
    });
    if (error) throw error;
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      title: "Nova mensagem do suporte",
      body: data.body.slice(0, 140),
    });
    return { ok: true };
  });

export const adminListSupport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("support_messages")
      .select("id, user_id, from_admin, subject, body, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data;
  });

export const meIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: !!data };
  });
