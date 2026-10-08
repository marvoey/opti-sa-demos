import { ContentProps } from '@optimizely/cms-sdk'
import { getPreviewUtils } from '@optimizely/cms-sdk/react/server'
import { OT_AircraftProfile as OT_AircraftProfileContentType } from '@/cms/content-types/OT_AircraftProfile'
import type { AircraftData } from '@/lib/aircraft'
import AircraftHeader from '@/components/aircraft/AircraftHeader'
import AircraftSpecPanel from '@/components/aircraft/AircraftSpecPanel'

type Props = {
  content:          ContentProps<typeof OT_AircraftProfileContentType>
  displaySettings?: Record<string, string | boolean>
}

// Preview-only adapter. OT_AircraftProfile is a reference-only record (no
// compositionBehaviors, so it never appears in the Visual Builder element
// picker) and pages / listings read it directly via lib/aircraft.ts. The CMS
// preview route (/preview) renders standalone content through
// <OptimizelyComponent>, which needs a registered React component: without
// this adapter the shared-record preview is blank. It maps the record onto
// AircraftData and shows the header and spec panel, the natural preview of the
// record. It is NOT used for composition rendering.
export default function OT_AircraftProfileAdapter({ content }: Props) {
  const { pa, src } = getPreviewUtils(content)
  const c = content as any
  const locale = (c._metadata?.locale as string | undefined) ?? 'en'

  const aircraft: AircraftData = {
    key:        c._metadata?.key ?? '',
    locale,
    isFallback: false,
    modelName:  c.modelName ?? '',
    family:     c.family ?? undefined,
    lifecycleStatus: c.lifecycleStatus ?? undefined,
    tagline:    c.tagline ?? undefined,
    overviewHtml: c.overview?.html ?? undefined,
    rangeNm:           c.rangeNm ?? undefined,
    cruiseSpeedMach:   c.cruiseSpeedMach ?? undefined,
    maxOperatingMach:  c.maxOperatingMach ?? undefined,
    maxAltitudeFt:     c.maxAltitudeFt ?? undefined,
    takeoffDistanceFt: c.takeoffDistanceFt ?? undefined,
    landingDistanceFt: c.landingDistanceFt ?? undefined,
    maxPassengers:     c.maxPassengers ?? undefined,
    typicalPassengers: c.typicalPassengers ?? undefined,
    crewCount:         c.crewCount ?? undefined,
    livingSpaces:      c.livingSpaces ?? undefined,
    cabinLengthM:      c.cabinLengthM ?? undefined,
    cabinWidthM:       c.cabinWidthM ?? undefined,
    cabinHeightM:      c.cabinHeightM ?? undefined,
    baggageVolumeM3:   c.baggageVolumeM3 ?? undefined,
    overallLengthM:    c.overallLengthM ?? undefined,
    wingspanM:         c.wingspanM ?? undefined,
    overallHeightM:    c.overallHeightM ?? undefined,
    engineModel:       c.engineModel ?? undefined,
    thrustLbf:         c.thrustLbf ?? undefined,
    certificationDate: c.certificationDate ?? undefined,
    heroImageUrl:      src(c.heroImage) ?? undefined,
    galleryUrls:       (c.galleryImages ?? []).map((g: unknown) => src(g as never)).filter(Boolean) as string[],
    diagramFrontUrl:   src(c.diagramFrontImage) ?? undefined,
    diagramSideUrl:    src(c.diagramSideImage) ?? undefined,
    featureVideoUrl:   src(c.featureVideo) ?? undefined,
    specSheetUrl:      src(c.specSheet) ?? undefined,
    keyFeatures:       (c.keyFeatures ?? [])
      .filter((f: any) => f?.headline)
      .map((f: any) => ({ headline: f.headline, bodyHtml: f.body?.html ?? undefined })),
    headlineSpecs:     (c.headlineSpecs ?? [])
      .filter((s: any) => s?.specField)
      .map((s: any) => ({ specField: s.specField, rowLabel: s.rowLabel ?? undefined, groupHeader: s.groupHeader ?? undefined })),
    relatedKeys:       (c.relatedAircraft ?? []).map((r: any) => r?.key).filter(Boolean),
    comparisonEligible: c.comparisonEligible ?? false,
    siteKey:           c.siteKey ?? undefined,
    displayOrder:      c.displayOrder ?? undefined,
  }

  // Standalone preview shell: a full-height canvas so the record reads clearly
  // without surrounding page chrome. The block-level pa() carries the
  // data-epi-block-id for CMS selection.
  return (
    <div className="min-h-screen bg-canvas" {...pa(content.__composition)}>
      <AircraftHeader aircraft={aircraft} locale={locale} headerStyle="splitSpec" pa={pa} />
      <AircraftSpecPanel aircraft={aircraft} locale={locale} />
    </div>
  )
}
