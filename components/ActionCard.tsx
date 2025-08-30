"use client"
import { cn } from '@/lib/utils'
import React from 'react'

type ActionCardProps = {
  title: string
  description?: string
  icon?: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  iconClassName?: string
}

export default function ActionCard({ title, description, icon, onClick, className, disabled, iconClassName }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
  'group relative w-full rounded-2xl text-left p-4 sm:p-5 border transition-all select-none tile-soft',
        disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
        className
      )}
      aria-label={title}
    >
      <div className="flex items-center gap-3">
  {icon && (<div className={cn("shrink-0 w-11 h-11 rounded-xl grid place-items-center tint-primary", iconClassName)}>{icon}</div>)}
        <div className="min-w-0">
          <div className="font-semibold text-[15px] leading-tight truncate">{title}</div>
          {description && <div className="text-[12px] text-slate-600 mt-0.5 line-clamp-2">{description}</div>}
        </div>
      </div>
    </button>
  )
}
