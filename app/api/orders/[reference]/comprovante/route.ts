import { NextRequest, NextResponse } from "next/server";
import { getSupabase, COMPROVANTES_BUCKET } from "@/lib/supabase";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/** POST /api/orders/:reference/comprovante — anexa o comprovante do Pix. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const supabase = getSupabase();

  const { data: order, error: findErr } = await supabase
    .from("orders")
    .select("id, reference, status")
    .eq("reference", reference)
    .single();

  if (findErr || !order) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "Este pedido já foi processado." },
      { status: 409 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json(
      { error: "Envie uma imagem (JPG/PNG) ou PDF." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo muito grande (máx. 6 MB)." },
      { status: 400 },
    );
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${order.reference}/comprovante-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(COMPROVANTES_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: true });

  if (upErr) {
    console.error("Erro no upload:", upErr);
    return NextResponse.json({ error: "Falha ao enviar o arquivo." }, { status: 500 });
  }

  const { error: updErr } = await supabase
    .from("orders")
    .update({ comprovante_path: path })
    .eq("id", order.id);

  if (updErr) {
    console.error("Erro ao salvar comprovante:", updErr);
    return NextResponse.json({ error: "Falha ao registrar o comprovante." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
