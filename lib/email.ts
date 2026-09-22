import "server-only";
import { Resend } from "resend";
import QRCode from "qrcode";
import { event, siteUrl } from "./config";
import { formatBRL } from "./format";
import type { Order, Ticket } from "./types";

/**
 * Envia o e-mail com os ingressos (um QR Code por ingresso).
 * Cada QR aponta para a URL de check-in, que a equipe da porta valida.
 */
export async function sendTicketEmail(
  order: Order,
  tickets: Ticket[],
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Flecha de Fogo <onboarding@resend.dev>";
  if (!apiKey) {
    throw new Error("RESEND_API_KEY não configurada.");
  }

  const resend = new Resend(apiKey);

  // Gera um PNG de QR por ingresso.
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
        content: png.toString("base64"),
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
      <div style="background:linear-gradient(180deg,#ff6a1a,#e8480d);padding:22px 26px;">
        <div style="color:#1a0d05;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">${event.tagline}</div>
        <div style="color:#1a0d05;font-size:24px;font-weight:900;margin-top:4px;">${event.title}</div>
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

  await resend.emails.send({
    from,
    to: order.buyer_email,
    subject: `🎟️ Seus ingressos — ${event.artist} na Flecha de Fogo`,
    html,
    attachments,
  });
}
