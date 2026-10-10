import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";


import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { KpiCard } from "@/components/portal/KpiCard";
import { Topbar } from "@/components/portal/Topbar";
import { Tabela } from "@/components/portal/Tabela";
import { usePerfil, useSessao } from "@/hooks/useSessao";
import { useNotasForaFaturamento, useTabela, soma } from "@/lib/dados";
import { brl, dataHora, ddmmaaaa, num } from "@/lib/format";
import { intervaloDe, type Periodo } from "@/lib/periodo";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_portal/admin")({
  head: () => ({
    meta: [
      { title: "Admin — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Status da sincronização com o ERP Winthor e parâmetros do portal DX Vendas.",
      },
      { property: "og:title", content: "Admin — DX Vendas Delifrios" },
      {
        property: "og:description",
        content: "Monitoramento de sincronização e parâmetros do portal.",
      },
    ],
  }),
  component: AdminPage,
});

interface LogSync extends Record<string, unknown> {
  id?: number;
}

function AdminPage() {
  const [periodo, setPeriodo] = useState<Periodo>(() => intervaloDe("mes"));
  const { session } = useSessao();
  const { data: usuario } = usePerfil(session?.user.email ?? undefined);
  const podeAuditar =
    usuario?.perfil === "diretoria" || usuario?.perfil === "admin";
  const notas = useNotasForaFaturamento(periodo);
  const porGrupo = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const n of notas.data ?? []) {
      const g = n.grupo || "Outros";
      acc[g] = (acc[g] ?? 0) + Number(n.valor ?? 0);
    }
    return acc;
  }, [notas.data]);

  const logs = useQuery({
    queryKey: ["log_sync"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("log_sync")
        .select("*")
        .limit(50);
      if (error) throw error;
      return (data ?? []) as LogSync[];
    },
  });
  const parametros = useTabela<Record<string, unknown>>("parametros");

  const colunasLog = Object.keys(logs.data?.[0] ?? {});
  const ultimo = logs.data?.[0];
  const campoData = colunasLog.find((c) => /data|exec|criado|inicio|fim/.test(c));
  const campoRegistros = colunasLog.find((c) => /registro|linhas|qtd/.test(c));
  const campoErro = colunasLog.find((c) => /erro|error|falha/.test(c));

  return (
    <>
      <Topbar
        titulo="Admin"
        periodo={periodo}
        onPeriodo={setPeriodo}
      />

      {podeAuditar ? (
        <div className="mb-4">
          <Link
            to="/admin/usuarios"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 text-sm font-bold"
            style={{ backgroundColor: "var(--brand-red)", color: "#fff" }}
          >
            <Users className="size-4" /> Gestão de usuários
          </Link>
        </div>
      ) : null}



      <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3">
        <KpiCard
          titulo="Última execução"
          valor={campoData ? dataHora(String(ultimo?.[campoData] ?? "")) : "—"}
          destaque
        />
        <KpiCard
          titulo="Registros sincronizados"
          valor={campoRegistros ? num(Number(ultimo?.[campoRegistros] ?? 0)) : "—"}
        />
        <KpiCard
          titulo="Erros na última execução"
          valor={campoErro ? String(ultimo?.[campoErro] ?? "Nenhum") : "Nenhum"}
          status={campoErro && ultimo?.[campoErro] ? "critico" : "positivo"}
        />
      </div>

      <Cartao titulo="Histórico de sincronização" className="mt-6">
        {logs.isLoading ? (
          <Carregando />
        ) : logs.data?.length ? (
          <Tabela<LogSync>
            linhas={logs.data}
            chave={(l, i) => String(l["id"] ?? i)}
            colunas={colunasLog.map((c, idx) => ({
              rotulo: c.replace(/_/g, " "),
              titulo: idx === 0,
              celula: (l: LogSync) => String(l[c] ?? "—"),
            }))}
          />
        ) : (
          <Vazio texto="Sem registros de sincronização." />
        )}
      </Cartao>

      {podeAuditar ? (
        <Cartao titulo="Auditoria: notas fora do faturamento" className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-md bg-secondary px-3 py-1 font-semibold tabular">
              Total excluído no período: {brl(soma(notas.data ?? [], "valor"), true)}
            </span>
            {Object.entries(porGrupo).map(([g, v]) => (
              <span
                key={g}
                className="rounded-md border px-3 py-1 tabular"
                style={{ borderColor: "var(--border)" }}
              >
                {g === "Bonificação" ? "Bonificação" : "Outros (remessa/transferência)"}:{" "}
                <strong>{brl(v, true)}</strong>
              </span>
            ))}
          </div>

          <p className="mb-3 text-xs text-muted-foreground">
            Notas de saída que não entram no faturamento porque não são venda
            normal (condição de venda 1). Base: rotina 111 do Winthor.
          </p>

          {notas.isLoading ? (
            <Carregando />
          ) : notas.data?.length ? (
            <Tabela
              linhas={notas.data}
              chave={(n) => `${n.numnota}-${n.data}`}
              colunas={[
                {
                  rotulo: "Cliente",
                  titulo: true,
                  celula: (n) => n.cliente,
                },
                { rotulo: "Data", celula: (n) => ddmmaaaa(n.data) },
                { rotulo: "Nota", celula: (n) => n.numnota },
                {
                  rotulo: "Tipo",
                  celula: (n) => (
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                        style={
                          n.grupo === "Bonificação"
                            ? {
                                backgroundColor: "var(--warning)",
                                color: "var(--graphite)",
                              }
                            : { backgroundColor: "var(--secondary)" }
                        }
                      >
                        {n.grupo}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {n.tipo}
                      </span>
                    </span>
                  ),
                },
                { rotulo: "Vendedor", celula: (n) => n.vendedor },
                {
                  rotulo: "Valor",
                  direita: true,
                  celula: (n) => brl(n.valor, true),
                },
              ]}
            />
          ) : (
            <Vazio texto="Nenhuma nota fora do faturamento neste período." />
          )}
        </Cartao>
      ) : null}

      <Cartao titulo="Parâmetros" className="mt-6">
        {parametros.isLoading ? (
          <Carregando />
        ) : parametros.data?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {parametros.data.map((p, i) => (
              <div key={i} className="rounded-md border p-3 text-sm">
                {Object.entries(p).map(([k, v]) => (
                  <p key={k} className="flex justify-between gap-3">
                    <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                    <span className="font-medium tabular">{String(v ?? "—")}</span>
                  </p>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <Vazio texto="Nenhum parâmetro cadastrado." />
        )}
      </Cartao>
    </>
  );
}
