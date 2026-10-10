export const brl = (v: number | null | undefined, cents = false) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(Number(v ?? 0));

export const num = (v: number | null | undefined, digits = 0) =>
  new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(v ?? 0));

export const kg = (v: number | null | undefined) => `${num(v, 0)} kg`;

/** kg com 1 casa decimal (padrão das telas de fornecedores). */
export const kg1 = (v: number | null | undefined) => `${num(v, 1)} kg`;

export const pct = (v: number | null | undefined, digits = 1) =>
  `${num(v ?? 0, digits)}%`;

export const ddmm = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
};

export const ddmmaaaa = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
};

export const dataHora = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
};

export const toISO = (d: Date) => d.toISOString().slice(0, 10);

/** Rótulo padrão de produto: "(121) BACON INTEIRO SADIA APX 6KG". */
export const rotuloProduto = (
  codprod: number | null | undefined,
  descricao: string | null | undefined,
) => (codprod == null ? (descricao ?? "—") : `(${codprod}) ${descricao ?? "—"}`);
