export function Footer() {
  return (
    <footer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <a
            href="https://braisalvarez.github.io/portfolio/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent-2)', textDecoration: 'none' }}
          >
            Creado por Brais
          </a>
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>© 2026 NARA CAMPUS</span>
      </div>
    </footer>
  )
}
