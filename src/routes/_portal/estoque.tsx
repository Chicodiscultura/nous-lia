import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { GraficoBarras } from "@/components/portal/GraficoBarras";
import { GraficoLinha } from "@/components/portal/GraficoLinha";
import { KpiCard } from "@/components/portal/KpiCard";
import { Tabela, type Coluna } from "@/components/portal/Tabela";
import { Topbar } from "@/components/portal/Topbar";
import {
  useEstoqueCapitalDia,
  useEstoqueKpis,
  useEstoqueSkus,
  type EstoqueSku,
  type FaixaEstoque,
} from "@/lib/estoque";
import { brl, ddmm, num, rotuloProduto } from "@/lib/format";
import { mapaDeCores } from "@/lib/serie-cores";

export const Route = createFileRoute("/_portal/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — DX Vendas Delifrios" },
      {
        name: "description",
        content: "Capital em estoque, giro, ruptura e cobertura por produto na Delifrios.",
      },
      { property: "og:title", content: "Estoque — DX Vendas Delifrios" },
      {
        property: "og:description",
        content: "Capital, giro, ruptura e ação de compra por urgência.",
      },
    ],
  }),
  component: EstoquePage,
});

const FAIXAS: { faixa: FaixaEstoque; rotulo: string; cor: string }[] = [
  { faixa: "ruptura", rotulo: "Ruptura", cor: "#D03B3B" },
  { faixa: "critico", rotulo: "Crítico", cor: "#EC835A" },
  { faixa: "excesso", rotulo: "Excesso", cor: "#2A78D6" },
  { faixa: "queimado", rotulo: "Queimado", cor: "#8A5B00" },
  { faixa: "sem giro", rotulo: "Sem giro", cor: "#8A847A" },
  { faixa: "saudavel", rotulo: "Saudável", cor: "#0CA30C" },
];
const ORDEM: Record<string, number> = Object.fromEntries(FAIXAS.map((f, i) => [f.faixa, i]));
const infoFaixa = (f: string) => FAIXAS.find((x) => x.faixa === f) ?? FAIXAS[FAIXAS.length - 1]!;

function Badge({
  cor,
  children,
  title,
}: {
  cor: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ backgroundColor: `${cor}1F`, color: cor }}
    >
      {children}
    </span>
  );
}

function EstoquePage() {
  const kpis = useEstoqueKpis();
  const skus = useEstoqueSkus();
  const capDia = useEstoqueCapitalDia();
  const k = kpis.data;

  const [faixasSel, setFaixasSel] = useState<Set<FaixaEstoque>>(
    () => new Set<FaixaEstoque>(["ruptura", "critico"]),
  );
  const [fornecedor, setFornecedor] = useState("");

  const serie = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const l of capDia.data ?? []) acc[l.data] = (acc[l.data] ?? 0) + Number(l.capital ?? 0);
    return Object.entries(acc)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, valor]) => ({ data, valor }));
  }, [capDia.data]);

  const porFornecedor = useMemo(() => {
    const linhas = capDia.data ?? [];
    const ultima = linhas.reduce((m, l) => (l.data > m ? l.data : m), "");
    const acc: Record<string, number> = {};
    for (const l of linhas) {
      if (l.data !== ultima) continue;
      const n = l.fornecedor ?? "—";
      acc[n] = (acc[n] ?? 0) + Number(l.capital ?? 0);
    }
    const ord = Object.entries(acc)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
    const topo = ord.slice(0, 10);
    const resto = ord.slice(10).reduce((s, d) => s + d.valor, 0);
    return resto > 0 ? [...topo, { nome: "Outros", valor: resto }] : topo;
  }, [capDia.data]);

  const coresForn = useMemo(
    () => mapaDeCores(porFornecedor.filter((d) => d.nome !== "Outros").map((d) => d.nome)),
    [porFornecedor],
  );

  const abc = useMemo(
    () =>
      (["A", "B", "C"] as const).map((c) => {
        const l = (skus.data ?? []).filter((s) => s.curva === c);
        return {
          curva: c,
          skus: l.length,
          capital: l.reduce((s, x) => s + Number(x.capital ?? 0), 0),
          ruptura: l.filter((x) => x.faixa === "ruptura").length,
        };
      }),
    [skus.data],
  );

  const fornecedores = useMemo(
    () =>
      Array.from(new Set((skus.data ?? []).map((s) => s.fornecedor ?? "—"))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [skus.data],
  );

  const doFornecedor = useMemo(
    () => (skus.data ?? []).filter((s) => !fornecedor || (s.fornecedor ?? "—") === fornecedor),
    [skus.data, fornecedor],
  );

  const contagem = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of doFornecedor) c[s.faixa] = (c[s.faixa] ?? 0) + 1;
    return c;
  }, [doFornecedor]);

  const linhas = useMemo(() => {
    const peso = (s: EstoqueSku) => Math.max(Number(s.ruptura_rs_mes ?? 0), Number(s.capital ?? 0));
    return doFornecedor
      .filter((s) => faixasSel.size === 0 || faixasSel.has(s.faixa))
      .sort((a, b) => (ORDEM[a.faixa] ?? 9) - (ORDEM[b.faixa] ?? 9) || peso(b) - peso(a));
  }, [doFornecedor, faixasSel]);

  const grupos = useMemo(() => {
    const m = new Map<
      string,
      {
        nome: string;
        itens: EstoqueSku[];
        perdida: number;
        capital: number;
        peso: number;
        contagem: Record<string, number>;
      }
    >();
    for (const l of linhas) {
      const nome = l.fornecedor ?? "—";
      let g = m.get(nome);
      if (!g) {
        g = { nome, itens: [], perdida: 0, capital: 0, peso: 0, contagem: {} };
        m.set(nome, g);
      }
      g.itens.push(l);
      g.perdida += Number(l.ruptura_rs_mes ?? 0);
      g.capital += Number(l.capital ?? 0);
      g.peso += Math.max(Number(l.ruptura_rs_mes ?? 0), Number(l.capital ?? 0));
      g.contagem[l.faixa] = (g.contagem[l.faixa] ?? 0) + 1;
    }
    return [...m.values()].sort((a, b) => b.peso - a.peso);
  }, [linhas]);

  const [abertos, setAbertos] = useState<Set<string>>(() => new Set());
  const alternarForn = (nome: string) =>
    setAbertos((prev) => {
      const n = new Set(prev);
      if (n.has(nome)) n.delete(nome);
      else n.add(nome);
      return n;
    });

  const colunasItens: Coluna<EstoqueSku>[] = [
    {
      rotulo: "Produto",
      titulo: true,
      celula: (l) => rotuloProduto(l.codprod, l.descricao),
    },
    {
      rotulo: "Curva",
      celula: (l) =>
        l.curva ? <Badge cor={l.curva === "A" ? "#D03B3B" : "#7A746B"}>{l.curva}</Badge> : "—",
    },
    {
      rotulo: "Situação",
      celula: (l) => {
        const f = infoFaixa(l.faixa);
        const motivo =
          l.faixa === "queimado"
            ? l.dt_ult_entrada != null && l.margem_60d != null
              ? `Sem compra desde ${ddmm(l.dt_ult_entrada)} · margem ${num(l.margem_60d, 1)}% em 60d`
              : "Queimado"
            : undefined;
        return (
          <Badge cor={f.cor} {...(motivo ? { title: motivo } : {})}>
            {f.rotulo}
          </Badge>
        );
      },
    },
    { rotulo: "Disp.", direita: true, celula: (l) => num(l.disp) },
    { rotulo: "Vel/dia", direita: true, celula: (l) => num(l.vel, 1) },
    {
      rotulo: "Cobertura",
      direita: true,
      celula: (l) => (l.cobertura == null ? "—" : `${num(l.cobertura)}d`),
    },
    { rotulo: "Dias rupt.", direita: true, celula: (l) => num(l.dias_rupt_mes) },
    {
      rotulo: "Venda perdida",
      direita: true,
      celula: (l) => (
        <span style={{ color: Number(l.ruptura_rs_mes ?? 0) > 0 ? "#D03B3B" : undefined }}>
          {brl(l.ruptura_rs_mes)}
        </span>
      ),
    },
    { rotulo: "Venda 30d", direita: true, celula: (l) => brl(l.vl_30d) },
    { rotulo: "Capital", direita: true, celula: (l) => brl(l.capital) },
  ];

  const alternar = (f: FaixaEstoque) =>
    setFaixasSel((prev) => {
      const n = new Set(prev);
      if (n.has(f)) n.delete(f);
      else n.add(f);
      return n;
    });

  const ruptRs = Number(k?.ruptura_rs_mes ?? 0);
  const diverg = Number(k?.skus_divergentes ?? 0);

  return (
    <>
      <Topbar
        titulo="Estoque"
        descricao={`Capital, giro, ruptura e cobertura. Réguas: ativo = venda em 60 dias · crítico < 7 dias de cobertura · excesso > 45 dias. Foto do snapshot de ${ddmm(k?.data_snapshot)}.`}
      />

      {kpis.isLoading ? (
        <Carregando />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <KpiCard
            titulo="Capital em estoque"
            destaque
            valor={brl(k?.capital_hoje)}
            detalhe={`média 30d ${brl(k?.estoque_medio_30d)}`}
          />
          <KpiCard
            titulo="Giro (30 dias)"
            valor={`${num(k?.giro_30d, 1)}×`}
            detalhe={`CMV ${brl(k?.cmv_30d)} ÷ estoque médio`}
          />
          <KpiCard
            titulo="Venda perdida por ruptura — mês"
            valor={brl(ruptRs)}
            {...(ruptRs > 0 ? { status: "critico" as const } : {})}
            detalhe={`${num(k?.skus_ruptura)} de ${num(k?.skus_ativos)} ativos zerados · ${num(k?.skus_queimados)} queimados fora da conta`}
          />
          <KpiCard
            titulo="Cobertura crítica"
            ponto="#EC835A"
            valor={`${num(k?.skus_criticos)} SKUs`}
            detalhe="acabam antes de 7 dias"
          />
          <KpiCard
            titulo="Capital em excesso"
            ponto="#2A78D6"
            valor={brl(k?.capital_excesso)}
            detalhe="acima de 45 dias de cobertura"
          />
          <KpiCard
            titulo="Sem giro"
            valor={brl(k?.capital_sem_giro)}
            detalhe="com estoque e sem venda em 60d"
          />
          <KpiCard
            titulo="Divergência lote × estoque"
            valor={`${num(diverg)} SKUs`}
            {...(diverg > 0 ? { status: "critico" as const } : {})}
            detalhe="alimenta o inventário rotativo"
          />
          <Link to="/validade" className="block">
            <KpiCard
              titulo="Risco de validade"
              valor={<span className="text-base underline sm:text-lg">ver aba Validade</span>}
              detalhe="vencimento e desconto por lote"
            />
          </Link>
        </div>
      )}

      <Cartao titulo="Capital em estoque, dia a dia" className="mt-6">
        <p className="-mt-3 mb-3 text-xs text-muted-foreground">
          snapshot diário das 04:10 · R$ a custo
        </p>
        {capDia.isLoading ? (
          <Carregando />
        ) : serie.length ? (
          <GraficoLinha dados={serie} />
        ) : (
          <Vazio />
        )}
      </Cartao>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <Cartao titulo="Capital por fornecedor">
          {capDia.isLoading ? (
            <Carregando />
          ) : porFornecedor.length ? (
            <GraficoBarras
              dados={porFornecedor}
              cores={coresForn}
              altura={Math.max(240, porFornecedor.length * 32)}
            />
          ) : (
            <Vazio />
          )}
        </Cartao>

        <Cartao titulo="Curva ABC × situação">
          {skus.isLoading ? (
            <Carregando />
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 text-left">Curva</th>
                    <th className="py-2 text-right">SKUs</th>
                    <th className="py-2 text-right">Capital</th>
                    <th className="py-2 text-right">Em ruptura</th>
                  </tr>
                </thead>
                <tbody>
                  {abc.map((r) => (
                    <tr key={r.curva} className="border-b last:border-0">
                      <td className="py-2">
                        <Badge cor={r.curva === "A" ? "#D03B3B" : "#7A746B"}>{r.curva}</Badge>
                      </td>
                      <td className="py-2 text-right tabular">{num(r.skus)}</td>
                      <td className="py-2 text-right tabular">{brl(r.capital)}</td>
                      <td
                        className="py-2 text-right font-semibold tabular"
                        style={{ color: r.ruptura > 0 ? "#D03B3B" : undefined }}
                      >
                        {num(r.ruptura)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">
                Curva A em ruptura é emergência de compra; curva C em excesso é capital morto.
              </p>
            </>
          )}
        </Cartao>
      </div>

      <Cartao titulo="Ação de compra — por urgência e valor" className="mt-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {FAIXAS.map((f) => {
              const ativo = faixasSel.has(f.faixa);
              return (
                <button
                  key={f.faixa}
                  onClick={() => alternar(f.faixa)}
                  className="min-h-[44px] rounded-full border px-3 text-xs font-bold transition-opacity sm:text-sm"
                  style={{
                    borderColor: f.cor,
                    backgroundColor: ativo ? f.cor : "transparent",
                    color: ativo ? "#fff" : f.cor,
                    opacity: ativo || faixasSel.size === 0 ? 1 : 0.6,
                  }}
                >
                  {f.rotulo} · {num(contagem[f.faixa] ?? 0)}
                </button>
              );
            })}
          </div>
          <select
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            className="card-surface min-h-[44px] px-3 text-sm"
          >
            <option value="">Todos os fornecedores</option>
            {fornecedores.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        {skus.isLoading ? (
          <Carregando />
        ) : linhas.length ? (
          <Tabela
            compacto
            linhas={grupos}
            chave={(g) => g.nome}
            expandido={(g) => fornecedor !== "" || abertos.has(g.nome)}
            renderExpandido={(g) => (
              <div className="mb-3 rounded-lg border border-border bg-background p-2 sm:ml-6">
                <Tabela
                  compacto
                  linhas={g.itens}
                  chave={(l) => String(l.codprod)}
                  colunas={colunasItens}
                />
              </div>
            )}
            colunas={[
              {
                rotulo: "Fornecedor",
                titulo: true,
                celula: (g) => {
                  const aberto = fornecedor !== "" || abertos.has(g.nome);
                  return (
                    <button
                      onClick={() => alternarForn(g.nome)}
                      className="flex min-h-[44px] items-center gap-1 text-left font-extrabold"
                    >
                      {aberto ? (
                        <ChevronDown className="size-4 shrink-0" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0" />
                      )}
                      {g.nome}
                    </button>
                  );
                },
              },
              {
                rotulo: "Situação",
                celula: (g) => (
                  <span className="hidden flex-wrap gap-1 md:flex">
                    {FAIXAS.filter((f) => g.contagem[f.faixa]).map((f) => (
                      <Badge key={f.faixa} cor={f.cor}>
                        {g.contagem[f.faixa]} {f.rotulo.toLowerCase()}
                      </Badge>
                    ))}
                  </span>
                ),
              },
              { rotulo: "Itens", direita: true, celula: (g) => num(g.itens.length) },
              {
                rotulo: "Venda perdida",
                direita: true,
                celula: (g) => (
                  <span style={{ color: g.perdida > 0 ? "#D03B3B" : undefined }}>
                    {brl(g.perdida)}
                  </span>
                ),
              },
              { rotulo: "Capital", direita: true, celula: (g) => brl(g.capital) },
            ]}
          />
        ) : (
          <Vazio texto="Nenhum produto nas situações selecionadas." />
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          Velocidade = unidades por dia útil com estoque (35 dias). Venda perdida = velocidade ×
          dias zerados no mês × preço praticado — é teto, não caixa: parte dos clientes substitui ou
          espera. Queimado = sem compra há 60+ dias e margem abaixo de 5% — liquidação deliberada;
          não conta como ruptura nem gera venda perdida.
        </p>
      </Cartao>
    </>
  );
}
