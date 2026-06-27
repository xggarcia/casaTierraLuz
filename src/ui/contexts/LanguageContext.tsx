import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { Language } from '../../domain/entities/Language'

export type { Language }

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ca',
  setLanguage: () => {},
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ca')
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
