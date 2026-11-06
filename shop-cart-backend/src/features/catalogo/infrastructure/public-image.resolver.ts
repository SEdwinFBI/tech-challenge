import { env } from '@/core/config/env';
import { resolveImageUrl } from '../domain/stored-image.policy';

export const publicImageUrl = (valor: string | null | undefined): string | null =>
  resolveImageUrl(valor, env.CDN_BASE_URL);

export function withPublicImage<T extends object>(fila: T, campo: keyof T): T;
export function withPublicImage<T extends object>(fila: T | undefined, campo: keyof T): T | undefined;
export function withPublicImage<T extends object>(fila: T | undefined, campo: keyof T): T | undefined {
  if (!fila || !(campo in fila)) return fila;
  const valor = fila[campo] as unknown as string | null | undefined;
  return { ...fila, [campo]: publicImageUrl(valor) };
}

export const withPublicImages = <T extends object>(filas: readonly T[], campo: keyof T): T[] =>
  filas.map((fila) => withPublicImage(fila, campo));
