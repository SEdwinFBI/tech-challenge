import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DomainError } from '@/core/domain/domain.error';

const PositiveIntParamSchema = z.coerce.number().int().positive({
  message: 'Debe ser un entero positivo.',
});

export const parseIdParam = (paramName: string = 'id') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const rawValue = req.params[paramName];
    const parsed = PositiveIntParamSchema.safeParse(rawValue);
    if (!parsed.success) {
      return next(
        new DomainError(
          `'${paramName}' debe ser un entero mayor a 0.`,
          'INVALID_PARAM_ID',
          400
        )
      );
    }
    (req.params as Record<string, unknown>)[paramName] = parsed.data;
    next();
  };
};

export const requireNumericId = parseIdParam('id');
export const requireNumericIdVariante = parseIdParam('idVariante');
