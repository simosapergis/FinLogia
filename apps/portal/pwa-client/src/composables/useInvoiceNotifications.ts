import { ref, watch } from 'vue';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  type Unsubscribe,
  serverTimestamp,
} from 'firebase/firestore';

import { firebaseApp } from '@/services/firebase';
import { useNotificationStore } from '@/store/notificationStore';
import { useNotifications } from '@/composables/useNotifications';
import { useAuth } from '@/composables/useAuth';

const db = getFirestore(firebaseApp);

// Track processed doc IDs to avoid duplicate toasts
const processedDocIds = new Set<string>();

// Singleton unsubscribe function
let unsubscribe: Unsubscribe | null = null;
const isInitialized = ref(false);

export interface InvoiceMetadata {
  invoiceId: string;
  ownerUid: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  successMessage?: string;
  errorMessage?: string;
  notificationSeen: boolean;
  notificationSeenAt?: { seconds: number; nanoseconds: number } | Date;
  updatedAt: { seconds: number; nanoseconds: number } | Date;
  createdAt: { seconds: number; nanoseconds: number } | Date;
}

export function useInvoiceNotifications() {
  const notificationStore = useNotificationStore();
  const { notifySuccess, notifyError } = useNotifications();
  const { user, isAuthenticated } = useAuth();

  const startListening = () => {
    if (unsubscribe || !user.value?.uid) return;

    const q = query(
      collection(db, 'metadata_invoices'),
      where('ownerUid', '==', user.value.uid),
      where('status', 'in', ['done', 'error']),
      where('notificationSeen', '==', false),
      orderBy('updatedAt', 'desc'),
      limit(20)
    );

    unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type !== 'added' && change.type !== 'modified') return;

        const data = change.doc.data() as Omit<InvoiceMetadata, 'id'>;
        const docId = change.doc.id;

        // Add notification to store
        const notificationType = data.status === 'done' ? 'success' : 'error';
        const message = data.status === 'done' 
          ? data.successMessage ?? 'Το τιμολόγιο επεξεργάστηκε επιτυχώς'
          : data.errorMessage ?? 'Σφάλμα κατά την επεξεργασία του τιμολογίου';

        // Check if we've already added this notification
        const existingNotification = notificationStore.notifications.find(
          (n) => n.invoiceId === docId
        );

        if (!existingNotification) {
          notificationStore.addNotification({
            type: notificationType,
            invoiceId: docId,
            message,
            errorMessage: data.status === 'error' ? data.errorMessage : undefined,
          });

          // Show toast only for new notifications (not on initial load)
          if (processedDocIds.has('__initialized__') && !processedDocIds.has(docId)) {
            data.successMessage ? notifySuccess(message) : notifyError(message);
          }
          processedDocIds.add(docId);
        }
      });

      // Mark as initialized after first snapshot
      if (!processedDocIds.has('__initialized__')) {
        processedDocIds.add('__initialized__');
      }
    }, (error) => {
      console.error('[InvoiceNotifications] Error listening to notifications:', error);
    });

    isInitialized.value = true;
  };

  const stopListening = () => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    isInitialized.value = false;
    processedDocIds.clear();
  };

  const markAsSeen = async (invoiceMetadataId: string) => {
    try {
      const docRef = doc(db, 'metadata_invoices', invoiceMetadataId);
      await updateDoc(docRef, { notificationSeen: true, notificationSeenAt: serverTimestamp() });
    } catch (error) {
      console.error('[InvoiceNotifications] Failed to mark as seen:', error);
    }
  };

  // Auto-start/stop based on auth state
  const initializeNotifications = () => {
    watch(
      isAuthenticated,
      (authenticated) => {
        if (authenticated && user.value?.uid) {
          startListening();
        } else {
          stopListening();
        }
      },
      { immediate: true }
    );
  };

  return {
    isInitialized,
    startListening,
    stopListening,
    markAsSeen,
    initializeNotifications,
  };
}

