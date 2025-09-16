"use client"
import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  value?: Date | null
  onChange: (d: Date) => void
  days?: number // how many days forward to show
  minuteStep?: number // step for minutes
}

const ITEM_H = 48 // px (increased for better spacing)
const YEARS_SPAN = 3 // current year and next 2

export default function WheelDateTime({ value, onChange, days = 60, minuteStep = 5 }: Props) {
  const today = useMemo(() => new Date(), [])
  // Month / Day / Year wheels instead of single date list
  const months = useMemo(() => range(12).map(m => {
    const d = new Date(2000, m, 1)
    return { m, label: d.toLocaleString(undefined, { month: 'short' }) }
  }), [])
  const years = useMemo(() => range(YEARS_SPAN).map(i => today.getFullYear() + i), [today])
  const daysInMonth = useMemo(() => {
    const y = years[0] // placeholder; actual calc done dynamically using selected year and month
    return (year: number, month: number) => new Date(year, month + 1, 0).getDate()
  }, [years])
  const hours = useMemo(() => range(12).map(i => (i+1)), [])
  const minutes = useMemo(() => range(Math.floor(60 / minuteStep)).map(i => i*minuteStep), [minuteStep])
  const ampm = ['AM','PM'] as const

  const initial = useMemo(() => {
    const d = value ?? new Date()
    let hh = d.getHours(); const ap = hh >= 12 ? 1 : 0; hh = hh % 12; if (hh === 0) hh = 12
    const hourIdx = Math.max(0, hours.findIndex(h => h === hh))
    const minuteRounded = Math.round(d.getMinutes() / minuteStep) * minuteStep
    const minuteIdx = Math.max(0, minutes.findIndex(m => m === (minuteRounded % 60)))
    const monthIdx = d.getMonth()
    const yearIdx = Math.max(0, years.findIndex(y => y === d.getFullYear()))
    const dayIdx = d.getDate() - 1
    return { monthIdx, yearIdx, dayIdx, hourIdx, minuteIdx, ap }
  }, [value, hours, minutes, minuteStep, years])

  const [monthIdx, setMonthIdx] = useState(initial.monthIdx)
  const [yearIdx, setYearIdx] = useState(initial.yearIdx)
  const [dayIdx, setDayIdx] = useState(initial.dayIdx)
  const [hourIdx, setHourIdx] = useState(initial.hourIdx)
  const [minuteIdx, setMinuteIdx] = useState(initial.minuteIdx)
  const [apIdx, setApIdx] = useState<number>(initial.ap)

  const hourRef = useRef<HTMLDivElement>(null)
  const minRef = useRef<HTMLDivElement>(null)
  const apRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // scroll to initial positions
    const scrollTo = (el: HTMLDivElement | null, index: number) => {
      if (!el) return
      el.scrollTo({ top: index * ITEM_H, behavior: 'instant' as any })
    }
    scrollTo(hourRef.current, hourIdx)
    scrollTo(minRef.current, minuteIdx)
    scrollTo(apRef.current, apIdx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clamp dayIdx when month/year changes
  useEffect(() => {
    const year = years[yearIdx] ?? today.getFullYear()
    const month = monthIdx
    const maxDay = daysInMonth(year, month)
    if (dayIdx >= maxDay) setDayIdx(maxDay - 1)
  }, [monthIdx, yearIdx, dayIdx, daysInMonth, years, today])

  useEffect(() => {
    const year = years[yearIdx] ?? today.getFullYear()
    const month = monthIdx
    const day = Math.min(dayIdx + 1, daysInMonth(year, month))
    const hour12 = hours[hourIdx]
    const minute = minutes[minuteIdx]
    const hour24 = (apIdx === 1 ? (hour12 % 12) + 12 : (hour12 % 12))
    const combined = new Date(year, month, day, hour24, minute, 0, 0)
    onChange(combined)
  }, [monthIdx, yearIdx, dayIdx, hourIdx, minuteIdx, apIdx, hours, minutes, years, onChange, daysInMonth])

  return (
  <div className="relative flex gap-3 w-full">
      {/* Month / Day / Year */}
      <WheelColumn flex values={months.map(m => m.label)} index={monthIdx} setIndex={setMonthIdx} />
      <WheelColumn flex values={Array.from({ length: daysInMonth(years[yearIdx] ?? today.getFullYear(), monthIdx) }, (_, i) => String(i + 1))} index={dayIdx} setIndex={setDayIdx} />
      <WheelColumn flex values={years.map(y => String(y))} index={yearIdx} setIndex={setYearIdx} />
      {/* Time */}
      <WheelColumn flex refEl={hourRef} values={hours.map(n => String(n))} index={hourIdx} setIndex={setHourIdx} />
      <WheelColumn flex refEl={minRef} values={minutes.map(n => String(n).padStart(2,'0'))} index={minuteIdx} setIndex={setMinuteIdx} />
      <WheelColumn flex={false} narrow refEl={apRef} values={[...ampm]} index={apIdx} setIndex={setApIdx} />
      <div aria-hidden className="pointer-events-none absolute left-0 right-0 top-1/2 -translate-y-1/2 h-12 border-y border-white/40"></div>
    </div>
  )
}

function WheelColumn({ values, index, setIndex, refEl, flex = true, narrow = false }: { values: string[]; index: number; setIndex: (i: number) => void; refEl?: React.RefObject<HTMLDivElement>; flex?: boolean; narrow?: boolean }) {
  const timeout = useRef<any>()
  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    if (timeout.current) clearTimeout(timeout.current)
    timeout.current = setTimeout(() => {
      const i = Math.round(el.scrollTop / ITEM_H)
      setIndex(Math.max(0, Math.min(values.length - 1, i)))
      el.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })
    }, 80)
  }
  useEffect(() => {
    const el = refEl?.current
    if (el) el.scrollTop = index * ITEM_H
  }, [index, refEl])
  return (
  <div ref={refEl} onScroll={onScroll} className={`relative h-40 overflow-y-auto snap-y snap-mandatory rounded-lg border border-white/50 bg-white/90 px-2 ${flex ? 'flex-1' : ''} ${narrow ? 'basis-16 flex-none' : 'min-w-0'}`} style={{ scrollBehavior: 'smooth' }}>
      <div style={{ height: ITEM_H }} aria-hidden></div>
      {values.map((v, i) => (
  <div key={i} className={`h-12 flex items-center justify-center snap-center text-base ${i===index ? 'text-ink font-semibold' : 'text-ink/60'}`}>{v}</div>
      ))}
      <div style={{ height: ITEM_H }} aria-hidden></div>
    </div>
  )
}

function range(n: number) { return Array.from({ length: n }, (_, i) => i) }
