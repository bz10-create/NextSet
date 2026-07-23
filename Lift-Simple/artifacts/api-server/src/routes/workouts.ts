import { Router, type IRouter } from "express";
import { db, workoutsTable, workoutExercisesTable, exercisesTable, setsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import {
  ListWorkoutsResponse,
  CreateWorkoutBody,
  CreateWorkoutResponse,
  GetWorkoutParams,
  GetWorkoutResponse,
  UpdateWorkoutParams,
  UpdateWorkoutBody,
  UpdateWorkoutResponse,
  DeleteWorkoutParams,
  CompleteWorkoutParams,
  CompleteWorkoutResponse,
  AddExerciseToWorkoutParams,
  AddExerciseToWorkoutBody,
  AddExerciseToWorkoutResponse,
  RemoveExerciseFromWorkoutParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

/** Convert a Date or date-string to YYYY-MM-DD for db `date` columns. */
function toDateStr(d: Date | string): string {
  if (d instanceof Date) return d.toISOString().split("T")[0];
  return String(d).split("T")[0];
}

function epleyOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

function formatSet(s: {
  id: number;
  workoutExerciseId: number;
  weight: number;
  reps: number;
  notes: string | null;
  setOrder: number;
  estimatedOneRepMax: number | null;
  isCompleted: boolean;
}) {
  return {
    id: s.id,
    workoutExerciseId: s.workoutExerciseId,
    weight: s.weight,
    reps: s.reps,
    notes: s.notes ?? null,
    setOrder: s.setOrder,
    estimatedOneRepMax: s.estimatedOneRepMax ?? null,
    isCompleted: s.isCompleted,
  };
}

async function buildWorkoutExerciseDetail(weId: number, workoutId: number, exerciseId: number, userId: number) {
  const [exercise] = await db
    .select()
    .from(exercisesTable)
    .where(eq(exercisesTable.id, exerciseId))
    .limit(1);

  const sets = await db
    .select()
    .from(setsTable)
    .where(eq(setsTable.workoutExerciseId, weId))
    .orderBy(setsTable.setOrder);

  // Find last time sets: from the most recent prior workout containing this exercise for this user
  const priorWorkoutExercises = await db
    .select({ id: workoutExercisesTable.id })
    .from(workoutExercisesTable)
    .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
    .where(
      and(
        eq(workoutExercisesTable.exerciseId, exerciseId),
        eq(workoutsTable.userId, userId),
      ),
    )
    .orderBy(desc(workoutsTable.date));

  // Filter out current workout's exercise
  const priorWe = priorWorkoutExercises.find((we) => {
    // We need to check it's not from the current workout
    return we.id !== weId;
  });

  let lastTimeSets: typeof sets = [];
  if (priorWe) {
    lastTimeSets = await db
      .select()
      .from(setsTable)
      .where(eq(setsTable.workoutExerciseId, priorWe.id))
      .orderBy(setsTable.setOrder);
  }

  return {
    id: weId,
    workoutId,
    exerciseId,
    exercise: {
      id: exercise.id,
      name: exercise.name,
      category: exercise.category,
      notes: exercise.notes ?? null,
      unit: exercise.unit,
      isCustom: exercise.isCustom,
      userId: exercise.userId ?? null,
      targetRepMin: exercise.targetRepMin,
      targetRepMax: exercise.targetRepMax,
    },
    sets: sets.map(formatSet),
    lastTimeSets: lastTimeSets.map(formatSet),
  };
}

// GET /workouts
router.get("/workouts", requireAuth, async (req, res): Promise<void> => {
  const userId = req.localUser!.id;
  const workouts = await db
    .select()
    .from(workoutsTable)
    .where(eq(workoutsTable.userId, userId))
    .orderBy(desc(workoutsTable.date));

  res.json(
    ListWorkoutsResponse.parse(
      workouts.map((w) => ({
        id: w.id,
        userId: w.userId,
        title: w.title ?? null,
        date: w.date,
        isCompleted: w.isCompleted,
        createdAt: w.createdAt.toISOString(),
      })),
    ),
  );
});

// POST /workouts
router.post("/workouts", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWorkoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [workout] = await db
    .insert(workoutsTable)
    .values({
      userId: req.localUser!.id,
      title: parsed.data.title ?? null,
      date: toDateStr(parsed.data.date),
      isCompleted: false,
    })
    .returning();

  res.status(201).json(
    CreateWorkoutResponse.parse({
      id: workout.id,
      userId: workout.userId,
      title: workout.title ?? null,
      date: workout.date,
      isCompleted: workout.isCompleted,
      createdAt: workout.createdAt.toISOString(),
    }),
  );
});

// GET /workouts/:id
router.get("/workouts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetWorkoutParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const userId = req.localUser!.id;
  const [workout] = await db
    .select()
    .from(workoutsTable)
    .where(
      and(eq(workoutsTable.id, params.data.id), eq(workoutsTable.userId, userId)),
    )
    .limit(1);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  const workoutExercises = await db
    .select()
    .from(workoutExercisesTable)
    .where(eq(workoutExercisesTable.workoutId, workout.id))
    .orderBy(workoutExercisesTable.exerciseOrder);

  const exercises = await Promise.all(
    workoutExercises.map((we) =>
      buildWorkoutExerciseDetail(we.id, workout.id, we.exerciseId, userId),
    ),
  );

  res.json(
    GetWorkoutResponse.parse({
      id: workout.id,
      userId: workout.userId,
      title: workout.title ?? null,
      date: workout.date,
      isCompleted: workout.isCompleted,
      createdAt: workout.createdAt.toISOString(),
      exercises,
    }),
  );
});

// PATCH /workouts/:id
router.patch("/workouts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateWorkoutParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateWorkoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.localUser!.id;
  const [workout] = await db
    .select()
    .from(workoutsTable)
    .where(
      and(eq(workoutsTable.id, params.data.id), eq(workoutsTable.userId, userId)),
    )
    .limit(1);

  if (!workout) {
    res.status(404).json({ error: "Workout not found" });
    return;
  }

  const updateData: Partial<typeof workoutsTable.$inferInsert> = {};
  if ("title" in parsed.data) updateData.title = parsed.data.title ?? null;
  if (parsed.data.date !== undefined) updateData.date = toDateStr(parsed.data.date);

  const [updated] = await db
    .update(workoutsTable)
    .set(updateData)
    .where(eq(workoutsTable.id, params.data.id))
    .returning();

  res.json(
    UpdateWorkoutResponse.parse({
      id: updated.id,
      userId: updated.userId,
      title: updated.title ?? null,
      date: updated.date,
      isCompleted: updated.isCompleted,
      createdAt: updated.createdAt.toISOString(),
    }),
  );
});

// DELETE /workouts/:id
router.delete(
  "/workouts/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = DeleteWorkoutParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const userId = req.localUser!.id;
    const [workout] = await db
      .select()
      .from(workoutsTable)
      .where(
        and(
          eq(workoutsTable.id, params.data.id),
          eq(workoutsTable.userId, userId),
        ),
      )
      .limit(1);

    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }

    await db.delete(workoutsTable).where(eq(workoutsTable.id, params.data.id));
    res.sendStatus(204);
  },
);

// POST /workouts/:id/complete
router.post(
  "/workouts/:id/complete",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = CompleteWorkoutParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const userId = req.localUser!.id;
    const [workout] = await db
      .select()
      .from(workoutsTable)
      .where(
        and(
          eq(workoutsTable.id, params.data.id),
          eq(workoutsTable.userId, userId),
        ),
      )
      .limit(1);

    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }

    await db
      .update(workoutsTable)
      .set({ isCompleted: true })
      .where(eq(workoutsTable.id, params.data.id));

    // Build summary
    const workoutExercises = await db
      .select()
      .from(workoutExercisesTable)
      .where(eq(workoutExercisesTable.workoutId, workout.id));

    let totalSets = 0;
    const highlights: string[] = [];

    for (const we of workoutExercises) {
      const [exercise] = await db
        .select()
        .from(exercisesTable)
        .where(eq(exercisesTable.id, we.exerciseId))
        .limit(1);

      const sets = await db
        .select()
        .from(setsTable)
        .where(eq(setsTable.workoutExerciseId, we.id));

      totalSets += sets.length;

      // Find best set for this exercise today
      const bestToday = sets.reduce(
        (best, s) => {
          const orm = epleyOneRepMax(s.weight, s.reps);
          return orm > best.orm ? { orm, weight: s.weight, reps: s.reps } : best;
        },
        { orm: 0, weight: 0, reps: 0 },
      );

      // Find best previous set for this exercise
      const priorWes = await db
        .select({ id: workoutExercisesTable.id })
        .from(workoutExercisesTable)
        .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
        .where(
          and(
            eq(workoutExercisesTable.exerciseId, we.exerciseId),
            eq(workoutsTable.userId, userId),
          ),
        );

      const priorWeIds = priorWes
        .filter((pw) => pw.id !== we.id)
        .map((pw) => pw.id);

      if (priorWeIds.length > 0 && sets.length > 0) {
        // Get all prior sets (simplified: compare best weight)
        for (const priorWeId of priorWeIds) {
          const priorSets = await db
            .select()
            .from(setsTable)
            .where(eq(setsTable.workoutExerciseId, priorWeId));

          if (priorSets.length > 0) {
            const bestPrior = Math.max(...priorSets.map((s) => s.weight));
            const improvement = bestToday.weight - bestPrior;
            if (improvement > 0 && exercise) {
              highlights.push(
                `You added ${improvement} ${exercise.unit} to your ${exercise.name} since last time`,
              );
            }
            break;
          }
        }
      }
    }

    const messages = [
      "Great work — every rep counts!",
      "You showed up and put in the work. That's what matters.",
      "Consistency builds strength. Keep it up!",
      "Another workout down. You're making progress!",
      "Well done! Your body is getting stronger.",
    ];
    const message =
      highlights.length > 0
        ? highlights[0]
        : messages[Math.floor(Math.random() * messages.length)];

    res.json(
      CompleteWorkoutResponse.parse({
        workoutId: workout.id,
        message,
        highlights,
        totalSets,
        totalExercises: workoutExercises.length,
      }),
    );
  },
);

// POST /workouts/:id/exercises
router.post(
  "/workouts/:id/exercises",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = AddExerciseToWorkoutParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const parsed = AddExerciseToWorkoutBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const userId = req.localUser!.id;
    const [workout] = await db
      .select()
      .from(workoutsTable)
      .where(
        and(
          eq(workoutsTable.id, params.data.id),
          eq(workoutsTable.userId, userId),
        ),
      )
      .limit(1);

    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }

    // Count existing exercises for order
    const existing = await db
      .select()
      .from(workoutExercisesTable)
      .where(eq(workoutExercisesTable.workoutId, workout.id));

    const [we] = await db
      .insert(workoutExercisesTable)
      .values({
        workoutId: workout.id,
        exerciseId: parsed.data.exerciseId,
        exerciseOrder: existing.length,
      })
      .returning();

    const detail = await buildWorkoutExerciseDetail(
      we.id,
      workout.id,
      we.exerciseId,
      userId,
    );

    res.status(201).json(AddExerciseToWorkoutResponse.parse(detail));
  },
);

// DELETE /workouts/:id/exercises/:workoutExerciseId
router.delete(
  "/workouts/:id/exercises/:workoutExerciseId",
  requireAuth,
  async (req, res): Promise<void> => {
    const params = RemoveExerciseFromWorkoutParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    const userId = req.localUser!.id;
    const [workout] = await db
      .select()
      .from(workoutsTable)
      .where(
        and(
          eq(workoutsTable.id, params.data.id),
          eq(workoutsTable.userId, userId),
        ),
      )
      .limit(1);

    if (!workout) {
      res.status(404).json({ error: "Workout not found" });
      return;
    }

    const [we] = await db
      .select()
      .from(workoutExercisesTable)
      .where(
        and(
          eq(workoutExercisesTable.id, params.data.workoutExerciseId),
          eq(workoutExercisesTable.workoutId, workout.id),
        ),
      )
      .limit(1);

    if (!we) {
      res.status(404).json({ error: "Workout exercise not found" });
      return;
    }

    await db
      .delete(workoutExercisesTable)
      .where(eq(workoutExercisesTable.id, we.id));
    res.sendStatus(204);
  },
);

export default router;
