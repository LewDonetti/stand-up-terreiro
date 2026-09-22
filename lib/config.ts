/**
 * Configuração central do evento.
 *
 * Os dados FIXOS do evento ficam aqui como constantes (fáceis de editar).
 * Os dados SENSÍVEIS (chave Pix, senhas, tokens) vêm de variáveis de
 * ambiente — nunca ficam no código. Veja .env.local.example.
 */

export const event = {
  artist: "Paulo Mansur",
  title: "Paulo Mansur na Tenda de Umbanda Flecha de Fogo",
  tagline: "Criador do 1º show de stand-up umbandista do Brasil",
  // Data/hora oficial (horário de Brasília)
  dateISO: "2026-10-03T20:00:00-03:00",
  dateLabel: "Sábado, 3 de outubro",
  timeLabel: "20h",
  venueName: "Tenda de Umbanda Flecha de Fogo",
  venueAddress:
    "Av. Dezenove de Janeiro, 200 - sobre loja - Vila Carrão, São Paulo - SP, 03447-040",
  whatsapp: "5511979602356", // WhatsApp do terreiro (contato/suporte)
  instagram: "https://www.instagram.com/tu.flechadefogo/",
} as const;

/** Preço unitário do ingresso em centavos. Ex.: 5000 = R$ 50,00. */
export const ticketPriceCents = Number(process.env.TICKET_PRICE_CENTS ?? 5000);

/** Máximo de ingressos por pedido. */
export const maxPerOrder = Number(process.env.MAX_PER_ORDER ?? 10);

/** Dados do recebedor Pix (a chave em si vem de env, nunca some no repo). */
export const pix = {
  key: process.env.PIX_KEY ?? "",
  // Nome do recebedor como aparece no Pix (máx. 25 caracteres)
  name: (process.env.PIX_NAME ?? "FLECHA DE FOGO").slice(0, 25),
  // Cidade do recebedor (máx. 15 caracteres)
  city: (process.env.PIX_CITY ?? "SAO PAULO").slice(0, 15),
} as const;

/** URL pública do site (usada em links de ingresso e check-in). */
export function siteUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

/** true quando as integrações essenciais estão configuradas. */
export function isConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      pix.key,
  );
}
