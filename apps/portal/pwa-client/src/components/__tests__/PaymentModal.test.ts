import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import PaymentModal from '../PaymentModal.vue';

describe('PaymentModal.vue', () => {
  beforeEach(() => {
    // any setup
  });

  it('should emit submit event with correct payload when form is submitted', async () => {
    const wrapper = mount(PaymentModal, {
      props: {
        isOpen: true,
        invoiceId: 'inv123',
        supplierId: 'supp456',
        supplierName: 'Test Supplier',
        totalAmount: 1000,
        status: 'form',
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: true,
          Loader: true,
          X: true,
          Banknote: true,
          CreditCard: true,
          Landmark: true,
          FileText: true,
          Check: true,
          AlertCircle: true,
        },
      },
    });

    // Wait for DOM updates
    await wrapper.vm.$nextTick();

    // Find the amount input and set a value
    const amountInput = wrapper.find('input[type="number"]');
    await amountInput.setValue(500);

    // Submit form by clicking the button
    const submitBtn = wrapper.findAll('button').find(b => b.text().includes('Καταχώρηση Πληρωμής'));
    if (submitBtn) {
      await submitBtn.trigger('click');
    }

    // Verify emitted event
    expect(wrapper.emitted()).toHaveProperty('submit');
    const submitEvents = wrapper.emitted('submit');
    expect(submitEvents?.[0]).toEqual([{
      invoiceId: 'inv123',
      supplierId: 'supp456',
      amount: 500,
      creditInvoiceId: undefined,
      creditAmountUsed: undefined,
    }]);
  });
});

