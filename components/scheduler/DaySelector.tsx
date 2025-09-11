"use client"
import React from 'react'

interface DaySelectorProps {
  selected: number[]
  onChange: (days:number[])=>void
}

const labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export const DaySelector: React.FC<DaySelectorProps> = ({ selected, onChange }) => {
  function toggle(idx:number){
    const set = new Set(selected)
    if(set.has(idx)) set.delete(idx); else set.add(idx)
    onChange(Array.from(set).sort())
  }
  return (
    <div className="flex flex-wrap gap-2" aria-label="Select weekdays" role="group">
      {labels.map((l,i)=>{
        const active = selected.includes(i)
        return (
          <button
            key={i}
            type="button"
            aria-pressed={active}
            onClick={()=>toggle(i)}
            className={`w-10 text-center py-2 rounded-full text-sm border focus:outline-none focus-visible:ring-2 ring-offset-1 ring-slate-400 transition-colors ${active? 'bg-gray-900 text-white border-gray-900':'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}`}
          >{l}</button>
        )
      })}
    </div>
  )
}
