import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  CircleSlash,
  MinusCircle,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { Tabela } from "@/components/portal/Tabela";
import { TopbarMes, mesCorrente } from "@/components/portal/TopbarMes";
import { usePoliticaDanone, type PoliticaDanone } from "@/lib/danone";
import { brl, num, pct } from "@/lib/format";

export const Route = createFileRoute("/_portal/politica")({
  head: () => ({
    meta: [
      { title: "Política Comercial Danone — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Apuração mensal da Política Comercial Danone da equipe de Distribuição da Delifrios.",
      },
      {
        property: "og:title",
        content: "Política Comercial Danone — DX Vendas Delifrios",
      },
      {
        property: "og:description",
        content:
          "Escada 80/100/130, quebra e prêmio variável por vendedor, mês a mês.",
      },
    ],
  }),
  component: PoliticaPage,
});

const ESTILO_STATUS: Record<
  string,
  { cor: string; fundo: string; icone: typeof CheckCircle2 }
> = {
  "sem meta": { cor: "#7A746B", fundo: "#EFEDE7", icone: CircleSlash },
  "abaixo de 80%": { cor: "#D03B3B", fundo: "#FBECEC", icone: CircleAlert },
  "meio prêmio": { cor: "#FAB219", fundo: "#FEF6E4", icone: MinusCircle },
  "prêmio cheio": { cor: "#0CA30C", fundo: "#EAF7EA", icone: CheckCircle2 },
  "prêmio máximo": { cor: "#067A06", fundo: "#E2F5E2", icone: BadgeCheck },
};

function BadgeStatus({ status }: { status: string }) {
  const e = ESTILO_STATUS[status] ?? ESTILO_STATUS["sem meta"]!;
  const Icone = e.icone;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ color: e.cor, backgroundColor: e.fundo }}
    >
      <Icone className="size-3.5 shrink-0" />
      {status}
    </span>
  );
}

function valorUnidade(v: number | null, unidade: string) {
  if (v === null || v === undefined) return "—";
  if (unidade === "t") return `${num(v, 2)} t`;
  if (unidade === "%") return pct(v * 100);
  return brl(v);
}

function PainelVendedor({ linhas }: { linhas: PoliticaDanone[] }) {
  const total = linhas.find((l) => l.ordem === 8);
  const quebra = linhas.find((l) => l.ordem === 7);
  const kpis = linhas
    .filter((l) => l.ordem >= 1 && l.ordem <= 6)
    .sort((a, b) => a.ordem - b.ordem);
  const quebraOk = (quebra?.status ?? "").toLowerCase().includes("dentro")
    ? true
    : (quebra?.realizado ?? 0) <= 0.03;

  return (
    <Cartao className="mb-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold">
            {linhas[0]?.vendedor ?? "—"}
          </h2>
          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
            Total do mês
          </p>
          <p
            className="text-2xl font-extrabold leading-tight tabular"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {brl(total?.premio ?? 0)}
          </p>
        </div>

        {quebra ? (
          <span
            className="inline-flex h-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-bold"
            style={{
              color: quebraOk ? "#0CA30C" : "#D03B3B",
              backgroundColor: quebraOk ? "#EAF7EA" : "#FBECEC",
            }}
          >
            {quebraOk ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <TriangleAlert className="size-4" />
            )}
            Quebra {pct((quebra.realizado ?? 0) * 100)} —{" "}
            {quebraOk ? "dentro do limite" : "corta 30%"}
          </span>
        ) : null}
      </div>

      {kpis.length ? (
        <Tabela<PoliticaDanone>
          linhas={kpis}
          chave={(l) => `${l.codusur}-${l.ordem}`}
          colunas={[
            { rotulo: "KPI", titulo: true, celula: (l) => l.kpi },
            {
              rotulo: "Meta",
              direita: true,
              celula: (l) => valorUnidade(l.meta, l.unidade),
            },
            {
              rotulo: "Realizado",
              direita: true,
              celula: (l) => valorUnidade(l.realizado, l.unidade),
            },
            {
              rotulo: "Atingimento",
              direita: true,
              celula: (l) =>
                l.atingimento === null || l.atingimento === undefined
                  ? "—"
                  : pct(l.atingimento * 100),
            },
            {
              rotulo: "Prêmio",
              direita: true,
              celula: (l) => brl(l.premio ?? 0),
            },
            { rotulo: "Status", celula: (l) => <BadgeStatus status={l.status} /> },
          ]}
        />
      ) : (
        <Vazio texto="Sem KPIs apurados neste mês." />
      )}
    </Cartao>
  );
}

function PoliticaPage() {
  const [mes, setMes] = useState(mesCorrente());
  const consulta = usePoliticaDanone(mes);

  const grupos = useMemo(() => {
    const mapa = new Map<number, PoliticaDanone[]>();
    for (const l of consulta.data ?? []) {
      const atual = mapa.get(l.codusur) ?? [];
      atual.push(l);
      mapa.set(l.codusur, atual);
    }
    return [...mapa.values()].sort((a, b) =>
      (a[0]?.vendedor ?? "").localeCompare(b[0]?.vendedor ?? ""),
    );
  }, [consulta.data]);

  const semMeta = (consulta.data ?? []).some((l) => l.status === "sem meta");

  return (
    <>
      <TopbarMes titulo="Política Comercial Danone" mes={mes} onMes={setMes} />

      <p className="mb-4 text-sm text-muted-foreground">
        Apuração automática da Política Comercial Danone v1 — escada 80/100/130,
        quebra &gt;3% corta 30% do variável.
      </p>

      {semMeta ? (
        <div
          className="mb-6 flex items-start gap-2 rounded-md p-3 text-[13px]"
          style={{
            backgroundColor: "#FEF6E4",
            borderLeft: "3px solid #FAB219",
          }}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" style={{ color: "#FAB219" }} />
          <span>
            Metas de tonelada ainda não cadastradas — os três KPIs de volume não
            pontuam até o cadastro.
          </span>
        </div>
      ) : null}

      {consulta.isLoading ? (
        <Carregando />
      ) : grupos.length ? (
        grupos.map((linhas) => (
          <PainelVendedor key={linhas[0]?.codusur} linhas={linhas} />
        ))
      ) : (
        <Vazio texto="Sem apuração para o mês selecionado." />
      )}
    </>
  );
}
