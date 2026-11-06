import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { catalogApi } from '../api/catalogApi';
import { compressImage, CompressImageError, type CompressedImage } from '@/shared/lib/compress-image';
import { apiErrorMessage, errorCode } from '@/shared/lib/apiErrors';

export type UploadPhase = 'idle' | 'compressing' | 'uploading' | 'saving' | 'error';

export interface UploadPreview {
  url: string;
  originalSize: number;
  size: number;
}

class PutError extends Error {}

function putBlob(url: string, blob: Blob, headers: Record<string, string>, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new PutError()));
    xhr.onerror = () => reject(new PutError());
    xhr.onabort = () => reject(new PutError());
    xhr.send(blob);
  });
}

export interface UploadedImage {
  clave: string;
  urlPublica: string;
}

export async function uploadCompressed(productId: number, img: CompressedImage, onProgress: (pct: number) => void): Promise<UploadedImage> {
  const firma = await catalogApi.requestImageUpload(productId, img.type, img.size);
  await putBlob(firma.urlSubida, img.blob, firma.cabeceras ?? { 'Content-Type': img.type }, onProgress);
  return { clave: firma.clave, urlPublica: firma.urlPublica };
}

type StorageState = 'unknown' | 'ready' | 'off';

let storageState: StorageState = 'unknown';
let probing = false;
const storageListeners = new Set<() => void>();

function setStorageState(next: StorageState) {
  if (storageState === next) return;
  storageState = next;
  storageListeners.forEach((fn) => fn());
}

function subscribeStorage(fn: () => void) {
  storageListeners.add(fn);
  return () => {
    storageListeners.delete(fn);
  };
}

const isStorageOff = (err: unknown) => errorCode(err) === 'ALMACENAMIENTO_NO_CONFIGURADO';

export function useStorageAvailable(probeProductId?: number | null): boolean {
  const state = useSyncExternalStore(subscribeStorage, () => storageState);
  useEffect(() => {
    if (probeProductId == null || storageState !== 'unknown' || probing) return;
    probing = true;
    catalogApi
      .requestImageUpload(probeProductId, 'image/jpeg', 100 * 1024)
      .then(() => setStorageState('ready'))
      .catch((err) => {
        if (isStorageOff(err)) setStorageState('off');
      })
      .finally(() => {
        probing = false;
      });
  }, [probeProductId, state]);
  return state !== 'off';
}

export function useImageUpload(productId: number | null) {
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ originalSize: number; size: number } | null>(null);
  const available = useStorageAvailable(productId);

  const compressed = useRef<CompressedImage | null>(null);
  const uploaded = useRef<UploadedImage | null>(null);
  const onUploaded = useRef<((image: UploadedImage) => Promise<void>) | null>(null);
  const previewUrl = useRef<string | null>(null);

  const dropPreview = useCallback(() => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
  }, []);

  useEffect(() => dropPreview, [dropPreview]);

  const reset = useCallback(() => {
    compressed.current = null;
    uploaded.current = null;
    onUploaded.current = null;
    dropPreview();
    setPhase('idle');
    setProgress(0);
    setError(null);
  }, [dropPreview]);

  const send = useCallback(async (): Promise<boolean> => {
    const img = compressed.current;
    if (!img || productId === null) return false;
    setError(null);
    setProgress(0);
    try {
      if (!navigator.onLine) throw new TypeError('offline');
      if (!uploaded.current) {
        setPhase('uploading');
        uploaded.current = await uploadCompressed(productId, img, setProgress);
      }
      setPhase('saving');
      await onUploaded.current?.(uploaded.current);
      setLastResult({ originalSize: img.originalSize, size: img.size });
      reset();
      return true;
    } catch (err) {
      if (isStorageOff(err)) {
        setStorageState('off');
        reset();
        return false;
      }
      setError(err instanceof PutError ? 'No se pudo subir la imagen' : apiErrorMessage(err, 'No se pudo subir la imagen'));
      setPhase('error');
      return false;
    }
  }, [productId, reset]);

  const start = useCallback(
    async (file: File, done: (image: UploadedImage) => Promise<void>): Promise<boolean> => {
      reset();
      setLastResult(null);
      onUploaded.current = done;
      setPhase('compressing');
      try {
        const img = await compressImage(file);
        compressed.current = img;
        previewUrl.current = URL.createObjectURL(img.blob);
        setPreview({ url: previewUrl.current, originalSize: img.originalSize, size: img.size });
      } catch (err) {
        setError(err instanceof CompressImageError ? err.message : 'No se pudo procesar la imagen.');
        setPhase('error');
        return false;
      }
      return send();
    },
    [reset, send],
  );

  return {
    phase,
    progress,
    preview,
    error,
    available,
    lastResult,
    busy: phase === 'compressing' || phase === 'uploading' || phase === 'saving',
    start,
    retry: send,
    cancel: reset,
  };
}
