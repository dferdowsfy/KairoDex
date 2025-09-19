"use client"
import React from 'react'
import { Info } from 'lucide-react'

export interface ClientNotesCalloutProps {
  onAddNote: () => void
  className?: string
}

export default function ClientNotesCallout({ onAddNote, className=''}: ClientNotesCalloutProps) {
  return (
    <div className={`relative rounded-2xl border border-blue-300/50 bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 sm:p-5 shadow-sm flex flex-col gap-3 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 inline-flex h-9 w-9 rounded-xl bg-white border border-blue-200 text-blue-600 items-center justify-center shadow"><Info className="h-5 w-5" /></div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-blue-900 text-lg leading-snug">Your notes power the chat.</h3>
          <p className="text-sm text-blue-800 mt-1 leading-snug">Upload a note and KairoDex instantly builds a knowledge base—so you can chat with it, draft follow-ups, and generate contracts on the spot.</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button type="button" onClick={onAddNote} className="h-9 px-4 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium shadow border border-blue-800/20 focus:outline-none focus:ring-2 focus:ring-blue-500/40">+ Add Note</button>
      </div>
    </div>
  )
}
