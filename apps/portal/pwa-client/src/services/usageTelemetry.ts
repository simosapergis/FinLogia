import { getAuthToken, buildUrl } from '@/services/api/apiClient';
import { useUserStore } from '@/store/userStore';

type InteractionType = 'read' | 'write';
type UsageStatus = 'success' | 'error';

interface UsageTelemetryEvent {
  eventType: string;
  interactionType: InteractionType;
  businessId?: string | null;
  status: UsageStatus;
  resultCount?: number;
  durationMs?: number;
}

const RECORD_USAGE_EVENT_PATH = import.meta.env.VITE_RECORD_USAGE_EVENT_PATH ?? '/recordUsageEvent_v2';

const getRoute = (): string => window.location.pathname;

export const recordUsageEvent = async (event: UsageTelemetryEvent): Promise<void> => {
  const userStore = useUserStore();
  const businessId = event.businessId ?? userStore.currentBusinessId;

  if (!businessId) {
    return;
  }

  try {
    const token = await getAuthToken();
    const response = await fetch(buildUrl(RECORD_USAGE_EVENT_PATH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Finlogia-Route': getRoute(),
      },
      body: JSON.stringify({
        eventType: event.eventType,
        interactionType: event.interactionType,
        backend: 'firestore',
        route: getRoute(),
        businessId,
        status: event.status,
        ...(typeof event.resultCount === 'number' ? { resultCount: event.resultCount } : {}),
        ...(typeof event.durationMs === 'number' ? { durationMs: event.durationMs } : {}),
      }),
    });

    if (!response.ok) {
      console.warn('[UsageTelemetry] Failed to record usage event', response.status);
    }
  } catch (error) {
    console.warn('[UsageTelemetry] Failed to record usage event', error);
  }
};

export const recordDirectFirestoreUsage = async <T>(
  event: Omit<UsageTelemetryEvent, 'status' | 'durationMs' | 'resultCount'>,
  action: () => Promise<T>,
  resultCount: (result: T) => number | undefined = () => undefined
): Promise<T> => {
  const startedAt = performance.now();

  try {
    const result = await action();
    let count: number | undefined;
    try {
      count = resultCount(result);
    } catch (error) {
      console.warn('[UsageTelemetry] Failed to derive result count', error);
    }
    void recordUsageEvent({
      ...event,
      status: 'success',
      resultCount: count,
      durationMs: Math.round(performance.now() - startedAt),
    });
    return result;
  } catch (error) {
    void recordUsageEvent({
      ...event,
      status: 'error',
      durationMs: Math.round(performance.now() - startedAt),
    });
    throw error;
  }
};
