import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";

export const runtime = "nodejs";

async function lookup(code: string) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("tickets")
    .select(
      "id, code, checked_in, checked_in_at, order:orders(reference, buyer_name, quantity, status)",
    )
    .eq("code", code)
    .single();
  return data as
    | {
        id: string;
        code: string;
        checked_in: boolean;
        checked_in_at: string | null;
        order: {
          reference: string;
          buyer_name: string;
          quantity: number;
          status: string;
        } | null;
      }
    | null;
}

/** GET /api/checkin?code=XXX — consulta um ingresso (sem marcar entrada). */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const code = req.nextUrl.searchParams.get("code")?.trim().toUpperCase() ?? "";
  if (!code) {
    return NextResponse.json({ error: "Código não informado." }, { status: 400 });
  }
  const ticket = await lookup(code);
  if (!ticket) {
    return NextResponse.json({ error: "Ingresso não encontrado.", found: false }, { status: 404 });
  }
  return NextResponse.json({ found: true, ticket });
}

/** POST /api/checkin — marca a entrada de um ingresso. */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const code = String(body.code ?? "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Código não informado." }, { status: 400 });
  }

  const ticket = await lookup(code);
  if (!ticket) {
    return NextResponse.json({ error: "Ingresso não encontrado.", found: false }, { status: 404 });
  }

  if (ticket.checked_in) {
    return NextResponse.json({
      status: "already",
      ticket,
      message: "Este ingresso JÁ foi utilizado.",
    });
  }

  const supabase = getSupabase();
  const when = new Date().toISOString();
  const { error } = await supabase
    .from("tickets")
    .update({ checked_in: true, checked_in_at: when })
    .eq("id", ticket.id)
    .eq("checked_in", false); // evita corrida: só atualiza se ainda não entrou

  if (error) {
    return NextResponse.json({ error: "Falha ao registrar entrada." }, { status: 500 });
  }

  return NextResponse.json({
    status: "ok",
    ticket: { ...ticket, checked_in: true, checked_in_at: when },
    message: "Entrada liberada!",
  });
}
