import { pgTable, serial, text, timestamp, integer, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";

export const deploymentStatusEnum = pgEnum("deployment_status", ["pending", "building", "running", "failed", "stopped"]);
export const deploymentEnvironmentEnum = pgEnum("deployment_environment", ["production", "staging", "preview"]);

export const deploymentsTable = pgTable("deployments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projectsTable.id, { onDelete: "cascade" }),
  status: deploymentStatusEnum("status").notNull().default("pending"),
  url: text("url"),
  buildLog: text("build_log"),
  environment: deploymentEnvironmentEnum("environment").notNull().default("production"),
  envVars: jsonb("env_vars").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDeploymentSchema = createInsertSchema(deploymentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deploymentsTable.$inferSelect;
