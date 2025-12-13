import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useSyncStore } from './sync'

export type LiveTimer = {
  kidId: string
  label: string
  startedAt: number
  mode: 'timer' | 'stopwatch'
  minutes?: number
}

const CHANNEL = 'medienzeit-live'

export const useLiveTimersStore = defineStore('liveTimers', () => {
  const running = ref<Record<string, LiveTimer>>({})
  const sync = useSyncStore()

  const add = (payload: LiveTimer) => {
    running.value = { ...running.value, [payload.kidId]: payload }
    broadcast({ type: 'start', payload })
    sync.enqueue({
      type: 'timerStart',
      kidId: payload.kidId,
      mode: payload.mode,
      startedAt: payload.startedAt,
      minutes: payload.minutes ?? 0,
      timestamp: Date.now(),
    })
  }

  const remove = (kidId: string) => {
    const next = { ...running.value }
    delete next[kidId]
    running.value = next
    broadcast({ type: 'stop', kidId })
    sync.enqueue({ type: 'timerStop', kidId, timestamp: Date.now() })
  }

  const list = computed(() => Object.values(running.value))

  const hydrate = (serverTimers: Record<string, any> | LiveTimer[]) => {
    const map: Record<string, LiveTimer> = {}
    const sourceArray = Array.isArray(serverTimers) ? serverTimers : Object.values(serverTimers ?? {})
    for (const t of sourceArray) {
      if (!t?.kidId || !t.startedAt) continue
      map[t.kidId] = {
        kidId: t.kidId,
        startedAt: t.startedAt,
        mode: t.mode === 'stopwatch' ? 'stopwatch' : 'timer',
        minutes: t.minutes,
        label: t.mode === 'stopwatch' ? 'Stoppuhr' : 'Timer',
      }
    }
    running.value = map
  }

  const broadcast = (message: any) => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) return
    const channel = new BroadcastChannel(CHANNEL)
    channel.postMessage(message)
    channel.close()
  }

  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL)
    channel.onmessage = (event) => {
      const data = event.data
      if (data?.type === 'start' && data.payload) {
        running.value = { ...running.value, [data.payload.kidId]: data.payload }
      } else if (data?.type === 'stop' && data.kidId) {
        const next = { ...running.value }
        delete next[data.kidId]
        running.value = next
      }
    }
  }

  return { running, list, add, remove, hydrate }
})
