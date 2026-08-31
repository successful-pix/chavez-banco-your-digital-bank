import { readFileSync, writeFileSync } from "node:fs";
const path = "src/routes/_authenticated/admin.tsx";
let source = readFileSync(path, "utf8");
const oldBlock = `  beforeLoad: async () => {\n    try {\n      const res = await meIsAdmin();\n      if (!res.isAdmin) throw redirect({ to: "/dashboard" });\n    } catch {\n      throw redirect({ to: "/dashboard" });\n    }\n  },`;
const newBlock = `  beforeLoad: async () => {\n    const res = await meIsAdmin().catch(() => ({ isAdmin: false }));\n    if (res.isAdmin) return;\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user) throw redirect({ to: "/dashboard" });\n    const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();\n    if (!role) throw redirect({ to: "/dashboard" });\n  },`;
if (source.includes(oldBlock)) source = source.replace(oldBlock, newBlock);
source = source.replace(
  'MessageSquare, Wallet, Ban, ArrowLeftRight }',
  'MessageSquare, Wallet, Ban, ArrowLeftRight, Copy, Check }'
);
source = source.replace(
  '<{copied===m.id?Check:Copy} className="h-4 w-4" />',
  '{(() => { const Icon = copied===m.id ? Check : Copy; return <Icon className="h-4 w-4" />; })()}'
);
writeFileSync(path, source);
console.log("Admin route build fixes applied.");
