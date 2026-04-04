import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseAmount,
  parseDate,
  parseJsonFromResponse,
  formatMetadataError,
  formatMetadataSuccess,
  runInvoiceOcrAttempt,
} from '../lib/invoice-ocr.js';
import { getVertexAIClient } from '../lib/config.js';

// ═══════════════════════════════════════════════════════════════════════════════
// parseAmount
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseAmount', () => {
  it('parses a simple decimal number string', () => {
    expect(parseAmount('1234.56')).toBe(1234.56);
  });

  it('strips currency symbols', () => {
    expect(parseAmount('€1234.56')).toBe(1234.56);
  });

  it('passes through numeric values', () => {
    expect(parseAmount(100)).toBe(100);
    expect(parseAmount(0)).toBe(0);
  });

  it('returns null for null', () => {
    expect(parseAmount(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseAmount(undefined)).toBeNull();
  });

  it('returns null for empty string after stripping', () => {
    expect(parseAmount('')).toBeNull();
  });

  it('returns null for fully non-numeric string', () => {
    expect(parseAmount('abc')).toBeNull();
  });

  it('handles negative numbers', () => {
    expect(parseAmount('-50.00')).toBe(-50);
  });

  it('strips spaces between digits', () => {
    expect(parseAmount('1 234.56')).toBe(1234.56);
  });

  it('handles integer strings', () => {
    expect(parseAmount('500')).toBe(500);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// parseDate
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseDate', () => {
  it('parses European format dd/mm/yyyy', () => {
    const result = parseDate('25/12/2024');
    expect(result).not.toBeNull();
    expect(result.toDate().toISOString()).toBe('2024-12-25T00:00:00.000Z');
  });

  it('parses European format dd-mm-yyyy', () => {
    const result = parseDate('01-06-2025');
    expect(result).not.toBeNull();
    expect(result.toDate().toISOString()).toBe('2025-06-01T00:00:00.000Z');
  });

  it('parses ISO format yyyy-mm-dd', () => {
    const result = parseDate('2024-03-15');
    expect(result).not.toBeNull();
    expect(result.toDate().toISOString()).toBe('2024-03-15T00:00:00.000Z');
  });

  it('parses single-digit day and month (European format)', () => {
    const result = parseDate('5/3/2024');
    expect(result).not.toBeNull();
    expect(result.toDate().toISOString()).toBe('2024-03-05T00:00:00.000Z');
  });

  it('returns null for null', () => {
    expect(parseDate(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(parseDate(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseDate('')).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(parseDate('not-a-date')).toBeNull();
  });

  it('parses dd-MMM-yyyy format via fallback (05-Jan-2026)', () => {
    const result = parseDate('05-Jan-2026');
    expect(result).not.toBeNull();
    expect(result.toDate().toISOString()).toBe('2026-01-05T00:00:00.000Z');
  });

  it('parses MMM dd, yyyy format via fallback (Jan 05, 2026)', () => {
    const result = parseDate('Jan 05, 2026');
    expect(result).not.toBeNull();
    expect(result.toDate().toISOString()).toBe('2026-01-05T00:00:00.000Z');
  });

  it('parses full month name format via fallback (January 5, 2026)', () => {
    const result = parseDate('January 5, 2026');
    expect(result).not.toBeNull();
    expect(result.toDate().toISOString()).toBe('2026-01-05T00:00:00.000Z');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// parseJsonFromResponse
// ═══════════════════════════════════════════════════════════════════════════════

describe('parseJsonFromResponse', () => {
  it('parses valid JSON string', () => {
    expect(parseJsonFromResponse('{"key": "value"}')).toEqual({ key: 'value' });
  });

  it('extracts JSON embedded in surrounding text', () => {
    const text = 'Here is the result: {"key": "value"} end';
    expect(parseJsonFromResponse(text)).toEqual({ key: 'value' });
  });

  it('handles JSON with nested objects', () => {
    const json = '{"outer": {"inner": 42}}';
    expect(parseJsonFromResponse(json)).toEqual({ outer: { inner: 42 } });
  });

  it('throws for empty text', () => {
    expect(() => parseJsonFromResponse('')).toThrow('Empty OCR response');
  });

  it('throws for null', () => {
    expect(() => parseJsonFromResponse(null)).toThrow('Empty OCR response');
  });

  it('throws for text without JSON', () => {
    expect(() => parseJsonFromResponse('no json here at all')).toThrow('No JSON found in OCR response');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// formatMetadataError / formatMetadataSuccess
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatMetadataError', () => {
  it('formats error with invoice number and supplier name', () => {
    const result = formatMetadataError('12345', 'Test Supplier', 'OCR failed');
    expect(result).toContain('12345');
    expect(result).toContain('Test Supplier');
    expect(result).toContain('OCR failed');
    expect(result).toContain('❌');
  });

  it('returns raw error when supplier is "Unknown Supplier"', () => {
    expect(formatMetadataError('12345', 'Unknown Supplier', 'OCR failed')).toBe('OCR failed');
  });

  it('returns raw error when invoice number is missing', () => {
    expect(formatMetadataError(null, 'Test Supplier', 'OCR failed')).toBe('OCR failed');
  });

  it('returns raw error when supplier name is missing', () => {
    expect(formatMetadataError('12345', null, 'OCR failed')).toBe('OCR failed');
  });
});

describe('formatMetadataSuccess', () => {
  it('formats success message with invoice number and supplier', () => {
    const result = formatMetadataSuccess('12345', 'Test Supplier');
    expect(result).toContain('12345');
    expect(result).toContain('Test Supplier');
    expect(result).toContain('✅');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// runInvoiceOcrAttempt
// ═══════════════════════════════════════════════════════════════════════════════

describe('runInvoiceOcrAttempt', () => {
  const MOCK_OCR_JSON = JSON.stringify({
    ΗΜΕΡΟΜΗΝΙΑ: '01/01/2026',
    'ΑΡΙΘΜΟΣ ΤΙΜΟΛΟΓΙΟΥ': '12345',
    ΠΡΟΜΗΘΕΥΤΗΣ: 'Test Supplier',
    'ΑΦΜ ΠΡΟΜΗΘΕΥΤΗ': '123456789',
    'ΚΑΘΑΡΗ ΑΞΙΑ': '100.00',
    ΦΠΑ: '24.00',
    ΠΛΗΡΩΤΕΟ: '124.00',
    ΑΚΡΙΒΕΙΑ: '90',
  });

  let vertexAiClient;
  let generateContentMock;

  beforeEach(() => {
    vertexAiClient = getVertexAIClient();
    generateContentMock = vi.fn().mockResolvedValue({
      response: {
        candidates: [
          {
            content: {
              parts: [{ text: MOCK_OCR_JSON }],
            },
          },
        ],
      },
    });

    vertexAiClient.preview.getGenerativeModel = vi.fn().mockReturnValue({
      generateContent: generateContentMock,
    });
  });

  it('calls Gemini directly with GCS URIs for PDF pages', async () => {
    const pages = [
      {
        mimeType: 'application/pdf',
        bucketName: 'test-bucket',
        objectName: 'uploads/inv-1/invoice.pdf',
        totalPages: 1,
        pageNumber: 1,
      },
    ];

    const result = await runInvoiceOcrAttempt(pages);

    expect(generateContentMock).toHaveBeenCalledOnce();
    const callArg = generateContentMock.mock.calls[0][0];
    
    // The parts array should have the system prompt first, then the fileData
    expect(callArg.contents[0].parts[1].fileData.fileUri).toBe('gs://test-bucket/uploads/inv-1/invoice.pdf');
    expect(callArg.contents[0].parts[1].fileData.mimeType).toBe('application/pdf');
    expect(result).toBeDefined();
    expect(result['ΠΡΟΜΗΘΕΥΤΗΣ']).toBe('Test Supplier');
  });

  it('calls Gemini directly with GCS URIs for image pages', async () => {
    const pages = [
      {
        mimeType: 'image/jpeg',
        bucketName: 'test-bucket',
        objectName: 'uploads/inv-1/page1.jpg',
        pageNumber: 1,
      },
    ];

    const result = await runInvoiceOcrAttempt(pages);

    expect(generateContentMock).toHaveBeenCalledOnce();
    const callArg = generateContentMock.mock.calls[0][0];
    
    expect(callArg.contents[0].parts[1].fileData.fileUri).toBe('gs://test-bucket/uploads/inv-1/page1.jpg');
    expect(callArg.contents[0].parts[1].fileData.mimeType).toBe('image/jpeg');
    expect(result).toBeDefined();
    expect(result['ΠΡΟΜΗΘΕΥΤΗΣ']).toBe('Test Supplier');
  });
});
