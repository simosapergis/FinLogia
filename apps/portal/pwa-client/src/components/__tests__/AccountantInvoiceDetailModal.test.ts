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
}));

vi.mock('@/services/notifications', () => ({
  notify: vi.fn(),
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
        clientProjectId: 'test-business',
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

  it('does not render a delete control', async () => {
    const wrapper = mount(AccountantInvoiceDetailModal, {
      props: {
        visible: true,
        clientProjectId: 'test-business',
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

    expect(wrapper.findAll('button').some(button => button.attributes('title') === 'Διαγραφή')).toBe(false);
    expect(wrapper.text()).not.toContain('Διαγραφή Τιμολογίου');
  });
});
