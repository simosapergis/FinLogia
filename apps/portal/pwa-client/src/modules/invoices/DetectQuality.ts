import { validateImageQuality } from '@/utils/image';
import type { ImageQualityReport } from '@/utils/image';

export async function detectQuality(file: File): Promise<ImageQualityReport> {
  return validateImageQuality(file);
}
