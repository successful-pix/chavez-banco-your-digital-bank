// Server-only Resend sender for Chavez Banco notifications.
// Uses the Lovable Resend connector gateway. Never import from client code.

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

const FROM = "Chavez Banco <support@chavezbanco.online>";
const BRAND_PRIMARY = "#0B4DBB";
const BRAND_GOLD = "#D4AF37";

function shell(title: string, bodyHtml: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>
  <body style="margin:0;background:#f5f7fb;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(15,23,42,.06)">
          <tr><td style="background:linear-gradient(135deg,${BRAND_PRIMARY},#0837a0);padding:24px 28px;color:#fff">
            <div style="font-size:12px;letter-spacing:.2em;opacity:.85">CHAVEZ BANCO</div>
            <div style="font-size:22px;font-weight:800;margin-top:6px">${title}</div>
          </td></tr>
          <tr><td style="padding:24px 28px;line-height:1.6;font-size:15px">${bodyHtml}</td></tr>
          <tr><td style="padding:20px 28px;border-top:1px solid #eef2f7;font-size:12px;color:#64748b">
            Este é um e-mail automático da Chavez Banco. Precisa de ajuda? Responda este e-mail ou acesse o Suporte no app.
            <div style="margin-top:8px;color:${BRAND_GOLD};font-weight:700">chavezbanco.online</div>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;
}

async function send(to: string, subject: string, html: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) {
    console.warn("[email] Missing LOVABLE_API_KEY or RESEND_API_KEY; skipping send.");
    return { skipped: true };
  }
  try {
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[email] send failed [${res.status}]: ${body}`);
      return { ok: false, status: res.status, body };
    }
    return { ok: true };
  } catch (e: any) {
    console.error("[email] error", e?.message ?? e);
    return { ok: false, error: e?.message ?? String(e) };
  }
}

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

export const emails = {
  welcome: (to: string, name: string) =>
    send(to, "Bem-vindo à Chavez Banco 🎉", shell("Bem-vindo, " + name,
      `<p>Olá <b>${name}</b>,</p><p>Sua conta digital Chavez Banco foi criada com sucesso. Você já pode enviar PIX, receber transferências e gerenciar seus cartões pelo app.</p>
       <p style="margin-top:20px"><a href="https://chavezbanco.online" style="background:${BRAND_PRIMARY};color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700">Acessar minha conta</a></p>`)),

  login: (to: string, name: string) =>
    send(to, "Novo acesso à sua conta Chavez", shell("Novo acesso detectado",
      `<p>Olá <b>${name}</b>,</p><p>Detectamos um novo login na sua conta em ${new Date().toLocaleString("pt-BR")}.</p><p>Se não foi você, entre em contato imediatamente com nosso suporte.</p>`)),

  deposit: (to: string, name: string, amount: number, description?: string | null) =>
    send(to, `Depósito recebido — ${brl(amount)}`, shell("Depósito recebido",
      `<p>Olá <b>${name}</b>,</p><p>Você recebeu um depósito de <b style="color:#0B4DBB">${brl(amount)}</b>.</p>${description ? `<p>Descrição: ${description}</p>` : ""}<p>Seu saldo já foi atualizado.</p>`)),

  withdrawal: (to: string, name: string, amount: number, description?: string | null) =>
    send(to, `Débito realizado — ${brl(amount)}`, shell("Débito realizado",
      `<p>Olá <b>${name}</b>,</p><p>Um débito de <b>${brl(amount)}</b> foi registrado na sua conta.</p>${description ? `<p>Descrição: ${description}</p>` : ""}`)),

  transfer: (to: string, name: string, amount: number, kind: string, recipient?: string | null) =>
    send(to, `Transferência ${kind.toUpperCase()} — ${brl(amount)}`, shell("Transferência realizada",
      `<p>Olá <b>${name}</b>,</p><p>Sua transferência <b>${kind.toUpperCase()}</b> no valor de <b>${brl(amount)}</b>${recipient ? ` para <b>${recipient}</b>` : ""} foi concluída.</p>`)),

  supportReply: (to: string, name: string, snippet: string) =>
    send(to, "Nova resposta do suporte Chavez", shell("Nova mensagem do suporte",
      `<p>Olá <b>${name}</b>,</p><p>Você recebeu uma nova resposta do time de suporte:</p>
       <blockquote style="border-left:3px solid ${BRAND_PRIMARY};padding:8px 14px;background:#f5f7fb;border-radius:8px">${snippet.replace(/</g, "&lt;")}</blockquote>`)),

  kycStatus: (to: string, name: string, status: "approved" | "rejected" | "pending", notes?: string | null) => {
    const map = { approved: "aprovada", rejected: "rejeitada", pending: "pendente" } as const;
    return send(to, `Verificação KYC ${map[status]}`, shell(`KYC ${map[status]}`,
      `<p>Olá <b>${name}</b>,</p><p>Sua verificação de identidade foi <b>${map[status]}</b>.</p>${notes ? `<p>Nota: ${notes}</p>` : ""}`));
  },
};
