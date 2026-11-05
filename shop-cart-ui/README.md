# ShopCart UI

Frontend de **ShopCart · Don Arturo** (Reto Tech Challenge 360, Fase 2). React 19, TypeScript estricto, Vite y Tailwind CSS v4.

## Cómo ejecutarlo

```bash
cd shop-cart-ui
npm install
npm run dev          # http://localhost:5173, con proxy /api -> http://localhost:3000
```

El backend debe estar corriendo (`shop-cart-backend`, `npm run dev` o `npm start`) con la base creada mediante `npm run db:setup`, que aplica los scripts 01 a 05.
Para apuntar a otro backend sin tocar código: `API_TARGET=http://localhost:3001 npm run dev`.

| Comando | Qué hace |
| :--- | :--- |
| `npm run build` | Verifica tipos (`tsc -b`, modo estricto) y genera el paquete de producción |
| `npm run lint` | Linter (oxlint) |

Credenciales de prueba (contraseña `Admin123!` en las tres): `cliente@shopcart.gt`, `operador@shopcart.gt`, `admin@shopcart.gt`.
En desarrollo, la pantalla de ingreso ofrece botones para rellenarlas; en producción no aparecen.

## Roles y rutas

| Zona | Rutas | Acceso |
| :--- | :--- | :--- |
| Tienda | `/`, `/catalogo`, `/categoria/:id`, `/ofertas`, `/novedades`, `/producto/:id`, `/carrito` | Público (invitado con token de carrito) |
| Cuenta | `/cuenta/pedidos`, `/cuenta/pedidos/:id`, `/cuenta/favoritos`, `/cuenta/direcciones`, `/cuenta/perfil` | Cliente (el perfil también para staff) |
| Pago | `/checkout`, `/pedido/:id/confirmado` | Cliente |
| Backoffice | `/admin/pedidos`, `/admin/inventario` | Operador y Administrador |
| Backoffice | `/admin/dashboard`, `/admin/catalogo`, `/admin/cupones`, `/admin/usuarios`, `/admin/bitacora` | Solo Administrador |

Las rutas antiguas `/mis-pedidos`, `/mis-pedidos/:id` y `/mis-direcciones` redirigen a `/cuenta/...`.
El menú muestra solo lo que el rol puede usar y el backend vuelve a validarlo (401 y 403).

## Sistema de diseño

- **Marca**: jade (`--color-brand`), maíz para la acción principal (`--color-cta`) y achiote para ofertas (`--color-sale`). Neutros cálidos en lugar de grises azulados.
- Los tokens viven en `src/index.css` dentro de `@theme`. La escala jade reemplaza a `indigo-*` y los neutros cálidos a `slate-*`, por lo que cualquier pantalla se re-tiñe sin editarla.
- Tipografía Plus Jakarta Sans; los precios usan cifras tabulares y los centavos en superíndice (`PriceTag`).
- Accesibilidad: foco visible, áreas táctiles de 44 px, enlace "Saltar al contenido", `prefers-reduced-motion` y roles y etiquetas en carruseles, pestañas, contadores y diálogos.
- Componentes compartidos en `src/shared/ui`: `PriceTag`, `StockIndicator`, `QuantityStepper`, `Rail`, `Stepper`, `ReservationCountdown`, `FreeShippingProgress`, `OrderTimeline`, `IvaBreakdown`, `NumberedPagination`, `Drawer`, `SafeImage`, ilustraciones propias, además de los existentes (botón, tabla, modal, etc.).
- Todas las vistas con datos tienen estado de carga, vacío y error con "Reintentar".

## Decisiones técnicas

1. **Los filtros van en la URL** (`useCatalogFilters`): búsqueda, categoría, precio, disponibilidad, ofertas, novedades, orden y página. Se pueden compartir y el botón "atrás" funciona. El servidor busca, filtra, ordena y pagina (RF-02, RF-08).
2. **Reserva y pago**: al continuar al pago se reserva la existencia 15 minutos con cuenta regresiva. La clave de idempotencia se crea una vez por visita y se reutiliza en los reintentos; el botón se deshabilita al primer clic. Un doble clic produce una sola solicitud de confirmación.
3. **Envío**: `quoteShipping` replica la regla del servidor (gratis si el subtotal con descuento llega al mínimo del departamento). Sirve solo para mostrar el total antes de pagar. El que cobra es el servidor.
4. **Existencia vista por el propio carrito**: el backend descuenta únicamente lo apartado por otros carritos, así que quien reservó sus unidades no las ve como ajenas. La tienda usa esa cifra en carrito, detalle y agregado rápido.
5. **Caché y sesión**: al iniciar o cerrar sesión se descarta el carrito y los datos personales en caché. La restauración de sesión comparte una sola renovación de token, porque en desarrollo React ejecuta los efectos dos veces y reutilizar un refresh token en paralelo lo invalida.
6. **Dashboard en vivo**: `EventSource` no envía cabeceras, así que el token viaja en la dirección del canal y se reconecta con uno nuevo si cae. Gráficas con una sola escala por vista, vista alternativa en tabla y exportación a Excel.
7. **Imágenes**: `SafeImage` muestra un marcador si una URL falla, para que el diseño no se rompa.
8. **Precio de referencia**: solo muestra el descuento. Nunca cambia lo que se cobra ni los pedidos ya hechos.

## PWA

La tienda se puede instalar en el teléfono o en el escritorio.

- **Android y Chrome de escritorio**: usa "Instalar app" en el menú de tu cuenta, o el aviso del navegador.
- **iPhone (Safari)**: toca Compartir y luego "Agregar a inicio". La app muestra un aviso con esos pasos una sola vez.
- **Actualizaciones**: cuando hay una versión nueva aparece "Hay una versión nueva" con el botón "Actualizar".
- **Qué se guarda**: los archivos de la interfaz (JS, CSS, íconos), las imágenes de productos (hasta 200, 30 días) y las fuentes.
- **Qué nunca se guarda**: las respuestas de `/api`. Precios, existencias y pedidos siempre vienen del servidor.
- **Sin internet**: la app abre, avisa que no hay conexión y pausa las acciones que la necesitan. Al volver la red recarga los datos.

El service worker solo se genera con `npm run build`. Para probarlo: `npm run build && npm run preview`.

## Estructura

```
src/
  app/            layouts (tienda, pago, cuenta, backoffice), guardas de ruta, router, proveedores
  features/       auth, catalog, cart, checkout, orders, wishlist, account, home, inventory, coupons, dashboard, users, audit-log
  shared/         ui (componentes), lib (formatos, precios, estados de pedido), hooks, types
```

Cada feature agrupa `api/`, `hooks/`, `components/` y `pages/`. Las páginas no contienen lógica de negocio: los cálculos viven en `shared/lib` y en hooks.

## Verificación realizada

- `tsc -b` en modo estricto y `vite build` sin errores.
- Recorridos de extremo a extremo en el navegador (Playwright): visitante agrega al carrito, inicia sesión y el carrito se conserva, reserva con cuenta regresiva, pago con doble clic (una sola confirmación) y página de confirmación con desglose de IVA; backoffice con dashboard en vivo, catálogo con editor, e inventario con existencias bajas.
- El detalle de cada extensión de backend usada por esta interfaz está en la sección 11 del README del backend.

## Mejoras posibles

Reseñas con compra verificada, listas de regalos, subcategorías, recojo en tienda y pruebas automatizadas de interfaz (hoy se verificó con recorridos manuales en navegador).
