import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { resumeRouter } from "./resume-router";
import { settingsRouter } from "./settings-router";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  resume: resumeRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
