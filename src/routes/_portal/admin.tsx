import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { Cartao, Carregando } from "@/components/portal/Cartao";
import { KpiCard } from "@/components/portal/KpiCard";
import { Topbar } from "@/components/portal/Topbar";
import { dataHora, ddmmaaaa, num } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useUsuariosAdmin } from "@/lib/usuarios";

export const Route = createFileRoute("/_portal/admin")({
  head: () => ({
    meta: [
      { title: "Admin — LIA · NOUS" },
      {
        name: "description",
        content: "Usuários, permissões e status da sincronização com o ERP.",
      },
    ],
  }),
  component: AdminPage,
});

interface SyncStatus {
  ultimo_sync_ok: string | null;
  ultimo_erro: string | null;
  venda_mais_recente: string | null;
}

function AdminPage() {
  const sync = useQuery({
    queryKey: ["v_sync_status", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_sync_status").select("*").limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as SyncStatus | null;
    },
  });
  const usuarios = useUsuariosAdmin();

  const lista = usuarios.data ?? [];
  const ativos = lista.filter((u) => u.ativo).length;

  return (
    <>
      <Topbar titulo="Admin" descricao="Usuários, permissões e status dos dados." />

      <div className="mb-6">
        <Link
          to="/admin/usuarios"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md px-4 text-sm font-bold"
          style={{ backgroundColor: "var(--ink)", color: "var(--on-ink)" }}
        >
          <Users className="size-4" /> Gestão de usuários
        </Link>
      </div>

      {sync.isLoading ? (
        <Carregando />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            titulo="Última sincronização"
            valor={sync.data?.ultimo_sync_ok ? dataHora(sync.data.ultimo_sync_ok) : "—"}
            detalhe="Winthor → banco, a cada 15 minutos"
            destaque
          />
          <KpiCard
            titulo="Venda mais recente"
            valor={ddmmaaaa(sync.data?.venda_mais_recente)}
            detalhe="data da última nota de saída"
          />
          <KpiCard
            titulo="Último erro do sync"
            valor={sync.data?.ultimo_erro ? "Houve erro" : "Nenhum"}
            detalhe={sync.data?.ultimo_erro ?? undefined}
            status={sync.data?.ultimo_erro ? "critico" : "positivo"}
          />
          <KpiCard
            titulo="Usuários ativos"
            valor={num(ativos)}
            detalhe={`${num(lista.length)} cadastrados`}
          />
        </div>
      )}

      <Cartao titulo="Como o acesso funciona" className="mt-6">
        <ul className="space-y-2 text-sm leading-relaxed">
          <li>
            <strong>Perfil</strong> define o que a pessoa pode ler no banco: diretoria e gestor veem
            a operação; o usuário externo da Danone vê só a aba Danone, sem custo nem margem.
          </li>
          <li>
            <strong>Abas</strong> organizam o menu de cada pessoa. Esconder uma aba não é segurança:
            os dados de cada área continuam protegidos pelo perfil.
          </li>
          <li>
            <strong>Desativar</strong> corta o acesso na hora e preserva o histórico. Nenhum usuário
            é apagado.
          </li>
        </ul>
      </Cartao>
    </>
  );
}
