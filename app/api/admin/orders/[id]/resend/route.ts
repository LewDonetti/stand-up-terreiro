import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { sendTicketEmail } from "@/lib/email";
import type { Order, Ticket } from "@/lib/types";

export const runtime = "nodejs";

/** POST /api/admin/orders/:id/resend — reenvia o e-mail dos ingressos. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabase();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single<Order>();

  if (!order || order.status !== "confirmed") {
    return NextResponse.json(
      { error: "Pedido não está confirmado." },
      { status: 409 },
    );
  }

  const { data: tickets } = await supabase
    .from("tickets")
    .select("*")
    .eq("order_id", id);

  try {
    await sendTicketEmail(order, (tickets ?? []) as Ticket[]);
  } catch (e) {
    console.error("Erro ao reenviar e-mail:", e);
    return NextResponse.json({ error: "Falha ao enviar o e-mail." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
