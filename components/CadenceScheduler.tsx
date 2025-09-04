"use client"
import { useEffect, useMemo, useState } from 'react'

type Cadence = 'weekly'|'biweekly'|'monthly'|'every_other_month'|'quarterly'|'custom'
type Unit = 'days'|'weeks'|'months'

export type CadenceSelection = {
  cadence: Cadence
  count: number
  startDate: string // yyyy-mm-dd
  time: string // HH:MM (24h)
  weekday?: number // 0-6, for weekly/biweekly
  monthDay?: number // 1-31, for monthly variants
  customEvery?: { n: number; unit: Unit }
}

export default function CadenceScheduler({
  onChange,
  initial,
  maxPreview = 12,
}: {
  onChange: (dates: Date[]) => void
  initial?: Partial<CadenceSelection>
  maxPreview?: number
}) {
  const now = new Date()
  const defDate = toDateInput(now)
  const defTime = toTimeInput(now)
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence || 'biweekly')
  const [count, setCount] = useState<number>(initial?.count || 6)
  const [startDate, setStartDate] = useState<string>(initial?.startDate || defDate)
  const [time, setTime] = useState<string>(initial?.time || defTime)
  const [weekday, setWeekday] = useState<number>(initial?.weekday ?? now.getDay())
  const [monthDay, setMonthDay] = useState<number>(initial?.monthDay || Math.min(28, now.getDate()))
  const [customN, setCustomN] = useState<number>(initial?.customEvery?.n || 2)
  const [customUnit, setCustomUnit] = useState<Unit>(initial?.customEvery?.unit || 'weeks')
  const [exclusions, setExclusions] = useState<Record<number, boolean>>({})

  const preview = useMemo(() => {
    const base = atTime(parseDate(startDate), time)
    let dates: Date[] = []
    const push = (d: Date) => { if (dates.length < maxPreview) dates.push(d) }
    if (!isFinite(base.getTime())) return []
    const total = Math.max(1, Math.min(36, count))
    switch (cadence) {
      case 'weekly':
      case 'biweekly': {
        const stepWeeks = cadence === 'biweekly' ? 2 : 1
        let first = alignToWeekday(base, weekday)
        for (let i = 0; i < total; i++) push(addWeeks(first, i * stepWeeks))
        break
      }
      case 'monthly':
      case 'every_other_month':
      case 'quarterly': {
        const stepMonths = cadence === 'monthly' ? 1 : cadence === 'every_other_month' ? 2 : 3
        const first = alignToMonthDay(base, monthDay)
        for (let i = 0; i < total; i++) push(addMonthsSafe(first, i * stepMonths, monthDay))
        break
      }
      case 'custom': {
        const n = Math.max(1, Math.floor(customN))
        if (customUnit === 'days') {
          for (let i = 0; i < total; i++) push(addDays(base, i * n))
        } else if (customUnit === 'weeks') {
          for (let i = 0; i < total; i++) push(addWeeks(base, i * n))
        } else {
          for (let i = 0; i < total; i++) push(addMonthsSafe(base, i * n, monthDay))
        }
        break
      }
    }
    return dates
  }, [cadence, count, startDate, time, weekday, monthDay, customN, customUnit, maxPreview])

  const selected = useMemo(() => preview.filter((_, i) => !exclusions[i]), [preview, exclusions])

  useEffect(() => { onChange(selected) }, [selected, onChange])

  // If parent provides new initial startDate/time, sync internal state
  useEffect(() => {
    if (initial?.startDate && initial.startDate !== startDate) setStartDate(initial.startDate)
    if (initial?.time && initial.time !== time) setTime(initial.time)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.startDate, initial?.time])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-slate-600 mb-2">Cadence</div>
          <div className="flex gap-2 flex-wrap">
            {[
              { key: 'weekly', label: 'Weekly' },
              { key: 'biweekly', label: 'Every 2 weeks' },
              { key: 'monthly', label: 'Monthly' },
              { key: 'every_other_month', label: 'Every other month' },
              { key: 'quarterly', label: 'Quarterly' },
              { key: 'custom', label: 'Custom…' },
            ].map(opt => (
              <button
                key={opt.key}
                type="button"
                aria-pressed={cadence === (opt.key as Cadence)}
                onClick={() => setCadence(opt.key as Cadence)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${cadence === (opt.key as Cadence) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm text-slate-600 mb-1">Start date</div>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="h-10 w-full input-neon px-3 text-sm" />
        </div>
        <div>
          <div className="text-sm text-slate-600 mb-1">Time</div>
          <input type="time" value={time} onChange={e=>setTime(e.target.value)} className="h-10 w-full input-neon px-3 text-sm" />
        </div>
      </div>

      {['weekly','biweekly'].includes(cadence) && (
        <div>
          <div className="text-sm text-slate-600 mb-2">Day of week</div>
          <div className="flex flex-wrap gap-3">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
              <button key={i} type="button" onClick={()=>setWeekday(i)}
                className={`px-4 py-2 rounded-full border text-sm transition-colors ${weekday===i?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-900 border-slate-200 hover:border-slate-300'}`}>{d}</button>
            ))}
          </div>
        </div>
      )}

      {['monthly','every_other_month','quarterly','custom'].includes(cadence) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-sm text-slate-600 mb-1">Day of month</div>
            <select className="h-10 w-full input-neon px-3 text-sm" value={monthDay} onChange={e=>setMonthDay(Number(e.target.value))}>
              {Array.from({ length: 31 }, (_, i) => i+1).map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          {cadence==='custom' && (
            <>
              <div>
                <div className="text-sm text-slate-600 mb-1">Every</div>
                <input type="number" min={1} value={customN} onChange={e=>setCustomN(Number(e.target.value))} className="h-10 w-full input-neon px-3 text-sm" />
              </div>
              <div>
                <div className="text-sm text-slate-600 mb-1">Unit</div>
                <select value={customUnit} onChange={e=>setCustomUnit(e.target.value as Unit)} className="h-10 w-full input-neon px-3 text-sm">
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        <div>
          <div className="text-sm text-slate-600 mb-2">Occurrences</div>
          <input type="number" min={1} max={36} value={count} onChange={e=>setCount(Number(e.target.value))} className="h-12 w-full input-neon px-3 text-sm" />
        </div>
        <div className="sm:col-span-2 text-sm text-slate-500">Preview first {Math.min(maxPreview, count)} occurrences — uncheck any to exclude specific dates from the series.</div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-56 overflow-y-auto">
        {preview.length === 0 && <div className="text-sm text-slate-500">No dates</div>}
        <ul className="space-y-3">
          {preview.map((d, i) => {
            const id = `cad-${i}`
            const label = d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
            const excluded = !!exclusions[i]
            return (
              <li key={i} className="flex items-center gap-3">
                <input id={id} type="checkbox" checked={!excluded} onChange={(e)=>setExclusions(prev=>({ ...prev, [i]: !e.target.checked }))} className="h-5 w-5 rounded-sm border-slate-300" />
                <label htmlFor={id} className={`text-sm ${excluded?'line-through text-slate-400':'text-slate-900'}`}>{label}</label>
                <div className="ml-auto text-xs text-slate-400">{i+1}</div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

// Helpers
function toDateInput(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10) }
function toTimeInput(d: Date) { return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
function parseDate(s: string) { const [y,m,da] = s.split('-').map(Number); return new Date(y, (m-1), da) }
function atTime(d: Date, t: string) { const [hh,mm] = t.split(':').map(Number); const x = new Date(d); x.setHours(hh, mm, 0, 0); return x }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x }
function addWeeks(d: Date, n: number) { return addDays(d, n * 7) }
function addMonthsSafe(d: Date, n: number, dom: number) { const x = new Date(d); x.setMonth(x.getMonth() + n); const last = lastDayOfMonth(x.getFullYear(), x.getMonth()); x.setDate(Math.min(dom, last)); return x }
function lastDayOfMonth(y: number, mZero: number) { return new Date(y, mZero + 1, 0).getDate() }
function alignToWeekday(d: Date, weekday: number) { const x = new Date(d); const diff = (weekday - x.getDay() + 7) % 7; if (diff !== 0) x.setDate(x.getDate() + diff); return x }
function alignToMonthDay(d: Date, dom: number) { const x = new Date(d); const last = lastDayOfMonth(x.getFullYear(), x.getMonth()); x.setDate(Math.min(dom, last)); if (x < d) { // move to next month if already past
  x.setMonth(x.getMonth() + 1); const nextLast = lastDayOfMonth(x.getFullYear(), x.getMonth()); x.setDate(Math.min(dom, nextLast));
}
return x }
