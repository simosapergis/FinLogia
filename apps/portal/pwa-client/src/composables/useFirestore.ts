import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';

import { firebaseApp } from '@/services/firebase';
import { useUserStore } from '@/store/userStore';
import type { Invoice } from '@/modules/invoices/InvoiceMapper';
import type { Supplier } from '@/modules/suppliers/Supplier';

export interface ExportInvoice extends Invoice {
  supplierId: string;
  downloadedBy: Record<string, { lastDownloadedAt: unknown; downloadCount: number }>;
}

const db = getFirestore(firebaseApp);

// Cache for suppliers delivering today (shared across composable instances)
let suppliersDeliveringTodayCache: Supplier[] | null = null;
let cacheDay: number | null = null;

// Helper to get today's day of week (ISO 8601: 1=Monday to 7=Sunday)
const getTodayDayOfWeek = (): number => {
  const day = new Date().getDay(); // JS: 0=Sunday, 1=Monday, ..., 6=Saturday
  return day === 0 ? 7 : day; // Convert to ISO 8601
};

// Check if cache is still valid for today
const isCacheFresh = (): boolean => {
  return cacheDay === getTodayDayOfWeek();
};

// Clear delivery cache (call when delivery data changes)
export const clearDeliveryCache = (): void => {
  suppliersDeliveringTodayCache = null;
  cacheDay = null;
  console.info('[Firestore] Delivery cache cleared');
};

export function useFirestore() {
  const userStore = useUserStore();
  
  const getBusinessId = () => {
    const businessId = userStore.currentBusinessId;
    if (!businessId) {
      // Return a dummy value or throw depending on how we want to handle it.
      // Throwing here causes the UI to break if a component tries to fetch data
      // before the router redirects. Let's return a dummy path that will just return empty results
      // or fail gracefully at the Firestore rules level.
      return 'NO_BUSINESS_ID';
    }
    return businessId;
  };

  const getInvoicesRef = () => collection(db, `businesses/${getBusinessId()}/invoices`);
  const getSuppliersRef = () => collection(db, `businesses/${getBusinessId()}/suppliers`);

  const saveInvoiceRecord = async (invoice: Invoice) => {
    const businessId = userStore.currentBusinessId;
    if (!businessId) throw new Error('No business ID found');
    const invoiceDoc = doc(getInvoicesRef(), invoice.id);
    await setDoc(invoiceDoc, invoice, { merge: true });
    return invoice;
  };

  const fetchInvoices = async (): Promise<Invoice[]> => {
    const businessId = userStore.currentBusinessId;
    if (!businessId) return [];
    const snapshot = await getDocs(query(getInvoicesRef(), orderBy('uploadedAt', 'desc')));
    const invoices = snapshot.docs.map((docSnapshot) => docSnapshot.data() as Invoice);
    console.info('[Firestore] fetched invoices', invoices.length);
    return invoices;
  };

  const fetchSuppliers = async (): Promise<Supplier[]> => {
    const businessId = userStore.currentBusinessId;
    if (!businessId) return [];
    const snapshot = await getDocs(query(getSuppliersRef(), orderBy('name', 'asc')));
    const suppliers = snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as Supplier;
      return { ...data, id: docSnapshot.id };
    });
    return suppliers;
  };

  const fetchSupplierInvoices = async (
    supplierId: string,
    lastVisibleDoc: QueryDocumentSnapshot<DocumentData> | null = null,
    pageSize: number = 20
  ): Promise<{ invoices: Invoice[]; lastVisible: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> => {
    const businessId = userStore.currentBusinessId;
    if (!businessId) return { invoices: [], lastVisible: null, hasMore: false };
    let q = query(
      getInvoicesRef(),
      where('supplierId', '==', supplierId),
      orderBy('uploadedAt', 'desc'),
      limit(pageSize)
    );

    if (lastVisibleDoc) {
      q = query(q, startAfter(lastVisibleDoc));
    }

    const snapshot = await getDocs(q);
    const invoices = snapshot.docs.map((docSnapshot) => ({ ...(docSnapshot.data() as Invoice), id: docSnapshot.id }));
    
    const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    const hasMore = snapshot.docs.length === pageSize;

    return { invoices, lastVisible, hasMore };
  };

  const fetchSupplierInvoice = async (supplierId: string, invoiceId: string): Promise<Invoice | null> => {
    const businessId = userStore.currentBusinessId;
    if (!businessId) return null;
    const docPath = `businesses/${getBusinessId()}/invoices/${invoiceId}`;
    console.info('[Firestore] fetching document', docPath);
    const invoiceDoc = doc(db, docPath);
    const snapshot = await getDoc(invoiceDoc);
    if (!snapshot.exists()) {
      console.info('[Firestore] document not found', docPath);
      return null;
    }
    const invoice = { ...(snapshot.data() as Invoice), id: snapshot.id };
    console.info('[Firestore] fetched supplier invoice', invoice.id);
    return invoice;
  };

  const fetchUnpaidInvoices = async (): Promise<Invoice[]> => {
    const businessId = userStore.currentBusinessId;
    if (!businessId) return [];
    const q = query(
      getInvoicesRef(),
      where('paymentStatus', 'in', ['unpaid', 'partially_paid']),
      orderBy('uploadedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const invoices = snapshot.docs.map((docSnapshot) => ({
      ...(docSnapshot.data() as Invoice),
      id: docSnapshot.id,
    }));
    return invoices;
  };

  const fetchInvoicesByDateRange = async (startDate: Date, endDate: Date): Promise<Invoice[]> => {
    const businessId = userStore.currentBusinessId;
    if (!businessId) return [];
    const q = query(
      getInvoicesRef(),
      where('uploadedAt', '>=', startDate),
      where('uploadedAt', '<=', endDate),
      orderBy('uploadedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    const invoices = snapshot.docs.map((docSnapshot) => ({
      ...(docSnapshot.data() as Invoice),
      id: docSnapshot.id,
    }));
    console.info('[Firestore] fetched invoices by date range', invoices.length);
    return invoices;
  };

  /**
   * Fetch suppliers delivering today with memoization.
   * Cache is invalidated when:
   * - The day changes (midnight)
   * - clearDeliveryCache() is called (after delivery data updates)
   */
  const fetchSuppliersDeliveringToday = async (): Promise<Supplier[]> => {
    const businessId = userStore.currentBusinessId;
    if (!businessId) return [];
    // Return cached data if still valid for today
    if (isCacheFresh() && suppliersDeliveringTodayCache) {
      console.info('[Firestore] Using cached suppliers delivering today', suppliersDeliveringTodayCache.length);
      return suppliersDeliveringTodayCache;
    }

    const dayOfWeek = getTodayDayOfWeek();
    console.info('[Firestore] Fetching suppliers for day of week:', dayOfWeek);

    const q = query(
      getSuppliersRef(),
      where('delivery.dayOfWeek', '==', dayOfWeek),
      orderBy('name', 'asc'),
      limit(10)
    );

    const snapshot = await getDocs(q);
    const suppliers = snapshot.docs.map((docSnapshot) => ({
      ...(docSnapshot.data() as Supplier),
      id: docSnapshot.id,
    }));

    // Update cache
    suppliersDeliveringTodayCache = suppliers;
    cacheDay = dayOfWeek;

    console.info('[Firestore] Fetched suppliers delivering today:', suppliers.length);
    return suppliers;
  };

  /**
   * Check if delivery cache needs refresh (day changed)
   */
  const needsDeliveryCacheRefresh = (): boolean => {
    return !isCacheFresh();
  };

  /**
   * Fetch invoices by invoiceDate range (for export page).
   * Extracts supplierId from the document reference path and includes downloadedBy.
   */
  const fetchInvoicesByInvoiceDate = async (startDate: Date, endDate: Date): Promise<ExportInvoice[]> => {
    const businessId = userStore.currentBusinessId;
    if (!businessId) return [];
    const q = query(
      getInvoicesRef(),
      where('invoiceDate', '>=', Timestamp.fromDate(startDate)),
      where('invoiceDate', '<=', Timestamp.fromDate(endDate)),
      orderBy('invoiceDate', 'desc')
    );
    const snapshot = await getDocs(q);
    const invoices = snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        ...(data as Invoice),
        id: docSnapshot.id,
        supplierId: data.supplierId ?? '',
        downloadedBy: (data.downloadedBy as ExportInvoice['downloadedBy']) ?? {},
      };
    });
    console.info('[Firestore] fetched invoices by invoiceDate range', invoices.length);
    return invoices;
  };

  return {
    saveInvoiceRecord,
    fetchInvoices,
    fetchSuppliers,
    fetchSupplierInvoices,
    fetchSupplierInvoice,
    fetchUnpaidInvoices,
    fetchInvoicesByDateRange,
    fetchInvoicesByInvoiceDate,
    fetchSuppliersDeliveringToday,
    needsDeliveryCacheRefresh,
  };
}
