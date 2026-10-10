// Ordem fixa das séries: a cor segue a entidade, nunca o ranking.
export const CORES_SERIE = [
  "#D94436",
  "#2A78D6",
  "#EDA100",
  "#1BAF7A",
  "#4A3AA7",
  "#E87BA4",
] as const;

export const COR_OUTROS = "#B9B4A9";

/**
 * Recebe a lista canônica de entidades (ordem estável) e devolve o mapa
 * entidade -> cor. A partir da 7ª entidade tudo vira "Outros".
 */
export function mapaDeCores(entidades: string[]): Record<string, string> {
  const mapa: Record<string, string> = { Outros: COR_OUTROS };
  entidades.slice(0, 6).forEach((e, i) => {
    mapa[e] = CORES_SERIE[i] ?? COR_OUTROS;
  });
  return mapa;
}

export function corDaEntidade(
  entidade: string,
  mapa: Record<string, string>,
): string {
  return mapa[entidade] ?? COR_OUTROS;
}

/** Agrupa em no máximo 6 entidades + "Outros", preservando a ordem canônica. */
export function agruparOutros<T extends { nome: string; valor: number }>(
  itens: T[],
): { nome: string; valor: number }[] {
  const ordenado = [...itens].sort((a, b) => b.valor - a.valor);
  const principais = ordenado.slice(0, 6).map((i) => ({ nome: i.nome, valor: i.valor }));
  const resto = ordenado.slice(6);
  if (resto.length) {
    principais.push({
      nome: "Outros",
      valor: resto.reduce((s, i) => s + i.valor, 0),
    });
  }
  return principais;
}
