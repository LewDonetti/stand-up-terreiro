import { NextRequest, NextResponse } from "next/server";
import { getSupabase, COMPROVANTES_BUCKET } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/admin/orders — lista de pedidos (com link do comprovante). */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao listar pedidos:", error);
    return NextResponse.json({ error: "Erro ao carregar pedidos." }, { status: 500 });
  }

  const orders = (data ?? []) as Order[];

  // Gera URLs assinadas para os comprovantes (bucket é privado).
  const withUrls = await Promise.all(
    orders.map(async (o) => {
      let comprovanteUrl: string | null = null;
      if (o.comprovante_path) {
        const { data: signed } = await supabase.storage
          .from(COMPROVANTES_BUCKET)
          .createSignedUrl(o.comprovante_path, 60 * 60);
        comprovanteUrl = signed?.signedUrl ?? null;
      }
      return { ...o, comprovanteUrl };
    }),
  );

  const summary = {
    pending: orders.filter((o) => o.status === "pending").length,
    confirmed: orders.filter((o) => o.status === "confirmed").length,
    ticketsSold: orders
      .filter((o) => o.status === "confirmed")
      .reduce((s, o) => s + o.quantity, 0),
    revenueCents: orders
      .filter((o) => o.status === "confirmed")
      .reduce((s, o) => s + o.total_cents, 0),
  };

  return NextResponse.json({ orders: withUrls, summary });
}
