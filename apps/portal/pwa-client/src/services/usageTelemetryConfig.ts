import { fetchAndActivate, getBoolean, getRemoteConfig, isSupported, type RemoteConfig } from 'firebase/remote-config';
import { firebaseApp } from '@/services/firebase';

export const TELEMETRY_ENABLED_PARAM = 'telemetry_enabled';
export const TELEMETRY_CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;

let remoteConfigPromise: Promise<RemoteConfig | null> | null = null;
let cachedEnabled = true;
let cachedAtMs = 0;
let cacheInitialized = false;
let hasRemoteValue = false;
let inFlightRefresh: Promise<boolean> | null = null;

const getTelemetryRemoteConfig = async (): Promise<RemoteConfig | null> => {
  if (!remoteConfigPromise) {
    remoteConfigPromise = isSupported()
      .then((supported) => {
        if (!supported) return null;

        const remoteConfig = getRemoteConfig(firebaseApp);
        remoteConfig.defaultConfig = {
          [TELEMETRY_ENABLED_PARAM]: true,
        };
        remoteConfig.settings.minimumFetchIntervalMillis = TELEMETRY_CONFIG_CACHE_TTL_MS;
        return remoteConfig;
      })
      .catch((error) => {
        console.warn('[UsageTelemetry] Remote Config is unavailable', error);
        return null;
      });
  }

  return remoteConfigPromise;
};

export const isTelemetryEnabled = async (nowMs = Date.now()): Promise<boolean> => {
  if (cacheInitialized && nowMs - cachedAtMs < TELEMETRY_CONFIG_CACHE_TTL_MS) {
    return cachedEnabled;
  }

  if (!inFlightRefresh) {
    inFlightRefresh = getTelemetryRemoteConfig()
      .then(async (remoteConfig) => {
        if (!remoteConfig) {
          cachedEnabled = hasRemoteValue ? cachedEnabled : true;
          cachedAtMs = nowMs;
          cacheInitialized = true;
          return cachedEnabled;
        }

        await fetchAndActivate(remoteConfig);
        cachedEnabled = getBoolean(remoteConfig, TELEMETRY_ENABLED_PARAM);
        cachedAtMs = nowMs;
        cacheInitialized = true;
        hasRemoteValue = true;
        return cachedEnabled;
      })
      .catch((error) => {
        console.warn('[UsageTelemetry] Failed to fetch telemetry Remote Config', error);
        cachedEnabled = hasRemoteValue ? cachedEnabled : true;
        cachedAtMs = nowMs;
        cacheInitialized = true;
        return cachedEnabled;
      })
      .finally(() => {
        inFlightRefresh = null;
      });
  }

  return inFlightRefresh;
};

export const resetTelemetryConfigCache = (): void => {
  remoteConfigPromise = null;
  cachedEnabled = true;
  cachedAtMs = 0;
  cacheInitialized = false;
  hasRemoteValue = false;
  inFlightRefresh = null;
};
