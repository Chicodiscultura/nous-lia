import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { AvisoSync } from "@/components/portal/AvisoSync";
import { Sidebar } from "@/components/portal/Sidebar";
import { codigoDaRota, useMinhasAbas } from "@/lib/abas";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/_portal")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { usuario: data.user };
  },
  component: PortalLayout,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm" role="alert">
      Não foi possível carregar esta página: {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-8 text-sm">Página não encontrada.</div>,
});

function AcessoNaoLiberado() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center">
      <Lock className="mx-auto size-6" style={{ color: "var(--brand-red)" }} />
      <h1 className="mt-3 text-lg font-extrabold" style={{ fontFamily: "var(--font-heading)" }}>
        Acesso não liberado
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Esta área não está habilitada para o seu usuário. Fale com a diretoria se
        precisar de acesso.
      </p>
      <Link
        to="/"
        className="mt-4 inline-flex min-h-[44px] items-center rounded-md px-4 text-sm font-bold"
        style={{ backgroundColor: "var(--brand-red)", color: "#fff" }}
      >
        Voltar para a Home
      </Link>
    </div>
  );
}

function PortalLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: abas } = useMinhasAbas();
  const codigo = codigoDaRota(pathname);
  const bloqueado = !!abas && !!codigo && !abas.includes(codigo);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Sidebar />
      <main className="px-4 pb-10 pt-[72px] md:ml-[68px] md:px-6 md:py-6 xl:ml-[220px] xl:px-8">
        <AvisoSync />
        {bloqueado ? <AcessoNaoLiberado /> : <Outlet />}
      </main>
    </div>
  );
}

