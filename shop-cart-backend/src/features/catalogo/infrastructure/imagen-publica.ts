import { env } from '@/core/config/env';
import { resolverUrlImagen } from '../domain/imagen-almacenada';

export const urlPublicaImagen = (valor: string | null | undefined): string | null =>
  resolverUrlImagen(valor, env.CDN_BASE_URL);

export function conImagenPublica<T extends object>(fila: T, campo: keyof T): T;
export function conImagenPublica<T extends object>(fila: T | undefined, campo: keyof T): T | undefined;
export function conImagenPublica<T extends object>(fila: T | undefined, campo: keyof T): T | undefined {
  if (!fila || !(campo in fila)) return fila;
  const valor = fila[campo] as unknown as string | null | undefined;
  return { ...fila, [campo]: urlPublicaImagen(valor) };
}

export const conImagenesPublicas = <T extends object>(filas: readonly T[], campo: keyof T): T[] =>
  filas.map((fila) => conImagenPublica(fila, campo));
