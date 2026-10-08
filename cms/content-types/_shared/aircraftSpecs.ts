/**
 * The numeric specification keys on OT_AircraftProfile that a spec row or a
 * headline spec may point at. One list, shared by the content-type enum
 * (OT_AircraftSpecRow.specField) and the front end (lib/aircraft.ts), so the
 * enum values can never drift from the record's field keys.
 *
 * `label` is the English fallback shown when a row's own localized Row Label is
 * blank; lib/aircraft.ts localizes it for non-English locales.
 */
export const AIRCRAFT_SPEC_FIELDS = [
  { value: 'rangeNm',           displayName: 'Range (nm)' },
  { value: 'cruiseSpeedMach',   displayName: 'High-Speed Cruise (Mach)' },
  { value: 'maxOperatingMach',  displayName: 'Max Operating Speed (Mmo)' },
  { value: 'maxAltitudeFt',     displayName: 'Maximum Altitude (ft)' },
  { value: 'takeoffDistanceFt', displayName: 'Takeoff Distance (ft)' },
  { value: 'landingDistanceFt', displayName: 'Landing Distance (ft)' },
  { value: 'maxPassengers',     displayName: 'Maximum Passengers' },
  { value: 'typicalPassengers', displayName: 'Typical Configuration' },
  { value: 'crewCount',         displayName: 'Crew' },
  { value: 'livingSpaces',      displayName: 'Living Spaces' },
  { value: 'cabinLengthM',      displayName: 'Cabin Length (m)' },
  { value: 'cabinWidthM',       displayName: 'Cabin Width (m)' },
  { value: 'cabinHeightM',      displayName: 'Cabin Height (m)' },
  { value: 'baggageVolumeM3',   displayName: 'Baggage Volume (m³)' },
  { value: 'thrustLbf',         displayName: 'Thrust per Engine (lbf)' },
] as const

export type AircraftSpecField = (typeof AIRCRAFT_SPEC_FIELDS)[number]['value']
