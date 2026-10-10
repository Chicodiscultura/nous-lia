import { intervaloDe, type Periodo, type PeriodoTipo } from "@/lib/periodo";
import { ddmmaaaa } from "@/lib/format";

const opcoes: { tipo: Exclude<PeriodoTipo, "livre">; rotulo: string }[] = [
  { tipo: "dia", rotulo: "Dia" },
  { tipo: "semana", rotulo: "Semana atual" },
  { tipo: "mes", rotulo: "Mês atual" },
  { tipo: "mes_anterior", rotulo: "Mês anterior" },
];

export function Topbar({
  titulo,
  descricao,
  periodo,
  onPeriodo,
}: {
  titulo: string;
  descricao?: string;
  periodo?: Periodo;
  onPeriodo?: (p: Periodo) => void;
}) {
  return (
    <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between lg:gap-4">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-extrabold tracking-tight sm:text-2xl">
          {titulo}
        </h1>
        {descricao ? (
          <p className="mt-1 text-sm text-muted-foreground">{descricao}</p>
        ) : (
          periodo && (
            <p className="mt-1 text-sm text-muted-foreground tabular">
              {ddmmaaaa(periodo.inicio)} a {ddmmaaaa(periodo.fim)}
            </p>
          )
        )}
      </div>

      {periodo && onPeriodo ? (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:w-auto">
          <div className="card-surface grid w-full grid-cols-4 gap-1 p-1 sm:flex sm:w-auto">
            {opcoes.map((o) => {
              const ativo = periodo.tipo === o.tipo;
              return (
                <button
                  key={o.tipo}
                  onClick={() => onPeriodo(intervaloDe(o.tipo))}
                  className="min-h-[44px] rounded-md px-2 text-center text-xs font-medium transition-colors sm:px-3 sm:text-sm"
                  style={
                    ativo
                      ? { backgroundColor: "var(--brand-yellow)", color: "var(--graphite)" }
                      : { color: "var(--muted-foreground)" }
                  }
                >
                  {o.rotulo}
                </button>
              );
            })}
          </div>
          <div className="card-surface flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-1.5 text-xs sm:w-auto sm:text-sm">
            <input
              type="date"
              value={periodo.inicio}
              onChange={(e) =>
                onPeriodo({ tipo: "livre", inicio: e.target.value, fim: periodo.fim })
              }
              className="min-w-0 bg-transparent outline-none tabular"
            />
            <span className="shrink-0 text-muted-foreground">até</span>
            <input
              type="date"
              value={periodo.fim}
              onChange={(e) =>
                onPeriodo({ tipo: "livre", inicio: periodo.inicio, fim: e.target.value })
              }
              className="min-w-0 bg-transparent outline-none tabular"
            />
          </div>
        </div>
      ) : null}
    </header>
  );
}
