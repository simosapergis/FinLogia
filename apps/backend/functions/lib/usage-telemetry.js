import { isUsageTelemetryEnabled } from './telemetry-config.js';

const USAGE_LOG_TYPE = 'usage_event';

const getRole = (user) => {
  if (!user) return undefined;
  return user.isAccountant === true ? 'accountant' : 'business';
};

const getRequestBusinessId = (req) => {
  const bodyBusinessId = req.body?.businessId;
  if (typeof bodyBusinessId === 'string' && bodyBusinessId) return bodyBusinessId;

  const queryBusinessId = req.query?.businessId;
  if (typeof queryBusinessId === 'string' && queryBusinessId) return queryBusinessId;

  const authBusinessId = req.auth?.businessId;
  return typeof authBusinessId === 'string' && authBusinessId ? authBusinessId : undefined;
};

const getRoute = (req) => {
  const route = req.headers?.['x-finlogia-route'];
  if (typeof route === 'string' && route) return route;
  return undefined;
};

const getHttpStatus = (capturedStatus, res) => {
  if (typeof capturedStatus === 'number') return capturedStatus;
  if (typeof res.statusCode === 'number') return res.statusCode;
  return 200;
};

function logUsageEvent(event) {
  try {
    const structuredEvent = {
      severity: 'INFO',
      logType: USAGE_LOG_TYPE,
      ...event,
    };
    console.log(JSON.stringify(structuredEvent));
    return true;
  } catch (error) {
    console.warn('Failed to emit usage telemetry:', error);
    return false;
  }
}

function withUsageTelemetry(functionName, metadata, handler) {
  return async (req, res) => {
    const startMs = Date.now();
    let capturedStatus;
    let responseBody;
    let thrownError = null;

    const originalStatus = typeof res.status === 'function' ? res.status : null;
    const originalJson = typeof res.json === 'function' ? res.json : null;

    if (originalStatus) {
      res.status = (statusCode) => {
        capturedStatus = statusCode;
        return originalStatus.call(res, statusCode);
      };
    }

    if (originalJson) {
      res.json = (body) => {
        responseBody = body;
        return originalJson.call(res, body);
      };
    }

    try {
      return await handler(req, res);
    } catch (error) {
      thrownError = error;
      throw error;
    } finally {
      if (originalStatus) {
        res.status = originalStatus;
      }
      if (originalJson) {
        res.json = originalJson;
      }
      try {
        if (await isUsageTelemetryEnabled()) {
          const httpStatus = thrownError ? 500 : getHttpStatus(capturedStatus, res);
          const resultCount = metadata.resultCount?.(responseBody);
          logUsageEvent({
            eventType: metadata.eventType,
            functionName,
            interactionType: metadata.interactionType,
            backend: 'cloud_function',
            route: getRoute(req),
            businessId: getRequestBusinessId(req),
            uid: req.auth?.uid,
            role: getRole(req.auth),
            status: httpStatus >= 400 || thrownError ? 'error' : 'success',
            ...(typeof resultCount === 'number' ? { resultCount } : {}),
            durationMs: Date.now() - startMs,
          });
        }
      } catch (error) {
        console.warn('Failed to evaluate usage telemetry config:', error);
      }
    }
  };
}

export { USAGE_LOG_TYPE, getRole, logUsageEvent, withUsageTelemetry };
