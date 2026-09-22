import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { generateTicketCode } from "@/lib/format";
import { sendTicketEmail } from "@/lib/email";
import type { Order, Ticket } from "@/lib/types";

export const runtime = "nodejs";

/** POST /api/admin/orders/:id/confirm — confirma pagamento, gera ingressos e envia e-mail. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const supabase = getSupabase();

  const { data: order, error: findErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .single<Order>();

  if (findErr || !order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  if (order.status === "confirmed") {
    return NextResponse.json({ error: "Pedido já confirmado." }, { status: 409 });
  }
  if (order.status === "cancelled") {
    return NextResponse.json({ error: "Pedido cancelado." }, { status: 409 });
  }

  // Cria os ingressos (um por lugar), com retry em caso de código repetido.
  let tickets: Ticket[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const rows = Array.from({ length: order.quantity }, () => ({
      order_id: order.id,
      code: generateTicketCode(),
    }));
    const { data, error } = await supabase.from("tickets").insert(rows).select("*");
    if (!error && data) {
      tickets = data as Ticket[];
      break;
    }
    if (error && error.code === "23505") continue; // código colidiu, tenta de novo
    console.error("Erro ao criar ingressos:", error);
    return NextResponse.json({ error: "Falha ao gerar ingressos." }, { status: 500 });
  }
  if (tickets.length === 0) {
    return NextResponse.json({ error: "Falha ao gerar ingressos." }, { status: 500 });
  }

  const { error: updErr } = await supabase
    .from("orders")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", order.id);

  if (updErr) {
    console.error("Erro ao confirmar pedido:", updErr);
    return NextResponse.json({ error: "Falha ao confirmar o pedido." }, { status: 500 });
  }

  // Envia o e-mail com os ingressos. Se falhar, o pedido segue confirmado
  // e o admin pode reenviar depois.
  let emailSent = true;
  try {
    await sendTicketEmail(order, tickets);
  } catch (e) {
    emailSent = false;
    console.error("Erro ao enviar e-mail:", e);
  }

  return NextResponse.json({ ok: true, emailSent, tickets: tickets.length });
}
