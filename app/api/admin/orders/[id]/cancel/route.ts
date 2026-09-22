import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

/** POST /api/admin/orders/:id/cancel — marca o pedido como cancelado. */
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
    .select("status")
    .eq("id", id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  if (order.status === "confirmed") {
    return NextResponse.json(
      { error: "Pedido já confirmado — não é possível cancelar por aqui." },
      { status: 409 },
    );
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Falha ao cancelar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
