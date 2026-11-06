# Recomendaciones y revisión del catálogo

## Señales

Las vistas valen 1 punto, los favoritos 3, el carrito 4 y las compras no canceladas ni devueltas 6. Las vistas repetidas dentro de un minuto se ignoran; se acumulan hasta 3 y pierden la mitad de su peso cada 14 días. Las compras pierden la mitad cada 30 días. Lo anterior a 90 días no cuenta.

Favoritos y carrito se leen de SQL en cada consulta. El producto abierto y los del carrito no se recomiendan. Los visitantes usan el hash SHA-256 de su `X-Guest-Token`; las cuentas, su id. El historial de invitado no pasa a la cuenta al iniciar sesión.

Cada propietario guarda como máximo 50 vistas (`SP_Recomendaciones_RegistrarVista` borra las más antiguas). Cada día a las 03:17 el servidor ejecuta `SP_Recomendaciones_PurgarVistas`, que borra las de más de 90 días; con varias réplicas, el lock de Redis hace que corra una sola.

## Rutas

- `POST /api/v1/recomendaciones/vistas` con `{ "idProducto": 1 }`. Responde 204.
- `GET /api/v1/recomendaciones?contexto=producto|carrito|inicio|favoritos|ofertas&idProducto=1`. Responde `{ ok, items, origen }`, con `origen` igual a `jev` o `preferencias`.
- `GET /api/v1/recomendaciones/busqueda?q=...`. Responde `{ ok, item }`; `item` es `null` si no hay una alternativa suficientemente relevante.
- `POST /api/v1/catalogo/revision` (solo administrador) con nombre, descripción e id del producto que se edita. Responde `{ ok, categoriaSugerida, posiblesDuplicados, evaluacionDisponible }` y no modifica datos.

Las rutas de recomendaciones aceptan sesión opcional (un token vencido se trata como invitado) y exigen `X-Guest-Token` si no hay sesión. Llevan límite de peticiones y `Cache-Control: private, no-store`.

## IA

Se configura con `TYPESAFE_API_KEY`, `JEV_MODEL`, `JEV_TIMEOUT_MS` y `JEV_URL`, solo en `shop-cart-backend/.env`. Sin clave, o ante cualquier fallo, se usa el orden local por afinidad y destacados.

- Recibe nombres, categorías, precios, descuentos y señales con su peso, o el texto de búsqueda. Nunca ids de usuario, tokens ni datos de pago.
- La respuesta se valida antes de usarla.
- Un fallo pausa las llamadas 30 segundos (compartido por la caché cuando hay Redis). Solo se registra el código HTTP o el tipo de error.
- Presupuesto: 30 llamadas por minuto en total entre réplicas (contador en Redis o en memoria). Agotado, se usa el orden local.
- Las recomendaciones se guardan en la caché antes de consultar SQL: 180 s si las ordenó la IA, 30 s si es el orden local. La clave depende del propietario, el contexto, el producto y los filtros, así que un cambio de favoritos o carrito puede tardar hasta ese tiempo en notarse.
- La búsqueda de sugerencia limpia el texto (solo letras, números y espacios), usa hasta 8 palabras de 2 a 40 caracteres y las compara con nombre, descripción y categoría. Suma productos de las mismas categorías y, si nada coincide, usa el catálogo disponible. Envía hasta 25 candidatos a la IA y devuelve el mejor desde 1.2 de 2 (`confianza`: `alta` desde 1.7, `media` en otro caso). Sin IA o ante un fallo devuelve `item: null`. Solo consulta con 3 o más caracteres. El front la muestra cuando la búsqueda normal no tiene resultados o, con resultados, si el producto no está entre ellos.
- La revisión propone una categoría (desde 1.5) y duplicados (desde 1.7, máximo 5). Sin IA, solo marca nombres exactamente iguales.

## Base de datos

`npm run db:setup` crea la tabla `RecomendacionVistas` en `scrips/01_tablas_y_semilla_base.sql` y los procedimientos en `scrips/04_stored_procedures.sql`. El script 01 solo se ejecuta si la base no tiene tablas; una base existente necesita aplicar a mano el índice `IX_RecomendacionVistas_UltimaVista`.

## Estructura

`models` (esquemas Zod, tipos y resultados), `abstracts` (puertos), `repository` (solo procedimientos), `domain` (reglas puras), `infrastructure` (adaptadores de IA con sus textos), `commands` y `queries` (casos de uso). El cliente `core/ai/jev-score.client.ts` solo hace la llamada HTTP; `core/ai/score-client.factory.ts` aplica el presupuesto.

## Pruebas

`npm test` incluye `tests/recomendaciones.test.ts` y simula el proveedor. La prueba SQL/HTTP (`npm run test:recommendations:integration`) necesita `RUN_RECOMMENDATION_INTEGRATION=1`, `TYPESAFE_API_KEY` vacía y `DB_NAME=ShopCartRecommendations_test`.
