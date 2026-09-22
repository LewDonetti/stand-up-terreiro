/** Utilidades de formatação e geração de códigos. */

/** Formata centavos como moeda BRL. Ex.: 4000 -> "R$ 40,00". */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Valor "50.00" (com ponto) para o payload Pix. */
export function reaisString(cents: number): string {
  return (cents / 100).toFixed(2);
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem I,O,0,1 (evita confusão)

/** Gera um código curto e legível. Ex.: "FLX-7QK4N". */
export function generateReference(prefix = "FLX"): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}-${code}`;
}

/** Gera um código de ingresso (para o QR de entrada). */
export function generateTicketCode(): string {
  let code = "";
  for (let i = 0; i < 10; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

/** Valida e-mail de forma simples. */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Deixa só dígitos (telefone). */
export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}
