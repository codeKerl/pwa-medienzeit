<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'secondary' | 'ghost' | 'outline' | 'destructive'
type Size = 'default' | 'sm' | 'lg' | 'icon'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  {
    variant: 'default',
    size: 'default',
    type: 'button',
  },
)

const classes = computed(() =>
  cn(
    'inline-flex items-center justify-center whitespace-nowrap gap-2 rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-[1px] disabled:pointer-events-none disabled:opacity-50 ring-offset-background',
    {
      'bg-primary text-primary-foreground shadow-glow hover:opacity-90': props.variant === 'default',
      'bg-secondary text-secondary-foreground shadow-sm hover:opacity-95': props.variant === 'secondary',
      'border border-input bg-transparent hover:bg-muted/70': props.variant === 'outline',
      'bg-destructive text-destructive-foreground hover:opacity-90': props.variant === 'destructive',
      'bg-transparent text-foreground hover:bg-muted': props.variant === 'ghost',
    },
    {
      'h-10 px-4 py-2': props.size === 'default',
      'h-9 px-3': props.size === 'sm',
      'h-12 px-5 text-base': props.size === 'lg',
      'h-10 w-10 p-0': props.size === 'icon',
    },
  ),
)
</script>

<template>
  <button :class="classes" :type="type" :disabled="disabled">
    <slot />
  </button>
</template>
