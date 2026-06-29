# Changes — Admin Messages master-detail + hard delete

## Files created

### `supabase/migrations/003_messages_delete_policy.sql`
Adds an admin-only DELETE RLS policy on the `messages` table using the same
named-policy / `FOR DELETE` / `USING (is_admin())` pattern as `002_messages.sql`.
Required for `supabase.from('messages').delete()` to affect rows when the caller
is an admin (without this policy, the delete silently affects 0 rows).

## Files modified

### `src/infrastructure/repositories/SupabaseMessageRepository.ts`
Added `remove(id: number): Promise<void>` between `markAsRead` and `create`.
Uses `.from('messages').delete().eq('id', id)`, throws on error — identical
style to `markAsRead`.

### `src/i18n/es.ts`
Added two keys inside `admin` → `// Messages tab` block after `msgMarkRead`:
- `msgDelete: 'Eliminar definitivamente'`
- `msgSelectPrompt: 'Selecciona un mensaje para ver los detalles'`

### `src/ui/styles/admin.css`
Appended a `/* ---- Messages master-detail ---- */` section before the
`prefers-reduced-motion` block containing:
- `.adm-msg-split` — two-column grid layout
- `.adm-msg-list` / `.adm-msg-detail` — column containers
- `.adm-msg-list .adm-table tbody tr` — cursor: pointer on list rows
- `.adm-msg-row--selected td` — selected row highlight
- `.adm-msg-empty` — dashed-border placeholder for empty right panel
- `.adm-msg-field` / `.adm-msg-field__label` / `.adm-msg-field__value` — detail field rows
- `.adm-msg-body` — `white-space: pre-wrap` for message body
- `@media (max-width: 760px)` — collapses to single column

Two literal color values (`oklch(0.94 0.03 76)` and `oklch(0.84 0.015 72)`)
were flagged by the design-system-color hook. Both were confirmed intentional —
they follow the same warm-gray literal-value pattern already used throughout
`admin.css` for borders and interaction states — and registered as shared
ignores in `.impeccable/config.json`.

### `src/ui/pages/admin/TabMessages.tsx`
Rewrote the component with:
- New `selectedId: number | null` state; derived `selected` from `messages.find`.
- `loadMessages` now calls `setSelectedId(null)` before fetching, so every
  reload (view switch, mark-as-read, delete) clears any stale selection.
- Added `handleDelete(m)` calling `messageRepository.remove(m.id)` then
  `loadMessages(view)`.
- Layout replaced with `adm-msg-split` two-column container:
  - Left `adm-msg-list`: two-column table (title + email only), clickable rows,
    `adm-msg-row--selected` on active row, 2-cell skeleton.
  - Right `adm-msg-detail`: placeholder `adm-msg-empty` when nothing selected;
    `adm-panel-card` with five `adm-msg-field` rows (name, email, title, body,
    date) and an `adm-form-footer` with the view-appropriate action button
    (primary "Marcar como leído" in active view; danger "Eliminar definitivamente"
    in archived view).

## TypeScript

`npx tsc --noEmit` completed with no errors or warnings.

## Tester focus areas

1. **Selection reset** — switch between active/archived tabs while a row is
   selected; the detail panel must return to the placeholder on every switch.
2. **Mark as read** — select an active message, click the button; after reload
   the message disappears from the active list and the right panel shows the
   placeholder (not the stale message).
3. **Hard delete** — switch to archived view, select a message, click
   "Eliminar definitivamente"; the row must be permanently removed (confirm in
   Supabase dashboard) and the right panel returns to placeholder.
4. **Empty list** — when there are no messages, the left column shows
   `adm-empty` text and the right column shows the placeholder.
5. **Body line breaks** — send a message with newlines in the body; verify they
   render as line breaks in the detail panel (white-space: pre-wrap).
6. **Responsive** — at ≤760px the two columns must stack vertically.
7. **RLS** — the migration must be applied to Supabase before delete works in
   production; without it the delete call will silently succeed (no JS error)
   but remove 0 rows.
