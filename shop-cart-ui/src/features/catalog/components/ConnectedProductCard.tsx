import React from 'react';
import { useFavorites } from '@/features/wishlist';
import { useQuickAdd } from '../hooks/useQuickAdd';
import { ProductCard, type ProductCardProps } from '@/shared/ui/ProductCard';

type ConnectedProductCardProps = Pick<ProductCardProps, 'product' | 'variant'>;

export const ConnectedProductCard: React.FC<ConnectedProductCardProps> = ({ product, variant }) => {
  const { isFavorite, toggle } = useFavorites();
  const { add, pendingId } = useQuickAdd();

  return (
    <ProductCard
      product={product}
      variant={variant}
      isFavorite={isFavorite(product.IDProducto)}
      onToggleFavorite={() => toggle(product.IDProducto)}
      onAdd={() => add(product.IDProducto)}
      adding={pendingId === product.IDProducto}
    />
  );
};
