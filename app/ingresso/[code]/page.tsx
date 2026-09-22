import Link from "next/link";
import QRCode from "qrcode";
import { getSupabase } from "@/lib/supabase";
import { event, siteUrl } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function IngressoPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  interface TicketRow {
    code: string;
    checked_in: boolean;
    order: { buyer_name: string } | null;
  }
  let ticket: TicketRow | null = null;

  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("tickets")
      .select("code, checked_in, order:orders(buyer_name)")
      .eq("code", code.toUpperCase())
      .single();
    ticket = (data as unknown as TicketRow) ?? null;
  } catch {
    ticket = null;
  }

  if (!ticket) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="text-[var(--color-muted)]">Ingresso não encontrado.</p>
        <Link href="/" className="btn-fire mt-4 rounded-full px-6 py-2.5 font-bold">
          Início
        </Link>
      </main>
    );
  }

  const checkinUrl = `${siteUrl()}/checkin?code=${encodeURIComponent(ticket.code)}`;
  const qr = await QRCode.toDataURL(checkinUrl, { margin: 1, width: 360 });

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-8">
      <div className="card overflow-hidden">
        <div className="bg-[linear-gradient(180deg,var(--color-fire),var(--color-fire-dark))] px-6 py-5 text-center">
          <p className="font-display text-sm uppercase tracking-widest text-[#1a0d05]">
            {event.tagline}
          </p>
          <h1 className="font-display text-2xl text-[#1a0d05]">{event.title}</h1>
        </div>

        <div className="p-6 text-center">
          {ticket.checked_in && (
            <p className="mb-4 rounded-lg bg-[rgba(255,46,18,0.15)] px-3 py-2 text-sm font-bold text-[#ff9a80]">
              Ingresso já utilizado
            </p>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="QR Code do ingresso"
            className="mx-auto rounded-xl border border-[var(--color-line)] bg-white p-3"
            width={280}
            height={280}
          />
          <p className="mt-4 font-display text-2xl tracking-[3px] text-[var(--color-gold)]">
            {ticket.code}
          </p>
          {ticket.order?.buyer_name && (
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {ticket.order.buyer_name}
            </p>
          )}

          <div className="mt-6 space-y-1 border-t border-[var(--color-line)] pt-4 text-sm text-[var(--color-muted)]">
            <p className="text-[var(--color-text)]">
              {event.dateLabel} · {event.timeLabel}
            </p>
            <p>{event.venueName}</p>
            <p>{event.venueAddress}</p>
          </div>
          <p className="mt-5 text-xs text-[var(--color-muted)]">
            Apresente este QR Code na entrada.
          </p>
        </div>
      </div>
    </main>
  );
}
