"use client"
import { useEffect } from 'react'
import { useTheme } from '@/store/theme'

export default function ThemeApplier() {
  const { name, colors } = useTheme()
  useEffect(() => {
    document.documentElement.dataset.theme = name
  }, [name, colors])
  return null
}
