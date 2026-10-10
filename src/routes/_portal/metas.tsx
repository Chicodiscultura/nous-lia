import { createFileRoute } from "@tanstack/react-router";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { Topbar } from "@/components/portal/Topbar";
import { Tabela } from "@/components/portal/Tabela";
import { useTabela } from "@/lib/dados";
import { brl, num } from "@/lib/format";

export const Route = createFileRoute("/_portal/metas")({
  head: () => ({
    meta: [
      { title: "Metas & Comissões — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Metas cadastradas e apuração de comissões da equipe comercial Delifrios (em construção).",
      },
      { property: "og:title", content: "Metas & Comissões — DX Vendas Delifrios" },
      {
        property: "og:description",
        content: "Módulo de metas e comissões do portal DX Vendas.",
      },
    ],
  }),
  component: MetasPage,
});

interface Meta extends Record<string, unknown> {
  id?: number | string;
}

function MetasPage() {
  const metas = useTabela<Meta>("metas");
  const colunas = Object.keys(metas.data?.[0] ?? {});

  return (
    <>
      <Topbar
        titulo="Metas & Comissões"
        descricao="Módulo em construção — apuração de comissões chega na próxima versão"
      />

      <div
        className="card-surface mb-6 p-4"
        style={{ borderTop: "3px solid var(--brand-yellow)" }}
      >
        <p className="text-sm font-semibold">Em construção</p>
        <p className="mt-1 text-sm text-muted-foreground">
          As regras de comissão (regras_comissao) e a apuração mensal
          (comissoes_apuradas) serão exibidas aqui. Por enquanto, consulte as metas
          já cadastradas no banco.
        </p>
      </div>

      <Cartao titulo="Metas cadastradas">
        {metas.isLoading ? (
          <Carregando />
        ) : metas.data?.length ? (
          <Tabela<Meta>
            linhas={metas.data}
            chave={(m, i) => String(m["id"] ?? i)}
            colunas={colunas.map((c, idx) => ({
              rotulo: c.replace(/_/g, " "),
              titulo: idx === 0,
              celula: (m: Meta) => {
                const v = m[c];
                const ehValor = /valor|meta|faturamento/.test(c);
                return typeof v === "number"
                  ? ehValor
                    ? brl(v)
                    : num(v)
                  : String(v ?? "—");
              },
            }))}
          />
        ) : (
          <Vazio texto="Nenhuma meta cadastrada." />
        )}
      </Cartao>
    </>
  );
}
