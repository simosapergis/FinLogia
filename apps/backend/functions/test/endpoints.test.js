import { describe, it, expect, vi, beforeEach } from 'vitest';
import { addFinancialEntry_v2, updatePaymentStatus_v2, createClientBusiness_v2, addUserToBusiness_v2, addAccountant_v2, processRecurringExpenses_v2 } from '../index.js';
import * as auth from '../lib/auth.js';
import * as financial from '../lib/financial.js';
import * as payments from '../lib/payments.js';

// Mock the auth module
vi.mock('../lib/auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    authenticateRequest: vi.fn(),
    getUserDisplayName: vi.fn(),
  };
});

// Mock the config module to avoid initializing Firebase Admin during tests
vi.mock('../lib/config.js', () => {
  return {
    admin: {
      firestore: {
        Timestamp: {
          now: vi.fn(() => ({ toDate: () => new Date() })),
          fromDate: vi.fn((date) => ({ toDate: () => date })),
        },
        FieldValue: {
          serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
          arrayUnion: vi.fn((val) => ['ARRAY_UNION', val]),
        },
      },
    },
    db: {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({
          collection: vi.fn(() => ({
            add: vi.fn(() => Promise.resolve({ id: 'new-doc-id' })),
            doc: vi.fn(() => ({
              get: vi.fn(),
              update: vi.fn(),
            })),
          })),
        })),
      })),
      collectionGroup: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({ empty: true }),
      }),
      batch: vi.fn(() => ({
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn(),
      })),
      runTransaction: vi.fn(async (callback) => {
        const tx = {
          getAll: vi.fn(),
          get: vi.fn(),
          update: vi.fn(),
        };
        return await callback(tx);
      }),
    },
    storage: {},
    REGION: 'europe-west3',
    SERVICE_ACCOUNT_EMAIL: 'test@test.com',
    GCS_BUCKET: 'test-bucket',
    UPLOADS_PREFIX: 'uploads/',
    METADATA_INVOICE_COLLECTION: 'metadata_invoices',
    SIGNED_URL_TTL_MS: 3600000,
    PAYMENT_STATUS: {
      paid: 'paid',
      unpaid: 'unpaid',
      partial: 'partial',
    },
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    getBucketName: vi.fn(() => 'test-bucket'),
    getAthensToday: vi.fn(() => ({ utcDate: new Date(), dayOfMonth: 1 })),
  };
});

describe('API Endpoints & Business Logic', () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    
    req = {
      method: 'POST',
      headers: {
        origin: 'http://localhost:5173',
      },
      body: {},
    };
    
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      set: vi.fn(),
      on: vi.fn(),
      setHeader: vi.fn(),
      getHeader: vi.fn(),
      end: vi.fn(),
    };
  });

  describe('addFinancialEntry_v2', () => {
    it('should reject requests with malformed data (Input Validation)', async () => {
      // Mock authenticated user
      auth.authenticateRequest.mockResolvedValue({
        user: { uid: 'user1', businessId: 'businessA' }
      });

      // Malformed body: amount is a string instead of a number
      req.body = {
        businessId: 'businessA',
        type: 'expense',
        category: 'office_supplies',
        amount: 'one hundred dollars', // Invalid
        date: '2023-10-01',
      };

      await addFinancialEntry_v2(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Validation failed',
      }));
    });

    it('should reject requests if user belongs to a different business (Authorization)', async () => {
      // Mock authenticated user belonging to businessB
      auth.authenticateRequest.mockResolvedValue({
        user: { uid: 'user1', businessId: 'businessB' }
      });

      req.body = {
        businessId: 'businessA',
        type: 'expense',
        category: 'ΑΛΛΑ',
        amount: 100,
        date: '2023-10-01',
      };

      await addFinancialEntry_v2(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized access to this business',
      }));
    });

    it('should successfully add a financial entry when valid', async () => {
      auth.authenticateRequest.mockResolvedValue({
        user: { uid: 'user1', businessId: 'businessA' }
      });
      auth.getUserDisplayName.mockReturnValue('Test User');

      req.body = {
        businessId: 'businessA',
        type: 'expense',
        category: 'ΑΛΛΑ',
        amount: 100,
        date: '2023-10-01',
      };

      await addFinancialEntry_v2(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });
  });

  describe('updatePaymentStatus_v2', () => {
    it('should reject requests with malformed data', async () => {
      auth.authenticateRequest.mockResolvedValue({
        user: { uid: 'user1', businessId: 'businessA' }
      });

      req.body = {
        businessId: 'businessA',
        supplierId: 'supp1',
        invoiceId: 'inv1',
        action: 'invalid_action', // Invalid action
      };

      await updatePaymentStatus_v2(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Validation failed',
      }));
    });

    it('should reject requests if user belongs to a different business', async () => {
      auth.authenticateRequest.mockResolvedValue({
        user: { uid: 'user1', businessId: 'businessB' }
      });

      req.body = {
        businessId: 'businessA',
        supplierId: 'supp1',
        invoiceId: 'inv1',
        action: 'pay',
      };

      await updatePaymentStatus_v2(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Unauthorized access to this business',
      }));
    });

    it('should allow accountant to update payment status', async () => {
      auth.authenticateRequest.mockResolvedValue({
        user: { uid: 'acc1', isAccountant: true }
      });
      auth.getUserDisplayName.mockReturnValue('Accountant User');

      // Mock the transaction to succeed
      const mockTx = {
        getAll: vi.fn().mockResolvedValue([
          { exists: true, data: () => ({ totalAmount: 100, paidAmount: 0, paymentStatus: 'unpaid' }) }
        ]),
        update: vi.fn(),
      };
      
      const configModule = await import('../lib/config.js');
      configModule.db.runTransaction.mockImplementationOnce(async (callback) => {
        return await callback(mockTx);
      });

      req.body = {
        businessId: 'businessA',
        supplierId: 'supp1',
        invoiceId: 'inv1',
        action: 'pay',
      };

      await updatePaymentStatus_v2(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });
  });

  describe('updatePaymentStatus_v2 - Settlement Date', () => {
    it('should update settlementDate when invoice becomes fully paid', async () => {
      auth.authenticateRequest.mockResolvedValue({
        user: { uid: 'user1', businessId: 'businessA' }
      });
      auth.getUserDisplayName.mockReturnValue('Test User');

      const mockTx = {
        getAll: vi.fn().mockResolvedValue([
          { 
            exists: true, 
            data: () => ({ 
              totalAmount: 100, 
              paidAmount: 50, 
              paymentStatus: 'partially_paid',
              paymentHistory: [{ amount: 50, paymentDate: { toMillis: () => 1000 } }]
            }) 
          },
          { exists: false }
        ]),
        update: vi.fn(),
      };
      
      const configModule = await import('../lib/config.js');
      configModule.db.runTransaction.mockImplementationOnce(async (callback) => {
        return await callback(mockTx);
      });

      req.body = {
        businessId: 'businessA',
        supplierId: 'supp1',
        invoiceId: 'inv1',
        action: 'pay',
        amount: 50,
        paymentDate: '2023-10-15T00:00:00Z'
      };

      await updatePaymentStatus_v2(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockTx.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          paymentStatus: 'paid',
          settlementDate: expect.anything(),
        })
      );
    });

    it('should NOT update settlementDate when invoice is partially paid', async () => {
      auth.authenticateRequest.mockResolvedValue({
        user: { uid: 'user1', businessId: 'businessA' }
      });
      auth.getUserDisplayName.mockReturnValue('Test User');

      const mockTx = {
        getAll: vi.fn().mockResolvedValue([
          { 
            exists: true, 
            data: () => ({ 
              totalAmount: 100, 
              paidAmount: 0, 
              paymentStatus: 'unpaid',
            }) 
          },
          { exists: false }
        ]),
        update: vi.fn(),
      };
      
      const configModule = await import('../lib/config.js');
      configModule.db.runTransaction.mockImplementationOnce(async (callback) => {
        return await callback(mockTx);
      });

      req.body = {
        businessId: 'businessA',
        supplierId: 'supp1',
        invoiceId: 'inv1',
        action: 'partial',
        amount: 50,
        paymentDate: '2023-10-15T00:00:00Z'
      };

      await updatePaymentStatus_v2(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      // settlementDate should not be in the update payload
      expect(mockTx.update).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          settlementDate: expect.anything(),
        })
      );
    });
  });

  describe('updateInvoiceFields_v2', () => {
    it('should recalculate settlementDate when paymentHistory is updated on a paid invoice', async () => {
      auth.authenticateRequest.mockResolvedValue({
        user: { uid: 'user1', businessId: 'businessA' }
      });
      auth.getUserDisplayName.mockReturnValue('Test User');

      const mockTx = {
        get: vi.fn().mockResolvedValue({ 
          exists: true, 
          data: () => ({ 
            totalAmount: 100, 
            paidAmount: 100, 
            paymentStatus: 'paid',
            paymentHistory: [{ amount: 100, paymentDate: { toMillis: () => 1000 } }]
          }) 
        }),
        update: vi.fn(),
      };
      
      const configModule = await import('../lib/config.js');
      
      // Mock db.collection for financial entries sync
      configModule.db.collection.mockImplementation((path) => {
        if (path === 'businesses') {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnThis(),
                get: vi.fn().mockResolvedValue({
                  empty: true,
                  docs: []
                }),
                doc: vi.fn().mockReturnValue({
                  set: vi.fn(),
                  update: vi.fn(),
                  get: vi.fn().mockResolvedValue({ exists: true })
                })
              })
            })
          };
        }
        return {
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: true }),
            set: vi.fn(),
            update: vi.fn(),
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({
                set: vi.fn(),
                update: vi.fn(),
                get: vi.fn().mockResolvedValue({ exists: true })
              })
            })
          })
        };
      });

      configModule.db.runTransaction.mockImplementationOnce(async (callback) => {
        return await callback(mockTx);
      });

      req.body = {
        businessId: 'businessA',
        supplierId: 'supp1',
        invoiceId: 'inv1',
        fields: {
          paymentHistory: [
            { amount: 100, paymentDate: '2023-10-20T00:00:00Z' }
          ]
        }
      };

      const { updateInvoiceFields_v2 } = await import('../index.js');
      await updateInvoiceFields_v2(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(mockTx.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          settlementDate: expect.anything(), // Should be the new Timestamp
        })
      );
    });
  });

  describe('Admin Functions', () => {
    describe('createClientBusiness_v2', () => {
      it('should reject requests from non-admin users', async () => {
        auth.authenticateRequest.mockResolvedValue({
          user: { uid: 'user1', businessId: 'businessA', isAccountant: true, role: 'user' }
        });

        req.body = {
          businessId: 'newBusiness',
          displayName: 'New Business',
          email: 'test@test.com',
          password: 'password',
        };

        await createClientBusiness_v2(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: 'Only admin accountants can perform this action',
        }));
      });
    });

    describe('addUserToBusiness_v2', () => {
      it('should reject requests from non-accountant users', async () => {
        auth.authenticateRequest.mockResolvedValue({
          user: { uid: 'user1', businessId: 'businessA' } // Not an accountant
        });

        req.body = {
          businessId: 'businessA',
          email: 'test@test.com',
          password: 'password',
          displayName: 'Test User',
          role: 'user',
        };

        await addUserToBusiness_v2(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: 'Only admin accountants can perform this action',
        }));
      });
    });

    describe('addAccountant_v2', () => {
      it('should reject requests from non-admin accountants', async () => {
        auth.authenticateRequest.mockResolvedValue({
          user: { uid: 'acc1', isAccountant: true, role: 'accountant' } // Not an admin
        });

        req.body = {
          email: 'test@test.com',
          password: 'password',
          displayName: 'Test Accountant',
          role: 'admin',
        };

        await addAccountant_v2(req, res);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: 'Only admin accountants can perform this action',
        }));
      });
    });
  });
  
  describe('Scheduled Functions', () => {
    describe('processRecurringExpenses_v2', () => {
      it('should process recurring expenses correctly', async () => {
        const configModule = await import('../lib/config.js');
        
        // Mock getAthensToday to return dayOfMonth = 1
        configModule.getAthensToday.mockReturnValue({ utcDate: new Date('2023-10-01T00:00:00Z'), dayOfMonth: 1 });

        // Mock collectionGroup to return some expenses
        const mockSnapshot = {
          empty: false,
          forEach: (callback) => {
            callback({
              id: 'expense1',
              ref: { parent: { parent: { id: 'businessA' } } },
              data: () => ({
                category: 'ΕΝΟΙΚΙΟ',
                amount: 500,
                description: 'Rent',
                createdBy: 'user1',
              }),
            });
          },
        };
        
        // Mock get on the chained object
        configModule.db.collectionGroup().get.mockResolvedValueOnce(mockSnapshot);

        // Mock batch
        const mockBatch = {
          set: vi.fn(),
          commit: vi.fn().mockResolvedValue(),
        };
        configModule.db.batch.mockReturnValue(mockBatch);

        // Call the scheduled function handler directly
        // Firebase v2 onSchedule returns a function with a .run() method for testing
        await processRecurringExpenses_v2.run({});

        expect(configModule.db.collectionGroup).toHaveBeenCalledWith('recurring_expenses');
        expect(mockBatch.set).toHaveBeenCalledTimes(1);
        expect(mockBatch.commit).toHaveBeenCalledTimes(1);
      });
    });
  });
});
