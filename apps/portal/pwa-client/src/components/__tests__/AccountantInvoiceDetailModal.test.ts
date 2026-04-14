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

import AccountantInvoiceDetailModal from '../AccountantInvoiceDetailModal.vue';

describe('AccountantInvoiceDetailModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should emit update:auditStatus when audit status button is clicked', async () => {
    const wrapper = mount(AccountantInvoiceDetailModal, {
      props: {
        visible: true,
        invoice: {
          id: 'inv123',
          supplierId: 'supp456',
          supplierName: 'Test Supplier',
          invoiceNumber: 'INV-001',
          totalAmount: 1000,
          paidAmount: 0,
          unpaidAmount: 1000,
          paymentStatus: 'unpaid',
        },
        auditStatus: null,
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: true,
          Loader: true,
          X: true,
          Check: true,
          AlertCircle: true,
          FileText: true,
          Download: true,
          Eye: true,
          Clock: true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    // Find the button that sets the audit status to 'registered'
    const auditBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Καταχωρήθηκε');
    if (auditBtn) {
      await auditBtn.trigger('click');
    }

    expect(wrapper.emitted()).toHaveProperty('update:auditStatus');
    const auditEvents = wrapper.emitted('update:auditStatus');
    expect(auditEvents?.[0]).toEqual(['registered']);
  });
});
