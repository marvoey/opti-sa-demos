import { displayTemplate } from '@optimizely/cms-sdk'

export const OT_AircraftSpecTableDefault = displayTemplate({
  key:         'OT_AircraftSpecTableDefault',
  displayName: 'Aircraft Spec Comparison',
  contentType: 'OT_AircraftSpecTable',
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
    stickyFirstColumn: {
      displayName: 'Sticky First Column',
      editor:      'select',
      sortOrder:   20,
      choices: {
        'true':  { displayName: 'Yes', sortOrder: 10 },
        'false': { displayName: 'No',  sortOrder: 20 },
      },
    },
    mobileBehavior: {
      displayName: 'Mobile Behavior',
      editor:      'select',
      sortOrder:   30,
      choices: {
        scroll:         { displayName: 'Scroll sideways',  sortOrder: 10 },
        columnSelector: { displayName: 'Column selector',  sortOrder: 20 },
      },
    },
  },
})
