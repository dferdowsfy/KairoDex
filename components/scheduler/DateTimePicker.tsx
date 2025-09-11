"use client"
import React from 'react'

interface DateTimePickerProps {
  date: string
  time: string
  onDate: (d:string)=>void
  onTime: (t:string)=>void
  labelDate?: string
  labelTime?: string
}

export const DateTimePicker: React.FC<DateTimePickerProps> = ({ date, time, onDate, onTime, labelDate='Date', labelTime='Time' }) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block text-sm w-full">
        <span className="text-gray-600 mb-1 block">{labelDate}</span>
        <input
          type="date"
          value={date}
          onChange={e=>onDate(e.target.value)}
          className="h-10 w-full border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 ring-gray-400"
        />
      </label>
      <label className="block text-sm w-full">
        <span className="text-gray-600 mb-1 block">{labelTime}</span>
        <input
          type="time"
          value={time}
            onChange={e=>onTime(e.target.value)}
          className="h-10 w-full border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 ring-gray-400"
        />
      </label>
    </div>
  )
}
