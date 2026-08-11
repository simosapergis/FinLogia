import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TELEMETRY_CONFIG_CACHE_TTL_MS,
  isUsageTelemetryEnabled,
  resetUsageTelemetryConfigCache,
} from '../lib/telemetry-config.js';

const getTemplateMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/config.js', () => ({
  admin: {
    remoteConfig: () => ({
      getTemplate: getTemplateMock,
    }),
  },
}));

describe('telemetry Remote Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetUsageTelemetryConfigCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when telemetry_enabled is false', async () => {
    getTemplateMock.mockResolvedValue({
      parameters: {
        telemetry_enabled: {
          defaultValue: { value: 'false' },
        },
      },
    });

    await expect(isUsageTelemetryEnabled(1000)).resolves.toBe(false);
  });

  it('defaults to enabled when Remote Config cannot be fetched before any remote value exists', async () => {
    getTemplateMock.mockRejectedValue(new Error('remote config unavailable'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(isUsageTelemetryEnabled(1000)).resolves.toBe(true);
  });

  it('keeps a cached disabled value when the next refresh fails', async () => {
    getTemplateMock.mockResolvedValueOnce({
      parameters: {
        telemetry_enabled: {
          defaultValue: { value: 'false' },
        },
      },
    });
    getTemplateMock.mockRejectedValueOnce(new Error('remote config unavailable'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await expect(isUsageTelemetryEnabled(1000)).resolves.toBe(false);
    await expect(isUsageTelemetryEnabled(1000 + TELEMETRY_CONFIG_CACHE_TTL_MS + 1)).resolves.toBe(false);
  });
});
