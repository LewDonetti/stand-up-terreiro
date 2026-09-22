"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatBRL } from "@/lib/format";

interface AdminOrder {
  id: string;
  reference: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  quantity: number;
  total_cents: number;
  status: "pending" | "confirmed" | "cancelled";
  created_at: string;
  comprovanteUrl: string | null;
}
interface Summary {
  pending: number;
  confirmed: number;
  ticketsSold: number;
  revenueCents: number;
}

export default function AdminPage() {
  const [needLogin, setNeedLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    if (res.status === 401) {
      setNeedLogin(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setOrders(data.orders ?? []);
    setSummary(data.summary ?? null);
    setNeedLogin(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setPassword("");
      setLoading(true);
      fetchOrders();
    } else {
      const d = await res.json();
      setLoginError(d.error ?? "Senha incorreta.");
    }
  }

  async function action(id: string, kind: "confirm" | "cancel" | "resend") {
    if (kind === "cancel" && !confirm("Cancelar este pedido?")) return;
    setBusy(id + kind);
    const res = await fetch(`/api/admin/orders/${id}/${kind}`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      alert(data.error ?? "Erro.");
      return;
    }
    if (kind === "confirm" && data.emailSent === false) {
      alert("Pedido confirmado, mas o e-mail falhou. Use 'Reenviar e-mail'.");
    }
    if (kind === "resend") alert("E-mail reenviado.");
    fetchOrders();
  }

  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    setNeedLogin(true);
    setOrders([]);
  }

  if (loading) return <Centered>Carregando…</Centered>;

  if (needLogin) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
        <h1 className="font-display text-3xl text-flame">Painel do organizador</h1>
        <form onSubmit={login} className="card mt-6 space-y-4 p-6">
          <label className="block">
            <span className="mb-1.5 block text-sm text-[var(--color-muted)]">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field w-full px-3 py-2.5"
              autoFocus
            />
          </label>
          {loginError && <p className="text-sm text-[#ff9a80]">{loginError}</p>}
          <button className="btn-fire w-full rounded-full py-3 font-bold">Entrar</button>
        </form>
      </main>
    );
  }

  const pending = orders.filter((o) => o.status === "pending");
  const others = orders.filter((o) => o.status !== "pending");

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-flame">Pedidos</h1>
        <div className="flex items-center gap-3">
          <Link href="/checkin" className="text-sm text-[var(--color-fire)] hover:underline">
            Check-in →
          </Link>
          <button onClick={logout} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fire)]">
            Sair
          </button>
        </div>
      </div>

      {summary && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Pendentes" value={String(summary.pending)} />
          <Stat label="Confirmados" value={String(summary.confirmed)} />
          <Stat label="Ingressos" value={String(summary.ticketsSold)} />
          <Stat label="Arrecadado" value={formatBRL(summary.revenueCents)} />
        </div>
      )}

      <Section title={`A confirmar (${pending.length})`}>
        {pending.length === 0 && <Empty>Nenhum pedido aguardando.</Empty>}
        {pending.map((o) => (
          <OrderRow key={o.id} o={o} busy={busy} action={action} />
        ))}
      </Section>

      <Section title="Histórico">
        {others.length === 0 && <Empty>Ainda sem histórico.</Empty>}
        {others.map((o) => (
          <OrderRow key={o.id} o={o} busy={busy} action={action} />
        ))}
      </Section>
    </main>
  );
}

function OrderRow({
  o,
  busy,
  action,
}: {
  o: AdminOrder;
  busy: string | null;
  action: (id: string, kind: "confirm" | "cancel" | "resend") => void;
}) {
  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--color-text)]">{o.buyer_name}</span>
          <StatusBadge status={o.status} />
        </div>
        <p className="truncate text-sm text-[var(--color-muted)]">
          {o.buyer_email} · {o.buyer_phone}
        </p>
        <p className="text-sm text-[var(--color-muted)]">
          {o.quantity} ingresso(s) · {formatBRL(o.total_cents)} · {o.reference}
        </p>
        {o.comprovanteUrl && (
          <a
            href={o.comprovanteUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-[var(--color-fire)] hover:underline"
          >
            📎 ver comprovante
          </a>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {o.status === "pending" && (
          <>
            <button
              onClick={() => action(o.id, "confirm")}
              disabled={busy === o.id + "confirm"}
              className="btn-fire rounded-full px-4 py-2 text-sm font-bold"
            >
              {busy === o.id + "confirm" ? "..." : "Confirmar ✅"}
            </button>
            <button
              onClick={() => action(o.id, "cancel")}
              disabled={busy === o.id + "cancel"}
              className="field rounded-full px-4 py-2 text-sm"
            >
              Cancelar
            </button>
          </>
        )}
        {o.status === "confirmed" && (
          <button
            onClick={() => action(o.id, "resend")}
            disabled={busy === o.id + "resend"}
            className="field rounded-full px-4 py-2 text-sm"
          >
            {busy === o.id + "resend" ? "..." : "Reenviar e-mail"}
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminOrder["status"] }) {
  const map = {
    pending: { t: "pendente", c: "#ffc247" },
    confirmed: { t: "confirmado", c: "#7ee081" },
    cancelled: { t: "cancelado", c: "#ff9a80" },
  }[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs"
      style={{ backgroundColor: `${map.c}22`, color: map.c }}
    >
      {map.t}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-[var(--color-muted)]">{label}</div>
      <div className="font-display text-xl text-[var(--color-gold)]">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display mb-3 text-lg text-[var(--color-text)]">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[var(--color-muted)]">{children}</p>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20 text-center text-[var(--color-muted)]">
      {children}
    </main>
  );
}
