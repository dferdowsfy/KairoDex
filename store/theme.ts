"use client"
import { create } from 'zustand'

export type ThemeName = 'default' | 'ocean' | 'sunset' | 'forest' | 'grape' | 'rose'

export interface ThemeColors {
  primary: string
  primarySoft: string
  accent: string
  accentSoft: string
  warn: string
  warnSoft: string
  danger: string
  dangerSoft: string
  ink: string
  surface: string
  card: string
}

const PRESETS: Record<ThemeName, ThemeColors> = {
  default: {
    primary: '#2563EB',
    primarySoft: '#E3EDFF',
    accent: '#06C167',
    accentSoft: '#DCFCE7',
    warn: '#F59E0B',
    warnSoft: '#FEF3C7',
    danger: '#EF4444',
    dangerSoft: '#FEE2E2',
    ink: '#0F172A',
    surface: '#F6F7FB',
    card: '#FFFFFF'
  },
  ocean: {
    primary: '#0EA5E9',
    primarySoft: '#E0F2FE',
    accent: '#10B981',
    accentSoft: '#D1FAE5',
    warn: '#F59E0B',
    warnSoft: '#FEF3C7',
    danger: '#F43F5E',
    dangerSoft: '#FFE4E6',
    ink: '#0C4A6E',
    surface: '#ECFEFF',
    card: '#FFFFFF'
  },
  sunset: {
    primary: '#F97316',
    primarySoft: '#FFECE1',
    accent: '#F43F5E',
    accentSoft: '#FFE4E6',
    warn: '#F59E0B',
    warnSoft: '#FEF3C7',
    danger: '#DC2626',
    dangerSoft: '#FEE2E2',
    ink: '#1F2937',
    surface: '#FFF7ED',
    card: '#FFFFFF'
  },
  forest: {
    primary: '#22C55E',
    primarySoft: '#DCFCE7',
    accent: '#16A34A',
    accentSoft: '#DCFCE7',
    warn: '#CA8A04',
    warnSoft: '#FEF3C7',
    danger: '#EF4444',
    dangerSoft: '#FEE2E2',
    ink: '#052E16',
    surface: '#F0FDF4',
    card: '#FFFFFF'
  },
  grape: {
    primary: '#8B5CF6',
    primarySoft: '#EEE7FF',
    accent: '#22D3EE',
    accentSoft: '#CFFAFE',
    warn: '#F59E0B',
    warnSoft: '#FEF3C7',
    danger: '#F43F5E',
    dangerSoft: '#FFE4E6',
    ink: '#1E1B4B',
    surface: '#F5F3FF',
    card: '#FFFFFF'
  },
  rose: {
    primary: '#FB7185',
    primarySoft: '#FFE4E6',
    accent: '#F472B6',
    accentSoft: '#FCE7F3',
    warn: '#F59E0B',
    warnSoft: '#FEF3C7',
    danger: '#E11D48',
    dangerSoft: '#FFE4E6',
    ink: '#3B0D1E',
    surface: '#FFF1F2',
    card: '#FFFFFF'
  }
}

function applyTheme(colors: ThemeColors, name: ThemeName) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.theme = name
  root.style.setProperty('--primary', colors.primary)
  root.style.setProperty('--primary-soft', colors.primarySoft)
  root.style.setProperty('--accent', colors.accent)
  root.style.setProperty('--accent-soft', colors.accentSoft)
  root.style.setProperty('--warn', colors.warn)
  root.style.setProperty('--warn-soft', colors.warnSoft)
  root.style.setProperty('--danger', colors.danger)
  root.style.setProperty('--danger-soft', colors.dangerSoft)
  root.style.setProperty('--ink', colors.ink)
  root.style.setProperty('--surface', colors.surface)
  root.style.setProperty('--card', colors.card)
}

interface ThemeState {
  name: ThemeName
  colors: ThemeColors
  setTheme: (name: ThemeName) => void
  setColors: (colors: Partial<ThemeColors>) => void
  reset: () => void
}

const persisted = typeof window !== 'undefined' ? window.localStorage.getItem('agenthub-theme-v1') : null
const initialName: ThemeName = (persisted && JSON.parse(persisted).name) || 'default'
const initialColors: ThemeColors = (persisted && JSON.parse(persisted).colors) || PRESETS[initialName]

export const useTheme = create<ThemeState>((set, get) => ({
  name: initialName,
  colors: initialColors,
  setTheme: (name) => {
    const colors = PRESETS[name]
    applyTheme(colors, name)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('agenthub-theme-v1', JSON.stringify({ name, colors }))
    }
    set({ name, colors })
  },
  setColors: (partial) => {
    const colors = { ...get().colors, ...partial }
    applyTheme(colors, get().name)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('agenthub-theme-v1', JSON.stringify({ name: get().name, colors }))
    }
    set({ colors })
  },
  reset: () => {
    const name: ThemeName = 'default'
    const colors = PRESETS[name]
    applyTheme(colors, name)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('agenthub-theme-v1', JSON.stringify({ name, colors }))
    }
    set({ name, colors })
  }
}))

// Apply on initial load in browser
if (typeof window !== 'undefined') {
  applyTheme(initialColors, initialName)
}

export const THEME_PRESETS = PRESETS
