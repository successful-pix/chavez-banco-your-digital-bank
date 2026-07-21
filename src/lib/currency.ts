export function formatBRL(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!isFinite(n)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(n);
}

export function formatDate(iso: string, lang: string = "pt-BR"): string {
  try {
    return new Date(iso).toLocaleDateString(lang, { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return iso;
  }
}

export function formatTime(iso: string, lang: string = "pt-BR"): string {
  try {
    return new Date(iso).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function maskAccount(a: string | null | undefined): string {
  if (!a) return "--------";
  return a.length > 5 ? `${a.slice(0, -1)}-${a.slice(-1)}` : a;
}
