"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBRL } from "@/lib/format";

export default function CheckoutForm({
  priceCents,
  maxPerOrder,
  eventLine,
}: {
  priceCents: number;
  maxPerOrder: number;
  eventLine: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = priceCents * quantity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, quantity }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao criar o pedido.");
        setLoading(false);
        return;
      }
      router.push(`/pedido/${data.reference}`);
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <Link href="/" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fire)]">
        ← voltar
      </Link>

      <h1 className="font-display mt-4 text-4xl text-flame">Comprar ingresso</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">{eventLine}</p>

      <form onSubmit={handleSubmit} className="card mt-6 space-y-5 p-6">
        <Field label="Nome completo">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            className="field w-full px-3 py-2.5"
            autoComplete="name"
          />
        </Field>

        <Field label="E-mail (onde você recebe o ingresso)">
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@email.com"
            className="field w-full px-3 py-2.5"
            autoComplete="email"
          />
        </Field>

        <Field label="WhatsApp (com DDD)">
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(11) 99999-9999"
            className="field w-full px-3 py-2.5"
            inputMode="tel"
            autoComplete="tel"
          />
        </Field>

        <Field label="Quantidade">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="field h-10 w-10 text-xl font-bold"
              aria-label="Diminuir"
            >
              −
            </button>
            <span className="font-display w-8 text-center text-2xl text-[var(--color-text)]">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(maxPerOrder, q + 1))}
              className="field h-10 w-10 text-xl font-bold"
              aria-label="Aumentar"
            >
              +
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-4">
          <span className="text-[var(--color-muted)]">
            {quantity} × {formatBRL(priceCents)}
          </span>
          <span className="font-display text-2xl text-[var(--color-gold)]">
            {formatBRL(total)}
          </span>
        </div>

        {error && (
          <p className="rounded-lg bg-[rgba(255,46,18,0.12)] px-3 py-2 text-sm text-[#ff9a80]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-fire w-full rounded-full py-3.5 text-base font-bold"
        >
          {loading ? "Gerando pedido..." : "Ir para o pagamento Pix →"}
        </button>

        <p className="text-center text-xs text-[var(--color-muted)]">
          Você paga por Pix na próxima tela. O ingresso chega no seu e-mail após a
          confirmação.
        </p>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-[var(--color-muted)]">{label}</span>
      {children}
    </label>
  );
}
