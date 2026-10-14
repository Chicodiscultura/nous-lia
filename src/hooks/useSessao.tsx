import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type Perfil = "diretoria" | "gestor" | "danone_externo";

export interface PerfilApp {
  perfil: Perfil;
  nome: string | null;
  tenant: string;
  tenant_slug: string;
}

export function useSessao() {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setCarregando(false);
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, carregando };
}

/** Perfil do usuário logado (função meu_perfil_app, tenant incluído). */
export function usePerfil(email: string | undefined) {
  return useQuery({
    queryKey: ["perfil-app", email],
    enabled: !!email,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("meu_perfil_app");
      if (error) return null;
      return (data ?? null) as PerfilApp | null;
    },
  });
}

export const podeVerMargem = (perfil?: Perfil | null) =>
  perfil === "gestor" || perfil === "diretoria";
