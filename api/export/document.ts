import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ResumeData, ResumeLanguage } from "@contracts/resume";

const LABELS: Record<ResumeLanguage, Record<string, string>> = {
  "pt-BR": {
    objective: "Objetivo Profissional",
    experience: "Experiência Profissional",
    education: "Formação",
    skills: "Habilidades",
    technical: "Técnicas",
    behavioral: "Comportamentais",
    languages: "Idiomas",
    certifications: "Cursos e Certificações",
    present: "atual",
  },
  "en-US": {
    objective: "Professional Summary",
    experience: "Professional Experience",
    education: "Education",
    skills: "Skills",
    technical: "Technical",
    behavioral: "Soft Skills",
    languages: "Languages",
    certifications: "Courses & Certifications",
    present: "Present",
  },
};

function contactLine(d: ResumeData): string {
  return [d.email, d.phone, d.location, d.linkedin, d.portfolio].filter(Boolean).join(" | ");
}

function splitSkills(raw: string): string[] {
  return raw.split(/[,;\n•]/).map((s) => s.trim()).filter(Boolean);
}

function period(start: string, end: string, present: string): string {
  const e = end.trim() || present;
  return [start.trim(), e].filter(Boolean).join(" – ");
}

// ---------- DOCX (formato ATS: coluna única, sem tabelas, texto puro) ----------

export async function buildDocx(data: ResumeData, language: ResumeLanguage): Promise<Buffer> {
  const L = LABELS[language];
  const font = { ascii: "Calibri", hAnsi: "Calibri", cs: "Calibri", eastAsia: "Calibri" };
  const run = (text: string, options: Record<string, unknown> = {}) =>
    new TextRun({ text, font, size: 22, ...options });
  const para = (children: TextRun | TextRun[], options: Record<string, unknown> = {}) =>
    new Paragraph({
      spacing: { after: 100, line: 276 },
      ...options,
      children: Array.isArray(children) ? children : [children],
    });
  const bullet = (text: string) =>
    para(run(text), { numbering: { reference: "bullets", level: 0 }, spacing: { after: 60, line: 276 } });
  const heading = (text: string) =>
    para(run(text.toUpperCase(), { bold: true, size: 24, color: "1F3864" }), {
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 240, after: 120 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1F3864", space: 2 } },
    });

  const children: Paragraph[] = [
    para(run(data.fullName.toUpperCase(), { bold: true, size: 36, color: "1F3864" }), {
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
    }),
    para(run(contactLine(data), { size: 20, color: "595959" }), {
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
  ];

  if (data.objective.trim()) {
    children.push(heading(L.objective), para(run(data.objective.trim())));
  }

  const exps = [...data.experiences].filter((e) => e.role || e.company);
  if (exps.length) {
    children.push(heading(L.experience));
    for (const e of exps) {
      children.push(
        para([run(e.role, { bold: true }), run(` | ${e.company}`)], { spacing: { before: 120, after: 20 } }),
        para(run(period(e.startDate, e.endDate, L.present), { italics: true, color: "595959" }), { spacing: { after: 80 } }),
      );
      for (const line of e.description.split(/\n+/).map((s) => s.replace(/^[-–•]\s*/, "").trim()).filter(Boolean)) {
        children.push(bullet(line));
      }
    }
  }

  const edu = data.education.filter((e) => e.degree || e.institution);
  if (edu.length) {
    children.push(heading(L.education));
    for (const e of edu) {
      children.push(
        para([run(e.degree, { bold: true }), run(` | ${e.institution}`)], { spacing: { before: 120, after: 20 } }),
        para(run(e.period, { italics: true, color: "595959" }), { spacing: { after: 80 } }),
      );
    }
  }

  const tech = splitSkills(data.technicalSkills);
  const soft = splitSkills(data.softSkills);
  if (tech.length || soft.length) {
    children.push(heading(L.skills));
    if (tech.length) children.push(para([run(`${L.technical}: `, { bold: true }), run(tech.join(", "))], { spacing: { after: 60 } }));
    if (soft.length) children.push(para([run(`${L.behavioral}: `, { bold: true }), run(soft.join(", "))], { spacing: { after: 60 } }));
  }

  const langs = data.languages.filter((l) => l.name);
  if (langs.length) {
    children.push(heading(L.languages), para(run(langs.map((l) => `${l.name}: ${l.level}`).join(" | "))));
  }

  const certs = data.certifications.filter((c) => c.name);
  if (certs.length) {
    children.push(heading(L.certifications));
    for (const c of certs) {
      children.push(bullet([c.name, c.issuer, c.year && `(${c.year})`].filter(Boolean).join(" — ")));
    }
  }

  const doc = new Document({
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: "\u2022",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 420, hanging: 240 } } },
        }],
      }],
    },
    sections: [{
      properties: { page: { margin: { top: 1008, bottom: 1008, left: 1152, right: 1152 } } },
      children,
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

// ---------- PDF (pdf-lib, fontes padrão embutidas — sem leitura de disco) ----------

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const INK = rgb(0.12, 0.22, 0.28);
const MUTED = rgb(0.35, 0.35, 0.35);
const ACCENT = rgb(0.08, 0.35, 0.38);

export async function buildPdf(data: ResumeData, language: ResumeLanguage): Promise<Buffer> {
  const L = LABELS[language];
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const wrap = (text: string, font: typeof regular, size: number, width: number): string[] => {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) <= width) line = test;
      else {
        if (line) lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [""];
  };

  const text = (t: string, opts: { size?: number; font?: typeof regular; color?: ReturnType<typeof rgb>; center?: boolean; gapAfter?: number; indent?: number } = {}) => {
    const size = opts.size ?? 10;
    const f = opts.font ?? regular;
    const color = opts.color ?? INK;
    const width = PAGE_W - MARGIN * 2 - (opts.indent ?? 0);
    const lines = wrap(t, f, size, width);
    newPageIfNeeded(lines.length * (size + 2.5) + (opts.gapAfter ?? 4));
    for (const line of lines) {
      const x = opts.center ? (PAGE_W - f.widthOfTextAtSize(line, size)) / 2 : MARGIN + (opts.indent ?? 0);
      page.drawText(line, { x, y, size, font: f, color });
      y -= size + 2.5;
    }
    y -= opts.gapAfter ?? 4;
  };

  const section = (title: string) => {
    newPageIfNeeded(34);
    y -= 8;
    text(title.toUpperCase(), { size: 11, font: bold, color: ACCENT, gapAfter: 2 });
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.8, color: ACCENT });
    y -= 10;
  };

  // Cabeçalho
  text(data.fullName.toUpperCase(), { size: 18, font: bold, color: ACCENT, center: true, gapAfter: 2 });
  text(contactLine(data), { size: 8.5, color: MUTED, center: true, gapAfter: 10 });

  if (data.objective.trim()) {
    section(L.objective);
    text(data.objective.trim(), { size: 10 });
  }

  const exps = data.experiences.filter((e) => e.role || e.company);
  if (exps.length) {
    section(L.experience);
    for (const e of exps) {
      text(`${e.role} | ${e.company}`, { size: 10.5, font: bold, gapAfter: 1 });
      text(period(e.startDate, e.endDate, L.present), { size: 9, font: italic, color: MUTED, gapAfter: 3 });
      for (const line of e.description.split(/\n+/).map((s) => s.replace(/^[-–•]\s*/, "").trim()).filter(Boolean)) {
        text(`•  ${line}`, { size: 9.5, indent: 10, gapAfter: 2 });
      }
      y -= 4;
    }
  }

  const edu = data.education.filter((e) => e.degree || e.institution);
  if (edu.length) {
    section(L.education);
    for (const e of edu) {
      text(`${e.degree} | ${e.institution}`, { size: 10.5, font: bold, gapAfter: 1 });
      text(e.period, { size: 9, font: italic, color: MUTED });
    }
  }

  const tech = splitSkills(data.technicalSkills);
  const soft = splitSkills(data.softSkills);
  if (tech.length || soft.length) {
    section(L.skills);
    if (tech.length) text(`${L.technical}: ${tech.join(", ")}`, { size: 9.5, gapAfter: 2 });
    if (soft.length) text(`${L.behavioral}: ${soft.join(", ")}`, { size: 9.5 });
  }

  const langs = data.languages.filter((l) => l.name);
  if (langs.length) {
    section(L.languages);
    text(langs.map((l) => `${l.name}: ${l.level}`).join(" | "), { size: 9.5 });
  }

  const certs = data.certifications.filter((c) => c.name);
  if (certs.length) {
    section(L.certifications);
    for (const c of certs) {
      text(`•  ${[c.name, c.issuer, c.year && `(${c.year})`].filter(Boolean).join(" — ")}`, { size: 9.5, indent: 10, gapAfter: 2 });
    }
  }

  return Buffer.from(await pdf.save());
}

export function safeFileName(name: string, ext: string): string {
  const base = (name || "curriculo")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "curriculo";
  return `Curriculo_${base}.${ext}`;
}
