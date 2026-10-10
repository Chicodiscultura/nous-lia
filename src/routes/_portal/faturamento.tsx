import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { GraficoLinha } from "@/components/portal/GraficoLinha";
import { KpiCard } from "@/components/portal/KpiCard";
import { Topbar } from "@/components/portal/Topbar";
import { Tabela } from "@/components/portal/Tabela";
import { soma, useVendasDia, useVendasRca, variacao } from "@/lib/dados";
import { brl, kg, num } from "@/lib/format";
import { intervaloDe, periodoAnterior, type Periodo } from "@/lib/periodo";

export const Route = createFileRoute("/_portal/faturamento")({
  head: () => ({
    meta: [
      { title: "Faturamento — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Notas fiscais emitidas: evolução diária do faturamento, comparativo com o período anterior e desempenho por RCA.",
      },
      { property: "og:title", content: "Faturamento — DX Vendas Delifrios" },
      {
        property: "og:description",
        content: "Faturamento diário e ranking por representante da Delifrios.",
      },
    ],
  }),
  component: FaturamentoPage,
});

function FaturamentoPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => intervaloDe("mes"));
  const anterior = useMemo(() => periodoAnterior(periodo), [periodo]);

  const dias = useVendasDia(periodo);
  const diasAnt = useVendasDia(anterior);
  const rca = useVendasRca(periodo);

  const atual = soma(dias.data ?? [], "faturamento");
  const ant = soma(diasAnt.data ?? [], "faturamento");
  const kgFaturado = soma(dias.data ?? [], "kg");

  const serie = useMemo(() => {
    const a = [...(dias.data ?? [])].sort((x, y) => x.data.localeCompare(y.data));
    const b = [...(diasAnt.data ?? [])].sort((x, y) => x.data.localeCompare(y.data));
    return a.map((l, i) => ({
      data: l.data,
      valor: Number(l.faturamento ?? 0),
      comparativo: Number(b[i]?.faturamento ?? 0),
    }));
  }, [dias.data, diasAnt.data]);

  const porRca = useMemo(() => {
    const acc: Record<
      string,
      {
        vendedor: string;
        equipe: string;
        faturamento: number;
        kg: number;
        clientes: number;
        notas: number;
      }
    > = {};
    for (const l of rca.data ?? []) {
      const nome = l.interno ? "Vendas Internas" : l.vendedor;
      acc[nome] ??= {
        vendedor: nome,
        equipe: l.interno ? "Interno" : (l.equipe ?? "—"),
        faturamento: 0,
        kg: 0,
        clientes: 0,
        notas: 0,
      };
      acc[nome].faturamento += Number(l.faturamento ?? 0);
      acc[nome].kg += Number(l.kg ?? 0);
      acc[nome].clientes += Number(l.clientes_atendidos ?? 0);
      acc[nome].notas += Number(l.notas ?? 0);
    }
    return Object.values(acc).sort((a, b) => b.faturamento - a.faturamento);
  }, [rca.data]);

  return (
    <>
      <Topbar titulo="Faturamento" periodo={periodo} onPeriodo={setPeriodo} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          titulo="Faturamento"
          valor={brl(atual)}
          variacao={variacao(atual, ant)}
          destaque
        />
        <KpiCard titulo="Período anterior" valor={brl(ant)} />
        <KpiCard titulo="Kg faturado" valor={kg(kgFaturado)} />
        <KpiCard
          titulo="R$/Kg"
          valor={kgFaturado > 0 ? brl(atual / kgFaturado, true) : "—"}
        />
        <KpiCard titulo="Notas" valor={num(soma(dias.data ?? [], "notas"))} />
      </div>

      <Cartao titulo="Evolução diária x período anterior" className="mt-6">
        {dias.isLoading ? (
          <Carregando />
        ) : serie.length ? (
          <GraficoLinha
            dados={serie}
            segundaSerie={{
              chave: "comparativo",
              nome: "Período anterior",
              cor: "#2A78D6",
            }}
          />
        ) : (
          <Vazio />
        )}
      </Cartao>

      <Cartao titulo="Desempenho por RCA" className="mt-6">
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
                rotulo: "Faturamento",
                direita: true,
                celula: (l) => brl(l.faturamento, true),
              },
              { rotulo: "Kg", direita: true, celula: (l) => num(l.kg) },
              {
                rotulo: "Positivação",
                direita: true,
                celula: (l) => num(l.clientes),
              },
              { rotulo: "Notas", direita: true, celula: (l) => num(l.notas) },
            ]}
          />
        ) : (
          <Vazio />
        )}
      </Cartao>
    </>
  );
}
