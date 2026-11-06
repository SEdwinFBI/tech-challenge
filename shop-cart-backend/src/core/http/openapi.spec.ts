const CODIGOS_NEGOCIO = [
  'ADDRESS_FORBIDDEN',
  'ADDRESS_INVALID',
  'ADDRESS_NOT_FOUND',
  'CART_EMPTY',
  'CART_FORBIDDEN',
  'CART_NOT_FOUND',
  'CATEGORY_NOT_FOUND',
  'CLAVE_IDEMPOTENCIA_EN_USO',
  'COUPON_EXHAUSTED',
  'COUPON_EXPIRED',
  'COUPON_INACTIVE',
  'COUPON_MINIMUM_NOT_MET',
  'COUPON_NOT_APPLICABLE',
  'COUPON_NOT_FOUND',
  'COUPON_NOT_STARTED',
  'COUPON_USER_LIMIT',
  'DISCOUNT_TYPE_INVALID',
  'EMAIL_ALREADY_REGISTERED',
  'GALLERY_LIMIT_REACHED',
  'IMAGEN_CLAVE_INVALIDA',
  'IMAGEN_FUENTE_INVALIDA',
  'IMAGEN_NO_SUBIDA',
  'IMAGE_NOT_FOUND',
  'IMAGE_URL_INVALID',
  'INSUFFICIENT_STOCK',
  'INVALID_STATE_TRANSITION',
  'LAST_UNIT_TAKEN',
  'MOVEMENT_QUANTITY_ZERO',
  'MOVEMENT_REASON_REQUIRED',
  'MOVEMENT_TYPE_INVALID',
  'MUNICIPALITY_NOT_FOUND',
  'NAME_TOO_SHORT',
  'ORDER_CLIENT_CANCEL_ONLY',
  'ORDER_FORBIDDEN',
  'ORDER_LINE_NOT_FOUND',
  'ORDER_NOT_FOUND',
  'ORDER_STATE_NOT_FOUND',
  'PAGO_EN_CONCILIACION',
  'PAGO_RECHAZADO',
  'PAGO_REVERTIDO',
  'PAYMENT_REJECTED',
  'PRICE_INVALID',
  'PRODUCT_NOT_FOUND',
  'REFERENCE_PRICE_INVALID',
  'REFRESH_IN_PROGRESS',
  'REFRESH_TOKEN_EXPIRED',
  'REFRESH_TOKEN_INVALID',
  'REFRESH_TOKEN_REUSED',
  'RESERVA_VENCIDA',
  'RETURN_EXCEEDS_SOLD',
  'RETURN_NOT_ALLOWED',
  'RETURN_QUANTITY_INVALID',
  'ROLE_INVALID',
  'SKU_DUPLICATED',
  'STOCK_EXHAUSTED',
  'STOCK_WOULD_BE_NEGATIVE',
  'TIEMPO_REAL_NO_DISPONIBLE',
  'USER_NOT_FOUND',
  'VARIANT_NOT_FOUND',
  'VARIANT_UNAVAILABLE',
];

const parametrosOrden = (valores: string[], defecto = 'fecha') => [
  { name: 'orden', in: 'query', description: 'Columna de ordenamiento.', schema: { type: 'string', enum: valores, default: defecto } },
  { name: 'direccion', in: 'query', description: 'Sentido del ordenamiento.', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
];

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ShopCart E-Commerce API',
    version: '1.0.0',
    description: `API de la tienda en línea de Don Arturo Grupo Pentandra. La autenticación usa un access token JWT de 15 minutos con refresh por cookie, el carrito funciona también para invitados, las existencias se controlan con bloqueo pesimista y todos los montos son en quetzales (GTQ).`,
    contact: {
      name: 'Equipo de Desarrollo ShopCart',
      email: 'soporte@shopcart.gt',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
    {
      url: '/',
      description: 'Servidor Raíz',
    },
  ],
  tags: [
    { name: 'Auth', description: 'Registro, sesión y usuarios' },
    { name: 'Catalogo', description: 'Categorías, productos y variantes' },
    { name: 'Inventario', description: 'Kardex y existencias' },
    { name: 'Carrito', description: 'Carrito de usuarios e invitados' },
    { name: 'Cupones', description: 'Cupones de porcentaje y monto fijo' },
    { name: 'Checkout', description: 'Direcciones, reservas y confirmación' },
    { name: 'Pedidos', description: 'Estados, historial y devoluciones' },
    { name: 'Dashboard', description: 'Métricas, Excel y SSE' },
    { name: 'Bitacora', description: 'Auditoría de cambios' },
    { name: 'Favoritos', description: 'Favoritos del cliente' },
    { name: 'Seed', description: 'Datos de ejemplo' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Ingrese el Access Token JWT obtenido en /auth/login o /auth/register',
      },
      guestTokenAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-Guest-Token',
        description: 'UUID v4 único generado en el cliente para mantener el carrito de invitado',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: false },
          codigo: {
            type: 'string',
            example: 'COUPON_NOT_FOUND',
            description: 'Código de negocio estable en inglés. Si el error de SQL Server no tiene uno asignado, llega como SQL_<numero>.',
            enum: [...CODIGOS_NEGOCIO, 'VALIDATION_ERROR', 'DUPLICATE_KEY', 'STREAM_TICKET_INVALID', 'INTERNAL_ERROR'],
          },
          mensaje: { type: 'string', example: 'Los datos proporcionados no cumplen con el esquema requerido.' },
          detalles: { type: 'object' },
          datos: {
            type: 'object',
            description: 'Importes para COUPON_MINIMUM_NOT_MET.',
            properties: { montoMinimo: { type: 'number' }, subtotal: { type: 'number' }, montoFaltante: { type: 'number' } },
          },
        },
      },
      Usuario: {
        type: 'object',
        properties: {
          idUsuario: { type: 'integer', example: 1 },
          correo: { type: 'string', format: 'email', example: 'cliente@shopcart.gt' },
          nombreCompleto: { type: 'string', example: 'Juan Pérez' },
          rol: { type: 'string', enum: ['CLIENTE', 'OPERADOR', 'ADMINISTRADOR'], example: 'CLIENTE' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: true },
          accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          usuario: { $ref: '#/components/schemas/Usuario' },
        },
      },
      Categoria: {
        type: 'object',
        properties: {
          IDCategoria: { type: 'integer', example: 1 },
          Nombre: { type: 'string', example: 'Calzado' },
          Descripcion: { type: 'string', example: 'Zapatos formales, casuales y deportivos' },
          Activo: { type: 'boolean', example: true },
          TotalProductos: { type: 'integer', example: 5 },
        },
      },
      Variante: {
        type: 'object',
        properties: {
          IDVariante: { type: 'integer', example: 1 },
          IDProducto: { type: 'integer', example: 10 },
          SKU: { type: 'string', example: 'ZAP-DER-NEG-42' },
          Color: { type: 'string', example: 'Negro' },
          Talla: { type: 'string', example: '42' },
          Precio: { type: 'number', format: 'float', example: 450.0 },
          ExistenciaFisica: { type: 'integer', example: 25 },
          ExistenciaDisponible: { type: 'integer', example: 22 },
          Activo: { type: 'boolean', example: true },
        },
      },
      Producto: {
        type: 'object',
        properties: {
          IDProducto: { type: 'integer', example: 10 },
          IDCategoria: { type: 'integer', example: 1 },
          Categoria: { type: 'string', example: 'Calzado' },
          Nombre: { type: 'string', example: 'Zapato Derby Clásico' },
          Descripcion: { type: 'string', example: 'Zapato de vestir elaborado en 100% cuero genuino' },
          ImagenPrincipalUrl: { type: 'string', example: 'https://images.unsplash.com/photo-1549298916-b41d501d3772' },
          Activo: { type: 'boolean', example: true },
          TotalVariantes: { type: 'integer', example: 4 },
          PrecioMinimo: { type: 'number', example: 450.0 },
          PrecioMaximo: { type: 'number', example: 490.0 },
          ExistenciaTotal: { type: 'integer', example: 50 },
        },
      },
      CarritoItem: {
        type: 'object',
        properties: {
          IDCarritoItem: { type: 'integer', example: 1 },
          IDVariante: { type: 'integer', example: 1 },
          SKU: { type: 'string', example: 'ZAP-DER-NEG-42' },
          Producto: { type: 'string', example: 'Zapato Derby Clásico' },
          Color: { type: 'string', example: 'Negro' },
          Talla: { type: 'string', example: '42' },
          PrecioUnitario: { type: 'number', example: 450.0 },
          Cantidad: { type: 'integer', example: 2 },
          SubtotalItem: { type: 'number', example: 900.0 },
          ExistenciaDisponible: { type: 'integer', example: 15 },
        },
      },
      Carrito: {
        type: 'object',
        properties: {
          idCarrito: { type: 'integer', example: 3 },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CarritoItem' },
          },
          subtotal: { type: 'number', example: 900.0 },
          descuento: { type: 'number', example: 90.0 },
          costoEnvioEstimado: { type: 'number', example: 25.0 },
          total: { type: 'number', example: 835.0 },
          cupon: {
            type: 'object',
            nullable: true,
            properties: {
              idCupon: { type: 'integer', example: 2 },
              codigo: { type: 'string', example: 'BIENVENIDA10' },
              tipoDescuento: { type: 'string', example: 'PORCENTAJE' },
              valor: { type: 'number', example: 10.0 },
            },
          },
        },
      },
      Cupon: {
        type: 'object',
        properties: {
          IDCupon: { type: 'integer', example: 1 },
          Codigo: { type: 'string', example: 'VERANO2026' },
          TipoDescuento: { type: 'string', enum: ['PORCENTAJE', 'MONTO_FIJO'], example: 'PORCENTAJE' },
          Valor: { type: 'number', example: 15.0 },
          MontoMinimoCompra: { type: 'number', example: 300.0 },
          LimiteTotalUsos: { type: 'integer', example: 100 },
          LimiteUsosPorCliente: { type: 'integer', example: 2 },
          UsosActuales: { type: 'integer', example: 14 },
          IDCategoriaAplica: { type: 'integer', nullable: true, example: null },
          FechaInicio: { type: 'string', format: 'date-time' },
          FechaFin: { type: 'string', format: 'date-time' },
          Activo: { type: 'boolean', example: true },
        },
      },
      KardexItem: {
        type: 'object',
        properties: {
          IDKardex: { type: 'integer', example: 102 },
          FechaMovimiento: { type: 'string', format: 'date-time' },
          SKU: { type: 'string', example: 'ZAP-DER-NEG-42' },
          Producto: { type: 'string', example: 'Zapato Derby Clásico' },
          TipoMovimiento: { type: 'string', example: 'ENTRADA_COMPRA' },
          Naturaleza: { type: 'integer', example: 1 },
          Cantidad: { type: 'integer', example: 20 },
          SaldoPosterior: { type: 'integer', example: 35 },
          Motivo: { type: 'string', example: 'Reabastecimiento de bodega central Lote 2026-B' },
          UsuarioResponsable: { type: 'string', example: 'operador@shopcart.gt' },
        },
      },
      Pedido: {
        type: 'object',
        properties: {
          IDPedido: { type: 'integer', example: 1 },
          NumeroSeguimiento: { type: 'string', example: 'ORD-000014', description: 'ORD- más el IDPedido con seis dígitos. No se guarda en la base; se arma a partir de IDPedido.' },
          Cliente: { type: 'string', example: 'Juan Pérez' },
          Correo: { type: 'string', example: 'cliente@shopcart.gt' },
          Estado: {
            type: 'string',
            enum: ['PAGADO', 'EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO', 'DEVUELTO_PARCIAL', 'DEVUELTO_TOTAL'],
            example: 'PAGADO',
          },
          Subtotal: { type: 'number', example: 900.0 },
          Descuento: { type: 'number', example: 90.0 },
          CostoEnvio: { type: 'number', example: 25.0 },
          Total: { type: 'number', example: 835.0 },
          MontoReembolsado: { type: 'number', example: 0.0 },
          BaseImponibleSinIVA: { type: 'number', example: 745.54 },
          MontoIVA12: { type: 'number', example: 89.46 },
          FechaCreacion: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/recomendaciones': {
      get: {
        tags: ['Recomendaciones'],
        summary: 'Top 10 segun vistas, favoritos, carrito y compras',
        security: [{ bearerAuth: [] }, {}],
        parameters: [
          { name: 'contexto', in: 'query', schema: { type: 'string', enum: ['producto', 'carrito', 'inicio', 'favoritos', 'ofertas'], default: 'producto' } },
          { name: 'idProducto', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'idCategoria', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'precioMin', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'precioMax', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 150 } },
          { name: 'X-Guest-Token', in: 'header', schema: { type: 'string' }, description: 'Requerido para invitados' },
        ],
        responses: { 200: { description: 'items (hasta 10 productos) y origen (jev o preferencias)' }, 400: { description: 'Sesion o parametros invalidos' }, 429: { description: 'Limite de solicitudes' } },
      },
    },
    '/recomendaciones/busqueda': {
      get: {
        tags: ['Recomendaciones'],
        summary: 'Un producto recomendado por IA distinto de los resultados normales',
        description: 'SQL selecciona hasta 20 candidatos por palabras clave y sinonimos, excluye coincidencias de la busqueda normal y Jev elige como maximo uno con suficiente relevancia. Devuelve item: null sin candidatos o ante fallos del proveedor.',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string', minLength: 2, maxLength: 150 } },
          { name: 'idCategoria', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'precioMin', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'precioMax', in: 'query', schema: { type: 'number', minimum: 0 } },
          { name: 'soloOfertas', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
        ],
        responses: { 200: { description: 'item: producto o null' }, 400: { description: 'Parametros invalidos' }, 429: { description: 'Limite de solicitudes' } },
      },
    },
    '/catalogo/revision': {
      post: {
        tags: ['Catalogo'], summary: 'Sugerir categoria y detectar posibles duplicados para revision administrativa',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['nombre'], properties: {
            nombre: { type: 'string', minLength: 3, maxLength: 150 }, descripcion: { type: 'string', maxLength: 1000 }, idProducto: { type: 'integer', minimum: 1 },
          },
        } } } },
        responses: { 200: { description: 'categoriaSugerida, posiblesDuplicados y evaluacionDisponible; no escribe cambios' },
          400: { description: 'Entrada invalida' }, 401: { description: 'Autenticacion requerida' }, 403: { description: 'Solo administradores' }, 429: { description: 'Limite de solicitudes' } },
      },
    },
    '/recomendaciones/vistas': {
      post: {
        tags: ['Recomendaciones'],
        summary: 'Registrar una vista con deduplicacion de un minuto',
        security: [{ bearerAuth: [] }, {}],
        parameters: [{ name: 'X-Guest-Token', in: 'header', schema: { type: 'string' }, description: 'Requerido para invitados' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['idProducto'], properties: { idProducto: { type: 'integer', minimum: 1 } } } } } },
        responses: { 204: { description: 'Vista procesada' }, 400: { description: 'Sesion o parametros invalidos' }, 429: { description: 'Limite de solicitudes' } },
      },
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar cliente',
        description: 'Emite JWT y cookie de refresh. Con X-Guest-Token fusiona el carrito de invitado.',
        parameters: [
          {
            name: 'X-Guest-Token',
            in: 'header',
            required: false,
            schema: { type: 'string' },
            description: 'Token del carrito de invitado para fusión inmediata',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['correo', 'password', 'nombreCompleto'],
                properties: {
                  correo: { type: 'string', format: 'email', example: 'nuevo.cliente@shopcart.gt' },
                  password: { type: 'string', minLength: 6, example: 'Segura123!' },
                  nombreCompleto: { type: 'string', minLength: 3, example: 'Carlos Mendoza' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Cuenta creada y sesión iniciada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          400: { description: 'Datos inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'El correo electrónico ya se encuentra registrado' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión',
        description: 'Access Token de 15 minutos en la respuesta y refresh token en cookie. Fusiona el carrito de invitado.',
        parameters: [
          {
            name: 'X-Guest-Token',
            in: 'header',
            required: false,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['correo', 'password'],
                properties: {
                  correo: { type: 'string', format: 'email', example: 'admin@shopcart.gt' },
                  password: { type: 'string', example: 'Admin123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Sesión iniciada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: { description: 'Credenciales inválidas' },
          403: { description: 'Cuenta desactivada' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotar refresh token',
        description: 'Rota el refresh token (cookie o body) y devuelve un par nuevo.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Tokens renovados',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } },
          },
          401: { description: 'Refresh token ausente, expirado o inválido (REFRESH_TOKEN_INVALID, REFRESH_TOKEN_EXPIRED). Reusar un token ya rotado pasados 10 segundos revoca todas las sesiones del usuario (REFRESH_TOKEN_REUSED).' },
          409: { description: 'Token recién rotado: dentro de los 10 segundos siguientes se rechaza sin revocar la sesión (REFRESH_IN_PROGRESS). Reintentar con el token nuevo.' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Cierre de sesión',
        description: 'Limpia la cookie del refresh token y termina la sesión activa.',
        responses: {
          200: {
            description: 'Sesión finalizada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { ok: { type: 'boolean', example: true }, mensaje: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    
    '/auth/me': {
      patch: {
        tags: ['Auth'],
        summary: 'Actualizar mi nombre',
        description: 'Solo modifica la cuenta del JWT. Queda en la Bitácora.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['nombreCompleto'],
          properties: { nombreCompleto: { type: 'string', minLength: 3, example: 'María López' } },
        } } } },
        responses: { 200: { description: 'Perfil actualizado' }, 400: { description: 'Nombre inválido' } },
      },
      get: {
        tags: ['Auth'],
        summary: 'Obtener mi perfil',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Perfil del usuario actual',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, usuario: { $ref: '#/components/schemas/Usuario' } } } } },
          },
          401: { description: 'No autenticado' },
        },
      },
    },
    '/auth/usuarios': {
      get: {
        tags: ['Auth'],
        summary: 'Listar usuarios (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Búsqueda por correo o nombre' },
          { name: 'rol', in: 'query', schema: { type: 'string', enum: ['CLIENTE', 'OPERADOR', 'ADMINISTRADOR'] } },
          { name: 'activo', in: 'query', schema: { type: 'boolean' } },
          ...parametrosOrden(['fecha', 'nombre', 'correo', 'rol']),
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Listado paginado de usuarios',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, datos: { type: 'array' }, total: { type: 'integer' } } } } },
          },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
    },
    '/auth/usuarios/{id}/rol': {
      patch: {
        tags: ['Auth'],
        summary: 'Cambiar rol (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rol'],
                properties: { rol: { type: 'string', enum: ['CLIENTE', 'OPERADOR', 'ADMINISTRADOR'] } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Rol actualizado' },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
    },
    '/auth/usuarios/{id}/estado': {
      patch: {
        tags: ['Auth'],
        summary: 'Activar o desactivar usuario (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['activo'],
                properties: { activo: { type: 'boolean' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Estado actualizado' },
          403: { description: 'Permisos insuficientes (Requiere ADMINISTRADOR)' },
        },
      },
    },
    '/catalogo/categorias': {
      get: {
        tags: ['Catalogo'],
        summary: 'Listar categorías',
        description: 'Solo activas, salvo para administradores que ven todas.',
        security: [{ bearerAuth: [] }, {}],
        responses: {
          200: {
            description: 'Listado de categorías',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array', items: { $ref: '#/components/schemas/Categoria' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Catalogo'],
        summary: 'Guardar categoría (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre'],
                properties: {
                  idCategoria: { type: 'integer', nullable: true },
                  nombre: { type: 'string', minLength: 3, example: 'Ropa Deportiva' },
                  descripcion: { type: 'string', example: 'Prendas atléticas de alto rendimiento' },
                  activo: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Categoría guardada' },
          403: { description: 'Acceso denegado (Requiere ADMINISTRADOR)' },
        },
      },
    },
    '/catalogo/productos': {
      get: {
        tags: ['Catalogo'],
        summary: 'Listar productos',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string', maxLength: 150 }, description: 'Búsqueda por texto en nombre, descripción o SKU. Los comodines % y _ se toman como texto.' },
          { name: 'idCategoria', in: 'query', schema: { type: 'integer' } },
          { name: 'precioMin', in: 'query', schema: { type: 'number' } },
          { name: 'precioMax', in: 'query', schema: { type: 'number' } },
          { name: 'soloDisponibles', in: 'query', schema: { type: 'string', enum: ['true'] } },
          { name: 'activo', in: 'query', description: 'Solo administrador: filtra productos activos o inactivos. Para los demás se ignora.', schema: { type: 'boolean' } },
          { name: 'orden', in: 'query', schema: { type: 'string', enum: ['RECIENTES', 'PRECIO_ASC', 'PRECIO_DESC', 'NOMBRE_ASC', 'NOMBRE_DESC', 'MAS_VENDIDOS', 'DESTACADOS'], default: 'RECIENTES' } },
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 12 } },
        ],
        responses: {
          200: {
            description: 'Página de productos con variantes y métricas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array', items: { $ref: '#/components/schemas/Producto' } },
                    total: { type: 'integer', example: 45 },
                    pagina: { type: 'integer', example: 1 },
                    tamanoPagina: { type: 'integer', example: 12 },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Catalogo'],
        summary: 'Crear producto (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'idCategoria'],
                properties: {
                  nombre: { type: 'string', minLength: 3, example: 'Chaqueta de Cuero Oxford' },
                  descripcion: { type: 'string', example: 'Chaqueta clásica de cuero vacuno' },
                  idCategoria: { type: 'integer', example: 2 },
                  imagenPrincipalUrl: { type: 'string', format: 'uri' },
                  precioReferencia: { type: 'number', minimum: 0.01, example: 250.0, description: 'Opcional. Precio tachado para mostrar la oferta; debe ser mayor a precio. El cliente paga precio.' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Producto maestro creado' },
        },
      },
    },
    '/catalogo/productos/{id}': {
      get: {
        tags: ['Catalogo'],
        summary: 'Detalle de producto',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Detalle del producto y variantes',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    producto: { $ref: '#/components/schemas/Producto' },
                    variantes: { type: 'array', items: { $ref: '#/components/schemas/Variante' } },
                  },
                },
              },
            },
          },
          404: { description: 'Producto no encontrado' },
        },
      },
      put: {
        tags: ['Catalogo'],
        summary: 'Actualizar producto (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nombre: { type: 'string' },
                  descripcion: { type: 'string' },
                  idCategoria: { type: 'integer' },
                  imagenClave: { type: 'string', example: 'uploads/productos/10/3f2b8c1e-9a47-4d6e-b1a2-5c7d8e9f0a1b.webp', description: 'Clave S3 de la portada, obtenida con /imagenes/firma. Excluyente con imagenUrl.' },
                  imagenUrl: { type: 'string', format: 'uri', description: 'URL externa https de la portada. Excluyente con imagenClave. Una URL del CDN propio se convierte a su clave.' },
                  activo: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Producto actualizado' },
          400: { description: 'Clave de otro producto o con formato inválido (IMAGEN_CLAVE_INVALIDA), o ambos campos (VALIDATION_ERROR)' },
          409: { description: 'El objeto no existe en el almacenamiento (IMAGEN_NO_SUBIDA)' },
          503: { description: 'Almacenamiento no configurado (ALMACENAMIENTO_NO_CONFIGURADO)' },
        },
      },
      delete: {
        tags: ['Catalogo'],
        summary: 'Eliminar producto (Admin)',
        description: 'Si tiene pedidos o movimientos de kardex, solo se desactiva.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Resultado de la operación',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    accionRealizada: { type: 'string', example: 'DESACTIVADO_LOGICO' },
                    mensaje: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/catalogo/productos/{id}/variantes': {
      post: {
        tags: ['Catalogo'],
        summary: 'Crear variante (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['sku', 'precio', 'existenciaInicial'],
                properties: {
                  sku: { type: 'string', example: 'CHQ-OXF-CAF-L' },
                  color: { type: 'string', example: 'Café' },
                  talla: { type: 'string', example: 'L' },
                  precio: { type: 'number', minimum: 0.01, example: 850.0 },
                  existenciaInicial: { type: 'integer', minimum: 0, example: 10 },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Variante creada con registro inicial en Kardex' } },
      },
    },
    
    '/catalogo/categorias/{id}': {
      put: {
        tags: ['Catalogo'],
        summary: 'Actualizar categoría (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre'],
                properties: {
                  nombre: { type: 'string', minLength: 2 },
                  descripcion: { type: 'string' },
                  activa: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Categoría actualizada' },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
    },
    '/catalogo/variantes/{id}': {
      put: {
        tags: ['Catalogo'],
        summary: 'Actualizar variante (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sku: { type: 'string' },
                  talla: { type: 'string' },
                  color: { type: 'string' },
                  presentacion: { type: 'string' },
                  precio: { type: 'number', minimum: 0.01 },
                  activo: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Variante actualizada' },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
      patch: {
        tags: ['Catalogo'],
        summary: 'Actualizar variante parcial (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  sku: { type: 'string' },
                  talla: { type: 'string' },
                  color: { type: 'string' },
                  presentacion: { type: 'string' },
                  precio: { type: 'number', minimum: 0.01 },
                  activo: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Variante actualizada' },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
    },
    '/catalogo/variantes/{id}/precio': {
      patch: {
        tags: ['Catalogo'],
        summary: 'Cambiar precio de variante (Admin)',
        description: 'No afecta pedidos ya formalizados.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nuevoPrecio'],
                properties: { nuevoPrecio: { type: 'number', minimum: 0.01, example: 799.0 } },
              },
            },
          },
        },
        responses: { 200: { description: 'Precio actualizado y registrado en Bitácora' } },
      },
    },
    '/inventario/kardex': {
      get: {
        tags: ['Inventario'],
        summary: 'Kardex (Operador, Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'idVariante', in: 'query', schema: { type: 'integer' } },
          { name: 'tipoMovimiento', in: 'query', description: 'Un solo código de TipoMovimiento.', schema: { type: 'string', enum: ['ENTRADA_COMPRA', 'SALIDA_VENTA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'DEVOLUCION_CLIENTE'] } },
          { name: 'fechaDesde', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'fechaHasta', in: 'query', description: 'No puede ser anterior a fechaDesde.', schema: { type: 'string', format: 'date-time' } },
          ...parametrosOrden(['fecha', 'cantidad', 'tipo']),
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Listado paginado de movimientos de inventario',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array', items: { $ref: '#/components/schemas/KardexItem' } },
                    total: { type: 'integer', example: 120 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/inventario/movimientos': {
      post: {
        tags: ['Inventario'],
        summary: 'Registrar movimiento (Operador, Admin)',
        description: 'Tipos: ENTRADA_COMPRA, AJUSTE_POSITIVO o AJUSTE_NEGATIVO. No deja el saldo en negativo.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idVariante', 'tipoMovimiento', 'cantidad', 'motivo'],
                properties: {
                  idVariante: { type: 'integer', example: 1 },
                  tipoMovimiento: { type: 'string', enum: ['ENTRADA_COMPRA', 'AJUSTE', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO'], example: 'AJUSTE' },
                  cantidad: { type: 'integer', example: 5 },
                  motivo: { type: 'string', minLength: 5, example: 'Ajuste de inventario físico por auditoría mensual' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Movimiento asentado en Kardex y existencia actualizada' },
          400: { description: 'Tipo fuera del enum, motivo corto o cantidad cero (VALIDATION_ERROR); ajuste que deja la existencia en negativo (STOCK_WOULD_BE_NEGATIVE) o variante inexistente (VARIANT_NOT_FOUND)' },
        },
      },
    },
    '/carrito': {
      get: {
        tags: ['Carrito'],
        summary: 'Obtener carrito',
        description: 'Usuario autenticado o invitado con X-Guest-Token.',
        security: [{ bearerAuth: [] }, { guestTokenAuth: [] }, {}],
        parameters: [
          { name: 'X-Guest-Token', in: 'header', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'Detalle del carrito',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Carrito' } } },
          },
        },
      },
    },
    '/carrito/items': {
      post: {
        tags: ['Carrito'],
        summary: 'Agregar o cambiar ítem',
        description: 'No puede pasar de la existencia disponible (física menos reservas activas). Cantidad 0 elimina el ítem.',
        security: [{ bearerAuth: [] }, { guestTokenAuth: [] }, {}],
        parameters: [
          { name: 'X-Guest-Token', in: 'header', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idVariante', 'cantidad'],
                properties: {
                  idVariante: { type: 'integer', example: 1 },
                  cantidad: { type: 'integer', minimum: 0, example: 2 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Carrito actualizado' },
          400: { description: 'Cantidad supera la existencia disponible' },
        },
      },
    },
    
    '/carrito/items/{idVariante}': {
      delete: {
        tags: ['Carrito'],
        summary: 'Quitar ítem del carrito',
        security: [{ bearerAuth: [] }, { guestTokenAuth: [] }, {}],
        parameters: [
          { name: 'idVariante', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'X-Guest-Token', in: 'header', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Ítem eliminado del carrito' },
        },
      },
    },
    '/cupones': {
      get: {
        tags: ['Cupones'],
        summary: 'Listar cupones (Admin)',
        description: 'Sin paginación. orden=fecha usa el orden de creación; vigencia usa la fecha de fin; usos usa los usos actuales.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', description: 'Texto contenido en el código. Los comodines % y _ se toman como texto.', schema: { type: 'string', maxLength: 50 } },
          { name: 'activo', in: 'query', schema: { type: 'boolean' } },
          { name: 'vigencia', in: 'query', description: 'VIGENTE (hoy dentro del rango), VENCIDO (fecha fin pasada) o POR_INICIAR (fecha inicio futura).', schema: { type: 'string', enum: ['VIGENTE', 'VENCIDO', 'POR_INICIAR'] } },
          ...parametrosOrden(['fecha', 'codigo', 'vigencia', 'usos']),
        ],
        responses: {
          200: {
            description: 'Listado de cupones',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array', items: { $ref: '#/components/schemas/Cupon' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Cupones'],
        summary: 'Crear cupón (Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['codigo', 'tipoDescuento', 'valor', 'montoMinimoCompra', 'limiteTotalUsos', 'limiteUsosPorCliente', 'fechaInicio', 'fechaFin'],
                properties: {
                  idCupon: { type: 'integer', nullable: true },
                  codigo: { type: 'string', example: 'PROMOVERANO26' },
                  tipoDescuento: { type: 'string', enum: ['PORCENTAJE', 'MONTO_FIJO'], example: 'PORCENTAJE' },
                  valor: { type: 'number', minimum: 0.01, example: 20.0 },
                  montoMinimoCompra: { type: 'number', minimum: 0, example: 250.0 },
                  limiteTotalUsos: { type: 'integer', minimum: 1, example: 100 },
                  limiteUsosPorCliente: { type: 'integer', minimum: 1, example: 2 },
                  idCategoriaAplica: { type: 'integer', nullable: true, example: null },
                  fechaInicio: { type: 'string', format: 'date-time' },
                  fechaFin: { type: 'string', format: 'date-time' },
                  activo: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Cupón guardado' } },
      },
    },
    '/cupones/aplicar': {
      post: {
        tags: ['Cupones'],
        summary: 'Aplicar cupón',
        description: 'Valida vigencia, monto mínimo, límite global y límite por cliente.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['codigo'],
                properties: { codigo: { type: 'string', example: 'PROMOVERANO26' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cupón aplicado' },
          400: { description: 'Código inexistente (COUPON_NOT_FOUND), vencido (COUPON_EXPIRED), inactivo (COUPON_INACTIVE), todavía no vigente (COUPON_NOT_STARTED), por debajo del mínimo (COUPON_MINIMUM_NOT_MET, con datos.montoMinimo/subtotal/montoFaltante), sin aplicación a la categoría (COUPON_NOT_APPLICABLE) o límite por cliente (COUPON_USER_LIMIT)' },
          409: { description: 'Cupón agotado (COUPON_EXHAUSTED)' },
        },
      },
      delete: {
        tags: ['Cupones'],
        summary: 'Quitar cupón',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cupón removido del carrito' },
        },
      },
    },
    '/cupones/remover': {
      delete: {
        tags: ['Cupones'],
        summary: 'Quitar cupón (alias)',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Cupón removido del carrito' },
        },
      },
    },
    
    '/cupones/{id}': {
      put: {
        tags: ['Cupones'],
        summary: 'Actualizar cupón (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['codigo', 'tipoDescuento', 'valor', 'montoMinimoCompra', 'limiteTotalUsos', 'limiteUsosPorCliente', 'fechaInicio', 'fechaFin'],
                properties: {
                  codigo: { type: 'string' },
                  tipoDescuento: { type: 'string', enum: ['PORCENTAJE', 'MONTO_FIJO'] },
                  valor: { type: 'number' },
                  montoMinimoCompra: { type: 'number' },
                  limiteTotalUsos: { type: 'integer' },
                  limiteUsosPorCliente: { type: 'integer' },
                  idCategoriaAplica: { type: 'integer', nullable: true },
                  fechaInicio: { type: 'string', format: 'date-time' },
                  fechaFin: { type: 'string', format: 'date-time' },
                  activo: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Cupón actualizado' },
          403: { description: 'Requiere rol ADMINISTRADOR' },
        },
      },
    },
    '/checkout/municipios': {
      get: {
        tags: ['Checkout'],
        summary: 'Departamentos y municipios',
        responses: {
          200: {
            description: 'Listado geográfico y tarifas',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, datos: { type: 'array' } } } } },
          },
        },
      },
    },
    '/checkout/direcciones': {
      get: {
        tags: ['Checkout'],
        summary: 'Listar direcciones',
        description: 'Incluye Predeterminada y la devuelve primero.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Direcciones del cliente',
            content: { 'application/json': { schema: { type: 'object', properties: { ok: { type: 'boolean', example: true }, datos: { type: 'array' } } } } },
          },
        },
      },
      post: {
        tags: ['Checkout'],
        summary: 'Crear dirección',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idMunicipio', 'direccion', 'telefonoContacto'],
                properties: {
                  idMunicipio: { type: 'integer', example: 1 },
                  direccion: { type: 'string', minLength: 5, example: '6ta Avenida 12-34 Zona 1, Edificio Pentandra' },
                  codigoPostal: { type: 'string', example: '01001' },
                  telefonoContacto: { type: 'string', example: '+502 2222-3333' },
                  predeterminada: { type: 'boolean', default: false, description: 'La primera dirección activa siempre queda como predeterminada.' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Dirección guardada' } },
      },
    },
    
    '/checkout/direcciones/{id}': {
      delete: {
        tags: ['Checkout'],
        summary: 'Eliminar dirección',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Dirección eliminada de forma lógica (Activo = 0). Los pedidos ya creados conservan su dirección.' },
          403: { description: 'La dirección es de otro cliente (ADDRESS_FORBIDDEN)' },
          404: { description: 'La dirección no existe (ADDRESS_NOT_FOUND)' },
        },
      },
    },
    '/checkout/direcciones/{id}/predeterminada': {
      patch: {
        tags: ['Checkout'],
        summary: 'Marcar dirección como predeterminada',
        description: 'Desmarca la anterior en la misma transacción. Responde la lista actualizada.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Direcciones del cliente con la nueva predeterminada primero' },
          404: { description: 'La dirección no existe, está eliminada o es de otro cliente (ADDRESS_NOT_FOUND)' },
        },
      },
    },
    '/checkout/reservar': {
      post: {
        tags: ['Checkout'],
        summary: 'Reservar existencias',
        description: 'Aparta existencias durante el plazo configurado (15 minutos por defecto; perfil de pruebas: 3). La respuesta incluye vencimiento, reloj del servidor y duración.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idCarrito'],
                properties: { idCarrito: { type: 'integer', example: 3 } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Reserva confirmada durante el plazo configurado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    FechaExpiracionReserva: { type: 'string', format: 'date-time' },
                    FechaServidor: { type: 'string', format: 'date-time' },
                    DuracionReservaSegundos: { type: 'integer', example: 180 },
                  },
                },
              },
            },
          },
          400: { description: 'Carrito vacío o inválido' },
          403: { description: 'El carrito no es del usuario (CART_FORBIDDEN)' },
          409: { description: 'Existencias insuficientes (INSUFFICIENT_STOCK, STOCK_EXHAUSTED) o variante no disponible (VARIANT_UNAVAILABLE)' },
        },
      },
    },
    '/checkout/confirmar': {
      post: {
        tags: ['Checkout'],
        summary: 'Confirmar pedido',
        description: 'Congela precios y descuentos, registra salidas en kardex y vacía el carrito.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idCarrito', 'idDireccion', 'claveIdempotencia'],
                properties: {
                  idCarrito: { type: 'integer', example: 3 },
                  idDireccion: { type: 'integer', example: 1 },
                  claveIdempotencia: { type: 'string', minLength: 8, example: 'pay-req-f47ac10b-58cc-4372-a567-0e02b2c3d479' },
                  simularFalloPago: { type: 'boolean', default: false, description: 'Compatibilidad: equivale a simulacionPago RECHAZADO' },
                  simulacionPago: { type: 'string', enum: ['APROBADO', 'RECHAZADO', 'ERROR_TRAS_COBRO', 'TIMEOUT'], default: 'APROBADO', description: 'Simula el resultado de la pasarela. En producción se ignora y siempre se aprueba.' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Pedido creado',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    idPedido: { type: 'integer', example: 1 },
                    fueIdempotente: { type: 'boolean', example: false },
                    mensaje: { type: 'string' },
                  },
                },
              },
            },
          },
          200: { description: 'Solicitud repetida: devuelve el pedido existente sin cobrar de nuevo' },
          400: { description: 'Carrito vacío (CART_EMPTY), dirección inválida (ADDRESS_INVALID), cupón vencido, no vigente o sin cumplir condiciones.' },
          402: { description: 'Pago rechazado (PAGO_RECHAZADO). No se crea el pedido y la reserva sigue activa.' },
          409: { description: 'Otro cliente tomó la última unidad (LAST_UNIT_TAKEN), el cupón se agotó (COUPON_EXHAUSTED), la reserva venció (RESERVA_VENCIDA: "Tu reserva venció. Vuelve a reservar para pagar.") o la clave de idempotencia ya está en uso (CLAVE_IDEMPOTENCIA_EN_USO: "Esa clave de idempotencia ya está en uso.")' },
          502: { description: 'El pedido no pudo crearse tras autorizar el cobro y el pago fue anulado (PAGO_REVERTIDO).' },
          503: { description: 'Pago autorizado sin pedido confirmado, en conciliación automática (PAGO_EN_CONCILIACION). No reintentar el cobro.' },
        },
      },
    },
    '/checkout/pagos': {
      get: {
        tags: ['Checkout'],
        summary: 'Listar intentos de pago (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'estado', in: 'query', schema: { type: 'string', enum: ['AUTORIZADO', 'CAPTURADO', 'RECHAZADO', 'ANULADO', 'PENDIENTE_CONCILIACION'] } },
          { name: 'direccion', in: 'query', description: 'Orden por fecha; por defecto desc.', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
          { name: 'pagina', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 15 } },
        ],
        responses: {
          200: {
            description: 'Página de intentos de pago',
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                ok: { type: 'boolean', example: true },
                datos: { type: 'array', items: { type: 'object', properties: {
                  IDIntentoPago: { type: 'integer' }, IDUsuario: { type: 'integer' }, Correo: { type: 'string' },
                  ClaveIdempotencia: { type: 'string' }, Monto: { type: 'number' }, Estado: { type: 'string' },
                  ReferenciaPasarela: { type: 'string', nullable: true }, Detalle: { type: 'string', nullable: true },
                  IDPedido: { type: 'integer', nullable: true }, FechaCreacion: { type: 'string', format: 'date-time' },
                  FechaActualizacion: { type: 'string', format: 'date-time' },
                } } },
                total: { type: 'integer' }, pagina: { type: 'integer' }, tamanoPagina: { type: 'integer' },
              },
            } } },
          },
          403: { description: 'Solo administradores' },
        },
      },
    },
    '/pedidos': {
      get: {
        tags: ['Pedidos'],
        summary: 'Listar pedidos',
        description: 'Clientes ven solo sus pedidos. Operadores y administradores ven todos.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'estado', in: 'query', description: 'Código del estado, por ejemplo PAGADO.', schema: { type: 'string' } },
          { name: 'idCliente', in: 'query', description: 'Solo operador y administrador; para clientes se ignora.', schema: { type: 'integer' } },
          { name: 'numeroSeguimiento', in: 'query', description: 'Búsqueda por número de pedido (ORD-000014 o 14), nombre del cliente, correo o estado. Los comodines % y _ se toman como texto.', schema: { type: 'string', maxLength: 100 } },
          { name: 'cliente', in: 'query', description: 'Texto contenido en el nombre o el correo del cliente.', schema: { type: 'string', maxLength: 100 } },
          { name: 'fechaDesde', in: 'query', description: 'Inicio del rango de creación (inclusive).', schema: { type: 'string', format: 'date-time' } },
          { name: 'fechaHasta', in: 'query', description: 'Fin del rango (inclusive). No puede ser anterior a fechaDesde. fechaInicio y fechaFin siguen aceptándose como alias.', schema: { type: 'string', format: 'date-time' } },
          { name: 'totalMin', in: 'query', description: 'Total mínimo en quetzales.', schema: { type: 'number', minimum: 0 } },
          { name: 'totalMax', in: 'query', description: 'Total máximo en quetzales. No puede ser menor a totalMin.', schema: { type: 'number', minimum: 0 } },
          ...parametrosOrden(['fecha', 'total', 'estado', 'cliente']),
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 15, maximum: 100 } },
        ],
        responses: {
          200: {
            description: 'Listado de pedidos paginados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array', items: { $ref: '#/components/schemas/Pedido' } },
                    total: { type: 'integer', example: 38 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/pedidos/{id}': {
      get: {
        tags: ['Pedidos'],
        summary: 'Detalle de pedido',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: {
            description: 'Detalle de pedido, líneas de productos y trazabilidad de estados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    pedido: { $ref: '#/components/schemas/Pedido' },
                    detalles: { type: 'array' },
                    historialEstados: { type: 'array' },
                  },
                },
              },
            },
          },
          404: { description: 'El pedido no existe o es de otro cliente; se responde igual para no confirmar que existe (ORDER_NOT_FOUND)' },
        },
      },
    },
    '/pedidos/{id}/estado': {
      patch: {
        tags: ['Pedidos'],
        summary: 'Cambiar estado',
        description: 'Valida transiciones. Cancelar antes de despachar reintegra existencias y restaura el cupón.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nuevoEstado'],
                properties: {
                  nuevoEstado: {
                    type: 'string',
                    enum: ['EN_PREPARACION', 'DESPACHADO', 'ENTREGADO', 'CANCELADO'],
                    example: 'EN_PREPARACION',
                  },
                  comentario: { type: 'string', maxLength: 300, description: 'Obligatorio (5 a 300 caracteres) al cancelar', example: 'Mercadería empacada y rotulada' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Estado actualizado y registrado en historial y bitácora' },
          403: { description: 'Cliente intentando una transición que no es cancelar' },
          404: { description: 'El pedido no existe o es de otro cliente (ORDER_NOT_FOUND)' },
          409: { description: 'Transición inválida según la tabla TransicionesEstadoPedido (INVALID_STATE_TRANSITION)' },
        },
      },
    },
    '/pedidos/{id}/devoluciones': {
      post: {
        tags: ['Pedidos'],
        summary: 'Devolver línea (Operador, Admin)',
        description: 'Reembolsa el precio neto unitario prorrateado, reintegra existencias y pasa a DEVUELTO_PARCIAL o DEVUELTO_TOTAL.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idPedidoDetalle', 'cantidadADevolver', 'motivo'],
                properties: {
                  idPedidoDetalle: { type: 'integer', example: 12 },
                  cantidadADevolver: { type: 'integer', minimum: 1, example: 1 },
                  motivo: { type: 'string', minLength: 5, example: 'Cambio de talla solicitado por el cliente' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Devolución aplicada, existencia reintegrada en Kardex' },
          400: { description: 'Pedido o línea inexistente (ORDER_NOT_FOUND, ORDER_LINE_NOT_FOUND), estado no apto para devolución (RETURN_NOT_ALLOWED) o cantidad no positiva (RETURN_QUANTITY_INVALID)' },
          409: { description: 'Cantidad mayor a la vendida en la línea (RETURN_EXCEEDS_SOLD)' },
        },
      },
    },
    '/dashboard/resumen': {
      get: {
        tags: ['Dashboard'],
        summary: 'Resumen (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'periodo', in: 'query', description: 'Calendario de Guatemala; la semana comienza el lunes. Las fechas explícitas tienen prioridad.', schema: { type: 'string', enum: ['HOY', 'SEMANA', 'MES', 'ANIO'] } },
          { name: 'fechaInicio', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'fechaFin', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'agrupacion', in: 'query', description: 'Agrupación de las ventas por período. Se acepta en minúsculas.', schema: { type: 'string', enum: ['DIA', 'SEMANA', 'MES'] } },
        ],
        responses: {
          200: {
            description: 'Métricas agregadas del negocio',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    resumen: { type: 'object' },
                    topProductos: { type: 'array' },
                    ventasPorCategoria: { type: 'array' },
                  },
                },
              },
            },
          },
          400: { description: 'agrupacion fuera de DIA, SEMANA o MES, o fechaFin anterior a fechaInicio (VALIDATION_ERROR)' },
          403: { description: 'Acceso exclusivo para rol ADMINISTRADOR' },
        },
      },
    },
    '/dashboard/stream-ticket': {
      post: {
        tags: ['Dashboard'],
        summary: 'Pedir ticket para el stream (Admin)',
        description: 'EventSource no envía cabeceras, así que el stream se abre con un ticket de un solo uso que dura 30 segundos.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Ticket emitido',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    ticket: { type: 'string', example: '9f2c1a7e5b0d4c3a8e6f1b2d7c9a0e4f5a6b7c8d9e0f1a2b' },
                    expiraEnSegundos: { type: 'integer', example: 30 },
                  },
                },
              },
            },
          },
          401: { description: 'Sin sesión o token vencido' },
          403: { description: 'Requiere rol ADMINISTRADOR' },
          503: { description: 'No se pudo registrar el ticket en Redis (TIEMPO_REAL_NO_DISPONIBLE)' },
        },
      },
    },
    '/dashboard/stream': {
      get: {
        tags: ['Dashboard'],
        summary: 'Stream SSE (Admin)',
        description: 'Emite un evento cada vez que se confirma una venta o se devuelve producto. No usa Authorization: se autoriza con el ticket de /dashboard/stream-ticket.',
        parameters: [{ name: 'ticket', in: 'query', required: true, description: 'Ticket de un solo uso, 30 segundos de vida.', schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Conexión SSE activa',
            content: { 'text/event-stream': { schema: { type: 'string' } } },
          },
          401: { description: 'Ticket inválido, vencido o ya usado (STREAM_TICKET_INVALID)' },
        },
      },
    },
    '/dashboard/exportar-excel': {
      get: {
        tags: ['Dashboard'],
        summary: 'Exportar Excel (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'periodo', in: 'query', description: 'Mismo calendario y rango que el resumen del dashboard.', schema: { type: 'string', enum: ['HOY', 'SEMANA', 'MES', 'ANIO'] } },
          { name: 'fechaInicio', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'fechaFin', in: 'query', schema: { type: 'string', format: 'date-time' } },
        ],
        responses: {
          200: {
            description: 'Archivo binario Excel generado',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
        },
      },
    },
    '/bitacora': {
      get: {
        tags: ['Bitacora'],
        summary: 'Bitácora (Admin)',
        description: 'Creaciones, cambios, desactivaciones y transiciones de estado.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'modulo', in: 'query', schema: { type: 'string', maxLength: 50 } },
          { name: 'accion', in: 'query', description: 'Texto contenido en la acción, por ejemplo CAMBIO_ESTADO.', schema: { type: 'string', maxLength: 50 } },
          { name: 'busqueda', in: 'query', description: 'Texto contenido en el correo del usuario.', schema: { type: 'string', maxLength: 150 } },
          { name: 'fechaDesde', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'fechaHasta', in: 'query', description: 'No puede ser anterior a fechaDesde.', schema: { type: 'string', format: 'date-time' } },
          ...parametrosOrden(['fecha', 'modulo', 'usuario']),
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: {
            description: 'Eventos auditados',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean', example: true },
                    datos: { type: 'array' },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/catalogo/productos/{id}/imagenes': {
      get: {
        tags: ['Catalogo'],
        summary: 'Listar imágenes',
        description: 'Ordenadas. La portada sigue siendo Productos.ImagenUrl.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Lista de imágenes' }, 404: { description: 'Producto inexistente' } },
      },
      post: {
        tags: ['Catalogo'],
        summary: 'Agregar imagen (Admin)',
        description: 'Máximo 10 por producto. Queda en la Bitácora. Enviar exactamente uno de clave (objeto subido con /imagenes/firma, validada contra uploads/productos/{id}/{uuid}.webp|jpg|png y verificada en S3) o url (externa https). Una url del CDN propio se convierte a su clave. Las respuestas devuelven siempre la URL completa en Url.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          oneOf: [{ required: ['clave'] }, { required: ['url'] }],
          properties: {
            clave: { type: 'string', example: 'uploads/productos/10/3f2b8c1e-9a47-4d6e-b1a2-5c7d8e9f0a1b.webp' },
            url: { type: 'string', format: 'uri', example: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800' },
          },
        } } } },
        responses: {
          201: { description: 'Imagen agregada' },
          400: { description: 'Ninguno o ambos campos (VALIDATION_ERROR); clave de otro producto o con formato inválido (IMAGEN_CLAVE_INVALIDA)' },
          409: { description: 'Límite de imágenes alcanzado (GALLERY_LIMIT_REACHED) o el objeto no existe en S3 (IMAGEN_NO_SUBIDA)' },
          503: { description: 'Almacenamiento no configurado (ALMACENAMIENTO_NO_CONFIGURADO)' },
        },
      },
    },
    '/catalogo/productos/{id}/imagenes/firma': {
      post: {
        tags: ['Catalogo'],
        summary: 'Obtener URL firmada para subir una imagen (Admin)',
        description: 'Devuelve una URL de S3 válida 5 minutos. El cliente debe hacer PUT del archivo con las cabeceras indicadas y luego registrar clave con POST /catalogo/productos/{id}/imagenes o como imagenClave al actualizar el producto. urlPublica sirve solo para la vista previa.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['contentType', 'tamanoBytes'],
          properties: {
            contentType: { type: 'string', enum: ['image/webp', 'image/jpeg', 'image/png'] },
            tamanoBytes: { type: 'integer', minimum: 1, maximum: 2097152 },
          },
        } } } },
        responses: {
          200: { description: 'URL de subida', content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              ok: { type: 'boolean', example: true },
              datos: { type: 'object', properties: {
                urlSubida: { type: 'string' }, urlPublica: { type: 'string' }, clave: { type: 'string' },
                expiraEn: { type: 'string', format: 'date-time' },
                cabeceras: { type: 'object', additionalProperties: { type: 'string' } },
              } },
            },
          } } } },
          400: { description: 'Tipo o tamaño inválido' },
          404: { description: 'Producto inexistente (PRODUCT_NOT_FOUND)' },
          503: { description: 'Almacenamiento no configurado (ALMACENAMIENTO_NO_CONFIGURADO)' },
        },
      },
    },
    '/catalogo/imagenes/{id}': {
      delete: {
        tags: ['Catalogo'],
        summary: 'Eliminar imagen (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Imagen eliminada' }, 404: { description: 'Imagen inexistente' } },
      },
    },
    '/catalogo/variantes/{id}/precio-referencia': {
      patch: {
        tags: ['Catalogo'],
        summary: 'Precio de referencia (Admin)',
        description: 'Solo para mostrar descuentos (precio antes). Debe ser mayor al precio de venta y no altera el cobro. Enviar null lo quita y la variante deja de mostrarse como oferta.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['precioReferencia'],
          properties: { precioReferencia: { type: 'number', nullable: true, example: 999.0 } },
        } } } },
        responses: { 200: { description: 'Precio de referencia actualizado' }, 400: { description: 'Debe ser mayor al precio de venta' } },
      },
    },
    '/catalogo/categorias/{id}/imagen': {
      patch: {
        tags: ['Catalogo'],
        summary: 'Imagen de categoría (Admin)',
        description: 'Se usa en el carrusel y el menú. Enviar exactamente uno de clave (objeto subido con /imagen/firma, validada contra uploads/categorias/{id}/{uuid}.webp|jpg|png y verificada en S3) o url (externa https; una url del CDN propio se convierte a su clave). url null la quita. La imagen anterior subida a S3 se elimina. Las lecturas devuelven la URL completa.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object',
          properties: {
            clave: { type: 'string', example: 'uploads/categorias/3/3f2b8c1e-9a47-4d6e-b1a2-5c7d8e9f0a1b.webp' },
            url: { type: 'string', format: 'uri', nullable: true, example: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
          },
        } } } },
        responses: { 200: { description: 'Imagen actualizada' }, 400: { description: 'Clave o url inválida' }, 404: { description: 'Categoría inexistente' }, 409: { description: 'El objeto no está en el almacenamiento (IMAGEN_NO_SUBIDA)' } },
      },
    },
    '/catalogo/categorias/{id}/imagen/firma': {
      post: {
        tags: ['Catalogo'],
        summary: 'Obtener URL firmada para subir la imagen de una categoría (Admin)',
        description: 'Misma mecánica que la de productos. La clave es uploads/categorias/{id}/{uuid}.{ext}; se registra con PATCH /catalogo/categorias/{id}/imagen.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['contentType', 'tamanoBytes'],
          properties: {
            contentType: { type: 'string', enum: ['image/webp', 'image/jpeg', 'image/png'] },
            tamanoBytes: { type: 'integer', minimum: 1, maximum: 2097152 },
          },
        } } } },
        responses: {
          200: { description: 'URL de subida (urlSubida, urlPublica, clave, expiraEn, cabeceras)' },
          400: { description: 'Tipo o tamaño inválido' },
          404: { description: 'Categoría inexistente' },
          503: { description: 'Almacenamiento no configurado (ALMACENAMIENTO_NO_CONFIGURADO)' },
        },
      },
    },
    '/catalogo/productos/{id}/oferta': {
      post: {
        tags: ['Catalogo'],
        summary: 'Poner en oferta (Admin)',
        description: 'En una sola transacción, por cada variante: el precio actual pasa a PrecioReferencia y el precio de venta pasa a precioAhora. Si la variante ya estaba en oferta, se conserva su PrecioReferencia. Queda en la Bitácora (PRECIOS).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['variantes'],
          properties: { variantes: { type: 'array', minItems: 1, items: {
            type: 'object', required: ['idVariante', 'precioAhora'],
            properties: { idVariante: { type: 'integer' }, precioAhora: { type: 'number', example: 190 } },
          } } },
        } } } },
        responses: { 200: { description: 'Oferta aplicada' }, 400: { description: 'precioAhora debe ser mayor a cero y menor al precio actual (OFFER_INVALID)' }, 404: { description: 'Variante inexistente' } },
      },
      delete: {
        tags: ['Catalogo'],
        summary: 'Quitar oferta (Admin)',
        description: 'Restaura el precio de venta a PrecioReferencia y limpia la referencia en todas las variantes del producto que la tengan. Queda en la Bitácora (PRECIOS).',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Oferta quitada' }, 404: { description: 'Producto inexistente' } },
      },
    },
    '/catalogo/productos/{id}/inventario': {
      get: {
        tags: ['Inventario'],
        summary: 'Variantes y existencias del producto (Operador y Admin)',
        description: 'Incluye variantes inactivas para operación de inventario. No devuelve precios ni imágenes.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Identificación del producto y variantes con existencias físicas, reservadas y disponibles' },
          401: { description: 'Autenticación requerida' },
          403: { description: 'Solo operador y administrador' },
          404: { description: 'Producto inexistente' },
        },
      },
    },
    '/catalogo/admin/productos/{id}': {
      get: {
        tags: ['Catalogo'],
        summary: 'Detalle de producto (Admin)',
        description: 'Incluye inactivos. El detalle público no.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Producto, variantes e imágenes' }, 404: { description: 'Producto inexistente' } },
      },
    },
    '/catalogo/productos/{id}/destacado': {
      patch: {
        tags: ['Catalogo'],
        summary: 'Destacar producto (Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['destacado'],
          properties: { destacado: { type: 'boolean', example: true } },
        } } } },
        responses: { 200: { description: 'Producto actualizado' }, 404: { description: 'Producto inexistente' } },
      },
    },
    '/favoritos': {
      get: {
        tags: ['Favoritos'],
        summary: 'Listar favoritos',
        description: 'El usuario se toma exclusivamente del JWT.',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Productos favoritos con precio, oferta y existencia' }, 403: { description: 'Solo clientes' } },
      },
      post: {
        tags: ['Favoritos'],
        summary: 'Agregar favorito',
        description: 'Repetir la solicitud no duplica el favorito.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['idProducto'],
          properties: { idProducto: { type: 'integer', example: 10 } },
        } } } },
        responses: { 201: { description: 'Agregado' }, 404: { description: 'Producto inexistente o inactivo' } },
      },
    },
    '/favoritos/ids': {
      get: {
        tags: ['Favoritos'],
        summary: 'IDs de favoritos',
        description: 'Para marcar favoritos en listados sin traer los productos.',
        security: [{ bearerAuth: [] }],
        responses: { 200: { description: 'Arreglo de IDProducto' } },
      },
    },
    '/favoritos/{id}': {
      delete: {
        tags: ['Favoritos'],
        summary: 'Quitar favorito',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Eliminado' } },
      },
    },
    '/auth/me/password': {
      post: {
        tags: ['Auth'],
        summary: 'Cambiar contraseña',
        description: 'Exige la contraseña actual. La nueva debe tener mínimo 8 caracteres. Revoca todos los refresh tokens.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: {
          type: 'object', required: ['passwordActual', 'passwordNueva'],
          properties: {
            passwordActual: { type: 'string', example: 'Admin123!' },
            passwordNueva: { type: 'string', minLength: 8, example: 'NuevaClave456!' },
          },
        } } } },
        responses: { 200: { description: 'Contraseña actualizada y sesiones cerradas' }, 400: { description: 'Contraseña actual incorrecta o nueva inválida' } },
      },
    },
    '/inventario/existencias-bajas': {
      get: {
        tags: ['Inventario'],
        summary: 'Existencias bajas (Operador, Admin)',
        description: 'Usa UmbralExistenciasBajas de ConfiguracionSistema. Incluye agotadas.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'orden', in: 'query', schema: { type: 'string', enum: ['existencia', 'producto', 'sku'], default: 'existencia' } },
          { name: 'direccion', in: 'query', description: 'Por defecto asc: lo más agotado primero.', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
          { name: 'pagina', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'tamanoPagina', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
        ],
        responses: { 200: { description: 'Variantes con existencia baja, paginadas' }, 403: { description: 'Solo operadores y administradores' } },
      },
    },
    '/seed': {
      post: {
        tags: ['Seed'],
        summary: 'Cargar datos demo (solo desarrollo)',
        description: 'Ejecuta SP_Seed_DatosDemo.',
        responses: {
          200: { description: 'Datos semilla aplicados' },
          403: { description: 'Bloqueado en entornos que no sean development' },
        },
      },
    },
  },
};
