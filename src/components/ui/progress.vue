<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    modelValue: number
    accent?: string
    class?: string
  }>(),
  {
    accent: 'bg-gradient-to-r from-primary to-secondary',
  },
)

const value = computed(() => Math.min(100, Math.max(0, props.modelValue)))
</script>

<template>
  <div class="h-3 w-full overflow-hidden rounded-full bg-muted/70" :class="class">
    <div
      class="h-full rounded-full bg-primary/50 transition-all duration-300 ease-out"
      :class="cn(accent)"
      :style="{ width: `${value}%` }"
    />
  </div>
</template>
