<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: string
}>()

const classes = computed(() =>
  cn('rounded-2xl border bg-card text-card-foreground shadow-xl shadow-slate-200/60 dark:shadow-black/40', props.class),
)
</script>

<template>
  <div :class="classes">
    <slot />
  </div>
</template>
