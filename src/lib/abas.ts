import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";

/** Códigos das abas liberadas para o usuário logado (função minhas_abas, decidida no banco). */
export function useMinhasAbas() {
  return useQuery({
    queryKey: ["minhas_abas"],
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("minhas_abas");
      if (error) throw error;
      return ((data ?? []) as string[]).map(String);
    },
  });
}

/** Mapa rota → código de aba, usado pela sidebar e pela guarda de rota. */
export const CODIGO_POR_ROTA: { rota: string; codigo: string }[] = [
  { rota: "/vendas", codigo: "vendas" },
  { rota: "/estoque", codigo: "estoque" },
  { rota: "/validade", codigo: "validade" },
  { rota: "/analista", codigo: "analista" },
];

/** Código da aba correspondente ao pathname atual ("/" → home). */
export function codigoDaRota(pathname: string) {
  if (pathname === "/") return "home";
  return CODIGO_POR_ROTA.find((x) => pathname.startsWith(x.rota))?.codigo ?? null;
}
