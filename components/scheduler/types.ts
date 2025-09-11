export type Mode = 'single' | 'cadence'
export type CadenceOption = 'weekly' | 'biweekly' | 'monthly' | 'every_other_month' | 'quarterly' | 'custom'
export type IntervalUnit = 'days' | 'weeks' | 'months'

export interface CadenceConfig {
  mode: Mode
  cadence: CadenceOption
  startDate: string // yyyy-mm-dd
  time: string // HH:MM
  weekdays: number[] // for weekly/biweekly multi-select
  monthDay: number
  occurrences: number
  customEvery?: { n: number; unit: IntervalUnit }
  exclusions: number[] // indices excluded from preview
  singleDate?: string // for single mode
  singleTime?: string // for single mode
}

export interface GeneratedInstance {
  date: Date
  excluded: boolean
}

export interface SchedulePayload {
  mode: Mode
  sendAt?: string // ISO for single mode or immediate
  series?: string[] // ISO datetimes
  meta: Record<string, any>
}
