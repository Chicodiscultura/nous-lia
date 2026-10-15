/**
 * Símbolo da NOUS (marca viva v2): um N feito de quatro pontos ligados. O último ponto, em
 * cobalto, é o dado conferido e aprovado. `animado` desenha a rede e acende os pontos.
 */
export function Simbolo({
  tamanho = 36,
  escuro = false,
  animado = false,
}: {
  tamanho?: number;
  escuro?: boolean;
  animado?: boolean;
}) {
  const traco = escuro ? "#f3f4f1" : "#0e1311";
  const destaque = escuro ? "#8fa1ff" : "#2540ff";
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <path
        className={animado ? "n-traco" : undefined}
        d="M14 52V12L50 52V12"
        fill="none"
        stroke={traco}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className={animado ? "n-a" : undefined} cx="14" cy="52" r="7" fill={traco} />
      <circle className={animado ? "n-b" : undefined} cx="14" cy="12" r="7" fill={traco} />
      <circle className={animado ? "n-c" : undefined} cx="50" cy="52" r="7" fill={traco} />
      {animado ? (
        <circle className="anel" cx="50" cy="12" r="7" fill="none" stroke={destaque} strokeWidth="2" />
      ) : null}
      <circle className={animado ? "n-d" : undefined} cx="50" cy="12" r="7.5" fill={destaque} />
    </svg>
  );
}

/** Logotipo "lia": letras geométricas; o pingo do "i" é a centelha de brasa. */
export function LogotipoLia({
  largura = 64,
  escuro = false,
  animado = false,
}: {
  largura?: number;
  escuro?: boolean;
  animado?: boolean;
}) {
  const cor = escuro ? "#f3f4f1" : "#0e1311";
  return (
    <svg
      width={largura}
      height={Math.round((largura * 94) / 124)}
      viewBox="-6 -22 124 94"
      role="img"
      aria-label="lia"
      style={{ overflow: "visible" }}
    >
      <rect x="0" y="4" width="10" height="60" rx="5" fill={cor} />
      <rect x="30" y="24" width="10" height="40" rx="5" fill={cor} />
      <circle className={animado ? "lia-ponto" : undefined} cx="35" cy="10" r="7.5" fill="#ff5a36" />
      <circle cx="80" cy="44" r="15" fill="none" stroke={cor} strokeWidth="10" />
      <rect x="96" y="24" width="10" height="40" rx="5" fill={cor} />
    </svg>
  );
}

/** Marca: LIA (produto, "Lucro com IA") assinada "by nous". `escuro` = sobre fundo tinta. */
export function Logo({
  selo = true,
  escuro = false,
  animado = false,
}: {
  selo?: boolean;
  escuro?: boolean;
  animado?: boolean;
}) {
  const cor = escuro ? "#f3f4f1" : "#0e1311";
  return (
    <div className="flex flex-col gap-1.5 leading-none">
      <LogotipoLia largura={64} escuro={escuro} animado={animado} />
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
  );
}
