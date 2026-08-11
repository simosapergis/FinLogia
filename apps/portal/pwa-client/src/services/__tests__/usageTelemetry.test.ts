import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { recordDirectFirestoreUsage } from '@/services/usageTelemetry';
import { useUserStore } from '@/store/userStore';
import * as usageTelemetryConfig from '@/services/usageTelemetryConfig';

vi.mock('@/services/api/apiClient', () => ({
  getAuthToken: vi.fn().mockResolvedValue('token-1'),
  buildUrl: (path: string) => `https://functions.example${path}`,
}));

vi.mock('@/services/usageTelemetryConfig', () => ({
  isTelemetryEnabled: vi.fn(),
}));

describe('usageTelemetry', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(usageTelemetryConfig.isTelemetryEnabled).mockResolvedValue(true);
    const userStore = useUserStore();
    userStore.businessId = 'businessA';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 202 }));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    window.history.pushState({}, '', '/expenses');
  });

  it('records populated direct Firestore telemetry after a successful action', async () => {
    const result = await recordDirectFirestoreUsage(
      { eventType: 'invoices_list_requested', interactionType: 'read' },
      async () => ['a', 'b'],
      (items) => items.length
    );

    expect(result).toEqual(['a', 'b']);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(body).toMatchObject({
      eventType: 'invoices_list_requested',
      interactionType: 'read',
      backend: 'firestore',
      route: '/expenses',
      businessId: 'businessA',
      status: 'success',
      resultCount: 2,
    });
    expect(typeof body.durationMs).toBe('number');
  });

  it('does not fail the original action when telemetry fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network unavailable'));

    const result = await recordDirectFirestoreUsage(
      { eventType: 'suppliers_list_requested', interactionType: 'read' },
      async () => ['supplier']
    );

    expect(result).toEqual(['supplier']);
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalled());
  });

  it('does not send direct Firestore telemetry when Remote Config disables telemetry', async () => {
    vi.mocked(usageTelemetryConfig.isTelemetryEnabled).mockResolvedValue(false);

    const result = await recordDirectFirestoreUsage(
      { eventType: 'invoices_list_requested', interactionType: 'read' },
      async () => ['invoice']
    );

    expect(result).toEqual(['invoice']);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves the original action error while recording an error event', async () => {
    const originalError = new Error('firestore denied');

    await expect(
      recordDirectFirestoreUsage(
        { eventType: 'suppliers_list_requested', interactionType: 'read' },
        async () => {
          throw originalError;
        }
      )
    ).rejects.toBe(originalError);

    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init?.body as string);
    expect(body.status).toBe('error');
  });
});
