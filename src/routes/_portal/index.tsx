import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useMemo } from "react";

import { Cartao, Carregando } from "@/components/portal/Cartao";
import { KpiCard } from "@/components/portal/KpiCard";
import { Topbar } from "@/components/portal/Topbar";
import { useSessao, usePerfil } from "@/hooks/useSessao";
import { useCompradorAlertas } from "@/lib/analista";
import { useEstoqueKpis, useEstoqueSkus } from "@/lib/estoque";
import { brl, ddmm, num, pct } from "@/lib/format";
import { useGmroi } from "@/lib/gmroi";
import { useTermometro } from "@/lib/validade";

export const Route = createFileRoute("/_portal/")({
  head: () => ({
    meta: [
      { title: "Início — LIA · NOUS" },
      {
        name: "description",
        content: "Pendências, alertas e o indicador de eficiência da operação.",
      },
    ],
  }),
  component: Inicio,
});

type Severidade = "critico" | "grave" | "atencao";

const COR: Record<Severidade, string> = {
  critico: "var(--critical)",
  grave: "var(--severe)",
  atencao: "var(--warning)",
};

interface Alerta {
  id: string;
  sev: Severidade;
  texto: string;
  detalhe: string;
  to: "/estoque" | "/validade" | "/analista";
}

/** Indicador principal: valor grande, definição curta e barra de progresso até a meta (se houver). */
function IndicadorMeta({
  titulo,
  valor,
  unidade,
  meta,
  atual,
  cor,
  linhas,
  ajuda,
}: {
  titulo: string;
  valor: string;
  unidade?: string;
  /** Meta na mesma escala de `atual`; null = ainda não definida. */
  meta: number | null;
  atual: number | null;
  cor: string;
  linhas: string[];
  ajuda: string;
}) {
  const progresso = meta && atual != null ? Math.max(0, Math.min(100, (atual / meta) * 100)) : null;
  return (
    <div className="card-surface p-4 sm:p-5" style={{ borderTop: `3px solid ${cor}` }}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
        {titulo}
      </p>
      <p
        className="mt-2 flex items-baseline gap-2 text-3xl font-extrabold leading-none tabular sm:text-4xl"
        style={{ fontFamily: "var(--font-display)", color: cor }}
      >
        {valor}
        {unidade ? <span className="text-base font-bold text-muted-foreground">{unidade}</span> : null}
      </p>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{meta != null ? `Meta ${num(meta, meta % 1 === 0 ? 0 : 1)}${unidade === "%" ? "%" : ""}` : "Meta ainda não definida"}</span>
          {progresso != null ? <span className="tabular">{num(progresso, 0)}% da meta</span> : null}
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full"
            style={{ width: `${progresso ?? 0}%`, backgroundColor: cor }}
          />
        </div>
      </div>

      <ul className="mt-3 space-y-0.5 text-xs text-muted-foreground tabular">
        {linhas.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <p className="mt-3 border-t pt-2 text-[11px] leading-snug text-muted-foreground">{ajuda}</p>
    </div>
  );
}

function Inicio() {
  const gmroi = useGmroi();
  const g = gmroi.data;
  const { session } = useSessao();
  const { data: perfil } = usePerfil(session?.user.email ?? undefined);
  const kpis = useEstoqueKpis();
  const skus = useEstoqueSkus();
  const termometro = useTermometro();
  const analista = useCompradorAlertas();

  const k = kpis.data;

  const validade = useMemo(() => {
    const l = termometro.data ?? [];
    const estoque = l.reduce((s, x) => s + Number(x.vl_estoque ?? 0), 0);
    const vence = l.reduce((s, x) => s + Number(x.vl_vence ?? 0), 0);
    const critico = l.reduce((s, x) => s + Number(x.vl_critico ?? 0), 0);
    return { estoque, vence, critico, pctRisco: estoque > 0 ? ((vence + critico) / estoque) * 100 : 0 };
  }, [termometro.data]);

  // Indicador de eficiência (proposta v1): capital que está girando ÷ capital total.
  // Produtivo = faixas saudável e crítico (giram). Improdutivo = excesso, sem giro e queimado.
  const eficiencia = useMemo(() => {
    const l = skus.data ?? [];
    const cap = (faixas: string[]) =>
      l.filter((s) => faixas.includes(s.faixa)).reduce((s, x) => s + Number(x.capital ?? 0), 0);
    const produtivo = cap(["saudavel", "critico"]);
    const improdutivo = cap(["excesso", "sem giro", "queimado"]);
    const total = produtivo + improdutivo;
    return { produtivo, improdutivo, valor: total > 0 ? (produtivo / total) * 100 : null };
  }, [skus.data]);

  const alertas = useMemo<Alerta[]>(() => {
    const out: Alerta[] = [];
    for (const a of analista.data ?? []) {
      if (Number(a.skus_risco ?? 0) > 0) {
        out.push({
          id: `analista-${a.codfornec}`,
          sev: "critico",
          texto: `${num(a.skus_risco)} SKUs rompem antes de ${ddmm(a.proxima_entrega)}`,
          detalhe: `Perda projetada ${brl(a.perda_projetada)} · pedido sugerido de ${num(a.kg_sugerido)} kg aguardando aprovação`,
          to: "/analista",
        });
      }
    }
    if (k && Number(k.skus_ruptura ?? 0) > 0) {
      out.push({
        id: "ruptura",
        sev: "critico",
        texto: `${num(k.skus_ruptura)} SKUs em ruptura`,
        detalhe: `Venda perdida de ${brl(k.ruptura_rs_mes)} no mês`,
        to: "/estoque",
      });
    }
    if (validade.vence + validade.critico > 0) {
      out.push({
        id: "validade",
        sev: validade.critico > 0 ? "grave" : "atencao",
        texto: `${brl(validade.vence + validade.critico)} em risco de validade`,
        detalhe: `${pct(validade.pctRisco)} do estoque a custo · ${brl(validade.critico)} já na janela crítica`,
        to: "/validade",
      });
    }
    if (k && Number(k.skus_criticos ?? 0) > 0) {
      out.push({
        id: "criticos",
        sev: "grave",
        texto: `${num(k.skus_criticos)} SKUs com cobertura crítica`,
        detalhe: "Estoque cobre menos dias que o ciclo de reposição",
        to: "/estoque",
      });
    }
    if (k && Number(k.capital_excesso ?? 0) > 0) {
      out.push({
        id: "excesso",
        sev: "atencao",
        texto: `${brl(k.capital_excesso)} parados em excesso`,
        detalhe: "Cobertura acima do limite definido para o fornecedor",
        to: "/estoque",
      });
    }
    return out;
  }, [analista.data, k, validade]);

  const carregando = kpis.isLoading || skus.isLoading || termometro.isLoading;

  return (
    <div className="space-y-6">
      <Topbar
        titulo={perfil?.nome ? `Olá, ${perfil.nome.split(" ")[0]}` : "Início"}
        descricao={`${perfil?.tenant ?? "Sua operação"} · dados de ${k?.data_snapshot ? k.data_snapshot.split("-").reverse().join("/") : "—"}`}
      />

      {carregando ? (
        <Carregando />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <IndicadorMeta
              titulo="GMROI · retorno da margem sobre o estoque"
              valor={g?.gmroi_anualizado == null ? "—" : `${num(g.gmroi_anualizado, 2)}×`}
              meta={g?.meta_gmroi_anual ?? null}
              atual={g?.gmroi_anualizado ?? null}
              cor="var(--brand-red)"
              linhas={[
                `${num(g?.gmroi_30d, 2)}× no mês · margem bruta ${pct(g?.margem_pct)}`,
                `Margem ${brl(g?.margem_30d)} ÷ estoque médio ${brl(g?.estoque_medio_30d)}`,
              ]}
              ajuda="Cada R$ 1 investido em estoque devolve este valor em margem bruta por ano (últimos 30 dias, anualizado)."
            />
            <IndicadorMeta
              titulo="Eficiência do capital"
              valor={eficiencia.valor == null ? "—" : num(eficiencia.valor, 1)}
              unidade="%"
              meta={g?.meta_eficiencia_pct ?? null}
              atual={eficiencia.valor}
              cor={
                eficiencia.valor == null || g?.meta_eficiencia_pct == null
                  ? "var(--brand-red)"
                  : eficiencia.valor >= g.meta_eficiencia_pct
                    ? "var(--positive-text)"
                    : eficiencia.valor >= g.meta_eficiencia_pct - 10
                      ? "var(--warning)"
                      : "var(--critical)"
              }
              linhas={[
                `Girando ${brl(eficiencia.produtivo)}`,
                `Parado ${brl(eficiencia.improdutivo)} (excesso, sem giro e queimado)`,
              ]}
              ajuda="Parcela do capital em estoque que está girando. Subir este número cortando estoque pode gerar ruptura: leia junto com a venda perdida."
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              titulo="Capital em estoque"
              valor={brl(k?.capital_hoje)}
              detalhe={`Giro 30d: ${num(k?.giro_30d, 2)}×`}
              destaque
            />
            <KpiCard
              titulo="Venda perdida no mês"
              valor={brl(k?.ruptura_rs_mes)}
              detalhe={`${num(k?.skus_ruptura)} SKUs em ruptura · trava da eficiência`}
              status={Number(k?.ruptura_rs_mes ?? 0) > 0 ? "critico" : "positivo"}
              destaque
            />
            <KpiCard
              titulo="Risco de validade"
              valor={brl(validade.vence + validade.critico)}
              detalhe={`${pct(validade.pctRisco)} do estoque a custo`}
              status={validade.pctRisco > 5 ? "grave" : "atencao"}
              destaque
            />
          </div>

          <Cartao titulo="Pendências e alertas">
            {alertas.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma pendência. A operação está dentro dos limites.
              </p>
            ) : (
              <ul className="divide-y">
                {alertas.map((a) => (
                  <li key={a.id}>
                    <Link
                      to={a.to}
                      className="flex min-h-[56px] items-center gap-3 py-3 transition-colors hover:bg-muted/60"
                    >
                      <span
                        aria-hidden
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: COR[a.sev] }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{a.texto}</span>
                        <span className="block text-xs text-muted-foreground">{a.detalhe}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <p className="text-xs text-muted-foreground">
            GMROI = margem bruta de 30 dias ÷ estoque médio a custo de 30 dias, × 365/30. Eficiência do
            capital = capital em SKUs saudáveis ou em cobertura crítica ÷ (esse capital + excesso, sem
            giro e queimado). Metas ficam em parâmetros editáveis; o GMROI ainda não tem meta definida.
          </p>
        </>
      )}
    </div>
  );
}
