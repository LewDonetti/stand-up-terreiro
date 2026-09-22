import { event, ticketPriceCents, maxPerOrder } from "@/lib/config";
import CheckoutForm from "./CheckoutForm";

export default function ComprarPage() {
  return (
    <CheckoutForm
      priceCents={ticketPriceCents}
      maxPerOrder={maxPerOrder}
      eventLine={`${event.artist} · ${event.dateLabel}, ${event.timeLabel} · ${event.venueName}`}
    />
  );
}
