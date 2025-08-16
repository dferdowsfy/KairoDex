"use client"

const KEY = 'offline-queue'
export type OfflineJob = { type: 'note'; payload: any }

export function pushJob(job: OfflineJob) {
  const arr: OfflineJob[] = JSON.parse(localStorage.getItem(KEY) || '[]')
  arr.push(job)
  localStorage.setItem(KEY, JSON.stringify(arr))
}

export function shiftJob(): OfflineJob | undefined {
  const arr: OfflineJob[] = JSON.parse(localStorage.getItem(KEY) || '[]')
  const job = arr.shift()
  localStorage.setItem(KEY, JSON.stringify(arr))
  return job
}

export function hasJobs() {
  const arr: OfflineJob[] = JSON.parse(localStorage.getItem(KEY) || '[]')
  return arr.length > 0
}
