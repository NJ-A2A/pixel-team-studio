import { STUDIO_LOCALES, useStudioLocale } from '@/lib/team-studio/i18n'

import styles from './LanguageSwitch.module.css'

export function LanguageSwitch({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useStudioLocale()
  return <div className={styles.switcher} data-compact={compact} role="group" aria-label={t('language.label')}>
    {STUDIO_LOCALES.map((option) => <button type="button" key={option} data-active={locale === option} onClick={() => setLocale(option)} aria-pressed={locale === option}>{t(`language.${option}`)}</button>)}
  </div>
}
