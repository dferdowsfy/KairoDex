"use client"
import React from 'react'
import { CadenceOption } from './types'

interface CadenceSelectorProps {
  value: CadenceOption
  onChange: (c: CadenceOption) => void
}

const options: {key:CadenceOption; label:string}[] = [
  { key:'weekly', label:'Weekly' },
  { key:'biweekly', label:'Every 2 Weeks' },
  { key:'monthly', label:'Monthly' },
  { key:'every_other_month', label:'Every Other Month' },
  { key:'quarterly', label:'Quarterly' },
  { key:'custom', label:'Custom' }
]

export const CadenceSelector: React.FC<CadenceSelectorProps> = ({ value, onChange }) => {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cadence options">
      {options.map(o => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value===o.key}
          onClick={()=>onChange(o.key)}
          className={`px-3 py-2 rounded-lg text-sm border transition-colors focus:outline-none focus-visible:ring-2 ring-offset-1 ring-slate-400 ${value===o.key? 'bg-gray-900 text-white border-gray-900':'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}`}
        >{o.label}</button>
      ))}
    </div>
  )
}
