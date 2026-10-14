import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

import { useTelaPequena } from "@/hooks/use-mobile";
import { brl } from "@/lib/format";
import { COR_OUTROS, corDaEntidade } from "@/lib/serie-cores";

export interface ItemBarra {
  nome: string;
  valor: number;
}

export function GraficoBarras({
  dados,
  cores,
  altura = 320,
}: {
  dados: ItemBarra[];
  cores: Record<string, string>;
  altura?: number;
}) {
  const pequena = useTelaPequena();

  /** No mobile, mais de 6 barras vira "5 maiores + Outros". */
  let itens = dados;
  if (pequena && dados.length > 6) {
    const ordenado = [...dados].sort((a, b) => b.valor - a.valor);
    const topo = ordenado.slice(0, 5);
    const resto = ordenado.slice(5).reduce((s, d) => s + d.valor, 0);
    itens = [...topo, { nome: "Outros", valor: resto }];
  }

  const alturaFinal = pequena
    ? Math.max(180, Math.min(altura, itens.length * 44 + 40))
    : altura;

  return (
    <ResponsiveContainer width="100%" height={alturaFinal}>
      <BarChart
        data={itens}
        layout="vertical"
        margin={{ top: 4, right: pequena ? 8 : 72, bottom: 4, left: 0 }}
        barCategoryGap={12}
      >
        <CartesianGrid horizontal={false} stroke="#C9CEC8" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="nome"
          width={pequena ? 88 : 130}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#55605A", fontSize: pequena ? 10 : 12 }}
        />
        <Bar dataKey="valor" radius={[4, 4, 4, 4]} barSize={14}>
          {itens.map((d) => (
            <Cell
              key={d.nome}
              fill={
                d.nome === "Outros" ? COR_OUTROS : corDaEntidade(d.nome, cores)
              }
            />
          ))}
          <LabelList
            dataKey="valor"
            position={pequena ? "insideRight" : "right"}
            formatter={(v: number) => brl(v)}
            style={{
              fill: pequena ? "#FFFFFF" : "#0E1311",
              fontSize: pequena ? 10 : 12,
              fontVariantNumeric: "tabular-nums",
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
