import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Download, Target, FileCheck } from "lucide-react";

const features = [
  {
    icon: FileText,
    title: "Editor completo",
    desc: "Dados pessoais, experiências, formação, habilidades, idiomas e certificações — tudo em um só lugar.",
  },
  {
    icon: Sparkles,
    title: "Verificação ATS com IA",
    desc: "Análise com nota de 0 a 100, problemas e sugestões. Use a IA da plataforma ou sua própria chave OpenAI, Claude ou Kimi.",
  },
  {
    icon: Target,
    title: "Personalização por vaga",
    desc: "Cole a descrição da vaga e receba um currículo otimizado com as palavras-chave certas.",
  },
  {
    icon: Download,
    title: "Exportação Word e PDF",
    desc: "Baixe em formato ATS limpo: coluna única, sem elementos gráficos que confundem os robôs.",
  },
];

export default function Home() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <FileCheck className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold">Currículo ATS Pro</span>
        </div>
        <Button asChild variant="outline">
          <Link to={user ? "/resumes" : "/login"}>{user ? "Meus currículos" : "Entrar"}</Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-16 md:py-24">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
            Otimizado para robôs de recrutamento
          </p>
          <h1 className="font-display max-w-3xl text-4xl font-light leading-tight md:text-6xl">
            Seu currículo lido por máquinas,{" "}
            <em className="font-semibold not-italic text-primary">aprovado por humanos</em>.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Crie currículos no formato ATS, valide com IA open source e personalize cada envio
            para a vaga dos seus sonhos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="text-base">
              <Link to={user ? "/resumes" : "/login"}>
                {isLoading ? "Carregando…" : user ? "Acessar meus currículos" : "Começar agora"}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base">
              <a href="#como-funciona">Como funciona</a>
            </Button>
          </div>
        </section>

        <section id="como-funciona" className="grid gap-4 pb-24 md:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="section-card">
              <f.icon className="mb-3 h-6 w-6 text-primary" />
              <h2 className="font-display text-xl font-semibold">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
