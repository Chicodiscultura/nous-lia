/** Marca: NOUS (empresa) + LIA (produto, "Lucro com IA"). */
export function Logo({ selo = true }: { selo?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          className="rounded-lg px-2.5 py-1 text-lg leading-none tracking-wide"
          style={{
            backgroundColor: "var(--brand-yellow)",
            color: "var(--graphite)",
            fontFamily: "var(--font-logo)",
            fontWeight: 800,
          }}
        >
          LIA
        </span>
        {selo ? (
          <span
            className="rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-widest"
            style={{
              borderColor: "var(--brand-yellow)",
              color: "var(--brand-yellow)",
            }}
          >
            NOUS
          </span>
        ) : null}
      </div>
      <span className="pl-1 text-[11px] tracking-wide" style={{ color: "var(--brand-yellow)" }}>
        Lucro com IA
      </span>
    </div>
  );
}
