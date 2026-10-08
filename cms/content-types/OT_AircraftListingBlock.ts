import { contentType } from '@optimizely/cms-sdk'

// ─── OT_AircraftListingBlock ──────────────────────────────────────────────────
// Filterable fleet directory of OT_AircraftProfile records. Follows
// OT_PractitionerListingBlock: site scoping is automatic (the adapter reads the
// site's frontEndDomain from ThemeManager and passes it as the `siteKey`
// filter), records are fetched at render time, and filter state lives in the
// URL so results are shareable. Filter bounds are derived from the loaded set.
//
// No nested component array, so `elementEnabled` + `sectionEnabled` are both
// permitted here (unlike OT_AircraftProfile).

export const OT_AircraftListingBlock = contentType({
  key:         'OT_AircraftListingBlock',
  displayName: 'Aircraft Listing',
  description: 'Searchable, filterable directory of aircraft pulled from Aircraft Profiles. Automatically scoped to the current site via the Site Key field on each profile.',
  baseType:    '_component',
  compositionBehaviors: ['elementEnabled', 'sectionEnabled'],
  properties: {
    heading: {
      type:         'string',
      isLocalized:  true,
      maxLength:    120,
      displayName:  'Heading',
      description:  'Section heading above the listing.',
      group:        'OT_Content',
      sortOrder:    10,
      indexingType: 'searchable',
    },
    intro: {
      type:        'richText',
      isLocalized: true,
      displayName: 'Introduction',
      description: 'Optional lead-in copy.',
      group:       'OT_Content',
      sortOrder:   20,
    },
    familyFilter: {
      type:        'string',
      format:      'selectOne',
      displayName: 'Lock to Family',
      description: 'Restricts this listing to one family. Leave as All for the full fleet index.',
      enum: [
        { value: 'all',        displayName: 'All families' },
        { value: 'learjet',    displayName: 'Learjet' },
        { value: 'challenger', displayName: 'Challenger' },
        { value: 'global',     displayName: 'Global' },
      ],
      group:       'OT_Content',
      sortOrder:   30,
    },
    lifecycleFilter: {
      type:        'string',
      format:      'selectOne',
      displayName: 'Lifecycle Filter',
      description: 'Restricts the listing by lifecycle status.',
      enum: [
        { value: 'all',           displayName: 'All' },
        { value: 'currentOnly',   displayName: 'In production and in service only' },
        { value: 'announcedOnly', displayName: 'Announced only' },
      ],
      group:       'OT_Content',
      sortOrder:   40,
    },
    manualSelection: {
      type:        'array',
      maxItems:    12,
      displayName: 'Manual Selection',
      description: 'Optionally curate an explicit set. When populated, overrides the family and lifecycle filters.',
      items:       { type: 'contentReference', allowedTypes: ['OT_AircraftProfile'] },
      group:       'OT_Content',
      sortOrder:   50,
    },
    showSearch: {
      type:        'boolean',
      displayName: 'Show Search Box',
      description: 'Free-text search across model name and tagline.',
      group:       'OT_Content',
      sortOrder:   60,
    },
    showFamilyFilter: {
      type:        'boolean',
      displayName: 'Show Family Filter',
      description: 'Renders family filter pills for the visitor.',
      group:       'OT_Content',
      sortOrder:   70,
    },
    showRangeFilter: {
      type:        'boolean',
      displayName: 'Show Range Filter',
      description: 'Renders a range slider filtering on Range (nm).',
      group:       'OT_Content',
      sortOrder:   80,
    },
    showPassengerFilter: {
      type:        'boolean',
      displayName: 'Show Passenger Filter',
      description: 'Renders a capacity filter on Maximum Passengers.',
      group:       'OT_Content',
      sortOrder:   90,
    },
    showCompareToggle: {
      type:        'boolean',
      displayName: 'Enable Compare Selection',
      description: 'Lets visitors select up to four aircraft and open a comparison view. Only surfaces records with Include in Comparisons enabled.',
      group:       'OT_Content',
      sortOrder:   100,
    },
    defaultSort: {
      type:        'string',
      format:      'selectOne',
      displayName: 'Default Sort',
      description: 'Initial sort order. Visitors can change it.',
      enum: [
        { value: 'displayOrder',   displayName: 'Manual order' },
        { value: 'rangeDesc',      displayName: 'Range, high to low' },
        { value: 'passengersDesc', displayName: 'Capacity, high to low' },
        { value: 'nameAsc',        displayName: 'Model name A–Z' },
      ],
      group:       'OT_Content',
      sortOrder:   110,
    },
  },
})
