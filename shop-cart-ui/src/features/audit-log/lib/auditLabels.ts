import { formatDateTime, formatMoney } from '@/shared/lib/formatters';
import { orderStatusMeta } from '@/shared/lib/orderStatus';

export const ACCION_LABEL: Record<string, string> = {
  CREACION: 'Creación',
  MODIFICACION: 'Modificación',
  DESACTIVACION: 'Desactivación',
  ELIMINACION_FISICA: 'Eliminación física',
  CAMBIO_ESTADO: 'Cambio de estado',
  CAMBIO_ROL: 'Cambio de rol',
  CAMBIO_PASSWORD: 'Cambio de contraseña',
  DEVOLUCION: 'Devolución',
  ENTRADA_COMPRA: 'Entrada por compra',
  SALIDA_VENTA: 'Salida por venta',
  AJUSTE_POSITIVO: 'Ajuste (+)',
  AJUSTE_NEGATIVO: 'Ajuste (−)',
  DEVOLUCION_CLIENTE: 'Devolución de cliente',
};

export const MODULO_LABEL: Record<string, string> = {
  PRODUCTOS: 'Productos',
  PRECIOS: 'Precios',
  INVENTARIO: 'Inventario',
  PEDIDOS: 'Pedidos',
  USUARIOS: 'Usuarios',
  CUPONES: 'Cupones',
};

export const ENTIDAD_LABEL: Record<string, string> = {
  Categorias: 'Categorías',
  Productos: 'Productos',
  Variantes: 'Variantes',
  ProductoImagenes: 'Imágenes de producto',
  Usuarios: 'Usuarios',
  Pedidos: 'Pedidos',
  Devoluciones: 'Devoluciones',
  Cupones: 'Cupones',
};

const CAMPO_LABEL: Record<string, string> = {
  Precio: 'Precio',
  PrecioReferencia: 'Precio antes',
  IDEstadoPedido: 'Estado',
  Estado: 'Estado',
  Codigo: 'Código',
  Activo: 'Activo',
  Nombre: 'Nombre',
  SKU: 'SKU',
  Valor: 'Valor',
  Rol: 'Rol',
  Motivo: 'Motivo',
  Destacado: 'Destacado',
  ImagenUrl: 'Imagen',
  Url: 'URL',
  Orden: 'Orden',
  IDCategoria: 'Categoría (ID)',
  IDProducto: 'Producto (ID)',
  ExistenciaFisica: 'Existencia',
  ExistenciaInicial: 'Existencia inicial',
  MontoReembolsado: 'Monto reembolsado',
  Total: 'Total',
  PasswordActualizado: 'Contraseña actualizada',
};

const BOOLEAN_KEYS = new Set(['Activo', 'Destacado', 'PasswordActualizado']);
const MONEY_KEYS = new Set(['Precio', 'PrecioReferencia', 'Total', 'MontoReembolsado']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function humanize(raw: string): string {
  const isId = /^ID[A-Z]/.test(raw);
  const spaced = raw.replace(/^ID(?=[A-Z])/, '').replace(/([a-záéíóúñ])([A-Z])/g, '$1 $2').trim();
  const text = spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
  return isId ? `${text} (ID)` : text;
}

export const accionLabel = (code: string) => ACCION_LABEL[code] ?? humanize(code.toLowerCase().replace(/_/g, ' '));
export const moduloLabel = (code: string) => MODULO_LABEL[code] ?? code;
export const entidadLabel = (code: string) => ENTIDAD_LABEL[code] ?? code;
export const campoLabel = (key: string) => CAMPO_LABEL[key] ?? humanize(key);

export type ParsedAudit = { kind: 'object'; data: Record<string, unknown> } | { kind: 'empty' } | { kind: 'raw'; text: string };

export function parseAudit(val: string | null): ParsedAudit {
  if (!val) return { kind: 'empty' };
  try {
    const parsed: unknown = JSON.parse(val);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { kind: 'object', data: parsed as Record<string, unknown> };
    return { kind: 'raw', text: JSON.stringify(parsed, null, 2) };
  } catch {
    return { kind: 'raw', text: val };
  }
}

export function formatValue(key: string, value: unknown): { text: string; block: boolean } {
  if (value === null || value === undefined || value === '') return { text: '—', block: false };
  if (typeof value === 'object') return { text: JSON.stringify(value, null, 2), block: true };
  if (BOOLEAN_KEYS.has(key) || typeof value === 'boolean') {
    const on = value === true || value === 1 || value === '1' || value === 'true';
    return { text: on ? 'Sí' : 'No', block: false };
  }
  if (MONEY_KEYS.has(key) && Number.isFinite(Number(value))) return { text: formatMoney(Number(value)), block: false };
  if (key === 'Estado') return { text: orderStatusMeta(String(value)).label, block: false };
  if (key === 'Rol') return { text: String(value).charAt(0) + String(value).slice(1).toLowerCase(), block: false };
  if (typeof value === 'string' && (key.startsWith('Fecha') || ISO_DATE.test(value))) return { text: formatDateTime(value), block: false };
  return { text: String(value), block: false };
}
