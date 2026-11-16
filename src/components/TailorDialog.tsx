import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ScoreRing";
import { Wrench, Sparkles, CircleAlert } from "lucide-react";
import type { TailorResult } from "@contracts/types";

const insightMeta = {
  melhoria: { label: "Melhoria aplicada", icon: Sparkles, className: "text-primary" },
  correcao: { label: "Correção", icon: Wrench, className: "text-amber-600" },
  atencao: { label: "Ponto de atenção", icon: CircleAlert, className: "text-destructive" },
} as const;

export function TailorDialog({
  open,
  onOpenChange,
  loading,
  result,
  onRun,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  result: TailorResult | null;
  onRun: (jobTitle: string, jobDescription: string) => void;
  onApply: () => void;
}) {
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-light">Personalizar para a vaga</DialogTitle>
          <DialogDescription>
            Cole o título e a descrição da vaga. A IA otimiza seu currículo usando apenas as suas
            informações reais — sem inventar experiências.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="job-title">Título da vaga</Label>
              <Input
                id="job-title"
                placeholder="Ex.: Desenvolvedor Full Stack Pleno"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-desc">Descrição da vaga</Label>
              <Textarea
                id="job-desc"
                placeholder="Cole aqui a descrição completa da vaga, com requisitos e responsabilidades…"
                className="min-h-40"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={loading || !jobTitle.trim() || jobDescription.trim().length < 20}
              onClick={() => onRun(jobTitle.trim(), jobDescription.trim())}
            >
              {loading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Otimizando com IA…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" /> Otimizar currículo
                </>
              )}
            </Button>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <ScoreRing score={result.matchScore} size={88} />
              <p className="text-sm text-muted-foreground">
                Aderência do currículo otimizado à vaga <strong className="text-foreground">{jobTitle}</strong>.
              </p>
            </div>

            {result.insights.length > 0 && (
              <div>
                <h3 className="mb-3 font-display text-lg font-semibold">Insights</h3>
                <ul className="space-y-3">
                  {result.insights.map((insight, i) => {
                    const meta = insightMeta[insight.type];
                    return (
                      <li key={i} className="flex gap-3 rounded-xl border border-border bg-background/60 p-3">
                        <meta.icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.className}`} />
                        <div className="text-sm">
                          <span className="font-medium">{meta.label}</span>
                          <p className="mt-0.5 text-muted-foreground">{insight.message}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {result.appliedKeywords.length > 0 && (
              <div>
                <h3 className="mb-2 font-display text-lg font-semibold">Palavras-chave incorporadas</h3>
                <div className="flex flex-wrap gap-2">
                  {result.appliedKeywords.map((k) => <Badge key={k}>{k}</Badge>)}
                </div>
              </div>
            )}

            {result.missingKeywords.length > 0 && (
              <div>
                <h3 className="mb-2 font-display text-lg font-semibold">Requisitos que você ainda não tem</h3>
                <div className="flex flex-wrap gap-2">
                  {result.missingKeywords.map((k) => <Badge key={k} variant="secondary">{k}</Badge>)}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={onApply} size="lg">Aplicar ao currículo</Button>
              <Button variant="outline" size="lg" onClick={() => onOpenChange(false)}>
                Revisar depois
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
