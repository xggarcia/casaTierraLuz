import { useEffect, type RefObject } from 'react'

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  callback: () => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) callback()
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [ref, callback, active])
}
