<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TimerControls from '@/components/TimerControls.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import LanguageToggle from '@/components/LanguageToggle.vue'
import Button from '@/components/ui/button.vue'
import Card from '@/components/ui/card.vue'
import Progress from '@/components/ui/progress.vue'
import { useKidsStore } from '@/stores/kids'
import { useLiveTimersStore } from '@/stores/liveTimers'
import { useI18nStore } from '@/stores/i18n'

const route = useRoute()
const router = useRouter()
const store = useKidsStore()
const live = useLiveTimersStore()
const i18n = useI18nStore()

const kidId = computed(() => String(route.params.id))
const kidSummary = computed(() => store.kidSummaries.find((kid) => kid.id === kidId.value))

const formatMinutes = (value: number) => {
  const hours = Math.floor(value / 60)
  const minutes = Math.round(value % 60)
  if (hours === 0) return `${minutes} min`
  return `${hours}h ${minutes}m`
}

const handleStart = (mode: string) => {
  if (!kidSummary.value) return
  live.add({
    kidId: kidSummary.value.id,
    label: mode === 'timer' ? 'Timer' : 'Stoppuhr',
    startedAt: Date.now(),
    mode: mode as 'timer' | 'stopwatch',
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
        <LanguageToggle />
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
          :hint="`Noch ${formatMinutes(store.mediaLeft(kidSummary))} frei`"
          :persist-key="`media-${kidSummary.id}`"
          @commit="(minutes) => store.logMedia(kidSummary.id, minutes)"
          @start="(payload) => handleStart(payload.mode)"
          @stop="handleStop"
        />
        <TimerControls
          :label="i18n.t('labels.reading')"
          accent="from-amber-500 to-orange-400"
          :default-minutes="20"
          :quick-minutes="[10, 20, 40]"
          :hint="`1 min Lesen = ${kidSummary.readingToMediaFactor} min Medien`"
          :persist-key="`reading-${kidSummary.id}`"
          @commit="(minutes) => store.logReading(kidSummary.id, minutes)"
          @start="(payload) => handleStart(payload.mode)"
          @stop="handleStop"
        />
      </div>
    </div>

    <Card v-else class="p-5">
      <p class="text-muted-foreground">Kind nicht gefunden.</p>
      <Button class="mt-3" @click="router.push('/')">Zur Übersicht</Button>
    </Card>
  </div>
</template>
