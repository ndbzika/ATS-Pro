import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  text,
  timestamp,
  bigint,
  int,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const resumes = mysqlTable("resumes", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  language: varchar("language", { length: 8 }).default("pt-BR").notNull(),
  data: json("data").notNull(),
  targetJobTitle: varchar("targetJobTitle", { length: 255 }),
  targetJobDescription: text("targetJobDescription"),
  atsScore: int("atsScore"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Resume = typeof resumes.$inferSelect;
export type InsertResume = typeof resumes.$inferInsert;

/**
 * Configuração de IA por usuário (BYOK — "traga sua própria chave").
 * A chave de API NUNCA é armazenada em texto claro: `encryptedKey` guarda
 * `v1.<iv>.<tag>.<cipher>` em base64 (AES-256-GCM, chave derivada de
 * APP_SECRET — ver api/ai/key-crypto.ts). Sem linha aqui, as chamadas de IA
 * usam o gateway da plataforma (cota do dono do site).
 */
export const userAiSettings = mysqlTable("user_ai_settings", {
  id: serial("id").primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true })
    .notNull()
    .unique()
    .references(() => users.id),
  provider: mysqlEnum("provider", ["openai", "anthropic", "kimi"]).notNull(),
  encryptedKey: text("encryptedKey").notNull(),
  model: varchar("model", { length: 120 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type UserAiSettings = typeof userAiSettings.$inferSelect;
export type InsertUserAiSettings = typeof userAiSettings.$inferInsert;

// TODO: Add your tables here. See docs/Database.md for schema examples and patterns.
//
// Example:
// export const posts = mysqlTable("posts", {
//   id: serial("id").primaryKey(),
//   title: varchar("title", { length: 255 }).notNull(),
//   content: text("content"),
//   createdAt: timestamp("created_at").notNull().defaultNow(),
// });
//
// Note: FK columns referencing a serial() PK must use:
//   bigint("columnName", { mode: "number", unsigned: true }).notNull()
