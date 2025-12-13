import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useSyncStore } from './sync'

export interface ChildProfile {
  id: string
  name: string
  mediaWeeklyLimit: number // minutes
  readingWeeklyMax: number // minutes that can unlock bonus media time
  readingToMediaFactor: number // how many media minutes one reading minute unlocks
  mediaUsed: number // minutes already used
  readingLogged: number // minutes read
  accent: string
}

export interface PersistedState {
  kids: ChildProfile[]
  pin: string
}

const STORAGE_KEY = 'medienzeit-app-state'

const defaultKids: ChildProfile[] = [
  {
    id: 'k1',
    name: 'Lena',
    mediaWeeklyLimit: 420,
    readingWeeklyMax: 240,
    readingToMediaFactor: 0.5,
    mediaUsed: 160,
    readingLogged: 75,
    accent: 'from-indigo-500 to-blue-500',
  },
  {
    id: 'k2',
    name: 'Max',
    mediaWeeklyLimit: 360,
    readingWeeklyMax: 240,
    readingToMediaFactor: 0.5,
    mediaUsed: 120,
    readingLogged: 120,
    accent: 'from-emerald-500 to-teal-500',
  },
]

export const useKidsStore = defineStore('kids', () => {
  const kids = ref<ChildProfile[]>([...defaultKids])
  const pin = ref('2042')
  const sync = useSyncStore()

  const load = () => {
    if (typeof localStorage === 'undefined') return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as PersistedState
      if (parsed.kids?.length) kids.value = parsed.kids
      if (parsed.pin) pin.value = parsed.pin
    } catch (error) {
      console.warn('Konnte gespeicherte Daten nicht laden', error)
    }
  }

  const persist = () => {
    if (typeof localStorage === 'undefined') return
    const payload: PersistedState = {
      kids: kids.value,
      pin: pin.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }

  load()

  watch([kids, pin], persist, { deep: true })

  const totalMediaCapacity = (kid: ChildProfile) =>
    kid.mediaWeeklyLimit + Math.min(kid.readingLogged, kid.readingWeeklyMax) * kid.readingToMediaFactor

  const mediaLeft = (kid: ChildProfile) => Math.max(0, totalMediaCapacity(kid) - kid.mediaUsed)

  const mediaProgress = (kid: ChildProfile) => {
    const capacity = Math.max(1, totalMediaCapacity(kid))
    return Math.min(1, kid.mediaUsed / capacity)
  }

  const readingProgress = (kid: ChildProfile) => {
    const max = Math.max(1, kid.readingWeeklyMax)
    return Math.min(1, kid.readingLogged / max)
  }

  const addKid = (payload: Omit<ChildProfile, 'id'>) => {
    kids.value.push({
      ...payload,
      id: crypto.randomUUID(),
    })
  }

  const updateKid = (id: string, patch: Partial<ChildProfile>) => {
    kids.value = kids.value.map((kid) => (kid.id === id ? { ...kid, ...patch } : kid))
  }

  const deleteKid = (id: string) => {
    kids.value = kids.value.filter((kid) => kid.id !== id)
  }

  const logMedia = (id: string, minutes: number) => {
    if (minutes === 0) return
    kids.value = kids.value.map((kid) =>
      kid.id === id
        ? {
            ...kid,
            mediaUsed: Math.max(0, Math.min(totalMediaCapacity(kid), kid.mediaUsed + minutes)),
          }
        : kid,
    )
    sync.enqueue({ type: 'logMedia', kidId: id, minutes, timestamp: Date.now() })
  }

  const logReading = (id: string, minutes: number) => {
    if (minutes <= 0) return
    kids.value = kids.value.map((kid) =>
      kid.id === id ? { ...kid, readingLogged: Math.max(0, kid.readingLogged + minutes) } : kid,
    )
    sync.enqueue({ type: 'logReading', kidId: id, minutes, timestamp: Date.now() })
  }

  const resetWeek = (id?: string) => {
    kids.value = kids.value.map((kid) =>
      id && kid.id !== id ? kid : { ...kid, mediaUsed: 0, readingLogged: 0 },
    )
    sync.enqueue({ type: 'resetWeek', kidId: id, timestamp: Date.now() })
  }

  const setPin = (value: string) => {
    pin.value = value
  }

  const validatePin = (value: string) => value === pin.value

  const kidSummaries = computed(() =>
    kids.value.map((kid) => ({
      ...kid,
      mediaLeft: mediaLeft(kid),
      mediaProgress: mediaProgress(kid),
      readingProgress: readingProgress(kid),
      totalMediaCapacity: totalMediaCapacity(kid),
    })),
  )

  return {
    kids,
    pin,
    kidSummaries,
    addKid,
    updateKid,
    deleteKid,
    logMedia,
    logReading,
    mediaLeft,
    totalMediaCapacity,
    resetWeek,
    setPin,
    validatePin,
  }
})
