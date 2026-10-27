export type Category = 'transport' | 'flight' | 'shopping' | 'food'

export type SourceId = 'iphone' | 'gmail' | 'rides' | 'wallet' | 'calendar'

export interface Action {
  id: string
  category: Category
  title: string
  detail: string
  /** ISO date */
  date: string
  emittedG: number
  baselineG: number
  points: number
  source: SourceId | 'manual'
  /** 0–1, only for inferred actions */
  confidence?: number
  /** why the engine inferred this */
  evidence?: string
  /** brand that triggered a penalty, e.g. "Zara" */
  brand?: string
}

export interface Source {
  id: SourceId
  name: string
  blurb: string
  reads: string[]
}
