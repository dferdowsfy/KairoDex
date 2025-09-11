"use client"
import React from 'react'
import { Mode } from './types'

interface ActionButtonsProps {
  mode: Mode
  disabledSendNow: boolean
  onSendNow: ()=>void
  onSendLater: ()=>void
  onScheduleSeries: ()=>void
  hasSeries: boolean
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({ mode, disabledSendNow, onSendNow, onSendLater, onScheduleSeries, hasSeries }) => {
  return (
    <div className="flex flex-wrap gap-3 mt-4">
      <button
        type="button"
        onClick={onSendNow}
        disabled={disabledSendNow}
        className="px-4 py-2 rounded-lg text-sm font-medium border bg-gray-900 text-white disabled:opacity-40 disabled:cursor-not-allowed"
      >Send now</button>
      <button
        type="button"
        onClick={onSendLater}
        className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 bg-white hover:border-gray-400"
      >Send later</button>
      {mode==='cadence' && (
        <button
          type="button"
          onClick={onScheduleSeries}
          disabled={!hasSeries}
          className="px-4 py-2 rounded-lg text-sm font-medium border bg-emerald-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >Schedule series</button>
      )}
    </div>
  )
}
