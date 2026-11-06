import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, ImagePlus, Loader2, RotateCcw, X } from 'lucide-react';
import { useImageUpload, useStorageAvailable, type UploadedImage } from '../hooks/useImageUpload';
import type { ImageKind } from '../api/catalogApi';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { compressImage, CompressImageError, formatBytes, type CompressedImage } from '@/shared/lib/compress-image';
import { SafeImage } from '@/shared/ui/SafeImage';
import { toast } from '@/shared/ui/toastStore';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const HELP = 'JPG, PNG o WebP. Se optimiza antes de subirla (máx. 1600 px).';

const sizeText = (r: { originalSize: number; size: number }) => `${formatBytes(r.originalSize)} → ${formatBytes(r.size)}`;

export const ExternalUrlOption: React.FC<{ forceOpen?: boolean; children: React.ReactNode }> = ({ forceOpen, children }) => {
  const [open, setOpen] = useState(false);
  const shown = open || Boolean(forceOpen);

  return (
    <div className="space-y-2">
      {!forceOpen && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={shown}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition ${shown ? 'rotate-180' : ''}`} /> Usar una URL externa
        </button>
      )}
      {forceOpen && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          El almacenamiento de imágenes no está disponible. Usa una URL externa.
        </p>
      )}
      {shown && <div>{children}</div>}
    </div>
  );
};

const CopyUrl: React.FC<{ url: string }> = ({ url }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  };
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
      <span className="min-w-0 flex-1 truncate" title={url}>{url}</span>
      <button type="button" onClick={copy} aria-label="Copiar URL" className="shrink-0 rounded-full p-1.5 hover:bg-slate-100 hover:text-slate-700">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
};

interface CoverPickerProps {
  src?: string;
  alt: string;
  hasImage: boolean;
  canUpload: boolean;
  blocked: boolean;
  offline: boolean;
  busyLabel: string | null;
  progress: number | null;
  sizeLabel: string | null;
  error: string | null;
  storedUrl?: string;
  onPick: (file: File) => void;
  onRetry?: () => void;
  onDiscard?: () => void;
}

const CoverPicker: React.FC<CoverPickerProps> = ({
  src,
  alt,
  hasImage,
  canUpload,
  blocked,
  offline,
  busyLabel,
  progress,
  sizeLabel,
  error,
  storedUrl,
  onPick,
  onRetry,
  onDiscard,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const disabled = blocked || offline || !canUpload;
  const pick = (file: File | undefined) => {
    if (file && !disabled) onPick(file);
  };

  return (
    <div
      onDragOver={e => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        pick(e.dataTransfer.files[0]);
      }}
      className={`flex items-start gap-4 rounded-2xl border-2 border-dashed p-3 transition sm:gap-5 sm:p-4 ${dragging ? 'border-brand bg-brand-soft/60' : 'border-slate-300'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label={hasImage ? 'Elegir otra imagen' : 'Elegir imagen'}
        onChange={e => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl bg-canvas sm:h-36 sm:w-36">
        <SafeImage src={src} alt={alt} className="h-full w-full object-cover" />
        {busyLabel && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/45">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
        {progress !== null && (
          <div className="absolute inset-x-0 bottom-0 h-1.5 bg-slate-200/80">
            <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          title={offline ? 'Sin conexión' : undefined}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
        >
          <ImagePlus className="h-4 w-4" /> {hasImage ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
        <p className="hidden text-xs text-slate-500 sm:block">O arrástrala aquí.</p>
        <p className="text-xs text-slate-500">{HELP}</p>
        {busyLabel && <p className="text-xs font-semibold text-slate-700">{busyLabel}</p>}
        {sizeLabel && !busyLabel && !error && <p className="text-xs font-bold tabular text-brand">{sizeLabel}</p>}
        {error && (
          <div className="flex flex-wrap items-center gap-2">
            <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                disabled={offline}
                className="inline-flex h-8 items-center gap-1 rounded-full bg-slate-800 px-3 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" /> Reintentar
              </button>
            )}
            {onDiscard && (
              <button type="button" onClick={onDiscard} aria-label="Descartar" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        {storedUrl && <CopyUrl url={storedUrl} />}
      </div>
    </div>
  );
};

export interface CoverUploadFieldProps {
  productId: number;
  kind?: ImageKind;
  alt?: string;
  imageUrl: string;
  disabled?: boolean;
  onUploaded: (image: UploadedImage) => Promise<void>;
  children: React.ReactNode;
}

export const CoverUploadField: React.FC<CoverUploadFieldProps> = ({ productId, kind = 'productos', alt = 'Imagen principal', imageUrl, disabled, onUploaded, children }) => {
  const upload = useImageUpload(productId, kind);
  const online = useOnlineStatus();

  const busyLabel =
    upload.phase === 'compressing' ? 'Preparando imagen…' : upload.phase === 'uploading' ? `Subiendo… ${upload.progress}%` : upload.phase === 'saving' ? 'Guardando…' : null;
  const result = upload.preview ?? upload.lastResult;

  return (
    <div className="space-y-3">
      <CoverPicker
        src={upload.preview?.url ?? (imageUrl || undefined)}
        alt={alt}
        hasImage={Boolean(imageUrl)}
        canUpload={upload.available}
        blocked={Boolean(disabled) || upload.busy}
        offline={!online}
        busyLabel={busyLabel}
        progress={upload.phase === 'uploading' ? upload.progress : null}
        sizeLabel={result ? sizeText(result) : null}
        error={upload.phase === 'error' ? upload.error : null}
        storedUrl={imageUrl || undefined}
        onPick={file => void upload.start(file, onUploaded)}
        onRetry={upload.preview ? () => void upload.retry() : undefined}
        onDiscard={upload.cancel}
      />
      <ExternalUrlOption forceOpen={!upload.available}>{children}</ExternalUrlOption>
    </div>
  );
};

export interface PendingCoverFieldProps {
  alt?: string;
  pendingNote?: string;
  value: CompressedImage | null;
  onChange: (img: CompressedImage | null) => void;
  progress: number | null;
  uploading: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}

export const PendingCoverField: React.FC<PendingCoverFieldProps> = ({ alt = 'Imagen principal', pendingNote = 'se sube al crear el producto', value, onChange, progress, uploading, disabled, children }) => {
  const online = useOnlineStatus();
  const available = useStorageAvailable();
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const url = useMemo(() => (value ? URL.createObjectURL(value.blob) : undefined), [value]);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const pick = async (file: File) => {
    setError(null);
    setCompressing(true);
    try {
      onChange(await compressImage(file));
    } catch (err) {
      setError(err instanceof CompressImageError ? err.message : 'No se pudo procesar la imagen.');
    } finally {
      setCompressing(false);
    }
  };

  const busyLabel = compressing ? 'Preparando imagen…' : uploading ? `Subiendo… ${progress ?? 0}%` : null;

  return (
    <div className="space-y-3">
      <CoverPicker
        src={url}
        alt={alt}
        hasImage={Boolean(value)}
        canUpload={available}
        blocked={Boolean(disabled) || compressing || uploading}
        offline={false}
        busyLabel={busyLabel}
        progress={uploading ? progress : null}
        sizeLabel={value ? `${sizeText(value)} · ${pendingNote}` : null}
        error={error}
        onPick={file => void pick(file)}
        onDiscard={() => {
          setError(null);
          onChange(null);
        }}
      />
      {!online && <p className="text-xs text-slate-500">Sin conexión: la imagen se subirá cuando vuelvas a conectarte y crees el producto.</p>}
      {value && !uploading && (
        <button type="button" onClick={() => onChange(null)} className="text-xs font-semibold text-rose-600 hover:underline">
          Quitar imagen
        </button>
      )}
      {!value && <ExternalUrlOption forceOpen={!available}>{children}</ExternalUrlOption>}
    </div>
  );
};

export interface GalleryAddTileProps {
  productId: number;
  remaining: number;
  onUploaded: (image: UploadedImage) => Promise<void>;
  onFinished: (count: number) => void;
}

export const GalleryAddTile: React.FC<GalleryAddTileProps> = ({ productId, remaining, onUploaded, onFinished }) => {
  const upload = useImageUpload(productId);
  const online = useOnlineStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<{ index: number; total: number } | null>(null);

  const full = remaining <= 0;
  const disabled = full || !online || !upload.available || queue !== null;

  const run = async (list: FileList | File[]) => {
    const files = Array.from(list).filter(f => f.type.startsWith('image/'));
    if (disabled || files.length === 0) return;
    if (files.length > remaining) toast.error(`Solo caben ${remaining} imágenes más`);
    const batch = files.slice(0, remaining);
    let done = 0;
    for (let i = 0; i < batch.length; i++) {
      setQueue({ index: i + 1, total: batch.length });
      const ok = await upload.start(batch[i], onUploaded);
      if (!ok) break;
      done++;
    }
    setQueue(null);
    if (done > 0) onFinished(done);
  };

  const progressLabel =
    upload.phase === 'compressing' ? 'Preparando…' : upload.phase === 'uploading' ? `Subiendo ${upload.progress}%` : upload.phase === 'saving' ? 'Guardando…' : null;

  return (
    <li
      onDragOver={e => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        void run(e.dataTransfer.files);
      }}
      className="list-none"
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-label="Elegir imágenes"
        onChange={e => {
          if (e.target.files) void run(e.target.files);
          e.target.value = '';
        }}
      />
      {upload.phase === 'idle' && !queue ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          title={!online ? 'Sin conexión' : undefined}
          className={`flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-2 text-center text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
            dragging ? 'border-brand bg-brand-soft/60 text-brand' : 'border-slate-300 text-slate-600 hover:border-brand hover:text-brand'
          }`}
        >
          <ImagePlus className="h-6 w-6" />
          {full ? 'Galería llena' : 'Subir imagen'}
          {!full && <span className="text-[11px] font-medium text-slate-400">Puedes elegir varias</span>}
        </button>
      ) : (
        <div className="relative aspect-square overflow-hidden rounded-xl bg-canvas">
          {upload.preview ? (
            <img src={upload.preview.url} alt="Vista previa" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}
          <div className={`absolute inset-x-0 bottom-0 space-y-1 p-2 text-[11px] font-bold text-white ${upload.phase === 'error' ? 'bg-rose-700/90' : 'bg-slate-900/70'}`}>
            {upload.phase === 'error' ? (
              <>
                <p role="alert">{upload.error}</p>
                <div className="flex gap-1">
                  {upload.preview && (
                    <button type="button" onClick={() => void upload.retry()} disabled={!online} className="rounded-full bg-white px-2 py-1 text-rose-700 disabled:opacity-60">
                      Reintentar
                    </button>
                  )}
                  <button type="button" onClick={() => { upload.cancel(); setQueue(null); }} className="rounded-full bg-white/20 px-2 py-1">
                    Descartar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p>
                  {queue && queue.total > 1 ? `${queue.index} de ${queue.total} · ` : ''}
                  {progressLabel}
                </p>
                {upload.phase === 'uploading' && (
                  <div className="h-1 overflow-hidden rounded-full bg-white/30">
                    <div className="h-full bg-white transition-all" style={{ width: `${upload.progress}%` }} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </li>
  );
};
