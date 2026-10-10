import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useTelaPequena } from "@/hooks/use-mobile";
import { brl, ddmm } from "@/lib/format";

const compacto = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

export function GraficoLinha({
  dados,
  altura = 300,
  cor = "#D94436",
  segundaSerie,
}: {
  dados: { data: string; valor: number; comparativo?: number }[];
  altura?: number;
  cor?: string;
  segundaSerie?: { chave: "comparativo"; nome: string; cor: string };
}) {
  const pequena = useTelaPequena();

  return (
    <ResponsiveContainer width="100%" height={pequena ? 220 : altura}>
      <LineChart
        data={dados}
        margin={{ top: 8, right: 8, bottom: pequena ? 16 : 4, left: 0 }}
      >
        <CartesianGrid vertical={false} stroke="#E7E4DC" />
        <XAxis
          dataKey="data"
          tickFormatter={ddmm}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={pequena ? 24 : 8}
          angle={pequena ? -45 : 0}
          textAnchor={pequena ? "end" : "middle"}
          height={pequena ? 40 : 30}
          tick={{ fill: "#7A746B", fontSize: pequena ? 10 : 12 }}
        />
        <YAxis
          tickFormatter={(v: number) => (pequena ? compacto(v) : brl(v))}
          tickLine={false}
          axisLine={false}
          width={pequena ? 44 : 90}
          tick={{ fill: "#7A746B", fontSize: pequena ? 10 : 12 }}
        />
        <Tooltip
          labelFormatter={(l: string) => ddmm(l)}
          formatter={(v: number) => brl(v, true)}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #E7E4DC",
            fontFamily: "Inter, sans-serif",
          }}
        />
        <Line
          type="monotone"
          dataKey="valor"
          name="Faturamento"
          stroke={cor}
          strokeWidth={2}
          dot={false}
        />
        {segundaSerie ? (
          <Line
            type="monotone"
            dataKey={segundaSerie.chave}
            name={segundaSerie.nome}
            stroke={segundaSerie.cor}
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}
