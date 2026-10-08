import type { AircraftData } from '@/lib/aircraft'
import type { AircraftSpecField } from '@/cms/content-types/_shared/aircraftSpecs'
import { specLabel, specValue } from '@/lib/aircraftFormat'
import { AIRCRAFT_SPEC_FIELDS } from '@/cms/content-types/_shared/aircraftSpecs'

// UN/CEFACT unit codes for schema.org PropertyValue.unitCode. Mach, thrust and
// counts have no common-code unit, so they are emitted without one.
const UNIT_CODE: Partial<Record<AircraftSpecField, string>> = {
  rangeNm:           'NMI',
  maxAltitudeFt:     'FOT',
  takeoffDistanceFt: 'FOT',
  landingDistanceFt: 'FOT',
  cabinLengthM:      'MTR',
  cabinWidthM:       'MTR',
  cabinHeightM:      'MTR',
  baggageVolumeM3:   'MTQ',
}

export interface ProductSeo {
  name: string
  description?: string
  images: string[]
  category?: string
  brand?: string
  additionalProperty: { name: string; value: number; unitCode?: string }[]
}

/**
 * Builds the Product JSON-LD inputs from the aircraft RECORD. Numeric specs go
 * out as PropertyValue entries, so the structured data reads the same stored
 * values as the page and can never disagree with it.
 */
export function buildProductSeo(aircraft: AircraftData, locale: string, brand?: string): ProductSeo {
  const additionalProperty = AIRCRAFT_SPEC_FIELDS
    .map(f => {
      const value = specValue(aircraft, f.value)
      return value == null
        ? null
        : { name: specLabel(f.value, locale), value, ...(UNIT_CODE[f.value] ? { unitCode: UNIT_CODE[f.value] } : {}) }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)

  return {
    name:        aircraft.modelName,
    description: aircraft.tagline,
    images:      [aircraft.heroImageUrl, ...aircraft.galleryUrls].filter((u): u is string => !!u),
    category:    aircraft.family,
    brand,
    additionalProperty,
  }
}
