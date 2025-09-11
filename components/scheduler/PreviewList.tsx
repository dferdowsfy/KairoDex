"use client"
import React from 'react'
import { GeneratedInstance } from './types'

interface PreviewListProps {
  instances: GeneratedInstance[]
  onToggle: (index:number)=>void
  maxHeight?: string
}

export const PreviewList: React.FC<PreviewListProps> = ({ instances, onToggle, maxHeight='14rem' }) => {
  if(!instances.length) return <div className="text-sm text-gray-500">No dates</div>
  return (
    <ul className="space-y-2 overflow-y-auto pr-1" style={{maxHeight}}>
      {instances.map((inst, i) => {
        const label = inst.date.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour:'2-digit', minute:'2-digit' })
        return (
          <li key={i} className="flex items-center gap-3 text-sm">
            <input
              id={`prev-${i}`}
              type="checkbox"
              checked={!inst.excluded}
              onChange={()=>onToggle(i)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <label htmlFor={`prev-${i}`} className={`cursor-pointer ${inst.excluded? 'line-through text-gray-400':'text-gray-900'}`}>{label}</label>
            <span className="ml-auto text-xs text-gray-400">{i+1}</span>
          </li>
        )
      })}
    </ul>
  )
}
