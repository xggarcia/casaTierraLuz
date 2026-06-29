# Review — Admin Messages master-detail + hard delete

VERDICT: NEEDS WORK

The feature code itself (TabMessages master-detail rewrite, `remove()` repo method,
DELETE RLS migration, CSS, i18n) is correct and matches the spec almost exactly.
However the pipeline shipped a **false "ALL CHECKS PASS"** test report: the actual
`vitest` suite was never run, and it does not pass. One failure is directly caused
by this feature's spec change.

## What's solid

- `SupabaseMessageRepository.remove(id: number): Promise<void>` is byte-for-byte the
  spec style — `.from('messages').delete().eq('id', id)`, `if (error) throw error`,
  placed between `markAsRead` and `create`. No `any`, correct return type.
- Migration `003_messages_delete_policy.sql` is correct: single `CREATE POLICY
  "Admin messages delete" ON messages FOR DELETE USING (is_admin())`, no `is_admin()`
  redefinition, matches `002_messages.sql` pattern. Ordering is fine (002 creates the
  table + enables RLS, 003 adds the policy). Security is sound — delete is admin-only
  via RLS, no client-side bypass.
- `TabMessages.tsx`: list shows only title + email; detail panel shows all five fields;
  body uses `adm-msg-body` (`white-space: pre-wrap`); date via `toLocaleString('es-ES')`;
  mark-as-read only in active view, delete only in archived view (mutually exclusive
  conditional renders).
- `loadMessages` calls `setSelectedId(null)` before every fetch, so view-switch,
  mark-as-read, and delete all clear stale selection — the main edge case is handled.
- Empty list shows `adm-empty` on the left while the right column keeps the placeholder.
- Error paths set `i18n.error` (load) / `i18n.admin.saveError` (actions) into the
  existing `adm-alert--error` banner.
- All referenced classes (`adm-panel-card`, `adm-form-footer`, `adm-btn--danger`,
  `adm-btn--sm`, `adm-msg-*`) and i18n keys exist. CSS collapses to one column at
  `max-width: 760px`.
- `npx tsc --noEmit` exits 0.

## Issues

### BLOCKER — failing test caused by this feature
`src/test/messaging-system.test.ts:694-700`, test
"no action button rendered in archived view (read-only)" asserts:
```
expect(src).not.toMatch(/view\s*===\s*'archived'[\s\S]{0,200}<button/)
```
The new spec **intentionally** renders a Delete button in the archived view, so this
test now fails. The test encodes the OLD behavior (archived = read-only) and directly
contradicts spec section 3 ("When `view === 'archived'`: one button ... msgDelete").

Fix: update this test to match the new spec — the archived view MUST render exactly one
`adm-btn--danger` button calling `handleDelete`. While there, ADD missing coverage for
the new surface area, none of which is currently tested:
- `SupabaseMessageRepository.remove(id)` — happy path (`from('messages').delete().eq('id', id)`),
  `Promise<void>` resolves undefined, and throw-on-error. (The audit's "ALL CHECKS PASS"
  claimed check #8 covered `remove`, but no test exercises it.)
- `TabMessages` selection reset / master-detail rendering (title+email-only list, detail
  fields, view-appropriate button).
- `supabase/migrations/003_messages_delete_policy.sql` content (admin-only DELETE policy,
  no `is_admin()` redefinition).

### BLOCKER — test report is inaccurate
`.pipeline/test-results.md` states "Method: static code audit + tsc" and concludes
"ALL CHECKS PASS", but the repo HAS a configured test runner (`vitest`) which was not
run. Running it now: **36 failed / 297 passed across 4 failed files.** Green-by-inspection
is not green. The report must reflect an actual `vitest run`.

### WARNING — large unrelated scope in the same working tree
The diff for this branch contains far more than the messages feature: a new
`ContactPage`, `/contacto` route + Header link, full Login/Register visual rewrite
(`ui-page`→`auth-page`, new `auth.css`), scent `description` field, and
`tsconfig.json` now excludes all of `src/test`. Most of the 36 failures come from this
out-of-scope work (wireframe `ui-*` class assertions, Header tests, `admin-crud` scent
shape). This is outside this spec, but it ships together and leaves the suite red.
Whoever owns these changes must green or update those tests before merge; at minimum
this feature must not be merged on top of a red baseline without acknowledging it.

### SUGGESTION — accessibility of clickable rows
`TabMessages.tsx:111-115` — list `<tr onClick=...>` has `cursor: pointer` (CSS) but no
keyboard affordance: no `tabIndex`, no `role="button"`/`onKeyDown`, no `aria-selected`.
Selection is mouse-only and invisible to screen-reader/keyboard users. The spec did not
require this, so it is not a blocker, but consider `tabIndex={0}`, an `onKeyDown` (Enter/
Space → `setSelectedId`), and `aria-selected={m.id === selectedId}` on the row.

### SUGGESTION — no delete confirmation
`handleDelete` permanently deletes with no confirm dialog. The spec explicitly says a
confirm is out of scope, so this is acceptable — flagging only because it is a
destructive, irreversible action triggered by a single click.

## Required to reach SHIP
1. Update `messaging-system.test.ts` archived-view test to expect the Delete button
   (new spec behavior), and add real coverage for `remove()`, the master-detail render,
   and the 003 migration.
2. Regenerate `.pipeline/test-results.md` from an actual `npx vitest run`, not a static
   audit.
3. Get the full suite green (or explicitly scope/justify the unrelated failures that
   ride along in this working tree).
