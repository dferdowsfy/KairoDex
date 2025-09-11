import { create } from 'zustand'

// New unified email composer store (Gmail-style schedule/send)
// Only the keys specified in the refactor requirements are kept.

export type EmailCadence = 'none' | 'biweekly' | 'monthly'

interface EmailComposerState {
  to: string[]
  subject: string
  body: string // markdown / plaintext hybrid
  sendAt: Date | null
  cadence: EmailCadence
  open: boolean
  set: (partial: Partial<EmailComposerState>) => void
  reset: () => void
}

const initial: Omit<EmailComposerState, 'set' | 'reset'> = {
  to: [],
  subject: '',
  body: '',
  sendAt: null,
  cadence: 'none',
  open: false,
}

export const useEmailComposer = create<EmailComposerState>((set) => ({
  ...initial,
  set: (partial) => set(partial),
  reset: () => set(initial),
}))
