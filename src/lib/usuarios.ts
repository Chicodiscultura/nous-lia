import { useQuery } from "@tanstack/react-query";

import type { Perfil } from "@/hooks/useSessao";
import { supabase } from "@/lib/supabase";

export const PERFIS: { valor: Perfil; rotulo: string; descricao: string }[] = [
  {
    valor: "diretoria",
    rotulo: "Diretoria",
    descricao: "Toda a operação e a gestão de usuários",
  },
  {
    valor: "gestor",
    rotulo: "Gestor",
    descricao: "Toda a operação, sem gestão de usuários",
  },
  {
    valor: "danone_externo",
    rotulo: "Danone (externo)",
    descricao: "Só a aba Danone, sem custo nem margem",
  },
];

/** Abas do portal e quais perfis as têm por padrão. Espelha public.minhas_abas() no banco. */
export const ABAS: { codigo: string; rotulo: string; perfis: Perfil[] }[] = [
  { codigo: "home", rotulo: "Início", perfis: ["diretoria", "gestor"] },
  { codigo: "vendas", rotulo: "Vendas", perfis: ["diretoria", "gestor"] },
  { codigo: "estoque", rotulo: "Estoque", perfis: ["diretoria", "gestor"] },
  { codigo: "validade", rotulo: "Validade", perfis: ["diretoria", "gestor"] },
  { codigo: "analista", rotulo: "Analista", perfis: ["diretoria", "gestor"] },
  { codigo: "danone", rotulo: "Danone", perfis: ["diretoria", "gestor", "danone_externo"] },
  { codigo: "admin", rotulo: "Admin", perfis: ["diretoria"] },
];

export const rotuloPerfil = (p: string) => PERFIS.find((x) => x.valor === p)?.rotulo ?? p;

export const abasDoPerfil = (perfil: string) => ABAS.filter((a) => a.perfis.includes(perfil as Perfil));

export interface UsuarioAdmin {
  user_id: string;
  nome: string | null;
  email: string;
  perfil: Perfil;
  ativo: boolean;
  abas: string[] | null;
  criado_em: string;
  ultimo_acesso: string | null;
}

export function useUsuariosAdmin() {
  return useQuery({
    queryKey: ["admin_listar_usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_listar_usuarios");
      if (error) throw error;
      return (data ?? []) as UsuarioAdmin[];
    },
  });
}

export interface EntradaUsuarios {
  acao: "criar" | "atualizar" | "resetar_senha" | "desativar";
  id?: string;
  nome?: string;
  email?: string;
  perfil?: Perfil;
  /** null = padrão do perfil; omitido = não altera */
  abas?: string[] | null;
  reativar?: boolean;
}

export interface RespostaUsuarios {
  ok: boolean;
  erro?: string;
  senha?: string;
  id?: string;
}

/** Chama a Edge Function gerenciar-usuarios (chave de serviço fica no Supabase). */
export async function gerenciarUsuarios(entrada: EntradaUsuarios): Promise<RespostaUsuarios> {
  const { data, error } = await supabase.functions.invoke("gerenciar-usuarios", {
    body: entrada,
  });
  if (error) {
    const ctx = (error as { context?: unknown }).context;
    if (ctx instanceof Response) {
      const corpo = (await ctx.json().catch(() => null)) as RespostaUsuarios | null;
      if (corpo?.erro) return { ok: false, erro: corpo.erro };
    }
    return { ok: false, erro: error.message };
  }
  return data as RespostaUsuarios;
}
