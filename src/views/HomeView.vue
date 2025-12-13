<script setup lang="ts">
import { computed, ref } from 'vue'
import ParentDashboard from '@/components/ParentDashboard.vue'
import SyncStatus from '@/components/SyncStatus.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import LanguageToggle from '@/components/LanguageToggle.vue'
import TimerControls from '@/components/TimerControls.vue'
import Button from '@/components/ui/button.vue'
import Card from '@/components/ui/card.vue'
import Progress from '@/components/ui/progress.vue'
import { useKidsStore } from '@/stores/kids'
import { useLiveTimersStore } from '@/stores/liveTimers'
import { useI18nStore } from '@/stores/i18n'
import { registerPush } from '@/lib/push'

const store = useKidsStore()
const live = useLiveTimersStore()
const i18n = useI18nStore()

const parentOpen = ref(false)

const kidSummaries = computed(() => store.kidSummaries)

const totalLeft = computed(() => kidSummaries.value.reduce((sum, kid) => sum + store.mediaLeft(kid), 0))
const totalBonus = computed(() =>
  kidSummaries.value.reduce(
    (sum, kid) => sum + Math.min(kid.readingLogged, kid.readingWeeklyMax) * kid.readingToMediaFactor,
    0,
  ),
)

const liveTimers = computed(() => live.list)

const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
const apiBase = import.meta.env.VITE_API_BASE ?? '/server'
const apiKey = import.meta.env.VITE_API_KEY
if (vapidPublicKey) {
  registerPush(vapidPublicKey, apiBase, apiKey).catch((e) => console.warn('Push-Registration fehlgeschlagen', e))
}

const formatMinutes = (value: number) => {
  const hours = Math.floor(value / 60)
  const minutes = Math.round(value % 60)
  if (hours === 0) return `${minutes} min`
  return `${hours}h ${minutes}m`
}

const handleStart = (kidId: string, payload: { mode: string; minutes: number }) => {
  live.add({
    kidId,
    label: payload.mode === 'timer' ? 'Timer' : 'Stoppuhr',
    startedAt: Date.now(),
    mode: payload.mode as 'timer' | 'stopwatch',
  })
}

const handleStop = (kidId: string) => {
  live.remove(kidId)
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 py-10">
    <header class="flex flex-col gap-6 pb-8 md:flex-row md:items-center md:justify-between">
      <!-- <div class="space-y-3">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{{ i18n.t('app.tag') }}</p>
        <h1 class="text-4xl font-bold leading-tight md:text-5xl">
          {{ i18n.t('app.title') }}
        </h1>
        <p class="max-w-3xl text-lg text-muted-foreground">
          {{ i18n.t('app.desc') }}
        </p>
      </div> -->
      <div class="flex flex-wrap gap-3">
        <Button @click="parentOpen = true">{{ i18n.t('buttons.parent') }}</Button>
        <ThemeToggle />
        <LanguageToggle />
        <SyncStatus />
      </div>
    </header>

    <div v-if="liveTimers.length" class="mb-4">
      <Card class="p-4 bg-gradient-to-r from-secondary/20 via-secondary/10 to-primary/10">
        <div class="flex flex-wrap items-center gap-3">
          <p class="text-sm font-semibold">Live-Timer laufen:</p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="timer in liveTimers"
              :key="timer.kidId"
              class="inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1 text-xs font-semibold shadow-sm dark:bg-muted/60"
            >
              <span class="h-2 w-2 rounded-full bg-emerald-500" />
              {{ timer.label }} – {{ kidSummaries.find((k) => k.id === timer.kidId)?.name ?? 'Kind' }}
            </span>
          </div>
        </div>
      </Card>
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <!-- <Card class="p-4 md:col-span-2">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm text-muted-foreground">{{ i18n.t('labels.available') }}</p>
            <p class="text-3xl font-bold">{{ formatMinutes(totalLeft) }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm text-muted-foreground">{{ i18n.t('labels.readingBonus') }}</p>
            <p class="text-3xl font-bold">{{ formatMinutes(totalBonus) }}</p>
          </div>
        </div>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ i18n.t('app.desc') }}
        </p>
      </Card>
      <Card class="p-4 bg-gradient-to-br from-primary/10 via-white to-secondary/10">
        <p class="text-sm uppercase tracking-wide text-primary">{{ i18n.t('labels.pwa') }}</p>
        <h3 class="text-xl font-semibold">{{ i18n.t('labels.offline') }}</h3>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ i18n.t('labels.offlineDesc') }}
        </p>
      </Card> -->
    </div>

    <section class="mt-8 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ i18n.t('labels.children') }}</p>
          <h2 class="text-2xl font-semibold">{{ i18n.t('labels.dashboard') }}</h2>
        </div>
        <p class="text-sm text-muted-foreground">{{ i18n.t('texts.quickHint') }}</p>
      </div>

    <div class="grid gap-4 md:grid-cols-2">
      <Card v-for="kid in kidSummaries" :key="kid.id" class="p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted-foreground">{{ i18n.t('labels.child') }}</p>
            <h3 class="text-2xl font-semibold">{{ kid.name }}</h3>
          </div>
          <div class="text-right">
            <p class="text-sm text-muted-foreground">{{ i18n.t('labels.available') }}</p>
            <p class="text-lg font-semibold">{{ formatMinutes(store.mediaLeft(kid)) }}</p>
          </div>
        </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" @click="$router.push({ name: 'kid', params: { id: kid.id } })">
              {{ i18n.t('buttons.openChild') }}
            </Button>
          </div>

          <div class="mt-4 space-y-2">
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ i18n.t('labels.used') }}: {{ formatMinutes(kid.mediaUsed) }}</span>
              <span>{{ i18n.t('labels.capacity') }}: {{ formatMinutes(kid.totalMediaCapacity) }}</span>
            </div>
            <Progress :modelValue="kid.mediaProgress * 100" :accent="kid.accent" />
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>{{ i18n.t('labels.readingBonus') }}: {{ formatMinutes(Math.min(kid.readingLogged, kid.readingWeeklyMax) * kid.readingToMediaFactor) }}</span>
              <span>{{ i18n.t('labels.readingStatus') }}: {{ Math.round(kid.readingProgress * 100) }}%</span>
            </div>
            <Progress
              :modelValue="kid.readingProgress * 100"
              accent="from-amber-500 to-orange-500"
              class="bg-amber-100/60"
            />
          </div>

          <div class="mt-5 grid gap-3 md:grid-cols-2">
            <TimerControls
              :label="i18n.t('labels.mediaTime')"
              :accent="kid.accent"
              :default-minutes="30"
              :quick-minutes="[5, 10, 20]"
              :hint="`Noch ${formatMinutes(store.mediaLeft(kid))} frei`"
              :persist-key="`media-${kid.id}`"
              @commit="(minutes) => store.logMedia(kid.id, minutes)"
              @start="(payload) => handleStart(kid.id, payload)"
              @stop="() => handleStop(kid.id)"
            />
            <TimerControls
              :label="i18n.t('labels.reading')"
              accent="from-amber-500 to-orange-400"
              :default-minutes="20"
              :quick-minutes="[10, 20, 40]"
              :hint="`1 min Lesen = ${kid.readingToMediaFactor} min Medien`"
              :persist-key="`reading-${kid.id}`"
              @commit="(minutes) => store.logReading(kid.id, minutes)"
              @start="(payload) => handleStart(kid.id, payload)"
              @stop="() => handleStop(kid.id)"
            />
          </div>

          <div class="mt-4 rounded-xl bg-muted/60 p-3">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-foreground">{{ i18n.t('labels.readingBonus') }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ i18n.t('labels.readingBonusInfo', { max: formatMinutes(kid.readingWeeklyMax) }) }}
                </p>
              </div>
              <div class="text-right">
                <p class="font-semibold">
                  +{{ formatMinutes(Math.min(kid.readingLogged, kid.readingWeeklyMax) * kid.readingToMediaFactor) }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ i18n.t('labels.fromReading', { read: formatMinutes(kid.readingLogged) }) }}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </section>
    <ParentDashboard :open="parentOpen" @close="parentOpen = false" />
  </div>
</template>
