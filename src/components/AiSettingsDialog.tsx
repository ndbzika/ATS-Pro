import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, ShieldCheck, Trash2, PlugZap, ExternalLink } from "lucide-react";

type ProviderId = "openai" | "anthropic" | "kimi";

/**
 * Configuração de IA do usuário (BYOK): ele informa provedor, chave e modelo,
 * e as análises passam a consumir a cota DELE — não a do dono do site.
 * A chave viaja apenas ao servidor (mesma origem, HTTPS), é criptografada em
 * repouso (AES-256-GCM) e nunca é devolvida ao browser — só a versão mascarada.
 */
export function AiSettingsDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.settings.ai.useQuery(undefined, { enabled: open });

  const [provider, setProvider] = useState<ProviderId>("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    if (settings?.configured) {
      setProvider(settings.provider);
      setModel(settings.model);
      setApiKey("");
    }
  }, [settings]);

  const providers = settings?.providers;
  const current = providers?.[provider];

  const invalidate = () => utils.settings.ai.invalidate();

  const saveMutation = trpc.settings.saveAi.useMutation({
    onSuccess: () => {
      invalidate();
      setApiKey("");
      toast.success("Configuração de IA salva. As próximas análises usarão sua chave.");
    },
    onError: (e) => toast.error(e.message || "Não foi possível salvar."),
  });

  const testMutation = trpc.settings.testAi.useMutation({
    onSuccess: () => toast.success("Conexão OK! Salve para aplicar."),
    onError: (e) => toast.error(e.message || "Falha no teste de conexão."),
  });

  const removeMutation = trpc.settings.removeAi.useMutation({
    onSuccess: () => {
      invalidate();
      setApiKey("");
      toast.success("Chave removida. Voltando a usar a IA da plataforma.");
    },
    onError: () => toast.error("Não foi possível remover."),
  });

  const canSubmit = apiKey.trim().length >= 16 && model.trim().length >= 2;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Settings2 className="mr-2 h-4 w-4" /> Configurar IA
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Configurar IA</DialogTitle>
          <DialogDescription>
            Use sua própria chave de API (OpenAI, Claude ou Kimi) e as análises de IA deixam de
            consumir a cota do dono do site.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2 rounded-lg border p-3 text-sm">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
              {settings?.configured ? (
                <span>
                  Usando <strong>{providers?.[settings.provider]?.label}</strong> · modelo{" "}
                  <code className="text-xs">{settings.model}</code> · chave{" "}
                  <code className="text-xs">{settings.maskedKey}</code>
                </span>
              ) : (
                <span>
                  Nenhuma chave configurada — as análises usam a{" "}
                  <strong>IA da plataforma</strong> (modelo open source, cota do dono do site).
                </span>
              )}
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ai-provider">Provedor</Label>
                <Select value={provider} onValueChange={(v) => setProvider(v as ProviderId)}>
                  <SelectTrigger id="ai-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers &&
                      (Object.keys(providers) as ProviderId[]).map((id) => (
                        <SelectItem key={id} value={id}>
                          {providers[id].label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-key">Chave de API</Label>
                <Input
                  id="ai-key"
                  type="password"
                  autoComplete="off"
                  placeholder={settings?.configured ? "Deixe em branco para manter a atual" : "Cole sua chave aqui"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                {current && (
                  <p className="text-xs text-muted-foreground">
                    Obtenha sua chave em{" "}
                    <a
                      href={current.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 underline underline-offset-2"
                    >
                      {current.docsUrl.replace(/^https:\/\//, "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ai-model">Modelo</Label>
                <Input
                  id="ai-model"
                  placeholder={current?.modelPlaceholder ?? "nome do modelo"}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {provider === "kimi"
                    ? "Kimi K2 é open source (pesos abertos)."
                    : "Digite o nome exato do modelo da sua conta."}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Sua chave é criptografada (AES-256-GCM) antes de ser salva e nunca sai do servidor.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                disabled={!canSubmit || testMutation.isPending}
                onClick={() => testMutation.mutate({ provider, apiKey: apiKey.trim(), model: model.trim() })}
              >
                <PlugZap className="mr-2 h-4 w-4" />
                {testMutation.isPending ? "Testando…" : "Testar conexão"}
              </Button>
              <Button
                disabled={!canSubmit || saveMutation.isPending}
                onClick={() => saveMutation.mutate({ provider, apiKey: apiKey.trim(), model: model.trim() })}
              >
                {saveMutation.isPending ? "Salvando…" : "Salvar"}
              </Button>
              {settings?.configured && (
                <Button
                  variant="ghost"
                  className="text-destructive"
                  disabled={removeMutation.isPending}
                  onClick={() => removeMutation.mutate()}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Remover chave
                </Button>
              )}
              {testMutation.isSuccess && (
                <Badge variant="secondary">conexão verificada</Badge>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
