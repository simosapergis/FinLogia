import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleInboundEmail } from '../lib/inbound-email.js';
import * as config from '../lib/config.js';
import busboy from 'busboy';

vi.mock('busboy');
vi.mock('fs');

vi.mock('../lib/config.js', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            id: 'new-invoice-id',
            set: vi.fn(),
          })),
        })),
      })),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ empty: false, docs: [{ id: 'user1' }] }),
    })),
  },
  storage: {
    bucket: vi.fn(() => ({
      upload: vi.fn(),
    })),
  },
  getBucketName: vi.fn(() => 'test-bucket'),
  METADATA_INVOICE_COLLECTION: 'metadata_invoices',
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('../lib/email-utils.js', () => ({
  sendOcrSuccessEmail: vi.fn(),
  sendOcrErrorEmail: vi.fn(),
}));

describe('inbound-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create metadata document with isPaidAtUpload: true', async () => {
    // Mock busboy behavior
    const mockBb = {
      on: vi.fn((event, callback) => {
        if (event === 'field') {
          callback('to', 'upload-bus1@office.invoices.finlogia.online');
          callback('from', 'test@test.com');
        }
        if (event === 'file') {
          const mockFile = {
            pipe: vi.fn(),
            on: vi.fn((e, cb) => { if (e === 'end') cb(); }),
            resume: vi.fn(),
          };
          callback('file', mockFile, { filename: 'test.pdf', mimeType: 'application/pdf' });
        }
        if (event === 'close') {
          // We will call this manually
        }
      }),
      end: vi.fn(),
    };
    busboy.mockReturnValue(mockBb);

    const req = { method: 'POST', headers: {}, rawBody: Buffer.from('') };
    const res = { status: vi.fn().mockReturnThis(), send: vi.fn() };

    // Mock business exists
    config.db.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ authorizedEmails: [] }),
        }),
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            id: 'new-invoice-id',
            set: vi.fn()
          })
        })
      }),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({ empty: false, docs: [{ id: 'user1' }] }),
    });

    // Mock file write stream
    const fs = await import('fs');
    fs.createWriteStream.mockReturnValue({
      end: vi.fn(),
      on: vi.fn((e, cb) => { if (e === 'finish') cb(); }),
    });
    fs.unlinkSync.mockImplementation(() => {});

    // Call the function
    handleInboundEmail(req, res);

    // Trigger close event
    const closeCallback = mockBb.on.mock.calls.find(call => call[0] === 'close')[1];
    await closeCallback();

    // Check if metadata was created with isPaidAtUpload: true
    // Wait a tick for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // In our mock, db.collection().doc().collection().doc().set is the one
    const setMock = config.db.collection().doc().collection().doc().set;
    expect(setMock).toHaveBeenCalled();
    const payload = setMock.mock.calls[0][0];
    expect(payload.isPaidAtUpload).toBe(true);
  });
});
