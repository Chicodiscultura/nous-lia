import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { KpiCard } from "@/components/portal/KpiCard";
import { Tabela, type Coluna } from "@/components/portal/Tabela";
import { Topbar } from "@/components/portal/Topbar";
import {
  useCompradorAlertas,
  useCompradorSkus,
  type CompradorSku,
} from "@/lib/analista";
import { brl, ddmm, ddmmaaaa, num, rotuloProduto } from "@/lib/format";
import { useTermometro } from "@/lib/validade";

export const Route = createFileRoute("/_portal/analista")({
  head: () => ({
    meta: [
      { title: "Analista de Compras â€” LIA Â· NOUS" },
      {
        name: "description",
        content: "SugestÃ£o de pedido por fornecedor, calculada pela IA e aprovada por uma pessoa.",
      },
    ],
  }),
  component: AnalistaPage,
});

function AnalistaPage() {
  const alertas = useCompradorAlertas();
  const skus = useCompradorSkus();
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

  const colunas: Coluna<CompradorSku>[] = [
    {
      rotulo: "Produto",
      titulo: true,
      celula: (s) => <span className="font-semibold">{rotuloProduto(s.codprod, s.descricao)}</span>,
    },
    { rotulo: "DisponÃ­vel", direita: true, celula: (s) => num(s.disponivel) },
    {
      rotulo: "Reservado",
      direita: true,
      dica: "Venda digitada que ainda nÃ£o foi faturada",
      celula: (s) => num(s.reservado),
    },
    {
      rotulo: "Descoberto",
      direita: true,
      dica: "Pedido aberto alÃ©m do que existe em estoque (corte marcado)",
      celula: (s) => num(s.descoberto),
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
      dica: "Dias atÃ© faltar produto",
      celula: (s) =>
        s.dias_ruptura == null ? (
          "â€”"
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
      rotulo: "SugestÃ£o (cx)",
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
      celula: (s) => (s.p25_chegada == null ? "â€”" : `${num(s.p25_chegada)} d`),
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
          <Vazio texto="O analista ainda nÃ£o gerou uma recomendaÃ§Ã£o. Ele roda de segunda a sÃ¡bado, no fim do expediente." />
        </Cartao>
      ) : (
        <>
          <div
            className="flex items-start gap-3 rounded-md px-4 py-3 text-sm"
            style={{
              backgroundColor: "color-mix(in srgb, var(--brand-yellow) 16%, #fff)",
              borderLeft: "3px solid var(--brand-yellow)",
            }}
            role="note"
          >
            <ShieldCheck className="mt-0.5 size-5 shrink-0" style={{ color: "var(--brand-red)" }} />
            <p>
              <strong>Aguardando aprovaÃ§Ã£o.</strong> Nenhum pedido Ã© enviado ao portal do fabricante
              sem o aval de uma pessoa: o analista sugere, a decisÃ£o Ã© humana.
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
                      ? { backgroundColor: "var(--brand-yellow)", color: "var(--graphite)" }
                      : undefined
                  }
                >
                  {nomeFornec(a.codfornec)}
                </button>
              ))}
            </div>
          ) : null}

          <Cartao titulo={`${nomeFornec(alerta.codfornec)} â€” janela ${alerta.proxima_janela ?? "â€”"}`}>
            <p className="text-sm leading-relaxed">{alerta.recomendacao ?? "â€”"}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              AnÃ¡lise de {ddmmaaaa(alerta.data)} Â· prÃ³xima entrega {ddmmaaaa(alerta.proxima_entrega)}
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
              detalhe="a preÃ§o de compra, se nada for feito"
              status={Number(alerta.perda_projetada ?? 0) > 0 ? "critico" : "positivo"}
              destaque
            />
            <KpiCard
              titulo="Pedido sugerido"
              valor={`${num(alerta.kg_sugerido)} kg`}
              detalhe={`MÃ­nimo ${num(alerta.minimo_kg)} kg Â· ${alerta.viavel ? "viÃ¡vel" : "inviÃ¡vel"}`}
              status={alerta.viavel ? "positivo" : "atencao"}
              destaque
            />
            <KpiCard
              titulo="Pedido descoberto"
              valor={`${num(alerta.cortes_marcados)} un`}
              detalhe="pedidos abertos alÃ©m do estoque"
              destaque
            />
          </div>

          <Cartao
            titulo="Itens do pedido sugerido"
            acao={
              <label className="flex min-h-[44px] items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={soSugestao}
                  onChange={(e) => setSoSugestao(e.target.checked)}
                />
                SÃ³ com sugestÃ£o de compra
              </label>
            }
          >
            <p className="mb-3 text-sm text-muted-foreground tabular">
              {num(totais.itens)} itens Â· {num(totais.caixas)} caixas Â· {num(totais.kg)} kg Â·{" "}
              <strong>{brl(totais.valor)}</strong>
            </p>
            {linhas.length === 0 ? (
              <Vazio texto="Nenhum item com sugestÃ£o de compra." />
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
