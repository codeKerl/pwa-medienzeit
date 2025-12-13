<script setup lang="ts">
import Button from './ui/button.vue'
import { useI18nStore } from '@/stores/i18n'

const i18n = useI18nStore()

const cycle = () => {
  i18n.setLang(i18n.lang === 'de' ? 'en' : 'de')
}
</script>

<template>
  <Button variant="ghost" size="sm" class="gap-2" @click="cycle">
    {{ i18n.lang === 'de' ? 'DE' : 'EN' }}
  </Button>
</template>
