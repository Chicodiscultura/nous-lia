import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

export type Temperatura =
  | "CRITICO"
  | "FERVENDO"
  | "QUENTE"
  | "MORNO"
  | "TEPIDO"
  | "FRIO"
  | "SEM VALIDADE";

export interface TermometroSku {
  data: string;
  codprod: number;
  codfornec: number | null;
  fornecedor: string | null;
  descricao: string;
  un: string | null;
  codcategoria: number | null;
  categoria: string | null;
  disp: number | null;
  /** Venda digitada ainda não faturada + bloqueio. */
  qt_reservada: number | null;
  custo: number | null;
  pvenda: number | null;
  margem_tab: number | null;
  vel: number | null;
  dias_com: number | null;
  cobertura: number | null;
  qt_30d: number | null;
  vl_30d: number | null;
  validade: string | null;
  dias_val: number | null;
  primeira_sobra: string | null;
  dias_sobra: number | null;
  idade: number | null;
  qt_vence: number | null;
  vl_vence: number | null;
  qt_critico: number | null;
  vl_critico: number | null;
  prazo_cliente: number | null;
  vl_estoque: number | null;
  temperatura: Temperatura;
  diverg_lote: number | null;
  /** Escada de desconto pela validade do lote FIFO: null, 20 ou 40. */
  desconto_pct: number | null;
  preco_acao: number | null;
  /** Margem % no preço de ação — pode ser negativa. */
  margem_acao: number | null;
  /** % de ICMS efetivo de saída (0 quando ST). */
  aliq_icms: number | null;
  /** % efetivo de PIS/COFINS medido nas vendas dos últimos 35 dias. */
  aliq_piscofins: number | null;
  /** custo ÷ (1 − ICMS% − PIS/COFINS%). */
  preco_margem_zero: number | null;
}

export interface TermometroLote {
  data: string;
  codprod: number;
  fornecedor: string | null;
  descricao: string;
  categoria: string | null;
  temperatura: Temperatura;
  numlote: string | null;
  qt: number | null;
  dtvalidade: string | null;
  limite: string | null;
  dtultmovent: string | null;
  dias_val: number | null;
  qt_sobra: number | null;
  vl_sobra: number | null;
}

export interface CompradorProduto {
  codprod: number;
  codusur: number | null;
  vendedor: string | null;
  codcli: number | null;
  cliente: string | null;
  cidade: string | null;
  vezes: number | null;
  qt: number | null;
  ultima_compra: string | null;
}

export interface TermometroSemana {
  semana_ini: string;
  codfornec: number | null;
  fornecedor: string | null;
  skus: number | null;
  qt: number | null;
  vl_custo: number | null;
}

export interface TermometroHistorico {
  data: string;
  codfornec: number | null;
  fornecedor: string | null;
  skus: number | null;
  vl_estoque: number | null;
  vl_vence: number | null;
  vl_critico?: number | null;
  vl_fervendo: number | null;
  vl_quente: number | null;
  skus_fervendo: number | null;
  skus_quente: number | null;
  skus_divergentes: number | null;
}

export interface LoteVivo {
  codprod: number;
  descricao: string;
  codfornec: number | null;
  fornecedor: string | null;
  codcategoria: number | null;
  categoria: string | null;
  numlote: string | null;
  qt: number | null;
  dtvalidade: string | null;
  dias_val: number | null;
  dtultmovent: string | null;
  qt_7d: number | null;
  sync_at: string | null;
}

/** Snapshot mais recente: 1 linha por SKU. */
export const useTermometro = () =>
  useQuery({
    queryKey: ["v_termometro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_termometro")
        .select("*")
        .order("vl_vence", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TermometroSku[];
    },
  });

/** Lotes do snapshot de um SKU. */
export const useTermometroLotes = (codprod: number | null) =>
  useQuery({
    queryKey: ["v_termometro_lotes", codprod],
    enabled: codprod != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_termometro_lotes")
        .select("*")
        .eq("codprod", codprod)
        .order("dtvalidade", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TermometroLote[];
    },
  });

/** Lista de ataque: quem mais comprou o produto nos últimos 60 dias. */
export const useCompradoresProduto = (codprod: number | null) =>
  useQuery({
    queryKey: ["v_termometro_compradores", codprod],
    enabled: codprod != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_termometro_compradores")
        .select("*")
        .eq("codprod", codprod)
        .order("vezes", { ascending: false })
        .order("qt", { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as CompradorProduto[];
    },
  });

export const useTermometroSemanas = () =>
  useQuery({
    queryKey: ["v_termometro_semanas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_termometro_semanas")
        .select("*")
        .order("semana_ini", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TermometroSemana[];
    },
  });

export const useTermometroHistorico = () =>
  useQuery({
    queryKey: ["v_termometro_historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_termometro_historico")
        .select("*")
        .order("data", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TermometroHistorico[];
    },
  });

/** Lotes ao vivo (sync a cada 15 min) de um fornecedor. */
export const useLotesVivos = (codfornec: number) =>
  useQuery({
    queryKey: ["v_lotes", codfornec],
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_lotes")
        .select("*")
        .eq("codfornec", codfornec)
        .order("dias_val", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LoteVivo[];
    },
  });
