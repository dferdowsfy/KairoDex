"use client"
import { usePathname } from 'next/navigation'
import ChatPanel from './ChatPanel'
import ChatHandle from './ChatHandle'

export default function ChatMount() {
  const pathname = usePathname()
  const hideOn = ['/login', '/signup']
  const shouldHide = hideOn.some(prefix => pathname?.startsWith(prefix))
  if (shouldHide) return null
  return (
    <>
  <ChatHandle />
  <ChatPanel />
    </>
  )
}
