import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { catalogApi, GetProductsParams } from '../api/catalogApi';
import { toast } from '@/shared/ui/toastStore';
import { apiErrorMessage } from '@/shared/lib/apiErrors';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => catalogApi.getCategories(),
    staleTime: 1000 * 60 * 5,
  });
}

export function useProducts(params: GetProductsParams) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => catalogApi.getProducts(params),
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => catalogApi.getProductById(id),
    enabled: Boolean(id && !isNaN(id)),
  });
}

export function useCatalogMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['categories'] });
    queryClient.invalidateQueries({ queryKey: ['product'] });
  };

  const createProductMutation = useMutation({
    mutationFn: catalogApi.createProduct,
    onSuccess: () => {
      toast.success('Producto creado');
      invalidate();
    },
    onError: (err: unknown) => {
      const msg = apiErrorMessage(err, 'Error al crear producto');
      toast.error(msg);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof catalogApi.updateProduct>[1] }) =>
      catalogApi.updateProduct(id, data),
    onSuccess: () => {
      toast.success('Producto actualizado');
      invalidate();
    },
    onError: (err: unknown) => {
      const msg = apiErrorMessage(err, 'Error al actualizar producto');
      toast.error(msg);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: catalogApi.deleteProduct,
    onSuccess: () => {
      toast.success('Producto desactivado');
      invalidate();
    },
    onError: (err: unknown) => {
      const msg = apiErrorMessage(err, 'Error al desactivar producto');
      toast.error(msg);
    },
  });

  const saveCategoryMutation = useMutation({
    mutationFn: catalogApi.saveCategory,
    onSuccess: () => {
      toast.success('Categoría guardada');
      invalidate();
    },
    onError: (err: unknown) => {
      const msg = apiErrorMessage(err, 'Error al guardar categoría');
      toast.error(msg);
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({ idVariante, nuevoPrecio }: { idVariante: number; nuevoPrecio: number }) =>
      catalogApi.updatePrice(idVariante, nuevoPrecio),
    onSuccess: () => {
      toast.success('Precio actualizado sin afectar pedidos anteriores');
      invalidate();
    },
    onError: (err: unknown) => {
      const msg = apiErrorMessage(err, 'Error al actualizar precio');
      toast.error(msg);
    },
  });

  return {
    createProductMutation,
    updateProductMutation,
    deleteProductMutation,
    saveCategoryMutation,
    updatePriceMutation,
  };
}
