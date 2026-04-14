import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleInboundEmail } from '../lib/inbound-email.js';
import { db, storage, getBucketName } from '../lib/config.js';
import { sendOcrErrorEmail } from '../lib/email-utils.js';
import fs from 'fs';
import busboy from 'busboy';

// Mock dependencies
vi.mock('firebase-functions/v2/https', () => ({
  onRequest: vi.fn((opts, handler) => handler),
}));

vi.mock('fs', () => {
  return {
    default: {
      createWriteStream: vi.fn(() => {
        return {
          on: vi.fn((event, cb) => {
            if (event === 'finish') cb();
          }),
          end: vi.fn(),
        };
      }),
      unlinkSync: vi.fn(),
      existsSync: vi.fn(() => true),
    }
  };
});

vi.mock('os', () => ({
  default: {
    tmpdir: vi.fn(() => '/tmp'),
  }
}));

vi.mock('node:crypto', () => ({
  default: {
    randomUUID: vi.fn(() => 'mock-uuid'),
  }
}));

vi.mock('../lib/config.js', () => {
  const collectionMock = vi.fn();
  const docMock = vi.fn();
  const getMock = vi.fn();
  const whereMock = vi.fn();
  const limitMock = vi.fn();
  const setMock = vi.fn();

  // Setup chainable mock for db
  collectionMock.mockReturnValue({
    doc: docMock,
    where: whereMock,
  });
  
  docMock.mockReturnValue({
    get: getMock,
    collection: collectionMock,
    set: setMock,
    id: 'mock-invoice-id',
  });
  
  whereMock.mockReturnValue({
    where: whereMock,
    limit: limitMock,
  });
  
  limitMock.mockReturnValue({
    get: getMock,
  });

  const uploadMock = vi.fn().mockResolvedValue([{}]);
  const bucketMock = vi.fn(() => ({
    upload: uploadMock,
  }));

  return {
    getBucketName: vi.fn(() => 'mock-bucket'),
    METADATA_INVOICE_COLLECTION: 'metadata_invoices',
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    db: {
      collection: collectionMock,
    },
    storage: {
      bucket: bucketMock,
    },
  };
});

vi.mock('../lib/email-utils.js', () => ({
  sendOcrErrorEmail: vi.fn().mockResolvedValue(true),
}));

// Mock busboy
vi.mock('busboy', () => {
  return {
    default: vi.fn(),
  };
});

describe('handleInboundEmail', () => {
  let req, res;
  let mockBusboyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      method: 'POST',
      headers: { 'content-type': 'multipart/form-data; boundary=---boundary' },
      pipe: vi.fn(),
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };

    mockBusboyInstance = {
      on: vi.fn(),
      end: vi.fn(),
    };
    busboy.mockReturnValue(mockBusboyInstance);
  });

  const simulateBusboy = async (fields = {}, files = []) => {
    const handlers = {};
    mockBusboyInstance.on.mockImplementation((event, handler) => {
      handlers[event] = handler;
    });

    const promise = new Promise((resolve) => {
      res.send.mockImplementation((msg) => resolve(msg));
    });
    
    // Start the handler
    handleInboundEmail(req, res);

    // Simulate fields
    if (handlers.field) {
      for (const [key, value] of Object.entries(fields)) {
        handlers.field(key, value);
      }
    }

    // Simulate files
    if (handlers.file) {
      for (const file of files) {
        const fileStream = {
          on: vi.fn((event, cb) => {
            if (event === 'end') cb();
          }),
          pipe: vi.fn(),
          resume: vi.fn(),
        };
        handlers.file(file.fieldname, fileStream, { filename: file.filename, mimeType: file.mimeType });
      }
    }

    // Simulate close to trigger the async logic
    if (handlers.close) {
      await handlers.close();
    }

    return promise;
  };

  it('should return 405 for non-POST requests', async () => {
    req.method = 'GET';
    handleInboundEmail(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.send).toHaveBeenCalledWith('Method Not Allowed');
  });

  it('should return 400 if recipient address is invalid', async () => {
    await simulateBusboy({
      to: 'invalid-address@test.com',
      from: 'sender@test.com'
    });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('Invalid recipient address');
    expect(sendOcrErrorEmail).toHaveBeenCalled();
  });

  it('should return 404 if business does not exist', async () => {
    // Mock db to return non-existent business
    db.collection().doc().get.mockResolvedValueOnce({ exists: false });

    await simulateBusboy({
      to: 'upload-testbiz123@office.invoices.finlogia.online',
      from: 'sender@test.com'
    });

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith('Business not found');
    expect(sendOcrErrorEmail).toHaveBeenCalled();
  });

  it('should return 403 if sender is unauthorized', async () => {
    // Mock db to return existing business but unauthorized user
    db.collection().doc().get.mockResolvedValueOnce({ 
      exists: true, 
      data: () => ({ authorizedEmails: [] }) 
    });
    // Mock user query to be empty
    db.collection().where().where().limit().get.mockResolvedValueOnce({ empty: true });

    await simulateBusboy({
      to: 'upload-testbiz123@office.invoices.finlogia.online',
      from: 'unauthorized@test.com'
    });

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Unauthorized sender');
    expect(sendOcrErrorEmail).toHaveBeenCalled();
  });

  it('should return 400 if no valid PDF attachments are found', async () => {
    // Mock db to return existing business and authorized user
    db.collection().doc().get.mockResolvedValueOnce({ 
      exists: true, 
      data: () => ({ authorizedEmails: ['authorized@test.com'] }) 
    });
    db.collection().where().where().limit().get.mockResolvedValueOnce({ empty: true });

    await simulateBusboy(
      {
        to: 'upload-testbiz123@office.invoices.finlogia.online',
        from: 'authorized@test.com'
      },
      [
        { fieldname: 'attachment1', filename: 'image.png', mimeType: 'image/png' }
      ]
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('No valid PDF attachments');
    expect(sendOcrErrorEmail).toHaveBeenCalled();
  });

  it('should process successfully with a valid PDF attachment', async () => {
    // Mock db to return existing business and authorized user
    db.collection().doc().get.mockResolvedValueOnce({ 
      exists: true, 
      data: () => ({ authorizedEmails: ['authorized@test.com'] }) 
    });
    db.collection().where().where().limit().get.mockResolvedValueOnce({ empty: true });

    // Mock the metadata set
    db.collection().doc().set.mockResolvedValueOnce();

    await simulateBusboy(
      {
        to: 'upload-testbiz123@office.invoices.finlogia.online',
        from: 'authorized@test.com'
      },
      [
        { fieldname: 'attachment1', filename: 'invoice.pdf', mimeType: 'application/pdf' }
      ]
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith('OK');
    expect(db.collection().doc().set).toHaveBeenCalled();
    expect(storage.bucket().upload).toHaveBeenCalled();
  });
});
