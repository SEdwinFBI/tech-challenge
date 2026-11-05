export const MAX_INPUT_BYTES = 15 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_SIDE = 1600;
const QUALITIES = [0.82, 0.7, 0.6];

export type CompressErrorCode = 'NOT_IMAGE' | 'TOO_LARGE_INPUT' | 'DECODE_FAILED' | 'STILL_TOO_LARGE' | 'ENCODE_FAILED';

const MESSAGES: Record<CompressErrorCode, string> = {
  NOT_IMAGE: 'El archivo no es una imagen.',
  TOO_LARGE_INPUT: 'La imagen pesa más de 15 MB.',
  DECODE_FAILED: 'No se pudo leer la imagen.',
  STILL_TOO_LARGE: 'La imagen sigue pesando más de 2 MB. Prueba con otra.',
  ENCODE_FAILED: 'No se pudo procesar la imagen.',
};

export class CompressImageError extends Error {
  readonly code: CompressErrorCode;
  constructor(code: CompressErrorCode) {
    super(MESSAGES[code]);
    this.name = 'CompressImageError';
    this.code = code;
  }
}

export interface CompressedImage {
  blob: Blob;
  type: string;
  width: number;
  height: number;
  originalSize: number;
  size: number;
}

type Surface = OffscreenCanvas | HTMLCanvasElement;

function createSurface(width: number, height: number): Surface {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function encode(surface: Surface, type: string, quality: number): Promise<Blob | null> {
  if ('convertToBlob' in surface) return surface.convertToBlob({ type, quality }).catch(() => null);
  return new Promise((resolve) => surface.toBlob(resolve, type, quality));
}

export async function compressImage(file: File): Promise<CompressedImage> {
  if (!file.type.startsWith('image/')) throw new CompressImageError('NOT_IMAGE');
  if (file.size > MAX_INPUT_BYTES) throw new CompressImageError('TOO_LARGE_INPUT');

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new CompressImageError('DECODE_FAILED');
  }

  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const surface = createSurface(width, height);
    const ctx = surface.getContext('2d') as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D | null;
    if (!ctx) throw new CompressImageError('ENCODE_FAILED');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    let type = 'image/webp';
    for (const quality of QUALITIES) {
      let blob = await encode(surface, type, quality);
      if (blob && blob.type !== type) {
        type = 'image/jpeg';
        blob = blob.type === type ? blob : await encode(surface, type, quality);
      }
      if (!blob) throw new CompressImageError('ENCODE_FAILED');
      if (blob.size <= MAX_OUTPUT_BYTES) {
        return { blob, type: blob.type, width, height, originalSize: file.size, size: blob.size };
      }
    }
    throw new CompressImageError('STILL_TOO_LARGE');
  } finally {
    bitmap.close();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
