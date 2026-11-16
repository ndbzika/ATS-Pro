import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import AuthLayout from "@/components/AuthLayout";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ResumeForm } from "@/components/ResumeForm";
import { AtsDialog } from "@/components/AtsDialog";
import { TailorDialog } from "@/components/TailorDialog";
import { ScoreRing } from "@/components/ScoreRing";
import { AiSettingsDialog } from "@/components/AiSettingsDialog";
import { downloadResume } from "@/lib/download";
import {
  Save,
  FileDown,
  FileText,
  ScanSearch,
  Target,
  ArrowLeft,
  Settings2,
} from "lucide-react";
import type { AtsAnalysis, ResumeData, TailorResult } from "@contracts/types";

const sections = [
  { id: "sec-pessoal", label: "Dados pessoais" },
  { id: "sec-objetivo", label: "Objetivo" },
  { id: "sec-experiencia", label: "Experiência" },
  { id: "sec-formacao", label: "Formação" },
  { id: "sec-habilidades", label: "Habilidades" },
  { id: "sec-idiomas", label: "Idiomas" },
  { id: "sec-certificacoes", label: "Certificações" },
];

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const resumeId = Number(id);
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const { data: resume, isLoading } = trpc.resume.get.useQuery(
    { id: resumeId },
    { enabled: Number.isFinite(resumeId), retry: false },
  );

  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<"pt-BR" | "en-US">("pt-BR");
  const [data, setData] = useState<ResumeData | null>(null);
  const [dirty, setDirty] = useState(false);
  const [atsOpen, setAtsOpen] = useState(false);
  const [tailorOpen, setTailorOpen] = useState(false);
  const [analysis, setAnalysis] = useState<AtsAnalysis | null>(null);
  const [tailorResult, setTailorResult] = useState<TailorResult | null>(null);
  const [exporting, setExporting] = useState<"docx" | "pdf" | null>(null);

  useEffect(() => {
    if (resume && !data) {
      setTitle(resume.title);
      setLanguage(resume.language as "pt-BR" | "en-US");
      setData(resume.data as ResumeData);
    }
  }, [resume, data]);

  const saveMutation = trpc.resume.update.useMutation({
    onSuccess: () => {
      setDirty(false);
      utils.resume.list.invalidate();
      utils.resume.get.invalidate({ id: resumeId });
      toast.success("Currículo salvo.");
    },
    onError: () => toast.error("Erro ao salvar o currículo."),
  });

  const checkMutation = trpc.resume.checkAts.useMutation({
    onSuccess: (result) => {
      setAnalysis(result);
      saveMutation.mutate(buildPayload(result.score));
    },
    onError: (err) => {
      setAtsOpen(false);
      toast.error(err.message || "A análise de IA está indisponível no momento. Tente novamente em instantes.");
    },
  });

  const tailorMutation = trpc.resume.tailorForJob.useMutation({
    onError: (err) => {
      toast.error(err.message || "A personalização por IA está indisponível no momento.");
    },
  });

  if (isLoading || !data) {
    return (
      <AuthLayout>
        <div className="mx-auto max-w-5xl space-y-4 p-6 md:p-10">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </AuthLayout>
    );
  }

  const buildPayload = (atsScore?: number) => ({
    id: resumeId,
    title: title.trim() || "Currículo sem título",
    language,
    data,
    targetJobTitle: resume?.targetJobTitle ?? undefined,
    targetJobDescription: resume?.targetJobDescription ?? undefined,
    ...(atsScore !== undefined ? { atsScore } : {}),
  });

  const save = () => saveMutation.mutate(buildPayload());

  const runAtsCheck = () => {
    setAtsOpen(true);
    setAnalysis(null);
    checkMutation.mutate({
      data,
      language,
      jobDescription: resume?.targetJobDescription ?? undefined,
    });
  };

  const runTailor = (jobTitle: string, jobDescription: string) => {
    tailorMutation.mutate(
      { data, language, jobTitle, jobDescription },
      {
        onSuccess: (result) => {
          setTailorResult(result);
          // registra a vaga-alvo no currículo
          saveMutation.mutate({ ...buildPayload(), targetJobTitle: jobTitle, targetJobDescription: jobDescription });
        },
      },
    );
  };

  const applyTailor = () => {
    if (!tailorResult) return;
    setData(tailorResult.resume);
    setDirty(true);
    setTailorOpen(false);
    setTailorResult(null);
    toast.success("Currículo otimizado aplicado. Revise e salve.");
  };

  const doExport = async (format: "docx" | "pdf") => {
    setExporting(format);
    try {
      await downloadResume(format, { data, language });
      toast.success(format === "docx" ? "Word baixado." : "PDF baixado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na exportação.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <AuthLayout>
      <div className="mx-auto grid max-w-6xl gap-8 p-6 md:p-10 lg:grid-cols-[260px_1fr]">
        {/* Rail lateral */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <Button variant="ghost" size="sm" onClick={() => navigate("/resumes")}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
          </Button>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="resume-title">Título do currículo</Label>
              <Input
                id="resume-title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
                placeholder="Ex.: Currículo para vaga X"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Idioma do currículo</Label>
              <Select value={language} onValueChange={(v) => { setLanguage(v as "pt-BR" | "en-US"); setDirty(true); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt-BR">Português (BR)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {resume?.atsScore != null && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <ScoreRing score={resume.atsScore} size={56} />
              <p className="text-xs text-muted-foreground">Última nota ATS registrada</p>
            </div>
          )}

          <nav className="space-y-1">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </nav>

          <Separator />

          <div className="space-y-2">
            <Button className="w-full" onClick={save} disabled={saveMutation.isPending || !dirty}>
              <Save className="mr-2 h-4 w-4" /> {saveMutation.isPending ? "Salvando…" : "Salvar"}
            </Button>
            <Button className="w-full" variant="secondary" onClick={runAtsCheck} disabled={checkMutation.isPending}>
              <ScanSearch className="mr-2 h-4 w-4" /> Verificar ATS com IA
            </Button>
            <Button className="w-full" variant="secondary" onClick={() => { setTailorResult(null); setTailorOpen(true); }}>
              <Target className="mr-2 h-4 w-4" /> Personalizar para vaga
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => doExport("docx")} disabled={exporting !== null}>
                <FileText className="mr-1.5 h-4 w-4" /> {exporting === "docx" ? "…" : "Word"}
              </Button>
              <Button variant="outline" onClick={() => doExport("pdf")} disabled={exporting !== null}>
                <FileDown className="mr-1.5 h-4 w-4" /> {exporting === "pdf" ? "…" : "PDF"}
              </Button>
            </div>
            <AiSettingsDialog
              trigger={
                <Button className="w-full" variant="ghost" size="sm">
                  <Settings2 className="mr-2 h-4 w-4" /> Configurar IA
                </Button>
              }
            />
          </div>
        </aside>

        {/* Formulário */}
        <div onInput={() => setDirty(true)}>
          <ResumeForm data={data} onChange={(d) => { setData(d); setDirty(true); }} />
        </div>
      </div>

      <AtsDialog
        open={atsOpen}
        onOpenChange={setAtsOpen}
        analysis={analysis}
        loading={checkMutation.isPending}
      />
      <TailorDialog
        open={tailorOpen}
        onOpenChange={setTailorOpen}
        loading={tailorMutation.isPending}
        result={tailorResult}
        onRun={runTailor}
        onApply={applyTailor}
      />
    </AuthLayout>
  );
}
