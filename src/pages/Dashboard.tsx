import { useNavigate } from "react-router";
import { toast } from "sonner";
import AuthLayout from "@/components/AuthLayout";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AiSettingsDialog } from "@/components/AiSettingsDialog";
import { FileText, Plus, Pencil, Trash2, Target, Settings2 } from "lucide-react";
import type { ResumeData } from "@contracts/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: resumes, isLoading } = trpc.resume.list.useQuery();

  const createMutation = trpc.resume.create.useMutation({
    onSuccess: ({ id }) => {
      utils.resume.list.invalidate();
      navigate(`/resumes/${id}`);
    },
    onError: () => toast.error("Não foi possível criar o currículo."),
  });

  const deleteMutation = trpc.resume.remove.useMutation({
    onSuccess: () => {
      utils.resume.list.invalidate();
      toast.success("Currículo excluído.");
    },
    onError: () => toast.error("Não foi possível excluir."),
  });

  const duplicateMutation = trpc.resume.create.useMutation({
    onSuccess: () => {
      utils.resume.list.invalidate();
      toast.success("Cópia criada.");
    },
  });

  const newResume = () => {
    createMutation.mutate({
      title: "Currículo sem título",
      language: "pt-BR",
      data: {
        fullName: "", email: "", phone: "", location: "", linkedin: "", portfolio: "",
        objective: "", experiences: [], education: [], technicalSkills: "", softSkills: "",
        languages: [], certifications: [],
      },
    });
  };

  return (
    <AuthLayout>
      <div className="mx-auto max-w-5xl p-6 md:p-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-light">Meus Currículos</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie quantos currículos quiser e personalize cada um para a vaga certa.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <AiSettingsDialog
              trigger={
                <Button variant="outline" size="lg">
                  <Settings2 className="mr-2 h-4 w-4" /> Configurar IA
                </Button>
              }
            />
            <Button onClick={newResume} disabled={createMutation.isPending} size="lg">
              <Plus className="mr-2 h-4 w-4" /> Novo currículo
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
        ) : !resumes?.length ? (
          <div className="section-card flex flex-col items-center py-16 text-center">
            <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
            <h2 className="font-display text-xl font-semibold">Nenhum currículo ainda</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Crie seu primeiro currículo ATS e valide com nossa análise de IA.
            </p>
            <Button onClick={newResume} className="mt-6" disabled={createMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Criar meu primeiro currículo
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {resumes.map((r) => {
              const data = r.data as ResumeData;
              return (
                <div key={r.id} className="section-card flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-display truncate text-xl font-semibold">{r.title}</h2>
                      <p className="truncate text-sm text-muted-foreground">
                        {data.fullName || "Sem nome"} · {r.language}
                      </p>
                    </div>
                    {r.atsScore != null && (
                      <Badge variant={r.atsScore >= 70 ? "default" : "secondary"}>
                        ATS {r.atsScore}
                      </Badge>
                    )}
                  </div>
                  {r.targetJobTitle && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Target className="h-3.5 w-3.5" /> Personalizado para: {r.targetJobTitle}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Atualizado em {new Date(r.updatedAt).toLocaleDateString("pt-BR")}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Button size="sm" onClick={() => navigate(`/resumes/${r.id}`)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        duplicateMutation.mutate({
                          title: `${r.title} (cópia)`,
                          language: r.language as "pt-BR" | "en-US",
                          data,
                          targetJobTitle: r.targetJobTitle ?? undefined,
                          targetJobDescription: r.targetJobDescription ?? undefined,
                        })
                      }
                    >
                      Duplicar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-destructive">
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir currículo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{r.title}" será excluído permanentemente. Essa ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate({ id: r.id })}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
