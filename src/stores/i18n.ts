import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

type Lang = 'de' | 'en'

const messages: Record<Lang, Record<string, string>> = {
  de: {
    'app.tag': 'Medienzeit',
    'app.title': 'Smarte PWA für Medienzeit, Stoppuhr & Lesen',
    'app.desc': 'Kinder buchen ihre Bildschirmzeit per Timer oder Stoppuhr. Lesezeit kann Wochenlimit erhöhen – gesteuert im geschützten Eltern-Dashboard.',
    'buttons.parent': 'Eltern-Dashboard',
    'buttons.openChild': 'Eigenes Dashboard öffnen',
    'buttons.back': 'Zurück',
    'buttons.overview': 'Übersicht',
    'buttons.unlock': 'Entsperren',
    'buttons.setPin': 'Pin setzen',
    'buttons.addChild': 'Hinzufügen',
    'labels.available': 'Verfügbar',
    'labels.capacity': 'Kapazität',
    'labels.used': 'Genutzt',
    'labels.readingBonus': 'Lesebonus',
    'labels.readingStatus': 'Lesestatus',
    'labels.child': 'Kind',
    'labels.children': 'Kinder',
    'labels.dashboard': 'Dashboard',
    'labels.pwa': 'PWA ready',
    'labels.offline': 'Offline & Homescreen',
    'labels.offlineDesc': 'Läuft offline, kann als App gespeichert werden. Fortschritt bleibt lokal erhalten.',
    'labels.mediaTime': 'Medienzeit',
    'labels.reading': 'Lesen',
    'labels.timer': 'Timer',
    'labels.stopwatch': 'Stoppuhr',
    'labels.runtime': 'Laufzeit',
    'labels.resetWeek': 'Woche zurücksetzen',
    'labels.resetChild': 'Nur Zeiten löschen',
    'labels.removeChild': 'Entfernen',
    'labels.settings': 'Einstellungen & Zeiten',
    'labels.parentPanelClosed': 'Pin eingeben, um Einstellungen und Wochen-Reset zu öffnen.',
    'labels.pinProtected': 'Aktueller Pin ist geschützt.',
    'labels.pinAccess': 'Zugang mit PIN',
    'labels.newChild': 'Neues Kind',
    'buttons.start': 'Start',
    'buttons.stopBook': 'Stop & buchen',
    'buttons.reset': 'Reset',
    'labels.mediaWeeklyLimit': 'Wöchentliche Medienzeit (min)',
    'labels.readingLimit': 'Leselimit für Bonus (min)',
    'labels.factor': 'Faktor (1 min Lesen => ? min Medien)',
    'labels.accent': 'Akzent-Verlauf (Tailwind Klassen)',
    'labels.readingLimitShort': 'Leselimit (min)',
    'labels.factorShort': 'Faktor (Lesen → Medien)',
    'labels.adjustTime': 'Verbrauch anpassen',
    'labels.readingBonusInfo': 'Bis {max} Leseminuten werden angerechnet.',
    'labels.fromReading': 'aus {read} Lesen',
    'labels.liveTimers': 'Live-Timer laufen:',
    'labels.syncNow': 'Sync jetzt',
    'labels.log': 'Buchungen',
    'texts.countdownInfo': 'Zählt herunter und bucht automatisch.',
    'texts.stopwatchInfo': 'Stoppen zum Buchen.',
    'texts.pinError': 'Falscher Pin.',
    'texts.pinShort': 'Bitte mindestens 4 Stellen wählen.',
    'texts.pinSaved': 'Neuer Pin gespeichert.',
    'texts.childUnknown': 'Kind nicht gefunden.',
    'texts.liveTimerLabel': 'Timer',
    'texts.stopwatchLabel': 'Stoppuhr',
    'texts.quickHint': '+5 / +10 antippen für schnelle Buchungen.',
    'texts.noBookings': 'Noch keine Buchungen.',
  },
  en: {
    'app.tag': 'Screen time',
    'app.title': 'Smart PWA for screen time, stopwatch & reading bonus',
    'app.desc': 'Kids book their screen time with timer or stopwatch. Reading can unlock extra minutes – managed in the protected parent dashboard.',
    'buttons.parent': 'Parent dashboard',
    'buttons.openChild': 'Open child dashboard',
    'buttons.back': 'Back',
    'buttons.overview': 'Overview',
    'buttons.unlock': 'Unlock',
    'buttons.setPin': 'Set PIN',
    'buttons.addChild': 'Add child',
    'labels.available': 'Available',
    'labels.capacity': 'Capacity',
    'labels.used': 'Used',
    'labels.readingBonus': 'Reading bonus',
    'labels.readingStatus': 'Reading status',
    'labels.child': 'Child',
    'labels.children': 'Children',
    'labels.dashboard': 'Dashboard',
    'labels.pwa': 'PWA ready',
    'labels.offline': 'Offline & homescreen',
    'labels.offlineDesc': 'Works offline, can be installed. Progress stays locally.',
    'labels.mediaTime': 'Screen time',
    'labels.reading': 'Reading',
    'labels.timer': 'Timer',
    'labels.stopwatch': 'Stopwatch',
    'labels.runtime': 'Runtime',
    'labels.resetWeek': 'Reset week',
    'labels.resetChild': 'Clear times only',
    'labels.removeChild': 'Remove',
    'labels.settings': 'Settings & Times',
    'labels.parentPanelClosed': 'Enter PIN to open settings and weekly reset.',
    'labels.pinProtected': 'Current PIN is protected.',
    'labels.pinAccess': 'Access with PIN',
    'labels.newChild': 'New child',
    'buttons.start': 'Start',
    'buttons.stopBook': 'Stop & book',
    'buttons.reset': 'Reset',
    'labels.mediaWeeklyLimit': 'Weekly screen time (min)',
    'labels.readingLimit': 'Reading cap for bonus (min)',
    'labels.factor': 'Factor (1 min reading => ? min screen)',
    'labels.accent': 'Accent gradient (Tailwind classes)',
    'labels.readingLimitShort': 'Reading limit (min)',
    'labels.factorShort': 'Factor (reading → screen)',
    'labels.adjustTime': 'Adjust usage',
    'labels.readingBonusInfo': 'Up to {max} reading minutes count toward bonus.',
    'labels.fromReading': 'from {read} reading',
    'labels.liveTimers': 'Live timers running:',
    'labels.syncNow': 'Sync now',
    'labels.log': 'Bookings',
    'texts.countdownInfo': 'Counts down and books automatically.',
    'texts.stopwatchInfo': 'Stop to book.',
    'texts.pinError': 'Wrong PIN.',
    'texts.pinShort': 'Please choose at least 4 digits.',
    'texts.pinSaved': 'New PIN saved.',
    'texts.childUnknown': 'Child not found.',
    'texts.liveTimerLabel': 'Timer',
    'texts.stopwatchLabel': 'Stopwatch',
    'texts.quickHint': 'Tap +5 / +10 for quick bookings.',
    'texts.noBookings': 'No bookings yet.',
  },
}

const guessLanguage = (): Lang => {
  if (typeof navigator === 'undefined') return 'de'
  return navigator.language.startsWith('de') ? 'de' : 'en'
}

export const useI18nStore = defineStore('i18n', () => {
  const lang = ref<Lang>(guessLanguage())

  const setLang = (value: Lang) => {
    lang.value = value
    localStorage.setItem('medienzeit-lang', value)
  }

  const hydrate = () => {
    if (typeof localStorage === 'undefined') return
    const stored = localStorage.getItem('medienzeit-lang') as Lang | null
    if (stored === 'de' || stored === 'en') lang.value = stored
  }

  const t = (key: string, vars?: Record<string, string | number>) => {
    const msg = messages[lang.value][key] ?? messages.de[key] ?? key
    if (!vars) return msg
    return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), msg)
  }

  const currentMessages = computed(() => messages[lang.value])

  return { lang, setLang, t, hydrate, currentMessages }
})
