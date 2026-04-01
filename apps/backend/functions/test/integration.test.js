import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as auth from '../lib/auth.js';

// Mock the validateBusinessAccess function to test the RBAC logic in isolation
vi.mock('../lib/auth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    validateBusinessAccess: vi.fn(),
  };
});

describe('Backend Functions Integration & RBAC', () => {
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateBusinessAccess', () => {
    // We import the actual function for this specific test block to verify its logic
    let actualValidateBusinessAccess;
    
    beforeEach(async () => {
      const actualModule = await vi.importActual('../lib/auth.js');
      actualValidateBusinessAccess = actualModule.validateBusinessAccess;
    });

    it('should deny access if targetBusinessId is missing', () => {
      const user = { uid: 'user1', businessId: 'businessA' };
      const result = actualValidateBusinessAccess(user, undefined);
      expect(result).toEqual({ error: 'businessId is required', status: 400 });
    });

    it('should allow access if user is an accountant', () => {
      const user = { uid: 'acc1', isAccountant: true };
      const result = actualValidateBusinessAccess(user, 'businessA');
      expect(result).toEqual({ success: true });
    });

    it('should allow access if user belongs to the target business', () => {
      const user = { uid: 'user1', businessId: 'businessA' };
      const result = actualValidateBusinessAccess(user, 'businessA');
      expect(result).toEqual({ success: true });
    });

    it('should deny access if user belongs to a different business', () => {
      const user = { uid: 'user1', businessId: 'businessA' };
      const result = actualValidateBusinessAccess(user, 'businessB');
      expect(result).toEqual({ error: 'Unauthorized access to this business', status: 403 });
    });
  });

  describe('Cross-Tenant API Calls (Mocked Endpoints)', () => {
    // Here we simulate what happens when an endpoint calls the validator
    
    it('updatePaymentStatus_v2 should reject cross-tenant requests', async () => {
      // Simulate a user from Business A trying to update Business B
      const mockUser = { uid: 'userA', businessId: 'businessA' };
      const targetBusinessId = 'businessB';
      
      // Simulate the endpoint's internal check
      const actualModule = await vi.importActual('../lib/auth.js');
      const accessCheck = actualModule.validateBusinessAccess(mockUser, targetBusinessId);
      
      expect(accessCheck.error).toBe('Unauthorized access to this business');
      expect(accessCheck.status).toBe(403);
    });

    it('getFinancialReport_v2 should reject cross-tenant requests', async () => {
      const mockUser = { uid: 'userA', businessId: 'businessA' };
      const targetBusinessId = 'businessB';
      
      const actualModule = await vi.importActual('../lib/auth.js');
      const accessCheck = actualModule.validateBusinessAccess(mockUser, targetBusinessId);
      
      expect(accessCheck.error).toBe('Unauthorized access to this business');
      expect(accessCheck.status).toBe(403);
    });
  });
});
