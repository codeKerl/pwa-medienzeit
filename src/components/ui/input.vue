<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue?: string | number | null
  placeholder?: string
  type?: string
  min?: number
  step?: number | string
  class?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const classes = computed(() =>
  cn(
    'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-all ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
    props.class,
  ),
)

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.type === 'number' ? Number(target.value) : target.value)
}
</script>

<template>
  <input
    :value="modelValue ?? ''"
    :placeholder="placeholder"
    :type="type ?? 'text'"
    :min="min"
    :step="step"
    :class="classes"
    @input="onInput"
  />
</template>
