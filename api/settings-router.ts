import { z } from "zod";
import { generateText } from "ai";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { getDb } from "./queries/connection";
import { userAiSettings } from "@db/schema";
import { createRouter, authedQuery } from "./middleware";
import { encryptApiKey, decryptApiKey, maskApiKey } from "./ai/key-crypto";
import { AI_PROVIDERS, buildUserModelForTest, type AiProviderId } from "./ai/providers";
import { rateLimitOrThrow } from "./rate-limit";

const providerSchema = z.enum(["openai", "anthropic", "kimi"]);
const apiKeySchema = z
  .string()
  .trim()
  .min(16, "Chave de API muito curta.")
  .max(256, "Chave de API muito longa.")
  // Sem espaços/quebras de linha — evita colar texto errado e mitiga log injection.
  .regex(/^\S+$/, "A chave não pode conter espaços.");
const modelSchema = z.string().trim().min(2).max(120).regex(/^[\w./:-]+$/, "Nome de modelo inválido.");

export const settingsRouter = createRouter({
  /** Estado atual da configuração — a chave NUNCA sai do servidor em claro. */
  ai: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(userAiSettings)
      .where(eq(userAiSettings.userId, ctx.user.id))
      .limit(1);
    const settings = rows[0];
    if (!settings) {
      return {
        configured: false as const,
        providers: AI_PROVIDERS,
      };
    }
    return {
      configured: true as const,
      provider: settings.provider as AiProviderId,
      model: settings.model,
      maskedKey: maskApiKey(decryptApiKey(settings.encryptedKey)),
      providers: AI_PROVIDERS,
    };
  }),

  saveAi: authedQuery
    .input(z.object({ provider: providerSchema, apiKey: apiKeySchema, model: modelSchema }))
    .mutation(async ({ ctx, input }) => {
      rateLimitOrThrow(`settings:save:${ctx.user.id}`, 20, 60_000);
      const db = getDb();
      const encryptedKey = encryptApiKey(input.apiKey);
      await db
        .insert(userAiSettings)
        .values({ userId: ctx.user.id, provider: input.provider, encryptedKey, model: input.model })
        .onDuplicateKeyUpdate({
          set: { provider: input.provider, encryptedKey, model: input.model },
        });
      return { ok: true as const };
    }),

  /** Testa a chave ANTES de salvar, com uma chamada mínima. */
  testAi: authedQuery
    .input(z.object({ provider: providerSchema, apiKey: apiKeySchema, model: modelSchema }))
    .mutation(async ({ ctx, input }) => {
      rateLimitOrThrow(`settings:test:${ctx.user.id}`, 10, 60_000);
      try {
        const model = buildUserModelForTest(input.provider, input.apiKey, input.model);
        await generateText({ model, prompt: "Responda apenas: ok", maxOutputTokens: 8 });
        return { ok: true as const };
      } catch (err) {
        // Nunca devolver o corpo bruto do provedor (pode ecoar a chave).
        const status = (err as { statusCode?: number; status?: number })?.statusCode
          ?? (err as { status?: number })?.status;
        let message = "Falha ao conectar. Verifique provedor, chave e modelo.";
        if (status === 401 || status === 403) message = "Chave de API inválida ou sem permissão.";
        else if (status === 404) message = "Modelo não encontrado — confira o nome exato.";
        else if (status === 429) message = "Limite de requisições do provedor atingido. Tente em instantes.";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),

  removeAi: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db.delete(userAiSettings).where(eq(userAiSettings.userId, ctx.user.id));
    return { ok: true as const };
  }),
});
