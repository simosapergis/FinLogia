import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
}));

vi.mock('@/services/api/invoicesApi', () => ({
  recordInvoiceView: vi.fn().mockResolvedValue({ success: true }),
  deleteInvoice: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/services/notifications', () => ({
  notify: vi.fn(),
}));

import AccountantInvoiceDetailModal from '../AccountantInvoiceDetailModal.vue';
import { deleteInvoice } from '@/services/api/invoicesApi';

describe('AccountantInvoiceDetailModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should emit update:auditStatus when audit status button is clicked', async () => {
    const wrapper = mount(AccountantInvoiceDetailModal, {
      props: {
        visible: true,
        clientProjectId: 'test-business',
        supplierId: 'test-supplier',
        invoiceId: 'inv123',
        bucketName: 'test-bucket',
        auditStatus: null,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: true,
          Loader: true,
          X: true,
          XIcon: true,
          Check: true,
          Trash2: true,
          AlertCircle: true,
          FileText: true,
          Download: true,
          Eye: true,
          Clock: true,
          StatusBadge: true,
          ExternalLink: true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    const auditBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Καταχωρήθηκε');
    if (auditBtn) {
      await auditBtn.trigger('click');
    }

    expect(wrapper.emitted()).toHaveProperty('update:auditStatus');
    const auditEvents = wrapper.emitted('update:auditStatus');
    expect(auditEvents?.[0]).toEqual(['registered']);
  });

  it('should show delete confirmation and emit deleted when confirmed', async () => {
    const wrapper = mount(AccountantInvoiceDetailModal, {
      props: {
        visible: true,
        clientProjectId: 'test-business',
        supplierId: 'test-supplier',
        invoiceId: 'inv123',
        bucketName: 'test-bucket',
        auditStatus: null,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: true,
          Loader: true,
          X: true,
          XIcon: true,
          Check: true,
          Trash2: true,
          AlertCircle: true,
          FileText: true,
          Download: true,
          Eye: true,
          Clock: true,
          StatusBadge: true,
          ExternalLink: true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    const deleteBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Διαγραφή');
    expect(deleteBtn).toBeDefined();
    await deleteBtn?.trigger('click');

    // Wait for state update (showDeleteConfirm = true)
    await wrapper.vm.$nextTick();

    // The confirmation dialog should now be visible. Click the confirm button.
    const buttons = wrapper.findAll('button');
    const confirmBtn = buttons.find(b => b.text().includes('Διαγραφή'));
    expect(confirmBtn).toBeDefined();
    await confirmBtn?.trigger('click');

    // Wait for the async API call to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(deleteInvoice).toHaveBeenCalledWith({ businessId: 'test-business', invoiceId: 'inv123' });
    expect(wrapper.emitted()).toHaveProperty('deleted');
    expect(wrapper.emitted('deleted')?.[0]).toEqual(['inv123']);
  });
});
