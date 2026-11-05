import { useCallback, useEffect, useRef, useState } from 'react';
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

export function useImageUpload(productId: number | null) {
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);

  const compressed = useRef<CompressedImage | null>(null);
  const publicUrl = useRef<string | null>(null);
  const onUploaded = useRef<((url: string) => Promise<void>) | null>(null);
  const previewUrl = useRef<string | null>(null);

  const dropPreview = useCallback(() => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
  }, []);

  useEffect(() => dropPreview, [dropPreview]);

  const reset = useCallback(() => {
    compressed.current = null;
    publicUrl.current = null;
    onUploaded.current = null;
    dropPreview();
    setPhase('idle');
    setProgress(0);
    setError(null);
  }, [dropPreview]);

  const send = useCallback(async () => {
    const img = compressed.current;
    if (!img || productId === null) return;
    setError(null);
    setProgress(0);
    try {
      if (!navigator.onLine) throw new TypeError('offline');
      if (!publicUrl.current) {
        setPhase('uploading');
        const firma = await catalogApi.requestImageUpload(productId, img.type, img.size);
        await putBlob(firma.urlSubida, img.blob, firma.cabeceras ?? { 'Content-Type': img.type }, setProgress);
        publicUrl.current = firma.urlPublica;
      }
      setPhase('saving');
      await onUploaded.current?.(publicUrl.current);
      reset();
    } catch (err) {
      if (errorCode(err) === 'ALMACENAMIENTO_NO_CONFIGURADO') {
        setAvailable(false);
        reset();
        return;
      }
      setError(err instanceof PutError ? 'No se pudo subir la imagen' : apiErrorMessage(err, 'No se pudo subir la imagen'));
      setPhase('error');
    }
  }, [productId, reset]);

  const start = useCallback(
    async (file: File, done: (url: string) => Promise<void>) => {
      reset();
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
        return;
      }
      await send();
    },
    [reset, send],
  );

  return {
    phase,
    progress,
    preview,
    error,
    available,
    busy: phase === 'compressing' || phase === 'uploading' || phase === 'saving',
    start,
    retry: send,
    cancel: reset,
  };
}
