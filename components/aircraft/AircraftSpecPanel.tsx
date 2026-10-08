import type { AircraftData } from '@/lib/aircraft'
import type { AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'
import { AIRCRAFT_SPEC_FIELDS } from '@/cms/content-types/_shared/aircraftSpecs'
import { t } from '@/lib/i18n/t'
import { formatCertDate, specLabel, specValue } from '@/lib/aircraftFormat'
import AircraftSpecs from './AircraftSpecs'

/**
 * Server wrapper for the specification section. Resolves every localized label
 * and the record's stored values, then hands plain serializable data to the
 * client component that owns the unit toggle. Reads ONLY from the record,
 * never from page fields.
 */
export default function AircraftSpecPanel({ aircraft, locale }: { aircraft: AircraftData; locale: string }) {
  const values: Partial<Record<AircraftSpecField, number>> = {}
  const fieldLabels: Record<string, string> = {}
  for (const f of AIRCRAFT_SPEC_FIELDS) {
    const v = specValue(aircraft, f.value)
    if (v != null) values[f.value] = v
    fieldLabels[f.value] = specLabel(f.value, locale)
  }

  return (
    <AircraftSpecs
      locale={locale}
      modelName={aircraft.modelName}
      values={values}
      engineModel={aircraft.engineModel}
      certDate={formatCertDate(aircraft.certificationDate, locale)}
      fieldLabels={fieldLabels}
      diagramFrontUrl={aircraft.diagramFrontUrl}
      diagramSideUrl={aircraft.diagramSideUrl}
      text={{
        heading:      t(locale, 'aircraft.specifications'),
        measure:      t(locale, 'aircraft.measure'),
        metric:       t(locale, 'aircraft.metric'),
        imperial:     t(locale, 'aircraft.imperial'),
        performance:  t(locale, 'aircraft.performance'),
        cabin:        t(locale, 'aircraft.cabin'),
        exterior:     t(locale, 'aircraft.exterior'),
        powerplant:   t(locale, 'aircraft.powerplant'),
        engine:       t(locale, 'aircraft.engine'),
        certified:    t(locale, 'aircraft.certified'),
        diagramLabel: t(locale, 'aircraft.diagramLabel', { model: '{model}', length: '{length}', wingspan: '{wingspan}', height: '{height}' }),
        diagramNote:  t(locale, 'aircraft.diagramNote'),
      }}
    />
  )
}
