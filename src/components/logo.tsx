export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative h-9 w-9 rounded-xl bg-gradient-primary shadow-elevated flex items-center justify-center">
        <span className="text-primary-foreground font-black text-lg">C</span>
        <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-gold ring-2 ring-background" />
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-extrabold tracking-tight text-foreground">Chavez</div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold -mt-0.5">Banco</div>
      </div>
    </div>
  );
}
