import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import InvoiceBatchCard from '../InvoiceBatchCard.vue';
import type { BatchInvoice } from '@/composables/useInvoiceUpload';

describe('InvoiceBatchCard.vue', () => {
  const mockInvoice: BatchInvoice = {
    id: 'test-id-1',
    type: 'pdf',
    totalPages: 1,
    isPaid: false,
    status: 'pending',
    pages: [
      {
        id: 'page-1',
        file: new File([''], 'test.pdf', { type: 'application/pdf' }),
        name: 'test.pdf',
        pageNumber: 1,
        status: 'pending',
        progress: 0,
      },
    ],
  };

  it('renders correctly for a PDF invoice', () => {
    const wrapper = mount(InvoiceBatchCard, {
      props: {
        invoice: mockInvoice,
        index: 0,
      },
    });

    expect(wrapper.text()).toContain('PDF');
    expect(wrapper.text()).toContain('Τιμολόγιο 1');
    expect(wrapper.text()).toContain('test.pdf');
  });

  it('renders correctly for an Image invoice', () => {
    const imageInvoice: BatchInvoice = {
      ...mockInvoice,
      type: 'image',
      totalPages: 2,
    };

    const wrapper = mount(InvoiceBatchCard, {
      props: {
        invoice: imageInvoice,
        index: 1,
      },
    });

    expect(wrapper.text()).toContain('IMG');
    expect(wrapper.text()).toContain('Τιμολόγιο 2');
    expect(wrapper.text()).toContain('2 σελίδες');
  });

  it('emits remove event when remove button is clicked', async () => {
    const wrapper = mount(InvoiceBatchCard, {
      props: {
        invoice: mockInvoice,
        index: 0,
      },
    });

    const removeButton = wrapper.find('button[title="Αφαίρεση"]');
    expect(removeButton.exists()).toBe(true);

    await removeButton.trigger('click');

    expect(wrapper.emitted('remove')).toBeTruthy();
    expect(wrapper.emitted('remove')?.[0]).toEqual(['test-id-1']);
  });

  it('does not show remove button if status is uploading or completed', () => {
    const uploadingInvoice: BatchInvoice = { ...mockInvoice, status: 'uploading' };
    const wrapper = mount(InvoiceBatchCard, {
      props: {
        invoice: uploadingInvoice,
        index: 0,
      },
    });

    const removeButton = wrapper.find('button[title="Αφαίρεση"]');
    expect(removeButton.exists()).toBe(false);
  });

  it('emits update:isPaid event when checkbox is toggled', async () => {
    const wrapper = mount(InvoiceBatchCard, {
      props: {
        invoice: mockInvoice,
        index: 0,
      },
    });

    const checkbox = wrapper.find('input[type="checkbox"]');
    await checkbox.setValue(true);

    expect(wrapper.emitted('update:isPaid')).toBeTruthy();
    expect(wrapper.emitted('update:isPaid')?.[0]).toEqual(['test-id-1', true]);
  });

  it('disables checkbox if status is uploading or completed', () => {
    const uploadingInvoice: BatchInvoice = { ...mockInvoice, status: 'uploading' };
    const wrapper = mount(InvoiceBatchCard, {
      props: {
        invoice: uploadingInvoice,
        index: 0,
      },
    });

    const checkbox = wrapper.find('input[type="checkbox"]');
    expect(checkbox.attributes('disabled')).toBeDefined();
  });

  it('displays status label correctly', () => {
    const completedInvoice: BatchInvoice = { ...mockInvoice, status: 'completed' };
    const wrapper = mount(InvoiceBatchCard, {
      props: {
        invoice: completedInvoice,
        index: 0,
      },
    });

    expect(wrapper.text()).toContain('Ολοκληρώθηκε');
  });
});
