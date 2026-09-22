import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { ticketPriceCents, maxPerOrder } from "@/lib/config";
import { generateReference, isValidEmail, onlyDigits } from "@/lib/format";
import { sendAdminNotification } from "@/lib/email";

export const runtime = "nodejs";

/** POST /api/orders — cria um pedido (status "pending"). */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const phoneRaw = String(body.phone ?? "").trim();
  const phone = onlyDigits(phoneRaw);
  const quantity = Math.floor(Number(body.quantity));

  if (name.length < 2) {
    return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "E-mail inválido." }, { status: 400 });
  }
  if (phone.length < 10) {
    return NextResponse.json({ error: "Telefone inválido (com DDD)." }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > maxPerOrder) {
    return NextResponse.json(
      { error: `Quantidade deve ser entre 1 e ${maxPerOrder}.` },
      { status: 400 },
    );
  }

  // Preço vem SEMPRE do servidor — nunca confiar em valor do cliente.
  const unit = ticketPriceCents;
  const total = unit * quantity;

  const supabase = getSupabase();

  // Gera uma referência única (tenta algumas vezes em caso de colisão).
  let reference = generateReference();
  for (let attempt = 0; attempt < 5; attempt++) {
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
        status: "pending",
      })
      .select("reference")
      .single();

    if (!error && data) {
      // Avisa o organizador por e-mail (não bloqueia a resposta se falhar).
      try {
        await sendAdminNotification({
          reference: data.reference,
          buyerName: name,
          buyerEmail: email,
          buyerPhone: phone,
          quantity,
          totalCents: total,
          kind: "new",
        });
      } catch (e) {
        console.error("Falha ao notificar organizador (novo pedido):", e);
      }
      return NextResponse.json({ reference: data.reference });
    }
    // 23505 = unique_violation (referência repetida) → tenta outra
    if (error && error.code === "23505") {
      reference = generateReference();
      continue;
    }
    console.error("Erro ao criar pedido:", error);
    return NextResponse.json(
      { error: "Não foi possível criar o pedido. Tente novamente." },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { error: "Não foi possível gerar o pedido. Tente novamente." },
    { status: 500 },
  );
}
