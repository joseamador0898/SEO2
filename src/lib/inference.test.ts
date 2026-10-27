import { describe, expect, it } from 'vitest'
import { flight, points, transport } from './carbon'
import { INBOX } from './data'
import { inferFromEmail, readGarments } from './inference'

const email = (id: string) => INBOX.find((e) => e.id === id)!

describe('carbon engine', () => {
  it('rewards biking and penalises nothing for a solo car', () => {
    expect(points(transport('bike', 10))).toBe(22)
    expect(points(transport('car', 10))).toBe(0)
  })
  it('splits carpool emissions by occupants', () => {
    expect(points(transport('carpool', 10, 4))).toBe(16)
  })
  it('makes solo ride-hailing worse than driving', () => {
    expect(points(transport('ride_solo', 10))).toBeLessThan(0)
  })
  it('penalises a round-trip flight in full', () => {
    expect(points(flight(1300, 'economy', true))).toBe(-3926)
  })
})

describe('email inference', () => {
  it('reads a Zara receipt line by line', () => {
    const a = inferFromEmail(email('em-zara-1'))!
    expect(a.brand).toBe('Zara')
    expect(a.title).toBe('Zara order · 4 items')
    expect(a.emittedG).toBe(25_000 + 8_000 * 2 + 30_000)
    expect(a.points).toBeLessThan(0)
  })
  it('applies the haul multiplier after 3 orders', () => {
    const base = inferFromEmail(email('em-shein-1'), 0)!
    const habit = inferFromEmail(email('em-shein-1'), 3)!
    expect(habit.emittedG).toBe(base.emittedG * 1.5)
  })
  it('measures a flight route from IATA codes', () => {
    const a = inferFromEmail(email('em-volaris-1'))!
    expect(a.category).toBe('flight')
    expect(a.title).toContain('MEX → CUN')
    expect(a.detail).toContain('round trip')
  })
  it('separates shared and solo rides', () => {
    expect(inferFromEmail(email('em-didi-1'))!.points).toBeGreaterThan(0)
    expect(inferFromEmail(email('em-uber-1'))!.points).toBeLessThan(0)
  })
  it('rewards second-hand', () => {
    expect(inferFromEmail(email('em-gotrendier-1'))!.points).toBeGreaterThan(0)
  })
  it('ignores unrelated mail', () => {
    expect(inferFromEmail({ id: 'x', from: 'Mom', subject: 'Comida el domingo', body: 'Te esperamos', date: '' })).toBeNull()
  })
  it('falls back to "N items" phrasing', () => {
    expect(readGarments('Order summary — 7 items').count).toBe(7)
  })
})
