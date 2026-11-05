import type { AxiosError } from 'axios';
import { formatMoney } from './formatters';

// Código de negocio -> texto para el usuario
// Si no está aquí, se usa el mensaje del servidor
const MENSAJES: Record<string, string> = {
  // sesión y cuenta
  EMAIL_ALREADY_REGISTERED: 'Ese correo ya tiene una cuenta.',
  INVALID_CREDENTIALS: 'Correo o contraseña incorrectos.',
  INVALID_CURRENT_PASSWORD: 'La contraseña actual no es correcta.',
  ACCOUNT_DISABLED: 'Tu cuenta está desactivada.',
  SESSION_INVALID: 'Tu sesión ya no es válida. Inicia sesión de nuevo.',
  REFRESH_TOKEN_INVALID: 'Tu sesión caducó. Inicia sesión de nuevo.',
  REFRESH_TOKEN_REUSED: 'Tu sesión caducó. Inicia sesión de nuevo.',
  REFRESH_TOKEN_EXPIRED: 'Tu sesión caducó. Inicia sesión de nuevo.',
  REFRESH_IN_PROGRESS: 'Tu sesión se está renovando. Intenta de nuevo en unos segundos.',
  TOKEN_EXPIRED: 'Tu sesión caducó. Inicia sesión de nuevo.',
  TOKEN_MISSING: 'Inicia sesión para continuar.',
  TOKEN_PERMISSIONS_CHANGED: 'Tus permisos cambiaron. Inicia sesión de nuevo.',
  FORBIDDEN_ROLE: 'No tienes permiso para hacer esto.',
  USER_NOT_FOUND: 'No se encontró al usuario.',
  USER_INACTIVE: 'Esa cuenta está desactivada.',
  ROLE_INVALID: 'El rol no es válido.',
  // catálogo
  PRODUCT_NOT_FOUND: 'El producto no existe o ya no está disponible.',
  VARIANT_NOT_FOUND: 'Esa variante no existe.',
  VARIANT_UNAVAILABLE: 'Esa variante ya no está disponible.',
  CATEGORY_NOT_FOUND: 'La categoría no existe.',
  IMAGE_NOT_FOUND: 'La imagen no existe.',
  IMAGE_URL_INVALID: 'La dirección de la imagen no es válida.',
  GALLERY_LIMIT_REACHED: 'La galería ya llegó a su límite de imágenes.',
  SKU_DUPLICATED: 'Ya existe una variante con ese SKU.',
  PRICE_INVALID: 'El precio no es válido.',
  REFERENCE_PRICE_INVALID: 'El precio de referencia debe ser mayor a cero.',
  NAME_TOO_SHORT: 'El nombre es demasiado corto.',
  // inventario
  INSUFFICIENT_STOCK: 'No hay existencia suficiente.',
  STOCK_EXHAUSTED: 'Ese producto se agotó.',
  RESERVA_VENCIDA: 'Tu reserva venció. Vuelve a reservar para pagar.',
  CLAVE_IDEMPOTENCIA_EN_USO: 'Esta compra ya está en proceso. Intenta de nuevo.',
  LAST_UNIT_TAKEN: 'Alguien más se llevó la última unidad.',
  STOCK_WOULD_BE_NEGATIVE: 'El ajuste dejaría la existencia en negativo.',
  MOVEMENT_REASON_REQUIRED: 'Escribe el motivo del movimiento.',
  MOVEMENT_QUANTITY_ZERO: 'La cantidad no puede ser 0.',
  CANTIDAD_INVALIDA: 'La cantidad del movimiento no es válida.',
  MOVEMENT_TYPE_INVALID: 'El tipo de movimiento no es válido.',
  TIPO_MOVIMIENTO_INVALIDO: 'El tipo de movimiento no es válido.',
  INVALID_DATE_RANGE: 'La fecha final debe ser igual o posterior a la inicial.',
  // carrito y cupones
  CART_NOT_FOUND: 'No se encontró tu carrito.',
  CART_FORBIDDEN: 'Ese carrito no te pertenece.',
  CART_EMPTY: 'Tu carrito está vacío.',
  MISSING_CART_OWNER: 'No se pudo identificar tu carrito. Recarga la página.',
  COUPON_NOT_FOUND: 'Ese cupón no existe.',
  COUPON_NOT_STARTED: 'Ese cupón todavía no está vigente.',
  COUPON_EXPIRED: 'Ese cupón ya venció.',
  COUPON_INACTIVE: 'Ese cupón está desactivado.',
  COUPON_EXHAUSTED: 'Ese cupón ya se agotó.',
  COUPON_MINIMUM_NOT_MET: 'Tu compra no llega al mínimo que pide el cupón.',
  COUPON_USER_LIMIT: 'Ya usaste este cupón el máximo de veces.',
  COUPON_NOT_APPLICABLE: 'Ese cupón no aplica a los productos de tu carrito.',
  DISCOUNT_TYPE_INVALID: 'El tipo de descuento no es válido.',
  CUPON_FECHAS_INVALIDAS: 'La fecha de fin debe ser posterior a la de inicio.',
  PORCENTAJE_INVALIDO: 'El porcentaje debe estar entre 1 y 100.',
  MONTO_DESCUENTO_INVALIDO: 'El monto del descuento debe ser mayor a 0.',
  MONTO_MINIMO_INVALIDO: 'La compra mínima no puede ser negativa.',
  // direcciones, pago y pedidos
  ADDRESS_INVALID: 'La dirección no es válida.',
  ADDRESS_NOT_FOUND: 'La dirección no existe.',
  ADDRESS_FORBIDDEN: 'Esa dirección no te pertenece.',
  MUNICIPALITY_NOT_FOUND: 'El municipio no existe.',
  PAYMENT_REJECTED: 'El pago fue rechazado. No se hizo ningún cobro.',
  ORDER_NOT_FOUND: 'El pedido no existe.',
  ORDER_FORBIDDEN: 'Ese pedido no es tuyo.',
  ORDER_CLIENT_CANCEL_ONLY: 'Solo puedes cancelar tus propios pedidos.',
  FORBIDDEN_STATE: 'Ya no se puede cancelar: el pedido salió a entrega.',
  ORDER_STATE_NOT_FOUND: 'El estado del pedido no existe.',
  INVALID_STATE_TRANSITION: 'Ese cambio de estado no está permitido.',
  ORDER_LINE_NOT_FOUND: 'Esa línea no pertenece al pedido.',
  RETURN_NOT_ALLOWED: 'Este pedido no admite devoluciones.',
  RETURN_EXCEEDS_SOLD: 'No puedes devolver más unidades de las compradas.',
  RETURN_QUANTITY_INVALID: 'La cantidad a devolver debe ser positiva.',
  PAGO_RECHAZADO: 'El pago fue rechazado. No se hizo ningún cobro.',
  PAGO_REVERTIDO: 'No se pudo crear el pedido. El cobro fue anulado.',
  PAGO_EN_CONCILIACION: 'Estamos confirmando tu pago. Revisa Mis pedidos en unos minutos; no vuelvas a pagar.',
  ALMACENAMIENTO_NO_CONFIGURADO: 'La carga de imágenes no está disponible. Pega una URL.',
  // generales
  SIN_CONEXION: 'No hay conexión con el servidor. Revisa tu internet.',
  DUPLICATE_KEY: 'Ya existe un registro con ese valor.',
  VALIDATION_ERROR: 'Revisa los datos del formulario.',
  INTERNAL_ERROR: 'Algo salió mal de nuestro lado. Intenta de nuevo.',
};

interface CuerpoError {
  codigo?: string;
  mensaje?: string;
  detalles?: Array<{ campo?: string; mensaje?: string }>;
  datos?: { montoMinimo?: number; subtotal?: number; montoFaltante?: number };
}

export function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const e = err as AxiosError | undefined;
  return Boolean(e?.isAxiosError && !e.response && e.code !== 'ERR_CANCELED');
}

export function apiFieldErrors(err: unknown): Array<{ campo: string; mensaje: string }> {
  const detalles = (err as AxiosError<CuerpoError>)?.response?.data?.detalles;
  if (!Array.isArray(detalles)) return [];
  return detalles.flatMap((d) => (d?.campo && d.mensaje ? [{ campo: d.campo, mensaje: d.mensaje }] : []));
}

export function errorCode(err: unknown): string | undefined {
  if (isNetworkError(err)) return 'SIN_CONEXION';
  return (err as AxiosError<CuerpoError>)?.response?.data?.codigo;
}

/** Texto para el usuario: código, luego servidor, luego respaldo. `especificos` pisa ciertos códigos. */
export function apiErrorMessage(
  err: unknown,
  fallback = 'Ocurrió un error. Intenta de nuevo.',
  especificos?: Record<string, string>,
): string {
  const codigo = errorCode(err);
  if (codigo && especificos?.[codigo]) return especificos[codigo];
  const datos = (err as AxiosError<CuerpoError>)?.response?.data?.datos;
  if (codigo === 'COUPON_MINIMUM_NOT_MET' && typeof datos?.montoMinimo === 'number' && Number.isFinite(datos.montoMinimo)) {
    const falta = typeof datos.montoFaltante === 'number' && Number.isFinite(datos.montoFaltante) && datos.montoFaltante > 0
      ? ` Te faltan ${formatMoney(datos.montoFaltante)}.` : '';
    return `Este cupón requiere una compra mínima de ${formatMoney(datos.montoMinimo)}.${falta}`;
  }
  if (codigo === 'VALIDATION_ERROR') {
    const campos = apiFieldErrors(err);
    if (campos.length > 0) return campos.map((c) => c.mensaje).join(' ');
  }
  if (codigo && MENSAJES[codigo]) return MENSAJES[codigo];
  return (err as AxiosError<CuerpoError>)?.response?.data?.mensaje || fallback;
}
