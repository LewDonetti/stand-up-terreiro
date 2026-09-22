import "server-only";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import { event, siteUrl } from "./config";
import { formatBRL } from "./format";
import type { Order, Ticket } from "./types";

/**
 * Envia o e-mail com os ingressos (um QR Code por ingresso) via Gmail (SMTP).
 * Requer GMAIL_USER e GMAIL_APP_PASSWORD (senha de app do Google) no ambiente.
 * Cada QR aponta para a URL de check-in, que a equipe da porta valida.
 */
export async function sendTicketEmail(
  order: Order,
  tickets: Ticket[],
): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const from = process.env.EMAIL_FROM ?? `Flecha de Fogo <${user ?? ""}>`;
  if (!user || !pass) {
    throw new Error("Gmail não configurado: defina GMAIL_USER e GMAIL_APP_PASSWORD.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  // Gera um PNG de QR por ingresso (anexado ao e-mail).
  const attachments = await Promise.all(
    tickets.map(async (t, i) => {
      const checkinUrl = `${siteUrl()}/checkin?code=${encodeURIComponent(t.code)}`;
      const png = await QRCode.toBuffer(checkinUrl, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 480,
        color: { dark: "#1a0d05", light: "#ffffff" },
      });
      return {
        filename: `ingresso-${i + 1}-${t.code}.png`,
        content: png,
      };
    }),
  );

  const ticketLinks = tickets
    .map(
      (t, i) =>
        `<tr><td style="padding:6px 0;color:#f8efe6;font-size:15px;">🎟️ Ingresso ${
          i + 1
        } — código <b style="color:#ffc247;letter-spacing:1px;">${t.code}</b> — <a href="${siteUrl()}/ingresso/${
          t.code
        }" style="color:#ff8c3a;">ver ingresso</a></td></tr>`,
    )
    .join("");

  const html = `
  <div style="background:#0b0705;padding:28px 0;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#1c1512;border:1px solid #3a2a20;border-radius:16px;overflow:hidden;">
      <div style="height:4px;background:linear-gradient(90deg,#7b2ff7,#2f6bff,#16a34a,#ffc247,#ff6a1a,#ff2e12,#ff4fa3);"></div>
      <div style="background:linear-gradient(180deg,#ff6a1a,#e8480d);padding:22px 26px;text-align:center;">
        <img src="${siteUrl()}/logo.jpg" alt="Flecha de Fogo" width="64" height="64" style="border-radius:50%;background:#fbf6ee;display:inline-block;" />
        <div style="color:#1a0d05;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin-top:8px;">${event.tagline}</div>
        <div style="color:#1a0d05;font-size:22px;font-weight:900;margin-top:2px;">${event.title}</div>
      </div>
      <div style="padding:26px;color:#f8efe6;">
        <p style="font-size:16px;margin:0 0 16px;">Olá, ${order.buyer_name.split(" ")[0]}! Pagamento confirmado ✅</p>
        <p style="font-size:15px;color:#b7a396;margin:0 0 20px;">
          Seu${tickets.length > 1 ? "s" : ""} ingresso${tickets.length > 1 ? "s estão" : " está"} garantido${tickets.length > 1 ? "s" : ""}.
          O QR Code de cada ingresso está anexado neste e-mail — é só apresentar na entrada.
        </p>

        <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
          <tr><td style="padding:6px 0;color:#b7a396;font-size:14px;">📅 Data</td><td style="padding:6px 0;color:#f8efe6;font-size:14px;text-align:right;">${event.dateLabel}, ${event.timeLabel}</td></tr>
          <tr><td style="padding:6px 0;color:#b7a396;font-size:14px;">📍 Local</td><td style="padding:6px 0;color:#f8efe6;font-size:14px;text-align:right;">${event.venueName}</td></tr>
          <tr><td style="padding:6px 0;color:#b7a396;font-size:14px;"> </td><td style="padding:6px 0;color:#f8efe6;font-size:14px;text-align:right;">${event.venueAddress}</td></tr>
          <tr><td style="padding:6px 0;color:#b7a396;font-size:14px;">🎟️ Ingressos</td><td style="padding:6px 0;color:#f8efe6;font-size:14px;text-align:right;">${order.quantity} · ${formatBRL(order.total_cents)}</td></tr>
        </table>

        <div style="border-top:1px solid #3a2a20;padding-top:16px;">
          <table style="width:100%;border-collapse:collapse;">${ticketLinks}</table>
        </div>

        <p style="font-size:13px;color:#7d6a5e;margin:22px 0 0;">
          Pedido ${order.reference}. Dúvidas? Fale com o terreiro no WhatsApp.
        </p>
      </div>
    </div>
  </div>`;

  await transporter.sendMail({
    from,
    to: order.buyer_email,
    subject: `🎟️ Seus ingressos — ${event.artist} na Flecha de Fogo`,
    html,
    attachments,
  });
}

/**
 * Avisa o organizador (ADMIN_NOTIFY_EMAIL) por e-mail quando entra um novo
 * pedido ou quando um comprovante é anexado. Best-effort: se não estiver
 * configurado, não faz nada e não quebra o fluxo.
 */
export async function sendAdminNotification(info: {
  reference: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  quantity: number;
  totalCents: number;
  kind: "new" | "comprovante";
  comprovanteUrl?: string | null;
}): Promise<void> {
  const to = process.env.ADMIN_NOTIFY_EMAIL;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!to || !user || !pass) return; // sem config → não notifica (silencioso)

  const from = process.env.EMAIL_FROM ?? `Flecha de Fogo <${user}>`;
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const isComp = info.kind === "comprovante";
  const adminUrl = `${siteUrl()}/admin`;
  const subject = isComp
    ? `📎 Comprovante recebido — ${info.buyerName} (${info.reference})`
    : `🎟️ Novo pedido — ${info.buyerName} (${info.reference})`;

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#0b0705;padding:24px;">
    <div style="max-width:520px;margin:0 auto;background:#1c1512;border:1px solid #3a2a20;border-radius:14px;overflow:hidden;">
      <div style="height:4px;background:linear-gradient(90deg,#7b2ff7,#2f6bff,#16a34a,#ffc247,#ff6a1a,#ff2e12,#ff4fa3);"></div>
      <div style="padding:22px;color:#f8efe6;">
        <div style="font-size:18px;font-weight:bold;color:#ffc247;">${isComp ? "Comprovante recebido 📎" : "Novo pedido recebido 🎟️"}</div>
        <p style="font-size:14px;color:#b7a396;margin:6px 0 16px;">${isComp ? "A pessoa enviou o comprovante — confira o valor e confirme." : "Aguardando o pagamento/comprovante."}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:4px 0;color:#b7a396;">Comprador</td><td style="padding:4px 0;text-align:right;">${info.buyerName}</td></tr>
          <tr><td style="padding:4px 0;color:#b7a396;">E-mail</td><td style="padding:4px 0;text-align:right;">${info.buyerEmail}</td></tr>
          <tr><td style="padding:4px 0;color:#b7a396;">WhatsApp</td><td style="padding:4px 0;text-align:right;">${info.buyerPhone}</td></tr>
          <tr><td style="padding:4px 0;color:#b7a396;">Ingressos</td><td style="padding:4px 0;text-align:right;">${info.quantity} · ${formatBRL(info.totalCents)}</td></tr>
          <tr><td style="padding:4px 0;color:#b7a396;">Pedido</td><td style="padding:4px 0;text-align:right;">${info.reference}</td></tr>
        </table>
        ${info.comprovanteUrl ? `<p style="margin:14px 0 0;"><a href="${info.comprovanteUrl}" style="color:#ff8c3a;">📎 Ver comprovante</a></p>` : ""}
        <a href="${adminUrl}" style="display:inline-block;margin-top:18px;background:linear-gradient(180deg,#ff6a1a,#e8480d);color:#1a0d05;font-weight:bold;text-decoration:none;padding:12px 22px;border-radius:999px;">Abrir painel e confirmar</a>
      </div>
    </div>
  </div>`;

  await transporter.sendMail({ from, to, subject, html });
}
