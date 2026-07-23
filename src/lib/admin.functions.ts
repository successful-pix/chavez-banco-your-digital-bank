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
      .select("id, full_name, email, phone, cpf, agencia, account_number, balance, kyc_status, face_verified, blocked, created_at")
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
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      title: `KYC ${data.status}`,
      body: data.notes ?? `Sua verificação foi ${data.status}.`,
    });
    try {
      const { data: p } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", data.userId).maybeSingle();
      if (p?.email) {
        const { emails } = await import("@/lib/email.server");
        await emails.kycStatus(p.email, p.full_name ?? "", data.status, data.notes ?? null);
      }
    } catch (e) { console.error("[email] kyc", e); }
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
      .select("balance, full_name, account_number, email")
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

    try {
      const { emails } = await import("@/lib/email.server");
      if ((profile as any).email) {
        if (data.direction === "in") {
          await emails.deposit((profile as any).email, profile.full_name ?? "", data.amount, data.description ?? null);
        } else {
          await emails.withdrawal((profile as any).email, profile.full_name ?? "", data.amount, data.description ?? null);
        }
      }
    } catch (e) { console.error("[email] adjust", e); }

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
      status: "open",
      read_by_admin: true,
    });
    if (error) throw error;
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      title: "Nova mensagem do suporte",
      body: data.body.slice(0, 140),
    });
    try {
      const { data: p } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", data.userId).maybeSingle();
      if (p?.email) {
        const { emails } = await import("@/lib/email.server");
        await emails.supportReply(p.email, p.full_name ?? "", data.body);
      }
    } catch (e) { console.error("[email] support reply", e); }
    return { ok: true };
  });

// --- Role management ---
export const adminGrantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "user"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw error;
    await supabaseAdmin.from("notifications").insert({
      user_id: data.userId,
      title: data.role === "admin" ? "Você é agora administrador" : "Papel atualizado",
      body: data.role === "admin" ? "Acesse o painel admin ao fazer login novamente." : "Seu papel foi atualizado.",
    });
    return { ok: true };
  });

export const adminRevokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), role: z.enum(["admin", "user"]) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId && data.role === "admin") {
      throw new Error("Você não pode revogar seu próprio acesso admin.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", data.role);
    if (error) throw error;
    return { ok: true };
  });

export const adminListRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("user_roles").select("user_id, role");
    if (error) throw error;
    return data;
  });

// --- Support ticket controls ---
export const adminSetTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      status: z.enum(["open", "pending", "closed"]).optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: any = {};
    if (data.status) patch.status = data.status;
    if (data.priority) patch.priority = data.priority;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin.from("support_messages").update(patch).eq("user_id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

export const adminListSupport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("support_messages")
      .select("id, user_id, from_admin, subject, body, image_url, status, priority, read_by_admin, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
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
