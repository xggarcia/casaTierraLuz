# Spec — Admin Messages: master-detail layout + hard delete

## Open questions

No open questions.

---

## Summary

Modify the admin Messages tab into a two-column master-detail view and add a hard-delete
capability for archived messages.

- Left column: list of messages showing only **title** + **sender email**, rows are clickable.
- Right column: detail panel showing the selected message's name, email, title, full body, date,
  and an action button (Marcar como leído in active view; Eliminar definitivamente in archived view).
- No selection -> right panel shows a placeholder.
- Hard delete is available only in the archived view and removes the row from the DB permanently.

---

## 1. Repository change

File: `src/infrastructure/repositories/SupabaseMessageRepository.ts`

Add a `remove` method to the `SupabaseMessageRepository` class (place it after `markAsRead`,
before `create`). Follow the exact style of `markAsRead` (single `.eq('id', id)`, throw on error,
no return value).

```ts
// hard delete (permanently removes the message)
async remove(id: number): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', id)
  if (error) throw error
}
```

RLS note: a DELETE on `messages` will silently affect 0 rows unless a DELETE RLS policy exists.
The migration in section 2 adds an admin-only DELETE policy. No other repo change is needed.

---

## 2. Migration

Create file: `supabase/migrations/003_messages_delete_policy.sql`

Add an admin-only DELETE policy on the `messages` table. Follow the exact pattern used in
`supabase/migrations/002_messages.sql` (named policy, `FOR <action>`, `USING (is_admin())`).
The `is_admin()` function already exists (defined in `001_initial_schema.sql`).

```sql
-- ─────────────────────────────────────────────────────────────────────────────
-- MESSAGES — admin hard-delete policy
-- ─────────────────────────────────────────────────────────────────────────────

-- Only admins may delete (used by the admin "Eliminar definitivamente" action)
CREATE POLICY "Admin messages delete" ON messages FOR DELETE
  USING (is_admin());
```

---

## 3. Component restructure

File: `src/ui/pages/admin/TabMessages.tsx` (rewrite the render + add state/handlers).

### State (additions)
- Keep existing: `messages`, `loading`, `error`, `view`.
- Add: `const [selectedId, setSelectedId] = useState<number | null>(null)`.
- Derive: `const selected = messages.find(m => m.id === selectedId) ?? null`.

### Selection behavior
- Clicking a list row sets `selectedId` to that message's id.
- After `loadMessages` resets the list (on view change, after mark-as-read, after delete),
  reset `setSelectedId(null)` so the detail panel does not point at a stale/removed message.
  Do this inside `loadMessages` (call `setSelectedId(null)` alongside `setLoading(true)`), which
  also covers the `view` toggle.

### Handlers
- `handleMarkAsRead(m: Message)`: unchanged logic (calls `messageRepository.markAsRead(m.id)`,
  then `loadMessages(view)`; on error `setError(i18n.admin.saveError)`). Selection clears via
  `loadMessages`.
- Add `handleDelete(m: Message)`:
  ```ts
  const handleDelete = async (m: Message) => {
    try {
      await messageRepository.remove(m.id)
      loadMessages(view)
    } catch {
      setError(i18n.admin.saveError)
    }
  }
  ```
  No confirm dialog is required (not requested). If a confirm is desired later it is out of scope.

### Layout

Keep the section header (title + active/archived tabs) and the error alert exactly as today.
Below them, render a two-column container:

```
<div className="adm-msg-split">
  <div className="adm-msg-list">    {/* LEFT */}
    ...list/skeleton/empty...
  </div>
  <div className="adm-msg-detail">  {/* RIGHT */}
    ...placeholder OR selected detail...
  </div>
</div>
```

#### LEFT column — list (`adm-msg-list`)
- Keep using `adm-table-wrap` + `adm-table` for consistency, but with only **two** columns:
  header cells `i18n.admin.msgColTitle` and `i18n.admin.msgColEmail`. Remove the name, body,
  date, and actions columns from the list.
- Each row: `<tr>` with `onClick={() => setSelectedId(m.id)}`, `className` adding
  `adm-msg-row--selected` when `m.id === selectedId`. Cells: `<td>{m.title}</td>` and
  `<td>{m.email}</td>`.
- Loading skeleton: same `adm-sk-row` pattern but only 2 cells (title width `8rem`, email width `10rem`).
- Empty: keep `<p className="adm-empty">{i18n.admin.emptyList}</p>` inside the left column.

#### RIGHT column — detail (`adm-msg-detail`)
- If `selected === null`: render placeholder
  `<div className="adm-msg-empty">{i18n.admin.msgSelectPrompt}</div>`.
- If `selected !== null`: render an `adm-panel-card` containing, in order:
  - Name: label `i18n.admin.colName`, value `selected.name`
  - Email: label `i18n.admin.msgColEmail`, value `selected.email`
  - Title: label `i18n.admin.msgColTitle`, value `selected.title`
  - Body: label `i18n.admin.msgColBody`, value `selected.body` — render in an element that
    preserves line breaks (`className="adm-msg-field__value adm-msg-body"`, CSS `white-space: pre-wrap`).
  - Date: label `i18n.admin.msgColDate`, value `new Date(selected.createdAt).toLocaleString('es-ES')`
  - Use this field layout per row:
    `<div className="adm-msg-field"><span className="adm-msg-field__label">{label}</span><span className="adm-msg-field__value">{value}</span></div>`.
  - Footer actions (`<div className="adm-form-footer">`):
    - When `view === 'active'`: one button
      `<button type="button" className="adm-btn adm-btn--primary adm-btn--sm" onClick={() => handleMarkAsRead(selected)}>{i18n.admin.msgMarkRead}</button>`.
    - When `view === 'archived'`: one button
      `<button type="button" className="adm-btn adm-btn--danger adm-btn--sm" onClick={() => handleDelete(selected)}>{i18n.admin.msgDelete}</button>`.

### Edge cases the implementation must handle
- Selecting a message, then switching active/archived view: selection must clear (handled by
  `loadMessages` resetting `selectedId`).
- After mark-as-read or delete, the previously selected message no longer exists in the reloaded
  list -> detail panel returns to placeholder (handled by selection reset).
- Empty list: left column shows `adm-empty`; right column still shows the placeholder.
- Error during load/action: existing `adm-alert adm-alert--error` banner above the split, using
  `i18n.error` (load) / `i18n.admin.saveError` (actions), matching current behavior.
- Body may contain newlines -> must use `white-space: pre-wrap` so they render.

---

## 4. CSS additions

File: `src/ui/styles/admin.css` (append near the other panel/table sections; reuse existing
tokens `--space-*`, `--c-*`, `--radius-*`). Add a responsive collapse to single column.

```css
/* ---- Messages master-detail ---- */

.adm-msg-split {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
  gap: var(--space-6);
  align-items: start;
}

.adm-msg-list,
.adm-msg-detail {
  min-width: 0;
}

.adm-msg-list .adm-table tbody tr {
  cursor: pointer;
}

.adm-msg-row--selected td,
.adm-msg-row--selected:hover td {
  background-color: oklch(0.94 0.03 76);
}

/* detail placeholder */
.adm-msg-empty {
  border: 1px dashed oklch(0.84 0.015 72);
  border-radius: var(--radius-md);
  padding: var(--space-12) var(--space-8);
  text-align: center;
  color: var(--c-muted);
  font-family: var(--font-body);
  font-size: 0.875rem;
}

/* detail fields (inside adm-panel-card) */
.adm-msg-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
}

.adm-msg-field__label {
  font-size: 0.6875rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: var(--c-muted);
}

.adm-msg-field__value {
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--c-ink);
}

.adm-msg-body {
  white-space: pre-wrap;
  line-height: 1.55;
}

@media (max-width: 760px) {
  .adm-msg-split {
    grid-template-columns: 1fr;
  }
}
```

---

## 5. New i18n keys

File: `src/i18n/es.ts` — add inside the `admin: { ... }` object, in the `// Messages tab`
block (after `msgMarkRead` on line 139). Keep the trailing comma style.

```ts
    msgDelete: 'Eliminar definitivamente',
    msgSelectPrompt: 'Selecciona un mensaje para ver los detalles',
```

(Existing keys reused, no change: `colName`, `msgColTitle`, `msgColEmail`, `msgColBody`,
`msgColDate`, `msgMarkRead`, `emptyList`, `saveError`, top-level `error`.)

---

## 6. Files to create / modify

| Action | Path |
| --- | --- |
| Create | `supabase/migrations/003_messages_delete_policy.sql` |
| Modify | `src/infrastructure/repositories/SupabaseMessageRepository.ts` (add `remove`) |
| Modify | `src/ui/pages/admin/TabMessages.tsx` (master-detail rewrite + delete) |
| Modify | `src/ui/styles/admin.css` (append messages master-detail classes) |
| Modify | `src/i18n/es.ts` (add `msgDelete`, `msgSelectPrompt`) |
