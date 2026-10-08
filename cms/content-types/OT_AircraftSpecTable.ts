import { contentType } from '@optimizely/cms-sdk'
import { OT_AircraftSpecRow } from './OT_AircraftSpecRow'

// ─── OT_AircraftSpecTable ─────────────────────────────────────────────────────
// Side-by-side aircraft comparison driven by REFERENCES to OT_AircraftProfile.
// The existing OT_ComparisonTableBlock is hand-authored (cells are plain
// strings), so editing a record never propagates into it. This type resolves
// every cell from the referenced record at render time, which turns "change the
// range once" into a live proof on a comparison surface.
//
// `sectionEnabled` only: it carries a nested component array (specRows), so the
// CMS would reject `elementEnabled` here.

export const OT_AircraftSpecTable = contentType({
  key:         'OT_AircraftSpecTable',
  displayName: 'Aircraft Spec Comparison',
  description: 'Side-by-side aircraft comparison driven by references to Aircraft Profiles. Specifications resolve from the referenced records, so editing a record updates every comparison that includes it.',
  baseType:    '_component',
  compositionBehaviors: ['sectionEnabled'],
  properties: {
    heading: {
      type:         'string',
      isLocalized:  true,
      maxLength:    120,
      displayName:  'Heading',
      description:  'Section heading above the comparison.',
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
    aircraft: {
      type:        'array',
      minItems:    2,
      maxItems:    4,
      displayName: 'Aircraft to Compare',
      description: 'Each becomes a column. Specifications resolve live from the record, never re-typed.',
      items:       { type: 'contentReference', allowedTypes: ['OT_AircraftProfile'] },
      group:       'OT_Content',
      sortOrder:   30,
    },
    featuredAircraft: {
      type:         'contentReference',
      allowedTypes: ['OT_AircraftProfile'],
      displayName:  'Featured Column',
      description:  'Optionally highlight one column as recommended. Must be one of the aircraft above.',
      group:        'OT_Content',
      sortOrder:    40,
    },
    specRows: {
      type:        'array',
      isLocalized: true,
      minItems:    1,
      maxItems:    20,
      displayName: 'Specifications Shown',
      description: 'Which specifications to display, in order.',
      items:       { type: 'component', contentType: OT_AircraftSpecRow },
      group:       'OT_Content',
      sortOrder:   50,
    },
    unitSystem: {
      type:        'string',
      format:      'selectOne',
      displayName: 'Unit System',
      description: 'Metric is the sensible default for a Canadian audience; Both renders primary and converted values together.',
      enum: [
        { value: 'metric',   displayName: 'Metric' },
        { value: 'imperial', displayName: 'Imperial' },
        { value: 'both',     displayName: 'Both' },
      ],
      group:       'OT_Content',
      sortOrder:   60,
    },
    highlightBest: {
      type:        'boolean',
      displayName: 'Highlight Leading Value',
      description: 'Visually marks the strongest value in each numeric row.',
      group:       'OT_Content',
      sortOrder:   70,
    },
  },
})
