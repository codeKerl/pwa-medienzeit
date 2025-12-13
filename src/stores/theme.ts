import { onMounted, ref, watch } from 'vue'
import { defineStore } from 'pinia'

type ThemePreference = 'system' | 'light' | 'dark'
type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'medienzeit-theme'

export const useThemeStore = defineStore('theme', () => {
  const preference = ref<ThemePreference>('system')
  const resolved = ref<ResolvedTheme>('light')
  let mediaListener: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null = null

  const applyThemeClass = (value: ResolvedTheme) => {
    const root = document.documentElement
    if (value === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  const computeResolved = (): ResolvedTheme => {
    if (preference.value === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return preference.value
  }

  const setPreference = (value: ThemePreference) => {
    preference.value = value
    localStorage.setItem(STORAGE_KEY, value)
  }

  const hydrate = () => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      preference.value = stored
    }
    resolved.value = computeResolved()
    applyThemeClass(resolved.value)

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    mediaListener =
      mediaListener ||
      (() => {
        if (preference.value === 'system') {
          resolved.value = computeResolved()
          applyThemeClass(resolved.value)
        }
      })
    media.addEventListener('change', mediaListener)
  }

  if (typeof window !== 'undefined') {
    hydrate()
  }

  watch(
    () => preference.value,
    () => {
      resolved.value = computeResolved()
      applyThemeClass(resolved.value)
    },
  )

  return { preference, resolved, setPreference, hydrate }
})
