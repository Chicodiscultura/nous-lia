import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/** Uma linha por fornecedor: a recomendação do agente Analista de Compras para a próxima janela. */
export interface CompradorAlerta {
  data: string;
  codfornec: number;
  proxima_janela: string | null;
  proxima_entrega: string | null;
  skus_risco: number | null;
  perda_projetada: number | null;
  cortes_marcados: number | null;
  kg_sugerido: number | null;
  minimo_kg: number | null;
  viavel: boolean | null;
  recomendacao: string | null;
}

/** Uma linha por SKU: necessidade, sugestão em caixas master e validade na chegada. */
export interface CompradorSku {
  data: string;
  codfornec: number;
  codprod: number;
  descricao: string | null;
  disponivel: number | null;
  reservado: number | null;
  descoberto: number | null;
  pendente: number | null;
  velocidade: number | null;
  dias_ruptura: number | null;
  data_ruptura: string | null;
  necessidade: number | null;
  cap_validade: number | null;
  sugestao_cx: number | null;
  sugestao_un: number | null;
  kg_bruto: number | null;
  vl_compra: number | null;
  p25_chegada: number | null;
  janela_vendavel: number | null;
}

/** Uma linha por (pedido, SKU) ainda em trânsito: já pedido ao fabricante e não recebido. */
export interface CompradorPedido {
  pedido: string;
  data_pedido: string;
  janela: string | null;
  data_prevista: string;
  codfornec: number;
  codprod: number;
  descricao: string | null;
  caixas: number;
  un: number;
  kg_bruto: number | null;
  vl_compra: number | null;
  caixas_cortadas: number;
  un_cortada: number;
  caixas_liquidas: number;
  un_liquida: number;
  kg_liquido: number | null;
  vl_liquido: number | null;
  status: string;
  fonte: string | null;
  atualizado_em: string;
}

export const useCompradorPedidos = () =>
  useQuery({
    queryKey: ["v_comprador_pedido"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_comprador_pedido").select("*");
      if (error) throw error;
      return (data ?? []) as CompradorPedido[];
    },
  });

export const useCompradorAlertas = () =>
  useQuery({
    queryKey: ["v_comprador_alerta"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_comprador_alerta").select("*");
      if (error) throw error;
      return (data ?? []) as CompradorAlerta[];
    },
  });

export const useCompradorSkus = () =>
  useQuery({
    queryKey: ["v_comprador_skus"],
    queryFn: async () => {
      const passo = 1000;
      const out: CompradorSku[] = [];
      for (let de = 0; ; de += passo) {
        const { data, error } = await supabase
          .from("v_comprador_skus")
          .select("*")
          .range(de, de + passo - 1);
        if (error) throw error;
        out.push(...((data ?? []) as CompradorSku[]));
        if (!data || data.length < passo) break;
      }
      return out;
    },
  });
