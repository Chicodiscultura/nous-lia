import type { ReactNode } from "react";

export function Cartao({
  titulo,
  acao,
  children,
  className = "",
}: {
  titulo?: string;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-surface p-4 ${className}`}>
      {titulo ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-extrabold">{titulo}</h2>
          {acao}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Vazio({ texto = "Sem dados no período." }: { texto?: string }) {
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">{texto}</p>
  );
}

export function Carregando() {
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      Carregando dados…
    </p>
  );
}
