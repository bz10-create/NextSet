import { Router, type IRouter } from "express";
import { db, setsTable, workoutExercisesTable, workoutsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import {
  AddSetParams,
  AddSetBody,
  AddSetResponse,
  UpdateSetParams,
  UpdateSetBody,
  UpdateSetResponse,
  DeleteSetParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function epleyOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// POST /workout-exercises/:workoutExerciseId/sets
router.post(
  "/workout-exercises/:workoutExerciseId/sets",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = AddSetParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = AddSetBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const userId = req.localUser!.id;

    // Verify ownership
    const [we] = await db
      .select()
      .from(workoutExercisesTable)
      .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
      .where(
        and(
          eq(workoutExercisesTable.id, params.data.workoutExerciseId),
          eq(workoutsTable.userId, userId),
        ),
      )
      .limit(1);

    if (!we) {
      res.status(404).json({ error: "Workout exercise not found" });
      return;
    }

    // Count existing sets for order
    const existingSets = await db
      .select()
      .from(setsTable)
      .where(eq(setsTable.workoutExerciseId, params.data.workoutExerciseId));

    const orm = Math.round(epleyOneRepMax(parsed.data.weight, parsed.data.reps) * 10) / 10;

    const [set] = await db
      .insert(setsTable)
      .values({
        workoutExerciseId: params.data.workoutExerciseId,
        weight: parsed.data.weight,
        reps: parsed.data.reps,
        notes: parsed.data.notes ?? null,
        setOrder: existingSets.length,
        estimatedOneRepMax: orm,
        isCompleted: parsed.data.isCompleted ?? false,
      })
      .returning();

    res.status(201).json(
      AddSetResponse.parse({
        id: set.id,
        workoutExerciseId: set.workoutExerciseId,
        weight: set.weight,
        reps: set.reps,
        notes: set.notes ?? null,
        setOrder: set.setOrder,
        estimatedOneRepMax: set.estimatedOneRepMax ?? null,
        isCompleted: set.isCompleted,
      }),
    );
  },
);

// PATCH /sets/:id
router.patch("/sets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateSetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateSetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.localUser!.id;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(setsTable)
    .innerJoin(workoutExercisesTable, eq(setsTable.workoutExerciseId, workoutExercisesTable.id))
    .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
    .where(
      and(eq(setsTable.id, params.data.id), eq(workoutsTable.userId, userId)),
    )
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Set not found" });
    return;
  }

  const updateData: Partial<typeof setsTable.$inferInsert> = {};
  if (parsed.data.weight !== undefined) updateData.weight = parsed.data.weight;
  if (parsed.data.reps !== undefined) updateData.reps = parsed.data.reps;
  if ("notes" in parsed.data) updateData.notes = parsed.data.notes ?? null;
  if (parsed.data.isCompleted !== undefined) updateData.isCompleted = parsed.data.isCompleted;

  // Recalculate 1RM if weight or reps changed
  const currentSet = existing.sets;
  const newWeight = parsed.data.weight ?? currentSet.weight;
  const newReps = parsed.data.reps ?? currentSet.reps;
  updateData.estimatedOneRepMax =
    Math.round(epleyOneRepMax(newWeight, newReps) * 10) / 10;

  const [updated] = await db
    .update(setsTable)
    .set(updateData)
    .where(eq(setsTable.id, params.data.id))
    .returning();

  res.json(
    UpdateSetResponse.parse({
      id: updated.id,
      workoutExerciseId: updated.workoutExerciseId,
      weight: updated.weight,
      reps: updated.reps,
      notes: updated.notes ?? null,
      setOrder: updated.setOrder,
      estimatedOneRepMax: updated.estimatedOneRepMax ?? null,
      isCompleted: updated.isCompleted,
    }),
  );
});

// DELETE /sets/:id
router.delete("/sets/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSetParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.localUser!.id;

  const [existing] = await db
    .select()
    .from(setsTable)
    .innerJoin(workoutExercisesTable, eq(setsTable.workoutExerciseId, workoutExercisesTable.id))
    .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
    .where(
      and(eq(setsTable.id, params.data.id), eq(workoutsTable.userId, userId)),
    )
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Set not found" });
    return;
  }

  await db.delete(setsTable).where(eq(setsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
