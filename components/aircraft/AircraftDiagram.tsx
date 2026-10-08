// Dimensioned aircraft drawing: front view (wingspan), side view (length and
// height). Each view uses the record's own silhouette PNG when one is attached
// and otherwise falls back to a generic business-jet line drawing ("not to
// scale"). The numbers always come from the aircraft record. The dimension
// arrows are live SVG; the PNG sits beneath them as an HTML <img> recolored
// with a CSS filter (filters on inline SVG <image> are unreliable in Safari).
// No motion.

type Dim = { label: string; value: string }

// Text sits on a brand-colored halo so it can break the dimension line behind it.
const HALO = { paintOrder: 'stroke', stroke: 'var(--ot-brand)', strokeLinejoin: 'round' } as const

function Label({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="currentColor" style={HALO}
      className="font-sans text-[17px] [stroke-width:16px] max-md:text-[26px] max-md:[stroke-width:26px]">
      {children}
    </text>
  )
}

function Defs() {
  return (
    <defs>
      <marker id="ac-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse">
        <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
      </marker>
    </defs>
  )
}

const LINE = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.4, strokeLinejoin: 'round', strokeLinecap: 'round' } as const
const THIN = { stroke: 'currentColor', fill: 'none', strokeWidth: 0.9, strokeDasharray: '3 4', opacity: 0.55 } as const


// ── Image mode ────────────────────────────────────────────────────────────────
// The site's silhouettes are 1200x325 transparent PNGs, dark teal fill with light
// detail lines, nearly tight to the aircraft. `bounds` are the measured opaque
// extents of the supplied files; they pin the aircraft's nose/tail/wingtips and
// gear to the dimension lines. Files with slightly different padding are still
// fine: the error is a few units.
const IMG = { w: 1200, h: 325 }
const FRONT_BOUNDS = { minX: 10, maxX: 1188, minY: 9, maxY: 315, tipY: 158 }
const SIDE_BOUNDS  = { minX: 9,  maxX: 1193, minY: 20, maxY: 304, noseY: 222, tailY: 60, finX: 1020 }

// Dark teal plane -> light grey plane with the detail lines turned dark, which
// reads on the near-black brand section. Tuned for a dark brand color.
const RECOLOR = 'grayscale(1) invert(1) contrast(1.15) brightness(0.95)'

type ImagePlacement = { x: number; y: number; w: number; h: number; s: number }

/** Scale the image so the aircraft's tight width equals `span`; sit its lowest point on `ground`. */
function place(b: { minX: number; maxX: number; maxY: number }, left: number, span: number, ground: number): ImagePlacement {
  const s = span / (b.maxX - b.minX)
  return { s, w: IMG.w * s, h: IMG.h * s, x: left - b.minX * s, y: ground - b.maxY * s }
}

function PlaneImg({ src, p, vbW, vbH }: { src: string; p: ImagePlacement; vbW: number; vbH: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      draggable={false}
      style={{
        position: 'absolute',
        left: `${(p.x / vbW) * 100}%`,
        top: `${(p.y / vbH) * 100}%`,
        width: `${(p.w / vbW) * 100}%`,
        height: `${(p.h / vbH) * 100}%`,
        filter: RECOLOR,
      }}
    />
  )
}


const FRONT_VB = { w: 600, h: 232 }
const SIDE_VB  = { w: 700, h: 232 }

function FrontImageView({ wingspan, src }: { wingspan: Dim; src: string }) {
  const { w, h } = FRONT_VB
  const p = place(FRONT_BOUNDS, 40, 520, 214)
  const tipY = p.y + FRONT_BOUNDS.tipY * p.s
  return (
    <div className="relative w-full" style={{ aspectRatio: `${w} / ${h}` }}>
      <PlaneImg src={src} p={p} vbW={w} vbH={h} />
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" aria-hidden focusable="false">
        <Defs />
        <path d={`M40 16 V${tipY + 6}`} {...THIN} />
        <path d={`M560 16 V${tipY + 6}`} {...THIN} />
        <line x1="40" y1="38" x2="560" y2="38" stroke="currentColor" strokeWidth="1.2" markerStart="url(#ac-arrow)" markerEnd="url(#ac-arrow)" />
        <Label x={300} y={38}>{wingspan.value}</Label>
        <path d={`M0 214 H${w}`} {...THIN} opacity={0.25} />
      </svg>
    </div>
  )
}

function SideImageView({ length, height, src }: { length: Dim; height: Dim; src: string }) {
  const { w, h } = SIDE_VB
  const p = place(SIDE_BOUNDS, 130, 520, 214)
  const finTop = p.y + SIDE_BOUNDS.minY * p.s
  const noseY = p.y + SIDE_BOUNDS.noseY * p.s
  const tailY = p.y + SIDE_BOUNDS.tailY * p.s
  const finX = p.x + SIDE_BOUNDS.finX * p.s
  return (
    <div className="relative w-full" style={{ aspectRatio: `${w} / ${h}` }}>
      <PlaneImg src={src} p={p} vbW={w} vbH={h} />
      <svg viewBox={`0 0 ${w} ${h}`} className="absolute inset-0 h-full w-full" aria-hidden focusable="false">
        <Defs />
        <path d={`M130 16 V${noseY + 6}`} {...THIN} />
        <path d={`M650 16 V${tailY + 6}`} {...THIN} />
        <line x1="130" y1="38" x2="650" y2="38" stroke="currentColor" strokeWidth="1.2" markerStart="url(#ac-arrow)" markerEnd="url(#ac-arrow)" />
        <Label x={390} y={38}>{length.value}</Label>

        <path d={`M62 ${finTop} H${finX}`} {...THIN} />
        <path d="M62 214 H200" {...THIN} />
        <line x1="66" y1={finTop} x2="66" y2="214" stroke="currentColor" strokeWidth="1.2" markerStart="url(#ac-arrow)" markerEnd="url(#ac-arrow)" />
        <Label x={66} y={(finTop + 214) / 2}>{height.value}</Label>
        <path d={`M130 214 H${w}`} {...THIN} opacity={0.25} />
      </svg>
    </div>
  )
}

function FrontView({ wingspan, src }: { wingspan: Dim; src?: string }) {
  if (src) return <FrontImageView wingspan={wingspan} src={src} />
  const wing = (
    <g {...LINE}>
      {/* wing, rising toward the tip, with an upturned winglet */}
      <path d="M26 168 L208 144 L210 122 L214 124 L212 150 L26 178 Z" />
      {/* main gear */}
      <path d="M22 178 L26 207" />
      <rect x="21" y="200" width="9" height="14" rx="2" />
    </g>
  )
  return (
    <svg viewBox="0 0 480 232" className="h-auto w-full" aria-hidden focusable="false">
      <Defs />
      {/* extension lines + dimension */}
      <path d="M30 16 V128" {...THIN} />
      <path d="M450 16 V128" {...THIN} />
      <line x1="30" y1="38" x2="450" y2="38" stroke="currentColor" strokeWidth="1.2" markerStart="url(#ac-arrow)" markerEnd="url(#ac-arrow)" />
      <Label x={240} y={38}>{wingspan.value}</Label>

      <path d="M0 214 H480" {...THIN} opacity={0.25} />
      <g transform="translate(240 0)">
        <g {...LINE}>
          {/* fuselage, windscreen, tail */}
          <ellipse cx="0" cy="150" rx="26" ry="34" />
          <path d="M-16 134 Q0 124 16 134 L14 142 Q0 138 -14 142 Z" />
          <path d="M0 116 V70" />
          <rect x="-22" y="68" width="44" height="5" />
          {/* engines */}
          <circle cx="-38" cy="128" r="15" />
          <circle cx="-38" cy="128" r="8" />
          <circle cx="38" cy="128" r="15" />
          <circle cx="38" cy="128" r="8" />
          {/* nose gear */}
          <path d="M0 184 V206" />
          <rect x="-3" y="203" width="6" height="11" rx="1.5" />
        </g>
        {wing}
        <g transform="scale(-1 1)">{wing}</g>
      </g>
    </svg>
  )
}

function SideView({ length, height, src }: { length: Dim; height: Dim; src?: string }) {
  if (src) return <SideImageView length={length} height={height} src={src} />
  return (
    <svg viewBox="0 0 700 232" className="h-auto w-full" aria-hidden focusable="false">
      <Defs />
      {/* length dimension */}
      <path d="M130 16 V168" {...THIN} />
      <path d="M642 16 V150" {...THIN} />
      <line x1="130" y1="38" x2="642" y2="38" stroke="currentColor" strokeWidth="1.2" markerStart="url(#ac-arrow)" markerEnd="url(#ac-arrow)" />
      <Label x={386} y={38}>{length.value}</Label>

      {/* height dimension */}
      <path d="M62 70 H574" {...THIN} />
      <path d="M62 214 H200" {...THIN} />
      <line x1="66" y1="70" x2="66" y2="214" stroke="currentColor" strokeWidth="1.2" markerStart="url(#ac-arrow)" markerEnd="url(#ac-arrow)" />
      <Label x={66} y={142}>{height.value}</Label>

      <path d="M130 214 H642" {...THIN} opacity={0.25} />
      <g transform="translate(130 64)" {...LINE}>
        {/* fuselage */}
        <path d="M0 104 C8 92 24 84 48 80 L92 70 L380 66 C420 66 460 76 512 86 L512 94 C470 100 430 108 392 112 L120 118 C70 118 24 114 0 104 Z" />
        {/* T-tail: fin and stabilizer */}
        <path d="M390 68 L448 8 L486 8 L474 80" />
        <path d="M440 8 L504 5 L504 11 L486 11" />
        {/* rear engine and pylon */}
        <path d="M356 86 H430 a8 8 0 0 1 0 14 H356 z" />
        <path d="M380 86 L388 76 M410 86 L416 76" />
        {/* wing root */}
        <path d="M190 112 L330 117 L338 112" />
        {/* window line */}
        <path d="M118 84 H336" strokeDasharray="7 11" strokeWidth="3.2" />
        {/* landing gear */}
        <path d="M60 116 V145" />
        <circle cx="60" cy="145" r="5" />
        <path d="M268 118 V143" />
        <circle cx="262" cy="145" r="5" />
        <circle cx="276" cy="145" r="5" />
      </g>
    </svg>
  )
}

export default function AircraftDiagram({
  wingspan, length, height, ariaLabel, note, frontSrc, sideSrc,
}: { wingspan: Dim; length: Dim; height: Dim; ariaLabel: string; note: string; frontSrc?: string; sideSrc?: string }) {
  // Column widths follow each view's own viewBox so both views draw at one scale.
  const frontW = frontSrc ? FRONT_VB.w : 480
  const sideW  = sideSrc ? SIDE_VB.w : 700
  return (
    <figure role="img" aria-label={ariaLabel} className="text-fg-on-brand">
      <div
        className="grid items-end gap-lg md:[grid-template-columns:var(--ac-cols)]"
        style={{ ['--ac-cols' as string]: `${frontW}fr ${sideW}fr` }}
      >
        <FrontView wingspan={wingspan} src={frontSrc} />
        <SideView length={length} height={height} src={sideSrc} />
      </div>
      <figcaption className="mt-sm text-center text-xs opacity-60">{note}</figcaption>
    </figure>
  )
}
