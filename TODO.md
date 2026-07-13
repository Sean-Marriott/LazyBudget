# TODO

Tracking findings from the 2026-07-13 code review of the budgets feature
(`git diff` covering `src/lib/queries/budgets.ts`, `src/app/api/budgets/**`,
`src/components/budget/**`, `src/lib/db/errors.ts`, and related category/
transaction-table changes).

## Done

- [x] **Category rename/delete orphaned budget lines** — `budgets.category` is
  free text, not an FK, so renaming/deleting a category never touched
  matching `budgets` rows; the line would show $0 spent forever and become
  unselectable in the UI. Fixed via `cascadeCategoryRename` /
  `deleteBudgetsForCategory` in `src/lib/queries/budgets.ts`, wired into
  `src/app/api/categories/[id]/route.ts` (PATCH) and
  `src/lib/queries/categories.ts` (`deleteCategory`), inside the same
  transaction as the existing `transactions.userCategory` cascade.

## Open

- [ ] **Missing upper bound on budget `amount`** — `src/app/api/budgets/route.ts:50`
  and `src/app/api/budgets/[id]/route.ts:46` only check
  `Number.isFinite(amount) && amount > 0`. An amount with ≥11 integer
  digits overflows the `numeric(12,2)` column (`src/lib/db/schema.ts:95`);
  Postgres raises `numeric field overflow` (code 22003), which
  `isUniqueViolation` doesn't catch, so it re-throws as an unhandled 500
  instead of a clean 400. Add a max check (e.g. `amount <= 9_999_999_999.99`)
  alongside the existing `> 0` check in both routes.

- [ ] **CRLF not stripped in `reset-password.mjs` piped input** —
  `scripts/reset-password.mjs:33` splits piped stdin only on `"\n"`. CRLF-
  terminated input (e.g. piped from a Windows-originated source) leaves a
  trailing `\r` baked into the password before hashing; the script's own
  read-back self-check passes (it compares against the same in-memory
  variable) but a real login submitting the password without `\r` will
  never match. Only the non-TTY/piped branch is affected — interactive use
  via `readline` is fine. Fix: strip a trailing `\r` from each line in the
  non-TTY branch.

- [ ] **Redundant `getBudgetById` pre-fetch in PATCH/DELETE** —
  `src/app/api/budgets/[id]/route.ts:57` (PATCH) and `:97` (DELETE) each
  fetch the row purely for the 404 check before mutating, costing one
  extra DB round trip per request. `updateBudget`'s empty-`returning()`
  already provides the 404 check (matches the codebase convention
  documented in CLAUDE.md); `deleteBudget` needs a small signature change
  (`.returning({id: budgets.id})` + length check) to drop its pre-fetch too.

- [ ] **Month validation/parsing duplicated in 4 places** — identical
  `MONTH_RE` regex in `src/app/api/budgets/route.ts:6` and
  `src/app/api/budgets/copy/route.ts:8`; near-identical `date-fns`
  parse/isValid/startOfMonth block in `src/app/(app)/budget/page.tsx:32-36`
  and `src/app/(app)/cashflow/page.tsx:33-36`. Extract a shared
  `isValidMonthKey` / `parseMonthParam` into `src/lib/utils/dates.ts`
  alongside the existing `formatMonthKey`/`formatMonthLabel` helpers.

- [ ] **`isUniqueViolation` check-and-409 duplicated across 4 route handlers**
  — `src/app/api/budgets/route.ts:69`, `src/app/api/budgets/[id]/route.ts:74`,
  `src/app/api/categories/route.ts:53`, `src/app/api/categories/[id]/route.ts:93`
  all repeat the same 8-line try/catch shape. A future unique-constrained
  route (goals, manual accounts) that forgets this pattern will leak a raw
  500 instead of a 409. A small `uniqueViolationResponse(err, message)`
  helper (not a full route-wrapping HOF — that's overkill for 4 call
  sites) would cut each site to ~3 lines.

- [ ] **CRUD boilerplate duplicated across Budget/Category/Rule
  dialogs & cards** — `src/components/budget/BudgetDialog.tsx:85-119` and
  `BudgetRow.tsx:34-54` are structurally identical to
  `src/components/categories/CategoryDialog.tsx` / `CategoryCard.tsx` and
  `src/components/rules/RuleDialog.tsx` / `RuleCard.tsx` (fetch/save/error
  handling, `window.confirm` delete flow). Low priority — this is the
  third copy of an already-tolerated convention, not new debt — but a
  shared `useCrudForm`/`useDeleteAction` hook would remove ~45 lines of
  duplication per future feature.
