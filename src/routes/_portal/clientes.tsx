import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Users2,
  X,
} from "lucide-react";
import { useState } from "react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { KpiCard } from "@/components/portal/KpiCard";
import { Tabela } from "@/components/portal/Tabela";
import { Topbar } from "@/components/portal/Topbar";
import {
  useClienteVendedorMensal,
  useClientesDetalhe,
  useClientesKpis,
  useClientesPorCidade,
  useClientesPorVendedor,
} from "@/lib/dados";
import { brl, ddmmaaaa, num, pct } from "@/lib/format";
import { intervaloDe, type Periodo } from "@/lib/periodo";

interface LinhaLista {
  cidade?: string;
  vendedor?: string;
  equipe?: string;
  clientes_positivados: number;
  toneladas: number;
  valor_vendido: number;
  rs_por_kg: number;
  participacao_pct: number;
}

const nomeDe = (l: LinhaLista, modo: "cidade" | "vendedor") =>
  (modo === "cidade" ? l.cidade : l.vendedor) ?? "";

export const Route = createFileRoute("/_portal/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Base ativa, positivação, ticket médio e inadimplência dos clientes da Delifrios.",
      },
      { property: "og:title", content: "Clientes — DX Vendas Delifrios" },
      {
        property: "og:description",
        content: "Atividade da carteira de clientes da distribuidora Delifrios.",
      },
    ],
  }),
  component: ClientesPage,
});

const ton = (v: number | null | undefined) => `${num(v, 3)} t`;

type Modo = "cidade" | "vendedor";

function ClientesPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => intervaloDe("mes"));
  const [modo, setModo] = useState<Modo>("cidade");
  const [aberto, setAberto] = useState<string | null>(null);

  const kpis = useClientesKpis(periodo);
  const cidades = useClientesPorCidade(periodo);
  const vendedores = useClientesPorVendedor(periodo);

  const lista = modo === "cidade" ? cidades : vendedores;
  const k = kpis.data;

  const trocarModo = (m: Modo) => {
    setModo(m);
    setAberto(null);
  };

  const botao = (m: Modo, rotulo: string) => {
    const ativo = modo === m;
    return (
      <button
        key={m}
        onClick={() => trocarModo(m)}
        className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
        style={
          ativo
            ? {
                backgroundColor: "var(--brand-yellow)",
                color: "var(--graphite)",
              }
            : { color: "var(--muted-foreground)" }
        }
      >
        {rotulo}
      </button>
    );
  };


  return (
    <>
      <Topbar titulo="Clientes" periodo={periodo} onPeriodo={setPeriodo} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard titulo="Base ativa" valor={num(k?.base_ativa ?? 0)} destaque />
        <KpiCard
          titulo="Positivados no período"
          valor={num(k?.positivados ?? 0)}
          detalhe={pct(k?.pct_positivacao ?? 0)}
        />
        <KpiCard titulo="Novos clientes" valor={num(k?.novos_clientes ?? 0)} />
        <KpiCard
          titulo="Sem compra +30 dias"
          valor={num(k?.sem_compra_30d ?? 0)}
          detalhe={`+90 dias: ${num(k?.sem_compra_90d ?? 0)}`}
        />
        <KpiCard titulo="Ticket médio" valor={brl(k?.ticket_medio ?? 0, true)} />
        <KpiCard
          titulo="Inadimplentes"
          ponto="var(--critical)"
          valor={num(k?.clientes_inadimplentes ?? 0)}
          detalhe={brl(k?.valor_vencido ?? 0, true)}
        />
      </div>

      <Cartao
        titulo={modo === "cidade" ? "Clientes por cidade" : "Clientes por vendedor"}
        className="mt-6"
        acao={
          <div className="card-surface flex overflow-hidden p-1">
            {botao("cidade", "Por cidade")}
            {botao("vendedor", "Por vendedor")}
          </div>
        }
      >
        {lista.isLoading ? (
          <Carregando />
        ) : (lista.data?.length ?? 0) > 0 ? (
          <Tabela<LinhaLista>
            linhas={(lista.data ?? []) as LinhaLista[]}
            chave={(l) => nomeDe(l, modo)}
            expandido={(l) => aberto === nomeDe(l, modo)}
            renderExpandido={(l) => (
              <PainelDetalhe
                nome={nomeDe(l, modo)}
                modo={modo}
                onFechar={() => setAberto(null)}
              />
            )}
            colunas={[
              {
                rotulo: modo === "cidade" ? "Cidade" : "Vendedor",
                titulo: true,
                celula: (l) => {
                  const nome = nomeDe(l, modo);
                  return (
                    <button
                      onClick={() => setAberto(aberto === nome ? null : nome)}
                      className="flex min-h-[44px] items-center text-left font-medium underline-offset-2 hover:underline sm:min-h-0"
                      style={{ color: "var(--primary)" }}
                    >
                      {nome || "—"}
                    </button>
                  );
                },
              },
              ...(modo === "vendedor"
                ? [
                    {
                      rotulo: "Equipe",
                      celula: (l: LinhaLista) => l.equipe || "—",
                    },
                  ]
                : []),
              {
                rotulo: "Clientes positivados",
                direita: true,
                celula: (l) => num(l.clientes_positivados),
              },
              { rotulo: "Toneladas", direita: true, celula: (l) => ton(l.toneladas) },
              {
                rotulo: "Valor vendido",
                direita: true,
                celula: (l) => brl(l.valor_vendido),
              },
              {
                rotulo: "R$/Kg",
                direita: true,
                celula: (l) => brl(l.rs_por_kg, true),
              },
              {
                rotulo: "Participação",
                direita: true,
                celula: (l) => pct(l.participacao_pct),
              },
            ]}
          />
        ) : (
          <Vazio texto="Sem dados no período." />
        )}
      </Cartao>
    </>
  );
}

const mesCurtoAno = (iso: string) => {
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "");
};

function SubTabelaVendedores({
  codcli,
  vendedorAtual,
}: {
  codcli: number;
  vendedorAtual: string | null;
}) {
  const consulta = useClienteVendedorMensal(codcli);
  const linhas = consulta.data ?? [];

  if (consulta.isLoading) return <Carregando />;
  if (!linhas.length) return <Vazio texto="Sem histórico por vendedor." />;

  const meses = [...new Set(linhas.map((l) => String(l.mes).slice(0, 10)))].sort();
  const vendedores = [...new Set(linhas.map((l) => l.vendedor))];
  const valor = (v: string, m: string) =>
    linhas
      .filter((l) => l.vendedor === v && String(l.mes).slice(0, 10) === m)
      .reduce((s, l) => s + Number(l.valor ?? 0), 0);

  return (
    <div className="my-2 overflow-x-auto rounded-lg border bg-background p-3">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left uppercase tracking-wide text-muted-foreground">
            <th className="py-1.5 pr-4">Vendedor</th>
            {meses.map((m) => (
              <th key={m} className="py-1.5 pr-4 text-right">
                {mesCurtoAno(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vendedores.map((v) => {
            const atual =
              vendedorAtual != null &&
              v.trim().toLowerCase() === vendedorAtual.trim().toLowerCase();
            return (
              <tr key={v} className="border-b last:border-0">
                <td className={`py-1.5 pr-4 ${atual ? "font-bold" : ""}`}>{v}</td>
                {meses.map((m) => (
                  <td
                    key={m}
                    className={`py-1.5 pr-4 text-right tabular ${atual ? "font-bold" : ""}`}
                  >
                    {brl(valor(v, m))}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PainelDetalhe({
  nome,
  modo,
  onFechar,
}: {
  nome: string;
  modo: Modo;
  onFechar: () => void;
}) {
  const detalhe = useClientesDetalhe(
    modo === "cidade" ? nome : null,
    modo === "vendedor" ? nome : null,
  );
  const linhas = detalhe.data ?? [];
  const [expandidoCli, setExpandidoCli] = useState<number | null>(null);

  return (
    <div className="my-2 rounded-lg border bg-secondary/40 p-3 sm:p-4">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h3 className="min-w-0 truncate text-sm font-extrabold">
          {nome} · {num(linhas.length)} clientes
        </h3>
        <button
          onClick={onFechar}
          className="flex min-h-[44px] shrink-0 items-center gap-1 rounded-md border px-3 text-xs font-medium text-muted-foreground"
        >
          <X className="size-3" /> Fechar
        </button>
      </div>

      {detalhe.isLoading ? (
        <Carregando />
      ) : linhas.length ? (
        <Tabela
          linhas={linhas}
          chave={(c) => String(c.codcli)}
          expandido={(c) => expandidoCli === c.codcli}
          renderExpandido={(c) => (
            <SubTabelaVendedores
              codcli={c.codcli}
              vendedorAtual={modo === "vendedor" ? nome : c.rca}
            />
          )}
          colunas={[
            {
              rotulo: "Cliente",
              titulo: true,
              celula: (c) => (
                <span className="block">
                  <span className="flex items-center gap-1">
                    {c.outros_vendedores ? (
                      <button
                        onClick={() =>
                          setExpandidoCli(
                            expandidoCli === c.codcli ? null : c.codcli,
                          )
                        }
                        aria-label="Ver compras por vendedor"
                        className="shrink-0 text-muted-foreground"
                      >
                        {expandidoCli === c.codcli ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>
                    ) : null}
                    <span className="font-medium">{c.cliente}</span>
                    <span className="ml-1 text-xs text-muted-foreground tabular">
                      #{c.codcli}
                    </span>
                  </span>
                  {c.outros_vendedores ? (
                    <span
                      className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
                      style={{
                        backgroundColor: "color-mix(in srgb, #FAB219 18%, transparent)",
                        color: "#8A5B00",
                      }}
                    >
                      <Users2 className="size-3" />
                      compartilhado com {c.outros_vendedores}
                    </span>
                  ) : null}
                </span>
              ),
            },
            { rotulo: "RCA", celula: (c) => c.rca },
            {
              rotulo: "Última compra",
              celula: (c) => ddmmaaaa(c.ultima_compra),
            },
            {
              rotulo:
                modo === "vendedor"
                  ? "Mês anterior (deste vendedor)"
                  : "R$ Mês anterior",
              direita: true,
              celula: (c) => brl(Number(c.compras_mes_anterior ?? 0)),
            },
            {
              rotulo:
                modo === "vendedor"
                  ? "Mês atual (deste vendedor)"
                  : "R$ Mês atual",
              direita: true,
              celula: (c) => {
                const atual = Number(c.compras_mes_atual ?? 0);
                const ant = Number(c.compras_mes_anterior ?? 0);
                const varPct = ant > 0 ? ((atual - ant) / ant) * 100 : null;
                return (
                  <span className="flex items-center justify-end gap-1">
                    {brl(atual)}
                    {varPct !== null && varPct !== 0 ? (
                      <span
                        className="flex items-center gap-0.5 text-xs font-semibold"
                        style={{
                          color:
                            varPct > 0
                              ? "var(--positive-text)"
                              : "var(--critical)",
                        }}
                      >
                        {varPct > 0 ? (
                          <ArrowUpRight className="size-3.5" />
                        ) : (
                          <ArrowDownRight className="size-3.5" />
                        )}
                        {pct(Math.abs(varPct))}
                      </span>
                    ) : null}
                  </span>
                );
              },
            },
            {
              rotulo: "R$ Títulos abertos",
              direita: true,
              celula: (c) => brl(c.titulos_abertos, true),
            },
            {
              rotulo: "R$ Títulos vencidos",
              direita: true,
              celula: (c) => {
                const vencidos = Number(c.titulos_vencidos ?? 0);
                return (
                  <span
                    className="font-semibold"
                    style={{
                      color: vencidos > 0 ? "var(--critical)" : undefined,
                    }}
                  >
                    {vencidos > 0 ? "▲ " : ""}
                    {brl(vencidos, true)}
                  </span>
                );
              },
            },
          ]}
        />
      ) : (
        <Vazio texto="Nenhum cliente encontrado." />
      )}
    </div>
  );
}
