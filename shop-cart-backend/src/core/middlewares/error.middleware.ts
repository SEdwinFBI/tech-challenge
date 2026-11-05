
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { DomainError } from '@/core/domain/domain.error'
import { codigoDeNegocio } from './sql-error-codes';

export const globalErrorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ZodError) {


    return res.status(400).json({
      ok: false,
      codigo: 'VALIDATION_ERROR',
      mensaje: 'Datos inválidos.',
      detalles: err.issues.map(e => ({ campo: e.path.join('.'), mensaje: e.message })),
    });
  }

  if (err instanceof DomainError) {
    return res.status(err.httpStatus).json({
      ok: false,
      codigo: err.code,
      mensaje: err.message,
    });
  }

  if (err?.number === 2627 || err?.number === 2601) {
    const msg = String(err.message ?? '');
    return res.status(409).json({
      ok: false,
      codigo: 'DUPLICATE_KEY',
      mensaje: msg.includes('UQ_Cupones_Codigo') ? 'Ya existe un cupón con ese código.' : 'Ya existe un registro con ese valor.',
    });
  }

  if (typeof err.number === 'number' && err.number >= 50000) {
    const conflictCodes = [50010, 50016, 50023, 50033, 50040, 50041, 50051, 50057, 50063, 50066, 50073, 50082, 50092, 50110];
    const forbiddenCodes = [50050, 50061, 50076, 50071, 50072];
    const unauthorizedCodes = [50011, 50012, 50013];

    let status = 400;
    if (conflictCodes.includes(err.number)) status = 409;
    if (forbiddenCodes.includes(err.number)) status = 403;
    if (unauthorizedCodes.includes(err.number)) status = 401;
    if (err.number === 50075 || [50021, 50022, 50090, 50111, 50091, 50093, 50096, 50098].includes(err.number)) status = 404;

    const minimo = couponMinimumDetails(err.number, err.message);
    return res.status(status).json({
      ok: false,
      codigo: codigoDeNegocio(err.number, err.message),
      mensaje: minimo ? 'Tu compra no alcanza el mínimo requerido por el cupón.' : err.message,
      ...(minimo ? { datos: minimo } : {}),
    });
  }

  console.error(`[${res.locals.requestId ?? '-'}] Error:`, err);
  return res.status(500).json({
    ok: false,
    codigo: 'INTERNAL_ERROR',
    mensaje: 'Error interno.',
  });
};

function couponMinimumDetails(number: number, message: string): { montoMinimo: number; subtotal: number; montoFaltante: number } | null {
  if (number !== 50058 && number !== 50067) return null;
  try {
    const data = JSON.parse(message);
    if ([data.montoMinimo, data.subtotal, data.montoFaltante].every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) {
      return { montoMinimo: data.montoMinimo, subtotal: data.subtotal, montoFaltante: data.montoFaltante };
    }
  } catch {}
  return null;
}
