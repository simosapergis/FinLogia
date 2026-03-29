<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        @click.self="handleClose"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" @click="handleClose" />

        <!-- Modal Panel -->
        <article
          class="relative flex h-full max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-white to-slate-50 shadow-2xl"
        >
          <!-- Header -->
          <header class="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-5">
            <div class="min-w-0 flex-1">
              <p class="text-xs uppercase tracking-widest text-primary-600">ΕΠΕΞΕΡΓΑΣΙΑ ΠΡΟΜΗΘΕΥΤΗ</p>
              <h3 class="text-xl font-bold text-slate-900 sm:text-2xl">
                {{ editableSupplier.name || 'Νέος Προμηθευτής' }}
              </h3>
            </div>
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
              @click="handleClose"
            >
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          <!-- Scrollable Content -->
          <div class="flex-1 overflow-y-auto p-6">
            <p class="mb-6 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
              Επεξεργαστείτε τα στοιχεία του προμηθευτή. Η ημέρα και ώρα παράδοσης είναι προαιρετικά.
            </p>

            <div class="grid gap-5 sm:grid-cols-2">
              <!-- Name -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:col-span-2">
                <label class="text-xs uppercase tracking-wide text-slate-400">Επωνυμία</label>
                <input
                  v-model="editableSupplier.name"
                  type="text"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <!-- Category -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <label class="text-xs uppercase tracking-wide text-slate-400">Κατηγορία</label>
                <input
                  v-model="editableSupplier.supplierCategory"
                  type="text"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <!-- Tax Number -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <label class="text-xs uppercase tracking-wide text-slate-400">ΑΦΜ</label>
                <input
                  v-model="editableSupplier.supplierTaxNumber"
                  type="text"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <!-- Delivery Section Header -->
              <div class="sm:col-span-2">
                <h4 class="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <svg class="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Ημέρα & Ώρα Παράδοσης
                </h4>
              </div>

              <!-- Day of Week -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:col-span-2">
                <label class="text-xs uppercase tracking-wide text-slate-400">Ημέρα Παράδοσης</label>
                <select
                  v-model="deliveryDayOfWeek"
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                >
                  <option :value="null">— Επιλέξτε ημέρα —</option>
                  <option v-for="day in daysOfWeek" :key="day.value" :value="day.value">
                    {{ day.label }}
                  </option>
                </select>
              </div>

              <!-- From Time -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <label class="text-xs uppercase tracking-wide text-slate-400">Από</label>
                <div class="mt-2 flex items-center gap-2">
                  <select
                    v-model="deliveryFromHour"
                    class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option :value="null">—</option>
                    <option v-for="h in hours" :key="h.value" :value="h.value">
                      {{ h.label }}
                    </option>
                  </select>
                  <span class="text-slate-400">:</span>
                  <select
                    v-model="deliveryFromMinute"
                    class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option v-for="m in minutes" :key="m.value" :value="m.value">
                      {{ m.label }}
                    </option>
                  </select>
                </div>
              </div>

              <!-- To Time -->
              <div class="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                <label class="text-xs uppercase tracking-wide text-slate-400">Έως</label>
                <div class="mt-2 flex items-center gap-2">
                  <select
                    v-model="deliveryToHour"
                    class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option :value="null">—</option>
                    <option v-for="h in hours" :key="h.value" :value="h.value">
                      {{ h.label }}
                    </option>
                  </select>
                  <span class="text-slate-400">:</span>
                  <select
                    v-model="deliveryToMinute"
                    class="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option v-for="m in minutes" :key="m.value" :value="m.value">
                      {{ m.label }}
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Error Message -->
            <p v-if="errorMessage" class="mt-4 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
              {{ errorMessage }}
            </p>
          </div>

          <!-- Footer -->
          <footer class="shrink-0 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <div class="flex items-center justify-end gap-3">
              <button
                type="button"
                class="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98]"
                @click="handleClose"
              >
                Ακύρωση
              </button>
              <button
                type="button"
                :disabled="!hasChanges || isSaving"
                class="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                @click="saveChanges"
              >
                <svg v-if="isSaving" class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ isSaving ? 'Αποθήκευση...' : 'Αποθήκευση' }}
              </button>
            </div>
          </footer>
        </article>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';

import type { Supplier, SupplierDelivery } from '@/modules/suppliers/Supplier';
import { updateSupplierFields } from '@/services/api/updateSupplierFields';

const props = defineProps<{
  isOpen: boolean;
  supplier: Supplier;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'updated', supplier: Supplier): void;
}>();

// Days of week (ISO 8601: 1=Monday to 7=Sunday)
const daysOfWeek = [
  { value: 1, label: 'Δευτέρα' },
  { value: 2, label: 'Τρίτη' },
  { value: 3, label: 'Τετάρτη' },
  { value: 4, label: 'Πέμπτη' },
  { value: 5, label: 'Παρασκευή' },
  { value: 6, label: 'Σάββατο' },
  { value: 7, label: 'Κυριακή' },
];

// Hours (06-18)
const hours = Array.from({ length: 13 }, (_, i) => ({
  value: i + 6,
  label: (i + 6).toString().padStart(2, '0'),
}));

// Minutes (00-15-30-45)
const minutes = [0, 15, 30, 45].map(i=> ({
  value: i,
  label: i.toString().padStart(2, '0'),
}));

// Editable copy of supplier
const editableSupplier = reactive<Partial<Supplier>>({
  name: '',
  supplierCategory: '',
  supplierTaxNumber: '',
});

// Delivery fields (separate for easier binding)
const deliveryDayOfWeek = ref<number | null>(null);
const deliveryFromHour = ref<number | null>(null);
const deliveryFromMinute = ref<number>(0);
const deliveryToHour = ref<number | null>(null);
const deliveryToMinute = ref<number>(0);

const isSaving = ref(false);
const errorMessage = ref<string | null>(null);

// Initialize editable fields when modal opens
watch(
  () => props.isOpen,
  (open) => {
    if (open && props.supplier) {
      editableSupplier.name = props.supplier.name ?? '';
      editableSupplier.supplierCategory = props.supplier.supplierCategory ?? '';
      // Use supplierTaxNumber first, fallback to supplierTaxNumber if available
      editableSupplier.supplierTaxNumber = props.supplier.supplierTaxNumber ?? (props.supplier as any).supplierTaxNumber ?? '';

      // Initialize delivery fields
      const delivery = props.supplier.delivery;
      deliveryDayOfWeek.value = delivery?.dayOfWeek ?? null;
      deliveryFromHour.value = delivery?.from?.hour ?? null;
      deliveryFromMinute.value = delivery?.from?.minute ?? 0;
      deliveryToHour.value = delivery?.to?.hour ?? null;
      deliveryToMinute.value = delivery?.to?.minute ?? 0;

      errorMessage.value = null;
    }
  },
  { immediate: true }
);

// Check if there are any changes
const hasChanges = computed(() => {
  if (!props.supplier) return false;

  const nameChanged = editableSupplier.name !== (props.supplier.name ?? '');
  const categoryChanged = editableSupplier.supplierCategory !== (props.supplier.supplierCategory ?? '');
  const supplierTaxNumberChanged = editableSupplier.supplierTaxNumber !== (props.supplier.supplierTaxNumber ?? '');

  const delivery = props.supplier.delivery;
  const dayChanged = deliveryDayOfWeek.value !== (delivery?.dayOfWeek ?? null);
  const fromHourChanged = deliveryFromHour.value !== (delivery?.from?.hour ?? null);
  const fromMinuteChanged = deliveryFromMinute.value !== (delivery?.from?.minute ?? 0);
  const toHourChanged = deliveryToHour.value !== (delivery?.to?.hour ?? null);
  const toMinuteChanged = deliveryToMinute.value !== (delivery?.to?.minute ?? 0);

  return nameChanged || categoryChanged || supplierTaxNumberChanged || dayChanged || 
         fromHourChanged || fromMinuteChanged || toHourChanged || toMinuteChanged;
});

const handleClose = () => {
  if (!isSaving.value) {
    emit('close');
  }
};

// Build delivery object for API request
const buildDeliveryPayload = (): SupplierDelivery | undefined => {
  // If no day is selected, don't include delivery
  if (deliveryDayOfWeek.value === null) {
    return undefined;
  }

  const delivery: SupplierDelivery = {
    dayOfWeek: deliveryDayOfWeek.value,
  };

  // Include from time if hour is set
  if (deliveryFromHour.value !== null) {
    delivery.from = {
      hour: deliveryFromHour.value,
      minute: deliveryFromMinute.value,
    };
  }

  // Include to time if hour is set
  if (deliveryToHour.value !== null) {
    delivery.to = {
      hour: deliveryToHour.value,
      minute: deliveryToMinute.value,
    };
  }

  return delivery;
};

const saveChanges = async () => {
  if (!hasChanges.value || isSaving.value) return;

  isSaving.value = true;
  errorMessage.value = null;

  try {
    const delivery = buildDeliveryPayload();

    await updateSupplierFields({
      supplierId: props.supplier.id,
      fields: {
        name: editableSupplier.name,
        supplierCategory: editableSupplier.supplierCategory,
        supplierTaxNumber: editableSupplier.supplierTaxNumber,
        ...(delivery && { delivery }),
      },
    });

    // Emit updated supplier with new values
    const updatedSupplier: Supplier = {
      ...props.supplier,
      name: editableSupplier.name ?? props.supplier.name,
      supplierCategory: editableSupplier.supplierCategory,
      supplierTaxNumber: editableSupplier.supplierTaxNumber,
      delivery,
    };

    emit('updated', updatedSupplier);
    emit('close');
  } catch (err) {
    console.error('Failed to update supplier:', err);
    errorMessage.value = err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης προμηθευτή';
  } finally {
    isSaving.value = false;
  }
};
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-active article,
.modal-leave-active article {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from article,
.modal-leave-to article {
  transform: scale(0.95) translateY(20px);
  opacity: 0;
}
</style>

