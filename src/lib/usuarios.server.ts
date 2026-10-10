import { createClient } from "@supabase/supabase-js";

import type { EntradaGerenciarUsuarios } from "./usuarios.functions";

const SUPABASE_URL = "https://rljsgatssqmqktojeksq.supabase.co";
const PERFIS = ["diretoria", "supervisor", "financeiro", "admin", "rca"];

export interface RespostaGerenciarUsuarios {
  ok: boolean;
  erro?: string;
  senha?: string;
  id?: string;
}

function senhaProvisoria(tamanho = 14) {
  const alfabeto =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

function validarPerfil(
  perfil: string,
  equipe?: string | null,
  codusur?: number | string | null,
) {
  if (!PERFIS.includes(perfil)) return "Perfil inválido.";
  if (
    perfil === "rca" &&
    (!equipe || codusur === null || codusur === undefined || codusur === "")
  )
    return "Para o perfil RCA, equipe e código do vendedor são obrigatórios.";
  return null;
}

function clienteAdmin() {
  const chave = process.env["DELIFRIOS_SERVICE_ROLE_KEY"];
  if (!chave) throw new Error("Chave de serviço não configurada no projeto.");
  return createClient(SUPABASE_URL, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function executarGerenciarUsuarios(
  entrada: EntradaGerenciarUsuarios,
): Promise<RespostaGerenciarUsuarios> {
  if (!entrada.token) return { ok: false, erro: "Não autenticado." };

  const admin = clienteAdmin();

  // 1) Identifica quem chamou a partir do token da sessão.
  const { data: auth, error: erroAuth } = await admin.auth.getUser(entrada.token);
  if (erroAuth || !auth?.user) return { ok: false, erro: "Não autenticado." };

  // 2) Só admin ou diretoria (perfil no banco) podem seguir.
  const { data: chamador } = await admin
    .from("usuarios_portal")
    .select("id, perfil, ativo")
    .eq("email", auth.user.email)
    .maybeSingle();

  if (
    !chamador ||
    chamador.ativo === false ||
    !["admin", "diretoria"].includes(String(chamador.perfil))
  ) {
    return { ok: false, erro: "Acesso negado. Requer perfil admin ou diretoria." };
  }

  const { acao } = entrada;

  if (acao === "criar") {
    const nome = String(entrada.nome ?? "").trim();
    const email = String(entrada.email ?? "").trim().toLowerCase();
    const perfil = String(entrada.perfil ?? "");
    if (!nome) return { ok: false, erro: "Nome obrigatório." };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return { ok: false, erro: "E-mail inválido." };
    const invalido = validarPerfil(perfil, entrada.equipe, entrada.codusur);
    if (invalido) return { ok: false, erro: invalido };

    const senha = senhaProvisoria();
    const { data: criado, error: erroCriar } = await admin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    });
    if (erroCriar || !criado?.user)
      return { ok: false, erro: erroCriar?.message ?? "Falha ao criar usuário." };

    const { error: erroInsert } = await admin.from("usuarios_portal").insert({
      id: criado.user.id,
      nome,
      email,
      perfil,
      equipe: perfil === "rca" ? entrada.equipe : null,
      codusur: perfil === "rca" ? entrada.codusur : null,
      abas: entrada.abas ?? null,
      ativo: true,
    });

    if (erroInsert) {
      await admin.auth.admin.deleteUser(criado.user.id);
      return { ok: false, erro: erroInsert.message };
    }
    return { ok: true, id: criado.user.id, senha };
  }

  if (acao === "atualizar") {
    if (!entrada.id) return { ok: false, erro: "ID obrigatório." };
    const patch: Record<string, unknown> = {};
    if (entrada.nome !== undefined) patch["nome"] = String(entrada.nome).trim();
    if (entrada.ativo !== undefined) patch["ativo"] = !!entrada.ativo;
    if (entrada.abas !== undefined) patch["abas"] = entrada.abas ?? null;

    if (entrada.perfil !== undefined) {
      const invalido = validarPerfil(
        String(entrada.perfil),
        entrada.equipe,
        entrada.codusur,
      );
      if (invalido) return { ok: false, erro: invalido };
      patch["perfil"] = entrada.perfil;
      patch["equipe"] = entrada.perfil === "rca" ? (entrada.equipe ?? null) : null;
      patch["codusur"] = entrada.perfil === "rca" ? (entrada.codusur ?? null) : null;
    }
    const { error } = await admin
      .from("usuarios_portal")
      .update(patch)
      .eq("id", entrada.id);
    if (error) return { ok: false, erro: error.message };
    return { ok: true };
  }

  if (acao === "resetar_senha") {
    if (!entrada.id) return { ok: false, erro: "ID obrigatório." };
    const senha = senhaProvisoria();
    const { error } = await admin.auth.admin.updateUserById(entrada.id, {
      password: senha,
    });
    if (error) return { ok: false, erro: error.message };
    return { ok: true, senha };
  }

  if (acao === "desativar") {
    if (!entrada.id) return { ok: false, erro: "ID obrigatório." };
    const reativar = !!entrada.reativar;
    const { error } = await admin
      .from("usuarios_portal")
      .update({ ativo: reativar })
      .eq("id", entrada.id);
    if (error) return { ok: false, erro: error.message };

    // Ban/soft delete no Auth — o registro nunca é apagado.
    const { error: erroBan } = await admin.auth.admin.updateUserById(entrada.id, {
      ban_duration: reativar ? "none" : "876000h",
    });
    if (erroBan) return { ok: false, erro: erroBan.message };
    if (!reativar) {
      try {
        await admin.auth.admin.signOut(entrada.id);
      } catch {
        /* sessão já expirada */
      }
    }
    return { ok: true };
  }

  return { ok: false, erro: "Ação desconhecida." };
}
