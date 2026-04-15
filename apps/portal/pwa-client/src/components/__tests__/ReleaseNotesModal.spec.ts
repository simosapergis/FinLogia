import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ReleaseNotesModal from '../ReleaseNotesModal.vue';

describe('ReleaseNotesModal.vue', () => {
  const mockNotes = [
    { version: '1.3.0', date: '2026-05-01', notes: 'New feature 3\n- Bullet 3' },
    { version: '1.2.0', date: '2026-04-15', notes: 'New feature 2\n- Bullet 2' },
    { version: '1.1.0', date: '2026-04-01', notes: 'New feature 1\n- Bullet 1' },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockNotes),
    });
  });

  it('should render only notes newer than previousVersion', async () => {
    const wrapper = mount(ReleaseNotesModal, {
      props: {
        previousVersion: '1.1.0',
      },
    });

    // Wait for fetch and DOM update
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    const text = wrapper.text();
    expect(text).toContain('1.3.0');
    expect(text).toContain('1.2.0');
    expect(text).not.toContain('1.1.0'); // Should be filtered out
  });

  it('should render all notes if previousVersion is not found', async () => {
    const wrapper = mount(ReleaseNotesModal, {
      props: {
        previousVersion: '0.9.0', // Not in the array
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    const text = wrapper.text();
    expect(text).toContain('1.3.0');
    expect(text).toContain('1.2.0');
    expect(text).toContain('1.1.0');
  });

  it('emits close event when close button is clicked', async () => {
    const wrapper = mount(ReleaseNotesModal, {
      props: {
        previousVersion: '1.2.0',
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    const closeButton = wrapper.find('button'); // The X button
    await closeButton.trigger('click');

    // Wait for transition timeout
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(wrapper.emitted()).toHaveProperty('close');
  });
});
