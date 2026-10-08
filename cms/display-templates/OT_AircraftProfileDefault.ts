import { displayTemplate } from '@optimizely/cms-sdk'

// Presentation-only settings. OT_AircraftProfile is reference-only (never placed
// in a composition), so these apply to the preview and to any surface that
// renders the record through its adapter.
export const OT_AircraftProfileDefault = displayTemplate({
  key:         'OT_AircraftProfileDefault',
  displayName: 'Aircraft Profile',
  contentType: 'OT_AircraftProfile',
  isDefault:   true,
  settings: {
    color: {
      displayName: 'Color',
      editor:      'select',
      sortOrder:   10,
      choices: {
        canvas:  { displayName: 'Canvas',  sortOrder: 10 },
        surface: { displayName: 'Surface', sortOrder: 20 },
      },
    },
    density: {
      displayName: 'Density',
      editor:      'select',
      sortOrder:   20,
      choices: {
        comfortable: { displayName: 'Comfortable', sortOrder: 10 },
        compact:     { displayName: 'Compact',     sortOrder: 20 },
      },
    },
    showSpecSummary: {
      displayName: 'Show Spec Summary',
      editor:      'select',
      sortOrder:   30,
      choices: {
        'true':  { displayName: 'Yes', sortOrder: 10 },
        'false': { displayName: 'No',  sortOrder: 20 },
      },
    },
  },
})
