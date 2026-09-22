import Image from "next/image";
import Link from "next/link";

/** Selo circular com a logo do terreiro (fundo claro em disco branco). */
export function Seal({
  size = 44,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`seal inline-flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.jpg"
        alt="Tenda de Umbanda Flecha de Fogo"
        width={size}
        height={size}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

/** Marca: selo + nome do terreiro. Vira link para a home por padrão. */
export function BrandMark({
  size = 44,
  href = "/" as string | null,
}: {
  size?: number;
  href?: string | null;
}) {
  const inner = (
    <span className="flex items-center gap-3">
      <Seal size={size} />
      <span className="leading-tight">
        <span className="block text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">
          Tenda de Umbanda
        </span>
        <span className="font-display block text-lg tracking-wide text-[var(--color-gold)]">
          FLECHA DE FOGO
        </span>
      </span>
    </span>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="transition-opacity hover:opacity-90">
      {inner}
    </Link>
  );
}
