import { readFileSync, writeFileSync } from "node:fs";

const path = "src/routes/_authenticated/admin.tsx";
let source = readFileSync(path, "utf8");

const oldBlock = `  beforeLoad: async () => {\n    try {\n      const res = await meIsAdmin();\n      if (!res.isAdmin) throw redirect({ to: "/dashboard" });\n    } catch {\n      throw redirect({ to: "/dashboard" });\n    }\n  },`;
const newBlock = `  beforeLoad: async () => {\n    const res = await meIsAdmin().catch(() => ({ isAdmin: false }));\n    if (res.isAdmin) return;\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user) throw redirect({ to: "/dashboard" });\n    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();\n    if (!role) throw redirect({ to: "/dashboard" });\n  },`;
if (source.includes(oldBlock)) source = source.replace(oldBlock, newBlock);

if (!source.includes("Copy, Check")) {
  source = source.replace(
    'Search, Shield, FileCheck, MessageSquare, Wallet, Ban, ArrowLeftRight }',
    'Search, Shield, FileCheck, MessageSquare, Wallet, Ban, ArrowLeftRight, Copy, Check }',
  );
}

if (!source.includes("[copied, setCopied]")) {
  source = source.replace(
    '  const [text, setText] = useState("");',
    '  const [text, setText] = useState("");\n  const [copied, setCopied] = useState<string | null>(null);',
  );
}

if (!source.includes("async function copyMessage")) {
  source = source.replace(
    '  const conv = selected ? rows.filter((r) => r.user_id === selected).sort((a, b) => a.created_at.localeCompare(b.created_at)) : [];',
    '  async function copyMessage(id: string, body: string) {\n    try {\n      await navigator.clipboard.writeText(body);\n      setCopied(id);\n      setTimeout(() => setCopied(null), 1500);\n    } catch {\n      toast.push("error", "Não foi possível copiar a mensagem");\n    }\n  }\n\n  const conv = selected ? rows.filter((r) => r.user_id === selected).sort((a, b) => a.created_at.localeCompare(b.created_at)) : [];',
  );
}

if (!source.includes('aria-label={copied === m.id ? "Copiado" : "Copiar mensagem"}')) {
  source = source.replace(
    '                    <div className="whitespace-pre-wrap">{m.body}</div>',
    '                    <div className="flex items-start gap-2"><div className="whitespace-pre-wrap flex-1">{m.body}</div><button type="button" onClick={() => copyMessage(m.id, String(m.body ?? ""))} title={copied === m.id ? "Copiado" : "Copiar"} aria-label={copied === m.id ? "Copiado" : "Copiar mensagem"} className="shrink-0 rounded-lg p-1.5 hover:bg-black/10">{copied === m.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</button></div>',
  );
}

writeFileSync(path, source);
console.log("Admin route build fixes applied; full dashboard preserved and support copy enabled.");
