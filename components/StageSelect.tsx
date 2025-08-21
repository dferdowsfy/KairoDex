"use client"
import * as React from 'react'
import type { Stage } from '@/lib/types'

const STAGES: Stage[] = ['new','nurture','touring','offer','under_contract','closed','lost']

export function StageSelect({ value, onChange }: { value: Stage; onChange: (s: Stage) => void }) {
  return (
  <label className="text-xs text-ink/60 inline-flex items-center gap-2">
      Stage
  <select aria-label="Stage" className="input-neon px-2 py-1" value={value} onChange={e => onChange(e.target.value as Stage)}>
        {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  )
}
