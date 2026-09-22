import Image from "next/image";
import Link from "next/link";
import { event, ticketPriceCents } from "@/lib/config";
import { formatBRL } from "@/lib/format";
import { BrandMark, Seal } from "@/components/brand";

export default function Home() {
  const wpp = `https://wa.me/${event.whatsapp}`;

  return (
    <main className="flex-1">
      {/* Top bar */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <BrandMark size={46} />
        <Link
          href="/comprar"
          className="btn-fire hidden rounded-full px-5 py-2 text-sm font-bold sm:inline-block"
        >
          Comprar ingresso
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-4 pb-8 pt-4 md:grid-cols-2 md:pt-10">
        <div className="order-2 md:order-1">
          <div className="mb-5 flex items-center gap-3">
            <Seal size={52} />
            <span className="text-sm text-[var(--color-muted)]">
              A Tenda de Umbanda
              <br />
              <span className="text-[var(--color-gold)]">Flecha de Fogo</span> apresenta
            </span>
          </div>
          <p className="font-display text-sm uppercase tracking-[0.2em] text-[var(--color-fire)]">
            {event.tagline}
          </p>
          <h1 className="font-display mt-3 text-5xl leading-[0.95] sm:text-6xl">
            <span className="text-flame">{event.artist}</span>
            <br />
            <span className="text-[var(--color-text)]">na Flecha de Fogo</span>
          </h1>

          <div className="mt-7 space-y-2 text-[var(--color-muted)]">
            <p className="flex items-center gap-3">
              <span className="text-[var(--color-fire)]">📅</span>
              <span className="text-[var(--color-text)]">
                {event.dateLabel} · {event.timeLabel}
              </span>
            </p>
            <p className="flex items-center gap-3">
              <span className="text-[var(--color-fire)]">📍</span>
              <span className="text-[var(--color-text)]">
                {event.venueName} — {event.venueAddress}
              </span>
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/comprar"
              className="btn-fire rounded-full px-8 py-3.5 text-base font-bold"
            >
              Garantir meu ingresso 🔥
            </Link>
            <div className="text-sm text-[var(--color-muted)]">
              a partir de{" "}
              <span className="font-display text-xl text-[var(--color-gold)]">
                {formatBRL(ticketPriceCents)}
              </span>
            </div>
          </div>

          <p className="mt-4 text-xs text-[var(--color-muted)]">
            Pagamento via Pix · ingresso enviado por e-mail com QR Code.
          </p>
        </div>

        {/* Poster */}
        <div className="order-1 md:order-2">
          <div className="relative mx-auto max-w-sm">
            <div className="absolute -inset-4 rounded-3xl bg-[radial-gradient(circle,_rgba(255,106,26,0.35),_transparent_70%)] blur-2xl" />
            <Image
              src="/poster.jpg"
              alt={`Pôster do show ${event.title}`}
              width={1074}
              height={1517}
              priority
              className="relative rounded-2xl border border-[var(--color-line)] shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Info cards */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <InfoCard icon="🎭" title="O show">
            Stand-up com {event.artist}, criador do 1º show de stand-up umbandista
            do Brasil. Uma noite de axé e muita risada.
          </InfoCard>
          <InfoCard icon="🗓️" title="Quando">
            {event.dateLabel}, às {event.timeLabel}. Chegue com antecedência para
            garantir seu lugar.
          </InfoCard>
          <InfoCard icon="📍" title="Onde">
            {event.venueName}
            <br />
            {event.venueAddress}
          </InfoCard>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="card flex flex-col items-center gap-4 px-6 py-10 text-center">
          <h2 className="font-display text-3xl text-[var(--color-text)]">
            Bora rir com a gente? 🔥
          </h2>
          <p className="max-w-md text-[var(--color-muted)]">
            Ingressos limitados. Garanta o seu pelo Pix — rápido, seguro e sem
            taxa de plataforma.
          </p>
          <Link
            href="/comprar"
            className="btn-fire rounded-full px-8 py-3.5 text-base font-bold"
          >
            Comprar ingresso
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-7 text-sm text-[var(--color-muted)] sm:flex-row">
          <div className="flex items-center gap-3">
            <Seal size={40} />
            <span>
              © {new Date().getFullYear()} Tenda de Umbanda Flecha de Fogo
              <br />
              {event.venueAddress}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a href={event.instagram} target="_blank" rel="noreferrer" className="hover:text-[var(--color-fire)]">
              Instagram
            </a>
            <a href={wpp} target="_blank" rel="noreferrer" className="hover:text-[var(--color-fire)]">
              WhatsApp
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function InfoCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <div className="text-2xl">{icon}</div>
      <h3 className="font-display mt-3 text-xl text-[var(--color-gold)]">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
        {children}
      </p>
    </div>
  );
}
