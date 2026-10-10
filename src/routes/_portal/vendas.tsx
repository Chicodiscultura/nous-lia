import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { GraficoBarras } from "@/components/portal/GraficoBarras";
import { GraficoLinha } from "@/components/portal/GraficoLinha";
import { KpiCard } from "@/components/portal/KpiCard";
import { Topbar } from "@/components/portal/Topbar";
import { Tabela } from "@/components/portal/Tabela";
import {
  soma,
  usePedidosDia,
  usePedidosPosicao,
  usePedidosRca,
} from "@/lib/dados";
import { brl, num } from "@/lib/format";
import { intervaloDe, type Periodo } from "@/lib/periodo";
import { mapaDeCores } from "@/lib/serie-cores";

export const Route = createFileRoute("/_portal/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Pedidos digitados: valor em pedidos, fila a faturar, posição por situação e desempenho por RCA.",
      },
      { property: "og:title", content: "Vendas — DX Vendas Delifrios" },
      {
        property: "og:description",
        content: "Pedidos digitados e fila a faturar da Delifrios.",
      },
    ],
  }),
  component: VendasPage,
});

function VendasPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => intervaloDe("mes"));

  const dias = usePedidosDia(periodo);
  const rca = usePedidosRca(periodo);
  const posicao = usePedidosPosicao();

  const linhas = dias.data ?? [];
  const valorPedidos = soma(linhas, "valor_pedidos");
  const jaFaturado = soma(linhas, "ja_faturado");
  const aFaturar = soma(linhas, "a_faturar");

  const porSituacao = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const l of posicao.data ?? []) {
      if (l.situacao === "Faturado") continue;
      acc[l.situacao] = (acc[l.situacao] ?? 0) + Number(l.valor ?? 0);
    }
    return Object.entries(acc)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [posicao.data]);

  const coresSituacao = useMemo(
    () => mapaDeCores(porSituacao.map((d) => d.nome)),
    [porSituacao],
  );

  const porRca = useMemo(() => {
    const acc: Record<
      string,
      {
        vendedor: string;
        equipe: string;
        valor_pedidos: number;
        a_faturar: number;
        pedidos: number;
        clientes: number;
      }
    > = {};
    for (const l of rca.data ?? []) {
      const nome = l.interno ? "Vendas Internas" : l.vendedor;
      acc[nome] ??= {
        vendedor: nome,
        equipe: l.interno ? "Interno" : (l.equipe ?? "—"),
        valor_pedidos: 0,
        a_faturar: 0,
        pedidos: 0,
        clientes: 0,
      };
      acc[nome].valor_pedidos += Number(l.valor_pedidos ?? 0);
      acc[nome].a_faturar += Number(l.a_faturar ?? 0);
      acc[nome].pedidos += Number(l.pedidos ?? 0);
      acc[nome].clientes += Number(l.clientes ?? 0);
    }
    return Object.values(acc).sort((a, b) => b.valor_pedidos - a.valor_pedidos);
  }, [rca.data]);

  const evolucao = useMemo(
    () =>
      [...linhas]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((l) => ({
          data: l.data,
          valor: Number(l.valor_pedidos ?? 0),
          comparativo: Number(l.ja_faturado ?? 0),
        })),
    [linhas],
  );

  return (
    <>
      <Topbar titulo="Vendas" periodo={periodo} onPeriodo={setPeriodo} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard titulo="Valor em pedidos" valor={brl(valorPedidos)} />
        <KpiCard titulo="Já faturado" valor={brl(jaFaturado)} />
        <KpiCard
          titulo="A faturar"
          valor={brl(aFaturar)}
          destaque
          detalhe="Dinheiro na fila de faturamento"
        />
        <KpiCard titulo="Pedidos no período" valor={num(soma(linhas, "pedidos"))} />
        <KpiCard
          titulo="Pedidos pendentes"
          valor={num(soma(linhas, "pedidos_pendentes"))}
          status={soma(linhas, "pedidos_pendentes") > 0 ? "atencao" : "positivo"}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Cartao titulo="Posição dos pedidos por situação">
          {posicao.isLoading ? (
            <Carregando />
          ) : porSituacao.length ? (
            <GraficoBarras
              dados={porSituacao}
              cores={coresSituacao}
              altura={Math.max(160, porSituacao.length * 56)}
            />
          ) : (
            <Vazio />
          )}
        </Cartao>

        <Cartao titulo="Evolução diária — pedidos x faturado">
          {dias.isLoading ? (
            <Carregando />
          ) : evolucao.length ? (
            <GraficoLinha
              dados={evolucao}
              segundaSerie={{
                chave: "comparativo",
                nome: "Já faturado",
                cor: "#2A78D6",
              }}
            />
          ) : (
            <Vazio />
          )}
        </Cartao>
      </div>

      <Cartao titulo="Pedidos por RCA" className="mt-6">
        {rca.isLoading ? (
          <Carregando />
        ) : porRca.length ? (
          <Tabela
            linhas={porRca}
            chave={(l) => l.vendedor}
            colunas={[
              { rotulo: "Vendedor", titulo: true, celula: (l) => l.vendedor },
              { rotulo: "Equipe", celula: (l) => l.equipe },
              {
                rotulo: "Valor em pedidos",
                direita: true,
                celula: (l) => brl(l.valor_pedidos, true),
              },
              {
                rotulo: "A faturar",
                direita: true,
                celula: (l) => (
                  <span className="font-semibold">{brl(l.a_faturar, true)}</span>
                ),
              },
              { rotulo: "Pedidos", direita: true, celula: (l) => num(l.pedidos) },
              { rotulo: "Clientes", direita: true, celula: (l) => num(l.clientes) },
            ]}
          />
        ) : (
          <Vazio />
        )}
      </Cartao>
    </>
  );
}
