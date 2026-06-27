const ITEMS = [
  'Unreal Engine 5',
  'Real-Time 3D',
  'Arquitectura Virtual',
  'Producción Audiovisual',
  'XR & Metaverse',
  'Epic Games Certified',
  'Formación Profesional',
  'Motion Design',
  'Virtual Production',
  'Nara Campus',
]

export function MarqueeStrip() {
  const doubled = [...ITEMS, ...ITEMS]

  return (
    <div className="marquee-strip">
      <div className="marquee-track">
        {doubled.map((item, i) => (
          <span key={i} className="marquee-item">
            <span className="marquee-dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}
