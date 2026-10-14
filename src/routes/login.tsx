import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Logo } from "@/components/portal/Logo";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — LIA · NOUS" },
      {
        name: "description",
        content: "LIA — Lucro com IA. Portal de inteligência em gestão da NOUS para distribuidores e fabricantes.",
      },
      { property: "og:title", content: "LIA — Lucro com IA" },
      {
        property: "og:description",
        content: "Inteligência aplicada à operação: estoque, validade e compras com IA.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    setEnviando(false);
    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }
    navigate({ to: "/" });
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

        <form onSubmit={entrar} className="card-surface space-y-4 p-6">
          <div>
            <h1 className="text-lg font-extrabold">Acessar a LIA</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Inteligência aplicada à operação
            </p>
          </div>

          <label className="block text-sm font-medium">
            E-mail
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ borderColor: "var(--border)" }}
              placeholder="voce@empresa.com.br"
            />
          </label>

          <label className="block text-sm font-medium">
            Senha
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              style={{ borderColor: "var(--border)" }}
              placeholder="••••••••"
            />
          </label>

          {erro ? (
            <p className="text-sm font-medium" style={{ color: "var(--critical)" }}>
              {erro}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: "var(--brand-red)" }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--brand-red-hover)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--brand-red)")
            }
          >
            {enviando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
