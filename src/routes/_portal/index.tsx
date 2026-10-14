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

function Inicio() {
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              titulo="Capital em estoque"
              valor={brl(k?.capital_hoje)}
              detalhe={`Giro 30d: ${num(k?.giro_30d, 2)}×`}
              destaque
            />
            <KpiCard
              titulo="Venda perdida no mês"
              valor={brl(k?.ruptura_rs_mes)}
              detalhe={`${num(k?.skus_ruptura)} SKUs em ruptura`}
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
            <KpiCard
              titulo="Eficiência do capital"
              valor={eficiencia.valor == null ? "—" : pct(eficiencia.valor)}
              detalhe="do capital está girando"
              status={
                eficiencia.valor != null && eficiencia.valor >= 80
                  ? "positivo"
                  : eficiencia.valor != null && eficiencia.valor >= 60
                    ? "atencao"
                    : "grave"
              }
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
            Eficiência do capital = capital em SKUs saudáveis ou em cobertura crítica ÷ capital total
            (exclui excesso, sem giro e queimado). Indicador da v1, sujeito à calibração com a operação.
          </p>
        </>
      )}
    </div>
  );
}
