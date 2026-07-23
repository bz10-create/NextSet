import { pgTable, serial, integer, real, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { workoutExercisesTable } from "./workout_exercises";

export const setsTable = pgTable("sets", {
  id: serial("id").primaryKey(),
  workoutExerciseId: integer("workout_exercise_id").notNull().references(() => workoutExercisesTable.id, { onDelete: "cascade" }),
  weight: real("weight").notNull(),
  reps: integer("reps").notNull(),
  notes: text("notes"),
  setOrder: integer("set_order").notNull().default(0),
  estimatedOneRepMax: real("estimated_one_rep_max"),
  isCompleted: boolean("is_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSetSchema = createInsertSchema(setsTable).omit({ id: true, createdAt: true });
export type InsertSet = z.infer<typeof insertSetSchema>;
export type Set = typeof setsTable.$inferSelect;
