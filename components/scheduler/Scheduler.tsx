"use client"
import React, { useCallback, useEffect, useMemo, useReducer } from 'react'
import { ModeToggle } from './ModeToggle'
import { CadenceSelector } from './CadenceSelector'
import { DaySelector } from './DaySelector'
import { DateTimePicker } from './DateTimePicker'
import { PreviewList } from './PreviewList'
import { ActionButtons } from './ActionButtons'
import { CadenceConfig, GeneratedInstance, SchedulePayload } from './types'
import { buildInitialConfig, generateSeries, todayDate, currentTime, atTime, parseDate } from './utils'

// Reducer for predictable state updates
 type Action = { type:'set', patch: Partial<CadenceConfig> } | { type:'toggleWeekday', day:number } | { type:'toggleExclusion', index:number }

function reducer(state: CadenceConfig, action: Action): CadenceConfig {
  switch(action.type){
    case 'set':
      return { ...state, ...action.patch }
    case 'toggleWeekday': {
      const set = new Set(state.weekdays)
      if(set.has(action.day)) set.delete(action.day); else set.add(action.day)
      return { ...state, weekdays: Array.from(set).sort() }
    }
    case 'toggleExclusion': {
      const exclusions = state.exclusions.includes(action.index)
        ? state.exclusions.filter(i=>i!==action.index)
        : [...state.exclusions, action.index]
      return { ...state, exclusions }
    }
  }
}

export async function sendEmail(payload: SchedulePayload): Promise<{ ok:boolean; error?:string }>{
  try {
    const res = await fetch('/api/email/resend', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) })
    if(!res.ok){ const j = await res.json().catch(()=>({})); return { ok:false, error: j.error || 'Failed to send' } }
    return { ok:true }
  } catch(e:any){
    return { ok:false, error: e?.message || 'Network error' }
  }
}

export const Scheduler: React.FC<any> = (props) => {
  const { onDatesChange, selection, onSelectionChange } = props || {}
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialConfig)

  const series = useMemo(()=> state.mode==='cadence' ? generateSeries(state, 60) : [], [state])
  const instances: GeneratedInstance[] = useMemo(()=> series.map((d,i)=>({ date: d, excluded: state.exclusions.includes(i) })), [series, state.exclusions])
  const activeSeries = useMemo(()=> instances.filter(i=>!i.excluded).map(i=>i.date), [instances])

  // Derived disabled state for Send Now
  const canSendNow = state.mode==='single' ? !!state.singleDate && !!state.singleTime : !!activeSeries.length

  // Keep singleDate/time defaults when switching
  useEffect(()=>{
    if(state.mode==='single'){
      if(!state.singleDate || !state.singleTime){
        dispatch({ type:'set', patch:{ singleDate: state.singleDate || todayDate(), singleTime: state.singleTime || currentTime() } })
      }
    }
  }, [state.mode, state.singleDate, state.singleTime])

  const handleSendNow = useCallback(async()=>{
    let payload: SchedulePayload
    if(state.mode==='single'){
      const dt = atTime(parseDate(state.singleDate!), state.singleTime!)
      payload = { mode:'single', sendAt: dt.toISOString(), meta:{} }
    } else {
      payload = { mode:'cadence', series: activeSeries.map(d=>d.toISOString()), meta:{ cadence: state.cadence } }
    }
    await sendEmail(payload)
  }, [state, activeSeries])

  const handleSendLater = useCallback(async()=>{
    // For demo, treat as same as send now but could add scheduling offset
    await handleSendNow()
  }, [handleSendNow])

  const handleScheduleSeries = useCallback(async()=>{
    if(state.mode!=='cadence') return
    const payload: SchedulePayload = { mode:'cadence', series: activeSeries.map(d=>d.toISOString()), meta:{ cadence: state.cadence, exclusions: state.exclusions } }
    await sendEmail(payload)
  }, [state, activeSeries])

  // Legacy bridge: if legacy selection prop provided (cadence-only), sync into local state
  useEffect(()=>{
    if(selection){
      const patch: Partial<CadenceConfig> = {
        cadence: selection.cadence,
        occurrences: selection.count,
        startDate: selection.startDate,
        time: selection.time,
        weekdays: selection.weekday !== undefined? [selection.weekday]: state.weekdays,
        monthDay: selection.monthDay,
        customEvery: selection.customEvery
      }
      // shallow check to avoid loops
      let changed = false
      for(const k of Object.keys(patch) as (keyof CadenceConfig)[]){
        if((patch as any)[k] !== (state as any)[k]) { changed = true; break }
      }
      if(changed) dispatch({ type:'set', patch })
    }
  }, [selection])

  // Notify legacy selection consumer
  useEffect(()=>{
    if(onSelectionChange && state.mode==='cadence'){
      onSelectionChange({
        cadence: state.cadence,
        count: state.occurrences,
        startDate: state.startDate,
        time: state.time,
        weekday: state.weekdays[0] ?? 0,
        monthDay: state.monthDay,
        customEvery: state.customEvery
      })
    }
  }, [state.cadence, state.occurrences, state.startDate, state.time, state.weekdays, state.monthDay, state.customEvery])

  // Legacy bridge: notify parent when active series changes
  useEffect(()=>{
    if(typeof onDatesChange === 'function'){
      onDatesChange(activeSeries)
    }
  }, [activeSeries, onDatesChange])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <ModeToggle mode={state.mode} onChange={m=>dispatch({ type:'set', patch:{ mode:m } })} />
        {state.mode==='cadence' && (
          <CadenceSelector value={state.cadence} onChange={c=>dispatch({ type:'set', patch:{ cadence:c } })} />
        )}
      </div>

      {state.mode==='single' && (
        <div className="space-y-4">
          <DateTimePicker
            date={state.singleDate || todayDate()}
            time={state.singleTime || currentTime()}
            onDate={d=>dispatch({ type:'set', patch:{ singleDate:d } })}
            onTime={t=>dispatch({ type:'set', patch:{ singleTime:t } })}
            labelDate="Select date"
            labelTime="Select time"
          />
        </div>
      )}

      {state.mode==='cadence' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <DateTimePicker
              date={state.startDate}
              time={state.time}
              onDate={d=>dispatch({ type:'set', patch:{ startDate:d } })}
              onTime={t=>dispatch({ type:'set', patch:{ time:t } })}
              labelDate="Start date"
              labelTime="Time"
            />
            {['weekly','biweekly'].includes(state.cadence) && (
              <div className="md:col-span-2 space-y-1">
                <span className="text-sm text-gray-600">Weekdays</span>
                <DaySelector selected={state.weekdays} onChange={(days)=>dispatch({ type:'set', patch:{ weekdays: days } })} />
              </div>
            )}
            {['monthly','every_other_month','quarterly','custom'].includes(state.cadence) && (
              <div className="space-y-1">
                <label className="text-sm text-gray-600 block">Day of month
                  <select
                    value={state.monthDay}
                    onChange={e=>dispatch({ type:'set', patch:{ monthDay: Number(e.target.value) } })}
                    className="mt-1 h-10 w-full border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 ring-gray-400"
                  >
                    {Array.from({length:31}, (_,i)=>i+1).map(n=> <option key={n} value={n}>{n}</option> )}
                  </select>
                </label>
              </div>
            )}
            {state.cadence==='custom' && (
              <>
                <div className="space-y-1">
                  <label className="text-sm text-gray-600 block">Every
                    <input
                      type="number"
                      min={1}
                      value={state.customEvery?.n || 1}
                      onChange={e=>dispatch({ type:'set', patch:{ customEvery:{ n: Number(e.target.value)||1, unit: state.customEvery?.unit || 'weeks' } } })}
                      className="mt-1 h-10 w-full border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 ring-gray-400"
                    />
                  </label>
                </div>
                <div className="space-y-1">
                  <label className="text-sm text-gray-600 block">Unit
                    <select
                      value={state.customEvery?.unit || 'weeks'}
                      onChange={e=>dispatch({ type:'set', patch:{ customEvery:{ n: state.customEvery?.n || 1, unit: e.target.value as any } } })}
                      className="mt-1 h-10 w-full border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 ring-gray-400"
                    >
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                      <option value="months">months</option>
                    </select>
                  </label>
                </div>
              </>
            )}
            <div className="space-y-1">
              <label className="text-sm text-gray-600 block">Occurrences
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={state.occurrences}
                  onChange={e=>dispatch({ type:'set', patch:{ occurrences: Math.max(1, Math.min(100, Number(e.target.value)||1)) } })}
                  className="mt-1 h-10 w-full border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 ring-gray-400"
                />
              </label>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-2">Preview ({activeSeries.length} active)</div>
            <div className="border rounded-xl bg-gray-50 p-4">
              <PreviewList
                instances={instances}
                onToggle={(idx)=>dispatch({ type:'toggleExclusion', index: idx })}
              />
            </div>
          </div>
        </div>
      )}

      <ActionButtons
        mode={state.mode}
        disabledSendNow={!canSendNow}
        hasSeries={!!activeSeries.length}
        onSendNow={handleSendNow}
        onSendLater={handleSendLater}
        onScheduleSeries={handleScheduleSeries}
      />
    </div>
  )
}

export default Scheduler
