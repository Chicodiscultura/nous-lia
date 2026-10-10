import { toISO } from "./format";

export type PeriodoTipo = "dia" | "semana" | "mes" | "mes_anterior" | "livre";

export interface Periodo {
  tipo: PeriodoTipo;
  inicio: string;
  fim: string;
}

export function intervaloDe(tipo: Exclude<PeriodoTipo, "livre">): Periodo {
  const hoje = new Date();
  if (tipo === "dia") {
    return { tipo, inicio: toISO(hoje), fim: toISO(hoje) };
  }
  if (tipo === "semana") {
    const dia = hoje.getDay(); // 0 domingo
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - ((dia + 6) % 7)); // segunda-feira
    return { tipo, inicio: toISO(inicio), fim: toISO(hoje) };
  }
  if (tipo === "mes_anterior") {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    return { tipo, inicio: toISO(inicio), fim: toISO(fim) };
  }
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  return { tipo, inicio: toISO(inicio), fim: toISO(hoje) };
}

export function periodoAnterior(p: Periodo): Periodo {
  const ini = new Date(`${p.inicio}T12:00:00`);
  if (p.tipo === "mes_anterior") {
    const i = new Date(ini.getFullYear(), ini.getMonth() - 1, 1);
    const f = new Date(ini.getFullYear(), ini.getMonth(), 0);
    return { tipo: p.tipo, inicio: toISO(i), fim: toISO(f) };
  }
  const fim = new Date(`${p.fim}T12:00:00`);
  const dias = Math.round((fim.getTime() - ini.getTime()) / 86400000) + 1;
  const novoFim = new Date(ini);
  novoFim.setDate(ini.getDate() - 1);
  const novoIni = new Date(novoFim);
  novoIni.setDate(novoFim.getDate() - (dias - 1));
  return { tipo: p.tipo, inicio: toISO(novoIni), fim: toISO(novoFim) };
}

export const rotuloPeriodo: Record<PeriodoTipo, string> = {
  dia: "Dia",
  semana: "Semana atual",
  mes: "Mês atual",
  mes_anterior: "Mês anterior",
  livre: "Período livre",
};
