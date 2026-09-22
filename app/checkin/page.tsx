"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Seal } from "@/components/brand";

interface TicketInfo {
  code: string;
  checked_in: boolean;
  checked_in_at: string | null;
  order: { buyer_name: string; quantity: number; status: string } | null;
}
type Result =
  | { kind: "ok"; ticket: TicketInfo }
  | { kind: "already"; ticket: TicketInfo }
  | { kind: "found"; ticket: TicketInfo }
  | { kind: "notfound" }
  | null;

/** Extrai o código do ingresso do texto lido (URL com ?code=... ou o código puro). */
function extractCode(text: string): string {
  try {
    const url = new URL(text);
    const c = url.searchParams.get("code");
    if (c) return c.trim().toUpperCase();
  } catch {
    // não é URL — usa o texto direto
  }
  return text.trim().toUpperCase();
}

/** Leitor de QR pela câmera (usa html5-qrcode, carregado só no navegador). */
function QrScanner({
  onDecode,
  onCancel,
}: {
  onDecode: (text: string) => void;
  onCancel: () => void;
}) {
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(
    null,
  );
  const doneRef = useRef(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded: string) => {
            if (doneRef.current) return;
            doneRef.current = true;
            onDecode(decoded);
          },
          () => {},
        );
      } catch {
        if (!cancelled)
          setErr(
            "Não consegui acessar a câmera. Permita o acesso no navegador ou digite o código.",
          );
      }
    })();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) s.stop().then(() => s.clear()).catch(() => {});
    };
  }, [onDecode]);

  return (
    <div className="card mt-6 p-4">
      <div id="qr-reader" className="mx-auto w-full overflow-hidden rounded-xl" />
      {err ? (
        <p className="mt-3 text-sm text-[#ff9a80]">{err}</p>
      ) : (
        <p className="mt-3 text-center text-sm text-[var(--color-muted)]">
          Aponte a câmera para o QR Code do ingresso
        </p>
      )}
      <button
        onClick={onCancel}
        className="field mt-3 w-full rounded-full py-2.5 text-sm"
      >
        Cancelar
      </button>
    </div>
  );
}

function CheckinInner() {
  const search = useSearchParams();
  const urlCode = search.get("code") ?? "";

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [code, setCode] = useState(urlCode);
  const [result, setResult] = useState<Result>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);

  const checkAuth = useCallback(async () => {
    const res = await fetch("/api/checkin", { cache: "no-store" });
    setAuthed(res.status !== 401);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const lookup = useCallback(async (c: string) => {
    if (!c) return;
    setBusy(true);
    const res = await fetch(`/api/checkin?code=${encodeURIComponent(c)}`, {
      cache: "no-store",
    });
    setBusy(false);
    if (res.status === 404) return setResult({ kind: "notfound" });
    if (!res.ok) return;
    const data = await res.json();
    setResult({ kind: "found", ticket: data.ticket });
  }, []);

  // QR lido pela câmera → fecha o scanner, preenche e consulta.
  const handleScan = useCallback(
    (text: string) => {
      setScanning(false);
      const c = extractCode(text);
      setCode(c);
      setResult(null);
      lookup(c);
    },
    [lookup],
  );

  // Se veio código na URL (QR escaneado pela câmera nativa), consulta automaticamente.
  useEffect(() => {
    if (authed && urlCode) lookup(urlCode);
  }, [authed, urlCode, lookup]);

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
      setAuthed(true);
    } else {
      setLoginError("Senha incorreta.");
    }
  }

  async function confirmEntry(c: string) {
    setBusy(true);
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: c }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.status === 404) return setResult({ kind: "notfound" });
    if (data.status === "already") return setResult({ kind: "already", ticket: data.ticket });
    if (data.status === "ok") return setResult({ kind: "ok", ticket: data.ticket });
  }

  if (authed === null) return <Centered>Carregando…</Centered>;

  if (!authed) {
    return (
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16">
        <Seal size={56} className="mb-4" />
        <h1 className="font-display text-3xl text-flame">Check-in</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Acesso da equipe.</p>
        <form onSubmit={login} className="card mt-6 space-y-4 p-6">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="field w-full px-3 py-2.5"
            autoFocus
          />
          {loginError && <p className="text-sm text-[#ff9a80]">{loginError}</p>}
          <button className="btn-fire w-full rounded-full py-3 font-bold">Entrar</button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-flame">Check-in</h1>
        <Link href="/admin" className="text-sm text-[var(--color-muted)] hover:text-[var(--color-fire)]">
          Pedidos →
        </Link>
      </div>

      {scanning ? (
        <QrScanner onDecode={handleScan} onCancel={() => setScanning(false)} />
      ) : (
        <>
          <button
            onClick={() => {
              setResult(null);
              setScanning(true);
            }}
            className="btn-fire mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-base font-bold"
          >
            📷 Escanear QR Code
          </button>

          <div className="mt-4 flex items-center gap-3 text-xs text-[var(--color-muted)]">
            <span className="h-px flex-1 bg-[var(--color-line)]" />
            ou digite o código
            <span className="h-px flex-1 bg-[var(--color-line)]" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setResult(null);
              lookup(code.trim().toUpperCase());
            }}
            className="card mt-3 flex gap-2 p-4"
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código do ingresso"
              className="field w-full px-3 py-2.5 uppercase"
              autoCapitalize="characters"
            />
            <button disabled={busy} className="btn-fire shrink-0 rounded-lg px-5 font-bold">
              Buscar
            </button>
          </form>
        </>
      )}

      {result && (
        <div className="mt-5">
          {result.kind === "notfound" && (
            <ResultCard color="#ff9a80" emoji="❌" title="Ingresso não encontrado" />
          )}

          {result.kind === "already" && (
            <ResultCard color="#ff9a80" emoji="⚠️" title="JÁ UTILIZADO">
              <Details t={result.ticket} />
              {result.ticket.checked_in_at && (
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  Entrada registrada às{" "}
                  {new Date(result.ticket.checked_in_at).toLocaleTimeString("pt-BR")}
                </p>
              )}
            </ResultCard>
          )}

          {result.kind === "ok" && (
            <ResultCard color="#7ee081" emoji="✅" title="ENTRADA LIBERADA">
              <Details t={result.ticket} />
            </ResultCard>
          )}

          {result.kind === "found" && (
            <ResultCard
              color={result.ticket.checked_in ? "#ff9a80" : "#ffc247"}
              emoji={result.ticket.checked_in ? "⚠️" : "🎟️"}
              title={result.ticket.checked_in ? "JÁ UTILIZADO" : "Ingresso válido"}
            >
              <Details t={result.ticket} />
              {!result.ticket.checked_in && (
                <button
                  onClick={() => confirmEntry(result.ticket.code)}
                  disabled={busy}
                  className="btn-fire mt-4 w-full rounded-full py-3 font-bold"
                >
                  {busy ? "..." : "Confirmar entrada"}
                </button>
              )}
              {result.ticket.checked_in && result.ticket.checked_in_at && (
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  Entrada às{" "}
                  {new Date(result.ticket.checked_in_at).toLocaleTimeString("pt-BR")}
                </p>
              )}
            </ResultCard>
          )}
        </div>
      )}
    </main>
  );
}

function Details({ t }: { t: TicketInfo }) {
  return (
    <div className="mt-1 text-[var(--color-text)]">
      <p className="font-display text-2xl tracking-[2px] text-[var(--color-gold)]">
        {t.code}
      </p>
      {t.order && (
        <p className="text-[var(--color-muted)]">
          {t.order.buyer_name} · pedido de {t.order.quantity} ingresso(s)
        </p>
      )}
    </div>
  );
}

function ResultCard({
  color,
  emoji,
  title,
  children,
}: {
  color: string;
  emoji: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="card p-6 text-center"
      style={{ borderColor: color, boxShadow: `0 0 40px -12px ${color}` }}
    >
      <div className="text-5xl">{emoji}</div>
      <p className="font-display mt-2 text-2xl" style={{ color }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20 text-center text-[var(--color-muted)]">
      {children}
    </main>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={<Centered>Carregando…</Centered>}>
      <CheckinInner />
    </Suspense>
  );
}
