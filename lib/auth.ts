import "server-only";
import { createHash } from "crypto";
import type { NextRequest } from "next/server";

/**
 * Autenticação bem simples para a área administrativa: uma única senha
 * (ADMIN_PASSWORD). Ao logar, guardamos um token derivado da senha num
 * cookie httpOnly — nunca a senha em si.
 */

export const ADMIN_COOKIE = "flx_admin";

function adminSecret(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

/** Token que vai no cookie (hash da senha). */
export function adminToken(): string {
  return createHash("sha256")
    .update(`flecha-de-fogo:${adminSecret()}`)
    .digest("hex");
}

/** Verifica a senha enviada no login. */
export function checkPassword(password: string): boolean {
  const secret = adminSecret();
  return secret.length > 0 && password === secret;
}

/** true se a requisição tem um cookie de admin válido. */
export function isAdmin(req: NextRequest): boolean {
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  return Boolean(token) && token === adminToken();
}
