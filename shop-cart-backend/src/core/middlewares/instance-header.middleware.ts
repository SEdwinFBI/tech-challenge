import type { RequestHandler } from 'express';
import { instanceId } from '@/core/config/instance';

export const instanceHeader: RequestHandler = (_req, res, next) => {
  res.setHeader('X-Instancia', instanceId);
  next();
};
