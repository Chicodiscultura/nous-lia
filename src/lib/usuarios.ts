import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import type { Perfil } from "@/hooks/useSessao";

export const PERFIS: { valor: Perfil; rotulo: string }[] = [
  { valor: "diretoria", rotulo: "Diretoria" },
  { valor: "supervisor", rotulo: "Supervisor" },
  { valor: "financeiro", rotulo: "Financeiro" },
  { valor: "admin", rotulo: "Admin" },
  { valor: "rca", rotulo: "RCA" },
];

export const EQUIPES = ["Atacado", "Distribuição"];

export interface UsuarioPortal {
  id: string;
  nome: string | null;
  email: string;
  perfil: Perfil;
  equipe: string | null;
  codusur: number | string | null;
  ativo: boolean | null;
  abas: string[] | null;
}

export interface VendedorConfig {
  codusur: number | string;
  nome_exibicao: string | null;
  interno: boolean | null;
  equipe: string | null;
}

export function useUsuariosPortal() {
  return useQuery({
    queryKey: ["usuarios_portal", "lista"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios_portal")
        .select("id, nome, email, perfil, equipe, codusur, ativo, abas")
        .order("nome");
      if (error) throw error;
      return (data ?? []) as UsuarioPortal[];
    },
  });
}


export function useVendedoresConfig() {
  return useQuery({
    queryKey: ["vendedor_config", "nao-internos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendedor_config")
        .select("codusur, nome_exibicao, interno, equipe")
        .order("nome_exibicao");
      if (error) throw error;
      return ((data ?? []) as VendedorConfig[]).filter((v) => !v.interno);
    },
  });
}

export async function tokenAtual() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}
