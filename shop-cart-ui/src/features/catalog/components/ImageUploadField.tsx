import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, RotateCcw, X } from 'lucide-react';
import { useImageUpload } from '../hooks/useImageUpload';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { formatBytes } from '@/shared/lib/compress-image';

export interface ImageUploadFieldProps {
  productId: number;
  label: string;
  hint?: string;
  disabled?: boolean;
  onUploaded: (url: string) => Promise<void>;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ productId, label, hint, disabled, onUploaded }) => {
  const upload = useImageUpload(productId);
  const online = useOnlineStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  if (!upload.available) return null;

  const blocked = disabled || upload.busy || !online;
  const pick = (file: File | undefined) => {
    if (file && !blocked) void upload.start(file, onUploaded);
  };

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        if (!blocked) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files[0]);
      }}
      className={`rounded-2xl border-2 border-dashed p-4 transition ${dragging ? 'border-brand bg-brand-soft/60' : 'border-slate-300'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={e => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {upload.phase === 'idle' ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={blocked}
            title={!online ? 'Sin conexión' : undefined}
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" /> {label}
          </button>
          <p className="text-xs text-slate-500">{hint ?? 'Elige una foto o arrástrala aquí. Se reduce sola antes de subir.'}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          {upload.preview ? (
            <img src={upload.preview.url} alt="Vista previa" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          )}
          <div className="min-w-0 flex-1 text-sm">
            {upload.preview && (
              <p className="font-bold tabular text-slate-800">
                {formatBytes(upload.preview.originalSize)} → {formatBytes(upload.preview.size)}
              </p>
            )}
            {upload.phase === 'compressing' && <p className="text-slate-500">Preparando imagen…</p>}
            {upload.phase === 'uploading' && (
              <>
                <p className="text-slate-500">Subiendo… {upload.progress}%</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-brand transition-all" style={{ width: `${upload.progress}%` }} />
                </div>
              </>
            )}
            {upload.phase === 'saving' && <p className="text-slate-500">Guardando…</p>}
            {upload.phase === 'error' && <p role="alert" className="font-semibold text-rose-600">{upload.error}</p>}
          </div>
          {upload.phase === 'error' && (
            <div className="flex shrink-0 items-center gap-1">
              {upload.preview && (
                <button
                  type="button"
                  onClick={() => void upload.retry()}
                  disabled={!online}
                  title={!online ? 'Sin conexión' : undefined}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-800 px-4 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reintentar
                </button>
              )}
              <button type="button" onClick={upload.cancel} aria-label="Descartar" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
