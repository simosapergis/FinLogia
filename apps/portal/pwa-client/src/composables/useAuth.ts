import { computed, ref } from 'vue';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { storeToRefs } from 'pinia';

import { firebaseApp } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';

const auth = getAuth(firebaseApp);
let stopAuthListener: (() => void) | null = null;

export function useAuth() {
  const userStore = useUserStore();
  const { user } = storeToRefs(userStore);
  const loading = ref(false);
  const error = ref<string | null>(null);

  if (!stopAuthListener) {
    stopAuthListener = onAuthStateChanged(auth, (firebaseUser) => {
      userStore.setUser(firebaseUser);
    });
  }

  const loginWithEmail = async (email: string, password: string) => {
    loading.value = true;
    error.value = null;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to sign in';
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    userStore.setUser(null);
  };

  const isAuthenticated = computed(() => Boolean(user.value));

  return { user, isAuthenticated, loginWithEmail, logout, loading, error };
}
