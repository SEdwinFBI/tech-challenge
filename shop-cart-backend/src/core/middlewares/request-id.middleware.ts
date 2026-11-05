import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

const FORMATO_VALIDO = /^[\w.-]{1,64}$/;

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const entrante = req.header('x-request-id');
  const id = entrante && FORMATO_VALIDO.test(entrante) ? entrante : randomUUID();
  res.locals.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
