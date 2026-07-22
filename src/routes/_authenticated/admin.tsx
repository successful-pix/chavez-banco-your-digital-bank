import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  adminListUsers,
  adminListKyc,
  adminSetKycStatus,
  adminAdjustBalance,
  adminListSupport,
  adminReplySupport,
  adminGrantRole,
  adminRevokeRole,
  adminListRoles,
  adminSetTicketStatus,
  meIsAdmin,
} from "@/lib/admin.functions";
import { formatBRL } from "@/lib/currency";
import { useToast } from "@/components/toast";
import { Search, Shield, FileCheck, MessageSquare, Wallet } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Chavez Banco" },
      { name: "description", content: "Painel administrativo Chavez Banco." },
    ],
  }),
  beforeLoad: async () => {
    try {
      const res = await meIsAdmin();
      if (!res.isAdmin) throw redirect({ to: "/dashboard" });
    } catch {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPage,
});

type Tab = "users" | "kyc" | "credit" | "support";

function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "users", label: "Usuários", icon: Shield },
    { id: "kyc", label: "KYC", icon: FileCheck },
    { id: "credit", label: "Crédito / Débito", icon: Wallet },
    { id: "support", label: "Suporte", icon: MessageSquare },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Painel Administrativo</h1>
        <p className="text-sm text-muted-foreground">Gestão de usuários, KYC, saldos e suporte.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              tab === t.id ? "bg-gradient-primary text-primary-foreground shadow-elevated" : "border bg-card hover:bg-accent"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "users" && <UsersTab />}
      {tab === "kyc" && <KycTab />}
      {tab === "credit" && <CreditTab />}
      {tab === "support" && <SupportTab />}
    </div>
  );
}

type UserRow = {
  id: string; full_name: string; email: string | null; phone: string | null;
  cpf: string | null; agencia: string; account_number: string; balance: number;
  kyc_status: string; face_verified: boolean; created_at: string;
};

function UsersTab() {
  const listUsers = useServerFn(adminListUsers);
  const listRoles = useServerFn(adminListRoles);
  const grantRole = useServerFn(adminGrantRole);
  const revokeRole = useServerFn(adminRevokeRole);
  const toast = useToast();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [admins, setAdmins] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const [u, r] = await Promise.all([listUsers(), listRoles()]);
    setRows(u as unknown as UserRow[]);
    setAdmins(new Set((r as any[]).filter((x) => x.role === "admin").map((x) => x.user_id)));
  }

  useEffect(() => { refresh().catch(() => {}); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.full_name, r.email, r.cpf, r.account_number].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [rows, q]);

  async function toggleAdmin(u: UserRow) {
    const isAdmin = admins.has(u.id);
    if (!confirm(isAdmin ? `Revogar acesso admin de ${u.full_name}?` : `Conceder acesso admin a ${u.full_name}?`)) return;
    setBusy(u.id);
    try {
      if (isAdmin) await revokeRole({ data: { userId: u.id, role: "admin" } });
      else await grantRole({ data: { userId: u.id, role: "admin" } });
      toast.push("success", isAdmin ? "Admin revogado" : "Admin concedido");
      await refresh();
    } catch (e: any) {
      toast.push("error", e.message);
    }
    setBusy(null);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, e-mail, CPF ou conta"
          className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary"
        />
      </div>
      <div className="rounded-2xl border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-accent/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-left">E-mail</th>
              <th className="px-4 py-3 text-left">Conta</th>
              <th className="px-4 py-3 text-right">Saldo</th>
              <th className="px-4 py-3 text-left">KYC</th>
              <th className="px-4 py-3 text-left">Papel</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((r) => {
              const isAdmin = admins.has(r.id);
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-semibold">{r.full_name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.agencia} / {r.account_number}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatBRL(Number(r.balance))}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${
                      r.kyc_status === "approved" ? "text-success" :
                      r.kyc_status === "rejected" ? "text-destructive" : "text-primary"
                    }`}>
                      {r.kyc_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isAdmin ? "bg-gradient-gold text-primary-foreground" : "bg-accent text-muted-foreground"}`}>
                      {isAdmin ? "ADMIN" : "user"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleAdmin(r)}
                      disabled={busy === r.id}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
                        isAdmin ? "bg-destructive text-destructive-foreground" : "bg-gradient-primary text-primary-foreground"
                      }`}
                    >
                      {busy === r.id ? "..." : isAdmin ? "Revogar admin" : "Tornar admin"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type KycRow = { id: string; user_id: string; doc_type: string; storage_path: string; status: string; notes: string | null; created_at: string };

function KycTab() {
  const listKyc = useServerFn(adminListKyc);
  const setStatus = useServerFn(adminSetKycStatus);
  const toast = useToast();
  const [rows, setRows] = useState<KycRow[]>([]);

  async function refresh() {
    const d = await listKyc();
    setRows(d as unknown as KycRow[]);
  }
  useEffect(() => { refresh().catch(() => {}); }, []);

  async function act(row: KycRow, status: "approved" | "rejected") {
    const notes = status === "rejected" ? prompt("Motivo da rejeição?") ?? undefined : undefined;
    try {
      await setStatus({ data: { docId: row.id, userId: row.user_id, status, notes } });
      toast.push("success", "Atualizado");
      refresh();
    } catch (e: any) {
      toast.push("error", e.message);
    }
  }

  return (
    <div className="rounded-2xl border bg-card shadow-card divide-y">
      {rows.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum documento pendente.</p>}
      {rows.map((r) => (
        <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">Usuário: <span className="font-mono">{r.user_id.slice(0, 8)}</span></div>
            <div className="font-semibold">{r.doc_type.toUpperCase()}</div>
            <div className="text-xs text-muted-foreground">{r.storage_path}</div>
            {r.notes && <div className="text-xs mt-1">Nota: {r.notes}</div>}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
              r.status === "approved" ? "bg-success/15 text-success" :
              r.status === "rejected" ? "bg-destructive/15 text-destructive" :
              "bg-primary/10 text-primary"
            }`}>{r.status}</span>
            <button onClick={() => act(r, "approved")} className="rounded-xl bg-success text-success-foreground px-3 py-1.5 text-xs font-semibold">Aprovar</button>
            <button onClick={() => act(r, "rejected")} className="rounded-xl bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-semibold">Rejeitar</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreditTab() {
  const listUsers = useServerFn(adminListUsers);
  const adjust = useServerFn(adminAdjustBalance);
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userId, setUserId] = useState("");
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    direction: "in" as "in" | "out",
    type: "deposit" as "deposit" | "withdrawal" | "pix" | "ted" | "doc" | "internal" | "international_transfer",
    amount: "",
    description: "",
    sender_name: "",
    sender_account: "",
    sender_bank: "",
    recipient_name: "",
    recipient_account: "",
    recipient_bank: "",
    recipient_agencia: "",
    pix_key: "",
    created_at: "",
  });

  useEffect(() => {
    listUsers().then((d) => setUsers(d as unknown as UserRow[])).catch(() => {});
  }, [listUsers]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return users.slice(0, 8);
    return users.filter((u) =>
      [u.full_name, u.email, u.cpf, u.account_number].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)),
    ).slice(0, 8);
  }, [users, q]);

  const selected = users.find((u) => u.id === userId);

  async function submit() {
    if (!userId) return toast.push("error", "Selecione um usuário");
    const amount = Number(form.amount.replace(",", "."));
    if (!isFinite(amount) || amount <= 0) return toast.push("error", "Valor inválido");
    setSaving(true);
    try {
      const res = await adjust({
        data: {
          userId,
          amount,
          direction: form.direction,
          type: form.type,
          description: form.description || undefined,
          sender_name: form.sender_name || undefined,
          sender_account: form.sender_account || undefined,
          sender_bank: form.sender_bank || undefined,
          recipient_name: form.recipient_name || undefined,
          recipient_account: form.recipient_account || undefined,
          recipient_bank: form.recipient_bank || undefined,
          recipient_agencia: form.recipient_agencia || undefined,
          pix_key: form.pix_key || undefined,
          created_at: form.created_at ? new Date(form.created_at).toISOString() : undefined,
        },
      });
      toast.push("success", `Novo saldo: ${formatBRL(res.newBalance)}`);
      setForm((f) => ({ ...f, amount: "", description: "" }));
      const d = await listUsers();
      setUsers(d as unknown as UserRow[]);
    } catch (e: any) {
      toast.push("error", e.message);
    }
    setSaving(false);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border bg-card shadow-card p-4 space-y-3">
        <h3 className="font-bold">1. Selecionar usuário</h3>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar..."
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <div className="divide-y max-h-64 overflow-y-auto rounded-xl border">
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => setUserId(u.id)}
              className={`w-full text-left px-3 py-2 hover:bg-accent ${userId === u.id ? "bg-accent" : ""}`}
            >
              <div className="text-sm font-semibold">{u.full_name}</div>
              <div className="text-xs text-muted-foreground">{u.email} • Conta {u.account_number}</div>
              <div className="text-xs">Saldo: <span className="font-semibold">{formatBRL(Number(u.balance))}</span></div>
            </button>
          ))}
        </div>
        {selected && (
          <div className="rounded-xl bg-accent p-3 text-sm">
            <div className="font-semibold">{selected.full_name}</div>
            <div className="text-xs text-muted-foreground">Saldo atual: {formatBRL(Number(selected.balance))}</div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-card shadow-card p-4 space-y-3">
        <h3 className="font-bold">2. Lançamento</h3>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.direction}
            onChange={(e) => setForm({ ...form, direction: e.target.value as any })}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="in">Crédito (Entrada)</option>
            <option value="out">Débito (Saída)</option>
          </select>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="deposit">Depósito</option>
            <option value="withdrawal">Saque</option>
            <option value="pix">PIX</option>
            <option value="ted">TED</option>
            <option value="doc">DOC</option>
            <option value="internal">Interno</option>
            <option value="international_transfer">Internacional</option>
          </select>
        </div>
        <Input label="Valor (R$)" value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} placeholder="0,00" />
        <Input label="Descrição / Motivo" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
        <Input label="Data (opcional)" type="datetime-local" value={form.created_at} onChange={(v) => setForm({ ...form, created_at: v })} />

        <details className="rounded-xl border p-3">
          <summary className="text-sm font-semibold cursor-pointer">Dados do remetente (personalizado)</summary>
          <div className="mt-3 space-y-2">
            <Input label="Nome remetente" value={form.sender_name} onChange={(v) => setForm({ ...form, sender_name: v })} />
            <Input label="Banco remetente" value={form.sender_bank} onChange={(v) => setForm({ ...form, sender_bank: v })} />
            <Input label="Conta remetente" value={form.sender_account} onChange={(v) => setForm({ ...form, sender_account: v })} />
          </div>
        </details>

        <details className="rounded-xl border p-3">
          <summary className="text-sm font-semibold cursor-pointer">Dados do destinatário (personalizado)</summary>
          <div className="mt-3 space-y-2">
            <Input label="Nome destinatário" value={form.recipient_name} onChange={(v) => setForm({ ...form, recipient_name: v })} />
            <Input label="Banco destinatário" value={form.recipient_bank} onChange={(v) => setForm({ ...form, recipient_bank: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Agência" value={form.recipient_agencia} onChange={(v) => setForm({ ...form, recipient_agencia: v })} />
              <Input label="Conta" value={form.recipient_account} onChange={(v) => setForm({ ...form, recipient_account: v })} />
            </div>
            <Input label="Chave PIX" value={form.pix_key} onChange={(v) => setForm({ ...form, pix_key: v })} />
          </div>
        </details>

        <button
          onClick={submit}
          disabled={saving || !userId}
          className="w-full rounded-xl bg-gradient-primary py-2.5 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
        >
          {saving ? "Processando..." : "Confirmar lançamento"}
        </button>
      </div>
    </div>
  );
}

function SupportTab() {
  const listSupport = useServerFn(adminListSupport);
  const reply = useServerFn(adminReplySupport);
  const setTicketStatus = useServerFn(adminSetTicketStatus);
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  async function refresh() {
    const d = await listSupport();
    setRows(d as any[]);
  }
  useEffect(() => { refresh().catch(() => {}); }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const r of rows) {
      if (!m.has(r.user_id)) m.set(r.user_id, []);
      m.get(r.user_id)!.push(r);
    }
    const term = q.trim().toLowerCase();
    const list = Array.from(m.entries());
    if (!term) return list;
    return list.filter(([uid, msgs]) =>
      uid.toLowerCase().includes(term) ||
      msgs.some((mm: any) => (mm.body ?? "").toLowerCase().includes(term)),
    );
  }, [rows, q]);

  async function send() {
    if (!selected || !text.trim()) return;
    try {
      await reply({ data: { userId: selected, body: text.trim() } });
      setText("");
      toast.push("success", "Enviado");
      refresh();
    } catch (e: any) {
      toast.push("error", e.message);
    }
  }

  async function setStatus(status: "open" | "pending" | "closed") {
    if (!selected) return;
    try {
      await setTicketStatus({ data: { userId: selected, status } });
      toast.push("success", `Ticket ${status}`);
      refresh();
    } catch (e: any) { toast.push("error", e.message); }
  }

  async function setPriority(priority: "low" | "normal" | "high" | "urgent") {
    if (!selected) return;
    try {
      await setTicketStatus({ data: { userId: selected, priority } });
      toast.push("success", `Prioridade: ${priority}`);
      refresh();
    } catch (e: any) { toast.push("error", e.message); }
  }

  const conv = selected ? rows.filter((r) => r.user_id === selected).sort((a, b) => a.created_at.localeCompare(b.created_at)) : [];
  const currentTicket = conv[conv.length - 1];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="rounded-2xl border bg-card shadow-card max-h-[70vh] overflow-y-auto">
        <div className="p-3 border-b sticky top-0 bg-card">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar tickets..."
            className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="divide-y">
          {grouped.length === 0 && <p className="p-5 text-sm text-muted-foreground">Nenhuma conversa.</p>}
          {grouped.map(([uid, list]) => {
            const latest = list[0];
            return (
              <button
                key={uid}
                onClick={() => setSelected(uid)}
                className={`w-full text-left p-3 hover:bg-accent transition ${selected === uid ? "bg-accent" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-mono">{uid.slice(0, 8)}</div>
                  <div className="flex gap-1">
                    {latest.priority && latest.priority !== "normal" && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        latest.priority === "urgent" ? "bg-destructive text-destructive-foreground" :
                        latest.priority === "high" ? "bg-gradient-gold text-primary-foreground" :
                        "bg-accent"
                      }`}>{latest.priority}</span>
                    )}
                    {latest.status && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        latest.status === "closed" ? "bg-muted text-muted-foreground" :
                        latest.status === "pending" ? "bg-primary/10 text-primary" :
                        "bg-success/15 text-success"
                      }`}>{latest.status}</span>
                    )}
                  </div>
                </div>
                <div className="text-sm truncate mt-1">{latest.body}</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="lg:col-span-2 rounded-2xl border bg-card shadow-card p-4 flex flex-col">
        {!selected ? (
          <p className="text-sm text-muted-foreground m-auto">Selecione uma conversa.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 pb-3 border-b mb-3">
              <span className="text-xs font-semibold text-muted-foreground">Status:</span>
              {(["open", "pending", "closed"] as const).map((s) => (
                <button key={s} onClick={() => setStatus(s)} className={`text-xs font-semibold px-2 py-1 rounded-lg border ${currentTicket?.status === s ? "bg-gradient-primary text-primary-foreground border-transparent" : "hover:bg-accent"}`}>{s}</button>
              ))}
              <span className="text-xs font-semibold text-muted-foreground ml-2">Prioridade:</span>
              {(["low", "normal", "high", "urgent"] as const).map((p) => (
                <button key={p} onClick={() => setPriority(p)} className={`text-xs font-semibold px-2 py-1 rounded-lg border ${currentTicket?.priority === p ? "bg-gradient-gold text-primary-foreground border-transparent" : "hover:bg-accent"}`}>{p}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh]">
              {conv.map((m) => (
                <div key={m.id} className={`flex ${m.from_admin ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.from_admin ? "bg-gradient-primary text-primary-foreground" : "bg-accent"}`}>
                    {m.image_url && (
                      <img src={m.image_url} alt="anexo" className="mb-2 max-h-56 rounded-lg" />
                    )}
                    <div className="whitespace-pre-wrap">{m.body}</div>
                    <div className={`text-[10px] mt-1 ${m.from_admin ? "text-white/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder="Responder..."
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none"
              />
              <button onClick={send} className="rounded-xl bg-gradient-primary px-4 text-primary-foreground font-semibold">
                Enviar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
