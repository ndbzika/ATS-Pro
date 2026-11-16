import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { resumes } from "@db/schema";
import { getDb } from "./queries/connection";
import { createRouter, authedQuery } from "./middleware";
import { resumeDataSchema, resumeLanguages } from "@contracts/resume";
import { aiAtsCheck, aiTailorResume, heuristicAtsCheck } from "./ai/engine";
import { rateLimitOrThrow } from "./rate-limit";

const resumeInput = z.object({
  title: z.string().min(1).max(255),
  language: z.enum(resumeLanguages),
  data: resumeDataSchema,
  targetJobTitle: z.string().max(255).optional(),
  targetJobDescription: z.string().max(10000).optional(),
});

export const resumeRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, ctx.user.id))
      .orderBy(desc(resumes.updatedAt));
  }),

  get: authedQuery.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const db = getDb();
    const [row] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, input.id), eq(resumes.userId, ctx.user.id)));
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Currículo não encontrado." });
    return row;
  }),

  create: authedQuery.input(resumeInput).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const [result] = await db.insert(resumes).values({
      userId: ctx.user.id,
      title: input.title,
      language: input.language,
      data: input.data,
      targetJobTitle: input.targetJobTitle ?? null,
      targetJobDescription: input.targetJobDescription ?? null,
    });
    return { id: Number(result.insertId) };
  }),

  update: authedQuery
    .input(resumeInput.extend({ id: z.number(), atsScore: z.number().min(0).max(100).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const [existing] = await db
        .select({ id: resumes.id })
        .from(resumes)
        .where(and(eq(resumes.id, input.id), eq(resumes.userId, ctx.user.id)));
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Currículo não encontrado." });
      await db
        .update(resumes)
        .set({
          title: input.title,
          language: input.language,
          data: input.data,
          targetJobTitle: input.targetJobTitle ?? null,
          targetJobDescription: input.targetJobDescription ?? null,
          ...(input.atsScore !== undefined ? { atsScore: input.atsScore } : {}),
        })
        .where(eq(resumes.id, input.id));
      return { ok: true };
    }),

  remove: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    await db
      .delete(resumes)
      .where(and(eq(resumes.id, input.id), eq(resumes.userId, ctx.user.id)));
    return { ok: true };
  }),

  // Prévia instantânea do score (heurística local, sem IA)
  quickScore: authedQuery
    .input(z.object({ data: resumeDataSchema, jobDescription: z.string().optional() }))
    .query(({ input }) => heuristicAtsCheck(input.data, input.jobDescription)),

  // Verificação ATS completa com IA open source
  checkAts: authedQuery
    .input(
      z.object({
        data: resumeDataSchema,
        language: z.enum(resumeLanguages),
        jobDescription: z.string().max(10000).optional(),
      }),
    )
    .mutation(({ input, ctx }) => {
      // IA custa dinheiro (gateway da plataforma ou chave do usuário): limite por usuário.
      rateLimitOrThrow(`ai:check:${ctx.user.id}`, 10, 60_000);
      return aiAtsCheck(ctx.user.id, input.data, input.language, input.jobDescription);
    }),

  // Personalização do currículo para uma vaga específica
  tailorForJob: authedQuery
    .input(
      z.object({
        data: resumeDataSchema,
        language: z.enum(resumeLanguages),
        jobTitle: z.string().min(1).max(255),
        jobDescription: z.string().min(20).max(10000),
      }),
    )
    .mutation(({ input, ctx }) => {
      rateLimitOrThrow(`ai:tailor:${ctx.user.id}`, 6, 60_000);
      return aiTailorResume(ctx.user.id, input.data, input.language, input.jobTitle, input.jobDescription);
    }),
});
