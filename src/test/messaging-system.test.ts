/**
 * Tests for the Messaging System feature.
 *
 * Covers:
 *  - SupabaseMessageRepository: getAll, getArchived, markAsRead, create (happy paths + errors)
 *  - Message / MessageInput entity shapes
 *  - i18n keys: contact block + admin messages keys
 *  - SQL migration content (002_messages.sql)
 *  - ContactPage.tsx source review (auth gate, fields, CSS reuse, no new colors)
 *  - TabMessages.tsx source review (view toggle, action button logic, i18n, date locale)
 *  - AdminPage.tsx source review (messages tab wired correctly)
 *  - App.tsx source review (/contacto route present)
 *  - Header.tsx source review (Contacto link after Colección)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// File helpers
// ---------------------------------------------------------------------------
const root = path.resolve(__dirname, '../../')
function readFile(rel: string): string {
  return fs.readFileSync(path.join(root, rel), 'utf-8')
}

// ---------------------------------------------------------------------------
// Supabase mock infrastructure
// vi.hoisted() ensures these are initialized before vi.mock() factory runs
// ---------------------------------------------------------------------------
const {
  mockOrder,
  mockUpdate,
  mockInsert,
  mockEq,
  mockSelect,
  mockFrom,
} = vi.hoisted(() => ({
  mockOrder: vi.fn(),
  mockUpdate: vi.fn(),
  mockInsert: vi.fn(),
  mockEq: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('../infrastructure/supabase/client', () => ({
  supabase: { from: mockFrom },
}))

// Import repo AFTER mock so it picks up the mock
import { SupabaseMessageRepository } from '../infrastructure/repositories/SupabaseMessageRepository'
import type { Message, MessageInput } from '../domain/entities/Message'
import { es } from '../i18n/es'

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Helpers for building mock query chains
// ---------------------------------------------------------------------------

/**
 * getAll / getArchived: from -> select -> eq -> order -> { data, error }
 */
function setupReadChain(rows: unknown[], error: unknown = null) {
  mockOrder.mockResolvedValue({ data: rows, error })
  mockEq.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

/**
 * markAsRead: from -> update -> eq -> { error }
 */
function setupUpdateChain(error: unknown = null) {
  const leaf = { error }
  mockEq.mockResolvedValue(leaf)
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ update: mockUpdate })
}

/**
 * create: from -> insert -> { error }
 */
function setupInsertChain(error: unknown = null) {
  mockInsert.mockResolvedValue({ error })
  mockFrom.mockReturnValue({ insert: mockInsert })
}

/** Build a complete DbMessage row, with optional overrides. */
function makeDbMessage(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 1,
    user_id: 'uuid-user-123',
    email: 'user@example.com',
    name: 'Ana García',
    title: 'Consulta sobre pedido',
    body: 'Buenos días, quisiera saber el estado de mi pedido.',
    is_read: false,
    created_at: '2026-06-28T10:00:00.000Z',
    ...overrides,
  }
}

const repo = new SupabaseMessageRepository()

// ---------------------------------------------------------------------------
// SupabaseMessageRepository.getAll() — active messages
// ---------------------------------------------------------------------------
describe('SupabaseMessageRepository.getAll()', () => {
  it('happy path – returns mapped messages (snake_case → camelCase)', async () => {
    setupReadChain([makeDbMessage()])
    const messages = await repo.getAll()
    expect(messages).toHaveLength(1)
    const m = messages[0]
    expect(m.id).toBe(1)
    expect(m.userId).toBe('uuid-user-123')
    expect(m.email).toBe('user@example.com')
    expect(m.name).toBe('Ana García')
    expect(m.title).toBe('Consulta sobre pedido')
    expect(m.body).toBe('Buenos días, quisiera saber el estado de mi pedido.')
    expect(m.isRead).toBe(false)
    expect(m.createdAt).toBe('2026-06-28T10:00:00.000Z')
  })

  it('filters to is_read = false (active messages only)', () => {
    setupReadChain([])
    repo.getAll()
    // eq called with is_read = false
    expect(mockEq).toHaveBeenCalledWith('is_read', false)
  })

  it('orders by created_at descending (newest first)', () => {
    setupReadChain([])
    repo.getAll()
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('selects from the messages table', () => {
    setupReadChain([])
    repo.getAll()
    expect(mockFrom).toHaveBeenCalledWith('messages')
  })

  it('returns empty array when no active messages', async () => {
    setupReadChain([])
    const messages = await repo.getAll()
    expect(messages).toEqual([])
  })

  it('maps multiple messages in order', async () => {
    const rows = [
      makeDbMessage({ id: 5, title: 'Segundo' }),
      makeDbMessage({ id: 3, title: 'Primero' }),
    ]
    setupReadChain(rows)
    const messages = await repo.getAll()
    expect(messages).toHaveLength(2)
    expect(messages[0].id).toBe(5)
    expect(messages[1].id).toBe(3)
  })

  it('throws when Supabase returns an error', async () => {
    setupReadChain([], { message: 'DB error', code: '42501' })
    await expect(repo.getAll()).rejects.toMatchObject({ message: 'DB error' })
  })
})

// ---------------------------------------------------------------------------
// SupabaseMessageRepository.getArchived() — archived messages
// ---------------------------------------------------------------------------
describe('SupabaseMessageRepository.getArchived()', () => {
  it('happy path – returns mapped archived messages', async () => {
    setupReadChain([makeDbMessage({ is_read: true })])
    const messages = await repo.getArchived()
    expect(messages).toHaveLength(1)
    expect(messages[0].isRead).toBe(true)
  })

  it('filters to is_read = true (archived messages only)', () => {
    setupReadChain([])
    repo.getArchived()
    expect(mockEq).toHaveBeenCalledWith('is_read', true)
  })

  it('orders by created_at descending (newest first)', () => {
    setupReadChain([])
    repo.getArchived()
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('selects from the messages table', () => {
    setupReadChain([])
    repo.getArchived()
    expect(mockFrom).toHaveBeenCalledWith('messages')
  })

  it('returns empty array when no archived messages', async () => {
    setupReadChain([])
    const messages = await repo.getArchived()
    expect(messages).toEqual([])
  })

  it('throws when Supabase returns an error', async () => {
    setupReadChain([], { message: 'Archive query failed' })
    await expect(repo.getArchived()).rejects.toMatchObject({ message: 'Archive query failed' })
  })
})

// ---------------------------------------------------------------------------
// SupabaseMessageRepository.markAsRead()
// ---------------------------------------------------------------------------
describe('SupabaseMessageRepository.markAsRead()', () => {
  it('happy path – updates messages table with is_read = true', async () => {
    setupUpdateChain()
    await repo.markAsRead(42)
    expect(mockFrom).toHaveBeenCalledWith('messages')
    expect(mockUpdate).toHaveBeenCalledWith({ is_read: true })
    expect(mockEq).toHaveBeenCalledWith('id', 42)
  })

  it('resolves without returning a value (Promise<void>)', async () => {
    setupUpdateChain()
    const result = await repo.markAsRead(1)
    expect(result).toBeUndefined()
  })

  it('throws when Supabase returns an error', async () => {
    setupUpdateChain({ message: 'Update failed' })
    await expect(repo.markAsRead(1)).rejects.toMatchObject({ message: 'Update failed' })
  })

  it('passes the correct id to eq (different ids)', async () => {
    setupUpdateChain()
    await repo.markAsRead(99)
    expect(mockEq).toHaveBeenCalledWith('id', 99)
  })
})

// ---------------------------------------------------------------------------
// SupabaseMessageRepository.create()
// ---------------------------------------------------------------------------
describe('SupabaseMessageRepository.create()', () => {
  const input: MessageInput = {
    userId: 'uuid-user-abc',
    email: 'sender@example.com',
    name: 'Carlos López',
    title: 'Pregunta sobre velas',
    body: 'Hola, ¿hacéis pedidos personalizados?',
  }

  it('happy path – inserts correct snake_case columns', async () => {
    setupInsertChain()
    await repo.create(input)
    expect(mockFrom).toHaveBeenCalledWith('messages')
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'uuid-user-abc',
      email: 'sender@example.com',
      name: 'Carlos López',
      title: 'Pregunta sobre velas',
      body: 'Hola, ¿hacéis pedidos personalizados?',
    })
  })

  it('resolves without returning a value (Promise<void>)', async () => {
    setupInsertChain()
    const result = await repo.create(input)
    expect(result).toBeUndefined()
  })

  it('does not include is_read in the insert (defaults to false in DB)', async () => {
    setupInsertChain()
    await repo.create(input)
    const arg = mockInsert.mock.calls[0][0]
    expect(arg).not.toHaveProperty('is_read')
  })

  it('does not include created_at in the insert (defaults to NOW() in DB)', async () => {
    setupInsertChain()
    await repo.create(input)
    const arg = mockInsert.mock.calls[0][0]
    expect(arg).not.toHaveProperty('created_at')
  })

  it('maps userId → user_id (camelCase input to snake_case DB column)', async () => {
    setupInsertChain()
    await repo.create(input)
    const arg = mockInsert.mock.calls[0][0]
    expect(arg.user_id).toBe('uuid-user-abc')
    expect(arg).not.toHaveProperty('userId')
  })

  it('throws when Supabase returns an error', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'RLS policy violation' } })
    mockFrom.mockReturnValue({ insert: mockInsert })
    await expect(repo.create(input)).rejects.toMatchObject({ message: 'RLS policy violation' })
  })
})

// ---------------------------------------------------------------------------
// Message entity – interface shapes
// ---------------------------------------------------------------------------
describe('Message entity interfaces', () => {
  it('Message interface has all required fields with correct types', () => {
    const m: Message = {
      id: 1,
      userId: 'uuid-123',
      email: 'test@example.com',
      name: 'Test User',
      title: 'Test Title',
      body: 'Test body text',
      isRead: false,
      createdAt: '2026-06-28T10:00:00.000Z',
    }
    expect(m.id).toBe(1)
    expect(typeof m.id).toBe('number')
    expect(typeof m.userId).toBe('string')
    expect(typeof m.email).toBe('string')
    expect(typeof m.name).toBe('string')
    expect(typeof m.title).toBe('string')
    expect(typeof m.body).toBe('string')
    expect(typeof m.isRead).toBe('boolean')
    expect(typeof m.createdAt).toBe('string')
  })

  it('Message.isRead can be true (archived state)', () => {
    const m: Message = {
      id: 2,
      userId: 'uuid-456',
      email: 'admin@example.com',
      name: 'Read User',
      title: 'Archived',
      body: 'Archived message body',
      isRead: true,
      createdAt: '2026-06-01T00:00:00.000Z',
    }
    expect(m.isRead).toBe(true)
  })

  it('MessageInput has exactly the five caller-supplied fields', () => {
    const input: MessageInput = {
      userId: 'uuid-789',
      email: 'user@test.com',
      name: 'Test',
      title: 'Title',
      body: 'Body',
    }
    expect(Object.keys(input)).toHaveLength(5)
    expect(input).toHaveProperty('userId')
    expect(input).toHaveProperty('email')
    expect(input).toHaveProperty('name')
    expect(input).toHaveProperty('title')
    expect(input).toHaveProperty('body')
  })

  it('MessageInput does not include id, isRead, or createdAt', () => {
    const input: MessageInput = {
      userId: 'uuid-test',
      email: 'x@x.com',
      name: 'X',
      title: 'T',
      body: 'B',
    }
    expect(input).not.toHaveProperty('id')
    expect(input).not.toHaveProperty('isRead')
    expect(input).not.toHaveProperty('createdAt')
  })
})

// ---------------------------------------------------------------------------
// i18n – contact block keys
// ---------------------------------------------------------------------------
describe('es.ts – contact i18n block', () => {
  const c = es.contact

  it('has contact.title', () => expect(c.title).toBeTruthy())
  it('has contact.subtitle', () => expect(c.subtitle).toBeTruthy())
  it('has contact.loginRequired', () => expect(c.loginRequired).toBeTruthy())
  it('has contact.goLogin', () => expect(c.goLogin).toBeTruthy())
  it('has contact.goRegister', () => expect(c.goRegister).toBeTruthy())
  it('has contact.fieldName', () => expect(c.fieldName).toBeTruthy())
  it('has contact.fieldTitle', () => expect(c.fieldTitle).toBeTruthy())
  it('has contact.fieldMessage', () => expect(c.fieldMessage).toBeTruthy())
  it('has contact.send', () => expect(c.send).toBeTruthy())
  it('has contact.sending', () => expect(c.sending).toBeTruthy())
  it('has contact.success', () => expect(c.success).toBeTruthy())
  it('has contact.error', () => expect(c.error).toBeTruthy())

  it('no contact key has an empty string value', () => {
    const keys = Object.keys(c) as (keyof typeof c)[]
    const empties = keys.filter(k => c[k] === '')
    expect(empties).toEqual([])
  })

  it('contact block has exactly 12 keys as specified', () => {
    expect(Object.keys(c)).toHaveLength(12)
  })
})

// ---------------------------------------------------------------------------
// i18n – admin messages keys
// ---------------------------------------------------------------------------
describe('es.ts – admin messages i18n keys', () => {
  const a = es.admin

  it('has admin.tabMessages', () => expect(a.tabMessages).toBeTruthy())
  it('has admin.msgViewActive', () => expect(a.msgViewActive).toBeTruthy())
  it('has admin.msgViewArchived', () => expect(a.msgViewArchived).toBeTruthy())
  it('has admin.msgColTitle', () => expect(a.msgColTitle).toBeTruthy())
  it('has admin.msgColBody', () => expect(a.msgColBody).toBeTruthy())
  it('has admin.msgColEmail', () => expect(a.msgColEmail).toBeTruthy())
  it('has admin.msgColDate', () => expect(a.msgColDate).toBeTruthy())
  it('has admin.msgMarkRead', () => expect(a.msgMarkRead).toBeTruthy())

  it('no new messages admin key has an empty string value', () => {
    const newKeys = [
      'tabMessages', 'msgViewActive', 'msgViewArchived',
      'msgColTitle', 'msgColBody', 'msgColEmail', 'msgColDate', 'msgMarkRead',
    ] as const
    const empties = newKeys.filter(k => (a as Record<string, string>)[k] === '')
    expect(empties).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// SQL migration content
// ---------------------------------------------------------------------------
describe('supabase/migrations/002_messages.sql – content checks', () => {
  const sql = readFile('supabase/migrations/002_messages.sql')

  it('creates the messages table', () => {
    expect(sql).toMatch(/CREATE TABLE messages/i)
  })

  it('id column is SERIAL PRIMARY KEY', () => {
    expect(sql).toMatch(/id\s+SERIAL\s+PRIMARY KEY/i)
  })

  it('user_id references auth.users with ON DELETE CASCADE', () => {
    expect(sql).toMatch(/user_id[\s\S]*REFERENCES auth\.users\(id\)[\s\S]*ON DELETE CASCADE/i)
  })

  it('email column is TEXT NOT NULL', () => {
    expect(sql).toMatch(/email\s+TEXT\s+NOT NULL/i)
  })

  it('title column is TEXT NOT NULL', () => {
    expect(sql).toMatch(/title\s+TEXT\s+NOT NULL/i)
  })

  it('body column is TEXT NOT NULL', () => {
    expect(sql).toMatch(/body\s+TEXT\s+NOT NULL/i)
  })

  it('is_read column defaults to false', () => {
    expect(sql).toMatch(/is_read[\s\S]*DEFAULT false/i)
  })

  it('created_at column defaults to NOW()', () => {
    expect(sql).toMatch(/created_at[\s\S]*DEFAULT NOW\(\)/i)
  })

  it('enables row level security', () => {
    expect(sql).toMatch(/ALTER TABLE messages ENABLE ROW LEVEL SECURITY/i)
  })

  it('creates INSERT policy for authenticated users (own messages)', () => {
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?ON messages FOR INSERT/i)
    expect(sql).toMatch(/auth\.uid\(\)\s*=\s*user_id/)
  })

  it('creates SELECT policy restricted to admins', () => {
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?ON messages FOR SELECT/i)
    expect(sql).toMatch(/is_admin\(\)/)
  })

  it('creates UPDATE policy restricted to admins', () => {
    expect(sql).toMatch(/CREATE POLICY[\s\S]*?ON messages FOR UPDATE/i)
  })

  it('does NOT redefine is_admin() (function already exists in 001)', () => {
    expect(sql).not.toMatch(/CREATE.*FUNCTION.*is_admin/i)
  })

  it('does NOT modify contact_messages table', () => {
    expect(sql).not.toContain('contact_messages')
  })
})

// ---------------------------------------------------------------------------
// ContactPage.tsx – source review
// ---------------------------------------------------------------------------
describe('ContactPage.tsx – source review', () => {
  const src = readFile('src/ui/pages/ContactPage.tsx')

  it('imports useAuth from AuthContext', () => {
    expect(src).toContain("useAuth")
    expect(src).toContain("AuthContext")
  })

  it('uses { user, loading } from useAuth()', () => {
    expect(src).toMatch(/const\s*\{\s*user.*loading.*\}\s*=\s*useAuth\(\)|const\s*\{\s*loading.*user.*\}\s*=\s*useAuth\(\)/)
  })

  it('renders loading state while loading is true', () => {
    expect(src).toMatch(/loading/)
    expect(src).toMatch(/i18n\.loading/)
  })

  it('shows login-required prompt when !user (auth gate)', () => {
    expect(src).toMatch(/!user/)
    expect(src).toMatch(/i18n\.contact\.loginRequired/)
  })

  it('renders Link to /login for unauthenticated users', () => {
    expect(src).toMatch(/to="\/login"/)
    expect(src).toMatch(/i18n\.contact\.goLogin/)
  })

  it('renders Link to /registro for unauthenticated users', () => {
    expect(src).toMatch(/to="\/registro"/)
    expect(src).toMatch(/i18n\.contact\.goRegister/)
  })

  it('pre-fills name from user.user_metadata.display_name', () => {
    expect(src).toMatch(/user\.user_metadata.*display_name|display_name.*user_metadata/)
  })

  it('has three required form fields: name, title, body (textarea)', () => {
    const requiredCount = (src.match(/required/g) ?? []).length
    expect(requiredCount).toBeGreaterThanOrEqual(3)
  })

  it('has a textarea for the message body', () => {
    expect(src).toMatch(/<textarea/)
  })

  it('calls messageRepository.create with correct args (userId, email, name, title, body)', () => {
    expect(src).toMatch(/messageRepository\.create/)
    expect(src).toMatch(/userId:\s*user\.id/)
    expect(src).toMatch(/email:\s*user\.email/)
  })

  it('shows success message after successful submit', () => {
    expect(src).toMatch(/i18n\.contact\.success/)
  })

  it('shows error message on failed submit', () => {
    expect(src).toMatch(/i18n\.contact\.error/)
  })

  it('disables submit button while sending', () => {
    expect(src).toMatch(/disabled=\{sending\}/)
  })

  it('toggles button label between send/sending', () => {
    expect(src).toMatch(/i18n\.contact\.sending/)
    expect(src).toMatch(/i18n\.contact\.send/)
  })

  it('imports auth.css (reuses existing styles, no new CSS file)', () => {
    expect(src).toMatch(/import.*auth\.css/)
  })

  it('uses auth-page class', () => {
    expect(src).toContain('auth-page')
  })

  it('uses auth-column class', () => {
    expect(src).toContain('auth-column')
  })

  it('uses auth-form class', () => {
    expect(src).toContain('auth-form')
  })

  it('uses auth-input class on inputs', () => {
    expect(src).toContain('auth-input')
  })

  it('uses auth-submit class on the submit button', () => {
    expect(src).toContain('auth-submit')
  })

  it('does not invent a new CSS file import', () => {
    // Only auth.css should be imported, no contact.css or similar
    expect(src).not.toMatch(/import.*contact\.css/)
    expect(src).not.toMatch(/import.*messages\.css/)
  })

  it('does not use inline color styles', () => {
    expect(src).not.toMatch(/style=\{.*color:/)
    expect(src).not.toMatch(/style=\{.*background/)
  })

  it('calls e.preventDefault() in submit handler', () => {
    expect(src).toMatch(/e\.preventDefault\(\)/)
  })

  it('trims all three fields before submit', () => {
    expect(src).toMatch(/name\.trim\(\)|trimmedName/)
    expect(src).toMatch(/title\.trim\(\)|trimmedTitle/)
    expect(src).toMatch(/body\.trim\(\)|trimmedBody/)
  })
})

// ---------------------------------------------------------------------------
// TabMessages.tsx – source review
// ---------------------------------------------------------------------------
describe('TabMessages.tsx – source review', () => {
  const src = readFile('src/ui/pages/admin/TabMessages.tsx')

  it('imports Message entity type', () => {
    expect(src).toContain("Message")
    expect(src).toMatch(/from ['"].*domain\/entities\/Message['"]/)
  })

  it('declares view state of type active | archived defaulting to active', () => {
    expect(src).toMatch(/useState.*'active'/)
    expect(src).toMatch(/'active'\s*\|\s*'archived'|'archived'\s*\|\s*'active'/)
  })

  it('picks getAll() when view is active', () => {
    // The implementation may use currentView or view; either alias is acceptable
    expect(src).toMatch(/===\s*'active'[\s\S]{0,100}getAll\(\)|getAll\(\)[\s\S]{0,100}===\s*'active'/)
  })

  it('picks getArchived() when view is archived', () => {
    expect(src).toMatch(/getArchived\(\)/)
  })

  it('useEffect depends on view (re-runs when view changes)', () => {
    expect(src).toMatch(/useEffect[\s\S]{0,200}\[view\]/)
  })

  it('active toggle button uses adm-tab class', () => {
    expect(src).toContain('adm-tab')
  })

  it('active toggle button uses adm-tab--active class when selected', () => {
    expect(src).toContain('adm-tab--active')
  })

  it('toggle buttons use i18n.admin.msgViewActive and msgViewArchived labels', () => {
    expect(src).toContain('i18n.admin.msgViewActive')
    expect(src).toContain('i18n.admin.msgViewArchived')
  })

  it('table has Name column header (admin.colName)', () => {
    expect(src).toContain('i18n.admin.colName')
  })

  it('table has Title column header (admin.msgColTitle)', () => {
    expect(src).toContain('i18n.admin.msgColTitle')
  })

  it('table has Message column header (admin.msgColBody)', () => {
    expect(src).toContain('i18n.admin.msgColBody')
  })

  it('table has Email column header (admin.msgColEmail)', () => {
    expect(src).toContain('i18n.admin.msgColEmail')
  })

  it('table has Date column header (admin.msgColDate)', () => {
    expect(src).toContain('i18n.admin.msgColDate')
  })

  it('renders dates using toLocaleString("es-ES")', () => {
    expect(src).toMatch(/toLocaleString\(['"]es-ES['"]\)/)
  })

  it('Mark as read button is only rendered in active view', () => {
    // Button must be conditional on view === 'active'
    expect(src).toMatch(/view\s*===\s*'active'[\s\S]{0,300}adm-btn--primary|adm-btn--primary[\s\S]{0,300}view\s*===\s*'active'/)
  })

  it('Mark as read button uses i18n.admin.msgMarkRead label', () => {
    expect(src).toContain('i18n.admin.msgMarkRead')
  })

  it('Mark as read button calls messageRepository.markAsRead with message id', () => {
    expect(src).toMatch(/messageRepository\.markAsRead\(m\.id\)/)
  })

  it('reloads messages after markAsRead (list refreshes)', () => {
    // Must call load function after markAsRead
    expect(src).toMatch(/markAsRead[\s\S]{0,200}loadMessages|loadMessages[\s\S]{0,200}markAsRead/)
  })

  it('mark-as-read button only in active view, delete button only in archived view', () => {
    // Mark-as-read is gated by view === 'active'
    expect(src).toMatch(/view\s*===\s*'active'/)
    // Delete is gated by view === 'archived'
    expect(src).toMatch(/view\s*===\s*'archived'[\s\S]{0,300}(msgDelete|Eliminar)/)
    // The two actions must be mutually exclusive (each guarded by opposite view)
    expect(src).toContain("view === 'active'")
    expect(src).toContain("view === 'archived'")
  })

  it('shows empty state using i18n.admin.emptyList', () => {
    expect(src).toContain('i18n.admin.emptyList')
  })

  it('uses adm-table class for the data table', () => {
    expect(src).toContain('adm-table')
  })

  it('handles error state', () => {
    expect(src).toMatch(/error[\s\S]{0,100}adm-alert|adm-alert[\s\S]{0,100}error/)
  })
})

// ---------------------------------------------------------------------------
// AdminPage.tsx – messages tab wiring
// ---------------------------------------------------------------------------
describe('AdminPage.tsx – messages tab wiring', () => {
  const src = readFile('src/ui/pages/AdminPage.tsx')

  it('imports TabMessages', () => {
    expect(src).toContain("TabMessages")
    expect(src).toContain("TabMessages'")
  })

  it('AdminTab type includes "messages"', () => {
    expect(src).toContain("'messages'")
  })

  it('TABS array includes messages entry with tabMessages label', () => {
    expect(src).toMatch(/id:\s*'messages'/)
    expect(src).toContain('i18n.admin.tabMessages')
  })

  it('messages tab is the last entry in TABS', () => {
    // "messages" must appear after "colors" in the TABS definition
    const colorPos = src.indexOf("'colors'")
    const msgPos = src.lastIndexOf("'messages'")
    expect(msgPos).toBeGreaterThan(colorPos)
  })

  it('conditionally renders TabMessages when tab === messages', () => {
    expect(src).toMatch(/tab\s*===\s*'messages'[\s\S]{0,50}<TabMessages\s*\/>/)
  })
})

// ---------------------------------------------------------------------------
// App.tsx – /contacto route
// ---------------------------------------------------------------------------
describe('App.tsx – /contacto route', () => {
  const src = readFile('src/App.tsx')

  it('imports ContactPage', () => {
    expect(src).toContain('ContactPage')
    expect(src).toMatch(/from ['"].*ContactPage['"]/)
  })

  it('adds a Route with path /contacto', () => {
    expect(src).toMatch(/path="\/contacto"/)
  })

  it('/contacto route renders ContactPage', () => {
    expect(src).toMatch(/\/contacto[\s\S]{0,100}ContactPage/)
  })
})

// ---------------------------------------------------------------------------
// Header.tsx – Contacto nav link
// ---------------------------------------------------------------------------
describe('Header.tsx – Contacto nav link', () => {
  const src = readFile('src/ui/components/Header.tsx')

  it('has a Link to /contacto', () => {
    expect(src).toMatch(/to="\/contacto"/)
  })

  it('Contacto link uses site-header__link class', () => {
    // The link must use the same class as other nav links
    const contactoBlock = src.match(/to="\/contacto"[\s\S]{0,100}site-header__link|site-header__link[\s\S]{0,100}to="\/contacto"/)
    expect(contactoBlock).not.toBeNull()
  })

  it('Contacto link appears after the Colección (productos) link in the nav', () => {
    const coleccionPos = src.indexOf('/productos')
    const contactoPos = src.indexOf('/contacto')
    expect(contactoPos).toBeGreaterThan(coleccionPos)
  })

  it('Contacto link label is "Contacto"', () => {
    expect(src).toContain('>Contacto<')
  })
})

// ---------------------------------------------------------------------------
// SupabaseMessageRepository.ts – source review
// ---------------------------------------------------------------------------
describe('SupabaseMessageRepository.ts – source review', () => {
  const src = readFile('src/infrastructure/repositories/SupabaseMessageRepository.ts')

  it('defines DbMessage type with all snake_case fields', () => {
    expect(src).toContain('DbMessage')
    expect(src).toContain('user_id')
    expect(src).toContain('is_read')
    expect(src).toContain('created_at')
  })

  it('defines mapMessage function (snake_case → camelCase)', () => {
    expect(src).toContain('mapMessage')
    expect(src).toContain('userId')
    expect(src).toContain('isRead')
    expect(src).toContain('createdAt')
  })

  it('getAll() select string includes all required columns', () => {
    expect(src).toMatch(/select\(['"]id,\s*user_id,\s*email,\s*name,\s*title,\s*body,\s*is_read,\s*created_at['"]\)/)
  })

  it('exports a singleton messageRepository instance', () => {
    expect(src).toMatch(/export const messageRepository/)
    expect(src).toMatch(/new SupabaseMessageRepository\(\)/)
  })

  it('every method uses "if (error) throw error" pattern', () => {
    const throwCount = (src.match(/if\s*\(error\)\s*throw\s*error/g) ?? []).length
    // Four methods, each should have this guard
    expect(throwCount).toBeGreaterThanOrEqual(4)
  })

  it('class is named SupabaseMessageRepository', () => {
    expect(src).toMatch(/class\s+SupabaseMessageRepository/)
  })
})
