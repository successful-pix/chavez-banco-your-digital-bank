import { useI18n, type Lang } from "@/lib/i18n";

export function LanguageSwitcher({ variant = "light" }: { variant?: "light" | "dark" }) {
  const { lang, setLang } = useI18n();
  const base =
    variant === "dark"
      ? "bg-white/10 text-white ring-white/20"
      : "bg-secondary text-foreground ring-border";
  return (
    <div className={`inline-flex rounded-full p-0.5 ring-1 ${base}`}>
      {(["pt-BR", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 text-xs font-semibold rounded-full transition ${
            lang === l ? "bg-primary text-primary-foreground shadow" : "opacity-70 hover:opacity-100"
          }`}
        >
          {l === "pt-BR" ? "PT" : "EN"}
        </button>
      ))}
    </div>
  );
}
