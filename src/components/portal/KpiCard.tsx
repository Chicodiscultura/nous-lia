import { ArrowDownRight, ArrowUpRight, Lock, Minus } from "lucide-react";
import type { ReactNode } from "react";

import { pct } from "@/lib/format";

export function KpiCard({
  titulo,
  valor,
  detalhe,
  variacao,
  destaque,
  restrito,
  status,
  ponto,
  children,
}: {
  titulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  variacao?: number | null;
  destaque?: boolean;
  restrito?: boolean;
  status?: "positivo" | "atencao" | "grave" | "critico";
  ponto?: string;
  children?: ReactNode;
}) {
  const corStatus = status
    ? {
        positivo: "var(--positive-text)",
        atencao: "var(--warning)",
        grave: "var(--severe)",
        critico: "var(--critical)",
      }[status]
    : undefined;

  return (
    <div
      className="card-surface p-3 sm:p-4"
      style={
        destaque ? { borderTop: "3px solid var(--brand-yellow)" } : undefined
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
          {ponto ? (
            <span
              aria-hidden
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ backgroundColor: ponto }}
            />
          ) : null}
          <span className="min-w-0 break-words">{titulo}</span>
        </p>
        {restrito ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            <Lock className="size-3" /> Restrito
          </span>
        ) : null}
      </div>


      <p
        className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-lg font-extrabold leading-tight tabular sm:text-xl lg:text-2xl"
        style={{ fontFamily: "var(--font-display)", color: corStatus }}
        title={typeof valor === "string" ? valor : undefined}
      >
        {valor}
      </p>



      {typeof variacao === "number" ? (
        <p
          className="mt-1 flex items-center gap-1 text-xs font-semibold tabular"
          style={{
            color:
              variacao > 0
                ? "var(--positive-text)"
                : variacao < 0
                  ? "var(--critical)"
                  : "var(--muted-foreground)",
          }}
        >
          {variacao > 0 ? (
            <ArrowUpRight className="size-3.5" />
          ) : variacao < 0 ? (
            <ArrowDownRight className="size-3.5" />
          ) : (
            <Minus className="size-3.5" />
          )}
          {pct(Math.abs(variacao))} vs período anterior
        </p>
      ) : null}

      {detalhe ? (
        <p className="mt-1 text-xs text-muted-foreground tabular">{detalhe}</p>
      ) : null}
      {children}
    </div>
  );
}
