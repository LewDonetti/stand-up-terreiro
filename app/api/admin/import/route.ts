import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/auth";
import { ticketPriceCents } from "@/lib/config";
import { generateReference, generateTicketCode, isValidEmail, onlyDigits } from "@/lib/format";
import { sendTicketEmail } from "@/lib/email";
import type { Order, Ticket } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/admin/import — cadastra vendas ANTIGAS (já pagas) em lote:
 * cria o pedido já CONFIRMADO, gera os ingressos e envia o e-mail com o QR.
 * Body: { buyers: [{ name?, email, quantity, phone? }] }
 */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  let body: { buyers?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const buyers = Array.isArray(body.buyers) ? body.buyers : null;
  if (!buyers || buyers.length === 0) {
    return NextResponse.json({ error: "Envie a lista em 'buyers'." }, { status: 400 });
  }

  const supabase = getSupabase();
  const results: Array<Record<string, unknown>> = [];

  for (const raw of buyers) {
    const b = raw as Record<string, unknown>;
    const email = String(b.email ?? "").trim().toLowerCase();
    const name = String(b.name ?? "").trim() || (email ? email.split("@")[0] : "Convidado");
    const phone = onlyDigits(String(b.phone ?? ""));
    const quantity = Math.floor(Number(b.quantity ?? 1));

    if (!isValidEmail(email)) {
      results.push({ email, status: "erro", error: "e-mail inválido" });
      continue;
    }
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 50) {
      results.push({ email, status: "erro", error: "quantidade inválida" });
      continue;
    }

    const unit = ticketPriceCents;
    const total = unit * quantity;

    // Cria o pedido já confirmado.
    let order: Order | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const reference = generateReference();
      const { data, error } = await supabase
        .from("orders")
        .insert({
          reference,
          buyer_name: name,
          buyer_email: email,
          buyer_phone: phone,
          quantity,
          unit_price_cents: unit,
          total_cents: total,
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
        })
        .select("*")
        .single<Order>();
      if (!error && data) {
        order = data;
        break;
      }
      if (error && error.code === "23505") continue;
      results.push({ email, status: "erro", error: "falha ao criar pedido" });
      break;
    }
    if (!order) {
      if (!results.find((r) => r.email === email && r.status === "erro")) {
        results.push({ email, status: "erro", error: "falha ao criar pedido" });
      }
      continue;
    }

    // Gera os ingressos.
    let tickets: Ticket[] = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const rows = Array.from({ length: quantity }, () => ({
        order_id: order!.id,
        code: generateTicketCode(),
      }));
      const { data, error } = await supabase.from("tickets").insert(rows).select("*");
      if (!error && data) {
        tickets = data as Ticket[];
        break;
      }
      if (error && error.code === "23505") continue;
      break;
    }
    if (tickets.length === 0) {
      results.push({ email, reference: order.reference, status: "erro", error: "falha ao gerar ingressos" });
      continue;
    }

    // Envia o e-mail com os ingressos.
    let emailSent = true;
    let emailError: string | undefined;
    try {
      await sendTicketEmail(order, tickets);
    } catch (e) {
      emailSent = false;
      emailError = e instanceof Error ? e.message : String(e);
      console.error("Erro ao enviar e-mail (import):", e);
    }

    results.push({
      email,
      name,
      reference: order.reference,
      tickets: tickets.length,
      emailSent,
      ...(emailError ? { emailError } : {}),
      status: emailSent ? "ok" : "pedido criado, e-mail falhou",
    });
  }

  const summary = {
    total: results.length,
    ok: results.filter((r) => r.status === "ok").length,
    falhas: results.filter((r) => r.status !== "ok").length,
    ingressos: results.reduce((s, r) => s + (Number(r.tickets) || 0), 0),
  };

  return NextResponse.json({ summary, results });
}
