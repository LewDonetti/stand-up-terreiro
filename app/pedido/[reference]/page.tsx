"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";
import { event } from "@/lib/config";
import { formatBRL } from "@/lib/format";

interface OrderData {
  reference: string;
  buyerName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  status: "pending" | "confirmed" | "cancelled";
  hasComprovante: boolean;
}
interface PixData {
  payload: string;
  key: string;
  name: string;
}

export default function PedidoPage() {
  const params = useParams<{ reference: string }>();
  const reference = params.reference;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [pix, setPix] = useState<PixData | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${reference}`, { cache: "no-store" });
    if (res.status === 404) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setOrder(data.order);
    setPix(data.pix);
    setLoading(false);
  }, [reference]);

  useEffect(() => {
    load();
  }, [load]);

  // Gera a imagem do QR a partir do payload Pix.
  useEffect(() => {
    if (pix?.payload) {
      QRCode.toDataURL(pix.payload, { margin: 1, width: 320 }).then(setQr);
    }
  }, [pix]);

  // Enquanto pendente, verifica o status a cada 12s.
  useEffect(() => {
    if (order?.status !== "pending") return;
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, [order?.status, load]);

  async function copy() {
    if (!pix) return;
    await navigator.clipboard.writeText(pix.payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/orders/${reference}/comprovante`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      setUploadMsg("Comprovante enviado! ✅");
      load();
    } else {
      setUploadMsg(data.error ?? "Falha ao enviar.");
    }
  }

  if (loading) {
    return <Centered>Carregando…</Centered>;
  }
  if (notFound || !order) {
    return (
      <Centered>
        <p className="text-[var(--color-muted)]">Pedido não encontrado.</p>
        <Link href="/comprar" className="btn-fire mt-4 rounded-full px-6 py-2.5 font-bold">
          Fazer novo pedido
        </Link>
      </Centered>
    );
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fire)]">
        ← início
      </Link>

      <p className="mt-4 text-sm text-[var(--color-muted)]">Pedido {order.reference}</p>
      <h1 className="font-display text-3xl text-flame">
        {order.status === "confirmed"
          ? "Pagamento confirmado! 🎉"
          : order.status === "cancelled"
            ? "Pedido cancelado"
            : "Pague com Pix"}
      </h1>

      {/* CONFIRMADO */}
      {order.status === "confirmed" && (
        <div className="card mt-6 p-6 text-center">
          <div className="text-5xl">🎟️</div>
          <p className="mt-4 text-[var(--color-text)]">
            Seus {order.quantity} ingresso(s) foram enviados para o seu e-mail com o
            QR Code de entrada.
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Não achou? Confira o spam ou fale com o terreiro no WhatsApp.
          </p>
          <a
            href={`https://wa.me/${event.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="btn-fire mt-5 inline-block rounded-full px-6 py-2.5 font-bold"
          >
            Falar no WhatsApp
          </a>
        </div>
      )}

      {/* CANCELADO */}
      {order.status === "cancelled" && (
        <div className="card mt-6 p-6 text-center">
          <p className="text-[var(--color-muted)]">
            Este pedido foi cancelado. Se foi engano, é só fazer um novo.
          </p>
          <Link href="/comprar" className="btn-fire mt-4 inline-block rounded-full px-6 py-2.5 font-bold">
            Novo pedido
          </Link>
        </div>
      )}

      {/* PENDENTE */}
      {order.status === "pending" && (
        <>
          <div className="card mt-6 p-6">
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-muted)]">
                {order.quantity} ingresso(s)
              </span>
              <span className="font-display text-2xl text-[var(--color-gold)]">
                {formatBRL(order.totalCents)}
              </span>
            </div>

            {qr && pix ? (
              <>
                <div className="mt-5 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qr}
                    alt="QR Code Pix"
                    className="rounded-xl border border-[var(--color-line)] bg-white p-2"
                    width={280}
                    height={280}
                  />
                </div>
                <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
                  Abra o app do seu banco → Pix → <b>Pagar com QR Code</b>, ou use o
                  copia e cola:
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    readOnly
                    value={pix.payload}
                    className="field w-full truncate px-3 py-2 text-xs text-[var(--color-muted)]"
                  />
                  <button
                    onClick={copy}
                    className="btn-fire shrink-0 rounded-lg px-4 py-2 text-sm font-bold"
                  >
                    {copied ? "Copiado!" : "Copiar"}
                  </button>
                </div>
                <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
                  Recebedor: <b className="text-[var(--color-text)]">{pix.name}</b> ·
                  chave {pix.key}
                </p>
              </>
            ) : (
              <p className="mt-5 rounded-lg bg-[rgba(255,46,18,0.12)] px-3 py-3 text-center text-sm text-[#ff9a80]">
                O Pix ainda não foi configurado pelo organizador. Fale no WhatsApp do
                terreiro para pagar.
              </p>
            )}
          </div>

          {/* Comprovante */}
          <div className="card mt-4 p-6">
            <h2 className="font-display text-lg text-[var(--color-gold)]">
              Já pagou? Envie o comprovante
            </h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Isso agiliza a confirmação. Assim que conferirmos, o ingresso vai pro
              seu e-mail.
            </p>
            {order.hasComprovante ? (
              <p className="mt-3 text-sm text-[#7ee081]">
                ✅ Comprovante recebido. Aguarde a confirmação (você pode fechar esta
                página).
              </p>
            ) : (
              <label className="btn-fire mt-4 inline-block cursor-pointer rounded-full px-6 py-2.5 text-sm font-bold">
                {uploading ? "Enviando…" : "Anexar comprovante"}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            )}
            {uploadMsg && (
              <p className="mt-3 text-sm text-[var(--color-muted)]">{uploadMsg}</p>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-[var(--color-muted)]">
            Esta página atualiza sozinha quando o pagamento for confirmado.
          </p>
        </>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
      {children}
    </main>
  );
}
