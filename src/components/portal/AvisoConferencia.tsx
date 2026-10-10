import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

import { useRegistroUnico, type ConferenciaResumo } from "@/lib/dados";
import { ddmm } from "@/lib/format";

const dataHoraCurta = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${ddmm(d.toISOString())} às ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export function AvisoConferencia() {
  const { data } = useRegistroUnico<ConferenciaResumo>("v_conferencia_resumo");

  if (!data || !data.divergencias) return null;

  return (
    <div
      role="status"
      className="mb-4 flex min-h-[36px] items-center gap-2 rounded-md px-3 py-2 text-[13px] leading-snug sm:text-sm"
      style={{
        backgroundColor: "color-mix(in srgb, #D03B3B 12%, #fff)",
        borderLeft: "3px solid #D03B3B",
        color: "var(--graphite)",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <ShieldAlert className="size-4 shrink-0" aria-hidden />
      <span>
        {data.divergencias} de {data.indicadores} indicadores divergem do
        Winthor — conferência de {dataHoraCurta(data.rodada)}.
        {data.pior_indicador ? ` Maior diferença: ${data.pior_indicador}.` : ""}{" "}
        <Link to="/admin" className="underline underline-offset-2">
          ver detalhes
        </Link>
      </span>
    </div>
  );
}
