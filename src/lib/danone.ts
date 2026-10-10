import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/** Linha da apuração da Política Comercial Danone (ordem 1..8). */
export interface PoliticaDanone {
  codusur: number;
  vendedor: string;
  ordem: number;
  kpi: string;
  unidade: "t" | "%" | "R$";
  meta: number | null;
  realizado: number | null;
  atingimento: number | null;
  faixa: string | null;
  premio: number | null;
  status: string;
}

export const usePoliticaDanone = (mes: string) =>
  useQuery({
    queryKey: ["fn_politica_danone", mes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_politica_danone", {
        p_mes: mes,
      });
      if (error) throw error;
      return (data ?? []) as PoliticaDanone[];
    },
  });

export interface DanoneP4P {
  bloco_kpi: string;
  unidade: string;
  meta_qtd: number | null;
  real_qtd: number | null;
  atingimento_pct: number | null;
  atingimento_capado: number | null;
  faixa_premio_pct: number | null;
  meta_sellout_rs: number | null;
  real_sellout_rs: number | null;
  base_rs_premiavel: number | null;
  elegivel_dn: boolean | null;
  premio_rs: number | null;
  situacao: string | null;
}

export const useDanoneP4P = (mes: string) =>
  useQuery({
    queryKey: ["fn_danone_p4p", mes],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_danone_p4p", {
        p_mes: mes,
      });
      if (error) throw error;
      return (data ?? []) as DanoneP4P[];
    },
  });

export interface DanoneMeta extends Record<string, unknown> {
  mes: string;
  origem: string | null;
}

export const useDanoneMetas = (mes: string) =>
  useQuery({
    queryKey: ["v_danone_metas", mes],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_danone_metas")
        .select("*")
        .eq("mes", mes);
      if (error) throw error;
      return (data ?? []) as DanoneMeta[];
    },
  });

export interface DanoneOperacao {
  mes: string;
  ton_alta: number;
  ton_mb: number;
  ton_yopro: number;
  rs_alta: number;
  rs_mb: number;
  rs_yopro: number;
  dn_iogurte: number;
  dn_yopro: number;
  pdvs_danone: number;
  pdvs_6grupos: number;
  pct_infaltaveis: number;
}

export const useDanoneOperacao = () =>
  useQuery({
    queryKey: ["v_danone_operacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_danone_operacao")
        .select("*")
        .order("mes");
      if (error) throw error;
      return (data ?? []) as DanoneOperacao[];
    },
  });

/** Mesma estrutura da v_danone_operacao, porém na base de pedidos digitados. */
export const useDanoneOperacaoVendas = () =>
  useQuery({
    queryKey: ["v_danone_operacao_vendas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_danone_operacao_vendas")
        .select("*")
        .order("mes");
      if (error) throw error;
      return (data ?? []) as DanoneOperacao[];
    },
  });

export const ROTULO_BLOCO: Record<string, string> = {
  so_tons_iogurte_alta: "SO Tons — Iogurte Alta Margem",
  so_tons_iogurte_media_baixa: "SO Tons — Iogurte Média/Baixa",
  so_tons_yopro_uht: "SO Tons — YoPro UHT",
  dn_iogurte: "DN — Iogurte",
  dn_yopro_uht: "DN — YoPro UHT",
};
