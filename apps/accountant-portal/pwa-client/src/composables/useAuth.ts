import { ref, onMounted, onUnmounted } from 'vue';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import { useAccountantStore } from '@/store/accountantStore';
import { notify } from '@/services/notifications';

const authReady = ref(false);
let authReadyResolve: (() => void) | null = null;
const authReadyPromise = new Promise<void>((resolve) => {
  authReadyResolve = resolve;
});

export function waitForAuthReady(): Promise<void> {
  return authReadyPromise;
}

export function useAuth() {
  const userStore = useUserStore();
  const accountantStore = useAccountantStore();
  const loading = ref(false);
  const error = ref('');

  let unsubscribe: (() => void) | null = null;

  async function fetchAccountantProfile(officeId: string) {
    try {
      const docRef = doc(firestore, 'accountants', officeId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        accountantStore.setProfile(snap.data() as { displayName: string; email: string; createdAt: unknown });
      }
    } catch (err) {
      console.error('Failed to fetch accountant profile:', err);
    }
  }

  onMounted(() => {
    unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      userStore.setUser(user);
      if (user) {
        try {
          const tokenResult = await user.getIdTokenResult();
          const officeId = (tokenResult.claims.officeId as string) || user.uid;
          await fetchAccountantProfile(officeId);
        } catch (err) {
          console.error('Failed to get token result:', err);
          await fetchAccountantProfile(user.uid);
        }
      } else {
        accountantStore.setProfile(null);
      }
      if (!authReady.value) {
        authReady.value = true;
        authReadyResolve?.();
      }
    });
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  async function login(email: string, password: string) {
    loading.value = true;
    error.value = '';
    try {
      await signInWithEmailAndPassword(auth, email, password);
      notify({ message: 'Επιτυχής σύνδεση', type: 'success' });
    } catch (err: unknown) {
      error.value = 'Λάθος email ή κωδικός πρόσβασης';
      notify({ message: error.value, type: 'error' });
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    await signOut(auth);
    accountantStore.setProfile(null);
    notify({ message: 'Αποσυνδεθήκατε', type: 'info' });
  }

  return { loading, error, login, logout, authReady };
}
