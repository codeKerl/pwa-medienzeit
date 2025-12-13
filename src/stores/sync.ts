import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { ChildProfile } from './kids'

export type SyncEvent =
  | { type: 'addKid'; kid: ChildProfile; timestamp: number }
  | { type: 'deleteKid'; kidId: string; timestamp: number }
  | { type: 'logMedia'; kidId: string; minutes: number; timestamp: number }
  | { type: 'logReading'; kidId: string; minutes: number; timestamp: number }
  | { type: 'updateKid'; kidId: string; kid: Partial<ChildProfile>; timestamp: number }
  | { type: 'resetWeek'; kidId?: string; timestamp: number }
  | { type: 'timerStart'; kidId: string; mode: 'timer' | 'stopwatch'; startedAt: number; minutes: number; timestamp: number }
  | { type: 'timerStop'; kidId: string; timestamp: number }

type SyncState = 'idle' | 'syncing' | 'error'

const STORAGE_KEY = 'medienzeit-sync-queue'
const API_BASE = import.meta.env.VITE_API_BASE ?? '/server'
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

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

  const enqueue = (event: SyncEvent) => {
    queue.value.push(event)
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
