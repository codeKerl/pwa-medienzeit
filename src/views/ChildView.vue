<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TimerControls from '@/components/TimerControls.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import Button from '@/components/ui/button.vue'
import Card from '@/components/ui/card.vue'
import Progress from '@/components/ui/progress.vue'
import { useKidsStore, type LogEntry } from '@/stores/kids'
import { useLiveTimersStore } from '@/stores/liveTimers'
import { useI18nStore } from '@/stores/i18n'

const route = useRoute()
const router = useRouter()
const store = useKidsStore()
const live = useLiveTimersStore()
const i18n = useI18nStore()

const kidId = computed(() => String(route.params.id))
const kidSummary = computed(() => store.kidSummaries.find((kid) => kid.id === kidId.value))

const logEntries = computed<LogEntry[]>(() => {
  const entries = kidSummary.value?.logs ?? []
  return [...entries].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0))
})

const formatMinutes = (value: number) => {
  const hours = Math.floor(value / 60)
  const minutes = Math.round(value % 60)
  if (hours === 0) return `${minutes} min`
  return `${hours}h ${minutes}m`
}

const formatDateTime = (value: number) => {
  const date = new Date(value)
  return date.toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
}

const formatEntryLabel = (entry: any) => {
  if (entry.type === 'reading') return i18n.t('labels.reading')
  if (entry.type === 'reset') return i18n.t('labels.resetWeek')
  if (entry.type === 'timer') return i18n.t('labels.timer')
  return i18n.t('labels.mediaTime')
}

const handleStart = (payload: { mode: string; minutes: number }) => {
  if (!kidSummary.value) return
  live.add({
    kidId: kidSummary.value.id,
    label: payload.mode === 'timer' ? 'Timer' : 'Stoppuhr',
    startedAt: Date.now(),
    mode: payload.mode as 'timer' | 'stopwatch',
    minutes: payload.minutes,
  })
}

const handleStop = () => {
  if (!kidSummary.value) return
  live.remove(kidSummary.value.id)
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-8 space-y-6">
    <div class="flex items-center justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">{{ i18n.t('labels.child') }}</p>
        <h1 class="text-3xl font-bold">
          <span v-if="kidSummary">{{ kidSummary.name }}</span>
          <span v-else>{{ i18n.t('texts.childUnknown') }}</span>
        </h1>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" @click="router.back()">{{ i18n.t('buttons.back') }}</Button>
        <Button @click="router.push('/')">{{ i18n.t('buttons.overview') }}</Button>
        <ThemeToggle />
      </div>
    </div>

    <div v-if="kidSummary" class="space-y-4">
      <Card class="p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-sm text-muted-foreground">{{ i18n.t('labels.available') }}</p>
            <p class="text-2xl font-bold">{{ formatMinutes(store.mediaLeft(kidSummary)) }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-muted-foreground">{{ i18n.t('labels.capacity') }}</p>
            <p class="text-lg font-semibold">{{ formatMinutes(kidSummary.totalMediaCapacity) }}</p>
          </div>
        </div>
        <div class="mt-4 space-y-2">
          <Progress :modelValue="kidSummary.mediaProgress * 100" :accent="kidSummary.accent" />
          <div class="flex items-center justify-between text-xs text-muted-foreground">
            <span>{{ i18n.t('labels.used') }}: {{ formatMinutes(kidSummary.mediaUsed) }}</span>
            <span>{{ i18n.t('labels.readingBonus') }} +{{
              formatMinutes(Math.min(kidSummary.readingLogged, kidSummary.readingWeeklyMax) * kidSummary.readingToMediaFactor)
            }}</span>
          </div>
          <Progress
            :modelValue="kidSummary.readingProgress * 100"
            accent="from-amber-500 to-orange-500"
            class="bg-amber-100/60"
          />
        </div>
      </Card>

      <div class="grid gap-4 md:grid-cols-2">
        <TimerControls
          :label="i18n.t('labels.mediaTime')"
          :accent="kidSummary.accent"
          :default-minutes="30"
          :quick-minutes="[5, 10, 20]"
          :hint="`Noch ${kidSummary ? formatMinutes(store.mediaLeft(kidSummary)) : ''} frei`"
          :persist-key="kidSummary ? `media-${kidSummary.id}` : 'media-unknown'"
          @commit="(minutes) => kidSummary && store.logMedia(kidSummary!.id, minutes)"
          @start="(payload) => handleStart(payload)"
          @stop="handleStop"
        />
        <TimerControls
          :label="i18n.t('labels.reading')"
          accent="from-amber-500 to-orange-400"
          :default-minutes="20"
          :quick-minutes="[10, 20, 40]"
          :hint="`1 min Lesen = ${kidSummary ? kidSummary.readingToMediaFactor : 0} min Medien`"
          :persist-key="kidSummary ? `reading-${kidSummary.id}` : 'reading-unknown'"
          @commit="(minutes) => kidSummary && store.logReading(kidSummary!.id, minutes)"
          @start="(payload) => handleStart(payload)"
          @stop="handleStop"
        />
      </div>
    </div>

    <Card v-else class="p-5">
      <p class="text-muted-foreground">Kind nicht gefunden.</p>
      <Button class="mt-3" @click="router.push('/')">Zur Übersicht</Button>
    </Card>

    <Card v-if="kidSummary" class="p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ i18n.t('labels.timer') }}</p>
          <h3 class="text-lg font-semibold">{{ i18n.t('labels.log') }}</h3>
        </div>
      </div>
      <div class="mt-4 space-y-3" v-if="logEntries.length">
        <div v-for="entry in logEntries" :key="entry.timestamp" class="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
          <div class="space-y-0.5">
            <p class="text-sm font-semibold">{{ formatEntryLabel(entry) }}</p>
            <p class="text-xs text-muted-foreground">{{ formatDateTime(entry.timestamp) }}</p>
          </div>
          <p class="text-sm font-semibold">
            <span v-if="entry.type === 'reset'">—</span>
            <span v-else>+{{ entry.minutes ?? 0 }} min</span>
          </p>
        </div>
      </div>
      <p v-else class="text-sm text-muted-foreground">{{ i18n.t('texts.noBookings') }}</p>
    </Card>
  </div>
</template>
