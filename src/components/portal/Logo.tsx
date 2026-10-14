/** Símbolo: célula de livro-razão 2×2 com uma casa conferida (Design System NOUS). */
export function Simbolo({ tamanho = 36, escuro = false }: { tamanho?: number; escuro?: boolean }) {
  const traco = escuro ? "#f3f4f1" : "#0e1311";
  const casa = escuro ? "#5fd0a0" : "#1b6b4a";
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 44 44" aria-hidden="true">
      <rect x="2" y="2" width="40" height="40" rx="6" fill="none" stroke={traco} strokeWidth="3" />
      <path d="M2 22h40M22 2v40" stroke={traco} strokeWidth="3" />
      <rect x="25" y="25" width="14" height="14" rx="2" fill={casa} />
    </svg>
  );
}

/** Marca: LIA (produto, "Lucro com IA") assinada "by nous". `escuro` = sobre fundo tinta. */
export function Logo({ selo = true, escuro = false }: { selo?: boolean; escuro?: boolean }) {
  const cor = escuro ? "#f3f4f1" : "#0e1311";
  return (
    <div className="flex items-center gap-3">
      <Simbolo tamanho={34} escuro={escuro} />
      <div className="flex flex-col gap-1 leading-none">
        <span
          style={{
            fontFamily: "var(--font-logo)",
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: "0.02em",
            color: cor,
          }}
        >
          LIA
        </span>
        {selo ? (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: cor,
              opacity: 0.75,
            }}
          >
            LUCRO COM IA · by nous
          </span>
        ) : null}
      </div>
    </div>
  );
}
