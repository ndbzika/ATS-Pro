# Currículo ATS Pro

Sistema completo para criação, validação e personalização de currículos compatíveis com ATS (Applicant Tracking Systems).

## Funcionalidades

- **Contas e múltiplos currículos** — login com Kimi, crie e gerencie quantos currículos quiser.
- **Editor completo** — dados pessoais, objetivo profissional (máx. 500 caracteres), experiências, formação, habilidades técnicas e comportamentais, idiomas e certificações.
- **Verificação ATS com IA** — análise por modelo open source (selecionado em tempo de execução a partir da lista de modelos disponíveis, preferindo famílias de pesos abertos como Kimi K2, DeepSeek, Qwen e Llama), combinada com um verificador heurístico local: nota 0–100, problemas por severidade, pontos fortes e palavras-chave ausentes.
- **Personalização por vaga** — cole título e descrição da vaga; a IA otimiza o currículo usando apenas informações reais do candidato e devolve insights de melhorias, correções e requisitos faltantes.
- **IA configurável pelo usuário (BYOK)** — cada usuário pode usar a própria chave de API da **OpenAI (ChatGPT)**, **Claude (Anthropic)** ou **Kimi (Moonshot)**. Com chave própria configurada, as análises consomem a cota do usuário, nunca a do dono do site. Sem chave, usa-se o gateway da plataforma.
- **Exportação ATS em Word (.docx) e PDF** — coluna única, fontes padrão, sem elementos gráficos que quebram parsers. Requer login e tem limite de requisições.

## Stack

- React 19 + TypeScript + Vite + Tailwind + shadcn/ui
- Hono + tRPC + Drizzle ORM (MySQL)
- AI SDK (`ai` + `@ai-sdk/openai-compatible` + `@ai-sdk/anthropic`)
- Exportação: `docx` (Word) e `pdf-lib` (PDF, fontes embutidas)
- PWA instalável (service worker com autoUpdate)

## Estrutura

```
api/            Backend Hono/tRPC (router, resume-router, settings-router, ai/, export/, routes/)
contracts/      Tipos e schemas Zod compartilhados (resume.ts)
db/             Schema Drizzle (users, resumes, user_ai_settings)
src/pages/      Home, Login, Dashboard, Editor, NotFound
src/components/ ResumeForm, AtsDialog, TailorDialog, AiSettingsDialog, ScoreRing, AuthLayout…
```

## Rodando

```bash
cp .env.example .env   # preencha as variáveis — NUNCA commite o .env
npm install
npm run db:push        # sincroniza o schema
npm run dev            # http://localhost:3000
npm run build && npm start   # produção
```

## Segurança

- **Nenhum segredo no repositório**: credenciais vivem apenas no `.env` (ignorado pelo git); o `.env.example` contém só os nomes das variáveis. Antes de publicar, confira com `git ls-files | grep -i env` — nenhum `.env` real deve aparecer.
- **Chaves BYOK criptografadas em repouso**: AES-256-GCM com chave mestra derivada de `APP_SECRET` (`api/ai/key-crypto.ts`). A chave do usuário nunca é retornada à API nem enviada ao browser — só uma versão mascarada (`••••1234`).
- **A chave do usuário nunca vaza para a plataforma**: com BYOK configurado, as chamadas vão direto ao provedor escolhido; em caso de erro de autenticação, o sistema avisa o usuário em vez de cair no gateway do dono do site.
- **Endpoints de provedores fixos** (sem URL custom) para impedir SSRF.
- **Rate limiting** por usuário nas rotas que custam dinheiro/CPU (análise de IA, teste de chave, exportação).
- **Autenticação em tudo que importa**: tRPC autenticado por usuário com isolamento por `userId`; exportação exige sessão; cookies de sessão assinados (HS256) com expiração.
- **Headers de segurança**: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- **Validação de entrada**: todos os inputs passam por schemas Zod (tamanhos máximos em textos, arrays e payloads).
- **Logs sem segredos**: o pipeline de logs sanitiza tokens/chaves automaticamente.

## Notas

- Sem BYOK configurado, as chamadas de IA são cobradas na quota do dono do site; se a IA estiver indisponível, a verificação ATS degrada para o verificador local com aviso explícito na interface.
- Os currículos salvos são sempre isolados por usuário — nenhum endpoint expõe dados de terceiros por ID.
