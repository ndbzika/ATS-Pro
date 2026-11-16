import { createKimiGateway, listModels } from "./ai-client";

let cached: ReturnType<typeof createKimiGateway> | undefined;

export function kimiGw(modelId: string) {
  cached ??= createKimiGateway();
  return cached(modelId);
}

/**
 * Escolhe o modelo para as análises. O usuário pediu uma IA open source
 * confiável: preferimos modelos de pesos abertos presentes na lista do
 * gateway (Kimi K2, DeepSeek, Qwen, Llama, Mistral...). Se nenhum estiver
 * disponível, caímos no modelo padrão do gateway — nunca hardcodamos id.
 */
export async function pickModel(): Promise<{ modelId: string; openSource: boolean }> {
  const { models, defaultModelId } = await listModels();
  const openPatterns = [
    /^k2/i, // família Kimi K2 — pesos abertos (Modified MIT)
    /kimi[- ]?k2/i,
    /deepseek/i,
    /qwen/i,
    /llama/i,
    /mistral|mixtral/i,
    /gpt-oss/i,
    /gemma/i,
  ];
  for (const pattern of openPatterns) {
    const found = models.find((m) => pattern.test(m.id) || (m.displayName && pattern.test(m.displayName)));
    if (found) return { modelId: found.id, openSource: true };
  }
  return { modelId: defaultModelId, openSource: false };
}
