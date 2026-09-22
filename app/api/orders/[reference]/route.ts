import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pix } from "@/lib/config";
import { buildPixPayload } from "@/lib/pix";

export const runtime = "nodejs";

/** GET /api/orders/:reference — status do pedido + dados do Pix. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const supabase = getSupabase();

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "reference, buyer_name, quantity, unit_price_cents, total_cents, status, comprovante_path, created_at",
    )
    .eq("reference", reference)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  const pixPayload =
    order.status === "pending" && pix.key
      ? buildPixPayload({
          key: pix.key,
          name: pix.name,
          city: pix.city,
          amountCents: order.total_cents,
          txid: order.reference,
        })
      : null;

  return NextResponse.json({
    order: {
      reference: order.reference,
      buyerName: order.buyer_name,
      quantity: order.quantity,
      unitPriceCents: order.unit_price_cents,
      totalCents: order.total_cents,
      status: order.status,
      hasComprovante: Boolean(order.comprovante_path),
    },
    pix: pixPayload
      ? { payload: pixPayload, key: pix.key, name: pix.name }
      : null,
  });
}
