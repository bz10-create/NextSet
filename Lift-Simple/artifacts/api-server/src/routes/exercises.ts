import { Router, type IRouter } from "express";
import { db, exercisesTable, setsTable, workoutExercisesTable, workoutsTable } from "@workspace/db";
import { eq, or, isNull, desc, and } from "drizzle-orm";
import {
  ListExercisesResponse,
  CreateExerciseBody,
  CreateExerciseResponse,
  GetExerciseParams,
  GetExerciseResponse,
  UpdateExerciseParams,
  UpdateExerciseBody,
  UpdateExerciseResponse,
  DeleteExerciseParams,
  GetExerciseBestParams,
  GetExerciseBestResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function epleyOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

// GET /exercises
router.get("/exercises", requireAuth, async (req, res): Promise<void> => {
  const userId = req.localUser!.id;
  const exercises = await db
    .select()
    .from(exercisesTable)
    .where(or(isNull(exercisesTable.userId), eq(exercisesTable.userId, userId)))
    .orderBy(exercisesTable.name);

  res.json(
    ListExercisesResponse.parse(
      exercises.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        notes: e.notes ?? null,
        unit: e.unit,
        isCustom: e.isCustom,
        userId: e.userId ?? null,
        targetRepMin: e.targetRepMin,
        targetRepMax: e.targetRepMax,
        movementType: e.movementType,
      })),
    ),
  );
});

// POST /exercises
router.post("/exercises", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateExerciseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [exercise] = await db
    .insert(exercisesTable)
    .values({
      name: parsed.data.name,
      category: parsed.data.category,
      notes: parsed.data.notes ?? null,
      unit: parsed.data.unit ?? "lbs",
      isCustom: true,
      userId: req.localUser!.id,
      targetRepMin: parsed.data.targetRepMin ?? 6,
      targetRepMax: parsed.data.targetRepMax ?? 12,
      movementType: parsed.data.movementType ?? "upper_body",
    })
    .returning();

  res.status(201).json(
    CreateExerciseResponse.parse({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      notes: exercise.notes ?? null,
      unit: exercise.unit,
      isCustom: exercise.isCustom,
      userId: exercise.userId ?? null,
      targetRepMin: exercise.targetRepMin,
      targetRepMax: exercise.targetRepMax,
      movementType: exercise.movementType,
    }),
  );
});

// GET /exercises/:id
router.get("/exercises/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetExerciseParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.localUser!.id;
  const [exercise] = await db
    .select()
    .from(exercisesTable)
    .where(
      and(
        eq(exercisesTable.id, params.data.id),
        or(isNull(exercisesTable.userId), eq(exercisesTable.userId, userId)),
      ),
    )
    .limit(1);

  if (!exercise) {
    res.status(404).json({ error: "Exercise not found" });
    return;
  }

  res.json(
    GetExerciseResponse.parse({
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      notes: exercise.notes ?? null,
      unit: exercise.unit,
      isCustom: exercise.isCustom,
      userId: exercise.userId ?? null,
      targetRepMin: exercise.targetRepMin,
      targetRepMax: exercise.targetRepMax,
      movementType: exercise.movementType,
    }),
  );
});

// PATCH /exercises/:id
router.patch(
  "/exercises/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = UpdateExerciseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = UpdateExerciseBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [exercise] = await db
      .select()
      .from(exercisesTable)
      .where(
        and(
          eq(exercisesTable.id, params.data.id),
          eq(exercisesTable.userId, req.localUser!.id),
          eq(exercisesTable.isCustom, true),
        ),
      )
      .limit(1);

    if (!exercise) {
      res.status(404).json({ error: "Exercise not found" });
      return;
    }

    const updateData: Partial<typeof exercisesTable.$inferInsert> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
    if ("notes" in parsed.data) updateData.notes = parsed.data.notes ?? null;
    if (parsed.data.unit !== undefined) updateData.unit = parsed.data.unit;
    if (parsed.data.targetRepMin !== undefined) updateData.targetRepMin = parsed.data.targetRepMin;
    if (parsed.data.targetRepMax !== undefined) updateData.targetRepMax = parsed.data.targetRepMax;
    if (parsed.data.movementType !== undefined) updateData.movementType = parsed.data.movementType;

    const [updated] = await db
      .update(exercisesTable)
      .set(updateData)
      .where(eq(exercisesTable.id, params.data.id))
      .returning();

    res.json(
      UpdateExerciseResponse.parse({
        id: updated.id,
        name: updated.name,
        category: updated.category,
        notes: updated.notes ?? null,
        unit: updated.unit,
        isCustom: updated.isCustom,
        userId: updated.userId ?? null,
        targetRepMin: updated.targetRepMin,
        targetRepMax: updated.targetRepMax,
        movementType: updated.movementType,
      }),
    );
  },
);

// DELETE /exercises/:id
router.delete(
  "/exercises/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteExerciseParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const [exercise] = await db
      .select()
      .from(exercisesTable)
      .where(
        and(
          eq(exercisesTable.id, params.data.id),
          eq(exercisesTable.userId, req.localUser!.id),
          eq(exercisesTable.isCustom, true),
        ),
      )
      .limit(1);

    if (!exercise) {
      res.status(404).json({ error: "Exercise not found" });
      return;
    }

    await db
      .delete(exercisesTable)
      .where(eq(exercisesTable.id, params.data.id));
    res.sendStatus(204);
  },
);

// GET /exercises/:id/best
router.get(
  "/exercises/:id/best",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = GetExerciseBestParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const userId = req.localUser!.id;

    // Get all sets for this exercise for this user, ordered by 1RM desc
    const rows = await db
      .select({
        weight: setsTable.weight,
        reps: setsTable.reps,
        createdAt: setsTable.createdAt,
      })
      .from(setsTable)
      .innerJoin(
        workoutExercisesTable,
        eq(setsTable.workoutExerciseId, workoutExercisesTable.id),
      )
      .innerJoin(
        workoutsTable,
        eq(workoutExercisesTable.workoutId, workoutsTable.id),
      )
      .where(
        and(
          eq(workoutExercisesTable.exerciseId, params.data.id),
          eq(workoutsTable.userId, userId),
        ),
      )
      .orderBy(desc(setsTable.createdAt));

    if (rows.length === 0) {
      res.json(
        GetExerciseBestResponse.parse({
          exerciseId: params.data.id,
          bestOneRepMax: null,
          bestWeight: null,
          bestReps: null,
          achievedAt: null,
        }),
      );
      return;
    }

    let best = { orm: 0, weight: 0, reps: 0, achievedAt: new Date() };
    for (const row of rows) {
      const orm = epleyOneRepMax(row.weight, row.reps);
      if (orm > best.orm) {
        best = { orm, weight: row.weight, reps: row.reps, achievedAt: row.createdAt };
      }
    }

    res.json(
      GetExerciseBestResponse.parse({
        exerciseId: params.data.id,
        bestOneRepMax: Math.round(best.orm * 10) / 10,
        bestWeight: best.weight,
        bestReps: best.reps,
        achievedAt: best.achievedAt.toISOString(),
      }),
    );
  },
);

export default router;
