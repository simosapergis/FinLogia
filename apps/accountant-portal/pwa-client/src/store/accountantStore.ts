import { defineStore } from 'pinia';

export interface AccountantProfile {
  displayName: string;
  email: string;
  createdAt: unknown;
}

export const useAccountantStore = defineStore('accountant', {
  state: () => ({
    profile: null as AccountantProfile | null,
  }),
  getters: {
    displayName: (state) => state.profile?.displayName || 'FinLogia Accountant',
  },
  actions: {
    setProfile(profile: AccountantProfile | null) {
      this.profile = profile;
    },
  },
});
