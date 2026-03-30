import { apiRequest, buildUrl } from './apiClient';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { firebaseApp } from '@/services/firebase';

export interface CreateClientBusinessData {
  businessId: string;
  displayName: string;
  email: string;
  password?: string;
}

export interface AddUserToBusinessData {
  businessId: string;
  email: string;
  password?: string;
  displayName: string;
  role: 'owner' | 'employee' | 'viewer';
}

export interface AddAccountantData {
  email: string;
  password?: string;
  displayName: string;
  role: 'admin' | 'employee';
}

export interface ResetUserPasswordData {
  email: string;
}

export async function createClientBusiness(data: CreateClientBusinessData) {
  const path = import.meta.env.VITE_CREATE_CLIENT_BUSINESS_PATH;
  if (!path) throw new Error('VITE_CREATE_CLIENT_BUSINESS_PATH is not configured');

  return apiRequest(buildUrl(path), 'POST', data);
}

export async function addUserToBusiness(data: AddUserToBusinessData) {
  const path = import.meta.env.VITE_ADD_USER_TO_BUSINESS_PATH;
  if (!path) throw new Error('VITE_ADD_USER_TO_BUSINESS_PATH is not configured');

  return apiRequest(buildUrl(path), 'POST', data);
}

export async function addAccountant(data: AddAccountantData) {
  const path = import.meta.env.VITE_ADD_ACCOUNTANT_PATH;
  if (!path) throw new Error('VITE_ADD_ACCOUNTANT_PATH is not configured');

  return apiRequest(buildUrl(path), 'POST', data);
}

export async function resetUserPassword(data: ResetUserPasswordData) {
  const path = import.meta.env.VITE_RESET_USER_PASSWORD_PATH;
  if (!path) throw new Error('VITE_RESET_USER_PASSWORD_PATH is not configured');

  // First verify the user exists and the admin has permission via the backend
  await apiRequest(buildUrl(path), 'POST', data);
  
  // If successful, use the client SDK to actually send the Firebase template email
  const auth = getAuth(firebaseApp);
  await sendPasswordResetEmail(auth, data.email);
  
  return { success: true };
}
