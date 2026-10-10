import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { GraficoLinha } from "@/components/portal/GraficoLinha";
import { KpiCard } from "@/components/portal/KpiCard";
import { Topbar } from "@/components/portal/Topbar";
import { usePerfil, useSessao, podeVerMargem } from "@/hooks/useSessao";
import { useVendasFornecedor } from "@/lib/dados";
import { brl, kg, num, pct } from "@/lib/format";
import { intervaloDe, type Periodo } from "@/lib/periodo";


export const Route = createFileRoute("/_portal/fornecedores/$fornecedor")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.fornecedor} — DX Vendas Delifrios` },
      {
        name: "description",
        content: `Evolução de faturamento, kg e positivação do fornecedor ${params.fornecedor} na Delifrios.`,
      },
      { property: "og:title", content: `${params.fornecedor} — DX Vendas Delifrios` },
      {
        property: "og:description",
        content: `Indicadores do fornecedor ${params.fornecedor}.`,
      },
    ],
  }),
  component: DetalheFornecedor,
});

function DetalheFornecedor() {
  const { fornecedor } = Route.useParams();
  const [periodo, setPeriodo] = useState<Periodo>(() => intervaloDe("mes"));
  const consulta = useVendasFornecedor(periodo);
  const { session } = useSessao();
  const { data: usuario } = usePerfil(session?.user.email ?? undefined);
  const margemLiberada = podeVerMargem(usuario?.perfil);

  const linhas = useMemo(
    () => (consulta.data ?? []).filter((l) => l.fornecedor === fornecedor),
    [consulta.data, fornecedor],
  );

  const serie = useMemo(
    () =>
      [...linhas]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((l) => ({ data: l.data, valor: Number(l.faturamento ?? 0) })),
    [linhas],
  );

  const total = linhas.reduce((s, l) => s + Number(l.faturamento ?? 0), 0);
  const kgTotal = linhas.reduce((s, l) => s + Number(l.kg ?? 0), 0);
  const positivados = linhas.reduce(
    (s, l) => s + Number(l.clientes_positivados ?? 0),
    0,
  );
  const margemValor = linhas.reduce(
    (s, l) => s + Number(l.margem_contribuicao ?? 0),
    0,
  );
  const comPct = linhas.filter((l) => l.margem_pct !== null);
  const margemPct =
    total > 0
      ? (margemValor / total) * 100
      : comPct.length
        ? comPct.reduce((s, l) => s + Number(l.margem_pct ?? 0), 0) / comPct.length
        : null;

  return (
    <>
      <Link
        to="/fornecedores"
        className="mb-3 inline-block text-sm text-muted-foreground"
      >
        ← Voltar para fornecedores
      </Link>
      <Topbar titulo={fornecedor} periodo={periodo} onPeriodo={setPeriodo} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard titulo="Faturamento" valor={brl(total)} destaque />
        <KpiCard titulo="Kg vendido" valor={kg(kgTotal)} />
        <KpiCard
          titulo="R$/Kg"
          valor={kgTotal > 0 ? brl(total / kgTotal, true) : "—"}
        />
        <KpiCard titulo="Clientes positivados" valor={num(positivados)} />
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
              ? `${brl(margemValor)} no período`
              : "Disponível para perfis supervisor e diretoria"
          }
        />
      </div>


      <Cartao titulo="Evolução do faturamento" className="mt-6">
        {consulta.isLoading ? (
          <Carregando />
        ) : serie.length ? (
          <GraficoLinha dados={serie} />
        ) : (
          <Vazio />
        )}
      </Cartao>
    </>
  );
}
