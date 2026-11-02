# ShopCart Backend

API de comercio electrónico para gestionar catálogo, inventario, carritos, pedidos y usuarios. Está desarrollada con TypeScript, Express y SQL Server. El pago se simula; no hay integración con una pasarela de cobros.

## Arquitectura

Es un monolito modular. El código se organiza por funcionalidad: cada módulo de `features/` reúne todo lo suyo, y lo transversal (configuración, middlewares, errores de dominio) está en `core/`.

Dentro de cada módulo el flujo es ruta, comando o consulta, repositorio y procedimiento almacenado. La ruta valida la entrada con Zod y delega en un handler; el handler aplica las reglas de negocio; el repositorio, declarado como interfaz en `abstracts/`, solo invoca procedimientos almacenados. Se usa CQRS en su versión ligera: las escrituras son comandos y las lecturas son consultas, pero comparten la misma base de datos y no hay bus de mensajes.

Las reglas que no dependen de la base de datos, como la máquina de estados del pedido, las políticas de cupones e inventario y el manejo de importes, están en `domain/` como código sin efectos. Las transacciones y el control de existencias se resuelven en SQL Server.

## Desarrollo local

El backend está en `shop-cart-backend/`. 

Se necesita Node.js 24 o superior y  SQL Server. La configuración de conexión se toma de `.env`.

Desde la raíz del repositorio:

```sh
cd shop-cart-backend
npm ci
```

Crear `.env` a partir de [`.env.example`](.env.example).

Completar las credenciales de SQL Server y los secretos de JWT antes de iniciar la aplicación.

| Variable | Uso |
| --- | --- |
| `PORT` | Puerto HTTP; por defecto, `3000`. |
| `NODE_ENV` | Entorno: `development`, `test` o `production`. |
| `DB_HOST`, `DB_PORT` | Dirección y puerto de SQL Server. |
| `DB_USER`, `DB_PASSWORD` | Credenciales de conexión. |
| `DB_NAME` | Nombre de la base de datos. |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Secretos de autenticación. |
| `JWT_ACCESS_EXPIRES_IN_MIN` | Duración del token de acceso; por defecto, `15m`. |
| `JWT_REFRESH_EXPIRES_IN_DAYS` | Duración del refresh token en días; por defecto, `7`. |
| `JWT_FAMILY_EXPIRES_IN_DAYS` | Duración máxima de la familia de sesiones en días; por defecto, `30`. |
| `RATE_LIMIT_AUTH_MAX` | Intentos de autenticación permitidos por ventana; por defecto, `15`. |
| `RATE_LIMIT_AUTH_WINDOW_MIN` | Ventana de autenticación en minutos; por defecto, `15`. |
| `CORS_ALLOW_ORIGIN` | Origen permitido para el frontend; en desarrollo, `http://localhost:5173`. |

### Base de datos

Con SQL Server disponible y `.env` configurado, ejecutar desde `shop-cart-backend/`:

```sh
npm run db:setup
```

El inicializador crea la base indicada en `DB_NAME` si no existe, crea las tablas cuando la base no tiene tablas de usuario y aplica funciones, vistas, procedimientos, datos de ejemplo y se agrego mas cosas para la  tienda. El usuario de conexión necesita permisos para estas operaciones.

Los archivos SQL están en [`scrips/`](scrips/), numerados según su orden de ejecución:

1. [`01_tablas_y_semilla_base.sql`](scrips/01_tablas_y_semilla_base.sql): tablas y datos base.
2. [`02_funciones.sql`](scrips/02_funciones.sql): funciones de inventario y descuentos.
3. [`03_vistas.sql`](scrips/03_vistas.sql): consultas agregadas de pedidos y ventas.
4. [`04_stored_procedures.sql`](scrips/04_stored_procedures.sql): operaciones del negocio.
5. [`05_seed_datos_demo.sql`](scrips/05_seed_datos_demo.sql): datos de ejemplo.
6. [`06_extensiones_tienda.sql`](scrips/06_extensiones_tienda.sql): galería, favoritos y otras funciones de tienda.

`db:setup` es un inicializador, no un sistema de migraciones

### Servidor

```sh
npm run dev
```

La API queda disponible en `http://localhost:3000/api/v1`. El puerto depende de `PORT`.

- Estado del proceso: [`GET /health`](http://localhost:3000/health).
- Referencia de la API: [`/api/docs`](http://localhost:3000/api/docs).
- Especificación OpenAPI: [`/api/openapi.json`](http://localhost:3000/api/openapi.json).

`/health` informa que el proceso responde; no comprueba la conexión a SQL Server.



## Organización del código

```text
shop-cart-backend/
├── scrips/                 Scripts de SQL Server
├── src/
│   ├── core/
│   │   ├── config/         Entorno, conexión e inicialización de la base
│   │   ├── cqrs/           Contratos de comandos y consultas
│   │   ├── domain/         Errores y manejo de importes
│   │   ├── http/           OpenAPI y gestión 
│   │   └── middlewares/    Autenticación, validación y errores
│   ├── features/           Módulos del negocio y registro de rutas
│   └── server.ts           Entrada HTTP y limpieza de reservas
└── tests/                  Pruebas de dominio, integración y concurrencia
```

Cada módulo tiene rutas, modelos, comandos, consultas y repositorio. Los Command representan operaciones de escritura; las Queries lecturas. Los contratos de repositorio están en `abstracts/` y las implementaciones en `repository/`.

Los repositorios acceden a SQL Server mediante procedimientos almacenados. Las transacciones y el control de existencias se resuelven en la base de datos. El inicializador de la base ejecuta los scripts SQL directamente.

El registro en [`src/features/index.ts`](src/features/index.ts) busca archivos `*.routes.ts` o `*.routes.js` y monta cada router bajo `/api/v1/<nombre>`.

| Módulo | Responsabilidad |
| --- | --- |
| `auth` | Registro, inicio y cierre de sesión, renovación de tokens, perfil, usuarios y roles. |
| `catalogo` | Categorías, productos, variantes, precios e imágenes. |
| `inventario` | Kardex, movimientos y consulta de existencias bajas. |
| `carrito` | Artículos del carrito de clientes e invitados. |
| `cupones` | Creación, aplicación y retiro de descuentos. |
| `checkout` | Direcciones, reserva de existencias y confirmación de pedidos. |
| `pedidos` | Historial, cambios de estado y devoluciones. |
| `favoritos` | Productos guardados por cada cliente. |
| `dashboard` | Métricas, exportación a Excel y actualizaciones por SSE. |
| `bitacora` | Consulta de auditoría. |
| `seed` | Carga de datos de ejemplo en desarrollo. |

Los contratos de las peticiones y respuestas se consultan en la referencia OpenAPI del servidor.

## Acceso y datos de ejemplo

El seed crea estas cuentas en una instalación nueva:

| Rol | Correo | Contraseña inicial |
| --- | --- | --- |
| Administrador | `admin@shopcart.gt` | `Admin123!` |
| Operador | `operador@shopcart.gt` | `Admin123!` |
| Cliente | `cliente@shopcart.gt` | `Admin123!` |

Al volver a aplicar el seed se conservan las contraseñas de usuarios existentes.

El administrador gestiona catálogo, usuarios, cupones y reportes. El operador trabaja con inventario, preparación de pedidos y devoluciones. El cliente accede a sus propios carritos, direcciones, favoritos y pedidos.

Las rutas protegidas reciben el token de acceso en `Authorization: Bearer <token>`. El carrito de invitados se identifica con `X-Guest-Token` y se fusiona con el del cliente al autenticarse. La renovación de sesión utiliza una cookie HTTP-only.

## Reglas del negocio

- Los importes se expresan en quetzales  y los precios incluyen IVA 
- La reserva de inventario dura 15 minutos. El servidor ejecuta la limpieza de reservas vencidas cada minuto.
- La confirmación de pedidos utiliza una clave de idempotencia para evitar duplicados.
- Los descuentos se distribuyen entre las líneas elegibles. Las devoluciones usan los importes de línea para conservar el total exacto.
- Una cancelación o devolución total reintegra el uso del cupón; una devolución parcial no lo reintegra.
- Las métricas de ventas incluyen pedidos entregados y sus devoluciones, descontando los reembolsos.

El flujo principal de un pedido es `PAGADO → EN_PREPARACION → DESPACHADO → ENTREGADO`. Las cancelaciones y devoluciones dependen del estado y del rol del usuario. Las transiciones se validan en el dominio y en SQL Server.

## Pruebas

Desde `shop-cart-backend/`:

```sh
npm run typecheck
npm test
```

`typecheck` comprueba los tipos. `npm test` ejecuta las pruebas de dominio, esquemas y extensiones con el ejecutor de pruebas de Node.js.

Las pruebas de integración y concurrencia HTTP necesitan una API local conectada a una base de pruebas cuyo nombre comience por `ShopCartAudit_`. Crean registros de prueba y los conservan para inspección.

Para preparar ese entorno, configurar `DB_NAME` con el nombre de la base aislada y `PORT=3107`, ejecutar `npm run db:setup` e iniciar la API. En otra terminal de PowerShell, desde la carpeta del backend:

```powershell
$env:RUN_AUDIT_INTEGRATION = '1'
$env:AUDIT_DB_NAME = 'ShopCartAudit_local'
$env:AUDIT_API_URL = 'http://localhost:3107/api/v1'
npm run test:integration
npm run test:concurrency:http
```

`AUDIT_DB_NAME` debe coincidir con el `DB_NAME` de la API de pruebas. Estas suites modifican datos y deben ejecutarse en la base aislada.

`npm run test:concurrency` ejecuta una demostración adicional de concurrencia. Su implementación está en [`tests/concurrency-demo.ts`](tests/concurrency-demo.ts).
