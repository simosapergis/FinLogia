import { apiRequest, buildUrl } from '@/services/api/apiClient';
import type { SupplierDelivery } from '@/modules/suppliers/Supplier';

export interface UpdateSupplierFieldsRequest {
  supplierId: string;
  fields: {
    name?: string;
    supplierCategory?: string;
    supplierTaxNumber?: string;
    delivery?: SupplierDelivery;
  };
}

export interface UpdateSupplierFieldsResponse {
  success: boolean;
  message?: string;
  updatedFields?: string[];
}

const UPDATE_SUPPLIER_FIELDS_PATH = import.meta.env.VITE_UPDATE_SUPPLIER_FIELDS_PATH ?? 'updateSupplierFields';

export const updateSupplierFields = async (
  payload: UpdateSupplierFieldsRequest
): Promise<UpdateSupplierFieldsResponse> => {
  return apiRequest<UpdateSupplierFieldsResponse>(
    buildUrl(UPDATE_SUPPLIER_FIELDS_PATH),
    'POST',
    payload
  );
};
