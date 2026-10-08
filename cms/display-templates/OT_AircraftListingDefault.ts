import { displayTemplate } from '@optimizely/cms-sdk'

export const OT_AircraftListingDefault = displayTemplate({
  key:         'OT_AircraftListingDefault',
  displayName: 'Aircraft Listing',
  contentType: 'OT_AircraftListingBlock',
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
    columns: {
      displayName: 'Columns',
      editor:      'select',
      sortOrder:   20,
      choices: {
        col2: { displayName: '2 columns', sortOrder: 10 },
        col3: { displayName: '3 columns', sortOrder: 20 },
        col4: { displayName: '4 columns', sortOrder: 30 },
      },
    },
    density: {
      displayName: 'Density',
      editor:      'select',
      sortOrder:   30,
      choices: {
        comfortable: { displayName: 'Comfortable', sortOrder: 10 },
        compact:     { displayName: 'Compact',     sortOrder: 20 },
      },
    },
    cardStyle: {
      displayName: 'Card Style',
      editor:      'select',
      sortOrder:   40,
      choices: {
        image:  { displayName: 'Image-led',  sortOrder: 10 },
        spec:   { displayName: 'Spec-led',   sortOrder: 20 },
      },
    },
    showImages: {
      displayName: 'Show Images',
      editor:      'select',
      sortOrder:   50,
      choices: {
        'true':  { displayName: 'Yes', sortOrder: 10 },
        'false': { displayName: 'No',  sortOrder: 20 },
      },
    },
  },
})
