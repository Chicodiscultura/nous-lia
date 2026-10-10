export function Logo({ selo = true }: { selo?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span
          className="rounded-lg px-2.5 py-1 text-lg leading-none"
          style={{
            backgroundColor: "var(--brand-yellow)",
            color: "var(--brand-red)",
            fontFamily: "var(--font-logo)",
            fontWeight: 700,
          }}
        >
          Delifrios
        </span>
        {selo ? (
          <span
            className="rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-widest"
            style={{
              borderColor: "var(--brand-yellow)",
              color: "var(--brand-yellow)",
            }}
          >
            DX VENDAS
          </span>
        ) : null}
      </div>
      <span
        className="pl-1 text-sm"
        style={{ fontFamily: "var(--font-script)", color: "var(--brand-yellow)" }}
      >
        o sabor que aproxima
      </span>
    </div>
  );
}
