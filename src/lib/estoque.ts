import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type FaixaEstoque = "ruptura" | "critico" | "excesso" | "queimado" | "sem giro" | "saudavel";

export interface EstoqueKpis {
  capital_hoje: number | null;
  data_snapshot: string | null;
  estoque_medio_30d: number | null;
  cmv_30d: number | null;
  cmv_mes: number | null;
  giro_30d: number | null;
  skus_ativos: number | null;
  skus_ruptura: number | null;
  ruptura_rs_mes: number | null;
  skus_criticos: number | null;
  capital_excesso: number | null;
  capital_sem_giro: number | null;
  skus_divergentes: number | null;
  skus_queimados: number | null;
  capital_queimado: number | null;
}

export interface EstoqueSku {
  codprod: number;
  descricao: string;
  codfornec: number | null;
  fornecedor: string | null;
  categoria: string | null;
  curva: "A" | "B" | "C" | null;
  disp: number | null;
  bloqueada: number | null;
  custo: number | null;
  capital: number | null;
  vel: number | null;
  cobertura: number | null;
  dias_rupt_mes: number | null;
  ruptura_rs_mes: number | null;
  vl_30d: number | null;
  ult_venda: string | null;
  diverg_lote: boolean | number | null;
  faixa: FaixaEstoque;
  margem_60d: number | null;
  dt_ult_entrada: string | null;
  dias_sem_compra: number | null;
}

export interface EstoqueCapitalDia {
  data: string;
  fornecedor: string | null;
  capital: number | null;
  skus: number | null;
}

/** Busca todas as linhas de uma view, paginando de 1000 em 1000. */
async function buscarTudo<T>(view: string): Promise<T[]> {
  const passo = 1000;
  const out: T[] = [];
  for (let de = 0; ; de += passo) {
    const { data, error } = await supabase.from(view).select("*").range(de, de + passo - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < passo) break;
  }
  return out;
}

export const useEstoqueKpis = () =>
  useQuery({
    queryKey: ["v_estoque_kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_estoque_kpis").select("*").limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as EstoqueKpis | null;
    },
  });

export const useEstoqueSkus = () =>
  useQuery({
    queryKey: ["v_estoque_skus"],
    queryFn: () => buscarTudo<EstoqueSku>("v_estoque_skus"),
  });

export const useEstoqueCapitalDia = () =>
  useQuery({
    queryKey: ["v_estoque_capital_dia"],
    queryFn: () => buscarTudo<EstoqueCapitalDia>("v_estoque_capital_dia"),
  });
