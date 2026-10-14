import { Link, useRouterState } from "@tanstack/react-router";
import { Bot, Boxes, Home, Thermometer, LogOut, Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Logo } from "./Logo";
import { supabase } from "@/lib/supabase";
import { useMinhasAbas } from "@/lib/abas";

const itens = [
  { to: "/", codigo: "home", rotulo: "Início", icone: Home },
  { to: "/estoque", codigo: "estoque", rotulo: "Estoque", icone: Boxes },
  { to: "/validade", codigo: "validade", rotulo: "Validade", icone: Thermometer },
  { to: "/analista", codigo: "analista", rotulo: "Analista", icone: Bot },
] as const;

type Item = (typeof itens)[number];


function Navegacao({
  pathname,
  onNavegar,
  compacto,
  visiveis,
}: {
  pathname: string;
  onNavegar?: () => void;
  compacto: boolean;
  visiveis: readonly Item[];
}) {
  return (
    <nav className="mt-2 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2">
      {visiveis.map(({ to, rotulo, icone: Icone }) => {
        const ativo = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            title={rotulo}
            onClick={onNavegar}
            className="flex min-h-[44px] items-center gap-3 rounded-md border-l-[3px] px-3 py-2.5 text-sm transition-colors"
            style={{
              borderLeftColor: ativo ? "var(--brand-yellow)" : "transparent",
              backgroundColor: ativo ? "var(--sidebar-accent)" : "transparent",
              color: ativo ? "var(--brand-yellow)" : "var(--sidebar-foreground)",
            }}
          >
            <Icone className="size-4 shrink-0" />
            <span className={compacto ? "hidden xl:inline" : ""}>{rotulo}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Sair({ compacto }: { compacto: boolean }) {
  return (
    <button
      onClick={() => supabase.auth.signOut()}
      className="m-2 flex min-h-[44px] shrink-0 items-center gap-3 rounded-md px-3 py-2.5 text-sm opacity-70 transition-opacity hover:opacity-100"
    >
      <LogOut className="size-4 shrink-0" />
      <span className={compacto ? "hidden xl:inline" : ""}>Sair</span>
    </button>
  );
}

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [aberto, setAberto] = useState(false);
  const { data: abas } = useMinhasAbas();

  const visiveis = useMemo<readonly Item[]>(
    () =>
      abas ? itens.filter((i) => abas.includes(i.codigo)) : itens.filter((i) => i.to === "/"),
    [abas],
  );

  useEffect(() => {
    setAberto(false);
  }, [pathname]);


  const fundo = {
    backgroundColor: "var(--graphite)",
    color: "var(--sidebar-foreground)",
  };

  return (
    <>
      {/* Barra superior mobile */}
      <div
        className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 px-3 md:hidden"
        style={fundo}
      >
        <button
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="flex size-11 items-center justify-center rounded-md"
        >
          <Menu className="size-5" />
        </button>
        <Logo />
      </div>

      {/* Drawer mobile */}
      {aberto ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setAberto(false)}
            aria-hidden
          />
          <aside
            className="absolute inset-y-0 left-0 flex w-[260px] max-w-[80vw] flex-col"
            style={fundo}
          >
            <div className="flex items-center justify-between px-4 py-4">
              <Logo />
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar menu"
                className="flex size-11 items-center justify-center rounded-md"
              >
                <X className="size-5" />
              </button>
            </div>
            <Navegacao
              pathname={pathname}
              onNavegar={() => setAberto(false)}
              compacto={false}
              visiveis={visiveis}
            />

            <Sair compacto={false} />
          </aside>
        </div>
      ) : null}

      {/* Sidebar fixa (tablet/desktop) */}
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden w-[68px] flex-col md:flex xl:w-[220px]"
        style={fundo}
      >
        <div className="hidden px-4 py-5 xl:block">
          <Logo />
        </div>
        <div className="flex justify-center py-5 xl:hidden">
          <span
            className="rounded-lg px-2 py-1 text-sm"
            style={{
              backgroundColor: "var(--brand-yellow)",
              color: "var(--graphite)",
              fontFamily: "var(--font-logo)",
              fontWeight: 800,
            }}
          >
            L
          </span>
        </div>
        <Navegacao pathname={pathname} compacto visiveis={visiveis} />
        <Sair compacto />
      </aside>
    </>
  );
}
