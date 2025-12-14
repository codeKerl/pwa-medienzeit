import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useSyncStore } from './sync'
import { useLiveTimersStore } from './liveTimers'

export interface ChildProfile {
  id: string
  name: string
  mediaWeeklyLimit: number // minutes
  readingWeeklyMax: number // minutes that can unlock bonus media time
  readingToMediaFactor: number // how many media minutes one reading minute unlocks
  mediaUsed: number // minutes already used
  readingLogged: number // minutes read
  accent: string
  logs?: LogEntry[]
}

export interface PersistedState {
  kids: ChildProfile[]
  pin: string
  runningTimers?: Record<string, { kidId: string; mode: 'timer' | 'stopwatch'; startedAt: number; minutes?: number }>
  revision?: number
}

export type LogEntry = {
  type: 'media' | 'reading' | 'reset' | 'timer'
  minutes?: number
  timestamp: number
}

const STORAGE_KEY = 'medienzeit-app-state'
const API_BASE = import.meta.env.VITE_API_BASE ?? '/server'
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

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
    logs: [],
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
    logs: [],
  },
]

export const useKidsStore = defineStore('kids', () => {
  const kids = ref<ChildProfile[]>([...defaultKids])
  const pin = ref('2042')
  const revision = ref<number>(0)
  const sync = useSyncStore()
  const live = useLiveTimersStore()
  let pollId: number | undefined
  let focusBound = false

  const normalizeKid = (kid: ChildProfile): ChildProfile => ({
    ...kid,
    logs: Array.isArray(kid.logs)
      ? kid.logs
          .filter((e) => typeof e?.timestamp === 'number')
          .map((e) => ({
            type: e.type ?? 'media',
            minutes: typeof e.minutes === 'number' ? e.minutes : undefined,
            timestamp: e.timestamp,
          }))
      : [],
  })

  const load = () => {
    if (typeof localStorage === 'undefined') return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as PersistedState
      if (parsed.kids?.length) kids.value = parsed.kids.map((k) => normalizeKid(k))
      if (parsed.pin) pin.value = parsed.pin
      if (typeof parsed.revision === 'number') revision.value = parsed.revision
    } catch (error) {
      console.warn('Konnte gespeicherte Daten nicht laden', error)
    }
  }

  const persist = () => {
    if (typeof localStorage === 'undefined') return
    const payload: PersistedState = {
      kids: kids.value,
      pin: pin.value,
      revision: revision.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }




  const fetchServerState = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/state.php`, { headers: API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {} })
      if (!res.ok) return
      const data = (await res.json()) as PersistedState
      if (data.kids?.length) kids.value = data.kids.map((k) => normalizeKid(k))
      if (data.pin) pin.value = data.pin
      if (data.runningTimers) live.hydrate(data.runningTimers)
      if (typeof (data as any).revision === 'number') revision.value = (data as any).revision
      persist()
    } catch (error) {
      console.warn('Konnte Server-Status nicht laden', error)
    }
  }

  const startPolling = () => {
    if (typeof window === 'undefined') return
    if (pollId) window.clearInterval(pollId)
    pollId = window.setInterval(fetchServerState, 10000)
  }

  const bindFocusRefresh = () => {
    if (typeof window === 'undefined' || focusBound) return
    focusBound = true
    const onFocus = () => void fetchServerState()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void fetchServerState()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
  }

  load()
  fetchServerState()
  watch([kids, pin], persist, { deep: true })
  watch(
    () => sync.lastSyncedAt,
    () => {
      void fetchServerState()
    },
  )
  startPolling()
  bindFocusRefresh()

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
    const kid: ChildProfile = {
      ...payload,
      id: crypto.randomUUID(),
      logs: [],
    }
    kids.value.push(kid)
    sync.enqueue({ type: 'addKid', kid, timestamp: Date.now() })
  }

  const updateKid = (id: string, patch: Partial<ChildProfile>) => {
    kids.value = kids.value.map((kid) => (kid.id === id ? { ...kid, ...patch } : kid))
    sync.enqueue({ type: 'updateKid', kidId: id, kid: patch, timestamp: Date.now() })
  }

  const deleteKid = (id: string) => {
    kids.value = kids.value.filter((kid) => kid.id !== id)
    sync.enqueue({ type: 'deleteKid', kidId: id, timestamp: Date.now() })
  }

  const logMedia = (id: string, minutes: number) => {
    if (minutes === 0) return
    kids.value = kids.value.map((kid) =>
      kid.id === id
        ? {
            ...kid,
            mediaUsed: Math.max(0, Math.min(totalMediaCapacity(kid), kid.mediaUsed + minutes)),
            logs: [...(kid.logs ?? []), { type: 'media', minutes, timestamp: Date.now() }],
          }
        : kid,
    )
    sync.enqueue({ type: 'logMedia', kidId: id, minutes, timestamp: Date.now() })
  }

  const logReading = (id: string, minutes: number) => {
    if (minutes <= 0) return
    kids.value = kids.value.map((kid) =>
      kid.id === id
        ? {
            ...kid,
            readingLogged: Math.max(0, kid.readingLogged + minutes),
            logs: [...(kid.logs ?? []), { type: 'reading', minutes, timestamp: Date.now() }],
          }
        : kid,
    )
    sync.enqueue({ type: 'logReading', kidId: id, minutes, timestamp: Date.now() })
  }

  const resetWeek = (id?: string) => {
    kids.value = kids.value.map((kid) =>
      id && kid.id !== id ? kid : { ...kid, mediaUsed: 0, readingLogged: 0, logs: [] },
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
    revision,
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
