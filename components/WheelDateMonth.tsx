"use client"
import React from 'react'

const ITEM_H = 40

export default function WheelDateMonth({ values, index, setIndex }: { values: string[]; index: number; setIndex?: (i: number) => void }) {
  return (
    <div className="flex flex-col items-stretch">
      <div style={{ height: ITEM_H }} aria-hidden />
      {values.map((v, i) => (
        <div
          key={i}
          onClick={() => setIndex && setIndex(i)}
          className={`h-10 flex items-center justify-center snap-center px-2 ${i === index ? 'text-ink font-medium' : 'text-ink/60'}`}
        >
          <div className="text-xs leading-tight text-center">{v}</div>
        </div>
      ))}
      <div style={{ height: ITEM_H }} aria-hidden />
    </div>
  )
}
