export interface ImageQualityReport {
  score: number;
  status: 'accepted' | 'warning' | 'rejected';
  accepted: boolean;
  reasons: string[];
  width: number;
  height: number;
}

// Recommended thresholds - warn if below these
const WARN_WIDTH = 1024;
const WARN_HEIGHT = 768;

// Hard rejection thresholds - reject if below these
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export async function validateImageQuality(file: File): Promise<ImageQualityReport> {
  const bitmap = await loadBitmap(file);
  const width = bitmap.width;
  const height = bitmap.height;
  bitmap.close?.();

  const reasons: string[] = [];
  let status: 'accepted' | 'warning' | 'rejected' = 'accepted';

  // Check file size
  if (file.size > MAX_SIZE_BYTES) {
    reasons.push('Το αρχείο είναι πολύ μεγάλο');
    status = 'rejected';
  }

  // Check resolution - two tiers
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    reasons.push('Η ανάλυση είναι πολύ χαμηλή για αξιόπιστη ανάγνωση');
    status = 'rejected';
  } else if (width < WARN_WIDTH || height < WARN_HEIGHT) {
    reasons.push('Χαμηλή ανάλυση - πιθανή δυσκολία ανάγνωσης λεπτομερειών');
    if (status !== 'rejected') status = 'warning';
  }

  const resolutionScore = Math.min(100, Math.round((width * height) / (WARN_WIDTH * WARN_HEIGHT) * 60));
  const sizeScore = Math.max(0, 40 - Math.round((file.size / MAX_SIZE_BYTES) * 40));
  const score = Math.min(100, resolutionScore + sizeScore);

  const accepted = status !== 'rejected';

  return {
    score,
    status,
    accepted,
    reasons,
    width,
    height,
  };
}

const loadBitmap = async (file: File): Promise<ImageBitmap> => {
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    return createImageBitmap(file);
  }

  if (typeof document === 'undefined') {
    throw new Error('Image APIs are not available in this environment');
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      createImageBitmap(img)
        .then(resolve)
        .catch(reject);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};
