import type { ReactNode } from "react";
import { Fragment } from "react";

export interface Coluna<T> {
  /** Cabeçalho da coluna / rótulo no cartão mobile. */
  rotulo: string;
  celula: (linha: T) => ReactNode;
  /** Alinha à direita na tabela (números). */
  direita?: boolean;
  /** Marca a coluna que vira o título do cartão no mobile. */
  titulo?: boolean;
  /** Texto de ajuda exibido ao passar o mouse no cabeçalho. */
  dica?: string;
}

/**
 * Tabela de dados responsiva.
 * ≥640px: tabela normal. <640px: lista de cartões (um por registro),
 * com título em destaque e os demais campos como pares rótulo → valor.
 */
export function Tabela<T>({
  colunas,
  linhas,
  chave,
  expandido,
  renderExpandido,
  compacto,
}: {
  colunas: Coluna<T>[];
  linhas: T[];
  chave: (linha: T, indice: number) => string;
  /** Reduz o espaçamento horizontal para caber mais colunas. */
  compacto?: boolean;
  /** Retorna true quando a linha está expandida (drill-down). */
  expandido?: (linha: T) => boolean;
  renderExpandido?: (linha: T) => ReactNode;
}) {
  const pad = compacto ? "pr-2" : "pr-4";
  const indiceTitulo = Math.max(
    0,
    colunas.findIndex((c) => c.titulo),
  );

  return (
    <>
      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              {colunas.map((c) => (
                <th
                  key={c.rotulo}
                  title={c.dica}
                  className={`py-2 ${pad} ${c.direita ? "text-right" : ""}`}
                >
                  {c.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <Fragment key={chave(l, i)}>
                <tr className="border-b last:border-0">
                  {colunas.map((c) => (
                    <td
                      key={c.rotulo}
                      className={`py-2 ${pad} ${c.direita ? "text-right tabular" : ""}`}
                    >
                      {c.celula(l)}
                    </td>
                  ))}
                </tr>
                {expandido?.(l) && renderExpandido ? (
                  <tr>
                    <td colSpan={colunas.length} className="p-0">
                      {renderExpandido(l)}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: lista de cartões */}
      <ul className="space-y-3 sm:hidden">
        {linhas.map((l, i) => (
          <li
            key={chave(l, i)}
            className="rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0 text-sm font-extrabold">
              {colunas[indiceTitulo]?.celula(l)}
            </div>
            <dl className="mt-2 space-y-1 text-xs">
              {colunas.map((c, j) =>
                j === indiceTitulo ? null : (
                  <div
                    key={c.rotulo}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <dt className="shrink-0 text-muted-foreground">{c.rotulo}</dt>
                    <dd className="min-w-0 text-right font-semibold tabular">
                      {c.celula(l)}
                    </dd>
                  </div>
                ),
              )}
            </dl>
            {expandido?.(l) && renderExpandido ? (
              <div className="mt-2">{renderExpandido(l)}</div>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
