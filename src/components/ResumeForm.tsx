import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { ResumeData } from "@contracts/types";

type Props = {
  data: ResumeData;
  onChange: (data: ResumeData) => void;
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ResumeForm({ data, onChange }: Props) {
  const set = <K extends keyof ResumeData>(key: K, value: ResumeData[K]) =>
    onChange({ ...data, [key]: value });

  const setItem = <K extends "experiences" | "education" | "languages" | "certifications">(
    key: K,
    index: number,
    patch: Partial<ResumeData[K][number]>,
  ) => {
    const list = [...data[key]];
    list[index] = { ...list[index], ...patch };
    set(key, list as ResumeData[K]);
  };

  const addItem = <K extends "experiences" | "education" | "languages" | "certifications">(
    key: K,
    item: ResumeData[K][number],
  ) => set(key, [...data[key], item] as ResumeData[K]);

  const removeItem = <K extends "experiences" | "education" | "languages" | "certifications">(
    key: K,
    index: number,
  ) => set(key, data[key].filter((_, i) => i !== index) as ResumeData[K]);

  return (
    <div className="space-y-8">
      {/* Dados pessoais */}
      <section id="sec-pessoal" className="section-card scroll-mt-24 space-y-4">
        <h2 className="font-display text-xl font-semibold">Dados pessoais</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome completo *">
            <Input value={data.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="Seu nome completo" />
          </Field>
          <Field label="E-mail *">
            <Input type="email" value={data.email} onChange={(e) => set("email", e.target.value)} placeholder="voce@email.com" />
          </Field>
          <Field label="Telefone *">
            <Input value={data.phone} onChange={(e) => set("phone", e.target.value)} placeholder="(83) 99999-0000" />
          </Field>
          <Field label="Localização *">
            <Input value={data.location} onChange={(e) => set("location", e.target.value)} placeholder="Sousa, Paraíba, Brasil" />
          </Field>
          <Field label="LinkedIn (opcional)">
            <Input value={data.linkedin} onChange={(e) => set("linkedin", e.target.value)} placeholder="linkedin.com/in/seuperfil" />
          </Field>
          <Field label="Portfólio/Site (opcional)">
            <Input value={data.portfolio} onChange={(e) => set("portfolio", e.target.value)} placeholder="seusite.dev" />
          </Field>
        </div>
      </section>

      {/* Objetivo */}
      <section id="sec-objetivo" className="section-card scroll-mt-24 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Objetivo profissional</h2>
          <span className={`text-xs ${data.objective.length > 500 ? "text-destructive" : "text-muted-foreground"}`}>
            {data.objective.length}/500
          </span>
        </div>
        <Textarea
          value={data.objective}
          onChange={(e) => set("objective", e.target.value.slice(0, 500))}
          placeholder="Cargo-alvo, principais competências e o valor que você entrega. Ex.: Desenvolvedor Full Stack com foco em…"
          className="min-h-28"
        />
      </section>

      {/* Experiências */}
      <section id="sec-experiencia" className="section-card scroll-mt-24 space-y-4">
        <h2 className="font-display text-xl font-semibold">Experiência profissional</h2>
        {data.experiences.map((exp, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Experiência {i + 1}</span>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem("experiences", i)}>
                <Trash2 className="mr-1 h-4 w-4" /> Remover
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Cargo *">
                <Input value={exp.role} onChange={(e) => setItem("experiences", i, { role: e.target.value })} placeholder="Desenvolvedor Full Stack" />
              </Field>
              <Field label="Empresa *">
                <Input value={exp.company} onChange={(e) => setItem("experiences", i, { company: e.target.value })} placeholder="Nome da empresa" />
              </Field>
              <Field label="Data de início *" hint="Formato MM/AAAA">
                <Input value={exp.startDate} onChange={(e) => setItem("experiences", i, { startDate: e.target.value })} placeholder="01/2025" />
              </Field>
              <Field label="Data de fim" hint="Deixe em branco se for o emprego atual">
                <Input value={exp.endDate} onChange={(e) => setItem("experiences", i, { endDate: e.target.value })} placeholder="atual" />
              </Field>
            </div>
            <Field label="Descrição das atividades" hint="Uma realização por linha. Comece com verbos de ação e inclua números.">
              <Textarea
                value={exp.description}
                onChange={(e) => setItem("experiences", i, { description: e.target.value })}
                placeholder={"Desenvolvi APIs RESTful com Node.js em arquitetura serverless na AWS\nReduzi em 25% o tempo de carregamento das páginas"}
                className="min-h-28"
              />
            </Field>
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => addItem("experiences", { role: "", company: "", startDate: "", endDate: "", description: "" })}
        >
          <Plus className="mr-2 h-4 w-4" /> Adicionar experiência
        </Button>
      </section>

      {/* Formação */}
      <section id="sec-formacao" className="section-card scroll-mt-24 space-y-4">
        <h2 className="font-display text-xl font-semibold">Formação</h2>
        {data.education.map((edu, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Formação {i + 1}</span>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem("education", i)}>
                <Trash2 className="mr-1 h-4 w-4" /> Remover
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Curso/Grau *">
                <Input value={edu.degree} onChange={(e) => setItem("education", i, { degree: e.target.value })} placeholder="Tecnólogo em ADS" />
              </Field>
              <Field label="Instituição *">
                <Input value={edu.institution} onChange={(e) => setItem("education", i, { institution: e.target.value })} placeholder="IFPB" />
              </Field>
              <Field label="Período">
                <Input value={edu.period} onChange={(e) => setItem("education", i, { period: e.target.value })} placeholder="2022 – 2025" />
              </Field>
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={() => addItem("education", { degree: "", institution: "", period: "" })}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar formação
        </Button>
      </section>

      {/* Habilidades */}
      <section id="sec-habilidades" className="section-card scroll-mt-24 space-y-4">
        <h2 className="font-display text-xl font-semibold">Habilidades</h2>
        <Field label="Habilidades técnicas" hint="Separadas por vírgula. São as principais palavras-chave do ATS.">
          <Textarea
            value={data.technicalSkills}
            onChange={(e) => set("technicalSkills", e.target.value)}
            placeholder="JavaScript, TypeScript, React, Node.js, AWS, Docker…"
            className="min-h-20"
          />
        </Field>
        <Field label="Habilidades comportamentais" hint="Separadas por vírgula">
          <Textarea
            value={data.softSkills}
            onChange={(e) => set("softSkills", e.target.value)}
            placeholder="Liderança, Proatividade, Comunicação…"
            className="min-h-16"
          />
        </Field>
      </section>

      {/* Idiomas */}
      <section id="sec-idiomas" className="section-card scroll-mt-24 space-y-4">
        <h2 className="font-display text-xl font-semibold">Idiomas</h2>
        {data.languages.map((lang, i) => (
          <div key={i} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-background/60 p-4">
            <div className="min-w-40 flex-1">
              <Field label="Idioma">
                <Input value={lang.name} onChange={(e) => setItem("languages", i, { name: e.target.value })} placeholder="Inglês" />
              </Field>
            </div>
            <div className="min-w-40 flex-1">
              <Field label="Nível">
                <Input value={lang.level} onChange={(e) => setItem("languages", i, { level: e.target.value })} placeholder="Avançado" />
              </Field>
            </div>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem("languages", i)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" onClick={() => addItem("languages", { name: "", level: "" })}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar idioma
        </Button>
      </section>

      {/* Certificações */}
      <section id="sec-certificacoes" className="section-card scroll-mt-24 space-y-4">
        <h2 className="font-display text-xl font-semibold">Cursos e certificações</h2>
        {data.certifications.map((cert, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Certificação {i + 1}</span>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => removeItem("certifications", i)}>
                <Trash2 className="mr-1 h-4 w-4" /> Remover
              </Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Nome do curso/certificação *">
                <Input value={cert.name} onChange={(e) => setItem("certifications", i, { name: e.target.value })} placeholder="NLW Expert — React" />
              </Field>
              <Field label="Instituição emissora">
                <Input value={cert.issuer} onChange={(e) => setItem("certifications", i, { issuer: e.target.value })} placeholder="Rocketseat" />
              </Field>
              <Field label="Ano">
                <Input value={cert.year} onChange={(e) => setItem("certifications", i, { year: e.target.value })} placeholder="2024" />
              </Field>
            </div>
          </div>
        ))}
        <Button variant="outline" onClick={() => addItem("certifications", { name: "", issuer: "", year: "" })}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar certificação
        </Button>
      </section>
    </div>
  );
}
