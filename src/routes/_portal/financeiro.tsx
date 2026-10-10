import { createFileRoute } from "@tanstack/react-router";

import { Cartao, Carregando } from "@/components/portal/Cartao";
import { KpiCard } from "@/components/portal/KpiCard";
import { Topbar } from "@/components/portal/Topbar";
import { useRegistroUnico, type PagarBuckets, type ReceberBuckets } from "@/lib/dados";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_portal/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Contas a receber e a pagar por faixa de vencimento na distribuidora Delifrios.",
      },
      { property: "og:title", content: "Financeiro — DX Vendas Delifrios" },
      {
        property: "og:description",
        content: "Buckets de vencimento de contas a receber e a pagar.",
      },
    ],
  }),
  component: FinanceiroPage,
});

function FinanceiroPage() {
  const receber = useRegistroUnico<ReceberBuckets>("v_receber_buckets");
  const pagar = useRegistroUnico<PagarBuckets>("v_pagar_buckets");

  const r = receber.data;
  const p = pagar.data;

  const bucketsReceber = [
    { rotulo: "A vencer", valor: r?.a_vencer, status: "positivo" as const },
    { rotulo: "Vencido até 2 dias", valor: r?.vencido_ate_2d, status: "atencao" as const },
    { rotulo: "Vencido 3 a 7 dias", valor: r?.vencido_3_a_7d, status: "atencao" as const },
    { rotulo: "Vencido 8 a 15 dias", valor: r?.vencido_8_a_15d, status: "grave" as const },
    { rotulo: "Vencido 16 a 30 dias", valor: r?.vencido_16_a_30d, status: "grave" as const },
    { rotulo: "Vencido +30 dias", valor: r?.vencido_mais_30d, status: "critico" as const },
  ];

  const bucketsPagar = [
    { rotulo: "Próximos 2 dias", valor: p?.proximos_2d, status: "atencao" as const },
    { rotulo: "3 a 10 dias", valor: p?.de_3_a_10d, status: "atencao" as const },
    { rotulo: "11 a 20 dias", valor: p?.de_11_a_20d, status: "positivo" as const },
    { rotulo: "21 a 30 dias", valor: p?.de_21_a_30d, status: "positivo" as const },
    { rotulo: "Já vencidos", valor: p?.ja_vencidos, status: "critico" as const },
  ];

  return (
    <>
      <Topbar titulo="Financeiro" descricao="Posição de títulos em aberto" />

      {receber.isLoading || pagar.isLoading ? (
        <Carregando />
      ) : (
        <div className="space-y-6">
          <Cartao
            titulo="Contas a receber"
            acao={
              <span className="text-sm font-extrabold tabular">
                Total {brl(r?.total_aberto ?? 0)}
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {bucketsReceber.map((b) => (
                <KpiCard
                  key={b.rotulo}
                  titulo={b.rotulo}
                  valor={brl(b.valor ?? 0)}
                  status={b.status}
                />
              ))}
            </div>
          </Cartao>

          <Cartao
            titulo="Contas a pagar"
            acao={
              <span className="text-sm font-extrabold tabular">
                Total {brl(p?.total_aberto ?? 0)}
              </span>
            }
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {bucketsPagar.map((b) => (
                <KpiCard
                  key={b.rotulo}
                  titulo={b.rotulo}
                  valor={brl(b.valor ?? 0)}
                  status={b.status}
                />
              ))}
            </div>
          </Cartao>
        </div>
      )}
    </>
  );
}
