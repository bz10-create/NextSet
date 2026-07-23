import { getAuth } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// Extend Express Request to carry the local user record
declare global {
  namespace Express {
    interface Request {
      localUser?: typeof usersTable.$inferSelect;
      clerkUserId?: string;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;

  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.clerkUserId = clerkId;

  // JIT provision local user from Clerk session claims
  const existingUsers = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, clerkId))
    .limit(1);

  if (existingUsers[0]) {
    req.localUser = existingUsers[0];
    next();
    return;
  }

  // Create local user record from Clerk session data
  const claims = auth.sessionClaims as Record<string, unknown> | null;
  const email =
    (claims?.email as string) ||
    (claims?.primary_email_address as string) ||
    `${clerkId}@unknown.local`;
  const name =
    (claims?.name as string) ||
    (claims?.full_name as string) ||
    (claims?.first_name as string) ||
    "Lifter";

  const [newUser] = await db
    .insert(usersTable)
    .values({ clerkId, email, name, plan: "free" })
    .returning();

  req.localUser = newUser;
  next();
};
