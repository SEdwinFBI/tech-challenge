import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

export const registro = new client.Registry();
client.collectDefaultMetrics({ register: registro });

export const RESULTADOS_CHECKOUT = ['CONFIRMADO', 'IDEMPOTENTE', 'RECHAZADO', 'ANULADO', 'CONCILIACION'] as const;
export const ESTADOS_PAGO = ['AUTORIZADO', 'CAPTURADO', 'RECHAZADO', 'ANULADO', 'PENDIENTE_CONCILIACION'] as const;

export type ResultadoCheckout = (typeof RESULTADOS_CHECKOUT)[number];
export type EstadoPago = (typeof ESTADOS_PAGO)[number];

export interface IMetrics {
  checkout(resultado: ResultadoCheckout): void;
  pagoIntento(estado: EstadoPago): void;
}

export class NoopMetrics implements IMetrics {
  checkout(): void {}
  pagoIntento(): void {}
}

const duracionHttp = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de las solicitudes HTTP',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registro],
});

const checkoutTotal = new client.Counter({
  name: 'shopcart_checkout_total',
  help: 'Confirmaciones de checkout por resultado',
  labelNames: ['resultado'],
  registers: [registro],
});

const pagosTotal = new client.Counter({
  name: 'shopcart_pagos_intentos_total',
  help: 'Intentos de pago por estado',
  labelNames: ['estado'],
  registers: [registro],
});

let fuenteClientesSse: () => number = () => 0;

new client.Gauge({
  name: 'shopcart_sse_clientes',
  help: 'Clientes SSE conectados',
  registers: [registro],
  collect() {
    this.set(fuenteClientesSse());
  },
});

const duracionProcedimiento = new client.Histogram({
  name: 'shopcart_db_procedure_duration_seconds',
  help: 'Duración de procedimientos almacenados',
  labelNames: ['procedure'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registro],
});

RESULTADOS_CHECKOUT.forEach((resultado) => checkoutTotal.inc({ resultado }, 0));
ESTADOS_PAGO.forEach((estado) => pagosTotal.inc({ estado }, 0));

export class PromMetrics implements IMetrics {
  checkout(resultado: ResultadoCheckout): void {
    checkoutTotal.inc({ resultado });
  }

  pagoIntento(estado: EstadoPago): void {
    pagosTotal.inc({ estado });
  }
}

const promMetrics = new PromMetrics();

export function obtenerMetrics(): IMetrics {
  return promMetrics;
}

export function medirClientesSse(fuente: () => number): void {
  fuenteClientesSse = fuente;
}

export function observarProcedimiento(nombre: string, segundos: number): void {
  duracionProcedimiento.observe({ procedure: nombre }, segundos);
}

export function etiquetaRuta(baseUrl: string, rutaExpress: unknown): string {
  if (typeof rutaExpress !== 'string') return 'unmatched';
  const ruta = `${baseUrl}${rutaExpress === '/' ? '' : rutaExpress}`;
  return ruta === '' ? '/' : ruta;
}

export function medirHttp(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/metrics') return next();
  const fin = duracionHttp.startTimer();
  res.on('finish', () => {
    fin({
      method: req.method,
      route: etiquetaRuta(req.baseUrl, req.route?.path),
      status_code: String(res.statusCode),
    });
  });
  next();
}
