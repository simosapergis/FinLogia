import { defineStore } from 'pinia';
import type { User } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseApp } from '@/services/firebase';

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    businessId: null as string | null,
    isAccountant: false,
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.user),
    currentBusinessId: (state) => {
      // If accountant is viewing a specific client, we could return that here,
      // but for the business portal view, we use the user's own businessId.
      return state.businessId;
    }
  },
  actions: {
    async setUser(user: User | null) {
      this.user = user;
      if (user) {
        try {
          const token = await user.getIdTokenResult();
          this.isAccountant = !!token.claims.isAccountant;
          
          const db = getFirestore(firebaseApp);
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            this.businessId = userDoc.data().businessId || null;
          }
        } catch (e) {
          console.error('Failed to fetch user businessId', e);
        }
      } else {
        this.businessId = null;
        this.isAccountant = false;
      }
    },
  },
});
