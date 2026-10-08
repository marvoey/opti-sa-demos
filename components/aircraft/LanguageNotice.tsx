import { t } from '@/lib/i18n/t'

/**
 * Mandatory visible notice when a locale had no published version and the
 * default-locale record is being shown instead. Under Bill 96 a SILENT English
 * fallback where French is required is a compliance problem, so the renderer
 * must always show this. The notice itself is written in the visitor's language.
 */
export default function LanguageNotice({ locale }: { locale: string }) {
  return (
    <div role="status" className="border-b border-fg/15 bg-surface px-md py-sm text-center text-sm text-fg lg:px-xl">
      {t(locale, 'aircraft.languageNotice')}
    </div>
  )
}
