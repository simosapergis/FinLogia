import { ref, computed } from 'vue';
import type { InvoiceItem, SupplierGroup } from '@/modules/invoices/Invoice';
import { getClientInvoices, updateAuditStatus } from '@/services/api/invoicesApi';
import { notify } from '@/services/notifications';
import { useUserStore } from '@/store/userStore';

export function useClientInvoices() {
  const invoices = ref<InvoiceItem[]>([]);
  const loading = ref(false);
  const error = ref('');
  const selectedIds = ref<Set<string>>(new Set());
  const userStore = useUserStore();

  const groupedBySupplier = computed<SupplierGroup[]>(() => {
    const map = new Map<string, SupplierGroup>();
    for (const inv of invoices.value) {
      if (!map.has(inv.supplierId)) {
        map.set(inv.supplierId, {
          supplierId: inv.supplierId,
          supplierName: inv.supplierName,
          invoices: [],
        });
      }
      map.get(inv.supplierId)!.invoices.push(inv);
    }
    return Array.from(map.values()).sort((a, b) => a.supplierName.localeCompare(b.supplierName, 'el'));
  });

  const selectedCount = computed(() => selectedIds.value.size);

  function isViewed(invoice: InvoiceItem): boolean {
    const uid = userStore.user?.uid;
    if (!uid) return false;
    return Boolean(invoice.viewedBy?.[uid]);
  }

  function isExported(invoice: InvoiceItem): boolean {
    const uid = userStore.user?.uid;
    if (!uid) return false;
    return Boolean(invoice.downloadedBy?.[uid]);
  }

  function isSelected(invoiceId: string): boolean {
    return selectedIds.value.has(invoiceId);
  }

  function toggleSelection(invoiceId: string) {
    const next = new Set(selectedIds.value);
    if (next.has(invoiceId)) {
      next.delete(invoiceId);
    } else {
      next.add(invoiceId);
    }
    selectedIds.value = next;
  }

  function toggleSupplierSelection(group: SupplierGroup) {
    const allSelected = group.invoices.every((inv) => selectedIds.value.has(inv.invoiceId));
    const next = new Set(selectedIds.value);
    if (allSelected) {
      group.invoices.forEach((inv) => next.delete(inv.invoiceId));
    } else {
      group.invoices.forEach((inv) => next.add(inv.invoiceId));
    }
    selectedIds.value = next;
  }

  function selectAll() {
    selectedIds.value = new Set(invoices.value.map((inv) => inv.invoiceId));
  }

  function deselectAll() {
    selectedIds.value = new Set();
  }

  async function loadInvoices(clientProjectId: string, startDate: string, endDate: string) {
    loading.value = true;
    error.value = '';
    selectedIds.value = new Set();
    try {
      const response = await getClientInvoices({ clientProjectId, startDate, endDate });
      invoices.value = response.data.invoices;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Αποτυχία φόρτωσης τιμολογίων';
      error.value = message;
      notify({ message, type: 'error' });
    } finally {
      loading.value = false;
    }
  }

  function getSelectedInvoicePairs() {
    return invoices.value
      .filter((inv) => selectedIds.value.has(inv.invoiceId))
      .map(({ supplierId, invoiceId }) => ({ supplierId, invoiceId }));
  }

  function markAsViewedLocal(invoiceId: string) {
    const uid = userStore.user?.uid;
    if (!uid) return;
    const invoice = invoices.value.find((inv) => inv.invoiceId === invoiceId);
    if (invoice) {
      if (!invoice.viewedBy) {
        invoice.viewedBy = {};
      }
      
      const now = new Date().toISOString();
      if (invoice.viewedBy[uid]) {
        invoice.viewedBy[uid].lastViewedAt = now;
        invoice.viewedBy[uid].viewCount += 1;
      } else {
        invoice.viewedBy[uid] = {
          name: userStore.user?.displayName || 'User',
          firstViewedAt: now,
          lastViewedAt: now,
          viewCount: 1,
        };
      }
    }
  }

  async function setAuditStatus(clientProjectId: string, supplierId: string, invoiceId: string, status: 'registered' | 'denied' | null) {
    const invoice = invoices.value.find((inv) => inv.invoiceId === invoiceId);
    const previousStatus = invoice?.auditStatus;
    
    // Optimistic update
    if (invoice) {
      invoice.auditStatus = status;
    }

    try {
      await updateAuditStatus({ clientProjectId, supplierId, invoiceId, status });
    } catch (err: unknown) {
      // Revert on failure
      if (invoice) {
        invoice.auditStatus = previousStatus;
      }
      const message = err instanceof Error ? err.message : 'Αποτυχία ενημέρωσης κατάστασης';
      notify({ message, type: 'error' });
    }
  }

  return {
    invoices,
    loading,
    error,
    groupedBySupplier,
    selectedCount,
    selectedIds,
    isViewed,
    isExported,
    isSelected,
    toggleSelection,
    toggleSupplierSelection,
    selectAll,
    deselectAll,
    loadInvoices,
    getSelectedInvoicePairs,
    markAsViewedLocal,
    setAuditStatus,
  };
}
