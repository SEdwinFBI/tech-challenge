import type { QueryClient, QueryKey } from '@tanstack/react-query';

export const queryKeys = {
  catalog: {
    all: ['catalog'] as const,
    products: () => ['catalog', 'products'] as const,
    list: (params: object) => ['catalog', 'products', params] as const,
  },
  product: {
    all: ['product'] as const,
    detail: (id: number) => ['product', id] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  megaMenu: {
    all: ['mega-menu'] as const,
    preview: (categoryId: number | null) => ['mega-menu', 'preview', categoryId] as const,
  },
  home: {
    all: ['home'] as const,
    section: (key: string, params: object) => ['home', key, params] as const,
  },
  search: {
    all: ['search'] as const,
    suggestions: (term: string) => ['search', 'suggestions', term] as const,
    recommendation: (filters: object) => ['search', 'recommendation', filters] as const,
  },
  cart: {
    all: ['cart'] as const,
  },
  favorites: {
    all: ['favorites'] as const,
    ids: () => ['favorites', 'ids'] as const,
    list: () => ['favorites', 'list'] as const,
  },
  addresses: {
    all: ['addresses'] as const,
  },
  municipalities: {
    all: ['municipalities'] as const,
  },
  orders: {
    all: ['orders'] as const,
    mine: (page: number, estado: string) => ['orders', 'mine', page, estado] as const,
    detail: (id: number) => ['orders', 'detail', id] as const,
  },
  adminOrders: {
    all: ['admin-orders'] as const,
    lists: () => ['admin-orders', 'list'] as const,
    list: (params: object) => ['admin-orders', 'list', params] as const,
    detail: (id: number) => ['admin-orders', 'detail', id] as const,
  },
  adminCatalog: {
    all: ['admin-catalog'] as const,
    list: (params: object) => ['admin-catalog', 'list', params] as const,
  },
  adminProduct: {
    all: ['admin-product'] as const,
    detail: (id: number | null) => ['admin-product', id] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    kardexAll: () => ['inventory', 'kardex'] as const,
    kardex: (params: object) => ['inventory', 'kardex', params] as const,
    lowStockAll: () => ['inventory', 'low-stock'] as const,
    lowStock: (params: object) => ['inventory', 'low-stock', params] as const,
    productAll: () => ['inventory', 'product'] as const,
    product: (id: number | null) => ['inventory', 'product', id] as const,
    picker: (term: string) => ['inventory', 'picker', term] as const,
  },
  coupons: {
    all: ['coupons'] as const,
    list: (params: object) => ['coupons', 'list', params] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params: object) => ['users', 'list', params] as const,
  },
  payments: {
    all: ['payments'] as const,
    list: (params: object) => ['payments', 'list', params] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: (periodo: string) => ['dashboard', 'summary', periodo] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: (params: object) => ['audit', 'list', params] as const,
  },
  recommendations: {
    all: ['recommendations'] as const,
    list: (identity: string, contexto: string, idProducto: number | undefined, filters: object) =>
      ['recommendations', identity, contexto, idProducto, filters] as const,
  },
};

export const mutationKeys = {
  favorites: { toggle: ['favorites', 'toggle'] as const },
  cart: {
    upsert: ['cart', 'upsert'] as const,
    remove: ['cart', 'remove'] as const,
    applyCoupon: ['cart', 'apply-coupon'] as const,
    removeCoupon: ['cart', 'remove-coupon'] as const,
  },
  recommendations: { recordView: ['recommendations', 'record-view'] as const },
  catalog: { review: ['catalog', 'review'] as const },
  orders: { cancel: ['orders', 'cancel'] as const },
  adminOrders: {
    changeStatus: ['admin-orders', 'change-status'] as const,
    returnLine: ['admin-orders', 'return-line'] as const,
  },
  inventory: { createMovement: ['inventory', 'create-movement'] as const },
  coupons: {
    save: ['coupons', 'save'] as const,
    status: ['coupons', 'status'] as const,
  },
  users: {
    status: ['users', 'status'] as const,
    role: ['users', 'role'] as const,
  },
};

const stockKeys: readonly QueryKey[] = [
  queryKeys.catalog.all,
  queryKeys.product.all,
  queryKeys.home.all,
  queryKeys.inventory.kardexAll(),
  queryKeys.inventory.lowStockAll(),
  queryKeys.inventory.productAll(),
  queryKeys.adminCatalog.all,
  queryKeys.adminProduct.all,
];

const userScopedKeys: readonly QueryKey[] = [
  queryKeys.favorites.all,
  queryKeys.addresses.all,
  queryKeys.orders.all,
  queryKeys.adminOrders.all,
  queryKeys.users.all,
  queryKeys.inventory.all,
  queryKeys.coupons.all,
  queryKeys.payments.all,
  queryKeys.dashboard.all,
  queryKeys.audit.all,
  queryKeys.adminProduct.all,
  queryKeys.adminCatalog.all,
  queryKeys.recommendations.all,
];

export function invalidateStock(queryClient: QueryClient) {
  return Promise.all(stockKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function clearUserSession(queryClient: QueryClient) {
  void queryClient.resetQueries({ queryKey: queryKeys.cart.all });
  userScopedKeys.forEach((queryKey) => queryClient.removeQueries({ queryKey }));
}
