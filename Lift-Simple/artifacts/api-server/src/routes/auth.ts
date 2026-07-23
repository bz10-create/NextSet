import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetCurrentUserResponse,
  UpdateUserPlanBody,
  UpdateUserPlanResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// GET /auth/me - Get current user (JIT provisioned by requireAuth)
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.localUser!;
  res.json(
    GetCurrentUserResponse.parse({
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      createdAt: user.createdAt.toISOString(),
    }),
  );
});

// PATCH /auth/me/plan - Toggle plan (demo)
router.patch(
  "/auth/me/plan",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = UpdateUserPlanBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ plan: parsed.data.plan })
      .where(eq(usersTable.id, req.localUser!.id))
      .returning();

    res.json(
      UpdateUserPlanResponse.parse({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        plan: updated.plan,
        createdAt: updated.createdAt.toISOString(),
      }),
    );
  },
);

// Stub endpoints — auth is handled by Clerk client-side
router.post("/auth/register", async (_req, res): Promise<void> => {
  res
    .status(400)
    .json({ error: "Registration is handled via Clerk on the client." });
});

router.post("/auth/login", async (_req, res): Promise<void> => {
  res
    .status(400)
    .json({ error: "Login is handled via Clerk on the client." });
});

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.sendStatus(204);
});

export default router;
