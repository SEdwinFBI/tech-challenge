import React, { useEffect, useRef, useState } from 'react';
import { Timer } from 'lucide-react';

export interface ReservationCountdownProps {
  startKey: number | string;
  /** Vencimiento del servidor, sin zona horaria. */
  expiresAt?: string | null;
  durationMs?: number;
  onExpire: () => void;
  className?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Si el reloj local no cuadra, cuenta desde que llegó la respuesta
export const ReservationCountdown: React.FC<ReservationCountdownProps> = ({
  startKey,
  expiresAt,
  durationMs = 15 * 60 * 1000,
  onExpire,
  className = '',
}) => {
  const [remaining, setRemaining] = useState(durationMs);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    const now = Date.now();
    const parsed = expiresAt ? Date.parse(expiresAt) - now : NaN;
    const coherent = Number.isFinite(parsed) && parsed <= durationMs + 60_000;
    const deadline = now + (coherent ? Math.max(0, parsed) : durationMs);
    let fired = false;

    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setRemaining(left);
      if (left === 0 && !fired) {
        fired = true;
        expireRef.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startKey, expiresAt, durationMs]);

  const totalSeconds = Math.ceil(remaining / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  const pct = Math.max(0, Math.min(100, (remaining / durationMs) * 100));
  const urgent = totalSeconds <= 120;
  const warn = totalSeconds <= 300;
  const expired = remaining === 0;

  const tone = expired
    ? 'bg-rose-50 text-rose-800'
    : urgent
      ? 'bg-rose-50 text-rose-800'
      : warn
        ? 'bg-amber-50 text-amber-800'
        : 'bg-brand-soft text-brand';
  const bar = expired || urgent ? 'bg-rose-500' : warn ? 'bg-amber-500' : 'bg-brand';

  const announce = expired
    ? 'Reserva vencida.'
    : totalSeconds === 300
      ? 'Quedan 5 minutos.'
      : totalSeconds === 60
        ? 'Queda 1 minuto.'
        : '';

  return (
    <div className={`rounded-2xl p-4 ${tone} ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-bold">
          <Timer className="h-4 w-4" />
          {expired ? 'Reserva vencida' : 'Reservado'}
        </p>
        <span role="timer" aria-live="off" className="text-xl font-extrabold tabular">
          {pad(mm)}:{pad(ss)}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/80">
        <div className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs font-medium opacity-90">
        {expired
          ? 'Se liberó. Vuelve a reservar.'
          : 'Paga antes de que termine el tiempo.'}
      </p>
      <span className="sr-only" role="status" aria-live="polite">{announce}</span>
    </div>
  );
};
