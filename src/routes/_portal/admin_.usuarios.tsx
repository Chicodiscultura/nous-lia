import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Copy, KeyRound, Pencil, Plus, Power } from "lucide-react";

import { Cartao, Carregando, Vazio } from "@/components/portal/Cartao";
import { Tabela } from "@/components/portal/Tabela";
import { Topbar } from "@/components/portal/Topbar";
import { usePerfil, useSessao, type Perfil } from "@/hooks/useSessao";
import {
  EQUIPES,
  PERFIS,
  tokenAtual,
  useUsuariosPortal,
  useVendedoresConfig,
  type UsuarioPortal,
} from "@/lib/usuarios";
import { gerenciarUsuarios } from "@/lib/usuarios.functions";
import { useAbasPortal } from "@/lib/abas";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_portal/admin_/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestão de usuários — DX Vendas Delifrios" },
      {
        name: "description",
        content:
          "Cadastro, edição, reset de senha e desativação dos usuários do portal DX Vendas da Delifrios.",
      },
      { property: "og:title", content: "Gestão de usuários — DX Vendas Delifrios" },
      {
        property: "og:description",
        content: "Controle de acesso dos usuários do portal DX Vendas.",
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
  equipe: string;
  codusur: string;
  usarPadrao: boolean;
  abas: string[];
}

const vazio: Formulario = {
  nome: "",
  email: "",
  perfil: "",
  equipe: "",
  codusur: "",
  usarPadrao: true,
  abas: [],
};


const rotuloPerfil = (p: string) =>
  PERFIS.find((x) => x.valor === p)?.rotulo ?? p;

function UsuariosPage() {
  const { session } = useSessao();
  const { data: usuario, isLoading: carregandoPerfil } = usePerfil(
    session?.user.email ?? undefined,
  );
  const permitido = usuario?.perfil === "admin" || usuario?.perfil === "diretoria";

  const usuarios = useUsuariosPortal();
  const vendedores = useVendedoresConfig();
  const abasPortal = useAbasPortal();

  const [form, setForm] = useState<Formulario | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<{
    email: string;
    senha: string;
  } | null>(null);

  if (carregandoPerfil) return <Carregando />;

  if (!permitido) {
    return (
      <>
        <Topbar
          titulo="Gestão de usuários"
          descricao="Disponível apenas para os perfis admin e diretoria."
        />
        <Cartao>
          <Vazio texto="Você não tem permissão para acessar esta área." />
        </Cartao>
      </>
    );
  }

  const editando = !!form?.id;

  function abrirNovo() {
    setForm({ ...vazio });
  }

  function abrirEdicao(u: UsuarioPortal) {
    setForm({
      id: u.id,
      nome: u.nome ?? "",
      email: u.email,
      perfil: u.perfil,
      equipe: u.equipe ?? "",
      codusur: u.codusur != null ? String(u.codusur) : "",
      usarPadrao: u.abas == null,
      abas: u.abas ?? [],
    });
  }

  async function salvar() {
    if (!form) return;
    if (!form.nome.trim()) {
      toast.error("Informe o nome.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    if (!form.perfil) {
      toast.error("Selecione o perfil.");
      return;
    }
    if (form.perfil === "rca" && (!form.equipe || !form.codusur)) {
      toast.error("Para RCA, equipe e vendedor são obrigatórios.");
      return;
    }

    setSalvando(true);
    try {
      const token = await tokenAtual();
      const r = await gerenciarUsuarios({
        data: {
          token,
          acao: editando ? "atualizar" : "criar",
          ...(form.id ? { id: form.id } : {}),
          nome: form.nome.trim(),
          email: form.email.trim(),
          perfil: form.perfil,
          equipe: form.equipe || null,
          codusur: form.codusur || null,
          abas: form.usarPadrao
            ? null
            : Array.from(new Set(["home", ...form.abas])),
        },
      });

      if (!r.ok) {
        toast.error(r.erro ?? "Não foi possível salvar.");
        return;
      }
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

  async function resetarSenha(u: UsuarioPortal) {
    if (!confirm(`Gerar nova senha provisória para ${u.nome ?? u.email}?`)) return;
    try {
      const token = await tokenAtual();
      const r = await gerenciarUsuarios({
        data: { token, acao: "resetar_senha", id: u.id },
      });
      if (!r.ok || !r.senha) {
        toast.error(r.erro ?? "Não foi possível resetar a senha.");
        return;
      }
      setSenhaGerada({ email: u.email, senha: r.senha });
      toast.success("Nova senha provisória gerada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro inesperado.");
    }
  }

  async function alternarAtivo(u: UsuarioPortal) {
    const reativar = u.ativo === false;
    const texto = reativar
      ? `Reativar o acesso de ${u.nome ?? u.email}?`
      : `Desativar o acesso de ${u.nome ?? u.email}? As sessões atuais serão encerradas.`;
    if (!confirm(texto)) return;
    try {
      const token = await tokenAtual();
      const r = await gerenciarUsuarios({
        data: { token, acao: "desativar", id: u.id, reativar },
      });
      if (!r.ok) {
        toast.error(r.erro ?? "Não foi possível concluir.");
        return;
      }
      toast.success(reativar ? "Usuário reativado." : "Usuário desativado.");
      await usuarios.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro inesperado.");
    }
  }

  const linhas = usuarios.data ?? [];

  const listaAbas = abasPortal.data ?? [];
  const totalAbas = listaAbas.length || 9;

  return (
    <>
      <Topbar
        titulo="Gestão de usuários"
        descricao="Cadastro e permissões de acesso ao portal."
      />

      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <Link
          to="/admin"
          className="flex min-h-[44px] min-w-0 items-center gap-2 text-sm font-medium text-muted-foreground"
        >
          <ArrowLeft className="size-4 shrink-0" /> Voltar para Admin
        </Link>
        <button
          onClick={abrirNovo}
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-md px-4 text-sm font-bold"
          style={{ backgroundColor: "var(--brand-red)", color: "#fff" }}
        >
          <Plus className="size-4" /> Novo usuário
        </button>
      </div>

      {senhaGerada ? (
        <BlocoSenha
          {...senhaGerada}
          onFechar={() => setSenhaGerada(null)}
        />
      ) : null}

      <Cartao titulo="Usuários do portal">
        {usuarios.isLoading ? (
          <Carregando />
        ) : usuarios.error ? (
          <Vazio texto="Não foi possível carregar os usuários." />
        ) : linhas.length ? (
          <Tabela<UsuarioPortal>
            linhas={linhas}
            chave={(u) => u.id}
            colunas={[
              {
                rotulo: "Nome",
                titulo: true,
                celula: (u) => (
                  <span
                    className="flex flex-wrap items-center gap-2"
                    style={{ opacity: u.ativo === false ? 0.5 : 1 }}
                  >
                    <span className="font-medium">{u.nome ?? "—"}</span>
                    {u.ativo === false ? (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Inativo
                      </span>
                    ) : null}
                  </span>
                ),
              },
              { rotulo: "E-mail", celula: (u) => u.email },
              { rotulo: "Perfil", celula: (u) => rotuloPerfil(u.perfil) },
              { rotulo: "Equipe", celula: (u) => u.equipe ?? "—" },
              {
                rotulo: "Cód. vendedor",
                celula: (u) => (u.codusur != null ? String(u.codusur) : "—"),
              },
              {
                rotulo: "Abas",
                celula: (u) =>
                  u.abas == null
                    ? "Padrão do perfil"
                    : `${u.abas.length} de ${totalAbas}`,
              },
              {
                rotulo: "Ativo",
                celula: (u) => (u.ativo === false ? "Não" : "Sim"),
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
                      style={{
                        color:
                          u.ativo === false ? "var(--positive-text)" : "var(--critical)",
                      }}
                    >
                      <Power className="size-3.5" />
                      {u.ativo === false ? "Reativar" : "Desativar"}
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
                  placeholder="pessoa@delifrios.com.br"
                />
              </Campo>

              <Campo rotulo="Perfil">
                <select
                  value={form.perfil}
                  onChange={(e) =>
                    setForm({ ...form, perfil: e.target.value as Perfil })
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione…</option>
                  {PERFIS.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.rotulo}
                    </option>
                  ))}
                </select>
              </Campo>

              {form.perfil === "rca" ? (
                <>
                  <Campo rotulo="Equipe">
                    <select
                      value={form.equipe}
                      onChange={(e) => setForm({ ...form, equipe: e.target.value })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Selecione…</option>
                      {EQUIPES.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </Campo>

                  <Campo rotulo="Vendedor">
                    <select
                      value={form.codusur}
                      onChange={(e) => setForm({ ...form, codusur: e.target.value })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">
                        {vendedores.isLoading ? "Carregando…" : "Selecione…"}
                      </option>
                      {(vendedores.data ?? []).map((v) => (
                        <option key={String(v.codusur)} value={String(v.codusur)}>
                          {v.nome_exibicao ?? `RCA ${v.codusur}`}
                        </option>
                      ))}
                    </select>
                  </Campo>
                </>
              ) : null}

              <div className="rounded-xl border border-border p-3">
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
                        abas: e.target.checked
                          ? form.abas
                          : listaAbas
                              .filter((a) =>
                                (a.perfis_padrao ?? []).includes(String(form.perfil)),
                              )
                              .map((a) => a.codigo),
                      })
                    }
                    className="size-4"
                  />
                  <span className="font-medium">Usar o padrão do perfil</span>
                </label>

                <div className="mt-2 space-y-1">
                  {abasPortal.isLoading ? (
                    <p className="text-xs text-muted-foreground">Carregando abas…</p>
                  ) : (
                    listaAbas.map((a) => {
                      const padrao = (a.perfis_padrao ?? []).includes(
                        String(form.perfil),
                      );
                      const fixa = a.codigo === "home";
                      const marcado = fixa
                        ? true
                        : form.usarPadrao
                          ? padrao
                          : form.abas.includes(a.codigo);
                      return (
                        <label
                          key={a.codigo}
                          className="flex min-h-[36px] items-center gap-2 text-sm"
                          style={{
                            color: form.usarPadrao
                              ? "var(--muted-foreground)"
                              : undefined,
                          }}
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
                            <span className="text-xs text-muted-foreground">
                              página de entrada, sempre liberada
                            </span>
                          ) : null}
                        </label>
                      );
                    })
                  )}
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Esconder uma aba é organização de tela, não segurança: os dados de
                  cada área continuam protegidos por perfil.
                </p>
              </div>

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
                  style={{ backgroundColor: "var(--brand-red)", color: "#fff" }}
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

function Campo({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
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
      className="mb-4 rounded-xl border bg-card p-4"
      style={{ borderTop: "3px solid var(--brand-yellow)" }}
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
          style={{ backgroundColor: "var(--brand-red)", color: "#fff" }}
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
