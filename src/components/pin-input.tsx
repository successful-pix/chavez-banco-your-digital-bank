import { useRef, useEffect } from "react";

export function PinInput({
  value,
  onChange,
  autoFocus,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <div className="relative">
      <input
        ref={ref}
        inputMode="numeric"
        pattern="\d*"
        maxLength={6}
        autoComplete="one-time-code"
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="w-full text-center text-2xl tracking-[0.6em] font-black rounded-xl border border-input bg-background px-3 py-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
        placeholder="••••••"
      />
    </div>
  );
}
