import { contentType } from '@optimizely/cms-sdk'
import { AIRCRAFT_SPEC_FIELDS } from './_shared/aircraftSpecs'

// ─── OT_AircraftSpecRow ───────────────────────────────────────────────────────
// Pure sub-component, no compositionBehaviors. Array item only: it lives inside
// OT_AircraftSpecTable.specRows and OT_AircraftProfile.headlineSpecs, never on a
// page directly. `specField` is a key, not a value; the number is resolved from
// each referenced OT_AircraftProfile at render time, so a row can never hold a
// stale spec. The PARENT arrays (specRows, headlineSpecs) are isLocalized: a
// component array that is not localized is stored once for all languages and
// the CMS rejects per-locale edits to it, so labels could never differ in French.

export const OT_AircraftSpecRow = contentType({
  key:         'OT_AircraftSpecRow',
  displayName: 'Aircraft Spec Row',
  description: 'A single specification pointer. Used as an array item inside an Aircraft Spec Comparison (one row per spec) and inside an Aircraft Profile (headline specs).',
  baseType:    '_component',
  properties: {
    specField: {
      type:        'string',
      format:      'selectOne',
      isRequired:  true,
      displayName: 'Specification',
      description: 'Which specification this row displays. Values map 1:1 to numeric keys on Aircraft Profile and resolve from each referenced record.',
      enum:        AIRCRAFT_SPEC_FIELDS.map(f => ({ value: f.value, displayName: f.displayName })),
      group:       'OT_Content',
      sortOrder:   10,
    },
    rowLabel: {
      type:        'string',
      isLocalized: true,
      maxLength:   60,
      displayName: 'Row Label',
      description: 'Override the default label, e.g. "Portée" in French. Leave blank to use the specification’s own name.',
      group:       'OT_Content',
      sortOrder:   20,
    },
    groupHeader: {
      type:        'string',
      isLocalized: true,
      maxLength:   60,
      displayName: 'Group Header',
      description: 'When set, renders a section divider above this row, e.g. "Performance", "Cabine". Ignored for headline specs.',
      group:       'OT_Content',
      sortOrder:   30,
    },
  },
})
