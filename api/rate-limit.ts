import { TRPCError } from "@trpc/server";

/**
 * Rate limit simples em memória (janela fixa), por chave (usuário ou IP).
 * Protege os endpoints que custam dinheiro ou CPU (IA, exportação) contra
 * abuso. Em múltiplas instâncias, troque por Redis — a interface é a mesma.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Evita crescimento ilimitado do mapa em processos longevos.
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Retorna true se a chamada é permitida; false se estourou o limite. */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

/** Versão tRPC: lança TOO_MANY_REQUESTS em vez de retornar boolean. */
export function rateLimitOrThrow(key: string, limit: number, windowMs: number): void {
  if (!allowRequest(key, limit, windowMs)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Muitas requisições. Aguarde alguns segundos e tente novamente.",
    });
  }
}
