import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ScoreRing";
import { CircleAlert, TriangleAlert, Lightbulb, CheckCircle2, Cpu } from "lucide-react";
import type { AtsAnalysis, AtsIssue } from "@contracts/types";

const severityMeta: Record<AtsIssue["severity"], { label: string; icon: typeof CircleAlert; className: string }> = {
  critico: { label: "Crítico", icon: CircleAlert, className: "text-destructive" },
  atencao: { label: "Atenção", icon: TriangleAlert, className: "text-amber-600" },
  dica: { label: "Dica", icon: Lightbulb, className: "text-primary" },
};

export function AtsDialog({
  open,
  onOpenChange,
  analysis,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: AtsAnalysis | null;
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-light">Verificação ATS</DialogTitle>
          <DialogDescription>
            Análise de compatibilidade com sistemas de rastreamento de candidatos.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">A IA está analisando seu currículo…</p>
          </div>
        ) : analysis ? (
          <div className="space-y-6">
            <div className="flex items-center gap-5">
              <ScoreRing score={analysis.score} size={88} />
              <div>
                <p className="text-sm leading-relaxed">{analysis.summary}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Cpu className="h-3.5 w-3.5" />
                  {analysis.aiPowered ? (
                    <>Analisado por IA: <span className="font-medium">{analysis.model}</span></>
                  ) : (
                    <>Verificação local (IA indisponível no momento)</>
                  )}
                </p>
              </div>
            </div>

            {analysis.issues.length > 0 && (
              <div>
                <h3 className="mb-3 font-display text-lg font-semibold">Pontos a melhorar</h3>
                <ul className="space-y-3">
                  {analysis.issues.map((issue, i) => {
                    const meta = severityMeta[issue.severity];
                    return (
                      <li key={i} className="flex gap-3 rounded-xl border border-border bg-background/60 p-3">
                        <meta.icon className={`mt-0.5 h-5 w-5 shrink-0 ${meta.className}`} />
                        <div className="text-sm">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{issue.section}</Badge>
                            <span className="font-medium">{issue.message}</span>
                          </div>
                          <p className="mt-1 text-muted-foreground">{issue.suggestion}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {analysis.strengths.length > 0 && (
              <div>
                <h3 className="mb-3 font-display text-lg font-semibold">Pontos fortes</h3>
                <ul className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.missingKeywords.length > 0 && (
              <div>
                <h3 className="mb-3 font-display text-lg font-semibold">Palavras-chave ausentes</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.missingKeywords.map((k) => (
                    <Badge key={k} variant="secondary">{k}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
