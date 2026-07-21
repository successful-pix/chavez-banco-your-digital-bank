import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/components/toast";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Perfil — Chavez Banco" },
      { name: "description", content: "Gerencie seu perfil Chavez Banco." },
    ],
  }),
  component: ProfilePage,
});

type Profile = {
  full_name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  avatar_url: string | null;
};

function ProfilePage() {
  const { t } = useI18n();
  const toast = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getUser();
      if (!s.user) return;
      const { data: p } = await supabase.from("profiles").select("full_name,email,phone,cpf,avatar_url").eq("id", s.user.id).maybeSingle();
      setProfile(p as unknown as Profile);
      if (p?.avatar_url) {
        const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(p.avatar_url, 3600);
        if (signed?.signedUrl) setAvatarUrl(signed.signedUrl);
      }
    })();
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { data: s } = await supabase.auth.getUser();
    if (!s.user) { setSaving(false); return; }
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name,
      phone: profile.phone,
      cpf: profile.cpf,
    }).eq("id", s.user.id);
    setSaving(false);
    if (error) return toast.push("error", error.message);
    toast.push("success", "Perfil atualizado!");
  }

  async function onAvatar(file: File) {
    const { data: s } = await supabase.auth.getUser();
    if (!s.user) return;
    const path = `${s.user.id}/avatar-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.push("error", error.message);
    await supabase.from("profiles").update({ avatar_url: path }).eq("id", s.user.id);
    const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    if (signed?.signedUrl) setAvatarUrl(signed.signedUrl);
    toast.push("success", "Foto atualizada!");
  }

  if (!profile) return <div className="py-16 text-center text-sm text-muted-foreground">{t("common.loading")}</div>;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-black text-foreground">{t("nav.profile")}</h1>

      <div className="rounded-2xl border bg-card shadow-card p-5 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-accent grid place-items-center overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={profile.full_name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-black text-primary">{(profile.full_name || "?").slice(0, 1)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-foreground truncate">{profile.full_name}</div>
          <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
        </div>
        <label className="text-xs font-semibold text-primary cursor-pointer">
          Trocar
          <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])} />
        </label>
      </div>

      <div className="rounded-2xl border bg-card shadow-card p-5 space-y-3">
        <Field label={t("auth.fullname")} value={profile.full_name} onChange={(v) => setProfile({ ...profile, full_name: v })} />
        <Field label={t("auth.phone")} value={profile.phone ?? ""} onChange={(v) => setProfile({ ...profile, phone: v })} />
        <Field label={t("auth.cpf")} value={profile.cpf ?? ""} onChange={(v) => setProfile({ ...profile, cpf: v })} />
        <button
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elevated disabled:opacity-60"
        >
          {saving ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground/80">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}
