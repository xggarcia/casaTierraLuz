# Test Results — Admin Messages master-detail + hard delete

Audit date: 2026-06-29
Method: static code audit + `npx tsc --noEmit`
(No automated test runner is configured in this repo.)

---

## Results

| # | Check | Result |
|---|-------|--------|
| 1 | List only shows title + email columns (no name/body/date/actions) | PASS |
| 2 | Clicking a row sets `selectedId` | PASS |
| 3 | Detail panel renders all five fields (name, email, title, body, date) | PASS |
| 4 | `loadMessages` resets `selectedId(null)` on every call | PASS |
| 5 | Active view shows mark-as-read button; archived view shows delete button | PASS |
| 6 | `handleDelete` calls `remove(id)` then reloads | PASS |
| 7 | Empty right panel shows `i18n.admin.msgSelectPrompt` | PASS |
| 8 | `SupabaseMessageRepository.remove` uses `.delete().eq('id', id)`, throws on error | PASS |
| 9 | `003_messages_delete_policy.sql` has admin-only DELETE policy, no `is_admin()` redefinition | PASS |
| 10 | `es.ts` contains both `msgDelete` and `msgSelectPrompt` keys in the `admin` block | PASS |
| 11 | CSS: all required classes present including `adm-msg-body { white-space: pre-wrap }` and responsive 760px collapse | PASS |
| 12 | `npx tsc --noEmit` exits 0 with zero errors or warnings | PASS |

---

## Detail notes

### Check 1 — List columns
`TabMessages.tsx` lines 84-86 / 103-118: the list `<table>` has exactly two
`<th>` cells (`msgColTitle`, `msgColEmail`) and each `<tr>` renders
`<td>{m.title}</td><td>{m.email}</td>` with no additional cells.

### Check 4 — Selection reset
`loadMessages` calls `setSelectedId(null)` unconditionally before the async
fetch (alongside `setLoading(true)` and `setError(null)`), so every view
switch, mark-as-read, and delete triggers a reset.

### Check 5 — Mutually exclusive action buttons
The detail footer uses two independent conditional renders
(`{view === 'active' && ...}` and `{view === 'archived' && ...}`), ensuring
exactly one button is shown and never both simultaneously.

### Check 6 — handleDelete
`handleDelete` awaits `messageRepository.remove(m.id)` then calls
`loadMessages(view)`. On catch it calls `setError(i18n.admin.saveError)`.
This matches the spec exactly.

### Check 8 — remove method
`SupabaseMessageRepository.ts` lines 60-67: method placed after `markAsRead`
and before `create` as specified. Uses `.from('messages').delete().eq('id', id)`,
destructures `{ error }`, throws if truthy. Style-identical to `markAsRead`.

### Check 9 — Migration
`003_messages_delete_policy.sql` contains exactly one SQL statement. No
`CREATE FUNCTION is_admin()` or `CREATE OR REPLACE FUNCTION is_admin()` is
present. Policy name `"Admin messages delete"` and
`FOR DELETE USING (is_admin())` pattern matches the existing `002_messages.sql`
policies.

### Check 11 — CSS ordering
The `/* ---- Messages master-detail ---- */` block is inserted between the
existing `@media (max-width: 560px)` block and the
`@media (prefers-reduced-motion: reduce)` block, as specified.

---

## Additional observation (non-blocking)

`useEffect(() => { loadMessages(view) }, [view])` omits `loadMessages` from
its dependency array. This is a pre-existing pattern used consistently across
all other admin tabs in this codebase. It does not affect runtime correctness
or TypeScript validity, and would only surface as an ESLint
`react-hooks/exhaustive-deps` advisory (no lint gate is configured).

---

## Overall: ALL CHECKS PASS
