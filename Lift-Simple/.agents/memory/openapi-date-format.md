---
name: OpenAPI date format issue
description: format:date in OpenAPI spec generates zod.coerce.date() which returns JS Date objects, not strings — must convert before Drizzle inserts.
---

## Rule
Never pass `parsed.data.<dateField>` directly into a Drizzle insert when the OpenAPI field uses `format: date`. Always convert it first.

## Why
Orval generates `zod.coerce.date()` for `format: date` fields. When Zod parses the request body, it coerces the ISO string into a JavaScript `Date` object. Drizzle's `date("col", { mode: "string" })` columns expect a plain `YYYY-MM-DD` string — passing a `Date` causes a TypeScript error and runtime failure.

## How to apply
Add a helper in route files:
```typescript
function toDateStr(d: Date | string): string {
  if (d instanceof Date) return d.toISOString().split("T")[0];
  return String(d).split("T")[0];
}
```
Then use: `date: toDateStr(parsed.data.date)` in all insert/update calls.
