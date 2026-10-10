import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AvisoConferencia } from "@/components/portal/AvisoConferencia";
import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { GraficoBarras } from "@/components/portal/GraficoBarras";
import { GraficoLinha } from "@/components/portal/GraficoLinha";
import { KpiCard } from "@/components/portal/KpiCard";
import { Topbar } from "@/components/portal/Topbar";
import { usePerfil, useSessao, podeVerMargem } from "@/hooks/useSessao";
import {
  soma,
  somarPor,
  useBonificacoesDia,
  useClientesNovos,
  usePedidosDia,
  useRegistroUnico,
  useTabela,
  useVendasDia,
  useVendasFornecedor,
  useVendasRca,
  variacao,
  type Inadimplencia,
  type Margem,
  type PositivacaoMes,
  type ReceberBuckets,
  type PagarBuckets,
} from "@/lib/dados";

import { brl, kg, num, pct } from "@/lib/format";
import { intervaloDe, periodoAnterior, type Periodo } from "@/lib/periodo";
import { agruparOutros, mapaDeCores } from "@/lib/serie-cores";

export const Route = createFileRoute("/_portal/")({
  head: () => ({
    meta: [
      { title: "Home — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Visão geral de faturamento, kg vendido, positivação e financeiro da Delifrios.",
      },
      { property: "og:title", content: "Home — DX Vendas Delifrios" },
      {
        property: "og:description",
        content: "Indicadores comerciais consolidados da distribuidora Delifrios.",
      },
    ],
  }),
  component: HomePage,
});

const MES_CORRENTE = new Date().toLocaleDateString("pt-BR", { month: "long" });

function HomePage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => intervaloDe("mes"));
  const anterior = useMemo(() => periodoAnterior(periodo), [periodo]);

  const { session } = useSessao();
  const { data: usuario } = usePerfil(session?.user.email ?? undefined);
  const margemLiberada = podeVerMargem(usuario?.perfil);

  const dias = useVendasDia(periodo);
  const diasAnt = useVendasDia(anterior);
  const pedidos = usePedidosDia(periodo);
  const bonificacoes = useBonificacoesDia(periodo);
  const forn = useVendasFornecedor(periodo);
  const rca = useVendasRca(periodo);
  const positivacao = useRegistroUnico<PositivacaoMes>("v_positivacao_mes_atual");
  const clientesNovos = useClientesNovos(periodo);
  const inadimplencia = useRegistroUnico<Inadimplencia>("v_inadimplencia");
  const receber = useRegistroUnico<ReceberBuckets>("v_receber_buckets");
  const pagar = useRegistroUnico<PagarBuckets>("v_pagar_buckets");
  const margemMes = useRegistroUnico<Margem>("v_margem_mes_atual");
  const pastas = useTabela<{ fornecedor: string; pasta: string }>("fornecedor_pasta");



  const linhas = dias.data ?? [];
  const faturamento = soma(linhas, "faturamento");
  const kgTotal = soma(linhas, "kg");
  const faturamentoAnt = soma(diasAnt.data ?? [], "faturamento");

  const dadosFornecedor = useMemo(() => {
    const agrupado = somarPor(forn.data ?? [], "fornecedor", ["faturamento"]);
    return agruparOutros(
      Object.entries(agrupado).map(([nome, v]) => ({ nome, valor: v["faturamento"] ?? 0 })),
    );
  }, [forn.data]);

  const coresFornecedor = useMemo(() => {
    const canonico = (pastas.data ?? []).map((p) => p.fornecedor);
    const base = canonico.length
      ? canonico
      : Object.keys(somarPor(forn.data ?? [], "fornecedor", ["faturamento"])).sort();
    return mapaDeCores(base);
  }, [pastas.data, forn.data]);

  const dadosRca = useMemo(() => {
    const acc: Record<string, { equipe: string; valor: number }> = {};
    for (const l of rca.data ?? []) {
      const nome = l.interno ? "Vendas Internas" : l.vendedor;
      const equipe = l.interno ? "Interno" : (l.equipe ?? "—");
      acc[nome] ??= { equipe, valor: 0 };
      acc[nome].valor += Number(l.faturamento ?? 0);
    }
    return Object.entries(acc)
      .map(([nome, v]) => ({ nome, equipe: v.equipe, valor: v.valor }))
      .sort(
        (a, b) => a.equipe.localeCompare(b.equipe) || b.valor - a.valor,
      );
  }, [rca.data]);

  const coresRca = useMemo(
    () => mapaDeCores(dadosRca.map((d) => d.nome)),
    [dadosRca],
  );

  const evolucao = useMemo(
    () =>
      [...linhas]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((l) => ({ data: l.data, valor: Number(l.faturamento ?? 0) })),
    [linhas],
  );

  const vencido =
    (receber.data?.vencido_ate_2d ?? 0) +
    (receber.data?.vencido_3_a_7d ?? 0) +
    (receber.data?.vencido_8_a_15d ?? 0) +
    (receber.data?.vencido_16_a_30d ?? 0) +
    (receber.data?.vencido_mais_30d ?? 0);

  const margemPct = margemMes.data?.margem_pct ?? null;
  const margemValor = margemMes.data?.margem_valor ?? 0;
  const inad = inadimplencia.data;



  return (
    <>
      <Topbar
        titulo="Home"
        periodo={periodo}
        onPeriodo={setPeriodo}
      />

      <AvisoConferencia />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <KpiCard
          titulo="Faturamento do período"
          valor={brl(faturamento)}
          variacao={variacao(faturamento, faturamentoAnt)}
          destaque
        />
        <KpiCard
          titulo="A faturar"
          valor={brl(soma(pedidos.data ?? [], "a_faturar"))}
          destaque
          detalhe={`Pedidos no período ${brl(soma(pedidos.data ?? [], "valor_pedidos"))}`}
        />
        <KpiCard
          titulo="Bonificações"
          ponto="var(--warning)"
          valor={brl(soma(bonificacoes.data ?? [], "valor"))}
          detalhe={`${brl(soma(bonificacoes.data ?? [], "uso_interno"))} interno · ${brl(
            soma(bonificacoes.data ?? [], "para_clientes"),
          )} clientes`}
        />
        <KpiCard titulo="Kg vendido" valor={kg(kgTotal)} />
        <KpiCard
          titulo="R$/Kg"
          valor={kgTotal > 0 ? brl(faturamento / kgTotal, true) : "—"}
        />
        <KpiCard
          titulo="Clientes positivados no mês"
          valor={num(positivacao.data?.clientes_positivados ?? 0)}
          detalhe={`Base ativa ${num(positivacao.data?.base_ativa ?? 0)} · ${pct(
            positivacao.data?.pct_positivacao ?? 0,
          )} · ${MES_CORRENTE} (não segue o período)`}
        />
        <KpiCard
          titulo="Clientes novos"
          valor={num(clientesNovos.data?.novos_periodo ?? 0)}
          detalhe={`${num(clientesNovos.data?.novos_mes ?? 0)} no mês`}
        />

        <KpiCard
          titulo="Margem de contribuição"
          restrito
          valor={
            margemLiberada
              ? margemPct !== null
                ? pct(margemPct, 1)
                : "—"
              : "•••••"
          }
          detalhe={
            margemLiberada
              ? `${brl(margemValor)} no mês`
              : "Disponível para perfis supervisor e diretoria"
          }

        />
        <KpiCard
          titulo="Contas a receber vencidas"
          valor={brl(vencido)}
          status={vencido > 0 ? "critico" : "positivo"}
          detalhe={`${num(inad?.clientes ?? 0)} clientes · ${num(
            inad?.clientes_mais_30d ?? 0,
          )} acima de 30 dias · total em aberto ${brl(receber.data?.total_aberto ?? 0)}`}
        />

        <KpiCard
          titulo="A pagar — próximos 2 dias"
          valor={brl(pagar.data?.proximos_2d ?? 0)}
          status="atencao"
          detalhe={`3 a 10 dias ${brl(pagar.data?.de_3_a_10d ?? 0)}`}
        />
        <KpiCard
          titulo="A pagar — já vencidas"
          valor={brl(pagar.data?.ja_vencidos ?? 0)}
          status={(pagar.data?.ja_vencidos ?? 0) > 0 ? "critico" : "positivo"}
          detalhe={`Total em aberto ${brl(pagar.data?.total_aberto ?? 0)}`}
        />

        <KpiCard
          titulo="Notas emitidas"
          valor={num(soma(linhas, "notas"))}
          detalhe={`${num(soma(linhas, "clientes_atendidos"))} atendimentos`}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Cartao titulo="Vendas por fornecedor">
          {forn.isLoading ? (
            <Carregando />
          ) : dadosFornecedor.length ? (
            <GraficoBarras dados={dadosFornecedor} cores={coresFornecedor} />
          ) : (
            <Vazio />
          )}
        </Cartao>

        <Cartao titulo="Vendas por RCA (por equipe)">
          {rca.isLoading ? (
            <Carregando />
          ) : dadosRca.length ? (
            <div className="space-y-5">
              {Array.from(new Set(dadosRca.map((d) => d.equipe))).map((equipe) => {
                const itens = dadosRca.filter((d) => d.equipe === equipe);
                return (
                  <div key={equipe}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {equipe}
                    </p>
                    <GraficoBarras
                      dados={itens.map((i) => ({ nome: i.nome, valor: i.valor }))}
                      cores={coresRca}
                      altura={Math.max(120, itens.length * 42)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <Vazio />
          )}
        </Cartao>
      </div>

      <Cartao titulo="Evolução diária do faturamento" className="mt-6">
        {dias.isLoading ? (
          <Carregando />
        ) : evolucao.length ? (
          <GraficoLinha dados={evolucao} />
        ) : (
          <Vazio />
        )}
      </Cartao>
    </>
  );
}
