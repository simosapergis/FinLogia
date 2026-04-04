import { vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// Mock firebase-admin to prevent initializeApp() and Firestore connections
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('firebase-admin', () => {
  function firestoreFn() {
    return { collection: vi.fn(), doc: vi.fn() };
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
    arrayUnion: (...args) => ({ _type: 'arrayUnion', values: args }),
  };

  return {
    default: {
      initializeApp: vi.fn(),
      firestore: firestoreFn,
      app: () => ({
        options: {
          projectId: 'mock-project-id',
        },
      }),
    },
  };
});

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Google Cloud services (must use class/function, not arrow functions)
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('@google-cloud/storage', () => ({
  Storage: class MockStorage {
    bucket() {
      return { file: vi.fn() };
    }
  },
}));

vi.mock('@google-cloud/vertexai', () => ({
  VertexAI: class MockVertexAI {
    constructor() {
      this.preview = {
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockResolvedValue({
            response: {
              candidates: [
                {
                  content: {
                    parts: [{ text: '{}' }],
                  },
                },
              ],
            },
          }),
        }),
      };
    }
  },
}));

// ═══════════════════════════════════════════════════════════════════════════════
// Mock firebase-functions/params (defineString evaluated lazily)
// ═══════════════════════════════════════════════════════════════════════════════

vi.mock('firebase-functions/params', () => ({
  defineString: (name, options) => ({
    value: () => options?.default || `mock-${name}`,
  }),
}));
