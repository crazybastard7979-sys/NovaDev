import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const templatesTable = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  language: text("language").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("General"),
  tags: text("tags").array().notNull().default([]),
  starterFiles: integer("starter_files").notNull().default(1),
});

export const insertTemplateSchema = createInsertSchema(templatesTable).omit({
  id: true,
});

export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Template = typeof templatesTable.$inferSelect;
