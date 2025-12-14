import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { ChildProfile } from './kids'

type BaseSync = { eventId: string; timestamp: number }

export type SyncEvent =
  | (BaseSync & { type: 'addKid'; kid: ChildProfile })
  | (BaseSync & { type: 'deleteKid'; kidId: string })
  | (BaseSync & { type: 'logMedia'; kidId: string; minutes: number })
  | (BaseSync & { type: 'logReading'; kidId: string; minutes: number })
  | (BaseSync & { type: 'updateKid'; kidId: string; kid: Partial<ChildProfile> })
  | (BaseSync & { type: 'resetWeek'; kidId?: string })
  | (BaseSync & { type: 'timerStart'; kidId: string; mode: 'timer' | 'stopwatch'; startedAt: number; minutes: number })
  | (BaseSync & { type: 'timerStop'; kidId: string; minutes?: number })

type SyncState = 'idle' | 'syncing' | 'error'

const STORAGE_KEY = 'medienzeit-sync-queue'
const API_BASE = import.meta.env.VITE_API_BASE ?? '/server'
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

type EventInput = Omit<SyncEvent, 'eventId'> & Partial<Pick<SyncEvent, 'eventId'>>

export const useSyncStore = defineStore('sync', () => {
  const queue = ref<SyncEvent[]>([])
  const lastSyncedAt = ref<number | null>(null)
  const state = ref<SyncState>('idle')
  const error = ref<string | null>(null)

  const load = () => {
    if (typeof localStorage === 'undefined') return
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        queue.value = JSON.parse(raw)
      } catch (e) {
        console.warn('Konnte Sync-Queue nicht laden', e)
      }
    }
  }

  const persist = () => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue.value))
  }

  load()

  watch(queue, persist, { deep: true })

  const genId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2))

  const enqueue = (event: any) => {
    const eventId = event.eventId ?? genId()
    queue.value.push({ ...(event as SyncEvent), eventId, timestamp: event.timestamp ?? Date.now() })
    maybeSync()
  }

  const syncNow = async () => {
    if (!queue.value.length) {
      state.value = 'idle'
      return
    }

    state.value = 'syncing'
    error.value = null
    try {
      // ensure all events have ids/timestamps (backward compatibility)
      queue.value = queue.value.map((evt) => ({
        ...evt,
        eventId: evt.eventId ?? genId(),
        timestamp: evt.timestamp ?? Date.now(),
      }))
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (API_KEY) headers.Authorization = `Bearer ${API_KEY}`
      const res = await fetch(`${API_BASE}/api/sync.php`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ events: queue.value }),
      })
      if (!res.ok) throw new Error(await res.text())
      queue.value = []
      lastSyncedAt.value = Date.now()
      state.value = 'idle'
    } catch (e) {
      console.warn('Sync fehlgeschlagen, wird offline gepuffert', e)
      state.value = 'error'
      error.value = (e as Error)?.message ?? 'Unbekannter Fehler'
    }
  }

  const maybeSync = () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return
    void syncNow()
  }

  const setError = (msg: string) => {
    error.value = msg
    state.value = 'error'
  }

  return { queue, state, lastSyncedAt, error, enqueue, syncNow, maybeSync, setError }
})
