import { Router, type IRouter } from "express";
import { db, workoutsTable, workoutExercisesTable, setsTable, exercisesTable } from "@workspace/db";
import { eq, desc, and, gte } from "drizzle-orm";
import {
  GetProgressQueryParams,
  GetProgressResponse,
  GetDashboardResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function epleyOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

function getRangeStartDate(range: string, plan: string): string | null {
  const now = new Date();
  if (plan === "free") {
    // Free plan: last week only
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  }

  switch (range) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d.toISOString().split("T")[0];
    }
    case "month": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().split("T")[0];
    }
    case "three_months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d.toISOString().split("T")[0];
    }
    case "six_months": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d.toISOString().split("T")[0];
    }
    case "year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString().split("T")[0];
    }
    case "all":
      return null;
    default:
      return null;
  }
}

// GET /progress
router.get("/progress", requireAuth, async (req, res): Promise<void> => {
  const qParams = GetProgressQueryParams.safeParse(req.query);
  if (!qParams.success) {
    res.status(400).json({ error: qParams.error.message });
    return;
  }

  const userId = req.localUser!.id;
  const plan = req.localUser!.plan;
  const range = qParams.data.range ?? "week";
  const exerciseIdFilter = qParams.data.exerciseId;

  const startDate = getRangeStartDate(range, plan);

  // Get workouts in range
  const workoutQuery = db
    .select({ id: workoutsTable.id, date: workoutsTable.date })
    .from(workoutsTable)
    .where(
      startDate
        ? and(eq(workoutsTable.userId, userId), gte(workoutsTable.date, startDate))
        : eq(workoutsTable.userId, userId),
    )
    .orderBy(workoutsTable.date);

  const userWorkouts = await workoutQuery;
  const workoutIds = userWorkouts.map((w) => w.id);

  if (workoutIds.length === 0) {
    res.json(
      GetProgressResponse.parse({
        exercises: [],
        range,
      }),
    );
    return;
  }

  // Get all exercises user has done
  const allExercisesQuery = db
    .selectDistinct({ exerciseId: workoutExercisesTable.exerciseId })
    .from(workoutExercisesTable)
    .where(
      exerciseIdFilter
        ? and(
            eq(workoutExercisesTable.exerciseId, exerciseIdFilter),
          )
        : undefined,
    );

  // Also need to check ownership via workout
  const exerciseRows = await db
    .selectDistinct({ exerciseId: workoutExercisesTable.exerciseId })
    .from(workoutExercisesTable)
    .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
    .where(
      exerciseIdFilter
        ? and(
            eq(workoutsTable.userId, userId),
            eq(workoutExercisesTable.exerciseId, exerciseIdFilter),
          )
        : eq(workoutsTable.userId, userId),
    );

  const exerciseProgressList = [];

  for (const { exerciseId } of exerciseRows) {
    const [exercise] = await db
      .select()
      .from(exercisesTable)
      .where(eq(exercisesTable.id, exerciseId))
      .limit(1);

    if (!exercise) continue;

    // Data points: best 1RM per workout date
    const dataPoints: { date: string; value: number; weight: number | null; reps: number | null }[] = [];

    for (const workout of userWorkouts) {
      const [we] = await db
        .select()
        .from(workoutExercisesTable)
        .where(
          and(
            eq(workoutExercisesTable.workoutId, workout.id),
            eq(workoutExercisesTable.exerciseId, exerciseId),
          ),
        )
        .limit(1);

      if (!we) continue;

      const sets = await db
        .select()
        .from(setsTable)
        .where(eq(setsTable.workoutExerciseId, we.id));

      if (sets.length === 0) continue;

      let bestOrm = 0;
      let bestWeight = 0;
      let bestReps = 0;
      for (const s of sets) {
        const orm = epleyOneRepMax(s.weight, s.reps);
        if (orm > bestOrm) {
          bestOrm = orm;
          bestWeight = s.weight;
          bestReps = s.reps;
        }
      }

      dataPoints.push({
        date: workout.date,
        value: Math.round(bestOrm * 10) / 10,
        weight: bestWeight,
        reps: bestReps,
      });
    }

    if (dataPoints.length === 0) continue;

    // Trend
    let trend: "up" | "down" | "flat" | null = null;
    if (dataPoints.length >= 2) {
      const first = dataPoints[0].value;
      const last = dataPoints[dataPoints.length - 1].value;
      if (last > first * 1.02) trend = "up";
      else if (last < first * 0.98) trend = "down";
      else trend = "flat";
    }

    const bestOrm = Math.max(...dataPoints.map((d) => d.value));

    // isPremiumLocked: for free users, this exercise has data outside last week
    // We show what we found (range-filtered), but flag if there's more history
    const isPremiumLocked = plan === "free";

    exerciseProgressList.push({
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      dataPoints,
      bestOneRepMax: bestOrm,
      trend,
      isPremiumLocked,
    });
  }

  res.json(
    GetProgressResponse.parse({
      exercises: exerciseProgressList,
      range,
    }),
  );
});

// GET /dashboard
router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = req.localUser!.id;

  const allWorkouts = await db
    .select()
    .from(workoutsTable)
    .where(eq(workoutsTable.userId, userId))
    .orderBy(desc(workoutsTable.date));

  const totalWorkouts = allWorkouts.length;

  // This week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split("T")[0];
  const thisWeekWorkouts = allWorkouts.filter((w) => w.date >= weekAgoStr).length;

  // Current streak (consecutive days with workouts)
  let currentStreak = 0;
  const workoutDates = new Set(allWorkouts.map((w) => w.date));
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    if (workoutDates.has(dateStr)) {
      currentStreak++;
    } else if (i > 0) {
      break;
    }
  }

  const recentWorkouts = allWorkouts.slice(0, 5).map((w) => ({
    id: w.id,
    userId: w.userId,
    title: w.title ?? null,
    date: w.date,
    isCompleted: w.isCompleted,
    createdAt: w.createdAt.toISOString(),
  }));

  // Top exercises by best 1RM
  const allExercisesUsed = await db
    .selectDistinct({ exerciseId: workoutExercisesTable.exerciseId })
    .from(workoutExercisesTable)
    .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
    .where(eq(workoutsTable.userId, userId));

  const topExercises = [];
  for (const { exerciseId } of allExercisesUsed.slice(0, 5)) {
    const [exercise] = await db
      .select({ name: exercisesTable.name })
      .from(exercisesTable)
      .where(eq(exercisesTable.id, exerciseId))
      .limit(1);

    const rows = await db
      .select({ weight: setsTable.weight, reps: setsTable.reps, createdAt: setsTable.createdAt })
      .from(setsTable)
      .innerJoin(workoutExercisesTable, eq(setsTable.workoutExerciseId, workoutExercisesTable.id))
      .innerJoin(workoutsTable, eq(workoutExercisesTable.workoutId, workoutsTable.id))
      .where(and(eq(workoutExercisesTable.exerciseId, exerciseId), eq(workoutsTable.userId, userId)));

    if (rows.length === 0) continue;

    let best = { orm: 0, weight: 0, reps: 0, achievedAt: new Date() };
    for (const r of rows) {
      const orm = epleyOneRepMax(r.weight, r.reps);
      if (orm > best.orm) best = { orm, weight: r.weight, reps: r.reps, achievedAt: r.createdAt };
    }

    topExercises.push({
      exerciseId,
      exerciseName: exercise?.name ?? null,
      bestOneRepMax: Math.round(best.orm * 10) / 10,
      bestWeight: best.weight,
      bestReps: best.reps,
      achievedAt: best.achievedAt.toISOString(),
    });
  }

  res.json(
    GetDashboardResponse.parse({
      totalWorkouts,
      thisWeekWorkouts,
      currentStreak,
      recentWorkouts,
      topExercises,
      lastWorkoutSummary: null,
    }),
  );
});

export default router;
