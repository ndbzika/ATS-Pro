import { z } from "zod";

// ---------- Currículo: modelo de dados compartilhado ----------

export const experienceSchema = z.object({
  role: z.string().default(""),
  company: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  description: z.string().default(""),
});

export const educationSchema = z.object({
  degree: z.string().default(""),
  institution: z.string().default(""),
  period: z.string().default(""),
});

export const languageSchema = z.object({
  name: z.string().default(""),
  level: z.string().default(""),
});

export const certificationSchema = z.object({
  name: z.string().default(""),
  issuer: z.string().default(""),
  year: z.string().default(""),
});

export const resumeDataSchema = z.object({
  fullName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  location: z.string().default(""),
  linkedin: z.string().default(""),
  portfolio: z.string().default(""),
  objective: z.string().max(500).default(""),
  experiences: z.array(experienceSchema).default([]),
  education: z.array(educationSchema).default([]),
  technicalSkills: z.string().default(""),
  softSkills: z.string().default(""),
  languages: z.array(languageSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
});

export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;
export type LanguageItem = z.infer<typeof languageSchema>;
export type Certification = z.infer<typeof certificationSchema>;
export type ResumeData = z.infer<typeof resumeDataSchema>;

export const resumeLanguages = ["pt-BR", "en-US"] as const;
export type ResumeLanguage = (typeof resumeLanguages)[number];

export const emptyResumeData: ResumeData = resumeDataSchema.parse({});

// ---------- Análise ATS ----------

export const atsIssueSchema = z.object({
  severity: z.enum(["critico", "atencao", "dica"]),
  section: z.string(),
  message: z.string(),
  suggestion: z.string(),
});

export const atsAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  issues: z.array(atsIssueSchema),
  strengths: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  model: z.string(),
  aiPowered: z.boolean(),
});

export type AtsIssue = z.infer<typeof atsIssueSchema>;
export type AtsAnalysis = z.infer<typeof atsAnalysisSchema>;

// ---------- Personalização por vaga ----------

export const tailorResultSchema = z.object({
  resume: resumeDataSchema,
  matchScore: z.number().min(0).max(100),
  insights: z.array(
    z.object({
      type: z.enum(["melhoria", "correcao", "atencao"]),
      message: z.string(),
    }),
  ),
  appliedKeywords: z.array(z.string()),
  missingKeywords: z.array(z.string()),
});

export type TailorResult = z.infer<typeof tailorResultSchema>;
