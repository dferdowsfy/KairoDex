"use client"
import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  value?: Date | null
  onChange: (d: Date) => void
  days?: number // how many days forward to show
  minuteStep?: number // step for minutes
}

const ITEM_H = 40 // px

export default function WheelDateTime({ value, onChange, days = 60, minuteStep = 5 }: Props) {
  const today = useMemo(() => new Date(), [])
  const dates = useMemo(() => range(days).map((i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const label = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    const key = d.toISOString().slice(0,10)
    return { key, label, y: d.getFullYear(), m: d.getMonth(), da: d.getDate() }
  }), [days, today])
  const hours = useMemo(() => range(12).map(i => (i+1)), [])
  const minutes = useMemo(() => range(Math.floor(60 / minuteStep)).map(i => i*minuteStep), [minuteStep])
  const ampm = ['AM','PM'] as const

  const initial = useMemo(() => {
    const d = value ?? new Date()
    const dateKey = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10)
    const dateIdx = Math.max(0, dates.findIndex(x => x.key === dateKey))
    let hh = d.getHours()
    const ap = hh >= 12 ? 1 : 0
    hh = hh % 12
    if (hh === 0) hh = 12
    const hourIdx = Math.max(0, hours.findIndex(h => h === hh))
    const minuteRounded = Math.round(d.getMinutes() / minuteStep) * minuteStep
    const minuteIdx = Math.max(0, minutes.findIndex(m => m === (minuteRounded % 60)))
    return { dateIdx, hourIdx, minuteIdx, ap }
  }, [value, dates, hours, minutes, minuteStep])

  const [dateIdx, setDateIdx] = useState(initial.dateIdx)
  const [hourIdx, setHourIdx] = useState(initial.hourIdx)
  const [minuteIdx, setMinuteIdx] = useState(initial.minuteIdx)
  const [apIdx, setApIdx] = useState<number>(initial.ap)

  const dateRef = useRef<HTMLDivElement>(null)
  const hourRef = useRef<HTMLDivElement>(null)
  const minRef = useRef<HTMLDivElement>(null)
  const apRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // scroll to initial positions
    const scrollTo = (el: HTMLDivElement | null, index: number) => {
      if (!el) return
      el.scrollTo({ top: index * ITEM_H, behavior: 'instant' as any })
    }
    scrollTo(dateRef.current, dateIdx)
    scrollTo(hourRef.current, hourIdx)
    scrollTo(minRef.current, minuteIdx)
    scrollTo(apRef.current, apIdx)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const d = dates[dateIdx]
    const hour12 = hours[hourIdx]
    const minute = minutes[minuteIdx]
    const hour24 = (apIdx === 1 ? (hour12 % 12) + 12 : (hour12 % 12))
    const combined = new Date(d.y, d.m, d.da, hour24, minute, 0, 0)
    onChange(combined)
  }, [dateIdx, hourIdx, minuteIdx, apIdx, dates, hours, minutes, onChange])

  return (
    <div className="relative grid grid-cols-4 gap-2">
      <WheelColumn refEl={dateRef} values={dates.map(d => d.label)} index={dateIdx} setIndex={setDateIdx} />
      <WheelColumn refEl={hourRef} values={hours.map(n => String(n))} index={hourIdx} setIndex={setHourIdx} />
      <WheelColumn refEl={minRef} values={minutes.map(n => String(n).padStart(2,'0'))} index={minuteIdx} setIndex={setMinuteIdx} />
      <WheelColumn refEl={apRef} values={[...ampm]} index={apIdx} setIndex={setApIdx} />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 border-y border-slate-200"></div>
    </div>
  )
}

function WheelColumn({ values, index, setIndex, refEl }: { values: string[]; index: number; setIndex: (i: number) => void; refEl?: React.RefObject<HTMLDivElement> }) {
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
    <div ref={refEl} onScroll={onScroll} className="relative h-40 overflow-y-auto snap-y snap-mandatory rounded-lg border border-slate-200 bg-white" style={{ scrollBehavior: 'smooth' }}>
      <div style={{ height: ITEM_H }} aria-hidden></div>
      {values.map((v, i) => (
        <div key={i} className={`h-10 flex items-center justify-center snap-center ${i===index ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>{v}</div>
      ))}
      <div style={{ height: ITEM_H }} aria-hidden></div>
    </div>
  )
}

function range(n: number) { return Array.from({ length: n }, (_, i) => i) }
