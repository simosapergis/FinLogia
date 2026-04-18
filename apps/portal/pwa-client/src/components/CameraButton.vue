<template>
  <div>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="handleChange"
    />
    <button
      type="button"
      class="flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-4 font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:shadow-xl hover:shadow-primary-600/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="disabled"
      @click="openPicker"
    >
      <slot>Use Camera or Upload</slot>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{ disabled?: boolean }>(), {
  disabled: false,
});

const emit = defineEmits<{ (e: 'select', file: File): void }>();
const fileInput = ref<HTMLInputElement | null>(null);

const openPicker = () => {
  if (props.disabled) return;
  fileInput.value?.click();
};

const handleChange = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    emit('select', file);
  }
  if (input) {
    input.value = '';
  }
};
</script>
