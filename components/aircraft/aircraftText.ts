import { t } from '@/lib/i18n/t'

/** Server-side label bundles for the listing and comparison client components. */

export function familyLabels(locale: string): Record<string, string> {
  return {
    learjet:    t(locale, 'aircraft.families.learjet'),
    challenger: t(locale, 'aircraft.families.challenger'),
    global:     t(locale, 'aircraft.families.global'),
  }
}

export function lifecycleLabels(locale: string): Record<string, string> {
  return {
    announced:    t(locale, 'aircraft.lifecycle.announced'),
    inProduction: t(locale, 'aircraft.lifecycle.inProduction'),
    inService:    t(locale, 'aircraft.lifecycle.inService'),
    legacy:       t(locale, 'aircraft.lifecycle.legacy'),
  }
}

export function listingText(locale: string) {
  const l = (k: string, vars?: Record<string, string | number>) => t(locale, `aircraft.listing.${k}` as never, vars)
  return {
    search: l('search'), searchPlaceholder: l('searchPlaceholder'), family: l('family'), range: l('range'),
    passengers: l('passengers'), anyPassengers: l('anyPassengers'),
    // keep the {n} placeholder: the client fills it per option
    passengersPlus: l('passengersPlus', { n: '{n}' }),
    lifecycle: l('lifecycle'), sort: l('sort'),
    sortDisplayOrder: l('sortDisplayOrder'), sortRangeDesc: l('sortRangeDesc'),
    sortPassengersDesc: l('sortPassengersDesc'), sortNameAsc: l('sortNameAsc'),
    resultCount: l('resultCount', { count: '{count}' }), resultOne: l('resultOne'), noResults: l('noResults'),
    activeFilters: l('activeFilters'), clearFilters: l('clearFilters'),
    selectToCompare: l('selectToCompare', { model: '{model}' }),
    compareSelected: l('compareSelected', { count: '{count}' }),
    compareHint: l('compareHint'), maxCompare: l('maxCompare'),
    rangeMin: l('rangeMin'), rangeMax: l('rangeMax'), currentOnly: l('currentOnly'),
    compareLabel: l('compareLabel'), viewModel: l('viewModel', { model: '{model}' }),
    viewLabel: l('viewLabel'), viewCard: l('viewCard'), viewList: l('viewList'),
    seeDetails: l('seeDetails'), speed: l('speed'),
  }
}

export function compareText(locale: string) {
  return {
    specification: t(locale, 'aircraft.comparison.specification'),
    best:          t(locale, 'aircraft.comparison.best'),
    featured:      t(locale, 'aircraft.comparison.featured'),
    columns:       t(locale, 'aircraft.comparison.columns'),
    showColumn:    t(locale, 'aircraft.comparison.showColumn', { model: '{model}' }),
    tableLabel:    t(locale, 'aircraft.comparison.tableLabel'),
  }
}

export function breadcrumbLabels(locale: string) {
  return {
    nav:   t(locale, 'aircraft.nav.label'),
    home:  t(locale, 'aircraft.nav.home'),
    fleet: t(locale, 'aircraft.nav.fleet'),
  }
}
