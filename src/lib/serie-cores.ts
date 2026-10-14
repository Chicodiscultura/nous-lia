// Ordem fixa das séries: a cor segue a entidade, nunca o ranking.
export const CORES_SERIE = [
  "#0E1311",
  "#2F6F9F",
  "#B0741A",
  "#6B7A72",
  "#A8503F",
  "#7D8CA0",
] as const;

export const COR_OUTROS = "#C9CEC8";

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
