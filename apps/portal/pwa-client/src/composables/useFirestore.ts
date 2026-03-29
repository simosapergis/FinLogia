import {
  getFirestore,
  collection,
  collectionGroup,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  where,
  limit,
  Timestamp,
} from 'firebase/firestore';

import { firebaseApp } from '@/services/firebase';
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
  const invoicesRef = collection(db, 'invoices');
  const suppliersRef = collection(db, 'suppliers');

  const saveInvoiceRecord = async (invoice: Invoice) => {
    const invoiceDoc = doc(invoicesRef, invoice.id);
    await setDoc(invoiceDoc, invoice, { merge: true });
    return invoice;
  };

  const fetchInvoices = async (): Promise<Invoice[]> => {
    const snapshot = await getDocs(query(invoicesRef, orderBy('uploadedAt', 'desc')));
    const invoices = snapshot.docs.map((docSnapshot) => docSnapshot.data() as Invoice);
    console.info('[Firestore] fetched invoices', invoices.length);
    return invoices;
  };

  const fetchSuppliers = async (): Promise<Supplier[]> => {
    const snapshot = await getDocs(query(suppliersRef, orderBy('name', 'asc')));
    const suppliers = snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data() as Supplier;
      return { ...data, id: docSnapshot.id };
    });
    return suppliers;
  };

  const fetchSupplierInvoices = async (supplierId: string): Promise<Invoice[]> => {
    const invoicesCollection = collection(db, `suppliers/${supplierId}/invoices`);
    const q = query(invoicesCollection, orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);
    const invoices = snapshot.docs.map((docSnapshot) => ({ ...(docSnapshot.data() as Invoice), id: docSnapshot.id }));
    return invoices;
  };

  const fetchSupplierInvoice = async (supplierId: string, invoiceId: string): Promise<Invoice | null> => {
    const docPath = `suppliers/${supplierId}/invoices/${invoiceId}`;
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
    const q = query(
      collectionGroup(db, 'invoices'),
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
    const q = query(
      collectionGroup(db, 'invoices'),
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
    // Return cached data if still valid for today
    if (isCacheFresh() && suppliersDeliveringTodayCache) {
      console.info('[Firestore] Using cached suppliers delivering today', suppliersDeliveringTodayCache.length);
      return suppliersDeliveringTodayCache;
    }

    const dayOfWeek = getTodayDayOfWeek();
    console.info('[Firestore] Fetching suppliers for day of week:', dayOfWeek);

    const q = query(
      suppliersRef,
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
   * Uses collectionGroup to query across all suppliers.
   * Extracts supplierId from the document reference path and includes downloadedBy.
   */
  const fetchInvoicesByInvoiceDate = async (startDate: Date, endDate: Date): Promise<ExportInvoice[]> => {
    const q = query(
      collectionGroup(db, 'invoices'),
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
        supplierId: docSnapshot.ref.parent.parent?.id ?? '',
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
