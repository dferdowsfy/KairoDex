"use client"
import React from 'react'
import { Mode } from './types'

interface ModeToggleProps {
  mode: Mode
  onChange: (mode: Mode) => void
}

const Btn: React.FC<{active:boolean; onClick:()=>void; children:React.ReactNode; label:string}> = ({active,onClick,children,label}) => (
  <button
    type="button"
    aria-pressed={active}
    aria-label={label}
    onClick={onClick}
    className={`px-3 py-2 rounded-lg text-sm border focus:outline-none focus-visible:ring-2 ring-offset-1 ring-slate-400 transition-colors ${active? 'bg-gray-900 text-white border-gray-900':'bg-white text-gray-900 border-gray-300 hover:border-gray-400'}`}
  >{children}</button>
)

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange }) => {
  return (
    <div className="flex gap-2" role="group" aria-label="Mode selector">
      <Btn active={mode==='single'} onClick={()=>onChange('single')} label="Single send">Single</Btn>
      <Btn active={mode==='cadence'} onClick={()=>onChange('cadence')} label="Cadence send">Cadence</Btn>
    </div>
  )
}
