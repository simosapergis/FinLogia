<template>
  <section class="flex w-full items-center justify-center">
    <div class="flex w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl lg:min-h-[480px]">
      <div class="hidden flex-1 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-10 lg:flex lg:flex-col lg:justify-between">
        <div>
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Briefcase class="h-5 w-5 text-white" :stroke-width="2.5" />
            </div>
            <span class="text-xl font-bold text-white">FinLogia Accountant</span>
          </div>
          <p class="mt-6 text-lg font-medium text-primary-100 break-keep">
            Διαχειριστείτε τα τιμολόγια των πελατών σας σε ένα σημείο.
          </p>
          <p class="mt-2 text-sm text-primary-200/80 break-keep">
            Προβολή, αναζήτηση και εξαγωγή τιμολογίων FinLogia.
          </p>
        </div>
        <div class="flex items-center gap-6 text-sm text-primary-200/60">
          <div class="flex items-center gap-2">
            <Building2 class="h-4 w-4" />
            <span>Πελάτες</span>
          </div>
          <div class="flex items-center gap-2">
            <FileText class="h-4 w-4" />
            <span>Τιμολόγια</span>
          </div>
          <div class="flex items-center gap-2">
            <Download class="h-4 w-4" />
            <span>Εξαγωγή</span>
          </div>
        </div>
      </div>

      <div class="flex flex-1 flex-col justify-center p-8 lg:p-10">
        <div class="mb-8 flex items-center gap-2 lg:hidden">
          <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-md shadow-primary-500/30">
            <Briefcase class="h-4 w-4 text-white" :stroke-width="2.5" />
          </div>
          <span class="text-lg font-bold text-primary-600">FinLogia Accountant</span>
        </div>

        <h2 class="text-2xl font-bold text-slate-900">Σύνδεση</h2>
        <p class="mb-8 mt-2 text-sm text-slate-500">Χρησιμοποιήστε τα στοιχεία του λογαριασμού σας.</p>

        <form class="space-y-5" @submit.prevent="handleSubmit">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">Email</label>
            <div class="relative">
              <Mail class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                v-model="state.email"
                type="email"
                required
                placeholder="example@email.com"
                class="w-full rounded-xl border-2 border-slate-200 py-3 pl-12 pr-4 text-slate-900 transition placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
              />
            </div>
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">Κωδικός</label>
            <div class="relative">
              <Lock class="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                v-model="state.password"
                type="password"
                required
                placeholder="••••••••"
                class="w-full rounded-xl border-2 border-slate-200 py-3 pl-12 pr-4 text-slate-900 transition placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
              />
            </div>
          </div>
          <button
            :disabled="state.loading"
            type="submit"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:shadow-xl hover:shadow-primary-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Loader2 v-if="state.loading" class="h-5 w-5 animate-spin" />
            {{ state.loading ? 'Σύνδεση...' : 'Είσοδος' }}
          </button>
          <p v-if="state.error" class="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-600">
            <AlertCircle class="h-4 w-4 shrink-0" />
            {{ state.error }}
          </p>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Briefcase, Building2, FileText, Download, Mail, Lock, Loader2, AlertCircle } from 'lucide-vue-next';
import { useAuth } from '@/composables/useAuth';

const router = useRouter();
const route = useRoute();
const { login } = useAuth();

const state = reactive({
  email: '',
  password: '',
  loading: false,
  error: null as string | null,
});

const handleSubmit = async () => {
  state.loading = true;
  state.error = null;
  try {
    await login(state.email, state.password);
    const redirect = (route.query.redirect as string) || '/';
    router.push(redirect);
  } catch {
    state.error = 'Λάθος email ή κωδικός πρόσβασης';
  } finally {
    state.loading = false;
  }
};
</script>
