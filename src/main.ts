import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useThemeStore } from './stores/theme'
import { useI18nStore } from './stores/i18n'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Initialize theme immediately so dark mode applies before paint.
useThemeStore().hydrate()
useI18nStore().hydrate()

app.mount('#app')
