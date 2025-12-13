<script setup lang="ts">
import { computed } from 'vue'
import { useSyncStore } from '@/stores/sync'

const sync = useSyncStore()

const label = computed(() => {
  if (sync.state === 'syncing') return 'Synchronisiere...'
  if (sync.state === 'error') return sync.error ?? 'Sync-Fehler'
  if (sync.lastSyncedAt) return `Letzter Sync: ${new Date(sync.lastSyncedAt).toLocaleTimeString()}`
  return 'Bereit'
})

const badgeClass = computed(() => {
  if (sync.state === 'syncing') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-100'
  if (sync.state === 'error') return 'bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100'
  return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-100'
})
</script>

<template>
  <div class="flex items-center gap-2 text-sm">
    <span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold" :class="badgeClass">
      <span class="h-2 w-2 rounded-full bg-current/70" />
      {{ label }}
    </span>
    <button class="text-xs text-muted-foreground underline-offset-4 hover:underline" @click="sync.syncNow">
      Sync jetzt
    </button>
  </div>
</template>
