import { createServerFn } from "@tanstack/react-start";

export interface EntradaGerenciarUsuarios {
  token: string;
  acao: "criar" | "atualizar" | "resetar_senha" | "desativar";
  nome?: string;
  email?: string;
  perfil?: string;
  equipe?: string | null;
  codusur?: number | string | null;
  id?: string;
  ativo?: boolean;
  reativar?: boolean;
  abas?: string[] | null;

}

export const gerenciarUsuarios = createServerFn({ method: "POST" })
  .inputValidator((data: EntradaGerenciarUsuarios) => data)
  .handler(async ({ data }) => {
    const { executarGerenciarUsuarios } = await import("./usuarios.server");
    return executarGerenciarUsuarios(data);
  });
