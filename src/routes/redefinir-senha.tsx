import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Logo } from "@/components/portal/Logo";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  head: () => ({ meta: [{ title: "Redefinir senha — LIA · NOUS" }] }),
  component: RedefinirSenha,
});

const MINIMO = 12;

function RedefinirSenha() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState(false);

  // O link do e-mail traz um token na URL; o supabase-js o troca por uma sessão de recuperação.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setPronto(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setPronto(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < MINIMO) {
      setErro(`Use pelo menos ${MINIMO} caracteres.`);
      return;
    }
    if (senha !== confirma) {
      setErro("As senhas não são iguais.");
      return;
    }
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setEnviando(false);
    if (error) {
      setErro("Não foi possível salvar a senha. Peça um novo link de recuperação.");
      return;
    }
    setFeito(true);
    setTimeout(() => navigate({ to: "/" }), 1500);
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center p-4">
          <Logo />
        </div>
        <form onSubmit={salvar} className="card-surface space-y-4 p-6">
          <div>
            <h1 className="text-lg font-extrabold">Definir nova senha</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {pronto
                ? `Mínimo de ${MINIMO} caracteres.`
                : "Abra esta página pelo link recebido por e-mail."}
            </p>
          </div>

          <label className="block text-sm font-medium">
            Nova senha
            <input
              type="password"
              required
              autoComplete="new-password"
              disabled={!pronto || feito}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Repita a senha
            <input
              type="password"
              required
              autoComplete="new-password"
              disabled={!pronto || feito}
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
            />
          </label>

          {erro ? (
            <p className="text-sm font-medium" style={{ color: "var(--critical)" }}>
              {erro}
            </p>
          ) : null}
          {feito ? (
            <p className="text-sm font-medium" style={{ color: "var(--positive-text)" }}>
              Senha atualizada. Entrando…
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!pronto || enviando || feito}
            className="w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "var(--brand-red)" }}
          >
            {enviando ? "Salvando…" : "Salvar senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
