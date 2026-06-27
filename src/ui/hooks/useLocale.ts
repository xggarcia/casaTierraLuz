import { useLanguage } from '../contexts/LanguageContext'
import { UI_TEXT } from '../i18n/ui'
import type { LocalizedText } from '../../domain/entities/Language'

export function useLocale() {
  const { language } = useLanguage()
  const t = UI_TEXT[language]
  const loc = (text: LocalizedText): string => text[language]
  return { t, loc, language }
}
