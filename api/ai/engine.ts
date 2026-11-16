import { generateObject } from "ai";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  atsIssueSchema,
  tailorResultSchema,
  type AtsAnalysis,
  type AtsIssue,
  type ResumeData,
  type TailorResult,
} from "@contracts/resume";
import { classifyAiError } from "./ai-client";
import { resolveAiForUser } from "./providers";

// ---------- Análise heurística local (sempre disponível) ----------

const PT_ACTION_VERBS = [
  "desenvolvi", "desenvolveu", "arquitetei", "implementei", "liderei", "criei",
  "otimizei", "colaborei", "entreguei", "construí", "reduzi", "aumentei",
  "automatizei", "integrei", "migrei", "projetei", "lancei", "melhorei",
];
const EN_ACTION_VERBS = [
  "developed", "architected", "implemented", "led", "created", "optimized",
  "collaborated", "delivered", "built", "reduced", "increased", "automated",
  "integrated", "migrated", "designed", "launched", "improved",
];

export function heuristicAtsCheck(data: ResumeData, jobDescription?: string): {
  score: number;
  issues: AtsIssue[];
  strengths: string[];
} {
  const issues: AtsIssue[] = [];
  const strengths: string[] = [];
  let score = 100;

  const penalize = (points: number, issue: AtsIssue) => {
    score -= points;
    issues.push(issue);
  };

  // Contato
  if (!data.fullName.trim()) penalize(15, { severity: "critico", section: "Contato", message: "Nome completo ausente.", suggestion: "Preencha seu nome completo — é o identificador principal no ATS." });
  if (!/^\S+@\S+\.\S+$/.test(data.email)) penalize(15, { severity: "critico", section: "Contato", message: "E-mail ausente ou inválido.", suggestion: "Informe um e-mail válido; ATS e recrutadores o usam como contato principal." });
  if (!data.phone.trim()) penalize(8, { severity: "atencao", section: "Contato", message: "Telefone ausente.", suggestion: "Inclua um telefone com DDD." });
  if (!data.location.trim()) penalize(5, { severity: "dica", section: "Contato", message: "Localização ausente.", suggestion: "Cidade/estado ajudam em filtros por região e vagas híbridas." });
  if (data.fullName && data.email) strengths.push("Dados de contato essenciais presentes.");

  // Objetivo
  const obj = data.objective.trim();
  if (!obj) penalize(10, { severity: "atencao", section: "Objetivo", message: "Objetivo profissional vazio.", suggestion: "Escreva 2–4 linhas com cargo-alvo, stack e valor que você entrega." });
  else if (obj.length < 80) penalize(4, { severity: "dica", section: "Objetivo", message: "Objetivo muito curto.", suggestion: "Use 80–400 caracteres com palavras-chave do seu cargo-alvo." });
  else strengths.push("Objetivo profissional bem dimensionado.");

  // Experiências
  if (data.experiences.length === 0) {
    penalize(20, { severity: "critico", section: "Experiência", message: "Nenhuma experiência profissional.", suggestion: "Adicione ao menos uma experiência com cargo, empresa, período e atividades." });
  } else {
    strengths.push(`${data.experiences.length} experiência(s) profissional(is) listada(s).`);
    data.experiences.forEach((exp, i) => {
      const label = exp.role || exp.company || `#${i + 1}`;
      if (!exp.role.trim() || !exp.company.trim()) penalize(6, { severity: "atencao", section: "Experiência", message: `Experiência ${label}: cargo ou empresa ausente.`, suggestion: "Cargo e empresa são campos obrigatórios para o ATS indexar a experiência." });
      if (!exp.startDate.trim()) penalize(5, { severity: "atencao", section: "Experiência", message: `Experiência ${label}: data de início ausente.`, suggestion: "Use formato MM/AAAA — parsers de ATS reconhecem melhor." });
      const desc = exp.description.trim();
      if (desc.length < 50) penalize(6, { severity: "atencao", section: "Experiência", message: `Experiência ${label}: descrição muito curta.`, suggestion: "Descreva 3–6 realizações por cargo, iniciando com verbos de ação." });
      const lower = desc.toLowerCase();
      const hasVerb = [...PT_ACTION_VERBS, ...EN_ACTION_VERBS].some((v) => lower.includes(v));
      if (desc && !hasVerb) penalize(3, { severity: "dica", section: "Experiência", message: `Experiência ${label}: poucos verbos de ação.`, suggestion: "Comece frases com verbos como desenvolvi, implementei, otimizei." });
      if (desc && !/\d/.test(desc)) penalize(3, { severity: "dica", section: "Experiência", message: `Experiência ${label}: sem números/métricas.`, suggestion: "Inclua resultados quantificados (ex.: +35% de performance, 5M usuários)." });
    });
  }

  // Formação
  if (data.education.length === 0) penalize(8, { severity: "atencao", section: "Formação", message: "Formação acadêmica ausente.", suggestion: "Adicione curso, instituição e período." });

  // Habilidades
  const skillsCount = (data.technicalSkills + "," + data.softSkills).split(/[,;\n•]/).map((s) => s.trim()).filter(Boolean).length;
  if (skillsCount === 0) penalize(12, { severity: "critico", section: "Habilidades", message: "Nenhuma habilidade listada.", suggestion: "Liste tecnologias e competências separadas por vírgula — são as principais palavras-chave do ATS." });
  else if (skillsCount < 6) penalize(5, { severity: "dica", section: "Habilidades", message: "Poucas habilidades listadas.", suggestion: "Inclua 8–15 habilidades relevantes para a vaga-alvo." });
  else strengths.push(`${skillsCount} habilidades listadas — boa cobertura de palavras-chave.`);

  // Idiomas
  if (data.languages.length === 0) penalize(3, { severity: "dica", section: "Idiomas", message: "Nenhum idioma informado.", suggestion: "Inclua ao menos o idioma nativo e o nível de inglês." });

  // Palavras-chave da vaga
  let keywordHits = 0;
  let keywordTotal = 0;
  if (jobDescription?.trim()) {
    const stopwords = new Set(["de", "da", "do", "e", "em", "com", "para", "the", "and", "with", "a", "an", "to", "of", "in", "para", "das", "dos", "uma", "um"]);
    const keywords = Array.from(new Set(
      jobDescription.toLowerCase().match(/[a-zà-ÿ0-9+#.]{3,}/gi)?.filter((w) => !stopwords.has(w)) ?? [],
    )).slice(0, 60);
    const haystack = JSON.stringify(data).toLowerCase();
    keywordTotal = keywords.length;
    keywordHits = keywords.filter((k) => haystack.includes(k)).length;
    const ratio = keywordTotal ? keywordHits / keywordTotal : 1;
    if (ratio < 0.3) penalize(10, { severity: "atencao", section: "Palavras-chave", message: `Baixa aderência à vaga: ${keywordHits}/${keywordTotal} termos da descrição presentes.`, suggestion: "Incorpore naturalmente as tecnologias e requisitos citados na vaga." });
    else if (ratio < 0.55) penalize(4, { severity: "dica", section: "Palavras-chave", message: `Aderência parcial à vaga: ${keywordHits}/${keywordTotal} termos.`, suggestion: "Use a personalização por vaga para elevar a cobertura de palavras-chave." });
    else strengths.push(`Boa aderência à vaga: ${keywordHits}/${keywordTotal} termos da descrição presentes.`);
  }

  return { score: Math.max(0, Math.min(100, score)), issues, strengths };
}

// ---------- Análise com IA (BYOK do usuário, com fallback ao gateway) ----------

const aiAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  issues: z.array(atsIssueSchema),
  strengths: z.array(z.string()),
  missingKeywords: z.array(z.string()),
});

/** providerOptions "kimi-gw" só existem no gateway da plataforma. */
function providerOptionsFor(byok: boolean, maxTokens: number) {
  return byok ? undefined : { "kimi-gw": { max_completion_tokens: maxTokens } };
}

/**
 * Erros de chamadas BYOK (chave do próprio usuário) precisam de mensagens
 * próprias — "credencial do gateway inválida" não faz sentido aqui — e NUNCA
 * devem cair no gateway da plataforma, que cobraria do dono do site.
 */
function byokErrorMessage(err: unknown): string | null {
  const status =
    (err as { statusCode?: number; status?: number })?.statusCode ??
    (err as { status?: number })?.status;
  if (status === 401 || status === 403) {
    return "Sua chave de API foi recusada pelo provedor. Revise a configuração de IA (Configurar IA).";
  }
  if (status === 404) {
    return "O provedor não encontrou esse modelo. Corrija o nome em Configurar IA.";
  }
  return null; // demais casos: transiente — degrada para o verificador local
}

function resumeToText(data: ResumeData): string {
  const lines = [
    `Nome: ${data.fullName}`,
    `Contato: ${data.email} | ${data.phone} | ${data.location}`,
    data.linkedin && `LinkedIn: ${data.linkedin}`,
    data.portfolio && `Portfólio: ${data.portfolio}`,
    `Objetivo: ${data.objective}`,
    "Experiências:",
    ...data.experiences.map(
      (e) => `- ${e.role} @ ${e.company} (${e.startDate} – ${e.endDate}): ${e.description}`,
    ),
    "Formação:",
    ...data.education.map((e) => `- ${e.degree} — ${e.institution} (${e.period})`),
    `Habilidades técnicas: ${data.technicalSkills}`,
    `Habilidades comportamentais: ${data.softSkills}`,
    `Idiomas: ${data.languages.map((l) => `${l.name} (${l.level})`).join(", ")}`,
    "Certificações:",
    ...data.certifications.map((c) => `- ${c.name} — ${c.issuer} (${c.year})`),
  ];
  return lines.filter(Boolean).join("\n");
}

export async function aiAtsCheck(
  userId: number,
  data: ResumeData,
  language: string,
  jobDescription?: string,
): Promise<AtsAnalysis> {
  const heuristic = heuristicAtsCheck(data, jobDescription);
  const localFallback = {
    ...heuristic,
    summary: "Análise gerada pelo verificador local (IA temporariamente indisponível). As verificações estruturais de ATS foram aplicadas normalmente.",
    missingKeywords: [],
    model: "verificador local",
    aiPowered: false,
  };
  // Se nem a resolução da IA funciona (banco, chave corrompida, gateway), degrada.
  const ai = await resolveAiForUser(userId).catch(() => null);
  if (!ai) return localFallback;
  try {
    const lang = language === "en-US" ? "English" : "português brasileiro";
    const result = await generateObject({
      model: ai.model,
      schema: aiAnalysisSchema,
      prompt: [
        `Você é um especialista em sistemas ATS (Applicant Tracking Systems) e recrutamento de tecnologia.`,
        `Analise o currículo abaixo quanto à compatibilidade com ATS: legibilidade estrutural, palavras-chave, clareza, quantificação de resultados e completude das seções.`,
        jobDescription ? `A vaga-alvo é:\n"""\n${jobDescription.slice(0, 4000)}\n"""\nAvalie também a aderência do currículo a essa vaga e liste em missingKeywords os termos importantes da vaga ausentes no currículo.` : "",
        `Currículo:\n"""\n${resumeToText(data)}\n"""`,
        `Responda em ${lang}. score de 0 a 100. Em issues, classifique severity como critico/atencao/dica, indique a section, o message (problema) e suggestion (como corrigir). Em strengths, liste o que já está bom. Máximo 8 issues.`,
      ].filter(Boolean).join("\n\n"),
      providerOptions: providerOptionsFor(ai.byok, 2048),
    });
    // Combina: média ponderada entre heurística e IA, unindo issues das duas fontes
    const score = Math.round(heuristic.score * 0.35 + result.object.score * 0.65);
    const issueKeys = new Set<string>();
    const issues = [...result.object.issues, ...heuristic.issues].filter((i) => {
      const key = `${i.section}:${i.message.slice(0, 40)}`;
      if (issueKeys.has(key)) return false;
      issueKeys.add(key);
      return true;
    }).slice(0, 10);
    return {
      score,
      summary: result.object.summary,
      issues,
      strengths: Array.from(new Set([...result.object.strengths, ...heuristic.strengths])).slice(0, 8),
      missingKeywords: result.object.missingKeywords.slice(0, 20),
      model: ai.byok
        ? `${ai.modelId} · ${ai.sourceLabel} (sua chave)`
        : `${ai.modelId}${ai.openSource ? " (open source)" : ""}`,
      aiPowered: true,
    };
  } catch (err) {
    if (ai.byok) {
      const message = byokErrorMessage(err);
      if (message) throw new TRPCError({ code: "BAD_REQUEST", message });
    } else {
      const classified = classifyAiError(err);
      if (classified.name === "AiUnavailable" || classified.name === "ContentRejected" || classified.name === "AiMisconfigured") {
        throw classified;
      }
    }
    // Transiente ou inesperado: degrada para heurística local com aviso
    return localFallback;
  }
}

export async function aiTailorResume(
  userId: number,
  data: ResumeData,
  language: string,
  jobTitle: string,
  jobDescription: string,
): Promise<TailorResult> {
  const lang = language === "en-US" ? "English" : "português brasileiro";
  const ai = await resolveAiForUser(userId);
  try {
    const result = await generateObject({
      model: ai.model,
      schema: tailorResultSchema,
      prompt: [
        `Você é um especialista em currículos ATS e recrutamento de tecnologia.`,
        `Reescreva e otimize o currículo abaixo para a vaga descrita, usando APENAS informações verdadeiras já presentes no currículo do candidato — nunca invente experiências, tecnologias ou resultados.`,
        `Regras: (1) reordene e destaque o que é relevante para a vaga; (2) incorpore palavras-chave da vaga onde forem verdadeiras para o candidato; (3) reescreva o objetivo profissional mirando o cargo (máx. 500 caracteres); (4) melhore descrições com verbos de ação e métricas já existentes; (5) mantenha todos os fatos intactos.`,
        `Em insights: liste melhorias aplicadas (melhoria), correções feitas (correcao) e pontos que o candidato deveria desenvolver mas não possui (atencao). Em appliedKeywords, palavras-chave da vaga incorporadas; em missingKeywords, as importantes que o candidato realmente não tem.`,
        `matchScore: 0–100 de aderência do currículo OTIMIZADO à vaga.`,
        `Vaga: ${jobTitle}\nDescrição:\n"""\n${jobDescription.slice(0, 5000)}\n"""`,
        `Currículo atual:\n"""\n${resumeToText(data)}\n"""`,
        `Responda em ${lang}.`,
      ].join("\n\n"),
      providerOptions: providerOptionsFor(ai.byok, 8192),
    });
    return result.object;
  } catch (err) {
    if (ai.byok) {
      const message = byokErrorMessage(err);
      if (message) throw new TRPCError({ code: "BAD_REQUEST", message });
    }
    throw classifyAiError(err);
  }
}
