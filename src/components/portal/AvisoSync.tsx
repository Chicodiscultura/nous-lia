import { useQuery } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { ddmm } from "@/lib/format";

interface SyncStatus {
  ultimo_sync_ok: string | null;
  ultimo_erro: string | null;
  venda_mais_recente: string | null;
}

const DUAS_HORAS = 2 * 60 * 60 * 1000;

const dataHoraCurta = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${ddmm(d.toISOString())} ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export function AvisoSync() {
  const { data } = useQuery({
    queryKey: ["v_sync_status"],
    refetchInterval: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_sync_status")
        .select("*")
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as SyncStatus | null;
    },
  });

  if (!data) return null;

  const ok = data.ultimo_sync_ok ? new Date(data.ultimo_sync_ok) : null;
  const atrasado =
    !ok || Number.isNaN(ok.getTime()) || Date.now() - ok.getTime() > DUAS_HORAS;
  if (!atrasado) return null;

  const texto =
    ok && !Number.isNaN(ok.getTime())
      ? `Dados atualizados até ${ddmm(data.venda_mais_recente)} — sincronização com o Winthor parada desde ${dataHoraCurta(data.ultimo_sync_ok!)}.`
      : "Sincronização com o Winthor indisponível — os números podem estar desatualizados.";

  return (
    <div
      role="status"
      className="mb-4 flex min-h-[36px] items-center gap-2 rounded-md px-3 py-2 text-[13px] leading-snug sm:text-sm"
      style={{
        backgroundColor: "var(--attention-tint)",
        color: "var(--ink)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      <span>{texto}</span>
    </div>
  );
}
