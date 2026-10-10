/** Topbar com seletor de mês (AAAA-MM-01), sem período livre. */
export function mesCorrente() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-01`;
}

export function rotuloMes(mes: string) {
  const d = new Date(`${mes.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function TopbarMes({
  titulo,
  descricao,
  mes,
  onMes,
}: {
  titulo: string;
  descricao?: string;
  mes: string;
  onMes: (m: string) => void;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">
          {titulo}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {descricao ?? rotuloMes(mes)}
        </p>
      </div>

      <div className="card-surface flex min-h-[44px] w-full items-center gap-2 px-3 py-1.5 text-sm sm:w-auto">
        <label htmlFor="mes-filtro" className="shrink-0 text-muted-foreground">
          Mês
        </label>
        <input
          id="mes-filtro"
          type="month"
          value={mes.slice(0, 7)}
          onChange={(e) =>
            onMes(e.target.value ? `${e.target.value}-01` : mesCorrente())
          }
          className="min-w-0 bg-transparent outline-none tabular"
        />
      </div>
    </header>
  );
}
