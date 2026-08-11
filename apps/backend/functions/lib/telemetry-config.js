import { admin } from './config.js';

const TELEMETRY_ENABLED_PARAM = 'telemetry_enabled';
const TELEMETRY_CONFIG_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedEnabled = true;
let cachedAtMs = 0;
let cacheInitialized = false;
let hasRemoteValue = false;
let inFlightRefresh = null;

const parseBooleanParam = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return true;
  return value.toLowerCase() !== 'false';
};

const getRemoteConfigValue = async () => {
  const template = await admin.remoteConfig().getTemplate();
  return parseBooleanParam(template?.parameters?.[TELEMETRY_ENABLED_PARAM]?.defaultValue?.value);
};

async function isUsageTelemetryEnabled(nowMs = Date.now()) {
  if (cacheInitialized && nowMs - cachedAtMs < TELEMETRY_CONFIG_CACHE_TTL_MS) {
    return cachedEnabled;
  }

  if (!inFlightRefresh) {
    inFlightRefresh = getRemoteConfigValue()
      .then((enabled) => {
        cachedEnabled = enabled;
        cachedAtMs = nowMs;
        cacheInitialized = true;
        hasRemoteValue = true;
        return enabled;
      })
      .catch((error) => {
        console.warn('Failed to fetch telemetry Remote Config:', error);
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
}

function resetUsageTelemetryConfigCache() {
  cachedEnabled = true;
  cachedAtMs = 0;
  cacheInitialized = false;
  hasRemoteValue = false;
  inFlightRefresh = null;
}

export {
  TELEMETRY_ENABLED_PARAM,
  TELEMETRY_CONFIG_CACHE_TTL_MS,
  isUsageTelemetryEnabled,
  resetUsageTelemetryConfigCache,
};
