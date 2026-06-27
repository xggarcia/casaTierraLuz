import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useState } from 'react'

interface Props {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
}

function ToolbarButton({ onClick, active, title, children }: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      className={`md-toolbar-btn${active ? ' is-active' : ''}`}
      onMouseDown={e => { e.preventDefault(); onClick() }}
    >
      {children}
    </button>
  )
}

export function MarkdownEditor({ value, onChange, placeholder }: Props) {
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, HTMLAttributes: { class: 'md-img' } }),
      Markdown.configure({ html: false, tightLists: true }),
      Placeholder.configure({ placeholder: placeholder ?? 'Escribe la descripción…' }),
    ],
    content: value,
    onUpdate({ editor }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const md = (editor.storage as any).markdown.getMarkdown() as string
      onChange(md)
    },
  })

  useEffect(() => {
    if (!editor) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const current = (editor.storage as any).markdown.getMarkdown() as string
    if (current !== value) {
      editor.commands.setContent(value)
    }
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleImport = () => {
    if (!editor || !importText.trim()) return
    editor.commands.setContent(importText.trim())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const md = (editor.storage as any).markdown.getMarkdown() as string
    onChange(md)
    setImportText('')
    setImportOpen(false)
  }

  if (!editor) return null

  return (
    <div className="md-editor">
      <div className="md-toolbar">
        <div className="md-toolbar-group">
          <ToolbarButton
            title="Título de sección (H2)"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            title="Subtítulo (H3)"
            active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            H3
          </ToolbarButton>
        </div>
        <div className="md-toolbar-divider" />
        <div className="md-toolbar-group">
          <ToolbarButton
            title="Negrita"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            title="Cursiva"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </ToolbarButton>
        </div>
        <div className="md-toolbar-divider" />
        <div className="md-toolbar-group">
          <ToolbarButton
            title="Lista"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            ≡
          </ToolbarButton>
          <ToolbarButton
            title="Lista numerada"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </ToolbarButton>
        </div>
        <div className="md-toolbar-divider" />
        <div className="md-toolbar-group">
          <ToolbarButton
            title="Tachado"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <s>S</s>
          </ToolbarButton>
          <ToolbarButton
            title="Código inline"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            {'</>'}
          </ToolbarButton>
          <ToolbarButton
            title="Cita"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            "
          </ToolbarButton>
        </div>
        <div className="md-toolbar-divider" />
        <div className="md-toolbar-group">
          <ToolbarButton
            title="Insertar imagen (URL)"
            onClick={() => {
              const url = window.prompt('URL de la imagen:')
              if (url) editor.chain().focus().setImage({ src: url }).run()
            }}
          >
            🖼
          </ToolbarButton>
          <ToolbarButton
            title="Separador horizontal"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            —
          </ToolbarButton>
        </div>
        <div className="md-toolbar-spacer" />
        <div className="md-toolbar-group">
          <ToolbarButton
            title="Importar markdown"
            onClick={() => setImportOpen(o => !o)}
            active={importOpen}
          >
            ↓ MD
          </ToolbarButton>
        </div>
        <div className="md-toolbar-divider" />
        <div className="md-toolbar-group">
          <ToolbarButton
            title="Deshacer"
            onClick={() => editor.chain().focus().undo().run()}
          >
            ↩
          </ToolbarButton>
          <ToolbarButton
            title="Rehacer"
            onClick={() => editor.chain().focus().redo().run()}
          >
            ↪
          </ToolbarButton>
        </div>
      </div>

      {importOpen && (
        <div className="md-import-panel">
          <textarea
            className="md-import-textarea"
            rows={6}
            value={importText}
            onChange={e => setImportText(e.target.value)}
            placeholder="Pega aquí el markdown y pulsa Aplicar…"
            autoFocus
          />
          <div className="md-import-actions">
            <button type="button" className="btn-primary md-import-btn" onClick={handleImport}>
              Aplicar
            </button>
            <button type="button" className="btn-secondary md-import-btn" onClick={() => { setImportOpen(false); setImportText('') }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <EditorContent editor={editor} className="md-editor-content" />
    </div>
  )
}
