<script setup lang="ts">
import { computed } from 'vue'
import { MoonIcon, SunIcon, LaptopIcon } from '@radix-icons/vue'
import Button from './ui/button.vue'
import { useThemeStore } from '@/stores/theme'

const store = useThemeStore()

const label = computed(() => {
  if (store.preference === 'system') return 'System'
  return store.preference === 'dark' ? 'Dark' : 'Light'
})

const cycle = () => {
  const next =
    store.preference === 'system' ? 'light' : store.preference === 'light' ? 'dark' : ('system' as const)
  store.setPreference(next)
}

const icon = computed(() => {
  if (store.preference === 'system') return LaptopIcon
  return store.preference === 'dark' ? MoonIcon : SunIcon
})
</script>

<template>
  <Button variant="ghost" size="sm" class="gap-2" @click="cycle">
    <component :is="icon" class="h-4 w-4" />
    {{ label }}
  </Button>
</template>
