import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { eq } from "drizzle-orm";
import type { LanguageModel } from "ai";
import { getDb } from "../queries/connection";
import { userAiSettings } from "@db/schema";
import { decryptApiKey } from "./key-crypto";
import { listModels } from "./ai-client";
import { kimiGw, pickModel } from "./provider";

/**
 * Resolução da IA usada nas análises, em duas fontes:
 *
 * 1. BYOK (preferida): o usuário configurou provedor + chave próprios
 *    (OpenAI / Claude / Kimi). A chamada sai direto para o provedor com a
 *    chave do usuário — a cota consumida é DELE, nunca a do dono do site.
 * 2. Gateway da plataforma (fallback): modelo open source via listModels(),
 *    cobrado do dono do site.
 *
 * Segurança: a chave descriptografada existe apenas em memória, no servidor,
 * durante a montagem do provider. Nunca é logada, retornada à API ou enviada
 * ao browser (o router de settings devolve apenas a versão mascarada).
 * Os endpoints dos provedores são fixos (sem URL custom) para impedir SSRF
 * (apontar a "chave" para um host interno que vaze o conteúdo das análises).
 */

export type AiProviderId = "openai" | "anthropic" | "kimi";

export const AI_PROVIDERS: Record<
  AiProviderId,
  { label: string; modelPlaceholder: string; docsUrl: string }
> = {
  openai: {
    label: "OpenAI (ChatGPT)",
    modelPlaceholder: "ex.: gpt-4o-mini",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    label: "Claude (Anthropic)",
    modelPlaceholder: "ex.: claude-sonnet-4-5",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  kimi: {
    label: "Kimi (Moonshot AI)",
    modelPlaceholder: "ex.: kimi-k2-0905-preview",
    docsUrl: "https://platform.moonshot.ai/console/api-keys",
  },
};

export type ResolvedAi = {
  model: LanguageModel;
  modelId: string;
  /** true = chave do próprio usuário (não desconta do dono do site) */
  byok: boolean;
  /** nome amigável para exibir na UI */
  sourceLabel: string;
  openSource: boolean;
};

function buildUserModel(provider: AiProviderId, apiKey: string, modelId: string): LanguageModel {
  switch (provider) {
    case "openai":
      return createOpenAICompatible({
        name: "openai",
        baseURL: "https://api.openai.com/v1",
        apiKey,
      })(modelId);
    case "kimi":
      return createOpenAICompatible({
        name: "kimi",
        baseURL: "https://api.moonshot.ai/v1",
        apiKey,
      })(modelId);
    case "anthropic":
      return createAnthropic({ apiKey })(modelId);
  }
}

export async function resolveAiForUser(userId: number): Promise<ResolvedAi> {
  const db = getDb();
  const rows = await db
    .select()
    .from(userAiSettings)
    .where(eq(userAiSettings.userId, userId))
    .limit(1);

  const settings = rows[0];
  if (settings) {
    const apiKey = decryptApiKey(settings.encryptedKey);
    const provider = settings.provider as AiProviderId;
    return {
      model: buildUserModel(provider, apiKey, settings.model),
      modelId: settings.model,
      byok: true,
      sourceLabel: AI_PROVIDERS[provider]?.label ?? provider,
      openSource: provider === "kimi", // Kimi K2 = pesos abertos
    };
  }

  const { modelId, openSource } = await pickModel();
  return {
    model: kimiGw(modelId),
    modelId,
    byok: false,
    sourceLabel: "plataforma",
    openSource,
  };
}

/** Instância pontual para o botão "Testar conexão" (antes de salvar). */
export function buildUserModelForTest(
  provider: AiProviderId,
  apiKey: string,
  modelId: string,
): LanguageModel {
  return buildUserModel(provider, apiKey, modelId);
}

export { listModels };
