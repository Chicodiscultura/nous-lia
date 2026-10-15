import { createFileRoute } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { GraficoLinha } from "@/components/portal/GraficoLinha";
import { KpiCard } from "@/components/portal/KpiCard";
import { Tabela } from "@/components/portal/Tabela";
import { TopbarMes, mesCorrente, rotuloMes } from "@/components/portal/TopbarMes";
import { useTelaPequena } from "@/hooks/use-mobile";
import {
  ROTULO_BLOCO,
  useDanoneMetas,
  useDanoneOperacao,
  useDanoneOperacaoVendas,
  useDanoneP4P,
  type DanoneOperacao,
  type DanoneP4P,
} from "@/lib/danone";
import { brl, num, pct } from "@/lib/format";
import { CORES_SERIE } from "@/lib/serie-cores";

export const Route = createFileRoute("/_portal/danone")({
  head: () => ({
    meta: [
      { title: "Programas Danone — LIA · NOUS" },
      {
        name: "description",
        content:
          "Pay for Performance, operação mês a mês e Programa Master da parceria Danone.",
      },
      { property: "og:title", content: "Programas Danone — LIA · NOUS" },
      {
        property: "og:description",
        content: "P4P, toneladas, sell out, DN e infaltáveis da operação Danone.",
      },
    ],
  }),
  component: DanonePage,
});

const mesCurto = (m: string) => {
  const d = new Date(`${String(m).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(m);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
};

function SeletorBase({
  base,
  onBase,
}: {
  base: "faturado" | "vendas";
  onBase: (b: "faturado" | "vendas") => void;
}) {
  return (
    <div className="card-surface flex gap-1 p-1">
      {(
        [
          { v: "faturado", r: "Faturado" },
          { v: "vendas", r: "Vendas" },
        ] as const
      ).map((o) => {
        const ativo = base === o.v;
        return (
          <button
            key={o.v}
            onClick={() => onBase(o.v)}
            className="min-h-[36px] rounded-md px-3 text-xs font-medium transition-colors sm:text-sm"
            style={
              ativo
                ? { backgroundColor: "var(--ink)", color: "var(--on-ink)" }
                : { color: "var(--muted-foreground)" }
            }
          >
            {o.r}
          </button>
        );
      })}
    </div>
  );
}

function CardsOperacao({ atual }: { atual: DanoneOperacao | null }) {
  const toneladas =
    (atual?.ton_alta ?? 0) + (atual?.ton_mb ?? 0) + (atual?.ton_yopro ?? 0);
  const sellout =
    (atual?.rs_alta ?? 0) + (atual?.rs_mb ?? 0) + (atual?.rs_yopro ?? 0);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        titulo="Toneladas (Alta+MB+YoPro)"
        valor={`${num(toneladas, 2)} t`}
        detalhe={`Alta ${num(atual?.ton_alta ?? 0, 2)} t · MB ${num(atual?.ton_mb ?? 0, 2)} t · YoPro ${num(atual?.ton_yopro ?? 0, 2)} t`}
      />
      <KpiCard
        titulo="Sell Out R$"
        valor={brl(sellout)}
        detalhe={`Alta ${brl(atual?.rs_alta ?? 0)} · MB ${brl(atual?.rs_mb ?? 0)} · YoPro ${brl(atual?.rs_yopro ?? 0)}`}
      />
      <KpiCard
        titulo="DN Iogurte / DN YoPro"
        valor={`${num(atual?.dn_iogurte ?? 0)} / ${num(atual?.dn_yopro ?? 0)}`}
        detalhe="Distribuição numérica no mês"
      />
      <KpiCard
        titulo="Infaltáveis"
        valor={pct(atual?.pct_infaltaveis ?? 0)}
        detalhe={`${num(atual?.pdvs_6grupos ?? 0)} de ${num(atual?.pdvs_danone ?? 0)} PDVs com os 6 grupos`}
      />
    </div>
  );
}

function DanonePage() {
  const [mes, setMes] = useState(mesCorrente());
  const [base, setBase] = useState<"faturado" | "vendas">("faturado");
  const pequena = useTelaPequena();
  const p4p = useDanoneP4P(mes);
  const metas = useDanoneMetas(mes);
  const operacao = useDanoneOperacao();
  const operacaoVendas = useDanoneOperacaoVendas();

  const simulado = (metas.data ?? []).some((m) =>
    String(m.origem ?? "").toUpperCase().includes("SIMULACAO"),
  );

  const linhas = operacao.data ?? [];
  const linhasVendas = operacaoVendas.data ?? [];
  const doMes = (ls: DanoneOperacao[]) =>
    ls.find((l) => String(l.mes).slice(0, 7) === mes.slice(0, 7)) ?? null;

  const atual = useMemo(() => doMes(linhas), [linhas, mes]);
  const atualVendas = useMemo(() => doMes(linhasVendas), [linhasVendas, mes]);

  const totalPremio = (p4p.data ?? []).reduce(
    (s, l) => s + Number(l.premio_rs ?? 0),
    0,
  );

  const rs = (l: DanoneOperacao | null) =>
    (l?.rs_alta ?? 0) + (l?.rs_mb ?? 0) + (l?.rs_yopro ?? 0);
  const aFaturar = Math.max(0, rs(atualVendas) - rs(atual));
  const pdvsAguardando = Math.max(
    0,
    (atualVendas?.pdvs_danone ?? 0) - (atual?.pdvs_danone ?? 0),
  );

  const linhasGrafico = base === "vendas" ? linhasVendas : linhas;
  const carregandoGraficos =
    base === "vendas" ? operacaoVendas.isLoading : operacao.isLoading;

  /** Últimos 6 meses disponíveis, em ordem cronológica. */
  const ultimosMeses = linhasGrafico.slice(-6);
  const chavesMes = ultimosMeses.map((l) => mesCurto(l.mes));

  const dadosBarras = (
    [
      ["Alta Margem", "ton_alta"],
      ["Média/Baixa", "ton_mb"],
      ["YoPro", "ton_yopro"],
    ] as const
  ).map(([categoria, campo]) => {
    const linha: Record<string, string | number> = { categoria };
    ultimosMeses.forEach((l) => {
      linha[mesCurto(l.mes)] = Number(l[campo] ?? 0);
    });
    return linha;
  });


  const dadosLinha = linhasGrafico.map((l) => ({
    data: String(l.mes).slice(0, 10),
    valor: Number(l.dn_iogurte ?? 0),
    comparativo: Number(l.dn_yopro ?? 0),
  }));

  return (
    <>
      <TopbarMes
        titulo="Danone"
        descricao={rotuloMes(mes)}
        mes={mes}
        onMes={setMes}
      />

      {/* Parte 1 — Operação */}
      <header className="mb-4 border-b pb-2">
        <h2 className="text-lg font-extrabold">Operação Danone</h2>
        <p className="text-sm text-muted-foreground">
          Vendas, faturamento, distribuição numérica e infaltáveis, mês a mês.
        </p>
      </header>

      <h3 className="mb-3 text-base font-extrabold">
        Operação mês a mês — Vendas (pedidos)
      </h3>
      <CardsOperacao atual={atualVendas} />
      <p className="mb-6 mt-2 text-xs text-muted-foreground">
        Base: pedidos digitados na data do pedido (compara com a rotina 322;
        exclui itens fora do programa).
      </p>

      <div className="mb-6">
        <KpiCard
          titulo="A faturar no mês"
          valor={brl(aFaturar)}
          detalhe={`${num(pdvsAguardando)} PDVs aguardando faturamento`}
          destaque
          {...(aFaturar > 0 ? { status: "atencao" as const } : {})}
        />
      </div>

      <h3 className="mb-3 text-base font-extrabold">
        Operação mês a mês — Faturado (NF emitida)
      </h3>
      <CardsOperacao atual={atual} />
      <p className="mb-6 mt-2 text-xs text-muted-foreground">
        Base: notas emitidas (régua do P4P e da apuração MTRIX).
      </p>

      <Cartao
        titulo="Toneladas por categoria"
        acao={<SeletorBase base={base} onBase={setBase} />}
        className="mb-6"
      >
        {carregandoGraficos ? (
          <Carregando />
        ) : chavesMes.length ? (
          <ResponsiveContainer width="100%" height={pequena ? 240 : 320}>
            <BarChart
              data={dadosBarras}
              margin={{ top: 8, right: 8, bottom: 4, left: 0 }}
              barGap={2}
              barCategoryGap="30%"
            >
              <CartesianGrid vertical={false} stroke="#E7E4DC" />
              <XAxis
                dataKey="categoria"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#7A746B", fontSize: pequena ? 10 : 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={pequena ? 36 : 56}
                tick={{ fill: "#7A746B", fontSize: pequena ? 10 : 12 }}
              />
              <Tooltip
                formatter={(v: number) => `${num(v, 2)} t`}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #E7E4DC",
                  fontFamily: "Inter, sans-serif",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {chavesMes.map((m, i) => (
                <Bar
                  key={m}
                  dataKey={m}
                  fill={CORES_SERIE[i % CORES_SERIE.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Vazio />
        )}
      </Cartao>


      <Cartao
        titulo="Distribuição numérica (DN) por mês"
        acao={<SeletorBase base={base} onBase={setBase} />}
        className="mb-6"
      >
        {carregandoGraficos ? (
          <Carregando />
        ) : dadosLinha.length ? (
          <GraficoLinha
            dados={dadosLinha}
            cor={CORES_SERIE[0]}
            segundaSerie={{ chave: "comparativo", nome: "DN YoPro", cor: CORES_SERIE[3] }}
          />
        ) : (
          <Vazio />
        )}
      </Cartao>

      {/* Parte 2 — Programas */}
      <header className="mb-4 mt-10 border-b pb-2">
        <h2 className="text-lg font-extrabold">Programas Danone</h2>
        <p className="text-sm text-muted-foreground">
          Pay for Performance (P4P) e Programa Master, apurados sobre a operação acima.
        </p>
      </header>

      {/* Seção A — P4P */}
      <Cartao titulo="Pay for Performance (P4P)" className="mb-6">
        {simulado ? (
          <div
            className="mb-4 flex items-start gap-2 rounded-md p-3 text-[13px] font-semibold"
            style={{ backgroundColor: "#FEF6E4", borderLeft: "3px solid #FAB219" }}
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" style={{ color: "#FAB219" }} />
            <span>
              ⚠ Metas SIMULADAS — não são as metas oficiais da Danone. Prêmios
              abaixo são ilustrativos.
            </span>
          </div>
        ) : null}

        {p4p.isLoading ? (
          <Carregando />
        ) : p4p.data?.length ? (
          <>
            <Tabela<DanoneP4P>
              linhas={p4p.data}
              chave={(l) => l.bloco_kpi}
              colunas={[
                {
                  rotulo: "Bloco",
                  titulo: true,
                  celula: (l) => ROTULO_BLOCO[l.bloco_kpi] ?? l.bloco_kpi,
                },
                {
                  rotulo: "Meta",
                  direita: true,
                  celula: (l) =>
                    `${num(l.meta_qtd ?? 0, 2)} ${l.unidade ?? ""}`.trim(),
                },
                {
                  rotulo: "Realizado",
                  direita: true,
                  celula: (l) =>
                    `${num(l.real_qtd ?? 0, 2)} ${l.unidade ?? ""}`.trim(),
                },
                {
                  rotulo: "Atingimento",
                  direita: true,
                  celula: (l) => pct(l.atingimento_pct ?? 0),
                },
                {
                  rotulo: "Faixa",
                  direita: true,
                  celula: (l) => pct(l.faixa_premio_pct ?? 0),
                },
                {
                  rotulo: "Elegível DN",
                  celula: (l) => (l.elegivel_dn ? "Sim" : "Não"),
                },
                {
                  rotulo: "Prêmio (R$)",
                  direita: true,
                  celula: (l) => brl(l.premio_rs ?? 0),
                },
              ]}
            />
            <p className="mt-3 flex items-center justify-between border-t pt-3 text-sm font-extrabold tabular">
              <span>Total de prêmio</span>
              <span>{brl(totalPremio)}</span>
            </p>
          </>
        ) : (
          <Vazio texto="Metas do P4P ainda não cadastradas para este mês. A apuração de prêmio começa quando as metas oficiais da Danone forem registradas." />
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Apuração no nível distribuidor. DN só premia se algum bloco de
          tonelagem fechar ≥100% no mês. Atingimento capado em 115%.
        </p>
      </Cartao>

      {/* Seção C — Programa Master */}
      <Cartao titulo="Programa Master">
        <div
          className="mb-4 rounded-md p-3 text-[13px]"
          style={{ backgroundColor: "#EFEDE7", borderLeft: "3px solid #B9B4A9" }}
        >
          Aguardando metas oficiais da Danone
        </div>
        <dl className="divide-y text-sm">
          {[
            ["Iogurte Alta", `${num(atual?.ton_alta ?? 0, 2)} t`],
            ["Iogurte Média/Baixa", `${num(atual?.ton_mb ?? 0, 2)} t`],
            ["DN", `${num(atual?.pdvs_danone ?? 0)} PDVs`],
            ["Infaltáveis", pct(atual?.pct_infaltaveis ?? 0)],
            ["MSL", "sem medição (aguarda integração ISA)"],
          ].map(([rotulo, valor]) => (
            <div key={rotulo} className="flex items-baseline justify-between gap-3 py-2">
              <dt className="text-muted-foreground">{rotulo}</dt>
              <dd className="text-right font-semibold tabular">{valor}</dd>
            </div>
          ))}
        </dl>
      </Cartao>
    </>
  );
}
