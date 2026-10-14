import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/** Retorno da margem sobre o estoque (30 dias) + metas configuradas por tenant. */
export interface Gmroi {
  vendas_30d: number | null;
  cmv_30d: number | null;
  margem_30d: number | null;
  margem_pct: number | null;
  estoque_medio_30d: number | null;
  gmroi_30d: number | null;
  gmroi_anualizado: number | null;
  meta_eficiencia_pct: number | null;
  meta_gmroi_anual: number | null;
}

export const useGmroi = () =>
  useQuery({
    queryKey: ["v_gmroi"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_gmroi").select("*").limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as Gmroi | null;
    },
  });
