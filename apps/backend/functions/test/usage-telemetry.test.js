import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recordUsageEvent_v2 } from '../index.js';
import { logUsageEvent, withUsageTelemetry } from '../lib/usage-telemetry.js';
import * as auth from '../lib/auth.js';

vi.mock('../lib/auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    authenticateRequest: vi.fn(),
  };
});

vi.mock('../lib/config.js', () => ({
  admin: {},
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({ exists: false }),
      })),
    })),
  },
  storage: {},
  REGION: 'europe-west3',
  SERVICE_ACCOUNT_EMAIL: 'test@test.com',
  GCS_BUCKET: 'test-bucket',
  UPLOADS_PREFIX: 'uploads/',
  METADATA_INVOICE_COLLECTION: 'metadata_invoices',
  SIGNED_URL_TTL_MS: 3600000,
  PAYMENT_STATUS: {},
  serverTimestamp: vi.fn(),
  getBucketName: vi.fn(() => 'test-bucket'),
  getAthensToday: vi.fn(),
}));

const createResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
  set: vi.fn(),
  on: vi.fn(),
  setHeader: vi.fn(),
  getHeader: vi.fn(),
  end: vi.fn(),
});

describe('usage telemetry', () => {
  let consoleLogSpy;
  let consoleWarnSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('emits exactly one structured usage_event', () => {
    const emitted = logUsageEvent({
      eventType: 'financial_report_requested',
      functionName: 'getFinancialReport_v2',
      interactionType: 'read',
      backend: 'cloud_function',
      businessId: 'businessA',
      uid: 'user1',
      role: 'business',
      status: 'success',
      resultCount: 3,
      durationMs: 12,
    });

    expect(emitted).toBe(true);
    expect(consoleLogSpy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(payload).toMatchObject({
      logType: 'usage_event',
      eventType: 'financial_report_requested',
      functionName: 'getFinancialReport_v2',
      businessId: 'businessA',
      resultCount: 3,
    });
  });

  it('does not change the wrapped function response when telemetry logging fails', async () => {
    consoleLogSpy.mockImplementation(() => {
      throw new Error('logging unavailable');
    });

    const handler = withUsageTelemetry(
      'testFunction_v2',
      { eventType: 'test_event', interactionType: 'read' },
      async (_req, res) => res.status(200).json({ success: true })
    );
    const req = { method: 'POST', headers: {}, body: { businessId: 'businessA' } };
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to emit usage telemetry:', expect.any(Error));
  });

  it('accepts authenticated frontend Firestore telemetry for the user business', async () => {
    auth.authenticateRequest.mockResolvedValue({
      user: { uid: 'user1', businessId: 'businessA' },
    });
    const req = {
      method: 'POST',
      headers: {},
      body: {
        eventType: 'invoices_list_requested',
        interactionType: 'read',
        backend: 'firestore',
        route: '/expenses',
        businessId: 'businessA',
        status: 'success',
        resultCount: 42,
        durationMs: 310,
      },
    };
    const res = createResponse();

    await recordUsageEvent_v2(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({ success: true });
    const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(payload).toMatchObject({
      logType: 'usage_event',
      functionName: 'direct_firestore',
      backend: 'firestore',
      businessId: 'businessA',
      uid: 'user1',
      role: 'business',
      resultCount: 42,
    });
  });

  it('rejects unauthenticated frontend telemetry', async () => {
    auth.authenticateRequest.mockResolvedValue({
      error: 'Missing or invalid Authorization header',
      status: 401,
    });
    const req = { method: 'POST', headers: {}, body: {} };
    const res = createResponse();

    await recordUsageEvent_v2(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('rejects frontend telemetry for another business unless the user is an accountant', async () => {
    auth.authenticateRequest.mockResolvedValue({
      user: { uid: 'user1', businessId: 'businessA' },
    });
    const req = {
      method: 'POST',
      headers: {},
      body: {
        eventType: 'invoices_list_requested',
        interactionType: 'read',
        backend: 'firestore',
        businessId: 'businessB',
        status: 'success',
      },
    };
    const res = createResponse();

    await recordUsageEvent_v2(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  it('allows accountant frontend telemetry for a client business', async () => {
    auth.authenticateRequest.mockResolvedValue({
      user: { uid: 'accountant1', isAccountant: true },
    });
    const req = {
      method: 'POST',
      headers: {},
      body: {
        eventType: 'client_invoices_requested',
        interactionType: 'read',
        backend: 'firestore',
        businessId: 'clientBusiness',
        status: 'success',
      },
    };
    const res = createResponse();

    await recordUsageEvent_v2(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    const payload = JSON.parse(consoleLogSpy.mock.calls[0][0]);
    expect(payload).toMatchObject({
      businessId: 'clientBusiness',
      uid: 'accountant1',
      role: 'accountant',
    });
  });
});
