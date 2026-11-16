import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { resumeDataSchema, resumeLanguages } from "@contracts/resume";
import { buildDocx, buildPdf, safeFileName } from "../export/document";
import { authenticateRequest } from "../kimi/auth";
import { allowRequest } from "../rate-limit";

export const exportRoutes = new Hono();

const limit = bodyLimit({
  maxSize: 256 * 1024,
  onError: (c) => c.json({ error: "Payload muito grande" }, 413),
});

for (const format of ["docx", "pdf"] as const) {
  exportRoutes.post(`/${format}`, limit, async (c) => {
    // Geração de documento consome CPU/memória: exige sessão e limita por usuário.
    let user;
    try {
      user = await authenticateRequest(c.req.raw.headers);
    } catch {
      return c.json({ error: "Não autenticado" }, 401);
    }
    if (!allowRequest(`export:${user.id}`, 30, 60_000)) {
      return c.json({ error: "Muitas exportações. Aguarde alguns segundos." }, 429);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "JSON inválido" }, 400);
    }
    const parsed = resumeDataSchema.safeParse((body as { data?: unknown })?.data);
    if (!parsed.success) {
      return c.json({ error: "Dados do currículo inválidos" }, 400);
    }
    const rawLang = (body as { language?: string })?.language ?? "pt-BR";
    const language = (resumeLanguages as readonly string[]).includes(rawLang)
      ? (rawLang as (typeof resumeLanguages)[number])
      : "pt-BR";

    const buffer =
      format === "docx"
        ? await buildDocx(parsed.data, language)
        : await buildPdf(parsed.data, language);

    const filename = safeFileName(parsed.data.fullName, format);
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          format === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
