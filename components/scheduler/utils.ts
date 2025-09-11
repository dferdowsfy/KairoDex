import { CadenceOption, CadenceConfig, IntervalUnit } from './types'

export function todayDate(): string {
  const d = new Date();
  return d.toISOString().slice(0,10)
}
export function currentTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export function parseDate(s: string): Date { const [y,m,da] = s.split('-').map(Number); return new Date(y, m-1, da) }
export function atTime(d: Date, t: string): Date { const [hh,mm] = t.split(':').map(Number); const x = new Date(d); x.setHours(hh, mm, 0, 0); return x }

function lastDayOfMonth(y:number,mZero:number){return new Date(y,mZero+1,0).getDate()}
function addDays(d:Date,n:number){const x=new Date(d);x.setDate(x.getDate()+n);return x}
function addWeeks(d:Date,n:number){return addDays(d,n*7)}
function addMonthsSafe(d:Date,n:number,dom:number){const x=new Date(d);x.setMonth(x.getMonth()+n);const last=lastDayOfMonth(x.getFullYear(),x.getMonth());x.setDate(Math.min(dom,last));return x}

function alignToWeekday(d:Date, weekday:number){const x=new Date(d);const diff=(weekday - x.getDay() + 7)%7; if(diff!==0) x.setDate(x.getDate()+diff); return x}
function alignToMonthDay(d:Date, dom:number){const x=new Date(d);const last=lastDayOfMonth(x.getFullYear(),x.getMonth());x.setDate(Math.min(dom,last)); if(x<d){x.setMonth(x.getMonth()+1); const nextLast= lastDayOfMonth(x.getFullYear(),x.getMonth()); x.setDate(Math.min(dom,nextLast))} return x}

export function generateSeries(cfg: CadenceConfig, max=100): Date[] {
  const { cadence, startDate, time, weekdays, monthDay, occurrences, customEvery } = cfg
  const base = atTime(parseDate(startDate), time)
  if (!isFinite(base.getTime())) return []
  const total = Math.max(1, Math.min(occurrences, max))
  const dates: Date[] = []
  const push = (d:Date)=>{ if(dates.length<total) dates.push(d) }

  switch(cadence){
    case 'weekly':
    case 'biweekly': {
      const step = cadence==='biweekly'?2:1
      // support multiple weekday selections; if none fallback to base weekday
      const days = weekdays.length? weekdays: [base.getDay()]
      let current = new Date(base)
      // align first occurrences for each selected weekday within the first cycle
      let cycleStart = alignToWeekday(base, days[0])
      let i=0
      while(dates.length < total){
        for(const wd of days){
          const aligned = alignToWeekday(cycleStart, wd)
          if(aligned >= base && dates.length < total) push(new Date(aligned))
        }
        i += step
        cycleStart = addWeeks(base, i)
      }
      dates.sort((a,b)=>a.getTime()-b.getTime())
      break
    }
    case 'monthly':
    case 'every_other_month':
    case 'quarterly': {
      const stepMonths = cadence==='monthly'?1: cadence==='every_other_month'?2:3
      const first = alignToMonthDay(base, monthDay)
      for(let i=0;i<total;i++) push(addMonthsSafe(first, i*stepMonths, monthDay))
      break
    }
    case 'custom': {
      const n = Math.max(1, Math.floor(customEvery?.n || 1))
      const unit: IntervalUnit = customEvery?.unit || 'weeks'
      if(unit==='days') for(let i=0;i<total;i++) push(addDays(base, i*n))
      else if(unit==='weeks') for(let i=0;i<total;i++) push(addWeeks(base, i*n))
      else for(let i=0;i<total;i++) push(addMonthsSafe(base, i*n, monthDay))
      break
    }
    default:
      return []
  }
  return dates
}

export function buildInitialConfig(): CadenceConfig {
  return {
    mode: 'single',
    cadence: 'weekly',
    startDate: todayDate(),
    time: currentTime(),
    weekdays: [],
    monthDay: new Date().getDate(),
    occurrences: 6,
    customEvery: { n: 1, unit: 'weeks' },
    exclusions: []
  }
}
