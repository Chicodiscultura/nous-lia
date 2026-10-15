import { usePerfilAtual } from "@/hooks/useSessao";

/** Marca de cada cliente (tenant). A LIA é multi-empresa: o cliente aparece ao lado da NOUS. */
const MARCAS: Record<string, { nome: string; logo: string; icone: string }> = {
  delifrios: {
    nome: "Delifrios",
    logo: "/delifrios-logo-oficial.png",
    icone: "/delifrios-192.png",
  },
};

/**
 * `completo`: logo horizontal (menu largo e drawer). `icone`: só o símbolo (menu compacto
 * e barra do celular). Sem marca cadastrada, mostra o nome do tenant em texto.
 */
export function MarcaCliente({ variante }: { variante: "completo" | "icone" }) {
  const { data: perfil } = usePerfilAtual();
  if (!perfil) return null;
  const marca = MARCAS[perfil.tenant_slug];

  if (variante === "icone") {
    return marca ? (
      <img
        src={marca.icone}
        alt={marca.nome}
        title={`Cliente: ${marca.nome}`}
        className="size-8 rounded-full"
      />
    ) : null;
  }

  return (
    <div className="px-4 pb-3">
      <p
        className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "var(--sidebar-foreground)", opacity: 0.6 }}
      >
        Cliente
      </p>
      {marca ? (
        <img
          src={marca.logo}
          alt={marca.nome}
          className="block w-full max-w-[96px] rounded-sm"
          style={{ aspectRatio: "1280 / 603" }}
        />
      ) : (
        <p className="text-sm font-semibold">{perfil.tenant}</p>
      )}
    </div>
  );
}
