import { contentType } from '@optimizely/cms-sdk'
import { OT_FeatureItem } from './OT_FeatureItem'
import { OT_AircraftSpecRow } from './OT_AircraftSpecRow'

// ─── OT_AircraftProfile ───────────────────────────────────────────────────────
// The canonical aircraft record — the single source of truth for one model.
// Stored in CMS Shared Content and consumed by reference from:
//   - the locked header and spec panel of OT_AircraftPage (via aircraftRef)
//   - the OT_AircraftListingBlock fleet index
//   - OT_AircraftSpecTable comparison columns
//
// THE DESIGN DECISION: numeric and enumerated spec fields are `isLocalized:
// false`, so there is exactly one stored value for every language and every
// consuming page. Narrative fields (tagline, overview, feature copy, spec
// sheet document) are localized. Never add a localized numeric field here.
//
// Reference-only `_component` (no compositionBehaviors), mirroring
// OT_PractitionerProfile: the CMS forbids `elementEnabled` on a type that
// carries a nested component array, and this record needs keyFeatures and
// headlineSpecs. Queried directly via lib/aircraft.ts.
//
// `headlineSpecs` deliberately holds spec KEYS (OT_AircraftSpecRow), not typed
// stat values: the page header resolves the number from this record, so a
// headline stat can never drift from the spec it displays.

export const OT_AircraftProfile = contentType({
  key:         'OT_AircraftProfile',
  displayName: 'Aircraft Profile',
  description: 'An aircraft model record: identity, specifications, imagery, and documents. Reused across aircraft pages, comparison tables, listings, and the needs-assessment tool.',
  baseType:    '_component',
  properties: {
    // ── Identity ────────────────────────────────────────────────────────────
    modelName: {
      type:         'string',
      isRequired:   true,
      maxLength:    80,
      displayName:  'Model Name',
      description:  'The aircraft model as marketed, e.g. Global 7500. Product names are not translated, so this field is language-neutral.',
      group:        'OT_Content',
      sortOrder:    10,
      indexingType: 'searchable',
    },
    family: {
      type:         'string',
      format:       'selectOne',
      isRequired:   true,
      displayName:  'Aircraft Family',
      description:  'Drives family badges, listing filters, and comparison grouping.',
      enum: [
        { value: 'learjet',    displayName: 'Learjet' },
        { value: 'challenger', displayName: 'Challenger' },
        { value: 'global',     displayName: 'Global' },
      ],
      group:        'OT_Content',
      sortOrder:    20,
      indexingType: 'queryable',
    },
    lifecycleStatus: {
      type:         'string',
      format:       'selectOne',
      displayName:  'Lifecycle Status',
      description:  'Controls availability messaging and whether the model appears in active comparisons.',
      enum: [
        { value: 'announced',    displayName: 'Announced' },
        { value: 'inProduction', displayName: 'In Production' },
        { value: 'inService',    displayName: 'In Service' },
        { value: 'legacy',       displayName: 'Legacy' },
      ],
      group:        'OT_Content',
      sortOrder:    30,
      indexingType: 'queryable',
    },
    tagline: {
      type:         'string',
      isLocalized:  true,
      maxLength:    140,
      displayName:  'Tagline',
      description:  'One-line positioning statement shown under the model name. Authored separately in each language: this is marketing copy, not a translation.',
      group:        'OT_Content',
      sortOrder:    40,
      indexingType: 'searchable',
    },
    overview: {
      type:         'richText',
      isLocalized:  true,
      displayName:  'Overview',
      description:  'The narrative introduction. The opening paragraph feeds listing excerpts and the AI Answer Summary fallback.',
      group:        'OT_Content',
      sortOrder:    50,
      indexingType: 'searchable',
    },

    // ── Performance (language-neutral) ──────────────────────────────────────
    rangeNm: {
      type:         'integer',
      minimum:      1000,
      maximum:      10000,
      displayName:  'Range (nautical miles)',
      description:  'Maximum range at long-range cruise speed. Shown in nm with a km conversion rendered by the front end. Stored once so it can never drift between languages or pages.',
      group:        'OT_Content',
      sortOrder:    60,
      indexingType: 'queryable',
    },
    cruiseSpeedMach: {
      type:        'float',
      minimum:     0.5,
      maximum:     1.0,
      displayName: 'High-Speed Cruise (Mach)',
      description: 'Typical high-speed cruise expressed as a Mach number.',
      group:       'OT_Content',
      sortOrder:   70,
    },
    maxOperatingMach: {
      type:        'float',
      minimum:     0.5,
      maximum:     1.0,
      displayName: 'Max Operating Speed (Mmo)',
      description: 'Maximum operating Mach number.',
      group:       'OT_Content',
      sortOrder:   80,
    },
    maxAltitudeFt: {
      type:        'integer',
      minimum:     10000,
      maximum:     60000,
      displayName: 'Maximum Altitude (ft)',
      description: 'Certified maximum operating altitude.',
      group:       'OT_Content',
      sortOrder:   90,
    },
    takeoffDistanceFt: {
      type:        'integer',
      minimum:     1000,
      maximum:     12000,
      displayName: 'Takeoff Distance (ft)',
      description: 'Takeoff field length at MTOW, sea level, ISA conditions.',
      group:       'OT_Content',
      sortOrder:   100,
    },
    landingDistanceFt: {
      type:        'integer',
      minimum:     1000,
      maximum:     10000,
      displayName: 'Landing Distance (ft)',
      description: 'Landing distance at typical landing weight, sea level.',
      group:       'OT_Content',
      sortOrder:   110,
    },

    // ── Cabin and capacity (language-neutral) ───────────────────────────────
    maxPassengers: {
      type:         'integer',
      minimum:      1,
      maximum:      50,
      displayName:  'Maximum Passengers',
      description:  'Maximum certified passenger capacity.',
      group:        'OT_Content',
      sortOrder:    120,
      indexingType: 'queryable',
    },
    typicalPassengers: {
      type:        'integer',
      minimum:     1,
      maximum:     50,
      displayName: 'Typical Configuration',
      description: 'Passenger count in the typical cabin layout, usually lower than the certified maximum.',
      group:       'OT_Content',
      sortOrder:   130,
    },
    crewCount: {
      type:        'integer',
      minimum:     1,
      maximum:     8,
      displayName: 'Crew',
      description: 'Standard flight and cabin crew complement.',
      group:       'OT_Content',
      sortOrder:   140,
    },
    livingSpaces: {
      type:        'integer',
      minimum:     1,
      maximum:     4,
      displayName: 'Living Spaces',
      description: 'Number of distinct cabin zones.',
      group:       'OT_Content',
      sortOrder:   150,
    },
    cabinLengthM: {
      type:        'float',
      minimum:     1,
      maximum:     30,
      displayName: 'Cabin Length (m)',
      description: 'Interior cabin length excluding flight deck and baggage.',
      group:       'OT_Content',
      sortOrder:   160,
    },
    cabinWidthM: {
      type:        'float',
      minimum:     1,
      maximum:     5,
      displayName: 'Cabin Width (m)',
      description: 'Maximum interior cabin width.',
      group:       'OT_Content',
      sortOrder:   170,
    },
    cabinHeightM: {
      type:        'float',
      minimum:     1,
      maximum:     3,
      displayName: 'Cabin Height (m)',
      description: 'Maximum interior standing height.',
      group:       'OT_Content',
      sortOrder:   180,
    },
    baggageVolumeM3: {
      type:        'float',
      minimum:     0,
      maximum:     20,
      displayName: 'Baggage Volume (m³)',
      description: 'Accessible in-flight and total baggage volume.',
      group:       'OT_Content',
      sortOrder:   190,
    },

    // ── Exterior dimensions (language-neutral) ──────────────────────────────
    // Drive the dimensioned aircraft diagram on the page. Stored once in metres;
    // the front end renders ft/in or m per the visitor's unit toggle.
    overallLengthM: {
      type:        'float',
      minimum:     5,
      maximum:     40,
      displayName: 'Overall Length (m)',
      description: 'Nose to tail overall length.',
      group:       'OT_Content',
      sortOrder:   192,
    },
    wingspanM: {
      type:        'float',
      minimum:     5,
      maximum:     40,
      displayName: 'Wingspan (m)',
      description: 'Tip-to-tip wingspan.',
      group:       'OT_Content',
      sortOrder:   194,
    },
    overallHeightM: {
      type:        'float',
      minimum:     2,
      maximum:     15,
      displayName: 'Overall Height (m)',
      description: 'Ground to top of the tail.',
      group:       'OT_Content',
      sortOrder:   196,
    },

    // ── Powerplant and certification (language-neutral) ─────────────────────
    engineModel: {
      type:        'string',
      maxLength:   100,
      displayName: 'Engine',
      description: 'Manufacturer and model, e.g. GE Passport 20-19BB1A. A proper noun, not translated.',
      group:       'OT_Content',
      sortOrder:   200,
    },
    thrustLbf: {
      type:        'integer',
      minimum:     1000,
      maximum:     50000,
      displayName: 'Thrust per Engine (lbf)',
      description: 'Rated takeoff thrust per engine.',
      group:       'OT_Content',
      sortOrder:   210,
    },
    certificationDate: {
      type:         'dateTime',
      displayName:  'Certification Date',
      description:  'Type certification date. Rendered per-locale by the front end so date formatting follows the language without duplicating the value.',
      group:        'OT_Content',
      sortOrder:    220,
      indexingType: 'queryable',
    },

    // ── Media and documents (DAM-referenced) ────────────────────────────────
    heroImage: {
      type:         'contentReference',
      isRequired:   true,
      allowedTypes: ['_image'],
      displayName:  'Hero Image',
      description:  'Primary exterior image from the DAM. Referenced, never uploaded: replacing the asset in the DAM updates every page that uses it.',
      group:        'OT_Content',
      sortOrder:    230,
    },
    galleryImages: {
      type:        'array',
      maxItems:    8,
      displayName: 'Gallery',
      description: 'Exterior and cabin imagery for the page gallery.',
      items:       { type: 'contentReference', allowedTypes: ['_image'] },
      group:       'OT_Content',
      sortOrder:   240,
    },
    diagramFrontImage: {
      type:         'contentReference',
      allowedTypes: ['_image'],
      displayName:  'Diagram: Front View',
      description:  'Front-view aircraft silhouette for the dimensioned specification diagram. Transparent PNG, about 1200×325, cropped to the wingtips and gear. Optional: a generic drawing is used when empty.',
      group:        'OT_Content',
      sortOrder:    242,
    },
    diagramSideImage: {
      type:         'contentReference',
      allowedTypes: ['_image'],
      displayName:  'Diagram: Side View',
      description:  'Side-view aircraft silhouette for the dimensioned specification diagram. Transparent PNG, about 1200×325, cropped to the nose, tail and gear. Optional: a generic drawing is used when empty.',
      group:        'OT_Content',
      sortOrder:    244,
    },
    featureVideo: {
      type:         'contentReference',
      allowedTypes: ['_video'],
      displayName:  'Feature Video',
      description:  'Optional DAM-hosted video.',
      group:        'OT_Content',
      sortOrder:    250,
    },
    specSheet: {
      type:         'contentReference',
      isLocalized:  true,
      allowedTypes: ['_media'],
      displayName:  'Specification Sheet',
      description:  'Downloadable PDF spec sheet. Localized so the French page serves the French document: the one media field where language genuinely differs.',
      group:        'OT_Content',
      sortOrder:    260,
    },

    // ── Narrative and relationships ─────────────────────────────────────────
    keyFeatures: {
      type:        'array',
      isLocalized: true,
      maxItems:    6,
      displayName: 'Key Features',
      description: 'Headline capabilities. Reuses the existing Feature Item component. Authored separately in each language.',
      items:       { type: 'component', contentType: OT_FeatureItem },
      group:       'OT_Content',
      sortOrder:   270,
    },
    headlineSpecs: {
      type:        'array',
      isLocalized: true,
      maxItems:    4,
      displayName: 'Headline Specifications',
      description: 'The three or four numbers that lead the page. Pick which specification to feature and give it a localized label; the value always resolves from this record, so it can never drift.',
      items:       { type: 'component', contentType: OT_AircraftSpecRow },
      group:       'OT_Content',
      sortOrder:   280,
    },
    relatedAircraft: {
      type:        'array',
      maxItems:    3,
      displayName: 'Related Aircraft',
      description: 'Other models typically cross-shopped. Powers "you may also consider" and seeds the comparison table.',
      items:       { type: 'contentReference', allowedTypes: ['OT_AircraftProfile'] },
      group:       'OT_Content',
      sortOrder:   290,
    },
    comparisonEligible: {
      type:         'boolean',
      displayName:  'Include in Comparisons',
      description:  'When enabled, this model is selectable in comparison tables and the needs-assessment outcome set.',
      group:        'OT_Content',
      sortOrder:    300,
      indexingType: 'queryable',
    },
    siteKey: {
      type:         'string',
      maxLength:    40,
      displayName:  'Site Key',
      description:  'Scopes this record to a site in a multi-site instance. Matches the pattern on Practitioner and Location Profiles.',
      group:        'OT_Content',
      sortOrder:    310,
      indexingType: 'queryable',
    },
    displayOrder: {
      type:         'integer',
      minimum:      0,
      displayName:  'Display Order',
      description:  'Manual sort position in listings. Lower values first.',
      group:        'OT_Content',
      sortOrder:    320,
      indexingType: 'queryable',
    },
  },
})
