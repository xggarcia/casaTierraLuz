import { useState, useEffect, useRef } from 'react'
import { MarkdownEditor } from '../MarkdownEditor/MarkdownEditor'
import {
  type CourseSection, type ImageSide,
  SECTION_PRESETS, newSection, newImageBlock, newVideoBlock, blockKind,
  parseContent, serializeContent,
} from './sectionTypes'

interface Props {
  value: string
  onChange: (raw: string) => void
  onPickImage: (cb: (url: string) => void) => void
  onUploadImage: (file: File, cb: (url: string) => void) => void
  onPickVideo: (cb: (url: string) => void) => void
}

const KIND_LABEL: Record<string, string> = { text: 'Texto', image: 'Imagen', video: 'Vídeo' }

export function SectionsEditor({ value, onChange, onPickImage, onUploadImage, onPickVideo }: Props) {
  const [sections, setSections] = useState<CourseSection[]>(() => {
    const parsed = parseContent(value)
    if (parsed) return parsed
    if (value && value.trim()) return [{ ...newSection('El programa'), body: value }]
    return []
  })

  const lastSerialized = useRef(serializeContent(sections))
  useEffect(() => {
    if (value === lastSerialized.current) return
    const parsed = parseContent(value)
    if (parsed) {
      setSections(parsed)
      lastSerialized.current = value
    }
  }, [value])

  const commit = (next: CourseSection[]) => {
    setSections(next)
    const raw = serializeContent(next)
    lastSerialized.current = raw
    onChange(raw)
  }

  const update = (id: string, patch: Partial<CourseSection>) =>
    commit(sections.map(s => (s.id === id ? { ...s, ...patch } : s)))

  const remove = (id: string) => commit(sections.filter(s => s.id !== id))

  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= sections.length) return
    const next = [...sections]
    ;[next[idx], next[target]] = [next[target], next[idx]]
    commit(next)
  }

  const add = (block: CourseSection) => commit([...sections, block])

  // Shared image picker/upload controls (used by text + image blocks)
  const imageControls = (s: CourseSection) => (
    <>
      <div className="section-card-image">
        {s.imageUrl
          ? <img src={s.imageUrl} alt="" className="section-card-thumb" />
          : <span className="section-card-thumb section-card-thumb--empty">Sin imagen</span>}
        <button
          type="button"
          className="section-img-btn"
          onClick={() => onPickImage(url => update(s.id, { imageUrl: url, imageSide: s.imageSide === 'none' ? (blockKind(s) === 'image' ? 'full' : 'right') : s.imageSide }))}
        >
          Galería
        </button>
        <label className="section-img-btn">
          Subir
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) onUploadImage(file, url => update(s.id, { imageUrl: url, imageSide: s.imageSide === 'none' ? (blockKind(s) === 'image' ? 'full' : 'right') : s.imageSide }))
              e.target.value = ''
            }}
          />
        </label>
        {s.imageUrl && (
          <button type="button" className="section-img-btn section-img-btn--ghost" onClick={() => update(s.id, { imageUrl: '', imageSide: blockKind(s) === 'image' ? 'full' : 'none' })}>
            ✕ Quitar
          </button>
        )}
        {/* Position selector only for text blocks (image blocks are always full) */}
        {blockKind(s) === 'text' && (
          <div className="section-card-side">
            {(['none', 'left', 'right', 'full'] as ImageSide[]).map(side => (
              <button
                key={side}
                type="button"
                className={`section-side-btn${s.imageSide === side ? ' is-active' : ''}`}
                onClick={() => update(s.id, { imageSide: side })}
                disabled={side !== 'none' && !s.imageUrl}
              >
                {side === 'none' ? 'Sin img' : side === 'left' ? '◧ Izq' : side === 'right' ? 'Der ◨' : '▭ Full'}
              </button>
            ))}
          </div>
        )}
      </div>

      {s.imageUrl && s.imageSide !== 'none' && (
        <div className="section-card-imgctrl">
          <label className="section-imgctrl-row">
            <span>Tamaño <strong>{s.imageWidth ?? 100}%</strong></span>
            <input type="range" min={20} max={100} step={5} value={s.imageWidth ?? 100} onChange={e => update(s.id, { imageWidth: Number(e.target.value) })} />
          </label>
          <label className="section-imgctrl-row">
            <span>Margen <strong>{s.imageMargin ?? 0}px</strong></span>
            <input type="range" min={0} max={80} step={4} value={s.imageMargin ?? 0} onChange={e => update(s.id, { imageMargin: Number(e.target.value) })} />
          </label>
        </div>
      )}
    </>
  )

  return (
    <div className="sections-editor">
      {sections.length === 0 && (
        <p className="sections-editor-empty">
          Aún no hay bloques. Añade texto, imágenes o un vídeo para construir la página.
        </p>
      )}

      {sections.map((s, idx) => {
        const kind = blockKind(s)
        return (
          <div key={s.id} className={`section-card section-card--${kind}`}>
            <div className="section-card-head">
              <span className="section-card-kind">{KIND_LABEL[kind]}</span>
              {kind === 'text' && (
                <input
                  className="section-card-heading"
                  type="text"
                  value={s.heading}
                  onChange={e => update(s.id, { heading: e.target.value })}
                  placeholder="Título de la sección (ej. El programa)"
                />
              )}
              {kind !== 'text' && <span className="section-card-spacer" />}
              <div className="section-card-controls">
                <button type="button" title="Subir" disabled={idx === 0} onClick={() => move(idx, -1)}>↑</button>
                <button type="button" title="Bajar" disabled={idx === sections.length - 1} onClick={() => move(idx, 1)}>↓</button>
                <button type="button" title="Eliminar" className="section-card-delete" onClick={() => remove(s.id)}>✕</button>
              </div>
            </div>

            {kind === 'text' && (
              <>
                <MarkdownEditor value={s.body} onChange={body => update(s.id, { body })} placeholder="Escribe el contenido de esta sección…" />
                {imageControls(s)}
              </>
            )}

            {kind === 'image' && imageControls(s)}

            {kind === 'video' && (
              <div className="section-card-video">
                <div className="section-card-image">
                  <button type="button" className="section-img-btn" onClick={() => onPickVideo(url => update(s.id, { videoUrl: url, youtubeUrl: '' }))}>
                    Elegir del catálogo
                  </button>
                  {(s.videoUrl || s.youtubeUrl) && (
                    <button type="button" className="section-img-btn section-img-btn--ghost" onClick={() => update(s.id, { videoUrl: '', youtubeUrl: '' })}>
                      ✕ Quitar
                    </button>
                  )}
                </div>
                <input
                  type="url"
                  className="section-card-heading"
                  value={s.youtubeUrl ?? ''}
                  onChange={e => update(s.id, { youtubeUrl: e.target.value, videoUrl: '' })}
                  placeholder="O pega un link de YouTube…"
                />
                {s.videoUrl && <video src={s.videoUrl} className="section-card-video-preview" muted controls preload="metadata" />}
              </div>
            )}
          </div>
        )
      })}

      <div className="sections-editor-add">
        <span className="sections-editor-add-label">Añadir:</span>
        {SECTION_PRESETS.map(p => (
          <button key={p} type="button" className="section-add-preset" onClick={() => add(newSection(p))}>
            + {p}
          </button>
        ))}
        <button type="button" className="section-add-preset section-add-blank" onClick={() => add(newSection())}>+ Texto</button>
        <button type="button" className="section-add-preset section-add-media" onClick={() => add(newImageBlock())}>+ Imagen</button>
        <button type="button" className="section-add-preset section-add-media" onClick={() => add(newVideoBlock())}>+ Vídeo</button>
      </div>
    </div>
  )
}
