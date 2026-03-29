import { apiRequest, buildUrl } from '@/services/api/apiClient';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type EntryType = 'income' | 'expense';

export type IncomeCategory = 'cash_sales' | 'card_sales' | 'other_income';

export type ExpenseCategory =
  | 'ΡΕΥΜΑ'
  | 'ΤΗΛΕΦΩΝΙΑ'
  | 'ΕΝΟΙΚΙΟ'
  | 'ΜΙΣΘΟΙ'
  | 'ΛΟΓΙΣΤΗΣ'
  | 'ΠΛΗΡΩΜΗ_ΤΙΜΟΛΟΓΙΟΥ'
  | 'ΑΛΛΑ';

export type EntrySource = 'manual' | 'invoice_payment' | 'recurring';

export interface FinancialEntry {
  id: string;
  type: EntryType;
  category: IncomeCategory | ExpenseCategory;
  amount: number;
  date: string;
  description?: string;
  source: EntrySource;
  isDeleted: boolean;
  createdBy: string;
  createdByName?: string;
  createdAt: { _seconds: number };
  metadata?: {
    invoiceId?: string;
    supplierId?: string;
    supplierName?: string;
    invoiceNumber?: string;
    recurringExpenseId?: string;
  };
}

export interface RecurringExpense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  dayOfMonth: number;
  description?: string;
  isActive: boolean;
  createdBy: string;
}

export interface FinancialReportSummary {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  entryCount: number;
}

export interface FinancialReportBreakdown {
  income: Partial<Record<IncomeCategory, number>>;
  expenses: Partial<Record<ExpenseCategory, number>>;
}

export interface FinancialReport {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: FinancialReportSummary;
  breakdown: FinancialReportBreakdown;
  entries: FinancialEntry[];
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY LABELS (Greek)
// ─────────────────────────────────────────────────────────────────────────────

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  cash_sales: 'Μετρητά',
  card_sales: 'Κάρτα',
  other_income: 'Άλλα Έσοδα',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  ΡΕΥΜΑ: 'Ρεύμα',
  ΤΗΛΕΦΩΝΙΑ: 'Τηλεφωνία',
  ΕΝΟΙΚΙΟ: 'Ενοίκιο',
  ΜΙΣΘΟΙ: 'Μισθοί',
  ΛΟΓΙΣΤΗΣ: 'Λογιστής',
  ΠΛΗΡΩΜΗ_ΤΙΜΟΛΟΓΙΟΥ: 'Πληρωμή Τιμολογίου',
  ΑΛΛΑ: 'Άλλα',
};

// ─────────────────────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

const ADD_FINANCIAL_ENTRY_PATH = import.meta.env.VITE_ADD_FINANCIAL_ENTRY_PATH ?? 'addFinancialEntry';
const EDIT_FINANCIAL_ENTRY_PATH = import.meta.env.VITE_EDIT_FINANCIAL_ENTRY_PATH ?? 'editFinancialEntry';
const DELETE_FINANCIAL_ENTRY_PATH = import.meta.env.VITE_DELETE_FINANCIAL_ENTRY_PATH ?? 'deleteFinancialEntry';
const GET_FINANCIAL_REPORT_PATH = import.meta.env.VITE_GET_FINANCIAL_REPORT_PATH ?? 'getFinancialReport';
const ADD_RECURRING_EXPENSE_PATH = import.meta.env.VITE_ADD_RECURRING_EXPENSE_PATH ?? 'addRecurringExpense';
const UPDATE_RECURRING_EXPENSE_PATH = import.meta.env.VITE_UPDATE_RECURRING_EXPENSE_PATH ?? 'updateRecurringExpense';
const GET_RECURRING_EXPENSES_PATH = import.meta.env.VITE_GET_RECURRING_EXPENSES_PATH ?? 'getRecurringExpenses';

// ─────────────────────────────────────────────────────────────────────────────
// ADD FINANCIAL ENTRY
// ─────────────────────────────────────────────────────────────────────────────

export interface AddFinancialEntryRequest {
  type: EntryType;
  category: IncomeCategory | ExpenseCategory;
  amount: number;
  date: string; // YYYY-MM-DD
  description?: string;
}

export interface AddFinancialEntryResponse {
  success: boolean;
  message: string;
  data: {
    entryId: string;
    type: EntryType;
    category: string;
    amount: number;
    date: string;
    source: EntrySource;
  };
}

export const addFinancialEntry = async (
  payload: AddFinancialEntryRequest
): Promise<AddFinancialEntryResponse> => {
  return apiRequest<AddFinancialEntryResponse>(
    buildUrl(ADD_FINANCIAL_ENTRY_PATH),
    'POST',
    payload
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// EDIT FINANCIAL ENTRY
// ─────────────────────────────────────────────────────────────────────────────

export interface EditFinancialEntryRequest {
  entryId: string;
  fields: {
    type?: EntryType;
    category?: IncomeCategory | ExpenseCategory;
    amount?: number;
    date?: string;
    description?: string | null;
  };
}

export interface EditFinancialEntryResponse {
  success: boolean;
  message: string;
  data: {
    entryId: string;
    updatedFields: string[];
  };
}

export const editFinancialEntry = async (
  payload: EditFinancialEntryRequest
): Promise<EditFinancialEntryResponse> => {
  return apiRequest<EditFinancialEntryResponse>(
    buildUrl(EDIT_FINANCIAL_ENTRY_PATH),
    'POST',
    payload
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE FINANCIAL ENTRY (Soft Delete)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeleteFinancialEntryResponse {
  success: boolean;
  message: string;
  entryId: string;
}

export const deleteFinancialEntry = async (
  entryId: string
): Promise<DeleteFinancialEntryResponse> => {
  return apiRequest<DeleteFinancialEntryResponse>(
    buildUrl(DELETE_FINANCIAL_ENTRY_PATH),
    'POST',
    { entryId }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GET FINANCIAL REPORT
// ─────────────────────────────────────────────────────────────────────────────

export interface GetFinancialReportRequest {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type?: EntryType;
  includeDeleted?: boolean;
}

export interface GetFinancialReportResponse {
  success: boolean;
  data: FinancialReport;
}

export const getFinancialReport = async (
  payload: GetFinancialReportRequest
): Promise<GetFinancialReportResponse> => {
  return apiRequest<GetFinancialReportResponse>(
    buildUrl(GET_FINANCIAL_REPORT_PATH),
    'POST',
    payload
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ADD RECURRING EXPENSE
// ─────────────────────────────────────────────────────────────────────────────

export interface AddRecurringExpenseRequest {
  category: ExpenseCategory;
  amount: number;
  dayOfMonth: number; // 1-28
  description?: string;
}

export interface AddRecurringExpenseResponse {
  success: boolean;
  message: string;
  data: {
    recurringId: string;
    category: ExpenseCategory;
    amount: number;
    dayOfMonth: number;
    isActive: boolean;
  };
}

export const addRecurringExpense = async (
  payload: AddRecurringExpenseRequest
): Promise<AddRecurringExpenseResponse> => {
  return apiRequest<AddRecurringExpenseResponse>(
    buildUrl(ADD_RECURRING_EXPENSE_PATH),
    'POST',
    payload
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE RECURRING EXPENSE
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateRecurringExpenseRequest {
  recurringId: string;
  fields: {
    amount?: number;
    dayOfMonth?: number;
    description?: string;
    isActive?: boolean;
  };
}

export interface UpdateRecurringExpenseResponse {
  success: boolean;
  message: string;
  recurringId: string;
}

export const updateRecurringExpense = async (
  payload: UpdateRecurringExpenseRequest
): Promise<UpdateRecurringExpenseResponse> => {
  return apiRequest<UpdateRecurringExpenseResponse>(
    buildUrl(UPDATE_RECURRING_EXPENSE_PATH),
    'POST',
    payload
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// GET RECURRING EXPENSES
// ─────────────────────────────────────────────────────────────────────────────

export interface GetRecurringExpensesResponse {
  success: boolean;
  data: RecurringExpense[];
}

export const getRecurringExpenses = async (): Promise<GetRecurringExpensesResponse> => {
  return apiRequest<GetRecurringExpensesResponse>(
    buildUrl(GET_RECURRING_EXPENSES_PATH),
    'GET'
  );
};

