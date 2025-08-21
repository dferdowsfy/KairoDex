"use client"
import React from 'react'

type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
  disabled?: boolean
  className?: string
  label?: string
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, id, disabled, className = '', label }) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onChange(!checked)
    }
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {label && (
        <label htmlFor={id} className={`text-sm ${disabled ? 'text-gray-500' : 'text-gray-200'}`}>
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => !disabled && onChange(!checked)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent
          ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
          ${checked ? 'bg-cyan-500/80 border-cyan-300/40 shadow-[0_0_16px_rgba(34,211,238,0.55)]' : 'bg-gray-700/70 border-white/10'}
        `}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-1 ring-black/5 transition duration-200
            ${checked ? 'translate-x-5' : 'translate-x-0'}
          `}
        />
      </button>
    </div>
  )
}

export default Toggle
