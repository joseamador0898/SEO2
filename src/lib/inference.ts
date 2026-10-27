// Turns raw signals (receipts, motion data, wallet taps) into scored actions.
// Runs fully on-device: nothing here sends data anywhere.

import {
  fastFashion,
  flight,
  formatKg,
  GARMENT_G,
  haversineKm,
  points,
  secondHand,
  transport,
  type CabinClass,
  type Footprint,
  type Garment,
  type TransportMode,
} from './carbon'
import type { Action, SourceId } from './types'

export interface Email {
  id: string
  from: string
  subject: string
  body: string
  date: string
}

export interface MotionSignal {
  id: string
  kind: 'cycling' | 'walking' | 'transit' | 'driving'
  km: number
  date: string
  /** where the phone picked it up, e.g. a Health workout or a motion trip */
  via: string
}

export interface WalletTap {
  id: string
  merchant: string
  amount: number
  date: string
}

export const FAST_FASHION = [
  'Zara', 'Shein', 'H&M', 'Bershka', 'Pull&Bear', 'Stradivarius', 'Primark',
  'Forever 21', 'Temu', 'Mango', 'Fashion Nova', 'Oysho', 'C&A',
]
export const SECOND_HAND = ['GoTrendier', 'Vinted', 'Depop', 'ThredUp', 'Poshmark']
const AIRLINES = ['Aeroméxico', 'Aeromexico', 'Volaris', 'Viva Aerobus', 'VivaAerobus', 'United', 'American Airlines', 'Delta', 'Iberia', 'Copa']

// Lat/lon for airports the parser can measure.
const AIRPORTS: Record<string, [number, number]> = {
  MEX: [19.436, -99.072], NLU: [19.756, -99.015], CUN: [21.037, -86.877], GDL: [20.522, -103.311],
  MTY: [25.779, -100.107], TIJ: [32.541, -116.97], PVR: [20.68, -105.254], SJD: [23.152, -109.721],
  OAX: [16.999, -96.727], MID: [20.937, -89.658], LAX: [33.942, -118.408], JFK: [40.641, -73.778],
  ORD: [41.974, -87.907], MIA: [25.793, -80.29], MAD: [40.472, -3.561], BOG: [4.702, -74.147],
  PTY: [9.071, -79.383], DFW: [32.9, -97.04], IAH: [29.99, -95.337], CDG: [49.01, 2.548],
}

const GARMENT_WORDS: [RegExp, Garment][] = [
  [/jean|pantal[oó]n|pants|trouser|falda|skirt/i, 'pants'],
  [/vestido|dress/i, 'dress'],
  [/tenis|zapato|sneaker|shoe|bota|boot/i, 'shoes'],
  [/chamarra|abrigo|jacket|coat|sudadera|hoodie/i, 'outerwear'],
  [/playera|camis|blusa|shirt|top|tee|polo/i, 'top'],
]

const findBrand = (text: string, list: string[]) =>
  list.find((b) => new RegExp(`\\b${b.replace(/[&]/g, '\\&').replace(/\s/g, '\\s?')}\\b`, 'i').test(text))

function make(
  base: Omit<Action, 'id' | 'points' | 'emittedG' | 'baselineG'>,
  fp: Footprint,
  id: string,
): Action {
  return { ...base, id, emittedG: Math.round(fp.emittedG), baselineG: Math.round(fp.baselineG), points: points(fp) }
}

/** Count garments line by line; fall back to "N items" phrasing. */
export function readGarments(body: string): { count: number; grams: number; kinds: Garment[] } {
  const kinds: Garment[] = []
  for (const line of body.split(/\n/)) {
    const qty = Number(line.match(/(?:x\s?(\d+)|(\d+)\s?x\b|cant(?:idad)?\.?:?\s*(\d+)|qty:?\s*(\d+))/i)?.slice(1).find(Boolean) ?? 0)
    const kind = GARMENT_WORDS.find(([re]) => re.test(line))?.[1]
    if (kind) for (let i = 0; i < Math.max(1, qty); i++) kinds.push(kind)
  }
  if (kinds.length === 0) {
    const n = Number(body.match(/(\d+)\s*(?:art[ií]culos|items|prendas|productos|pzas?)/i)?.[1] ?? 0)
    for (let i = 0; i < n; i++) kinds.push('other')
  }
  return { count: kinds.length, grams: kinds.reduce((s, k) => s + GARMENT_G[k], 0), kinds }
}

/**
 * @param recentFashionOrders fast-fashion orders already seen in the last 30 days,
 *   used for the "haul habit" multiplier.
 */
export function inferFromEmail(email: Email, recentFashionOrders = 0): Action | null {
  const text = `${email.from}\n${email.subject}\n${email.body}`
  const source: SourceId = 'gmail'
  const evidence = `Email from ${email.from.replace(/<.*>/, '').trim()}: “${email.subject}”`

  const ff = findBrand(text, FAST_FASHION)
  if (ff && /pedido|order|compra|recibo|receipt|confirm/i.test(text)) {
    const g = readGarments(email.body)
    const count = g.count || 1
    const grams = g.grams || GARMENT_G.other
    const habit = recentFashionOrders >= 3
    return make(
      {
        category: 'shopping',
        title: `${ff} order · ${count} item${count > 1 ? 's' : ''}`,
        detail: habit ? 'Fast fashion · 3+ orders this month (×1.5 habit penalty)' : 'Fast fashion, new garments',
        date: email.date,
        source,
        brand: ff,
        confidence: g.count ? 0.94 : 0.72,
        evidence,
      },
      fastFashion(grams, recentFashionOrders),
      email.id,
    )
  }

  const sh = findBrand(text, SECOND_HAND)
  if (sh) {
    const n = readGarments(email.body).count || 1
    return make(
      { category: 'shopping', title: `${sh} · ${n} second-hand item${n > 1 ? 's' : ''}`, detail: 'Pre-loved instead of new', date: email.date, source, brand: sh, confidence: 0.9, evidence },
      secondHand(n),
      email.id,
    )
  }

  const airline = findBrand(text, AIRLINES)
  const route = text.match(/\b([A-Z]{3})\s*(?:-|–|→|>|to|a)\s*([A-Z]{3})\b/)
  if (airline || (route && /vuelo|flight|boarding|reservaci[oó]n|itinerar/i.test(text))) {
    const [from, to] = route ? [route[1], route[2]] : ['', '']
    const known = AIRPORTS[from] && AIRPORTS[to]
    const km = known ? haversineKm(AIRPORTS[from], AIRPORTS[to]) : 1500
    const roundTrip = /ida y vuelta|round[- ]trip|regreso|return/i.test(text)
    const cabin: CabinClass = /business|premier one|ejecutiva/i.test(text) ? 'business' : /premium|plus/i.test(text) ? 'premium' : 'economy'
    const fp = flight(km, cabin, roundTrip)
    return make(
      {
        category: 'flight',
        title: known ? `Flight ${from} → ${to}${roundTrip ? ' ↺' : ''}` : `${airline ?? 'Flight'} booking`,
        detail: `${Math.round(km).toLocaleString()} km · ${cabin}${roundTrip ? ' · round trip' : ''} · ${formatKg(fp.emittedG)}`,
        date: email.date,
        source,
        brand: airline,
        confidence: known ? 0.97 : 0.65,
        evidence,
      },
      fp,
      email.id,
    )
  }

  const ride = findBrand(text, ['Uber', 'DiDi', 'Cabify', 'BlaBlaCar'])
  if (ride) {
    const km = Number(text.match(/(\d+(?:[.,]\d+)?)\s*km/i)?.[1].replace(',', '.') ?? 8)
    const shared = /shared|compartid|pool|blablacar/i.test(text)
    const mode: TransportMode = shared ? 'ride_shared' : 'ride_solo'
    return make(
      {
        category: 'transport',
        title: `${ride} ${shared ? 'shared ride' : 'solo ride'} · ${km} km`,
        detail: shared ? 'Split the car with other riders' : 'Includes ~40% empty driving to pick you up',
        date: email.date,
        source: 'rides',
        brand: ride,
        confidence: 0.92,
        evidence,
      },
      transport(mode, km),
      email.id,
    )
  }

  return null
}

const MOTION_MODE: Record<MotionSignal['kind'], TransportMode> = {
  cycling: 'bike', walking: 'walk', transit: 'metrobus', driving: 'car',
}

export function inferFromMotion(s: MotionSignal): Action {
  const mode = MOTION_MODE[s.kind]
  const verb = { cycling: 'Bike ride', walking: 'Walk', transit: 'Transit trip', driving: 'Drove solo' }[s.kind]
  return make(
    { category: 'transport', title: `${verb} · ${s.km} km`, detail: s.via, date: s.date, source: 'iphone', confidence: s.kind === 'transit' ? 0.78 : 0.9, evidence: `iPhone ${s.via}` },
    transport(mode, s.km),
    s.id,
  )
}

export function inferFromWallet(t: WalletTap): Action | null {
  if (/ecobici/i.test(t.merchant))
    return make(
      { category: 'transport', title: 'Ecobici ride · ~5 km', detail: 'Bike share, distance estimated', date: t.date, source: 'wallet', confidence: 0.8, evidence: `Apple Pay at ${t.merchant}` },
      transport('bike', 5),
      t.id,
    )
  if (/metro|metrob[uú]s|movilidad integrada/i.test(t.merchant))
    return make(
      { category: 'transport', title: 'Transit card top-up', detail: 'Assumes ~2 Metrobús trips of 8 km', date: t.date, source: 'wallet', confidence: 0.6, evidence: `Apple Pay at ${t.merchant}` },
      transport('metrobus', 16),
      t.id,
    )
  const ff = findBrand(t.merchant, FAST_FASHION)
  if (ff)
    return make(
      { category: 'shopping', title: `${ff} in-store purchase`, detail: `$${t.amount} MXN · ~${Math.max(1, Math.round(t.amount / 450))} items estimated`, date: t.date, source: 'wallet', brand: ff, confidence: 0.7, evidence: `Apple Pay at ${t.merchant}` },
      fastFashion(GARMENT_G.other * Math.max(1, Math.round(t.amount / 450)), 0),
      t.id,
    )
  return null
}
