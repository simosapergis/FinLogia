export type SupplierStatus = 'active' | 'inactive' | 'prospect';

export interface SupplierDeliveryTime {
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface SupplierDelivery {
  dayOfWeek?: number; // ISO 8601: 1 (Monday) to 7 (Sunday)
  from?: SupplierDeliveryTime;
  to?: SupplierDeliveryTime;
}

export interface Supplier {
  id: string;
  name: string;
  supplierTaxNumber?: string;
  supplierCategory?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  country?: string;
  status?: SupplierStatus;
  delivery?: SupplierDelivery;
  updatedAt?: string;
}




