<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Button from './ui/button.vue'
import Card from './ui/card.vue'
import Input from './ui/input.vue'
import Label from './ui/label.vue'
import { useKidsStore } from '@/stores/kids'
import { useI18nStore } from '@/stores/i18n'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const store = useKidsStore()
const i18n = useI18nStore()

const pinInput = ref('')
const error = ref('')
const unlocked = ref(false)

const addForm = reactive({
  name: '',
  mediaWeeklyLimit: 360,
  readingWeeklyMax: 240,
  readingToMediaFactor: 0.5,
  accent: 'from-amber-500 to-orange-500',
})

const resetState = () => {
  pinInput.value = ''
  error.value = ''
  unlocked.value = false
}

watch(
  () => props.open,
  (open) => {
    if (!open) resetState()
  },
)

const tryUnlock = () => {
  if (store.validatePin(pinInput.value)) {
    unlocked.value = true
    error.value = ''
  } else {
    error.value = i18n.t('texts.pinError')
  }
}

const savePin = () => {
  if (pinInput.value.trim().length < 4) {
    error.value = i18n.t('texts.pinShort')
    return
  }
  store.setPin(pinInput.value.trim())
  unlocked.value = true
  error.value = i18n.t('texts.pinSaved')
}

const addKid = () => {
  if (!addForm.name.trim()) return
  store.addKid({
    name: addForm.name.trim(),
    mediaWeeklyLimit: Number(addForm.mediaWeeklyLimit),
    readingWeeklyMax: Number(addForm.readingWeeklyMax),
    readingToMediaFactor: Number(addForm.readingToMediaFactor),
    mediaUsed: 0,
    readingLogged: 0,
    accent: addForm.accent,
  })
  addForm.name = ''
}

const kidList = computed(() => store.kids)
</script>

<template>
  <transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-10 backdrop-blur-sm overflow-y-auto"
      role="dialog"
    >
      <div class="relative w-full max-w-5xl space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm uppercase tracking-wide text-muted-foreground">{{ i18n.t('buttons.parent') }}</p>
            <h2 class="text-2xl font-semibold">{{ i18n.t('labels.settings') }}</h2>
          </div>
          <Button variant="ghost" @click="emit('close')">{{ i18n.t('buttons.back') }}</Button>
        </div>

        <Card class="p-4">
          <div class="grid gap-4 md:grid-cols-[2fr,1fr] md:items-center">
            <div class="space-y-1">
              <p class="text-sm font-medium text-muted-foreground">{{ i18n.t('labels.pinAccess') }}</p>
              <p class="text-lg font-semibold text-foreground">{{ i18n.t('labels.pinProtected') }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <Input
                v-model="pinInput"
                placeholder="****"
                type="password"
                class="md:w-40"
                @keyup.enter="unlocked ? savePin() : tryUnlock()"
              />
              <Button v-if="!unlocked" @click="tryUnlock">{{ i18n.t('buttons.unlock') }}</Button>
              <Button v-else variant="secondary" @click="savePin">{{ i18n.t('buttons.setPin') }}</Button>
            </div>
          </div>
          <p v-if="error" class="mt-2 text-sm text-destructive">{{ error }}</p>
        </Card>

        <div v-if="unlocked" class="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <Card class="p-4 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold">{{ i18n.t('labels.children') }}</h3>
              <div class="flex items-center gap-2">
                <Button size="sm" variant="ghost" @click="store.resetWeek()">{{ i18n.t('labels.resetWeek') }}</Button>
              </div>
            </div>

            <div class="space-y-3">
              <div
                v-for="kid in kidList"
                :key="kid.id"
                class="rounded-lg border border-border/70 bg-muted/40 p-3 shadow-inner"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="h-2 w-2 rounded-full bg-gradient-to-r" :class="kid.accent" />
                    <p class="font-semibold">{{ kid.name }}</p>
                  </div>
                  <div class="flex items-center gap-2">
                    <Button size="sm" variant="ghost" @click="store.resetWeek(kid.id)">{{ i18n.t('labels.resetChild') }}</Button>
                    <Button size="sm" variant="destructive" @click="store.deleteKid(kid.id)">{{ i18n.t('labels.removeChild') }}</Button>
                  </div>
                </div>

                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <div class="space-y-2">
                    <Label>{{ i18n.t('labels.mediaWeeklyLimit') }}</Label>
                    <Input
                      type="number"
                      :min="0"
                      :step="15"
                      :model-value="kid.mediaWeeklyLimit"
                      @update:model-value="store.updateKid(kid.id, { mediaWeeklyLimit: Number($event) })"
                    />
                  </div>
                  <div class="space-y-2">
                    <Label>{{ i18n.t('labels.readingLimit') }}</Label>
                    <Input
                      type="number"
                      :min="0"
                      :step="10"
                      :model-value="kid.readingWeeklyMax"
                      @update:model-value="store.updateKid(kid.id, { readingWeeklyMax: Number($event) })"
                    />
                  </div>
                  <div class="space-y-2">
                    <Label>{{ i18n.t('labels.factor') }}</Label>
                    <Input
                      type="number"
                      :min="0"
                      :step="0.1"
                      :model-value="kid.readingToMediaFactor"
                      @update:model-value="store.updateKid(kid.id, { readingToMediaFactor: Number($event) })"
                    />
                  </div>
                  <div class="space-y-2">
                    <Label>{{ i18n.t('labels.accent') }}</Label>
                    <Input
                      type="text"
                      :model-value="kid.accent"
                      placeholder="from-indigo-500 to-blue-500"
                      @update:model-value="store.updateKid(kid.id, { accent: String($event) })"
                    />
                  </div>
                  <div class="space-y-2">
                    <Label>{{ i18n.t('labels.adjustTime') }}</Label>
                    <div class="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" class="border-dashed" @click="store.logMedia(kid.id, -5)">
                        -5 min
                      </Button>
                      <Button size="sm" variant="outline" class="border-dashed" @click="store.logMedia(kid.id, -15)">
                        -15 min
                      </Button>
                      <Button size="sm" variant="outline" class="border-dashed" @click="store.logMedia(kid.id, -30)">
                        -30 min
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card class="p-4 space-y-3">
            <h3 class="text-lg font-semibold">{{ i18n.t('labels.newChild') }}</h3>
            <div class="space-y-2">
              <Label>{{ i18n.t('labels.child') }}</Label>
              <Input v-model="addForm.name" placeholder="Name" />
            </div>
            <div class="space-y-2">
              <Label>{{ i18n.t('labels.mediaWeeklyLimit') }}</Label>
              <Input v-model.number="addForm.mediaWeeklyLimit" type="number" :min="0" :step="15" />
            </div>
            <div class="space-y-2">
              <Label>{{ i18n.t('labels.readingLimitShort') }}</Label>
              <Input v-model.number="addForm.readingWeeklyMax" type="number" :min="0" :step="10" />
            </div>
            <div class="space-y-2">
              <Label>{{ i18n.t('labels.factorShort') }}</Label>
              <Input v-model.number="addForm.readingToMediaFactor" type="number" :min="0" :step="0.1" />
            </div>
            <div class="space-y-2">
              <Label>{{ i18n.t('labels.accent') }}</Label>
              <Input v-model="addForm.accent" placeholder="from-amber-500 to-orange-500" />
            </div>
            <Button class="w-full" @click="addKid">{{ i18n.t('buttons.addChild') }}</Button>
          </Card>
        </div>

        <div v-else class="rounded-xl border border-dashed border-primary/50 bg-primary/5 p-4 text-sm">
          {{ i18n.t('labels.parentPanelClosed') }}
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
