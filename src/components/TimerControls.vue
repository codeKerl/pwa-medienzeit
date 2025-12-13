<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import Button from './ui/button.vue'
import Input from './ui/input.vue'
import Progress from './ui/progress.vue'
import { useI18nStore } from '@/stores/i18n'

const i18n = useI18nStore()

type Mode = 'timer' | 'stopwatch'

const props = withDefaults(
  defineProps<{
    label: string
    accent?: string
    defaultMinutes?: number
    quickMinutes?: number[]
    hint?: string
    persistKey: string
  }>(),
  {
    defaultMinutes: 25,
    quickMinutes: () => [5, 10, 20],
    accent: 'from-primary to-secondary',
  },
)

const emit = defineEmits<{
  commit: [minutes: number]
  start: [payload: { mode: Mode; minutes: number }]
  stop: []
}>()

const state = reactive({
  mode: 'timer' as Mode,
  minutes: props.defaultMinutes,
  elapsedSeconds: 0,
  running: false,
  startedAt: null as number | null,
})

const intervalId = ref<number>()

const totalSeconds = computed(() => Math.max(1, state.minutes * 60))

const remainingSeconds = computed(() => Math.max(0, totalSeconds.value - state.elapsedSeconds))

const displaySeconds = computed(() => (state.mode === 'timer' ? remainingSeconds.value : state.elapsedSeconds))

const display = computed(() => {
  const minutes = Math.floor(displaySeconds.value / 60)
  const seconds = displaySeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

const percent = computed(() =>
  state.mode === 'timer'
    ? (state.elapsedSeconds / totalSeconds.value) * 100
    : Math.min(100, (state.elapsedSeconds / (45 * 60)) * 100),
)

const quickList = computed(() => Array.from(new Set([...props.quickMinutes, 15])).sort((a, b) => a - b))

// lightweight chime for Timer-Ende
const chimeSrc =
  'data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEARKwAABCxAgAEABAAZGF0YU4AAAAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA//8AAP//AAD//wAA'
const chime = typeof Audio !== 'undefined' ? new Audio(chimeSrc) : null
if (chime) {
  chime.preload = 'auto'
  chime.volume = 0.25
}

const playChime = () => {
  if (!chime) return
  // ignore failures on locked autoplay
  chime.currentTime = 0
  chime.play().catch(() => {})
}

type PersistedRun = {
  mode: Mode
  minutes: number
  startedAt: number
}

const storageKey = computed(() => `medienzeit-timer-${props.persistKey}`)

const clearPersist = () => {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(storageKey.value)
}

const persistRun = () => {
  if (typeof localStorage === 'undefined') return
  const startedAt = state.startedAt ?? Date.now()
  state.startedAt = startedAt
  const payload: PersistedRun = {
    mode: state.mode,
    minutes: state.minutes,
    startedAt,
  }
  localStorage.setItem(storageKey.value, JSON.stringify(payload))
}

const clear = () => {
  if (intervalId.value) window.clearInterval(intervalId.value)
  intervalId.value = undefined
}

const commitMinutes = () => {
  const seconds = state.mode === 'timer' ? Math.min(totalSeconds.value, state.elapsedSeconds || totalSeconds.value) : state.elapsedSeconds
  const minutes = Math.max(1, Math.round(seconds / 60))
  emit('commit', minutes)
}

const reset = () => {
  clear()
  state.running = false
  state.elapsedSeconds = 0
  state.startedAt = null
  clearPersist()
}

const updateElapsedFromNow = () => {
  if (!state.startedAt) return
  const diffMs = Date.now() - state.startedAt
  state.elapsedSeconds = Math.max(0, Math.floor(diffMs / 1000))
}

const finishTimer = (autoComplete: boolean) => {
  updateElapsedFromNow()
  state.running = false
  clear()
  if (autoComplete && state.mode === 'timer') playChime()
  commitMinutes()
  state.elapsedSeconds = 0
  state.startedAt = null
  emit('stop')
  clearPersist()
}

const tick = () => {
  if (!state.startedAt) return
  updateElapsedFromNow()
  if (state.mode === 'timer' && state.elapsedSeconds >= totalSeconds.value) {
    finishTimer(true)
  }
}

const toggle = () => {
  if (state.running) {
    finishTimer(false)
    return
  }

  state.elapsedSeconds = 0
  state.startedAt = Date.now()
  state.running = true
  clear()
  emit('start', { mode: state.mode, minutes: state.minutes })
  persistRun()
  intervalId.value = window.setInterval(tick, 1000)
}

const changeMode = (mode: Mode) => {
  state.mode = mode
  reset()
  clearPersist()
}

const quickAdd = (value: number) => emit('commit', value)

onBeforeUnmount(() => clear())

const loadPersistedRun = (): PersistedRun | null => {
  if (typeof localStorage === 'undefined') return
  const raw = localStorage.getItem(storageKey.value)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PersistedRun
  } catch (error) {
    console.warn('Konnte Timer nicht wiederherstellen', error)
    clearPersist()
    return null
  }
}

const resumeIfNeeded = (emitStart = true) => {
  const data = loadPersistedRun()
  if (!data) return
  state.mode = data.mode
  state.minutes = data.minutes
  state.startedAt = data.startedAt
  updateElapsedFromNow()
  if (state.mode === 'timer' && state.elapsedSeconds >= totalSeconds.value) {
    finishTimer(true)
    return
  }
  state.running = true
  clear()
  if (emitStart) emit('start', { mode: state.mode, minutes: state.minutes })
  intervalId.value = window.setInterval(tick, 1000)
}

const handleVisibility = () => {
  if (typeof document === 'undefined') return
  if (document.visibilityState === 'visible') {
    resumeIfNeeded(false)
    if (state.running && !intervalId.value) {
      intervalId.value = window.setInterval(tick, 1000)
    }
    tick()
  }
}

onMounted(() => {
  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('focus', handleVisibility)
  window.addEventListener('pageshow', handleVisibility)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibility)
  window.removeEventListener('focus', handleVisibility)
  window.removeEventListener('pageshow', handleVisibility)
})

resumeIfNeeded()
</script>

<template>
  <div class="rounded-xl border border-border/80 bg-card/90 p-4 shadow-sm backdrop-blur-sm dark:bg-card/80">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <div class="h-2.5 w-2.5 rounded-full bg-gradient-to-r" :class="accent" />
        <p class="text-sm font-semibold text-foreground">{{ label }}</p>
      </div>
      <div class="flex items-center gap-1 rounded-full bg-muted px-1 py-1 text-xs font-medium">
        <button
          class="rounded-full px-3 py-1 transition-all"
          :class="state.mode === 'timer' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'"
          @click="changeMode('timer')"
        >
          {{ i18n.t('labels.timer') }}
        </button>
        <button
          class="rounded-full px-3 py-1 transition-all"
          :class="state.mode === 'stopwatch' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground'"
          @click="changeMode('stopwatch')"
        >
          {{ i18n.t('labels.stopwatch') }}
        </button>
      </div>
    </div>

    <div class="mt-3 grid items-center gap-3 md:grid-cols-[1fr,auto]">
      <div class="space-y-3">
        <div class="flex items-center gap-3">
          <Input
            v-model.number="state.minutes"
            type="number"
            :min="1"
            :step="5"
            class="md:w-32"
            :disabled="state.mode === 'stopwatch'"
            :placeholder="`${defaultMinutes} min`"
          />
          <Button size="sm" :variant="state.running ? 'destructive' : 'default'" @click="toggle">
            {{ state.running ? i18n.t('buttons.stopBook') : i18n.t('buttons.start') }}
          </Button>
          <Button size="sm" variant="ghost" :disabled="!state.running && !state.elapsedSeconds" @click="reset">
            {{ i18n.t('buttons.reset') }}
          </Button>
        </div>
        <p class="text-xs text-muted-foreground">
          {{ state.mode === 'timer' ? i18n.t('texts.countdownInfo') : i18n.t('texts.stopwatchInfo') }}
          <span v-if="hint"> {{ hint }}</span>
        </p>
      </div>
      <div class="text-right">
        <p class="font-mono text-2xl font-semibold tabular-nums">{{ display }}</p>
        <p class="text-[11px] uppercase tracking-wide text-muted-foreground">{{ i18n.t('labels.runtime') }}</p>
      </div>
    </div>

    <div class="mt-3 space-y-2">
      <Progress :modelValue="percent" :accent="accent" />
      <div class="flex flex-wrap gap-2">
        <Button
          v-for="quick in quickList"
          :key="quick"
          size="sm"
          variant="outline"
          class="border-dashed"
          @click="quickAdd(quick)"
        >
          +{{ quick }} min
        </Button>
      </div>
    </div>
  </div>
</template>
