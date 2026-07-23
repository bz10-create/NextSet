---
name: Clerk JIT user provisioning
description: Pattern for auto-creating local DB user records from Clerk session data on first API call, avoiding a separate register endpoint.
---

## Rule
When using Clerk auth, do NOT implement a `/auth/register` backend endpoint. Instead, use JIT (just-in-time) provisioning in the `requireAuth` middleware: look up the user by `clerkId`, and if not found, create from session claims.

## Why
Clerk handles registration entirely on the client side. The backend never sees the registration flow. A separate register endpoint would be called at the wrong time and duplicate logic. The first authenticated API call (e.g. GET /auth/me) is the right place to create the local record.

## How to apply
In `artifacts/api-server/src/lib/auth.ts`:
1. Extract `auth.userId` (the Clerk ID) from the request via `getAuth(req)`
2. Query `usersTable` by `clerkId`
3. If not found, insert a new row using `auth.sessionClaims` for email/name
4. Attach `req.localUser` for all downstream route handlers

Email/name fallbacks from claims:
- email: `claims.email` → `claims.primary_email_address` → fallback string
- name: `claims.name` → `claims.full_name` → `claims.first_name` → "Lifter"
