import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";

export type Perfil = "diretoria" | "supervisor" | "financeiro" | "admin" | "rca";

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

export function usePerfil(email: string | undefined) {
  return useQuery({
    queryKey: ["usuario-portal", email],
    enabled: !!email,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios_portal")
        .select("*")
        .eq("email", email)
        .maybeSingle();
      if (error) return null;
      return data as { email: string; perfil: Perfil; nome?: string } | null;
    },
  });
}

export const podeVerMargem = (perfil?: Perfil | null) =>
  perfil === "supervisor" || perfil === "diretoria";
