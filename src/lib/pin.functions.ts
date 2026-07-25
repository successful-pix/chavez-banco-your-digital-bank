import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PIN_REGEX = /^\d{6}$/;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function b64(buf: ArrayBuffer | Uint8Array) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s);
}
function fromB64(s: string) {
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

async function derive(pin: string, saltB64: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromB64(saltB64), iterations: 120_000, hash: "SHA-256" },
    key,
    256,
  );
  return b64(bits);
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function loadPinRow(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("pin_hash, pin_salt, pin_attempts, pin_locked_until, email_verified, kyc_status")
    .eq("id", userId)
    .maybeSingle();
  return { admin: supabaseAdmin, row: data as any };
}

export const getPinStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { row } = await loadPinRow(context.userId);
    const lockedMs = row?.pin_locked_until ? new Date(row.pin_locked_until).getTime() - Date.now() : 0;
    return {
      hasPin: !!row?.pin_hash,
      lockedUntil: lockedMs > 0 ? row.pin_locked_until : null,
    };
  });

export const setTransferPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pin: z.string().regex(PIN_REGEX) }).parse(d))
  .handler(async ({ context, data }) => {
    const { admin, row } = await loadPinRow(context.userId);
    if (row?.pin_hash) return { ok: false, error: "already_set" };
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const saltB64 = b64(salt);
    const hash = await derive(data.pin, saltB64);
    await admin
      .from("profiles")
      .update({ pin_hash: hash, pin_salt: saltB64, pin_attempts: 0, pin_locked_until: null })
      .eq("id", context.userId);
    return { ok: true };
  });

export const changeTransferPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ currentPin: z.string().regex(PIN_REGEX), newPin: z.string().regex(PIN_REGEX) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { admin, row } = await loadPinRow(context.userId);
    if (!row?.pin_hash || !row?.pin_salt) return { ok: false, error: "no_pin" };
    if (row.pin_locked_until && new Date(row.pin_locked_until) > new Date()) {
      return { ok: false, error: "locked", lockedUntil: row.pin_locked_until };
    }
    const attempt = await derive(data.currentPin, row.pin_salt);
    if (!timingSafeEqual(attempt, row.pin_hash)) {
      const attempts = (row.pin_attempts ?? 0) + 1;
      const lock = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
      await admin
        .from("profiles")
        .update({ pin_attempts: lock ? 0 : attempts, pin_locked_until: lock })
        .eq("id", context.userId);
      return { ok: false, error: "invalid", attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempts) };
    }
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const saltB64 = b64(salt);
    const hash = await derive(data.newPin, saltB64);
    await admin
      .from("profiles")
      .update({ pin_hash: hash, pin_salt: saltB64, pin_attempts: 0, pin_locked_until: null })
      .eq("id", context.userId);
    return { ok: true };
  });

export const resetTransferPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ newPin: z.string().regex(PIN_REGEX), otp: z.string().min(4).max(10) }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("verification_code, verification_expires_at")
      .eq("id", context.userId)
      .maybeSingle();
    if (!prof) return { ok: false, error: "not_found" };
    if (!prof.verification_code || prof.verification_code !== data.otp.trim()) {
      return { ok: false, error: "invalid_otp" };
    }
    if (prof.verification_expires_at && new Date(prof.verification_expires_at) < new Date()) {
      return { ok: false, error: "expired_otp" };
    }
    const salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    const saltB64 = b64(salt);
    const hash = await derive(data.newPin, saltB64);
    await supabaseAdmin
      .from("profiles")
      .update({
        pin_hash: hash,
        pin_salt: saltB64,
        pin_attempts: 0,
        pin_locked_until: null,
        verification_code: null,
        verification_expires_at: null,
      })
      .eq("id", context.userId);
    return { ok: true };
  });

export const verifyTransferPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ pin: z.string().regex(PIN_REGEX) }).parse(d))
  .handler(async ({ context, data }) => {
    const { admin, row } = await loadPinRow(context.userId);
    if (!row?.pin_hash || !row?.pin_salt) return { ok: false, error: "no_pin" };
    if (row.pin_locked_until && new Date(row.pin_locked_until) > new Date()) {
      return { ok: false, error: "locked", lockedUntil: row.pin_locked_until };
    }
    const attempt = await derive(data.pin, row.pin_salt);
    if (!timingSafeEqual(attempt, row.pin_hash)) {
      const attempts = (row.pin_attempts ?? 0) + 1;
      const lock = attempts >= MAX_ATTEMPTS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null;
      await admin
        .from("profiles")
        .update({ pin_attempts: lock ? 0 : attempts, pin_locked_until: lock })
        .eq("id", context.userId);
      return { ok: false, error: lock ? "locked" : "invalid", attemptsLeft: Math.max(0, MAX_ATTEMPTS - attempts), lockedUntil: lock };
    }
    if ((row.pin_attempts ?? 0) > 0) {
      await admin.from("profiles").update({ pin_attempts: 0 }).eq("id", context.userId);
    }
    return { ok: true };
  });
