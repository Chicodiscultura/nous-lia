import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { Topbar } from "@/components/portal/Topbar";
import { Tabela } from "@/components/portal/Tabela";
import { usePerfil, useSessao, podeVerMargem } from "@/hooks/useSessao";
import { useFornecedoresPeriodo, useParametroNumero } from "@/lib/dados";
import { brl, kg1, num, pct } from "@/lib/format";
import { intervaloDe, type Periodo } from "@/lib/periodo";
import { COR_OUTROS, corDaEntidade, mapaDeCores } from "@/lib/serie-cores";

export const Route = createFileRoute("/_portal/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Desempenho por fornecedor e pasta (Atacado e Distribuição) na distribuidora Delifrios.",
      },
      { property: "og:title", content: "Fornecedores — DX Vendas Delifrios" },
      {
        property: "og:description",
        content: "Faturamento, kg e positivação por fornecedor.",
      },
    ],
  }),
  component: FornecedoresPage,
});

function FornecedoresPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => intervaloDe("mes"));
  const consulta = useFornecedoresPeriodo(periodo);
  const pctMinimo = useParametroNumero("pct_minimo_fornecedor_destaque", 10);
  const { session } = useSessao();
  const { data: usuario } = usePerfil(session?.user.email ?? undefined);
  const margemLiberada = podeVerMargem(usuario?.perfil);

  const linhas = useMemo(() => consulta.data ?? [], [consulta.data]);

  const secoes = useMemo(() => {
    const ordem: string[] = ["Atacado", "Distribuição"];
    if (linhas.some((l) => l.pasta === "Sem pasta")) ordem.push("Sem pasta");
    return ordem;
  }, [linhas]);

  /** Cores fixas por entidade (ordem alfabética estável), nunca por ranking. */
  const cores = useMemo(
    () => mapaDeCores(linhas.map((l) => l.fornecedor).sort()),
    [linhas],
  );

  const totalPeriodo = useMemo(
    () => linhas.reduce((s, l) => s + Number(l.faturamento ?? 0), 0),
    [linhas],
  );

  return (
    <>
      <Topbar titulo="Fornecedores" periodo={periodo} onPeriodo={setPeriodo} />

      {consulta.isLoading ? (
        <Carregando />
      ) : linhas.length ? (
        <div className="space-y-10">
          {secoes.map((pasta) => (
            <SecaoPasta
              key={pasta}
              pasta={pasta}
              linhas={linhas}
              totalPeriodo={totalPeriodo}
              pctMinimo={pctMinimo}
              cores={cores}
              margemLiberada={margemLiberada}
            />
          ))}
        </div>
      ) : (
        <Cartao>
          <Vazio texto="Nenhum fornecedor neste período." />
        </Cartao>
      )}
    </>
  );
}

function SecaoPasta({
  pasta,
  linhas,
  totalPeriodo,
  pctMinimo,
  cores,
  margemLiberada,
}: {
  pasta: string;
  linhas: import("@/lib/dados").FornecedorPeriodo[];
  totalPeriodo: number;
  pctMinimo: number;
  cores: Record<string, string>;
  margemLiberada: boolean;
}) {
  const daPasta = linhas.filter((l) => l.pasta === pasta);
  const totalPasta = daPasta.reduce((s, l) => s + Number(l.faturamento ?? 0), 0);
  const participacaoPasta = totalPeriodo > 0 ? (totalPasta / totalPeriodo) * 100 : 0;

  const destaques = daPasta.filter((l) => Number(l.participacao_pct) > pctMinimo);
  const outros = daPasta.filter((l) => Number(l.participacao_pct) <= pctMinimo);

  const outrosAgg = {
    faturamento: outros.reduce((s, l) => s + Number(l.faturamento ?? 0), 0),
    peso: outros.reduce((s, l) => s + Number(l.peso_kg ?? 0), 0),
    participacao: outros.reduce((s, l) => s + Number(l.participacao_pct ?? 0), 0),
  };

  return (
    <section>
      <header className="mb-4 border-b border-border pb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between sm:items-end">
          <h2 className="min-w-0 text-xl font-extrabold tracking-tight sm:text-2xl">
            {pasta}
          </h2>
          <p className="text-right text-sm text-muted-foreground sm:text-left">
            <span className="font-extrabold tabular text-foreground">{brl(totalPasta)}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="tabular">{pct(participacaoPasta, 1)} do período</span>
          </p>
        </div>
      </header>

      {daPasta.length ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {destaques.map((f) => (
              <CardDestaque
                key={f.fornecedor}
                fornecedor={f}
                cores={cores}
                margemLiberada={margemLiberada}
              />
            ))}

            {outros.length ? (
              <div
                className="card-surface p-4"
                style={{ borderTop: `3px solid ${COR_OUTROS}` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold">Outros fornecedores</p>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tabular text-muted-foreground">
                    {pct(outrosAgg.participacao)} do período
                  </span>
                </div>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Peso vendido</dt>
                    <dd className="font-semibold tabular">{kg1(outrosAgg.peso)}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">R$/Kg</dt>
                    <dd className="font-semibold tabular">
                      {outrosAgg.peso > 0
                        ? brl(outrosAgg.faturamento / outrosAgg.peso, true)
                        : "—"}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xl font-extrabold tabular">
                  {brl(outrosAgg.faturamento)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {outros.map((o) => o.fornecedor).join(" · ")}
                </p>
              </div>
            ) : null}
          </div>

          <Cartao titulo={`Todos os fornecedores — ${pasta}`}>
            <Tabela
              linhas={daPasta}
              chave={(f) => f.fornecedor}
              colunas={[
                {
                  rotulo: "Fornecedor",
                  titulo: true,
                  celula: (f) => (
                    <span className="inline-flex min-h-[44px] items-center gap-2 sm:min-h-0">
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: corDaEntidade(f.fornecedor, cores),
                        }}
                      />
                      <Link
                        to="/fornecedores/$fornecedor"
                        params={{ fornecedor: f.fornecedor }}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        {f.fornecedor}
                      </Link>
                    </span>
                  ),
                },
                {
                  rotulo: "Peso vendido",
                  direita: true,
                  celula: (f) => kg1(f.peso_kg),
                },
                {
                  rotulo: "R$/Kg",
                  direita: true,
                  celula: (f) => brl(f.rs_por_kg, true),
                },
                {
                  rotulo: "Clientes positivados",
                  direita: true,
                  celula: (f) => num(f.clientes_positivados),
                },
                {
                  rotulo: "Faturamento",
                  direita: true,
                  celula: (f) => brl(f.faturamento, true),
                },
                {
                  rotulo: "Participação",
                  direita: true,
                  celula: (f) => pct(f.participacao_pct, 1),
                },
              ]}
            />
          </Cartao>
        </div>
      ) : (
        <Vazio texto={`Nenhum fornecedor na pasta ${pasta} neste período.`} />
      )}
    </section>
  );
}

function CardDestaque({
  fornecedor: f,
  cores,
  margemLiberada,
}: {
  fornecedor: import("@/lib/dados").FornecedorPeriodo;
  cores: Record<string, string>;
  margemLiberada: boolean;
}) {
  return (
    <Link
      to="/fornecedores/$fornecedor"
      params={{ fornecedor: f.fornecedor }}
      className="card-surface block p-4 transition-shadow hover:shadow-md"
      style={{
        borderTop: `3px solid ${corDaEntidade(f.fornecedor, cores)}`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-extrabold">{f.fornecedor}</p>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular"
          style={{
            backgroundColor: "var(--brand-yellow)",
            color: "var(--graphite)",
          }}
        >
          {pct(f.participacao_pct)} do período
        </span>
      </div>

      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Peso vendido</dt>
          <dd className="font-semibold tabular">{kg1(f.peso_kg)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">R$/Kg</dt>
          <dd className="font-semibold tabular">{brl(f.rs_por_kg, true)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Clientes positivados</dt>
          <dd className="font-semibold tabular">{num(f.clientes_positivados)}</dd>
        </div>
        {margemLiberada && f.margem_pct !== null ? (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Margem</dt>
            <dd className="font-semibold tabular">{pct(f.margem_pct, 1)}</dd>
          </div>
        ) : null}
      </dl>

      <p className="mt-3 text-xl font-extrabold tabular">{brl(f.faturamento)}</p>
    </Link>
  );
}
