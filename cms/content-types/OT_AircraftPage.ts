import { contentType } from '@optimizely/cms-sdk'
import { OT_AircraftProfile } from './OT_AircraftProfile'
import { enableExternalPreviewProperty } from './_shared/externalPreview'

// ─── OT_AircraftPage ──────────────────────────────────────────────────────────
// A Visual Builder experience page for one aircraft model. It references an
// OT_AircraftProfile, and the slug route (app/(site)/[...slug]) uses that
// reference to render a locked header and specification panel OUTSIDE the
// composition tree: editors can never mistype a spec because they cannot type
// one at all. Everything between the header and the spec panel is open Visual
// Builder composition.
//
// MUST stay `_experience` (not `_page`): content variations and Visual Builder
// both depend on it, and the FX personalization scenario needs variations.
// As an `_experience` it has no compositionBehaviors, adapter, or display
// template; it is routed and rendered directly by the slug route.
//
// SEO fields mirror OT_PractitionerPage / BlankExperience so lib/metadata.ts
// and lib/structured-data.ts share one code path. The SDK has no `default`
// attribute, so schemaType's "Product" default is applied by the front end
// when the field is empty.

export const OT_AircraftPage = contentType({
  key:         'OT_AircraftPage',
  displayName: 'Aircraft Page',
  description: 'An aircraft model page. References an Aircraft Profile to populate a locked specification header, then opens to free Visual Builder composition below.',
  baseType:    '_experience',
  mayContainTypes: ['*'],
  properties: {
    enableExternalPreview: enableExternalPreviewProperty,

    // ── Record binding and header ───────────────────────────────────────────
    aircraftRef: {
      type:         'contentReference',
      isRequired:   true,
      allowedTypes: [OT_AircraftProfile],
      displayName:  'Aircraft',
      description:  'The aircraft record this page presents. Populates the locked specification header: edit the record, not the page, to change specs.',
      group:        'OT_Content',
      sortOrder:    10,
    },
    headerStyle: {
      type:        'string',
      format:      'selectOne',
      displayName: 'Header Style',
      description: 'Approved header layout variants. Defaults to Full-bleed hero when unset.',
      enum: [
        { value: 'fullBleed', displayName: 'Full-bleed hero' },
        { value: 'splitSpec', displayName: 'Split hero with spec panel' },
        { value: 'minimal',   displayName: 'Minimal' },
      ],
      group:       'OT_Content',
      sortOrder:   20,
    },
    showSpecPanel: {
      type:        'boolean',
      displayName: 'Show Specification Panel',
      description: 'Renders the full spec table from the referenced record beneath the composition. Off for teaser pages on announced models.',
      group:       'OT_Content',
      sortOrder:   30,
    },
    showComparisonCta: {
      type:        'boolean',
      displayName: 'Show \'Compare\' CTA',
      description: 'Surfaces a comparison call-to-action in the header when this model is comparison-eligible.',
      group:       'OT_Content',
      sortOrder:   40,
    },

    // ── Conversion ──────────────────────────────────────────────────────────
    enquiryFormRef: {
      type:         'contentReference',
      allowedTypes: ['OptiFormsContainerData'],
      displayName:  'Request Information Form',
      description:  'The shared RFI form rendered on this page. One form, referenced from every aircraft page, updated once.',
      group:        'OT_Content',
      sortOrder:    50,
    },
    enquiryHeading: {
      type:        'string',
      isLocalized: true,
      maxLength:   80,
      displayName: 'Enquiry Section Heading',
      description: 'Heading above the form. Falls back to a site default when blank.',
      group:       'OT_Content',
      sortOrder:   60,
    },

    // ── Experimentation ─────────────────────────────────────────────────────
    // Copied verbatim from BlankExperience so the [...slug] router resolves the
    // FX decision through the same code path for every experience type.
    FxFlagKey: {
      type:        'string',
      maxLength:   100,
      displayName: 'FX Content Experiment Flag Key',
      description: 'Optimizely Feature Experimentation flag key controlling which CMS variation of this page is served. The FX variation key must match the CMS variation slug (lowercased) — e.g. FX variation "hero_alt" ↔ CMS variation "hero_alt". Leave blank to always serve the default content.',
      group:       'OT_Integrations',
      sortOrder:   90,
    },

    // ── SEO / Search & Discovery ────────────────────────────────────────────
    seoTitle: {
      type:         'string',
      isLocalized:  true,
      displayName:  'Page Title',
      description:  'Appears in the browser tab and search results. Recommended 50–60 characters. Falls back to Site Name if blank.',
      group:        'OT_SEO',
      sortOrder:    10,
      indexingType: 'searchable',
    },
    seoDescription: {
      type:         'string',
      isLocalized:  true,
      displayName:  'Meta Description',
      description:  'Appears in search engine result snippets. Recommended 120–160 characters. Falls back to the site-level Default Meta Description.',
      group:        'OT_SEO',
      sortOrder:    20,
      indexingType: 'searchable',
    },
    canonicalUrl: {
      type:        'url',
      displayName: 'Canonical URL',
      description: "Override only. Leave blank to use the page's own URL.",
      group:       'OT_SEO',
      sortOrder:   30,
    },
    ogImage: {
      type:         'contentReference',
      allowedTypes: ['_image'],
      displayName:  'Social Share Image',
      description:  'Image shown when this page is shared on social platforms. Recommended 1200×630px. Falls back to the record’s Hero Image, then the site default.',
      group:        'OT_SEO',
      sortOrder:    40,
    },
    pageAnswer: {
      type:         'string',
      isLocalized:  true,
      displayName:  'AI Answer Summary',
      description:  'A 1–3 sentence plain-language answer to the primary question this page addresses. Used in structured data and as a direct signal to AI answer engines. Write as if answering the question directly — no marketing language.',
      group:        'OT_SEO',
      sortOrder:    50,
      indexingType: 'searchable',
    },
    schemaType: {
      type:        'string',
      format:      'selectOne',
      displayName: 'Schema Type',
      description: 'The structured data type for this page. Controls which JSON-LD block is generated. Defaults to Product when left as None.',
      enum: [
        { value: 'none',    displayName: 'None (defaults to Product)' },
        { value: 'WebPage', displayName: 'Web Page' },
        { value: 'Article', displayName: 'Article' },
        { value: 'FAQPage', displayName: 'FAQ Page' },
        { value: 'Product', displayName: 'Product' },
        { value: 'Event',   displayName: 'Event' },
      ],
      group:       'OT_SEO',
      sortOrder:   60,
    },
    noIndex: {
      type:        'boolean',
      displayName: 'Hide from Search Engines',
      description: 'When enabled, adds noindex/nofollow robots directives and excludes this page from the sitemap.',
      group:       'OT_SEO',
      sortOrder:   70,
    },
    customSchemaJson: {
      type:        'string',
      displayName: 'Custom Schema JSON (Advanced)',
      description: 'Developer escape hatch. Paste a valid JSON-LD object here to override or extend the generated structured data. Must be valid JSON. Merged with the generated schema — do not include @context.',
      group:       'OT_SEO',
      sortOrder:   80,
    },
  },
})
