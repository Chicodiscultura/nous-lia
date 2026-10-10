import { useQuery } from "@tanstack/react-query";

import { supabase } from "./supabase";
import type { Periodo } from "./periodo";

export interface VendaDia {
  data: string;
  faturamento: number;
  kg: number;
  rs_por_kg: number;
  clientes_atendidos: number;
  notas: number;
}

export interface VendaFornecedor {
  data: string;
  fornecedor: string;
  pasta: string;
  destaque: boolean;
  faturamento: number;
  kg: number;
  clientes_positivados: number;
  margem_contribuicao: number;
  margem_pct: number | null;
}

export interface Margem {
  mes: string;
  venda: number;
  custo: number;
  margem_valor: number;
  margem_pct: number;
}

export interface ConferenciaResumo {
  rodada: string;
  divergencias: number;
  indicadores: number;
  pior_indicador: string | null;
  pior_diferenca: number | null;
}



export interface VendaRca {
  data: string;
  codusur: number;
  vendedor: string;
  equipe: string;
  interno: boolean;
  comissionavel: boolean;
  faturamento: number;
  kg: number;
  clientes_atendidos: number;
  notas: number;
}

export interface PedidoDia {
  data: string;
  valor_pedidos: number;
  ja_faturado: number;
  a_faturar: number;
  pedidos: number;
  pedidos_pendentes: number;
  clientes: number;
  kg: number;
}

export interface PedidoRca {
  data: string;
  codusur: number;
  vendedor: string;
  equipe: string;
  interno: boolean;
  valor_pedidos: number;
  a_faturar: number;
  pedidos: number;
  clientes: number;
}

export interface PedidoPosicao {
  situacao: string;
  posicao: string;
  pedidos: number;
  valor: number;
  mais_antigo: string;
}

export interface BonificacaoDia {
  data: string;
  valor: number;
  notas: number;
  clientes: number;
  uso_interno: number;
  para_clientes: number;
}

export interface NotaForaFaturamento {
  data: string;
  numnota: number;
  condvenda: number;
  tipo: string;
  grupo: string;
  cliente: string;
  vendedor: string;
  valor: number;
}

async function selecionar<T>(view: string, p?: Periodo) {
  let q = supabase.from(view).select("*");
  if (p) q = q.gte("data", p.inicio).lte("data", p.fim);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as T[];
}

export const useVendasDia = (p: Periodo) =>
  useQuery({
    queryKey: ["v_vendas_dia", p.inicio, p.fim],
    queryFn: () => selecionar<VendaDia>("v_vendas_dia", p),
  });

export const useVendasFornecedor = (p: Periodo) =>
  useQuery({
    queryKey: ["v_vendas_fornecedor", p.inicio, p.fim],
    queryFn: () => selecionar<VendaFornecedor>("v_vendas_fornecedor", p),
  });

export interface FornecedorPeriodo {
  fornecedor: string;
  pasta: string;
  peso_kg: number;
  faturamento: number;
  rs_por_kg: number;
  clientes_positivados: number;
  margem_valor: number;
  margem_pct: number | null;
  participacao_pct: number;
}

/**
 * Fornecedores agregados no período (rotina 111 — NF emitidas).
 * A função já devolve COUNT(DISTINCT) de clientes e participação no período;
 * usar os valores como vêm, sem somar clientes no front.
 */
export const useFornecedoresPeriodo = (p: Periodo) =>
  useQuery({
    queryKey: ["fn_fornecedores_periodo", p.inicio, p.fim],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_fornecedores_periodo", {
        p_ini: p.inicio,
        p_fim: p.fim,
      });
      if (error) throw error;
      return (data ?? []) as FornecedorPeriodo[];
    },
  });

export const useVendasRca = (p: Periodo) =>
  useQuery({
    queryKey: ["v_vendas_rca", p.inicio, p.fim],
    queryFn: () => selecionar<VendaRca>("v_vendas_rca", p),
  });

export const usePedidosDia = (p: Periodo) =>
  useQuery({
    queryKey: ["v_pedidos_dia", p.inicio, p.fim],
    queryFn: () => selecionar<PedidoDia>("v_pedidos_dia", p),
  });

export const usePedidosRca = (p: Periodo) =>
  useQuery({
    queryKey: ["v_pedidos_rca", p.inicio, p.fim],
    queryFn: () => selecionar<PedidoRca>("v_pedidos_rca", p),
  });

export const usePedidosPosicao = () =>
  useQuery({
    queryKey: ["v_pedidos_posicao"],
    queryFn: () => selecionar<PedidoPosicao>("v_pedidos_posicao"),
  });

export const useBonificacoesDia = (p: Periodo) =>
  useQuery({
    queryKey: ["v_bonificacoes_dia", p.inicio, p.fim],
    queryFn: () => selecionar<BonificacaoDia>("v_bonificacoes_dia", p),
  });

export const useNotasForaFaturamento = (p: Periodo) =>
  useQuery({
    queryKey: ["v_notas_fora_faturamento", p.inicio, p.fim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_notas_fora_faturamento")
        .select("*")
        .gte("data", p.inicio)
        .lte("data", p.fim)
        .order("valor", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NotaForaFaturamento[];
    },
  });

export interface ClientesKpis {
  base_ativa: number;
  positivados: number;
  pct_positivacao: number;
  novos_clientes: number;
  sem_compra_30d: number;
  sem_compra_90d: number;
  ticket_medio: number;
  clientes_inadimplentes: number;
  valor_vencido: number;
}

export interface ClientesPorCidade {
  cidade: string;
  clientes_positivados: number;
  toneladas: number;
  valor_vendido: number;
  rs_por_kg: number;
  participacao_pct: number;
}

export interface ClientesPorVendedor {
  vendedor: string;
  equipe: string;
  clientes_positivados: number;
  toneladas: number;
  valor_vendido: number;
  rs_por_kg: number;
  participacao_pct: number;
}

export interface ClienteDetalhe {
  codcli: number;
  cliente: string;
  cidade: string;
  rca: string;
  ultima_compra: string | null;
  compras_mes_anterior: number;
  compras_mes_atual: number;
  titulos_abertos: number;
  titulos_vencidos: number;
  outros_vendedores: string | null;
}

export interface ClienteVendedorMes {
  mes: string;
  vendedor: string;
  valor: number;
}

/** Últimos 3 meses de compras do cliente, por vendedor. */
export const useClienteVendedorMensal = (codcli: number | null) =>
  useQuery({
    queryKey: ["fn_cliente_vendedor_mensal", codcli],
    enabled: codcli != null,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_cliente_vendedor_mensal", {
        p_codcli: codcli,
      });
      if (error) throw error;
      return (data ?? []) as ClienteVendedorMes[];
    },
  });

async function rpcPeriodo<T>(fn: string, p: Periodo) {
  const { data, error } = await supabase.rpc(fn, {
    p_ini: p.inicio,
    p_fim: p.fim,
  });
  if (error) throw error;
  return (data ?? []) as T[];
}

export const useClientesKpis = (p: Periodo) =>
  useQuery({
    queryKey: ["fn_clientes_kpis", p.inicio, p.fim],
    queryFn: async () =>
      ((await rpcPeriodo<ClientesKpis>("fn_clientes_kpis", p))[0] ??
        null) as ClientesKpis | null,
  });

export const useClientesPorCidade = (p: Periodo) =>
  useQuery({
    queryKey: ["fn_clientes_por_cidade", p.inicio, p.fim],
    queryFn: () => rpcPeriodo<ClientesPorCidade>("fn_clientes_por_cidade", p),
  });

export const useClientesPorVendedor = (p: Periodo) =>
  useQuery({
    queryKey: ["fn_clientes_por_vendedor", p.inicio, p.fim],
    queryFn: () =>
      rpcPeriodo<ClientesPorVendedor>("fn_clientes_por_vendedor", p),
  });

/** Relação de clientes de uma cidade OU de um vendedor (drill-down). */
export const useClientesDetalhe = (
  cidade: string | null,
  vendedor: string | null,
) =>
  useQuery({
    queryKey: ["fn_clientes_detalhe", cidade, vendedor],
    enabled: !!(cidade || vendedor),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("fn_clientes_detalhe", {
        p_cidade: cidade,
        p_vendedor: vendedor,
      });
      if (error) throw error;
      return (data ?? []) as ClienteDetalhe[];
    },
  });

export const useTabela = <T,>(tabela: string, colunas = "*") =>

  useQuery({
    queryKey: [tabela, colunas],
    queryFn: async () => {
      const { data, error } = await supabase.from(tabela).select(colunas);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });

/**
 * Lê UM registro de uma view que retorna **uma única linha** (agregados,
 * snapshots do mês atual, etc.).
 *
 * ATENÇÃO: não use em views multi-linha — sem `ORDER BY` o Postgres devolve
 * uma linha arbitrária. Se precisar da linha mais recente de uma view
 * multi-linha, informe `ordem` explicitamente (ex.: `{ coluna: "mes",
 * ascendente: false }`) — ainda assim, prefira uma view dedicada de 1 linha.
 */
export const useRegistroUnico = <T,>(
  tabela: string,
  ordem?: { coluna: string; ascendente?: boolean },
) =>
  useQuery({
    queryKey: [tabela, "unico", ordem?.coluna ?? null, ordem?.ascendente ?? null],
    queryFn: async () => {
      let q = supabase.from(tabela).select("*");
      if (ordem)
        q = q.order(ordem.coluna, { ascending: ordem.ascendente ?? false });
      const { data, error } = await q.limit(1);
      if (error) throw error;
      return ((data ?? [])[0] ?? null) as T | null;
    },
  });

export interface PositivacaoMes {
  mes: string;
  clientes_positivados: number;
  base_ativa: number;
  pct_positivacao: number;
}

export interface ClientesNovos {
  novos_periodo: number;
  novos_mes: number;
}

/** Clientes novos no período selecionado e no mês corrente. */
export const useClientesNovos = (p: Periodo) =>
  useQuery({
    queryKey: ["fn_clientes_novos", p.inicio, p.fim],
    queryFn: async () =>
      ((await rpcPeriodo<ClientesNovos>("fn_clientes_novos", p))[0] ??
        null) as ClientesNovos | null,
  });

export interface Inadimplencia {
  clientes: number;
  valor_total: number;
  clientes_mais_30d: number;
  valor_mais_30d: number;
}

export type EstadoDormencia =
  | "em dia"
  | "atrasado"
  | "dormindo"
  | "critico"
  | "sem ritmo";

export interface Dormencia {
  codcli: number;
  cliente: string;
  cidade: string;
  codusur: number;
  rca: string;
  ultima_compra: string | null;
  dias_parado: number;
  ritmo_dias: number | null;
  compras_12m: number;
  faturamento_12m: number;
  razao: number | null;
  tem_titulo_vencido: boolean;
  valor_vencido: number | null;
  qt_titulos_vencidos: number | null;
  estado: EstadoDormencia;

}

/** Foto de hoje da dormência da carteira (não depende de período). */
export const useDormencia = () =>
  useQuery({
    queryKey: ["v_dormencia"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_dormencia")
        .select("*")
        .order("faturamento_12m", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Dormencia[];
    },
  });


/** Soma agrupada por chave textual. */
export function somarPor<T extends object>(
  linhas: T[],
  chave: keyof T & string,
  campos: (keyof T & string)[],
): Record<string, Record<string, number>> {
  const acc: Record<string, Record<string, number>> = {};
  for (const linha of linhas) {
    const l = linha as Record<string, unknown>;
    const k = String(l[chave] ?? "—");
    acc[k] ??= Object.fromEntries(campos.map((c) => [c, 0]));
    const alvo = acc[k]!;
    for (const c of campos) {
      alvo[c] = (alvo[c] ?? 0) + Number(l[c] ?? 0);
    }
  }
  return acc;
}

export const soma = <T,>(linhas: T[], campo: keyof T) =>
  linhas.reduce((s, l) => s + Number(l[campo] ?? 0), 0);

export const variacao = (atual: number, anterior: number) =>
  anterior > 0 ? ((atual - anterior) / anterior) * 100 : null;

export interface ReceberBuckets {
  a_vencer: number;
  vencido_ate_2d: number;
  vencido_3_a_7d: number;
  vencido_8_a_15d: number;
  vencido_16_a_30d: number;
  vencido_mais_30d: number;
  total_aberto: number;
}

export interface PagarBuckets {
  proximos_2d: number;
  de_3_a_10d: number;
  de_11_a_20d: number;
  de_21_a_30d: number;
  ja_vencidos: number;
  total_aberto: number;
}

/** Parâmetro numérico configurável (tabela `parametros`: chave/valor). */
export const useParametroNumero = (chave: string, padrao: number) => {
  const consulta = useQuery({
    queryKey: ["parametros", chave],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parametros")
        .select("chave, valor")
        .eq("chave", chave)
        .maybeSingle();
      if (error) return null;
      return (data as { chave: string; valor: string | number } | null) ?? null;
    },
  });
  const bruto = consulta.data?.valor;
  const numero = Number(String(bruto ?? "").replace(",", "."));
  return Number.isFinite(numero) && String(bruto ?? "").trim() !== ""
    ? numero
    : padrao;
};
