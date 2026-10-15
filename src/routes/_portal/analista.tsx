import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { KpiCard } from "@/components/portal/KpiCard";
import { Tabela, type Coluna } from "@/components/portal/Tabela";
import { Topbar } from "@/components/portal/Topbar";
import {
  useCompradorAlertas,
  useCompradorPedidos,
  useCompradorSkus,
  type CompradorPedido,
  type CompradorSku,
} from "@/lib/analista";
import { brl, ddmm, ddmmaaaa, num, rotuloProduto } from "@/lib/format";
import { useTermometro } from "@/lib/validade";

export const Route = createFileRoute("/_portal/analista")({
  head: () => ({
    meta: [
      { title: "Analista de Compras — LIA · NOUS" },
      {
        name: "description",
        content: "Sugestão de pedido por fornecedor, calculada pela IA e aprovada por uma pessoa.",
      },
    ],
  }),
  component: AnalistaPage,
});

type LinhaPedido = CompradorPedido & {
  disp: number;
  vel: number;
  cobHoje: number | null;
  cobComPedido: number | null;
};

/** "sex 16/10" a partir de uma data ISO (yyyy-mm-dd). */
function diaEData(iso: string) {
  const dia = new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" });
  return `${dia.replace(".", "")} ${ddmm(iso)}`;
}

function AnalistaPage() {
  const alertas = useCompradorAlertas();
  const skus = useCompradorSkus();
  const pedidos = useCompradorPedidos();
  const termometro = useTermometro();
  const [soSugestao, setSoSugestao] = useState(true);
  const [escolhido, setEscolhido] = useState<number | null>(null);

  const nomes = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of termometro.data ?? []) {
      if (t.codfornec != null && t.fornecedor) m.set(t.codfornec, t.fornecedor);
    }
    return m;
  }, [termometro.data]);

  const lista = alertas.data ?? [];
  const codfornec = escolhido ?? lista[0]?.codfornec ?? null;
  const alerta = lista.find((a) => a.codfornec === codfornec) ?? null;
  const nomeFornec = (c: number) => nomes.get(c) ?? `Fornecedor ${c}`;

  const doFornecedor = useMemo(
    () => (skus.data ?? []).filter((s) => s.codfornec === codfornec),
    [skus.data, codfornec],
  );

  // Pedidos em trânsito agrupados por pedido, com a cobertura de cada SKU antes e depois da chegada.
  const grupos = useMemo(() => {
    const porSku = new Map(doFornecedor.map((s) => [s.codprod, s]));
    const m = new Map<string, LinhaPedido[]>();
    for (const p of pedidos.data ?? []) {
      if (p.codfornec !== codfornec) continue;
      const s = porSku.get(p.codprod);
      const vel = Number(s?.velocidade ?? 0);
      const disp = Number(s?.disponivel ?? 0);
      const l: LinhaPedido = {
        ...p,
        disp,
        vel,
        cobHoje: vel > 0 ? disp / vel : null,
        cobComPedido: vel > 0 ? (disp + Number(p.un_liquida)) / vel : null,
      };
      m.set(p.pedido, [...(m.get(p.pedido) ?? []), l]);
    }
    return [...m.entries()].map(([pedido, linhas]) => {
      const p0 = linhas[0]!; // todo grupo nasce com pelo menos uma linha
      const soma = (f: (l: LinhaPedido) => number) => linhas.reduce((t, l) => t + f(l), 0);
      return {
        pedido,
        linhas: [...linhas].sort(
          (a, b) =>
            Number(b.caixas_cortadas > 0) - Number(a.caixas_cortadas > 0) ||
            Number(b.vl_liquido ?? 0) - Number(a.vl_liquido ?? 0),
        ),
        dataPedido: p0.data_pedido,
        janela: p0.janela,
        prevista: p0.data_prevista,
        fonte: p0.fonte,
        cx: soma((l) => Number(l.caixas)),
        cxCortadas: soma((l) => Number(l.caixas_cortadas)),
        cxLiquidas: soma((l) => Number(l.caixas_liquidas)),
        kg: soma((l) => Number(l.kg_liquido ?? 0)),
        valor: soma((l) => Number(l.vl_liquido ?? 0)),
      };
    });
  }, [pedidos.data, doFornecedor, codfornec]);

  const linhas = useMemo(() => {
    const base = soSugestao ? doFornecedor.filter((s) => Number(s.sugestao_cx ?? 0) > 0) : doFornecedor;
    return [...base].sort((a, b) => {
      const da = a.dias_ruptura ?? 9999;
      const db = b.dias_ruptura ?? 9999;
      if (da !== db) return da - db;
      return Number(b.vl_compra ?? 0) - Number(a.vl_compra ?? 0);
    });
  }, [doFornecedor, soSugestao]);

  const totais = useMemo(
    () => ({
      itens: doFornecedor.filter((s) => Number(s.sugestao_cx ?? 0) > 0).length,
      caixas: doFornecedor.reduce((s, x) => s + Number(x.sugestao_cx ?? 0), 0),
      kg: doFornecedor.reduce((s, x) => s + Number(x.kg_bruto ?? 0), 0),
      valor: doFornecedor.reduce((s, x) => s + Number(x.vl_compra ?? 0), 0),
    }),
    [doFornecedor],
  );

  const colunasPedido: Coluna<LinhaPedido>[] = [
    {
      rotulo: "Produto",
      titulo: true,
      celula: (p) => <span className="font-semibold">{rotuloProduto(p.codprod, p.descricao)}</span>,
    },
    { rotulo: "Pedido (cx)", direita: true, celula: (p) => num(p.caixas) },
    {
      rotulo: "Corte (cx)",
      direita: true,
      dica: "Caixas que o fabricante não vai entregar",
      celula: (p) =>
        p.caixas_cortadas > 0 ? (
          <span style={{ color: "var(--critical)", fontWeight: 700 }}>−{num(p.caixas_cortadas)}</span>
        ) : (
          "—"
        ),
    },
    {
      rotulo: "Chega (cx)",
      direita: true,
      dica: "Pedido menos corte",
      celula: (p) => <strong>{num(p.caixas_liquidas)}</strong>,
    },
    { rotulo: "kg", direita: true, celula: (p) => num(p.kg_liquido) },
    { rotulo: "R$ compra", direita: true, celula: (p) => brl(p.vl_liquido) },
    { rotulo: "Estoque hoje", direita: true, celula: (p) => num(p.disp) },
    {
      rotulo: "Cobertura hoje",
      direita: true,
      dica: "Dias de venda que o estoque atual cobre, sem o pedido",
      celula: (p) => (p.cobHoje == null ? "—" : `${num(p.cobHoje, 1)} d`),
    },
    {
      rotulo: "Cobertura com o pedido",
      direita: true,
      dica: "Dias de venda cobertos pelo estoque atual mais o que chega",
      celula: (p) => (p.cobComPedido == null ? "—" : `${num(p.cobComPedido, 1)} d`),
    },
  ];

  const colunas: Coluna<CompradorSku>[] = [
    {
      rotulo: "Produto",
      titulo: true,
      celula: (s) => <span className="font-semibold">{rotuloProduto(s.codprod, s.descricao)}</span>,
    },
    { rotulo: "Disponível", direita: true, celula: (s) => num(s.disponivel) },
    {
      rotulo: "Reservado",
      direita: true,
      dica: "Venda digitada que ainda não foi faturada",
      celula: (s) => num(s.reservado),
    },
    {
      rotulo: "Descoberto",
      direita: true,
      dica: "Pedido aberto além do que existe em estoque (corte marcado)",
      celula: (s) => num(s.descoberto),
    },
    {
      rotulo: "Em pedido",
      direita: true,
      dica: "Unidades já pedidas ao fabricante e a caminho, descontado o corte",
      celula: (s) => (Number(s.pendente ?? 0) > 0 ? num(s.pendente) : "—"),
    },
    {
      rotulo: "Vel./dia",
      direita: true,
      dica: "Velocidade de venda por dia com estoque",
      celula: (s) => num(s.velocidade, 1),
    },
    {
      rotulo: "Rompe em",
      direita: true,
      dica: "Dias até faltar produto",
      celula: (s) =>
        s.dias_ruptura == null ? (
          "—"
        ) : (
          <span
            style={{
              color:
                s.dias_ruptura <= 3
                  ? "var(--critical)"
                  : s.dias_ruptura <= 7
                    ? "var(--severe)"
                    : undefined,
              fontWeight: s.dias_ruptura <= 7 ? 700 : undefined,
            }}
          >
            {num(s.dias_ruptura, 1)} d ({ddmm(s.data_ruptura)})
          </span>
        ),
    },
    {
      rotulo: "Sugestão (cx)",
      direita: true,
      dica: "Pedido sempre em caixa master",
      celula: (s) => <strong>{num(s.sugestao_cx)}</strong>,
    },
    { rotulo: "kg", direita: true, celula: (s) => num(s.kg_bruto) },
    { rotulo: "R$ compra", direita: true, celula: (s) => brl(s.vl_compra) },
    {
      rotulo: "Validade na chegada",
      direita: true,
      dica: "P25 medido da validade do lote na chegada, menos o prazo aceito pelo cliente",
      celula: (s) => (s.p25_chegada == null ? "—" : `${num(s.p25_chegada)} d`),
    },
  ];

  const carregando = alertas.isLoading || skus.isLoading;

  return (
    <div className="space-y-6">
      <Topbar
        titulo="Analista de Compras"
        descricao="A IA calcula a necessidade e sugere o pedido. Uma pessoa aprova."
      />

      {carregando ? (
        <Carregando />
      ) : !alerta ? (
        <Cartao>
          <Vazio texto="O analista ainda não gerou uma recomendação. Ele roda de segunda a sábado, no fim do expediente." />
        </Cartao>
      ) : (
        <>
          <div
            className="flex items-start gap-3 rounded-md px-4 py-3 text-sm"
            style={{
              backgroundColor: "var(--attention-tint)",
            }}
            role="note"
          >
            <ShieldCheck className="mt-0.5 size-5 shrink-0" style={{ color: "var(--attention)" }} />
            <p>
              <strong>Aguardando aprovação.</strong> Nenhum pedido é enviado ao portal do fabricante
              sem o aval de uma pessoa: o analista sugere, a decisão é humana.
            </p>
          </div>

          {lista.length > 1 ? (
            <div className="flex flex-wrap gap-2">
              {lista.map((a) => (
                <button
                  key={a.codfornec}
                  onClick={() => setEscolhido(a.codfornec)}
                  className="min-h-[44px] rounded-md border px-4 text-sm font-semibold"
                  style={
                    a.codfornec === codfornec
                      ? { backgroundColor: "var(--ink)", color: "var(--on-ink)" }
                      : undefined
                  }
                >
                  {nomeFornec(a.codfornec)}
                </button>
              ))}
            </div>
          ) : null}

          <Cartao titulo={`${nomeFornec(alerta.codfornec)} — janela ${alerta.proxima_janela ?? "—"}`}>
            <p className="text-sm leading-relaxed">{alerta.recomendacao ?? "—"}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Análise de {ddmmaaaa(alerta.data)} · próxima entrega {ddmmaaaa(alerta.proxima_entrega)}
            </p>
          </Cartao>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              titulo="SKUs que rompem antes da entrega"
              valor={num(alerta.skus_risco)}
              status={Number(alerta.skus_risco ?? 0) > 0 ? "grave" : "positivo"}
              destaque
            />
            <KpiCard
              titulo="Perda projetada"
              valor={brl(alerta.perda_projetada)}
              detalhe="a preço de compra, se nada for feito"
              status={Number(alerta.perda_projetada ?? 0) > 0 ? "critico" : "positivo"}
              destaque
            />
            <KpiCard
              titulo="Pedido sugerido"
              valor={`${num(alerta.kg_sugerido)} kg`}
              detalhe={`Mínimo ${num(alerta.minimo_kg)} kg · ${alerta.viavel ? "viável" : "inviável"}`}
              status={alerta.viavel ? "positivo" : "atencao"}
              destaque
            />
            <KpiCard
              titulo="Pedido descoberto"
              valor={`${num(alerta.cortes_marcados)} un`}
              detalhe="pedidos abertos além do estoque"
              destaque
            />
          </div>

          {grupos.map((g) => (
            <Cartao
              key={g.pedido}
              titulo={`Pedido em trânsito — ${ddmm(g.dataPedido)} · janela ${g.janela ?? "—"} · chega ${diaEData(g.prevista)}`}
            >
              <p className="mb-1 text-sm tabular">
                <strong>{num(g.cxLiquidas)} caixas</strong> a caminho · {num(g.kg)} kg ·{" "}
                <strong>{brl(g.valor)}</strong>
                {g.cxCortadas > 0 ? (
                  <span className="text-muted-foreground">
                    {" "}
                    · {num(g.cx)} pedidas, {num(g.cxCortadas)} cortadas pelo fabricante
                  </span>
                ) : null}
              </p>
              {g.cxCortadas > 0 ? (
                <p className="mb-3 text-sm" style={{ color: "var(--critical)" }}>
                  Cortados:{" "}
                  {g.linhas
                    .filter((l) => l.caixas_cortadas > 0)
                    .map((l) => rotuloProduto(l.codprod, l.descricao))
                    .join(" · ")}
                  . Sem o pedido, esses itens podem faltar antes da próxima entrega.
                </p>
              ) : null}
              <Tabela
                colunas={colunasPedido}
                linhas={g.linhas}
                chave={(p) => `${p.pedido}-${p.codprod}`}
                compacto
              />
              <p className="mt-3 text-xs text-muted-foreground">
                O Winthor só registra o pedido de compra na entrada, então ele vem do pedido enviado
                ao portal do fabricante{g.fonte ? ` (${g.fonte})` : ""}, já descontados os cortes
                confirmados.
              </p>
            </Cartao>
          ))}

          <Cartao
            titulo="Itens do pedido sugerido"
            acao={
              <label className="flex min-h-[44px] items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={soSugestao}
                  onChange={(e) => setSoSugestao(e.target.checked)}
                />
                Só com sugestão de compra
              </label>
            }
          >
            <p className="mb-3 text-sm text-muted-foreground tabular">
              {num(totais.itens)} itens · {num(totais.caixas)} caixas · {num(totais.kg)} kg ·{" "}
              <strong>{brl(totais.valor)}</strong>
            </p>
            {alerta.viavel === false ? (
              <p className="mb-3 text-sm" style={{ color: "var(--attention)" }}>
                Janela inviável: a lista abaixo mostra a necessidade real de compra, não um pedido
                que possa ser feito agora. O mínimo de {num(alerta.minimo_kg)} kg não fecha sem
                estourar a validade.
              </p>
            ) : null}
            {linhas.length === 0 ? (
              <Vazio texto="Nenhum item com sugestão de compra." />
            ) : (
              <Tabela
                colunas={colunas}
                linhas={linhas}
                chave={(s) => `${s.codfornec}-${s.codprod}`}
                compacto
              />
            )}
          </Cartao>
        </>
      )}
    </div>
  );
}
