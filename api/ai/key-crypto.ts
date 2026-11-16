import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../lib/env";

/**
 * Criptografia simétrica para as chaves de API dos usuários (BYOK).
 *
 * - AES-256-GCM: confidencialidade + integridade (tag de autenticação).
 * - A chave mestra é derivada de APP_SECRET (segredo do servidor, nunca vai ao
 *   browser). Mesmo com acesso de leitura ao banco, as chaves ficam ilegíveis.
 * - Formato persistido: `v1.<iv>.<tag>.<cipher>` (tudo base64) — versionado
 *   para permitir rotação futura de algoritmo/chave.
 */

const VERSION = "v1";

function masterKey(): Buffer {
  const secret = env.appSecret;
  if (!secret) {
    throw new Error("APP_SECRET ausente: não é possível proteger chaves de usuários.");
  }
  return createHash("sha256").update(`${secret}|ai-byok-keys`, "utf8").digest();
}

export function encryptApiKey(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64"), tag.toString("base64"), data.toString("base64")].join(".");
}

export function decryptApiKey(stored: string): string {
  const [version, ivB64, tagB64, dataB64] = stored.split(".");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Formato de chave criptografada inválido.");
  }
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

/** Máscara segura para exibição: nunca expõe mais que os 4 últimos caracteres. */
export function maskApiKey(plain: string): string {
  const tail = plain.slice(-4);
  return `••••${tail}`;
}
