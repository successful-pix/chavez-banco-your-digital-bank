// Saved login details (device-local only). No backend/Supabase changes.
// Stores the list of accounts used on this device so returning users only need
// their password — or their fingerprint/Face ID (WebAuthn platform authenticator).

const ACCOUNTS_KEY = "cb.saved_accounts.v1";
const VAULT_PREFIX = "cb.bio_vault.v1.";

export type SavedAccount = {
  email: string;
  name?: string;
  lastUsed: number;
  biometric?: boolean;
};

type Vault = {
  credentialId: string; // base64url
  access_token: string;
  refresh_token: string;
  savedAt: number;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function read<T>(key: string): T | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / blocked */
  }
}

export function getSavedAccounts(): SavedAccount[] {
  const list = read<SavedAccount[]>(ACCOUNTS_KEY) ?? [];
  return list
    .filter((a) => a && typeof a.email === "string")
    .map((a) => ({ ...a, biometric: hasBiometricVault(a.email) }))
    .sort((a, b) => (b.lastUsed ?? 0) - (a.lastUsed ?? 0))
    .slice(0, 5);
}

export function saveAccount(email: string, name?: string) {
  const clean = email.trim().toLowerCase();
  if (!clean) return;
  const list = (read<SavedAccount[]>(ACCOUNTS_KEY) ?? []).filter((a) => a.email !== clean);
  list.unshift({ email: clean, name, lastUsed: Date.now() });
  write(ACCOUNTS_KEY, list.slice(0, 5));
}

export function forgetAccount(email: string) {
  const clean = email.trim().toLowerCase();
  const list = (read<SavedAccount[]>(ACCOUNTS_KEY) ?? []).filter((a) => a.email !== clean);
  write(ACCOUNTS_KEY, list);
  if (isBrowser()) window.localStorage.removeItem(VAULT_PREFIX + clean);
}

/* ---------------- Biometric (WebAuthn platform authenticator) ---------------- */

export function biometricSupported(): boolean {
  return isBrowser() && !!window.PublicKeyCredential && !!navigator.credentials;
}

export function hasBiometricVault(email: string): boolean {
  return !!read<Vault>(VAULT_PREFIX + email.trim().toLowerCase());
}

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Enroll fingerprint/Face ID for this account and bind the current session to it. */
export async function enrollBiometric(
  email: string,
  name: string,
  tokens: { access_token: string; refresh_token: string },
): Promise<boolean> {
  if (!biometricSupported()) return false;
  const clean = email.trim().toLowerCase();
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = new TextEncoder().encode(clean);
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Chavez Banco", id: window.location.hostname },
      user: { id: userId, name: clean, displayName: name || clean },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) return false;
  const vault: Vault = {
    credentialId: b64url(cred.rawId),
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    savedAt: Date.now(),
  };
  write(VAULT_PREFIX + clean, vault);
  return true;
}

/** Refresh the stored tokens after a normal login so biometric unlock stays valid. */
export function refreshBiometricTokens(email: string, tokens: { access_token: string; refresh_token: string }) {
  const clean = email.trim().toLowerCase();
  const vault = read<Vault>(VAULT_PREFIX + clean);
  if (!vault) return;
  write(VAULT_PREFIX + clean, { ...vault, ...tokens, savedAt: Date.now() });
}

/** Verify fingerprint/Face ID and return the stored session tokens. */
export async function unlockWithBiometric(
  email: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  const clean = email.trim().toLowerCase();
  const vault = read<Vault>(VAULT_PREFIX + clean);
  if (!vault || !biometricSupported()) return null;
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: fromB64url(vault.credentialId), type: "public-key" }],
      userVerification: "required",
      timeout: 60000,
      rpId: window.location.hostname,
    },
  });
  if (!assertion) return null;
  return { access_token: vault.access_token, refresh_token: vault.refresh_token };
}

export function disableBiometric(email: string) {
  if (isBrowser()) window.localStorage.removeItem(VAULT_PREFIX + email.trim().toLowerCase());
}
