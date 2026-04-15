<template>
  <Transition
    enter-active-class="transition ease-out duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" @click="close" />
      
      <Transition
        enter-active-class="transition ease-out duration-300"
        enter-from-class="opacity-0 translate-y-4 sm:translate-y-8 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-4 sm:translate-y-8 scale-95"
      >
        <div class="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
          <!-- Header -->
          <div class="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-5 text-white">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <Sparkles class="h-5 w-5" />
              </div>
              <div>
                <h2 class="text-xl font-bold">Τι νέο υπάρχει;</h2>
                <p class="text-sm text-primary-100">Η εφαρμογή ενημερώθηκε επιτυχώς</p>
              </div>
            </div>
            <button
              type="button"
              class="absolute right-4 top-4 rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              @click="close"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Content -->
          <div class="max-h-[60vh] overflow-y-auto p-6">
            <div v-if="loading" class="flex justify-center py-8">
              <Loader2 class="h-8 w-8 animate-spin text-primary-500" />
            </div>
            
            <div v-else-if="error || notes.length === 0" class="text-center py-6 text-slate-500">
              <p>Βελτιώσεις απόδοσης και σταθερότητας του συστήματος.</p>
            </div>
            
            <div v-else class="space-y-6">
              <div v-for="release in notes" :key="release.version" class="relative">
                <div class="mb-3 flex items-center gap-3">
                  <span class="rounded-full bg-primary-100 px-3 py-1 text-sm font-bold text-primary-700">
                    Έκδοση {{ release.version }}
                  </span>
                  <span class="text-xs text-slate-400">{{ formatDate(release.date) }}</span>
                </div>
                
                <div class="prose prose-sm prose-slate max-w-none text-slate-600">
                  <ul class="space-y-2">
                    <li v-for="(note, index) in formatNotes(release.notes)" :key="index" class="flex items-start gap-2">
                      <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{{ note }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="border-t border-slate-100 bg-slate-50 px-6 py-4">
            <button
              type="button"
              class="w-full rounded-xl bg-primary-600 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98]"
              @click="close"
            >
              Συνέχεια
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Sparkles, X, Loader2, CheckCircle2 } from 'lucide-vue-next';

const props = defineProps<{
  previousVersion: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

interface ReleaseNote {
  version: string;
  date: string;
  notes: string;
}

const isOpen = ref(true);
const loading = ref(true);
const error = ref(false);
const notes = ref<ReleaseNote[]>([]);

onMounted(async () => {
  try {
    const response = await fetch('/release-notes.json');
    if (!response.ok) throw new Error('Failed to fetch release notes');
    
    const allNotes: ReleaseNote[] = await response.json();
    
    // Find the index of the previous version to only show new stuff
    const prevIndex = allNotes.findIndex(n => n.version === props.previousVersion);
    
    if (prevIndex !== -1) {
      // If found, slice the array to only include versions newer than previousVersion
      notes.value = allNotes.slice(0, prevIndex);
    } else {
      // If not found (e.g. they missed more than 10 versions), show all available notes
      notes.value = allNotes;
    }
  } catch (err) {
    console.error('Error loading release notes:', err);
    error.value = true;
  } finally {
    loading.value = false;
  }
});

const formatNotes = (notesText: string): string[] => {
  // Split by newlines and remove empty lines or markdown bullets
  return notesText
    .split('\n')
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(line => line.length > 0);
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('el-GR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return dateString;
  }
};

const close = () => {
  isOpen.value = false;
  setTimeout(() => {
    emit('close');
  }, 300); // Wait for transition to finish
};
</script>
