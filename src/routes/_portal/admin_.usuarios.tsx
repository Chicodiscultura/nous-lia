import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, KeyRound, Pencil, Plus, Power } from "lucide-react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { Tabela } from "@/components/portal/Tabela";
import { Topbar } from "@/components/portal/Topbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMinhasAbas } from "@/lib/abas";
import { dataHora } from "@/lib/format";
import {
  PERFIS,
  abasDoPerfil,
  gerenciarUsuarios,
  rotuloPerfil,
  useUsuariosAdmin,
  type UsuarioAdmin,
} from "@/lib/usuarios";
import type { Perfil } from "@/hooks/useSessao";

export const Route = createFileRoute("/_portal/admin_/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestão de usuários — LIA · NOUS" },
      {
        name: "description",
        content: "Cadastro, edição, reset de senha e desativação dos usuários da LIA.",
      },
    ],
  }),
  component: UsuariosPage,
});

interface Formulario {
  id?: string;
  nome: string;
  email: string;
  perfil: Perfil | "";
  usarPadrao: boolean;
  abas: string[];
}

const vazio: Formulario = { nome: "", email: "", perfil: "", usarPadrao: true, abas: [] };

function UsuariosPage() {
  const { data: abasLiberadas, isLoading: carregandoAbas } = useMinhasAbas();
  const permitido = !!abasLiberadas?.includes("admin");
  const usuarios = useUsuariosAdmin();

  const [form, setForm] = useState<Formulario | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<{ email: string; senha: string } | null>(null);

  if (carregandoAbas) return <Carregando />;

  if (!permitido) {
    return (
      <>
        <Topbar titulo="Gestão de usuários" descricao="Disponível apenas para a diretoria." />
        <Cartao>
          <Vazio texto="Você não tem permissão para acessar esta área." />
        </Cartao>
      </>
    );
  }

  const editando = !!form?.id;
  const abasDoForm = form?.perfil ? abasDoPerfil(form.perfil) : [];

  function abrirEdicao(u: UsuarioAdmin) {
    setForm({
      id: u.user_id,
      nome: u.nome ?? "",
      email: u.email,
      perfil: u.perfil,
      usarPadrao: u.abas == null,
      abas: u.abas ?? [],
    });
  }

  async function salvar() {
    if (!form) return;
    if (!form.nome.trim()) return void toast.error("Informe o nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      return void toast.error("Informe um e-mail válido.");
    if (!form.perfil) return void toast.error("Selecione o perfil.");

    setSalvando(true);
    try {
      const r = await gerenciarUsuarios({
        acao: editando ? "atualizar" : "criar",
        ...(form.id ? { id: form.id } : {}),
        nome: form.nome.trim(),
        email: form.email.trim(),
        perfil: form.perfil,
        abas: form.usarPadrao ? null : Array.from(new Set(["home", ...form.abas])),
      });
      if (!r.ok) return void toast.error(r.erro ?? "Não foi possível salvar.");
      toast.success(editando ? "Usuário atualizado." : "Usuário criado.");
      if (r.senha) setSenhaGerada({ email: form.email.trim(), senha: r.senha });
      setForm(null);
      await usuarios.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setSalvando(false);
    }
  }

  async function resetarSenha(u: UsuarioAdmin) {
    if (!confirm(`Gerar nova senha provisória para ${u.nome ?? u.email}?`)) return;
    const r = await gerenciarUsuarios({ acao: "resetar_senha", id: u.user_id });
    if (!r.ok || !r.senha) return void toast.error(r.erro ?? "Não foi possível resetar a senha.");
    setSenhaGerada({ email: u.email, senha: r.senha });
    toast.success("Nova senha provisória gerada.");
  }

  async function alternarAtivo(u: UsuarioAdmin) {
    const reativar = !u.ativo;
    const texto = reativar
      ? `Reativar o acesso de ${u.nome ?? u.email}?`
      : `Desativar o acesso de ${u.nome ?? u.email}? O acesso aos dados é cortado na hora.`;
    if (!confirm(texto)) return;
    const r = await gerenciarUsuarios({ acao: "desativar", id: u.user_id, reativar });
    if (!r.ok) return void toast.error(r.erro ?? "Não foi possível concluir.");
    toast.success(reativar ? "Usuário reativado." : "Usuário desativado.");
    await usuarios.refetch();
  }

  const linhas = usuarios.data ?? [];

  return (
    <>
      <Topbar titulo="Gestão de usuários" descricao="Cadastro e permissões de acesso à LIA." />

      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Link
          to="/admin"
          className="flex min-h-[44px] min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground"
        >
          <ArrowLeft className="size-4 shrink-0" /> Voltar para Admin
        </Link>
        <button
          onClick={() => setForm({ ...vazio })}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-md px-4 text-sm font-bold"
          style={{ backgroundColor: "var(--ink)", color: "var(--on-ink)" }}
        >
          <Plus className="size-4" /> Novo usuário
        </button>
      </div>

      {senhaGerada ? (
        <BlocoSenha {...senhaGerada} onFechar={() => setSenhaGerada(null)} />
      ) : null}

      <Cartao titulo="Usuários da LIA">
        {usuarios.isLoading ? (
          <Carregando />
        ) : usuarios.error ? (
          <Vazio texto="Não foi possível carregar os usuários." />
        ) : linhas.length ? (
          <Tabela<UsuarioAdmin>
            linhas={linhas}
            chave={(u) => u.user_id}
            colunas={[
              {
                rotulo: "Nome",
                titulo: true,
                celula: (u) => (
                  <span
                    className="flex flex-wrap items-center gap-2"
                    style={{ opacity: u.ativo ? 1 : 0.5 }}
                  >
                    <span className="font-medium">{u.nome ?? "—"}</span>
                    {!u.ativo ? (
                      <span className="rounded-sm bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Inativo
                      </span>
                    ) : null}
                  </span>
                ),
              },
              { rotulo: "E-mail", celula: (u) => u.email },
              { rotulo: "Perfil", celula: (u) => rotuloPerfil(u.perfil) },
              {
                rotulo: "Abas",
                celula: (u) =>
                  u.abas == null
                    ? "Padrão do perfil"
                    : `${u.abas.length} de ${abasDoPerfil(u.perfil).length}`,
              },
              {
                rotulo: "Último acesso",
                celula: (u) => (u.ultimo_acesso ? dataHora(u.ultimo_acesso) : "Nunca entrou"),
              },
              {
                rotulo: "Ações",
                celula: (u) => (
                  <span className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => abrirEdicao(u)}
                      className="flex min-h-[44px] items-center gap-1 rounded-md border px-3 text-xs font-semibold"
                    >
                      <Pencil className="size-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => resetarSenha(u)}
                      className="flex min-h-[44px] items-center gap-1 rounded-md border px-3 text-xs font-semibold"
                    >
                      <KeyRound className="size-3.5" /> Resetar senha
                    </button>
                    <button
                      onClick={() => alternarAtivo(u)}
                      className="flex min-h-[44px] items-center gap-1 rounded-md border px-3 text-xs font-semibold"
                      style={{ color: u.ativo ? "var(--critical)" : "var(--verified)" }}
                    >
                      <Power className="size-3.5" />
                      {u.ativo ? "Desativar" : "Reativar"}
                    </button>
                  </span>
                ),
              },
            ]}
          />
        ) : (
          <Vazio texto="Nenhum usuário cadastrado." />
        )}
      </Cartao>

      <Dialog open={!!form} onOpenChange={(o) => (o ? null : setForm(null))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar usuário" : "Novo usuário"}</DialogTitle>
            <DialogDescription>
              {editando
                ? "Atualize os dados de acesso deste usuário."
                : "Uma senha provisória será gerada e exibida uma única vez."}
            </DialogDescription>
          </DialogHeader>

          {form ? (
            <div className="space-y-3">
              <Campo rotulo="Nome">
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Nome completo"
                />
              </Campo>

              <Campo rotulo="E-mail">
                <input
                  type="email"
                  value={form.email}
                  disabled={editando}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                  placeholder="pessoa@empresa.com.br"
                />
              </Campo>

              <Campo rotulo="Perfil">
                <select
                  value={form.perfil}
                  onChange={(e) =>
                    setForm({ ...form, perfil: e.target.value as Perfil, abas: [], usarPadrao: true })
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione…</option>
                  {PERFIS.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.rotulo} — {p.descricao}
                    </option>
                  ))}
                </select>
              </Campo>

              {form.perfil ? (
                <div className="rounded-md border border-border p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Abas liberadas
                  </p>

                  <label className="mt-2 flex min-h-[44px] items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.usarPadrao}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          usarPadrao: e.target.checked,
                          abas: e.target.checked ? form.abas : abasDoForm.map((a) => a.codigo),
                        })
                      }
                      className="size-4"
                    />
                    <span className="font-medium">Usar o padrão do perfil</span>
                  </label>

                  <div className="mt-2 space-y-1">
                    {abasDoForm.map((a) => {
                      const fixa = a.codigo === "home" || (a.codigo === "admin" && form.perfil === "diretoria");
                      const marcado = fixa ? true : form.usarPadrao ? true : form.abas.includes(a.codigo);
                      return (
                        <label
                          key={a.codigo}
                          className="flex min-h-[36px] items-center gap-2 text-sm"
                          style={{ color: form.usarPadrao ? "var(--muted-foreground)" : undefined }}
                        >
                          <input
                            type="checkbox"
                            checked={marcado}
                            disabled={fixa || form.usarPadrao}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                abas: e.target.checked
                                  ? [...form.abas, a.codigo]
                                  : form.abas.filter((c) => c !== a.codigo),
                              })
                            }
                            className="size-4"
                          />
                          {a.rotulo}
                          {fixa ? (
                            <span className="text-xs text-muted-foreground">sempre liberada</span>
                          ) : null}
                        </label>
                      );
                    })}
                  </div>

                  <p className="mt-2 text-xs text-muted-foreground">
                    Esconder uma aba é organização de tela, não segurança: os dados de cada área
                    continuam protegidos pelo perfil.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  onClick={() => setForm(null)}
                  className="min-h-[44px] rounded-md border px-4 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvar}
                  disabled={salvando}
                  className="min-h-[44px] rounded-md px-4 text-sm font-bold disabled:opacity-60"
                  style={{ backgroundColor: "var(--ink)", color: "var(--on-ink)" }}
                >
                  {salvando ? "Salvando…" : editando ? "Salvar" : "Criar usuário"}
                </button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {rotulo}
      </span>
      {children}
    </label>
  );
}

function BlocoSenha({
  email,
  senha,
  onFechar,
}: {
  email: string;
  senha: string;
  onFechar: () => void;
}) {
  return (
    <div
      className="mb-4 rounded-md border bg-card p-4"
      style={{ borderTop: "3px solid var(--attention)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Senha provisória · {email}
      </p>
      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <code className="min-w-0 truncate rounded-md bg-secondary px-3 py-2 text-base font-bold tabular">
          {senha}
        </code>
        <button
          onClick={() => {
            navigator.clipboard.writeText(senha);
            toast.success("Senha copiada.");
          }}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-md px-3 text-sm font-bold"
          style={{ backgroundColor: "var(--ink)", color: "var(--on-ink)" }}
        >
          <Copy className="size-4" /> Copiar
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Anote e entregue à pessoa. Esta senha não será exibida novamente.
      </p>
      <button
        onClick={onFechar}
        className="mt-2 min-h-[44px] text-xs font-semibold text-muted-foreground underline"
      >
        Fechar
      </button>
    </div>
  );
}
