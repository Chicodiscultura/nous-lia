import { createFileRoute } from "@tanstack/react-router";
import { AlarmClock, CircleAlert, CircleCheck, Clock, HelpCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { KpiCard } from "@/components/portal/KpiCard";
import { Tabela, type Coluna } from "@/components/portal/Tabela";
import { Topbar } from "@/components/portal/Topbar";
import { useDormencia, type Dormencia, type EstadoDormencia } from "@/lib/dados";
import { brl, ddmm, num } from "@/lib/format";

export const Route = createFileRoute("/_portal/carteira")({
  head: () => ({
    meta: [
      { title: "Carteira — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Dormência da carteira: clientes parados medidos contra o próprio ritmo de compra.",
      },
      { property: "og:title", content: "Carteira — DX Vendas Delifrios" },
      {
        property: "og:description",
        content: "Clientes atrasados, dormindo e críticos por ritmo de compra.",
      },
    ],
  }),
  component: CarteiraPage,
});

const ESTADOS: {
  estado: EstadoDormencia;
  rotulo: string;
  cor: string;
  icone: typeof CircleAlert;
}[] = [
  { estado: "critico", rotulo: "Crítico", cor: "#D03B3B", icone: CircleAlert },
  { estado: "dormindo", rotulo: "Dormindo", cor: "#EC835A", icone: AlarmClock },
  { estado: "atrasado", rotulo: "Atrasado", cor: "#FAB219", icone: Clock },
  { estado: "sem ritmo", rotulo: "Sem ritmo", cor: "#8A8479", icone: HelpCircle },
  { estado: "em dia", rotulo: "Em dia", cor: "#0CA30C", icone: CircleCheck },
];

const meta = (estado: EstadoDormencia) =>
  ESTADOS.find((e) => e.estado === estado) ?? ESTADOS[3]!;

function BadgeEstado({ linha }: { linha: Dormencia }) {
  const m = meta(linha.estado);
  const Icone = m.icone;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular"
      style={{ backgroundColor: `${m.cor}1A`, color: m.cor }}
      title={m.rotulo}
    >
      <Icone className="size-3.5" />
      {linha.razao !== null && Number.isFinite(Number(linha.razao))
        ? `${num(linha.razao, 1)}x`
        : "—"}
    </span>
  );
}

function BadgeVencido({ linha }: { linha: Dormencia }) {
  if (!linha.tem_titulo_vencido) {
    return <span className="text-xs text-muted-foreground">Não</span>;
  }
  return (
    <div className="inline-flex flex-col items-end gap-0.5">
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
        style={{ backgroundColor: "#D03B3B1A", color: "#D03B3B" }}
      >
        <CircleAlert className="size-3.5" />
        Sim
      </span>
      {linha.valor_vencido !== null && linha.valor_vencido !== undefined ? (
        <span className="text-[11px] text-muted-foreground tabular">
          {brl(linha.valor_vencido)}
        </span>
      ) : null}
    </div>
  );
}

function CarteiraPage() {
  const dormencia = useDormencia();
  const [filtros, setFiltros] = useState<EstadoDormencia[]>(["critico"]);
  const [soVencidos, setSoVencidos] = useState(false);
  const [rca, setRca] = useState("");
  const [cidade, setCidade] = useState("");

  const linhas = useMemo(
    () =>
      [...(dormencia.data ?? [])].sort(
        (a, b) => Number(b.faturamento_12m ?? 0) - Number(a.faturamento_12m ?? 0),
      ),
    [dormencia.data],
  );

  const rcas = useMemo(
    () =>
      [...new Set(linhas.map((l) => l.rca).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b), "pt-BR"),
      ),
    [linhas],
  );

  const cidades = useMemo(
    () =>
      [...new Set(linhas.map((l) => l.cidade).filter(Boolean))].sort((a, b) =>
        String(a).localeCompare(String(b), "pt-BR"),
      ),
    [linhas],
  );

  const resumo = useMemo(() => {
    const acc: Record<string, { clientes: number; faturamento: number }> = {};
    for (const l of linhas) {
      acc[l.estado] ??= { clientes: 0, faturamento: 0 };
      acc[l.estado]!.clientes += 1;
      acc[l.estado]!.faturamento += Number(l.faturamento_12m ?? 0);
    }
    return acc;
  }, [linhas]);

  const filtradas = useMemo(
    () =>
      linhas.filter(
        (l) =>
          (!filtros.length || filtros.includes(l.estado)) &&
          (!soVencidos || l.tem_titulo_vencido) &&
          (!rca || l.rca === rca) &&
          (!cidade || l.cidade === cidade),
      ),
    [linhas, filtros, soVencidos, rca, cidade],
  );

  const alternar = (estado: EstadoDormencia) =>
    setFiltros((atual) =>
      atual.includes(estado)
        ? atual.filter((e) => e !== estado)
        : [...atual, estado],
    );

  const colunas: Coluna<Dormencia>[] = [
    { rotulo: "Cliente", titulo: true, celula: (l) => l.cliente },
    { rotulo: "RCA", celula: (l) => l.rca ?? "—" },
    { rotulo: "Cidade", celula: (l) => l.cidade ?? "—" },
    {
      rotulo: "Última compra",
      direita: true,
      celula: (l) => ddmm(l.ultima_compra),
    },
    { rotulo: "Dias parado", direita: true, celula: (l) => num(l.dias_parado) },
    {
      rotulo: "Ritmo",
      direita: true,
      celula: (l) =>
        l.ritmo_dias !== null && Number.isFinite(Number(l.ritmo_dias))
          ? `${num(l.ritmo_dias, 0)}d`
          : "—",
    },
    {
      rotulo: "Tít. vencidos",
      direita: true,
      celula: (l) => <BadgeVencido linha={l} />,
    },
    { rotulo: "Razão", direita: true, celula: (l) => <BadgeEstado linha={l} /> },
    {
      rotulo: "Faturamento 12m",
      direita: true,
      celula: (l) => brl(l.faturamento_12m),
    },
  ];


  return (
    <>
      <Topbar
        titulo="Carteira"
        descricao="A dormência é medida contra o ritmo de compra do próprio cliente, não contra o calendário: quem compra a cada 6 dias e está 85 dias parado é mais grave que quem compra a cada 112 dias e está 135 dias parado."
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {(["atrasado", "dormindo", "critico", "sem ritmo"] as EstadoDormencia[]).map(
          (estado) => {
            const m = meta(estado);
            const r = resumo[estado];
            return (
              <KpiCard
                key={estado}
                titulo={m.rotulo}
                ponto={m.cor}
                destaque={estado === "critico"}
                {...(estado === "critico" ? { status: "critico" as const } : {})}
                valor={`${num(r?.clientes ?? 0)} clientes`}
                detalhe={`${brl(r?.faturamento ?? 0)} em 12 meses`}
              />
            );
          },
        )}
      </div>

      <Cartao titulo="Clientes por risco de dormência" className="mt-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            value={rca}
            onChange={(ev) => setRca(ev.target.value)}
            aria-label="Filtrar por RCA"
            className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-[13px]"
          >
            <option value="">Todos os RCAs</option>
            {rcas.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={cidade}
            onChange={(ev) => setCidade(ev.target.value)}
            aria-label="Filtrar por cidade"
            className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-[13px]"
          >
            <option value="">Todas as cidades</option>
            {cidades.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {ESTADOS.map((e) => {
            const ativo = filtros.includes(e.estado);
            return (
              <button
                key={e.estado}
                onClick={() => alternar(e.estado)}
                aria-pressed={ativo}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold"
                style={{
                  borderColor: ativo ? e.cor : "var(--border)",
                  backgroundColor: ativo ? `${e.cor}1A` : "transparent",
                  color: ativo ? e.cor : "var(--muted-foreground)",
                }}
              >
                <e.icone className="size-3.5" />
                {e.rotulo}
                <span className="tabular">({resumo[e.estado]?.clientes ?? 0})</span>
              </button>
            );
          })}

          <span aria-hidden className="mx-1 h-6 w-px bg-border" />

          <button
            onClick={() => setSoVencidos((v) => !v)}
            aria-pressed={soVencidos}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold"
            style={{
              borderColor: soVencidos ? "#D03B3B" : "var(--border)",
              backgroundColor: soVencidos ? "#D03B3B1A" : "transparent",
              color: soVencidos ? "#D03B3B" : "var(--muted-foreground)",
            }}
          >
            <CircleAlert className="size-3.5" />
            Com título vencido
          </button>

          <span className="ml-auto text-xs text-muted-foreground tabular">
            {num(filtradas.length)} de {num(linhas.length)} clientes
          </span>
        </div>


        {dormencia.isLoading ? (
          <Carregando />
        ) : filtradas.length ? (
          <Tabela
            colunas={colunas}
            linhas={filtradas}
            chave={(l) => String(l.codcli)}
          />
        ) : (
          <Vazio />
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          “Sem ritmo”: clientes com menos de 3 compras nos últimos 12 meses — não há
          histórico suficiente para calcular o ritmo de compra, então a razão não é
          calculada.
        </p>
      </Cartao>
    </>
  );
}
