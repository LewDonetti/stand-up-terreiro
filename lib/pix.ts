/**
 * Gera o payload "Pix Copia e Cola" (BR Code / padrão EMV do Banco Central)
 * para um Pix estático com valor e identificador (txid) já preenchidos.
 *
 * Assim o comprador só escaneia/cola e o valor + referência já vêm certos,
 * facilitando a conferência no extrato — tudo direto na chave do recebedor,
 * sem intermediário e sem taxa.
 */

function emv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/** CRC16/CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF). */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Remove acentos e caracteres não permitidos em nome/cidade. */
function sanitizeText(s: string, max: number): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .slice(0, max);
}

/** txid: apenas alfanumérico, máx. 25. */
function sanitizeTxid(s: string): string {
  const clean = s.replace(/[^A-Za-z0-9]/g, "").slice(0, 25);
  return clean.length ? clean : "***";
}

export interface PixParams {
  key: string;
  name: string;
  city: string;
  amountCents: number;
  txid: string;
}

export function buildPixPayload({
  key,
  name,
  city,
  amountCents,
  txid,
}: PixParams): string {
  const merchantAccount = emv(
    "26",
    emv("00", "br.gov.bcb.pix") + emv("01", key),
  );
  const additionalData = emv("62", emv("05", sanitizeTxid(txid)));

  let payload =
    emv("00", "01") + // Payload Format Indicator
    merchantAccount +
    emv("52", "0000") + // Merchant Category Code
    emv("53", "986") + // Moeda: BRL
    emv("54", (amountCents / 100).toFixed(2)) + // Valor
    emv("58", "BR") + // País
    emv("59", sanitizeText(name, 25)) + // Nome do recebedor
    emv("60", sanitizeText(city, 15)) + // Cidade
    additionalData +
    "6304"; // ID + tamanho do CRC (o valor vem em seguida)

  payload += crc16(payload);
  return payload;
}
