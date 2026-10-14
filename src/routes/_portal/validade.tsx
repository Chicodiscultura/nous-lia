import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  CircleAlert,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { GraficoBarras } from "@/components/portal/GraficoBarras";
import { GraficoLinha } from "@/components/portal/GraficoLinha";
import { KpiCard } from "@/components/portal/KpiCard";
import { Tabela, type Coluna } from "@/components/portal/Tabela";
import { Topbar } from "@/components/portal/Topbar";
import { brl, ddmm, ddmmaaaa, num, pct, rotuloProduto } from "@/lib/format";
import {
  useCompradoresProduto,
  useLotesVivos,
  useTermometro,
  useTermometroHistorico,
  useTermometroLotes,
  useTermometroSemanas,
  type LoteVivo,
  type Temperatura,
  type TermometroLote,
  type TermometroSku,
} from "@/lib/validade";

export const Route = createFileRoute("/_portal/validade")({
  head: () => ({
    meta: [
      { title: "Validade — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Termômetro de Validade: capital em risco por SKU e por lote, com painel da operação Danone.",
      },
      { property: "og:title", content: "Termômetro de Validade — DX Vendas" },
      {
        property: "og:description",
        content: "O estoque atual gira, no ritmo atual, antes de vencer?",
      },
    ],
  }),
  component: ValidadePage,
});

const COD_DANONE = 108;

const COR_CRITICO = "#8B1E1E";

const FAIXAS: { temperatura: Temperatura; rotulo: string; cor: string }[] = [
  { temperatura: "CRITICO", rotulo: "Crítico", cor: COR_CRITICO },
  { temperatura: "FERVENDO", rotulo: "Fervendo", cor: "#D03B3B" },
  { temperatura: "QUENTE", rotulo: "Quente", cor: "#EC7A2E" },
  { temperatura: "MORNO", rotulo: "Morno", cor: "#FAB219" },
  { temperatura: "TEPIDO", rotulo: "Tépido", cor: "#6FA8DC" },
  { temperatura: "FRIO", rotulo: "Frio", cor: "#5FBF8A" },
  { temperatura: "SEM VALIDADE", rotulo: "Sem validade", cor: "#B9B4A9" },
];

const faixaDe = (t: Temperatura) =>
  FAIXAS.find((f) => f.temperatura === t) ?? FAIXAS[FAIXAS.length - 1]!;

const somar = (linhas: TermometroSku[], campo: keyof TermometroSku) =>
  linhas.reduce((s, l) => s + Number(l[campo] ?? 0), 0);

function BadgeTemperatura({ t }: { t: Temperatura }) {
  const f = faixaDe(t);
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-tight"
      style={{ backgroundColor: `${f.cor}1A`, color: f.cor }}
    >
      {f.rotulo}
    </span>
  );
}

/** Escada de desconto por validade do lote FIFO. */
function BadgeAcao({ sku }: { sku: TermometroSku }) {
  const d = sku.desconto_pct;
  if (d === null || d === undefined) return <span>—</span>;
  const cor = Number(d) >= 40 ? COR_CRITICO : "#EC7A2E";
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        className="rounded-full px-2 py-0.5 text-xs font-bold"
        style={{ backgroundColor: `${cor}1A`, color: cor }}
      >
        −{num(d, 0)}%
      </span>
      <span className="tabular">{brl(sku.preco_acao, true)}</span>
    </span>
  );
}

function Kpis({ linhas }: { linhas: TermometroSku[] }) {
  const estoque = somar(linhas, "vl_estoque");
  const risco = somar(linhas, "vl_vence") + somar(linhas, "vl_critico");
  const porFaixa = (t: Temperatura) => linhas.filter((l) => l.temperatura === t);
  const fervendo = porFaixa("FERVENDO");
  const quente = porFaixa("QUENTE");
  const janelaFechada = linhas.filter((l) => Number(l.qt_critico ?? 0) > 0);
  const divergentes = linhas.filter(
    (l) => l.diverg_lote !== null && l.diverg_lote !== undefined,
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-6">
      <KpiCard
        titulo="Estoque a custo"
        valor={brl(estoque)}
        detalhe={`${num(linhas.length)} SKUs no snapshot`}
      />
      <KpiCard
        titulo="Capital em risco"
        destaque
        status={risco > 0 ? "grave" : "positivo"}
        valor={brl(risco)}
        detalhe={`${pct(estoque > 0 ? (risco / estoque) * 100 : 0)} do estoque`}
      />
      <KpiCard
        titulo="Janela fechada (crítico)"
        ponto={COR_CRITICO}
        status="critico"
        valor={`${num(janelaFechada.length)} SKUs`}
        detalhe={`${brl(somar(janelaFechada, "vl_critico"))} a custo`}
      />
      <KpiCard
        titulo="SKUs Fervendo"
        ponto="#D03B3B"
        status="critico"
        valor={`${num(fervendo.length)} SKUs`}
        detalhe={`${brl(somar(fervendo, "vl_vence"))} em risco`}
      />
      <KpiCard
        titulo="SKUs Quente"
        ponto="#EC7A2E"
        status="atencao"
        valor={`${num(quente.length)} SKUs`}
        detalhe={`${brl(somar(quente, "vl_vence"))} em risco`}
      />
      <KpiCard
        titulo="Divergências lote × estoque"
        valor={`${num(divergentes.length)} SKUs`}
        detalhe={
          <span title="conferir em inventário rotativo">
            conferir em inventário rotativo
          </span>
        }
      />
    </div>
  );
}

function Termometro({
  linhas,
  selecionadas,
  onAlternar,
}: {
  linhas: TermometroSku[];
  selecionadas: Set<Temperatura>;
  onAlternar: (t: Temperatura) => void;
}) {
  const dados = FAIXAS.map((f) => {
    const itens = linhas.filter((l) => l.temperatura === f.temperatura);
    return { ...f, skus: itens.length, valor: somar(itens, "vl_estoque") };
  });
  const total = dados.reduce((s, d) => s + d.valor, 0) || 1;
  const algumaAtiva = selecionadas.size > 0;

  return (
    <Cartao titulo="O termômetro" className="mt-6">
      <div className="flex h-8 w-full overflow-hidden rounded-lg">
        {dados.map((d) => {
          const largura = (d.valor / total) * 100;
          if (largura <= 0) return null;
          const ativo = selecionadas.has(d.temperatura);
          return (
            <button
              key={d.temperatura}
              onClick={() => onAlternar(d.temperatura)}
              title={`${d.rotulo}: ${d.skus} SKUs · ${brl(d.valor)}`}
              aria-pressed={ativo}
              className="h-full min-w-[4px] transition-opacity"
              style={{
                width: `${largura}%`,
                backgroundColor: d.cor,
                opacity: algumaAtiva && !ativo ? 0.35 : 1,
              }}
            />
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {dados.map((d) => {
          const ativo = selecionadas.has(d.temperatura);
          return (
            <button
              key={d.temperatura}
              onClick={() => onAlternar(d.temperatura)}
              aria-pressed={ativo}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 text-xs font-semibold"
              style={{
                borderColor: ativo ? d.cor : "var(--border)",
                backgroundColor: ativo ? `${d.cor}1A` : "transparent",
                color: ativo ? d.cor : "var(--muted-foreground)",
              }}
            >
              <span
                aria-hidden
                className="size-2 rounded-full"
                style={{ backgroundColor: d.cor }}
              />
              {d.rotulo}
              <span className="tabular">
                {num(d.skus)} SKUs · {brl(d.valor)}
              </span>
            </button>
          );
        })}
      </div>
    </Cartao>
  );
}


/** Soma por chave, já que as views abrem por fornecedor. */
function agregar<T>(
  linhas: T[],
  chave: (l: T) => string,
  valor: (l: T) => number,
) {
  const acc = new Map<string, number>();
  for (const l of linhas) acc.set(chave(l), (acc.get(chave(l)) ?? 0) + valor(l));
  return [...acc.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

type EscopoGrafico = { fornecedor: string; modo: "geral" | "danone" };

const noEscopo = (
  row: { codfornec?: number | null; fornecedor?: string | null },
  { fornecedor, modo }: EscopoGrafico,
) =>
  modo === "danone"
    ? Number(row.codfornec) === COD_DANONE
    : Number(row.codfornec) !== COD_DANONE &&
      (!fornecedor || row.fornecedor === fornecedor);

function GraficoSemanas(escopo: EscopoGrafico) {
  const semanas = useTermometroSemanas();
  const barras = agregar(
    (semanas.data ?? []).filter((s) => noEscopo(s, escopo)),
    (s) => String(s.semana_ini).slice(0, 10),
    (s) => Number(s.vl_custo ?? 0),
  ).map(([semana, valor]) => ({ nome: ddmm(semana), valor }));
  const cores = Object.fromEntries(barras.map((b) => [b.nome, "#D03B3B"]));

  return (
    <Cartao titulo="Capital que vence por semana">
      {semanas.isLoading ? (
        <Carregando />
      ) : barras.length ? (
        <GraficoBarras dados={barras} cores={cores} />
      ) : (
        <Vazio texto="Nenhuma sobra projetada nas próximas semanas." />
      )}
    </Cartao>
  );
}

function GraficoTendencia(escopo: EscopoGrafico) {
  const historico = useTermometroHistorico();
  const linha = agregar(
    (historico.data ?? []).filter((h) => noEscopo(h, escopo)),
    (h) => String(h.data).slice(0, 10),
    (h) => Number(h.vl_vence ?? 0) + Number(h.vl_critico ?? 0),
  ).map(([data, valor]) => ({ data, valor }));

  return (
    <Cartao titulo="Tendência do capital em risco">
      {historico.isLoading ? (
        <Carregando />
      ) : linha.length ? (
        <GraficoLinha dados={linha} />
      ) : (
        <Vazio texto="Histórico ainda sendo formado." />
      )}
    </Cartao>
  );
}

function Graficos(escopo: EscopoGrafico) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <GraficoSemanas {...escopo} />
      <GraficoTendencia {...escopo} />
    </div>
  );
}

function LotesDoSku({ codprod }: { codprod: number }) {
  const lotes = useTermometroLotes(codprod);
  if (lotes.isLoading)
    return (
      <p className="px-3 py-3 text-xs text-muted-foreground">Carregando lotes…</p>
    );
  const linhas = lotes.data ?? [];
  if (!linhas.length)
    return (
      <p className="px-3 py-3 text-xs text-muted-foreground">
        Sem lotes no snapshot para este produto.
      </p>
    );

  const critico = (l: TermometroLote) =>
    Number(l.qt_sobra ?? 0) > 0 && Number(l.dias_val ?? 999) <= 21;

  return (
    <div className="rounded-lg bg-secondary/60 p-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left uppercase tracking-wide text-muted-foreground">
            <th className="py-1 pr-3">Lote</th>
            <th className="py-1 pr-3 text-right">Qt</th>
            <th className="py-1 pr-3 text-right">Validade</th>
            <th className="py-1 pr-3 text-right">Limite de aceite</th>
            <th className="py-1 pr-3 text-right">Dias</th>
            <th className="py-1 pr-3 text-right">Qt sobra</th>
            <th className="py-1 text-right">R$ sobra</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr
              key={`${l.numlote ?? "s"}-${i}`}
              className="border-t border-border/60"
              style={critico(l) ? { color: "#D03B3B", fontWeight: 600 } : undefined}
            >
              <td className="py-1 pr-3">
                {l.numlote ?? "—"}
                {Number(l.dias_val ?? 999) <= 0 ? (
                  <span className="ml-2 inline-flex whitespace-nowrap rounded-full bg-[#3A3733] px-2 py-0.5 text-[10px] font-bold text-white">
                    VENCIDO — baixa
                  </span>
                ) : null}
              </td>
              <td className="py-1 pr-3 text-right tabular">{num(l.qt, 0)}</td>
              <td className="py-1 pr-3 text-right tabular">
                {ddmmaaaa(l.dtvalidade)}
              </td>
              <td className="py-1 pr-3 text-right tabular">{ddmmaaaa(l.limite)}</td>
              <td className="py-1 pr-3 text-right tabular">{num(l.dias_val, 0)}</td>
              <td className="py-1 pr-3 text-right tabular">{num(l.qt_sobra, 0)}</td>
              <td className="py-1 text-right tabular">{brl(l.vl_sobra)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Lista de ataque: quem mais comprou o produto nos últimos 60 dias. */
function CompradoresDoSku({ codprod }: { codprod: number }) {
  const compradores = useCompradoresProduto(codprod);

  if (compradores.isLoading)
    return (
      <p className="px-3 py-3 text-xs text-muted-foreground">
        Carregando compradores…
      </p>
    );

  const linhas = compradores.data ?? [];
  if (!linhas.length)
    return (
      <p className="px-3 py-3 text-xs text-muted-foreground">
        Nenhuma compra deste produto nos últimos 60 dias.
      </p>
    );

  return (
    <div className="rounded-lg bg-secondary/60 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Quem compra este produto · últimos 60 dias
      </p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left uppercase tracking-wide text-muted-foreground">
            <th className="py-1 pr-3">Cliente</th>
            <th className="py-1 pr-3">Cidade</th>
            <th className="py-1 pr-3">Vendedor</th>
            <th className="py-1 pr-3 text-right">Vezes</th>
            <th className="py-1 pr-3 text-right">Qt</th>
            <th className="py-1 text-right">Última compra</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((c, i) => (
            <tr
              key={`${c.codcli ?? "s"}-${c.codusur ?? "s"}-${i}`}
              className="border-t border-border/60"
            >
              <td className="py-1 pr-3 font-semibold">{c.cliente ?? "—"}</td>
              <td className="py-1 pr-3">{c.cidade ?? "—"}</td>
              <td className="py-1 pr-3">{c.vendedor ?? "—"}</td>
              <td className="py-1 pr-3 text-right tabular">{num(c.vezes, 0)}</td>
              <td className="py-1 pr-3 text-right tabular">{num(c.qt, 0)}</td>
              <td className="py-1 text-right tabular">
                {ddmmaaaa(c.ultima_compra)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Precificação vinda da rotina 286 (Winthor). */
function Precificacao({ sku }: { sku: TermometroSku }) {
  const temEscada =
    sku.desconto_pct !== null && sku.desconto_pct !== undefined;
  const corEscada = Number(sku.desconto_pct) >= 40 ? COR_CRITICO : "#EC7A2E";

  return (
    <div className="rounded-lg bg-secondary/60 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Precificação (rotina 286)
      </p>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 text-xs">
        <div>
          <span className="block text-muted-foreground">Custo</span>
          <span className="tabular font-semibold">{brl(sku.custo, true)}</span>
        </div>
        <div>
          <span className="block text-muted-foreground">Preço de tabela</span>
          <span className="tabular font-semibold">{brl(sku.pvenda, true)}</span>
        </div>
        <div>
          <span className="block text-muted-foreground">Margem atual</span>
          <span className="tabular font-semibold">
            {sku.margem_tab === null || sku.margem_tab === undefined
              ? "—"
              : pct(sku.margem_tab)}
          </span>
        </div>
        <div>
          <span className="block text-muted-foreground">ICMS de saída</span>
          <span className="tabular font-semibold">
            {sku.aliq_icms === null || sku.aliq_icms === undefined
              ? "—"
              : Number(sku.aliq_icms) === 0
                ? "0% (ST)"
                : pct(sku.aliq_icms, 2)}
          </span>
        </div>
        <div>
          <span className="block text-muted-foreground">PIS/COFINS</span>
          <span className="tabular font-semibold">
            {!sku.aliq_piscofins ? "0%" : pct(sku.aliq_piscofins, 2)}
          </span>
        </div>
        <div>
          <span className="block text-muted-foreground">
            Preço margem zero
          </span>
          <span className="tabular text-sm font-semibold">
            {brl(sku.preco_margem_zero, true)}
          </span>
        </div>
        {temEscada ? (
          <div>
            <span className="block text-muted-foreground">
              Preço da escada
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span
                className="rounded-full px-2 py-0.5 text-xs font-bold"
                style={{
                  backgroundColor: `${corEscada}1A`,
                  color: corEscada,
                }}
              >
                −{num(sku.desconto_pct, 0)}%
              </span>
              <span className="tabular font-semibold">
                {brl(sku.preco_acao, true)}
              </span>
              <span
                className="tabular"
                style={
                  Number(sku.margem_acao) < 0
                    ? { color: "#D03B3B", fontWeight: 700 }
                    : undefined
                }
              >
                {sku.margem_acao === null || sku.margem_acao === undefined
                  ? "—"
                  : pct(sku.margem_acao, 2)}
              </span>
            </span>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Margem zero = custo ÷ (1 − ICMS − PIS/COFINS). ICMS da tributação de
        saída; PIS/COFINS é o efetivo medido nas notas dos últimos 35 dias (o
        cadastro do Winthor não traz a alíquota).
      </p>
    </div>
  );
}

function DrillProduto({ sku }: { sku: TermometroSku }) {
  return (
    <div className="space-y-3 py-2">
      <Precificacao sku={sku} />
      <LotesDoSku codprod={sku.codprod} />
      <CompradoresDoSku codprod={sku.codprod} />
    </div>
  );
}

function TabelaSkus({
  linhas,
  temperaturas,
  onLimpar,
}: {
  linhas: TermometroSku[];
  temperaturas: Set<Temperatura>;
  onLimpar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<number | null>(null);

  const filtradas = useMemo(
    () =>
      [...linhas]
        .filter(
          (l) =>
            (temperaturas.size === 0 || temperaturas.has(l.temperatura)) &&
            (!busca ||
              l.descricao?.toLowerCase().includes(busca.trim().toLowerCase())),
        )
        .sort((a, b) => {
          const ia = FAIXAS.findIndex((f) => f.temperatura === a.temperatura);
          const ib = FAIXAS.findIndex((f) => f.temperatura === b.temperatura);
          const na = ia < 0 ? FAIXAS.length : ia;
          const nb = ib < 0 ? FAIXAS.length : ib;
          if (na !== nb) return na - nb;
          const ra =
            Number(a.vl_critico ?? 0) + Number(a.vl_vence ?? 0);
          const rb =
            Number(b.vl_critico ?? 0) + Number(b.vl_vence ?? 0);
          if (rb !== ra) return rb - ra;
          return Number(b.vl_estoque ?? 0) - Number(a.vl_estoque ?? 0);
        }),
    [linhas, temperaturas, busca],
  );

  const temEscada = filtradas.some(
    (l) => l.desconto_pct !== null && l.desconto_pct !== undefined,
  );


  const colunas: Coluna<TermometroSku>[] = [
    {
      rotulo: "",
      celula: (l) => (
        <button
          onClick={() => setAberto((a) => (a === l.codprod ? null : l.codprod))}
          aria-label="Ver lotes"
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground"
        >
          {aberto === l.codprod ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
      ),
    },
    {
      rotulo: "Temp.",
      celula: (l) => <BadgeTemperatura t={l.temperatura} />,
    },
    {
      rotulo: "Produto",
      titulo: true,
      celula: (l) => rotuloProduto(l.codprod, l.descricao),
    },
    { rotulo: "Fornecedor", celula: (l) => l.fornecedor ?? "—" },
    { rotulo: "Reserv.", direita: true, celula: (l) => num(l.qt_reservada, 0) },
    {
      rotulo: "Disp.",
      direita: true,
      dica: "estoque de fato em risco — o risco é calculado sobre ele",
      celula: (l) => num(l.disp, 0),
    },
    { rotulo: "Vel. (un/dia)", direita: true, celula: (l) => num(l.vel, 2) },
    {
      rotulo: "Cobert.",
      direita: true,
      celula: (l) =>
        l.cobertura === null || l.cobertura === undefined
          ? "—"
          : `${num(l.cobertura, 0)}d`,
    },
    {
      rotulo: "Validade",
      direita: true,
      celula: (l) =>
        l.validade ? (
          <span className="inline-flex flex-col items-end leading-tight">
            <span>{ddmmaaaa(l.validade)}</span>
            <span className="text-[11px] text-muted-foreground">
              {num(l.dias_val, 0)}d
            </span>
          </span>
        ) : (
          "—"
        ),
    },
    {
      rotulo: "Qt crítico",
      direita: true,
      celula: (l) =>
        Number(l.qt_critico ?? 0) > 0 ? (
          <span style={{ color: COR_CRITICO, fontWeight: 700 }}>
            {num(l.qt_critico, 0)}
          </span>
        ) : (
          num(l.qt_critico, 0)
        ),
    },
    { rotulo: "Qt risco", direita: true, celula: (l) => num(l.qt_vence, 0) },
    { rotulo: "R$ risco", direita: true, celula: (l) => brl(l.vl_vence) },
    { rotulo: "R$ estoque", direita: true, celula: (l) => brl(l.vl_estoque) },
    ...(temEscada
      ? ([
          {
            rotulo: "Ação",
            direita: true,
            celula: (l) => <BadgeAcao sku={l} />,
          },
          {
            rotulo: "Mg ação",
            direita: true,
            celula: (l) =>
              l.desconto_pct === null || l.desconto_pct === undefined ? (
                "—"
              ) : (
                <span
                  className="tabular"
                  style={
                    Number(l.margem_acao ?? 0) < 0
                      ? { color: "#D03B3B", fontWeight: 700 }
                      : undefined
                  }
                >
                  {pct(l.margem_acao ?? 0)}
                </span>
              ),
          },
        ] satisfies Coluna<TermometroSku>[])
      : []),
  ];

  return (
    <Cartao titulo="Produtos por risco de validade" className="mt-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto…"
          aria-label="Buscar produto"
          className="min-h-[44px] min-w-[200px] flex-1 rounded-lg border border-border bg-card px-3 text-[13px]"
        />
        {temperaturas.size ? (
          (() => {
            const unica =
              temperaturas.size === 1 ? faixaDe([...temperaturas][0]!) : null;
            const cor = unica?.cor ?? "var(--foreground)";
            return (
              <button
                onClick={onLimpar}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 text-xs font-semibold"
                style={{
                  borderColor: cor,
                  backgroundColor: unica ? `${unica.cor}1A` : "var(--secondary)",
                  color: cor,
                }}
              >
                {unica
                  ? `${unica.rotulo} · limpar filtro`
                  : `${temperaturas.size} faixas · limpar filtro`}
              </button>
            );
          })()
        ) : null}

        <span className="ml-auto text-xs text-muted-foreground tabular">
          {num(filtradas.length)} de {num(linhas.length)} SKUs
        </span>
      </div>

      {filtradas.length ? (
        <Tabela
          colunas={colunas}
          linhas={filtradas}
          compacto
          chave={(l) => String(l.codprod)}
          expandido={(l) => aberto === l.codprod}
          renderExpandido={(l) => <DrillProduto sku={l} />}
        />
      ) : (
        <Vazio texto="Nenhum produto com os filtros atuais." />
      )}
    </Cartao>
  );
}

function PainelDanone({
  linhas,
  temperaturas,
  onAlternar,
  onLimpar,
}: {
  linhas: TermometroSku[];
  temperaturas: Set<Temperatura>;
  onAlternar: (t: Temperatura) => void;
  onLimpar: () => void;
}) {
  const danone = useMemo(
    () => linhas.filter((l) => Number(l.codfornec) === COD_DANONE),
    [linhas],
  );
  const lotes = useLotesVivos(COD_DANONE);

  const categorias = useMemo(() => {
    const acc: Record<
      string,
      { categoria: string; estoque: number; risco: number; fervendo: number }
    > = {};
    for (const l of danone) {
      const chave = `${l.codcategoria ?? "—"} ${l.categoria ?? "Sem categoria"}`;
      acc[chave] ??= { categoria: chave, estoque: 0, risco: 0, fervendo: 0 };
      acc[chave]!.estoque += Number(l.vl_estoque ?? 0);
      acc[chave]!.risco += Number(l.vl_vence ?? 0);
      if (l.temperatura === "FERVENDO") acc[chave]!.fervendo += 1;
    }
    return Object.values(acc).sort((a, b) => b.risco - a.risco);
  }, [danone]);

  const sync = lotes.data?.[0]?.sync_at ?? null;
  const minutos = sync
    ? Math.max(0, Math.round((Date.now() - new Date(sync).getTime()) / 60000))
    : null;

  const colunas: Coluna<LoteVivo>[] = [
    {
      rotulo: "Produto",
      titulo: true,
      celula: (l) => rotuloProduto(l.codprod, l.descricao),
    },
    { rotulo: "Categoria", celula: (l) => l.categoria ?? "—" },
    { rotulo: "Lote", celula: (l) => l.numlote ?? "—" },
    { rotulo: "Qt", direita: true, celula: (l) => num(l.qt, 0) },
    {
      rotulo: "Validade",
      direita: true,
      celula: (l) => ddmmaaaa(l.dtvalidade),
    },
    {
      rotulo: "Dias",
      direita: true,
      celula: (l) => {
        const d = Number(l.dias_val ?? 0);
        return (
          <span
            className="tabular"
            style={
              d <= 15
                ? { color: COR_CRITICO, fontWeight: 700 }
                : d <= 30
                  ? { color: "#EC7A2E", fontWeight: 700 }
                  : undefined
            }
          >
            {num(l.dias_val, 0)}
          </span>
        );
      },
    },
    {
      rotulo: "Saída 7d",
      direita: true,
      celula: (l) => num(l.qt_7d ?? 0, 0),
    },
  ];

  const criticos = danone.filter((l) => Number(l.qt_critico ?? 0) > 0);
  const vlCritico = somar(criticos, "vl_critico");

  const comDesconto = danone.filter(
    (l) => l.desconto_pct !== null && l.desconto_pct !== undefined,
  );
  const escada = {
    total: comDesconto.length,
    vinte: comDesconto.filter((l) => Number(l.desconto_pct) === 20).length,
    quarenta: comDesconto.filter((l) => Number(l.desconto_pct) === 40).length,
    valor: somar(comDesconto, "vl_estoque"),
  };

  return (
    <div className="mt-6 space-y-4">
      {criticos.length ? (
        <div
          className="flex items-start gap-2 rounded-lg p-3 text-[13px]"
          style={{
            backgroundColor: `${COR_CRITICO}14`,
            borderLeft: `3px solid ${COR_CRITICO}`,
          }}
          role="status"
        >
          <TriangleAlert
            className="mt-0.5 size-4 shrink-0"
            style={{ color: COR_CRITICO }}
          />
          <span>
            Janela comercial fechada em {num(criticos.length)} SKUs —{" "}
            {brl(vlCritico)} a custo. O cliente não aceita produto a menos de 15
            dias do vencimento; ação fora da tabela.
          </span>
        </div>
      ) : null}

      <Cartao
        titulo="Operação Danone"
        acao={
          <span className="text-xs text-muted-foreground">
            Shelf-life curto · fornecedor {COD_DANONE}
          </span>
        }
      >
        {danone.length ? (
          <Kpis linhas={danone} />
        ) : (
          <Vazio texto="Nenhum SKU Danone no snapshot mais recente." />
        )}
      </Cartao>

      {danone.length ? (
        <>
          <Termometro
            linhas={danone}
            selecionadas={temperaturas}
            onAlternar={onAlternar}
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Cartao titulo="Estoque por categoria">
              <div className="grid gap-3 sm:grid-cols-2">
                {categorias.map((c) => (
                  <div
                    key={c.categoria}
                    className="rounded-xl border border-border p-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {c.categoria}
                    </p>
                    <p className="mt-1 text-lg font-extrabold tabular">
                      {brl(c.estoque)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground tabular">
                      {brl(c.risco)} em risco · {num(c.fervendo)} SKUs fervendo
                    </p>
                  </div>
                ))}
              </div>
            </Cartao>
            <GraficoSemanas fornecedor="" modo="danone" />
          </div>

          <TabelaSkus
            linhas={danone}
            temperaturas={temperaturas}
            onLimpar={onLimpar}
          />
        </>
      ) : null}

      <Cartao
        titulo="Lotes Danone ao vivo"
        acao={
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
            {minutos === null
              ? "sem sincronização"
              : `atualizado há ${num(minutos)} min`}
          </span>
        }
      >
        {escada.total ? (
          <p className="mb-3 text-[13px] text-muted-foreground">
            <span className="font-semibold text-foreground">Escada ativa:</span>{" "}
            {num(escada.vinte)} SKUs a −20%, {num(escada.quarenta)} SKUs a −40% (
            {brl(escada.valor)} de estoque)
          </p>
        ) : null}
        {lotes.isLoading ? (
          <Carregando />
        ) : (lotes.data ?? []).length ? (
          <Tabela
            colunas={colunas}
            linhas={lotes.data ?? []}
            chave={(l, i) => `${l.codprod}-${l.numlote ?? i}`}
          />
        ) : (
          <Vazio texto="Sem lotes Danone em estoque." />
        )}
      </Cartao>
    </div>
  );
}

function Metodologia() {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="mt-6">
      <button
        onClick={() => setAberto((a) => !a)}
        className="inline-flex min-h-[44px] items-center gap-2 text-xs font-semibold text-muted-foreground"
      >
        {aberto ? (
          <ChevronDown className="size-4" />
        ) : (
          <ChevronRight className="size-4" />
        )}
        Como este número é calculado
      </button>
      {aberto ? (
        <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Velocidade medida por dia útil COM estoque (demanda censurada). Projeção
          seg–sáb (domingo não fatura), sábado com o peso medido, ponderada pelo
          peso real de cada dia da semana na venda do fornecedor. Fornecedor com
          régua comercial (Danone: 15 dias) tem a sobra medida contra o limite de
          aceite do cliente, não contra a validade — lote com janela fechada é
          crítico inteiro. Escada de desconto automática vale para a Danone: 10
          dias → −20%, 5 dias → −40%; produto vencido não entra — é baixa. Demais
          fornecedores: desconto manual, simulado na própria linha. Snapshot diário
          ~01:10 (Bahia); lotes ao vivo a cada 15 min. O termômetro se recalibra
          sozinho: ritmo novo, entrada nova ou validade nova mudam a classe no dia
          seguinte.
        </p>
      ) : null}
    </div>
  );
}

function ValidadePage() {
  const termometro = useTermometro();
  const [tempGeral, setTempGeral] = useState<Set<Temperatura>>(
    () => new Set<Temperatura>(),
  );
  const [tempDanone, setTempDanone] = useState<Set<Temperatura>>(
    () => new Set<Temperatura>(),
  );
  const alternar =
    (set: React.Dispatch<React.SetStateAction<Set<Temperatura>>>) =>
    (t: Temperatura) =>
      set((atual) => {
        const proximo = new Set(atual);
        if (proximo.has(t)) proximo.delete(t);
        else proximo.add(t);
        return proximo;
      });

  const [visao, setVisao] = useState<"geral" | "danone">("geral");
  const [fornecedor, setFornecedor] = useState("");

  const linhas = termometro.data ?? [];
  const linhasGeral = useMemo(
    () => linhas.filter((l) => Number(l.codfornec) !== COD_DANONE),
    [linhas],
  );
  const fornecedores = useMemo(
    () =>
      [...new Set(linhasGeral.map((l) => l.fornecedor).filter(Boolean))].sort(
        (a, b) => String(a).localeCompare(String(b), "pt-BR"),
      ),
    [linhasGeral],
  );
  const linhasVisiveis = useMemo(
    () =>
      fornecedor
        ? linhasGeral.filter((l) => l.fornecedor === fornecedor)
        : linhasGeral,
    [linhasGeral, fornecedor],
  );
  const dataSnapshot = linhas[0]?.data ?? null;
  const hoje = new Date().toISOString().slice(0, 10);
  const desatualizado = !!dataSnapshot && String(dataSnapshot).slice(0, 10) !== hoje;

  if (termometro.isLoading) {
    return (
      <>
        <Topbar titulo="Termômetro de Validade" />
        <Carregando />
      </>
    );
  }

  if (!linhas.length) {
    return (
      <>
        <Topbar titulo="Termômetro de Validade" />
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center">
          <CircleAlert className="mx-auto size-6" style={{ color: "var(--brand-red)" }} />
          <h2 className="mt-3 text-lg font-extrabold">Sem dados de validade</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Não há snapshot disponível para o seu perfil. Fale com a diretoria se
            precisar de acesso.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar
        titulo="Termômetro de Validade"
        descricao={
          fornecedor
            ? `Snapshot de ${ddmmaaaa(dataSnapshot)} — fornecedor ${fornecedor}`
            : `Snapshot de ${ddmmaaaa(dataSnapshot)} — o estoque atual gira, no ritmo atual, antes de vencer?`
        }
      />

      {desatualizado ? (
        <div
          className="mb-4 flex items-start gap-2 rounded-lg bg-[#FAB2191A] p-3 text-[13px]"
          style={{ borderLeft: "3px solid #FAB219" }}
          role="status"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" style={{ color: "#FAB219" }} />
          <span>
            O snapshot exibido é de {ddmmaaaa(dataSnapshot)} — a apuração de hoje ainda
            não rodou.
          </span>
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="card-surface inline-flex gap-1 p-1">
          {(
            [
              { chave: "geral", rotulo: "Geral" },
              { chave: "danone", rotulo: "Danone" },
            ] as const
          ).map((o) => (
            <button
              key={o.chave}
              onClick={() => setVisao(o.chave)}
              className="min-h-[44px] rounded-md px-4 text-sm font-medium transition-colors"
              style={
                visao === o.chave
                  ? { backgroundColor: "var(--brand-yellow)", color: "var(--graphite)" }
                  : { color: "var(--muted-foreground)" }
              }
            >
              {o.rotulo}
            </button>
          ))}
        </div>

        {visao === "geral" ? (
          <>
            <select
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
              aria-label="Filtrar por fornecedor"
              className="min-h-[44px] rounded-lg border border-border bg-card px-3 text-[13px]"
            >
              <option value="">Todos os fornecedores</option>
              {fornecedores.map((f) => (
                <option key={String(f)} value={String(f)}>
                  {f}
                </option>
              ))}
            </select>
            {fornecedor ? (
              <button
                onClick={() => setFornecedor("")}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold"
              >
                {fornecedor} · limpar
              </button>
            ) : null}
          </>
        ) : null}
      </div>

      {visao === "danone" ? (
        <PainelDanone
          linhas={linhas}
          temperaturas={tempDanone}
          onAlternar={alternar(setTempDanone)}
          onLimpar={() => setTempDanone(new Set())}
        />
      ) : (
        <>
          <Kpis linhas={linhasVisiveis} />
          <Termometro
            linhas={linhasVisiveis}
            selecionadas={tempGeral}
            onAlternar={alternar(setTempGeral)}
          />
          <Graficos fornecedor={fornecedor} modo="geral" />
          <TabelaSkus
            linhas={linhasVisiveis}
            temperaturas={tempGeral}
            onLimpar={() => setTempGeral(new Set())}
          />
        </>
      )}

      <Metodologia />
    </>
  );
}
