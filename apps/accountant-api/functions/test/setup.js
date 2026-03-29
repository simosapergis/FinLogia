import { vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock firebase-admin
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('firebase-admin', () => {
  const mockCollection = vi.fn(() => ({
    doc: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({ exists: false, data: () => null })),
      set: vi.fn(() => Promise.resolve()),
      update: vi.fn(() => Promise.resolve()),
      collection: mockCollection,
    })),
    where: vi.fn(() => ({
      where: vi.fn(),
      get: vi.fn(() => Promise.resolve({ docs: [] })),
      orderBy: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ docs: [] })),
      })),
    })),
    get: vi.fn(() => Promise.resolve({ docs: [] })),
  }));

  function firestoreFn() {
    return {
      collection: mockCollection,
      collectionGroup: vi.fn(() => ({
        where: vi.fn(() => ({
          where: vi.fn(),
          orderBy: vi.fn(() => ({
            get: vi.fn(() => Promise.resolve({ docs: [] })),
          })),
          get: vi.fn(() => Promise.resolve({ docs: [] })),
        })),
      })),
      getAll: vi.fn(() => Promise.resolve([])),
    };
  }

  firestoreFn.Timestamp = {
    fromDate: (date) => ({
      toDate: () => date,
      _seconds: Math.floor(date.getTime() / 1000),
      _nanoseconds: 0,
    }),
    now: () => {
      const now = new Date();
      return {
        toDate: () => now,
        _seconds: Math.floor(now.getTime() / 1000),
        _nanoseconds: 0,
      };
    },
  };

  firestoreFn.FieldValue = {
    serverTimestamp: () => ({ _type: 'serverTimestamp' }),
    increment: (n) => ({ _type: 'increment', value: n }),
    arrayUnion: (...args) => ({ _type: 'arrayUnion', values: args }),
  };

  const mockAuth = {
    verifyIdToken: vi.fn(),
  };

  return {
    default: {
      initializeApp: vi.fn(),
      firestore: firestoreFn,
      auth: () => mockAuth,
      credential: {
        applicationDefault: vi.fn(() => ({})),
      },
    },
  };
});

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Google Cloud Storage
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('@google-cloud/storage', () => ({
  Storage: class MockStorage {
    bucket() {
      return {
        file: vi.fn(() => ({
          getSignedUrl: vi.fn(() => Promise.resolve(['https://mock-signed-url.example.com'])),
          createReadStream: vi.fn(),
          createWriteStream: vi.fn(),
        })),
      };
    }
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Mock firebase-functions/params
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('firebase-functions/params', () => ({
  defineString: (name, options) => ({
    value: () => options?.default || `mock-${name}`,
  }),
}));
