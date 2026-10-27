// Demo data the connectors "scan". In a production build these come from
// HealthKit / Core Motion (iOS app), the Gmail API, and Apple Pay / bank feeds.

import type { Email, MotionSignal, WalletTap } from './inference'
import type { Action, Source, SourceId } from './types'

export const daysAgo = (n: number, hour = 9) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

export const SOURCES: Source[] = [
  { id: 'iphone', name: 'iPhone Motion & Health', blurb: 'Detects walks, rides and transit from motion data', reads: ['Workouts', 'Motion activity', 'Significant trips'] },
  { id: 'gmail', name: 'Email receipts', blurb: 'Finds order, flight and ride confirmations', reads: ['Order receipts', 'Flight bookings', 'Ride receipts'] },
  { id: 'rides', name: 'Uber & DiDi', blurb: 'Separates shared rides from solo trips', reads: ['Trip history', 'Ride type'] },
  { id: 'wallet', name: 'Apple Pay & cards', blurb: 'Spots Ecobici, transit and in-store fashion buys', reads: ['Merchant names', 'Amounts'] },
  { id: 'calendar', name: 'Calendar', blurb: 'Catches trips before you book them', reads: ['Travel events'] },
]

export const INBOX: Email[] = [
  {
    id: 'em-zara-1',
    from: 'Zara <noreply@zara.com>',
    subject: 'Confirmación de tu pedido #58231',
    body: 'Gracias por tu compra\nJeans wide leg x1\nPlayera básica algodón x2\nChamarra efecto piel x1\nTotal $3,196 MXN',
    date: daysAgo(1, 21),
  },
  {
    id: 'em-shein-1',
    from: 'SHEIN <order@shein.com>',
    subject: 'Your order has shipped',
    body: 'Order summary — 7 items\nEstimated delivery: 5 days',
    date: daysAgo(4, 23),
  },
  {
    id: 'em-volaris-1',
    from: 'Volaris <reservaciones@volaris.com>',
    subject: 'Tu reservación está confirmada',
    body: 'Vuelo MEX → CUN\nViaje ida y vuelta\nTarifa Básica',
    date: daysAgo(3, 14),
  },
  {
    id: 'em-uber-1',
    from: 'Uber Receipts <noreply@uber.com>',
    subject: 'Your Tuesday evening trip with Uber',
    body: 'UberX · 11.4 km · 32 min\nTotal $186.00',
    date: daysAgo(2, 20),
  },
  {
    id: 'em-didi-1',
    from: 'DiDi <recibos@didiglobal.com>',
    subject: 'Recibo de tu viaje compartido',
    body: 'DiDi Compartido · 9.2 km\nTotal $74.00',
    date: daysAgo(0, 8),
  },
  {
    id: 'em-gotrendier-1',
    from: 'GoTrendier <hola@gotrendier.mx>',
    subject: 'Tu compra fue confirmada',
    body: 'Vestido midi lino x1\nTenis blancos x1',
    date: daysAgo(5, 12),
  },
]

export const MOTION: MotionSignal[] = [
  { id: 'mo-1', kind: 'cycling', km: 6.8, date: daysAgo(0, 8), via: 'Health · Outdoor cycle, Reforma' },
  { id: 'mo-2', kind: 'walking', km: 2.4, date: daysAgo(0, 13), via: 'Motion · walk to lunch' },
  { id: 'mo-3', kind: 'transit', km: 12.5, date: daysAgo(1, 9), via: 'Motion · Metrobús L1 pattern' },
  { id: 'mo-4', kind: 'driving', km: 18, date: daysAgo(2, 18), via: 'Motion · driving, CarPlay connected' },
  { id: 'mo-5', kind: 'cycling', km: 7.5, date: daysAgo(3, 8), via: 'Health · Outdoor cycle' },
  { id: 'mo-6', kind: 'walking', km: 3.1, date: daysAgo(5, 18), via: 'Health · Outdoor walk, Chapultepec' },
]

export const WALLET: WalletTap[] = [
  { id: 'wa-1', merchant: 'ECOBICI CDMX', amount: 0, date: daysAgo(1, 18) },
  { id: 'wa-2', merchant: 'Bershka Antara', amount: 1290, date: daysAgo(6, 17) },
  { id: 'wa-3', merchant: 'Movilidad Integrada recarga', amount: 100, date: daysAgo(4, 8) },
]

export const SOURCE_DATA: Record<SourceId, 'emails' | 'motion' | 'wallet' | 'none'> = {
  gmail: 'emails',
  rides: 'emails',
  iphone: 'motion',
  wallet: 'wallet',
  calendar: 'none',
}

export interface Friend {
  name: string
  initials: string
  weekPoints: number
  streak: number
  hue: number
}

export const FRIENDS: Friend[] = [
  { name: 'Valeria R.', initials: 'VR', weekPoints: 214, streak: 12, hue: 150 },
  { name: 'Diego M.', initials: 'DM', weekPoints: 167, streak: 6, hue: 30 },
  { name: 'Axel C.', initials: 'AC', weekPoints: 121, streak: 4, hue: 210 },
  { name: 'Sofía L.', initials: 'SL', weekPoints: 58, streak: 2, hue: 330 },
  { name: 'Mateo G.', initials: 'MG', weekPoints: -340, streak: 0, hue: 270 },
]

export const LEVELS = [
  { name: 'Seed', min: 0 },
  { name: 'Sprout', min: 100 },
  { name: 'Sapling', min: 300 },
  { name: 'Grove', min: 700 },
  { name: 'Forest', min: 1500 },
  { name: 'Biosphere', min: 3000 },
]

export interface Badge {
  id: string
  name: string
  desc: string
  earned: (actions: Action[]) => boolean
}

const count = (a: Action[], f: (x: Action) => boolean) => a.filter(f).length

export const BADGES: Badge[] = [
  { id: 'first-pedal', name: 'First Pedal', desc: 'Log a bike ride', earned: (a) => count(a, (x) => /bike|ecobici/i.test(x.title)) >= 1 },
  { id: 'pedal-pusher', name: 'Pedal Pusher', desc: 'Five bike rides', earned: (a) => count(a, (x) => /bike|ecobici/i.test(x.title)) >= 5 },
  { id: 'carpool-captain', name: 'Carpool Captain', desc: 'Share a ride or carpool', earned: (a) => count(a, (x) => /shared|carpool/i.test(x.title)) >= 1 },
  { id: 'thrift-king', name: 'Thrift Royalty', desc: 'Buy second-hand', earned: (a) => count(a, (x) => x.category === 'shopping' && x.points > 0) >= 1 },
  { id: 'plant-power', name: 'Plant Power', desc: 'Three plant-based meals', earned: (a) => count(a, (x) => /vegan|vegetarian/i.test(x.title)) >= 3 },
  { id: 'grounded', name: 'Grounded', desc: '30 days with no flights', earned: (a) => !a.some((x) => x.category === 'flight' && Date.now() - +new Date(x.date) < 30 * 864e5) },
  { id: 'honest', name: 'Radical Honesty', desc: 'Confirm a penalty the app found', earned: (a) => a.some((x) => x.confidence !== undefined && x.points < 0) },
]

export interface Challenge {
  id: string
  title: string
  desc: string
  reward: number
  progress: (actions: Action[]) => [number, number]
}

const thisWeek = (a: Action[]) => a.filter((x) => Date.now() - +new Date(x.date) < 7 * 864e5)

export const CHALLENGES: Challenge[] = [
  { id: 'bike-3', title: 'Pedal week', desc: 'Bike or walk 3 times this week', reward: 30, progress: (a) => [Math.min(3, count(thisWeek(a), (x) => /bike|walk|ecobici/i.test(x.title))), 3] },
  { id: 'no-ff', title: 'Closet detox', desc: 'No fast fashion for 7 days', reward: 50, progress: (a) => {
    // Count from the last fast-fashion buy, or from the first activity if there was none.
    const times = (f: (x: Action) => boolean) => a.filter(f).map((x) => +new Date(x.date))
    const since = Math.max(...times((x) => x.category === 'shopping' && x.points < 0), Math.min(...times(() => true), Date.now()))
    return [Math.min(7, Math.floor((Date.now() - since) / 864e5)), 7]
  } },
  { id: 'share-2', title: 'Share the ride', desc: 'Take 2 shared rides or carpools', reward: 20, progress: (a) => [Math.min(2, count(thisWeek(a), (x) => /shared|carpool/i.test(x.title))), 2] },
]
