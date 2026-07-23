import { pgTable, text, serial, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const exercisesTable = pgTable("exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // lower_body | upper_body | back | shoulders | arms | core | full_body
  notes: text("notes"),
  unit: text("unit").notNull().default("lbs"), // lbs | kg
  isCustom: boolean("is_custom").notNull().default(false),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  targetRepMin: integer("target_rep_min").notNull().default(6),
  targetRepMax: integer("target_rep_max").notNull().default(12),
  movementType: text("movement_type").notNull().default("upper_body"), // upper_body | lower_body
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExerciseSchema = createInsertSchema(exercisesTable).omit({ id: true, createdAt: true });
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercisesTable.$inferSelect;
