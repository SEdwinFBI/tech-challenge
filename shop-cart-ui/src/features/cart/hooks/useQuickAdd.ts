import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useCart } from './useCart';
import { toast } from '@/shared/ui/toastStore';
import { catalogApi } from '@/features/catalog/api/catalogApi';

// El carrito espera la cantidad total, no el delta
export function useQuickAdd() {
  const { cart, upsertItem } = useCart();
  const navigate = useNavigate();
  const [pendingId, setPendingId] = useState<number | null>(null);

  const add = async (idProducto: number) => {
    setPendingId(idProducto);
    try {
      const detalle = await catalogApi.getProductById(idProducto);
      const activas = detalle.variantes.filter(v => v.Activo);

      if (activas.length !== 1) {
        navigate(`/producto/${idProducto}`);
        return;
      }
      const variante = activas[0];
      // Si ya está en el carrito, descuenta solo reservas de otros
      const linea = cart?.items.find(i => i.IDVariante === variante.IDVariante);
      const tope = linea ? linea.ExistenciaDisponible : variante.ExistenciaDisponible;
      if (tope <= 0) {
        toast.warning('Sin existencia');
        return;
      }

      const enCarrito = linea?.Cantidad ?? 0;
      if (enCarrito + 1 > tope) {
        toast.warning('Límite de existencia', `Ya tienes ${enCarrito} en tu carrito.`);
        return;
      }

      upsertItem(
        { idVariante: variante.IDVariante, cantidad: enCarrito + 1 },
        { onSuccess: () => toast.success('Agregado al carrito', detalle.producto.Nombre) },
      );
    } catch {
      toast.error('No se pudo agregar el producto');
    } finally {
      setPendingId(null);
    }
  };

  return { add, pendingId };
}
