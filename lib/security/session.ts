import { cookies } from 'next/headers'

export const sessionConfig = {
  idleTimeoutMinutes: Number(process.env.SESSION_IDLE_MIN || 20),
  absoluteLifetimeHours: Number(process.env.SESSION_ABS_HOURS || 24)
}

export function setSecureCookie(name: string, value: string, maxAgeSec?: number) {
  const cookieStore = cookies()
  cookieStore.set({
    name,
    value,
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    ...(maxAgeSec ? { maxAge: maxAgeSec } : {})
  })
}
