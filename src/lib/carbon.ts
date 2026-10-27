// SE O₂ carbon engine — pure functions, all values in grams CO₂e.
// Transport factors follow the EcoTrack CDMX spec (docs/ecotrack-cdmx-prompt.md on PR #1).

export const GRID_G_PER_KWH = 444 // Mexico SEN emission factor (SEMARNAT/CRE)
export const BASELINE_CAR_G_PER_KM = 218 // solo gasoline car in CDMX traffic

// Game economy: 1 point = 100 g CO₂e avoided (or emitted, as a penalty).
export const G_PER_POINT = 100
export const DAILY_GOAL_POINTS = 40

export type TransportMode =
  | 'walk'
  | 'bike'
  | 'ebike'
  | 'scooter'
  | 'metro'
  | 'metrobus'
  | 'bus'
  | 'carpool'
  | 'ev'
  | 'car'
  | 'ride_shared'
  | 'ride_solo'

export interface ModeSpec {
  label: string
  kmh: number
  /** g CO₂e per passenger-km, before dividing by occupants */
  gPerKm: number
  /** true when the vehicle footprint is split between occupants */
  shared?: boolean
  kcalPerMin?: number
}

// Ride-hailing adds ~40% "deadhead" km driving to pick-ups.
const DEADHEAD = 1.4

export const MODES: Record<TransportMode, ModeSpec> = {
  walk: { label: 'Walk', kmh: 4.8, gPerKm: 0, kcalPerMin: 4.2 },
  bike: { label: 'Bike / Ecobici', kmh: 15, gPerKm: 0, kcalPerMin: 7.5 },
  ebike: { label: 'E-bike', kmh: 18, gPerKm: 0.011 * GRID_G_PER_KWH, kcalPerMin: 4 },
  scooter: { label: 'E-scooter', kmh: 16, gPerKm: 0.016 * GRID_G_PER_KWH, kcalPerMin: 1.5 },
  metro: { label: 'Metro', kmh: 30, gPerKm: 0.03 * GRID_G_PER_KWH },
  metrobus: { label: 'Metrobús', kmh: 19.5, gPerKm: 22 },
  bus: { label: 'Bus / RTP', kmh: 13.5, gPerKm: 36.7 },
  carpool: { label: 'Carpool', kmh: 17, gPerKm: BASELINE_CAR_G_PER_KM, shared: true },
  ev: { label: 'Electric car', kmh: 17, gPerKm: 0.165 * GRID_G_PER_KWH, shared: true },
  car: { label: 'Car (solo)', kmh: 17, gPerKm: BASELINE_CAR_G_PER_KM },
  ride_shared: { label: 'Shared ride', kmh: 17, gPerKm: (BASELINE_CAR_G_PER_KM * DEADHEAD) / 2.2 },
  ride_solo: { label: 'Uber / DiDi solo', kmh: 17, gPerKm: BASELINE_CAR_G_PER_KM * DEADHEAD },
}

export interface Footprint {
  /** what this action emitted */
  emittedG: number
  /** what the default alternative would have emitted */
  baselineG: number
}

export function points({ emittedG, baselineG }: Footprint): number {
  return Math.round((baselineG - emittedG) / G_PER_POINT)
}

export function transport(mode: TransportMode, km: number, occupants = 1): Footprint {
  const spec = MODES[mode]
  const perKm = spec.shared ? spec.gPerKm / Math.max(1, occupants) : spec.gPerKm
  return { emittedG: perKm * km, baselineG: BASELINE_CAR_G_PER_KM * km }
}

export function minutesToKm(mode: TransportMode, minutes: number): number {
  return (MODES[mode].kmh * minutes) / 60
}

// --- Flights (DEFRA 2024 economy factors incl. radiative forcing) ---

export type CabinClass = 'economy' | 'premium' | 'business'
const CABIN: Record<CabinClass, number> = { economy: 1, premium: 1.6, business: 2.9 }

export function flight(km: number, cabin: CabinClass = 'economy', roundTrip = false): Footprint {
  const gPerKm = km < 1000 ? 246 : km < 3700 ? 151 : 148
  const legs = roundTrip ? 2 : 1
  // Baseline is not flying; the whole flight counts against you.
  return { emittedG: gPerKm * km * CABIN[cabin] * legs, baselineG: 0 }
}

// --- Clothing (lifecycle estimates per new garment) ---

export type Garment = 'top' | 'pants' | 'dress' | 'shoes' | 'outerwear' | 'other'
export const GARMENT_G: Record<Garment, number> = {
  top: 8_000,
  pants: 25_000,
  dress: 20_000,
  shoes: 14_000,
  outerwear: 30_000,
  other: 12_000,
}

/** Fast fashion: every new item counts; frequent hauls get a habit multiplier. */
export function fastFashion(itemsG: number, recentOrders: number): Footprint {
  const habit = recentOrders >= 3 ? 1.5 : 1
  return { emittedG: itemsG * habit, baselineG: 0 }
}

/** Second-hand displaces roughly a third of a new purchase. */
export function secondHand(items: number): Footprint {
  const avoided = GARMENT_G.other * 0.35 * items
  return { emittedG: 1_000 * items, baselineG: 1_000 * items + avoided }
}

// --- Food (per meal, vs. an average 2.5 kg meal) ---

export type Meal = 'beef' | 'chicken' | 'vegetarian' | 'vegan'
const MEAL_G: Record<Meal, number> = { beef: 7_700, chicken: 1_800, vegetarian: 1_100, vegan: 700 }
const AVERAGE_MEAL_G = 2_500

export function meal(kind: Meal): Footprint {
  return { emittedG: MEAL_G[kind], baselineG: AVERAGE_MEAL_G }
}

// --- Helpers ---

export function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[0] - a[0])
  const dLon = toRad(b[1] - a[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatKg(g: number): string {
  const kg = Math.abs(g) / 1000
  if (kg >= 100) return `${Math.round(kg)} kg`
  if (kg >= 1) return `${kg.toFixed(1)} kg`
  return `${Math.round(Math.abs(g))} g`
}

/** How many 7.5 km bike commutes it takes to earn back a penalty. */
export function bikeRidesToRecover(pointsLost: number): number {
  const perRide = points(transport('bike', 7.5))
  return Math.ceil(Math.abs(pointsLost) / perRide)
}
